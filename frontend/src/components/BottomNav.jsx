import React from 'react';
import { NavLink } from 'react-router-dom';

/* SVG icon set */
const HomeIcon = ({ active }) => (
  <svg className="nav-item-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V9.5z" />
    <path d="M9 21V12h6v9" />
  </svg>
);

const HistoryIcon = ({ active }) => (
  <svg className="nav-item-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="9" />
    <polyline points="12 7 12 12 15.5 15.5" />
  </svg>
);

const WithdrawIcon = ({ active }) => (
  <svg className="nav-item-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="5" width="20" height="14" rx="3" />
    <circle cx="12" cy="12" r="3" />
    <line x1="17" y1="12" x2="19" y2="12" />
    <line x1="5" y1="12" x2="7" y2="12" />
  </svg>
);

const ReferIcon = ({ active }) => (
  <svg className="nav-item-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
    <circle cx="9" cy="7" r="3.5" />
    <path d="M2 20c0-3.5 3-6 7-6" />
    <path d="M18 14l-3 3 3 3" />
    <path d="M21 17h-6" />
  </svg>
);

const MenuIcon = ({ active }) => (
  <svg className="nav-item-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
    <line x1="3" y1="12" x2="21" y2="12" />
    <line x1="3" y1="6" x2="21" y2="6" />
    <line x1="3" y1="18" x2="21" y2="18" />
  </svg>
);

const navItems = [
  { to: '/',          label: 'Home',     Icon: HomeIcon },
  { to: '/history',   label: 'History',  Icon: HistoryIcon },
  { to: '/withdraw',  label: 'Withdraw', Icon: WithdrawIcon },
  { to: '/referrals', label: 'Refer',    Icon: ReferIcon },
  { to: '/menu',      label: 'Menu',     Icon: MenuIcon },
];

const BottomNav = () => (
  <nav className="bottom-nav" aria-label="Main navigation">
    {navItems.map(({ to, label, Icon }) => (
      <NavLink
        key={to}
        to={to}
        end={to === '/'}
        className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
        id={`nav-${label.toLowerCase()}`}
      >
        {({ isActive }) => (
          <>
            <Icon active={isActive} />
            <span>{label}</span>
          </>
        )}
      </NavLink>
    ))}
  </nav>
);

export default BottomNav;
