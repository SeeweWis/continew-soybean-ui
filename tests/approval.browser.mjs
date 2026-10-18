import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({ headless: true, executablePath: process.env.BROWSER_EXECUTABLE });
const page = await browser.newPage({ viewport: { width: 1360, height: 1000 } });
const errors = [];
const writes = [];
let failList = false;
let instanceStatus = 'PENDING';
const definition = {
  id: '11',
  code: 'LEAVE',
  name: '请假审批',
  category: '人事',
  status: 1,
  description: '提交请假申请并由部门审批人处理',
  createTime: '2026-10-17 10:00:00',
  flowConfig: JSON.stringify({
    nodes: [
      { id: 'review', name: '部门审批', type: 'APPROVAL', approverType: 'USER', approvers: ['7'], approveMode: 'AND' }
    ]
  }),
  formConfig: JSON.stringify({
    version: 1,
    fields: [{ id: 'reason', key: 'reason', label: '申请说明', type: 'TEXTAREA', required: true }]
  })
};
function detail() {
  return {
    instance: {
      id: '51',
      definitionCode: 'LEAVE',
      title: '年假申请',
      businessType: 'LEAVE',
      businessKey: 'L-1',
      startUser: '7',
      status: instanceStatus,
      startTime: '2026-10-17 10:00:00',
      currentNodeId: instanceStatus === 'PENDING' ? 'review' : null,
      formData: '{"事由":"年假","天数":2}',
      formConfig: definition.formConfig
    },
    tasks: [
      {
        id: '61',
        instanceId: '51',
        nodeId: 'review',
        nodeName: '部门审批',
        assignee: '7',
        status: instanceStatus,
        createTime: '2026-10-17 10:00:00'
      }
    ],
    history: [{ id: '71', operator: '7', action: 'START', opinion: '发起审批', createTime: '2026-10-17 10:00:00' }],
    userNames: { 7: '测试用户', 8: '另一审批人' }
  };
}
page.on('pageerror', error => errors.push(error.message));
await page.route('**/dev-api/**', async route => {
  const req = route.request();
  const url = new URL(req.url());
  const path = url.pathname.replace('/dev-api', '');
  let data = [];
  let code = 0;
  if (path === '/auth/refresh')
    return route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ code: 401 }) });
  if (path === '/captcha/image') data = { isEnabled: false };
  else if (path === '/system/user/dict')
    data = [
      { label: '测试用户', value: '7' },
      { label: '另一审批人', value: '8' }
    ];
  else if (path === '/approval/definition/list') {
    data = [definition];
    if (failList) {
      code = 500;
      failList = false;
    }
  } else if (path === '/approval/definition/11' && req.method() === 'GET') data = definition;
  else if (path === '/approval/instance/51') data = detail();
  else if (path === '/approval/instance' && req.method() === 'GET') data = { list: [detail().instance], total: 1 };
  else if (path === '/approval/task' && req.method() === 'GET')
    data = { list: [{ ...detail().tasks[0], title: '年假申请' }], total: 1 };
  else if (path.startsWith('/approval/') && req.method() !== 'GET') {
    writes.push({ path, method: req.method(), body: req.postDataJSON() });
    if (path === '/approval/instance/start') data = '51';
    if (path.startsWith('/approval/task/approve')) instanceStatus = 'APPROVED';
    if (path.startsWith('/approval/task/reject')) instanceStatus = 'REJECTED';
    if (path.startsWith('/approval/instance/cancel')) instanceStatus = 'CANCELLED';
    await new Promise(resolve => setTimeout(resolve, 150));
  }
  await route.fulfill({
    contentType: 'application/json',
    body: JSON.stringify({ code, data, msg: code ? '模拟加载失败' : 'ok' })
  });
});
async function mount(path) {
  await page.evaluate(async path => {
    const { h, render, nextTick } = await import('/node_modules/.vite/deps/vue.js');
    const { default: Component } = await import(path);
    const container = document.getElementById('approval-test');
    render(null, container);
    await nextTick();
    const node = h(Component);
    node.appContext = document.querySelector('#app').__vue_app__._context;
    render(node, container);
  }, path);
}
const item = label =>
  page
    .locator('.n-form-item')
    .filter({ has: page.locator('.n-form-item-label').getByText(label, { exact: true }) })
    .last();
try {
  await page.goto(`${process.env.TEST_BASE_URL || 'http://localhost:9527'}/login`);
  await page.waitForFunction(() => document.querySelector('#app')?.hasAttribute('data-v-app'));
  await page.addStyleTag({ content: '#__vue-devtools-container__ { display:none !important; }' });
  await page.evaluate(async () => {
    const { useAuthStore } = await import('/src/store/modules/auth/index.ts');
    const auth = useAuthStore();
    auth.token = 'browser-test';
    auth.userInfo = { id: '7', nickname: '测试用户', roles: [], roleNames: [], permissions: ['*:*:*'] };
    const container = document.createElement('div');
    container.id = 'approval-test';
    container.style.cssText = 'position:fixed;inset:0;background:#f5f7fa;z-index:50;padding:24px;overflow:auto';
    document.body.append(container);
    const { createServerDynamicRoutes } = await import('/src/router/routes/index.ts');
    const routes = createServerDynamicRoutes([
      {
        type: 1,
        path: '/approval',
        title: '审批中心',
        component: 'Layout',
        children: ['definition', 'start', 'application', 'task'].map((key, i) => ({
          id: i + 1,
          parentId: 1,
          type: 2,
          path: `/approval/${key}`,
          title: key,
          component: `approval/${key}/index`
        }))
      }
    ]);
    if (routes.length !== 1 || routes[0].children.length !== 4) throw new Error('审批菜单路由不完整');
  });
  await mount('/src/views/approval/definition/index.vue');
  await page.getByText('请假审批', { exact: true }).waitFor();
  await page.getByRole('button', { name: '新建审批定义', exact: true }).click();
  await item('审批名称').locator('input').fill('报销审批');
  await item('审批编码').locator('input').fill('EXPENSE');
  await item('节点名称').locator('input').fill('财务审核');
  await page.getByRole('button', { name: '下一步', exact: true }).click();
  await page.getByRole('button', { name: '保存', exact: true }).click();
  await page.getByText('每个节点至少选择一名有效审批人，大整数 ID 必须使用字符串', { exact: true }).waitFor();
  assert.equal(writes.length, 0);
  await item('审批人').locator('.n-base-selection').click();
  await page.locator('.n-base-select-option__content').getByText('测试用户', { exact: true }).click();
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: '保存', exact: true }).click();
  await page.waitForFunction(() => !document.querySelector('.n-drawer'));
  const created = writes.find(w => w.path === '/approval/definition');
  assert.equal(JSON.parse(created.body.flowConfig).nodes[0].approvers[0], '7');
  await page.getByText('请假审批', { exact: true }).waitFor();
  await page.getByRole('button', { name: '编辑', exact: true }).click();
  await item('节点名称').locator('input').waitFor();
  await item('节点名称').locator('input').fill('主管审核');
  await page.getByRole('button', { name: '下一步', exact: true }).click();
  await page.getByRole('button', { name: '保存', exact: true }).click();
  await page.waitForFunction(() => !document.querySelector('.n-drawer'));
  assert.equal(writes.at(-1).method, 'PUT');
  failList = true;
  await page.getByRole('button', { name: '查询', exact: true }).click();
  await page.getByText('加载失败，原有数据已保留。', { exact: false }).waitFor();
  await page.getByRole('button', { name: '重试', exact: true }).click();
  await page.getByText('请假审批', { exact: true }).waitFor();
  await mount('/src/views/approval/application/index.vue');
  await page.getByRole('button', { name: '新建审批', exact: true }).click();
  await item('审批类型').locator('.n-base-selection').click();
  await page.locator('.n-base-select-option__content').getByText('请假审批', { exact: true }).click();
  await item('申请事项').locator('input').fill('年假申请');
  await item('申请说明').locator('textarea').fill('计划休年假 2 天，用于家庭安排');
  await page.getByRole('button', { name: '提交审批', exact: true }).click();
  await page.locator('.n-drawer').waitFor({ state: 'hidden' });
  assert.equal(writes.filter(w => w.path === '/approval/instance/start').length, 1);
  const started = writes.find(w => w.path === '/approval/instance/start');
  assert.equal(started.body.businessType, 'LEAVE');
  assert.match(started.body.formData, /年假/);
  assert.equal(started.body.businessKey.startsWith('approval-'), true);
  await mount('/src/views/approval/task/index.vue');
  await page.getByRole('button', { name: '查看并处理', exact: true }).click();
  await page.getByText('申请内容', { exact: true }).waitFor();
  const dir = process.env.SCREENSHOT_DIR || '/tmp/approval-ui';
  await mkdir(dir, { recursive: true });
  await page.screenshot({ animations: 'disabled', path: `${dir}/approval-detail-desktop.png` });
  await page.getByRole('button', { name: '同意', exact: true }).click();
  await item('审批意见').locator('textarea').fill('同意申请');
  await page.getByRole('button', { name: '确认提交', exact: true }).click();
  await page.locator('.n-drawer').getByText('已通过', { exact: true }).first().waitFor();
  assert.equal(writes.at(-1).path, '/approval/task/approve/61');
  assert.equal(await page.getByRole('button', { name: '同意', exact: true }).count(), 0);
  await page.locator('.n-modal').waitFor({ state: 'hidden' });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ animations: 'disabled', path: `${dir}/approval-detail-mobile.png` });
  const box = await page.locator('.n-drawer').boundingBox();
  assert.ok(box.width <= 390 && box.x >= 0);
  await page.setViewportSize({ width: 1360, height: 1000 });
  await page.locator('.n-drawer-header__close').click();
  await mount('/src/views/approval/application/index.vue');
  await page.getByRole('button', { name: '详情', exact: true }).click();
  await page.getByText('申请内容', { exact: true }).waitFor();
  await page.locator('.n-drawer-header__close').click();
  instanceStatus = 'PENDING';
  await mount('/src/views/approval/task/index.vue');
  await page.getByRole('button', { name: '查看并处理', exact: true }).click();
  await page.getByRole('button', { name: '转办', exact: true }).click();
  await item('转办用户').locator('.n-base-selection').click();
  await page.locator('.n-base-select-option__content').getByText('另一审批人', { exact: true }).click();
  await item('原因').locator('textarea').fill('请同事代为处理');
  await page.getByRole('button', { name: '确认提交', exact: true }).click();
  await page.locator('.n-modal').waitFor({ state: 'hidden' });
  assert.equal(writes.at(-1).path, '/approval/task/transfer/61');
  assert.equal(writes.at(-1).body.toUserId, '8');
  await page.getByRole('button', { name: '拒绝', exact: true }).click();
  await item('原因').locator('textarea').fill('材料不完整');
  await page.getByRole('button', { name: '确认提交', exact: true }).click();
  await page.locator('.n-modal').waitFor({ state: 'hidden' });
  assert.equal(writes.at(-1).path, '/approval/task/reject/61');
  await page.locator('.n-drawer').getByText('已拒绝', { exact: true }).first().waitFor();
  await page.locator('.n-drawer-header__close').click();
  instanceStatus = 'PENDING';
  await mount('/src/views/approval/application/index.vue');
  await page.getByRole('button', { name: '详情', exact: true }).click();
  await page.getByRole('button', { name: '撤销申请', exact: true }).click();
  await item('原因').locator('textarea').fill('申请信息有误');
  await page.getByRole('button', { name: '确认提交', exact: true }).click();
  await page.locator('.n-modal').waitFor({ state: 'hidden' });
  assert.equal(writes.at(-1).path, '/approval/instance/cancel/51');
  await page.locator('.n-drawer').getByText('已撤销', { exact: true }).first().waitFor();
  await page.locator('.n-drawer-header__close').click();
  await page.evaluate(async () => {
    const { useAuthStore } = await import('/src/store/modules/auth/index.ts');
    useAuthStore().userInfo.permissions = [];
  });
  await mount('/src/views/approval/definition/index.vue');
  await page.getByText('暂无审批定义查询权限', { exact: true }).waitFor();
  assert.equal(await page.getByRole('button', { name: '新建审批定义', exact: true }).count(), 0);
  assert.deepEqual(errors, []);
  console.log(
    'PASS: dynamic routes, definition create/edit/validation/error retry, start, pending detail, approve, completed actions hidden, transfer/reject/cancel, no-permission, my applications, mobile drawer'
  );
} finally {
  await browser.close();
}
