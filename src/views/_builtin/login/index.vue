<script setup lang="ts">
import { computed } from 'vue';
import type { Component } from 'vue';
import { loginModuleRecord } from '@/constants/app';
import loginBackground from '@/assets/svg-icon/login-background.svg';
import { useAppStore } from '@/store/modules/app';
import { useThemeStore } from '@/store/modules/theme';
import { useRouterPush } from '@/hooks/common/router';
import PwdLogin from './modules/pwd-login.vue';
import CodeLogin from './modules/code-login.vue';
import EmailLogin from './modules/email-login.vue';
import Register from './modules/register.vue';
import ResetPwd from './modules/reset-pwd.vue';
import BindWechat from './modules/bind-wechat.vue';

interface Props {
  /** The login module */
  module?: UnionKey.LoginModule;
}

const props = defineProps<Props>();
const appStore = useAppStore();
const themeStore = useThemeStore();
const { toggleLoginModule } = useRouterPush();

const LOGIN_METHODS = ['pwd-login', 'code-login', 'email-login'] as const;
type LoginMethod = (typeof LOGIN_METHODS)[number];

interface LoginModule {
  label: App.I18n.I18nKey;
  component: Component;
}

const moduleMap: Record<UnionKey.LoginModule, LoginModule> = {
  'pwd-login': { label: loginModuleRecord['pwd-login'], component: PwdLogin },
  'code-login': { label: loginModuleRecord['code-login'], component: CodeLogin },
  'email-login': { label: loginModuleRecord['email-login'], component: EmailLogin },
  register: { label: loginModuleRecord.register, component: Register },
  'reset-pwd': { label: loginModuleRecord['reset-pwd'], component: ResetPwd },
  'bind-wechat': { label: loginModuleRecord['bind-wechat'], component: BindWechat }
};

const activeModule = computed(() => moduleMap[props.module || 'pwd-login']);
const activeLoginMethod = computed<LoginMethod>(() => {
  const module = props.module as LoginMethod;
  return LOGIN_METHODS.includes(module) ? module : 'pwd-login';
});
const showLoginMethods = computed(() => !props.module || LOGIN_METHODS.includes(props.module as LoginMethod));

function handleLoginMethodChange(value: string) {
  if (LOGIN_METHODS.includes(value as LoginMethod)) {
    toggleLoginModule(value as LoginMethod);
  }
}
</script>

<template>
  <div class="login-page" :class="{ dark: themeStore.darkMode }">
    <div class="login-background" aria-hidden="true">
      <i class="login-orb orb-one"></i>
      <i class="login-orb orb-two"></i>
      <i class="login-orb orb-three"></i>
      <i class="login-orb orb-four"></i>
    </div>

    <header class="login-brand">
      <SystemLogo class="text-34px" />
      <span>{{ appStore.siteTitle }}</span>
    </header>

    <div class="login-tools">
      <ThemeSchemaSwitch
        :theme-schema="themeStore.themeScheme"
        :show-tooltip="false"
        class="text-20px lt-sm:text-18px"
        @switch="themeStore.toggleThemeScheme"
      />
      <LangSwitch
        v-if="themeStore.header.multilingual.visible"
        :lang="appStore.locale"
        :lang-options="appStore.localeOptions"
        :show-tooltip="false"
        class="text-20px lt-sm:text-18px"
        @change-lang="appStore.changeLocale"
      />
    </div>

    <main class="login-box">
      <section class="login-visual" aria-hidden="true">
        <img :src="loginBackground" alt="" />
      </section>
      <section class="login-panel">
        <div class="login-panel__mobile-brand">
          <SystemLogo class="text-32px" />
          <span>{{ appStore.siteTitle }}</span>
        </div>
        <div class="login-panel__form">
          <NTabs
            v-if="showLoginMethods"
            :value="activeLoginMethod"
            type="line"
            animated
            class="login-method-tabs"
            @update:value="handleLoginMethodChange"
          >
            <NTab name="pwd-login">{{ $t('page.login.pwdLogin.title') }}</NTab>
            <NTab name="code-login">{{ $t('page.login.codeLogin.title') }}</NTab>
            <NTab name="email-login">{{ $t('page.login.emailLogin.title') }}</NTab>
          </NTabs>
          <Transition :name="themeStore.page.animateMode" mode="out-in" appear>
            <component :is="activeModule.component" />
          </Transition>
        </div>
      </section>
    </main>

    <footer v-if="appStore.siteCopyright || appStore.siteBeian" class="login-footer">
      <span>{{ appStore.siteCopyright }}</span>
      <span v-if="appStore.siteCopyright && appStore.siteBeian" class="mx-6px">·</span>
      <span>{{ appStore.siteBeian }}</span>
    </footer>
  </div>
</template>

<style scoped>
.login-page {
  position: relative;
  display: flex;
  min-height: 100%;
  align-items: center;
  justify-content: center;
  overflow: auto;
  --login-page-background: #f5f7fa;
  --login-surface: #fff;
  --login-text-primary: #1f2329;
  --login-text-secondary: #86909c;
  --login-control-background: #fff;
  --login-control-border: #d9dce3;
  --login-control-hover-border: #9aa4b2;
  --login-placeholder: #a7adb7;
  --login-shadow: 0 2px 12px rgb(0 0 0 / 8%);
  --login-orb-color: color-mix(in srgb, var(--n-primary-color, #3b83f6) 10%, transparent);
  --login-code-background: #c0c0c0;
  --login-visual-filter: none;
  color-scheme: light;
  background: var(--login-page-background);
}

.login-background,
.login-orb {
  position: fixed;
  pointer-events: none;
}

.login-background {
  inset: 0;
  overflow: hidden;
}

.login-orb {
  border-radius: 50%;
  background: var(--login-orb-color);
  animation: float 3s ease-in-out infinite;
}

.orb-one {
  top: 100px;
  left: 40px;
  width: 100px;
  height: 100px;
}

.orb-two {
  bottom: 5%;
  left: 15%;
  width: 150px;
  height: 150px;
  animation-delay: -1s;
}

.orb-three {
  top: 90px;
  right: 12%;
  width: 145px;
  height: 145px;
  animation-delay: -1.5s;
}

.orb-four {
  top: 60%;
  right: 5%;
  width: 160px;
  height: 160px;
  animation-delay: -0.5s;
}

.login-brand,
.login-tools,
.login-footer {
  position: fixed;
  z-index: 1;
}

.login-brand {
  top: 20px;
  left: 30px;
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--login-text-primary);
  font-size: 20px;
  font-weight: 500;
}

.login-tools {
  top: 20px;
  right: 30px;
  display: flex;
  gap: 16px;
  align-items: center;
  color: var(--login-text-primary);
}

.login-box {
  z-index: 1;
  display: grid;
  width: min(86%, 850px);
  min-height: 510px;
  grid-template-columns: 13fr 11fr;
  overflow: hidden;
  border-radius: 16px;
  background: var(--login-surface);
  box-shadow: var(--login-shadow);
}

.login-visual {
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  background: linear-gradient(60deg, var(--n-primary-color, #3b83f6), color-mix(in srgb, var(--n-primary-color, #3b83f6) 65%, white));
}

.login-visual img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  filter: var(--login-visual-filter);
}

.login-panel {
  display: flex;
  min-width: 0;
  background: var(--login-surface);
  color: var(--login-text-primary);
}

.login-panel__form {
  width: 100%;
  margin: auto;
  padding: 30px;
}

.login-method-tabs {
  margin-bottom: 24px;
}

.login-method-tabs :deep(.n-tabs-tab) {
  color: var(--login-text-secondary);
}

.login-method-tabs :deep(.n-tabs-tab--active) {
  color: var(--n-primary-color);
}

.login-panel__mobile-brand {
  display: none;
  color: var(--login-text-primary);
}

.login-page,
.login-box,
.login-panel,
.login-brand,
.login-tools,
.login-footer,
.login-visual img,
.login-page :deep(.n-input),
.login-page :deep(.n-button),
.login-page :deep(.n-checkbox) {
  transition: color 0.2s ease, background-color 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease, filter 0.2s ease;
}

.login-page :deep(.n-input) {
  --n-color: var(--login-control-background);
  --n-color-focus: var(--login-control-background);
  --n-text-color: var(--login-text-primary);
  --n-placeholder-color: var(--login-placeholder);
  --n-border: 1px solid var(--login-control-border);
  --n-border-hover: 1px solid var(--login-control-hover-border);
  --n-border-focus: 1px solid var(--n-primary-color);
  --n-box-shadow-focus: 0 0 0 2px color-mix(in srgb, var(--n-primary-color) 18%, transparent);
  box-sizing: border-box;
  background-color: var(--login-control-background) !important;
  border: 1px solid var(--login-control-border) !important;
  box-shadow: none !important;
}

.login-page :deep(.n-input:focus-within) {
  border-color: var(--n-primary-color) !important;
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--n-primary-color) 18%, transparent) !important;
}

.login-page :deep(.n-input__input-el),
.login-page :deep(.n-input__textarea-el) {
  color: var(--login-text-primary) !important;
}

.login-page :deep(.n-input__input-el::placeholder),
.login-page :deep(.n-input__textarea-el::placeholder) {
  color: var(--login-placeholder) !important;
}

.login-page :deep(.n-button:not(.n-button--primary-type)) {
  --n-color: var(--login-control-background);
  --n-color-hover: var(--login-control-background);
  --n-color-pressed: var(--login-control-background);
  --n-text-color: var(--login-text-primary);
  --n-text-color-hover: var(--n-primary-color);
  --n-border: 1px solid var(--login-control-border);
  --n-border-hover: 1px solid var(--n-primary-color);
  --n-border-pressed: 1px solid var(--n-primary-color);
}

.login-page :deep(.n-checkbox) {
  --n-text-color: var(--login-text-primary);
  --n-text-color-disabled: var(--login-text-secondary);
}

.login-page :deep(.n-checkbox-box) {
  border-color: var(--login-control-border) !important;
  background-color: var(--login-control-background) !important;
}

.login-tools :deep(.n-button) {
  --n-icon-color: var(--login-text-primary);
  --n-icon-color-hover: var(--n-primary-color);
  --n-icon-color-pressed: var(--n-primary-color);
  --n-color: transparent;
  --n-color-hover: color-mix(in srgb, var(--login-text-primary) 8%, transparent);
  --n-color-pressed: color-mix(in srgb, var(--login-text-primary) 12%, transparent);
  --n-border: 1px solid transparent;
}

.login-footer {
  bottom: 10px;
  color: var(--login-text-secondary);
  font-size: 12px;
}

@keyframes float {
  50% {
    transform: translateY(25px) scale(1.08);
  }
}

.login-page.dark {
  --login-page-background: #18181c;
  --login-surface: #1f1f24;
  --login-text-primary: #f3f3f5;
  --login-text-secondary: #a9aeb8;
  --login-control-background: #29292f;
  --login-control-border: #484852;
  --login-control-hover-border: #737381;
  --login-placeholder: #8d929d;
  --login-shadow: 0 2px 16px rgb(0 0 0 / 26%);
  --login-orb-color: color-mix(in srgb, var(--n-primary-color, #3b83f6) 16%, transparent);
  --login-code-background: #3a3a42;
  --login-visual-filter: brightness(0.82) saturate(0.9);
  color-scheme: dark;
}

@media (max-width: 570px) {
  .login-page {
    min-height: 100%;
    align-items: flex-start;
  }

  .login-brand,
  .login-visual,
  .login-footer {
    display: none;
  }

  .login-tools {
    top: 22px;
    right: 20px;
  }

  .login-box {
    display: block;
    width: 100%;
    min-height: 100%;
    padding-top: 88px;
    box-shadow: none;
  }

  .login-panel__mobile-brand {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 0 30px 28px;
    color: var(--login-text-primary);
    font-size: 20px;
    font-weight: 500;
  }

  .login-panel__form {
    padding: 0 30px 30px;
  }
}
</style>
