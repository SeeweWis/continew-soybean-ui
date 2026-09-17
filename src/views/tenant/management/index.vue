<script setup lang="tsx">
import { reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { fetchDeleteTenant, fetchGetTenantPackageDict, fetchGetTenantPage, fetchResetTenantAdminPwd } from '@/service/api/system';
import { useAppStore } from '@/store/modules/app';
import { useAuth } from '@/hooks/business/auth';
import { defaultTransform, useNaivePaginatedTable } from '@/hooks/common/table';
import { $t } from '@/locales';
import ButtonIcon from '@/components/custom/button-icon.vue';
import DictTag from '@/components/custom/dict-tag.vue';
import TenantOperateDrawer from './modules/tenant-operate-drawer.vue';

defineOptions({
  name: 'TenantManagement'
});

const router = useRouter();
const appStore = useAppStore();
const { hasAuth } = useAuth();

const searchParams = reactive<Api.System.ContinewTenantQuery>({
  page: 1,
  size: 10,
  description: null,
  code: null,
  domain: null,
  packageId: null
});

const { columns, columnChecks, data, getData, getDataByPage, loading, mobilePagination, scrollX } =
  useNaivePaginatedTable({
    api: () => fetchGetTenantPage(searchParams),
    transform: response => defaultTransform(response),
    onPaginationParamsChange: params => {
      searchParams.page = params.page ?? 1;
      searchParams.size = params.pageSize ?? 10;
    },
    columns: () => [
      {
        type: 'selection',
        align: 'center',
        width: 48
      },
      {
        key: 'name',
        title: '租户名称',
        align: 'center',
        minWidth: 140
      },
      {
        key: 'code',
        title: '租户编码',
        align: 'center',
        minWidth: 120
      },
      {
        key: 'packageName',
        title: '绑定套餐',
        align: 'center',
        minWidth: 120
      },
      {
        key: 'adminUsername',
        title: '管理员账号',
        align: 'center',
        minWidth: 120
      },
      {
        key: 'domain',
        title: '域名',
        align: 'center',
        minWidth: 120,
        ellipsis: { tooltip: true }
      },
      {
        key: 'expireTime',
        title: '过期时间',
        align: 'center',
        minWidth: 140
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
        width: 220,
        render: row => {
          const editBtn = () => {
            if (!hasAuth('tenant:update')) return null;
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
          const resetPwdBtn = () => {
            if (!hasAuth('tenant:update')) return null;
            return (
              <ButtonIcon
                text
                type="warning"
                icon="material-symbols:key-outline-rounded"
                tooltipContent="重置管理员密码"
                popconfirmContent="确定重置该租户管理员密码吗？重置后密码为默认值。"
                onPositiveClick={() => handleResetPwd(row.id)}
              />
            );
          };
          const deleteBtn = () => {
            if (!hasAuth('tenant:delete')) return null;
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
              {editBtn()}
              {resetPwdBtn()}
              {deleteBtn()}
            </div>
          );
        }
      }
    ]
  });

const checkedRowKeys = ref<CommonType.IdType[]>([]);
const packageOptions = ref<Api.System.LabelValue[]>([]);

const drawerVisible = ref(false);
const operateType = ref<'add' | 'edit'>('add');
const editingId = ref<CommonType.IdType | null>(null);

function handleAdd() {
  operateType.value = 'add';
  editingId.value = null;
  drawerVisible.value = true;
}

function handleEdit(id: CommonType.IdType) {
  operateType.value = 'edit';
  editingId.value = id;
  drawerVisible.value = true;
}

async function handleResetPwd(id: CommonType.IdType) {
  const { error } = await fetchResetTenantAdminPwd(id, '123456');
  if (error) return;
  window.$message?.success('重置成功，新密码为 123456');
}

async function handleDelete(id: CommonType.IdType) {
  const { error } = await fetchDeleteTenant(id);
  if (error) return;
  window.$message?.success($t('common.deleteSuccess'));
  await getData();
}

function goPackage() {
  router.push('/tenant/package');
}

async function getPackageOptions() {
  const { data: packageDict, error } = await fetchGetTenantPackageDict();
  if (!error) packageOptions.value = packageDict ?? [];
}

function handleResetSearch() {
  searchParams.description = null;
  searchParams.packageId = null;
  getDataByPage();
}

getPackageOptions();
</script>

<template>
  <div class="min-h-500px flex-col-stretch gap-16px overflow-hidden lt-sm:overflow-auto">
    <NCard :bordered="false" size="small" class="card-wrapper sm:flex-1-hidden">
      <div class="mb-12px flex flex-wrap items-center justify-between gap-12px">
        <NSpace>
          <NInput
            v-model:value="searchParams.description"
            clearable
            class="w-240px"
            placeholder="搜索名称/描述"
            @keyup.enter="() => getDataByPage()"
          >
            <template #prefix><SvgIcon icon="material-symbols:search-rounded" /></template>
          </NInput>
          <NSelect
            v-model:value="searchParams.packageId"
            clearable
            class="w-180px"
            :options="packageOptions"
            placeholder="请选择套餐"
            @update:value="() => getDataByPage()"
          />
          <NButton size="small" @click="handleResetSearch">
            <template #icon><icon-ic-round-refresh class="text-icon" /></template>
            重置
          </NButton>
        </NSpace>
        <NSpace>
          <NButton size="small" @click="goPackage">套餐管理</NButton>
          <TableHeaderOperation
            v-model:columns="columnChecks"
            :loading="loading"
            :show-add="hasAuth('tenant:create')"
            :show-delete="false"
            @add="handleAdd"
            @refresh="getData"
          />
        </NSpace>
      </div>
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
      <TenantOperateDrawer
        v-model:visible="drawerVisible"
        :operate-type="operateType"
        :tenant-id="editingId"
        @submitted="getData"
      />
    </NCard>
  </div>
</template>

<style scoped></style>
