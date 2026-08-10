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

  const segments = [
    { label: '$0.001', color: '#26A17B', value: 0.001 },
    { label: 'Try Again', color: '#1f1f1f', value: 0 },
    { label: '$0.01', color: '#F0B90B', textColor: 'black', value: 0.01 },
    { label: '$0.0015', color: '#3b82f6', value: 0.0015 }
  ];

  const handleSpin = async () => {
    if (isSpinning) return;
    setIsSpinning(true);
    setResult(null);

    try {
      const res = await api.post('/users/minigame-claim');
      const data = res.data;
      
      let targetIndex = segments.findIndex(s => s.value === data.reward);
      if (targetIndex === -1) targetIndex = 1; // Default to 'Try Again'

      // Calculate new rotation to land on targetIndex
      const randomOffset = Math.floor(Math.random() * 60) - 30; // -30 to +30 deg within segment
      const currentRotation = rotation % 360;
      const targetAngle = 360 - (targetIndex * 90); 
      const spins = 1440; // 4 full spins
      const newRotation = rotation + spins + (targetAngle - currentRotation) + randomOffset;
      
      setRotation(newRotation);
      
      // Wait for spin animation to finish
      setTimeout(async () => {
        setIsSpinning(false);
        setResult(data);
        if (data.reward > 0) {
          showToast(`You won ${data.reward} TON!`, 'success');
        } else {
          showToast(data.message || 'Better luck next time!', 'info');
        }
        await refreshUser();
        if (onComplete) onComplete();
      }, 3000);
    } catch (err) {
      setIsSpinning(false);
      const msg = err.response?.data?.error || 'Failed to play mini-game';
      showToast(msg, 'error');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center p-4 overflow-hidden">
      <div className="relative mb-6">
        <div 
          className="w-48 h-48 rounded-full border-4 border-primary relative overflow-hidden transition-transform ease-[cubic-bezier(0.2,0.8,0.2,1)]"
          style={{ 
            transform: `rotate(${rotation}deg)`,
            transitionDuration: '3000ms'
          }}
        >
          <svg width="100%" height="100%" viewBox="-100 -100 200 200">
            {segments.map((seg, i) => (
              <g key={i} transform={`rotate(${i * 90})`}>
                <path d="M 0 0 L -70.7 -70.7 A 100 100 0 0 1 70.7 -70.7 Z" fill={seg.color} />
                <text x="0" y="-60" fill={seg.textColor || "white"} fontSize="16" fontWeight="bold" textAnchor="middle">
                  {seg.label}
                </text>
              </g>
            ))}
            <circle cx="0" cy="0" r="16" fill="#333" />
          </svg>
        </div>
        {/* Pointer */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -mt-4 w-0 h-0 border-l-[12px] border-r-[12px] border-t-[24px] border-l-transparent border-r-transparent border-t-white z-20 drop-shadow-md"></div>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -mt-3 w-0 h-0 border-l-[8px] border-r-[8px] border-t-[16px] border-l-transparent border-r-transparent border-t-primary z-20"></div>
      </div>
      
      <button 
        onClick={handleSpin} 
        disabled={isSpinning}
        className="bg-primary text-black font-extrabold px-8 py-3 rounded-full hover:bg-primary/90 transition-colors disabled:opacity-50 z-10"
      >
        {isSpinning ? 'SPINNING...' : 'PLAY & EARN'}
      </button>

      {result !== null && (
        <div className={`mt-4 text-center font-bold animate-pulse ${result.reward > 0 ? 'text-success' : 'text-textmuted'}`}>
          {result.reward > 0 ? `You won ${result.reward} TON!` : (result.message || 'Better luck next time!')}
        </div>
      )}
    </div>
  );
};

export default SpinWheel;
