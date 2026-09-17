<script setup lang="tsx">
import { computed, ref } from 'vue';
import { NAvatar, NButton, NDivider, NEllipsis } from 'naive-ui';
import { useBoolean, useLoading } from '@sa/hooks';
import { jsonClone } from '@sa/utils';
import { fetchBatchDeleteUser, fetchGetContinewUserList, fetchGetDeptTree } from '@/service/api/system';
import { useAppStore } from '@/store/modules/app';
import { defaultTransform, useNaivePaginatedTable, useTableOperate } from '@/hooks/common/table';
import { useAuth } from '@/hooks/business/auth';
import { useDownload } from '@/hooks/business/download';
import ButtonIcon from '@/components/custom/button-icon.vue';
import { $t } from '@/locales';
import DictTag from '@/components/custom/dict-tag.vue';
import UserOperateDrawer from './modules/user-operate-drawer.vue';
import UserImportModal from './modules/user-import-modal.vue';
import UserPasswordDrawer from './modules/user-password-drawer.vue';
import UserSearch from './modules/user-search.vue';

defineOptions({
  name: 'UserList'
});

const { hasAuth } = useAuth();
const appStore = useAppStore();
const { download } = useDownload();

const { bool: importVisible, setTrue: openImportModal } = useBoolean();
const { bool: passwordVisible, setTrue: openPasswordDrawer } = useBoolean();

const searchParams = ref<Api.System.ContinewUserQuery>({
  page: 1,
  size: 10,
  deptId: null,
  description: null,
  status: null,
  createTime: null
});

const { columns, columnChecks, data, getData, getDataByPage, loading, mobilePagination, scrollX } =
  useNaivePaginatedTable({
    api: () => fetchGetContinewUserList(searchParams.value),
    transform: response => defaultTransform(response),
    onPaginationParamsChange: params => {
      searchParams.value.page = params.page ?? 1;
      searchParams.value.size = params.pageSize ?? 10;
    },
    columns: () => [
      {
        type: 'selection',
        align: 'center',
        width: 48
      },
      {
        key: 'username',
        title: $t('page.system.user.userName'),
        align: 'left',
        width: 220,
        ellipsis: true,
        render: row => {
          return (
            <div class="flex items-center justify-center gap-2">
              <NAvatar src={row.avatar} class="bg-primary">
                {row.avatar ? undefined : row.nickname.charAt(0)}
              </NAvatar>
              <div class="max-w-160px flex flex-col">
                <NEllipsis>{row.username}</NEllipsis>
                <NEllipsis>{row.nickname}</NEllipsis>
              </div>
            </div>
          );
        }
      },
      {
        key: 'gender',
        title: $t('page.system.user.sex'),
        align: 'center',
        width: 80,
        ellipsis: true,
        render(row) {
          return <DictTag value={row.gender} dictCode="gender" />;
        }
      },
      {
        key: 'deptName',
        title: $t('page.system.user.deptName'),
        align: 'center',
        width: 120,
        ellipsis: true
      },
      {
        key: 'email',
        title: $t('page.system.user.email'),
        align: 'center',
        width: 120,
        ellipsis: true
      },
      {
        key: 'phone',
        title: $t('page.system.user.phonenumber'),
        align: 'center',
        width: 120,
        ellipsis: true
      },
      {
        key: 'status',
        title: $t('page.system.user.status'),
        align: 'center',
        width: 80,
        render(row) {
          return <DictTag value={row.status} dictCode="dis_enable_status" />;
        }
      },
      {
        key: 'createTime',
        title: $t('page.system.user.createTime'),
        align: 'center',
        width: 120
      },
      {
        key: 'operate',
        title: $t('common.operate'),
        align: 'center',
        width: 150,
        render: row => {
          if (row.isSystem) return null;

          const editBtn = () => {
            return (
              <ButtonIcon
                text
                type="primary"
                icon="material-symbols:drive-file-rename-outline-outline"
                tooltipContent={$t('common.edit')}
                onClick={() => edit(row.id)}
              />
            );
          };

          const passwordBtn = () => {
            return (
              <ButtonIcon
                text
                type="primary"
                icon="material-symbols:key-vertical-outline"
                tooltipContent="重置密码"
                onClick={() => handleResetPwd(row.id)}
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
          if (hasAuth('system:user:update')) buttons.push(editBtn());
          if (hasAuth('system:user:resetPwd')) buttons.push(passwordBtn());
          if (hasAuth('system:user:delete')) buttons.push(deleteBtn());

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

async function handleBatchDelete() {
  // request
  const { error } = await fetchBatchDeleteUser(checkedRowKeys.value);
  if (error) return;
  onBatchDeleted();
}

async function handleDelete(userId: CommonType.IdType) {
  // request
  const { error } = await fetchBatchDeleteUser([userId]);
  if (error) return;
  onDeleted();
}

async function edit(userId: CommonType.IdType) {
  handleEdit(userId);
}

async function handleResetPwd(userId: CommonType.IdType) {
  const findItem = data.value.find(item => item.id === userId) || null;
  editingData.value = jsonClone(findItem);
  openPasswordDrawer();
}

const { loading: treeLoading, startLoading: startTreeLoading, endLoading: endTreeLoading } = useLoading();
const deptPattern = ref<string>();
const deptData = ref<Api.Common.CommonTreeRecord>([]);
const selectedKeys = ref<string[]>([]);

async function getTreeData() {
  startTreeLoading();
  const { data: tree, error } = await fetchGetDeptTree();
  if (!error) {
    deptData.value = tree;
  }
  endTreeLoading();
}

getTreeData();

function handleClickTree(keys: string[]) {
  searchParams.value.deptId = keys.length ? keys[0] : null;
  checkedRowKeys.value = [];
  getDataByPage();
}

function handleResetTreeData() {
  deptPattern.value = undefined;
  getTreeData();
}

function handleImport() {
  openImportModal();
}

function handleExport() {
  download('/system/user/export', searchParams.value, `${$t('page.system.user.title')}_${new Date().getTime()}.xlsx`);
}

const expandedKeys = ref<CommonType.IdType[]>([100]);

const selectable = computed(() => {
  return !loading.value;
});

function handleResetSearch() {
  selectedKeys.value = [];
  getDataByPage();
}
</script>

<template>
  <TableSiderLayout :sider-title="$t('page.system.dept.title')">
    <template #header-extra>
      <NButton size="small" text class="h-18px" @click.stop="() => handleResetTreeData()">
        <template #icon>
          <SvgIcon icon="ic:round-refresh" />
        </template>
      </NButton>
    </template>
    <template #sider>
      <NInput v-model:value="deptPattern" clearable :placeholder="$t('common.keywordSearch')" />
      <NSpin class="dept-tree" :show="treeLoading">
        <NTree
          v-model:expanded-keys="expandedKeys"
          v-model:selected-keys="selectedKeys"
          block-node
          show-line
          :data="deptData as []"
          :show-irrelevant-nodes="false"
          :pattern="deptPattern"
          class="infinite-scroll h-full min-h-200px py-3"
          key-field="id"
          label-field="name"
          virtual-scroll
          :selectable="selectable"
          @update:selected-keys="handleClickTree"
        >
          <template #empty>
            <NEmpty :description="$t('page.system.dept.empty')" class="h-full min-h-200px justify-center" />
          </template>
        </NTree>
      </NSpin>
    </template>
    <div class="h-full flex-col-stretch gap-12px overflow-hidden lt-sm:overflow-auto">
      <NCard :bordered="false" size="small" class="card-wrapper sm:flex-1-hidden">
        <UserSearch v-model:model="searchParams" class="mb-12px" @reset="handleResetSearch" @search="getDataByPage" />
        <div class="mb-12px flex flex-wrap items-center justify-between gap-12px">
          <NSpace>
            <NButton v-if="hasAuth('system:user:import')" size="small" @click="handleImport">
              <template #icon>
                <icon-material-symbols-upload-rounded class="text-icon" />
              </template>
              {{ $t('common.import') }}
            </NButton>
          </NSpace>
          <TableHeaderOperation
            v-model:columns="columnChecks"
            :disabled-delete="checkedRowKeys.length === 0"
            :loading="loading"
            :show-add="hasAuth('system:user:create')"
            :show-delete="hasAuth('system:user:delete')"
            :show-export="hasAuth('system:user:export')"
            @add="handleAdd"
            @delete="handleBatchDelete"
            @export="handleExport"
            @refresh="getData"
          />
        </div>
        <TableRowCheckAlert v-model:checked-row-keys="checkedRowKeys" />
        <NDataTable
          v-model:checked-row-keys="checkedRowKeys"
          :columns="columns"
          :data="data"
          size="small"
          :flex-height="!appStore.isMobile"
          :scroll-x="scrollX"
          :loading="loading"
          remote
          :row-key="row => row.id"
          :pagination="mobilePagination"
          class="h-full"
        />
        <UserImportModal v-model:visible="importVisible" @submitted="getData" />
        <UserOperateDrawer
          v-model:visible="drawerVisible"
          :operate-type="operateType"
          :row-data="editingData"
          :dept-data="deptData"
          :dept-id="searchParams.deptId"
          @submitted="getDataByPage"
        />
        <UserPasswordDrawer v-model:visible="passwordVisible" :row-data="editingData" />
      </NCard>
    </div>
  </TableSiderLayout>
</template>

<style scoped lang="scss">
.dept-tree {
  .n-button {
    --n-padding: 8px !important;
  }

  :deep(.n-tree__empty) {
    height: 100%;
    justify-content: center;
  }

  :deep(.n-spin-content) {
    height: 100%;
  }

  :deep(.infinite-scroll) {
    height: calc(100vh - 228px - var(--calc-footer-height, 0px)) !important;
    max-height: calc(100vh - 228px - var(--calc-footer-height, 0px)) !important;
  }

  @media screen and (max-width: 1024px) {
    :deep(.infinite-scroll) {
      height: calc(100vh - 227px - var(--calc-footer-height, 0px)) !important;
      max-height: calc(100vh - 227px - var(--calc-footer-height, 0px)) !important;
    }
  }

  :deep(.n-tree-node) {
    height: 30px;
  }

  :deep(.n-tree-node-switcher) {
    height: 30px;
  }

  :deep(.n-tree-node-switcher__icon) {
    font-size: 16px !important;
    height: 16px !important;
    width: 16px !important;
  }
}

:deep(.n-data-table-wrapper),
:deep(.n-data-table-base-table),
:deep(.n-data-table-base-table-body) {
  height: 100%;
}

@media screen and (max-width: 800px) {
  :deep(.n-data-table-base-table-body) {
    max-height: calc(100vh - 400px - var(--calc-footer-height, 0px));
  }
}

@media screen and (max-width: 802px) {
  :deep(.n-data-table-base-table-body) {
    max-height: calc(100vh - 473px - var(--calc-footer-height, 0px));
  }
}

:deep(.n-card-header__main) {
  min-width: 69px !important;
}
</style>
