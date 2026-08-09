import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import { User, Wallet, History, Users, Shield, FileText, Info, HelpCircle, ChevronRight, Settings } from 'lucide-react';

const Menu = () => {
  const navigate = useNavigate();
  const { user } = useUser();
  const tgUser = window.Telegram?.WebApp?.initDataUnsafe?.user;
  const isSuperAdmin = 
    String(tgUser?.id) === import.meta.env.VITE_SUPER_ADMIN_ID || 
    String(user?.telegram_id) === import.meta.env.VITE_SUPER_ADMIN_ID;

  return (
    <div className="pb-24">
      {/* HEADER / BANNER */}
      <div className="bg-secondary p-6 rounded-b-[40px] text-black relative">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center font-bold text-2xl uppercase border-2 border-white/40">
            {user?.first_name?.charAt(0) || <User size={32} />}
          </div>
          <div>
            <h1 className="text-2xl font-bold uppercase">{user?.first_name || 'Player'}</h1>
            <p className="text-black/70 font-mono">@{user?.username || tgUser?.username || 'user'}</p>
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          <div className="bg-black/10 px-3 py-1 rounded-full text-sm font-bold">
            PTS: {user?.balance || 0}
          </div>
          <div className="bg-black/10 px-3 py-1 rounded-full text-sm font-bold">
            🔥 STREAK: 1
          </div>
        </div>
      </div>

      {/* STATS BOXES */}
      <div className="px-4 -mt-6">
        <div className="bg-cardbg border border-cardborder rounded-3xl p-4 grid grid-cols-3 gap-2 text-center divide-x divide-cardborder">
          <div>
            <div className="text-xl font-bold text-white">${user?.balance || '0.00'}</div>
            <div className="text-[10px] text-textmuted mt-1">BALANCE</div>
          </div>
          <div>
            <div className="text-xl font-bold text-white">${user?.total_earned || '0.00'}</div>
            <div className="text-[10px] text-textmuted mt-1">EARNED</div>
          </div>
          <div>
            <div className="text-xl font-bold text-white">0</div>
            <div className="text-[10px] text-textmuted mt-1">REFS</div>
          </div>
        </div>
      </div>

      <div className="px-4 mt-6 space-y-6">
        {/* ACCOUNT SECTION */}
        <div>
          <h2 className="text-textmuted text-xs font-bold mb-3 pl-2">ACCOUNT</h2>
          <div className="bg-cardbg border border-cardborder rounded-3xl overflow-hidden flex flex-col">
            <button onClick={() => navigate('/withdraw')} className="flex items-center p-4 hover:bg-white/5 transition-colors border-b border-cardborder text-left">
              <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center mr-4"><Wallet size={20} className="text-primary" /></div>
              <div className="flex-1">
                <div className="font-bold text-white">Withdraw</div>
                <div className="text-xs text-textmuted">Cash out your earnings</div>
              </div>
              <ChevronRight size={20} className="text-textmuted" />
            </button>
            <button onClick={() => navigate('/history')} className="flex items-center p-4 hover:bg-white/5 transition-colors border-b border-cardborder text-left">
              <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center mr-4"><History size={20} className="text-primary" /></div>
              <div className="flex-1">
                <div className="font-bold text-white">History</div>
                <div className="text-xs text-textmuted">View past transactions</div>
              </div>
              <ChevronRight size={20} className="text-textmuted" />
            </button>
            <button onClick={() => navigate('/referrals')} className="flex items-center p-4 hover:bg-white/5 transition-colors text-left">
              <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center mr-4"><Users size={20} className="text-primary" /></div>
              <div className="flex-1">
                <div className="font-bold text-white">Referrals</div>
                <div className="text-xs text-textmuted">Invite friends, earn more</div>
              </div>
              <ChevronRight size={20} className="text-textmuted" />
            </button>
          </div>
        </div>

        {/* HELP SECTION */}
        <div>
          <h2 className="text-textmuted text-xs font-bold mb-3 pl-2">HELP & SUPPORT</h2>
          <div className="bg-cardbg border border-cardborder rounded-3xl overflow-hidden flex flex-col">
            <button onClick={() => navigate('/support')} className="flex items-center p-4 hover:bg-white/5 transition-colors border-b border-cardborder text-left">
              <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center mr-4"><HelpCircle size={20} className="text-white" /></div>
              <div className="flex-1">
                <div className="font-bold text-white">Support & FAQ</div>
                <div className="text-xs text-textmuted">Get help with the app</div>
              </div>
              <ChevronRight size={20} className="text-textmuted" />
            </button>
            <button onClick={() => navigate('/about')} className="flex items-center p-4 hover:bg-white/5 transition-colors border-b border-cardborder text-left">
              <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center mr-4"><Info size={20} className="text-white" /></div>
              <div className="flex-1">
                <div className="font-bold text-white">About AdShare</div>
                <div className="text-xs text-textmuted">Learn about us</div>
              </div>
              <ChevronRight size={20} className="text-textmuted" />
            </button>
            <button onClick={() => navigate('/ad-policy')} className="flex items-center p-4 hover:bg-white/5 transition-colors border-b border-cardborder text-left">
              <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center mr-4"><Shield size={20} className="text-white" /></div>
              <div className="flex-1">
                <div className="font-bold text-white">Ad Policy</div>
                <div className="text-xs text-textmuted">Rules for watching ads</div>
              </div>
              <ChevronRight size={20} className="text-textmuted" />
            </button>
            <button onClick={() => navigate('/terms')} className="flex items-center p-4 hover:bg-white/5 transition-colors border-b border-cardborder text-left">
              <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center mr-4"><FileText size={20} className="text-white" /></div>
              <div className="flex-1">
                <div className="font-bold text-white">Terms & Privacy</div>
                <div className="text-xs text-textmuted">Legal information</div>
              </div>
              <ChevronRight size={20} className="text-textmuted" />
            </button>
          </div>
        </div>

        {isSuperAdmin && (
          <div>
            <div className="bg-cardbg border border-secondary rounded-3xl overflow-hidden flex flex-col mt-2">
              <button onClick={() => navigate('/admin')} className="flex items-center p-4 hover:bg-white/5 transition-colors text-left text-secondary">
                <div className="w-10 h-10 rounded-xl bg-secondary/10 flex items-center justify-center mr-4"><Settings size={20} /></div>
                <div className="flex-1 font-bold">Admin Panel</div>
                <ChevronRight size={20} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Menu;
