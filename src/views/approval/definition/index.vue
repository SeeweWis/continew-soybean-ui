<script setup lang="tsx">
import { ref } from 'vue';
import { NButton, NTag } from 'naive-ui';
import { deleteApprovalDefinitions, fetchApprovalDefinitions } from '@/service/api/approval';
import { useAuth } from '@/hooks/business/auth';
import DefinitionDrawer from './modules/definition-drawer.vue';

defineOptions({ name: 'ApprovalDefinition' });
const { hasAuth } = useAuth();
const rows = ref<Api.Approval.Definition[]>([]);
const loading = ref(false);
const failed = ref(false);
const deleting = ref<CommonType.IdType | null>(null);
const query = ref<Api.Approval.DefinitionQuery>({ name: null, category: null, status: null });
const visible = ref(false);
const selectedId = ref<CommonType.IdType>();
const readonly = ref(false);
const columns: NaiveUI.TableColumn<Api.Approval.Definition>[] = [
  { key: 'name', title: '审批名称', minWidth: 150, ellipsis: { tooltip: true } },
  { key: 'code', title: '审批编码', minWidth: 160, ellipsis: { tooltip: true } },
  { key: 'category', title: '分类', minWidth: 100 },
  { key: 'status', title: '发布状态', width: 90, render: row => <NTag size="small" type={row.status === 1 ? 'success' : 'default'}>{row.status === 1 ? '已发布' : '已停用'}</NTag> },
  { key: 'description', title: '说明', minWidth: 180, ellipsis: { tooltip: true } },
  { key: 'createTime', title: '创建时间', minWidth: 170 },
  { key: 'operate', title: '操作', width: 180, render: row => <div class="flex gap-12px">
    {hasAuth('approval:definition:get') && <NButton text type="primary" onClick={() => open(row.id, true)}>详情</NButton>}
    {hasAuth('approval:definition:update') && hasAuth('approval:definition:get') && <NButton text type="primary" onClick={() => open(row.id)}>编辑</NButton>}
    {hasAuth('approval:definition:delete') && <NButton text type="error" loading={deleting.value === row.id} onClick={() => remove(row)}>删除</NButton>}
  </div> }
];

function open(id?: CommonType.IdType, view = false) {
  selectedId.value = id;
  readonly.value = view;
  visible.value = true;
}

async function load() {
  loading.value = true;
  failed.value = false;
  try {
    const { data, error } = await fetchApprovalDefinitions(query.value);
    if (error) failed.value = true;
    else rows.value = data;
  } finally { loading.value = false; }
}

function reset() {
  query.value = { name: null, category: null, status: null };
  void load();
}

function remove(row: Api.Approval.Definition) {
  window.$dialog?.warning({ title: '删除审批定义', content: `确定删除“${row.name}”吗？删除后不能再以该定义发起新审批。`,
    positiveText: '删除', negativeText: '取消', onPositiveClick: async () => {
      if (deleting.value !== null) return false;
      deleting.value = row.id;
      try {
        const { error } = await deleteApprovalDefinitions([row.id]);
        if (error) return false;
        window.$message?.success('审批定义已删除');
        await load();
        return true;
      } finally { deleting.value = null; }
    } });
}

if (hasAuth('approval:definition:list')) void load();
</script>

<template>
  <div class="flex-col gap-16px">
    <NCard :bordered="false" size="small" class="card-wrapper">
      <NForm inline :model="query" label-placement="left" class="flex flex-wrap">
        <NFormItem label="审批名称">
          <NInput v-model:value="query.name" placeholder="审批名称" clearable @keyup.enter="load" />
        </NFormItem>
        <NFormItem label="分类">
          <NInput v-model:value="query.category" placeholder="分类" clearable @keyup.enter="load" />
        </NFormItem>
        <NFormItem label="状态">
          <NSelect
            v-model:value="query.status"
            class="w-120px"
            clearable
            :options="[
              { label: '已发布', value: 1 },
              { label: '已停用', value: 0 }
            ]"
          />
        </NFormItem>
        <NSpace>
          <NButton type="primary" :loading="loading" @click="load">查询</NButton>
          <NButton @click="reset">重置</NButton>
        </NSpace>
      </NForm>
    </NCard>
    <NCard title="审批定义" :bordered="false" size="small" class="card-wrapper">
      <template #header-extra>
        <NButton v-if="hasAuth('approval:definition:create')" type="primary" @click="open()">新建审批定义</NButton>
      </template>
      <NAlert v-if="!hasAuth('approval:definition:list')" type="warning">暂无审批定义查询权限</NAlert>
      <NAlert v-else-if="failed" type="error">
        加载失败，原有数据已保留。
        <NButton text @click="load">重试</NButton>
      </NAlert>
      <NDataTable
        v-else
        :columns="columns"
        :data="rows"
        :row-key="row => row.id"
        :loading="loading"
        :scroll-x="1020"
        :pagination="{ pageSize: 10 }"
      />
    </NCard>
    <DefinitionDrawer :id="selectedId" v-model:visible="visible" :readonly="readonly" @submitted="load" />
  </div>
</template>
