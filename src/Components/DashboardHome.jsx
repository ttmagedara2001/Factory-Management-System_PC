// ============================================
// IMPORTS
// ============================================

// React core hooks for state management and side effects
import { useState, useEffect } from 'react';

// Layout Components
// ../ means "go up one level from pages/ to src/, then into Components/"
import Header from './layout/Header';                    // Top navigation bar
import TabNavigation from './layout/TabNavigation';      // Production/Machine tabs

// Common UI Components
import ConnectionStatus from './common/ConnectionStatus'; // WebSocket & MQTT status
import AlertBanner from './common/AlertBanner';           // Critical alerts display

// Production Dashboard Components
import KpiCard from './dashboard/production/KpiCard';             // KPI metrics cards
import ProductionLog from './dashboard/production/ProductionLog'; // RFID scan log
import ProductionChart from './dashboard/production/ProductionChart'; // Historical chart

// Machine Monitoring Components
import VibrationGauge from './dashboard/machine/VibrationGauge';         // Vibration display
import PressureDisplay from './dashboard/machine/PressureDisplay';       // Pressure gauge
import TemperatureDisplay from './dashboard/machine/TemperatureDisplay'; // Temperature gauge
import HumidityDisplay from './dashboard/machine/HumidityDisplay';       // Humidity display
import NoiseLevelDisplay from './dashboard/machine/NoiseLevelDisplay';   // Noise level
import AirQualityDisplay from './dashboard/machine/AirQualityDisplay';   // Air quality (AQI, PM2.5, CO2)
import MultiSensorChart from './dashboard/machine/MultiSensorChart';     // Real-time sensor chart
import EnvironmentalChart from './dashboard/machine/EnvironmentalChart'; // Historical environmental
import ControlsPanel from './dashboard/machine/ControlsPanel';           // Machine control buttons
import EmergencyStop from './common/EmergencyStop';                      // Emergency stop button

// Custom Hooks & Services
import { webSocketClient } from '../services/webSocketClient';    // WebSocket STOMP client
import { 
  // getStreamDataForDevice,      // DISABLED: Not loading historical sensor data
  // getStateDetailsForDevice,    // DISABLED: Not loading historical machine states
  updateStateDetails           // Update machine control states via API
} from '../services/deviceService';
import {
  saveSensorData,              // Save sensor readings to localStorage (24hr retention)
  saveProductionLog,           // Save production logs to localStorage (7 day retention)
  getSensorChartData,          // Get sensor data formatted for charts
  getEnvironmentalChartData,   // Get environmental data formatted for charts
  getProductionLogs,           // Get production logs from localStorage
  getProductionTrend,          // Get production trend data
  getProductionKPI             // Get KPI metrics from localStorage
} from '../services/localStorageService';


// ============================================
// MAIN DASHBOARD COMPONENT
// ============================================

function DashboardHome() {
  // ==========================================
  // MOCK DEVICE IDS
  // ==========================================
  // Array of mock device objects for testing
  // In production, these would come from API call
  const MOCK_DEVICE_IDS = [
    { id: 'device_001', name: 'Factory Line 1 - device_001' },
    { id: 'device_002', name: 'Factory Line 2 - device_002' },
    { id: 'device_003', name: 'Factory Line 3 - device_003' },
    { id: 'device9988', name: 'Quality Control Station - device9988' },
    { id: 'device0011233', name: 'Packaging Unit - device0011233' }
  ];

  // ==========================================
  // STATE MANAGEMENT
  // ==========================================
  // UI State - Controls which tab is active and device selection
  // Restore from localStorage to persist across page refreshes
  const [activeTab, setActiveTab] = useState(() => {
    return localStorage.getItem('dashboard_activeTab') || 'production';
  });
  
  const [selectedDevice, setSelectedDevice] = useState(() => {
    const savedDevice = localStorage.getItem('dashboard_selectedDevice');
    // Verify saved device exists in MOCK_DEVICE_IDS
    const deviceExists = MOCK_DEVICE_IDS.some(d => d.id === savedDevice);
    return deviceExists ? savedDevice : MOCK_DEVICE_IDS[0].id;
  });
  
  const [motorState, setMotorState] = useState('RUN'); // Machine state: RUN/STOP/IDLE
  const [emergencyStopActive, setEmergencyStopActive] = useState(false); // Emergency stop flag

  // Save selected device and active tab to localStorage when they change
  useEffect(() => {
    localStorage.setItem('dashboard_selectedDevice', selectedDevice);
    console.log('💾 Saved selected device:', selectedDevice);
  }, [selectedDevice]);

  useEffect(() => {
    localStorage.setItem('dashboard_activeTab', activeTab);
    console.log('💾 Saved active tab:', activeTab);
  }, [activeTab]);


  // Connection Status States - Track real-time connection health
  const [websocketConnected, setWebsocketConnected] = useState(false); // WebSocket STOMP connection
  const [realtimeActive, setRealtimeActive] = useState(false); // Real-time data streaming
  const [historicalActive, setHistoricalActive] = useState(false); // Historical API available
  const mqttConnected = false; // MQTT not used in this implementation

  // Alert System - Stores multiple sensor threshold violations
  const [sensorAlerts, setSensorAlerts] = useState([]);

  // Sensor Thresholds - Define safe operating ranges for each sensor
  const sensorThresholds = {
    vibration: { min: 0, max: 7, unit: 'mm/s' }, // Excessive vibration = machine fault
    pressure: { min: 3, max: 6, unit: 'bar' }, // Pressure must stay in range
    temperature: { min: 15, max: 35, unit: '°C' }, // Operating temperature limits
    humidity: { min: 30, max: 70, unit: '%' }, // Humidity control range
    noiseLevel: { min: 0, max: 85, unit: 'dB' }, // Safety noise limit
    aqi: { min: 0, max: 100, unit: '' }, // Air Quality Index threshold
    pm25: { min: 0, max: 35, unit: 'µg/m³' }, // Particulate matter limit
    co2: { min: 0, max: 1000, unit: 'ppm' } // CO2 concentration limit
  };

  // Data States - Store fetched and real-time data
  const [devices, setDevices] = useState(MOCK_DEVICE_IDS); // List of available devices (using mock IDs)
  const [productionLogs, setProductionLogs] = useState([]); // RFID scan history
  const [productionTrend, setProductionTrend] = useState([]); // Production trend data
  const [sensorData, setSensorData] = useState([]); // Multi-sensor chart data
  const [environmentalData, setEnvironmentalData] = useState([]); // Environmental chart data


  // KPI Metrics - Key Performance Indicators
  const [kpiData, setKpiData] = useState({
    daily: 0, // Units produced today
    target: 0, // Target production goal
    efficiency: 0 // Overall efficiency percentage
  });

  // Real-time Sensor Readings - Current values from WebSocket
  const [sensorReadings, setSensorReadings] = useState({
    vibration: 0, // Machine vibration (mm/s)
    pressure: 0, // System pressure (bar)
    temperature: 0, // Temperature (°C)
    humidity: 0, // Humidity (%)
    noiseLevel: 0, // Noise level (dB)
    aqi: 0, // Air Quality Index
    pm25: 0, // PM2.5 particulate matter (µg/m³)
    co2: 0, // CO2 concentration (ppm)
    airQuality: 'Good' // Qualitative air quality status
  });

  // ==========================================
  // WEBSOCKET CONNECTION MANAGEMENT
  // ==========================================
  useEffect(() => {
    // Get JWT token from localStorage (set during auto-login)
    const token = localStorage.getItem('jwtToken');
    if (!token) {
      console.warn('No JWT token found');
      return;
    }

    console.log('🔌 Initializing WebSocket connection...');
    console.log('📊 Real-time data will start at 0 and update only with new WebSocket data');

    // Set up connection event handlers
    webSocketClient.onConnect(() => {
      console.log('✅ WebSocket connected - ready to receive real-time data');
      setWebsocketConnected(true);
      setRealtimeActive(true);
    });

    webSocketClient.onDisconnect(() => {
      console.log('❌ WebSocket disconnected');
      setWebsocketConnected(false);
      setRealtimeActive(false);
    });

    // Initialize WebSocket connection with JWT token
    webSocketClient.connect(token);

    // Cleanup function - disconnect when component unmounts
    return () => {
      webSocketClient.disconnect();
    };
  }, []); // Empty dependency array = run once on mount

  // ==========================================
  // REAL-TIME DATA SUBSCRIPTION
  // ==========================================
  /**
   * Subscribe to device WebSocket topics when device is selected
   * This effect runs whenever selectedDevice changes OR WebSocket connects
   * 
   * WebSocket Topics format: protonest/<deviceId>/stream/<sensor>
   * Example: protonest/device_001/stream/temperature
   */
  useEffect(() => {
    // Exit if no device selected or WebSocket not connected
    if (!selectedDevice || !webSocketClient.isConnected) {
      console.log('⏸️ Waiting for device selection and WebSocket connection...');
      return;
    }

    console.log(`📡 Subscribing to device: ${selectedDevice}`);

    // Register callback function to handle incoming WebSocket messages
    webSocketClient.subscribeToDevice(selectedDevice, (data) => {
      const { sensorType, value, timestamp } = data;
      console.log(`📊 Received ${sensorType}:`, value);

      // ========================================
      // BATCH UPDATE HANDLING
      // ========================================
      // If multiple sensors sent in one message, update them all at once
      if (sensorType === 'batchUpdate') {
        setSensorReadings(prev => ({
          ...prev,
          ...value // Spread operator merges all sensor values
        }));
        return;
      }

      // ========================================
      // INDIVIDUAL SENSOR UPDATES
      // ========================================
      // Process each sensor type and update corresponding state
      switch (sensorType) {
        // Machine Health Sensors
        case 'vibration':
          // Update vibration reading (convert string to float)
          setSensorReadings(prev => ({ ...prev, vibration: parseFloat(value) || 0 }));
          // Save to localStorage for historical data (24hr retention)
          saveSensorData(selectedDevice, 'vibration', value, timestamp);
          break;

        case 'pressure':
          // Update pressure reading
          setSensorReadings(prev => ({ ...prev, pressure: parseFloat(value) || 0 }));
          // Save to localStorage for historical data (24hr retention)
          saveSensorData(selectedDevice, 'pressure', value, timestamp);
          break;

        case 'temperature':
          // Update temperature reading
          setSensorReadings(prev => ({ ...prev, temperature: parseFloat(value) || 0 }));
          // Save to localStorage for historical data (24hr retention)
          saveSensorData(selectedDevice, 'temperature', value, timestamp);
          break;

        case 'humidity':
          // Update humidity reading
          setSensorReadings(prev => ({ ...prev, humidity: parseFloat(value) || 0 }));
          // Save to localStorage for historical data (24hr retention)
          saveSensorData(selectedDevice, 'humidity', value, timestamp);
          break;

        case 'noiseLevel':
          // Update noise level reading
          setSensorReadings(prev => ({ ...prev, noiseLevel: parseFloat(value) || 0 }));
          // Save to localStorage for historical data (24hr retention)
          saveSensorData(selectedDevice, 'noiseLevel', value, timestamp);
          break;

        // Air Quality Sensors  
        case 'aqi':
          // Update AQI and calculate qualitative air quality status
          setSensorReadings(prev => ({
            ...prev,
            aqi: parseFloat(value) || 0,
            airQuality: parseFloat(value) > 100 ? 'Poor' : parseFloat(value) > 50 ? 'Moderate' : 'Good'
          }));
          // Save to localStorage for historical data (24hr retention)
          saveSensorData(selectedDevice, 'aqi', value, timestamp);
          break;

        case 'pm25':
          // Update PM2.5 particulate matter reading
          setSensorReadings(prev => ({ ...prev, pm25: parseFloat(value) || 0 }));
          // Save to localStorage for historical data (24hr retention)
          saveSensorData(selectedDevice, 'pm25', value, timestamp);
          break;

        case 'co2':
          // Update CO2 concentration reading
          setSensorReadings(prev => ({ ...prev, co2: parseFloat(value) || 0 }));
          // Save to localStorage for historical data (24hr retention)
          saveSensorData(selectedDevice, 'co2', value, timestamp);
          break;

        case 'airQuality':
          // Direct air quality status update (Good/Moderate/Poor)
          setSensorReadings(prev => ({ ...prev, airQuality: value }));
          break;

        // Production Throughput Data
        case 'rfid':
        case 'units':
        case 'throughput':
          // When RFID tag scanned or unit produced:
          // 1. Increment daily production count in KPI
          const unit = parseInt(value) || 0;
          setKpiData(prev => ({
            ...prev,
            daily: prev.daily + unit // Add to running total
          }));

          // 2. Generate RFID tag ID
          const tagId = `RFID-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
          
          // 3. Add new entry to production log (keeps last 50 logs in memory)
          setProductionLogs(prev => [
            {
              id: Date.now(), // Unique ID based on timestamp
              tagId: tagId, // RFID tag
              timestamp: timestamp, // When it was scanned
              status: 'success', // Scan status
              product: 'Unit' // Product type
            },
            ...prev.slice(0, 49) // Keep only last 50 logs (prevent memory overflow)
          ]);
          
          // 4. Save to localStorage for 7-day retention
          saveProductionLog(selectedDevice, tagId, 'success', 'Unit', timestamp);
          break;

        // Machine Control States  
        case 'machine_control':
          // Update motor state when machine control changes (RUN/STOP/IDLE)
          setMotorState(value);
          break;

        case 'ventilation_mode':
          // Log ventilation mode changes (auto/manual)
          // (Could be used to update UI in future)
          console.log('Ventilation mode:', value);
          break;

        default:
          // Log unknown sensor types for debugging
          console.warn('Unknown sensor type:', sensorType);
      }
    });

    // Cleanup function - unsubscribe when device changes or component unmounts
    return () => {
      if (selectedDevice) {
        console.log(`🔕 Cleaning up subscriptions for ${selectedDevice}`);
      }
    };
  }, [selectedDevice, websocketConnected]); // Re-run when device OR connection changes


  // ==========================================
  // REAL-TIME DATA INITIALIZATION (NO HISTORICAL DATA)
  // ==========================================
  // This effect prepares the dashboard for real-time WebSocket data only
  // Historical data fetching has been DISABLED per user requirements
  // All sensor readings will start at 0 and update only with live WebSocket messages
  useEffect(() => {
    // Exit early if no device is selected
    if (!selectedDevice) return;

    console.log('🔄 Device changed to:', selectedDevice);
    console.log('📊 Historical data loading is DISABLED');
    console.log('📡 Dashboard will display only real-time WebSocket data');
    console.log('🎯 All sensors starting at 0, waiting for live updates...');

    // Reset all sensor readings to 0 for the new device
    // Sensors will update as WebSocket data arrives
    setSensorReadings({
      vibration: 0,
      pressure: 0,
      temperature: 0,
      humidity: 0,
      noiseLevel: 0,
      aqi: 0,
      pm25: 0,
      co2: 0,
      airQuality: 'Good'
    });

    // Clear chart data - will populate only with real-time WebSocket data
    setSensorData([]);
    setEnvironmentalData([]);

    // Mark historical as inactive since we're not loading it
    setHistoricalActive(false);

  }, [selectedDevice]); // Re-run when selectedDevice changes







  // ==========================================
  // ALERT MONITORING SYSTEM
  // ==========================================
  // This effect continuously monitors sensor readings against defined thresholds
  // When a threshold is exceeded, it generates an alert to display in AlertBanner
  useEffect(() => {
    // Array to store generated alerts
    const newAlerts = [];

    // ========== VIBRATION MONITORING ==========
    // Check if vibration exceeds maximum safe level
    if (sensorReadings.vibration > sensorThresholds.vibration.max) {
      newAlerts.push({
        id: 'vibration-high', // Unique ID for this alert
        type: 'critical', // Alert severity level
        message: `Vibration (${sensorReadings.vibration}${sensorThresholds.vibration.unit}) exceeds maximum (${sensorThresholds.vibration.max}${sensorThresholds.vibration.unit})`
      });
    }

    // ========== PRESSURE MONITORING ==========
    // Check if pressure is too low
    if (sensorReadings.pressure < sensorThresholds.pressure.min) {
      newAlerts.push({
        id: 'pressure-low',
        type: 'critical',
        message: `Pressure (${sensorReadings.pressure}${sensorThresholds.pressure.unit}) is below minimum (${sensorThresholds.pressure.min}${sensorThresholds.pressure.unit})`
      });
    }

    // Check if pressure is too high
    else if (sensorReadings.pressure > sensorThresholds.pressure.max) {
      newAlerts.push({
        id: 'pressure-high',
        type: 'critical',
        message: `Pressure (${sensorReadings.pressure}${sensorThresholds.pressure.unit}) exceeds maximum (${sensorThresholds.pressure.max}${sensorThresholds.pressure.unit})`
      });
    }

    // ========== TEMPERATURE MONITORING ==========
    // Check if temperature is too low (warning level)
    if (sensorReadings.temperature < sensorThresholds.temperature.min) {
      newAlerts.push({
        id: 'temperature-low',
        type: 'warning', // Less severe than critical
        message: `Temperature (${sensorReadings.temperature}${sensorThresholds.temperature.unit}) is below minimum (${sensorThresholds.temperature.min}${sensorThresholds.temperature.unit})`
      });
    }

    // Check if temperature is too high (critical level)
    else if (sensorReadings.temperature > sensorThresholds.temperature.max) {
      newAlerts.push({
        id: 'temperature-high',
        type: 'critical',
        message: `Temperature (${sensorReadings.temperature}${sensorThresholds.temperature.unit}) exceeds maximum (${sensorThresholds.temperature.max}${sensorThresholds.temperature.unit})`
      });
    }

    // ========== HUMIDITY MONITORING ==========
    // Check if humidity is too low (warning level)
    if (sensorReadings.humidity < sensorThresholds.humidity.min) {
      newAlerts.push({
        id: 'humidity-low',
        type: 'warning',
        message: `Humidity (${sensorReadings.humidity}${sensorThresholds.humidity.unit}) is below minimum (${sensorThresholds.humidity.min}${sensorThresholds.humidity.unit})`
      });
    }

    // Check if humidity is too high (warning level)
    else if (sensorReadings.humidity > sensorThresholds.humidity.max) {
      newAlerts.push({
        id: 'humidity-high',
        type: 'warning',
        message: `Humidity (${sensorReadings.humidity}${sensorThresholds.humidity.unit}) exceeds maximum (${sensorThresholds.humidity.max}${sensorThresholds.humidity.unit})`
      });
    }

    // ========== NOISE LEVEL MONITORING ==========
    // Check if noise level exceeds safe limit (warning level)
    if (sensorReadings.noiseLevel > sensorThresholds.noiseLevel.max) {
      newAlerts.push({
        id: 'noise-high',
        type: 'warning',
        message: `Noise Level (${sensorReadings.noiseLevel}${sensorThresholds.noiseLevel.unit}) exceeds safe limit (${sensorThresholds.noiseLevel.max}${sensorThresholds.noiseLevel.unit})`
      });
    }

    // ========== AIR QUALITY INDEX (AQI) MONITORING ==========
    // Check if AQI indicates poor air quality (warning level)
    if (sensorReadings.aqi > sensorThresholds.aqi.max) {
      newAlerts.push({
        id: 'aqi-high',
        type: 'warning',
        message: `Air Quality Index (${sensorReadings.aqi}) indicates poor air quality (>${sensorThresholds.aqi.max})`
      });
    }

    // ========== PM2.5 (PARTICULATE MATTER) MONITORING ==========
    // Check if PM2.5 concentration exceeds safe limit (warning level)
    if (sensorReadings.pm25 > sensorThresholds.pm25.max) {
      newAlerts.push({
        id: 'pm25-high',
        type: 'warning',
        message: `PM2.5 (${sensorReadings.pm25}${sensorThresholds.pm25.unit}) exceeds safe limit (${sensorThresholds.pm25.max}${sensorThresholds.pm25.unit})`
      });
    }

    // ========== CO2 (CARBON DIOXIDE) MONITORING ==========
    // Check if CO2 level exceeds recommended limit (warning level)
    if (sensorReadings.co2 > sensorThresholds.co2.max) {
      newAlerts.push({
        id: 'co2-high',
        type: 'warning',
        message: `CO2 Level (${sensorReadings.co2}${sensorThresholds.co2.unit}) exceeds recommended limit (${sensorThresholds.co2.max}${sensorThresholds.co2.unit})`
      });
    }

    // Update the sensorAlerts state with all generated alerts
    // These will be displayed as AlertBanner components in the UI
    setSensorAlerts(newAlerts);
  }, [sensorReadings]); // Re-run whenever sensor readings change







  // ==========================================
  // FACTORY STATUS COMPUTATION
  // ==========================================
  // This function determines overall factory status based on current states
  // Returns: 'fault' | 'running' | 'idle'
  const getFactoryStatus = () => {
    // If emergency stop is active, factory is in fault state (highest priority)
    if (emergencyStopActive) return 'fault';

    // If motor is running, factory is running
    if (motorState === 'RUN') return 'running';

    // Otherwise, factory is idle
    return 'idle';
  };

  // ==========================================
  // EVENT HANDLERS
  // ==========================================
  // ========== EMERGENCY STOP HANDLER ==========
  // Triggered when emergency stop button is pressed
  // This function:
  // 1. Sets local emergency stop state
  // 2. Stops the motor
  // 3. Sends stop command to API
  // 4. Sends stop command via WebSocket if connected
  const handleEmergencyStop = async () => {
    console.log('🚨 EMERGENCY STOP ACTIVATED');

    // Update local state immediately for instant UI response
    setEmergencyStopActive(true);
    setMotorState('STOP');

    // Send stop command to backend API
    if (selectedDevice) {
      try {
        // Call HTTP API to update machine control state to STOP
        await updateStateDetails(selectedDevice, 'machine_control', { machine_control: 'STOP' });
        console.log('✅ Emergency stop sent to API');
      } catch (error) {
        console.error('❌ Failed to send emergency stop to API:', error);
      }

      // Also send stop command via WebSocket for real-time control
      // (Provides redundancy - if one fails, the other might succeed)
      if (webSocketClient.isConnected) {
        webSocketClient.sendMachineCommand(selectedDevice, 'STOP');
      }
    }
  };

  // ========== EMERGENCY STOP RESET HANDLER ==========
  // Triggered when reset button is pressed after emergency stop
  // This function clears the emergency stop state, allowing operations to resume
  const handleResetEmergency = () => {
    // Clear emergency stop flag
    setEmergencyStopActive(false);
    console.log('✅ Emergency stop reset');
  };

  // ========== MOTOR STATE CHANGE HANDLER ==========
  // Triggered when motor control toggle switch is changed (RUN ↔ STOP)
  // This function:
  // 1. Updates local motor state for instant UI feedback
  // 2. Sends new state to backend API
  // 3. Sends new state via WebSocket for real-time control
  const handleMotorStateChange = async (newState) => {
    // Update local state immediately
    setMotorState(newState);

    // Send updated state to backend API and WebSocket
    if (selectedDevice) {
      try {
        // Call HTTP API to update machine control state
        await updateStateDetails(selectedDevice, 'machine_control', { machine_control: newState });
        console.log(`✅ Motor state changed to ${newState} via API`);
      } catch (error) {
        console.error('❌ Failed to update motor state via API:', error);
      }

      // Also send via WebSocket if connection is active
      // (Provides dual-channel control for reliability)
      if (webSocketClient.isConnected) {
        webSocketClient.sendMachineCommand(selectedDevice, newState);
      }
    }
  };

  // ==========================================
  // RENDER UI
  // ==========================================
  return (
    <div className="min-h-screen bg-slate-100 p-4 sm:p-6 lg:p-8">
      {/* ========== MAIN PAGE CONTAINER ========== */}
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">

        {/* ========== CONNECTION STATUS INDICATORS ========== */}
        {/* Shows real-time status of WebSocket, MQTT, and API connections */}
        <ConnectionStatus
          websocketConnected={websocketConnected} // Green dot if WebSocket is connected
          mqttConnected={mqttConnected} // Green dot if MQTT is connected
          realtimeActive={realtimeActive} // Shows if real-time data is flowing
          historicalActive={historicalActive} // Shows if historical API is responsive
        />

        {/* ========== ALERT BANNERS ========== */}
        {/* Display dismissible alerts when sensor thresholds are exceeded */}
        {/* Only shown for machine monitoring sensors (vibration, pressure, temp, etc.) */}
        {sensorAlerts.map((alert) => (
          <AlertBanner
            key={alert.id} // Unique ID for each alert
            type={alert.type} // 'critical', 'warning', 'info', or 'success'
            message={alert.message} // Alert description with sensor values
            onDismiss={() => setSensorAlerts(prev => prev.filter(a => a.id !== alert.id))} // Remove alert when dismissed
          />
        ))}

        {/* ========== HEADER ========== */}
        {/* Top navigation bar with user ID, factory status, and device selector */}
        <Header
          userId="369718963810018K" // Displayed user identifier
          factoryStatus={getFactoryStatus()} // 'running', 'idle', or 'fault' status
          selectedDevice={selectedDevice} // Currently selected device ID
          onDeviceChange={setSelectedDevice} // Callback when device is changed
          devices={devices} // Array of available devices
        />

        {/* ========== TAB NAVIGATION ========== */}
        {/* Switch between Production and Machine Monitoring tabs */}
        <TabNavigation
          activeTab={activeTab} // Currently active tab ('production' or 'machine')
          onTabChange={setActiveTab} // Callback to change active tab
        />

        {/* ========== MAIN CONTENT AREA ========== */}
        <main className="p-6 space-y-10">

          {/* ========== PRODUCTION TAB CONTENT ========== */}
          {/* Displayed when activeTab === 'production' */}
          {activeTab === 'production' ? (
            <div className="space-y-10">

              {/* Section Title */}
              <div className="text-center space-y-2">
                <h2 className="text-2xl font-bold text-slate-900 uppercase tracking-wide">
                  Real Time - Productions and Logistics
                </h2>
                <p className="text-sm text-slate-500">
                  Live KPIs and scan feed with clear spacing and centered layout.
                </p>
              </div>

              {/* ========== KPI CARDS ========== */}
              {/* Display key production metrics (daily, target, efficiency) */}
              <div className="flex justify-center">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
                  <KpiCard
                    title="Daily Production"
                    value={kpiData.daily} // Current day's production count
                    unit="units"
                    trend={0} // Trend indicator (0 = no change)
                    icon="📦" />
                  <KpiCard
                    title="Target Production"
                    value={kpiData.target} // Today's production target
                    unit="units"
                    icon="🎯" />
                  <KpiCard
                    title="Overall Efficiency"
                    value={kpiData.efficiency} // Efficiency percentage
                    unit="%"
                    trend={0}
                    icon="⚡" />
                </div>
              </div>

              {/* ========== PRODUCTION LOG (RFID SCAN FEED) ========== */}
              {/* Shows recent RFID scans with timestamps and status */}
              <div className="space-y-4">
                <div className="text-center space-y-1">
                  <h3 className="text-lg font-semibold text-slate-900">
                    Recent Production Log - Live Scan Feed
                  </h3>
                  <p className="text-sm text-slate-500">Latest RFID scans with status highlights.</p>
                </div>
                <div className="flex justify-center">
                  <div className="w-full">
                    {/* ProductionLog component displays the log entries */}
                    {/* productionLogs array is updated in real-time via WebSocket */}
                    <ProductionLog
                      logs={productionLogs} // Array of log entries (RFID scans)
                      variant="muted" // Visual style variant
                      className="min-h-[260px]" // Minimum height for consistent layout
                    />
                  </div>
                </div>
              </div>

              {/* ========== HISTORICAL ANALYSIS CHART ========== */}
              {/* Shows production trends over time vs targets */}
              <div className="space-y-4">
                <div className="text-center space-y-1">
                  <h2 className="text-2xl font-bold text-slate-900 uppercase tracking-wide">
                    Historical Analysis - Productions and Logistics
                  </h2>
                  <p className="text-sm text-slate-500">Trends versus targets with export-ready data.</p>
                </div>
                <div className="flex justify-center">
                  <div className="w-full">
                    {/* ProductionChart displays historical production data */}
                    <ProductionChart
                      data={productionTrend} // Array of {time, actual, target} data points
                      variant="muted"
                      className="min-h-[260px]" />
                  </div>
                </div>
              </div>

              {/* ========== EMERGENCY STOP BUTTON ========== */}
              {/* Critical control - immediately stops all machinery */}
              <div className="flex justify-center">
                <div className="w-full">
                  <EmergencyStop
                    onStop={handleEmergencyStop} // Callback when emergency stop is pressed
                  />
                </div>
              </div>
            </div>
          ) : (
            // ========== MACHINE MONITORING TAB CONTENT ==========
            // Displayed when activeTab === 'machine'
            <div className="space-y-8">

              {/* ========== SENSOR DISPLAYS GRID ========== */}
              {/* All real-time sensor readings displayed in cards */}
              <div className="flex justify-center">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 w-full">

                  {/* Vibration sensor - shows mm/s vibration level */}
                  <VibrationGauge value={sensorReadings.vibration} />

                  {/* Pressure sensor - shows bar pressure level */}
                  <PressureDisplay
                    pressure={sensorReadings.pressure}
                    airQuality={sensorReadings.airQuality} />

                  {/* Temperature sensor - shows °C with trend arrow */}
                  <TemperatureDisplay
                    temperature={sensorReadings.temperature}
                    trend={0} // 0 = stable, 1 = rising, -1 = falling
                  />

                  {/* Humidity sensor - shows % humidity level */}
                  <HumidityDisplay humidity={sensorReadings.humidity} />

                  {/* Noise level sensor - shows dB sound level */}
                  <NoiseLevelDisplay noiseLevel={sensorReadings.noiseLevel} />

                  {/* Air quality sensors - shows AQI, PM2.5, and CO2 levels */}
                  <AirQualityDisplay
                    aqi={sensorReadings.aqi} // Air Quality Index
                    pm25={sensorReadings.pm25} // Particulate matter 2.5µm
                    co2={sensorReadings.co2} // Carbon dioxide level
                  />
                </div>
              </div>

              {/* ========== MULTI-SENSOR HISTORICAL CHART ========== */}
              {/* Shows vibration, pressure, temperature trends over time */}
              <div className="flex justify-center">
                <div className="w-full">
                  {/* MultiSensorChart displays combined sensor data */}
                  {/* sensorData is populated from historical API + real-time updates */}
                  <MultiSensorChart data={sensorData} />
                </div>
              </div>

              {/* ========== ENVIRONMENTAL HISTORICAL CHART ========== */}
              {/* Shows humidity, AQI, CO2 trends over time */}
              <div className="flex justify-center">
                <div className="w-full">
                  {/* EnvironmentalChart displays environmental data */}
                  {/* environmentalData is populated from historical API + real-time updates */}
                  <EnvironmentalChart data={environmentalData} />
                </div>
              </div>

              {/* ========== MACHINE CONTROLS PANEL ========== */}
              {/* Manual controls for motor state (RUN/STOP toggle) */}
              <div className="flex justify-center">
                <div className="w-full">
                  <ControlsPanel
                    motorState={motorState} // Current motor state (RUN/STOP/IDLE)
                    onMotorStateChange={handleMotorStateChange} // Callback to change motor state
                    emergencyStopActive={emergencyStopActive} // Emergency stop flag
                  />
                </div>
              </div>

              {/* ========== EMERGENCY STOP BUTTON (MACHINE TAB) ========== */}
              {/* Duplicate emergency stop button for machine monitoring tab */}
              <div className="flex justify-center">
                <div className="w-full">
                  <EmergencyStop
                    onStop={handleEmergencyStop} // Callback when emergency stop is pressed
                  />
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

// Export the component so it can be imported in other files
export default DashboardHome;
