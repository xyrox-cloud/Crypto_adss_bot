import React, { useState, useEffect, useRef, useCallback } from 'react';

// Grid size steps: index maps to level (1-based)
const GRID_SIZES = [2, 3, 4, 5, 6];

// Drain rate per 100ms tick at each grid size
const DRAIN_RATE = {
  2: 0.100,
  3: 0.100,
  4: 0.115,
  5: 0.130,
  6: 0.150,
};

const ROUND_DURATION = 30.0;
const POINTS_PER_HIT = 10;
const TIME_BONUS_HIT = 0.15;
const TIME_PENALTY_MISS = 0.20;
const HEAT_THRESHOLD = 2;  // combo badge appears at combo >= 2
const HEAT_HARD_THRESHOLD = 5; // odd tile becomes subtler at combo >= 5

const BlitzGame = ({ onExit, onRoundComplete, allTimeScore = 0 }) => {
  const [phase, setPhase] = useState('idle'); // idle | playing | over
  const [score, setScore] = useState(0);
  const [hits, setHits] = useState(0);
  const [combo, setCombo] = useState(0);
  const [bestCombo, setBestCombo] = useState(0);
  const [timeLeft, setTimeLeft] = useState(ROUND_DURATION);
  const [gridSize, setGridSize] = useState(2);
  const [oddTileIndex, setOddTileIndex] = useState(0);
  const [floats, setFloats] = useState([]);
  const floatIdRef = useRef(0);

  // Refs for values needed inside interval closure
  const gridSizeRef = useRef(2);
  const phaseRef = useRef('idle');
  const scoreRef = useRef(0);
  const timerRef = useRef(null);
  // Ref for triggering game-over from inside setTimeLeft
  const triggerGameOver = useRef(null);

  useEffect(() => { gridSizeRef.current = gridSize; }, [gridSize]);
  useEffect(() => { phaseRef.current = phase; }, [phase]);
  useEffect(() => { scoreRef.current = score; }, [score]);

  const endRound = useCallback(() => {
    clearInterval(timerRef.current);
    setPhase('over');
    phaseRef.current = 'over';
  }, []);

  // Store endRound in a ref so the interval can call it
  useEffect(() => {
    triggerGameOver.current = endRound;
  }, [endRound]);

  const spawnFloat = (text, x, y, isBonus) => {
    const id = floatIdRef.current++;
    setFloats(prev => [...prev, { id, text, x, y, isBonus }]);
    setTimeout(() => setFloats(prev => prev.filter(f => f.id !== id)), 700);
  };

  const randomOdd = (size) => Math.floor(Math.random() * size * size);

  const startGame = () => {
    clearInterval(timerRef.current);
    const initSize = 2;
    setPhase('playing');
    phaseRef.current = 'playing';
    setScore(0);
    setHits(0);
    setCombo(0);
    setBestCombo(0);
    setTimeLeft(ROUND_DURATION);
    setGridSize(initSize);
    gridSizeRef.current = initSize;
    setOddTileIndex(randomOdd(initSize));
    setFloats([]);
  };

  // Timer tick
  useEffect(() => {
    if (phase !== 'playing') {
      clearInterval(timerRef.current);
      return;
    }
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        const rate = DRAIN_RATE[gridSizeRef.current] ?? 0.1;
        const next = +(prev - rate).toFixed(3);
        if (next <= 0) {
          triggerGameOver.current?.();
          return 0;
        }
        return next;
      });
    }, 100);
    return () => clearInterval(timerRef.current);
  }, [phase]);

  const handleCorrectTap = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top;

    setScore(prev => { const n = prev + POINTS_PER_HIT; scoreRef.current = n; return n; });
    setTimeLeft(prev => Math.min(prev + TIME_BONUS_HIT, ROUND_DURATION + 5));
    setHits(prev => {
      const newHits = prev + 1;
      // Level up: every 5 correct taps grow grid (cap at 6x6)
      const newLevel = Math.min(GRID_SIZES.length, Math.floor(newHits / 5) + 1);
      const newSize = GRID_SIZES[newLevel - 1];
      setGridSize(newSize);
      gridSizeRef.current = newSize;
      setOddTileIndex(randomOdd(newSize));
      return newHits;
    });
    setCombo(prev => {
      const c = prev + 1;
      setBestCombo(bc => Math.max(bc, c));
      return c;
    });
    spawnFloat(`+${POINTS_PER_HIT}`, x, y, true);
  };

  const handleMissTap = (e) => {
    const rect = e.currentTarget?.getBoundingClientRect?.() || { left: e.clientX, top: e.clientY, width: 0 };
    const x = rect.left + (rect.width ?? 0) / 2;
    const y = rect.top;

    setCombo(0);
    setGridSize(prev => {
      const newSize = Math.max(2, prev - 1);
      gridSizeRef.current = newSize;
      setOddTileIndex(randomOdd(newSize));
      return newSize;
    });
    setTimeLeft(prev => {
      const next = +(prev - TIME_PENALTY_MISS).toFixed(3);
      if (next <= 0) {
        triggerGameOver.current?.();
        return 0;
      }
      return next;
    });
    spawnFloat(`-${TIME_PENALTY_MISS}s`, x, y, false);
  };

  const handleTilePointerDown = (e, tileIndex) => {
    e.stopPropagation();
    if (phase !== 'playing') return;
    if (tileIndex === oddTileIndex) {
      handleCorrectTap(e);
    } else {
      handleMissTap(e);
    }
  };

  // Tapping the background (not a tile) also counts as a miss
  const handleBoardBgPointerDown = (e) => {
    if (phase !== 'playing') return;
    // only trigger if the click didn't originate from a tile (stopPropagation handles that)
    handleMissTap(e);
  };

  const handleExit = () => {
    clearInterval(timerRef.current);
    if (onRoundComplete && scoreRef.current > 0) onRoundComplete(scoreRef.current);
    if (onExit) onExit();
  };

  const handlePlayAgain = () => {
    if (onRoundComplete && scoreRef.current > 0) onRoundComplete(scoreRef.current);
    startGame();
  };

  // Derived display values
  const progressPct = Math.min(100, Math.max(0, (timeLeft / ROUND_DURATION) * 100));
  const isLowTime = timeLeft < 8;
  const showHeat = combo >= HEAT_THRESHOLD;
  const isHardHeat = combo >= HEAT_HARD_THRESHOLD;

  // Tile colors
  const BASE_COLOR = '#FF5722';
  const ODD_COLOR = isHardHeat ? '#FF8F00' : '#FFC107';

  return (
    <div
      style={{
        background: '#080808',
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: "'Inter', 'Helvetica Neue', Arial, sans-serif",
        color: '#fff',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        touchAction: 'manipulation',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <style>{`
        @keyframes blitz-float {
          0%   { opacity: 1; transform: translate(-50%, 0) scale(1.1); }
          80%  { opacity: 0.8; }
          100% { opacity: 0; transform: translate(-50%, -48px) scale(0.9); }
        }
        .blitz-float {
          animation: blitz-float 0.7s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
          position: fixed;
          pointer-events: none;
          z-index: 100;
          font-weight: 900;
          font-size: 18px;
          white-space: nowrap;
        }
        .blitz-tile {
          border-radius: 6px;
          cursor: pointer;
          transition: transform 0.07s ease, filter 0.07s ease;
          -webkit-tap-highlight-color: transparent;
        }
        .blitz-tile:active {
          transform: scale(0.91);
          filter: brightness(0.85);
        }
      `}</style>

      {/* ── TOP STATS BAR ───────────────────────────────────── */}
      <div
        style={{
          margin: '12px 12px 0',
          background: '#111',
          border: '1px solid #222',
          borderRadius: '18px',
          padding: '14px 16px 12px',
          flexShrink: 0,
        }}
      >
        {/* Score row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {/* Left: label + score + heat badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#666', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 2 }}>
                SCORE
              </div>
              <div style={{ fontSize: 38, fontWeight: 900, lineHeight: 1, letterSpacing: '-0.02em', color: '#fff' }}>
                {score}
              </div>
            </div>
            {showHeat && (
              <div
                style={{
                  background: '#FF4500',
                  color: '#fff',
                  fontSize: 11,
                  fontWeight: 800,
                  padding: '4px 10px',
                  borderRadius: 100,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  alignSelf: 'flex-end',
                  marginBottom: 3,
                  animation: 'none',
                }}
              >
                {combo}× HEAT
              </div>
            )}
          </div>

          {/* Right: time remaining */}
          <div
            style={{
              fontSize: 38,
              fontWeight: 900,
              lineHeight: 1,
              letterSpacing: '-0.02em',
              color: isLowTime ? '#FF4444' : '#fff',
              fontVariantNumeric: 'tabular-nums',
              transition: 'color 0.3s',
            }}
          >
            {timeLeft.toFixed(1)}
          </div>
        </div>

        {/* Progress bar */}
        <div
          style={{
            marginTop: 10,
            height: 4,
            background: '#222',
            borderRadius: 2,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${progressPct}%`,
              background: isLowTime ? '#FF4444' : '#eee',
              borderRadius: 2,
              transition: 'width 0.1s linear, background 0.3s',
            }}
          />
        </div>
      </div>

      {/* ── GAME BOARD ──────────────────────────────────────── */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px 12px',
          position: 'relative',
        }}
        onPointerDown={phase === 'playing' ? handleBoardBgPointerDown : undefined}
      >
        {/* IDLE screen */}
        {phase === 'idle' && (
          <div
            style={{
              position: 'absolute', inset: 0,
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              background: 'rgba(0,0,0,0.75)',
              backdropFilter: 'blur(6px)',
              zIndex: 20,
              padding: '0 32px',
              textAlign: 'center',
            }}
            onPointerDown={e => e.stopPropagation()}
          >
            <div style={{ fontSize: 11, fontWeight: 700, color: '#666', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 8 }}>
              FIND THE ODD TILE
            </div>
            <div style={{ fontSize: 44, fontWeight: 900, color: '#FF5722', textTransform: 'uppercase', letterSpacing: '-0.02em', marginBottom: 4 }}>
              BLITZ
            </div>
            <div style={{ fontSize: 14, color: '#666', marginBottom: 36 }}>
              Tap the different tile as fast as you can
            </div>
            <button
              onClick={startGame}
              style={{
                width: '100%',
                maxWidth: 280,
                background: '#FF5722',
                color: '#fff',
                border: 'none',
                borderRadius: 14,
                padding: '16px 0',
                fontSize: 18,
                fontWeight: 900,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              START GAME
            </button>
          </div>
        )}

        {/* GAME OVER screen */}
        {phase === 'over' && (
          <div
            style={{
              position: 'absolute', inset: 0,
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              background: 'rgba(8,8,8,0.96)',
              backdropFilter: 'blur(8px)',
              zIndex: 20,
              padding: '0 24px',
              textAlign: 'center',
            }}
            onPointerDown={e => e.stopPropagation()}
          >
            <div style={{ fontSize: 11, fontWeight: 700, color: '#555', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 6 }}>
              ROUND COMPLETE
            </div>
            <div style={{ fontSize: 64, fontWeight: 900, lineHeight: 1, color: '#fff', marginBottom: 2 }}>
              {score}
            </div>
            <div style={{ fontSize: 12, color: '#555', marginBottom: 28, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              FINAL SCORE
            </div>

            {/* Stats row */}
            <div
              style={{
                background: '#111',
                border: '1px solid #222',
                borderRadius: 16,
                width: '100%',
                padding: '14px 0',
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1fr',
                marginBottom: 28,
              }}
            >
              {[
                { label: 'HITS', value: hits },
                { label: 'BEST COMBO', value: `${bestCombo}×` },
                { label: 'ALL-TIME', value: allTimeScore + score },
              ].map(({ label, value }) => (
                <div key={label} style={{ textAlign: 'center', borderRight: '1px solid #1e1e1e' }}>
                  <div style={{ fontSize: 9, fontWeight: 700, color: '#555', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 4 }}>
                    {label}
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 900, color: '#fff' }}>{value}</div>
                </div>
              ))}
            </div>

            <button
              onClick={handlePlayAgain}
              style={{
                width: '100%',
                background: '#FF5722',
                color: '#fff',
                border: 'none',
                borderRadius: 14,
                padding: '16px 0',
                fontSize: 17,
                fontWeight: 900,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                cursor: 'pointer',
                fontFamily: 'inherit',
                marginBottom: 12,
              }}
            >
              PLAY AGAIN
            </button>
            <button
              onClick={handleExit}
              style={{
                background: 'none',
                border: 'none',
                color: '#555',
                fontSize: 13,
                fontWeight: 700,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                cursor: 'pointer',
                fontFamily: 'inherit',
                padding: '8px 0',
              }}
            >
              Back to Home
            </button>
          </div>
        )}

        {/* TILE GRID */}
        <div
          style={{
            width: '100%',
            maxWidth: 420,
            aspectRatio: '1 / 1',
            display: 'grid',
            gridTemplateColumns: `repeat(${gridSize}, 1fr)`,
            gridTemplateRows: `repeat(${gridSize}, 1fr)`,
            gap: gridSize <= 3 ? 8 : gridSize <= 4 ? 6 : 5,
          }}
        >
          {Array.from({ length: gridSize * gridSize }).map((_, i) => (
            <div
              key={i}
              className="blitz-tile"
              style={{ backgroundColor: i === oddTileIndex ? ODD_COLOR : BASE_COLOR }}
              onPointerDown={(e) => handleTilePointerDown(e, i)}
            />
          ))}
        </div>
      </div>

      {/* ── BOTTOM STATS BAR ─────────────────────────────────── */}
      <div
        style={{
          flexShrink: 0,
          padding: '10px 24px 16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderTop: '1px solid #141414',
        }}
      >
        {[
          { label: 'HITS', value: hits },
          { label: 'DECK', value: `${gridSize}×${gridSize}` },
          { label: 'BEST', value: `${bestCombo}×` },
        ].map(({ label, value }) => (
          <div key={label} style={{ textAlign: 'center', flex: 1 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#444', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 2 }}>
              {label}
            </div>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#ccc', letterSpacing: '0.02em' }}>
              {value}
            </div>
          </div>
        ))}
      </div>

      {/* ── FLOATING SCORE TEXTS ─────────────────────────────── */}
      {floats.map(f => (
        <div
          key={f.id}
          className="blitz-float"
          style={{
            left: f.x,
            top: f.y,
            color: f.isBonus ? '#4ade80' : '#ff4444',
          }}
        >
          {f.text}
        </div>
      ))}
    </div>
  );
};

export default BlitzGame;
