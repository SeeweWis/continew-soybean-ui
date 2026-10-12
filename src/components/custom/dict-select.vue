<script setup lang="ts">
import { useDict } from '@/hooks/business/dict';

defineOptions({
  name: 'DictSelect',
  inheritAttrs: false
});

interface Props {
  dictCode: string;
  immediate?: boolean;
  multiple?: boolean;
  [key: string]: any;
}

const props = withDefaults(defineProps<Props>(), {
  immediate: false,
  multiple: false
});

const value = defineModel<string | number | Array<string | number> | null>('value', { required: false });

const { options, loading, loadError, getData } = useDict(() => props.dictCode, props.immediate);
</script>

<template>
  <NSelect
    v-model:value="value"
    :multiple="multiple"
    :loading="loading"
    :options="options"
    :clear-filter-after-select="false"
    v-bind="$attrs"
  >
    <template #empty>
      <NSpace vertical align="center">
        <NEmpty :description="loadError ? '选项加载失败' : '暂无选项'" />
        <NButton v-if="loadError" size="small" :loading="loading" @click="getData">
          <template #icon>
            <SvgIcon icon="ic:round-refresh" />
          </template>
          重试
        </NButton>
      </NSpace>
    </template>
  </NSelect>
</template>

<style scoped></style>
