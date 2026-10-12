<script setup lang="tsx">
import { computed, h, nextTick, onBeforeUnmount, reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { NButton, NDropdown, useThemeVars } from 'naive-ui';
import type { DataTableColumns, DropdownOption, FormInst, ImageInst } from 'naive-ui';
import { fetchBatchDeleteFile, fetchCalcFileDirSize, fetchCreateFileDir, fetchGetFilePage, fetchRenameFile } from '@/service/api/system/file';
import { useAuth } from '@/hooks/business/auth';
import ButtonIcon from '@/components/custom/button-icon.vue';
import SvgIcon from './modules/file-action-icon.vue';
import FileIcon from './modules/file-icon.vue';
import FileStatistics from './modules/file-statistics.vue';
import FileUploadModal from './modules/file-upload-modal.vue';
import RecycleBinModal from './modules/recycle-bin-modal.vue';
import FilePreview from './modules/file-preview.vue';
import { downloadFile, fileCategories, fileIconUrl, formatFileSize } from './modules/file-utils';

defineOptions({ name: 'FileList' });
type FileRow = Api.System.ContinewFile;
const { hasAuth } = useAuth();
const route = useRoute();
const router = useRouter();
const theme = useThemeVars();
const themeStyle = computed(() => ({ '--fm-bg': theme.value.cardColor, '--fm-fill': theme.value.tableHeaderColor, '--fm-border': theme.value.borderColor, '--fm-muted': theme.value.textColor3, '--fm-primary': theme.value.primaryColor, '--fm-hover': theme.value.hoverColor, color: theme.value.textColor1 }));
const selectedType = computed(() => fileCategories.some(item => item.value === Number(route.query.type)) ? Number(route.query.type) : 0);
const query = reactive<Api.System.ContinewFileQuery>({ page: 1, size: 30, originalName: null, parentPath: '/', type: null, sort: ['type,asc', 'updateTime,desc'] });
const rows = ref<FileRow[]>([]);
const total = ref(0);
const loading = ref(false);
const failed = ref(false);
const view = ref<'grid' | 'list'>('grid');
const batch = ref(false);
const categoriesExpanded = ref(true);
const selected = ref<CommonType.IdType[]>([]);
const upload = ref(false);
const recycle = ref(false);
const statistics = ref<InstanceType<typeof FileStatistics>>();
const pathNames = new Map<string, string>();
let sequence = 0;
const images = computed(() => rows.value.filter(row => row.type === 2 && row.url));
const imageRefs = new Map<CommonType.IdType, ImageInst>();
const busy = ref(false);
const calcBusy = ref<CommonType.IdType>();
const detail = ref<FileRow>();
const preview = ref<FileRow>();
const nameDialog = ref<'rename' | 'create'>();
const renameRow = ref<FileRow>();
const nameForm = reactive({ originalName: '' });
const nameFormRef = ref<FormInst>();
const nameRules = { originalName: [{ required: true, whitespace: true, message: '请输入名称', trigger: ['blur', 'input'] }, { max: 255, message: '名称最多 255 个字符', trigger: ['blur', 'input'] }] };
const context = reactive({ show: false, x: 0, y: 0, row: undefined as FileRow | undefined });

async function refresh(reset = false) {
  if (reset) { query.page = 1; selected.value = []; }
  const current = ++sequence;
  loading.value = true;
  const { data, error } = await fetchGetFilePage({ ...query });
  if (current !== sequence) return;
  failed.value = Boolean(error);
  rows.value = error ? [] : data?.list || [];
  total.value = data?.total || 0;
  selected.value = selected.value.filter(id => rows.value.some(row => row.id === id));
  loading.value = false;
  if (query.page > 1 && !rows.value.length && !error) { query.page -= 1; void refresh(); }
}
async function refreshAll() { await Promise.all([refresh(), statistics.value?.refresh()]); }
watch(() => route.query.type, () => {
  query.type = selectedType.value ? selectedType.value as Api.System.ContinewFile['type'] : null;
  query.parentPath = selectedType.value ? null : '/';
  query.originalName = null;
  void refresh(true);
}, { immediate: true });
function selectCategory(value: number) { void router.replace({ query: { ...route.query, type: String(value) } }); }
const breadcrumbs = computed(() => (query.parentPath || '').split('/').filter(Boolean).map((part, index, parts) => {
  const path = `/${parts.slice(0, index + 1).join('/')}`;
  return { path, label: pathNames.get(path) || part };
}));
function enterPath(path: string) { query.parentPath = path; void refresh(true); }
function enterFolder(row: FileRow) {
  if (row.type !== 0 || batch.value) return;
  const path = `${row.parentPath === '/' ? '' : row.parentPath || ''}/${row.name}`;
  pathNames.set(path, row.originalName || row.name);
  enterPath(path);
}
function toggleSelected(row: FileRow) {
  if (selected.value.includes(row.id)) selected.value = selected.value.filter(id => id !== row.id);
  else selected.value = [...selected.value, row.id];
}
function openFile(row: FileRow) {
  if (batch.value) { toggleSelected(row); return; }
  if (row.type === 0 || !row.url) return;
  if (row.type === 2) {
    imageRefs.get(row.id)?.showPreview();
  } else preview.value = row;
}
function setImageRef(id: CommonType.IdType, instance: ImageInst | null) {
  if (instance) imageRefs.set(id, instance);
  else imageRefs.delete(id);
}
async function calcSize(row: FileRow) {
  if (!hasAuth('system:file:calcDirSize') || calcBusy.value) return;
  calcBusy.value = row.id;
  try { const { data, error } = await fetchCalcFileDirSize(row.id); if (!error && data) row.size = data.size; } finally { calcBusy.value = undefined; }
}
function actionOptions(row: FileRow): DropdownOption[] {
  return [
    { key: 'rename', label: '重命名', permission: 'system:file:update', iconName: 'lucide:pencil' },
    { key: 'detail', label: '详情', permission: 'system:file:get', iconName: 'lucide:info' },
    { key: 'download', label: '下载', permission: 'system:file:download', iconName: 'lucide:download' },
    { key: 'delete', label: '删除', permission: 'system:file:delete', iconName: 'lucide:trash-2' }
  ].filter(item => hasAuth(item.permission) && (item.key !== 'download' || row.type !== 0 && row.url)).map(item => ({ key: item.key, label: item.label, icon: () => h(SvgIcon, { icon: item.iconName }) }));
}
function act(key: string, row: FileRow) {
  context.show = false;
  if (!actionOptions(row).some(item => item.key === key)) return;
  if (key === 'rename') { renameRow.value = row; nameForm.originalName = row.originalName || row.name; nameDialog.value = 'rename'; }
  else if (key === 'detail') detail.value = row;
  else if (key === 'download') downloadFile(row);
  else if (key === 'delete') confirmDelete([row.id], row.originalName || row.name);
}
async function showContext(event: MouseEvent, row: FileRow) {
  event.preventDefault();
  if (!actionOptions(row).length) return;
  context.show = false;
  await nextTick();
  Object.assign(context, { x: event.clientX, y: event.clientY, row, show: true });
}
function confirmDelete(ids: CommonType.IdType[], name?: string) {
  if (!ids.length || !hasAuth('system:file:delete') || busy.value) return;
  window.$dialog?.warning({ title: '提示', content: name ? `是否确定删除「${name}」？` : `是否确定删除所选的 ${ids.length} 个文件？`, positiveText: '确定', negativeText: '取消',
    onPositiveClick: async () => {
      busy.value = true;
      try {
        const { error } = await fetchBatchDeleteFile(ids);
        if (error) return false;
        selected.value = [];
        batch.value = false;
        window.$message?.success('删除成功');
        await refreshAll();
        return true;
      } finally { busy.value = false; }
    }
  });
}
async function saveName() {
  if (!hasAuth(nameDialog.value === 'create' ? 'system:file:createDir' : 'system:file:update')) return;
  if (busy.value) return;
  try { await nameFormRef.value?.validate(); } catch { return; }
  if (busy.value) return;
  const originalName = nameForm.originalName.trim();
  if (!originalName) return;
  busy.value = true;
  try {
    const result = nameDialog.value === 'create' ? await fetchCreateFileDir({ originalName, parentPath: query.parentPath! }) : await fetchRenameFile(renameRow.value!.id, originalName);
    if (result.error) return;
    nameDialog.value = undefined;
    window.$message?.success('保存成功');
    await refreshAll();
  } finally { busy.value = false; }
}
async function copy(value?: string) {
  if (!value) return;
  try { await navigator.clipboard.writeText(value); window.$message?.success('复制成功'); } catch { window.$message?.error('复制失败'); }
}
const columns = computed<DataTableColumns<FileRow>>(() => [
  ...(batch.value ? [{ type: 'selection' as const, width: 40 }] : []),
  { key: 'originalName', title: '名称', minWidth: 220, render: row => <div class="file-list-name" onDblclick={() => enterFolder(row)}>
    <span class="list-file-icon"><FileIcon file={row} /></span>
    <NButton text class="file-name-link" onClick={() => openFile(row)}><span class="file-name-text">{row.originalName || row.name}</span></NButton>
    {row.type !== 0 && row.url && <ButtonIcon text aria-label="复制链接" tooltipContent="复制链接" onClick={() => copy(row.url)}><SvgIcon icon="lucide:link" /></ButtonIcon>}
  </div> },
  { key: 'size', title: '大小', width: 110, render: row => row.type === 0 && row.size == null && hasAuth('system:file:calcDirSize') ? <NButton text type="primary" loading={calcBusy.value === row.id} onClick={() => calcSize(row)}>计算</NButton> : formatFileSize(row.size) },
  { key: 'storageName', title: '存储名称', width: 200, ellipsis: { tooltip: true } },
  { key: 'updateTime', title: '修改时间', width: 200 },
  { key: 'actions', title: '操作', width: 120, render: row => actionOptions(row).length ? <NDropdown options={actionOptions(row)} trigger="click" onSelect={(key: string) => act(key, row)}><ButtonIcon text aria-label="文件操作" tooltipContent="操作"><SvgIcon icon="lucide:ellipsis" /></ButtonIcon></NDropdown> : null }
]);
function rowProps(row: FileRow) {
  return { onContextmenu: (event: MouseEvent) => showContext(event, row) };
}
onBeforeUnmount(() => { sequence += 1; });
</script>

<template>
  <div class="file-manager" :style="themeStyle">
    <aside class="file-sidebar">
      <nav class="file-categories" aria-label="文件类型">
        <NButton
          class="categories-title"
          text
          block
          :aria-expanded="categoriesExpanded"
          @click="categoriesExpanded = !categoriesExpanded"
        >
          <template #icon><SvgIcon icon="lucide:layout-grid" /></template>
          文件类型
          <SvgIcon icon="lucide:chevron-up" class="ml-auto" :style="{ transform: categoriesExpanded ? undefined : 'rotate(180deg)' }" />
        </NButton>
        <NButton
          v-for="item in fileCategories"
          v-show="categoriesExpanded"
          :key="item.value"
          block
          :secondary="selectedType === item.value"
          :quaternary="selectedType !== item.value"
          :type="selectedType === item.value ? 'primary' : 'default'"
          :aria-current="selectedType === item.value ? 'page' : undefined"
          @click="selectCategory(item.value)"
        >
          <template #icon><img :src="fileIconUrl(item.icon)" alt="" width="24" height="24" /></template>
          {{ item.label }}
        </NButton>
      </nav>
      <FileStatistics ref="statistics" />
    </aside>
    <main class="file-main">
      <NBreadcrumb class="file-breadcrumb">
        <NBreadcrumbItem @click="query.parentPath && enterPath('/')">
          {{ query.parentPath ? '根目录' : '全部' }}
        </NBreadcrumbItem>
        <NBreadcrumbItem v-for="crumb in breadcrumbs" :key="crumb.path" @click="enterPath(crumb.path)">
          {{ crumb.label }}
        </NBreadcrumbItem>
      </NBreadcrumb>
      <div class="file-toolbar">
        <div class="file-toolbar-left">
          <NButton v-if="hasAuth('system:file:upload')" type="primary" @click="upload = true">
            <template #icon><SvgIcon icon="lucide:upload" /></template>
            上传文件
          </NButton>
          <NButton
            v-if="hasAuth('system:file:createDir')"
            :disabled="!query.parentPath"
            @click="
              nameForm.originalName = '';
              nameDialog = 'create';
            "
          >
            <template #icon><SvgIcon icon="lucide:folder" /></template>
            新建文件夹
          </NButton>
          <NInputGroup class="file-search">
            <NInput
              v-model:value="query.originalName"
              :placeholder="query.parentPath ? '在当前目录下搜索名称' : '请输入名称'"
              clearable
              @keyup.enter="refresh(true)"
            />
            <NButton type="primary" @click="refresh(true)">
              <template #icon><SvgIcon icon="lucide:search" /></template>
              查询
            </NButton>
          </NInputGroup>
        </div>
        <div class="file-toolbar-right">
          <ButtonIcon
            v-if="batch"
            type="error"
            aria-label="批量删除"
            tooltip-content="批量删除"
            :disabled="!selected.length || busy"
            @click="confirmDelete([...selected])"
          >
            <SvgIcon icon="lucide:trash-2" />
          </ButtonIcon>
          <NButton
            v-if="hasAuth('system:file:delete')"
            type="primary"
            @click="
              batch = !batch;
              selected = [];
            "
          >
            <template #icon><SvgIcon icon="lucide:list-checks" /></template>
            {{ batch ? '取消批量' : '批量操作' }}
          </NButton>
          <NButton v-if="hasAuth('system:fileRecycle:list')" type="primary" @click="recycle = true">
            <template #icon><SvgIcon icon="lucide:trash-2" /></template>
            回收站
          </NButton>
          <ButtonIcon
            :aria-label="view === 'grid' ? '列表视图' : '网格视图'"
            tooltip-content="视图"
            @click="view = view === 'grid' ? 'list' : 'grid'"
          >
            <SvgIcon :icon="view === 'grid' ? 'lucide:list' : 'lucide:layout-grid'" />
          </ButtonIcon>
        </div>
      </div>
      <div class="file-content">
        <NSpin :show="loading" class="file-content-spin">
          <NAlert v-if="failed" type="error">
            文件加载失败
            <NButton text @click="refresh()">重试</NButton>
          </NAlert>
          <NEmpty v-else-if="!rows.length" description="暂无数据" class="file-empty" />
          <div v-else-if="view === 'grid'" class="file-grid">
            <div
              v-for="row in rows"
              :key="row.id"
              class="file-tile"
              :class="{ selected: selected.includes(row.id) }"
              tabindex="0"
              role="button"
              :aria-label="row.originalName || row.name"
              @click="openFile(row)"
              @dblclick="enterFolder(row)"
              @keydown.enter.prevent="batch ? toggleSelected(row) : row.type === 0 ? enterFolder(row) : openFile(row)"
              @keydown.space.prevent="batch && toggleSelected(row)"
              @contextmenu="showContext($event, row)"
            >
              <div class="file-tile-inner">
                <div class="tile-file-icon"><FileIcon :file="row" /></div>
                <p :title="row.originalName || row.name">{{ row.originalName || row.name }}</p>
              </div>
              <div v-if="batch" class="file-check-mode">
                <NCheckbox
                  class="file-tile-checkbox"
                  :checked="selected.includes(row.id)"
                  :aria-label="`选择 ${row.originalName || row.name}`"
                  @click.stop="toggleSelected(row)"
                />
              </div>
            </div>
          </div>
          <NDataTable
            v-else
            v-model:checked-row-keys="selected"
            :columns="columns"
            :data="rows"
            :row-key="row => row.id"
            :scroll-x="850"
            :row-props="rowProps"
          />
        </NSpin>
      </div>
      <div class="file-pagination">
        <NPagination
          v-model:page="query.page"
          v-model:page-size="query.size"
          :item-count="total"
          :page-sizes="[30, 40, 50, 100, 120]"
          show-size-picker
          @update:page="refresh()"
          @update:page-size="refresh(true)"
        >
          <template #prefix>共 {{ total }} 条</template>
        </NPagination>
      </div>
    </main>
    <NImageGroup show-toolbar-tooltip>
      <div hidden>
        <NImage
          v-for="row in images"
          :key="row.id"
          :ref="instance => setImageRef(row.id, instance as ImageInst | null)"
          :src="row.url"
          :alt="row.originalName || row.name"
        />
      </div>
    </NImageGroup>
    <NDropdown
      :show="context.show"
      :x="context.x"
      :y="context.y"
      placement="bottom-start"
      trigger="manual"
      :options="context.row ? actionOptions(context.row) : []"
      @clickoutside="context.show = false"
      @select="key => context.row && act(String(key), context.row)"
    />
    <FileUploadModal
      v-if="upload"
      :parent-path="query.parentPath"
      @close="
        upload = false;
        refreshAll();
      "
    />
    <RecycleBinModal
      v-if="recycle"
      @close="
        recycle = false;
        refreshAll();
      "
      @changed="refreshAll"
    />
    <FilePreview v-if="preview" :file="preview" @close="preview = undefined" />
    <NModal
      :show="Boolean(nameDialog)"
      preset="card"
      :title="nameDialog === 'create' ? '新建文件夹' : '重命名'"
      class="file-dialog name-dialog"
      :bordered="false"
      :mask-closable="!busy"
      :closable="!busy"
      @update:show="!busy && (nameDialog = undefined)"
    >
      <NForm ref="nameFormRef" :model="nameForm" :rules="nameRules" label-placement="left" @submit.prevent="saveName">
        <NFormItem label="名称" path="originalName">
          <NInput
            v-model:value="nameForm.originalName"
            :maxlength="255"
            placeholder="请输入名称"
            autofocus
            @keyup.enter="saveName"
          />
        </NFormItem>
      </NForm>
      <template #footer>
        <NSpace justify="end">
          <NButton :disabled="busy" @click="nameDialog = undefined">取消</NButton>
          <NButton type="primary" :loading="busy" @click="saveName">确定</NButton>
        </NSpace>
      </template>
    </NModal>
    <NModal
      :show="Boolean(detail)"
      preset="card"
      title="文件详情"
      class="file-dialog detail-dialog"
      :bordered="false"
      @update:show="detail = undefined"
    >
      <template v-if="detail">
        <div class="detail-file-icon"><FileIcon :file="detail" /></div>
        <NDescriptions :column="1" label-placement="left" :label-style="{ width: '72px' }">
          <NDescriptionsItem label="文件名称">
            <span class="detail-value">{{ detail.originalName || detail.name }}</span>
            <ButtonIcon
              text
              aria-label="复制名称"
              tooltip-content="复制"
              @click="copy(detail.originalName || detail.name)"
            >
              <SvgIcon icon="lucide:copy" />
            </ButtonIcon>
          </NDescriptionsItem>
          <NDescriptionsItem label="文件大小">
            <NButton
              v-if="detail.type === 0 && detail.size == null && hasAuth('system:file:calcDirSize')"
              text
              type="primary"
              :loading="calcBusy === detail.id"
              @click="calcSize(detail)"
            >
              计算
            </NButton>
            <span v-else>{{ formatFileSize(detail.size) }}</span>
          </NDescriptionsItem>
          <NDescriptionsItem label="文件路径">
            <span class="detail-value">{{ detail.path || detail.parentPath || '/' }}</span>
          </NDescriptionsItem>
          <NDescriptionsItem v-if="detail.sha256" label="SHA256">
            <span class="detail-value">{{ detail.sha256 }}</span>
            <ButtonIcon
              text
              aria-label="复制 SHA256"
              tooltip-content="复制"
              @click="copy(detail.sha256)"
            >
              <SvgIcon icon="lucide:copy" />
            </ButtonIcon>
          </NDescriptionsItem>
          <NDescriptionsItem label="上传时间">{{ detail.createTime || '-' }}</NDescriptionsItem>
          <NDescriptionsItem label="修改时间">{{ detail.updateTime || '-' }}</NDescriptionsItem>
          <NDescriptionsItem label="存储名称">{{ detail.storageName || '-' }}</NDescriptionsItem>
        </NDescriptions>
      </template>
    </NModal>
  </div>
</template>

<style scoped>
.file-manager {
  display: flex;
  flex: 1;
  gap: 14px;
  min-height: 500px;
  height: 100%;
  min-width: 0;
  overflow: hidden;
}
.file-sidebar {
  width: 206px;
  flex-shrink: 0;
  overflow: auto;
}
.file-categories {
  padding: 12px 8px;
  background: var(--fm-bg);
  border-radius: 4px;
}
.categories-title {
  margin-bottom: 8px;
}
.file-categories button {
  margin-top: 4px;
}
.file-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  background: var(--fm-bg);
  border-radius: 4px;
  overflow: hidden;
}
.file-breadcrumb {
  padding: 8px 16px;
  background: var(--fm-fill);
  border-bottom: 1px solid var(--fm-border);
}
.file-toolbar {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  margin: 16px 16px 0;
}
.file-toolbar-left,
.file-toolbar-right {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}
.file-search {
  width: 280px;
  max-width: 100%;
}
.file-content {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: 16px;
}
.file-content-spin {
  min-height: 100%;
}
.file-grid {
  display: grid;
  grid-template-columns: repeat(8, minmax(0, 1fr));
  gap: 12px;
}
.file-tile {
  height: 100px;
  position: relative;
  cursor: pointer;
  border-radius: 4px;
}
.file-tile:hover,
.file-tile:focus-visible {
  background: var(--fm-hover);
}
.file-tile-inner {
  max-width: 100px;
  width: 76%;
  margin: auto;
  padding-top: 10px;
  text-align: center;
}
.tile-file-icon {
  width: 60px;
  height: 60px;
  margin: auto;
}
.file-tile p {
  margin: 6px 0 0;
  font-size: 12px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.file-check-mode {
  position: absolute;
  inset: 0;
  border: 1px solid var(--fm-border);
  border-radius: 4px;
}
.file-check-mode .file-tile-checkbox {
  position: absolute;
  top: 5px;
  left: 5px;
}
.selected .file-check-mode {
  border-color: var(--fm-primary);
  background: color-mix(in srgb, var(--fm-primary) 8%, transparent);
}
.file-empty {
  padding: 70px 0;
}
.file-pagination {
  display: flex;
  justify-content: flex-end;
  padding: 0 16px 16px;
  overflow-x: auto;
}
:deep(.file-list-name) {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}
:deep(.list-file-icon) {
  width: 30px;
  height: 30px;
  flex-shrink: 0;
}
:deep(.file-name-link) {
  min-width: 0;
}
:deep(.file-name-text) {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
@media (min-width: 1600px) {
  .file-grid {
    grid-template-columns: repeat(9, minmax(0, 1fr));
  }
}
@media (max-width: 1199px) {
  .file-grid {
    grid-template-columns: repeat(7, minmax(0, 1fr));
  }
}
@media (max-width: 991px) {
  .file-grid {
    grid-template-columns: repeat(5, minmax(0, 1fr));
  }
}
@media (max-width: 767px) {
  .file-grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}
@media (max-width: 575px) {
  .file-sidebar {
    display: none;
  }
  .file-toolbar {
    gap: 8px;
  }
  .file-manager {
    min-height: 500px;
  }
  .file-search {
    width: 100%;
  }
}
</style>

<style>
.file-dialog {
  width: min(90%, 1350px);
}
.recycle-dialog {
  width: min(90%, 1100px);
}
.name-dialog {
  width: min(90%, 450px);
}
.detail-dialog {
  width: min(90%, 320px);
}
.detail-file-icon {
  height: 100px;
  max-width: 100px;
  margin: 0 auto 20px;
}
.detail-value {
  overflow-wrap: anywhere;
}
.file-row-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}
</style>
