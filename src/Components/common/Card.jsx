const Card = ({ children, className = '', variant = 'default' }) => {
  const variants = {
    default: 'bg-white border border-slate-200 shadow-sm',
    muted: 'bg-slate-100 border border-slate-200 shadow-inner',
    soft: 'bg-white border border-slate-100 shadow-[0_6px_20px_-10px_rgba(15,23,42,0.35)]',
  };

  return (
    <div className={`rounded-xl p-6 sm:p-8 ${variants[variant] || variants.default} ${className}`}>
      {children}
    </div>
  );
};

export default Card;
