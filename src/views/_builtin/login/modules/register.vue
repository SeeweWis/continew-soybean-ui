<script setup lang="ts">
import { computed, reactive, ref } from 'vue';
import { useLoading } from '@sa/hooks';
import { fetchCaptchaCode } from '@/service/api';
import { useRouterPush } from '@/hooks/common/router';
import { useFormRules, useNaiveForm } from '@/hooks/common/form';
import { $t } from '@/locales';

defineOptions({
  name: 'Register'
});

const { toggleLoginModule } = useRouterPush();
const { formRef, validate } = useNaiveForm();
const { loading: codeLoading, startLoading: startCodeLoading, endLoading: endCodeLoading } = useLoading();

const codeUrl = ref<string>();
const captchaEnabled = ref<boolean>(false);

interface RegisterForm {
  username: string;
  password: string;
  confirmPassword: string;
  captcha?: string;
  uuid?: string;
}

const model: RegisterForm = reactive({
  username: '',
  password: '',
  confirmPassword: ''
});

type RuleKey = Extract<keyof RegisterForm, 'username' | 'password' | 'confirmPassword' | 'captcha'>;

const rules = computed<Record<RuleKey, App.Global.FormRule[]>>(() => {
  const { createConfirmPwdRule, createRequiredRule } = useFormRules();

  return {
    username: [createRequiredRule($t('form.userName.required'))],
    password: [createRequiredRule($t('form.pwd.required'))],
    confirmPassword: createConfirmPwdRule(model.password!),
    captcha: captchaEnabled.value ? [createRequiredRule($t('form.code.required'))] : []
  };
});

async function handleSubmit() {
  try {
    await validate();
    window.$message?.warning('当前后端未开放自助注册');
    toggleLoginModule('pwd-login');
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
</script>

<template>
  <div>
    <div class="mb-5px text-32px text-black font-600 sm:text-30px dark:text-white">注册新账户</div>
    <div class="pb-18px text-16px text-#858585">欢迎注册！请输入您的账户信息</div>
    <NForm ref="formRef" :model="model" :rules="rules" size="large" :show-label="false" @keyup.enter="handleSubmit">
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
      <NFormItem path="confirmPassword">
        <NInput
          v-model:value="model.confirmPassword"
          type="password"
          show-password-on="click"
          :placeholder="$t('page.login.common.confirmPasswordPlaceholder')"
        />
      </NFormItem>
      <NFormItem v-if="captchaEnabled" path="captcha">
        <div class="w-full flex-y-center gap-16px">
          <NInput v-model:value="model.captcha" :placeholder="$t('page.login.common.codePlaceholder')" />
          <NSpin :show="codeLoading" :size="28" class="h-52px">
            <NButton :focusable="false" class="login-code h-52px w-136px" @click="handleFetchCaptchaCode">
              <img v-if="codeUrl" :src="codeUrl" />
              <NEmpty v-else :show-icon="false" description="暂无验证码" />
            </NButton>
          </NSpin>
        </div>
      </NFormItem>
      <NSpace vertical :size="18" class="w-full">
        <NButton type="primary" size="large" block @click="handleSubmit">
          {{ $t('page.login.common.register') }}
        </NButton>
      </NSpace>
    </NForm>

    <div class="mt-24px w-full text-center text-18px text-#858585">
      您已有账户？
      <NA type="primary" class="text-18px" @click="toggleLoginModule('pwd-login')">
        {{ $t('common.login') }}
      </NA>
    </div>
  </div>
</template>

<style scoped lang="scss">
.login-code {
  &.n-button {
    --n-padding: 0 8px !important;
    background-color: #c0c0c0;
  }

  img {
    height: 40px;
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

:deep(.n-button) {
  --n-height: 42px !important;
  --n-font-size: 18px !important;
  --n-border-radius: 8px !important;
}
</style>
