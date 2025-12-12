import { useState, useRef, useEffect } from 'react';
import Badge from '../common/Badge';

const Header = ({ userId, factoryStatus, selectedDevice, onDeviceChange, devices, alerts = [], onDismissAlert }) => {
  const [showAlertDropdown, setShowAlertDropdown] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowAlertDropdown(false);
      }
    };

    if (showAlertDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showAlertDropdown]);

  const getStatusStyles = () => {
    if (factoryStatus === 'running') return 'bg-emerald-100 text-emerald-700 border-emerald-300';
    if (factoryStatus === 'fault') return 'bg-red-100 text-red-700 border-red-300';
    return 'bg-amber-100 text-amber-700 border-amber-300';
  };

  const getAlertTypeStyles = (type) => {
    if (type === 'critical') return 'bg-red-50 border-red-200';
    if (type === 'warning') return 'bg-amber-50 border-amber-200';
    return 'bg-blue-50 border-blue-200';
  };

  const getAlertIconColor = (type) => {
    if (type === 'critical') return 'text-red-600';
    if (type === 'warning') return 'text-amber-600';
    return 'text-blue-600';
  };

  const criticalAlerts = alerts.filter(a => a.type === 'critical');
  const hasAlerts = alerts.length > 0;
  const hasCriticalAlerts = criticalAlerts.length > 0;

  return (
    <header className="bg-white/90 backdrop-blur border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-4">
            {/* Left: Logo and Authentication */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-slate-900 text-white font-bold flex items-center justify-center shadow-sm">
                NC
              </div>
              <div className="space-y-1">
                <h1 className="text-lg sm:text-4xl font-bold text-slate-900 leading-tight">Nexus Core</h1>
                <div className="text-xs text-emerald-600 font-semibold tracking-wide">Authentication: Successful</div>
              </div>
              <div className="hidden md:block text-xs text-slate-500 border-l border-slate-200 pl-3">
                User ID: <span className="font-mono text-slate-800 font-semibold">{userId}</span>
              </div>
            </div>

            {/* Right: Factory Status & Notifications */}
            <div className="flex items-center gap-3">
              <span className="text-sm text-slate-500 font-medium">Factory Status:</span>
              <span className={`px-3 py-1.5 rounded-full font-semibold text-xs border ${getStatusStyles()}`}>
                {factoryStatus.toUpperCase()}
              </span>
              
              {/* Alert Notification Bell */}
              <div className="relative" ref={dropdownRef}>
                <button 
                  onClick={() => setShowAlertDropdown(!showAlertDropdown)}
                  className={`relative p-2 rounded-full shadow-sm transition-all border ${
                    hasCriticalAlerts 
                      ? 'bg-red-50 hover:bg-red-100 border-red-200 animate-pulse' 
                      : hasAlerts 
                      ? 'bg-amber-50 hover:bg-amber-100 border-amber-200' 
                      : 'bg-white hover:bg-slate-100 border-slate-200'
                  }`}
                >
                  <svg 
                    className={`w-6 h-6 ${hasCriticalAlerts ? 'text-red-600' : hasAlerts ? 'text-amber-600' : 'text-slate-600'}`} 
                    fill="none" 
                    viewBox="0 0 24 24" 
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                  
                  {/* Alert Count Badge */}
                  {hasAlerts && (
                    <span className={`absolute -top-1 -right-1 flex items-center justify-center min-w-[20px] h-5 px-1.5 text-xs font-bold text-white rounded-full ${
                      hasCriticalAlerts ? 'bg-red-600' : 'bg-amber-600'
                    }`}>
                      {alerts.length}
                    </span>
                  )}
                </button>

                {/* Alert Dropdown */}
                {showAlertDropdown && (
                  <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-xl border border-slate-200 z-50 max-h-96 overflow-y-auto">
                    <div className="p-4 border-b border-slate-200 bg-slate-50">
                      <h3 className="font-semibold text-slate-900">
                        Sensor Alerts ({alerts.length})
                      </h3>
                      <p className="text-xs text-slate-600 mt-1">
                        {hasCriticalAlerts && `${criticalAlerts.length} critical alert${criticalAlerts.length > 1 ? 's' : ''} require immediate attention`}
                        {!hasCriticalAlerts && alerts.length > 0 && 'Review warnings and take action'}
                        {alerts.length === 0 && 'All sensors operating normally'}
                      </p>
                    </div>
                    
                    {alerts.length === 0 ? (
                      <div className="p-8 text-center">
                        <svg className="w-16 h-16 mx-auto text-emerald-500 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <p className="text-slate-600 font-medium">No Active Alerts</p>
                        <p className="text-xs text-slate-500 mt-1">All systems operating within normal parameters</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-100">
                        {alerts.map((alert) => (
                          <div 
                            key={alert.id} 
                            className={`p-4 hover:bg-slate-50 transition-colors border-l-4 ${getAlertTypeStyles(alert.type)}`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-start gap-3 flex-1">
                                {/* Alert Icon */}
                                <div className={`mt-0.5 ${getAlertIconColor(alert.type)}`}>
                                  {alert.type === 'critical' ? (
                                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                    </svg>
                                  ) : (
                                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                    </svg>
                                  )}
                                </div>
                                
                                {/* Alert Content */}
                                <div className="flex-1">
                                  <p className="font-semibold text-slate-900 text-sm">
                                    {alert.message}
                                  </p>
                                  <p className="text-xs text-slate-600 mt-1">
                                    Sensor: {alert.sensor} • Current: {alert.value} {alert.unit}
                                  </p>
                                  {alert.threshold && (
                                    <p className="text-xs text-slate-500 mt-0.5">
                                      Threshold: {alert.threshold}
                                    </p>
                                  )}
                                </div>
                              </div>
                              
                              {/* Dismiss Button */}
                              <button
                                onClick={() => onDismissAlert(alert.id)}
                                className="flex-shrink-0 text-slate-400 hover:text-slate-600 transition-colors"
                                title="Dismiss alert"
                              >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {alerts.length > 0 && (
                      <div className="p-3 bg-slate-50 border-t border-slate-200 text-center">
                        <button
                          onClick={() => {
                            alerts.forEach(alert => onDismissAlert(alert.id));
                            setShowAlertDropdown(false);
                          }}
                          className="text-xs text-slate-600 hover:text-slate-900 font-medium"
                        >
                          Clear All Alerts
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Center: Device Selector */}
          <div className="flex items-center justify-center gap-3">
            <span className="text-sm font-medium text-slate-700">Select Device</span>
            <div className="w-full max-w-xs">
              <select
                value={selectedDevice}
                onChange={(e) => onDeviceChange(e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400 bg-white shadow-sm"
              >
                {devices.map((device) => (
                  <option key={device.id} value={device.id}>
                    {device.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
