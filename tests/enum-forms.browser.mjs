import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({ headless: true, executablePath: process.env.BROWSER_EXECUTABLE });
const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
const errors = [];
const requests = [];
const queries = [];
let failParse = true;
let failImport = true;
const clientRow = { id: '55', clientId: 'existing-client', clientType: 'PC', authType: ['PHONE'], activeTimeout: 1800,
  timeout: 86400, refreshTokenTimeout: 2592000, refreshTokenMode: 'BODY', isConcurrent: false,
  replacedRange: 'CURR_DEVICE_TYPE', maxLoginCount: 2, overflowLogoutMode: 'REPLACED', status: 2 };
const dicts = {
  gender_enum: [['未知', 0], ['男', 1], ['女', 2]],
  dis_enable_status_enum: [['启用', 1], ['禁用', 2]],
  storage_type_enum: [['本地存储', 1], ['对象存储', 2]],
  auth_type_enum: [['账号', 'ACCOUNT'], ['邮箱', 'EMAIL'], ['手机号', 'PHONE'], ['第三方账号', 'SOCIAL']],
  logout_mode_enum: [['注销下线', 'LOGOUT'], ['踢人下线', 'KICKOUT'], ['顶人下线', 'REPLACED']],
  replaced_range_enum: [['当前客户端类型', 'CURR_DEVICE_TYPE'], ['所有客户端类型', 'ALL_DEVICE_TYPE']],
  client_type: [['PC端', 'PC']],
  notice_type: [['通知', '1']],
  notice_scope_enum: [['所有人', 1], ['指定用户', 2]],
  notice_method_enum: [['系统消息', 1], ['登录弹窗', 2]],
  import_policy_enum: [['跳过该行', 1], ['修改数据', 2], ['停止导入', 3]],
  menu_type_enum: [['目录', 1], ['菜单', 2], ['按钮', 3]],
  data_scope_enum: [['全部', 1], ['本部门及以下', 2], ['本部门', 3], ['仅本人', 4], ['自定义', 5]],
  success_failure_status_enum: [['成功', 1], ['失败', 2]]
};
page.on('pageerror', error => errors.push(error.message));
await page.route('**/dev-api/**', async route => {
  const req = route.request();
  const path = new URL(req.url()).pathname.replace('/dev-api', '');
  if (req.method() !== 'GET') requests.push({ path, method: req.method(), body: req.postData() });
  else queries.push({ path, params: Object.fromEntries(new URL(req.url()).searchParams) });
  let data = [];
  let status = 200;
  let code = 0;
  if (path === '/auth/refresh') status = 401;
  else if (path === '/captcha/image') data = { isEnabled: false };
  else if (path.startsWith('/system/common/dict/')) {
    data = (dicts[path.split('/').at(-1)] || []).map(([label, value]) => ({ label, value }));
  } else if (path === '/system/user/dict') data = [{ label: '测试用户', value: '100' }];
  else if (path === '/system/client' && req.method() === 'GET') data = { list: [clientRow], total: 1 };
  else if (path === '/system/role/dict') data = [{ label: '测试角色', value: '7' }];
  else if (path === '/system/role/7' && req.method() === 'GET') data = { id: '7', name: '测试角色', code: 'test', dataScope: 1, deptIds: [] };
  else if (path === '/system/sms/log' && req.method() === 'GET') data = { list: [{ id: '11', status: 1, phone: '13800138000' }], total: 1 };
  else if (path === '/system/user/import/parse') {
    if (failParse) { failParse = false; code = 500; }
    data = { importKey: 'test-session', totalRows: 3, validRows: 3, duplicateUserRows: 1, duplicateEmailRows: 0, duplicatePhoneRows: 0 };
  } else if (path === '/system/user/import') {
    if (failImport) { failImport = false; code = 500; }
    data = { totalRows: 3, insertRows: 2, updateRows: 1 };
  }
  else if (path === '/system/option' && req.method() === 'GET') {
    data = ['LOGIN_CAPTCHA_ENABLED', 'MAIL_SSL_ENABLED', 'PASSWORD_ALLOW_CONTAIN_USERNAME', 'PASSWORD_REQUIRE_SYMBOLS']
      .map((code, index) => ({ id: index + 1, code, name: code, value: index === 3 ? '0' : '1' }));
  }
  await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify({ code: status === 401 ? 401 : code, data, msg: code ? 'mock failure' : 'ok' }) });
});

async function mount(path, props = {}) {
  await page.evaluate(async ({ path, props }) => {
    const { h, render, ref, nextTick } = await import('/node_modules/.vite/deps/vue.js');
    const { default: Component } = await import(path);
    const container = document.getElementById('enum-form-test');
    render(null, container);
    await nextTick();
    window.enumFormTest = { show: ref(false) };
    const node = h({
      setup() {
        return () => h(Component, { ...props, visible: window.enumFormTest.show.value,
          'onUpdate:visible': value => { window.enumFormTest.show.value = value; } });
      }
    });
    node.appContext = document.querySelector('#app').__vue_app__._context;
    render(node, container);
    window.enumFormTest.state = node.component.subTree.component.setupState;
  }, { path, props });
}

function item(label) {
  return page.locator('.n-form-item').filter({ has: page.locator('.n-form-item-label').getByText(label, { exact: true }) });
}

async function select(label, option) {
  await item(label).locator('.n-base-selection').click();
  await page.locator('.n-base-select-option__content:visible').getByText(option, { exact: true }).click();
  await item(label).locator('.n-form-item-label').click();
  await page.locator('.n-base-select-menu:visible').waitFor({ state: 'hidden' });
}

function payload(path) {
  return JSON.parse(requests.findLast(req => req.path === path).body);
}

try {
  await page.goto(`${process.env.TEST_BASE_URL || 'http://localhost:9527'}/login`);
  await page.waitForFunction(() => document.querySelector('#app')?.hasAttribute('data-v-app'));
  await page.addStyleTag({ content: '#__vue-devtools-container__ { display:none!important; }' });
  await page.evaluate(() => {
    const container = document.createElement('div');
    container.id = 'enum-form-test';
    container.style.cssText = 'position:fixed;inset:0;padding:16px;background:white;z-index:100;overflow:auto';
    document.body.append(container);
    document.querySelector('#app').__vue_app__.config.globalProperties.$router.push = async () => {};
  });

  await mount('/src/views/system/config/modules/storage-table.vue');
  await page.evaluate(() => window.enumFormTest.state.handleAdd());
  await item('存储类型').getByText('本地存储', { exact: true }).waitFor();
  await select('存储类型', '对象存储');
  await item('终端地址').waitFor();
  await select('存储类型', '本地存储');
  assert.equal(await item('终端地址').count(), 0);
  await item('存储路径').locator('input').fill('D:/uploads');
  if (process.env.SCREENSHOT_DIR) {
    await page.screenshot({ path: `${process.env.SCREENSHOT_DIR}/enum-storage-desktop.png` });
    await page.setViewportSize({ width: 390, height: 844 });
    const box = await page.locator('.n-modal').boundingBox();
    assert.ok(box.x >= 0 && box.x + box.width <= 390, 'storage modal fits mobile viewport');
    await page.screenshot({ path: `${process.env.SCREENSHOT_DIR}/enum-storage-mobile.png` });
    await page.setViewportSize({ width: 1280, height: 1000 });
  }
  await page.getByRole('button', { name: '保存', exact: true }).click();
  await page.waitForFunction(() => !window.enumFormTest.state.modalVisible);
  assert.equal(payload('/system/storage').type, 1);

  await mount('/src/views/system/config/modules/client-table.vue');
  await page.evaluate(() => window.enumFormTest.state.openAdd());
  await item('认证类型').getByText('账号', { exact: true }).waitFor();
  await select('认证类型', '邮箱');
  await item('允许并发登录').getByRole('switch').click();
  await select('顶人下线范围', '所有客户端类型');
  await select('溢出处理', '踢人下线');
  await select('刷新令牌传输方式', '响应体');
  await page.getByRole('button', { name: '保存', exact: true }).click();
  await page.waitForFunction(() => !window.enumFormTest.state.drawerVisible);
  assert.deepEqual(payload('/system/client').authType, ['ACCOUNT', 'EMAIL']);
  assert.equal(payload('/system/client').replacedRange, 'ALL_DEVICE_TYPE');
  assert.equal(payload('/system/client').overflowLogoutMode, 'KICKOUT');
  assert.equal(payload('/system/client').refreshTokenMode, 'BODY');
  await page.evaluate(() => window.enumFormTest.state.openAdd());
  await item('认证类型').getByText('账号', { exact: true }).waitFor();
  assert.deepEqual(await page.evaluate(() => window.enumFormTest.state.formModel.authType), ['ACCOUNT']);
  await page.getByRole('button', { name: '取消', exact: true }).click();
  await page.evaluate(() => window.enumFormTest.state.openEdit('55'));
  await item('认证类型').getByText('手机号', { exact: true }).waitFor();
  await item('溢出处理').getByText('顶人下线', { exact: true }).waitFor();
  await select('溢出处理', '注销下线');
  await page.getByRole('button', { name: '保存', exact: true }).click();
  await page.waitForFunction(() => !window.enumFormTest.state.drawerVisible);
  assert.equal(payload('/system/client/55').overflowLogoutMode, 'LOGOUT');

  await mount('/src/views/system/user/modules/user-operate-drawer.vue', { operateType: 'edit',
    rowData: { id: '100', username: 'testuser', nickname: '测试用户', gender: 0, status: 2, roleIds: ['7'], deptId: '1', email: '', phone: '' }, deptData: [] });
  await page.evaluate(() => { window.enumFormTest.show.value = true; });
  await item('性别').getByText('未知', { exact: true }).waitFor();
  await item('状态').getByText('禁用', { exact: true }).waitFor();
  await select('性别', '女');
  await page.getByRole('button', { name: '保存', exact: true }).click();
  await page.waitForFunction(() => !window.enumFormTest.show.value);
  assert.equal(payload('/system/user/100').gender, 2);
  assert.equal(payload('/system/user/100').status, 2);

  await mount('/src/views/system/menu/modules/menu-operate-drawer.vue', { operateType: 'add' });
  await page.evaluate(() => { window.enumFormTest.show.value = true; });
  await item('组件路径').waitFor();
  await select('菜单类型', '目录');
  await item('重定向').waitFor();
  assert.equal(await item('组件路径').count(), 0);
  await select('菜单类型', '按钮');
  await item('权限标识').waitFor();
  assert.equal(await item('路由地址').count(), 0);

  await mount('/src/views/system/role/modules/role-data-scope-drawer.vue', { rowData: { id: '7' } });
  await page.evaluate(() => { window.enumFormTest.show.value = true; });
  await select('数据范围', '自定义');
  await item('部门范围').waitFor();
  assert.equal(await page.evaluate(() => window.enumFormTest.state.model.dataScope), 5);

  await mount('/src/views/monitor/sms/log/index.vue');
  await page.locator('#enum-form-test .n-data-table').getByText('成功', { exact: true }).waitFor();
  await page.locator('#enum-form-test .n-collapse-item__header').click();
  await select('发送状态', '失败');
  await page.getByRole('button', { name: '搜索', exact: true }).click();
  await page.waitForFunction(() => window.enumFormTest.state.searchParams.status === 2 && !window.enumFormTest.state.loading);
  assert.equal(queries.findLast(query => query.path === '/system/sms/log').params.status, '2');

  await mount('/src/views/system/notice/add/index.vue');
  await select('通知范围', '指定用户');
  await page.getByRole('button', { name: '发布', exact: true }).click();
  await page.getByText('请选择通知用户', { exact: true }).waitFor();
  assert.equal(requests.filter(req => req.path === '/system/notice').length, 0);
  await select('通知用户', '测试用户');
  await select('通知方式', '登录弹窗');
  await item('公告标题').locator('input').fill('测试公告');
  await select('公告类型', '通知');
  await item('公告内容').locator('textarea').fill('测试内容');
  await page.getByRole('button', { name: '发布', exact: true }).click();
  await page.waitForTimeout(150);
  assert.equal(payload('/system/notice').noticeScope, 2);
  assert.deepEqual(payload('/system/notice').noticeUsers, ['100']);
  assert.deepEqual(payload('/system/notice').noticeMethods, [1, 2]);

  await mount('/src/views/system/config/modules/option-form.vue', { category: 'LOGIN' });
  await item('PASSWORD_REQUIRE_SYMBOLS').getByText('否', { exact: true }).waitFor();
  assert.equal(await page.locator('#enum-form-test .n-base-selection').count(), 4);
  await select('PASSWORD_REQUIRE_SYMBOLS', '是');
  await page.getByRole('button', { name: '保存', exact: true }).click();
  await page.waitForTimeout(150);
  assert.equal(payload('/system/option').find(option => option.code === 'PASSWORD_REQUIRE_SYMBOLS').value, '1');

  await mount('/src/views/system/user/modules/user-import-modal.vue');
  await page.evaluate(() => { window.enumFormTest.show.value = true; });
  await page.locator('input[type=file]').setInputFiles({ name: 'users.xlsx', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', buffer: Buffer.from('mock excel') });
  await select('重复用户策略', '修改数据');
  await select('重复邮箱策略', '停止导入');
  await select('默认用户状态', '禁用');
  if (process.env.SCREENSHOT_DIR) {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: `${process.env.SCREENSHOT_DIR}/enum-import-mobile.png` });
    await page.setViewportSize({ width: 1280, height: 1000 });
  }
  await page.getByRole('button', { name: '解析文件', exact: true }).click();
  await page.waitForFunction(() => !window.enumFormTest.state.loading);
  assert.equal(await page.evaluate(() => window.enumFormTest.state.parsed), null, 'failed parsing can be retried');
  // Retry after the existing shared 500 ms duplicate-submit guard.
  await page.waitForTimeout(550);
  await page.getByRole('button', { name: '解析文件', exact: true }).click();
  await page.getByRole('button', { name: '确认导入', exact: true }).waitFor();
  assert.match(requests.findLast(req => req.path === '/system/user/import/parse').body, /filename="users.xlsx"/);
  await page.getByRole('button', { name: '确认导入', exact: true }).click();
  await page.waitForFunction(() => !window.enumFormTest.state.loading);
  assert.equal(await page.evaluate(() => window.enumFormTest.state.data.importKey), 'test-session', 'failed import retains session and policies');
  await page.waitForTimeout(550);
  await page.getByRole('button', { name: '确认导入', exact: true }).click();
  await page.getByText('总计 3 行，新增 2 行，修改 1 行', { exact: true }).waitFor();
  assert.deepEqual(payload('/system/user/import'), { importKey: 'test-session', duplicateUser: 2, duplicateEmail: 3, duplicatePhone: 1, defaultStatus: 2 });
  assert.deepEqual(errors, []);
  console.log('PASS: user/client edit, menu/role branches, SMS labels/filter, storage, notice validation/multiselect, boolean settings, import policies/retry and numeric payloads');
} finally {
  await browser.close();
}
