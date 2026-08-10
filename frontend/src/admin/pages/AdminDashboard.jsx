import React, { useEffect, useState } from 'react';
import { getAdminStats } from '../../api/adminApi';

const fmt  = (n, dp = 2) => Number(n || 0).toFixed(dp);
const fmtN = (n) => Number(n || 0).toLocaleString();

function StatCard({ label, value, sub, variant = '', highlight = false }) {
  return (
    <div className={`admin-stat-card ${highlight ? 'highlight' : ''} ${variant === 'gold' ? 'gold-card' : ''}`}>
      <div className="admin-stat-label">{label}</div>
      <div className={`admin-stat-value ${variant}`}>{value}</div>
      {sub && <div className="admin-stat-sub">{sub}</div>}
    </div>
  );
}

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const res = await getAdminStats();
      setStats(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  if (loading) return (
    <div className="admin-loading">
      <span className="a-spinner" style={{ color: 'var(--accent)' }} />
      Loading dashboard…
    </div>
  );

  if (!stats) return <div className="admin-empty">Failed to load stats.</div>;

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontFamily: 'var(--font-head)', fontSize: 20, fontWeight: 700, marginBottom: 4 }}>
          Dashboard
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
          Real-time platform overview · Last refreshed: {new Date().toLocaleTimeString()}
        </p>
      </div>

      {/* Users */}
      <div style={{ marginBottom: 10, fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-dim)' }}>
        Users
      </div>
      <div className="admin-stats-grid" style={{ marginBottom: 24 }}>
        <StatCard label="Total Users"   value={fmtN(stats.total_users)} />
        <StatCard label="Banned Users"  value={fmtN(stats.banned_users)} variant={stats.banned_users > 0 ? 'warn' : ''} />
      </div>

      {/* Ads */}
      <div style={{ marginBottom: 10, fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-dim)' }}>
        Ad Activity
      </div>
      <div className="admin-stats-grid" style={{ marginBottom: 24 }}>
        <StatCard label="Ads Today"     value={fmtN(stats.ads_today)} variant="accent" />
        <StatCard label="Ads This Week" value={fmtN(stats.ads_this_week)} />
        <StatCard label="Ads All-Time"  value={fmtN(stats.ads_all_time)} />
      </div>

      {/* Revenue */}
      <div style={{ marginBottom: 10, fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-dim)' }}>
        Revenue
      </div>
      <div className="admin-stats-grid" style={{ marginBottom: 24 }}>
        <StatCard
          label="Platform Revenue (40%)"
          value={`${fmt(stats.total_revenue, 4)}`}
          variant="gold"
          sub="TON"
        />
        <StatCard
          label="Total Paid Out"
          value={`${fmt(stats.total_paid_out, 4)}`}
          variant="success"
          sub="TON"
        />
      </div>

      {/* Withdrawals */}
      <div style={{ marginBottom: 10, fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-dim)' }}>
        Withdrawals
      </div>
      <div className="admin-stats-grid">
        <StatCard
          label="Pending Requests"
          value={fmtN(stats.pending_withdrawals_count)}
          sub={stats.pending_withdrawals_amount > 0 ? `${fmt(stats.pending_withdrawals_amount, 4)} TON pending` : null}
          variant={stats.pending_withdrawals_count > 0 ? 'warn' : ''}
          highlight={stats.pending_withdrawals_count > 0}
        />
      </div>

      <div style={{ marginTop: 28 }}>
        <button className="a-btn a-btn-ghost" onClick={load}>
          ↻ Refresh
        </button>
      </div>
    </div>
  );
}
