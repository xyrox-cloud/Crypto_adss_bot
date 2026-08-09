# 🚀 TG AdShare — Telegram Ad Revenue Mini App

A full-stack Telegram Mini App where users watch rewarded ads and earn USDT, with 60/40 revenue sharing between users and the platform.

## 📁 Project Structure

```
tg/
├── backend/     # Express.js API + SQLite database
├── frontend/    # React + Vite Telegram Mini App
├── bot/         # Telegraf.js Telegram bot
└── README.md
```

## ⚙️ Prerequisites
- Node.js >= 18
- A Telegram Bot Token from @BotFather
- An Adsgram account with a Block ID
- A domain + HTTPS (required for Telegram Mini Apps in production)

## 🛠 Quick Setup

### Backend
```bash
cd backend && npm install
cp .env.example .env   # edit with your values
npm run dev            # runs on :3001
```

### Frontend
```bash
cd frontend && npm install
cp .env.example .env   # edit with your values
npm run dev            # runs on :5173
```

### Bot
```bash
cd bot && npm install
cp .env.example .env   # edit with your values
npm run dev
```

## 💡 Revenue Model
Per ad watched:
- User earns:      60% of AD_REWARD_USDT (default $0.006)
- Platform keeps:  40% of AD_REWARD_USDT (default $0.004)

Withdrawals are manual — admin sends USDT via Binance, marks paid in dashboard.

## 🌐 Admin Panel
Access at http://localhost:3001/admin (or your domain /admin)
Login with ADMIN_PASSWORD from backend .env

## 🔒 Anti-Fraud
- Rate limiting: max 5 ads/hour, 20 ads/day per user
- Server-side reward crediting only
- IP + Telegram ID logging
- Balance deducted immediately on withdrawal request

## 📦 Production
1. Deploy backend + bot to VPS (use PM2)
2. Build frontend: cd frontend && npm run build
3. Serve dist/ via nginx + HTTPS
4. Configure Mini App URL in @BotFather
