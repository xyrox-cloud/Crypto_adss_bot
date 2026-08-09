import React, { useState } from 'react';
import { useUser } from '../context/UserContext';
import { useToast } from '../context/ToastContext';
import { requestWithdrawal } from '../api/api';
import LoadingSpinner from '../components/LoadingSpinner';

const MIN_WITHDRAWAL = parseFloat(import.meta.env.VITE_MIN_WITHDRAWAL || '2.00');

const Withdraw = () => {
  const { user, refreshUser } = useUser();
  const { showToast } = useToast();

  const [amount, setAmount]   = useState('');
  const [wallet, setWallet]   = useState('');
  const [loading, setLoading] = useState(false);

  const balance = Number(user?.balance || 0);
  const canWithdraw = balance >= MIN_WITHDRAWAL;
  const progress = Math.min(100, (balance / MIN_WITHDRAWAL) * 100);

  const handleWithdraw = async (e) => {
    e.preventDefault();
    const wAmount = parseFloat(amount);

    if (isNaN(wAmount) || wAmount < MIN_WITHDRAWAL) {
      showToast(`Minimum withdrawal is $${MIN_WITHDRAWAL.toFixed(2)} USDT`, 'error');
      return;
    }
    if (wAmount > balance) {
      showToast('Insufficient balance', 'error');
      return;
    }
    if (!wallet || wallet.length < 20) {
      showToast('Invalid wallet address', 'error');
      return;
    }

    setLoading(true);
    try {
      await requestWithdrawal({ amount: wAmount, wallet_address: wallet });
      showToast('Withdrawal requested successfully!', 'success');
      setAmount('');
      setWallet('');
      await refreshUser();
    } catch (err) {
      console.error(err);
      showToast(err.response?.data?.error || err.response?.data?.message || 'Withdrawal failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="withdraw-page">
      <h2 className="section-title">Withdraw</h2>

      {/* ── Balance display card ──────────── */}
      <div className="balance-card" style={{ marginBottom: 20, padding: '22px 20px' }}>
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
            <div style={{ height: 5, borderRadius: 99, background: 'var(--border)', overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                width: `${progress}%`,
                borderRadius: 99,
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

      {/* ── Form card ──────────────────────── */}
      <div className="card" style={{ marginBottom: 14 }}>
        <form onSubmit={handleWithdraw}>
          <div className="input-group">
            <label className="input-label" htmlFor="withdraw-amount">Amount (USDT)</label>
            <input
              id="withdraw-amount"
              type="number"
              className="input-field mono"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder={`Min $${MIN_WITHDRAWAL.toFixed(2)}`}
              step="0.0001"
              min={MIN_WITHDRAWAL}
              max={balance}
              required
              disabled={!canWithdraw || loading}
            />
          </div>

          <div className="input-group">
            <label className="input-label" htmlFor="withdraw-wallet">USDT BEP20 Wallet Address</label>
            <input
              id="withdraw-wallet"
              type="text"
              className="input-field mono"
              value={wallet}
              onChange={(e) => setWallet(e.target.value)}
              placeholder="0x…"
              required
              disabled={!canWithdraw || loading}
            />
          </div>

          <button
            type="submit"
            className="btn-primary"
            disabled={loading || !canWithdraw}
            style={{ width: '100%', padding: '15px', fontSize: 15 }}
            id="submit-withdraw-btn"
          >
            {loading
              ? <><LoadingSpinner size={18} /> Processing…</>
              : canWithdraw
                ? 'Request Withdrawal'
                : `Minimum $${MIN_WITHDRAWAL.toFixed(2)} Required`}
          </button>
        </form>
      </div>

      {/* ── Info notice ────────────────────── */}
      <div className="info-box">
        <strong>ℹ️ Important</strong><br />
        <ul style={{ paddingLeft: 16, marginTop: 8, lineHeight: '1.7' }}>
          <li>Withdrawals are processed manually within <strong>1–3 business days</strong></li>
          <li>Use a valid <strong>USDT BEP20 (BNB Smart Chain)</strong> address</li>
          <li>Funds sent to wrong network or address <strong>cannot be recovered</strong></li>
        </ul>
      </div>
    </div>
  );
};

export default Withdraw;
