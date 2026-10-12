<script setup lang="ts">
import { reactive, ref, watch } from 'vue';
import type { UploadFileInfo } from 'naive-ui';
import { useLoading } from '@sa/hooks';
import { fetchImportUsers, fetchParseUserImport } from '@/service/api/system';
import { useDownload } from '@/hooks/business/download';
import { $t } from '@/locales';

defineOptions({
  name: 'UserImportModal'
});

interface Emits {
  (e: 'submitted'): void;
}

const { download } = useDownload();

const emit = defineEmits<Emits>();

const { loading, startLoading, endLoading } = useLoading();
const parsed = ref<Api.System.UserImportParseResp | null>(null);
const message = ref<string>('');
const success = ref<boolean>(false);

const visible = defineModel<boolean>('visible', {
  default: false
});

const data = reactive<Api.System.UserImportReq>({
  importKey: '',
  duplicateUser: 1,
  duplicateEmail: 1,
  duplicatePhone: 1,
  defaultStatus: 1
});

const fileList = ref<UploadFileInfo[]>([]);

function closeDrawer() {
  visible.value = false;
  if (success.value) {
    emit('submitted');
  }
}

async function handleSubmit() {
  if (loading.value) return;
  const file = fileList.value[0]?.file;
  if (!file) {
    window.$message?.warning('请选择导入文件');
    return;
  }
  startLoading();
  try {
    if (!parsed.value) {
      const { data: result, error } = await fetchParseUserImport(file);
      if (error) return;
      parsed.value = result;
      data.importKey = result.importKey;
    } else {
      const { data: result, error } = await fetchImportUsers(data);
      if (error) return;
      message.value = `总计 ${result.totalRows} 行，新增 ${result.insertRows} 行，修改 ${result.updateRows} 行`;
      success.value = true;
      parsed.value = null;
      data.importKey = '';
      fileList.value = [];
      window.$message?.success($t('common.importSuccess'));
    }
  } finally {
    endLoading();
  }
}

function handleDownloadTemplate() {
  download(
    '/system/user/import/template',
    {},
    `${$t('page.system.user.title')}_${$t('common.importTemplate')}_${new Date().getTime()}.xlsx`
  );
}

watch(visible, () => {
  if (visible.value) {
    Object.assign(data, { importKey: '', duplicateUser: 1, duplicateEmail: 1, duplicatePhone: 1, defaultStatus: 1 });
    parsed.value = null;
    fileList.value = [];
    success.value = false;
    message.value = '';
  }
});

watch(fileList, () => {
  parsed.value = null;
  data.importKey = '';
});
</script>

<template>
  <NModal
    v-model:show="visible"
    :title="$t('common.import')"
    preset="card"
    :bordered="false"
    display-directive="show"
    class="max-w-90% w-600px"
    @close="closeDrawer"
  >
    <NUpload
      v-model:file-list="fileList"
      :disabled="loading"
      :max="1"
      :file-size="50"
      accept=".xls,.xlsx"
      :multiple="false"
      directory-dnd
      :default-upload="false"
      list-type="text"
    >
      <NUploadDragger>
        <div class="mb-12px flex-center">
          <SvgIcon icon="material-symbols:unarchive-outline" class="text-58px color-#d8d8db dark:color-#a1a1a2" />
        </div>
        <NText class="text-16px">{{ $t('common.importTip') }}</NText>
        <NP depth="3" class="mt-8px text-center">
          {{ $t('common.importSize') }}
          <b class="text-red-500">50MB</b>
          {{ $t('common.importFormat') }}
          <b class="text-red-500">xls/xlsx</b>
          {{ $t('common.importEnd') }}
        </NP>
      </NUploadDragger>
    </NUpload>
    <NForm label-placement="left" :label-width="120" class="mt-16px">
      <NFormItem label="重复用户策略">
        <DictSelect v-model:value="data.duplicateUser" dict-code="import_policy_enum" :disabled="loading" />
      </NFormItem>
      <NFormItem label="重复邮箱策略">
        <DictSelect v-model:value="data.duplicateEmail" dict-code="import_policy_enum" :disabled="loading" />
      </NFormItem>
      <NFormItem label="重复手机号策略">
        <DictSelect v-model:value="data.duplicatePhone" dict-code="import_policy_enum" :disabled="loading" />
      </NFormItem>
      <NFormItem label="默认用户状态">
        <DictSelect v-model:value="data.defaultStatus" dict-code="dis_enable_status_enum" :disabled="loading" />
      </NFormItem>
    </NForm>
    <NDescriptions v-if="parsed" :column="2" label-placement="left" bordered size="small">
      <NDescriptionsItem label="总行数">{{ parsed.totalRows }}</NDescriptionsItem>
      <NDescriptionsItem label="有效行数">{{ parsed.validRows }}</NDescriptionsItem>
      <NDescriptionsItem label="重复用户">{{ parsed.duplicateUserRows }}</NDescriptionsItem>
      <NDescriptionsItem label="重复邮箱">{{ parsed.duplicateEmailRows }}</NDescriptionsItem>
      <NDescriptionsItem label="重复手机号">{{ parsed.duplicatePhoneRows }}</NDescriptionsItem>
    </NDescriptions>

    <NAlert v-if="message" :title="$t('common.importResult')" :type="success ? 'success' : 'error'" :bordered="false">
      <NScrollbar class="max-h-200px">
        <span>{{ message }}</span>
      </NScrollbar>
    </NAlert>
    <template #footer>
      <NSpace justify="end" :size="16">
        <NButton @click="handleDownloadTemplate">{{ $t('common.downloadTemplate') }}</NButton>
        <NButton type="primary" :loading="loading" :disabled="!fileList.length" @click="handleSubmit">
          {{ parsed ? '确认导入' : '解析文件' }}
        </NButton>
      </NSpace>
    </template>
  </NModal>
</template>

<style scoped></style>
