<script setup lang="ts">
import { onMounted } from 'vue';
import { useRouter } from 'vue-router';

defineOptions({ name: 'ApprovalStart' });

const router = useRouter();

onMounted(() => {
  void router.replace('/approval/application');
});
</script>

<template>
  <NSpin class="h-full" show>
    <template #description>正在打开我的申请</template>
  </NSpin>
</template>
