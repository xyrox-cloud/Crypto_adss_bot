import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getLeaderboard } from '../api/api';
import { useUser } from '../context/UserContext';
import LoadingSpinner from '../components/LoadingSpinner';

const Leaderboard = () => {
  const navigate = useNavigate();
  const { user } = useUser();
  const [time, setTime] = useState('all_time');
  const [loading, setLoading] = useState(true);
  const [leaders, setLeaders] = useState([]);

  useEffect(() => {
    fetchLeaderboard();
  }, [time]);

  const fetchLeaderboard = async () => {
    setLoading(true);
    try {
      const res = await getLeaderboard({ time });
      setLeaders(res.data.leaderboard || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container" style={{ padding: '20px', paddingBottom: '80px' }}>
      <button onClick={() => navigate('/menu')} style={{ background: 'none', border: 'none', color: 'var(--link)', marginBottom: '20px', fontSize: '16px' }}>← Back</button>
      
      <h2 style={{ marginBottom: '15px', color: 'var(--gold)', textAlign: 'center' }}>Top Earners 🏆</h2>
      
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <button 
          className={time === 'today' ? 'btn-primary' : 'btn-secondary'} 
          onClick={() => setTime('today')}
          style={{ flex: 1, padding: '10px' }}
        >Today</button>
        <button 
          className={time === 'all_time' ? 'btn-primary' : 'btn-secondary'} 
          onClick={() => setTime('all_time')}
          style={{ flex: 1, padding: '10px' }}
        >All Time</button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '40px' }}><LoadingSpinner /></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {leaders.map((l, idx) => {
            const isMe = user?.id === l.id;
            return (
              <div 
                key={l.id} 
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  padding: '12px', 
                  background: isMe ? 'rgba(201, 160, 85, 0.2)' : 'var(--secondary-bg)', 
                  borderRadius: '8px',
                  border: isMe ? '1px solid var(--gold)' : '1px solid transparent'
                }}
              >
                <div style={{ width: '30px', fontWeight: 'bold', color: idx < 3 ? 'var(--gold)' : 'var(--text-dim)' }}>#{idx + 1}</div>
                <div style={{ flex: 1, fontWeight: isMe ? 'bold' : 'normal' }}>
                  {l.first_name || l.username || 'Anonymous'} {isMe && '(You)'}
                </div>
                <div style={{ color: 'var(--accent)' }}>{l.score} ads</div>
              </div>
            );
          })}
          {leaders.length === 0 && <div style={{ textAlign: 'center', color: 'var(--text-dim)', marginTop: '20px' }}>No data yet</div>}
        </div>
      )}
    </div>
  );
};

export default Leaderboard;
