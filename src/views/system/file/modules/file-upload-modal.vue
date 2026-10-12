<script setup lang="tsx">
import { computed, onMounted, ref } from 'vue';
import { NProgress, NTag, NText } from 'naive-ui';
import type { DataTableColumns } from 'naive-ui';
import ButtonIcon from '@/components/custom/button-icon.vue';
import SvgIcon from './file-action-icon.vue';
import { useFileUpload } from './use-file-upload';
import type { FileTask, UploadStatus } from './use-file-upload';
import { formatFileSize } from './file-utils';

const props = defineProps<{ parentPath?: string | null }>();
const emit = defineEmits<{ close: [] }>();
const fileInput = ref<HTMLInputElement>();
const folderInput = ref<HTMLInputElement>();
const dragover = ref(false);
const closing = ref(false);
const uploader = useFileUpload(props.parentPath || '/');
const { tasks, config, loadingConfig, configError } = uploader;
const page = ref(1);
const statusLabels: Record<UploadStatus, string> = {
  waiting: '等待中', uploading: '上传中', paused: '已暂停', completed: '已完成', failed: '失败', cancelled: '已取消'
};
const statusColors: Record<UploadStatus, 'default' | 'info' | 'warning' | 'success' | 'error'> = {
  waiting: 'default', uploading: 'info', paused: 'warning', completed: 'success', failed: 'error', cancelled: 'default'
};
const columns: DataTableColumns<FileTask> = [
  { key: 'name', title: '名称', minWidth: 190, ellipsis: { tooltip: true }, render: row => row.file.name },
  { key: 'parentPath', title: '文件目录', minWidth: 150, ellipsis: { tooltip: true } },
  { key: 'type', title: '文件类型', width: 120, render: row => row.file.name.split('.').at(-1)?.toUpperCase() || '-' },
  { key: 'size', title: '文件大小', width: 120, render: row => formatFileSize(row.file.size) },
  { key: 'progress', title: '进度', width: 140, render: row => row.phase === 'hashing' ? '正在计算 MD5...' : <NProgress type="line" percentage={row.progress} /> },
  { key: 'status', title: '状态', width: 220, render: row => <div>
    <NTag size="small" bordered={false} type={statusColors[row.status]}>{row.phase === 'finalizing' ? '处理中' : statusLabels[row.status]}</NTag>
    {row.error && <NText type="error" class="upload-error">{row.error}</NText>}
  </div> },
  { key: 'actions', title: '操作', width: 150, render: row => <div class="file-row-actions">
    {['waiting', 'paused', 'failed'].includes(row.status) && <ButtonIcon text aria-label={row.status === 'failed' ? '重试' : row.status === 'paused' ? '继续' : '开始'} tooltipContent={row.status === 'failed' ? '重试' : row.status === 'paused' ? '继续' : '开始'} disabled={!config.value} onClick={() => uploader.startTask(row)}><SvgIcon icon={row.status === 'failed' ? 'lucide:rotate-cw' : 'lucide:play'} /></ButtonIcon>}
    {row.status === 'uploading' && <ButtonIcon text aria-label="暂停" tooltipContent="暂停" disabled={row.phase === 'finalizing'} onClick={() => uploader.pauseTask(row)}><SvgIcon icon="lucide:pause" /></ButtonIcon>}
    {row.status !== 'completed' && <ButtonIcon text aria-label="取消" tooltipContent="取消" disabled={row.phase === 'finalizing'} onClick={() => uploader.cancelTask(row)}><SvgIcon icon="lucide:x" /></ButtonIcon>}
    <ButtonIcon text type="error" aria-label="删除" tooltipContent="删除" disabled={row.phase === 'finalizing'} onClick={() => uploader.removeTask(row)}><SvgIcon icon="lucide:trash-2" /></ButtonIcon>
  </div> }
];
const pagination = computed(() => ({ page: page.value, pageSize: 10, itemCount: tasks.value.length, showQuickJumper: true, prefix: () => `共 ${tasks.value.length} 条`, onUpdatePage: (value: number) => { page.value = value; } }));
function selectFiles(event: Event) {
  const input = event.target as HTMLInputElement;
  uploader.addFiles(Array.from(input.files || []));
  input.value = '';
}
function dropFiles(event: DragEvent) {
  dragover.value = false;
  if (event.dataTransfer) uploader.addFiles(Array.from(event.dataTransfer.files));
}
async function clearTasks() {
  if (tasks.value.some(task => task.phase === 'finalizing')) {
    window.$message?.warning('文件正在完成上传，请稍后操作');
    return false;
  }
  const cleared = await uploader.clearTasks();
  page.value = 1;
  return cleared;
}
async function close() {
  if (closing.value) return;
  closing.value = true;
  try { if (await clearTasks()) emit('close'); } finally { closing.value = false; }
}
function requestClose() {
  if (!tasks.value.some(task => !['completed', 'cancelled'].includes(task.status))) { void close(); return; }
  window.$dialog?.warning({ title: '关闭上传', content: '还有未完成任务，确定取消任务并关闭吗？', positiveText: '确定', negativeText: '取消', onPositiveClick: close });
}
onMounted(uploader.loadConfig);
defineExpose({ uploader });
</script>

<template>
  <NModal
    :show="true"
    preset="card"
    title="文件上传"
    class="file-dialog upload-dialog"
    :bordered="false"
    :mask-closable="false"
    @update:show="requestClose"
  >
    <section
      class="upload-workspace"
      :class="{ dragover }"
      @dragover.prevent="dragover = true"
      @dragleave.prevent="dragover = false"
      @drop.prevent="dropFiles"
    >
      <div class="upload-toolbar">
        <NSpace>
          <NButton @click="fileInput?.click()">选择文件</NButton>
          <NButton @click="folderInput?.click()">选择文件夹</NButton>
          <input ref="fileInput" type="file" multiple hidden aria-label="选择文件" @change="selectFiles" />
          <input
            ref="folderInput"
            type="file"
            webkitdirectory
            multiple
            hidden
            aria-label="选择文件夹"
            @change="selectFiles"
          />
        </NSpace>
        <NSpace>
          <NButton type="primary" :disabled="!config || !tasks.length" @click="uploader.startAll">开始上传</NButton>
          <NButton type="error" secondary :disabled="!tasks.length" @click="clearTasks">清空</NButton>
        </NSpace>
      </div>
      <div class="upload-policy">
        <strong>默认存储上传策略</strong>
        <NSpin :show="loadingConfig">
          <div v-if="config" class="upload-policy-grid">
            <div>
              <span>类型</span>
              <span>{{ config.storageType === 1 ? '本地存储' : '对象存储' }}</span>
            </div>
            <div>
              <span>分片阈值</span>
              <span>{{ formatFileSize(config.multipartUploadThreshold) }}</span>
            </div>
            <div>
              <span>分片大小</span>
              <span>{{ formatFileSize(config.multipartUploadPartSize) }}</span>
            </div>
            <div v-if="config.storageType === 1" class="policy-path">
              <span>本地分片临时目录</span>
              <span>{{ config.multipartTempDir || '-' }}</span>
            </div>
          </div>
          <NAlert v-else-if="configError" type="error" :show-icon="false">
            上传配置加载失败
            <NButton text type="primary" @click="uploader.loadConfig">重试</NButton>
          </NAlert>
        </NSpin>
      </div>
      <p class="upload-hint">
        支持拖拽文件到此区域上传（文件夹请使用“选择文件夹”按钮）
        <br />
        <small>系统会根据默认存储分片阈值自动选择单文件上传或分片上传</small>
      </p>
      <NDataTable
        :columns="columns"
        :data="tasks"
        :row-key="row => row.id"
        :pagination="pagination"
        :scroll-x="1090"
        flex-height
        class="upload-tasks"
      />
    </section>
  </NModal>
</template>

<style scoped>
.upload-workspace {
  width: 100%;
  max-width: 1252px;
  height: 752px;
  max-height: calc(100dvh - 150px);
  min-height: 350px;
  margin: auto;
  padding: 24px;
  border: 2px dashed var(--n-border-color);
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
}
.dragover {
  border-color: rgb(var(--primary-color));
}
.upload-toolbar {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}
.upload-policy {
  background: var(--n-action-color);
  padding: 10px 12px;
  margin-bottom: 12px;
  border-radius: 8px;
  font-size: 12px;
}
.upload-policy strong {
  display: block;
  margin-bottom: 8px;
  font-size: 13px;
}
.upload-policy-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px 12px;
}
.upload-policy-grid > div {
  display: flex;
  justify-content: space-between;
  gap: 8px;
}
.upload-policy-grid span:first-child {
  color: var(--n-text-color-3);
  flex-shrink: 0;
}
.upload-policy-grid span:last-child {
  overflow-wrap: anywhere;
}
.policy-path {
  grid-column: 1 / -1;
}
.upload-hint {
  color: var(--n-text-color-3);
  font-size: 13px;
  margin: 0 0 8px;
  line-height: 1.8;
}
.upload-tasks {
  flex: 1;
  min-height: 150px;
}
:deep(.upload-error) {
  display: block;
  font-size: 12px;
  margin-top: 4px;
  overflow-wrap: anywhere;
}
@media (max-width: 900px) {
  .upload-workspace {
    padding: 6px;
  }
}
@media (max-width: 600px) {
  .upload-policy-grid {
    grid-template-columns: 1fr;
  }
  .upload-toolbar {
    flex-direction: column;
  }
}
</style>
