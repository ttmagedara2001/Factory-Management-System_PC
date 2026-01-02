import React, { useState, useEffect } from 'react';
import { Settings, Save, AlertTriangle, Play, Square } from 'lucide-react';
import FactoryStatus from './FactoryStatus.jsx';

const SettingsWindow = ({ thresholds, setThresholds, currentValues, webSocketClient, selectedDevice }) => {
  const [localThresholds, setLocalThresholds] = useState(thresholds);
  const [saved, setSaved] = useState(false);
  const [controlMode, setControlMode] = useState('auto'); // 'auto' or 'manual'
  const [machineStatus, setMachineStatus] = useState('running'); // 'running' or 'stopped'

  const handleChange = (category, field, value) => {
    setLocalThresholds(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [field]: parseFloat(value) || 0
      }
    }));
  };

  const handleSave = () => {
    setThresholds(localThresholds);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleControlModeChange = (mode) => {
    setControlMode(mode);
  };

  const handleMachineToggle = () => {
    if (controlMode === 'manual' && webSocketClient && selectedDevice) {
      const newStatus = machineStatus === 'running' ? 'stopped' : 'running';
      const command = newStatus === 'running' ? 'RUN' : 'STOP';
      
      // Send command via WebSocket to the selected device
      const success = webSocketClient?.sendMachineControlCommand
        ? webSocketClient.sendMachineControlCommand(command)
        : false;
      
      if (success) {
        setMachineStatus(newStatus);
        console.log(`✅ [Settings] Machine command sent to ${selectedDevice}: ${command}`);
      } else {
        console.error('❌ [Settings] Failed to send machine command');
        alert('Failed to send machine control command. Please check WebSocket connection.');
      }
    }
  };

  const CurrentValueBadge = ({ value, unit }) => (
    <div className="flex items-center gap-2 mb-3 bg-blue-50 border border-blue-200 rounded-lg p-2">
      <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
      <span className="text-xs text-blue-700 font-semibold">Current: </span>
      <span className="text-sm font-bold text-blue-900">{value}{unit}</span>
    </div>
  );

  return (
    <div className="p-8 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-3">
          <Settings size={28} className="text-slate-600" />
          <h1 className="text-xl font-bold text-slate-800 uppercase tracking-wide">Threshold Settings</h1>
        </div>
        <FactoryStatus />
      </div>

      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6 rounded-lg">
        <div className="flex items-start gap-3">
          <AlertTriangle size={20} className="text-yellow-600 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-yellow-800">Critical Alert Configuration</p>
            <p className="text-xs text-yellow-700 mt-1">
              Set threshold values to trigger critical alerts. When values exceed critical thresholds, 
              indicators will turn red and alerts will be generated.
            </p>
          </div>
        </div>
      </div>

      {/* Machine Control Section */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 mb-6">
        <h3 className="text-sm font-bold text-slate-800 uppercase mb-4 pb-2 border-b border-slate-200">
          Machine Control
        </h3>
        
        <div className="flex items-center justify-between">
          {/* Control Mode Toggle */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-3">Control Mode</label>
            <div className="flex items-center gap-3 bg-slate-100 p-1 rounded-lg">
              <button
                onClick={() => handleControlModeChange('auto')}
                className={`px-6 py-2 rounded-lg text-xs font-bold transition-all duration-300 ${
                  controlMode === 'auto'
                    ? 'bg-green-500 text-white shadow-md'
                    : 'text-slate-600 hover:text-slate-800'
                }`}
              >
                AUTO
              </button>
              <button
                onClick={() => handleControlModeChange('manual')}
                className={`px-6 py-2 rounded-lg text-xs font-bold transition-all duration-300 ${
                  controlMode === 'manual'
                    ? 'bg-blue-500 text-white shadow-md'
                    : 'text-slate-600 hover:text-slate-800'
                }`}
              >
                MANUAL
              </button>
            </div>
          </div>

          {/* Machine Control Button */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-3">Machine Status</label>
            <button
              onClick={handleMachineToggle}
              disabled={controlMode === 'auto'}
              className={`flex items-center gap-3 px-8 py-3 rounded-lg font-bold text-white transition-all duration-300 ${
                controlMode === 'auto'
                  ? 'bg-slate-300 cursor-not-allowed'
                  : machineStatus === 'running'
                  ? 'bg-red-500 hover:bg-red-600 shadow-lg'
                  : 'bg-green-500 hover:bg-green-600 shadow-lg'
              }`}
            >
              {machineStatus === 'running' ? (
                <>
                  <Square size={20} fill="white" />
                  <span>STOP MACHINE</span>
                </>
              ) : (
                <>
                  <Play size={20} fill="white" />
                  <span>START MACHINE</span>
                </>
              )}
            </button>
            {controlMode === 'auto' && (
              <p className="text-xs text-slate-500 mt-2 text-center">
                Switch to Manual mode to control
              </p>
            )}
          </div>
        </div>

        {/* Status Indicator */}
        <div className="mt-4 flex items-center gap-3 bg-slate-50 p-3 rounded-lg">
          <div className={`w-3 h-3 rounded-full ${
            machineStatus === 'running' ? 'bg-green-500 animate-pulse' : 'bg-red-500'
          }`}></div>
          <span className="text-sm font-semibold text-slate-700">
            Current Status: 
            <span className={`ml-2 ${
              machineStatus === 'running' ? 'text-green-600' : 'text-red-600'
            }`}>
              {machineStatus === 'running' ? 'RUNNING' : 'STOPPED'}
            </span>
          </span>
          <span className="text-xs text-slate-500 ml-auto">
            Mode: <span className="font-bold">{controlMode.toUpperCase()}</span>
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Machine Performance Thresholds */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <h3 className="text-sm font-bold text-slate-800 uppercase mb-4 pb-2 border-b border-slate-200">
            Machine Performance
          </h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-2">Vibration (mm/s)</label>
              <CurrentValueBadge value={currentValues.vibration} unit=" mm/s" />
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block mb-1">Warning Level</span>
                  <input
                    type="number"
                    step="0.1"
                    value={localThresholds.vibration.warning}
                    onChange={(e) => handleChange('vibration', 'warning', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-red-600 uppercase font-bold block mb-1">Critical Level</span>
                  <input
                    type="number"
                    step="0.1"
                    value={localThresholds.vibration.critical}
                    onChange={(e) => handleChange('vibration', 'critical', e.target.value)}
                    className="w-full px-3 py-2 border border-red-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-2">Pressure (bar)</label>
              <CurrentValueBadge value={currentValues.pressure} unit=" bar" />
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block mb-1">Min Threshold</span>
                  <input
                    type="number"
                    step="1"
                    value={localThresholds.pressure.min}
                    onChange={(e) => handleChange('pressure', 'min', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block mb-1">Max Threshold</span>
                  <input
                    type="number"
                    step="1"
                    value={localThresholds.pressure.max}
                    onChange={(e) => handleChange('pressure', 'max', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-yellow-600 uppercase font-bold block mb-1">Warning Level</span>
                  <input
                    type="number"
                    step="1"
                    value={localThresholds.pressure.warning}
                    onChange={(e) => handleChange('pressure', 'warning', e.target.value)}
                    className="w-full px-3 py-2 border border-yellow-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-2">Noise Level (dB)</label>
              <CurrentValueBadge value={currentValues.noise} unit=" dB" />
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block mb-1">Warning Level</span>
                  <input
                    type="number"
                    step="1"
                    value={localThresholds.noise.warning}
                    onChange={(e) => handleChange('noise', 'warning', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-red-600 uppercase font-bold block mb-1">Critical Level</span>
                  <input
                    type="number"
                    step="1"
                    value={localThresholds.noise.critical}
                    onChange={(e) => handleChange('noise', 'critical', e.target.value)}
                    className="w-full px-3 py-2 border border-red-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Environment Thresholds */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <h3 className="text-sm font-bold text-slate-800 uppercase mb-4 pb-2 border-b border-slate-200">
            Environment Analysis
          </h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-2">Temperature (°C)</label>
              <CurrentValueBadge value={currentValues.temperature} unit="°C" />
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block mb-1">Min Threshold</span>
                  <input
                    type="number"
                    step="0.1"
                    value={localThresholds.temperature.min}
                    onChange={(e) => handleChange('temperature', 'min', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-red-600 uppercase font-bold block mb-1">Max Threshold</span>
                  <input
                    type="number"
                    step="0.1"
                    value={localThresholds.temperature.max}
                    onChange={(e) => handleChange('temperature', 'max', e.target.value)}
                    className="w-full px-3 py-2 border border-red-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-2">Humidity (%)</label>
              <CurrentValueBadge value={currentValues.humidity} unit="%" />
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block mb-1">Min Threshold</span>
                  <input
                    type="number"
                    step="1"
                    value={localThresholds.humidity.min}
                    onChange={(e) => handleChange('humidity', 'min', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-red-600 uppercase font-bold block mb-1">Max Threshold</span>
                  <input
                    type="number"
                    step="1"
                    value={localThresholds.humidity.max}
                    onChange={(e) => handleChange('humidity', 'max', e.target.value)}
                    className="w-full px-3 py-2 border border-red-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-2">CO2 (%)</label>
              <CurrentValueBadge value={currentValues.co2} unit="%" />
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block mb-1">Min Threshold</span>
                  <input
                    type="number"
                    step="1"
                    value={localThresholds.co2.min}
                    onChange={(e) => handleChange('co2', 'min', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-red-600 uppercase font-bold block mb-1">Max Threshold</span>
                  <input
                    type="number"
                    step="1"
                    value={localThresholds.co2.max}
                    onChange={(e) => handleChange('co2', 'max', e.target.value)}
                    className="w-full px-3 py-2 border border-red-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="mt-8 flex justify-end">
        <button
          onClick={handleSave}
          className={`flex items-center gap-2 px-8 py-3 rounded-lg font-bold text-white transition-all duration-300 ${
            saved ? 'bg-green-500' : 'bg-blue-500 hover:bg-blue-600'
          }`}
        >
          <Save size={18} />
          {saved ? 'Settings Saved!' : 'Save Threshold Settings'}
        </button>
      </div>
    </div>
  );
};

export default SettingsWindow;
