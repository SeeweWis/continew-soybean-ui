<script setup lang="tsx">
import { computed, ref, watch } from 'vue';
import type { DataTableColumns, DataTableProps } from 'naive-ui';
import { NCheckbox, NCheckboxGroup, NTag } from 'naive-ui';
import { useLoading } from '@sa/hooks';
import { fetchGetRoleDetail, fetchGetRolePermissionTree, fetchUpdateRolePermission } from '@/service/api/system';
import { useAuth } from '@/hooks/business/auth';
import { useAppStore } from '@/store/modules/app';
import { $t } from '@/locales';
import SvgIcon from '@/components/custom/svg-icon.vue';
import { includeAncestors } from './role-permission-selection';

defineOptions({ name: 'RolePermissionTable' });

interface Props {
  role: Api.System.ContinewRole | null;
}

const props = defineProps<Props>();
const { hasAuth } = useAuth();
const appStore = useAppStore();
const { loading, startLoading, endLoading } = useLoading();

type TerminalFilter = 'PC' | 'XCX' | 'ANDROID';
const terminalTabs: { value: TerminalFilter; label: string }[] = [
  { value: 'PC', label: '桌面端' },
  { value: 'XCX', label: '小程序' },
  { value: 'ANDROID', label: '安卓' }
];
const terminalLabels: Record<string, string> = {
  PC: '桌面端',
  XCX: '小程序',
  ANDROID: '安卓'
};
const activeTerminal = ref<TerminalFilter>('PC');
const fullTree = ref<Api.System.ContinewRolePermission[]>([]);
const checkedIds = ref<CommonType.IdType[]>([]);
const menuCheckStrictly = ref(true);
const expandedRowKeys = ref<CommonType.IdType[]>([]);
const dataLoaded = ref(false);
let loadVersion = 0;

function matchTerminal(node: Api.System.ContinewRolePermission, terminal: TerminalFilter): boolean {
  if (node.clientType === terminal) return true;
  return (node.children ?? []).some(child => matchTerminal(child, terminal));
}

function filterTree(
  nodes: Api.System.ContinewRolePermission[],
  terminal: TerminalFilter
): Api.System.ContinewRolePermission[] {
  return nodes
    .filter(node => matchTerminal(node, terminal))
    .map(node => ({
      ...node,
      children: node.children ? filterTree(node.children, terminal) : undefined
    }));
}

const displayTree = computed(() => filterTree(fullTree.value, activeTerminal.value));

type PermissionRow = Api.System.ContinewRolePermission & {
  permissions: Api.System.ContinewRolePermission[];
  children?: PermissionRow[];
};

/** 将按钮节点从树中提取到所属菜单的“权限”列，其余目录/菜单继续组成可展开行。 */
function toTableRows(nodes: Api.System.ContinewRolePermission[]): PermissionRow[] {
  return nodes
    .filter(node => node.type !== 3)
    .map(node => {
      const buttons = (node.children ?? []).filter(child => child.type === 3);
      const children = toTableRows((node.children ?? []).filter(child => child.type !== 3));
      return { ...node, permissions: buttons, children: children.length ? children : undefined };
    });
}

const tableRows = computed(() => toTableRows(displayTree.value));
const selectedSet = computed(() => new Set(checkedIds.value.map(String)));
const canEdit = computed(
  () => dataLoaded.value && !loading.value && hasAuth('system:role:updatePermission') && Boolean(props.role) && !props.role?.isSystem
);

function collectIds(
  node: Api.System.ContinewRolePermission & { permissions?: Api.System.ContinewRolePermission[] }
): CommonType.IdType[] {
  const ids: CommonType.IdType[] = [node.id];
  (node.children ?? []).forEach(child => ids.push(...collectIds(child)));
  (node.permissions ?? []).forEach(permission => ids.push(permission.id));
  return ids;
}

function collectExpandableKeys(rows: PermissionRow[]): CommonType.IdType[] {
  return rows.flatMap(row => row.children?.length ? [row.id, ...collectExpandableKeys(row.children)] : []);
}

const expandableKeys = computed(() => collectExpandableKeys(tableRows.value));
const isExpanded = computed(() => expandedRowKeys.value.length > 0);

watch(expandableKeys, keys => {
  expandedRowKeys.value = keys;
}, { immediate: true });

function handleExpand() {
  expandedRowKeys.value = isExpanded.value ? [] : [...expandableKeys.value];
}

function collectAncestors(
  tree: Api.System.ContinewRolePermission[],
  targetId: CommonType.IdType,
  ancestors: CommonType.IdType[] = []
): CommonType.IdType[] | null {
  for (const node of tree) {
    if (String(node.id) === String(targetId)) return ancestors;
    const result = collectAncestors(node.children ?? [], targetId, [...ancestors, node.id]);
    if (result) return result;
  }
  return null;
}

function setChecked(ids: CommonType.IdType[], checked: boolean) {
  const values = new Map(checkedIds.value.map(id => [String(id), id]));
  ids.forEach(id => {
    if (checked) values.set(String(id), id);
    else values.delete(String(id));
  });
  checkedIds.value = [...values.values()];
}

function handleMenuCheck(row: PermissionRow, checked: boolean) {
  if (!canEdit.value) return;
  const affected = menuCheckStrictly.value ? collectIds(row) : [row.id];
  setChecked(affected, checked);
  if (checked) {
    setChecked(collectAncestors(fullTree.value, row.id) ?? [], true);
  }
}

function handlePermissionChange(row: PermissionRow, values: Array<string | number>) {
  if (!canEdit.value) return;
  const buttonIds = row.permissions.map(item => item.id);
  const selected = new Set(values.map(String));
  const next = new Map(checkedIds.value.map(id => [String(id), id]));
  buttonIds.forEach(id => {
    if (selected.has(String(id))) next.set(String(id), id);
    else next.delete(String(id));
  });
  checkedIds.value = [...next.values()];

  if (menuCheckStrictly.value && selected.size > 0) {
    setChecked([row.id, ...(collectAncestors(fullTree.value, row.id) ?? [])], true);
  } else if (menuCheckStrictly.value && selected.size === 0) {
    const descendantsSelected = collectIds(row).some(id => String(id) !== String(row.id) && selectedSet.value.has(String(id)));
    if (!descendantsSelected) setChecked([row.id], false);
  }
}

function handleCheckAll(checked: boolean) {
  if (!canEdit.value) return;
  const ids = displayTree.value.flatMap(node => collectIds(node));
  setChecked(ids, checked);
}

const handleMenuSelection: DataTableProps['onUpdateCheckedRowKeys'] = (_keys, _rows, meta) => {
  if (meta.action === 'checkAll' || meta.action === 'uncheckAll') {
    handleCheckAll(meta.action === 'checkAll');
  } else if (meta.row) {
    handleMenuCheck(meta.row as PermissionRow, meta.action === 'check');
  }
};

const columns = computed<DataTableColumns<PermissionRow>>(() => [
  {
    type: 'selection',
    width: 40,
    fixed: 'left',
    disabled: () => !canEdit.value
  },
  {
    key: 'menu',
    title: '菜单',
    width: 240,
    fixed: 'left',
    render: row => (
      <span class="inline-flex max-w-full items-center gap-4px align-middle">
        {row.icon ? <SvgIcon icon={row.icon} class="flex-none text-16px" /> : null}
        <span class="min-w-0 truncate">{row.title}</span>
        {row.clientType ? (
          <NTag size="tiny" bordered={false} class="flex-none">
            {terminalLabels[row.clientType] ?? row.clientType}
          </NTag>
        ) : null}
      </span>
    )
  },
  {
    key: 'permissions',
    title: '权限',
    minWidth: 420,
    render: row =>
      row.permissions.length ? (
        <NCheckboxGroup
          value={row.permissions.filter(item => selectedSet.value.has(String(item.id))).map(item => item.id)}
          disabled={!canEdit.value}
          onUpdateValue={(values: Array<string | number>) => handlePermissionChange(row, values)}
        >
          <div class="flex flex-wrap gap-x-16px gap-y-6px py-4px">
            {row.permissions.map(permission => (
              <NCheckbox key={permission.id} value={permission.id}>
                <span title={permission.permission}>{permission.title}</span>
              </NCheckbox>
            ))}
          </div>
        </NCheckboxGroup>
      ) : (
        null
      )
  }
]);

const saving = ref(false);

async function loadData() {
  const version = ++loadVersion;
  const role = props.role;
  dataLoaded.value = false;
  checkedIds.value = [];
  if (!role) {
    fullTree.value = [];
    endLoading();
    return;
  }
  startLoading();
  try {
    const [{ data: tree, error }, { data: detail, error: detailError }] = await Promise.all([
      fetchGetRolePermissionTree(),
      fetchGetRoleDetail(role.id)
    ]);
    if (version !== loadVersion) return;
    if (!error && !detailError) {
      fullTree.value = tree;
      menuCheckStrictly.value = detail.menuCheckStrictly ?? true;
      checkedIds.value = menuCheckStrictly.value
        ? includeAncestors(fullTree.value, detail.menuIds ?? [])
        : (detail.menuIds ?? []);
      dataLoaded.value = true;
    } else {
      fullTree.value = [];
    }
  } finally {
    if (version === loadVersion) endLoading();
  }
}

async function handleSave() {
  if (!props.role || !canEdit.value || saving.value) return;
  saving.value = true;
  const { error } = await fetchUpdateRolePermission(props.role.id, {
    menuIds: menuCheckStrictly.value ? includeAncestors(fullTree.value, checkedIds.value) : checkedIds.value,
    menuCheckStrictly: menuCheckStrictly.value
  });
  saving.value = false;
  if (error) return;
  window.$message?.success($t('common.updateSuccess'));
}

watch(
  () => props.role?.id,
  loadData,
  { immediate: true }
);
</script>

<template>
  <div class="flex-col-stretch gap-12px sm:h-full">
    <div class="flex flex-wrap items-center justify-between gap-12px">
      <NButton type="primary" :loading="saving" :disabled="!canEdit" @click="handleSave">
        <template #icon><SvgIcon icon="mdi:content-save-outline" /></template>
        保存权限
      </NButton>
      <NSpace :size="12" align="center">
        <NRadioGroup v-model:value="menuCheckStrictly" :disabled="!canEdit">
          <NRadioButton :value="true">节点关联</NRadioButton>
          <NRadioButton :value="false">节点独立</NRadioButton>
        </NRadioGroup>
        <NButton :disabled="loading || !tableRows.length" @click="handleExpand">
          <template #icon>
            <SvgIcon :icon="isExpanded ? 'mdi:format-list-bulleted' : 'mdi:file-tree-outline'" />
          </template>
          {{ isExpanded ? '折叠' : '展开' }}
        </NButton>
        <NButton quaternary circle :loading="loading" :disabled="!role" aria-label="刷新权限" @click="loadData">
          <template #icon><SvgIcon icon="mdi:refresh" /></template>
        </NButton>
      </NSpace>
    </div>
    <NTabs v-model:value="activeTerminal" type="segment" size="small" class="w-full sm:w-360px">
      <NTab v-for="tab in terminalTabs" :key="tab.value" :name="tab.value">{{ tab.label }}</NTab>
    </NTabs>
    <NDataTable
      v-model:expanded-row-keys="expandedRowKeys"
      :checked-row-keys="checkedIds"
      :cascade="false"
      :columns="columns"
      :data="tableRows"
      :loading="loading"
      :row-key="row => row.id"
      :indent="20"
      size="small"
      :scroll-x="1000"
      :flex-height="!appStore.isMobile"
      class="sm:min-h-0 sm:flex-1"
      @update:checked-row-keys="handleMenuSelection"
    />
  </div>
</template>

<style scoped></style>
