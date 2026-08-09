import React from 'react';
import { useNavigate } from 'react-router-dom';

const Privacy = () => {
  const navigate = useNavigate();
  return (
    <div className="page-container" style={{ padding: '20px', paddingBottom: '50px' }}>
      <button onClick={() => navigate('/menu')} style={{ background: 'none', border: 'none', color: 'var(--link)', marginBottom: '20px', fontSize: '16px' }}>← Back</button>
      <h2 style={{ marginBottom: '20px', color: 'var(--accent)' }}>Privacy Policy</h2>
      <div style={{ lineHeight: '1.6', color: 'var(--text-main)', display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <div><strong>Collected from Telegram:</strong> We securely collect your numeric Telegram ID, name, username, avatar, and language preference from Telegram initData.</div>
        <div><strong>App Usage Data:</strong> We store your ad-watch history, withdrawal requests, support tickets, and current balance in our database.</div>
        <div><strong>NEVER Collected:</strong> We do NOT have access to, and never collect: your phone number, contacts, messages, or precise location.</div>
        <div><strong>Third-Party Sharing:</strong> We only share your numeric Telegram ID with AdsGram (our ad provider) for the sole purpose of validating rewards.</div>
        <div><strong>Data Deletion:</strong> You can request data deletion by opening an account request ticket in the Support section.</div>
      </div>
    </div>
  );
};

export default Privacy;
