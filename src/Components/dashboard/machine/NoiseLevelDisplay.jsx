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
    <Card>
      <div className="space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-sm font-medium text-slate-500 mb-2">Noise Level</h3>
            <div className="flex items-baseline">
              <span className={`text-4xl font-bold ${status.color}`}>
                {validNoiseLevel.toFixed(1)}
              </span>
              <span className="text-lg text-slate-500 ml-2">{unit}</span>
            </div>
            <p className="text-xs text-slate-400 mt-2">
              {validNoiseLevel < 60 ? 'Quiet (0-60 dB)' : validNoiseLevel < 80 ? 'Moderate (60-80 dB)' : 'Loud (80+ dB)'}
            </p>
          </div>
          <div className="flex flex-col items-end">
            <div className={`mb-2 ${status.color}`}>
              <SoundIcon className="w-8 h-8" />
            </div>
            <Badge status={status.badge}>{status.status}</Badge>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default NoiseLevelDisplay;
