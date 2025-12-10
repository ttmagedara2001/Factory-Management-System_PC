import Card from '../../common/Card';
import { DropletIcon } from '../../icons/SensorIcons';

const HumidityDisplay = ({ humidity = 0, unit = '%' }) => {
  const validHumidity = isNaN(humidity) ? 0 : Number(humidity);
  
  const getHumidityStatus = () => {
    if (validHumidity < 30) return { status: 'Low', color: 'text-amber-600', bg: 'bg-amber-50' };
    if (validHumidity > 70) return { status: 'High', color: 'text-red-600', bg: 'bg-red-50' };
    return { status: 'Optimal', color: 'text-emerald-600', bg: 'bg-emerald-50' };
  };

  const status = getHumidityStatus();

  const getBarColor = () => {
    if (validHumidity < 30) return 'bg-amber-500';
    if (validHumidity > 70) return 'bg-red-500';
    return 'bg-emerald-500';
  };

  return (
    <Card>
      <div className="space-y-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="text-sm font-medium text-slate-500 mb-2">Humidity</h3>
            <div className="flex items-baseline">
              <span className={`text-4xl font-bold ${status.color}`}>
                {validHumidity.toFixed(1)}
              </span>
              <span className="text-lg text-slate-500 ml-2">{unit}</span>
            </div>
          </div>
          <div className="flex flex-col items-end">
            <div className={`mb-2 ${status.color}`}>
              <DropletIcon className="w-8 h-8" />
            </div>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${status.bg} ${status.color}`}>
              {status.status}
            </span>
          </div>
        </div>

        {/* Humidity Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-slate-400">
            <span>0%</span>
            <span>100%</span>
          </div>
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${getBarColor()}`}
              style={{ width: `${validHumidity}%` }}
            />
          </div>
        </div>
      </div>
    </Card>
  );
};

export default HumidityDisplay;
