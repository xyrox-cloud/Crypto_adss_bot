import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import { User, Wallet, History, Users, Shield, FileText, Info, HelpCircle, ChevronRight, Settings, ChevronLeft } from 'lucide-react';

const Menu = () => {
  const navigate = useNavigate();
  const { user } = useUser();
  const tgUser = window.Telegram?.WebApp?.initDataUnsafe?.user;
  const isSuperAdmin = 
    String(tgUser?.id) === import.meta.env.VITE_SUPER_ADMIN_ID || 
    String(user?.telegram_id) === import.meta.env.VITE_SUPER_ADMIN_ID;

  const ENABLE_REFERRALS = false;

  return (
    <div className="pb-24">
      {/* PAGE TITLE */}
      <div className="px-4 pt-4 pb-3 flex items-center gap-2">
        <button onClick={() => navigate(-1)} className="text-white hover:text-white/70 transition-colors">
          <ChevronLeft size={24} />
        </button>
        <h1 className="font-bold text-lg uppercase tracking-wider">PROFILE</h1>
      </div>

      {/* HEADER / BANNER */}
      <div className="bg-secondary px-5 py-4 rounded-none text-black relative flex items-center gap-4">
        <div 
          className="bg-white/20 flex-shrink-0 flex items-center justify-center font-bold uppercase border-2 border-white/40 shadow-sm overflow-hidden"
          style={{ width: '80px', height: '80px', borderRadius: '16px', fontSize: '2.5rem' }}
        >
          {tgUser?.photo_url ? (
            <img src={tgUser.photo_url} alt={user?.first_name || 'User'} className="w-full h-full object-cover" />
          ) : (
            user?.first_name?.charAt(0) || <User size={40} strokeWidth={1.5} />
          )}
        </div>
        
        <div className="flex flex-col justify-center">
          <h1 className="text-xl font-extrabold uppercase tracking-widest leading-none mb-1 text-black">
            {user?.first_name || 'Player'}
          </h1>
          <p className="text-black/60 font-mono text-xs mb-3">
            @{user?.username || tgUser?.username || 'user'}
          </p>
          
          <div className="flex flex-wrap gap-2">
            <div 
              className="px-2 py-0.5 text-[10px] font-bold border border-white/60 text-black/90 flex items-center gap-1 shadow-sm"
              style={{ borderRadius: '9999px' }}
            >
              {Number(user?.balance || 0).toFixed(2)} PTS
            </div>
            <div 
              className="px-2 py-0.5 text-[10px] font-bold border border-white/60 text-black/90 flex items-center gap-1 shadow-sm"
              style={{ borderRadius: '9999px' }}
            >
              🔥 1D
            </div>
          </div>
        </div>
      </div>

      {/* STATS BOXES */}
      <div className="px-4 mt-4">
        <div className="bg-cardbg border border-cardborder rounded-3xl p-3 grid grid-cols-3 gap-2 text-center divide-x divide-cardborder">
          <div>
            <div className="text-lg font-bold text-white">${user?.balance || '0.00'}</div>
            <div className="text-[10px] text-textmuted mt-0.5">BALANCE</div>
          </div>
          <div>
            <div className="text-lg font-bold text-white">${user?.total_earned || '0.00'}</div>
            <div className="text-[10px] text-textmuted mt-0.5">EARNED</div>
          </div>
          <div>
            <div className="text-lg font-bold text-white">0</div>
            <div className="text-[10px] text-textmuted mt-0.5">REFS</div>
          </div>
        </div>
      </div>

      <div className="px-4 mt-4 space-y-4">
        {/* ACCOUNT SECTION */}
        <div>
          <h2 className="text-textmuted text-[11px] font-bold mb-2 pl-2">ACCOUNT</h2>
          <div className="bg-cardbg border border-cardborder rounded-3xl overflow-hidden flex flex-col">
            <button onClick={() => navigate('/withdraw')} className="flex items-center p-3 hover:bg-white/5 transition-colors border-b border-cardborder text-left">
              <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center mr-3"><Wallet size={16} className="text-secondary" /></div>
              <div className="flex-1">
                <div className="font-bold text-white text-sm">Withdraw</div>
                <div className="text-[11px] text-textmuted leading-tight">Cash out your earnings</div>
              </div>
              <ChevronRight size={18} className="text-textmuted" />
            </button>
            <button onClick={() => navigate('/history')} className="flex items-center p-3 hover:bg-white/5 transition-colors border-b border-cardborder text-left">
              <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center mr-3"><History size={16} className="text-secondary" /></div>
              <div className="flex-1">
                <div className="font-bold text-white text-sm">History</div>
                <div className="text-[11px] text-textmuted leading-tight">View past transactions</div>
              </div>
              <ChevronRight size={18} className="text-textmuted" />
            </button>
            <button 
              onClick={() => ENABLE_REFERRALS && navigate('/referrals')} 
              className={`flex items-center p-3 text-left ${ENABLE_REFERRALS ? 'hover:bg-white/5 transition-colors' : 'opacity-50 grayscale pointer-events-none'}`}
            >
              <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center mr-3"><Users size={16} className="text-secondary" /></div>
              <div className="flex-1">
                <div className="font-bold text-white text-sm">Referrals</div>
                <div className="text-[11px] text-textmuted leading-tight">Invite friends, earn more</div>
              </div>
              <ChevronRight size={18} className="text-textmuted" />
            </button>
          </div>
        </div>

        {/* HELP SECTION */}
        <div>
          <h2 className="text-textmuted text-[11px] font-bold mb-2 pl-2">HELP & SUPPORT</h2>
          <div className="bg-cardbg border border-cardborder rounded-3xl overflow-hidden flex flex-col">
            <button onClick={() => navigate('/support')} className="flex items-center p-3 hover:bg-white/5 transition-colors border-b border-cardborder text-left">
              <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center mr-3"><HelpCircle size={16} className="text-white" /></div>
              <div className="flex-1">
                <div className="font-bold text-white text-sm">Support & FAQ</div>
                <div className="text-[11px] text-textmuted leading-tight">Get help with the app</div>
              </div>
              <ChevronRight size={18} className="text-textmuted" />
            </button>
            <button onClick={() => navigate('/about')} className="flex items-center p-3 hover:bg-white/5 transition-colors border-b border-cardborder text-left">
              <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center mr-3"><Info size={16} className="text-white" /></div>
              <div className="flex-1">
                <div className="font-bold text-white text-sm">About AdShare</div>
                <div className="text-[11px] text-textmuted leading-tight">Learn about us</div>
              </div>
              <ChevronRight size={18} className="text-textmuted" />
            </button>
            <button onClick={() => navigate('/ad-policy')} className="flex items-center p-3 hover:bg-white/5 transition-colors border-b border-cardborder text-left">
              <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center mr-3"><Shield size={16} className="text-white" /></div>
              <div className="flex-1">
                <div className="font-bold text-white text-sm">Ad Policy</div>
                <div className="text-[11px] text-textmuted leading-tight">Rules for watching ads</div>
              </div>
              <ChevronRight size={18} className="text-textmuted" />
            </button>
            <button onClick={() => navigate('/terms')} className="flex items-center p-3 hover:bg-white/5 transition-colors border-b border-cardborder text-left">
              <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center mr-3"><FileText size={16} className="text-white" /></div>
              <div className="flex-1">
                <div className="font-bold text-white text-sm">Terms & Privacy</div>
                <div className="text-[11px] text-textmuted leading-tight">Legal information</div>
              </div>
              <ChevronRight size={18} className="text-textmuted" />
            </button>
          </div>
        </div>

        {isSuperAdmin && (
          <div>
            <div className="bg-cardbg border border-secondary rounded-3xl overflow-hidden flex flex-col mt-2">
              <button onClick={() => navigate('/admin')} className="flex items-center p-3 hover:bg-white/5 transition-colors text-left text-secondary">
                <div className="w-8 h-8 rounded-lg bg-secondary/10 flex items-center justify-center mr-3"><Settings size={16} /></div>
                <div className="flex-1 font-bold text-sm">Admin Panel</div>
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}

        {/* FOOTER */}
        <div className="mt-8 text-center px-4">
          <div className="text-textmuted text-[11px] mb-1">
            AdShare v1.0 &middot; Player since {user?.created_at ? new Date(user.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : 'Aug 2026'}
          </div>
          <div className="text-textmuted/60 text-[10px]">
            Credits has no monetary value and cannot be cashed out.
          </div>
        </div>
      </div>
    </div>
  );
};

export default Menu;
