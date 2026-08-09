import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import { useToast } from '../context/ToastContext';
import { getAdStats } from '../api/api';
import LoadingSpinner from '../components/LoadingSpinner';
import SpinWheel from '../components/SpinWheel';
import { Settings, User, Play, ChevronRight, Zap, Target, Star, Calendar, Gift, X } from 'lucide-react';
import api from '../api/api';

const MAX_ADS_PER_DAY = parseInt(import.meta.env.VITE_MAX_ADS_PER_DAY || '20', 10);

const Home = () => {
  const { user, refreshUser } = useUser();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const ENABLE_TASKS = true; // Flag to easily toggle the task/quest feature

  const [loadingAd, setLoadingAd] = useState(false);
  const [claimingDaily, setClaimingDaily] = useState(false);
  const [showSpinWheel, setShowSpinWheel] = useState(false);
  const [stats, setStats] = useState({ ads_today: 0, ads_this_week: 0, total_earned: 0 });

  useEffect(() => { fetchStats(); }, []);

  const fetchStats = async () => {
    try {
      const res = await getAdStats();
      setStats(res.data || { ads_today: 0, ads_this_week: 0, total_earned: 0 });
    } catch (err) {
      console.error(err);
    }
  };

  const handleWatchAd = async () => {
    if (stats.ads_today >= MAX_ADS_PER_DAY) {
      showToast(`Daily limit reached (${MAX_ADS_PER_DAY} ads/day)`, 'error');
      return;
    }

    setLoadingAd(true);
    try {
      const blockId = import.meta.env.VITE_ADSGRAM_BLOCK_ID;

      if (!window.Adsgram) {
        if (import.meta.env.DEV) {
          await new Promise(r => setTimeout(r, 1200));
          showToast('✅ Ad watched! Reward will be credited via webhook.', 'success');
          await new Promise(r => setTimeout(r, 500));
          await refreshUser();
          fetchStats();
          return;
        }
        showToast('Ad network not available. Try again later.', 'error');
        return;
      }

      const adController = window.Adsgram.init({ blockId });
      await adController.show();
      showToast('✅ Ad watched! Reward is being credited.', 'success');
      await new Promise(r => setTimeout(r, 1500));
      await refreshUser();
      fetchStats();
    } catch (err) {
      console.error(err);
      const serverMsg = err?.response?.data?.error;
      if (serverMsg?.includes('limit')) {
        showToast(serverMsg, 'error');
      } else {
        showToast('Ad skipped — no reward', 'info');
      }
    } finally {
      setLoadingAd(false);
    }
  };

  const handleDailyClaim = async () => {
    if (claimingDaily) return;
    setClaimingDaily(true);
    try {
      const res = await api.post('/users/daily-claim');
      showToast(`Daily bonus claimed! ${res.data.reward} USDT`, 'success');
      await refreshUser();
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to claim daily bonus';
      showToast(msg, 'error');
    } finally {
      setClaimingDaily(false);
    }
  };

  if (!user) return (
    <div className="flex justify-center items-center h-64">
      <LoadingSpinner size={28} color="var(--primary)" />
    </div>
  );

  const adsRemaining = Math.max(0, MAX_ADS_PER_DAY - stats.ads_today);
  const tgUser = window.Telegram?.WebApp?.initDataUnsafe?.user;
  const username = tgUser?.username || user?.username || 'user';
  const progressPercent = Math.min(100, (stats.ads_today / MAX_ADS_PER_DAY) * 100);
  
  // Daily check-in mock data (0-6 index, current day 3 for example)
  const days = ['M','T','W','T','F','S','S'];
  const currentDay = new Date().getDay() - 1; // 0 for Mon
  const normalizedDay = currentDay < 0 ? 6 : currentDay;

  // Dynamic quest stats pulled from user data (fallback to 0 if not present)
  const blitzRounds = user?.blitz_rounds || 0;
  const topScore = user?.top_score || 0;
  const totalScore = user?.total_score_today || 0;

  return (
    <div className="pb-24 px-4 pt-4">
      {/* HEADER */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-xl font-bold uppercase tracking-wider mb-2">ADSHARE</h1>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/20 border border-white/10 flex items-center justify-center font-bold overflow-hidden shrink-0">
              {tgUser?.photo_url ? (
                <img src={tgUser.photo_url} alt={user?.first_name || 'User'} className="w-full h-full object-cover" />
              ) : (
                user?.first_name?.charAt(0) || <User size={20} />
              )}
            </div>
            <div className="flex flex-col justify-center">
              <div className="text-base font-bold uppercase tracking-wide text-white leading-tight">
                {user?.first_name || 'Player'}
              </div>
              <div className="text-[11px] font-mono text-textmuted leading-tight mt-0.5">
                @{username}
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <div className="bg-cardbg border border-cardborder px-3 py-2 rounded-2xl flex items-center gap-2">
            <Star size={14} className="text-primary" fill="currentColor" />
            <span className="font-bold text-sm">{Number(user.balance || 0).toFixed(2)}</span>
          </div>
          <button onClick={() => navigate('/menu')} className="bg-cardbg border border-cardborder p-2 rounded-2xl hover:bg-white/10 transition-colors">
            <Settings size={20} className="text-white" />
          </button>
        </div>
      </div>

      {/* THREE EARNING OPTIONS */}
      <h3 className="font-mono font-bold text-lg text-white tracking-wider mb-4 mt-6">EARN USDT</h3>
      
      {/* 1. DAILY BONUS */}
      <div className="bg-cardbg border border-cardborder rounded-3xl p-5 mb-4">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-primary/20 rounded-xl flex items-center justify-center text-primary">
              <Calendar size={24} fill="currentColor" />
            </div>
            <div>
              <h3 className="font-bold text-lg leading-tight">Daily Bonus</h3>
              <div className="text-textmuted text-xs mt-0.5">Free USDT every 24h</div>
            </div>
          </div>
          <button 
            onClick={handleDailyClaim}
            disabled={claimingDaily}
            className="bg-primary text-black font-extrabold px-4 py-2 rounded-xl hover:bg-primary/90 transition-colors text-sm disabled:opacity-50"
          >
            {claimingDaily ? 'CLAIMING...' : 'CLAIM'}
          </button>
        </div>
        
        <div className="flex justify-between gap-1 mt-4">
          {days.map((d, i) => {
            const isToday = i === normalizedDay;
            const isClaimedToday = user?.last_daily_claim && (new Date() - new Date(user.last_daily_claim) < 24 * 60 * 60 * 1000);
            return (
              <div 
                key={i} 
                className={`flex-1 aspect-[3/4] flex flex-col items-center justify-center rounded-xl border ${
                  isToday 
                    ? (isClaimedToday ? 'bg-success/20 border-success/50 text-success' : 'bg-primary border-primary text-black')
                    : i < normalizedDay
                      ? 'bg-success/10 border-success/30 text-success'
                      : 'bg-transparent border-cardborder text-textmuted'
                }`}
              >
                <div className="text-xs font-bold">{d}</div>
                <div className="text-[10px] mt-1 opacity-60">Day {i+1}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. PLAY & EARN (MINI-GAME) */}
      <div 
        className="bg-[#FF4500] rounded-3xl p-5 mb-4 flex justify-between items-center relative overflow-hidden"
        onClick={() => setShowSpinWheel(true)}
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-10 -mt-10 blur-xl pointer-events-none"></div>
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center border border-white/20 shadow-lg">
            <Gift size={28} className="text-white" />
          </div>
          <div>
            <div className="bg-black/20 text-white text-[10px] font-bold px-2 py-0.5 rounded-full inline-block mb-1">
              FREE
            </div>
            <h2 className="text-white font-extrabold text-2xl uppercase leading-none mb-1">PLAY & EARN</h2>
            <div className="text-white/90 text-xs font-bold">SPIN FOR DAILY USDT</div>
          </div>
        </div>
        <ChevronRight size={24} className="text-white opacity-80" />
      </div>

      {/* 3. WATCH AD FOR EXTRA REWARD */}
      <div 
        className="bg-[#26A17B] rounded-3xl p-5 mb-6 relative overflow-hidden" 
        onClick={handleWatchAd}
        role="button"
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-10 -mt-10 blur-xl pointer-events-none"></div>
        
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center relative shadow-sm border-2 border-[#1c7a5c]">
            <Play size={24} className="text-[#26A17B]" fill="currentColor" />
            <div className="absolute -bottom-1.5 -right-2 bg-[#F0B90B] text-black text-[8px] font-extrabold px-1.5 py-0.5 rounded-md shadow-sm border border-black/10">
              BEP20
            </div>
          </div>
          <div>
            <div className="bg-black/20 text-white text-[10px] font-bold px-2 py-0.5 rounded-full inline-block mb-1">
              EXTRA REWARD
            </div>
            <h2 className="text-white font-extrabold text-2xl uppercase leading-none">WATCH AD</h2>
            <div className="text-white/90 text-[10px] font-bold mt-1 tracking-wide">EARN MORE USDT INSTANTLY</div>
          </div>
        </div>

        <div className="bg-black/10 rounded-2xl p-3 flex justify-between items-center">
          <div>
            <div className="text-white/70 text-[10px] font-bold uppercase">Today's Progress</div>
            <div className="text-white font-bold text-sm">{stats.ads_today} / {MAX_ADS_PER_DAY} Ads</div>
          </div>
          <div className="text-right">
            <div className="text-white/70 text-[10px] font-bold uppercase">Total Earned</div>
            <div className="text-white font-bold text-sm">${Number(stats.total_earned || 0).toFixed(4)}</div>
          </div>
        </div>
      </div>
      
      {/* SPIN WHEEL MODAL */}
      {showSpinWheel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-cardbg border border-cardborder rounded-3xl w-full max-w-sm overflow-hidden relative">
            <button 
              className="absolute top-4 right-4 bg-white/10 p-2 rounded-full hover:bg-white/20 transition-colors z-10"
              onClick={() => setShowSpinWheel(false)}
            >
              <X size={20} className="text-white" />
            </button>
            <div className="p-6 text-center">
              <h2 className="text-2xl font-extrabold text-white uppercase mb-2">Daily Spin</h2>
              <p className="text-textmuted text-sm mb-6">Play once a day for a chance to win free USDT!</p>
              <SpinWheel onComplete={() => setTimeout(() => setShowSpinWheel(false), 2000)} />
            </div>
          </div>
        </div>
      )}

      {/* TODAY'S QUESTS */}
      <div className={ENABLE_TASKS ? "mb-6 mt-6" : "mb-6 mt-6 opacity-50 grayscale pointer-events-none"}>
        <div className="flex justify-between items-end mb-2">
          <h3 className="font-mono font-bold text-lg text-white tracking-wider">Today's quests</h3>
          <div className="text-[10px] text-textmuted font-mono uppercase">Resets 00:00 UTC</div>
        </div>
        <div className="h-0.5 bg-cardborder w-full mb-4 rounded-full overflow-hidden">
          <div className="h-full bg-secondary rounded-full" style={{ width: `${(( (blitzRounds >= 3 ? 1 : 0) + (topScore >= 400 ? 1 : 0) + (totalScore >= 1200 ? 1 : 0) ) / 3) * 100}%` }}></div>
        </div>

        <div className="space-y-3">
          {/* Quest 1 */}
          <div className="bg-cardbg border border-cardborder rounded-2xl p-4">
            <div className="flex justify-between items-start mb-2">
              <div>
                <div className="font-bold text-sm text-white">Warm up</div>
                <div className="text-[11px] text-textmuted">Finish 3 Blitz rounds</div>
              </div>
              <div className="border border-secondary text-secondary px-2 py-1 rounded-full text-[10px] font-bold flex items-center gap-1">
                <Target size={12} /> 120
              </div>
            </div>
            <div className="flex justify-between items-end mb-1 mt-2">
              <div className="text-[10px] font-mono text-textmuted">PROGRESS</div>
              <div className="text-xs font-mono font-bold">{Math.min(blitzRounds, 3)} / 3</div>
            </div>
            <div className="h-1.5 bg-black/40 rounded-full overflow-hidden">
              <div className="h-full bg-secondary rounded-full" style={{ width: `${Math.min((blitzRounds/3)*100, 100)}%` }}></div>
            </div>
          </div>

          {/* Quest 2 */}
          <div className="bg-cardbg border border-cardborder rounded-2xl p-4">
            <div className="flex justify-between items-start mb-2">
              <div>
                <div className="font-bold text-sm text-white">Sharp eyes</div>
                <div className="text-[11px] text-textmuted">Score 400 in a single round</div>
              </div>
              <div className="border border-secondary text-secondary px-2 py-1 rounded-full text-[10px] font-bold flex items-center gap-1">
                <Target size={12} /> 200
              </div>
            </div>
            <div className="flex justify-between items-end mb-1 mt-2">
              <div className="text-[10px] font-mono text-textmuted">PROGRESS</div>
              <div className="text-xs font-mono font-bold">{Math.min(topScore, 400)} / 400</div>
            </div>
            <div className="h-1.5 bg-black/40 rounded-full overflow-hidden">
              <div className="h-full bg-secondary rounded-full" style={{ width: `${Math.min((topScore/400)*100, 100)}%` }}></div>
            </div>
          </div>

          {/* Quest 3 */}
          <div className="bg-cardbg border border-cardborder rounded-2xl p-4">
            <div className="flex justify-between items-start mb-2">
              <div>
                <div className="font-bold text-sm text-white">Grinder</div>
                <div className="text-[11px] text-textmuted">Score 1,200 points total today</div>
              </div>
              <div className="border border-secondary text-secondary px-2 py-1 rounded-full text-[10px] font-bold flex items-center gap-1">
                <Target size={12} /> 260
              </div>
            </div>
            <div className="flex justify-between items-end mb-1 mt-2">
              <div className="text-[10px] font-mono text-textmuted">PROGRESS</div>
              <div className="text-xs font-mono font-bold">{Math.min(totalScore, 1200)} / 1200</div>
            </div>
            <div className="h-1.5 bg-black/40 rounded-full overflow-hidden">
              <div className="h-full bg-secondary rounded-full" style={{ width: `${Math.min((totalScore/1200)*100, 100)}%` }}></div>
            </div>
          </div>
        </div>
      </div>

      {/* OPTIONAL BONUSES */}
      <div className="mb-6">
        <div className="flex justify-between items-end mb-2">
          <h3 className="font-mono font-bold text-lg text-white tracking-wider">Optional bonuses</h3>
        </div>
        <div className="h-0.5 bg-cardborder w-full mb-4"></div>
        
        <div className="bg-secondary/10 border border-secondary/20 rounded-3xl p-5 relative overflow-hidden">
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-secondary/20 rounded-full flex items-center justify-center text-secondary">
                <Play size={20} fill="currentColor" />
              </div>
              <div>
                <h4 className="font-bold text-white text-lg leading-none">Credits drop</h4>
                <div className="text-xs text-textmuted mt-1">Watch a short ad for a Credits bonus.</div>
              </div>
            </div>
          </div>

          <div className="flex gap-2 mb-4">
            <div className="border border-secondary/30 text-secondary px-2 py-1 rounded-full text-[10px] font-bold">
              {adsRemaining} of 20 left today
            </div>
            <div className="bg-black/30 text-white/50 px-2 py-1 rounded-full text-[10px] font-bold">
              OPTIONAL
            </div>
          </div>

          <button 
            onClick={handleWatchAd} 
            disabled={loadingAd || adsRemaining <= 0}
            className="w-full bg-secondary text-black font-bold py-3 rounded-2xl flex justify-center items-center gap-2 hover:bg-secondary/90 transition-colors disabled:opacity-50"
          >
            {loadingAd ? 'LOADING...' : adsRemaining > 0 ? 'WATCH AD → +150' : 'LIMIT REACHED'}
          </button>
          
          <div className="text-center text-[10px] text-textmuted mt-3">
            Play Blitz or claim your daily check-in to earn Credits for free.
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
