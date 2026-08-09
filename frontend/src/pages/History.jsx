import React, { useState, useEffect } from 'react';
import { getWithdrawalHistory, getAdHistory } from '../api/api';
import LoadingSpinner from '../components/LoadingSpinner';

/* ── Icon components ─────────────────────── */
const PlayIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="5 3 19 12 5 21 5 3" />
  </svg>
);

const ArrowDownIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19" />
    <polyline points="19 12 12 19 5 12" />
  </svg>
);

/* ── Relative time helper ────────────────── */
const relativeTime = (dateStr) => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
};

/* ── History Page ────────────────────────── */
const History = () => {
  const [tab, setTab] = useState('ads');
  const [withdrawals, setWithdrawals] = useState([]);
  const [adWatches, setAdWatches] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchWithdrawals = async () => {
    setLoading(true);
    try {
      const res = await getWithdrawalHistory();
      setWithdrawals(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const fetchAdWatches = async () => {
    setLoading(true);
    try {
      const res = await getAdHistory({ limit: 50 });
      setAdWatches(res.data.watches || []);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (tab === 'withdrawals') fetchWithdrawals();
    else fetchAdWatches();
  }, [tab]);

  return (
    <div className="history-page">
      <h2 className="section-title">History</h2>

      {/* ── Tabs ──────────────────────── */}
      <div className="tabs-bar">
        <button
          className={`tab-btn ${tab === 'ads' ? 'active' : 'inactive'}`}
          onClick={() => setTab('ads')}
          id="tab-ads"
        >
          <PlayIcon />
          Ad Earnings
        </button>
        <button
          className={`tab-btn ${tab === 'withdrawals' ? 'active' : 'inactive'}`}
          onClick={() => setTab('withdrawals')}
          id="tab-withdrawals"
        >
          <ArrowDownIcon />
          Withdrawals
        </button>
      </div>

      {/* ── List ──────────────────────── */}
      <div className="history-list">
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 60 }}>
            <LoadingSpinner size={28} />
          </div>
        ) : tab === 'ads' ? (
          adWatches.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📺</div>
              <p className="empty-state-text">No ad watches yet.<br />Head to Home to start earning!</p>
            </div>
          ) : (
            adWatches.map((w, i) => (
              <div className="tx-item" key={i}>
                <div className="tx-icon-wrap earn">
                  <PlayIcon />
                </div>
                <div className="tx-info">
                  <div className="tx-title">Ad Watched</div>
                  <div className="tx-time">{relativeTime(w.timestamp)} · {new Date(w.timestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</div>
                </div>
                <div className="tx-amount-col">
                  <div className="tx-amount earn">+{Number(w.reward_amount || 0).toFixed(4)}</div>
                  <div className="tx-unit">USDT</div>
                </div>
              </div>
            ))
          )
        ) : (
          withdrawals.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">💸</div>
              <p className="empty-state-text">No withdrawals yet.<br />Keep watching ads to reach the minimum!</p>
            </div>
          ) : (
            withdrawals.map((w, i) => (
              <div className="tx-item" key={i}>
                <div className="tx-icon-wrap withdraw">
                  <ArrowDownIcon />
                </div>
                <div className="tx-info">
                  <div className="tx-title">{Number(w.amount || 0).toFixed(2)} USDT</div>
                  <div className="tx-time">
                    {relativeTime(w.requested_at)} · {w.wallet_address.slice(0, 6)}…{w.wallet_address.slice(-4)}
                  </div>
                </div>
                <div className="tx-amount-col">
                  <span className={`badge badge-${(w.status || '').toLowerCase()}`}>
                    {w.status}
                  </span>
                </div>
              </div>
            ))
          )
        )}
      </div>
    </div>
  );
};

export default History;
