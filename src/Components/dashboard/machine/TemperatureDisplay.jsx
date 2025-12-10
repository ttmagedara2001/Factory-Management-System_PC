import Card from '../../common/Card';
import { ThermometerIcon } from '../../icons/SensorIcons';

const TemperatureDisplay = ({ temperature = 0, unit = '°C', trend = 0 }) => {
  const validTemp = isNaN(temperature) ? 0 : Number(temperature);
  const validTrend = isNaN(trend) ? 0 : Number(trend);
  const getTemperatureColor = () => {
    if (validTemp < 20) return 'text-blue-600';
    if (validTemp < 30) return 'text-emerald-600';
    if (validTemp < 40) return 'text-amber-600';
    return 'text-red-600';
  };

  const getBarColor = () => {
    if (validTemp < 20) return 'bg-blue-500';
    if (validTemp < 30) return 'bg-emerald-500';
    if (validTemp < 40) return 'bg-amber-500';
    return 'bg-red-500';
  };

  return (
    <Card>
      <div className="space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-sm font-medium text-slate-500 mb-2">Temperature</h3>
            <div className="flex items-baseline">
              <span className={`text-4xl font-bold ${getTemperatureColor()}`}>
                {validTemp.toFixed(1)}
              </span>
              <span className="text-lg text-slate-500 ml-2">{unit}</span>
            </div>
            {validTrend !== 0 && (
              <p className={`text-sm mt-2 ${validTrend > 0 ? 'text-red-600' : 'text-blue-600'}`}>
                {validTrend > 0 ? '↑' : '↓'} {Math.abs(validTrend).toFixed(1)}{unit} from baseline
              </p>
            )}
          </div>
          <div className={`${getTemperatureColor()}`}>
            <ThermometerIcon className="w-8 h-8" />
          </div>
        </div>

        {/* Temperature Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-slate-400">
            <span>0{unit}</span>
            <span>50{unit}</span>
          </div>
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${getBarColor()}`}
              style={{ width: `${Math.min((validTemp / 50) * 100, 100)}%` }}
            />
          </div>
        </div>
      </div>
    </Card>
  );
};

export default TemperatureDisplay;
