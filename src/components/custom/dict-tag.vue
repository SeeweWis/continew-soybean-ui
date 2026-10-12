<script setup lang="ts">
import { computed } from 'vue';
import { useDict } from '@/hooks/business/dict';
import { isNotNull } from '@/utils/common';

defineOptions({
  name: 'DictTag',
  inheritAttrs: false
});

interface Props {
  value?: string[] | number[] | string | number;
  dictCode?: string;
  immediate?: boolean;
  dictData?: Api.System.LabelValue;
  [key: string]: any;
}

const props = withDefaults(defineProps<Props>(), {
  immediate: false,
  dictData: undefined,
  dictCode: '',
  value: () => []
});

const TAG_TYPES = ['default', 'primary', 'info', 'success', 'warning', 'error'] as const;

const { transformDictData } = useDict(() => props.dictCode, props.immediate);

const dictTagData = computed<Api.System.LabelValue[]>(() => {
  if (props.dictData) {
    return [props.dictData];
  }
  // 避免 props.value 为 0 时，无法触发
  if (props.dictCode && isNotNull(props.value)) {
    return transformDictData(props.value) || [];
  }

  return [];
});

function getTagType(extra?: string | number) {
  const type = String(extra);
  return (TAG_TYPES as readonly string[]).includes(type) ? (type as (typeof TAG_TYPES)[number]) : 'default';
}
</script>

<template>
  <div v-if="dictTagData.length">
    <NTag
      v-for="item in dictTagData"
      :key="String(item.value)"
      class="m-1"
      v-bind="$attrs"
      :type="getTagType(item.extra)"
    >
      {{ item.label }}
    </NTag>
  </div>
</template>

<style scoped></style>
