import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { setImmediate } from 'node:timers/promises';
import ts from 'typescript';
import * as vue from 'vue';
import { includeAncestors } from '../src/views/system/role/modules/role-permission-selection';

const tree = [
  {
    id: '1000',
    type: 1,
    clientType: 'PC',
    title: '系统管理',
    parentId: '0',
    children: [
      {
        id: '1010',
        type: 2,
        clientType: 'PC',
        title: '用户管理',
        parentId: '1000',
        children: [
          {
            id: '9223372036854775001',
            type: 3,
            clientType: 'PC',
            title: '新增',
            parentId: '1010',
            permission: 'system:user:create'
          },
          { id: '1012', type: 3, clientType: 'PC', title: '修改', parentId: '1010', permission: 'system:user:update' }
        ]
      }
    ]
  },
  {
    id: '2000',
    type: 2,
    clientType: 'XCX',
    title: '小程序',
    parentId: '0',
    children: [{ id: '2001', type: 3, clientType: 'XCX', title: '查询', parentId: '2000', permission: 'mini:list' }]
  }
];
const props = vue.shallowReactive<{ role: { id: string; isSystem?: boolean } | null }>({ role: null });
const saves: { id: string; data: { menuIds: string[]; menuCheckStrictly: boolean } }[] = [];
let hasPermission = true;
let failTree = false;
let resolveSlow: (value: { data: { menuIds: string[] } }) => void;
const slowDetail = new Promise(resolve => {
  resolveSlow = resolve;
});
const api = {
  fetchGetRolePermissionTree: async () => (failTree ? { error: true } : { data: structuredClone(tree) }),
  fetchGetRoleDetail: async (id: string) =>
    id === 'slow'
      ? slowDetail
      : { data: { menuIds: id === 'button-only' ? ['1012'] : [], menuCheckStrictly: id !== 'button-only' } },
  fetchUpdateRolePermission: async (id: string, data: (typeof saves)[number]['data']) => {
    saves.push({ id, data });
    return {};
  }
};
const source = readFileSync(
  new URL('../src/views/system/role/modules/role-permission-table.vue', import.meta.url),
  'utf8'
);
const script = source.match(/<script setup lang="tsx">([\s\S]*?)<\/script>/)?.[1];
assert.ok(script);
const compiled = ts.transpileModule(script, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React, target: ts.ScriptTarget.ES2022 }
});
const scope = vue.effectScope();
const state = scope.run(() =>
  vm.runInNewContext(
    `${compiled.outputText}\n({ terminalTabs, tableRows, checkedIds, expandedRowKeys, activeTerminal, menuCheckStrictly, canEdit, loading, handleExpand, handleMenuCheck, handlePermissionChange, handleMenuSelection, handleSave, loadData })`,
    {
      exports: {},
      defineOptions: () => {},
      defineProps: () => props,
      window: {},
      require: (name: string) => {
        if (name === 'vue') return vue;
        if (name === 'naive-ui') return {};
        if (name === '@/service/api/system') return api;
        if (name === './role-permission-selection') return { includeAncestors };
        if (name === '@/hooks/business/auth') return { useAuth: () => ({ hasAuth: () => hasPermission }) };
        if (name === '@/store/modules/app') return { useAppStore: () => ({ isMobile: false }) };
        if (name === '@/locales') return { $t: (key: string) => key };
        if (name === '@/components/custom/svg-icon.vue') return {};
        if (name === '@sa/hooks')
          return {
            useLoading: () => {
              const loading = vue.ref(false);
              return {
                loading,
                startLoading: () => {
                  loading.value = true;
                },
                endLoading: () => {
                  loading.value = false;
                }
              };
            }
          };
        throw new Error(`Unexpected import: ${name}`);
      }
    }
  )
);

async function selectRole(id: string, isSystem = false) {
  props.role = { id, isSystem };
  await vue.nextTick();
  await setImmediate();
}
function selected() {
  return [...state.checkedIds.value].sort();
}

try {
  assert.equal(state.activeTerminal.value, 'PC');
  assert.deepEqual(
    Array.from(state.terminalTabs, (tab: { value: string }) => tab.value),
    ['PC', 'XCX', 'ANDROID']
  );
  assert.equal(state.canEdit.value, false);
  await selectRole('normal');
  assert.deepEqual(
    Array.from(state.tableRows.value, (row: { id: string }) => row.id),
    ['1000']
  );
  assert.deepEqual([...state.expandedRowKeys.value], ['1000']);
  assert.equal(state.tableRows.value[0].children[0].permissions.length, 2);
  state.handleExpand();
  assert.equal(state.expandedRowKeys.value.length, 0);
  state.handleExpand();
  assert.deepEqual([...state.expandedRowKeys.value], ['1000']);

  const menu = state.tableRows.value[0].children[0];
  state.handleMenuCheck(state.tableRows.value[0], true);
  assert.deepEqual(selected(), ['1000', '1010', '1012', '9223372036854775001']);
  state.handleMenuCheck(state.tableRows.value[0], false);
  assert.deepEqual(selected(), []);
  state.menuCheckStrictly.value = false;
  state.handleMenuCheck(menu, true);
  assert.deepEqual(selected(), ['1000', '1010']);
  state.menuCheckStrictly.value = true;
  state.handlePermissionChange(menu, ['9223372036854775001']);
  assert.deepEqual(selected(), ['1000', '1010', '9223372036854775001']);
  state.handlePermissionChange(menu, []);
  assert.equal(state.checkedIds.value.includes('1010'), false);

  state.checkedIds.value = ['2000', '2001'];
  state.activeTerminal.value = 'PC';
  await vue.nextTick();
  state.handleMenuSelection([], [], { action: 'checkAll' });
  assert.deepEqual(selected(), ['1000', '1010', '1012', '2000', '2001', '9223372036854775001']);
  await state.handleSave();
  assert.equal(saves[0].id, 'normal');
  assert.deepEqual([...saves[0].data.menuIds].sort(), selected());
  state.handleMenuSelection([], [], { action: 'uncheckAll' });
  assert.deepEqual(selected(), ['2000', '2001']);
  state.activeTerminal.value = 'ANDROID';
  assert.equal(state.tableRows.value.length, 0);

  await selectRole('builtin', true);
  state.handleMenuCheck(menu, true);
  await state.handleSave();
  assert.deepEqual(selected(), []);
  assert.equal(saves.length, 1);
  hasPermission = false;
  await selectRole('unauthorized');
  assert.equal(state.canEdit.value, false);
  hasPermission = true;
  failTree = true;
  await state.loadData();
  assert.equal(state.canEdit.value, false);
  assert.equal(state.tableRows.value.length, 0);

  failTree = false;
  await selectRole('slow');
  assert.equal(state.loading.value, true);
  assert.equal(state.canEdit.value, false);
  await selectRole('latest');
  resolveSlow!({ data: { menuIds: ['1012'] } });
  await setImmediate();
  assert.deepEqual(selected(), []);
  assert.equal(state.loading.value, false);
  await selectRole('button-only');
  assert.equal(state.menuCheckStrictly.value, false);
  assert.deepEqual(selected(), ['1012']);
  await state.handleSave();
  assert.deepEqual([...saves[1].data.menuIds], ['1012']);
  assert.equal(saves[1].data.menuCheckStrictly, false);
  console.log(
    'PASS: async expansion, linked/independent selection, terminal isolation, save payload, readonly/error states and role request races'
  );
} finally {
  scope.stop();
}
