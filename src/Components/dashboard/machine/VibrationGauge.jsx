import Card from '../../common/Card';
import { VibrationIcon } from '../../icons/SensorIcons';

const VibrationGauge = ({ value, max = 10, unit = 'mm/s' }) => {
  const percentage = (value / max) * 100;
  const rotation = (percentage / 100) * 180 - 90; // -90 to 90 degrees
  
  // Determine color based on value
  const getColor = () => {
    if (percentage < 50) return '#10b981'; // green
    if (percentage < 75) return '#f59e0b'; // amber
    return '#ef4444'; // red
  };

  const getTextColor = () => {
    if (percentage < 50) return 'text-emerald-600';
    if (percentage < 75) return 'text-amber-600';
    return 'text-red-600';
  };

  return (
    <div className="bg-white rounded-xl p-10 shadow-md hover:shadow-lg transition-all duration-300 border-t-4 border-red-400 relative overflow-hidden">
      <div className="flex flex-col items-center justify-center text-center space-y-2">
        <div className="text-4xl font-bold text-slate-800">
          {value.toFixed(1)}
          <span className="text-xl text-slate-600 ml-1">{unit}</span>
        </div>
        <div className="text-sm text-slate-500 font-medium uppercase tracking-wide">Vibration Level</div>
        <div className="text-xs text-slate-400">Max: {max} {unit}</div>
      </div>
    </div>
  );
};

export default VibrationGauge;
