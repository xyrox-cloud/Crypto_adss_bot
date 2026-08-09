import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../context/ToastContext';
import { ChevronLeft, Play, RefreshCw, Star } from 'lucide-react';

const Game = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [timeLeft, setTimeLeft] = useState(30);
  const [score, setScore] = useState(0);
  const [activeTarget, setActiveTarget] = useState(null);
  const [gameOver, setGameOver] = useState(false);

  useEffect(() => {
    let timer;
    if (isPlaying && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && isPlaying) {
      setIsPlaying(false);
      setGameOver(true);
      setActiveTarget(null);
    }
    return () => clearInterval(timer);
  }, [isPlaying, timeLeft]);

  const startGame = () => {
    setScore(0);
    setTimeLeft(30);
    setGameOver(false);
    setIsPlaying(true);
    pickNextTarget();
  };

  const pickNextTarget = () => {
    const next = Math.floor(Math.random() * 16);
    setActiveTarget(next);
  };

  const handleTap = (index) => {
    if (!isPlaying) return;
    if (index === activeTarget) {
      setScore(prev => prev + 10);
      pickNextTarget();
    } else {
      setScore(prev => Math.max(0, prev - 5));
    }
  };

  const handleWatchAd = async () => {
    try {
      const blockId = import.meta.env.VITE_ADSGRAM_BLOCK_ID;
      if (!window.Adsgram) {
        if (import.meta.env.DEV) {
          await new Promise(r => setTimeout(r, 1200));
          showToast('✅ Ad watched! +50 Bonus Points!', 'success');
          setScore(prev => prev + 50);
          return;
        }
        showToast('Ad network not available. Try again later.', 'error');
        return;
      }

      const adController = window.Adsgram.init({ blockId });
      await adController.show();
      showToast('✅ Ad watched! +50 Bonus Points!', 'success');
      setScore(prev => prev + 50);
    } catch (err) {
      console.error(err);
      showToast('Ad skipped — no bonus', 'info');
    }
  };

  return (
    <div className="pb-24 px-4 pt-4 min-h-screen bg-[#0A0A0A]">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/')} className="w-10 h-10 bg-white/5 border border-white/10 flex items-center justify-center rounded-xl">
          <ChevronLeft size={20} className="text-white" />
        </button>
        <h1 className="text-xl font-bold uppercase tracking-wider text-white">NOVA GRID</h1>
      </div>

      <div className="bg-cardbg border border-cardborder rounded-3xl p-5 mb-6 text-center shadow-[0_0_20px_rgba(255,90,31,0.1)]">
        <div className="flex justify-between items-center mb-6">
          <div className="text-left">
            <div className="text-textmuted text-[10px] font-bold uppercase">Time Left</div>
            <div className="text-2xl font-extrabold text-white font-mono">{timeLeft}s</div>
          </div>
          <div className="text-right">
            <div className="text-textmuted text-[10px] font-bold uppercase">Score</div>
            <div className="text-2xl font-extrabold text-[#FF5A1F] font-mono">{score}</div>
          </div>
        </div>

        {/* 4x4 Grid */}
        <div className="grid grid-cols-4 gap-2 mb-6 aspect-square max-w-[300px] mx-auto">
          {Array.from({ length: 16 }).map((_, i) => (
            <div
              key={i}
              onClick={() => handleTap(i)}
              className={`rounded-lg transition-all duration-100 ${
                activeTarget === i 
                  ? 'bg-[#FF5A1F] shadow-[0_0_15px_#FF5A1F] scale-95 cursor-pointer' 
                  : 'bg-white/5 border border-white/10'
              }`}
            ></div>
          ))}
        </div>

        {!isPlaying && !gameOver && (
          <button 
            onClick={startGame}
            className="w-full py-4 bg-[#FF5A1F] text-black font-extrabold text-lg uppercase rounded-xl flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(255,90,31,0.3)]"
          >
            <Play size={20} /> Start Game
          </button>
        )}

        {gameOver && (
          <div className="space-y-3">
            <div className="text-xl font-bold text-white mb-2">GAME OVER!</div>
            <button 
              onClick={handleWatchAd}
              className="w-full py-3 bg-white/10 border border-white/20 text-white font-bold text-sm uppercase rounded-xl flex items-center justify-center gap-2 hover:bg-white/20 transition-colors"
            >
              <Star size={16} className="text-[#FFD700]" /> Watch Ad for +50 Bonus
            </button>
            <button 
              onClick={startGame}
              className="w-full py-4 bg-[#FF5A1F] text-black font-extrabold text-lg uppercase rounded-xl flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(255,90,31,0.3)]"
            >
              <RefreshCw size={20} /> Play Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Game;
