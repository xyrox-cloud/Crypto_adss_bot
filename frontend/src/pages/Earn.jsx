import { MIN_WITHDRAWAL, REWARD_PER_AD } from '../config';
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import { useToast } from '../context/ToastContext';
import { getAdStats, claimAdReward } from '../api/api';
import LoadingSpinner from '../components/LoadingSpinner';
import { ChevronDown, ChevronUp, Wallet, Users, Play, CheckCircle } from 'lucide-react';
import createAdHandler from 'monetag-tg-sdk';

const MAX_ADS_PER_DAY = parseInt(import.meta.env.VITE_MAX_ADS_PER_DAY || '20', 10);

const Earn = () => {
  const navigate = useNavigate();
  const { user, setUser, refreshUser } = useUser();
  const { showToast } = useToast();
  
  const ENABLE_REFERRALS = true;
  
  const [loadingAd, setLoadingAd] = useState(false);
  const [stats, setStats] = useState({ ads_today: 0, ads_this_week: 0, total_earned: 0, reward_per_ad: REWARD_PER_AD });
  const [inviteExpanded, setInviteExpanded] = useState(false);

  const botUsername = import.meta.env.VITE_BOT_USERNAME || 'Blitz_Game_Zone_bot';
  const refLink = `https://t.me/${botUsername}?start=ref_${user?.telegram_id || user?.id}`;

  const copyLink = () => {
    navigator.clipboard.writeText(refLink);
    showToast('Referral link copied!', 'success');
  };

  const shareLink = () => {
    if (window.Telegram?.WebApp?.openTelegramLink) {
      window.Telegram.WebApp.openTelegramLink(
        `https://t.me/share/url?url=${encodeURIComponent(refLink)}&text=${encodeURIComponent('Join me on Blitz Game Zone and earn TON by playing games and watching ads! 🚀')}`
      );
    } else if (navigator.share) {
      navigator.share({ title: 'Join Blitz Game Zone', text: 'Earn TON by playing games and watching ads on Telegram!', url: refLink });
    } else {
      copyLink();
    }
  };

  useEffect(() => { fetchStats(); }, []);

  const fetchStats = async () => {
    try {
      const res = await getAdStats();
      setStats(res.data || { ads_today: 0, ads_this_week: 0, total_earned: 0, reward_per_ad: REWARD_PER_AD });
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
      const zoneId = import.meta.env.VITE_MONETAG_ZONE_ID;

      if (!zoneId) {
        showToast('❌ Ad network configuration missing.', 'error');
        setLoadingAd(false);
        return;
      }

      const adHandler = createAdHandler(zoneId);
      
      try {
        await adHandler();
      } catch (err1) {
        console.warn('Interstitial failed, trying popup fallback...', err1);
        await adHandler('pop');
      }
      
      showToast('✅ Ad watched! Reward is being credited.', 'success');
      
      const res = await claimAdReward();
      if (res.data && res.data.success) {
        const rewardAmt = res.data.reward || currentRewardPerAd;
        setUser(prev => ({ 
          ...prev, 
          balance: (Number(prev.balance) || 0) + rewardAmt, 
          total_earned: (Number(prev.total_earned) || 0) + rewardAmt 
        }));
        setStats(prev => ({
          ...prev,
          ads_today: prev.ads_today + 1,
          ads_this_week: prev.ads_this_week + 1,
          total_earned: (Number(prev.total_earned) || 0) + rewardAmt
        }));
        await refreshUser();
      } else {
        await refreshUser();
        fetchStats();
      }
    } catch (err) {
      console.error('Ad Watch Error:', err);
      const serverMsg = err?.response?.data?.error;
      const errMsg = err?.message || '';
      if (serverMsg?.includes('limit')) {
        showToast(serverMsg, 'error');
      } else if (errMsg.includes('communicating with the ad server') || errMsg.includes('blocked')) {
        showToast('Ad server unreachable. Please disable AdBlock/VPN & retry.', 'error');
      } else {
        showToast('Ad not completed or no ads available right now.', 'info');
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
  const balance = Number(user?.balance || 0);
  const lifetime = Number(user?.total_earned || 0);
  const currentRewardPerAd = stats.reward_per_ad ?? REWARD_PER_AD;

  return (
    <div className="pb-24 px-4 pt-4">
      {/* BALANCE CARD (Prominent) */}
      <div className="bg-[#0088CC] rounded-2xl p-6 text-center shadow-lg relative overflow-hidden mb-8 mt-2">
        {/* Decorative background circle */}
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
        <div className="absolute -bottom-8 -left-8 w-24 h-24 bg-black/10 rounded-full blur-xl"></div>
        
        <div className="text-white/80 text-xs font-bold uppercase tracking-widest mb-2 relative z-10">
          Your TON Balance
        </div>
        
        <div className="flex justify-center items-center gap-2 mb-2 relative z-10">
          <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center p-1.5 shadow-sm">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" fill="#0088CC"/>
              <path d="M15.405 8.16335L8.59501 8.16335C8.01633 8.16335 7.6322 8.76106 7.85409 9.28825L11.4586 17.8465C11.666 18.3385 12.334 18.3385 12.5414 17.8465L16.1459 9.28825C16.3678 8.76106 15.9837 8.16335 15.405 8.16335Z" fill="white"/>
              <path d="M11.9995 16.7118L8.71804 8.91899L11.9995 8.91899L11.9995 16.7118Z" fill="#E6E6E6"/>
            </svg>
          </div>
          <span className="text-4xl font-extrabold text-white tracking-tight">
            {balance.toFixed(4)}
          </span>
        </div>
        
        <div className="text-white/70 text-[10px] font-bold uppercase tracking-wider relative z-10">
          {lifetime.toFixed(4)} TON LIFETIME
        </div>
      </div>

      <h2 className="text-sm font-extrabold text-white uppercase tracking-wider mb-4 px-1">
        How it works
      </h2>

      <div className="space-y-3 mb-6">
        {/* STEP 1: WATCH ADS */}
        <div 
          className="bg-cardbg border border-cardborder rounded-xl p-4 flex items-center justify-between cursor-pointer active:scale-[0.98] transition-transform"
          onClick={handleWatchAd}
        >
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-[#0088CC]/10 flex items-center justify-center">
              <Play size={20} className="text-[#0088CC]" fill="currentColor" />
            </div>
            <div>
              <div className="font-bold text-white text-sm">1. Watch ads</div>
              <div className="text-primary text-[11px] font-bold mt-0.5">{currentRewardPerAd} TON per task</div>
            </div>
          </div>
          <div className="bg-[#0088CC]/20 text-[#0088CC] px-2.5 py-1 rounded-md text-[10px] font-extrabold">
            {loadingAd ? 'WAIT' : `${adsRemaining} LEFT`}
          </div>
        </div>

        {/* STEP 2: INVITE FRIENDS */}
        <div 
          className={`bg-cardbg border ${inviteExpanded ? 'border-[#0088CC]' : 'border-cardborder'} rounded-xl p-4 flex flex-col cursor-pointer transition-transform ${!ENABLE_REFERRALS && 'opacity-50 grayscale'}`}
          onClick={() => ENABLE_REFERRALS && setInviteExpanded(!inviteExpanded)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-[#0088CC]/10 flex items-center justify-center">
                <Users size={20} className="text-[#0088CC]" />
              </div>
              <div>
                <div className="font-bold text-white text-sm">2. Invite friends</div>
                <div className="text-primary text-[11px] font-bold mt-0.5">250 pts each, no limits</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="bg-white/10 text-white px-2.5 py-1 rounded-md text-[10px] font-extrabold font-mono">
                {user?.referrals_count || 0} INVITES
              </div>
              {inviteExpanded ? <ChevronUp size={16} className="text-textmuted" /> : <ChevronDown size={16} className="text-textmuted" />}
            </div>
          </div>

          {/* EXPANDED DETAIL VIEW */}
          {inviteExpanded && (
            <div className="mt-4 pt-4 border-t border-cardborder cursor-default" onClick={(e) => e.stopPropagation()}>
              <div className="text-[10px] font-bold uppercase tracking-wider text-textmuted mb-4">Refer & Earn</div>
              
              {/* Card 1: Requirement */}
              <div className="bg-black/20 rounded-lg p-4 mb-3 border border-white/5">
                <h3 className="text-white text-xs font-bold uppercase tracking-wide mb-3">An invite counts when your friend:</h3>
                <div className="flex items-center gap-3 bg-[#0088CC]/10 border border-[#0088CC]/20 rounded-lg p-3">
                  <div className="w-8 h-8 rounded-full bg-[#0088CC]/20 flex items-center justify-center relative">
                    <Play size={14} className="text-[#0088CC]" fill="currentColor" />
                    <div className="absolute -bottom-1 -right-1 bg-green-500 rounded-full p-0.5">
                      <CheckCircle size={10} className="text-white" />
                    </div>
                  </div>
                  <div className="text-white text-sm font-bold">Opens Blitz Game Zone</div>
                </div>
                <div className="text-textmuted text-[10px] mt-2 font-medium">
                  The points are credited instantly.
                </div>
              </div>

              {/* Card 2: Reward */}
              <div className="bg-black/20 rounded-lg p-4 mb-4 border border-white/5">
                <h3 className="text-white text-xs font-bold uppercase tracking-wide mb-1">250 Points per friend</h3>
                <div className="text-textmuted text-[10px] font-medium mb-4">
                  You earn 250 points when an invited friend joins, and they start with a 100 points bonus.
                </div>

                <div className="grid grid-cols-2 gap-2 mt-4">
                  <div className="bg-white/5 rounded p-2 text-center">
                    <div className="text-white font-extrabold text-sm">{user?.referrals_count || 0}</div>
                    <div className="text-textmuted text-[9px] font-bold uppercase">Friends</div>
                  </div>
                  <div className="bg-white/5 rounded p-2 text-center">
                    <div className="text-white font-extrabold text-sm">{(user?.referrals_count || 0) * 250}</div>
                    <div className="text-textmuted text-[9px] font-bold uppercase">Points Earned</div>
                  </div>
                </div>
              </div>

              {/* YOUR INVITE LINK */}
              <div>
                <h3 className="text-textmuted text-[10px] font-bold uppercase tracking-wider mb-2">Your Invite Link</h3>
                <div className="bg-black/30 border border-white/10 rounded-md p-2.5 text-white font-mono text-[10px] break-all mb-3 text-center">
                  {refLink}
                </div>
                <div className="flex gap-2">
                  <button
                    className="flex-1 bg-white/10 hover:bg-white/20 text-white font-bold rounded-lg py-2.5 text-xs transition-colors"
                    onClick={copyLink}
                  >
                    COPY
                  </button>
                  <button
                    className="flex-[2] bg-[#0088CC] hover:bg-[#0077B3] text-white font-bold rounded-lg py-2.5 text-xs transition-colors shadow-lg shadow-[#0088CC]/20"
                    onClick={shareLink}
                  >
                    SHARE LINK
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* STEP 3: WITHDRAW */}
        <div 
          className="bg-cardbg border border-cardborder rounded-xl p-4 flex items-center justify-between cursor-pointer active:scale-[0.98] transition-transform"
          onClick={() => navigate('/withdraw')}
        >
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-[#0088CC]/10 flex items-center justify-center">
              <Wallet size={20} className="text-[#0088CC]" />
            </div>
            <div>
              <div className="font-bold text-white text-sm">3. Withdraw</div>
              <div className="text-primary text-[11px] font-bold mt-0.5">Cash out your TON</div>
            </div>
          </div>
          <div className="text-white/60 text-xs font-bold font-mono">
            {MIN_WITHDRAWAL.toFixed(2)} MIN
          </div>
        </div>
      </div>

      {/* STATS STRIP */}
      <div className="grid grid-cols-3 gap-2 mb-6">
        <div className="bg-cardbg border border-cardborder rounded-lg p-3 text-center">
          <div className="text-white text-sm font-extrabold mb-1">{currentRewardPerAd}</div>
          <div className="text-textmuted text-[9px] font-bold uppercase">TON / Task</div>
        </div>
        <div className="bg-cardbg border border-cardborder rounded-lg p-3 text-center">
          <div className="text-white text-sm font-extrabold mb-1">250</div>
          <div className="text-textmuted text-[9px] font-bold uppercase">PTS / Invite</div>
        </div>
        <div className="bg-cardbg border border-cardborder rounded-lg p-3 text-center">
          <div className="text-white text-sm font-extrabold mb-1">{MIN_WITHDRAWAL.toFixed(2)}</div>
          <div className="text-textmuted text-[9px] font-bold uppercase">Min Payout</div>
        </div>
      </div>

      {/* DISCLAIMER */}
      <div className="text-center text-[10px] text-textmuted/60 font-medium px-4">
        Withdrawals are subject to review to prevent abuse.
      </div>

    </div>
  );
};

export default Earn;
