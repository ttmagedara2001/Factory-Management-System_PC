import Card from '../../common/Card';
import Badge from '../../common/Badge';
import { AirQualityIcon } from '../../icons/SensorIcons';

const AirQualityDisplay = ({ aqi = 0, pm25 = 0, co2 = 0 }) => {
  const validAqi = isNaN(aqi) ? 0 : Number(aqi);
  const validPm25 = isNaN(pm25) ? 0 : Number(pm25);
  const validCo2 = isNaN(co2) ? 0 : Number(co2);
  
  const getAQIStatus = () => {
    if (validAqi <= 50) return { status: 'Good', color: 'text-emerald-600', badge: 'good', desc: 'Air quality is satisfactory' };
    if (validAqi <= 100) return { status: 'Moderate', color: 'text-amber-600', badge: 'idle', desc: 'Acceptable air quality' };
    if (validAqi <= 150) return { status: 'Unhealthy', color: 'text-red-600', badge: 'fault', desc: 'May cause health issues' };
    return { status: 'Hazardous', color: 'text-red-700', badge: 'fault', desc: 'Health alert' };
  };

  const status = getAQIStatus();

  const getAQIColor = () => {
    if (validAqi <= 50) return 'bg-emerald-500';
    if (validAqi <= 100) return 'bg-amber-500';
    if (validAqi <= 150) return 'bg-red-500';
    return 'bg-red-700';
  };

  return (
    <div className="bg-white rounded-xl p-10 shadow-md hover:shadow-lg transition-all duration-300 border-t-4 border-red-400 relative overflow-hidden">
      <div className="flex flex-col items-center justify-center text-center space-y-2">
        <div className="text-4xl font-bold text-slate-800">
          {validAqi}
        </div>
        <div className="text-sm text-slate-500 font-medium uppercase tracking-wide">Air Quality Index (AQI)</div>
        <div className="text-xs text-slate-400">{status.desc}</div>
      </div>
    </div>
  );
};

export default AirQualityDisplay;
