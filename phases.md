# 📅 Implementation Phases

## Phase 1: Authentication & User Login (Completed ✅)
- `POST /api/auth/login`: Telegram initData HMAC-SHA256 verification + JWT issuance.
- `GET /api/auth/verify`: JWT validation endpoint.
- Secure environment configuration (`SUPER_ADMIN_ID`).

## Phase 2: Ads Management & Rewarded Ad System (Active 🔄)
- `GET /api/ads/stats`: Retrieve ad limits, user daily/hourly counts, dynamic reward rate per ad.
- `POST /api/ads/claim`: Server-side claim verification, anti-fraud checks (max 5/hr, 20/day), reward crediting (`reward_per_ad`), platform fee accounting.
- Webhook / Postback handler for third-party ad networks (Monetag / Adsgram).
- Admin Ad Bypass: Direct reward claim for admin testing without watching ad networks.

## Phase 3: Frontend Earn & Watch Ad Experience
- Dynamic display of `reward_per_ad` TON.
- Admin bypass modal / button handling.
- Real-time balance updates and streak progression.

## Phase 4: Withdrawals & Admin Management Panel
- Withdrawal request processing with minimum threshold checks.
- Admin dashboard for settings, user ban/unban, payout tracking, and channel mandatory join enforcement.
