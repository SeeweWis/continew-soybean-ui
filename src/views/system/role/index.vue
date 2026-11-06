<script setup lang="ts">
import { ref } from 'vue';
import RoleTreePanel from './modules/role-tree-panel.vue';
import RolePermissionTable from './modules/role-permission-table.vue';
import RoleUserPanel from './modules/role-user-panel.vue';

defineOptions({
  name: 'RoleList'
});

type RoleTabKey = 'permission' | 'user';

const activeTab = ref<RoleTabKey>('permission');
const selectedRole = ref<Api.System.ContinewRole | null>(null);

function handleRoleSelect(role: Api.System.ContinewRole | null) {
  selectedRole.value = role;
}
</script>

<template>
  <div class="flex flex-col gap-16px overflow-hidden lt-sm:overflow-auto sm:flex-row sm:items-stretch">
    <NCard :bordered="false" size="small" class="card-wrapper w-full sm:w-280px sm:flex-none">
      <RoleTreePanel @select="handleRoleSelect" />
    </NCard>
    <NCard :bordered="false" size="small" class="card-wrapper min-w-0 flex-1 sm:h-full" content-class="h-full">
      <NTabs
        v-model:value="activeTab"
        type="line"
        size="large"
        class="h-full"
        :pane-wrapper-style="{ flex: 1, minHeight: 0 }"
        :pane-style="{ height: '100%' }"
      >
        <NTabPane name="permission" tab="功能权限">
          <RolePermissionTable :role="selectedRole" />
        </NTabPane>
        <NTabPane name="user" tab="角色用户">
          <RoleUserPanel :role="selectedRole" />
        </NTabPane>
      </NTabs>
    </NCard>
  </div>
</template>

<style scoped></style>
