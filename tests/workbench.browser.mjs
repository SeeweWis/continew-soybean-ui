import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdir } from 'node:fs/promises';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({ headless: true, executablePath: process.env.BROWSER_EXECUTABLE });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = [];
let signedIn = false;
page.on('pageerror', error => errors.push(error.message));
await page.route('**/dev-api/**', async route => {
  const path = new URL(route.request().url()).pathname.replace('/dev-api', '');
  let data = [];
  let status = 200;
  if (path === '/auth/refresh') {
    if (signedIn) data = { accessToken: 'workbench-test', tokenType: 'Bearer', expiresIn: 300, tenantId: 0 };
    else status = 401;
  } else if (path === '/auth/user/info') {
    data = {
      id: 1,
      username: 'workbench-test',
      nickname: '测试用户',
      roles: ['super_admin'],
      permissions: ['*:*:*'],
      roleNames: []
    };
  } else if (path === '/auth/user/route') {
    data = [
      {
        path: '/system',
        component: 'Layout',
        title: '系统管理',
        sort: 1,
        children: [{ path: '/system/file', component: 'system/file/index', title: '文件管理', sort: 1 }]
      }
    ];
  } else if (path === '/captcha/image') data = { isEnabled: false };
  else if (path === '/system/common/dict/option/site') {
    data = [{ label: 'SITE_TITLE', value: '工作台测试' }];
  } else if (path === '/system/file') data = { list: [], total: 0 };
  else if (path === '/system/file/statistics') data = { size: 0, number: 0, data: [] };
  await route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify({ code: status === 401 ? 401 : 0, data, msg: 'ok' })
  });
});

async function attachState() {
  await page.waitForFunction(() => document.querySelector('#app')?.hasAttribute('data-v-app'));
  await page.evaluate(async () => {
    const source = await (await fetch('/src/hooks/common/echarts.ts')).text();
    const echarts = await import(source.match(/import \* as echarts from "([^"]+)"/)[1]);
    window.workbenchTest = {
      echarts,
      router: (await import('/src/router/index.ts')).router,
      routes: (await import('/src/store/modules/route/index.ts')).useRouteStore(),
      tabs: (await import('/src/store/modules/tab/index.ts')).useTabStore(),
      theme: (await import('/src/store/modules/theme/index.ts')).useThemeStore(),
      app: (await import('/src/store/modules/app/index.ts')).useAppStore()
    };
  });
}

async function checkCharts() {
  await page.waitForFunction(() => document.querySelectorAll('.chart-example canvas').length === 4);
  await page.waitForFunction(() =>
    [...document.querySelectorAll('.chart-example')].every(
      el => window.workbenchTest.echarts.getInstanceByDom(el)?.getWidth() > 0
    )
  );
  await page.waitForTimeout(1200);
  const charts = await page.locator('.chart-example').evaluateAll(elements =>
    elements.map(el => {
      const chart = window.workbenchTest.echarts.getInstanceByDom(el);
      const canvas = el.querySelector('canvas');
      const pixels = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
      let painted = 0;
      for (let i = 3; i < pixels.length; i += 4) if (pixels[i] > 0) painted += 1;
      return { type: chart.getOption().series[0].type, painted, width: chart.getWidth(), elementWidth: el.clientWidth };
    })
  );
  assert.deepEqual(
    charts.map(chart => chart.type),
    ['bar', 'line', 'pie', 'heatmap']
  );
  charts.forEach(chart => {
    assert(chart.painted > 500, `${chart.type} canvas is painted`);
    assert(Math.abs(chart.width - chart.elementWidth) <= 1, `${chart.type} resizes to its container`);
  });
}

try {
  const baseUrl = process.env.TEST_BASE_URL || 'http://localhost:9527';
  await page.goto(`${baseUrl}/workbench/charts`);
  await page.waitForURL(url => url.pathname === '/login' && url.searchParams.get('redirect') === '/workbench/charts');
  assert.equal(await page.locator('.chart-example').count(), 0, 'charts require login');
  signedIn = true;
  await page.goto(`${baseUrl}/`);
  await page.waitForURL('**/home');
  await page.locator('.workplace-grid').waitFor();
  await attachState();
  const menu = await page.evaluate(() =>
    window.workbenchTest.routes.menus.map(item => ({
      key: item.key,
      label: item.label,
      children: item.children?.map(child => child.key)
    }))
  );
  assert.deepEqual(menu[0], { key: 'workbench', label: '工作台', children: ['workbench_home', 'workbench_charts'] });
  assert.equal(menu.filter(item => item.key === 'home').length, 0);
  assert(
    menu.some(item => item.key === 'system'),
    'server menus remain available'
  );
  assert.equal(await page.evaluate(() => window.workbenchTest.tabs.homeTab.routeKey), 'workbench_home');
  assert.equal(await page.evaluate(() => window.workbenchTest.tabs.homeTab.routePath), '/home');
  assert.deepEqual(await page.evaluate(() => window.workbenchTest.routes.breadcrumbs.map(item => item.label)), [
    '工作台',
    '首页'
  ]);

  await page.locator('.n-menu').getByText('仪表盘', { exact: true }).first().click();
  await page.waitForURL('**/workbench/charts');
  await checkCharts();
  assert.deepEqual(await page.evaluate(() => window.workbenchTest.routes.breadcrumbs.map(item => item.label)), [
    '工作台',
    '仪表盘'
  ]);
  assert.deepEqual(await page.evaluate(() => window.workbenchTest.routes.getSelectedMenuKeyPath('workbench_charts')), [
    'workbench',
    'workbench_charts'
  ]);
  assert.equal(
    await page.evaluate(() => window.workbenchTest.tabs.tabs.filter(tab => tab.routeKey === 'workbench_charts').length),
    1
  );
  const artifacts =
    process.env.FILE_TEST_ARTIFACTS ||
    'C:/Users/seewe/.codex/visualizations/2026/10/10/01a12551-98bc-7fd2-a88f-75adae386ada';
  await mkdir(artifacts, { recursive: true });
  await page.screenshot({ path: `${artifacts}/workbench-charts-desktop.png` });

  await page.evaluate(() => {
    const chart = window.workbenchTest.echarts.getInstanceByDom(document.querySelector('.chart-example'));
    chart.dispatchAction({ type: 'legendToggleSelect', name: '图片' });
  });
  assert.equal(
    await page.evaluate(
      () =>
        window.workbenchTest.echarts.getInstanceByDom(document.querySelector('.chart-example')).getOption().legend[0]
          .selected['图片']
    ),
    false
  );
  await page.evaluate(() => window.workbenchTest.theme.setThemeScheme('dark'));
  await checkCharts();
  await page.screenshot({ path: `${artifacts}/workbench-charts-dark.png` });
  await page.evaluate(() => window.workbenchTest.theme.setThemeScheme('light'));
  await page.setViewportSize({ width: 375, height: 812 });
  await checkCharts();
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true);
  assert.equal(
    await page.locator('.chart-example').evaluateAll(elements =>
      elements.every(el => {
        const box = el.getBoundingClientRect();
        return box.left >= 0 && box.right <= window.innerWidth;
      })
    ),
    true,
    'mobile charts fit in the viewport'
  );
  const boxes = await page
    .locator('.chart-example')
    .evaluateAll(elements => elements.map(el => el.getBoundingClientRect().top));
  assert(
    boxes.every((top, index) => index === 0 || top > boxes[index - 1]),
    'mobile charts stack vertically'
  );
  await page.screenshot({ path: `${artifacts}/workbench-charts-mobile.png`, fullPage: true });
  await page.locator('.chart-example').last().scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${artifacts}/workbench-charts-mobile-bottom.png` });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.reload();
  await attachState();
  await checkCharts();
  await page.evaluate(() => window.workbenchTest.router.push('/workbench'));
  await page.waitForURL('**/home');
  await page.locator('.workplace-grid').waitFor();
  assert.equal(
    await page.evaluate(() => window.workbenchTest.tabs.tabs.filter(tab => tab.routePath === '/home').length),
    1
  );
  await page.evaluate(async () => {
    const { createStaticRoutes } = await import('/src/router/routes/index.ts');
    const routes = createStaticRoutes().authRoutes;
    if (routes.some(route => ['home', 'workbench'].includes(route.name)))
      throw new Error('Generated routes duplicate the injected workbench');
    window.workbenchTest.app.changeLocale('en-US');
  });
  await page.waitForFunction(() => window.workbenchTest.routes.menus[0].label === 'Workbench');
  assert.deepEqual(errors, []);
  console.log(
    'PASS: login guard, local workbench tree, original home, default redirect, breadcrumbs/tabs, server menus, four painted charts, legend, themes, responsive layout, refresh and locale'
  );
} finally {
  await browser.close();
}
