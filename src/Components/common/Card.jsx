const Card = ({ children, className = '', variant = 'default' }) => {
  const variants = {
    default: 'bg-white border border-slate-200 shadow-md hover:shadow-lg',
    muted: 'bg-slate-50 border border-slate-200 shadow-sm hover:shadow-md',
    soft: 'bg-white border border-slate-100 shadow-[0_6px_20px_-10px_rgba(15,23,42,0.35)] hover:shadow-[0_10px_30px_-10px_rgba(15,23,42,0.45)]',
    elevated: 'bg-white border-t-4 border-slate-900 shadow-lg hover:shadow-xl',
  };

  return (
    <div className={`rounded-xl p-5 sm:p-6 transition-all duration-300 relative overflow-hidden ${variants[variant] || variants.default} ${className}`}>
      {children}
    </div>
  );
};

export default Card;
