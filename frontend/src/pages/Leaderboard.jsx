import React, { useState, useEffect } from 'react';
import { getLeaderboard } from '../api/api';
import { useUser } from '../context/UserContext';
import LoadingSpinner from '../components/LoadingSpinner';
import { Trophy, User, Medal } from 'lucide-react';

const Leaderboard = () => {
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

  // Find my rank
  const myRankIndex = leaders.findIndex(l => l.id === user?.id);
  const myRank = myRankIndex !== -1 ? myRankIndex + 1 : '—';
  const myData = myRankIndex !== -1 ? leaders[myRankIndex] : null;

  return (
    <div className="pb-24 px-4 pt-4">
      <div className="flex items-center gap-2 mb-6">
        <Trophy className="text-primary" size={24} />
        <h1 className="text-xl font-bold uppercase tracking-wider">LEADERBOARD</h1>
      </div>

      {/* TOGGLE */}
      <div className="bg-cardbg border border-cardborder rounded-full p-1 flex mb-6">
        <button 
          className={`flex-1 py-2 rounded-full text-xs font-bold transition-colors ${time === 'today' ? 'bg-white text-black' : 'text-textmuted'}`}
          onClick={() => setTime('today')}
        >
          TODAY
        </button>
        <button 
          className={`flex-1 py-2 rounded-full text-xs font-bold transition-colors ${time === 'all_time' ? 'bg-white text-black' : 'text-textmuted'}`}
          onClick={() => setTime('all_time')}
        >
          ALL TIME
        </button>
      </div>

      {/* MY POSITION */}
      <div className="bg-secondary rounded-3xl p-4 flex items-center justify-between mb-6 shadow-[0_0_15px_rgba(255,90,31,0.2)]">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center font-bold text-lg text-white border-2 border-white/40 overflow-hidden">
            {window.Telegram?.WebApp?.initDataUnsafe?.user?.photo_url ? (
              <img src={window.Telegram.WebApp.initDataUnsafe.user.photo_url} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              user?.first_name?.charAt(0) || <User size={20} />
            )}
          </div>
          <div>
            <div className="text-[10px] font-bold text-black/60 bg-black/10 px-2 py-0.5 rounded-full inline-block mb-1">
              YOUR RANK: #{myRank}
            </div>
            <div className="font-bold text-black uppercase leading-none">{user?.first_name || 'Player'}</div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-extrabold text-black">{myData?.score || 0}</div>
          <div className="text-[10px] font-bold text-black/60">ADS</div>
        </div>
      </div>

      {/* LIST */}
      <div className="bg-cardbg border border-cardborder rounded-3xl overflow-hidden flex flex-col">
        {loading ? (
          <div className="flex justify-center py-10"><LoadingSpinner size={24} color="var(--primary)" /></div>
        ) : leaders.length === 0 ? (
          <div className="text-center py-10 text-textmuted text-sm font-bold">NO DATA YET</div>
        ) : (
          leaders.map((l, idx) => (
            <div key={l.id} className="flex items-center p-4 border-b border-cardborder last:border-b-0 hover:bg-white/5 transition-colors">
              <div className="w-8 flex-shrink-0 text-center font-bold text-textmuted mr-2">
                {idx === 0 ? <Medal size={24} className="text-[#FFD700] mx-auto" /> : 
                 idx === 1 ? <Medal size={24} className="text-[#C0C0C0] mx-auto" /> : 
                 idx === 2 ? <Medal size={24} className="text-[#CD7F32] mx-auto" /> : 
                 `#${idx + 1}`}
              </div>
              <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center font-bold text-white mr-3 flex-shrink-0 overflow-hidden">
                {l.photo_url ? (
                  <img src={l.photo_url} alt={l.first_name || l.username} className="w-full h-full object-cover" />
                ) : (
                  (l.first_name || l.username || 'A').charAt(0).toUpperCase()
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-white uppercase truncate">{l.first_name || l.username || 'Anonymous'}</div>
                {l.username && <div className="text-[10px] text-textmuted font-mono truncate">@{l.username}</div>}
              </div>
              <div className="text-right ml-2 flex-shrink-0">
                <div className="font-bold text-primary text-lg">{l.score}</div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Leaderboard;
