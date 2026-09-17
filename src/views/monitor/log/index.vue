<script setup lang="tsx">
import { reactive, ref } from 'vue';
import { NTag } from 'naive-ui';
import { fetchGetLogDetail, fetchGetLogPage } from '@/service/api/monitor';
import { useAppStore } from '@/store/modules/app';
import { useAuth } from '@/hooks/business/auth';
import { defaultTransform, useNaivePaginatedTable } from '@/hooks/common/table';
import { $t } from '@/locales';
import ButtonIcon from '@/components/custom/button-icon.vue';

defineOptions({
  name: 'Log'
});

const appStore = useAppStore();
const { hasAuth } = useAuth();

const searchParams = reactive<Api.Monitor.ContinewLogQuery>({
  page: 1,
  size: 10,
  description: null,
  module: null,
  ip: null,
  createUserString: null,
  createTime: null,
  status: null
});

const statusTagMap: Record<number, 'success' | 'error'> = {
  1: 'success',
  2: 'error'
};
const statusTextMap: Record<number, string> = {
  1: '成功',
  2: '失败'
};

const { columns, columnChecks, data, getData, getDataByPage, loading, mobilePagination, scrollX } =
  useNaivePaginatedTable({
    api: () => fetchGetLogPage(searchParams),
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
        key: 'description',
        title: '日志描述',
        align: 'center',
        minWidth: 160,
        ellipsis: { tooltip: true }
      },
      {
        key: 'module',
        title: '所属模块',
        align: 'center',
        minWidth: 100
      },
      {
        key: 'status',
        title: '操作状态',
        align: 'center',
        width: 90,
        render: row =>
          row.status ? (
            <NTag type={statusTagMap[row.status]} size="small">
              {statusTextMap[row.status]}
            </NTag>
          ) : null
      },
      {
        key: 'timeTaken',
        title: '耗时（ms）',
        align: 'center',
        width: 90
      },
      {
        key: 'ip',
        title: '操作 IP',
        align: 'center',
        minWidth: 120
      },
      {
        key: 'browser',
        title: '浏览器',
        align: 'center',
        minWidth: 100
      },
      {
        key: 'createUserString',
        title: '操作人',
        align: 'center',
        minWidth: 100
      },
      {
        key: 'createTime',
        title: '操作时间',
        align: 'center',
        minWidth: 160
      },
      {
        key: 'operate',
        title: $t('common.operate'),
        align: 'center',
        width: 90,
        render: row => {
          if (!hasAuth('monitor:log:get')) return null;
          return (
            <ButtonIcon
              text
              type="primary"
              icon="material-symbols:visibility-outline-rounded"
              tooltipContent="详情"
              onClick={() => showDetail(row.id)}
            />
          );
        }
      }
    ]
  });

const detailVisible = ref(false);
const detailLoading = ref(false);
const detail = ref<Api.Monitor.ContinewLogDetail | null>(null);

async function showDetail(id: CommonType.IdType) {
  detailVisible.value = true;
  detailLoading.value = true;
  const { data: logDetail, error } = await fetchGetLogDetail(id);
  if (!error) {
    detail.value = logDetail;
  }
  detailLoading.value = false;
}

function handleResetSearch() {
  Object.assign(searchParams, {
    description: null,
    module: null,
    ip: null,
    createUserString: null,
    createTime: null,
    status: null
  });
  getDataByPage();
}
</script>

<template>
  <div class="min-h-500px flex-col-stretch gap-16px overflow-hidden lt-sm:overflow-auto">
    <NCard :bordered="false" class="table-search card-wrapper" size="small">
      <NCollapse>
        <NCollapseItem :title="$t('common.search')" name="search">
          <NForm :model="searchParams" label-placement="left" :label-width="80">
            <NGrid responsive="screen" cols="1 s:2 m:4" :x-gap="8" :y-gap="8" item-responsive>
              <NFormItemGi span="24 s:12 m:8" label="日志描述" class="pr-24px">
                <NInput
                  v-model:value="searchParams.description"
                  placeholder="请输入日志描述"
                  @keyup.enter="() => getDataByPage()"
                />
              </NFormItemGi>
              <NFormItemGi span="24 s:12 m:8" label="所属模块" class="pr-24px">
                <NInput v-model:value="searchParams.module" placeholder="请输入所属模块" />
              </NFormItemGi>
              <NFormItemGi span="24 s:12 m:8" label="操作 IP" class="pr-24px">
                <NInput v-model:value="searchParams.ip" placeholder="请输入操作 IP" />
              </NFormItemGi>
              <NFormItemGi span="24 s:12 m:8" label="操作状态" class="pr-24px">
                <NSelect
                  v-model:value="searchParams.status"
                  :options="[
                    { label: '成功', value: 1 },
                    { label: '失败', value: 2 }
                  ]"
                  clearable
                />
              </NFormItemGi>
              <NFormItemGi span="24 s:12 m:8" label="操作人" class="pr-24px">
                <NInput v-model:value="searchParams.createUserString" placeholder="请输入操作人" />
              </NFormItemGi>
              <NFormItemGi span="24 s:24 m:16" label="操作时间" class="pr-24px">
                <NDatePicker v-model:value="searchParams.createTime" type="datetimerange" clearable />
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
    <NCard title="系统日志" :bordered="false" size="small" class="card-wrapper sm:flex-1-hidden">
      <template #header-extra>
        <TableHeaderOperation
          v-model:columns="columnChecks"
          :loading="loading"
          :show-add="false"
          :show-delete="false"
          @refresh="getData"
        />
      </template>
      <NDataTable
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

    <NModal v-model:show="detailVisible" preset="card" title="日志详情" class="w-720px">
      <NSpin :show="detailLoading">
        <NDescriptions v-if="detail" :columns="2" label-placement="left" bordered>
          <NDescriptionsItem label="日志描述">{{ detail.description }}</NDescriptionsItem>
          <NDescriptionsItem label="所属模块">{{ detail.module }}</NDescriptionsItem>
          <NDescriptionsItem label="操作状态">
            <NTag v-if="detail.status" :type="statusTagMap[detail.status]" size="small">
              {{ statusTextMap[detail.status] }}
            </NTag>
          </NDescriptionsItem>
          <NDescriptionsItem label="耗时">{{ detail.timeTaken }} ms</NDescriptionsItem>
          <NDescriptionsItem label="请求 URL">{{ detail.requestUrl }}</NDescriptionsItem>
          <NDescriptionsItem label="请求方式">{{ detail.requestMethod }}</NDescriptionsItem>
          <NDescriptionsItem label="状态码">{{ detail.statusCode }}</NDescriptionsItem>
          <NDescriptionsItem label="操作 IP">{{ detail.ip }}（{{ detail.address }}）</NDescriptionsItem>
          <NDescriptionsItem label="浏览器">{{ detail.browser }}</NDescriptionsItem>
          <NDescriptionsItem label="操作系统">{{ detail.os }}</NDescriptionsItem>
          <NDescriptionsItem label="操作人">{{ detail.createUserString }}</NDescriptionsItem>
          <NDescriptionsItem label="操作时间">{{ detail.createTime }}</NDescriptionsItem>
          <NDescriptionsItem label="错误信息" :span="2">
            {{ detail.errorMsg || '-' }}
          </NDescriptionsItem>
        </NDescriptions>
      </NSpin>
    </NModal>
  </div>
</template>

<style scoped></style>
