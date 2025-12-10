import Card from '../../common/Card';
import Badge from '../../common/Badge';
import { PressureIcon } from '../../icons/SensorIcons';

const PressureDisplay = ({ pressure, unit = 'bar', airQuality = 'Good' }) => {
  return (
    <Card>
      <div className="space-y-4">
        {/* Hydraulic Pressure */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="text-blue-600">
              <PressureIcon className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-medium text-slate-500">Hydraulic Pressure</h3>
          </div>
          <div className="flex items-baseline">
            <span className="text-4xl font-bold text-slate-800">{pressure.toFixed(1)}</span>
            <span className="text-lg text-slate-500 ml-2">{unit}</span>
          </div>
          <div className="mt-3 h-2 bg-slate-100 rounded-full overflow-hidden">
            <div 
              className="h-full bg-linear-to-r from-emerald-500 to-emerald-600"
              style={{ width: `${(pressure / 10) * 100}%` }}
            />
          </div>
        </div>

        {/* Air Quality */}
        <div className="pt-4 border-t border-slate-200">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-slate-500">Air Quality</h3>
            <Badge status={airQuality.toLowerCase()}>{airQuality}</Badge>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default PressureDisplay;
