<script setup lang="ts">
import OptionForm from '../modules/option-form.vue';

defineOptions({
  name: 'MailConfig'
});
</script>

<template>
  <NCard :bordered="false" class="card-wrapper" size="small" title="邮件配置">
    <OptionForm category="MAIL" />
  </NCard>
</template>

<style scoped></style>
