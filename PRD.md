# 📄 Product Requirements Document (PRD) — Blitz Game Zone

## 1. Executive Summary
Blitz Game Zone is a full-stack Telegram Mini App enabling users to watch rewarded ads, complete daily streaks and quests, invite friends, play minigames, and earn TON cryptocurrency rewards. The platform features an automated backend revenue-sharing model (60% net user reward payout, 40% platform cut) and a comprehensive admin management panel.

---

## 2. Core Functional Requirements

### 🔑 Requirement 1: Authentication & User Lifecycle
- **Telegram Mini App Authentication**: Cryptographic verification of Telegram WebApp `initData` signature (`HMAC-SHA256`).
- **Session Tokens**: Issue 7-day JWT bearer tokens for secure user API calls.
- **Auto Provisioning & Referrals**: Automatic account registration on first launch with 250 points for referrer and 100 points for referee.
- **Admin Flag Governance**: Automatic `is_admin = 1` assignment for `SUPER_ADMIN_ID` configured via environment variables (`.env`).

### 📺 Requirement 2: Rewarded Ads Engine
- **Network Integration**: Monetag In-App Interstitial & Popup fallback, plus Adsgram postback webhook callbacks (`GET /api/ads/reward`).
- **Dynamic Reward Rate**: Frontend reads `reward_per_ad` dynamically from `/api/ads/stats` (default `0.01 TON`).
- **Anti-Fraud & Limits**: Maximum 5 ads/hour, 20 ads/day per user, with cooldown timers and server-side atomic balance crediting.
- **Admin Testing Bypass**: Users with `is_admin = 1` skip ad network modals and receive immediate test rewards.

### 💰 Requirement 3: Balance & Withdrawals
- **Atomic Balance Updates**: Rewards credited directly to `users.balance` and `users.total_earned`.
- **Minimum Withdrawal Threshold**: Enforce minimum payout limit (default `5.00 TON`).
- **Wallet Format Verification**: Validate TON wallet addresses matching `/^(EQ|UQ)[a-zA-Z0-9_-]{46}$/`.
- **Balance Deduction**: Deduct requested withdrawal amount immediately upon submission to prevent double-spending.

### ⚙️ Requirement 4: Admin Governance Panel
- **Dashboard Access**: Access control restricted to authorized admins (`is_admin = 1` or super admin credentials).
- **Settings Management**: Dynamic configuration of `reward_per_ad`, `daily_bonus_amount`, `min_withdrawal`, and ad rate limits.
- **User & Payout Management**: User status governance (ban/unban), payout approval tracking, and activity audit logging.

---

## 3. Non-Functional Requirements
- **Performance**: API response times under 200ms for 95th percentile.
- **Security**: Rate limiting on all public routes, input sanitization, zero hardcoded credentials.
- **Reliability**: Dual-process architecture managed via PM2 (`backend`, `bot`).
