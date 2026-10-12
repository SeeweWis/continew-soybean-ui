<script setup lang="ts">
import { useAppStore } from '@/store/modules/app';

defineOptions({
  name: 'GlobalLogo'
});

interface Props {
  /** Whether to show the title */
  showTitle?: boolean;
}

withDefaults(defineProps<Props>(), {
  showTitle: true
});

const appStore = useAppStore();
</script>

<template>
  <RouterLink to="/" class="w-full flex-center nowrap-hidden">
    <SystemLogo class="fill-primary text-30px" />
    <h2 v-show="showTitle" class="pl-12px text-16px text-primary font-bold transition duration-300 ease-in-out">
      {{ appStore.siteTitle }}
    </h2>
  </RouterLink>
</template>

<style scoped></style>
