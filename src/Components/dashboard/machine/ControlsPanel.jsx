import { useState } from 'react';
import Card from '../../common/Card';

const ControlsPanel = ({ motorState, onMotorStateChange, emergencyStopActive }) => {
  const [ventilationOn, setVentilationOn] = useState(false);
  const [operatingMode, setOperatingMode] = useState('MANUAL');
  const [showToast, setShowToast] = useState(false);
  
  // Threshold states
  const [vibrationMin, setVibrationMin] = useState(2);
  const [vibrationMax, setVibrationMax] = useState(8);
  const [pressureMin, setPressureMin] = useState(12);
  const [pressureMax, setPressureMax] = useState(44);
  const [tempMin, setTempMin] = useState(15);
  const [tempMax, setTempMax] = useState(35);
  const [humidityMin, setHumidityMin] = useState(30);
  const [humidityMax, setHumidityMax] = useState(70);
  const [noiseMax, setNoiseMax] = useState(85);
  const [aqiMax, setAqiMax] = useState(100);

  const handleSaveSettings = () => {
    // TODO: POST to REST API endpoint
    const settings = {
      vibration: { min: vibrationMin, max: vibrationMax },
      pressure: { min: pressureMin, max: pressureMax },
      temperature: { min: tempMin, max: tempMax },
      humidity: { min: humidityMin, max: humidityMax },
      noise: { max: noiseMax },
      aqi: { max: aqiMax }
    };
    console.log('Saving settings:', settings);
    
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  const handleMotorToggle = () => {
    if (emergencyStopActive) {
      console.log('⚠️ Cannot change motor state - emergency stop is active');
      return;
    }
    const newState = motorState === 'RUN' ? 'STOP' : 'RUN';
    onMotorStateChange(newState);
    // TODO: Publish to MQTT protonest/<device>/state/updates
    console.log('Motor state:', newState);
  };

  const handleVentilationToggle = () => {
    if (operatingMode === 'AUTO') {
      console.log('⚠️ Cannot change ventilation - operating mode is AUTO');
      return;
    }
    setVentilationOn(!ventilationOn);
    // TODO: Publish to MQTT
    console.log('Ventilation state:', !ventilationOn ? 'ON' : 'OFF');
  };

  return (
    <Card className="space-y-8 text-center w-full">
      <div className="space-y-2">
        <h3 className="text-xl font-bold text-slate-900 tracking-tight">Control Panel & Configuration</h3>
        <p className="text-sm text-slate-500">
          Manage machine states and keep sensor thresholds aligned with your safety limits.
        </p>
      </div>
      
      <div className="space-y-6">
        {/* Machine Controls */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap- justify-items-center">
          {/* Main Conveyor Motor */}
          <div className="w-full p-4 bg-slate-50 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-slate-800">Main Conveyor Motor</span>
              <button
                onClick={handleMotorToggle}
                className={`px-4 py-1.5 rounded-full text-sm font-bold transition-all ${
                  motorState === 'RUN'
                    ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                    : 'bg-red-500 text-white hover:bg-red-600'
                }`}
              >
                {motorState}
              </button>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-slate-500">Power Switch</label>
              <div className="flex-1 flex items-center gap-2">
                <button
                  onClick={() => !emergencyStopActive && onMotorStateChange('STOP')}
                  disabled={emergencyStopActive}
                  className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-colors ${
                    motorState === 'STOP'
                      ? 'bg-red-600 text-white'
                      : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                  } ${emergencyStopActive ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  STOP
                </button>
                <button
                  onClick={() => !emergencyStopActive && onMotorStateChange('RUN')}
                  disabled={emergencyStopActive}
                  className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-colors ${
                    motorState === 'RUN'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                  } ${emergencyStopActive ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  RUN
                </button>
              </div>
            </div>
          </div>

          {/* Ventilation Control */}
          <div className="w-full p-4 bg-slate-50 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-slate-800">Ventilation System</span>
              {operatingMode === 'AUTO' ? (
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-700">
                  AUTO
                </span>
              ) : (
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                  ventilationOn
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-slate-200 text-slate-700'
                }`}>
                  {ventilationOn ? 'ON' : 'OFF'}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-slate-500">Toggle Control</label>
              <button
                onClick={handleVentilationToggle}
                disabled={operatingMode === 'AUTO'}
                className={`flex-1 py-2 px-4 text-white text-xs font-medium rounded transition-colors ${
                  operatingMode === 'AUTO'
                    ? 'bg-slate-400 cursor-not-allowed'
                    : 'bg-slate-700 hover:bg-slate-800'
                }`}
              >
                {operatingMode === 'AUTO' ? 'Disabled (Auto Mode)' : 'Toggle ON/OFF'}
              </button>
            </div>
          </div>
        </div>

        {/* Operating Mode Selector */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-3">Operating Mode</label>
          <select
            value={operatingMode}
            onChange={(e) => setOperatingMode(e.target.value)}
            className="w-full px-4 py-2.5 border-2 border-slate-300 rounded-lg text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-slate-400 bg-white shadow-sm"
          >
            <option value="MANUAL">MANUAL</option>
            <option value="AUTO">AUTO</option>
            <option value="MAINTENANCE">MAINTENANCE</option>
          </select>
        </div>

        {/* Threshold Configuration */}
        <div className="pt-4 border-t border-slate-200">
          <h4 className="text-sm font-semibold text-slate-800 mb-4">Sensor Threshold Configuration</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 justify-items-center">
            {/* Motor Vibration */}
            <div className="space-y-2 bg-slate-50 border border-slate-200 rounded-xl p-4 shadow-sm w-full">
              <h5 className="text-xs font-semibold text-slate-800">Motor Vibration (mm/s)</h5>
              <div className="space-y-2">
                <input
                  type="number"
                  value={vibrationMin}
                  onChange={(e) => setVibrationMin(Number(e.target.value))}
                  placeholder="Min"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-400 text-center"
                />
                <input
                  type="number"
                  value={vibrationMax}
                  onChange={(e) => setVibrationMax(Number(e.target.value))}
                  placeholder="Max"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-400 text-center"
                />
              </div>
            </div>

            {/* Hydraulic Pressure */}
            <div className="space-y-2 bg-slate-50 border border-slate-200 rounded-xl p-4 shadow-sm w-full">
              <h5 className="text-xs font-semibold text-slate-800">Hydraulic Pressure (bar)</h5>
              <div className="space-y-2">
                <input
                  type="number"
                  value={pressureMin}
                  onChange={(e) => setPressureMin(Number(e.target.value))}
                  placeholder="Min"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-400 text-center"
                />
                <input
                  type="number"
                  value={pressureMax}
                  onChange={(e) => setPressureMax(Number(e.target.value))}
                  placeholder="Max"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-400 text-center"
                />
              </div>
            </div>

            {/* Temperature */}
            <div className="space-y-2 bg-slate-50 border border-slate-200 rounded-xl p-4 shadow-sm w-full">
              <h5 className="text-xs font-semibold text-slate-800">Temperature (°C)</h5>
              <div className="space-y-2">
                <input
                  type="number"
                  value={tempMin}
                  onChange={(e) => setTempMin(Number(e.target.value))}
                  placeholder="Min"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-400 text-center"
                />
                <input
                  type="number"
                  value={tempMax}
                  onChange={(e) => setTempMax(Number(e.target.value))}
                  placeholder="Max"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-400 text-center"
                />
              </div>
            </div>

            {/* Humidity */}
            <div className="space-y-2 bg-slate-50 border border-slate-200 rounded-xl p-4 shadow-sm w-full">
              <h5 className="text-xs font-semibold text-slate-800">Humidity (%)</h5>
              <div className="space-y-2">
                <input
                  type="number"
                  value={humidityMin}
                  onChange={(e) => setHumidityMin(Number(e.target.value))}
                  placeholder="Min"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-400 text-center"
                />
                <input
                  type="number"
                  value={humidityMax}
                  onChange={(e) => setHumidityMax(Number(e.target.value))}
                  placeholder="Max"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-400 text-center"
                />
              </div>
            </div>

            {/* Noise Level */}
            <div className="space-y-2 bg-slate-50 border border-slate-200 rounded-xl p-4 shadow-sm w-full">
              <h5 className="text-xs font-semibold text-slate-800">Noise Level (dB)</h5>
              <input
                type="number"
                value={noiseMax}
                onChange={(e) => setNoiseMax(Number(e.target.value))}
                placeholder="Max"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-400 text-center"
              />
            </div>

            {/* Air Quality */}
            <div className="space-y-2 bg-slate-50 border border-slate-200 rounded-xl p-4 shadow-sm w-full">
              <h5 className="text-xs font-semibold text-slate-800">Air Quality (AQI)</h5>
              <input
                type="number"
                value={aqiMax}
                onChange={(e) => setAqiMax(Number(e.target.value))}
                placeholder="Max"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-400 text-center"
              />
            </div>
          </div>

          {/* Save Button */}
          <div className="mt-6">
            <button
              onClick={handleSaveSettings}
              className="w-full py-3 bg-slate-900 text-white font-semibold rounded-xl hover:bg-slate-800 transition-colors shadow-md"
            >
              Save Settings
            </button>
          </div>
        </div>
      </div>

      {/* Toast Notification */}
      {showToast && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-emerald-600 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-2 z-50 max-w-sm w-[92%] sm:w-auto">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span className="font-medium">Settings Saved!</span>
        </div>
      )}
    </Card>
  );
};

export default ControlsPanel;
