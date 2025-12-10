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
      className={`w-full py-6 rounded-xl font-bold text-white text-lg transition-all transform ${
        isPressed
          ? 'bg-red-800 scale-95'
          : 'bg-linear-to-br from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 active:scale-95 shadow-lg hover:shadow-xl'
      }`}
    >
      {isPressed ? '⚠️ EMERGENCY STOP ACTIVATED' : '🛑 EMERGENCY STOP'}
    </button>
  );
};

export default EmergencyStop;
