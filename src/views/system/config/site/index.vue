<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import type { FormInst, FormRules, UploadFileInfo } from 'naive-ui';
import { useLoading } from '@sa/hooks';
import { fetchGetOptionList, fetchResetOptionValue, fetchUpdateOptions } from '@/service/api/system';
import { useAuth } from '@/hooks/business/auth';
import { useAppStore } from '@/store/modules/app';
import { resolveSiteImage } from '@/utils/site';
import { $t } from '@/locales';

defineOptions({ name: 'SiteConfig' });

const SITE_OPTION_CODES = ['SITE_LOGO', 'SITE_FAVICON', 'SITE_TITLE', 'SITE_DESCRIPTION', 'SITE_COPYRIGHT', 'SITE_BEIAN'] as const;

type SiteOptionCode = (typeof SITE_OPTION_CODES)[number];
type SiteImageCode = 'SITE_LOGO' | 'SITE_FAVICON';
type SiteFormModel = Record<SiteOptionCode, string>;

const formRef = ref<FormInst | null>(null);
const { hasAuth } = useAuth();
const appStore = useAppStore();
const { loading, startLoading, endLoading } = useLoading();
const { loading: saveLoading, startLoading: startSaveLoading, endLoading: endSaveLoading } = useLoading();
const siteOptions = ref<Api.System.ContinewOption[]>([]);
const formModel = reactive<SiteFormModel>({
  SITE_LOGO: '',
  SITE_FAVICON: '',
  SITE_TITLE: '',
  SITE_DESCRIPTION: '',
  SITE_COPYRIGHT: '',
  SITE_BEIAN: ''
});

const formRules: FormRules = {
  SITE_TITLE: { required: true, message: '请输入系统名称', trigger: 'blur' },
  SITE_DESCRIPTION: { required: true, message: '请输入系统描述', trigger: 'blur' },
  SITE_COPYRIGHT: { required: true, message: '请输入版权声明', trigger: 'blur' }
};

const optionMap = computed(() => new Map(siteOptions.value.map(option => [option.code, option])));
const canUpdate = computed(() => hasAuth('system:siteConfig:update'));

function getOption(code: SiteOptionCode) {
  return optionMap.value.get(code);
}

function resetForm() {
  SITE_OPTION_CODES.forEach(code => {
    formModel[code] = getOption(code)?.value ?? '';
  });
  formRef.value?.restoreValidation();
}

async function getOptions() {
  startLoading();
  const { data, error } = await fetchGetOptionList('SITE');
  endLoading();
  if (error) return;

  siteOptions.value = data.filter(option => SITE_OPTION_CODES.includes(option.code as SiteOptionCode));
  resetForm();
}

async function readImage(file: File) {
  if (!file.type.startsWith('image/')) {
    window.$message?.error('请选择图片文件');
    return null;
  }

  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener('load', () => resolve(String(reader.result)));
    reader.addEventListener('error', () => reject(reader.error));
    reader.readAsDataURL(file);
  });
}

async function handleImageSelect(code: SiteImageCode, data: { file: UploadFileInfo }) {
  const file = data.file.file;
  if (!file) return false;

  try {
    const value = await readImage(file);
    if (value) formModel[code] = value;
  } catch {
    window.$message?.error('图片读取失败，请重新选择');
  }
  return false;
}

async function handleSave() {
  try {
    await formRef.value?.validate();
  } catch {
    return;
  }

  const data = SITE_OPTION_CODES.reduce<Api.System.ContinewOptionReq[]>((items, code) => {
    const option = getOption(code);
    if (option) items.push({ id: option.id, code, value: formModel[code] || null });
    return items;
  }, []);

  if (data.length !== SITE_OPTION_CODES.length) {
    window.$message?.error('网站配置项不完整，请检查后端初始化数据');
    return;
  }

  startSaveLoading();
  const { error } = await fetchUpdateOptions(data);
  endSaveLoading();
  if (error) return;

  appStore.setSiteConfig(formModel);
  window.$message?.success($t('common.updateSuccess'));
  await getOptions();
}

function handleReset() {
  window.$dialog?.warning({
    title: $t('common.warning'),
    content: '确认恢复网站配置为默认值吗？',
    positiveText: $t('common.confirm'),
    negativeText: $t('common.cancel'),
    onPositiveClick: async () => {
      const { error } = await fetchResetOptionValue([...SITE_OPTION_CODES], 'SITE');
      if (error) return;
      await getOptions();
      appStore.setSiteConfig(formModel);
      window.$message?.success('重置成功');
    }
  });
}

onMounted(getOptions);
</script>

<template>
  <NSpin :show="loading">
    <NForm ref="formRef" :model="formModel" :rules="formRules" label-placement="left" :label-width="160" class="max-w-760px">
      <NFormItem :label="getOption('SITE_LOGO')?.name || '系统 LOGO'">
        <div class="flex-y-center gap-16px">
          <div class="brand-preview logo-preview">
            <img v-if="formModel.SITE_LOGO" :src="resolveSiteImage('SITE_LOGO', formModel.SITE_LOGO)" alt="系统 Logo 预览" />
            <span v-else>暂无 Logo</span>
          </div>
          <NUpload accept="image/*" :max="1" :show-file-list="false" :disabled="!canUpdate" @before-upload="data => handleImageSelect('SITE_LOGO', data)">
            <NButton :disabled="!canUpdate">上传 Logo</NButton>
          </NUpload>
        </div>
        <template v-if="getOption('SITE_LOGO')?.description" #feedback>{{ getOption('SITE_LOGO')?.description }}</template>
      </NFormItem>
      <NFormItem :label="getOption('SITE_FAVICON')?.name || '系统图标'">
        <div class="flex-y-center gap-16px">
          <div class="brand-preview favicon-preview">
            <img v-if="formModel.SITE_FAVICON" :src="resolveSiteImage('SITE_FAVICON', formModel.SITE_FAVICON)" alt="网站图标预览" />
            <span v-else>暂无图标</span>
          </div>
          <NUpload accept="image/*" :max="1" :show-file-list="false" :disabled="!canUpdate" @before-upload="data => handleImageSelect('SITE_FAVICON', data)">
            <NButton :disabled="!canUpdate">上传图标</NButton>
          </NUpload>
        </div>
        <template v-if="getOption('SITE_FAVICON')?.description" #feedback>{{ getOption('SITE_FAVICON')?.description }}</template>
      </NFormItem>
      <NFormItem path="SITE_TITLE" :label="getOption('SITE_TITLE')?.name || '系统名称'" :feedback="getOption('SITE_TITLE')?.description">
        <NInput v-model:value="formModel.SITE_TITLE" :disabled="!canUpdate" placeholder="请输入系统名称" :maxlength="18" show-count />
      </NFormItem>
      <NFormItem path="SITE_DESCRIPTION" :label="getOption('SITE_DESCRIPTION')?.name || '系统描述'" :feedback="getOption('SITE_DESCRIPTION')?.description">
        <NInput v-model:value="formModel.SITE_DESCRIPTION" :disabled="!canUpdate" type="textarea" :rows="3" placeholder="请输入系统描述" />
      </NFormItem>
      <NFormItem path="SITE_COPYRIGHT" :label="getOption('SITE_COPYRIGHT')?.name || '版权声明'" :feedback="getOption('SITE_COPYRIGHT')?.description">
        <NInput v-model:value="formModel.SITE_COPYRIGHT" :disabled="!canUpdate" placeholder="请输入版权声明" />
      </NFormItem>
      <NFormItem :label="getOption('SITE_BEIAN')?.name || '备案号'" :feedback="getOption('SITE_BEIAN')?.description">
        <NInput v-model:value="formModel.SITE_BEIAN" :disabled="!canUpdate" placeholder="请输入备案号" :maxlength="30" show-count />
      </NFormItem>
      <NFormItem v-if="canUpdate" label=" ">
        <NSpace>
          <NButton type="primary" :loading="saveLoading" @click="handleSave">保存</NButton>
          <NButton @click="resetForm">重置</NButton>
          <NButton @click="handleReset">恢复默认</NButton>
        </NSpace>
      </NFormItem>
    </NForm>
  </NSpin>
</template>

<style scoped>
.brand-preview {
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border: 1px dashed var(--n-border-color);
  border-radius: 4px;
  color: var(--n-text-color-3);
  font-size: 12px;
}

.brand-preview img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.logo-preview {
  width: 120px;
  height: 56px;
}

.favicon-preview {
  width: 48px;
  height: 48px;
}
</style>
