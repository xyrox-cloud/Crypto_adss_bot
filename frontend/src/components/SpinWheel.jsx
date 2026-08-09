import React, { useState } from 'react';
import api from '../api/api';
import { useUser } from '../context/UserContext';
import { useToast } from '../context/ToastContext';

const SpinWheel = ({ onComplete }) => {
  const { refreshUser } = useUser();
  const { showToast } = useToast();
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [result, setResult] = useState(null);

  const handleSpin = async () => {
    if (isSpinning) return;
    setIsSpinning(true);
    setResult(null);

    // Spin animation
    const newRotation = rotation + 1440 + Math.floor(Math.random() * 360);
    setRotation(newRotation);

    try {
      const res = await api.post('/users/minigame-claim');
      
      // Wait for spin animation to almost finish
      setTimeout(async () => {
        setIsSpinning(false);
        setResult(res.data.reward);
        showToast(`You won ${res.data.reward} USDT!`, 'success');
        await refreshUser();
        if (onComplete) onComplete();
      }, 3000);
    } catch (err) {
      setTimeout(() => {
        setIsSpinning(false);
        const msg = err.response?.data?.error || 'Failed to play mini-game';
        showToast(msg, 'error');
      }, 3000);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center p-4">
      <div className="relative mb-6">
        <div 
          className="w-48 h-48 rounded-full border-4 border-primary relative overflow-hidden transition-transform duration-[3000ms] ease-out flex items-center justify-center"
          style={{ 
            transform: `rotate(${rotation}deg)`,
            background: 'conic-gradient(var(--primary) 0 90deg, #1f1f1f 90deg 180deg, var(--primary) 180deg 270deg, #1f1f1f 270deg 360deg)'
          }}
        >
          <div className="w-12 h-12 bg-cardbg rounded-full z-10 flex items-center justify-center shadow-lg">
            <span className="text-white font-bold text-xs">SPIN</span>
          </div>
        </div>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -mt-2 w-0 h-0 border-l-[10px] border-r-[10px] border-t-[20px] border-l-transparent border-r-transparent border-t-white z-20"></div>
      </div>
      
      <button 
        onClick={handleSpin} 
        disabled={isSpinning}
        className="bg-primary text-black font-extrabold px-8 py-3 rounded-full hover:bg-primary/90 transition-colors disabled:opacity-50"
      >
        {isSpinning ? 'SPINNING...' : 'PLAY & EARN'}
      </button>

      {result !== null && (
        <div className="mt-4 text-center font-bold text-success animate-pulse">
          You won {result} USDT!
        </div>
      )}
    </div>
  );
};

export default SpinWheel;
