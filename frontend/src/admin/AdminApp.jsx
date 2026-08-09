import React, { useState, useEffect } from 'react';
import { Routes, Route, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { AdminToastProvider } from './AdminToast';
import './admin.css';
import AdminDashboard from './pages/AdminDashboard';
import AdminWithdrawals from './pages/AdminWithdrawals';
import AdminUsers from './pages/AdminUsers';
import AdminSettings from './pages/AdminSettings';
import AdminActivityLog from './pages/AdminActivityLog';
import AdminSupport from './pages/AdminSupport';

export default function AdminApp() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const tgId = localStorage.getItem('tg_id');
    const isSuperAdmin = import.meta.env.VITE_SUPER_ADMIN_ID && tgId === import.meta.env.VITE_SUPER_ADMIN_ID;

    if (isSuperAdmin) {
      setIsAuthenticated(true);
    }
    setLoading(false);
  }, []);

  const handleLogout = () => {
    setIsAuthenticated(false);
    navigate('/menu');
  };

  if (loading) return null;

  if (!isAuthenticated) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#0f172a', color: '#ef4444', flexDirection: 'column' }}>
        <h2>Access Denied</h2>
        <p style={{ color: '#94a3b8', marginTop: '10px' }}>You do not have permission to view the Admin Panel.</p>
        <button onClick={() => navigate('/menu')} className="btn-secondary" style={{ marginTop: '20px' }}>Return to App</button>
      </div>
    );
  }

  return (
    <AdminToastProvider>
      <div className="admin-layout admin-root">
        <aside className="admin-sidebar">
          <div className="admin-sidebar-logo">
            <div className="admin-logo-mark">NovaGrid</div>
            <div className="admin-logo-sub">Admin Panel</div>
          </div>
          <nav className="admin-nav">
            <NavLink to="/admin" end className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`}>
              <span>Dashboard</span>
            </NavLink>
            <NavLink to="/admin/withdrawals" className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`}>
              <span>Withdrawals</span>
            </NavLink>
            <NavLink to="/admin/users" className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`}>
              <span>Users</span>
            </NavLink>
            <NavLink to="/admin/support" className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`}>
              <span>Support</span>
            </NavLink>
            <NavLink to="/admin/settings" className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`}>
              <span>Settings</span>
            </NavLink>
            <NavLink to="/admin/activity-log" className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`}>
              <span>Activity Log</span>
            </NavLink>
          </nav>
          <div className="admin-sidebar-footer">
            <button className="admin-logout-btn" onClick={handleLogout}>
              ⎋ <span>Sign Out</span>
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
