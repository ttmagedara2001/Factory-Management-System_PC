import { useState } from 'react';

const EmergencyStop = ({ onStop }) => {
  const [isPressed, setIsPressed] = useState(false);

  const handleStop = () => {
    setIsPressed(true);
    if (onStop) onStop();
    setTimeout(() => setIsPressed(false), 2000);
  };

  return (
    <button
      onClick={handleStop}
      disabled={isPressed}
      className={`w-full py-4 rounded-lg font-bold text-white text-xl tracking-widest uppercase transition-all transform shadow-lg ${
        isPressed
          ? 'bg-red-800 scale-[0.99]'
          : 'bg-gradient-to-r from-red-600 to-red-700 hover:shadow-red-500/50 active:scale-[0.99]'
      }`}
    >
      {isPressed ? '⚠️ EMERGENCY STOP ACTIVATED' : 'Emergency Stop'}
    </button>
  );
};

export default EmergencyStop;
