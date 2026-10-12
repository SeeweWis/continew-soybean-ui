import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

// Run against pnpm dev; use an installed Playwright runtime without adding a production dependency.
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({ headless: true, executablePath: process.env.BROWSER_EXECUTABLE });
const context = await browser.newContext();
const page = await context.newPage();
const errors = [];
const requests = [];
const hits = new Map();
let mode = 'anonymous';
let refreshCalls = 0;
page.on('pageerror', error => errors.push(error.message));

await page.route('**/dev-api/**', async route => {
  const request = route.request();
  const path = new URL(request.url()).pathname.replace('/dev-api', '');
  requests.push({ path, method: request.method(), body: request.postData(), headers: request.headers() });
  let status = 200;
  const response = { code: 0, data: null, msg: 'ok' };
  const headers = {};
  if (path === '/auth/refresh') {
    refreshCalls += 1;
    await new Promise(resolve => setTimeout(resolve, 80));
    if (mode === 'anonymous' || mode === 'refresh-fail') {
      status = 401;
      response.code = 401;
    } else response.data = { accessToken: 'fresh-token', tokenType: 'Bearer', expiresIn: 300, tenantId: 0 };
  } else if (path === '/auth/login') {
    response.data = { accessToken: 'login-token', tokenType: 'Bearer', expiresIn: 300, tenantId: 0 };
    headers['Set-Cookie'] = 'refresh_token=test-cookie; Path=/; HttpOnly; SameSite=Lax';
  } else if (path === '/auth/logout') {
    headers['Set-Cookie'] = 'refresh_token=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0';
  } else if (path === '/auth/user/info') {
    response.data = {
      id: 1,
      username: 'test-admin',
      nickname: 'test',
      roles: ['super_admin'],
      permissions: ['*:*:*'],
      roleNames: [],
      gender: 1
    };
  } else if (path === '/auth/user/route' || path === '/system/common/dict/option/site') {
    response.data = [];
  } else if (path === '/captcha/image') {
    response.data = { isEnabled: false };
  } else if (path.startsWith('/test-')) {
    hits.set(path, (hits.get(path) || 0) + 1);
    if (mode === 'retry-fail' || request.headers().authorization === 'Bearer old-token') {
      status = path.includes('http') ? 401 : 200;
      response.code = 401;
    } else response.data = { ok: true };
  } else if (path === '/user/profile/avatar') {
    response.data = { avatar: '/avatar.png' };
  }
  await route.fulfill({ status, headers, contentType: 'application/json', body: JSON.stringify(response) });
});

async function load() {
  await page.goto(`${process.env.TEST_BASE_URL || 'http://localhost:9527'}/login`);
  await page.waitForFunction(() => document.querySelector('#app')?.hasAttribute('data-v-app'));
  await page.evaluate(async () => {
    window.repair = {
      auth: await import('/src/store/modules/auth/shared.ts'),
      request: (await import('/src/service/request/index.ts')).request,
      store: (await import('/src/store/modules/auth/index.ts')).useAuthStore(),
      users: await import('/src/service/api/system/user.ts'),
      tenants: await import('/src/service/api/system/tenant.ts')
    };
  });
}

try {
  await load();
  assert.equal(refreshCalls, 1, 'anonymous initialization attempts refresh only once');
  await page.evaluate(() =>
    window.repair.store.login({ authType: 'ACCOUNT', username: 'test-admin', password: 'Test123!', clientId: '' })
  );
  const login = requests.find(request => request.path === '/auth/login');
  assert.notEqual(JSON.parse(login.body).password, 'Test123!');
  assert.equal(await page.evaluate(() => window.repair.auth.getToken()), 'login-token');
  assert.equal(await page.evaluate(() => localStorage.getItem('token')), null);
  assert.equal(await page.evaluate(() => document.cookie.includes('refresh_token')), false);

  mode = 'normal';
  let before = refreshCalls;
  const concurrent = await page.evaluate(async () => {
    window.repair.auth.setAccessSession({ accessToken: 'old-token', tenantId: 0 });
    const results = await Promise.all([
      window.repair.request({ url: '/test-http-one' }),
      window.repair.request({ url: '/test-business-two' }),
      window.repair.request({ url: '/test-http-three', method: 'post', data: { value: 1 } })
    ]);
    return results.every(result => !result.error && result.data.ok);
  });
  assert.equal(concurrent, true);
  assert.equal(refreshCalls - before, 1, 'concurrent 401 responses share one refresh');
  for (const path of ['/test-http-one', '/test-business-two', '/test-http-three']) assert.equal(hits.get(path), 2);
  assert.ok(
    requests.find(request => request.path === '/auth/refresh' && request.headers.cookie?.includes('refresh_token'))
  );
  assert.equal(await page.evaluate(() => window.repair.store.token), 'fresh-token');

  mode = 'retry-fail';
  before = refreshCalls;
  const bounded = await page.evaluate(async () => {
    window.repair.auth.setAccessSession({ accessToken: 'old-token' });
    const result = await window.repair.request({ url: '/test-http-bounded' });
    return { failed: Boolean(result.error), token: window.repair.auth.getToken() };
  });
  assert.deepEqual(bounded, { failed: true, token: '' });
  assert.equal(refreshCalls - before, 1);
  assert.equal(hits.get('/test-http-bounded'), 2, 'retried 401 must stop');

  mode = 'refresh-fail';
  const failed = await page.evaluate(async () => {
    window.repair.auth.setAccessSession({ accessToken: 'old-token' });
    const result = await window.repair.request({ url: '/test-business-fail' });
    return { failed: Boolean(result.error), token: window.repair.auth.getToken() };
  });
  assert.deepEqual(failed, { failed: true, token: '' });
  assert.equal(hits.get('/test-business-fail'), 1);

  mode = 'normal';
  const late = await page.evaluate(async () => {
    window.repair.auth.setAccessSession({ accessToken: 'old-token' });
    const pending = window.repair.request({ url: '/test-http-late' });
    setTimeout(() => window.repair.auth.clearAuthStorage(), 20);
    const result = await pending;
    return { failed: Boolean(result.error), token: window.repair.auth.getToken() };
  });
  assert.deepEqual(late, { failed: true, token: '' });
  assert.equal(hits.get('/test-http-late'), 1, 'logout must prevent stale refresh retry');

  await load();
  assert.equal(await page.evaluate(() => window.repair.auth.getToken()), 'fresh-token');
  assert.equal(await page.evaluate(() => window.repair.store.userInfo.id), 1);
  await page.evaluate(async () => {
    const { users, tenants } = window.repair;
    await users.fetchUpdateUserProfile({ nickname: 'test-name', gender: 2 });
    await users.fetchUpdateUserPassword({ oldPassword: 'Old123!', newPassword: 'New123!' });
    await users.fetchUpdateUserEmail({ email: 'test@example.com', captcha: '123456', oldPassword: 'Old123!' });
    await users.fetchUpdateUserPhone({ phone: '13800138000', captcha: '123456', oldPassword: 'Old123!' });
    const avatar = new FormData();
    avatar.append('avatarFile', new Blob(['avatar'], { type: 'image/png' }), 'avatar.png');
    const result = await users.fetchUpdateUserAvatar(avatar);
    if (result.data.avatar !== '/avatar.png') throw new Error('avatar URL was lost');
    await tenants.fetchResetTenantAdminPwd(9, 'Tenant123!');
  });
  for (const path of [
    '/user/profile/basic/info',
    '/user/profile/password',
    '/user/profile/email',
    '/user/profile/phone',
    '/user/profile/avatar'
  ]) {
    assert.equal(requests.find(request => request.path === path)?.method, 'PATCH');
  }
  const password = JSON.parse(requests.find(request => request.path === '/user/profile/password').body);
  assert.notEqual(password.oldPassword, 'Old123!');
  assert.notEqual(password.newPassword, 'New123!');
  for (const kind of ['email', 'phone']) {
    const body = JSON.parse(requests.find(request => request.path === `/user/profile/${kind}`).body);
    assert.equal(body.captcha, '123456');
    assert.equal(typeof body.oldPassword, 'string');
    assert.notEqual(body.oldPassword, 'Old123!');
  }
  assert.match(requests.find(request => request.path === '/user/profile/avatar').body, /name="avatarFile"/);
  const tenant = JSON.parse(requests.find(request => request.path === '/tenant/management/9/admin/pwd').body);
  assert.deepEqual(Object.keys(tenant), ['password']);
  assert.equal(typeof tenant.password, 'string');
  assert.notEqual(tenant.password, 'Tenant123!');

  await page.evaluate(() => window.repair.store.logout());
  assert.equal(await page.evaluate(() => window.repair.auth.getToken()), '');
  assert.equal(
    (await context.cookies()).some(cookie => cookie.name === 'refresh_token'),
    false
  );
  assert.deepEqual(errors, []);
  console.log(
    'PASS: login, memory-only token, cookie credentials, concurrent HTTP/business 401, bounded retry, refresh failure, stale response, reload, profile/tenant contracts, logout'
  );
} finally {
  await browser.close();
}
