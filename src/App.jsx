import React, { useState, useEffect } from 'react';
// Device list for selection (move from Dashboard.jsx)
const MOCK_DEVICES = [
  { id: 'device9988', name: 'Machine A - Line 1' },
  { id: 'device0011233', name: 'Machine B - Line 2' },
  { id: 'device7654', name: 'Machine C - Line 3' },
  { id: 'device3421', name: 'Machine D - Line 4' },
];
import SidePanel from './Components/SidePanel';
import Header from './Components/Header';
import Dashboard from './Components/Dashboard';
import SettingsWindow from './Components/SettingsWindow';
import HistoricalWindow from './Components/HistoricalWindow';
import { useAuth } from './Context/AuthContext';
import { webSocketClient } from './services/webSocketClient';

export default function App() {
  const { auth } = useAuth();
  // Restore last activeTab and selectedDevice from localStorage if available
  const [activeTab, setActiveTab] = useState(() => localStorage.getItem('activeTab') || 'dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarPinned, setIsSidebarPinned] = useState(false);
  const [bellClicked, setBellClicked] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState(() => localStorage.getItem('selectedDevice') || MOCK_DEVICES[0].id);
  const [isWebSocketConnected, setIsWebSocketConnected] = useState(false);

  // Real-time sensor data from MQTT
  const [sensorData, setSensorData] = useState({
    vibration: null,
    pressure: null,
    noise: null,
    temperature: null,
    humidity: null,
    co2: null,
    airQuality: null,
    units: null, // Production units
    ventilation: null,
    machineControl: null
  });

  // Threshold state management
  const [thresholds, setThresholds] = useState({
    vibration: { warning: 7, critical: 9 },
    pressure: { min: 5, max: 80, warning: 50 },
    noise: { warning: 70, critical: 90 },
    temperature: { min: 10, max: 35 },
    humidity: { min: 10, max: 80 },
    co2: { min: 0, max: 70 }
  });

  // Alerts state for notification count (in-memory)
  const [alerts, setAlerts] = useState([]);

  // In-memory per-device sensor history (newest-first arrays)
  const [sensorHistory, setSensorHistory] = useState({});


  // Alert notification logic for all critical sensors
  useEffect(() => {
    const newAlerts = [];
    // Temperature
    if (sensorData.temperature !== null && sensorData.temperature > (thresholds.temperature?.max ?? 35)) {
      newAlerts.push({
        msg: `Temperature Critical: ${sensorData.temperature}°C exceeds max threshold`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        severity: 'critical',
        deviceId: selectedDevice,
        sensorType: 'temperature',
      });
    }
    // Vibration
    if (sensorData.vibration !== null && sensorData.vibration > (thresholds.vibration?.critical ?? 10)) {
      newAlerts.push({
        msg: `Vibration Critical: ${sensorData.vibration} mm/s exceeds critical threshold`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        severity: 'critical',
        deviceId: selectedDevice,
        sensorType: 'vibration',
      });
    }
    // Pressure
    if (sensorData.pressure !== null && (sensorData.pressure < 95000 || sensorData.pressure > 110000)) {
      newAlerts.push({
        msg: `Pressure Critical: ${sensorData.pressure} Pa out of safe range (95000-110000)`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        severity: 'critical',
        deviceId: selectedDevice,
        sensorType: 'pressure',
      });
    }
    // Noise
    if (sensorData.noise !== null && sensorData.noise > 85) {
      newAlerts.push({
        msg: `Noise Critical: ${sensorData.noise} dB exceeds critical threshold`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        severity: 'critical',
        deviceId: selectedDevice,
        sensorType: 'noise',
      });
    }
    // Humidity
    if (sensorData.humidity !== null && sensorData.humidity > 70) {
      newAlerts.push({
        msg: `Humidity Warning: ${sensorData.humidity}% exceeds warning threshold`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        severity: 'warning',
        deviceId: selectedDevice,
        sensorType: 'humidity',
      });
    }
    // CO2
    if (sensorData.co2 !== null && sensorData.co2 > 1000) {
      newAlerts.push({
        msg: `CO2 Critical: ${sensorData.co2} ppm exceeds critical threshold`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        severity: 'critical',
        deviceId: selectedDevice,
        sensorType: 'co2',
      });
    }
    // AQI
    if (sensorData.airQuality !== null && sensorData.airQuality > 150) {
      newAlerts.push({
        msg: `AQI Critical: ${sensorData.airQuality} exceeds critical threshold`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        severity: 'critical',
        deviceId: selectedDevice,
        sensorType: 'aqi',
      });
    }
    // PM2.5
    if (sensorData.pm25 !== null && sensorData.pm25 > 35) {
      newAlerts.push({
        msg: `PM2.5 Critical: ${sensorData.pm25} μg/m³ exceeds critical threshold`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        severity: 'critical',
        deviceId: selectedDevice,
        sensorType: 'pm25',
      });
    }
    // Only add new alerts if not already present (avoid duplicates).
    // Use functional updater to avoid stale state and persist from here.
    newAlerts.forEach(alert => {
      setAlerts(prev => {
        const exists = prev.some(a => a.msg === alert.msg && a.deviceId === alert.deviceId && a.sensorType === alert.sensorType && a.time === alert.time);
        if (exists) return prev;
        return [alert, ...prev];
      });
    });
  }, [sensorData, thresholds, selectedDevice]);

  // WebSocket initialization (auto-login already handled in main.jsx)
  // This runs in the background - dashboard is shown immediately
  useEffect(() => {
    const initializeWebSocket = async () => {
      try {
        // Get JWT token from localStorage (set by main.jsx AutoLogin)
        const jwtToken = localStorage.getItem('jwtToken');

        if (!jwtToken) {
          console.error('❌ [App] No JWT token found. WebSocket cannot connect.');
          console.log('💡 [App] Dashboard is displayed. WebSocket will connect when token is available.');
          return;
        }

        console.log('📡 [App] Initializing WebSocket connection in background...');
        setIsConnecting(true);

        // Set up WebSocket callbacks
        webSocketClient.onConnect(() => {
          console.log('✅ [App] WebSocket connected!');
          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
          console.log('📡 STOMP WebSocket Connection Established');
          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
          setIsWebSocketConnected(true);
          setIsConnecting(false);
        });

        webSocketClient.onDisconnect(() => {
          console.warn('⚠️ [App] WebSocket disconnected');
          setIsWebSocketConnected(false);
        });

        // Connect to WebSocket (non-blocking)
        await webSocketClient.connect(jwtToken);

        console.log('✅ [App] WebSocket initialization started (non-blocking)');

      } catch (error) {
        console.error('❌ [App] WebSocket initialization failed:', error);
        setIsConnecting(false);
      }
    };

    // Start WebSocket connection after a short delay for auth to complete
    const timer = setTimeout(() => {
      initializeWebSocket();
    }, 300);

    // Cleanup on unmount
    return () => {
      clearTimeout(timer);
      webSocketClient.disconnect();
    };
  }, []);

  // Subscribe to selected device when it changes
  useEffect(() => {
    if (isWebSocketConnected && selectedDevice) {
      console.log(`🔄 [App] Subscribing to device: ${selectedDevice}`);

      webSocketClient.subscribeToDevice(selectedDevice, (data) => {
        console.log('📊 [App] Sensor data received:', data);

        // Handle MQTTX-style topic/payload messages
        if (data.sensorType === 'payload' && typeof data.value === 'object') {
          // {sensorType: 'payload', value: {vibration: 7}, ...}
          const updates = {};
          Object.entries(data.value).forEach(([key, value]) => {
            updates[key] = value;
            // Save into in-memory history
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
          // {sensorType: 'topic', value: 'fmc/vibration', ...}
          // Not enough info to update value, skip
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
      });
    }
  }, [selectedDevice, isWebSocketConnected]);

  // Handle device selection change
  const handleDeviceChange = (deviceId) => {
    console.log(`🔄 [App] Device changed to: ${deviceId}`);
    
    // Reset sensor data when switching devices to avoid showing stale data
    setSensorData({
      vibration: null,
      pressure: null,
      noise: null,
      temperature: null,
      humidity: null,
      co2: null,
      airQuality: null,
      units: null,
      ventilation: null,
      machineControl: null
    });
    
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


  // Remove legacy example alert logic (now handled above)

  // No blocking loading screen - dashboard shows immediately
  // WebSocket connection status is shown in the status bar below

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
      />

      <div className="flex-1 flex flex-col min-w-0">
        <Header
          toggleSidebar={toggleSidebar}
          setBellClicked={setBellClicked}
          setShowNotifications={setShowNotifications}
          showNotifications={showNotifications}
          devices={MOCK_DEVICES}
          selectedDevice={selectedDevice}
          onDeviceChange={handleDeviceChange}
          alertsCount={alerts.length}
          alerts={alerts}
          isWebSocketConnected={isWebSocketConnected}
        />

        {/* Connection Status Bar */}
        <div className="w-full flex flex-wrap justify-center sm:justify-end items-center px-3 sm:px-8 py-2 bg-transparent gap-2">
          <div className="flex flex-wrap justify-center gap-2 sm:gap-4 text-[10px] sm:text-xs font-semibold">
            <span className={`inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 rounded-full ${isWebSocketConnected
              ? 'bg-green-100 text-green-700'
              : isConnecting
                ? 'bg-amber-100 text-amber-700'
                : 'bg-red-100 text-red-600'
              }`}>
              <span className={`w-1.5 sm:w-2 h-1.5 sm:h-2 rounded-full ${isWebSocketConnected
                ? 'bg-green-500'
                : isConnecting
                  ? 'bg-amber-500 animate-pulse'
                  : 'bg-red-500'
                }`}></span>
              <span className="hidden xs:inline">WebSocket:</span> {isWebSocketConnected ? 'Connected' : isConnecting ? 'Connecting...' : 'WS Off'}
            </span>
            <span className={`inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 rounded-full ${isWebSocketConnected
              ? 'bg-green-100 text-green-700'
              : isConnecting
                ? 'bg-amber-100 text-amber-700'
                : 'bg-red-100 text-red-600'
              }`}>
              <span className={`w-1.5 sm:w-2 h-1.5 sm:h-2 rounded-full ${isWebSocketConnected
                ? 'bg-green-500'
                : isConnecting
                  ? 'bg-amber-500 animate-pulse'
                  : 'bg-red-500'
                }`}></span>
              <span className="hidden xs:inline">MQTT:</span> {isWebSocketConnected ? 'Connected' : isConnecting ? 'Connecting...' : 'MQTT Off'}
            </span>
          </div>
        </div>

        <main className="flex-1 overflow-y-auto relative">
          {activeTab === 'dashboard' && <Dashboard bellClicked={bellClicked} thresholds={thresholds} sensorData={sensorData} webSocketClient={webSocketClient} selectedDevice={selectedDevice} devices={MOCK_DEVICES} alerts={alerts} setAlerts={setAlerts} />}
          {activeTab === 'settings' && <SettingsWindow thresholds={thresholds} setThresholds={setThresholds} currentValues={sensorData} webSocketClient={webSocketClient} selectedDevice={selectedDevice} />}
          {activeTab === 'historical' && <HistoricalWindow alerts={alerts} setAlerts={setAlerts} devices={MOCK_DEVICES} selectedDevice={selectedDevice} setSelectedDevice={handleDeviceChange} sensorHistory={sensorHistory} />}

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