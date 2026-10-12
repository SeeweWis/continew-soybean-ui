<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import { useLoading } from '@sa/hooks';
import {
  fetchCreateTenantPackage,
  fetchGetTenantPackageMenuTree,
  fetchUpdateTenantPackage
} from '@/service/api/system';
import { useNaiveForm } from '@/hooks/common/form';
import MenuTree from '@/components/custom/menu-tree.vue';
import { $t } from '@/locales';

defineOptions({
  name: 'TenantPackageOperateDrawer'
});

interface Props {
  /** the type of operation */
  operateType: 'add' | 'edit';
  /** the edit package data */
  packageData?: Api.System.ContinewTenantPackage | null;
}

const props = defineProps<Props>();

interface Emits {
  (e: 'submitted'): void;
}

const emit = defineEmits<Emits>();

const visible = defineModel<boolean>('visible', {
  default: false
});

const { formRef, validate, restoreValidation } = useNaiveForm();
const { loading, startLoading, endLoading } = useLoading();
const { loading: treeLoading, startLoading: startTreeLoading, endLoading: endTreeLoading } = useLoading();

const menuTreeRef = ref<InstanceType<typeof MenuTree> | null>(null);
const menuTreeData = ref<Api.System.ContinewMenu[]>([]);
const checkedMenuIds = ref<CommonType.IdType[]>([]);
const menuCheckStrictly = ref(true);

const title = computed(() => (props.operateType === 'add' ? '新增套餐' : '编辑套餐'));

const model = reactive(createDefaultModel());

function createDefaultModel() {
  return {
    name: '',
    sort: 999,
    description: null as string | null,
    status: 1 as 1 | 2
  };
}

const rules = {
  name: [{ required: true, message: '请输入套餐名称' }]
};

async function getMenuTree() {
  startTreeLoading();
  const { data, error } = await fetchGetTenantPackageMenuTree();
  if (!error) {
    menuTreeData.value = data;
    checkedMenuIds.value = props.packageData?.menuIds ?? [];
  }
  endTreeLoading();
}

function closeDrawer() {
  visible.value = false;
}

async function handleSubmit() {
  await validate();

  const menuIds = menuTreeRef.value?.getCheckedMenuIds() ?? checkedMenuIds.value;

  const data: Api.System.ContinewTenantPackageReq = {
    name: model.name,
    sort: model.sort ?? undefined,
    description: model.description ?? undefined,
    status: model.status,
    menuIds,
    menuCheckStrictly: menuCheckStrictly.value
  };

  startLoading();
  if (props.operateType === 'add') {
    const { error } = await fetchCreateTenantPackage(data);
    endLoading();
    if (error) return;
    window.$message?.success($t('common.addSuccess'));
  } else {
    const { error } = await fetchUpdateTenantPackage(props.packageData!.id, data);
    endLoading();
    if (error) return;
    window.$message?.success($t('common.updateSuccess'));
  }

  closeDrawer();
  emit('submitted');
}

watch(visible, val => {
  if (val) {
    Object.assign(model, createDefaultModel(), props.packageData ?? {});
    menuCheckStrictly.value = props.packageData?.menuCheckStrictly ?? true;
    getMenuTree();
    restoreValidation();
  }
});
</script>

<template>
  <NDrawer v-model:show="visible" display-directive="show" :width="560" class="max-w-90%">
    <NDrawerContent :title="title" :native-scrollbar="false" closable>
      <NForm ref="formRef" :model="model" :rules="rules" label-placement="left" :label-width="90">
        <NFormItem label="套餐名称" path="name">
          <NInput v-model:value="model.name" placeholder="请输入套餐名称" />
        </NFormItem>
        <NFormItem label="排序" path="sort">
          <NInputNumber v-model:value="model.sort" class="w-full" />
        </NFormItem>
        <NFormItem label="状态" path="status">
          <DictSelect v-model:value="model.status" dict-code="dis_enable_status_enum" />
        </NFormItem>
        <NFormItem label="描述" path="description">
          <NInput v-model:value="model.description" type="textarea" placeholder="请输入描述" />
        </NFormItem>
        <NFormItem label="关联菜单">
          <MenuTree
            ref="menuTreeRef"
            v-model:checked-keys="checkedMenuIds"
            v-model:options="menuTreeData"
            v-model:cascade="menuCheckStrictly"
            v-model:loading="treeLoading"
          />
        </NFormItem>
      </NForm>
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
