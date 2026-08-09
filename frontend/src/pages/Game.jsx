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

  const handleRoundComplete = async (score) => {
    if (score > 0) {
      try {
        await submitGameReward({ score });
        await refreshUser();
      } catch (err) {
        console.error(err);
        showToast('Failed to save score.', 'error');
      }
    }
  };

  return (
    <BlitzGame 
      onExit={handleExit}
      onRoundComplete={handleRoundComplete}
      allTimeScore={user?.all_time_score || 0}
    />
  );
};

export default Game;
