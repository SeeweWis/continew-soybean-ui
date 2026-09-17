<script setup lang="ts">
import { ref, watch } from 'vue';
import type { TreeOption } from 'naive-ui';
import { useLoading } from '@sa/hooks';
import { fetchGetRoleDetail, fetchGetRolePermissionTree, fetchUpdateRolePermission } from '@/service/api/system';
import { $t } from '@/locales';

defineOptions({
  name: 'RolePermissionDrawer'
});

interface Props {
  /** the edit row data */
  rowData?: Api.System.ContinewRole | null;
}

const props = defineProps<Props>();

interface Emits {
  (e: 'submitted'): void;
}

const emit = defineEmits<Emits>();

const visible = defineModel<boolean>('visible', {
  default: false
});

const { loading, startLoading, endLoading } = useLoading();

const treeData = ref<Api.System.ContinewRolePermission[]>([]);
const checkedIds = ref<CommonType.IdType[]>([]);
const menuCheckStrictly = ref(true);

async function getDetail() {
  if (!props.rowData) return;
  startLoading();
  const { data: tree, error } = await fetchGetRolePermissionTree();
  if (!error) {
    treeData.value = tree;
  }
  const { data: detail, error: detailError } = await fetchGetRoleDetail(props.rowData.id);
  if (!detailError) {
    checkedIds.value = detail.menuIds ?? [];
    menuCheckStrictly.value = detail.menuCheckStrictly ?? true;
  }
  endLoading();
}

function closeDrawer() {
  visible.value = false;
}

async function handleSubmit() {
  const { error } = await fetchUpdateRolePermission(props.rowData!.id, {
    menuIds: checkedIds.value,
    menuCheckStrictly: menuCheckStrictly.value
  });
  if (error) return;

  window.$message?.success($t('common.updateSuccess'));
  closeDrawer();
  emit('submitted');
}

watch(visible, val => {
  if (val) {
    getDetail();
  }
});
</script>

<template>
  <NDrawer v-model:show="visible" display-directive="show" :width="480" class="max-w-90%">
    <NDrawerContent title="功能权限" :native-scrollbar="false" closable>
      <NSpin :show="loading">
        <NFormItem label="父子节点关联">
          <NSwitch v-model:value="menuCheckStrictly" />
        </NFormItem>
        <NTree
          v-model:checked-keys="checkedIds"
          block-line
          checkable
          cascade
          :data="treeData as unknown as TreeOption[]"
          key-field="id"
          label-field="title"
          children-field="children"
          default-expand-all
          virtual-scroll
          style="max-height: 480px"
        />
      </NSpin>
      <template #footer>
        <NSpace :size="16">
          <NButton @click="closeDrawer">{{ $t('common.cancel') }}</NButton>
          <NButton type="primary" :loading="loading" @click="handleSubmit">{{ $t('common.save') }}</NButton>
        </NSpace>
      </template>
    </NDrawerContent>
  </NDrawer>
</template>

<style scoped></style>
