import React from 'react';

const Gauge = ({ value, unit, label, color, percentage, maxValue = 100 }) => {
  return (
    <div className="bg-white p-3 sm:p-4 rounded-xl shadow-sm flex flex-col items-center justify-center relative border border-slate-100">
      <div className="relative w-20 h-20 xs:w-24 xs:h-24 sm:w-28 sm:h-28 flex items-center justify-center">
        {/* Background Circle */}
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 112 112">
          <circle
            cx="56"
            cy="56"
            r="44"
            stroke="#f1f5f9"
            strokeWidth="12"
            fill="transparent"
            strokeDasharray="276" 
            strokeDashoffset="70"
          />
          {/* Progress Circle */}
          <circle
            cx="56"
            cy="56"
            r="44"
            stroke={color}
            strokeWidth="12"
            fill="transparent"
            strokeDasharray="276"
            strokeDashoffset={276 - (206 * percentage) / 100}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute flex flex-col items-center">
          <span className="text-base xs:text-lg sm:text-xl font-bold text-slate-800">{value ?? '--'}</span>
          <span className="text-[10px] xs:text-xs text-slate-400 font-bold">{unit}</span>
        </div>
      </div>
      <span className="mt-1 sm:mt-2 text-[10px] xs:text-xs font-bold text-slate-800 uppercase tracking-wide text-center">{label}</span>
    </div>
  );
};

export default Gauge;
