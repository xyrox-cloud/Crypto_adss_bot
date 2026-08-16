import React, { useState, useEffect } from 'react';
import { Routes, Route, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, Wallet, Users, LifeBuoy, Settings, Activity, LogOut } from 'lucide-react';
import { AdminToastProvider } from './AdminToast';
import './admin.css';
import AdminDashboard from './pages/AdminDashboard';
import AdminWithdrawals from './pages/AdminWithdrawals';
import AdminUsers from './pages/AdminUsers';
import AdminSettings from './pages/AdminSettings';
import AdminActivityLog from './pages/AdminActivityLog';
import AdminSupport from './pages/AdminSupport';
import AdminLogin from './pages/AdminLogin';
import { getAdminToken, clearAdminSession } from '../api/adminApi';

export default function AdminApp() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    document.title = 'Blitz Game Zone — Admin Panel';
    const tgId = localStorage.getItem('tg_id');
    const isSuperAdmin = import.meta.env.VITE_SUPER_ADMIN_ID && tgId === import.meta.env.VITE_SUPER_ADMIN_ID;
    const token = getAdminToken();

    if (isSuperAdmin || token) {
      setIsAuthenticated(true);
    }
    setLoading(false);
  }, []);

  const handleLogout = () => {
    clearAdminSession();
    setIsAuthenticated(false);
    navigate('/menu');
  };

  useEffect(() => {
    if (!isAuthenticated) return;

    let timeoutId;
    const resetTimer = () => {
      if (timeoutId) clearTimeout(timeoutId);
      // 30 minutes = 30 * 60 * 1000 ms = 1800000 ms
      timeoutId = setTimeout(() => {
        handleLogout();
      }, 1800000);
    };

    // Initialize timer
    resetTimer();

    // Listeners for user activity
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    const handleActivity = () => resetTimer();
    
    events.forEach(event => document.addEventListener(event, handleActivity));

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      events.forEach(event => document.removeEventListener(event, handleActivity));
    };
  }, [isAuthenticated, navigate]);

  if (loading) return null;

  if (!isAuthenticated) {
    return <AdminLogin onLogin={setIsAuthenticated} />;
  }

  return (
    <AdminToastProvider>
      <div className="admin-layout admin-root">
        <aside className="admin-sidebar">
          <div className="admin-sidebar-logo">
            <div className="admin-logo-mark" style={{ fontSize: 16 }}>Blitz Game Zone</div>
            <div className="admin-logo-sub">Admin Panel</div>
          </div>
          <nav className="admin-nav">
            <NavLink to="/admin" end className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`}>
              <LayoutDashboard size={18} />
              <span>Dashboard</span>
            </NavLink>
            <NavLink to="/admin/withdrawals" className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`}>
              <Wallet size={18} />
              <span>Withdrawals</span>
            </NavLink>
            <NavLink to="/admin/users" className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`}>
              <Users size={18} />
              <span>Users</span>
            </NavLink>
            <NavLink to="/admin/support" className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`}>
              <LifeBuoy size={18} />
              <span>Support</span>
            </NavLink>
            <NavLink to="/admin/settings" className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`}>
              <Settings size={18} />
              <span>Settings</span>
            </NavLink>
            <NavLink to="/admin/activity-log" className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`}>
              <Activity size={18} />
              <span>Activity Log</span>
            </NavLink>
          </nav>
          <div className="admin-sidebar-footer">
            <button className="admin-logout-btn" onClick={handleLogout}>
              <LogOut size={18} />
              <span>Sign Out</span>
            </button>
          </div>
        </aside>
        
        <main className="admin-main">
          <div className="admin-topbar">
            <div className="admin-topbar-title">
              {location.pathname === '/admin' && 'Dashboard'}
              {location.pathname === '/admin/withdrawals' && 'Withdrawals'}
              {location.pathname === '/admin/users' && 'Users'}
              {location.pathname === '/admin/support' && 'Support'}
              {location.pathname === '/admin/settings' && 'Settings'}
              {location.pathname === '/admin/activity-log' && 'Activity Log'}
            </div>
            <div className="admin-topbar-right">
              Admin User
            </div>
          </div>
          <div className="admin-page">
            <Routes>
              <Route path="/" element={<AdminDashboard />} />
              <Route path="/withdrawals" element={<AdminWithdrawals />} />
              <Route path="/users" element={<AdminUsers />} />
              <Route path="/support" element={<AdminSupport />} />
              <Route path="/settings" element={<AdminSettings />} />
              <Route path="/activity-log" element={<AdminActivityLog />} />
            </Routes>
          </div>
        </main>
      </div>
    </AdminToastProvider>
  );
}
