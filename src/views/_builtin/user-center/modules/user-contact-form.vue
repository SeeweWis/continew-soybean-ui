<script setup lang="ts">
import { computed, reactive, ref } from 'vue';
import { useCountDown } from '@sa/hooks';
import { fetchEmailCaptcha, fetchSmsCaptcha } from '@/service/api/auth';
import { fetchUpdateUserEmail, fetchUpdateUserPhone } from '@/service/api/system';
import { useAuthStore } from '@/store/modules/auth';
import { useFormRules, useNaiveForm } from '@/hooks/common/form';

const props = defineProps<{ kind: 'email' | 'phone' }>();
const authStore = useAuthStore();
const { formRef, validate, restoreValidation } = useNaiveForm();
const { patternRules, createRequiredRule } = useFormRules();
const { count, start, isCounting } = useCountDown(60);
const sending = ref(false);
const saving = ref(false);
const title = computed(() => (props.kind === 'email' ? '邮箱' : '手机号'));
const model = reactive({ value: authStore.userInfo[props.kind] || '', captcha: '', oldPassword: '' });
const rules = computed(() => ({
  value: { ...patternRules[props.kind], required: true },
  captcha: { required: true, pattern: /^\d{6}$/, message: '请输入 6 位验证码', trigger: 'blur' },
  oldPassword: createRequiredRule('请输入当前密码')
}));

async function sendCode() {
  if (sending.value || saving.value || isCounting.value) return;
  const pattern = patternRules[props.kind].pattern as RegExp;
  if (!pattern.test(model.value)) {
    window.$message?.error(`请输入有效的${title.value}`);
    return;
  }
  sending.value = true;
  try {
    const { error } = await (props.kind === 'email' ? fetchEmailCaptcha(model.value) : fetchSmsCaptcha(model.value));
    if (!error) {
      start();
      window.$message?.success('验证码已发送');
    }
  } finally {
    sending.value = false;
  }
}

async function submit() {
  if (saving.value || sending.value) return;
  await validate();
  saving.value = true;
  const { value, captcha, oldPassword } = model;
  try {
    const { error } = await (props.kind === 'email'
      ? fetchUpdateUserEmail({ email: value, captcha, oldPassword })
      : fetchUpdateUserPhone({ phone: value, captcha, oldPassword }));
    if (!error) {
      authStore.userInfo[props.kind] = value;
      model.captcha = '';
      model.oldPassword = '';
      restoreValidation();
      window.$message?.success(`${title.value}修改成功`);
    }
  } catch (error) {
    window.$message?.error((error as Error).message);
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <NForm
    ref="formRef"
    :model="model"
    :rules="rules"
    label-placement="left"
    label-width="100px"
    class="mt-16px max-w-520px"
    :disabled="saving || sending"
  >
    <NFormItem :label="title" path="value">
      <NInput v-model:value="model.value" :placeholder="`请输入新${title}`" />
    </NFormItem>
    <NFormItem label="验证码" path="captcha">
      <NInputGroup>
        <NInput v-model:value="model.captcha" maxlength="6" placeholder="请输入验证码" />
        <NButton :loading="sending" :disabled="isCounting || saving" @click="sendCode">
          {{ isCounting ? `${count} 秒后重试` : '发送验证码' }}
        </NButton>
      </NInputGroup>
    </NFormItem>
    <NFormItem label="当前密码" path="oldPassword">
      <NInput
        v-model:value="model.oldPassword"
        type="password"
        show-password-on="click"
        autocomplete="current-password"
        placeholder="请输入当前密码"
      />
    </NFormItem>
    <NFormItem>
      <NButton type="primary" :loading="saving" :disabled="sending" @click="submit">修改{{ title }}</NButton>
    </NFormItem>
  </NForm>
</template>
