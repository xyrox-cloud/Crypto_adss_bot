import React, { useEffect, useState, useCallback } from 'react';
import { getActivityLog } from '../../api/adminApi';
import { useAdminToast } from '../AdminToast';

const ACTION_COLORS = {
  WITHDRAWAL_APPROVED: 'var(--success)',
  WITHDRAWAL_REJECTED: 'var(--error)',
  BALANCE_ADJUST:      'var(--warning)',
  USER_BANNED:         'var(--error)',
  USER_UNBANNED:       'var(--success)',
  SETTINGS_CHANGED:    'var(--accent)',
};

function parseDetails(raw) {
  if (!raw) return null;
  try {
    const obj = JSON.parse(raw);
    return Object.entries(obj).map(([k, v]) => (
      <span key={k} style={{ display: 'inline-block', marginRight: 12 }}>
        <span style={{ color: 'var(--text-dim)', fontSize: 10.5 }}>{k}:</span>{' '}
        <span style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', fontSize: 11.5 }}>
          {typeof v === 'object' ? JSON.stringify(v) : String(v)}
        </span>
      </span>
    ));
  } catch {
    return <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{raw}</span>;
  }
}

function relTime(dateStr) {
  const d = Date.now() - new Date(typeof dateStr === 'string' && !dateStr.includes('T') ? dateStr.replace(' ', 'T') + 'Z' : dateStr).getTime();
  const m = Math.floor(d / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return new Date(typeof dateStr === 'string' && !dateStr.includes('T') ? dateStr.replace(' ', 'T') + 'Z' : dateStr).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' });
}

export default function AdminActivityLog() {
  const toast = useAdminToast();
  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const res = await getActivityLog({ page, limit: 30 });
      setRows(res.data.logs || []);
      setPagination(res.data.pagination);
    } catch {
      toast('Failed to load activity log', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(1); }, [load]);

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontFamily: 'var(--font-head)', fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Activity Log</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
          Read-only audit trail of all admin actions · {pagination.total} entries
        </p>
      </div>

      <div className="admin-table-wrap">
        {loading ? (
          <div className="admin-loading">
            <span className="a-spinner" style={{ color: 'var(--accent)' }} /> Loading…
          </div>
        ) : rows.length === 0 ? (
          <div className="admin-empty">
            <div className="admin-empty-icon">📋</div>
            No activity recorded yet
          </div>
        ) : (
          <div>
            {rows.map(row => (
              <div className="log-item" key={row.id}>
                <div
                  className="log-dot"
                  style={{ background: ACTION_COLORS[row.action] || 'var(--accent)' }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="log-action" style={{ color: ACTION_COLORS[row.action] || 'var(--accent)' }}>
                    {row.action}
                  </div>
                  <div className="log-details">{parseDetails(row.details)}</div>
                  <div className="log-time">
                    {row.admin} · {relTime(row.created_at)} · {new Date(row.created_at.replace(' ', 'T') + 'Z').toLocaleString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && pagination.pages > 1 && (
          <div className="admin-pagination">
            <span>Page {pagination.page} of {pagination.pages}</span>
            <button className="admin-pag-btn" disabled={pagination.page <= 1} onClick={() => load(pagination.page - 1)}>‹</button>
            <button className="admin-pag-btn" disabled={pagination.page >= pagination.pages} onClick={() => load(pagination.page + 1)}>›</button>
          </div>
        )}
      </div>
    </div>
  );
}
