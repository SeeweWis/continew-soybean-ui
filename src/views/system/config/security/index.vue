<script setup lang="ts">
import OptionForm from '../modules/option-form.vue';

defineOptions({
  name: 'SecurityConfig'
});
</script>

<template>
  <NCard :bordered="false" class="card-wrapper" size="small" title="安全配置">
    <OptionForm category="PASSWORD" />
  </NCard>
</template>

<style scoped></style>
