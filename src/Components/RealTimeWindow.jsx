import React, { useState } from 'react';
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
  };

  // Check if value is critical
  const isCritical = (metric, value) => {
    const threshold = thresholds[metric];
    if (!threshold) return false;
    
    // For vibration and noise: check if value exceeds critical level
    if (metric === 'vibration' || metric === 'noise') {
      return value >= threshold.critical;
    }
    
    // For temperature, humidity, co2: check if value is outside min/max range
    if (metric === 'temperature' || metric === 'humidity' || metric === 'co2') {
      return value <= threshold.min || value >= threshold.max;
    }
    
    // For pressure: check against min, max, or warning
    if (metric === 'pressure') {
      return value <= threshold.min || value >= threshold.max;
    }
    
    return false;
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Gauge 
            value={currentValues.vibration ?? '--'} 
            unit="mm/s" 
            label="Vibration" 
            color="#A855F7" 
            percentage={currentValues.vibration ? (currentValues.vibration / 10) * 100 : 0} 
            maxValue={10} 
          />
          <Gauge 
            value={currentValues.pressure ?? '--'} 
            unit="bar" 
            label="Pressure" 
            color="#3B82F6" 
            percentage={currentValues.pressure ? (currentValues.pressure / 100) * 100 : 0} 
          />
          <Gauge 
            value={currentValues.noise ?? '--'} 
            unit="dB" 
            label="Noise Level" 
            color="#F59E0B" 
            percentage={currentValues.noise ? (currentValues.noise / 100) * 100 : 0} 
          />
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
          <EnvironmentCard 
            value={currentValues.temperature !== null ? `${currentValues.temperature}°C` : '--'} 
            label="Temperature" 
            borderColor={isCritical('temperature', currentValues.temperature) ? 'bg-red-500' : 'bg-green-500'}
          />
          <EnvironmentCard 
            value={currentValues.humidity !== null ? `${currentValues.humidity}%` : '--'} 
            label="Humidity" 
            borderColor={isCritical('humidity', currentValues.humidity) ? 'bg-red-500' : 'bg-blue-500'}
          />
          <EnvironmentCard 
            value={currentValues.co2 !== null ? `${currentValues.co2}%` : '--'} 
            label="CO2" 
            borderColor={isCritical('co2', currentValues.co2) ? 'bg-red-500' : 'bg-pink-500'}
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
