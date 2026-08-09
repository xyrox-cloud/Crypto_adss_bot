import React, { useState, useEffect, useRef } from 'react';

const GRID_SIZES = [2, 3, 4, 5];

const BlitzGame = ({ onExit, onRoundComplete, onWatchAd, allTimeScore = 0 }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [level, setLevel] = useState(1);
  const [score, setScore] = useState(0);
  const [hits, setHits] = useState(0);
  const [combo, setCombo] = useState(0);
  const [bestCombo, setBestCombo] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30.0);
  const [creditsBanked, setCreditsBanked] = useState(0);
  const [adWatched, setAdWatched] = useState(false);
  
  const [gridSize, setGridSize] = useState(2);
  const [oddTileIndex, setOddTileIndex] = useState(0);
  
  const [floatingTexts, setFloatingTexts] = useState([]);
  const floatingTextId = useRef(0);
  
  const timerRef = useRef(null);
  const containerRef = useRef(null);
  const boardRef = useRef(null);
  const scoreRef = useRef(score);

  useEffect(() => {
    scoreRef.current = score;
  }, [score]);

  const handleWatchAd = async () => {
    if (adWatched || !onWatchAd) return;
    const success = await onWatchAd();
    if (success) {
      setCreditsBanked(prev => prev * 2);
      setAdWatched(true);
    }
  };

  const handleExit = () => {
    if (onRoundComplete && scoreRef.current > 0) onRoundComplete(scoreRef.current, creditsBanked);
    if (onExit) onExit();
  };

  const handlePlayAgain = () => {
    if (onRoundComplete && scoreRef.current > 0) onRoundComplete(scoreRef.current, creditsBanked);
    startGame();
  };

  const generateBoard = (size) => {
    const totalTiles = size * size;
    setOddTileIndex(Math.floor(Math.random() * totalTiles));
  };

  const startGame = () => {
    setIsPlaying(true);
    setGameOver(false);
    setLevel(1);
    setScore(0);
    setHits(0);
    setCombo(0);
    setBestCombo(0);
    setTimeLeft(30.0);
    setGridSize(2);
    setCreditsBanked(0);
    setAdWatched(false);
    generateBoard(2);
    setFloatingTexts([]);
  };

  useEffect(() => {
    if (isPlaying && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 0.1) {
            clearInterval(timerRef.current);
            setGameOver(true);
            setIsPlaying(false);
            setCreditsBanked(Math.floor(scoreRef.current / 10));
            return 0;
          }
          return prev - 0.1;
        });
      }, 100);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [isPlaying, timeLeft]);

  const handleMissClick = (e) => {
    if (!isPlaying || gameOver) return;
    
    let x = e.clientX;
    let y = e.clientY;
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      x = e.clientX - rect.left;
      y = e.clientY - rect.top;
    }

    setCombo(0);
    setTimeLeft(prev => Math.max(0, prev - 5));
    const id = floatingTextId.current++;
    setFloatingTexts(prev => [...prev, { id, text: "-5.0s", x, y, isPenalty: true }]);
    setTimeout(() => {
      setFloatingTexts(prev => prev.filter(ft => ft.id !== id));
    }, 800);
  };

  const handleTileClick = (index, e) => {
    e.stopPropagation();
    if (!isPlaying || gameOver) return;

    if (index === oddTileIndex) {
      let x = e.clientX;
      let y = e.clientY;
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        x = e.clientX - rect.left;
        y = e.clientY - rect.top;
      }

      const pointsEarned = 5 + Math.floor(combo / 2) * 5;
      setScore(prev => Math.min(prev + pointsEarned, 1000));
      setHits(prev => {
        const newHits = prev + 1;
        const newLevel = Math.min(4, Math.floor(newHits / 4) + 1);
        setLevel(newLevel);
        const newSize = GRID_SIZES[newLevel - 1];
        setGridSize(newSize);
        generateBoard(newSize);
        return newHits;
      });
      
      setCombo(prev => {
        const newCombo = prev + 1;
        setBestCombo(bc => Math.max(bc, newCombo));
        return newCombo;
      });
      
      setTimeLeft(prev => prev + 0.35);
      
      const id = floatingTextId.current++;
      setFloatingTexts(prev => [...prev, { id, text: "+0.35s", x, y, isPenalty: false }]);
      setTimeout(() => {
        setFloatingTexts(prev => prev.filter(ft => ft.id !== id));
      }, 800);
      
    } else {
      handleMissClick(e);
    }
  };

  const progressPercent = Math.min(100, Math.max(0, (timeLeft / 30) * 100));

  return (
    <div className="w-full max-w-md mx-auto bg-[#050505] min-h-[500px] flex flex-col p-4 font-sans text-white select-none">
       <style>{`
         @keyframes floatUp {
           0% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
           100% { opacity: 0; transform: translate(-50%, -40px) scale(1.2); }
         }
         .animate-float-up {
           animation: floatUp 0.8s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
         }
       `}</style>
       
       {/* Top Bar */}
       <div className="bg-[#111111] rounded-2xl p-4 flex flex-col gap-2 relative overflow-hidden mb-6 border border-[#222]">
          <div className="flex justify-between items-center z-10">
            <div className="flex items-center gap-3">
              <span className="text-4xl font-black tracking-tight">{score}</span>
              {combo >= 3 ? (
                <span className="bg-[#FF4500] text-white text-[11px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider animate-pulse">
                  {combo}× HEAT
                </span>
              ) : (
                <span className="bg-[#222] text-gray-400 text-[11px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">
                  LEVEL {level}
                </span>
              )}
            </div>
            <div className="font-mono text-2xl text-gray-100 tabular-nums font-bold tracking-tighter">
              {timeLeft.toFixed(1)}
            </div>
          </div>
          {/* Progress bar */}
          <div className="w-full h-1.5 bg-[#222] rounded-full overflow-hidden mt-2 z-10">
            <div 
              className={`h-full transition-all duration-100 ease-linear ${timeLeft < 10 ? 'bg-red-500' : 'bg-[#FF4500]'}`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
       </div>

       {/* Game Board Container */}
       <div 
         ref={containerRef}
         className="flex-1 flex items-center justify-center w-full relative bg-[#0a0a0a]"
         onPointerDown={handleMissClick}
       >
         {!isPlaying && !gameOver && (
           <div 
             className="absolute inset-0 flex flex-col items-center justify-center z-20 bg-black/60 backdrop-blur-sm p-6 text-center"
             onPointerDown={e => e.stopPropagation()}
           >
             <h2 className="text-3xl font-black mb-2 tracking-tight text-[#FF4500] uppercase">Blitz</h2>
             <p className="text-gray-400 mb-8 font-medium">Find the odd tile before time runs out!</p>
             <button onClick={startGame} className="bg-[#FF4500] text-white font-black py-4 px-10 text-xl hover:bg-[#ff5722] transition-colors active:scale-95 uppercase tracking-widest w-full">
               Start Grid
             </button>
           </div>
         )}
         
         {gameOver && (
           <div 
             className="absolute inset-0 flex flex-col items-center justify-center z-20 bg-[#0a0a0a]/95 backdrop-blur-md p-6 text-center"
             onPointerDown={e => e.stopPropagation()}
           >
             <h2 className="text-3xl font-black mb-1 text-white tracking-tight uppercase">Round Complete</h2>
             <p className="text-gray-400 mb-6 font-medium">Final Score: <span className="text-[#FFC730] font-bold text-2xl">{score}</span></p>
             
             <div className="bg-[#111] border border-[#222] rounded-2xl w-full p-4 mb-6">
                <div className="text-2xl font-black text-[#4ade80] mb-1">+{creditsBanked} BANKED</div>
                <div className="grid grid-cols-3 gap-2 mt-4 text-xs font-bold text-gray-500 uppercase">
                   <div className="flex flex-col items-center">
                     <span>Hits</span>
                     <span className="text-white text-lg mt-1">{hits}</span>
                   </div>
                   <div className="flex flex-col items-center">
                     <span>Best Combo</span>
                     <span className="text-white text-lg mt-1">{bestCombo}×</span>
                   </div>
                   <div className="flex flex-col items-center">
                     <span>All-Time</span>
                     <span className="text-white text-lg mt-1">{allTimeScore + score}</span>
                   </div>
                </div>
             </div>

             <button 
               onClick={handleWatchAd}
               disabled={adWatched}
               className={`w-full py-4 px-6 rounded-xl font-black uppercase tracking-wider mb-3 transition-colors ${adWatched ? 'bg-[#222] text-gray-500' : 'bg-[#4ade80] text-black hover:bg-[#3bcf6b] active:scale-95'}`}
             >
               {adWatched ? 'Reward Claimed' : 'Double This Round\'s Credits'}
             </button>

             <button onClick={handlePlayAgain} className="bg-[#FF4500] text-white font-black py-4 px-10 text-xl hover:bg-[#ff5722] rounded-xl transition-colors active:scale-95 uppercase tracking-widest w-full mb-3">
               Play Again
             </button>
             
             <button onClick={handleExit} className="text-gray-400 font-bold uppercase tracking-widest text-sm py-2 active:scale-95">
               Back to Home
             </button>
           </div>
         )}

         <div 
           ref={boardRef}
           className="w-full max-w-[400px] aspect-square grid gap-1.5 relative"
           style={{ 
             gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))`,
             gridTemplateRows: `repeat(${gridSize}, minmax(0, 1fr))`
           }}
         >
           {Array.from({ length: gridSize * gridSize }).map((_, i) => (
             <div
               key={i}
               onPointerDown={(e) => handleTileClick(i, e)}
               className="cursor-pointer transition-transform active:scale-95"
               style={{
                 backgroundColor: i === oddTileIndex ? '#FFC730' : '#FF4500',
               }}
             />
           ))}
         </div>

         {/* Floating texts */}
         {floatingTexts.map(ft => (
           <div 
             key={ft.id}
             className={`absolute font-black font-mono text-lg pointer-events-none animate-float-up z-30 drop-shadow-md ${ft.isPenalty ? 'text-red-500' : 'text-[#4ade80]'}`}
             style={{ left: ft.x, top: ft.y }}
           >
             {ft.text}
           </div>
         ))}
       </div>

       {/* Bottom Stats */}
       <div className="mt-8 flex justify-between items-center text-[#666] font-mono text-xs uppercase font-bold tracking-widest px-2">
         <div>HITS <span className="text-[#999]">{hits}</span></div>
         <div>DECK <span className="text-[#999]">{gridSize}×{gridSize}</span></div>
         <div>BEST <span className="text-[#999]">{bestCombo}×</span></div>
       </div>
    </div>
  );
};

export default BlitzGame;
