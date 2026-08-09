import axios from 'axios';

const ADMIN_TOKEN_KEY = 'adshare_admin_token';
const INACTIVITY_MS = 30 * 60 * 1000; // 30 minutes
let inactivityTimer = null;

const adminApi = axios.create({
  baseURL: (import.meta.env.VITE_API_BASE_URL || '/api') + '/admin',
});

// Attach token to every request + refresh sliding session timer
adminApi.interceptors.request.use((config) => {
  const token = localStorage.getItem(ADMIN_TOKEN_KEY);
  if (token) config.headers['Authorization'] = `Bearer ${token}`;
  
  // Attach Telegram initData if available (for super_admin bypass)
  const initData = window.Telegram?.WebApp?.initData;
  if (initData) config.headers['x-telegram-init-data'] = initData;
  
  const tgId = localStorage.getItem('tg_id');
  if (tgId) config.headers['x-telegram-id'] = tgId;

  resetInactivityTimer();
  return config;
});

// On 401, clear token
adminApi.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401) {
      clearAdminSession();
      window.location.hash = '#/admin/login';
    }
    return Promise.reject(err);
  }
);

function resetInactivityTimer() {
  const tgId = localStorage.getItem('tg_id');
  if (import.meta.env.VITE_SUPER_ADMIN_ID && tgId === import.meta.env.VITE_SUPER_ADMIN_ID) {
    return; // Super admin never expires
  }
  
  if (inactivityTimer) clearTimeout(inactivityTimer);
  inactivityTimer = setTimeout(() => {
    clearAdminSession();
    window.location.hash = '#/admin/login';
    alert('Session expired due to inactivity. Please log in again.');
  }, INACTIVITY_MS);
}

export function setAdminSession(token) {
  localStorage.setItem(ADMIN_TOKEN_KEY, token);
  resetInactivityTimer();
}

export function clearAdminSession() {
  localStorage.removeItem(ADMIN_TOKEN_KEY);
  if (inactivityTimer) clearTimeout(inactivityTimer);
}

export function getAdminToken() {
  return localStorage.getItem(ADMIN_TOKEN_KEY);
}

// Auth
export const adminLogin   = (password) => adminApi.post('login', { password });
export const adminRefresh = () => adminApi.post('refresh');

// Dashboard
export const getAdminStats = () => adminApi.get('stats');

// Withdrawals
export const getAdminWithdrawals = (params) => adminApi.get('withdrawals', { params });
export const updateWithdrawal    = (id, body) => adminApi.patch(`withdrawals/${id}`, body);

// Users
export const getAdminUsers    = (params)    => adminApi.get('users', { params });
export const adjustBalance    = (id, body)  => adminApi.patch(`users/${id}/balance`, body);
export const setBanStatus     = (id, banned) => adminApi.patch(`users/${id}/ban`, { banned });

// Settings
export const getAdminSettings  = () => adminApi.get('settings');
export const saveAdminSettings = (settings) => adminApi.put('settings', { settings });

// Activity Log
export const getActivityLog = (params) => adminApi.get('activity-log', { params });

// Support Tickets
export const getAdminTickets = (params) => adminApi.get('tickets', { params });
export const updateAdminTicket = (id, body) => adminApi.patch(`tickets/${id}`, body);

export default adminApi;
