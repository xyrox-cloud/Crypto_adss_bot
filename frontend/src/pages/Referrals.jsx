import React, { useState, useEffect } from 'react';
import { useUser } from '../context/UserContext';
import { useToast } from '../context/ToastContext';
import { getReferrals } from '../api/api';
import LoadingSpinner from '../components/LoadingSpinner';
import { Users, User, Link as LinkIcon } from 'lucide-react';

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
    <div className="pb-24 px-4 pt-4">
      {/* ── Bonus info card ─────────────────── */}
      <div className="bg-[#0088CC] rounded-2xl p-6 text-center shadow-lg relative overflow-hidden mb-6 mt-2">
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
        <div className="absolute -bottom-8 -left-8 w-24 h-24 bg-black/10 rounded-full blur-xl"></div>
        
        <div style={{ fontSize: 36, marginBottom: 10 }} className="relative z-10">🤝</div>
        <div style={{ fontFamily: 'var(--font-head)', fontSize: 22, fontWeight: 700, color: '#FFD700', marginBottom: 6 }} className="relative z-10">
          Invite, Both Get Points
        </div>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.9)', lineHeight: 1.6 }} className="relative z-10">
          You get <strong style={{ color: 'white' }}>250 points</strong> when a friend opens<br />
          Blitz Game Zone from your link. They start with <strong style={{ color: 'white' }}>100 points</strong>.
        </div>
      </div>

      {/* ── Stats row (3 boxes) ───────────────────────── */}
      <div className="grid grid-cols-3 gap-2 mb-6">
        <div className="bg-cardbg border border-cardborder rounded-lg p-3 text-center">
          <div className="text-white text-sm font-extrabold mb-1">{referrals.length}</div>
          <div className="text-textmuted text-[9px] font-bold uppercase">Friends</div>
        </div>
        <div className="bg-cardbg border border-cardborder rounded-lg p-3 text-center">
          <div className="text-white text-sm font-extrabold mb-1">{(user?.referrals_count || 0) * 250}</div>
          <div className="text-textmuted text-[9px] font-bold uppercase">Points Earned</div>
        </div>
        <div className="bg-cardbg border border-cardborder rounded-lg p-3 text-center">
          <div className="text-white text-sm font-extrabold mb-1">{user?.all_time_score || 0}</div>
          <div className="text-textmuted text-[9px] font-bold uppercase">Balance</div>
        </div>
      </div>

      {/* ── Referral link card ──────────────── */}
      <div className="bg-cardbg border border-cardborder rounded-xl p-4 mb-8">
        <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-secondary)', mb: 10 }}>
          Your Referral Link
        </div>
        <div className="bg-black/30 border border-white/10 rounded-md p-3 text-white font-mono text-[10px] break-all my-3">
          {refLink}
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            className="flex-1 bg-white/10 hover:bg-white/20 text-white font-bold rounded-lg py-2.5 text-xs flex items-center justify-center gap-2 transition-colors"
            onClick={copyLink}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
            COPY
          </button>
          <button
            className="flex-[2] bg-[#0088CC] hover:bg-[#0077B3] text-white font-bold rounded-lg py-2.5 text-xs flex items-center justify-center gap-2 transition-colors shadow-lg shadow-[#0088CC]/20"
            onClick={shareLink}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
            SHARE ON TELEGRAM
          </button>
        </div>
      </div>

      {/* ── Referrals list ──────────────────── */}
      <h2 className="text-sm font-extrabold text-white uppercase tracking-wider mb-4 px-1">
        Your Invites ({referrals.length})
      </h2>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 40 }}>
          <LoadingSpinner size={28} />
        </div>
      ) : referrals.length === 0 ? (
        <div className="bg-cardbg border border-cardborder rounded-xl p-8 flex flex-col items-center justify-center text-center mt-2">
          <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4">
            <User size={32} className="text-textmuted" />
          </div>
          <div className="text-white font-extrabold uppercase tracking-wider mb-2">No Invites Yet</div>
          <div className="text-textmuted text-xs">Share your link. There's no limit.</div>
        </div>
      ) : (
        <div className="space-y-2">
          {referrals.map((r, i) => (
            <div className="bg-cardbg border border-cardborder rounded-xl p-3 flex items-center" key={i}>
              <div className="w-10 h-10 bg-[#0088CC]/20 text-[#0088CC] rounded-full flex items-center justify-center font-bold mr-3 flex-shrink-0">
                {getInitials(r)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'white' }} className="truncate">
                  {r.username ? `@${r.username}` : r.first_name || 'User'}
                </div>
                <div style={{ fontSize: 11.5, color: 'var(--text-secondary)', marginTop: 2 }}>
                  Joined {new Date(r.created_at.replace(' ', 'T') + 'Z').toLocaleDateString([], { dateStyle: 'medium' })}
                </div>
              </div>
              <div style={{ fontSize: 11, color: '#4ADE80', fontFamily: 'var(--font-mono)', fontWeight: 600, background: 'rgba(74, 222, 128, 0.1)', padding: '4px 8px', borderRadius: '4px' }}>
                +250 pts
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Referrals;
