import React from 'react';
import { useNavigate } from 'react-router-dom';

const AdPolicy = () => {
  const navigate = useNavigate();
  return (
    <div className="page-container" style={{ padding: '20px' }}>
      <button onClick={() => navigate('/menu')} style={{ background: 'none', border: 'none', color: 'var(--link)', marginBottom: '20px', fontSize: '16px' }}>← Back</button>
      <h2 style={{ marginBottom: '20px', color: 'var(--accent)' }}>Ad Policy</h2>
      <div style={{ lineHeight: '1.6', color: 'var(--text-main)' }}>
        <p><strong>1. Optional Ads:</strong> Ads on Blitz Game Zone are completely optional. They will only start when you explicitly tap a clearly labeled button.</p>
        <p><strong>2. Server Validated:</strong> Rewards are server-confirmed via webhook after the ad finishes. If the ad network determines the view was invalid, no reward is credited.</p>
        <p><strong>3. AdsGram Provider:</strong> Ads are supplied by AdsGram. We only share your numeric Telegram ID with AdsGram strictly for reward confirmation purposes. No other personal data is shared.</p>
      </div>
    </div>
  );
};

export default AdPolicy;
