import React from 'react';
import { useNavigate } from 'react-router-dom';

const About = () => {
  const navigate = useNavigate();
  return (
    <div className="page-container" style={{ padding: '20px' }}>
      <button onClick={() => navigate('/menu')} style={{ background: 'none', border: 'none', color: 'var(--link)', marginBottom: '20px', fontSize: '16px' }}>← Back</button>
      
      <div style={{ textAlign: 'center', marginBottom: '30px' }}>
        <h1 style={{ color: 'var(--gold)', fontSize: '32px', marginBottom: '5px' }}>AdShare</h1>
        <p style={{ color: 'var(--text-dim)', fontSize: '14px' }}>Version 1.0.0</p>
        <p style={{ marginTop: '10px', fontSize: '16px' }}>"Watch ads, earn real USDT on Telegram"</p>
      </div>

      <h3 style={{ color: 'var(--accent)', marginBottom: '10px' }}>How it stays free</h3>
      <div className="card" style={{ background: 'var(--secondary-bg)', padding: '15px', borderRadius: '10px', marginBottom: '20px' }}>
        <p style={{ lineHeight: '1.5' }}>
          AdShare uses a fair <strong>60/40 revenue split model</strong>. When you watch an ad, the advertiser pays us. We give 60% of that revenue directly back to you in USDT, and we keep 40% to maintain servers, pay transaction fees, and keep the app running smoothly without any hidden costs.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <button className="btn-secondary" onClick={() => navigate('/ad-policy')} style={{ padding: '12px', textAlign: 'center' }}>Ad Policy</button>
        <button className="btn-secondary" onClick={() => navigate('/terms')} style={{ padding: '12px', textAlign: 'center' }}>Terms of Service</button>
        <button className="btn-secondary" onClick={() => navigate('/privacy')} style={{ padding: '12px', textAlign: 'center' }}>Privacy Policy</button>
        <button className="btn-primary" onClick={() => navigate('/support')} style={{ padding: '12px', textAlign: 'center' }}>Support</button>
      </div>
    </div>
  );
};

export default About;
