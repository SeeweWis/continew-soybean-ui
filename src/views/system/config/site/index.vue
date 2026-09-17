<script setup lang="ts">
import OptionForm from '../modules/option-form.vue';

defineOptions({
  name: 'SiteConfig'
});
</script>

<template>
  <NCard :bordered="false" class="card-wrapper" size="small" title="网站配置">
    <OptionForm category="SITE" />
  </NCard>
</template>

<style scoped></style>
