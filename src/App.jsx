import React, { useState, useEffect, useCallback, useRef } from 'react';
import SidePanel from './Components/SidePanel';
import Header from './Components/Header';
import Dashboard from './Components/Dashboard';
import SettingsWindow from './Components/SettingsWindow';
import HistoricalWindow from './Components/HistoricalWindow';
import { useAuth } from './Context/AuthContext';
import { webSocketClient } from './services/webSocketClient';
import { getProductionData, getProductionLog, setUnitsFromBackend } from './services/productionService';

export default function App() {
  const { auth } = useAuth();
  // Restore last activeTab and selectedDevice from localStorage if available
  const [activeTab, setActiveTab] = useState(() => localStorage.getItem('activeTab') || 'dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarPinned, setIsSidebarPinned] = useState(false);
  const [bellClicked, setBellClicked] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState(() => localStorage.getItem('selectedDevice') || 'device9988');
  const [isWebSocketConnected, setIsWebSocketConnected] = useState(false);

  // Factory status and control states
  const [factoryStatus, setFactoryStatus] = useState('RUNNING');
  const [controlMode, setControlMode] = useState('manual');
  const [isEmergencyStopped, setIsEmergencyStopped] = useState(false);
  const [targetUnits, setTargetUnits] = useState(() => {
    const saved = localStorage.getItem('targetUnits');
    return saved ? parseInt(saved, 10) : 1024;
  });

  // Device list
  const [devices, setDevices] = useState([
    { id: 'device9988', name: 'Machine A - Line 1' },
    { id: 'device0011233', name: 'Machine B - Line 2' },
    { id: 'device7654', name: 'Machine C - Line 3' },
    { id: 'device3421', name: 'Machine D - Line 4' },
    { id: 'devicetestuc', name: 'Machine E - Line 5' }
  ]);

  // Real-time sensor data from WebSocket
  const [sensorData, setSensorData] = useState(() => {
    const initialDevice = localStorage.getItem('selectedDevice') || 'devicetestuc';
    const productionData = getProductionData(initialDevice);
    return {
      vibration: undefined,
      pressure: undefined,
      noise: undefined,
      temperature: undefined,
      humidity: undefined,
      co2: undefined,
      airQuality: undefined,
      units: productionData.units,
      ventilation: undefined,
      machineControl: undefined
    };
  });

  // Production log for Recent Production Log table
  const [productionLog, setProductionLog] = useState(() => {
    const initialDevice = localStorage.getItem('selectedDevice') || 'devicetestuc';
    return getProductionLog(initialDevice);
  });

  // Threshold state management
  const [thresholds, setThresholds] = useState({
    vibration: { min: 0, critical: 9 },
    pressure: { min: 5, max: 80 },
    noise: { min: 0, critical: 90 },
    temperature: { min: 10, max: 35 },
    humidity: { min: 10, max: 80 },
    co2: { min: 0, max: 70 }
  });

  // Alerts state for notification count (in-memory)
  const [alerts, setAlerts] = useState([]);

  // ═══════════════════════════════════════════════════════════════════════════
  // SMART NOTIFICATIONS: Track previous critical states to detect ENTRY only
  // ═══════════════════════════════════════════════════════════════════════════
  const prevCriticalStatesRef = useRef({});

  // In-memory per-device sensor history
  const [sensorHistory, setSensorHistory] = useState({});

  // OEE and Efficiency calculation states
  const [dailyProduction, setDailyProduction] = useState({ produced: 0, startTime: null });
  const [oeeData, setOeeData] = useState({ availability: 100, performance: 100, quality: 100, oee: 100 });
  const [overallEfficiency, setOverallEfficiency] = useState(0);
  const [efficiencyTrend, setEfficiencyTrend] = useState(0);

  // ═══════════════════════════════════════════════════════════════════════════
  // STABLE DATA HANDLER (useCallback + useRef pattern)
  // Prevents unnecessary re-subscriptions caused by unstable function references
  // ═══════════════════════════════════════════════════════════════════════════
  const handleSensorData = useCallback((data) => {
    // Handle product detection - update production log
    if (data.sensorType === 'product' && typeof data.value === 'object') {
      const { logEntry } = data.value;
      if (logEntry) {
        setProductionLog(prev => [...prev, logEntry].slice(-100));
      }
      return;
    }

    // Handle MQTTX-style topic/payload messages
    if (data.sensorType === 'payload' && typeof data.value === 'object') {
      if (data.value.productID || data.value.productId || data.value.productName) {
        const productID = data.value.productID || data.value.productId || 'UNKNOWN';
        const productName = data.value.productName || 'Unknown Product';

        import('./services/productionService').then(({ incrementUnits, addProductToLog }) => {
          const logEntry = addProductToLog(selectedDevice, { productID, productName });
          setProductionLog(prev => [...prev, logEntry].slice(-100));

          const newUnitCount = incrementUnits(selectedDevice);
          setSensorData(prev => ({ ...prev, units: newUnitCount }));
        });
        return;
      }

      const updates = {};
      Object.entries(data.value).forEach(([key, value]) => {
        updates[key] = value;
        setSensorHistory(prev => {
          const copy = { ...prev };
          if (!copy[selectedDevice]) copy[selectedDevice] = {};
          if (!copy[selectedDevice][key]) copy[selectedDevice][key] = [];
          copy[selectedDevice][key] = [{ timestamp: data.timestamp || new Date().toISOString(), value }, ...copy[selectedDevice][key]].slice(0, 1000);
          return copy;
        });
      });
      setSensorData(prev => ({ ...prev, ...updates }));
      return;
    }

    if (data.sensorType === 'topic' && typeof data.value === 'string' && data.value.startsWith('fmc/')) {
      return;
    }

    // Normal per-sensor update
    setSensorData(prev => ({
      ...prev,
      [data.sensorType]: data.value
    }));

    // Save to in-memory history
    setSensorHistory(prev => {
      const copy = { ...prev };
      if (!copy[selectedDevice]) copy[selectedDevice] = {};
      if (!copy[selectedDevice][data.sensorType]) copy[selectedDevice][data.sensorType] = [];
      copy[selectedDevice][data.sensorType] = [{ timestamp: data.timestamp || new Date().toISOString(), value: data.value }, ...copy[selectedDevice][data.sensorType]].slice(0, 1000);
      return copy;
    });
  }, [selectedDevice]);

  // Save target units to localStorage
  useEffect(() => {
    localStorage.setItem('targetUnits', targetUnits.toString());
  }, [targetUnits]);

  // Calculate Overall Efficiency based on production vs target
  useEffect(() => {
    if (sensorData.units !== undefined && sensorData.units !== null && targetUnits > 0) {
      const currentProduced = sensorData.units;
      const efficiency = Math.min((currentProduced / targetUnits) * 100, 100);
      setOverallEfficiency(efficiency);

      const now = new Date();
      const hoursElapsed = now.getHours() + now.getMinutes() / 60;
      const expectedProduction = (hoursElapsed / 24) * targetUnits;
      const trend = expectedProduction > 0 ? ((currentProduced - expectedProduction) / expectedProduction) * 100 : 0;
      setEfficiencyTrend(trend);
    }
  }, [sensorData.units, targetUnits]);

  // Calculate OEE (Overall Equipment Efficiency) for 24hrs
  useEffect(() => {
    const calculateOEE = () => {
      const now = new Date();
      const hoursInDay = 24;

      const plannedTime = hoursInDay * 60;
      const downtime = isEmergencyStopped ? (now.getHours() * 60 + now.getMinutes()) * 0.1 : 0;
      const runTime = plannedTime - downtime;
      const availability = Math.min((runTime / plannedTime) * 100, 100);

      const actualOutput = sensorData.units || 0;
      const hoursElapsed = now.getHours() + now.getMinutes() / 60;
      const theoreticalOutput = (hoursElapsed / hoursInDay) * targetUnits;
      const performance = theoreticalOutput > 0 ? Math.min((actualOutput / theoreticalOutput) * 100, 100) : 100;

      const quality = 98;

      const oee = (availability * performance * quality) / 10000;

      setOeeData({
        availability: Math.round(availability * 10) / 10,
        performance: Math.round(performance * 10) / 10,
        quality,
        oee: Math.round(oee * 10) / 10
      });
    };

    calculateOEE();
    const interval = setInterval(calculateOEE, 60000);
    return () => clearInterval(interval);
  }, [sensorData.units, targetUnits, isEmergencyStopped]);

  // ═══════════════════════════════════════════════════════════════════════════
  // CALCULATED AIR QUALITY INDEX (AQI)
  // Based on Temperature, Humidity, and CO2 levels
  // Scale: 0-100 (higher is better)
  // ═══════════════════════════════════════════════════════════════════════════
  useEffect(() => {
    const calculateAirQuality = () => {
      const temp = sensorData.temperature;
      const humidity = sensorData.humidity;
      const co2 = sensorData.co2;

      // If no sensor data available, return null (don't update)
      if (temp === undefined && humidity === undefined && co2 === undefined) {
        return;
      }

      // Temperature Score (0-100)
      // Optimal: 20-25°C = 100 points, deviation reduces score
      let tempScore = 100;
      if (temp !== undefined && temp !== null) {
        const optimalTempMin = 20;
        const optimalTempMax = 25;
        if (temp < optimalTempMin) {
          tempScore = Math.max(0, 100 - (optimalTempMin - temp) * 5);
        } else if (temp > optimalTempMax) {
          tempScore = Math.max(0, 100 - (temp - optimalTempMax) * 5);
        }
      }

      // Humidity Score (0-100)
      // Optimal: 40-60% = 100 points, deviation reduces score
      let humidityScore = 100;
      if (humidity !== undefined && humidity !== null) {
        const optimalHumidityMin = 40;
        const optimalHumidityMax = 60;
        if (humidity < optimalHumidityMin) {
          humidityScore = Math.max(0, 100 - (optimalHumidityMin - humidity) * 2);
        } else if (humidity > optimalHumidityMax) {
          humidityScore = Math.max(0, 100 - (humidity - optimalHumidityMax) * 2);
        }
      }

      // CO2 Score (0-100)
      // Optimal: < 45% = 100 points (for percentage, not ppm)
      // 45-60% = moderate, > 60% = poor
      let co2Score = 100;
      if (co2 !== undefined && co2 !== null) {
        if (co2 < 45) {
          co2Score = 100;
        } else if (co2 < 60) {
          co2Score = Math.max(50, 100 - (co2 - 45) * 3);
        } else {
          co2Score = Math.max(0, 50 - (co2 - 60) * 2);
        }
      }

      // Weighted Average AQI
      // Weights: Temperature 30%, Humidity 30%, CO2 40%
      const weights = {
        temperature: 0.30,
        humidity: 0.30,
        co2: 0.40
      };

      let totalWeight = 0;
      let weightedSum = 0;

      if (temp !== undefined && temp !== null) {
        weightedSum += tempScore * weights.temperature;
        totalWeight += weights.temperature;
      }
      if (humidity !== undefined && humidity !== null) {
        weightedSum += humidityScore * weights.humidity;
        totalWeight += weights.humidity;
      }
      if (co2 !== undefined && co2 !== null) {
        weightedSum += co2Score * weights.co2;
        totalWeight += weights.co2;
      }

      const aqi = totalWeight > 0 ? Math.round(weightedSum / totalWeight) : null;

      if (aqi !== null) {
        setSensorData(prev => ({
          ...prev,
          airQuality: aqi
        }));
      }
    };

    calculateAirQuality();
  }, [sensorData.temperature, sensorData.humidity, sensorData.co2]);

  // Update factory status based on emergency stop only
  useEffect(() => {
    if (isEmergencyStopped) {
      setFactoryStatus('STOPPED');
    } else {
      setFactoryStatus('RUNNING');
    }
  }, [isEmergencyStopped]);

  // Emergency Stop Handler
  const handleEmergencyStop = useCallback(async () => {
    console.log('🚨 EMERGENCY STOP ACTIVATED');
    setIsEmergencyStopped(true);
    setFactoryStatus('STOPPED');

    try {
      // Send STOP command via WebSocket if available
      if (webSocketClient?.sendMachineControlCommand) {
        webSocketClient.sendMachineControlCommand('STOP');
      }

      // Send critical STOP command via HTTP API with correct payload
      const { updateStateDetails } = await import('./services/deviceService.js');
      await updateStateDetails(selectedDevice, 'machineControl', {
        status: 'STOP',
        reason: 'EMERGENCY STOP',
        timestamp: new Date().toISOString()
      });

      console.log('✅ Emergency stop command sent successfully');
    } catch (error) {
      console.error('❌ Failed to send emergency stop command:', error);
    }
  }, [selectedDevice]);

  // Resume System Handler
  const handleResumeSystem = useCallback(() => {
    console.log('▶️ SYSTEM RESUME REQUESTED');
    setIsEmergencyStopped(false);
    window.location.reload();
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════
  // SMART ALERT NOTIFICATIONS (Task 3)
  // Only trigger notifications on critical state ENTRY (safe -> critical)
  // Ignore status toggles (on/off) or repeated critical updates
  // ═══════════════════════════════════════════════════════════════════════════
  useEffect(() => {
    const checkCriticalEntry = (sensorType, value, threshold, condition) => {
      if (value === undefined || value === null) return null;

      const isCritical = condition(value, threshold);
      const prevWasCritical = prevCriticalStatesRef.current[sensorType] || false;

      // Update tracking state
      prevCriticalStatesRef.current[sensorType] = isCritical;

      // Only return alert if ENTERING critical state (was safe, now critical)
      if (isCritical && !prevWasCritical) {
        return true;
      }
      return false;
    };

    const newAlerts = [];

    // Temperature - check for critical ENTRY
    if (checkCriticalEntry('temperature', sensorData.temperature, thresholds.temperature?.max ?? 35,
      (val, max) => val > max)) {
      newAlerts.push({
        msg: `Temperature Critical: ${sensorData.temperature}°C exceeds max threshold`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        severity: 'critical',
        deviceId: selectedDevice,
        sensorType: 'temperature',
      });
    }

    // Vibration
    if (checkCriticalEntry('vibration', sensorData.vibration, thresholds.vibration?.critical ?? 10,
      (val, crit) => val > crit)) {
      newAlerts.push({
        msg: `Vibration Critical: ${sensorData.vibration} mm/s exceeds critical threshold`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        severity: 'critical',
        deviceId: selectedDevice,
        sensorType: 'vibration',
      });
    }

    // Pressure
    if (checkCriticalEntry('pressure', sensorData.pressure, { min: 95000, max: 110000 },
      (val, range) => val < range.min || val > range.max)) {
      newAlerts.push({
        msg: `Pressure Critical: ${sensorData.pressure} Pa out of safe range (95000-110000)`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        severity: 'critical',
        deviceId: selectedDevice,
        sensorType: 'pressure',
      });
    }

    // Noise
    if (checkCriticalEntry('noise', sensorData.noise, 85,
      (val, crit) => val > crit)) {
      newAlerts.push({
        msg: `Noise Critical: ${sensorData.noise} dB exceeds critical threshold`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        severity: 'critical',
        deviceId: selectedDevice,
        sensorType: 'noise',
      });
    }

    // Humidity (warning level)
    if (checkCriticalEntry('humidity', sensorData.humidity, 70,
      (val, warn) => val > warn)) {
      newAlerts.push({
        msg: `Humidity Warning: ${sensorData.humidity}% exceeds warning threshold`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        severity: 'warning',
        deviceId: selectedDevice,
        sensorType: 'humidity',
      });
    }

    // CO2
    if (checkCriticalEntry('co2', sensorData.co2, 1000,
      (val, crit) => val > crit)) {
      newAlerts.push({
        msg: `CO2 Critical: ${sensorData.co2} ppm exceeds critical threshold`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        severity: 'critical',
        deviceId: selectedDevice,
        sensorType: 'co2',
      });
    }

    // AQI
    if (checkCriticalEntry('airQuality', sensorData.airQuality, 150,
      (val, crit) => val > crit)) {
      newAlerts.push({
        msg: `AQI Critical: ${sensorData.airQuality} exceeds critical threshold`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        severity: 'critical',
        deviceId: selectedDevice,
        sensorType: 'aqi',
      });
    }

    // PM2.5
    if (checkCriticalEntry('pm25', sensorData.pm25, 35,
      (val, crit) => val > crit)) {
      newAlerts.push({
        msg: `PM2.5 Critical: ${sensorData.pm25} μg/m³ exceeds critical threshold`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        severity: 'critical',
        deviceId: selectedDevice,
        sensorType: 'pm25',
      });
    }

    // Add new alerts (entry-only)
    newAlerts.forEach(alert => {
      setAlerts(prev => {
        const exists = prev.some(a => a.msg === alert.msg && a.deviceId === alert.deviceId && a.sensorType === alert.sensorType && a.time === alert.time);
        if (exists) return prev;
        return [alert, ...prev];
      });
    });
  }, [sensorData, thresholds, selectedDevice]);

  // ═══════════════════════════════════════════════════════════════════════════
  // CONNECTION EFFECT: Handles global connection state based on auth status
  // This effect ONLY manages the WebSocket connection lifecycle
  // ═══════════════════════════════════════════════════════════════════════════
  useEffect(() => {
    const initializeWebSocket = async () => {
      try {
        console.log('📡 [App] Initializing WebSocket connection (cookie-based auth)...');
        setIsConnecting(true);

        webSocketClient.onConnect(async () => {
          console.log('✅ [App] WebSocket connected!');
          setIsWebSocketConnected(true);
          setIsConnecting(false);

          // Fetch initial units from backend on connection
          try {
            const { getCurrentUnitsFromBackend } = await import('./services/deviceService');
            const currentDevice = localStorage.getItem('selectedDevice') || 'device9988';
            const backendUnits = await getCurrentUnitsFromBackend(currentDevice);

            if (backendUnits > 0) {
              console.log(`📊 [App] Initializing units from backend: ${backendUnits}`);
              setUnitsFromBackend(currentDevice, backendUnits);
              setSensorData(prev => ({ ...prev, units: backendUnits }));
            }
          } catch (error) {
            console.warn('⚠️ [App] Could not fetch initial units from backend:', error.message);
          }
        });

        webSocketClient.onDisconnect(() => {
          console.warn('⚠️ [App] WebSocket disconnected');
          setIsWebSocketConnected(false);
        });

        // Connect to WebSocket (uses cookies, no token needed)
        await webSocketClient.connect();

      } catch (error) {
        console.error('❌ [App] WebSocket initialization failed:', error);
        setIsConnecting(false);
      }
    };

    const timer = setTimeout(() => {
      initializeWebSocket();
    }, 300);

    return () => {
      clearTimeout(timer);
      webSocketClient.disconnect();
    };
  }, []); // Empty deps - connection only based on app lifecycle

  // ═══════════════════════════════════════════════════════════════════════════
  // SUBSCRIPTION EFFECT: Handles topic subscription based on active context
  // This effect manages subscriptions when device changes
  // ═══════════════════════════════════════════════════════════════════════════
  useEffect(() => {
    if (isWebSocketConnected && selectedDevice) {
      console.log(`🔄 [App] Subscribing to device: ${selectedDevice}`);

      // Returns cleanup function for proper unsubscription
      const cleanup = webSocketClient.subscribeToDevice(selectedDevice, handleSensorData);

      return cleanup;
    }
  }, [selectedDevice, isWebSocketConnected, handleSensorData]);

  // ═══════════════════════════════════════════════════════════════════════════
  // CONTEXT SWITCHING SAFETY (Task 1)
  // Reset live data to undefined/null on device change to prevent stale data
  // ═══════════════════════════════════════════════════════════════════════════
  const handleDeviceChange = async (deviceId) => {
    // IMPORTANT: Preserve exact casing of device ID (no .toLowerCase())
    console.log(`🔄 [App] Device changed to: ${deviceId}`);

    // IMMEDIATELY reset sensor data to undefined (not 0 or initial defaults)
    // This prevents automation logic from misfiring on stale/empty data
    setSensorData({
      vibration: undefined,
      pressure: undefined,
      noise: undefined,
      temperature: undefined,
      humidity: undefined,
      co2: undefined,
      airQuality: undefined,
      units: undefined, // Reset to undefined, will be populated from backend/localStorage
      ventilation: undefined,
      machineControl: undefined
    });

    // Reset critical state tracking for new device
    prevCriticalStatesRef.current = {};

    // Load production data for the new device from localStorage
    let productionData = getProductionData(deviceId);
    const productionLogData = getProductionLog(deviceId);

    // Fetch units from backend for the new device
    if (isWebSocketConnected) {
      try {
        const { getCurrentUnitsFromBackend } = await import('./services/deviceService');
        const backendUnits = await getCurrentUnitsFromBackend(deviceId);

        if (backendUnits > 0) {
          console.log(`📊 [App] Fetched units from backend for ${deviceId}: ${backendUnits}`);
          setUnitsFromBackend(deviceId, backendUnits);
          productionData = getProductionData(deviceId);
        }
      } catch (error) {
        console.warn('⚠️ [App] Could not fetch units from backend:', error.message);
      }
    }

    // Update with persisted units (may still be undefined if no data)
    if (productionData.units !== undefined) {
      setSensorData(prev => ({ ...prev, units: productionData.units }));
    }

    setProductionLog(productionLogData);
    setSelectedDevice(deviceId);
    localStorage.setItem('selectedDevice', deviceId);
  };

  // Persist activeTab to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('activeTab', activeTab);
  }, [activeTab]);

  // Persist selectedDevice to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('selectedDevice', selectedDevice);
  }, [selectedDevice]);

  const toggleSidebar = () => {
    if (!isSidebarPinned) {
      setIsSidebarOpen(!isSidebarOpen);
    }
  };

  const togglePin = () => {
    setIsSidebarPinned(!isSidebarPinned);
    if (!isSidebarPinned) {
      setIsSidebarOpen(true);
    }
  };

  return (
    <div className="flex h-screen bg-[#F1F5F9] font-sans text-slate-900 overflow-hidden">
      <SidePanel
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isOpen={isSidebarOpen || isSidebarPinned}
        isPinned={isSidebarPinned}
        togglePin={togglePin}
        onMouseEnter={() => !isSidebarPinned && setIsSidebarOpen(true)}
        onMouseLeave={() => !isSidebarPinned && setIsSidebarOpen(false)}
        isEmergencyStopped={isEmergencyStopped}
        onEmergencyStop={handleEmergencyStop}
        onResumeSystem={handleResumeSystem}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <Header
          toggleSidebar={toggleSidebar}
          setBellClicked={setBellClicked}
          setShowNotifications={setShowNotifications}
          showNotifications={showNotifications}
          devices={devices}
          selectedDevice={selectedDevice}
          onDeviceChange={handleDeviceChange}
          alertsCount={alerts.length}
          alerts={alerts}
          isWebSocketConnected={isWebSocketConnected}
          isConnecting={isConnecting}
          factoryStatus={factoryStatus}
        />

        <main className="flex-1 overflow-y-auto relative">
          {activeTab === 'dashboard' && (
            <Dashboard
              bellClicked={bellClicked}
              thresholds={thresholds}
              sensorData={sensorData}
              webSocketClient={webSocketClient}
              selectedDevice={selectedDevice}
              devices={devices}
              alerts={alerts}
              setAlerts={setAlerts}
              targetUnits={targetUnits}
              setTargetUnits={setTargetUnits}
              overallEfficiency={overallEfficiency}
              efficiencyTrend={efficiencyTrend}
              oeeData={oeeData}
              factoryStatus={factoryStatus}
              controlMode={controlMode}
              productionLog={productionLog}
            />
          )}
          {activeTab === 'settings' && (
            <SettingsWindow
              thresholds={thresholds}
              setThresholds={setThresholds}
              currentValues={sensorData}
              webSocketClient={webSocketClient}
              selectedDevice={selectedDevice}
              controlMode={controlMode}
              setControlMode={setControlMode}
              factoryStatus={factoryStatus}
              isEmergencyStopped={isEmergencyStopped}
            />
          )}
          {activeTab === 'historical' && (
            <HistoricalWindow
              alerts={alerts}
              setAlerts={setAlerts}
              devices={devices}
              selectedDevice={selectedDevice}
              setSelectedDevice={handleDeviceChange}
              sensorHistory={sensorHistory}
              factoryStatus={factoryStatus}
              targetUnits={targetUnits}
              thresholds={thresholds}
              currentUnits={sensorData.units}
            />
          )}

          {/* Notification Sidebar */}
          {showNotifications && (
            <div className="absolute top-0 right-0 h-full w-full sm:w-80 bg-white shadow-2xl border-l border-slate-200 z-50 overflow-y-auto">
              <div className="p-4 border-b border-slate-200 bg-slate-50 sticky top-0">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-bold text-slate-800 uppercase">Critical Alerts</h3>
                  <button
                    onClick={() => setShowNotifications(false)}
                    className="p-1 hover:bg-slate-200 rounded"
                  >
                    <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <p className="text-xs text-slate-500">Real-time critical notifications (for selected device)</p>
              </div>
              <div className="p-4 space-y-3">
                {alerts.length === 0 ? (
                  <div className="bg-slate-50 border-l-4 border-slate-300 p-3 rounded">
                    <p className="text-xs text-slate-500 text-center">No notifications</p>
                  </div>
                ) : (
                  alerts.map((alert, i) => (
                    <div key={i} className={`p-3 rounded border-l-4 ${alert.severity === 'critical' ? 'bg-red-50 border-red-500' : alert.severity === 'warning' ? 'bg-yellow-50 border-yellow-500' : 'bg-slate-50 border-slate-300'}`}>
                      <div className="flex items-start gap-2">
                        <svg className={`w-5 h-5 mt-0.5 ${alert.severity === 'critical' ? 'text-red-600' : alert.severity === 'warning' ? 'text-yellow-600' : 'text-slate-400'}`} fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        <div className="flex-1">
                          <p className={`text-xs font-bold ${alert.severity === 'critical' ? 'text-red-900' : alert.severity === 'warning' ? 'text-yellow-900' : 'text-slate-700'}`}>{alert.msg}</p>
                          {alert.deviceId && <p className="text-[10px] text-slate-500">Device: {alert.deviceId}</p>}
                          <span className={`text-[10px] font-semibold ${alert.severity === 'critical' ? 'text-red-600' : alert.severity === 'warning' ? 'text-yellow-600' : 'text-slate-400'}`}>{alert.time}</span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}