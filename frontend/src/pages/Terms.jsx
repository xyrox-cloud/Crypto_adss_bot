import React from 'react';
import { useNavigate } from 'react-router-dom';

const Terms = () => {
  const navigate = useNavigate();
  return (
    <div className="page-container" style={{ padding: '20px', paddingBottom: '50px' }}>
      <button onClick={() => navigate('/menu')} style={{ background: 'none', border: 'none', color: 'var(--link)', marginBottom: '20px', fontSize: '16px' }}>← Back</button>
      <h2 style={{ marginBottom: '20px', color: 'var(--accent)' }}>Terms of Service</h2>
      <div style={{ lineHeight: '1.6', color: 'var(--text-main)', display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <div><strong>1. App Usage:</strong> Blitz Game Zone is a Telegram Mini App. Your account is tied to your Telegram ID. No password is required.</div>
        <div><strong>2. Real Currency:</strong> The TON balance you see is real currency (not points), withdrawable on the TON network once you reach the minimum withdrawal threshold.</div>
        <div><strong>3. Fair Play Rules:</strong> The use of bots, scripts, autoclickers, or multi-accounting is strictly prohibited. Violators will be banned and forfeit all earnings.</div>
        <div><strong>4. Availability:</strong> Blitz Game Zone makes no guarantees about the constant availability of ads, which depend on third-party networks.</div>
        <div><strong>5. Limitation of Liability:</strong> We are not liable for lost funds due to incorrect withdrawal addresses or account bans for TOS violations.</div>
        <div><strong>Contact:</strong> For inquiries, open a support ticket in the app.</div>
      </div>
    </div>
  );
};

export default Terms;
