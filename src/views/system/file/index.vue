<script setup lang="tsx">
import { reactive, ref } from 'vue';
import { NTag } from 'naive-ui';
import CryptoJS from 'crypto-js';
import {
  fetchBatchDeleteFile,
  fetchCancelMultipartUpload,
  fetchCompleteMultipartUpload,
  fetchGetFilePage,
  fetchInitMultipartUpload,
  fetchUploadFile,
  fetchUploadMultipartPart
} from '@/service/api/system';
import { useAppStore } from '@/store/modules/app';
import { useAuth } from '@/hooks/business/auth';
import { defaultTransform, useNaivePaginatedTable } from '@/hooks/common/table';
import { $t } from '@/locales';
import ButtonIcon from '@/components/custom/button-icon.vue';
import DictTag from '@/components/custom/dict-tag.vue';

defineOptions({
  name: 'FileList'
});

const appStore = useAppStore();
const { hasAuth } = useAuth();

const checkedRowKeys = ref<CommonType.IdType[]>([]);

const searchParams = ref<Api.System.ContinewFileQuery>({
  page: 1,
  size: 10,
  originalName: null,
  parentPath: null,
  type: null
});

const { columns, columnChecks, data, getData, getDataByPage, loading, mobilePagination, scrollX } =
  useNaivePaginatedTable({
    api: () => fetchGetFilePage(searchParams.value),
    transform: response => defaultTransform(response),
    onPaginationParamsChange: params => {
      searchParams.value.page = params.page ?? 1;
      searchParams.value.size = params.pageSize ?? 10;
    },
    columns: () => [
      {
        type: 'selection',
        align: 'center',
        width: 48
      },
      {
        key: 'name',
        title: '文件名称',
        align: 'center',
        minWidth: 200,
        ellipsis: { tooltip: true }
      },
      {
        key: 'extension',
        title: '扩展名',
        align: 'center',
        width: 90,
        render: row => (row.extension ? <NTag size="small">{row.extension.toUpperCase()}</NTag> : null)
      },
      {
        key: 'size',
        title: '大小',
        align: 'center',
        width: 100,
        render: row => formatSize(row.size)
      },
      {
        key: 'type',
        title: '类型',
        align: 'center',
        width: 90,
        render: row => <DictTag dictCode="file_type" value={row.type} size="small" />
      },
      {
        key: 'storageName',
        title: '存储',
        align: 'center',
        minWidth: 100
      },
      {
        key: 'createTime',
        title: '创建时间',
        align: 'center',
        minWidth: 160
      },
      {
        key: 'operate',
        title: $t('common.operate'),
        align: 'center',
        width: 130,
        render: row => {
          const downloadBtn = () => {
            if (!hasAuth('system:file:download') || !row.url) return null;
            return (
              <ButtonIcon
                text
                type="primary"
                icon="material-symbols:download-rounded"
                tooltipContent="下载"
                onClick={() => downloadFile(row)}
              />
            );
          };
          const deleteBtn = () => {
            if (!hasAuth('system:file:delete')) return null;
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
              {downloadBtn()}
              {downloadBtn() && deleteBtn() && <div class="w-1px h-12px bg-gray-300" />}
              {deleteBtn()}
            </div>
          );
        }
      }
    ]
  });

function formatSize(size?: number) {
  if (!size) return '-';
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(2)} KB`;
  if (size < 1024 * 1024 * 1024) return `${(size / 1024 / 1024).toFixed(2)} MB`;
  return `${(size / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

function downloadFile(row: Api.System.ContinewFile) {
  const link = document.createElement('a');
  link.href = row.url!;
  link.download = row.name;
  link.target = '_blank';
  link.click();
}

async function handleDelete(id: CommonType.IdType) {
  const { error } = await fetchBatchDeleteFile([id]);
  if (error) return;
  window.$message?.success($t('common.deleteSuccess'));
  await getData();
}

async function handleBatchDelete() {
  const { error } = await fetchBatchDeleteFile(checkedRowKeys.value);
  if (error) return;
  window.$message?.success($t('common.deleteSuccess'));
  await getData();
}

function handleResetSearch() {
  searchParams.value.originalName = null;
  searchParams.value.type = null;
  getDataByPage();
}

// ==================== 上传（普通 + 分片两条链） ====================
const uploadVisible = ref(false);
const uploading = ref(false);
const uploadProgress = ref(0);
/** 分片上传阈值：超过 10MB 走分片链 */
const MULTIPART_THRESHOLD = 10 * 1024 * 1024;
const PART_SIZE = 5 * 1024 * 1024;

const uploadForm = reactive({
  parentPath: null as string | null,
  files: [] as File[]
});

/** 计算文件 MD5（分片上传需要） */
function computeMd5(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener('load', e => {
      const wordArray = CryptoJS.lib.WordArray.create(e.target!.result as ArrayBuffer);
      resolve(CryptoJS.MD5(wordArray).toString());
    });
    reader.addEventListener('error', () => reject(new Error('读取文件失败')));
    reader.readAsArrayBuffer(file);
  });
}

/** 普通上传链 */
async function uploadNormal(file: File) {
  const { error } = await fetchUploadFile(file, uploadForm.parentPath ?? undefined);
  if (error) throw new Error(`上传失败：${file.name}`);
}

/** 分片上传链：init → part 循环 → complete（失败时 cancel） */
async function uploadMultipart(file: File) {
  const fileMd5 = await computeMd5(file);
  const { data: initResp, error: initError } = await fetchInitMultipartUpload({
    fileName: file.name,
    fileSize: file.size,
    fileMd5,
    contentType: file.type || undefined,
    parentPath: uploadForm.parentPath ?? undefined
  });
  if (initError || !initResp) throw new Error(`初始化分片上传失败：${file.name}`);

  const { uploadId, path } = initResp;
  try {
    const partCount = Math.ceil(file.size / PART_SIZE);
    for (let partNumber = 1; partNumber <= partCount; partNumber += 1) {
      const start = (partNumber - 1) * PART_SIZE;
      const blob = file.slice(start, Math.min(start + PART_SIZE, file.size));
      const { error: partError } = await fetchUploadMultipartPart(
        { uploadId, partNumber, path: path! },
        blob
      );
      if (partError) throw new Error('分片上传失败');
      uploadProgress.value = Math.round((partNumber / partCount) * 100);
    }
    const { error: completeError } = await fetchCompleteMultipartUpload(uploadId);
    if (completeError) throw new Error('合并分片失败');
  } catch (e) {
    // 失败清理分片
    await fetchCancelMultipartUpload(uploadId);
    throw e;
  }
}

async function handleUpload() {
  if (!uploadForm.files.length) {
    window.$message?.warning('请选择要上传的文件');
    return;
  }
  uploading.value = true;
  uploadProgress.value = 0;
  try {
    for (const file of uploadForm.files) {
      if (file.size > MULTIPART_THRESHOLD) {
        await uploadMultipart(file);
      } else {
        await uploadNormal(file);
      }
    }
    window.$message?.success('上传成功');
    uploadVisible.value = false;
    uploadForm.files = [];
    await getData();
  } catch (e) {
    window.$message?.error((e as Error).message || '上传失败');
  } finally {
    uploading.value = false;
  }
}

function handleUploadChange(options: { fileList: Array<{ file: File | null }> }) {
  uploadForm.files = options.fileList.map(item => item.file).filter((f): f is File => Boolean(f));
}
</script>

<template>
  <div class="min-h-500px flex-col-stretch gap-16px overflow-hidden lt-sm:overflow-auto">
    <NCard :bordered="false" class="table-search card-wrapper" size="small">
      <NCollapse>
        <NCollapseItem :title="$t('common.search')" name="search">
          <NForm label-placement="left" :label-width="80">
            <NGrid responsive="screen" cols="1 s:2 m:3" :x-gap="8" :y-gap="8" item-responsive>
              <NFormItemGi span="24 s:12 m:8" label="文件名称" class="pr-24px">
                <NInput
                  v-model:value="searchParams.originalName"
                  placeholder="请输入文件名称"
                  @keyup.enter="() => getDataByPage()"
                />
              </NFormItemGi>
              <NFormItemGi span="24 s:12 m:8" label="类型" class="pr-24px">
                <NInput v-model:value="searchParams.type" placeholder="请输入文件类型" />
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
    <NCard title="文件列表" :bordered="false" size="small" class="card-wrapper sm:flex-1-hidden">
      <template #header-extra>
        <NSpace>
          <NButton v-if="hasAuth('system:file:upload')" type="primary" size="small" @click="uploadVisible = true">
            <template #icon>
              <icon-material-symbols-upload-rounded class="text-icon" />
            </template>
            上传文件
          </NButton>
          <TableHeaderOperation
            v-model:columns="columnChecks"
            :disabled-delete="checkedRowKeys.length === 0"
            :loading="loading"
            :show-add="false"
            :show-delete="hasAuth('system:file:delete')"
            @delete="handleBatchDelete"
            @refresh="getData"
          />
        </NSpace>
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

    <NModal v-model:show="uploadVisible" preset="card" title="上传文件" class="w-560px">
      <NForm label-placement="left" :label-width="90">
        <NFormItem label="父目录">
          <NInput v-model:value="uploadForm.parentPath" placeholder="选填，如 /docs" />
        </NFormItem>
        <NFormItem label="文件">
          <NUpload :max="5" :default-upload="false" directory-dnd multiple @change="handleUploadChange">
            <NUploadDragger>
              <div class="mb-12px flex-center">
                <SvgIcon icon="material-symbols:unarchive-outline" class="text-58px color-#d8d8db dark:color-#a1a1a2" />
              </div>
              <NText class="text-16px">点击或者拖动文件到该区域来上传</NText>
              <NP depth="3" class="mt-8px">单文件超过 10MB 将自动使用分片上传</NP>
            </NUploadDragger>
          </NUpload>
        </NFormItem>
        <NProgress
          v-if="uploading && uploadProgress > 0"
          type="line"
          :percentage="uploadProgress"
          indicator-placement="inside"
        />
      </NForm>
      <template #footer>
        <NSpace justify="end">
          <NButton :disabled="uploading" @click="uploadVisible = false">取消</NButton>
          <NButton type="primary" :loading="uploading" @click="handleUpload">开始上传</NButton>
        </NSpace>
      </template>
    </NModal>
  </div>
</template>

<style scoped></style>
