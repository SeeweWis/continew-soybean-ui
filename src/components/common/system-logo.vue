<script lang="ts" setup>
import { useAppStore } from '@/store/modules/app';
import defaultLogo from '@/assets/svg-icon/logo.svg';

defineOptions({ name: 'SystemLogo' });

const appStore = useAppStore();
</script>

<template>
  <img :src="appStore.siteLogo || defaultLogo" alt="系统 Logo" class="site-logo" />
</template>

<style scoped>
.site-logo {
  width: 1em;
  height: 1em;
  object-fit: contain;
}
</style>
