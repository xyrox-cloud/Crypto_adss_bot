const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const logFile = path.join(__dirname, '..', 'logs', 'health-alerts.log');

function logAlert(message) {
  const line = `[${new Date().toISOString()}] ${message}\n`;
  fs.appendFileSync(logFile, line);
  console.error(line.trim());
}

function checkEndpoint(url, headers = {}) {
  return new Promise((resolve) => {
    const client = url.startsWith('https') ? https : http;
    const options = {
      rejectUnauthorized: false,
      headers
    };
    
    const req = client.get(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode !== 200) {
          logAlert(`FAIL: ${url} returned status ${res.statusCode}`);
          resolve(false);
          return;
        }
        try {
          const json = JSON.parse(data);
          if (json.status !== 'ok') {
            logAlert(`FAIL: ${url} response status not ok: ${data}`);
            resolve(false);
          } else {
            console.log(`[OK] ${url} - Status: ${res.statusCode}, DB: ${json.db}, Uptime: ${json.uptime}s`);
            resolve(true);
          }
        } catch (e) {
          logAlert(`FAIL: ${url} invalid JSON response`);
          resolve(false);
        }
      });
    });

    req.on('error', (err) => {
      logAlert(`FAIL: ${url} connection error: ${err.message}`);
      resolve(false);
    });

    req.setTimeout(5000, () => {
      req.destroy();
      logAlert(`FAIL: ${url} timed out`);
      resolve(false);
    });
  });
}

async function runMonitor() {
  const localOk = await checkEndpoint('http://localhost:3001/api/health');
  const proxyOk = await checkEndpoint('https://127.0.0.1/api/health', { Host: 'cryptoadss.duckdns.org' });

  if (!localOk || !proxyOk) {
    process.exit(1);
  }
}

runMonitor();
