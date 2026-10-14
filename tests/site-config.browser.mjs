import assert from 'node:assert/strict';
/* oxlint-disable eslint/no-underscore-dangle -- Mount real Vue components with the existing app context. */
import { createRequire } from 'node:module';
import { mkdir, readFile } from 'node:fs/promises';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({ headless: true, executablePath: process.env.BROWSER_EXECUTABLE });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const errors = [];
const requests = [];
const svg = await readFile(new URL('../public/favicon.svg', import.meta.url));
const defaults = {
  SITE_LOGO: '/logo.svg',
  SITE_FAVICON: '/favicon.ico',
  SITE_TITLE: 'Site preview test',
  SITE_DESCRIPTION: 'Site description',
  SITE_COPYRIGHT: 'Site copyright',
  SITE_BEIAN: ''
};
let values = { ...defaults };
page.on('pageerror', error => errors.push(error.message));
await page.route('**/brand-fixtures/*.svg', route => route.fulfill({ contentType: 'image/svg+xml', body: svg }));
await page.route('**/dev-api/**', async route => {
  const request = route.request();
  const path = new URL(request.url()).pathname.replace('/dev-api', '');
  let data = [];
  let status = 200;
  if (path === '/captcha/image') data = { isEnabled: false };
  else if (path === '/auth/refresh') status = 401;
  else if (path === '/system/common/dict/option/site')
    data = Object.entries(values).map(([label, value]) => ({ label, value }));
  else if (path === '/system/option' && request.method() === 'GET')
    data = Object.entries(values).map(([code, value], index) => ({ id: index + 1, code, value, name: code }));
  else if (path === '/system/option' && request.method() === 'PUT') {
    const options = JSON.parse(request.postData());
    requests.push(options);
    values = Object.fromEntries(options.map(option => [option.code, option.value]));
    data = true;
  } else if (path === '/system/option/value') {
    values = { ...defaults };
    data = true;
  }
  await route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify({ code: status === 401 ? 401 : 0, data, msg: 'ok' })
  });
});

async function waitForImages() {
  await page.waitForFunction(
    () => {
      const images = [...document.querySelectorAll('#site-config-test .brand-preview img')];
      return images.length === 2 && images.every(image => image.complete && image.naturalWidth > 0);
    },
    undefined,
    { timeout: 5000 }
  );
}

try {
  await page.goto(`${process.env.TEST_BASE_URL || 'http://localhost:9527'}/login`);
  await page.waitForFunction(() => document.querySelector('#app')?.hasAttribute('data-v-app'));
  await page.addStyleTag({ content: '#__vue-devtools-container__ {display:none!important} #app {visibility:hidden}' });
  await page.evaluate(async () => {
    const { h, render } = await import('/node_modules/.vite/deps/vue.js');
    const { default: SiteConfig } = await import('/src/views/system/config/site/index.vue');
    const { useAuthStore } = await import('/src/store/modules/auth/index.ts');
    const { useAppStore } = await import('/src/store/modules/app/index.ts');
    const auth = useAuthStore();
    auth.token = 'site-test-token';
    auth.userInfo.permissions = ['system:siteConfig:update'];
    const container = document.createElement('div');
    container.id = 'site-config-test';
    container.style.cssText = 'position:fixed;inset:0;background:white;padding:24px;z-index:100;overflow:auto';
    document.body.append(container);
    const node = h(SiteConfig);
    node.appContext = document.querySelector('#app').__vue_app__._context;
    render(node, container);
    window.siteTest = { state: node.component.setupState, app: useAppStore(), auth };
  });
  await page.waitForFunction(() => window.siteTest.state.formModel.SITE_LOGO === '/logo.svg');
  await waitForImages();
  assert.equal(
    await page.locator('.logo-preview img').getAttribute('src'),
    await page.evaluate(() => window.siteTest.app.siteLogo)
  );
  assert.equal(await page.locator('.favicon-preview img').getAttribute('src'), '/favicon.svg');
  assert.equal(await page.locator('link[rel=icon]').getAttribute('href'), '/favicon.svg');
  const firstSave = page.waitForResponse(
    response => response.url().endsWith('/system/option') && response.request().method() === 'PUT'
  );
  await page.getByRole('button', { name: '保存', exact: true }).click();
  await firstSave;
  await page.waitForFunction(() => !window.siteTest.state.saveLoading && !window.siteTest.state.loading);
  assert.equal(requests[0].find(option => option.code === 'SITE_LOGO').value, '/logo.svg');
  assert.equal(requests[0].find(option => option.code === 'SITE_FAVICON').value, '/favicon.ico');

  values = { ...defaults, SITE_LOGO: '/brand-fixtures/logo.svg', SITE_FAVICON: '/brand-fixtures/favicon.svg' };
  await page.evaluate(() => window.siteTest.state.getOptions());
  await waitForImages();
  assert.equal(await page.locator('.logo-preview img').getAttribute('src'), '/brand-fixtures/logo.svg');
  assert.equal(await page.locator('.favicon-preview img').getAttribute('src'), '/brand-fixtures/favicon.svg');
  await page
    .locator('input[type=file]')
    .nth(0)
    .setInputFiles({ name: 'logo.svg', mimeType: 'image/svg+xml', buffer: svg });
  await page
    .locator('input[type=file]')
    .nth(1)
    .setInputFiles({ name: 'favicon.svg', mimeType: 'image/svg+xml', buffer: svg });
  await page.waitForFunction(() =>
    ['SITE_LOGO', 'SITE_FAVICON'].every(code =>
      window.siteTest.state.formModel[code].startsWith('data:image/svg+xml;base64,')
    )
  );
  await waitForImages();
  const secondSave = page.waitForResponse(
    response => response.url().endsWith('/system/option') && response.request().method() === 'PUT'
  );
  await page.getByRole('button', { name: '保存', exact: true }).click();
  await secondSave;
  await page.waitForFunction(() => !window.siteTest.state.saveLoading && !window.siteTest.state.loading);
  assert.equal(requests.length, 2);
  assert(
    requests[1]
      .filter(option => ['SITE_LOGO', 'SITE_FAVICON'].includes(option.code))
      .every(option => option.value.startsWith('data:image/svg+xml;base64,'))
  );
  assert.equal(
    await page.evaluate(() => window.siteTest.app.siteLogo),
    await page.locator('.logo-preview img').getAttribute('src')
  );
  assert.equal(
    await page.locator('link[rel=icon]').getAttribute('href'),
    await page.locator('.favicon-preview img').getAttribute('src')
  );

  await page.getByRole('button', { name: '恢复默认', exact: true }).click();
  await page.locator('.n-dialog').getByRole('button', { name: '确认', exact: true }).click();
  await page.locator('.n-dialog').waitFor({ state: 'hidden' });
  await page.waitForFunction(() => window.siteTest.state.formModel.SITE_LOGO === '/logo.svg');
  await waitForImages();
  assert.equal(await page.locator('link[rel=icon]').getAttribute('href'), '/favicon.svg');
  const artifacts =
    process.env.FILE_TEST_ARTIFACTS ||
    'C:/Users/seewe/.codex/visualizations/2026/10/10/01a12551-98bc-7fd2-a88f-75adae386ada';
  await mkdir(artifacts, { recursive: true });
  await page.screenshot({ path: `${artifacts}/site-config-previews.png` });
  await page.evaluate(() => {
    window.siteTest.auth.userInfo.permissions = [];
  });
  assert.equal(await page.getByRole('button', { name: '上传 Logo', exact: true }).isDisabled(), true);
  assert.equal(await page.getByRole('button', { name: '保存', exact: true }).count(), 0);
  assert.deepEqual(errors, []);
  console.log(
    'PASS: default/custom site images, Base64 upload/save, unchanged backend values, favicon synchronization, reset and permissions'
  );
} catch (error) {
  console.error(
    await page
      .locator('.brand-preview img')
      .evaluateAll(images => images.map(image => ({ src: image.src.slice(0, 120), naturalWidth: image.naturalWidth })))
  );
  console.error(errors);
  throw error;
} finally {
  await browser.close();
}
