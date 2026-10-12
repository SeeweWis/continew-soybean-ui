<script setup lang="ts">
import { reactive, ref, watch } from 'vue';
import { useLoading } from '@sa/hooks';
import { fetchGetOptionList, fetchResetOptionValue, fetchUpdateOptions } from '@/service/api/system';
import { $t } from '@/locales';

defineOptions({
  name: 'OptionForm'
});

interface Props {
  /** 参数类别（SITE/PASSWORD/LOGIN/MAIL） */
  category: string;
}

const props = defineProps<Props>();

const { loading, startLoading, endLoading } = useLoading();
const { loading: saveLoading, startLoading: startSaveLoading, endLoading: endSaveLoading } = useLoading();

const options = ref<Api.System.ContinewOption[]>([]);
const formModel = reactive<Record<string, string>>({});

const booleanOptionCodes = new Set([
  'LOGIN_CAPTCHA_ENABLED',
  'MAIL_SSL_ENABLED',
  'PASSWORD_ALLOW_CONTAIN_USERNAME',
  'PASSWORD_REQUIRE_SYMBOLS'
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
  const { data, error } = await fetchGetOptionList(props.category);
  if (!error) {
    options.value = data;
    Object.keys(formModel).forEach(key => {
      formModel[key] = undefined as unknown as string;
    });
    data.forEach(option => {
      formModel[option.code] = option.value ?? '';
    });
  }
  endLoading();
}

async function handleSave() {
  const data: Api.System.ContinewOptionReq[] = options.value.map(option => ({
    id: option.id,
    code: option.code,
    value: formModel[option.code] || null
  }));
  startSaveLoading();
  const { error } = await fetchUpdateOptions(data);
  endSaveLoading();
  if (error) return;
  window.$message?.success($t('common.updateSuccess'));
  await getOptions();
}

async function handleReset() {
  const codes = options.value.map(option => option.code);
  const { error } = await fetchResetOptionValue(codes, props.category);
  if (error) return;
  window.$message?.success('重置成功');
  await getOptions();
}

watch(
  () => props.category,
  () => getOptions(),
  { immediate: true }
);
</script>

<template>
  <NSpin :show="loading">
    <NForm label-placement="left" :label-width="240" class="max-w-760px">
      <NFormItem v-for="option in options" :key="option.code">
        <NSelect
          v-if="booleanOptionCodes.has(option.code)"
          v-model:value="formModel[option.code]"
          :options="booleanOptions"
        />
        <NSwitch
          v-else-if="isBooleanOption(option)"
          v-model:value="formModel[option.code]"
          checked-value="true"
          unchecked-value="false"
        />
        <NInput v-else v-model:value="formModel[option.code]" placeholder="请输入" />
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
      <NFormItem v-if="options.length" label=" ">
        <NSpace>
          <NButton type="primary" :loading="saveLoading" @click="handleSave">保存</NButton>
          <NButton @click="handleReset">重置</NButton>
        </NSpace>
      </NFormItem>
      <NEmpty v-if="!loading && !options.length" description="暂无配置项" />
    </NForm>
  </NSpin>
</template>

<style scoped></style>
