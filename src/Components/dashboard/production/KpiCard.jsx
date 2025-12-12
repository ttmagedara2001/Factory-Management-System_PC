import Card from '../../common/Card';

const KpiCard = ({ title, value, unit, trend }) => {
  const trendColor = trend > 0 ? 'text-emerald-600' : 'text-red-600';
  const trendIcon = trend > 0 ? '▲' : '▼';

  return (
    <div className="bg-white rounded-xl p-10 shadow-md hover:shadow-lg transition-all duration-300 border-t-4 border-slate-400 relative overflow-hidden">
      <div className="flex flex-col items-center justify-center text-center space-y-3">
        <div className="text-4xl font-bold text-slate-800">
          {value}
          {unit && <span className="text-xl text-slate-600 ml-1">{unit}</span>}
        </div>
        <div className="text-sm text-slate-500 font-medium uppercase tracking-wide">{title}</div>
        {trend !== undefined && (
          <div className={`text-sm font-semibold ${trendColor} flex items-center gap-1`}>
            <span>{trendIcon}</span>
            <span>{Math.abs(trend)}% vs yesterday</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default KpiCard;
