import Card from '../../common/Card';
import Badge from '../../common/Badge';
import { PressureIcon } from '../../icons/SensorIcons';

const PressureDisplay = ({ pressure, unit = 'bar', airQuality = 'Good' }) => {
  return (
    <div className="bg-white rounded-xl p-10 shadow-md hover:shadow-lg transition-all duration-300 border-t-4 border-red-400 relative overflow-hidden">
      <div className="flex flex-col items-center justify-center text-center space-y-2">
        <div className="text-4xl font-bold text-slate-800">
          {pressure.toFixed(1)}
          <span className="text-xl text-slate-600 ml-1">{unit}</span>
        </div>
        <div className="text-sm text-slate-500 font-medium uppercase tracking-wide">Hydraulic Pressure</div>
        <div className="text-xs text-slate-400 mt-1">
          Air Quality: <span className="font-semibold">{airQuality}</span>
        </div>
      </div>
    </div>
  );
};

export default PressureDisplay;
