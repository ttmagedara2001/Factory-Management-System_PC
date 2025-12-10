import Card from '../../common/Card';
import { ProductionIcon, TargetIcon, BoltIcon } from '../../icons/SensorIcons';

const KpiCard = ({ title, value, unit, trend, icon }) => {
  const getIconComponent = () => {
    if (icon === '📦') return <ProductionIcon className="w-10 h-10" />;
    if (icon === '🎯') return <TargetIcon className="w-10 h-10" />;
    if (icon === '⚡') return <BoltIcon className="w-10 h-10" />;
    return null;
  };

  return (
    <Card>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm text-slate-500 mb-1">{title}</p>
          <p className="text-3xl font-bold text-slate-800">
            {value}
            {unit && <span className="text-xl text-slate-500 ml-1">{unit}</span>}
          </p>
          {trend && (
            <p className={`text-sm mt-2 ${trend > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              {trend > 0 ? '↑' : '↓'} {Math.abs(trend)}% from yesterday
            </p>
          )}
        </div>
        {icon && (
          <div className="text-slate-400">
            {getIconComponent()}
          </div>
        )}
      </div>
    </Card>
  );
};

export default KpiCard;
