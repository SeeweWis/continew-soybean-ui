<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { jsonClone } from '@sa/utils';
import { fetchGetRoleList, fetchBatchDeleteRole } from '@/service/api/system';
import { useAuth } from '@/hooks/business/auth';
import ButtonIcon from '@/components/custom/button-icon.vue';
import RoleOperateDrawer from './role-operate-drawer.vue';
import RoleDataScopeDrawer from './role-data-scope-drawer.vue';

defineOptions({
  name: 'RoleTreePanel'
});

interface Emits {
  (e: 'select', role: Api.System.ContinewRole | null): void;
}

const emit = defineEmits<Emits>();

const { hasAuth } = useAuth();

const roles = ref<Api.System.ContinewRole[]>([]);
const loading = ref(false);
const searchKey = ref('');
const selectedId = ref<CommonType.IdType | null>(null);

const filteredRoles = computed(() => {
  const keyword = searchKey.value.trim().toLowerCase();
  if (!keyword) return roles.value;
  return roles.value.filter(
    role => role.name.toLowerCase().includes(keyword) || role.code.toLowerCase().includes(keyword)
  );
});

async function getRoles() {
  loading.value = true;
  const { data, error } = await fetchGetRoleList();
  loading.value = false;
  if (error) return;
  roles.value = data ?? [];
  // 默认选中第一个角色（保持既有选中优先）
  if (!roles.value.some(role => role.id === selectedId.value)) {
    handleSelect(roles.value[0] ?? null);
  }
}

function handleSelect(role: Api.System.ContinewRole | null) {
  selectedId.value = role?.id ?? null;
  emit('select', role ? jsonClone(role) : null);
}

const operateDrawerVisible = ref(false);
const operateType = ref<NaiveUI.TableOperateType>('add');
const editingRole = ref<Api.System.ContinewRole | null>(null);

function handleAdd() {
  operateType.value = 'add';
  editingRole.value = null;
  operateDrawerVisible.value = true;
}

function handleEdit(role: Api.System.ContinewRole) {
  operateType.value = 'edit';
  editingRole.value = jsonClone(role);
  operateDrawerVisible.value = true;
}

const dataScopeDrawerVisible = ref(false);
const dataScopeRole = ref<Api.System.ContinewRole | null>(null);

function handleDataScope(role: Api.System.ContinewRole) {
  dataScopeRole.value = jsonClone(role);
  dataScopeDrawerVisible.value = true;
}

async function handleDelete(role: Api.System.ContinewRole) {
  window.$dialog?.warning({
    title: '删除角色',
    content: `是否确定删除角色「${role.name}」？`,
    positiveText: '确定',
    negativeText: '取消',
    onPositiveClick: async () => {
      const { error } = await fetchBatchDeleteRole([role.id]);
      if (error) return;
      window.$message?.success('删除成功');
      await getRoles();
    }
  });
}

function handleSubmitted() {
  getRoles();
}

onMounted(() => {
  getRoles();
});
</script>

<template>
  <div class="flex-col-stretch gap-12px">
    <div class="flex items-center gap-8px">
      <NInput v-model:value="searchKey" size="small" placeholder="搜索名称/编码" clearable>
        <template #prefix>
          <icon-ic-round-search class="text-icon" />
        </template>
      </NInput>
      <NButton v-if="hasAuth('system:role:create')" type="primary" size="small" @click="handleAdd">
        <template #icon>
          <icon-ic-round-plus class="text-icon" />
        </template>
      </NButton>
    </div>
    <NSpin :show="loading" class="flex-1-hidden">
      <div class="flex flex-col gap-4px">
        <div
          v-for="role in filteredRoles"
          :key="role.id"
          class="group flex items-center justify-between gap-4px rounded-6px px-8px py-8px"
          :class="role.id === selectedId ? 'bg-primary bg-opacity-10' : 'hover:bg-gray-100 dark:hover:bg-#333'"
          @click="handleSelect(role)"
        >
          <div class="min-w-0 flex-1">
            <div class="truncate text-14px" :class="role.id === selectedId ? 'font-medium text-primary' : ''">
              {{ role.name }}
            </div>
            <div class="truncate text-12px text-gray-400">{{ role.code }}</div>
          </div>
          <div class="hidden items-center gap-2px group-hover:flex">
            <ButtonIcon
              v-if="hasAuth('system:role:update') && !role.isSystem"
              text
              size="tiny"
              type="primary"
              icon="material-symbols:drive-file-rename-outline-outline"
              tooltip-content="编辑"
              @click.stop="handleEdit(role)"
            />
            <ButtonIcon
              v-if="hasAuth('system:role:update') && !role.isSystem"
              text
              size="tiny"
              type="primary"
              icon="material-symbols:database"
              tooltip-content="数据权限"
              @click.stop="handleDataScope(role)"
            />
            <ButtonIcon
              v-if="hasAuth('system:role:delete') && !role.isSystem"
              text
              size="tiny"
              type="error"
              icon="material-symbols:delete-outline"
              tooltip-content="删除"
              @click.stop="handleDelete(role)"
            />
          </div>
        </div>
        <NEmpty v-if="!filteredRoles.length && !loading" description="暂无匹配角色" class="py-24px" />
      </div>
    </NSpin>
    <RoleOperateDrawer
      v-model:visible="operateDrawerVisible"
      :operate-type="operateType"
      :row-data="editingRole"
      @submitted="handleSubmitted"
    />
    <RoleDataScopeDrawer
      v-model:visible="dataScopeDrawerVisible"
      :row-data="dataScopeRole"
      @submitted="handleSubmitted"
    />
  </div>
</template>

<style scoped></style>
