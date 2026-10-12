<script setup lang="ts">
import { computed, reactive, ref } from 'vue';
import { useLoading } from '@sa/hooks';
import { fetchCaptchaCode } from '@/service/api';
import { useAuthStore } from '@/store/modules/auth';
import { useFormRules, useNaiveForm } from '@/hooks/common/form';
import { localStg } from '@/utils/storage';
import { $t } from '@/locales';

defineOptions({
  name: 'PwdLogin'
});

const authStore = useAuthStore();
const { formRef, validate } = useNaiveForm();
const { loading: codeLoading, startLoading: startCodeLoading, endLoading: endCodeLoading } = useLoading();

const codeUrl = ref<string>();
const captchaEnabled = ref<boolean>(false);
const remberMe = ref<boolean>(false);

const model: Api.Auth.PwdLoginForm = reactive({
  clientId: '',
  authType: 'ACCOUNT',
  username: '',
  password: ''
});

type RuleKey = Extract<keyof Api.Auth.PwdLoginForm, 'username' | 'password' | 'captcha'>;

const rules = computed<Record<RuleKey, App.Global.FormRule[]>>(() => {
  // inside computed to make locale reactive, if not apply i18n, you can define it without computed
  const { createRequiredRule } = useFormRules();

  const loginRules: Record<RuleKey, App.Global.FormRule[]> = {
    username: [createRequiredRule($t('form.userName.required'))],
    password: [createRequiredRule($t('form.pwd.required'))],
    captcha: captchaEnabled.value ? [createRequiredRule($t('form.code.required'))] : []
  };

  return loginRules;
});

async function handleSubmit() {
  await validate();
  if (remberMe.value) {
    localStg.set('loginRember', model.username);
  } else {
    // 否则移除
    localStg.remove('loginRember');
  }
  try {
    await authStore.login(model);
  } catch {
    handleFetchCaptchaCode();
  }
}

async function handleFetchCaptchaCode() {
  startCodeLoading();
  const { data, error } = await fetchCaptchaCode();
  if (!error) {
    captchaEnabled.value = Boolean(data.img);
    model.uuid = data.uuid;
    codeUrl.value = data.img;
  }
  endCodeLoading();
}

handleFetchCaptchaCode();

function handleLoginRember() {
  const loginRember = localStg.get('loginRember');
  if (!loginRember) return;
  remberMe.value = true;
  model.username = loginRember;
}

handleLoginRember();
</script>

<template>
  <div>
    <div class="mb-5px text-32px font-600 text-[var(--login-text-primary)]">登录到您的账户</div>
    <div class="pb-18px text-16px text-[var(--login-text-secondary)]">欢迎回来！请输入您的账户信息</div>
    <NForm
      ref="formRef"
      :model="model"
      :rules="rules"
      size="large"
      :show-label="false"
      @keyup.enter="() => !authStore.loginLoading && handleSubmit()"
    >
      <NFormItem path="username">
        <NInput v-model:value="model.username" :placeholder="$t('page.login.common.userNamePlaceholder')" />
      </NFormItem>
      <NFormItem path="password">
        <NInput
          v-model:value="model.password"
          type="password"
          show-password-on="click"
          :placeholder="$t('page.login.common.passwordPlaceholder')"
        />
      </NFormItem>
      <NFormItem v-if="captchaEnabled" path="captcha">
        <div class="w-full flex-y-center gap-16px">
          <NInput v-model:value="model.captcha" :placeholder="$t('page.login.common.codePlaceholder')" />
          <NSpin :show="codeLoading" :size="28" class="h-42px">
            <NButton :focusable="false" class="login-code h-42px w-114px" @click="handleFetchCaptchaCode">
              <img v-if="codeUrl" :src="codeUrl" />
              <NEmpty v-else :show-icon="false" description="暂无验证码" />
            </NButton>
          </NSpin>
        </div>
      </NFormItem>
      <NSpace vertical :size="12" class="mb-8px">
        <div class="mx-6px mb-8px flex-y-center justify-between">
          <NCheckbox v-model:checked="remberMe" size="large">{{ $t('page.login.pwdLogin.rememberMe') }}</NCheckbox>
        </div>
        <NButton type="primary" size="large" block :loading="authStore.loginLoading" @click="handleSubmit">
          {{ $t('common.login') }}
        </NButton>
      </NSpace>
    </NForm>
  </div>
</template>

<style scoped>
.login-code {
  &.n-button {
    --n-padding: 0 !important;
  }

  img {
    height: 42px;
    border-radius: 8px;
    background: var(--login-code-background);
  }
}

:deep(.n-base-selection),
:deep(.n-input) {
  --n-height: 42px !important;
  --n-font-size: 16px !important;
  --n-border-radius: 8px !important;
}

:deep(.n-base-selection-label) {
  padding: 0 6px !important;
}

:deep(.n-checkbox) {
  --n-size: 18px !important;
  --n-font-size: 16px !important;
}

:deep(.n-button) {
  --n-height: 42px !important;
  --n-font-size: 18px !important;
  --n-border-radius: 8px !important;
}

:deep(.n-divider) {
  --n-font-size: 16px !important;
  --n-font-weight: 400 !important;
}
</style>
