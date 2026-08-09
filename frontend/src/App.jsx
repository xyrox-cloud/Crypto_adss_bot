import React, { useEffect, useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import History from './pages/History';
import Withdraw from './pages/Withdraw';
import Referrals from './pages/Referrals';
import BottomNav from './components/BottomNav';
import LoadingSpinner from './components/LoadingSpinner';
import { UserProvider } from './context/UserContext';
import { ToastProvider } from './context/ToastContext';
import { registerUser } from './api/api';
import AdminApp from './admin/AdminApp';
import Menu from './pages/Menu';
import About from './pages/About';
import Support from './pages/Support';
import AdPolicy from './pages/AdPolicy';
import Terms from './pages/Terms';
import Privacy from './pages/Privacy';
import Leaderboard from './pages/Leaderboard';

function App() {
  const [initializing, setInitializing] = useState(true);
  const [initialUser, setInitialUser] = useState(null);

  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    
    // Apply TG theme
    if (tg?.themeParams) {
      const root = document.documentElement;
      if (tg.themeParams.bg_color) root.style.setProperty('--tg-bg', tg.themeParams.bg_color);
      if (tg.themeParams.text_color) root.style.setProperty('--tg-text', tg.themeParams.text_color);
      if (tg.themeParams.hint_color) root.style.setProperty('--tg-hint', tg.themeParams.hint_color);
      if (tg.themeParams.link_color) root.style.setProperty('--tg-link', tg.themeParams.link_color);
      if (tg.themeParams.button_color) root.style.setProperty('--tg-button', tg.themeParams.button_color);
      if (tg.themeParams.button_text_color) root.style.setProperty('--tg-button-text', tg.themeParams.button_text_color);
      if (tg.themeParams.secondary_bg_color) root.style.setProperty('--tg-secondary-bg', tg.themeParams.secondary_bg_color);
    }

    if (tg) tg.ready();
    if (tg) tg.expand();

    const tgUser = tg?.initDataUnsafe?.user || {
      id: 12345678,
      username: 'mock_user',
      first_name: 'Mock',
    };

    localStorage.setItem('tg_id', tgUser.id);
    localStorage.setItem('tg_username', tgUser.username || '');

    const init = async () => {
      try {
        const res = await registerUser({
          telegram_id: tgUser.id,
          username: tgUser.username,
          first_name: tgUser.first_name,
        });
        setInitialUser(res.data);
      } catch (err) {
        console.error('Registration failed:', err);
      } finally {
        setInitializing(false);
      }
    };
    init();
  }, []);

  if (initializing) {
    return (
      <div className="loading-screen">
        <div className="loading-logo">AdShare</div>
        <div className="loading-sub">Preparing your dashboard…</div>
        <LoadingSpinner size={26} color="var(--accent)" />
      </div>
    );
  }

  return (
    <ToastProvider>
      <UserProvider initialUserData={initialUser}>
        <div className="app-container">
          <div className="page-content">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/history" element={<History />} />
              <Route path="/withdraw" element={<Withdraw />} />
              <Route path="/referrals" element={<Referrals />} />
              <Route path="/menu" element={<Menu />} />
              <Route path="/about" element={<About />} />
              <Route path="/support" element={<Support />} />
              <Route path="/ad-policy" element={<AdPolicy />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/leaderboard" element={<Leaderboard />} />
              <Route path="/admin/*" element={<AdminApp />} />
            </Routes>
          </div>
          <Routes>
            <Route path="/admin/*" element={null} />
            <Route path="*" element={<BottomNav />} />
          </Routes>
        </div>
      </UserProvider>
    </ToastProvider>
  );
}

export default App;
