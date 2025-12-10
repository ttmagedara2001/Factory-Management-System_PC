import { useState } from 'react';
import Card from '../../common/Card';
import ToggleSwitch from '../../common/ToggleSwitch';

const ControlsPanel = () => {
  const [motorOn, setMotorOn] = useState(false);
  const [ventilationAuto, setVentilationAuto] = useState(false);
  const [mode, setMode] = useState('manual');
  const [minVibration, setMinVibration] = useState(0);
  const [maxVibration, setMaxVibration] = useState(8);
  const [minPressure, setMinPressure] = useState(2);
  const [maxPressure, setMaxPressure] = useState(8);
  const [minTemp, setMinTemp] = useState(15);
  const [maxTemp, setMaxTemp] = useState(35);
  const [minHumidity, setMinHumidity] = useState(30);
  const [maxHumidity, setMaxHumidity] = useState(70);
  const [maxNoise, setMaxNoise] = useState(85);
  const [maxAQI, setMaxAQI] = useState(100);

  return (
    <Card className="col-span-2">
      <h3 className="text-lg font-semibold text-slate-800 mb-6">Controls & Settings</h3>
      
      <div className="space-y-6">
        {/* Machine Controls */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-slate-50 rounded-lg">
            <ToggleSwitch
              label="Main Conveyor Motor"
              checked={motorOn}
              onChange={setMotorOn}
            />
          </div>
          <div className="p-4 bg-slate-50 rounded-lg">
            <ToggleSwitch
              label={`Ventilation: ${ventilationAuto ? 'Auto' : 'Manual'}`}
              checked={ventilationAuto}
              onChange={setVentilationAuto}
            />
          </div>
        </div>

        {/* Mode Selector */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-3">Operating Mode</label>
          <div className="flex space-x-2 bg-slate-100 p-1 rounded-lg">
            {['auto', 'manual', 'maintenance'].map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`flex-1 py-2 px-4 rounded-md font-medium text-sm transition-all ${
                  mode === m
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {m.charAt(0).toUpperCase() + m.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Threshold Settings */}
        <div className="pt-4 border-t border-slate-200">
          <h4 className="text-sm font-medium text-slate-700 mb-4">Sensor Threshold Settings</h4>
          <div className="grid grid-cols-3 gap-6">
            {/* Vibration Thresholds */}
            <div>
              <h5 className="text-xs font-semibold text-slate-600 mb-3">Vibration (mm/s)</h5>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-slate-500">Min</label>
                  <input
                    type="number"
                    value={minVibration}
                    onChange={(e) => setMinVibration(Number(e.target.value))}
                    className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-400 text-sm"
                    min="0"
                    max="10"
                    step="0.1"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500">Max</label>
                  <input
                    type="number"
                    value={maxVibration}
                    onChange={(e) => setMaxVibration(Number(e.target.value))}
                    className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-400 text-sm"
                    min="0"
                    max="10"
                    step="0.1"
                  />
                </div>
              </div>
            </div>

            {/* Pressure Thresholds */}
            <div>
              <h5 className="text-xs font-semibold text-slate-600 mb-3">Pressure (bar)</h5>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-slate-500">Min</label>
                  <input
                    type="number"
                    value={minPressure}
                    onChange={(e) => setMinPressure(Number(e.target.value))}
                    className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-400 text-sm"
                    min="0"
                    max="10"
                    step="0.1"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500">Max</label>
                  <input
                    type="number"
                    value={maxPressure}
                    onChange={(e) => setMaxPressure(Number(e.target.value))}
                    className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-400 text-sm"
                    min="0"
                    max="10"
                    step="0.1"
                  />
                </div>
              </div>
            </div>

            {/* Temperature Thresholds */}
            <div>
              <h5 className="text-xs font-semibold text-slate-600 mb-3">Temperature (°C)</h5>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-slate-500">Min</label>
                  <input
                    type="number"
                    value={minTemp}
                    onChange={(e) => setMinTemp(Number(e.target.value))}
                    className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-400 text-sm"
                    min="0"
                    max="50"
                    step="0.5"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500">Max</label>
                  <input
                    type="number"
                    value={maxTemp}
                    onChange={(e) => setMaxTemp(Number(e.target.value))}
                    className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-400 text-sm"
                    min="0"
                    max="50"
                    step="0.5"
                  />
                </div>
              </div>
            </div>

            {/* Humidity Thresholds */}
            <div>
              <h5 className="text-xs font-semibold text-slate-600 mb-3">Humidity (%)</h5>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-slate-500">Min</label>
                  <input
                    type="number"
                    value={minHumidity}
                    onChange={(e) => setMinHumidity(Number(e.target.value))}
                    className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-400 text-sm"
                    min="0"
                    max="100"
                    step="1"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500">Max</label>
                  <input
                    type="number"
                    value={maxHumidity}
                    onChange={(e) => setMaxHumidity(Number(e.target.value))}
                    className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-400 text-sm"
                    min="0"
                    max="100"
                    step="1"
                  />
                </div>
              </div>
            </div>

            {/* Noise Level Threshold */}
            <div>
              <h5 className="text-xs font-semibold text-slate-600 mb-3">Noise Level (dB)</h5>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-slate-500">Max Safe Level</label>
                  <input
                    type="number"
                    value={maxNoise}
                    onChange={(e) => setMaxNoise(Number(e.target.value))}
                    className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-400 text-sm"
                    min="0"
                    max="120"
                    step="1"
                  />
                </div>
              </div>
            </div>

            {/* AQI Threshold */}
            <div>
              <h5 className="text-xs font-semibold text-slate-600 mb-3">Air Quality (AQI)</h5>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-slate-500">Max Acceptable</label>
                  <input
                    type="number"
                    value={maxAQI}
                    onChange={(e) => setMaxAQI(Number(e.target.value))}
                    className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-400 text-sm"
                    min="0"
                    max="200"
                    step="1"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default ControlsPanel;
