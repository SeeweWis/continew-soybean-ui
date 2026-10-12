import assert from 'node:assert/strict';
/* oxlint-disable eslint/no-underscore-dangle -- Mount real Vue components with the existing app context. */
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { mkdir, readFile } from 'node:fs/promises';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({ headless: true, executablePath: process.env.BROWSER_EXECUTABLE });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = [];
page.on('pageerror', error => errors.push(error.message));
const hits = [];
const modes = {
  pageError: false,
  configError: false,
  statisticsError: false,
  statisticsData: { size: 65536, number: 2, data: [{ type: 3, size: 65536, number: 1 }] },
  partFailed: false,
  initDelay: 0,
  partDelay: 0,
  normalDelay: 0
};
const sessions = new Map();
let uploadIndex = 0;
const files = [
  { id: '1', type: 0, name: 'reports', originalName: '项目资料', parentPath: '/' },
  {
    id: '2',
    type: 3,
    name: 'guide.docx',
    originalName: '使用说明.docx',
    extension: 'docx',
    size: 65536,
    storageName: '本地存储',
    updateTime: '2026-10-12 09:00:00',
    url: '/sample.docx'
  }
];
await page.route('**/dev-api/**', async route => {
  const url = new URL(route.request().url());
  const path = url.pathname.replace('/dev-api', '');
  hits.push({
    path,
    method: route.request().method(),
    query: Object.fromEntries(url.searchParams),
    sorts: url.searchParams.getAll('sort'),
    body: route.request().postData()
  });
  let data = [];
  let code = 0;
  if (path === '/captcha/image') data = { isEnabled: false };
  else if (path === '/system/file/statistics') {
    data = modes.statisticsData;
    if (modes.statisticsError) code = 500;
  } else if (path === '/system/file/upload/config/default') {
    data = { storageType: 1, multipartUploadThreshold: 10, multipartUploadPartSize: 4, multipartTempDir: 'D:/tmp' };
    if (modes.configError) code = 500;
  } else if (path === '/system/file' || path === '/system/file/recycle') {
    data = { list: files, total: files.length };
    if (modes.pageError) code = 500;
  } else if (/\/dir\/.*\/size$/.test(path)) data = { size: 12345 };
  else if (path === '/system/multipart-upload/init') {
    const input = JSON.parse(route.request().postData());
    const uploadId = `upload-${++uploadIndex}`;
    sessions.set(uploadId, input);
    data = {
      uploadId,
      path: '/uploads/test',
      partSize: 5,
      uploadedPartNumbers: input.fileName === 'resume.bin' ? [1] : []
    };
    if (modes.initDelay) await new Promise(resolve => setTimeout(resolve, modes.initDelay));
  } else if (path === '/system/multipart-upload/part') {
    const input = sessions.get(url.searchParams.get('uploadId'));
    const partNumber = Number(url.searchParams.get('partNumber'));
    const body = route.request().postDataBuffer();
    const bytes = body.subarray(body.indexOf('\r\n\r\n') + 4, body.lastIndexOf('\r\n--'));
    assert.equal(bytes.length, Math.min(5, input.fileSize - (partNumber - 1) * 5), 'server partSize is authoritative');
    data = { partNumber, partSize: bytes.length, success: true };
    if (input.fileName === 'fail.bin' && !modes.partFailed) {
      modes.partFailed = true;
      data = { ...data, success: false, errorMessage: '模拟分片失败' };
    }
    if (modes.partDelay && partNumber > 1) await new Promise(resolve => setTimeout(resolve, modes.partDelay));
  } else if (path === '/system/file/upload') {
    if (modes.normalDelay) await new Promise(resolve => setTimeout(resolve, modes.normalDelay));
    data = { id: 'uploaded', url: '/uploaded.txt' };
  } else if (path.includes('/upload/progress/'))
    data = { status: 'UPLOADING', percentage: 67, bytesRead: 4, totalBytes: 6 };
  else if (path.startsWith('/system/common/dict/'))
    data = [
      { value: 0, label: '文件夹' },
      { value: 3, label: '文档' }
    ];
  try {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ code, data, msg: code ? '模拟加载失败' : 'ok' })
    });
  } catch {
    /* Aborted upload requests may already be closed. */
  }
});
try {
  await page.goto(`${process.env.TEST_BASE_URL || 'http://localhost:9527'}/login`);
  await page.waitForFunction(() => document.querySelector('#app')?.hasAttribute('data-v-app'));
  await page.addStyleTag({ content: '#__vue-devtools-container__ {display:none!important} #app {visibility:hidden}' });
  await page.evaluate(async () => {
    const { h, render, provide, reactive, ref } = await import('/node_modules/.vite/deps/vue.js');
    const source = await (await fetch('/src/views/system/file/index.vue')).text();
    const scriptUrl = source.match(/import _sfc_main from "([^"]+)"/)[1];
    const script = await (await fetch(scriptUrl)).text();
    const routerModule = script.match(/from "([^"]*vue-router[^"]*)"/)[1];
    const { routerKey, routeLocationKey } = await import(routerModule);
    const { NConfigProvider, darkTheme, zhCN, dateZhCN } = await import(source.match(/from "([^"]*naive-ui[^"]*)"/)[1]);
    const { useAuthStore } = await import('/src/store/modules/auth/index.ts');
    const auth = useAuthStore();
    auth.token = 'mock-file-token';
    auth.userInfo.permissions = ['*:*:*'];
    const { default: FileManager } = await import('/src/views/system/file/index.vue');
    const container = document.createElement('div');
    container.id = 'file-test';
    container.style.cssText = 'position:fixed;inset:0;z-index:100;background:#f2f3f5;padding:14px;display:flex';
    document.body.append(container);
    const mockRoute = reactive({ query: {} });
    const dark = ref(false);
    const themeOverrides = ref();
    let manager;
    const node = h({
      setup() {
        provide(routeLocationKey, mockRoute);
        provide(routerKey, {
          replace: ({ query }) => {
            mockRoute.query = query;
            return Promise.resolve();
          }
        });
        return () =>
          h(
            NConfigProvider,
            {
              locale: zhCN,
              dateLocale: dateZhCN,
              theme: dark.value ? darkTheme : null,
              themeOverrides: themeOverrides.value,
              style: 'display:flex;flex:1;min-width:0'
            },
            {
              default: () => {
                manager = h(FileManager);
                return manager;
              }
            }
          );
      }
    });
    node.appContext = document.querySelector('#app').__vue_app__._context;
    render(node, container);
    window.fileTest = { node, auth, dark, themeOverrides, mockRoute, state: () => manager.component.setupState };
  });
  await page.locator('.file-sidebar').getByText('文件类型', { exact: true }).waitFor();
  await page.getByRole('button', { name: '回收站', exact: true }).waitFor();
  await page.locator('.file-grid').getByText('项目资料', { exact: true }).waitFor();
  const artifacts =
    process.env.FILE_TEST_ARTIFACTS ||
    'C:/Users/seewe/.codex/visualizations/2026/10/10/01a12551-98bc-7fd2-a88f-75adae386ada';
  await mkdir(artifacts, { recursive: true });
  await page.waitForFunction(() => !window.fileTest.state().loading);
  const statistics = page.locator('.file-statistics');
  const normalStatistics = modes.statisticsData;
  for (const emptyStatistics of [{}, { size: 0, number: 0 }, { size: null, number: null, data: null }]) {
    modes.statisticsData = emptyStatistics;
    await page.evaluate(() => window.fileTest.state().statistics.refresh());
    await page.waitForFunction(
      () => {
        const values = [...document.querySelectorAll('.statistics-total strong')].map(el => el.textContent);
        return values[0] === '0 B' && values[1] === '0';
      },
      undefined,
      { timeout: 5000 }
    );
    assert.equal(await statistics.locator('.n-spin-body--blur').count(), 0, 'empty statistics stop loading');
    assert.equal(await statistics.locator('.statistics-chart').isVisible(), false);
    assert.deepEqual(errors, [], 'empty responses render without exceptions');
  }
  modes.statisticsError = true;
  await page.evaluate(() => window.fileTest.state().statistics.refresh());
  await statistics.getByRole('button', { name: '统计加载失败，重试', exact: true }).waitFor();
  assert.equal(await statistics.locator('.n-spin-body--blur').count(), 0, 'failed statistics stop loading');
  modes.statisticsError = false;
  modes.statisticsData = normalStatistics;
  await statistics.getByRole('button', { name: '统计加载失败，重试', exact: true }).click();
  await statistics.locator('.statistics-total strong').getByText('64.00 KB', { exact: true }).waitFor();
  assert.equal(await statistics.locator('.statistics-total strong').nth(1).textContent(), '2');
  await statistics.locator('.chart canvas').waitFor();
  assert.equal(await statistics.locator('.statistics-chart').isVisible(), true);
  assert.equal(await statistics.getByRole('button', { name: '统计加载失败，重试', exact: true }).count(), 0);
  await page.evaluate(() => {
    window.fileTest.themeOverrides.value = { common: { primaryColor: '#d03050', heightMedium: '38px' } };
  });
  await page.waitForFunction(() => window.fileTest.state().theme.primaryColor === '#d03050');
  assert.equal(
    await page.getByRole('button', { name: '上传文件', exact: true }).evaluate(el => el.getBoundingClientRect().height),
    38
  );
  await page.evaluate(() => {
    window.fileTest.themeOverrides.value = undefined;
  });
  await page.waitForTimeout(1100);
  assert.equal(
    await page.getByRole('button', { name: '上传文件', exact: true }).locator('svg').count(),
    1,
    'toolbar icon is bundled'
  );
  await page.screenshot({ path: `${artifacts}/file-current-page.png` });
  assert.equal(await page.locator('.file-sidebar').evaluate(el => el.getBoundingClientRect().width), 206);
  await page.locator('.categories-title').press('Enter');
  assert.equal(await page.locator('.file-sidebar').getByRole('button', { name: '图片', exact: true }).count(), 0);
  await page.locator('.categories-title').press('Enter');
  assert.equal(hits.find(hit => hit.path === '/system/file').query.parentPath, '/');
  const listRequest = hits.find(hit => hit.path === '/system/file');
  assert.deepEqual(listRequest.sorts, ['type,asc', 'updateTime,desc']);
  assert.equal(
    Object.keys(listRequest.query).some(key => key.startsWith('sort[')),
    false
  );
  await page.locator('.file-sidebar').getByRole('button', { name: '图片', exact: true }).click();
  await page.waitForFunction(() => window.fileTest.state().query.type === 2);
  assert.equal(hits.filter(hit => hit.path === '/system/file').at(-1).query.parentPath, undefined);
  assert.equal(await page.getByRole('button', { name: '新建文件夹', exact: true }).isDisabled(), true);
  await page.locator('.file-sidebar').getByRole('button', { name: '全部', exact: true }).click();
  await page.waitForFunction(() => window.fileTest.state().query.parentPath === '/');
  await page.getByRole('button', { name: '项目资料', exact: true }).dblclick();
  await page.waitForFunction(() => window.fileTest.state().query.parentPath === '/reports');
  await page.locator('.file-breadcrumb').getByText('项目资料', { exact: true }).waitFor();
  await page.locator('.file-breadcrumb').getByText('根目录', { exact: true }).click();
  await page.getByRole('button', { name: '新建文件夹', exact: true }).click();
  await page.locator('.name-dialog').getByRole('button', { name: '确定', exact: true }).click();
  await page.locator('.name-dialog .n-form-item-feedback__line').getByText('请输入名称', { exact: true }).waitFor();
  await page.locator('.name-dialog input').fill('新资料');
  await page.locator('.name-dialog').getByRole('button', { name: '确定', exact: true }).click();
  await page.locator('.name-dialog').waitFor({ state: 'hidden' });
  assert.deepEqual(JSON.parse(hits.find(hit => hit.path === '/system/file/dir').body), {
    originalName: '新资料',
    parentPath: '/'
  });
  await page.getByRole('button', { name: '使用说明.docx', exact: true }).click({ button: 'right' });
  await page.locator('.n-dropdown-option-body:visible').getByText('重命名', { exact: true }).click();
  await page.locator('.name-dialog input').fill('改名.docx');
  await page.locator('.name-dialog').getByRole('button', { name: '确定', exact: true }).click();
  await page.locator('.name-dialog').waitFor({ state: 'hidden' });
  assert.deepEqual(JSON.parse(hits.find(hit => hit.path === '/system/file/2' && hit.method === 'PUT').body), {
    originalName: '改名.docx'
  });
  await page.getByRole('button', { name: '项目资料', exact: true }).click({ button: 'right' });
  await page.locator('.n-dropdown-option-body:visible').getByText('详情', { exact: true }).click();
  await page.locator('.detail-dialog').getByText('项目资料', { exact: true }).waitFor();
  await page.locator('.detail-dialog').getByRole('button', { name: '计算', exact: true }).click();
  await page.locator('.detail-dialog').getByText('12.06 KB', { exact: true }).waitFor();
  assert(hits.some(hit => hit.path === '/system/file/dir/1/size'));
  await page.locator('.detail-dialog .n-card-header__close').click();
  await page.getByRole('button', { name: '批量操作', exact: true }).click();
  await page.getByRole('button', { name: '使用说明.docx', exact: true }).press('Enter');
  await page.getByRole('button', { name: '列表视图', exact: true }).click();
  assert.deepEqual(await page.evaluate(() => window.fileTest.state().selected), ['2']);
  await page.screenshot({ path: `${artifacts}/file-current-list.png` });
  await page.getByRole('button', { name: '批量删除', exact: true }).click();
  await page.locator('.n-dialog').getByRole('button', { name: '确定', exact: true }).click();
  await page.getByRole('button', { name: '批量操作', exact: true }).waitFor();
  assert.deepEqual(JSON.parse(hits.find(hit => hit.path === '/system/file' && hit.method === 'DELETE').body), {
    ids: ['2']
  });
  await page.getByRole('button', { name: '回收站', exact: true }).click();
  await page.locator('.recycle-dialog').getByText('文档', { exact: true }).waitFor();
  const recycleRequest = hits.find(hit => hit.path === '/system/file/recycle');
  assert.deepEqual(recycleRequest.sorts, ['updateTime,desc']);
  assert.equal(
    Object.keys(recycleRequest.query).some(key => key.startsWith('sort[')),
    false
  );
  await page.screenshot({ path: `${artifacts}/file-current-recycle.png` });
  for (const [action, endpoint] of [
    ['还原', '/system/file/recycle/restore/1'],
    ['删除', '/system/file/recycle/1'],
    ['清空回收站', '/system/file/recycle/clean']
  ]) {
    await page.locator('.recycle-dialog').getByRole('button', { name: action, exact: true }).first().click();
    await page.locator('.n-dialog').getByRole('button', { name: '确定', exact: true }).click();
    await page.waitForTimeout(600);
    assert(hits.some(hit => hit.path === endpoint));
  }
  await page.evaluate(() => {
    window.fileTest.auth.userInfo.permissions = ['system:fileRecycle:list'];
  });
  assert.equal(
    await page.locator('.recycle-dialog').getByRole('button', { name: '清空回收站', exact: true }).count(),
    0
  );
  assert.equal(await page.locator('.recycle-dialog').getByRole('button', { name: '还原', exact: true }).count(), 0);
  await page.locator('.recycle-dialog .n-card-header__close').click();
  await page.evaluate(() => {
    window.fileTest.auth.userInfo.permissions = ['*:*:*'];
  });
  modes.pageError = true;
  await page.getByRole('button', { name: '查询', exact: true }).click();
  await page.getByText('文件加载失败', { exact: false }).waitFor();
  modes.pageError = false;
  await page.locator('.file-main').getByRole('button', { name: '重试', exact: true }).click();
  await page.locator('.file-list-name').getByText('使用说明.docx', { exact: true }).waitFor();
  modes.configError = true;
  await page.getByRole('button', { name: '上传文件', exact: true }).click();
  await page.locator('.upload-dialog').getByText('上传配置加载失败', { exact: false }).waitFor();
  modes.configError = false;
  await page.locator('.upload-dialog').getByRole('button', { name: '重试', exact: true }).click();
  await page.locator('.upload-policy-grid').waitFor();
  await page.screenshot({ path: `${artifacts}/file-current-upload.png` });
  const input = page.locator('.upload-dialog input[type=file]').first();
  await input.setInputFiles([
    { name: 'single.txt', mimeType: 'text/plain', buffer: Buffer.from('abc') },
    { name: 'resume.bin', mimeType: 'application/octet-stream', buffer: Buffer.from('abcdefghijklmnopq') },
    { name: 'fail.bin', mimeType: 'application/octet-stream', buffer: Buffer.from('abcdefghijklmnopq') }
  ]);
  await page.locator('.upload-dialog').getByRole('button', { name: '开始上传', exact: true }).click();
  const taskRow = name => page.locator('.upload-dialog tbody tr').filter({ hasText: name });
  await taskRow('single.txt').getByText('已完成', { exact: true }).waitFor();
  await taskRow('resume.bin').getByText('已完成', { exact: true }).waitFor();
  await taskRow('fail.bin').getByText('模拟分片失败', { exact: true }).waitFor();
  const init = hits.filter(hit => hit.path.endsWith('/init')).map(hit => JSON.parse(hit.body));
  assert.equal(init[0].fileMd5, createHash('md5').update('abcdefghijklmnopq').digest('hex'));
  const resumeId = [...sessions].find(([, value]) => value.fileName === 'resume.bin')[0];
  assert.deepEqual(
    hits
      .filter(hit => hit.path.endsWith('/part') && hit.query.uploadId === resumeId)
      .map(hit => Number(hit.query.partNumber)),
    [2, 3, 4]
  );
  await taskRow('fail.bin').getByRole('button', { name: '重试', exact: true }).click();
  await taskRow('fail.bin').getByText('已完成', { exact: true }).waitFor();
  assert.equal(hits.filter(hit => hit.path.endsWith('/init')).length, 2, 'retry reuses the existing session');
  await page.evaluate(() => {
    const folderInput = document.querySelector('.upload-dialog input[webkitdirectory]');
    const file = new File(['abc'], 'nested.txt');
    Object.defineProperty(file, 'webkitRelativePath', { value: '目录/子目录/nested.txt' });
    const transfer = new DataTransfer();
    transfer.items.add(file);
    folderInput.files = transfer.files;
    folderInput.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await page.locator('.upload-dialog').getByRole('button', { name: '开始上传', exact: true }).click();
  await taskRow('nested.txt').getByText('已完成', { exact: true }).waitFor();
  assert.equal(hits.filter(hit => hit.path === '/system/file/upload').at(-1).query.parentPath, '/目录/子目录');
  modes.partDelay = 800;
  await input.setInputFiles({
    name: 'pause.bin',
    mimeType: 'application/octet-stream',
    buffer: Buffer.from('abcdefghijklmnopq')
  });
  await taskRow('pause.bin').getByRole('button', { name: '开始', exact: true }).click();
  await taskRow('pause.bin').getByRole('button', { name: '暂停', exact: true }).waitFor();
  await taskRow('pause.bin').getByText('29%', { exact: false }).waitFor();
  await taskRow('pause.bin').getByRole('button', { name: '暂停', exact: true }).click();
  await taskRow('pause.bin').getByText('已暂停', { exact: true }).waitFor();
  modes.partDelay = 0;
  await taskRow('pause.bin').getByRole('button', { name: '继续', exact: true }).click();
  await taskRow('pause.bin').getByText('已完成', { exact: true }).waitFor();
  assert.equal([...sessions.values()].filter(item => item.fileName === 'pause.bin').length, 1);
  const pausedId = [...sessions].find(([, value]) => value.fileName === 'pause.bin')[0];
  assert.equal(
    hits.filter(hit => hit.path.endsWith('/part') && hit.query.uploadId === pausedId && hit.query.partNumber === '1')
      .length,
    1,
    'resume keeps completed parts'
  );
  modes.partDelay = 800;
  await input.setInputFiles({
    name: 'cancel.bin',
    mimeType: 'application/octet-stream',
    buffer: Buffer.from('abcdefghijklmnopq')
  });
  await taskRow('cancel.bin').getByRole('button', { name: '开始', exact: true }).click();
  await taskRow('cancel.bin').getByText('29%', { exact: false }).waitFor();
  await taskRow('cancel.bin').getByRole('button', { name: '取消', exact: true }).click();
  await taskRow('cancel.bin').getByText('已取消', { exact: true }).waitFor();
  const cancelledId = [...sessions].find(([, value]) => value.fileName === 'cancel.bin')[0];
  assert(hits.some(hit => hit.path === `/system/multipart-upload/cancel/${cancelledId}`));
  modes.partDelay = 0;
  modes.normalDelay = 1200;
  await input.setInputFiles({ name: 'normal.txt', mimeType: 'text/plain', buffer: Buffer.from('123456') });
  await taskRow('normal.txt').getByRole('button', { name: '开始', exact: true }).click();
  await taskRow('normal.txt').getByText('67%', { exact: false }).waitFor();
  await taskRow('normal.txt').getByRole('button', { name: '暂停', exact: true }).click();
  await taskRow('normal.txt').getByText('已暂停', { exact: true }).waitFor();
  modes.normalDelay = 0;
  await taskRow('normal.txt').getByRole('button', { name: '继续', exact: true }).click();
  await taskRow('normal.txt').getByText('已完成', { exact: true }).waitFor();
  modes.initDelay = 700;
  await input.setInputFiles({
    name: 'cancel-late.bin',
    mimeType: 'application/octet-stream',
    buffer: Buffer.from('abcdefghijklmnopq')
  });
  await taskRow('cancel-late.bin').getByRole('button', { name: '开始', exact: true }).click();
  while (![...sessions.values()].some(item => item.fileName === 'cancel-late.bin')) await page.waitForTimeout(50);
  await page.locator('.upload-dialog .n-card-header__close').click();
  await page.locator('.n-dialog').getByRole('button', { name: '确定', exact: true }).click();
  await page.locator('.upload-dialog').waitFor({ state: 'hidden' });
  await page.waitForTimeout(900);
  const lateId = [...sessions].find(([, value]) => value.fileName === 'cancel-late.bin')[0];
  assert(
    hits.some(hit => hit.path === `/system/multipart-upload/cancel/${lateId}`),
    'late init sessions are cleaned up'
  );
  assert.equal(hits.filter(hit => hit.path.endsWith('/part') && hit.query.uploadId === lateId).length, 0);
  await page.getByRole('button', { name: '网格视图', exact: true }).click();
  await page.evaluate(() => {
    window.fileTest.dark.value = true;
  });
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${artifacts}/file-current-dark.png` });
  await page.evaluate(() => {
    window.fileTest.dark.value = false;
  });
  await page.waitForTimeout(400);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: `${artifacts}/file-current-mobile.png` });
  assert.equal(await page.locator('.file-sidebar').isVisible(), false);
  assert(await page.locator('.file-main').evaluate(el => el.scrollWidth <= el.clientWidth));
  modes.initDelay = 0;
  await page.getByRole('button', { name: '上传文件', exact: true }).click();
  await page.locator('.upload-policy-grid').waitFor();
  await page.screenshot({ path: `${artifacts}/file-current-upload-mobile.png` });
  assert(await page.locator('.upload-dialog').evaluate(el => el.getBoundingClientRect().width <= innerWidth));
  await page.locator('.upload-dialog .n-card-header__close').click();
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.route('**/file-preview-fixtures/*', async route => {
    const extension = new URL(route.request().url()).pathname.split('.').at(-1);
    const fixture = await readFile(new URL(`./fixtures/file-preview/sample.${extension}`, import.meta.url));
    await route.fulfill({
      body: fixture,
      contentType: extension === 'pdf' ? 'application/pdf' : 'application/octet-stream'
    });
  });
  for (const extension of ['docx', 'xlsx', 'pdf']) {
    await page.evaluate(fixtureExtension => {
      window.fileTest.state().rows = [
        {
          id: fixtureExtension,
          type: 3,
          name: `sample.${fixtureExtension}`,
          originalName: `sample.${fixtureExtension}`,
          extension: fixtureExtension,
          url: `/file-preview-fixtures/sample.${fixtureExtension}`
        }
      ];
    }, extension);
    await page.getByRole('button', { name: `sample.${extension}`, exact: true }).click();
    await page.waitForFunction(
      () => !window.fileTest.state().preview || document.querySelector('.document-preview .n-spin-body--blur') === null,
      { timeout: 15000 }
    );
    if (extension === 'docx')
      await page.locator('.preview-dialog').getByText('ContiNew document preview fixture.', { exact: true }).waitFor();
    if (extension === 'xlsx' || extension === 'pdf') {
      await page.locator('.preview-dialog canvas').first().waitFor();
      await page.waitForTimeout(400);
      assert(
        await page
          .locator('.preview-dialog canvas')
          .first()
          .evaluate(canvas => {
            const pixels = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
            for (let i = 0; i < pixels.length; i += 4)
              if (pixels[i + 3] && pixels[i] < 100 && pixels[i + 1] < 100 && pixels[i + 2] < 100) return true;
            return false;
          }),
        `${extension} page contains rendered content`
      );
    }
    await page.screenshot({ path: `${artifacts}/file-preview-${extension}.png` });
    await page.locator('.preview-dialog .n-card-header__close').click();
  }
  await page.evaluate(() => {
    window.fileTest.state().rows = [
      { id: 'ppt', type: 3, name: 'slides.pptx', extension: 'pptx', url: '/slides.pptx' }
    ];
  });
  await page.getByRole('button', { name: 'slides.pptx', exact: true }).click();
  await page.getByText('此格式暂不支持在线预览', { exact: true }).waitFor();
  await page.locator('.preview-dialog').getByRole('button', { name: '下载文件', exact: true }).waitFor();
  await page.locator('.preview-dialog .n-card-header__close').click();
  await page.evaluate(() => {
    window.fileTest.state().rows = [
      { id: 'image', type: 2, name: 'image.svg', extension: 'svg', url: '/src/assets/file-icons/file-image-color.svg' }
    ];
  });
  await page.getByRole('button', { name: 'image.svg', exact: true }).click();
  await page.locator('.n-image-preview-container img').waitFor();
  await page.waitForFunction(() => {
    const image = document.querySelector('.n-image-preview-container img');
    return image?.complete && image.naturalWidth > 0;
  });
  await page.locator('.n-image-preview-overlay').click({ position: { x: 5, y: 5 } });
  await page.locator('.n-image-preview-container').waitFor({ state: 'hidden' });
  await page.evaluate(() => {
    window.fileTest.state().rows = [
      { id: 'video', type: 4, name: 'video.mp4', extension: 'mp4', url: '/invalid-video.mp4' }
    ];
  });
  await page.getByRole('button', { name: 'video.mp4', exact: true }).click();
  await page.locator('.preview-dialog .xgplayer').waitFor();
  await page.locator('.preview-dialog .n-card-header__close').click();
  await page.evaluate(() => {
    window.fileTest.state().rows = [
      { id: 'audio', type: 5, name: 'audio.mp3', extension: 'mp3', url: '/invalid-audio.mp3' }
    ];
  });
  await page.getByRole('button', { name: 'audio.mp3', exact: true }).click();
  await page.locator('.file-audio-player audio').waitFor();
  await page.locator('.file-audio-player .n-card-header__close').click();
  assert.deepEqual(errors, []);
  console.log(
    'PASS: empty/normal statistics and failure retry, layout, categories, folders, validation, rename, batch/view selection, recycle/permissions, load retry, single/batch/folder/multipart, MD5, server part sizes, resume, pause/cancel/retry, late-init cleanup, dark/mobile screenshots, DOCX/XLSX/PDF rendering, media players and unsupported-format fallback'
  );
} catch (error) {
  await page.screenshot({
    path: 'C:/Users/seewe/.codex/visualizations/2026/10/10/01a12551-98bc-7fd2-a88f-75adae386ada/file-test-failure.png'
  });
  console.error((await page.locator('body').innerText()).slice(-1500));
  console.error(
    await page.evaluate(() => ({
      query: window.fileTest?.state()?.query,
      mock: window.fileTest?.mockRoute,
      keys: Object.keys(window.fileTest?.state() || {}),
      route: window.fileTest?.state()?.route?.query,
      url: location.href
    }))
  );
  console.error(errors);
  throw error;
} finally {
  await browser.close();
}
