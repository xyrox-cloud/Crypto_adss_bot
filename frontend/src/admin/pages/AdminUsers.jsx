import React, { useEffect, useState, useCallback } from 'react';
import { getAdminUsers, adjustBalance, setBanStatus } from '../../api/adminApi';
import { useAdminToast } from '../AdminToast';
import ConfirmModal from '../ConfirmModal';

const fmtDate = d => d ? new Date(d.replace(' ', 'T') + 'Z').toLocaleDateString([], { dateStyle: 'medium' }) : '—';
const fmtMoney = n => `$${Number(n || 0).toFixed(4)}`;

export default function AdminUsers() {
  const toast = useAdminToast();
  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('created_at');
  const [order, setOrder] = useState('desc');
  const [modal, setModal] = useState(null); // { type: 'balance'|'ban'|'unban', user }

  const load = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const res = await getAdminUsers({ search: search || undefined, page, limit: 25, sort, order });
      setRows(res.data.users || []);
      setPagination(res.data.pagination);
    } catch {
      toast('Failed to load users', 'error');
    } finally {
      setLoading(false);
    }
  }, [search, sort, order]);

  useEffect(() => { load(1); }, [load]);

  const toggleSort = (col) => {
    if (sort === col) setOrder(o => o === 'desc' ? 'asc' : 'desc');
    else { setSort(col); setOrder('desc'); }
  };

  const SortTh = ({ col, label }) => (
    <th className={sort === col ? 'sorted' : ''} onClick={() => toggleSort(col)}>
      {label} {sort === col ? (order === 'desc' ? '↓' : '↑') : ''}
    </th>
  );

  const handleBalanceAdjust = async (vals) => {
    const delta = parseFloat(vals.delta);
    if (isNaN(delta)) throw new Error('Enter a valid number');
    await adjustBalance(modal.user.id, { delta, reason: vals.reason });
    toast(`Balance adjusted by ${delta >= 0 ? '+' : ''}${delta.toFixed(4)} TON`, 'success');
    setModal(null);
    load(pagination.page);
  };

  const handleBan = async () => {
    const newBanned = modal.type === 'ban' ? 1 : 0;
    await setBanStatus(modal.user.id, newBanned);
    toast(`User ${newBanned ? 'banned' : 'unbanned'} successfully`, newBanned ? 'error' : 'success');
    setModal(null);
    load(pagination.page);
  };

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontFamily: 'var(--font-head)', fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Users</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
          {pagination.total} registered users · search, sort, adjust balances, and manage bans
        </p>
      </div>

      {/* Search bar */}
      <div className="filter-bar">
        <input
          className="a-input"
          placeholder="Search username, name, or Telegram ID…"
          value={searchInput}
          onChange={e => setSearchInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && setSearch(searchInput)}
          style={{ width: 280 }}
          id="users-search"
        />
        <button className="a-btn a-btn-ghost" onClick={() => setSearch(searchInput)}>Search</button>
        {search && (
          <button className="a-btn a-btn-ghost" onClick={() => { setSearch(''); setSearchInput(''); }}>
            ✕ Clear
          </button>
        )}
        <span style={{ color: 'var(--text-dim)', fontSize: 12, marginLeft: 'auto' }}>
          {pagination.total} users
        </span>
      </div>

      <div className="admin-table-wrap">
        {loading ? (
          <div className="admin-loading"><span className="a-spinner" style={{ color: 'var(--accent)' }} /></div>
        ) : rows.length === 0 ? (
          <div className="admin-empty"><div className="admin-empty-icon">👤</div>No users found</div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Telegram ID</th>
                <th>Username</th>
                <SortTh col="balance"            label="Balance" />
                <SortTh col="total_earned"       label="Total Earned" />
                <SortTh col="total_ads_watched"  label="Ads" />
                <th>Referrals</th>
                <th>Status</th>
                <SortTh col="created_at" label="Joined" />
                <SortTh col="last_seen"  label="Last Seen" />
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(u => (
                <tr key={u.id}>
                  <td className="td-mono td-dim" style={{ fontSize: 12 }}>{u.telegram_id}</td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{u.username ? `@${u.username}` : u.first_name || '—'}</div>
                    {u.first_name && u.username && <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>{u.first_name}</div>}
                  </td>
                  <td className="td-gold">{fmtMoney(u.balance)}</td>
                  <td className="td-mono" style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{fmtMoney(u.total_earned)}</td>
                  <td className="td-mono" style={{ textAlign: 'center' }}>{u.total_ads_watched ?? 0}</td>
                  <td className="td-mono" style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>{u.referral_count ?? 0}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <label className="toggle-switch" title={u.banned ? 'Click to unban user' : 'Click to ban user'}>
                        <input
                          type="checkbox"
                          checked={Boolean(u.banned)}
                          onChange={() => setModal({ type: u.banned ? 'unban' : 'ban', user: u })}
                        />
                        <span className="toggle-slider"></span>
                      </label>
                      <span className={`a-badge ${u.banned ? 'a-badge-banned' : 'a-badge-active'}`}>
                        {u.banned ? 'Banned' : 'Active'}
                      </span>
                    </div>
                  </td>
                  <td style={{ fontSize: 12, color: 'var(--text-dim)', whiteSpace: 'nowrap' }}>{fmtDate(u.created_at)}</td>
                  <td style={{ fontSize: 12, color: 'var(--text-dim)', whiteSpace: 'nowrap' }}>{fmtDate(u.last_seen)}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <button
                        className="a-btn a-btn-ghost a-btn-sm"
                        onClick={() => setModal({ type: 'balance', user: u })}
                        id={`adj-${u.id}`}
                        title="Adjust balance"
                      >
                        ± Bal
                      </button>
                      <button
                        className={`a-btn a-btn-sm ${u.banned ? 'a-btn-success' : 'a-btn-danger'}`}
                        onClick={() => setModal({ type: u.banned ? 'unban' : 'ban', user: u })}
                        id={`ban-${u.id}`}
                      >
                        {u.banned ? '↑ Unban' : '⊘ Ban'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {!loading && pagination.pages > 1 && (
          <div className="admin-pagination">
            <span>Page {pagination.page} of {pagination.pages} ({pagination.total} total)</span>
            <button className="admin-pag-btn" disabled={pagination.page <= 1} onClick={() => load(pagination.page - 1)}>‹</button>
            <button className="admin-pag-btn" disabled={pagination.page >= pagination.pages} onClick={() => load(pagination.page + 1)}>›</button>
          </div>
        )}
      </div>

      {/* Balance Adjust Modal */}
      {modal?.type === 'balance' && (
        <ConfirmModal
          title={`Adjust Balance — ${modal.user.username ? '@' + modal.user.username : modal.user.first_name}`}
          description={
            <>
              Current balance: <strong style={{ color: 'var(--gold)', fontFamily: 'var(--font-mono)' }}>{fmtMoney(modal.user.balance)} TON</strong>
              <br />Enter a positive number to add, negative to deduct. A mandatory reason will be logged.
            </>
          }
          confirmLabel="Apply Adjustment"
          onConfirm={handleBalanceAdjust}
          onCancel={() => setModal(null)}
          extraFields={[
            { key: 'delta', label: 'Delta (TON)', placeholder: 'e.g. 0.50 or -0.25', type: 'number', step: '0.0001', required: true },
            { key: 'reason', label: 'Reason', placeholder: 'Support case #, dispute details…', type: 'textarea', required: true },
          ]}
        />
      )}

      {/* Ban/Unban Modal */}
      {(modal?.type === 'ban' || modal?.type === 'unban') && (
        <ConfirmModal
          title={modal.type === 'ban' ? 'Ban User' : 'Unban User'}
          description={
            modal.type === 'ban'
              ? <>This will <strong>ban</strong> user {modal.user.username ? `@${modal.user.username}` : modal.user.first_name}. They will be unable to watch ads or withdraw funds.</>
              : <>This will <strong>unban</strong> user {modal.user.username ? `@${modal.user.username}` : modal.user.first_name} and restore their access.</>
          }
          confirmLabel={modal.type === 'ban' ? '⊘ Confirm Ban' : '↑ Confirm Unban'}
          danger={modal.type === 'ban'}
          onConfirm={handleBan}
          onCancel={() => setModal(null)}
        />
      )}
    </div>
  );
}
