import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({ headless: true, executablePath: process.env.BROWSER_EXECUTABLE });
const page = await browser.newPage();
const errors = [];
const hits = new Map();
const dictionaries = {
  gender_enum: [{ label: 'Unknown', value: 0 }, { label: 'Male', value: 1 }, { label: 'Female', value: 2 }],
  dis_enable_status_enum: [{ label: 'Enabled', value: 1 }, { label: 'Disabled', value: 2 }],
  empty_dict: []
};
let failed = true;
page.on('pageerror', error => errors.push(error.message));
await page.route('**/dev-api/**', async route => {
  const path = new URL(route.request().url()).pathname.replace('/dev-api', '');
  const code = path.split('/').at(-1);
  let response = { code: 0, data: [], msg: 'ok' };
  let status = 200;
  if (path === '/auth/refresh') {
    status = 401;
    response.code = 401;
  } else if (path === '/captcha/image') {
    response.data = { isEnabled: false };
  } else if (path.startsWith('/system/common/dict/')) {
    hits.set(code, (hits.get(code) || 0) + 1);
    await new Promise(resolve => setTimeout(resolve, 50));
    if (code === 'retry_dict' && failed) response = { code: 500, data: null, msg: 'test failure' };
    else response.data = code === 'retry_dict' ? [{ label: 'Recovered', value: 1 }] : dictionaries[code] || [];
  }
  await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(response) });
});

try {
  await page.goto(`${process.env.TEST_BASE_URL || 'http://localhost:9527'}/login`);
  await page.waitForFunction(() => document.querySelector('#app')?.hasAttribute('data-v-app'));
  await page.addStyleTag({ content: '#__vue-devtools-container__ { display: none !important; }' });
  await page.evaluate(async () => {
    const { h, render, ref } = await import('/node_modules/.vite/deps/vue.js');
    const { default: DictSelect } = await import('/src/components/custom/dict-select.vue');
    const { default: DictTag } = await import('/src/components/custom/dict-tag.vue');
    const { useDictStore } = await import('/src/store/modules/dict/index.ts');
    window.dictTest = { store: useDictStore(), value: ref(0), code: ref('gender_enum') };
    const container = document.createElement('div');
    container.id = 'dictionary-test';
    container.style.cssText = 'position:fixed;top:80px;left:20px;width:400px;padding:20px;background:white;z-index:100';
    document.body.append(container);
    const node = h({
      setup() {
        return () => h('div', [
          h(DictSelect, { dictCode: window.dictTest.code.value, value: window.dictTest.value.value,
            'onUpdate:value': value => { window.dictTest.value.value = value; }, 'data-testid': 'enum-select' }),
          h(DictTag, { dictCode: 'gender_enum', value: 0, 'data-testid': 'enum-tag' }),
          h(DictSelect, { dictCode: 'empty_dict', 'data-testid': 'empty-select' }),
          h(DictSelect, { dictCode: 'retry_dict', 'data-testid': 'retry-select' })
        ]);
      }
    });
    node.appContext = document.querySelector('#app').__vue_app__._context;
    render(node, container);
  });
  await page.getByTestId('enum-select').getByText('Unknown', { exact: true }).waitFor();
  await page.getByTestId('enum-tag').getByText('Unknown', { exact: true }).waitFor();
  assert.equal(hits.get('gender_enum'), 1, 'select and tag share one dictionary request');
  await page.getByTestId('enum-select').click();
  await page.getByText('Female', { exact: true }).click();
  assert.equal(await page.evaluate(() => window.dictTest.value.value), 2, 'numeric enum remains numeric');
  await page.evaluate(() => {
    window.dictTest.store.setDict('gender_enum', [{ label: 'Updated female', value: 2 }]);
  });
  await page.getByTestId('enum-select').getByText('Updated female', { exact: true }).waitFor();
  await page.evaluate(() => { window.dictTest.code.value = 'dis_enable_status_enum'; });
  await page.getByTestId('enum-select').getByText('Disabled', { exact: true }).waitFor();
  await page.getByTestId('empty-select').click();
  await page.getByText('暂无选项', { exact: true }).waitFor();
  await page.keyboard.press('Escape');
  await page.getByTestId('retry-select').click();
  await page.getByText('选项加载失败', { exact: true }).waitFor();
  failed = false;
  await page.getByRole('button', { name: '重试', exact: true }).click();
  await page.getByText('Recovered', { exact: true }).waitFor();
  assert.equal(hits.get('retry_dict'), 2);
  assert.deepEqual(errors, []);
  const userForm = await readFile(new URL('../src/views/system/user/modules/user-operate-drawer.vue', import.meta.url), 'utf8');
  assert.match(userForm, /gender: Api\.System\.ContinewUser\['gender'\]/);
  assert.doesNotMatch(userForm, /gender: '0'|status: '1'/);
  console.log('PASS: enum selection, numeric zero, request sharing, reactive dictionaries, empty/error/retry states');
} finally {
  await browser.close();
}
