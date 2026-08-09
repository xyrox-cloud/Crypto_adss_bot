import React, { useState, useEffect } from 'react';
import { getAdminTickets, updateAdminTicket } from '../../api/adminApi';

const AdminSupport = () => {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [replyText, setReplyText] = useState({});

  useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const res = await getAdminTickets({ status: 'open' }); // or fetch all
      setTickets(res.data.tickets || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleReply = async (id) => {
    const text = replyText[id];
    if (!text) return;
    try {
      await updateAdminTicket(id, { status: 'closed', admin_reply: text });
      fetchTickets();
    } catch (e) {
      alert('Failed to reply');
    }
  };

  const handleClose = async (id) => {
    try {
      await updateAdminTicket(id, { status: 'closed' });
      fetchTickets();
    } catch (e) {
      alert('Failed to close');
    }
  };

  if (loading) return <div>Loading tickets...</div>;

  return (
    <div className="admin-page">
      <h2>Support Tickets</h2>
      {tickets.length === 0 ? (
        <p>No open tickets.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          {tickets.map(t => (
            <div key={t.id} style={{ background: '#111', padding: '15px', borderRadius: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                <strong>User: {t.username || t.first_name} ({t.telegram_id})</strong>
                <span style={{ color: '#ccc' }}>{t.type} | {t.status}</span>
              </div>
              <p style={{ marginBottom: '15px', background: '#222', padding: '10px', borderRadius: '5px' }}>{t.message}</p>
              
              {t.status === 'open' && (
                <div style={{ display: 'flex', gap: '10px' }}>
                  <input 
                    type="text" 
                    placeholder="Type reply..." 
                    value={replyText[t.id] || ''} 
                    onChange={e => setReplyText({...replyText, [t.id]: e.target.value})}
                    style={{ flex: 1, padding: '8px' }}
                  />
                  <button onClick={() => handleReply(t.id)} style={{ padding: '8px 15px', background: '#4CAF50', color: 'white', border: 'none', cursor: 'pointer' }}>Reply & Close</button>
                  <button onClick={() => handleClose(t.id)} style={{ padding: '8px 15px', background: '#f44336', color: 'white', border: 'none', cursor: 'pointer' }}>Close (No Reply)</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminSupport;
