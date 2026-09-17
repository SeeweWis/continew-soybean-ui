<script setup lang="tsx">
import { reactive, ref } from 'vue';
import {
  fetchDeleteTenantPackage,
  fetchGetTenantPackageDetail,
  fetchGetTenantPackagePage
} from '@/service/api/system';
import { useAppStore } from '@/store/modules/app';
import { useAuth } from '@/hooks/business/auth';
import { defaultTransform, useNaivePaginatedTable } from '@/hooks/common/table';
import { $t } from '@/locales';
import ButtonIcon from '@/components/custom/button-icon.vue';
import DictTag from '@/components/custom/dict-tag.vue';
import PackageOperateDrawer from './modules/tenant-package-operate-drawer.vue';

defineOptions({
  name: 'TenantPackage'
});

const appStore = useAppStore();
const { hasAuth } = useAuth();

const searchParams = reactive<Api.System.ContinewTenantPackageQuery>({
  page: 1,
  size: 10,
  description: null,
  status: null
});

const { columns, columnChecks, data, getData, getDataByPage, loading, mobilePagination, scrollX } =
  useNaivePaginatedTable({
    api: () => fetchGetTenantPackagePage(searchParams),
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
        title: '套餐名称',
        align: 'center',
        minWidth: 140
      },
      {
        key: 'sort',
        title: '排序',
        align: 'center',
        width: 80
      },
      {
        key: 'description',
        title: '描述',
        align: 'center',
        minWidth: 160,
        ellipsis: { tooltip: true }
      },
      {
        key: 'status',
        title: '状态',
        align: 'center',
        width: 80,
        render: row => <DictTag dictCode="dis_enable_status" value={row.status} size="small" />
      },
      {
        key: 'createTime',
        title: '创建时间',
        align: 'center',
        minWidth: 150
      },
      {
        key: 'operate',
        title: $t('common.operate'),
        align: 'center',
        width: 160,
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
              {editBtn() && deleteBtn() && <NDivider vertical />}
              {deleteBtn()}
            </div>
          );
        }
      }
    ]
  });

const checkedRowKeys = ref<CommonType.IdType[]>([]);

const drawerVisible = ref(false);
const operateType = ref<'add' | 'edit'>('add');
const editingPackage = ref<Api.System.ContinewTenantPackage | null>(null);

function handleAdd() {
  operateType.value = 'add';
  editingPackage.value = null;
  drawerVisible.value = true;
}

async function handleEdit(id: CommonType.IdType) {
  operateType.value = 'edit';
  const { data: detail, error } = await fetchGetTenantPackageDetail(id);
  if (error) return;
  editingPackage.value = detail;
  drawerVisible.value = true;
}

async function handleDelete(id: CommonType.IdType) {
  const { error } = await fetchDeleteTenantPackage(id);
  if (error) return;
  window.$message?.success($t('common.deleteSuccess'));
  await getData();
}

function handleResetSearch() {
  searchParams.description = null;
  searchParams.status = null;
  getDataByPage();
}
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
            v-model:value="searchParams.status"
            clearable
            class="w-160px"
            :options="[
              { label: '启用', value: 1 },
              { label: '禁用', value: 2 }
            ]"
            placeholder="请选择状态"
            @update:value="() => getDataByPage()"
          />
          <NButton size="small" @click="handleResetSearch">
            <template #icon><icon-ic-round-refresh class="text-icon" /></template>
            重置
          </NButton>
        </NSpace>
        <TableHeaderOperation
          v-model:columns="columnChecks"
          :loading="loading"
          :show-add="hasAuth('tenant:create')"
          :show-delete="false"
          @add="handleAdd"
          @refresh="getData"
        />
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
      <PackageOperateDrawer
        v-model:visible="drawerVisible"
        :operate-type="operateType"
        :package-data="editingPackage"
        @submitted="getData"
      />
    </NCard>
  </div>
</template>

<style scoped></style>
