<script setup lang="ts">
import OptionForm from '../modules/option-form.vue';

defineOptions({
  name: 'LoginConfig'
});
</script>

<template>
  <NCard :bordered="false" class="card-wrapper" size="small" title="登录配置">
    <OptionForm category="LOGIN" />
  </NCard>
</template>

<style scoped></style>
