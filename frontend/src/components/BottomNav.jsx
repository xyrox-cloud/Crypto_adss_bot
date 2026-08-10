import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Trophy, User, Coins, Target } from 'lucide-react';

const navItems = [
  { to: '/', label: 'HOME', Icon: Home },
  { to: '/game', label: 'PLAY', Icon: Target },
  { to: '/earn', label: 'EARN', Icon: Coins },
  { to: '/leaderboard', label: 'LEADER', Icon: Trophy },
  { to: '/menu', label: 'PROFILE', Icon: User },
];

const BottomNav = () => (
  <div className="fixed bottom-4 left-1/2 -translate-x-1/2 w-[90%] max-w-sm bg-[#141414] border border-[#242424] rounded-3xl p-1.5 flex justify-between items-center z-50">
    {navItems.map(({ to, label, Icon }) => (
      <NavLink
        key={to}
        to={to}
        end={to === '/'}
        className={({ isActive }) =>
          `flex flex-col items-center justify-center w-1/5 py-1.5 px-1 rounded-2xl transition-colors duration-200 ${
            isActive ? 'bg-white text-black' : 'text-[#8A8A8A] hover:text-white'
          }`
        }
        id={`nav-${label.toLowerCase()}`}
      >
        <Icon size={20} className="mb-0.5" strokeWidth={2.5} />
        <span className="text-[9px] font-bold tracking-wider">{label}</span>
      </NavLink>
    ))}
  </div>
);

export default BottomNav;
