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
    <div className="bg-white rounded-xl p-10 shadow-md hover:shadow-lg transition-all duration-300 border-t-4 border-red-400 relative overflow-hidden">
      <div className="flex flex-col items-center justify-center text-center space-y-2">
        <div className="text-4xl font-bold text-slate-800">
          {validTemp.toFixed(1)}
          <span className="text-xl text-slate-600 ml-1">{unit}</span>
        </div>
        <div className="text-sm text-slate-500 font-medium uppercase tracking-wide">Temperature</div>
      </div>
    </div>
  );
};

export default TemperatureDisplay;
