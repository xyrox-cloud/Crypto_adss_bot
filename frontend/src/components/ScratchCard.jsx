import React, { useState } from 'react';
import api from '../api/api';
import { useUser } from '../context/UserContext';
import { useToast } from '../context/ToastContext';

const ScratchCard = ({ onComplete }) => {
  const { refreshUser } = useUser();
  const { showToast } = useToast();
  
  const [isScratching, setIsScratching] = useState(false);
  const [isRevealed, setIsRevealed] = useState(false);
  const [result, setResult] = useState(null);

  const handleScratch = async () => {
    if (isScratching || isRevealed) return;
    setIsScratching(true);

    try {
      const res = await api.post('/users/scratch-claim');
      const data = res.data;
      
      // Delay to simulate scratch time
      setTimeout(async () => {
        setIsScratching(false);
        setIsRevealed(true);
        setResult(data);
        
        if (data.reward > 0) {
          showToast(`You won ${data.reward} TON!`, 'success');
        } else {
          showToast(data.message || 'Better luck next time!', 'info');
        }
        
        await refreshUser();
        if (onComplete) onComplete();
      }, 800); // 800ms reveal animation
    } catch (err) {
      setIsScratching(false);
      const msg = err.response?.data?.error || 'Failed to scratch card';
      showToast(msg, 'error');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center p-4">
      <div 
        className={`relative w-64 h-32 rounded-xl overflow-hidden cursor-pointer shadow-lg transition-transform ${isScratching ? 'scale-95' : 'hover:scale-105'}`}
        onClick={handleScratch}
      >
        {/* Under layer (Result) */}
        <div className="absolute inset-0 bg-cardbg border-2 border-primary flex flex-col items-center justify-center p-4">
          {result ? (
            <>
              {result.reward > 0 ? (
                <>
                  <div className="text-3xl mb-1">🎉</div>
                  <div className="text-xl font-extrabold text-success">{result.reward} TON</div>
                </>
              ) : (
                <>
                  <div className="text-3xl mb-1">😢</div>
                  <div className="text-md font-bold text-textmuted text-center">{result.message || 'Better luck next time!'}</div>
                </>
              )}
            </>
          ) : (
            <div className="text-primary font-bold">Loading...</div>
          )}
        </div>
        
        {/* Top layer (Foil) */}
        <div 
          className={`absolute inset-0 flex items-center justify-center transition-all duration-700 ease-out ${isRevealed ? 'opacity-0 scale-150 pointer-events-none' : 'opacity-100 scale-100'}`}
          style={{ 
            background: 'linear-gradient(135deg, #bdc3c7 0%, #2c3e50 100%)',
            boxShadow: 'inset 0 0 20px rgba(0,0,0,0.5)'
          }}
        >
          <div className="text-white font-extrabold text-lg tracking-widest uppercase drop-shadow-md flex flex-col items-center">
            <span>Tap to</span>
            <span className="text-2xl text-[#F0B90B]">Scratch</span>
          </div>
          
          {/* Subtle noise pattern for foil effect */}
          <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: '4px 4px' }}></div>
        </div>
      </div>
      
      {!isRevealed && (
        <div className="mt-4 text-xs font-bold text-textmuted uppercase tracking-wider">
          {isScratching ? 'Revealing...' : 'Tap the card to reveal your prize'}
        </div>
      )}
    </div>
  );
};

export default ScratchCard;
