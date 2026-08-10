const https = require('https');
const path = require('path');
const jwt = require(path.join(__dirname, '..', 'backend', 'node_modules', 'jsonwebtoken'));

const HOST = '127.0.0.1';
const HEADERS = {
  'Host': 'cryptoadss.duckdns.org',
  'Content-Type': 'application/json'
};

let userToken = null;
let adminToken = null;

function request(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const reqHeaders = { ...HEADERS };
    if (token) {
      reqHeaders['Authorization'] = `Bearer ${token}`;
    }
    const dataString = body ? JSON.stringify(body) : null;
    if (dataString) {
      reqHeaders['Content-Length'] = Buffer.byteLength(dataString);
    }

    const options = {
      hostname: HOST,
      port: 443,
      path: path,
      method: method,
      headers: reqHeaders,
      rejectUnauthorized: false
    };

    const req = https.request(options, (res) => {
      let responseBody = '';
      res.on('data', chunk => responseBody += chunk);
      res.on('end', () => {
        let json = null;
        try {
          json = JSON.parse(responseBody);
        } catch (e) {
          json = { raw: responseBody };
        }
        resolve({ statusCode: res.statusCode, data: json });
      });
    });

    req.on('error', (err) => reject(err));
    if (dataString) req.write(dataString);
    req.end();
  });
}

async function runE2ESmokeTests() {
  console.log("==================================================");
  console.log("🚀 RUNNING 14 LIVE PRODUCTION E2E SMOKE TESTS");
  console.log("Target: https://127.0.0.1 (Host: cryptoadss.duckdns.org)");
  console.log("==================================================\n");

  let passed = 0;
  let failed = 0;

  async function testCase(id, name, testFn) {
    try {
      const res = await testFn();
      if (res.ok) {
        console.log(`[PASS] Case ${id}: ${name}`);
        passed++;
      } else {
        console.error(`[FAIL] Case ${id}: ${name} -> ${res.reason}`);
        failed++;
      }
    } catch (err) {
      console.error(`[FAIL] Case ${id}: ${name} -> Exception: ${err.message}`);
      failed++;
    }
  }

  // 1. Health check
  await testCase(1, "GET /api/health - Endpoint & DB Health", async () => {
    const res = await request('GET', '/api/health');
    if (res.statusCode === 200 && res.data.status === 'ok' && res.data.db === 'connected') return { ok: true };
    return { ok: false, reason: `Status ${res.statusCode}, data: ${JSON.stringify(res.data)}` };
  });

  // 2. User authentication (Login)
  await testCase(2, "POST /api/auth/login - User Authentication", async () => {
    const testTgId = `e2e_${Date.now()}`;
    const res = await request('POST', '/api/auth/login', {
      telegram_id: testTgId,
      username: 'smoketest_user',
      first_name: 'SmokeTester'
    });
    if (res.statusCode === 200 && res.data.success && res.data.token) {
      userToken = res.data.token;
      return { ok: true };
    }
    return { ok: false, reason: `Status ${res.statusCode}, data: ${JSON.stringify(res.data)}` };
  });

  // 3. JWT Verification
  await testCase(3, "GET /api/auth/verify - Verify Bearer Token", async () => {
    const res = await request('GET', '/api/auth/verify', null, userToken);
    if (res.statusCode === 200 && res.data.valid) return { ok: true };
    return { ok: false, reason: `Status ${res.statusCode}, data: ${JSON.stringify(res.data)}` };
  });

  // 4. User Profile Retrieval
  await testCase(4, "GET /api/users/me - Retrieve Authenticated User Profile", async () => {
    const res = await request('GET', '/api/users/me', null, userToken);
    if (res.statusCode === 200 && res.data.referral_code) return { ok: true };
    return { ok: false, reason: `Status ${res.statusCode}, data: ${JSON.stringify(res.data)}` };
  });

  // 5. Get Ad Config & Stats
  await testCase(5, "GET /api/ads/stats - Fetch Active Ad Rewards & Stats", async () => {
    const res = await request('GET', '/api/ads/stats', null, userToken);
    if (res.statusCode === 200 && typeof res.data.reward_per_ad === 'number') return { ok: true };
    return { ok: false, reason: `Status ${res.statusCode}, data: ${JSON.stringify(res.data)}` };
  });

  // 6. Claim Ad Reward
  await testCase(6, "POST /api/ads/claim - Process Ad Reward Claim", async () => {
    const res = await request('POST', '/api/ads/claim', {}, userToken);
    if (res.statusCode === 200 && res.data.success) return { ok: true };
    return { ok: false, reason: `Status ${res.statusCode}, data: ${JSON.stringify(res.data)}` };
  });

  // 7. Ad Watch History
  await testCase(7, "GET /api/ads/history - Retrieve Ad Watch Log", async () => {
    const res = await request('GET', '/api/ads/history', null, userToken);
    if (res.statusCode === 200 && Array.isArray(res.data.watches)) return { ok: true };
    return { ok: false, reason: `Status ${res.statusCode}, data: ${JSON.stringify(res.data)}` };
  });

  // 8. Daily Check-in Bonus
  await testCase(8, "POST /api/users/daily-claim - Claim Daily Bonus", async () => {
    const res = await request('POST', '/api/users/daily-claim', {}, userToken);
    if (res.statusCode === 200 || (res.statusCode === 400 && res.data.error.includes('already claimed'))) return { ok: true };
    return { ok: false, reason: `Status ${res.statusCode}, data: ${JSON.stringify(res.data)}` };
  });

  // 9. Minigame Reward
  await testCase(9, "POST /api/users/minigame-claim - Claim Daily Minigame", async () => {
    const res = await request('POST', '/api/users/minigame-claim', { score: 100 }, userToken);
    if (res.statusCode === 200 || (res.statusCode === 400 && res.data.error.includes('Cooldown'))) return { ok: true };
    return { ok: false, reason: `Status ${res.statusCode}, data: ${JSON.stringify(res.data)}` };
  });

  // 10. Withdrawal Threshold Validation
  await testCase(10, "POST /api/withdrawals/request - Validate Minimum Withdrawal", async () => {
    const res = await request('POST', '/api/withdrawals/request', {
      amount: 0.1,
      wallet_address: 'EQBvW8Z5huBkMJYxFf-v4PASbvyRi47yNEzjAPkKcFaXJDMz'
    }, userToken);
    if (res.statusCode === 400 && res.data.error && res.data.error.toLowerCase().includes('minimum')) return { ok: true };
    return { ok: false, reason: `Status ${res.statusCode}, data: ${JSON.stringify(res.data)}` };
  });

  // 11. Personal Withdrawal History
  await testCase(11, "GET /api/withdrawals/history - Retrieve Withdrawal History", async () => {
    const res = await request('GET', '/api/withdrawals/history', null, userToken);
    if (res.statusCode === 200 && Array.isArray(res.data)) return { ok: true };
    return { ok: false, reason: `Status ${res.statusCode}, data: ${JSON.stringify(res.data)}` };
  });

  // 12. Create Support Ticket
  await testCase(12, "POST /api/support - Submit Support Ticket", async () => {
    const res = await request('POST', '/api/support', {
      type: 'General',
      message: 'Live production E2E smoke test ticket'
    }, userToken);
    if (res.statusCode === 200 && res.data.success) return { ok: true };
    return { ok: false, reason: `Status ${res.statusCode}, data: ${JSON.stringify(res.data)}` };
  });

  // 13. Get Support Tickets
  await testCase(13, "GET /api/support - Retrieve My Support Tickets", async () => {
    const res = await request('GET', '/api/support', null, userToken);
    if (res.statusCode === 200 && Array.isArray(res.data.tickets)) return { ok: true };
    return { ok: false, reason: `Status ${res.statusCode}, data: ${JSON.stringify(res.data)}` };
  });

  // 14. Admin Stats Dashboard
  await testCase(14, "GET /api/admin/stats - Retrieve Admin Dashboard Metrics", async () => {
    const adminSecret = process.env.ADMIN_JWT_SECRET || '6745f46bcbff1dc5df46deb3cbff43aeab6f73eff1a78a8d8a3ab0d6b9d303a4';
    adminToken = jwt.sign({ role: 'admin', iat: Date.now() }, adminSecret, { expiresIn: '15m' });

    const res = await request('GET', '/api/admin/stats', null, adminToken);
    if (res.statusCode === 200 && typeof res.data.total_users === 'number') return { ok: true };
    return { ok: false, reason: `Status ${res.statusCode}, data: ${JSON.stringify(res.data)}` };
  });

  console.log("\n==================================================");
  console.log(`RESULTS: ${passed} PASSED, ${failed} FAILED out of 14 tests.`);
  console.log("==================================================");

  if (failed > 0) process.exit(1);
}

runE2ESmokeTests();
