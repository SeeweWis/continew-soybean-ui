<script setup lang="ts">
import { computed, reactive } from 'vue';
import { useCountDown, useLoading } from '@sa/hooks';
import { fetchEmailCaptcha } from '@/service/api/auth';
import { useAuthStore } from '@/store/modules/auth';
import { useFormRules, useNaiveForm } from '@/hooks/common/form';
import { REG_EMAIL } from '@/constants/reg';
import { $t } from '@/locales';

defineOptions({ name: 'EmailLogin' });

const { formRef, validate } = useNaiveForm();
const authStore = useAuthStore();
const { loading, startLoading, endLoading } = useLoading();
const { count, start, isCounting } = useCountDown(10);

const model = reactive({
  email: '',
  captcha: ''
});

const label = computed(() => {
  if (isCounting.value) return $t('page.login.codeLogin.reGetCode', { time: count.value });
  return $t('page.login.codeLogin.getCode');
});
const rules = computed(() => {
  const { formRules } = useFormRules();
  return {
    email: formRules.email,
    captcha: formRules.code
  };
});

async function handleGetCaptcha() {
  if (!REG_EMAIL.test(model.email.trim()) || loading.value || isCounting.value) return;

  startLoading();
  try {
    const { error } = await fetchEmailCaptcha(model.email.trim());
    if (!error) start();
  } finally {
    endLoading();
  }
}

async function handleSubmit() {
  await validate();
  try {
    await authStore.login({
      clientId: import.meta.env.VITE_APP_CLIENT_ID || '',
      authType: 'EMAIL',
      email: model.email,
      captcha: model.captcha
    });
  } catch {
    // request errors are handled by the shared request layer
  }
}
</script>

<template>
  <div>
    <div class="mb-5px text-32px font-600 sm:text-30px text-[var(--login-text-primary)]">
      {{ $t('page.login.emailLogin.title') }}
    </div>
    <div class="pb-18px text-16px text-[var(--login-text-secondary)]">请输入邮箱，我们将发送验证码到您的邮箱</div>
    <NForm ref="formRef" :model="model" :rules="rules" size="large" :show-label="false" @keyup.enter="handleSubmit">
      <NFormItem path="email">
        <NInput v-model:value="model.email" :placeholder="$t('form.email.required')" />
      </NFormItem>
      <NFormItem path="captcha">
        <div class="w-full flex-y-center gap-16px">
          <NInput v-model:value="model.captcha" :placeholder="$t('page.login.common.codePlaceholder')" />
          <NButton size="large" :disabled="isCounting" :loading="loading" @click="handleGetCaptcha">
            {{ label }}
          </NButton>
        </div>
      </NFormItem>
      <NSpace vertical :size="20" class="w-full">
        <NButton type="primary" size="large" block :loading="authStore.loginLoading" @click="handleSubmit">
          {{ $t('common.login') }}
        </NButton>
      </NSpace>
    </NForm>
  </div>
</template>

<style scoped>
:deep(.n-input) {
  --n-height: 42px !important;
  --n-font-size: 16px !important;
  --n-border-radius: 8px !important;
}

:deep(.n-button) {
  --n-height: 42px !important;
  --n-font-size: 18px !important;
  --n-border-radius: 8px !important;
}
</style>
