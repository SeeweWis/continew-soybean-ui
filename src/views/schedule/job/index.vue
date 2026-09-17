<script setup lang="ts">
defineOptions({
  name: 'ScheduleJob'
});
</script>

<template>
  <div class="min-h-500px">
    <NAlert title="任务调度" type="info" class="mb-16px">
      任务调度基于 Snail Job 实现，任务的创建、执行与状态管理请在 Snail Job 控制台操作。
    </NAlert>
    <NCard :bordered="false" size="small" class="card-wrapper">
      <NEmpty description="请前往 Snail Job 控制台管理调度任务" class="min-h-300px justify-center" />
    </NCard>
  </div>
</template>

<style scoped></style>
