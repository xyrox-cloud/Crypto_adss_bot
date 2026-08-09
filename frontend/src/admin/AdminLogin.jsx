import React, { useState } from 'react';
import { adminLogin, setAdminSession, getAdminToken } from '../api/adminApi';

export default function AdminLogin({ onLogin }) {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!password) return;
    setLoading(true);
    try {
      const res = await adminLogin(password);
      setAdminSession(res.data.token);
      onLogin();
    } catch (err) {
      setError(err?.response?.data?.error || 'Invalid password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-login-page">
      <div className="admin-login-card">
        <div className="admin-login-logo">
          <span className="admin-login-wordmark">NovaGrid</span>
          <span className="admin-login-sub">Admin Panel</span>
        </div>

        <form className="admin-login-form" onSubmit={handleSubmit}>
          <div className="admin-input-group">
            <label className="admin-input-label">Admin Password</label>
            <input
              type="password"
              className="admin-password-input"
              placeholder="••••••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoFocus
              autoComplete="current-password"
              id="admin-password"
            />
          </div>

          {error && <div className="admin-login-error">{error}</div>}

          <button
            type="submit"
            className="admin-login-btn"
            disabled={loading || !password}
            id="admin-login-btn"
          >
            {loading ? <><span className="a-spinner" /> Authenticating…</> : 'Sign In →'}
          </button>
        </form>

        <p style={{ textAlign: 'center', fontSize: 11.5, color: 'var(--text-dim)', marginTop: 20 }}>
          Sessions expire after 30 minutes of inactivity
        </p>
      </div>
    </div>
  );
}
