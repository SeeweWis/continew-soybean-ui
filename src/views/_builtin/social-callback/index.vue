<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import { getRgb } from '@sa/color';
import { DARK_CLASS } from '@/constants/app';
import { useAuthStore } from '@/store/modules/auth';
import { useRouterPush } from '@/hooks/common/router';
import { localStg } from '@/utils/storage';
import { toggleHtmlClass } from '@/utils/common';

const route = useRoute();
const authStore = useAuthStore();
const { routerPushByKey } = useRouterPush();

/**
 * 接收Route传递的参数
 *
 * @param {Object} route.query.
 */
const code = route.query.code as string;
const state = route.query.state as string;
const source = route.query.source as string;
const msg = ref('正在登录，请稍后......');

const processResponse = async () => {
  window.$message?.success('登录成功');
  msg.value = '登录成功，2s 后即将跳转至首页';
  setTimeout(() => {
    msg.value = '登录成功，1s 后即将跳转至首页';
  }, 1000);
  setTimeout(() => {
    routerPushByKey(import.meta.env.VITE_ROUTE_HOME || 'workbench_home');
  }, 1000);
};

const handleError = () => {
  msg.value = '登录失败，2s 后即将跳转至登录页';
  setTimeout(() => {
    msg.value = '登录失败，1s 后即将跳转至登录页';
  }, 1000);
  setTimeout(() => {
    routerPushByKey('login');
  }, 1000);
};

const loginByCode = async (data: Api.Auth.SocialLoginForm) => {
  try {
    await authStore.logout();
    await authStore.login(data);
    await processResponse();
  } catch {
    handleError();
  }
};

const init = async () => {
  const data: Api.Auth.SocialLoginForm = {
    clientId: '',
    authType: 'SOCIAL',
    code,
    state,
    source
  };

  if (!authStore.isLogin) {
    await loginByCode(data);
  } else {
    handleError();
  }
};

onMounted(async () => {
  await init();
});

const themeColor = localStg.get('themeColor') || '#2080f0';
const darkMode = localStg.get('darkMode') || false;
const { r, g, b } = getRgb(themeColor);

if (darkMode) {
  toggleHtmlClass(DARK_CLASS).add();
}

const primaryColor = `--primary-color: ${r} ${g} ${b}`;
</script>

<template>
  <div class="fixed-center flex-col bg-layout" :style="primaryColor">
    <div class="my-52px h-120px w-120px">
      <!-- From Uiverse.io by SchawnnahJ -->
      <div class="loader"></div>
    </div>
    <h2 class="text-30px text-primary-400 font-500">{{ msg }}</h2>
  </div>
</template>

<style lang="scss" scoped>
@use '@/styles/scss/loading.scss';
</style>
