# 📜 Project Rules & Architectural Guidelines

1. **Security First**:
   - Never hardcode secrets, tokens, or `SUPER_ADMIN_ID` in source files. Always use `.env`.
   - Validate Telegram `initData` cryptographically on backend endpoints.
   - Enforce rate limiting on sensitive API endpoints (login, ad claim, game reward).

2. **Display & Payout Consistency**:
   - `reward_per_ad` is the net amount displayed to the user AND credited to their balance (e.g. 0.01 TON).
   - Platform commission/cut is tracked separately in DB and does NOT reduce user's promised reward.

3. **Admin Exemption**:
   - Admin users (`is_admin = 1`) skip third-party ad triggers (In-App Interstitial, Monetag watch ad) and can test claim endpoints directly.

4. **Code Quality**:
   - Always run tests and verify server execution before declaring completion.
   - Keep PM2 backend and frontend builds synchronized.
