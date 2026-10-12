<script setup lang="tsx">
import { reactive, ref } from 'vue';
import { fetchBatchDeleteOpenApp, fetchGetOpenAppPage } from '@/service/api/system';
import { useAppStore } from '@/store/modules/app';
import { useAuth } from '@/hooks/business/auth';
import { defaultTransform, useNaivePaginatedTable } from '@/hooks/common/table';
import { $t } from '@/locales';

defineOptions({
  name: 'OpenApp'
});

const appStore = useAppStore();
const { hasAuth } = useAuth();

const searchParams = reactive<Api.Open.OpenAppQuery>({
  page: 1,
  size: 10,
  description: null
});

const { columns, columnChecks, data, getData, loading, mobilePagination, scrollX } =
  useNaivePaginatedTable({
    api: () => fetchGetOpenAppPage(searchParams),
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
        title: '应用名称',
        align: 'center',
        minWidth: 140
      },
      {
        key: 'accessKey',
        title: '访问密钥',
        align: 'center',
        minWidth: 220,
        ellipsis: { tooltip: true }
      },
      {
        key: 'status',
        title: '状态',
        align: 'center',
        width: 80,
        render: row => <DictTag dictCode="dis_enable_status_enum" value={row.status} size="small" />
      },
      {
        key: 'expireTime',
        title: '过期时间',
        align: 'center',
        minWidth: 150
      },
      {
        key: 'description',
        title: '描述',
        align: 'center',
        minWidth: 140,
        ellipsis: { tooltip: true }
      },
      {
        key: 'operate',
        title: $t('common.operate'),
        align: 'center',
        width: 90,
        render: row => {
          if (!hasAuth('open:app:delete')) return null;
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
        }
      }
    ]
  });

const checkedRowKeys = ref<CommonType.IdType[]>([]);

async function handleDelete(id: CommonType.IdType) {
  const { error } = await fetchBatchDeleteOpenApp([id]);
  if (error) return;
  window.$message?.success($t('common.deleteSuccess'));
  await getData();
}

async function handleBatchDelete() {
  const { error } = await fetchBatchDeleteOpenApp(checkedRowKeys.value);
  if (error) return;
  window.$message?.success($t('common.deleteSuccess'));
  await getData();
}
</script>

<template>
  <div class="min-h-500px flex-col-stretch gap-16px overflow-hidden lt-sm:overflow-auto">
    <NCard title="应用列表" :bordered="false" size="small" class="card-wrapper sm:flex-1-hidden">
      <template #header-extra>
        <TableHeaderOperation
          v-model:columns="columnChecks"
          v-model:checked-row-keys="checkedRowKeys"
          :disabled-delete="checkedRowKeys.length === 0"
          :loading="loading"
          :show-add="false"
          :show-delete="hasAuth('open:app:delete')"
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
        remote
        :row-key="row => row.id"
        :pagination="mobilePagination"
        class="h-full"
      />
    </NCard>
  </div>
</template>

<style scoped></style>
