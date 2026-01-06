import React from 'react';

const EnvironmentCard = ({ value, label, borderColor }) => {
  return (
    <div className="bg-white p-3 sm:p-4 md:p-6 rounded-xl shadow-sm border border-slate-100 flex flex-col items-center justify-center relative overflow-hidden min-h-[80px] sm:min-h-[100px]">
      <div className="text-xl sm:text-2xl md:text-3xl font-extrabold text-slate-800 mb-0.5 sm:mb-1">{value}</div>
      <div className="text-[8px] sm:text-[9px] md:text-[10px] font-bold text-slate-500 uppercase tracking-wider sm:tracking-widest">{label}</div>
      <div className={`h-1 sm:h-1.5 w-full ${borderColor} absolute bottom-0 left-0`}></div>
    </div>
  );
};

export default EnvironmentCard;
