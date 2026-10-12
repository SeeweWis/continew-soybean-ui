<script setup lang="tsx">
import { reactive, ref } from 'vue';
import { fetchBatchDeleteSmsLog, fetchGetSmsLogPage } from '@/service/api/system';
import { useAppStore } from '@/store/modules/app';
import { useAuth } from '@/hooks/business/auth';
import { useDownload } from '@/hooks/business/download';
import { defaultTransform, useNaivePaginatedTable } from '@/hooks/common/table';
import { $t } from '@/locales';
import DictTag from '@/components/custom/dict-tag.vue';

defineOptions({
  name: 'SmsLog'
});

const appStore = useAppStore();
const { hasAuth } = useAuth();
const { download } = useDownload();

const searchParams = reactive<Api.System.ContinewSmsLogQuery>({
  page: 1,
  size: 10,
  configId: null,
  phone: null,
  status: null
});

const { columns, columnChecks, data, getData, getDataByPage, loading, mobilePagination, scrollX } =
  useNaivePaginatedTable({
    api: () => fetchGetSmsLogPage(searchParams),
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
        key: 'phone',
        title: '手机号',
        align: 'center',
        minWidth: 120
      },
      {
        key: 'params',
        title: '发送参数',
        align: 'center',
        minWidth: 180,
        ellipsis: { tooltip: true }
      },
      {
        key: 'status',
        title: '发送状态',
        align: 'center',
        width: 90,
        render: row => <DictTag dictCode="success_failure_status_enum" value={row.status} size="small" />
      },
      {
        key: 'resMsg',
        title: '响应信息',
        align: 'center',
        minWidth: 160,
        ellipsis: { tooltip: true }
      },
      {
        key: 'createTime',
        title: '发送时间',
        align: 'center',
        minWidth: 160
      },
      {
        key: 'operate',
        title: $t('common.operate'),
        align: 'center',
        width: 90,
        render: row => {
          if (!hasAuth('system:smsLog:delete')) return null;
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
  const { error } = await fetchBatchDeleteSmsLog([id]);
  if (error) return;
  window.$message?.success($t('common.deleteSuccess'));
  await getData();
}

async function handleBatchDelete() {
  const { error } = await fetchBatchDeleteSmsLog(checkedRowKeys.value);
  if (error) return;
  window.$message?.success($t('common.deleteSuccess'));
  await getData();
}

function handleResetSearch() {
  searchParams.phone = null;
  searchParams.status = null;
  getDataByPage();
}

function handleExport() {
  download('/system/sms/log/export', { ...searchParams, page: undefined, size: undefined }, `短信日志_${new Date().getTime()}.xlsx`);
}
</script>

<template>
  <div class="min-h-500px flex-col-stretch gap-16px overflow-hidden lt-sm:overflow-auto">
    <NCard :bordered="false" class="table-search card-wrapper" size="small">
      <NCollapse>
        <NCollapseItem :title="$t('common.search')" name="search">
          <NForm :model="searchParams" label-placement="left" :label-width="80">
            <NGrid responsive="screen" cols="1 s:2 m:3" :x-gap="8" :y-gap="8" item-responsive>
              <NFormItemGi span="24 s:12 m:8" label="手机号" class="pr-24px">
                <NInput
                  v-model:value="searchParams.phone"
                  placeholder="请输入手机号"
                  @keyup.enter="() => getDataByPage()"
                />
              </NFormItemGi>
              <NFormItemGi span="24 s:12 m:8" label="发送状态" class="pr-24px">
                <DictSelect
                  v-model:value="searchParams.status"
                  dict-code="success_failure_status_enum"
                  clearable
                />
              </NFormItemGi>
              <NFormItemGi span="24 s:12 m:8" class="pr-24px">
                <NSpace class="w-full" justify="end">
                  <NButton @click="() => handleResetSearch()">
                    <template #icon>
                      <icon-ic-round-refresh class="text-icon" />
                    </template>
                    重置
                  </NButton>
                  <NButton type="primary" ghost @click="() => getDataByPage()">
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
    <NCard title="短信日志" :bordered="false" size="small" class="card-wrapper sm:flex-1-hidden">
      <template #header-extra>
        <TableHeaderOperation
          v-model:columns="columnChecks"
          v-model:checked-row-keys="checkedRowKeys"
          :disabled-delete="checkedRowKeys.length === 0"
          :loading="loading"
          :show-add="false"
          :show-delete="hasAuth('system:smsLog:delete')"
          :show-export="hasAuth('system:smsLog:export')"
          @delete="handleBatchDelete"
          @refresh="getData"
          @export="handleExport"
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
