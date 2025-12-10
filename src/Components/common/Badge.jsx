const Badge = ({ status, children }) => {
  const statusStyles = {
    running: 'bg-emerald-50 text-emerald-600',
    idle: 'bg-amber-50 text-amber-600',
    fault: 'bg-red-50 text-red-600',
    good: 'bg-emerald-50 text-emerald-600',
    poor: 'bg-red-50 text-red-600',
  };

  const style = statusStyles[status?.toLowerCase()] || 'bg-slate-100 text-slate-600';

  return (
    <span className={`px-3 py-1 rounded-full text-sm font-medium ${style}`}>
      {children || status}
    </span>
  );
};

export default Badge;
