<script setup lang="tsx">
import { computed, onMounted, ref } from 'vue';
import { NButton } from 'naive-ui';
import type { DataTableColumns } from 'naive-ui';
import { fetchCalcFileDirSize, fetchCleanFileRecycle, fetchDeleteRecycleFile, fetchGetFileRecyclePage, fetchRestoreFile } from '@/service/api/system/file';
import { useAuth } from '@/hooks/business/auth';
import ButtonIcon from '@/components/custom/button-icon.vue';
import SvgIcon from './file-action-icon.vue';
import DictTag from '@/components/custom/dict-tag.vue';
import { formatFileSize } from './file-utils';

const emit = defineEmits<{ close: []; changed: [] }>();
const { hasAuth } = useAuth();
const name = ref<string | null>(null);
const page = ref(1);
const size = ref(10);
const total = ref(0);
const rows = ref<Api.System.ContinewFile[]>([]);
const loading = ref(false);
const failed = ref(false);
const busy = ref(false);
let sequence = 0;
async function refresh(reset = false) {
  if (reset) page.value = 1;
  const current = ++sequence;
  loading.value = true;
  const { data, error } = await fetchGetFileRecyclePage({ page: page.value, size: size.value, originalName: name.value, sort: ['updateTime,desc'] });
  if (current !== sequence) return;
  failed.value = Boolean(error);
  rows.value = error ? [] : data?.list || [];
  total.value = data?.total || 0;
  loading.value = false;
  if (page.value > 1 && !rows.value.length && !error) { page.value -= 1; void refresh(); }
}
function confirm(action: 'restore' | 'delete' | 'clean', row?: Api.System.ContinewFile) {
  const permission = `system:fileRecycle:${action}`;
  if (!hasAuth(permission) || busy.value) return;
  const content = action === 'restore' ? `确定还原「${row?.originalName || row?.name}」？` : action === 'clean' ? '确定清空回收站？此操作不可恢复。' : `确定永久删除「${row?.originalName || row?.name}」？此操作不可恢复。`;
  window.$dialog?.warning({
    title: '提示', content, positiveText: '确定', negativeText: '取消',
    onPositiveClick: async () => {
      busy.value = true;
      try {
        const result = action === 'restore' ? await fetchRestoreFile(row!.id) : action === 'delete' ? await fetchDeleteRecycleFile(row!.id) : await fetchCleanFileRecycle();
        if (result.error) return false;
        window.$message?.success(action === 'restore' ? '还原成功' : '删除成功');
        await refresh();
        emit('changed');
        return true;
      } finally { busy.value = false; }
    }
  });
}
const columns = computed<DataTableColumns<Api.System.ContinewFile>>(() => [
  { key: 'index', title: '序号', width: 66, align: 'center', render: (_row, index) => (page.value - 1) * size.value + index + 1 },
  { key: 'originalName', title: '名称', minWidth: 180, ellipsis: { tooltip: true }, render: row => row.originalName || row.name },
  { key: 'type', title: '类型', width: 100, render: row => <DictTag dictCode="file_type_enum" value={row.type} size="small" /> },
  { key: 'size', title: '大小', width: 110, render: row => row.type === 0 && row.size == null && hasAuth('system:file:calcDirSize') ? <NButton text type="primary" onClick={async () => { const { data, error } = await fetchCalcFileDirSize(row.id); if (!error && data) row.size = data.size; }}>计算</NButton> : formatFileSize(row.size) },
  { key: 'updateTime', title: '删除时间', width: 180 },
  ...(hasAuth(['system:fileRecycle:restore', 'system:fileRecycle:delete']) ? [{ key: 'actions', title: '操作', width: 130, render: (row: Api.System.ContinewFile) => <div class="file-row-actions">
    {hasAuth('system:fileRecycle:restore') && <NButton text type="primary" disabled={busy.value} onClick={() => confirm('restore', row)}>还原</NButton>}
    {hasAuth('system:fileRecycle:delete') && <NButton text type="error" disabled={busy.value} onClick={() => confirm('delete', row)}>删除</NButton>}
  </div> }] : [])
]);
const pagination = computed(() => ({
  page: page.value, pageSize: size.value, itemCount: total.value, showSizePicker: true, pageSizes: [10, 20, 50, 100],
  onUpdatePage: (value: number) => { page.value = value; void refresh(); },
  onUpdatePageSize: (value: number) => { size.value = value; void refresh(true); }
}));
onMounted(() => refresh());
</script>

<template>
  <NModal
    :show="true"
    preset="card"
    title="文件回收站"
    class="file-dialog recycle-dialog"
    :bordered="false"
    draggable
    @update:show="emit('close')"
  >
    <div class="recycle-toolbar">
      <NSpace>
        <NInput
          v-model:value="name"
          placeholder="搜索名称"
          clearable
          class="recycle-search"
          @keyup.enter="refresh(true)"
        >
          <template #suffix>
            <ButtonIcon text aria-label="查询" tooltip-content="查询" @click="refresh(true)"><SvgIcon icon="lucide:search" /></ButtonIcon>
          </template>
        </NInput>
        <NButton
          @click="
            name = null;
            refresh(true);
          "
        >
          <template #icon><SvgIcon icon="lucide:rotate-cw" /></template>
          重置
        </NButton>
      </NSpace>
      <NSpace>
        <NButton
          v-if="hasAuth('system:fileRecycle:clean')"
          type="error"
          ghost
          :disabled="busy"
          @click="confirm('clean')"
        >
          <template #icon><SvgIcon icon="lucide:trash-2" /></template>
          清空回收站
        </NButton>
        <ButtonIcon
          aria-label="刷新"
          tooltip-content="刷新"
          :loading="loading"
          @click="refresh()"
        >
          <SvgIcon icon="lucide:refresh-cw" />
        </ButtonIcon>
      </NSpace>
    </div>
    <NAlert v-if="failed" type="error" class="mb-12px">
      回收站加载失败
      <NButton text @click="refresh()">重试</NButton>
    </NAlert>
    <NDataTable
      :columns="columns"
      :data="rows"
      :loading="loading"
      :row-key="row => row.id"
      :scroll-x="800"
      :pagination="pagination"
      remote
    />
  </NModal>
</template>

<style scoped>
.recycle-toolbar {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
}
.recycle-search {
  width: 200px;
}
</style>
