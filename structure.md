# 📁 Project Directory Structure

```
tg/
├── backend/
│   ├── data/                 # SQLite database storage (adshare.db)
│   ├── public/               # Admin panel static assets
│   ├── src/
│   │   ├── db/
│   │   │   └── database.js   # DB connection, schema migrations, seeds, settings
│   │   ├── middleware/
│   │   │   ├── auth.js       # Telegram initData & Admin JWT verification
│   │   │   └── sanitize.js   # Request input sanitization
│   │   ├── routes/
│   │   │   ├── admin.js      # Admin routes (settings, users, payouts)
│   │   │   ├── ads.js        # Rewarded ad claims & stats API
│   │   │   ├── auth.js       # Phase 1 Login & token verification API
│   │   │   ├── support.js    # Customer support tickets
│   │   │   ├── users.js      # User profile, streak, quests, game rewards
│   │   │   └── withdrawals.js# TON withdrawal requests
│   │   └── index.js          # Express app entry point & route mounting
│   ├── .env                  # Environment variables (SUPER_ADMIN_ID, BOT_TOKEN, etc.)
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── admin/            # React Admin Panel
│   │   ├── components/       # UI Components
│   │   ├── context/          # User & Settings React Context
│   │   ├── pages/            # Mini App Pages (Earn, Leaderboard, Wallet)
│   │   ├── App.jsx           # Main React App entry & Navigation
│   │   └── main.jsx
│   ├── vite.config.js
│   └── package.json
├── bot/
│   ├── src/
│   │   └── bot.js            # Telegraf.js bot handler
│   └── package.json
├── memory.md                 # Project state & current phase tracker
├── phases.md                 # Implementation roadmap
├── rules.md                  # Project development guidelines
└── README.md                 # Project overview & deployment guide
```
