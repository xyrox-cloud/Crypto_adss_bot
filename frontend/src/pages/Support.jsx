import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { submitSupportTicket, getSupportTickets } from '../api/api';
import { useToast } from '../context/ToastContext';

const FAQItem = ({ question, answer }) => {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ borderBottom: '1px solid var(--border)', padding: '12px 0' }}>
      <div 
        onClick={() => setOpen(!open)} 
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 'bold', cursor: 'pointer' }}
      >
        <span>{question}</span>
        <span>{open ? '−' : '+'}</span>
      </div>
      {open && <div style={{ marginTop: '10px', color: 'var(--text-dim)', lineHeight: '1.4' }}>{answer}</div>}
    </div>
  );
};

const Support = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [ticketType, setTicketType] = useState('bug');
  const [ticketMsg, setTicketMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [myTickets, setMyTickets] = useState([]);

  useEffect(() => {
    loadTickets();
  }, []);

  const loadTickets = async () => {
    try {
      const res = await getSupportTickets();
      setMyTickets(res.data.tickets || []);
    } catch (e) { console.error(e); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!ticketMsg.trim()) return;
    setLoading(true);
    try {
      await submitSupportTicket({ type: ticketType, message: ticketMsg });
      showToast('Ticket submitted successfully', 'success');
      setTicketMsg('');
      loadTickets();
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to submit', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container" style={{ padding: '20px', paddingBottom: '80px' }}>
      <button onClick={() => navigate('/menu')} style={{ background: 'none', border: 'none', color: 'var(--link)', marginBottom: '20px', fontSize: '16px' }}>← Back</button>
      
      <h2 style={{ marginBottom: '20px' }}>Support & FAQ</h2>

      <div className="card" style={{ background: 'var(--secondary-bg)', padding: '15px', borderRadius: '10px', marginBottom: '25px' }}>
        <h3 style={{ marginBottom: '15px', color: 'var(--gold)' }}>Contact Us</h3>
        <a 
          href="https://t.me/Crypto_adss_bot" 
          target="_blank" rel="noopener noreferrer"
          className="btn-primary" 
          style={{ display: 'block', textAlign: 'center', padding: '12px', textDecoration: 'none', marginBottom: '15px' }}
        >
          Message us on Telegram
        </a>
        
        <h4 style={{ marginBottom: '10px', marginTop: '20px' }}>Open a Ticket</h4>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <select 
            value={ticketType} 
            onChange={e => setTicketType(e.target.value)}
            style={{ padding: '10px', borderRadius: '5px', background: 'var(--bg-main)', color: '#fff', border: '1px solid var(--border)' }}
          >
            <option value="missing_reward">Missing Reward</option>
            <option value="bug">Report a Bug</option>
            <option value="account">Account Request</option>
            <option value="other">Other</option>
          </select>
          <textarea 
            placeholder="Describe your issue..." 
            value={ticketMsg}
            onChange={e => setTicketMsg(e.target.value)}
            style={{ padding: '10px', borderRadius: '5px', background: 'var(--bg-main)', color: '#fff', border: '1px solid var(--border)', minHeight: '80px' }}
          />
          <button type="submit" className="btn-secondary" disabled={loading || !ticketMsg.trim()}>
            {loading ? 'Submitting...' : 'Submit Ticket'}
          </button>
        </form>
      </div>

      {myTickets.length > 0 && (
        <div style={{ marginBottom: '25px' }}>
          <h3 style={{ marginBottom: '10px' }}>My Tickets</h3>
          {myTickets.map(t => (
            <div key={t.id} style={{ background: 'var(--secondary-bg)', padding: '12px', borderRadius: '8px', marginBottom: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                <strong style={{ textTransform: 'capitalize' }}>{t.type.replace('_', ' ')}</strong>
                <span style={{ color: t.status === 'open' ? 'var(--gold)' : 'var(--text-dim)' }}>{t.status}</span>
              </div>
              <p style={{ fontSize: '13px', marginBottom: '8px' }}>{t.message}</p>
              {t.admin_reply && (
                <div style={{ background: 'rgba(92,137,199,0.2)', padding: '8px', borderRadius: '5px', fontSize: '13px', borderLeft: '3px solid var(--accent)' }}>
                  <strong>Admin:</strong> {t.admin_reply}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <h3 style={{ marginBottom: '15px' }}>Frequently Asked Questions</h3>
      <div style={{ background: 'var(--secondary-bg)', padding: '0 15px', borderRadius: '10px' }}>
        <FAQItem 
          question="Do I have to watch ads to use the app?" 
          answer="No, watching ads is completely optional. You only watch an ad when you tap the 'Watch Ad & Earn' button." 
        />
        <FAQItem 
          question="What do I get for watching an ad?" 
          answer="You get a fixed amount of USDT added to your balance for each ad you watch (up to the daily limit). The exact amount depends on the current reward pool." 
        />
        <FAQItem 
          question="I watched an ad but didn't get my reward — what do I do?" 
          answer="Rewards are credited via a server webhook from AdsGram. It usually takes 1-5 seconds. If it still hasn't arrived, it means AdsGram did not validate the view. Please wait and try again, or submit a ticket." 
        />
        <FAQItem 
          question="How does the referral system work?" 
          answer="Share your unique referral link. When friends join and watch ads, you earn a 10% bonus based on their earnings, forever." 
        />
        <FAQItem 
          question="Is my Telegram data safe?" 
          answer="Yes. We only securely verify your Telegram ID to keep track of your balance. We do not have access to your private messages, contacts, or phone number." 
        />
        <FAQItem 
          question="How do withdrawals work?" 
          answer={`Once you reach the minimum withdrawal amount of $2.00, you can request a withdrawal to your BEP20 USDT wallet. Admins review and process payments manually.`} 
        />
      </div>
    </div>
  );
};

export default Support;
