<script setup lang="ts">
import { onMounted } from 'vue';
import { useRouterPush } from '@/hooks/common/router';

defineOptions({
  name: 'DictItem'
});

const { routerPush } = useRouterPush();

// 字典项管理由 /system/dict 页面（左侧字典列表 + 右侧字典项表格）承载，
// 该隐藏菜单路由指向同一功能，进入后跳转主页面。
onMounted(() => {
  routerPush('system_dict');
});
</script>

<template>
  <div />
</template>

<style scoped></style>
