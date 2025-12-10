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
    <Card>
      <div className="space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-sm font-medium text-slate-500 mb-2">Air Quality Index (AQI)</h3>
            <div className="flex items-baseline">
              <span className={`text-4xl font-bold ${status.color}`}>
                {validAqi}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">{status.desc}</p>
          </div>
          <div className="flex flex-col items-end">
            <div className={`mb-2 ${status.color}`}>
              <AirQualityIcon className="w-8 h-8" />
            </div>
            <Badge status={status.badge}>{status.status}</Badge>
          </div>
        </div>

        {/* AQI Progress Bar */}
        <div className="space-y-2">
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${getAQIColor()}`}
              style={{ width: `${Math.min((validAqi / 200) * 100, 100)}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-slate-400">
            <span>Good (0-50)</span>
            <span>Hazardous (150+)</span>
          </div>
        </div>

        {/* Additional Metrics */}
        <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-100">
          <div>
            <p className="text-xs text-slate-500">PM2.5</p>
            <p className="text-lg font-semibold text-slate-700">{validPm25.toFixed(1)} <span className="text-xs text-slate-400">µg/m³</span></p>
          </div>
          <div>
            <p className="text-xs text-slate-500">CO₂</p>
            <p className="text-lg font-semibold text-slate-700">{validCo2} <span className="text-xs text-slate-400">ppm</span></p>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default AirQualityDisplay;
