import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
});

api.interceptors.request.use((config) => {
  const tgId = localStorage.getItem('tg_id');
  const tgUsername = localStorage.getItem('tg_username');
  if (tgId) {
    config.headers['x-telegram-id'] = tgId;
  }
  if (tgUsername) {
    config.headers['x-telegram-username'] = tgUsername;
  }
  // Send Telegram initData for server-side verification in production
  const initData = window.Telegram?.WebApp?.initData;
  if (initData) {
    config.headers['x-telegram-init-data'] = initData;
  }
  return config;
});

export const registerUser = (userData) => api.post('/users/register', userData);
export const getMe = () => api.get('/users/me');
export const getAdStats = () => api.get('/ads/stats');
export const claimAdReward = () => api.post('/ads/claim');
export const getAdHistory = (params = {}) => api.get('/ads/history', { params });
export const requestWithdrawal = (data) => api.post('/withdrawals/request', data);
export const getWithdrawalHistory = () => api.get('/withdrawals/history');
export const getReferrals = () => api.get('/users/referrals');
export const submitSupportTicket = (body) => api.post('/support', body);
export const getSupportTickets = () => api.get('/support');
export const getLeaderboard = (params) => api.get('/users/leaderboard', { params });
export const getChannelStatus = () => api.get('/users/channel-status');
export const submitGameReward = (data) => api.post('/users/game-reward', data);
export const submitQuestClaim = (quest) => api.post('/users/quest-claim', { quest });


export default api;
