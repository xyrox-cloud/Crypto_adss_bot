import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import { useToast } from '../context/ToastContext';
import { getAdStats } from '../api/api';
import LoadingSpinner from '../components/LoadingSpinner';
import { ChevronRight, Wallet, Users, Lock } from 'lucide-react';

const MAX_ADS_PER_DAY = parseInt(import.meta.env.VITE_MAX_ADS_PER_DAY || '20', 10);
const MIN_WITHDRAWAL = parseFloat(import.meta.env.VITE_MIN_WITHDRAWAL || '2.00');

const Earn = () => {
  const navigate = useNavigate();
  const { user, refreshUser } = useUser();
  const { showToast } = useToast();
  
  const ENABLE_REFERRALS = true;
  
  // Watch Ads state
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

  // Removed inline withdraw logic; navigating to Withdraw page instead

  if (!user) return (
    <div className="flex justify-center items-center h-64">
      <LoadingSpinner size={28} color="var(--primary)" />
    </div>
  );

  const adsRemaining = Math.max(0, MAX_ADS_PER_DAY - stats.ads_today);
  const balance = Number(user?.balance || 0);
  const canWithdraw = balance >= MIN_WITHDRAWAL;
  const withdrawProgress = Math.min(100, (balance / MIN_WITHDRAWAL) * 100);
  const unlockWithdraw = true;

  return (
    <div className="pb-24 px-4 pt-4">
      <h1 className="text-xl font-bold uppercase tracking-wider mb-6">EARN & WITHDRAW</h1>

      {/* WITHDRAW SECTION / BALANCE CARD */}
      <div className="balance-card mb-6" style={{ padding: '22px 20px' }}>
        <div className="balance-label">Available Balance</div>
        <div style={{ marginBottom: 6 }}>
          <span className="balance-amount">{balance.toFixed(4)}</span>
          <span className="balance-currency">USDT</span>
        </div>

        {/* Progress bar toward minimum */}
        {!canWithdraw && (
          <div style={{ marginTop: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-secondary)', marginBottom: 6, fontFamily: 'var(--font-mono)' }}>
              <span>Progress to minimum</span>
              <span>${balance.toFixed(4)} / ${MIN_WITHDRAWAL.toFixed(2)}</span>
            </div>
            <div style={{ height: 5, borderRadius: 0, background: 'var(--border)', overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                width: `${withdrawProgress}%`,
                background: 'linear-gradient(90deg, var(--accent-dim), var(--accent))',
                boxShadow: '0 0 8px var(--accent-glow)',
                transition: 'width 0.6s cubic-bezier(0.4,0,0.2,1)',
              }} />
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 6, textAlign: 'center', fontFamily: 'var(--font-mono)' }}>
              ${(MIN_WITHDRAWAL - balance).toFixed(4)} more needed
            </div>
          </div>
        )}
      </div>

      <div className="space-y-4">
        {/* STEP 1: WATCH ADS */}
        <div 
          className="bg-cardbg border border-cardborder p-4 relative"
          onClick={handleWatchAd}
          role="button"
        >
          <div className="flex justify-between items-center mb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white flex items-center justify-center relative shadow-sm">
                <svg width="24" height="24" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M100 0C44.7715 0 0 44.7715 0 100C0 155.228 44.7715 200 100 200C155.228 200 200 155.228 200 100C200 44.7715 155.228 0 100 0Z" fill="#26A17B"/>
                  <path d="M100 128.57C125.753 128.57 149.255 124.966 166.521 119.262V97.3595C149.255 103.064 125.753 106.667 100 106.667C74.2468 106.667 50.7453 103.064 33.4795 97.3595V119.262C50.7453 124.966 74.2468 128.57 100 128.57Z" fill="white"/>
                  <path d="M100 78.0963C126.974 78.0963 151.353 74.0205 169.567 67.5878V42.8574H116.536V62.4334C111.233 62.9067 105.714 63.1674 100 63.1674C94.2863 63.1674 88.7668 62.9067 83.4636 62.4334V42.8574H30.4326V67.5878C48.6465 74.0205 73.0255 78.0963 100 78.0963Z" fill="white"/>
                  <path d="M83.4639 171.428H116.536V117.412C111.233 118.067 105.714 118.423 100 118.423C94.2865 118.423 88.7671 118.067 83.4639 117.412V171.428Z" fill="white"/>
                </svg>
                <div className="absolute -bottom-1 -right-2 bg-[#F0B90B] text-black text-[8px] font-extrabold px-1 py-0.5 border-2 border-[#26A17B] shadow-sm">
                  BEP20
                </div>
              </div>
              <div>
                <h3 className="font-extrabold text-lg text-white uppercase leading-none">1. Watch Ads</h3>
                <div className="text-textmuted text-[10px] font-bold mt-1 uppercase">Earn USDT Directly</div>
              </div>
            </div>
            <div className="text-primary text-[10px] font-bold bg-primary/10 border border-primary/20 px-2 py-1">
              $0.015 / AD
            </div>
          </div>
          <div className="flex justify-between items-end mt-4">
            <div className="text-white text-xs font-bold font-mono">
              {loadingAd ? 'LOADING...' : `${adsRemaining} ADS LEFT TODAY`}
            </div>
            <ChevronRight size={16} className="text-white" />
          </div>
        </div>

        {/* STEP 2: INVITE FRIENDS */}
        <div 
          className={`p-4 relative border ${ENABLE_REFERRALS ? 'bg-cardbg border-cardborder cursor-pointer' : 'bg-black/20 border-white/5 opacity-50 grayscale pointer-events-none'}`}
          onClick={() => ENABLE_REFERRALS && navigate('/referrals')}
          role="button"
        >
          <div className="flex justify-between items-center mb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/5 border border-white/10 flex items-center justify-center">
                <Users size={20} className="text-white" />
              </div>
              <div>
                <h3 className="font-extrabold text-lg text-white uppercase leading-none">2. Invite Friends</h3>
                <div className="text-textmuted text-[10px] font-bold mt-1 uppercase">10% of their earnings</div>
              </div>
            </div>
            <div className="text-primary text-[10px] font-bold bg-primary/10 border border-primary/20 px-2 py-1">
              $0.05 / REF
            </div>
          </div>
          <div className="flex justify-between items-end mt-4">
            <div className="text-white text-xs font-bold font-mono">
              {user?.referrals_count || 0} INVITES
            </div>
            <ChevronRight size={16} className="text-white" />
          </div>
        </div>

        {/* STEP 3: WITHDRAW */}
        <div 
          className="bg-cardbg border-cardborder cursor-pointer p-4 relative border"
          onClick={() => navigate('/withdraw')}
          role="button"
        >
          <div className="flex justify-between items-center mb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 flex items-center justify-center border bg-primary/10 border-primary/20">
                <Wallet size={20} className="text-primary" />
              </div>
              <div>
                <h3 className="font-extrabold text-lg uppercase leading-none text-white">3. Withdraw</h3>
                <div className="text-textmuted text-[10px] font-bold mt-1 uppercase">
                  CASH OUT YOUR USDT
                </div>
              </div>
            </div>
          </div>
          <div className="flex justify-between items-end mt-4">
            <div className="text-xs font-bold font-mono text-white">
              {canWithdraw ? 'READY TO WITHDRAW' : 'MINIMUM NOT MET'}
            </div>
            <ChevronRight size={16} className="text-white" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Earn;
