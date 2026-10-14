<script setup lang="ts">
import { useEcharts } from '@/hooks/common/echarts';
import type { ECOption } from '@/hooks/common/echarts';

defineOptions({ name: 'WorkbenchCharts' });

const { domRef: barRef } = useEcharts(
  (): ECOption => ({
    color: ['#18a058', '#4098fc'],
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    legend: { top: 0 },
    grid: { left: 12, right: 16, top: 48, bottom: 12, containLabel: true },
    xAxis: { type: 'category', data: ['1月', '2月', '3月', '4月', '5月', '6月'] },
    yAxis: { type: 'value', name: '文件数' },
    series: [
      { name: '图片', type: 'bar', barMaxWidth: 24, data: [120, 168, 145, 210, 186, 248] },
      { name: '文档', type: 'bar', barMaxWidth: 24, data: [86, 112, 98, 156, 132, 180] }
    ]
  })
);

const { domRef: lineRef } = useEcharts(
  (): ECOption => ({
    color: ['#4098fc', '#e6a23c'],
    tooltip: { trigger: 'axis' },
    legend: { top: 0 },
    grid: { left: 12, right: 16, top: 48, bottom: 12, containLabel: true },
    xAxis: { type: 'category', boundaryGap: false, data: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'] },
    yAxis: { type: 'value', name: '访问量' },
    series: [
      { name: '本周', type: 'line', smooth: true, symbolSize: 7, data: [820, 932, 901, 1134, 1290, 1080, 1420] },
      { name: '上周', type: 'line', smooth: true, symbolSize: 7, data: [680, 780, 740, 920, 1060, 890, 1180] }
    ]
  })
);

const { domRef: pieRef } = useEcharts(
  (): ECOption => ({
    color: ['#18a058', '#4098fc', '#e6a23c', '#d03050', '#8a6ad8'],
    tooltip: { trigger: 'item', formatter: '{b}<br/>{c} 个（{d}%）' },
    legend: { bottom: 0, left: 'center' },
    series: [
      {
        name: '文件类型',
        type: 'pie',
        radius: ['38%', '65%'],
        center: ['50%', '44%'],
        label: { show: false },
        emphasis: { label: { show: true, fontSize: 14 } },
        data: [
          { name: '图片', value: 420 },
          { name: '文档', value: 280 },
          { name: '视频', value: 150 },
          { name: '音频', value: 90 },
          { name: '其他', value: 60 }
        ]
      }
    ]
  })
);

const activity = [
  [12, 18, 36, 24, 48, 56, 42, 20],
  [16, 28, 44, 32, 58, 72, 50, 26],
  [10, 22, 38, 28, 64, 80, 62, 30],
  [20, 32, 52, 40, 70, 92, 76, 38],
  [24, 40, 60, 48, 82, 100, 88, 46],
  [8, 14, 22, 30, 44, 52, 40, 18],
  [6, 12, 18, 24, 36, 42, 32, 14]
];

const { domRef: heatmapRef } = useEcharts(
  (): ECOption => ({
    tooltip: {
      position: 'top',
      formatter: params => {
        const [hour, day, value] = (Array.isArray(params) ? params[0] : params).value as number[];
        return `${['周一', '周二', '周三', '周四', '周五', '周六', '周日'][day]} ${8 + hour * 2}:00<br/>活跃次数：${value}`;
      }
    },
    grid: { left: 12, right: 16, top: 16, bottom: 60, containLabel: true },
    xAxis: { type: 'category', data: ['08', '10', '12', '14', '16', '18', '20', '22'], splitArea: { show: true } },
    yAxis: {
      type: 'category',
      data: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'],
      splitArea: { show: true }
    },
    visualMap: {
      min: 0,
      max: 100,
      calculable: true,
      orient: 'horizontal',
      left: 'center',
      bottom: 0,
      itemWidth: 12,
      itemHeight: 140,
      inRange: { color: ['#e7f5ed', '#8bd3ad', '#18a058', '#086f3e'] }
    },
    series: [
      {
        name: '活跃次数',
        type: 'heatmap',
        data: activity.flatMap((hours, day) => hours.map((value, hour) => [hour, day, value])),
        label: { show: true, fontSize: 11 },
        emphasis: { itemStyle: { borderColor: '#333', borderWidth: 1 } }
      }
    ]
  })
);
</script>

<template>
  <NGrid :x-gap="16" :y-gap="16" responsive="screen" item-responsive>
    <NGi span="24 m:12">
      <NCard title="月度上传量 · 柱状图" :bordered="false" size="small" class="card-wrapper">
        <div ref="barRef" class="chart-example" role="img" aria-label="1月至6月图片和文档上传数量的柱状图"></div>
      </NCard>
    </NGi>
    <NGi span="24 m:12">
      <NCard title="每周访问量 · 折线图" :bordered="false" size="small" class="card-wrapper">
        <div ref="lineRef" class="chart-example" role="img" aria-label="本周与上周每日访问量的折线图"></div>
      </NCard>
    </NGi>
    <NGi span="24 m:12">
      <NCard title="文件类型分布 · 饼图" :bordered="false" size="small" class="card-wrapper">
        <div
          ref="pieRef"
          class="chart-example"
          role="img"
          aria-label="图片、文档、视频、音频和其他文件数量占比的饼图"
        ></div>
      </NCard>
    </NGi>
    <NGi span="24 m:12">
      <NCard title="每周活跃时段 · 热力图" :bordered="false" size="small" class="card-wrapper">
        <div ref="heatmapRef" class="chart-example" role="img" aria-label="每周各天8点至22点活跃次数的热力图"></div>
      </NCard>
    </NGi>
  </NGrid>
</template>

<style scoped>
.chart-example {
  height: 320px;
  width: 100%;
  min-width: 0;
  overflow: hidden;
}
</style>
