import Card from '../../common/Card';
import Badge from '../../common/Badge';
import { SoundIcon } from '../../icons/SensorIcons';

const NoiseLevelDisplay = ({ noiseLevel = 0, unit = 'dB' }) => {
  const validNoiseLevel = isNaN(noiseLevel) ? 0 : Number(noiseLevel);
  
  const getNoiseStatus = () => {
    if (validNoiseLevel < 60) return { status: 'Low', color: 'text-emerald-600', badge: 'good' };
    if (validNoiseLevel < 80) return { status: 'Moderate', color: 'text-amber-600', badge: 'idle' };
    if (validNoiseLevel < 100) return { status: 'High', color: 'text-red-600', badge: 'fault' };
    return { status: 'Critical', color: 'text-red-700', badge: 'fault' };
  };

  const status = getNoiseStatus();

  return (
    <div className="bg-white rounded-xl p-10 shadow-md hover:shadow-lg transition-all duration-300 border-t-4 border-red-400 relative overflow-hidden">
      <div className="flex flex-col items-center justify-center text-center space-y-2">
        <div className="text-4xl font-bold text-slate-800">
          {validNoiseLevel.toFixed(1)}
          <span className="text-xl text-slate-600 ml-1">{unit}</span>
        </div>
        <div className="text-sm text-slate-500 font-medium uppercase tracking-wide">Noise Level</div>
      </div>
    </div>
  );
};

export default NoiseLevelDisplay;
