import React, { useState, useEffect } from 'react';
import SidePanel from './Components/SidePanel';
import Header from './Components/Header';
import Dashboard from './Components/Dashboard';
import SettingsWindow from './Components/SettingsWindow';
import HistoricalWindow from './Components/HistoricalWindow';
import { useAuth } from './Context/AuthContext';
import { webSocketClient, MOCK_DEVICES } from './services/webSocketClient';

export default function App() {
  const { auth } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarPinned, setIsSidebarPinned] = useState(false);
  const [bellClicked, setBellClicked] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [isConnecting, setIsConnecting] = useState(true);
  const [selectedDevice, setSelectedDevice] = useState(MOCK_DEVICES[0].id);
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

  // Alerts state for notification count
  const [alerts, setAlerts] = useState([]);

  // WebSocket initialization (auto-login already handled in main.jsx)
  useEffect(() => {
    const initializeWebSocket = async () => {
      try {
        // Get JWT token from localStorage (set by main.jsx AutoLogin)
        const jwtToken = localStorage.getItem('jwtToken');
        
        if (!jwtToken) {
          console.error('❌ [App] No JWT token found. WebSocket cannot connect.');
          setIsConnecting(false);
          return;
        }
        
        console.log('📡 [App] Initializing WebSocket connection...');
        
        // Set up WebSocket callbacks
        webSocketClient.onConnect(() => {
          console.log('✅ [App] WebSocket connected');
          setIsWebSocketConnected(true);
          setIsConnecting(false);
        });
        
        webSocketClient.onDisconnect(() => {
          console.warn('⚠️ [App] WebSocket disconnected');
          setIsWebSocketConnected(false);
        });
        
        // Connect to WebSocket
        await webSocketClient.connect(jwtToken);
        
        console.log('✅ [App] WebSocket initialization complete');
        
      } catch (error) {
        console.error('❌ [App] WebSocket initialization failed:', error);
        setIsConnecting(false);
      }
    };
    
    // Wait a bit for auto-login to complete in main.jsx
    const timer = setTimeout(() => {
      initializeWebSocket();
    }, 500);
    
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
        
        // Update sensor data state
        setSensorData(prev => ({
          ...prev,
          [data.sensorType]: data.value
        }));
      });
    }
  }, [selectedDevice, isWebSocketConnected]);
  
  // Handle device selection change
  const handleDeviceChange = (deviceId) => {
    console.log(`🔄 [App] Device changed to: ${deviceId}`);
    setSelectedDevice(deviceId);
  };

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

  // Show loading screen while connecting
  if (isConnecting) {
    return (
      <div className="flex h-screen bg-[#F1F5F9] items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
          <p className="text-slate-600 font-semibold">Connecting to Factory Systems...</p>
          <p className="text-sm text-slate-400 mt-2">Initializing MQTT connection</p>
        </div>
      </div>
    );
  }

  // Example: Add alert when temperature exceeds threshold (replace with real logic)
  useEffect(() => {
    if (sensorData.temperature !== null && sensorData.temperature > (thresholds.temperature?.max ?? 35)) {
      setAlerts((prev) => [
        ...prev,
        {
          msg: `Temperature Critical: ${sensorData.temperature}°C exceeds max threshold`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    }
    // Add similar logic for other sensor critical alerts as needed
  }, [sensorData.temperature, thresholds.temperature]);

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
        />
        
        <main className="flex-1 overflow-y-auto relative">
          {activeTab === 'dashboard' && <Dashboard bellClicked={bellClicked} thresholds={thresholds} sensorData={sensorData} webSocketClient={webSocketClient} selectedDevice={selectedDevice} />}
          {activeTab === 'settings' && <SettingsWindow thresholds={thresholds} setThresholds={setThresholds} currentValues={sensorData} webSocketClient={webSocketClient} selectedDevice={selectedDevice} />}
          {activeTab === 'historical' && <HistoricalWindow />}
          
          {/* Notification Sidebar */}
          {showNotifications && (
            <div className="absolute top-0 right-0 h-full w-80 bg-white shadow-2xl border-l border-slate-200 z-50 overflow-y-auto">
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
                <p className="text-xs text-slate-500">Real-time critical notifications</p>
              </div>
              
              <div className="p-4 space-y-3">
                {/* Example critical alerts */}
                <div className="bg-red-50 border-l-4 border-red-500 p-3 rounded">
                  <div className="flex items-start gap-2">
                    <svg className="w-5 h-5 text-red-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <div className="flex-1">
                      <p className="text-xs font-bold text-red-900">Temperature Critical</p>
                      <p className="text-xs text-red-700 mt-1">Current: 36.2°C exceeds max threshold of 35°C</p>
                      <span className="text-[10px] text-red-600 font-semibold">2 mins ago</span>
                    </div>
                  </div>
                </div>

                <div className="bg-red-50 border-l-4 border-red-500 p-3 rounded">
                  <div className="flex items-start gap-2">
                    <svg className="w-5 h-5 text-red-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <div className="flex-1">
                      <p className="text-xs font-bold text-red-900">Vibration Critical</p>
                      <p className="text-xs text-red-700 mt-1">Machine vibration at 9.5 mm/s exceeds critical level</p>
                      <span className="text-[10px] text-red-600 font-semibold">5 mins ago</span>
                    </div>
                  </div>
                </div>

                <div className="bg-yellow-50 border-l-4 border-yellow-500 p-3 rounded">
                  <div className="flex items-start gap-2">
                    <svg className="w-5 h-5 text-yellow-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <div className="flex-1">
                      <p className="text-xs font-bold text-yellow-900">Pressure Warning</p>
                      <p className="text-xs text-yellow-700 mt-1">Pressure at 52 bar approaching warning threshold</p>
                      <span className="text-[10px] text-yellow-600 font-semibold">8 mins ago</span>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 border-l-4 border-slate-300 p-3 rounded">
                  <p className="text-xs text-slate-500 text-center">No older notifications</p>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}