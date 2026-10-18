<script setup lang="tsx">
import { ref } from 'vue';
import { NButton, NTag } from 'naive-ui';
import { fetchMyApprovalTasks } from '@/service/api/approval';
import { useAuth } from '@/hooks/business/auth';
import { defaultTransform, useNaivePaginatedTable } from '@/hooks/common/table';
import DetailDrawer from '../modules/detail-drawer.vue';
import { statusLabels, statusTypes } from '../modules/status';

defineOptions({ name: 'ApprovalTask' });
const { hasAuth } = useAuth();
const failed = ref(false);
const visible = ref(false);
const selectedId = ref<CommonType.IdType>();
const tab = ref<'pending' | 'completed'>('pending');
const query = ref<Api.Approval.TaskQuery>({ page: 1, size: 10, title: null, completed: false });
const { columns, data, getData, getDataByPage, loading, mobilePagination, scrollX } = useNaivePaginatedTable({
  api: async () => {
    const result = await fetchMyApprovalTasks(query.value);
    failed.value = Boolean(result.error);
    return result;
  },
  transform: response => defaultTransform(response),
  onPaginationParamsChange: params => { query.value.page = params.page ?? 1; query.value.size = params.pageSize ?? 10; },
  columns: () => [
    { key: 'title', title: '申请标题', minWidth: 200, ellipsis: { tooltip: true } },
    { key: 'nodeName', title: '审批节点', minWidth: 140 },
    { key: 'status', title: '状态', width: 100, render: row => <NTag size="small" type={statusTypes[row.status]}>{row.status === 'PENDING' ? '待处理' : statusLabels[row.status]}</NTag> },
    { key: 'createTime', title: '分配时间', minWidth: 170 },
    { key: 'completeTime', title: '处理时间', minWidth: 170, render: row => row.completeTime || '—' },
    { key: 'operate', title: '操作', width: 120, render: row => hasAuth('approval:instance:get') ? <NButton text type="primary" onClick={() => { selectedId.value = row.instanceId; visible.value = true; }}>{row.status === 'PENDING' ? '查看并处理' : '查看详情'}</NButton> : null }
  ]
});
function changeTab(value: 'pending' | 'completed') {
  tab.value = value;
  query.value.completed = value === 'completed';
  void getDataByPage();
}
function reset() { query.value.title = null; void getDataByPage(); }
</script>

<template>
  <div class="flex-col gap-16px">
    <NCard :bordered="false" size="small" class="card-wrapper">
      <NForm inline label-placement="left">
        <NFormItem label="申请标题">
          <NInput v-model:value="query.title" placeholder="申请标题" clearable @keyup.enter="getDataByPage()" />
        </NFormItem>
        <NSpace>
          <NButton type="primary" :loading="loading" @click="getDataByPage()">查询</NButton>
          <NButton @click="reset">重置</NButton>
        </NSpace>
      </NForm>
    </NCard>
    <NCard title="我的审批任务" :bordered="false" size="small" class="card-wrapper">
      <NTabs :value="tab" type="line" class="mb-16px" @update:value="changeTab">
        <NTab name="pending">待我审批</NTab>
        <NTab name="completed">我已处理</NTab>
      </NTabs>
      <NAlert v-if="failed" type="error" class="mb-16px">
        任务列表加载失败。
        <NButton text @click="getData">重试</NButton>
      </NAlert>
      <NDataTable
        :columns="columns"
        :data="data"
        :row-key="row => row.id"
        :loading="loading"
        :scroll-x="scrollX"
        :pagination="mobilePagination"
        remote
      />
    </NCard>
    <DetailDrawer :id="selectedId" v-model:visible="visible" @changed="getData" />
  </div>
</template>
