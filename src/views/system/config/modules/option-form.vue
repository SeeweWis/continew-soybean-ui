<script setup lang="ts">
import { reactive, ref, watch } from 'vue';
import { useLoading } from '@sa/hooks';
import { fetchGetOptionList, fetchResetOptionValue, fetchUpdateOptions } from '@/service/api/system';
import { $t } from '@/locales';
import { useAuth } from '@/hooks/business/auth';

defineOptions({
  name: 'OptionForm'
});

interface Props {
  /** 参数类别（SITE/PASSWORD/LOGIN/MAIL/THIRD_PARTY） */
  category: string;
  /** 仅展示指定前缀的参数 */
  prefix?: string;
}

const props = defineProps<Props>();
const { hasAuth } = useAuth();

const { loading, startLoading, endLoading } = useLoading();
const { loading: saveLoading, startLoading: startSaveLoading, endLoading: endSaveLoading } = useLoading();

const options = ref<Api.System.ContinewOption[]>([]);
const loadError = ref(false);
const formModel = reactive<Record<string, string>>({});

const booleanOptionCodes = new Set([
  'LOGIN_CAPTCHA_ENABLED',
  'MAIL_SSL_ENABLED',
  'PASSWORD_ALLOW_CONTAIN_USERNAME',
  'PASSWORD_REQUIRE_SYMBOLS',
  'ALIYUN_OCR_ENABLED',
  'WECHAT_PAY_ENABLED'
]);
const secretOptionCodes = new Set([
  'MINI_PROGRAM_APP_SECRET',
  'ALIYUN_OCR_ACCESS_KEY_SECRET',
  'WECHAT_PAY_PRIVATE_KEY',
  'WECHAT_PAY_API_V3_KEY'
]);
const booleanOptions = [
  { label: '是', value: '1' },
  { label: '否', value: '0' }
];

/** 布尔型参数（渲染开关） */
function isBooleanOption(option: Api.System.ContinewOption) {
  return option.value === 'true' || option.value === 'false';
}

async function getOptions() {
  startLoading();
  loadError.value = false;
  try {
    const { data, error } = await fetchGetOptionList(props.category);
    if (error) {
      loadError.value = true;
      return;
    }
    options.value = props.prefix ? data.filter(option => option.code.startsWith(props.prefix!)) : data;
    Object.keys(formModel).forEach(key => {
      formModel[key] = '';
    });
    options.value.forEach(option => {
      formModel[option.code] = option.value ?? '';
    });
  } finally {
    endLoading();
  }
}

async function handleSave() {
  if (saveLoading.value) return;
  const data: Api.System.ContinewOptionReq[] = options.value.map(option => ({
    id: option.id,
    code: option.code,
    value: formModel[option.code] || null
  }));
  startSaveLoading();
  try {
    const { error } = await fetchUpdateOptions(data);
    if (error) return;
    window.$message?.success($t('common.updateSuccess'));
    await getOptions();
  } finally {
    endSaveLoading();
  }
}

function handleReset() {
  window.$dialog?.warning({
    title: $t('common.warning'),
    content: '确认将当前区域的配置恢复为默认值吗？已保存的密钥也会清除。',
    positiveText: $t('common.confirm'),
    negativeText: $t('common.cancel'),
    onPositiveClick: async () => {
      startSaveLoading();
      try {
        const codes = options.value.map(option => option.code);
        const { error } = await fetchResetOptionValue(codes, props.prefix ? '' : props.category);
        if (error) return false;
        window.$message?.success('重置成功');
        await getOptions();
      } finally {
        endSaveLoading();
      }
    }
  });
}

watch(
  () => [props.category, props.prefix],
  () => getOptions(),
  { immediate: true }
);
</script>

<template>
  <NSpin :show="loading">
    <NResult v-if="loadError" status="error" title="配置加载失败">
      <template #footer>
        <NButton @click="getOptions">重新加载</NButton>
      </template>
    </NResult>
    <NForm
      v-else
      :disabled="loading || saveLoading || (category === 'THIRD_PARTY' && !hasAuth('system:thirdPartyConfig:update'))"
      :label-placement="prefix ? 'top' : 'left'"
      :label-width="prefix ? undefined : 240"
      class="max-w-760px"
    >
      <NFormItem v-for="option in options" :key="option.code">
        <NSelect
          v-if="booleanOptionCodes.has(option.code)"
          v-model:value="formModel[option.code]"
          :options="booleanOptions"
        />
        <NInput
          v-else-if="secretOptionCodes.has(option.code)"
          v-model:value="formModel[option.code]"
          autocomplete="new-password"
          :type="option.code === 'WECHAT_PAY_PRIVATE_KEY' ? 'textarea' : 'password'"
          :autosize="option.code === 'WECHAT_PAY_PRIVATE_KEY' ? { minRows: 4, maxRows: 10 } : undefined"
          placeholder="已配置时留空不修改"
        />
        <NSwitch
          v-else-if="isBooleanOption(option)"
          v-model:value="formModel[option.code]"
          checked-value="true"
          unchecked-value="false"
        />
        <NInput
          v-else
          v-model:value="formModel[option.code]"
          :type="option.code === 'WECHAT_PAY_PUBLIC_KEY' ? 'textarea' : 'text'"
          :autosize="option.code === 'WECHAT_PAY_PUBLIC_KEY' ? { minRows: 4, maxRows: 10 } : undefined"
          placeholder="请输入"
        />
        <template #label>
          <NTooltip v-if="option.description" trigger="hover">
            <template #trigger>
              <span>{{ option.name }}</span>
            </template>
            {{ option.description }}
          </NTooltip>
          <span v-else>{{ option.name }}</span>
        </template>
      </NFormItem>
      <NFormItem
        v-if="options.length && (category !== 'THIRD_PARTY' || hasAuth('system:thirdPartyConfig:update'))"
        :label="prefix ? undefined : ' '"
      >
        <NSpace>
          <NButton type="primary" :loading="saveLoading" @click="handleSave">保存</NButton>
          <NButton :disabled="saveLoading" @click="handleReset">重置</NButton>
        </NSpace>
      </NFormItem>
      <NEmpty v-if="!loading && !options.length" description="暂无配置项" />
    </NForm>
  </NSpin>
</template>

<style scoped></style>
