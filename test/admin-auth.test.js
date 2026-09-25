const test = require('node:test');
const assert = require('node:assert/strict');
const { app, startServer } = require('../app.js');

const originalEnv = { ...process.env };
let server;
let baseUrl;

async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      ...(options.headers || {}),
      ...(options.body && !options.headers?.['Content-Type']
        ? { 'Content-Type': 'application/json' }
        : {}),
    },
  });

  return {
    status: response.status,
    headers: response.headers,
    body: await response.text(),
  };
}

test.before(async () => {
  process.env.ADMIN_USER = 'admin';
  process.env.ADMIN_PASS = 'secret';
  process.env.SESSION_SECRET = 'test-session-secret';
  process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/testdb';
  process.env.PHONE_NUMBER_ID = 'test-phone-number-id';
  process.env.ACCESS_TOKEN = 'test-access-token';
  process.env.APP_SECRET = 'test-app-secret';
  process.env.VERIFY_TOKEN = 'test-verify-token';
  process.env.GRAPH_API_VERSION = 'v26.0';

  server = await startServer(0);
  const address = server.address();
  baseUrl = `http://127.0.0.1:${address.port}`;
});

test.after(async () => {
  if (server) {
    await new Promise((resolve, reject) => server.close(err => err ? reject(err) : resolve()));
  }
  Object.keys(process.env).forEach((key) => {
    if (!(key in originalEnv)) delete process.env[key];
  });
  Object.assign(process.env, originalEnv);
});

test('POST /api/login succeeds with valid credentials', async () => {
  const response = await request('/api/login', {
    method: 'POST',
    body: JSON.stringify({ username: 'admin', password: 'secret' }),
  });

  assert.equal(response.status, 200);
  assert.match(response.headers.get('set-cookie'), /connect.sid|session=/i);
  const data = JSON.parse(response.body);
  assert.equal(data.success, true);
  assert.equal(data.user.username, 'admin');
});

test('GET /api/login is not used for authentication', async () => {
  const response = await request('/api/login', { method: 'GET' });
  assert.equal(response.status, 405);
  const data = JSON.parse(response.body);
  assert.equal(data.success, false);
  assert.match(data.error, /POST.*JSON/i);
});

test('invalid credentials return 401', async () => {
  const response = await request('/api/login', {
    method: 'POST',
    body: JSON.stringify({ username: 'admin', password: 'wrong' }),
  });

  assert.equal(response.status, 401);
  const data = JSON.parse(response.body);
  assert.equal(data.success, false);
  assert.match(data.error, /invalid username or password/i);
});

test('password does not appear in Location headers', async () => {
  const response = await request('/api/login', {
    method: 'POST',
    body: JSON.stringify({ username: 'admin', password: 'secret' }),
  });

  const location = response.headers.get('location') || '';
  assert.doesNotMatch(location, /secret|password/i);
});

test('login fails for invalid credentials without exposing user existence', async () => {
  const response = await request('/api/login', {
    method: 'POST',
    body: JSON.stringify({ username: 'admin', password: 'wrong' }),
  });

  assert.equal(response.status, 401);
  const data = JSON.parse(response.body);
  assert.equal(data.success, false);
  assert.match(data.error, /invalid username or password/i);
});

test('GET /dashboard without authentication redirects to /login', async () => {
  const response = await fetch(`${baseUrl}/dashboard`, { redirect: 'manual' });
  assert.equal(response.status, 302);
  assert.equal(response.headers.get('location'), '/login');
  assert.doesNotMatch(response.headers.get('location') || '', /username|password/i);
});

test('GET /dashboard with authentication returns dashboard HTML', async () => {
  const loginResponse = await request('/api/login', {
    method: 'POST',
    body: JSON.stringify({ username: 'admin', password: 'secret' }),
  });

  const cookies = loginResponse.headers.get('set-cookie');
  const dashboardPage = await fetch(`${baseUrl}/dashboard`, {
    method: 'GET',
    headers: { Cookie: cookies },
  });

  assert.equal(dashboardPage.status, 200);
  assert.match(dashboardPage.headers.get('content-type') || '', /text\/html/i);
  const html = await dashboardPage.text();
  assert.match(html, /WhatsApp Admin|Dashboard/i);
});

test('unauthenticated request is rejected', async () => {
  const response = await request('/api/dashboard');
  assert.equal(response.status, 401);
  const data = JSON.parse(response.body);
  assert.equal(data.success, false);
});

test('authenticated session can access protected endpoint', async () => {
  const loginResponse = await request('/api/login', {
    method: 'POST',
    body: JSON.stringify({ username: 'admin', password: 'secret' }),
  });

  const cookies = loginResponse.headers.get('set-cookie');
  const dashboardResponse = await request('/api/dashboard', {
    method: 'GET',
    headers: {
      Cookie: cookies,
    },
  });

  assert.equal(dashboardResponse.status, 200);
  const dashboard = JSON.parse(dashboardResponse.body);
  assert.equal(dashboard.success, true);
  assert.ok(typeof dashboard.data.contacts === 'number');
});

test('dashboard API returns stats when authenticated', async () => {
  const loginResponse = await request('/api/login', {
    method: 'POST',
    body: JSON.stringify({ username: 'admin', password: 'secret' }),
  });

  const cookies = loginResponse.headers.get('set-cookie');
  const dashboardResponse = await request('/api/dashboard', {
    method: 'GET',
    headers: {
      Cookie: cookies,
    },
  });

  assert.equal(dashboardResponse.status, 200);
  const dashboard = JSON.parse(dashboardResponse.body);
  assert.equal(dashboard.success, true);
  assert.ok(typeof dashboard.data.contacts === 'number');
  assert.ok(typeof dashboard.data.campaigns === 'number');
});

test('contacts API returns a list for authenticated admin', async () => {
  const loginResponse = await request('/api/login', {
    method: 'POST',
    body: JSON.stringify({ username: 'admin', password: 'secret' }),
  });

  const cookies = loginResponse.headers.get('set-cookie');
  const contactsResponse = await request('/api/contacts', {
    method: 'GET',
    headers: {
      Cookie: cookies,
    },
  });

  assert.equal(contactsResponse.status, 200);
  const payload = JSON.parse(contactsResponse.body);
  assert.equal(payload.success, true);
  assert.ok(Array.isArray(payload.data.contacts));
});

test('logout clears the session', async () => {
  const loginResponse = await request('/api/login', {
    method: 'POST',
    body: JSON.stringify({ username: 'admin', password: 'secret' }),
  });

  const cookies = loginResponse.headers.get('set-cookie');
  const logoutResponse = await request('/api/logout', {
    method: 'POST',
    headers: { Cookie: cookies },
  });

  assert.equal(logoutResponse.status, 200);
  const data = JSON.parse(logoutResponse.body);
  assert.equal(data.success, true);
});
