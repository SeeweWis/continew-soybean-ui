<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { fetchGetFileStatistics } from '@/service/api/system/file';
import { useEcharts } from '@/hooks/common/echarts';
import { fileTypeLabel, formatFileSize } from './file-utils';

const stats = ref<Required<Api.System.ContinewFileStatistics>>({ size: 0, number: 0, data: [] });
const loading = ref(false);
const failed = ref(false);
const hidden = ref<number[]>([]);
const colors = ['#165DFF', '#36CFC9', '#F7BA1E', '#722ED1', '#00B42A', '#F53F3F', '#86909C', '#FF7D00'];
const items = computed(() =>
  stats.value.data.map((item, index) => ({
    ...item,
    label: fileTypeLabel(item.type),
    color: colors[index % colors.length]
  }))
);
const { domRef, updateOptions } = useEcharts(() => ({
  tooltip: {
    trigger: 'item' as const,
    formatter: (params: any) => {
      const item = items.value.find(value => value.label === params.name);
      return `类型：${item?.label || '未知类型'}<br/>数量：${item?.number || 0}<br/>占比：${params.percent}%<br/>容量：${formatFileSize(item?.size)}`;
    }
  },
  series: [
    {
      type: 'pie' as const,
      radius: ['42%', '68%'],
      label: { show: false },
      data: items.value
        .filter(item => !hidden.value.includes(item.type))
        .map(item => ({ name: item.label, value: item.number, itemStyle: { color: item.color } }))
    }
  ]
}));
watch([stats, hidden], () => updateOptions((_options, factory) => factory()), { deep: true });
function toggle(type: number) {
  if (hidden.value.includes(type)) hidden.value = hidden.value.filter(value => value !== type);
  else if (items.value.filter(item => !hidden.value.includes(item.type)).length > 1)
    hidden.value = [...hidden.value, type];
}
async function refresh() {
  loading.value = true;
  try {
    const { data, error } = await fetchGetFileStatistics();
    failed.value = Boolean(error) || !data;
    if (data && !error) {
      stats.value = { size: data.size ?? 0, number: data.number ?? 0, data: data.data ?? [] };
    }
  } finally {
    loading.value = false;
  }
}
onMounted(refresh);
defineExpose({ refresh });
</script>

<template>
  <section class="file-statistics">
    <NSpin :show="loading">
      <div class="statistics-total">
        <div>
          <span>存储量</span>
          <strong>{{ formatFileSize(stats.size) }}</strong>
        </div>
        <div>
          <span>数量</span>
          <strong>{{ stats.number }}</strong>
        </div>
      </div>
      <NButton v-if="failed" text type="primary" @click="refresh">统计加载失败，重试</NButton>
      <div v-show="stats.data.length" class="statistics-chart">
        <div ref="domRef" class="chart" />
        <div class="statistics-legend">
          <NButton
            v-for="item in items"
            :key="item.type"
            text
            size="tiny"
            :aria-pressed="!hidden.includes(item.type)"
            :title="`${item.label}：${item.number} 个，${formatFileSize(item.size)}`"
            :class="{ inactive: hidden.includes(item.type) }"
            @click="toggle(item.type)"
          >
            <i :style="{ background: item.color }" />
            {{ item.label }}
          </NButton>
        </div>
      </div>
    </NSpin>
  </section>
</template>

<style scoped>
.file-statistics {
  margin-top: 10px;
  padding: 20px;
  background: var(--fm-bg);
  border-radius: 4px;
}
.statistics-total {
  display: grid;
  grid-template-columns: 1.3fr 1fr;
  gap: 12px;
}
.statistics-total > div:last-child {
  border-left: 1px solid var(--fm-border);
  padding-left: 12px;
}
.statistics-total span {
  display: block;
  color: var(--fm-muted);
  font-size: 13px;
}
.statistics-total strong {
  display: block;
  font-size: 18px;
  font-weight: 400;
  color: var(--fm-primary);
  overflow-wrap: anywhere;
  margin-top: 6px;
}
.statistics-chart {
  border-top: 1px solid var(--fm-border);
  margin-top: 20px;
  padding-top: 12px;
}
.chart {
  height: 135px;
  width: 100%;
}
.statistics-legend {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}
.statistics-legend i {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
  margin-right: 5px;
}
.inactive {
  opacity: 0.35;
}
</style>
