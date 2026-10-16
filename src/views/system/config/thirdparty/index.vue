<script setup lang="ts">
import OptionForm from '../modules/option-form.vue';

defineOptions({
  name: 'ThirdPartyConfig'
});
</script>

<template>
  <div class="third-party-grid">
    <section class="min-w-0">
      <h3 class="mb-16px mt-0 text-16px font-medium">阿里云 OCR</h3>
      <OptionForm category="THIRD_PARTY" prefix="ALIYUN_OCR_" />
    </section>
    <section class="min-w-0">
      <h3 class="mb-16px mt-0 text-16px font-medium">微信支付 V3</h3>
      <OptionForm category="THIRD_PARTY" prefix="WECHAT_PAY_" />
    </section>
  </div>
</template>

<style scoped>
.third-party-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  align-items: start;
  gap: 16px;
}

@media (max-width: 1024px) {
  .third-party-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
