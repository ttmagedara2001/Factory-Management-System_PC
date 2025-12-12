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
    <div className="bg-white rounded-xl p-10 shadow-md hover:shadow-lg transition-all duration-300 border-t-4 border-red-400 relative overflow-hidden">
      <div className="flex flex-col items-center justify-center text-center space-y-2">
        <div className="text-4xl font-bold text-slate-800">
          {validHumidity.toFixed(1)}
          <span className="text-xl text-slate-600 ml-1">{unit}</span>
        </div>
        <div className="text-sm text-slate-500 font-medium uppercase tracking-wide">Humidity</div>
      </div>
    </div>
  );
};

export default HumidityDisplay;
