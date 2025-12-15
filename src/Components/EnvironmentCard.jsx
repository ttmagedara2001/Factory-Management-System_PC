import React from 'react';

const EnvironmentCard = ({ value, label, borderColor }) => {
  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex flex-col items-center justify-center relative overflow-hidden">
      <div className="text-3xl font-extrabold text-slate-800 mb-1">{value}</div>
      <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{label}</div>
      <div className={`h-1.5 w-full ${borderColor} absolute bottom-0 left-0`}></div>
    </div>
  );
};

export default EnvironmentCard;
