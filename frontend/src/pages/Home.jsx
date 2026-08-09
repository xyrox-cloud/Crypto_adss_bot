import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import { useToast } from '../context/ToastContext';
import { getAdStats } from '../api/api';
import LoadingSpinner from '../components/LoadingSpinner';
import { Settings, User, Play, ChevronRight, Zap, Target, Star } from 'lucide-react';

const MAX_ADS_PER_DAY = parseInt(import.meta.env.VITE_MAX_ADS_PER_DAY || '20', 10);

const Home = () => {
  const { user, refreshUser } = useUser();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [loadingAd, setLoadingAd] = useState(false);
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

  return (
    <div className="pb-24 px-4 pt-4">
      {/* HEADER */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-xl font-bold uppercase tracking-wider mb-2">ADSHARE</h1>
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-white/20 border border-white/10 flex items-center justify-center font-bold">
              {user.first_name?.charAt(0) || <User size={20} />}
            </div>
            <div>
              <div className="text-sm font-bold uppercase tracking-widest text-white/90">@{username}</div>
              <div className="text-[10px] font-bold text-secondary flex items-center gap-1">
                <Zap size={12} fill="currentColor" /> STREAK: 1
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

      {/* 1. BLUE EARN CARD */}
      <div 
        className="bg-primary rounded-3xl p-5 mb-4 relative overflow-hidden" 
        onClick={handleWatchAd}
        role="button"
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-10 -mt-10 blur-xl pointer-events-none"></div>
        
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
            <Play className="text-primary ml-1" size={20} fill="currentColor" />
          </div>
          <div>
            <h2 className="text-black font-extrabold text-2xl uppercase leading-none">WATCH ADS</h2>
            <div className="text-black/70 text-xs font-bold mt-1">EARN REAL USDT REWARDS</div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="border border-black/10 rounded-2xl p-2 text-center bg-black/5">
            <div className="text-black font-extrabold text-xl">{stats.ads_today}</div>
            <div className="text-black/60 text-[9px] font-bold">TODAY</div>
          </div>
          <div className="border border-black/10 rounded-2xl p-2 text-center bg-black/5">
            <div className="text-black font-extrabold text-xl">{MAX_ADS_PER_DAY}</div>
            <div className="text-black/60 text-[9px] font-bold">LIMIT</div>
          </div>
          <div className="border border-black/10 rounded-2xl p-2 text-center bg-black/5">
            <div className="text-black font-extrabold text-xl">${Number(stats.total_earned || 0).toFixed(2)}</div>
            <div className="text-black/60 text-[9px] font-bold">EARNED</div>
          </div>
        </div>

        <div className="flex justify-between items-end mb-2">
          <div className="text-black text-xs font-bold">
            {loadingAd ? 'LOADING AD...' : adsRemaining > 0 ? `${adsRemaining} ADS AVAILABLE` : 'DAILY LIMIT REACHED'}
          </div>
          {!loadingAd && adsRemaining > 0 && <ChevronRight size={16} className="text-black" />}
        </div>
        <div className="h-1.5 bg-black/20 rounded-full overflow-hidden">
          <div className="h-full bg-black rounded-full" style={{ width: `${progressPercent}%` }}></div>
        </div>
      </div>

      {/* 2. ORANGE GAME CARD */}
      <div 
        className="bg-secondary rounded-3xl p-5 mb-4 flex justify-between items-center relative overflow-hidden"
        onClick={() => navigate('/referrals')}
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-10 -mt-10 blur-xl pointer-events-none"></div>
        <div>
          <div className="bg-black/20 text-black text-[10px] font-bold px-2 py-1 rounded-full inline-block mb-2">
            MULTIPLIER
          </div>
          <h2 className="text-black font-extrabold text-2xl uppercase leading-none mb-1">REFERRALS</h2>
          <div className="text-black/70 text-xs font-bold">EARN 10% FOR LIFE</div>
        </div>
        <div className="bg-black text-white px-5 py-3 rounded-full font-bold text-sm">
          INVITE
        </div>
      </div>

      {/* 3. DAILY CHECK-IN CARD */}
      <div className="bg-cardbg border border-cardborder rounded-3xl p-5">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h3 className="font-bold text-lg">DAILY CHECK-IN</h3>
            <div className="text-textmuted text-xs mt-1">LOG IN 7 DAYS FOR BONUS</div>
          </div>
          <div className="border border-success text-success px-3 py-1 rounded-full text-xs font-bold">
            DONE
          </div>
        </div>
        <div className="flex justify-between gap-1">
          {days.map((d, i) => (
            <div 
              key={i} 
              className={`flex-1 aspect-[3/4] flex flex-col items-center justify-center rounded-xl border ${
                i === normalizedDay 
                  ? 'bg-white border-white text-black' 
                  : i < normalizedDay
                    ? 'bg-success/10 border-success/30 text-success'
                    : 'bg-transparent border-cardborder text-textmuted'
              }`}
            >
              <div className="text-xs font-bold">{d}</div>
              <div className="text-[10px] mt-1 opacity-50">{i+1}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Home;
