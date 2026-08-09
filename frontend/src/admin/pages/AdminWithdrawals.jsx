import React, { useEffect, useState, useCallback } from 'react';
import { getAdminWithdrawals, updateWithdrawal } from '../../api/adminApi';
import { useAdminToast } from '../AdminToast';
import ConfirmModal from '../ConfirmModal';

const STATUS_COLORS = { pending: 'a-badge-pending', paid: 'a-badge-paid', rejected: 'a-badge-rejected' };

const truncAddr = a => a ? `${a.slice(0, 8)}…${a.slice(-6)}` : '—';

export default function AdminWithdrawals() {
  const toast = useAdminToast();
  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0, limit: 20 });
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [modal, setModal] = useState(null); // { action: 'approve'|'reject', row }

  const load = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const res = await getAdminWithdrawals({ status: status || undefined, search: search || undefined, page, limit: 20 });
      setRows(res.data.withdrawals || []);
      setPagination(res.data.pagination);
    } catch (e) {
      toast('Failed to load withdrawals', 'error');
    } finally {
      setLoading(false);
    }
  }, [status, search]);

  useEffect(() => { load(1); }, [load]);

  const handleAction = async (vals) => {
    const { action, row } = modal;
    await updateWithdrawal(row.id, { action, admin_note: vals.admin_note || undefined });
    toast(action === 'approve' ? `✅ Withdrawal #${row.id} marked as paid` : `❌ Withdrawal #${row.id} rejected & refunded`, action === 'approve' ? 'success' : 'info');
    setModal(null);
    load(pagination.page);
  };

  const applySearch = () => setSearch(searchInput);

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontFamily: 'var(--font-head)', fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Withdrawals</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>Manage and process user withdrawal requests</p>
      </div>

      {/* Filters */}
      <div className="filter-bar">
        <input
          className="a-input"
          placeholder="Search username, wallet…"
          value={searchInput}
          onChange={e => setSearchInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && applySearch()}
          style={{ width: 220 }}
          id="wd-search"
        />
        <button className="a-btn a-btn-ghost" onClick={applySearch}>Search</button>
        <select
          className="a-select"
          value={status}
          onChange={e => setStatus(e.target.value)}
          id="wd-status-filter"
        >
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="paid">Paid</option>
          <option value="rejected">Rejected</option>
        </select>
        <span style={{ color: 'var(--text-dim)', fontSize: 12, marginLeft: 'auto' }}>
          {pagination.total} total
        </span>
      </div>

      {/* Table */}
      <div className="admin-table-wrap">
        {loading ? (
          <div className="admin-loading"><span className="a-spinner" style={{ color: 'var(--accent)' }} /> Loading…</div>
        ) : rows.length === 0 ? (
          <div className="admin-empty">
            <div className="admin-empty-icon">💸</div>
            No withdrawals found
          </div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>#</th>
                <th>User</th>
                <th>Amount</th>
                <th>Wallet</th>
                <th>Status</th>
                <th>Requested</th>
                <th>Paid At</th>
                <th>Note</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(row => (
                <tr key={row.id}>
                  <td className="td-mono td-dim">{row.id}</td>
                  <td>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>
                      {row.username ? `@${row.username}` : row.first_name || '—'}
                    </div>
                    <div className="td-mono td-dim" style={{ fontSize: 11 }}>{row.telegram_id}</div>
                  </td>
                  <td className="td-gold">${Number(row.amount || 0).toFixed(4)}</td>
                  <td>
                    <span
                      className="td-mono td-dim"
                      title={row.wallet_address}
                      style={{ cursor: 'help' }}
                    >
                      {truncAddr(row.wallet_address)}
                    </span>
                  </td>
                  <td>
                    <span className={`a-badge ${STATUS_COLORS[row.status] || ''}`}>
                      {row.status}
                    </span>
                  </td>
                  <td className="td-dim" style={{ fontSize: 12, whiteSpace: 'nowrap' }}>
                    {new Date(row.requested_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                  </td>
                  <td className="td-dim" style={{ fontSize: 12 }}>
                    {row.paid_at ? new Date(row.paid_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : '—'}
                  </td>
                  <td style={{ fontSize: 12, color: 'var(--text-secondary)', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {row.admin_note || '—'}
                  </td>
                  <td>
                    {row.status === 'pending' && (
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          className="a-btn a-btn-success a-btn-sm"
                          onClick={() => setModal({ action: 'approve', row })}
                          id={`approve-${row.id}`}
                        >
                          ✓ Approve
                        </button>
                        <button
                          className="a-btn a-btn-danger a-btn-sm"
                          onClick={() => setModal({ action: 'reject', row })}
                          id={`reject-${row.id}`}
                        >
                          ✕ Reject
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Pagination */}
        {!loading && pagination.pages > 1 && (
          <div className="admin-pagination">
            <span>Page {pagination.page} of {pagination.pages}</span>
            <button
              className="admin-pag-btn"
              disabled={pagination.page <= 1}
              onClick={() => load(pagination.page - 1)}
            >‹</button>
            <button
              className="admin-pag-btn"
              disabled={pagination.page >= pagination.pages}
              onClick={() => load(pagination.page + 1)}
            >›</button>
          </div>
        )}
      </div>

      {/* Confirm modal */}
      {modal && (
        <ConfirmModal
          title={modal.action === 'approve' ? 'Approve Withdrawal' : 'Reject Withdrawal'}
          description={
            modal.action === 'approve'
              ? <>
                  Confirm that you have <strong>manually sent ${Number(modal.row.amount).toFixed(4)} USDT</strong> to wallet <code style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--accent)', wordBreak: 'break-all' }}>{modal.row.wallet_address}</code>.<br /><br />
                  This will mark the withdrawal as <strong>Paid</strong> and record the timestamp.
                </>
              : <>
                  This will <strong>reject</strong> withdrawal #{modal.row.id} and <strong>refund ${Number(modal.row.amount).toFixed(4)} USDT</strong> back to the user's balance.
                </>
          }
          confirmLabel={modal.action === 'approve' ? '✓ Confirm Paid' : '✕ Reject & Refund'}
          danger={modal.action === 'reject'}
          onConfirm={handleAction}
          onCancel={() => setModal(null)}
          extraFields={[{
            key: 'admin_note',
            label: 'Admin Note (optional)',
            placeholder: modal.action === 'reject' ? 'Reason for rejection…' : 'Transaction hash or note…',
            type: 'textarea',
          }]}
        />
      )}
    </div>
  );
}
