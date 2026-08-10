import React, { useState, useEffect } from 'react';
import { useUser } from '../context/UserContext';
import { useToast } from '../context/ToastContext';
import { getReferrals } from '../api/api';
import LoadingSpinner from '../components/LoadingSpinner';

const Referrals = () => {
  const { user } = useUser();
  const { showToast } = useToast();
  const [referrals, setReferrals] = useState([]);
  const [loading, setLoading]     = useState(true);

  const botUsername = import.meta.env.VITE_BOT_USERNAME || 'Blitz_Game_Zone_bot';
  const refLink     = `https://t.me/${botUsername}?start=ref_${user?.telegram_id || user?.id}`;

  useEffect(() => {
    const fetchRefs = async () => {
      try {
        const res = await getReferrals();
        setReferrals(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchRefs();
  }, []);

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

  const getInitials = (r) => {
    const name = r.first_name || r.username || '?';
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <div className="referrals-page">
      <h2 className="section-title">Refer &amp; Earn</h2>

      {/* ── Bonus info card ─────────────────── */}
      <div className="bonus-card">
        <div style={{ fontSize: 36, marginBottom: 10 }}>🤝</div>
        <div style={{ fontFamily: 'var(--font-head)', fontSize: 22, fontWeight: 700, color: 'var(--gold)', marginBottom: 6 }}>
          Earn 10% Forever
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          For every ad your friend watches, you earn<br />
          <strong style={{ color: 'var(--text-primary)' }}>10% of their reward</strong> — forever, automatically.
        </div>
      </div>

      {/* ── Referral link card ──────────────── */}
      <div className="card" style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: 10 }}>
          Your Referral Link
        </div>
        <div className="ref-link-box">{refLink}</div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            className="btn-secondary"
            onClick={copyLink}
            style={{ flex: 1, padding: '12px 8px', fontSize: 13 }}
            id="copy-ref-btn"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
            Copy
          </button>
          <button
            className="btn-primary"
            onClick={shareLink}
            style={{ flex: 2, padding: '12px 8px', fontSize: 13 }}
            id="share-ref-btn"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
            Share on Telegram
          </button>
        </div>
      </div>

      {/* ── Stats row ───────────────────────── */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        <div className="stat-card">
          <div className="stat-label">Friends Invited</div>
          <div className="stat-value">{referrals.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Referral Code</div>
          <div className="stat-value" style={{ fontFamily: 'var(--font-mono)', fontSize: 14, letterSpacing: '0.04em' }}>
            {user?.referral_code || '—'}
          </div>
        </div>
      </div>

      {/* ── Referrals list ──────────────────── */}
      <div style={{ fontFamily: 'var(--font-head)', fontSize: 13, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: 12 }}>
        Friends ({referrals.length})
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 40 }}>
          <LoadingSpinner size={28} />
        </div>
      ) : referrals.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">👥</div>
          <p className="empty-state-text">No referrals yet.<br />Share your link to start earning bonus rewards!</p>
        </div>
      ) : (
        referrals.map((r, i) => (
          <div className="referral-item" key={i}>
            <div className="referral-avatar">{getInitials(r)}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
                {r.username ? `@${r.username}` : r.first_name || 'User'}
              </div>
              <div style={{ fontSize: 11.5, color: 'var(--text-secondary)', marginTop: 2 }}>
                Joined {new Date(r.created_at.replace(' ', 'T') + 'Z').toLocaleDateString([], { dateStyle: 'medium' })}
              </div>
            </div>
            <div style={{ fontSize: 11, color: 'var(--success)', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
              +10%
            </div>
          </div>
        ))
      )}
    </div>
  );
};

export default Referrals;
