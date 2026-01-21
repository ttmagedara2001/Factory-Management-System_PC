import React, { useState } from 'react';
import EnvironmentCard from './EnvironmentCard';
import Gauge from './Gauge';
import { updateStateDetails } from '../services/deviceService.js';

const RealTimeWindow = ({ thresholds, sensorData, selectedDevice, controlMode = 'manual' }) => {
  const [ventilation, setVentilation] = useState(true);
  const [isSendingCommand, setIsSendingCommand] = useState(false);

  /**
   * Handle ventilation toggle - sends command via HTTP API
   * Uses POST /user/update-state-details endpoint
   */
  const handleVentilationToggle = async () => {
    if (!selectedDevice) {
      console.warn('[RealTimeWindow] No device selected for ventilation control');
      return;
    }

    const newVentilation = !ventilation;
    const command = newVentilation ? 'on' : 'off';

    setIsSendingCommand(true);

    try {
      // Send ventilation command via HTTP API
      console.log(`📡 [RealTimeWindow] Sending ventilation command to ${selectedDevice}: ${command}`);

      await updateStateDetails(selectedDevice, 'ventilation', {
        ventilation: command,
        mode: controlMode,
        timestamp: new Date().toISOString()
      });

      console.log(`✅ [RealTimeWindow] Ventilation command sent successfully: ${command}`);
      setVentilation(newVentilation);
    } catch (error) {
      console.error('❌ [RealTimeWindow] Failed to send ventilation command:', error);
      alert('Failed to update ventilation. Please try again.');
    } finally {
      setIsSendingCommand(false);
    }
  };

  // Current values from real-time WebSocket data
  const currentValues = {
    vibration: sensorData?.vibration ?? null,
    pressure: sensorData?.pressure ?? null,
    noise: sensorData?.noise ?? null,
    temperature: sensorData?.temperature ?? null,
    humidity: sensorData?.humidity ?? null,
    co2: sensorData?.co2 ?? null,
    airQuality: sensorData?.airQuality ?? null,
    units: sensorData?.units ?? null
  };

  /**
   * Get status for a sensor: 'safe', 'warning', or 'critical'
   * Returns null if no value or no threshold defined
   */
  const getStatus = (metric, value) => {
    if (value === null || value === undefined) return null;

    const t = thresholds[metric];

    // Check for critical conditions first
    switch (metric) {
      case 'vibration':
        if (t?.critical && value >= t.critical) return 'critical';
        if (t?.warning && value >= t.warning) return 'warning';
        return 'safe';

      case 'noise':
        if (t?.critical && value >= t.critical) return 'critical';
        if (t?.warning && value >= t.warning) return 'warning';
        return 'safe';

      case 'pressure':
        if (t?.min && value <= t.min) return 'critical';
        if (t?.max && value >= t.max) return 'critical';
        if (t?.warning && value >= t.warning) return 'warning';
        return 'safe';

      case 'temperature':
        if (t?.min && value <= t.min) return 'critical';
        if (t?.max && value >= t.max) return 'critical';
        if (value > (t?.warning ?? 35)) return 'warning';
        return 'safe';

      case 'humidity':
        if (t?.min && value <= t.min) return 'critical';
        if (t?.max && value >= t.max) return 'critical';
        if (value > 70) return 'warning';
        return 'safe';

      case 'co2':
        if (t?.max && value >= t.max) return 'critical';
        if (value > 800) return 'warning';
        return 'safe';

      default:
        return 'safe';
    }
  };

  /**
   * Get AQI status based on value
   * Higher AQI = better air quality
   */
  const getAQIStatus = (value) => {
    if (value === null || value === undefined) return null;
    if (value < 50) return 'critical';
    if (value < 75) return 'warning';
    return 'safe';
  };

  return (
    <div className="space-y-4 sm:space-y-6 mt-4 sm:mt-8">
      {/* Machine Performance Section */}
      <div>
        <div className="flex flex-wrap items-center gap-1 sm:gap-2 mb-3 sm:mb-4">
          <div className="p-1.5 bg-slate-100 rounded-lg">
            <svg className="w-4 h-4 text-slate-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h3 className="text-sm sm:text-base font-bold text-slate-800 uppercase">Machine Performance</h3>
          <span className="text-slate-400 hidden sm:inline">|</span>
          <span className="text-xs sm:text-base font-bold text-slate-600 uppercase">Real Time</span>
        </div>

        <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-6">
          {/* Vibration Gauge */}
          <Gauge
            value={currentValues.vibration ?? '--'}
            unit="mm/s"
            label="Vibration"
            percentage={currentValues.vibration ? (currentValues.vibration / 10) * 100 : 0}
            maxValue={10}
            status={getStatus('vibration', currentValues.vibration)}
          />

          {/* Pressure Gauge */}
          <Gauge
            value={currentValues.pressure ?? '--'}
            unit="bar"
            label="Pressure"
            percentage={currentValues.pressure ? (currentValues.pressure / 100) * 100 : 0}
            maxValue={100}
            status={getStatus('pressure', currentValues.pressure)}
          />

          {/* Noise Gauge */}
          <Gauge
            value={currentValues.noise ?? '--'}
            unit="dB"
            label="Noise Level"
            percentage={currentValues.noise ? (currentValues.noise / 100) * 100 : 0}
            maxValue={100}
            status={getStatus('noise', currentValues.noise)}
          />
        </div>
      </div>

      {/* Environment Analysis Section */}
      <div>
        <div className="flex flex-wrap items-center gap-1 sm:gap-2 mb-3 sm:mb-4">
          <div className="p-1.5 bg-slate-100 rounded-lg">
            <svg className="w-4 h-4 text-slate-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-sm sm:text-base font-bold text-slate-800 uppercase">Environment Analysis</h3>
          <span className="text-slate-400 hidden sm:inline">|</span>
          <span className="text-xs sm:text-base font-bold text-slate-600 uppercase">Real Time</span>
        </div>

        <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-6 mb-3 sm:mb-4">
          {/* Temperature Card */}
          <EnvironmentCard
            value={currentValues.temperature !== null ? `${currentValues.temperature}°C` : '--'}
            label="Temperature"
            alertLevel={getStatus('temperature', currentValues.temperature)}
          />

          {/* Humidity Card */}
          <EnvironmentCard
            value={currentValues.humidity !== null ? `${currentValues.humidity}%` : '--'}
            label="Humidity"
            alertLevel={getStatus('humidity', currentValues.humidity)}
          />

          {/* CO2 Card */}
          <EnvironmentCard
            value={currentValues.co2 !== null ? `${currentValues.co2}%` : '--'}
            label="CO2"
            alertLevel={getStatus('co2', currentValues.co2)}
          />
        </div>

        {/* Air Quality Row */}
        <div className={`p-3 sm:px-6 rounded-xl shadow-sm border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 mt-3 sm:mt-4 transition-all duration-300 ${getAQIStatus(currentValues.airQuality) === 'critical' ? 'bg-red-50 border-red-200' :
          getAQIStatus(currentValues.airQuality) === 'warning' ? 'bg-amber-50 border-amber-200' :
            currentValues.airQuality ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-slate-100'
          }`}>
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase">Air Quality Index:</span>
            <span className={`font-bold text-lg flex items-center gap-1 transition-colors duration-300 ${currentValues.airQuality === null ? 'text-slate-400' :
              currentValues.airQuality < 50 ? 'text-red-600' :
                currentValues.airQuality < 75 ? 'text-amber-600' : 'text-emerald-600'
              }`}>
              {currentValues.airQuality !== null ? currentValues.airQuality : '--'}
              {currentValues.airQuality !== null && (
                <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${currentValues.airQuality < 50 ? 'bg-red-100 text-red-700' :
                  currentValues.airQuality < 75 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                  }`}>
                  {currentValues.airQuality < 50 ? 'POOR' : currentValues.airQuality < 75 ? 'FAIR' : 'GOOD'}
                </span>
              )}
            </span>
          </div>

          <div className="flex items-center gap-2 sm:gap-4 w-full sm:w-auto justify-between sm:justify-end">
            <div className="flex flex-col items-start sm:items-end">
              <span className="text-[9px] sm:text-[10px] font-bold text-slate-600 uppercase">Ventilation Control:</span>
              <span className={`text-[7px] sm:text-[8px] px-1 rounded uppercase font-bold ${controlMode === 'manual' ? 'bg-blue-200 text-blue-800' : 'bg-green-200 text-green-800'
                }`}>{controlMode === 'manual' ? 'Manual' : 'Auto'}</span>
            </div>

            <div
              className={`w-10 sm:w-12 h-5 sm:h-6 rounded-full p-0.5 sm:p-1 transition-colors duration-300 ${isSendingCommand ? 'opacity-50 cursor-wait' : 'cursor-pointer'
                } ${ventilation ? 'bg-emerald-500' : 'bg-slate-300'}`}
              onClick={!isSendingCommand ? handleVentilationToggle : undefined}
            >
              <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-300 ${ventilation ? 'translate-x-5 sm:translate-x-6' : 'translate-x-0'}`}></div>
            </div>
            <span className="text-[10px] sm:text-xs font-bold text-slate-700">
              {isSendingCommand ? '...' : (ventilation ? 'ON' : 'OFF')}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RealTimeWindow;
