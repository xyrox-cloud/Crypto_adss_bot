import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import { useToast } from '../context/ToastContext';
import { getAdStats } from '../api/api';
import LoadingSpinner from '../components/LoadingSpinner';

const MAX_ADS_PER_DAY = parseInt(import.meta.env.VITE_MAX_ADS_PER_DAY || '20', 10);

/* helper — get initials from name */
const getInitials = (name = '') => {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return (name.slice(0, 2) || 'U').toUpperCase();
};

/* ── Stat card component ──────────────────────── */
const StatCard = ({ label, value, gold = false }) => (
  <div className="stat-card">
    <div className="stat-label">{label}</div>
    <div className={`stat-value${gold ? ' gold' : ''}`}>{value}</div>
  </div>
);

/* ── Main Home page ───────────────────────────── */
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
          // Wait briefly for webhook if testing locally (optional)
          await new Promise(r => setTimeout(r, 500));
          await refreshUser();
          fetchStats();
          return;
        }
        showToast('Ad network not available. Try again later.', 'error');
        return;
      }

      const adController = window.Adsgram.init({ blockId });
      const result = await adController.show();

      // We no longer call watchedAd on client; Adsgram webhook handles crediting.
      showToast('✅ Ad watched! Reward is being credited.', 'success');
      
      // Optionally wait a second for server-to-server webhook to process before refreshing
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
    <div style={{ display: 'flex', justifyContent: 'center', marginTop: '80px' }}>
      <LoadingSpinner size={28} />
    </div>
  );

  const adsRemaining = Math.max(0, MAX_ADS_PER_DAY - stats.ads_today);
  
  const tgUser = window.Telegram?.WebApp?.initDataUnsafe?.user;
  
  let tgDisplayName = 'Guest';
  if (tgUser && tgUser.first_name) {
    tgDisplayName = tgUser.first_name + (tgUser.last_name ? ` ${tgUser.last_name}` : '');
  } else if (user && user.first_name) {
    tgDisplayName = user.first_name;
  } else if (user && user.username) {
    tgDisplayName = user.username;
  }

  const tgUsername = tgUser?.username || user?.username || '';
  const photoUrl = tgUser?.photo_url;
  
  const initials = getInitials(tgDisplayName !== 'Guest' ? tgDisplayName : (tgUsername || 'G'));

  return (
    <div className="home-page">

      {/* ── User header ─────────────────────── */}
      <div className="user-header" style={{ alignItems: 'center' }}>
        {photoUrl ? (
          <img src={photoUrl} alt="Avatar" className="user-avatar" style={{ objectFit: 'cover' }} />
        ) : (
          <div className="user-avatar" aria-label="User avatar">{initials}</div>
        )}
        <div className="user-info" style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1 }}>
          <div className="user-name" style={{ fontSize: '17px', lineHeight: '1.2' }}>
            {tgDisplayName}
          </div>
          {tgUsername && (
            <div style={{ color: 'var(--text-dim)', fontSize: '13px', lineHeight: '1.2', marginBottom: '2px' }}>
              @{tgUsername}
            </div>
          )}
          <div className="user-tagline" style={{ marginTop: '2px' }}>
            {adsRemaining > 0
              ? `${adsRemaining} ad${adsRemaining !== 1 ? 's' : ''} available today`
              : 'Daily limit reached · Come back tomorrow'}
          </div>
        </div>
        <div className="user-online-dot" title="Connected" />
      </div>

      {/* ── Balance card ────────────────────── */}
      <div className="balance-card" aria-label="Balance">
        <div className="balance-label">Available Balance</div>
        <div style={{ marginBottom: 6 }}>
          <span className="balance-amount">
            {Number(user.balance || 0).toFixed(4)}
          </span>
          <span className="balance-currency">USDT</span>
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 4, fontFamily: 'var(--font-mono)' }}>
          Total earned: <span style={{ color: 'var(--gold-dim)' }}>${Number(stats.total_earned || 0).toFixed(4)}</span>
        </div>
      </div>

      {/* ── Watch Ad button with card stack ─── */}
      <div className="watch-ad-wrapper">
        {/* Stack cards behind (decorative) */}
        <div className="ad-stack-card" aria-hidden="true" />
        <div className="ad-stack-card" aria-hidden="true" />

        <button
          className="watch-ad-btn"
          onClick={handleWatchAd}
          disabled={loadingAd || adsRemaining === 0}
          id="watch-ad-btn"
          aria-label={adsRemaining === 0 ? 'Daily limit reached' : 'Watch an ad and earn USDT'}
        >
          {loadingAd ? (
            <><LoadingSpinner size={20} color="#fff" /> Loading Ad…</>
          ) : adsRemaining === 0 ? (
            <><span className="btn-icon">🔒</span> Daily Limit Reached</>
          ) : (
            <><span className="btn-icon">▶</span> Watch Ad &amp; Earn<span className="btn-pulse" /></>
          )}
        </button>
      </div>

      {/* Ads remaining hint */}
      <p className="ads-remaining-hint">
        {adsRemaining > 0
          ? `${stats.ads_today} / ${MAX_ADS_PER_DAY} watched today`
          : '🌙 Come back tomorrow for fresh ads'}
      </p>

      {/* ── 3 stat cards ────────────────────── */}
      <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
        <StatCard label="Ads Today"    value={stats.ads_today} />
        <StatCard label="Total Earned" value={`$${Number(stats.total_earned || 0).toFixed(2)}`} gold />
        <StatCard label="Referrals"    value={user.referral_count ?? 0} />
      </div>

      {/* ── Quick actions ────────────────────── */}
      <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
        <button
          className="btn-secondary"
          onClick={() => navigate('/withdraw')}
          style={{ flex: 1, padding: '12px' }}
          id="go-withdraw-btn"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="3"/><circle cx="12" cy="12" r="3"/></svg>
          Withdraw
        </button>
        <button
          className="btn-secondary"
          onClick={() => navigate('/referrals')}
          style={{ flex: 1, padding: '12px' }}
          id="go-referrals-btn"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="7" r="3.5"/><path d="M2 20c0-3.5 3-6 7-6"/><path d="M18 14l-3 3 3 3"/><path d="M21 17h-6"/></svg>
          Refer &amp; Earn
        </button>
      </div>

      {/* ── How it works ─────────────────────── */}
      <div className="how-it-works">
        <div className="how-it-works-title">How it works</div>
        {[
          { n: '1', text: <>Tap <strong>Watch Ad</strong> to see a short video ad</> },
          { n: '2', text: <><strong style={{ color: 'var(--gold)' }}>USDT lands instantly</strong> — 60% of ad revenue is yours</> },
          { n: '3', text: <>Reach <strong>$2.00 minimum</strong>, then withdraw to your BEP20 wallet</> },
          { n: '4', text: <>Invite friends and earn <strong>10% of their rewards</strong> forever</> },
        ].map(({ n, text }) => (
          <div className="how-step" key={n}>
            <div className="how-step-num">{n}</div>
            <div className="how-step-text">{text}</div>
          </div>
        ))}
      </div>

    </div>
  );
};

export default Home;
