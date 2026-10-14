<script setup lang="ts">
import { useAppStore } from '@/store/modules/app';

defineOptions({
  name: 'GlobalFooter'
});

const appStore = useAppStore();
</script>

<template>
  <DarkModeContainer class="h-full flex-center flex-wrap gap-x-12px overflow-y-auto px-16px text-center text-12px">
    <span v-if="appStore.siteCopyright" class="max-w-full break-all">{{ appStore.siteCopyright }}</span>
    <a
      v-if="appStore.siteBeian"
      class="max-w-full break-all"
      href="https://beian.miit.gov.cn/"
      target="_blank"
      rel="noopener noreferrer"
    >
      {{ appStore.siteBeian }}
    </a>
  </DarkModeContainer>
</template>

<style scoped></style>
