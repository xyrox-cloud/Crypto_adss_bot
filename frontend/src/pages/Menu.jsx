import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../context/UserContext';

const Menu = () => {
  const navigate = useNavigate();
  const { user } = useUser();
  const tgUser = window.Telegram?.WebApp?.initDataUnsafe?.user;
  const isSuperAdmin = 
    String(tgUser?.id) === import.meta.env.VITE_SUPER_ADMIN_ID || 
    String(user?.telegram_id) === import.meta.env.VITE_SUPER_ADMIN_ID;

  return (
    <div className="page-container" style={{ padding: '20px' }}>
      <h2 style={{ marginBottom: '20px', color: 'var(--text-main)' }}>Menu</h2>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <button className="btn-secondary" onClick={() => navigate('/leaderboard')} style={{ padding: '16px', textAlign: 'left', fontWeight: 'bold' }}>🏆 Leaderboard</button>
        <button className="btn-secondary" onClick={() => navigate('/about')} style={{ padding: '16px', textAlign: 'left' }}>ℹ️ About AdShare</button>
        <button className="btn-secondary" onClick={() => navigate('/support')} style={{ padding: '16px', textAlign: 'left' }}>💬 Support & FAQ</button>
        
        <div style={{ margin: '15px 0', borderBottom: '1px solid var(--border)' }} />
        
        <button className="btn-secondary" onClick={() => navigate('/ad-policy')} style={{ padding: '16px', textAlign: 'left' }}>🛡️ Ad Policy</button>
        <button className="btn-secondary" onClick={() => navigate('/terms')} style={{ padding: '16px', textAlign: 'left' }}>📄 Terms of Service</button>
        <button className="btn-secondary" onClick={() => navigate('/privacy')} style={{ padding: '16px', textAlign: 'left' }}>🔒 Privacy Policy</button>
        
        {isSuperAdmin && (
          <>
            <div style={{ margin: '15px 0', borderBottom: '1px solid var(--border)' }} />
            <button 
              className="btn-primary" 
              onClick={() => navigate('/admin')} 
              style={{ padding: '16px', textAlign: 'center', background: 'var(--gold)', color: '#000' }}
            >
              ⚙️ Admin Panel
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default Menu;
