import React, { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import EnvironmentCard from './EnvironmentCard';
import Gauge from './Gauge';

const RealTimeWindow = ({ thresholds, sensorData, webSocketClient, selectedDevice }) => {
  const [ventilation, setVentilation] = useState(true);
  
  const handleVentilationToggle = () => {
    // Local state control only - no WebSocket commands
    setVentilation(!ventilation);
  };

  // Current values - to be populated from real-time WebSocket data
  const currentValues = {
    vibration: sensorData?.vibration ?? null,
    pressure: sensorData?.pressure ?? null,
    noise: sensorData?.noise ?? null,
    temperature: sensorData?.temperature ?? null,
    humidity: sensorData?.humidity ?? null,
    co2: sensorData?.co2 ?? null,
    airQuality: sensorData?.airQuality ?? null
    // units removed: now handled in Dashboard
  };

  // Check if value is critical or warning
  const getAlertLevel = (metric, value) => {
    const threshold = thresholds[metric];
    if (!threshold || value === null || value === undefined) return null;
    // Critical
    if (metric === 'vibration' && value >= threshold.critical) return 'critical';
    if (metric === 'noise' && value >= threshold.critical) return 'critical';
    if ((metric === 'temperature' || metric === 'humidity' || metric === 'co2') && (value <= threshold.min || value >= threshold.max)) return 'critical';
    if (metric === 'pressure' && (value <= threshold.min || value >= threshold.max)) return 'critical';
    // Warning
    if (metric === 'vibration' && value >= threshold.warning) return 'warning';
    if (metric === 'noise' && value >= threshold.warning) return 'warning';
    if (metric === 'humidity' && value > 70) return 'warning';
    if (metric === 'temperature' && value > (threshold.warning ?? 35)) return 'warning';
    if (metric === 'co2' && value > 800) return 'warning';
    if (metric === 'pressure' && value > (threshold.warning ?? 50)) return 'warning';
    return null;
  };

  return (
    <div className="space-y-6 mt-8">
      {/* Machine Performance */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <h3 className="font-bold text-slate-800 uppercase">Machine Performance</h3>
          <span className="text-slate-400">|</span>
          <span className="font-bold text-slate-600 uppercase">Real Time</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Vibration Gauge with alert */}
          <div className="relative">
            <Gauge
              value={currentValues.vibration ?? '--'}
              unit="mm/s"
              label="Vibration"
              color={getAlertLevel('vibration', currentValues.vibration) === 'critical' ? '#EF4444' : getAlertLevel('vibration', currentValues.vibration) === 'warning' ? '#F59E0B' : '#A855F7'}
              percentage={currentValues.vibration ? (currentValues.vibration / 10) * 100 : 0}
              maxValue={10}
            />
            {getAlertLevel('vibration', currentValues.vibration) && (
              <AlertTriangle size={22} className={`absolute top-2 right-2 ${getAlertLevel('vibration', currentValues.vibration) === 'critical' ? 'text-red-500' : 'text-yellow-500'}`} title={getAlertLevel('vibration', currentValues.vibration) + ' alert'} />
            )}
          </div>
          {/* Pressure Gauge with alert */}
          <div className="relative">
            <Gauge
              value={currentValues.pressure ?? '--'}
              unit="bar"
              label="Pressure"
              color={getAlertLevel('pressure', currentValues.pressure) === 'critical' ? '#EF4444' : getAlertLevel('pressure', currentValues.pressure) === 'warning' ? '#F59E0B' : '#3B82F6'}
              percentage={currentValues.pressure ? (currentValues.pressure / 100) * 100 : 0}
            />
            {getAlertLevel('pressure', currentValues.pressure) && (
              <AlertTriangle size={22} className={`absolute top-2 right-2 ${getAlertLevel('pressure', currentValues.pressure) === 'critical' ? 'text-red-500' : 'text-yellow-500'}`} title={getAlertLevel('pressure', currentValues.pressure) + ' alert'} />
            )}
          </div>
          {/* Noise Gauge with alert */}
          <div className="relative">
            <Gauge
              value={currentValues.noise ?? '--'}
              unit="dB"
              label="Noise Level"
              color={getAlertLevel('noise', currentValues.noise) === 'critical' ? '#EF4444' : getAlertLevel('noise', currentValues.noise) === 'warning' ? '#F59E0B' : '#F59E0B'}
              percentage={currentValues.noise ? (currentValues.noise / 100) * 100 : 0}
            />
            {getAlertLevel('noise', currentValues.noise) && (
              <AlertTriangle size={22} className={`absolute top-2 right-2 ${getAlertLevel('noise', currentValues.noise) === 'critical' ? 'text-red-500' : 'text-yellow-500'}`} title={getAlertLevel('noise', currentValues.noise) + ' alert'} />
            )}
          </div>
          {/* Units Gauge removed: now handled in Dashboard */}
        </div>
      </div>

      {/* Environment Analysis */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <h3 className="font-bold text-slate-800 uppercase">Environment Analysis</h3>
          <span className="text-slate-400">|</span>
          <span className="font-bold text-slate-600 uppercase">Real Time</span>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-4">
          {/* Temperature Card with alert */}
          <EnvironmentCard
            value={currentValues.temperature !== null ? `${currentValues.temperature}°C` : '--'}
            label="Temperature"
            borderColor={getAlertLevel('temperature', currentValues.temperature) === 'critical' ? 'bg-red-500' : getAlertLevel('temperature', currentValues.temperature) === 'warning' ? 'bg-yellow-500' : 'bg-green-500'}
            valueColor={getAlertLevel('temperature', currentValues.temperature) === 'critical' ? 'text-red-600' : getAlertLevel('temperature', currentValues.temperature) === 'warning' ? 'text-yellow-600' : 'text-slate-700'}
            alertLevel={getAlertLevel('temperature', currentValues.temperature)}
          />
          {/* Humidity Card with alert */}
          <EnvironmentCard
            value={currentValues.humidity !== null ? `${currentValues.humidity}%` : '--'}
            label="Humidity"
            borderColor={getAlertLevel('humidity', currentValues.humidity) === 'critical' ? 'bg-red-500' : getAlertLevel('humidity', currentValues.humidity) === 'warning' ? 'bg-yellow-500' : 'bg-blue-500'}
            valueColor={getAlertLevel('humidity', currentValues.humidity) === 'critical' ? 'text-red-600' : getAlertLevel('humidity', currentValues.humidity) === 'warning' ? 'text-yellow-600' : 'text-slate-700'}
            alertLevel={getAlertLevel('humidity', currentValues.humidity)}
          />
          {/* CO2 Card with alert */}
          <EnvironmentCard
            value={currentValues.co2 !== null ? `${currentValues.co2}%` : '--'}
            label="CO2"
            borderColor={getAlertLevel('co2', currentValues.co2) === 'critical' ? 'bg-red-500' : getAlertLevel('co2', currentValues.co2) === 'warning' ? 'bg-yellow-500' : 'bg-pink-500'}
            valueColor={getAlertLevel('co2', currentValues.co2) === 'critical' ? 'text-red-600' : getAlertLevel('co2', currentValues.co2) === 'warning' ? 'text-yellow-600' : 'text-slate-700'}
            alertLevel={getAlertLevel('co2', currentValues.co2)}
          />
        </div>

        {/* Air Quality Row */}
        <div className="bg-white p-3 px-6 rounded-xl shadow-sm border border-slate-100 flex items-center justify-between mt-4">
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-slate-500 uppercase">Air Quality Index:</span>
            <span className={`font-bold flex items-center gap-1 ${
              currentValues.airQuality === null ? 'text-slate-400' :
              currentValues.airQuality < 50 ? 'text-red-600' :
              currentValues.airQuality < 75 ? 'text-yellow-600' :
              'text-green-600'
            }`}>
              {currentValues.airQuality !== null ? currentValues.airQuality : '--'}
            </span>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex flex-col items-end">
              <span className="text-[10px] font-bold text-slate-600 uppercase">Ventilation Control:</span>
              <span className="text-[8px] bg-green-200 text-green-800 px-1 rounded uppercase font-bold">Manual</span>
            </div>
            
            <div 
              className={`w-12 h-6 rounded-full p-1 cursor-pointer transition-colors duration-300 ${ventilation ? 'bg-green-500' : 'bg-slate-300'}`}
              onClick={handleVentilationToggle}
            >
              <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-300 ${ventilation ? 'translate-x-6' : 'translate-x-0'}`}></div>
            </div>
            <span className="text-xs font-bold text-slate-700">{ventilation ? 'ON' : 'OFF'}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RealTimeWindow;
