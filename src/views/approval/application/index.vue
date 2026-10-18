<script setup lang="tsx">
import { ref } from 'vue';
import { NButton, NTag } from 'naive-ui';
import { fetchMyApprovalInstances } from '@/service/api/approval';
import { useAuth } from '@/hooks/business/auth';
import { defaultTransform, useNaivePaginatedTable } from '@/hooks/common/table';
import DetailDrawer from '../modules/detail-drawer.vue';
import StartApprovalDrawer from '../modules/start-approval-drawer.vue';
import { statusLabels, statusTypes } from '../modules/status';

defineOptions({ name: 'ApprovalApplication' });
const { hasAuth } = useAuth();
const failed = ref(false);
const visible = ref(false);
const startVisible = ref(false);
const selectedId = ref<CommonType.IdType>();
const query = ref<Api.Approval.InstanceQuery>({ page: 1, size: 10, title: null, businessType: null, status: null });
const statusOptions = ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'].map(value => ({ value, label: statusLabels[value as Api.Approval.Status] }));
const { columns, data, getData, getDataByPage, loading, mobilePagination, scrollX } = useNaivePaginatedTable({
  api: async () => {
    const result = await fetchMyApprovalInstances(query.value);
    failed.value = Boolean(result.error);
    return result;
  },
  transform: response => defaultTransform(response),
  onPaginationParamsChange: params => { query.value.page = params.page ?? 1; query.value.size = params.pageSize ?? 10; },
  columns: () => [
    { key: 'title', title: '申请标题', minWidth: 180, ellipsis: { tooltip: true } },
    { key: 'startUserName', title: '发起人', minWidth: 100 },
    { key: 'status', title: '状态', width: 100, render: row => <NTag size="small" type={statusTypes[row.status]}>{statusLabels[row.status]}</NTag> },
    { key: 'currentNodeName', title: '当前节点', minWidth: 140, render: row => row.currentNodeName || '—' },
    { key: 'startTime', title: '发起时间', minWidth: 170 },
    { key: 'operate', title: '操作', width: 90, render: row => hasAuth('approval:instance:get') ? <NButton text type="primary" onClick={() => { selectedId.value = row.id; visible.value = true; }}>详情</NButton> : null }
  ]
});
function reset() {
  query.value.title = null;
  query.value.businessType = null;
  query.value.status = null;
  void getDataByPage();
}
</script>

<template>
  <div class="flex-col gap-16px">
    <NCard :bordered="false" size="small" class="card-wrapper">
      <NForm inline :model="query" label-placement="left" class="flex flex-wrap">
        <NFormItem label="申请标题">
          <NInput v-model:value="query.title" placeholder="申请标题" clearable @keyup.enter="getDataByPage()" />
        </NFormItem>
        <NFormItem label="状态">
          <NSelect v-model:value="query.status" :options="statusOptions" clearable class="w-120px" />
        </NFormItem>
        <NSpace>
          <NButton type="primary" :loading="loading" @click="getDataByPage()">查询</NButton>
          <NButton @click="reset">重置</NButton>
        </NSpace>
      </NForm>
    </NCard>
    <NCard title="我的申请" :bordered="false" size="small" class="card-wrapper">
      <template #header-extra>
        <NButton v-if="hasAuth('approval:instance:start')" type="primary" @click="startVisible = true">
          新建审批
        </NButton>
      </template>
      <NAlert v-if="failed" type="error" class="mb-16px">
        申请列表加载失败。
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
    <StartApprovalDrawer v-model:visible="startVisible" @submitted="getData" />
  </div>
</template>
