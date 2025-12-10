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
    <Card>
      <div className="flex items-center gap-2 mb-2">
        <div className={`${getTextColor()}`}>
          <VibrationIcon className="w-5 h-5" />
        </div>
        <h3 className="text-sm font-medium text-slate-500">Vibration Level</h3>
      </div>
      <div className="flex items-center justify-between">
        {/* Gauge */}
        <div className="relative w-24 h-12">
          <svg viewBox="0 0 200 100" className="w-full h-full">
            {/* Background arc */}
            <path
              d="M 20 90 A 80 80 0 0 1 180 90"
              fill="none"
              stroke="#e2e8f0"
              strokeWidth="10"
              strokeLinecap="round"
            />
            {/* Progress arc */}
            <path
              d="M 20 90 A 80 80 0 0 1 180 90"
              fill="none"
              stroke={getColor()}
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={`${percentage * 2.51} 251`}
            />
            {/* Needle */}
            <line
              x1="100"
              y1="90"
              x2="100"
              y2="30"
              stroke="#1e293b"
              strokeWidth="2"
              strokeLinecap="round"
              transform={`rotate(${rotation} 100 90)`}
            />
            {/* Center dot */}
            <circle cx="100" cy="90" r="4" fill="#1e293b" />
          </svg>
        </div>
        
        {/* Value display */}
        <div className="text-right">
          <p className="text-3xl font-bold text-slate-800">
            {value.toFixed(1)}
            <span className="text-lg text-slate-500 ml-1">{unit}</span>
          </p>
          <p className="text-xs text-slate-400 mt-1">Max: {max} {unit}</p>
        </div>
      </div>
    </Card>
  );
};

export default VibrationGauge;
