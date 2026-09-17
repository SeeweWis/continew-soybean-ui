<script setup lang="ts">
defineOptions({
  name: 'ScheduleLog'
});
</script>

<template>
  <div class="min-h-500px">
    <NAlert title="任务日志" type="info" class="mb-16px">
      调度任务执行日志由 Snail Job 记录，请在 Snail Job 控制台查看详情。
    </NAlert>
    <NCard :bordered="false" size="small" class="card-wrapper">
      <NEmpty description="请前往 Snail Job 控制台查看任务日志" class="min-h-300px justify-center" />
    </NCard>
  </div>
</template>

<style scoped></style>
