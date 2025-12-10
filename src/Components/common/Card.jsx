const Card = ({ children, className = '' }) => {
  return (
    <div className={`bg-white rounded-xl shadow-sm p-4 sm:p-5 ${className}`}>
      {children}
    </div>
  );
};

export default Card;
