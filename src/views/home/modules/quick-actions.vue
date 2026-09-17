<script setup lang="ts">
import type { RouteKey } from '@elegant-router/types';
import { useRouterPush } from '@/hooks/common/router';
import { $t } from '@/locales';

defineOptions({ name: 'QuickActions' });

const { routerPushByKey } = useRouterPush();

const actions: { key: RouteKey; label: string; icon: string }[] = [
  { key: 'system_user', label: $t('page.system.user.title'), icon: 'material-symbols:person-outline' },
  { key: 'system_role', label: $t('page.system.role.title'), icon: 'material-symbols:group-outline' },
  { key: 'system_menu', label: $t('page.system.menu.title'), icon: 'material-symbols:menu' },
  { key: 'system_file', label: '文件管理', icon: 'material-symbols:folder-outline' },
  { key: 'code_generator', label: '代码生成', icon: 'material-symbols:code' },
  { key: 'monitor_log', label: '系统日志', icon: 'material-symbols:history' }
];
</script>

<template>
  <NCard title="快捷操作" :bordered="false" size="small" class="card-wrapper">
    <div class="grid grid-cols-3 gap-y-20px">
      <button
        v-for="action in actions"
        :key="action.key"
        type="button"
        class="action-item flex-col-center gap-8px text-#666 transition-colors hover:text-primary dark:text-#aaa"
        @click="routerPushByKey(action.key)"
      >
        <SvgIcon :icon="action.icon" class="text-22px" />
        <span class="text-13px">{{ action.label }}</span>
      </button>
    </div>
  </NCard>
</template>

<style scoped>
.action-item {
  background: transparent;
  border: 0;
  cursor: pointer;
}

.action-item:active {
  transform: scale(0.98);
}
</style>
