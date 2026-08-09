import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminLogin, setAdminSession } from '../../api/adminApi';

export default function AdminLogin({ onLogin }) {
  const [password, setPassword] = useState('');
  const [totp, setTotp] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await adminLogin(password, totp);
      setAdminSession(res.data.token);
      onLogin(true);
      navigate('/admin');
    } catch (err) {
      if (err.response?.data?.error === 'TOTP required') {
        setError('2FA Code is required. Please enter it below.');
      } else {
        setError(err.response?.data?.error || 'Login failed');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#0A0A0A', color: '#EDEFF3', flexDirection: 'column' }}>
      <div style={{ background: '#141414', padding: '30px', borderRadius: '0px', border: '1px solid #242424', width: '100%', maxWidth: '350px' }}>
        <h2 style={{ textAlign: 'center', marginBottom: '20px', fontWeight: 'bold' }}>AdShare Admin</h2>
        {error && (
          <div style={{ background: 'rgba(224,82,82,0.12)', color: '#E05252', padding: '10px', fontSize: '13px', marginBottom: '15px' }}>
            {error}
          </div>
        )}
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', color: '#8892A6', marginBottom: '5px' }}>Password</label>
            <input 
              type="password" 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              required
              style={{ width: '100%', padding: '10px', background: '#0A0A0A', border: '1px solid #242424', color: '#fff', boxSizing: 'border-box' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '12px', color: '#8892A6', marginBottom: '5px' }}>2FA Code (If enabled)</label>
            <input 
              type="text" 
              value={totp} 
              onChange={e => setTotp(e.target.value)} 
              placeholder="6-digit code"
              style={{ width: '100%', padding: '10px', background: '#0A0A0A', border: '1px solid #242424', color: '#fff', boxSizing: 'border-box' }}
            />
          </div>
          <button 
            type="submit" 
            disabled={loading}
            style={{ padding: '10px', background: '#26A17B', color: '#fff', border: 'none', cursor: loading ? 'not-allowed' : 'pointer', fontWeight: 'bold', marginTop: '10px' }}
          >
            {loading ? 'Authenticating...' : 'Log In'}
          </button>
        </form>
      </div>
    </div>
  );
}
