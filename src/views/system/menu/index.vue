<script setup lang="tsx">
import { ref } from 'vue';
import { NDivider, NTag } from 'naive-ui';
import { fetchBatchDeleteMenu, fetchClearMenuCache, fetchGetMenuTree } from '@/service/api/system';
import { useAppStore } from '@/store/modules/app';
import { useAuth } from '@/hooks/business/auth';
import { useNaiveTable } from '@/hooks/common/table';
import { $t } from '@/locales';
import ButtonIcon from '@/components/custom/button-icon.vue';
import DictTag from '@/components/custom/dict-tag.vue';
import MenuOperateDrawer from './modules/menu-operate-drawer.vue';

defineOptions({
  name: 'MenuList'
});

const appStore = useAppStore();
const { hasAuth } = useAuth();

const searchParams = ref<Api.System.ContinewMenuQuery>({
  title: null,
  status: null
});

const { columns, columnChecks, data, getData, loading, scrollX } = useNaiveTable({
  api: () => fetchGetMenuTree(searchParams.value),
  transform: response => response.data ?? [],
  columns: () => [
    {
      key: 'title',
      title: '菜单名称',
      minWidth: 160,
      ellipsis: { tooltip: true }
    },
    {
      key: 'type',
      title: '类型',
      align: 'center',
      width: 80,
      render: row => <DictTag dictCode="menu_type" value={row.type} size="small" />
    },
    {
      key: 'icon',
      title: '图标',
      align: 'center',
      width: 80,
      render: row => (row.icon ? <span class="iconify text-16px">{row.icon}</span> : null)
    },
    {
      key: 'path',
      title: '路由地址',
      align: 'center',
      minWidth: 120,
      ellipsis: { tooltip: true }
    },
    {
      key: 'component',
      title: '组件路径',
      align: 'center',
      minWidth: 140,
      ellipsis: { tooltip: true }
    },
    {
      key: 'permission',
      title: '权限标识',
      align: 'center',
      minWidth: 160,
      ellipsis: { tooltip: true }
    },
    {
      key: 'sort',
      title: '排序',
      align: 'center',
      width: 70
    },
    {
      key: 'isHidden',
      title: '隐藏',
      align: 'center',
      width: 70,
      render: row => <NTag type={row.isHidden ? 'warning' : 'default'} size="small">{row.isHidden ? '是' : '否'}</NTag>
    },
    {
      key: 'status',
      title: '状态',
      align: 'center',
      width: 80,
      render: row => <DictTag dictCode="dis_enable_status" value={row.status} size="small" />
    },
    {
      key: 'operate',
      title: $t('common.operate'),
      align: 'center',
      width: 160,
      render: row => {
        const addChildBtn = () => {
          if (row.type === 3 || !hasAuth('system:menu:create')) return null;
          return (
            <ButtonIcon
              text
              type="primary"
              icon="material-symbols:add-rounded"
              tooltipContent="新增下级"
              onClick={() => handleAddChild(row)}
            />
          );
        };

        const editBtn = () => {
          if (!hasAuth('system:menu:update')) return null;
          return (
            <ButtonIcon
              text
              type="primary"
              icon="material-symbols:drive-file-rename-outline-outline"
              tooltipContent={$t('common.edit')}
              onClick={() => handleEdit(row.id)}
            />
          );
        };

        const deleteBtn = () => {
          if (!hasAuth('system:menu:delete')) return null;
          return (
            <ButtonIcon
              text
              type="error"
              icon="material-symbols:delete-outline"
              tooltipContent={$t('common.delete')}
              popconfirmContent={$t('common.confirmDelete')}
              onPositiveClick={() => handleDelete(row.id)}
            />
          );
        };

        return (
          <div class="flex-center gap-8px">
            {addChildBtn()}
            {addChildBtn() && editBtn() && <NDivider vertical />}
            {editBtn()}
            {editBtn() && deleteBtn() && <NDivider vertical />}
            {deleteBtn()}
          </div>
        );
      }
    }
  ]
});

const drawerVisible = ref(false);
const operateType = ref<NaiveUI.TableOperateType>('add');
const editingData = ref<Api.System.ContinewMenu | null>(null);

function handleAdd() {
  operateType.value = 'add';
  editingData.value = null;
  drawerVisible.value = true;
}

function handleAddChild(row: Api.System.ContinewMenu) {
  operateType.value = 'add';
  editingData.value = { ...row, children: undefined } as Api.System.ContinewMenu;
  drawerVisible.value = true;
}

function handleEdit(id: CommonType.IdType) {
  const findItem = findMenu(data.value, id);
  operateType.value = 'edit';
  editingData.value = findItem ? { ...findItem, children: undefined } : null;
  drawerVisible.value = true;
}

function findMenu(menus: Api.System.ContinewMenu[], id: CommonType.IdType): Api.System.ContinewMenu | null {
  for (const menu of menus) {
    if (menu.id === id) return menu;
    if (menu.children) {
      const found = findMenu(menu.children, id);
      if (found) return found;
    }
  }
  return null;
}

async function handleDelete(id: CommonType.IdType) {
  const { error } = await fetchBatchDeleteMenu([id]);
  if (error) return;
  window.$message?.success($t('common.deleteSuccess'));
  await getData();
}

async function handleClearCache() {
  const { error } = await fetchClearMenuCache();
  if (error) return;
  window.$message?.success('菜单缓存已清除');
}
</script>

<template>
  <div class="min-h-500px flex-col-stretch gap-16px overflow-hidden lt-sm:overflow-auto">
    <NCard :bordered="false" class="table-search card-wrapper" size="small">
      <NCollapse>
        <NCollapseItem :title="$t('common.search')" name="search">
          <NForm label-placement="left" :label-width="80">
            <NGrid responsive="screen" cols="1 s:2 m:3" :x-gap="8" :y-gap="8" item-responsive>
              <NFormItemGi span="24 s:12 m:8" label="菜单名称" class="pr-24px">
                <NInput v-model:value="searchParams.title" placeholder="请输入菜单名称" @keyup.enter="getData" />
              </NFormItemGi>
              <NFormItemGi span="24 s:12 m:8" label="状态" class="pr-24px">
                <DictSelect v-model:value="searchParams.status" dict-code="dis_enable_status" clearable />
              </NFormItemGi>
              <NFormItemGi span="24 s:12 m:8" class="pr-24px">
                <NSpace class="w-full" justify="end">
                  <NButton
                    @click="
                      () => {
                        searchParams.title = null;
                        searchParams.status = null;
                        getData();
                      }
                    "
                  >
                    <template #icon>
                      <icon-ic-round-refresh class="text-icon" />
                    </template>
                    重置
                  </NButton>
                  <NButton type="primary" ghost @click="getData">
                    <template #icon>
                      <icon-ic-round-search class="text-icon" />
                    </template>
                    搜索
                  </NButton>
                </NSpace>
              </NFormItemGi>
            </NGrid>
          </NForm>
        </NCollapseItem>
      </NCollapse>
    </NCard>
    <NCard title="菜单列表" :bordered="false" size="small" class="card-wrapper sm:flex-1-hidden">
      <template #header-extra>
        <NSpace>
          <NButton size="small" ghost @click="handleClearCache">清除缓存</NButton>
          <TableHeaderOperation
            v-model:columns="columnChecks"
            :loading="loading"
            :show-add="hasAuth('system:menu:create')"
            :show-delete="false"
            @add="handleAdd"
            @refresh="getData"
          />
        </NSpace>
      </template>
      <NDataTable
        :columns="columns"
        :data="data"
        size="small"
        :flex-height="!appStore.isMobile"
        :scroll-x="scrollX"
        :loading="loading"
        :row-key="row => row.id"
        default-expand-all
        class="h-full"
      />
      <MenuOperateDrawer
        v-model:visible="drawerVisible"
        :operate-type="operateType"
        :row-data="editingData"
        @submitted="getData"
      />
    </NCard>
  </div>
</template>

<style scoped></style>
