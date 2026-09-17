<script setup lang="ts">
import { useRouterPush } from '@/hooks/common/router';

defineOptions({ name: 'ProjectList' });

const { routerPushByKey } = useRouterPush();

const projects = [
  { name: 'ContiNew Admin', description: '持续迭代优化的前后端分离中后台管理系统框架。', route: 'about' },
  { name: 'ContiNew Starter', description: '包含 MyBatis-Plus、Sa-Token 等企业级基础能力。', route: 'about' },
  { name: 'ContiNew Admin UI', description: '基于现代前端模板的 ContiNew Admin 前端适配项目。', route: 'about' },
  { name: 'ContiNew Admin UI Arco', description: '基于 Arco Design Pro 的前端适配项目。', route: 'about' },
  { name: 'ContiNew Cloud', description: 'ContiNew Admin 的微服务版本。', route: 'about' },
  { name: '项目文档', description: '查看项目简介、快速开始和常见问题。', route: 'about' }
] as const;
</script>

<template>
  <NCard title="我的项目" :bordered="false" size="small" class="card-wrapper">
    <template #header-extra>
      <a class="text-primary" href="javascript:;">更多</a>
    </template>
    <div class="grid grid-cols-1 gap-16px xl:grid-cols-3">
      <button
        v-for="project in projects"
        :key="project.name"
        type="button"
        class="project-card text-left transition-colors hover:border-primary"
        @click="routerPushByKey(project.route)"
      >
        <div class="flex items-center gap-8px">
          <SystemLogo class="text-24px" />
          <span class="text-16px font-medium">{{ project.name }}</span>
        </div>
        <p class="mt-12px line-clamp-2 text-13px text-#777 dark:text-#aaa">{{ project.description }}</p>
        <div class="mt-16px flex justify-end text-primary">
          <SvgIcon icon="material-symbols:thumb-up-outline" class="text-18px" />
        </div>
      </button>
    </div>
  </NCard>
</template>

<style scoped>
.project-card {
  min-height: 138px;
  padding: 16px;
  border: 1px solid var(--n-border-color);
  border-radius: 4px;
  background: transparent;
}

.project-card:active {
  transform: scale(0.99);
}
</style>
