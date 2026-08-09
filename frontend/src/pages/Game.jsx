import React from 'react';
import { useNavigate } from 'react-router-dom';
import BlitzGame from '../components/BlitzGame';
import { submitGameReward } from '../api/api';
import { useUser } from '../context/UserContext';
import { useToast } from '../context/ToastContext';

const Game = () => {
  const navigate = useNavigate();
  const { user, refreshUser } = useUser();
  const { showToast } = useToast();

  const handleExit = () => {
    navigate('/');
  };

  const handleRoundComplete = async (score, credits) => {
    if (score > 0 || credits > 0) {
      try {
        await submitGameReward({ score, credits });
        await refreshUser();
      } catch (err) {
        console.error(err);
        showToast('Failed to save score.', 'error');
      }
    }
  };

  const handleWatchAd = async () => {
    try {
      const blockId = import.meta.env.VITE_ADSGRAM_BLOCK_ID;
      if (!window.Adsgram) {
        if (import.meta.env.DEV) {
          await new Promise(r => setTimeout(r, 1200));
          showToast('Ad watched successfully!', 'success');
          return true;
        }
        showToast('Ad network not available. Try again later.', 'error');
        return false;
      }
      const adController = window.Adsgram.init({ blockId });
      await adController.show();
      showToast('Ad watched successfully!', 'success');
      return true;
    } catch (err) {
      console.error(err);
      showToast('Ad skipped — no bonus', 'info');
      return false;
    }
  };

  return (
    <BlitzGame 
      onExit={handleExit}
      onRoundComplete={handleRoundComplete}
      onWatchAd={handleWatchAd}
      allTimeScore={user?.all_time_score || 0}
    />
  );
};

export default Game;
