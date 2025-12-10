import { useState } from 'react';
import Header from '../components/layout/Header';
import TabNavigation from '../components/layout/TabNavigation';
import KpiCard from '../components/dashboard/production/KpiCard';
import ProductionLog from '../components/dashboard/production/ProductionLog';
import ProductionChart from '../components/dashboard/production/ProductionChart';
import VibrationGauge from '../components/dashboard/machine/VibrationGauge';
import PressureDisplay from '../components/dashboard/machine/PressureDisplay';
import TemperatureDisplay from '../components/dashboard/machine/TemperatureDisplay';
import HumidityDisplay from '../components/dashboard/machine/HumidityDisplay';
import NoiseLevelDisplay from '../components/dashboard/machine/NoiseLevelDisplay';
import AirQualityDisplay from '../components/dashboard/machine/AirQualityDisplay';
import MultiSensorChart from '../components/dashboard/machine/MultiSensorChart';
import EnvironmentalChart from '../components/dashboard/machine/EnvironmentalChart';
import ControlsPanel from '../components/dashboard/machine/ControlsPanel';
import EmergencyStop from '../components/common/EmergencyStop';
import useFactoryData from '../hooks/useFactoryData';

// Dummy data for demonstration
const DUMMY_DEVICES = [
  { id: 'device-1', name: 'Production Line A' },
  { id: 'device-2', name: 'Production Line B' },
  { id: 'device-3', name: 'Quality Control Station' },
];

const DUMMY_PRODUCTION_LOGS = [
  { time: '14:32:15', rfid: 'E200001A45BC0123', product: 'Widget X-1000', status: 'Scanned' },
  { time: '14:31:58', rfid: 'E200001A45BC0122', product: 'Widget X-1000', status: 'Scanned' },
  { time: '14:31:42', rfid: 'E200001A45BC0121', product: 'Widget X-999', status: 'Scanned' },
  { time: '14:31:18', rfid: 'E200001A45BC0120', product: 'Widget X-1000', status: 'Pending' },
  { time: '14:30:55', rfid: 'E200001A45BC0119', product: 'Widget X-1000', status: 'Scanned' },
  { time: '14:30:32', rfid: 'E200001A45BC0118', product: 'Widget X-999', status: 'Scanned' },
  { time: '14:30:08', rfid: 'E200001A45BC0117', product: 'Widget X-1000', status: 'Scanned' },
  { time: '14:29:45', rfid: 'E200001A45BC0116', product: 'Widget X-1000', status: 'Scanned' },
];

const DUMMY_PRODUCTION_TREND = [
  { day: 'Mon', production: 1850, target: 2046 },
  { day: 'Tue', production: 1920, target: 2046 },
  { day: 'Wed', production: 1780, target: 2046 },
  { day: 'Thu', production: 2100, target: 2046 },
  { day: 'Fri', production: 1950, target: 2046 },
  { day: 'Sat', production: 1650, target: 2046 },
  { day: 'Today', production: 1024, target: 2046 },
];

const DUMMY_SENSOR_DATA = Array.from({ length: 20 }, (_, i) => ({
  time: `${14 - Math.floor(i / 4)}:${String((60 - (i % 4) * 15)).padStart(2, '0')}`,
  vibration: (4 + Math.random() * 3).toFixed(1),
  temperature: (25 + Math.random() * 8).toFixed(1),
  pressure: (4 + Math.random() * 2).toFixed(1),
})).reverse();

const DUMMY_ENVIRONMENTAL_DATA = Array.from({ length: 24 }, (_, i) => ({
  time: `${String(i).padStart(2, '0')}:00`,
  temperature: (20 + Math.random() * 15).toFixed(1),
  humidity: (40 + Math.random() * 30).toFixed(1),
  noise: (60 + Math.random() * 25).toFixed(1),
  aqi: Math.floor(30 + Math.random() * 70),
}));

const DashboardHome = () => {
  const [activeTab, setActiveTab] = useState('production');
  const [selectedDevice, setSelectedDevice] = useState(DUMMY_DEVICES[0].id);
  const { data } = useFactoryData(selectedDevice);

  const handleEmergencyStop = () => {
    console.log('🚨 EMERGENCY STOP ACTIVATED');
    alert('Emergency stop activated! All machinery will halt.');
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <Header
        userId="369718963810018K"
        factoryStatus={data.status}
        selectedDevice={selectedDevice}
        onDeviceChange={setSelectedDevice}
        devices={DUMMY_DEVICES}
      />

      {/* Tab Navigation */}
      <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'production' ? (
          <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <KpiCard
                title="Daily Production"
                value={data.production.daily}
                unit="units"
                trend={12.5}
                icon="📦"
              />
              <KpiCard
                title="Target Production"
                value={data.production.target}
                unit="units"
                icon="🎯"
              />
              <KpiCard
                title="Overall Efficiency"
                value={data.production.efficiency}
                unit="%"
                trend={-2.1}
                icon="⚡"
              />
            </div>

            {/* Emergency Stop Button */}
            <EmergencyStop onStop={handleEmergencyStop} />

            {/* Production Chart */}
            <ProductionChart data={DUMMY_PRODUCTION_TREND} />

            {/* Production Log */}
            <ProductionLog logs={DUMMY_PRODUCTION_LOGS} />
          </div>
        ) : (
          <div className="space-y-6">
            {/* All Sensor Displays in Order */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <VibrationGauge value={parseFloat(data.sensors.vibration)} />
              <PressureDisplay
                pressure={parseFloat(data.sensors.pressure)}
                airQuality={data.sensors.airQuality}
              />
              <TemperatureDisplay 
                temperature={parseFloat(data.sensors.temperature)} 
                trend={1.5}
              />
              <HumidityDisplay humidity={parseFloat(data.sensors.humidity)} />
              <NoiseLevelDisplay noiseLevel={parseFloat(data.sensors.noiseLevel)} />
              <AirQualityDisplay 
                aqi={data.sensors.aqi} 
                pm25={parseFloat(data.sensors.pm25)} 
                co2={data.sensors.co2} 
              />
            </div>

            {/* Multi-Sensor Chart */}
            <div className="grid grid-cols-1 gap-6">
              <MultiSensorChart data={DUMMY_SENSOR_DATA} />
            </div>

            {/* Environmental Historical Data */}
            <div className="grid grid-cols-1 gap-6">
              <EnvironmentalChart data={DUMMY_ENVIRONMENTAL_DATA} />
            </div>

            {/* Controls Panel */}
            <div className="grid grid-cols-1 gap-6">
              <ControlsPanel />
            </div>

            {/* Emergency Stop Button */}
            <EmergencyStop onStop={handleEmergencyStop} />
          </div>
        )}
      </main>
    </div>
  );
};

export default DashboardHome;
