<script setup lang="tsx">
import { ref } from 'vue';

import { jsonClone } from '@sa/utils';
import { useBoolean } from '@sa/hooks';
import { fetchBatchDeleteRole, fetchGetRoleList } from '@/service/api/system';
import { useAppStore } from '@/store/modules/app';
import { useAuth } from '@/hooks/business/auth';
import { useNaiveTable, useTableOperate } from '@/hooks/common/table';
import { $t } from '@/locales';
import ButtonIcon from '@/components/custom/button-icon.vue';
import DictTag from '@/components/custom/dict-tag.vue';
import RoleOperateDrawer from './modules/role-operate-drawer.vue';
import RoleSearch from './modules/role-search.vue';
import RoleDataScopeDrawer from './modules/role-data-scope-drawer.vue';
import RolePermissionDrawer from './modules/role-permission-drawer.vue';
import RoleAuthUserDrawer from './modules/role-auth-user-drawer.vue';

defineOptions({
  name: 'RoleList'
});

const appStore = useAppStore();
const { hasAuth } = useAuth();

const { bool: dataScopeDrawerVisible, setTrue: openDataScopeDrawer } = useBoolean(false);
const { bool: permissionDrawerVisible, setTrue: openPermissionDrawer } = useBoolean(false);
const { bool: authUserDrawerVisible, setTrue: openAuthUserDrawer } = useBoolean(false);

const searchParams = ref<Api.System.ContinewRoleQuery>({
  description: null
});

const { columns, columnChecks, data, getData, loading, scrollX } = useNaiveTable({
  api: () => fetchGetRoleList(searchParams.value),
  transform: response => response.data ?? [],
  columns: () => [
    {
      key: 'index',
      title: $t('common.index'),
      align: 'center',
      width: 64,
      render: (_, index) => index + 1
    },
    {
      key: 'name',
      title: '角色名称',
      align: 'center',
      minWidth: 120
    },
    {
      key: 'code',
      title: '角色权限字符',
      align: 'center',
      minWidth: 120
    },
    {
      key: 'dataScope',
      title: '数据范围',
      align: 'center',
      minWidth: 160,
      render: row => {
        if (!row.dataScope) return null;
        return <DictTag dictCode="data_scope_enum" value={row.dataScope} />;
      }
    },
    {
      key: 'sort',
      title: '显示顺序',
      align: 'center',
      width: 90
    },
    {
      key: 'description',
      title: '描述',
      align: 'center',
      minWidth: 120,
      ellipsis: { tooltip: true }
    },
    {
      key: 'createTime',
      title: '创建时间',
      align: 'center',
      minWidth: 140
    },
    {
      key: 'operate',
      title: $t('common.operate'),
      align: 'center',
      width: 230,
      render: row => {
        if (row.isSystem) return null;

        const editBtn = () => {
          return (
            <ButtonIcon
              text
              type="primary"
              icon="material-symbols:drive-file-rename-outline-outline"
              tooltipContent={$t('common.edit')}
              // eslint-disable-next-line @typescript-eslint/no-use-before-define
              onClick={() => handleEdit(row.id)}
            />
          );
        };

        const permissionBtn = () => {
          return (
            <ButtonIcon
              text
              type="primary"
              icon="material-symbols:admin-panel-settings-outline"
              tooltipContent="功能权限"
              onClick={() => handlePermission(row)}
            />
          );
        };

        const dataScopeBtn = () => {
          return (
            <ButtonIcon
              text
              type="primary"
              icon="material-symbols:database"
              tooltipContent="数据范围权限"
              onClick={() => handleDataScope(row)}
            />
          );
        };

        const authUserBtn = () => {
          return (
            <ButtonIcon
              text
              type="primary"
              icon="material-symbols:assignment-ind-outline"
              tooltipContent="分配用户"
              onClick={() => handleAuthUser(row)}
            />
          );
        };

        const deleteBtn = () => {
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

        const buttons = [];
        if (hasAuth('system:role:update')) {
          buttons.push(editBtn(), permissionBtn(), dataScopeBtn(), authUserBtn());
        }
        if (hasAuth('system:role:delete')) buttons.push(deleteBtn());

        return (
          <div class="flex-center gap-8px">
            {buttons.map((btn, index) => (
              <>
                {index !== 0 && <NDivider vertical />}
                {btn}
              </>
            ))}
          </div>
        );
      }
    }
  ]
});

const { drawerVisible, operateType, editingData, handleAdd, handleEdit, checkedRowKeys, onBatchDeleted, onDeleted } =
  useTableOperate(data, 'id', getData);

const permissionRowData = ref<Api.System.ContinewRole | null>(null);

async function handleBatchDelete() {
  const { error } = await fetchBatchDeleteRole(checkedRowKeys.value);
  if (error) return;
  onBatchDeleted();
}

async function handleDelete(id: CommonType.IdType) {
  const { error } = await fetchBatchDeleteRole([id]);
  if (error) return;
  onDeleted();
}

async function handlePermission(row: Api.System.ContinewRole) {
  permissionRowData.value = jsonClone(row);
  openPermissionDrawer();
}

async function handleDataScope(row: Api.System.ContinewRole) {
  const findItem = data.value.find(item => item.id === row.id) || null;
  editingData.value = jsonClone(findItem);
  openDataScopeDrawer();
}

function handleAuthUser(row: Api.System.ContinewRole) {
  const findItem = data.value.find(item => item.id === row.id) || null;
  editingData.value = jsonClone(findItem);
  openAuthUserDrawer();
}
</script>

<template>
  <div class="min-h-500px flex-col-stretch gap-16px overflow-hidden lt-sm:overflow-auto">
    <RoleSearch v-model:model="searchParams" @search="getData" />
    <NCard title="角色列表" :bordered="false" size="small" class="card-wrapper sm:flex-1-hidden">
      <template #header-extra>
        <TableHeaderOperation
          v-model:columns="columnChecks"
          :disabled-delete="checkedRowKeys.length === 0"
          :loading="loading"
          :show-add="hasAuth('system:role:create')"
          :show-delete="hasAuth('system:role:delete')"
          @add="handleAdd"
          @delete="handleBatchDelete"
          @refresh="getData"
        />
      </template>
      <NDataTable
        v-model:checked-row-keys="checkedRowKeys"
        :columns="columns"
        :data="data"
        size="small"
        :flex-height="!appStore.isMobile"
        :scroll-x="scrollX"
        :loading="loading"
        :row-key="row => row.id"
        class="sm:h-full"
      />
      <RoleOperateDrawer
        v-model:visible="drawerVisible"
        :operate-type="operateType"
        :row-data="editingData"
        @submitted="getData"
      />
      <RoleDataScopeDrawer v-model:visible="dataScopeDrawerVisible" :row-data="editingData" @submitted="getData" />
      <RolePermissionDrawer
        v-model:visible="permissionDrawerVisible"
        :row-data="permissionRowData"
        @submitted="getData"
      />
      <RoleAuthUserDrawer v-model:visible="authUserDrawerVisible" :row-data="editingData" @submitted="getData" />
    </NCard>
  </div>
</template>

<style scoped></style>
