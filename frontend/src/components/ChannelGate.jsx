import React, { useState } from 'react';
import { getChannelStatus } from '../api/api';
import LoadingSpinner from './LoadingSpinner';

function ChannelGate({ status, setChannelStatus }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleVerify = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getChannelStatus();
      if (res.data.isMember) {
        setChannelStatus(res.data);
      } else {
        setError('You have not joined all required channels yet.');
      }
    } catch (err) {
      setError('Failed to verify channel membership. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getChannelLink = (channel) => {
    // If it's a username like @channelname, return https://t.me/channelname
    // If it's a numeric ID, we can't reliably build an invite link without the bot generating one,
    // but we can assume it's a public username for now, or the user provides a link.
    // For now we'll format it assuming it's a username.
    if (channel.startsWith('@')) {
      return `https://t.me/${channel.substring(1)}`;
    }
    return `https://t.me/${channel}`; // Fallback
  };

  return (
    <div className="page-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', padding: '20px', textAlign: 'center' }}>
      <h2 style={{ marginBottom: '10px' }}>Join Required Channels</h2>
      <p style={{ marginBottom: '20px', color: 'var(--tg-hint)' }}>
        To use this app, you must be a member of our official channels.
      </p>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%', maxWidth: '300px', marginBottom: '20px' }}>
        {status.channels.map((channel, i) => {
          const joined = status.details[`channel${i + 1}`];
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '15px', backgroundColor: 'var(--tg-secondary-bg)', borderRadius: '12px' }}>
              <span style={{ fontWeight: '500' }}>{channel}</span>
              {joined ? (
                <span style={{ color: '#4caf50', fontWeight: 'bold' }}>Joined ✓</span>
              ) : (
                <a 
                  href={getChannelLink(channel)}
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="btn btn-primary"
                  style={{ padding: '8px 16px', textDecoration: 'none' }}
                >
                  Join
                </a>
              )}
            </div>
          );
        })}
      </div>

      {error && <div style={{ color: '#f44336', marginBottom: '20px', fontSize: '14px' }}>{error}</div>}

      <button 
        className="btn btn-primary" 
        onClick={handleVerify} 
        disabled={loading}
        style={{ width: '100%', maxWidth: '300px', padding: '14px', fontSize: '16px' }}
      >
        {loading ? <LoadingSpinner size={20} color="#fff" /> : "I've Joined"}
      </button>
    </div>
  );
}

export default ChannelGate;
