<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { jsonClone } from '@sa/utils';
import { fetchCreateMenu, fetchUpdateMenu } from '@/service/api/system';
import { useNaiveForm } from '@/hooks/common/form';
import { $t } from '@/locales';

defineOptions({
  name: 'MenuOperateDrawer'
});

interface Props {
  /** the type of operation */
  operateType: NaiveUI.TableOperateType;
  /** the edit row data（add 时若存在则表示为其新增下级） */
  rowData?: Api.System.ContinewMenu | null;
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

const title = computed(() => {
  const titles: Record<NaiveUI.TableOperateType, string> = {
    add: '新增菜单',
    edit: '编辑菜单'
  };
  return titles[props.operateType];
});

type Model = {
  parentId: CommonType.IdType | null;
  type: 1 | 2 | 3;
  title: string;
  path: string | null;
  name: string | null;
  component: string | null;
  redirect: string | null;
  permission: string | null;
  icon: string | null;
  sort: number | null;
  isExternal: boolean;
  isCache: boolean;
  isHidden: boolean;
  status: number;
};

const model = ref<Model>(createDefaultModel());

function createDefaultModel(): Model {
  return {
    parentId: 0,
    type: 2,
    title: '',
    path: null,
    name: null,
    component: null,
    redirect: null,
    permission: null,
    icon: null,
    sort: 999,
    isExternal: false,
    isCache: true,
    isHidden: false,
    status: 1
  };
}

type RuleKey = Extract<keyof Model, 'title' | 'path'>;

const rules: Record<RuleKey, App.Global.FormRule[]> = {
  title: [{ required: true, message: '请输入菜单名称' }],
  path: [{ required: true, message: '请输入路由地址' }]
};

function handleUpdateModelWhenEdit() {
  if (props.operateType === 'add') {
    model.value = createDefaultModel();
    // 指定上级菜单的新增下级
    if (props.rowData) {
      model.value.parentId = props.rowData.id;
      model.value.type = props.rowData.type === 1 ? 2 : 3;
    }
    return;
  }

  if (props.operateType === 'edit' && props.rowData) {
    Object.assign(model.value, jsonClone(props.rowData));
  }
}

function closeDrawer() {
  visible.value = false;
}

async function handleSubmit() {
  await validate();

  const data: Api.System.ContinewMenuReq = {
    parentId: model.value.parentId ?? 0,
    type: model.value.type,
    title: model.value.title,
    path: model.value.path ?? undefined,
    name: model.value.name ?? undefined,
    component: model.value.component ?? undefined,
    redirect: model.value.redirect ?? undefined,
    permission: model.value.permission ?? undefined,
    icon: model.value.icon ?? undefined,
    sort: model.value.sort ?? 999,
    isExternal: model.value.isExternal,
    isCache: model.value.isCache,
    isHidden: model.value.isHidden,
    status: model.value.status as 1 | 2
  };

  // request
  if (props.operateType === 'add') {
    const { error } = await fetchCreateMenu(data);
    if (error) return;
    window.$message?.success($t('common.addSuccess'));
  }

  if (props.operateType === 'edit') {
    const { error } = await fetchUpdateMenu(props.rowData!.id, data);
    if (error) return;
    window.$message?.success($t('common.updateSuccess'));
  }

  closeDrawer();
  emit('submitted');
}

watch(visible, () => {
  if (visible.value) {
    handleUpdateModelWhenEdit();
    restoreValidation();
  }
});
</script>

<template>
  <NDrawer v-model:show="visible" display-directive="show" :width="520" class="max-w-90%">
    <NDrawerContent :title="title" :native-scrollbar="false" closable>
      <NForm ref="formRef" :model="model" :rules="rules" label-placement="left" :label-width="96">
        <NFormItem label="上级菜单" path="parentId">
          <MenuTreeSelect v-model:value="model.parentId" />
        </NFormItem>
        <NFormItem label="菜单类型" path="type">
          <DictSelect v-model:value="model.type" dict-code="menu_type_enum" />
        </NFormItem>
        <NFormItem label="菜单名称" path="title">
          <NInput v-model:value="model.title" placeholder="请输入菜单名称" />
        </NFormItem>
        <NFormItem v-if="model.type !== 3" label="路由地址" path="path">
          <NInput v-model:value="model.path" placeholder="请输入路由地址" />
        </NFormItem>
        <NFormItem v-if="model.type === 2" label="组件路径" path="component">
          <NInput v-model:value="model.component" placeholder="请输入组件路径，如 system/user/index" />
        </NFormItem>
        <NFormItem v-if="model.type === 2" label="路由名称" path="name">
          <NInput v-model:value="model.name" placeholder="请输入路由名称" />
        </NFormItem>
        <NFormItem v-if="model.type === 1" label="重定向" path="redirect">
          <NInput v-model:value="model.redirect" placeholder="请输入重定向地址" />
        </NFormItem>
        <NFormItem v-if="model.type === 3" label="权限标识" path="permission">
          <NInput v-model:value="model.permission" placeholder="请输入权限标识，如 system:user:list" />
        </NFormItem>
        <NFormItem label="图标" path="icon">
          <NInput v-model:value="model.icon" placeholder="请输入 iconify 图标名称" />
        </NFormItem>
        <NFormItem label="排序" path="sort">
          <NInputNumber v-model:value="model.sort" class="w-full" placeholder="请输入排序" />
        </NFormItem>
        <NFormItem v-if="model.type !== 3" label="是否外链" path="isExternal">
          <NSwitch v-model:value="model.isExternal" />
        </NFormItem>
        <NFormItem v-if="model.type !== 3" label="是否缓存" path="isCache">
          <NSwitch v-model:value="model.isCache" />
        </NFormItem>
        <NFormItem v-if="model.type !== 3" label="是否隐藏" path="isHidden">
          <NSwitch v-model:value="model.isHidden" />
        </NFormItem>
        <NFormItem label="状态" path="status">
          <DictSelect v-model:value="model.status" dict-code="dis_enable_status_enum" />
        </NFormItem>
      </NForm>
      <template #footer>
        <NSpace :size="16">
          <NButton @click="closeDrawer">{{ $t('common.cancel') }}</NButton>
          <NButton type="primary" @click="handleSubmit">{{ $t('common.save') }}</NButton>
        </NSpace>
      </template>
    </NDrawerContent>
  </NDrawer>
</template>

<style scoped></style>
