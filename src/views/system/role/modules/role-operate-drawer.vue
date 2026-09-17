<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { jsonClone } from '@sa/utils';
import { fetchCreateRole, fetchUpdateRole } from '@/service/api/system';
import { useNaiveForm } from '@/hooks/common/form';
import { $t } from '@/locales';

defineOptions({
  name: 'RoleOperateDrawer'
});

interface Props {
  /** the type of operation */
  operateType: NaiveUI.TableOperateType;
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

const { formRef, validate, restoreValidation } = useNaiveForm();

const title = computed(() => {
  const titles: Record<NaiveUI.TableOperateType, string> = {
    add: '新增角色',
    edit: '编辑角色'
  };
  return titles[props.operateType];
});

type Model = {
  name: string;
  code: string;
  sort: number | null;
  description: string | null;
};

const model = ref<Model>(createDefaultModel());

function createDefaultModel(): Model {
  return {
    name: '',
    code: '',
    sort: 999,
    description: null
  };
}

type RuleKey = Extract<keyof Model, 'name' | 'code'>;

const rules: Record<RuleKey, App.Global.FormRule[]> = {
  name: [{ required: true, message: '请输入角色名称' }],
  code: [{ required: true, message: '请输入角色权限字符' }]
};

function handleUpdateModelWhenEdit() {
  if (props.operateType === 'add') {
    model.value = createDefaultModel();
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

  const { name, code, sort, description } = model.value;

  // request
  if (props.operateType === 'add') {
    const { error } = await fetchCreateRole({
      name,
      code,
      sort: sort ?? undefined,
      description: description ?? undefined
    });
    if (error) return;
    window.$message?.success($t('common.addSuccess'));
  }

  if (props.operateType === 'edit') {
    const { error } = await fetchUpdateRole(props.rowData!.id, {
      name,
      code,
      sort: sort ?? undefined,
      description: description ?? undefined
    });
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
  <NDrawer v-model:show="visible" display-directive="show" :width="480" class="max-w-90%">
    <NDrawerContent :title="title" :native-scrollbar="false" closable>
      <NForm ref="formRef" :model="model" :rules="rules">
        <NFormItem label="角色名称" path="name">
          <NInput v-model:value="model.name" placeholder="请输入角色名称" />
        </NFormItem>
        <NFormItem label="角色权限字符" path="code">
          <NInput v-model:value="model.code" placeholder="请输入角色权限字符" :disabled="props.rowData?.isSystem" />
        </NFormItem>
        <NFormItem label="显示顺序" path="sort">
          <NInputNumber v-model:value="model.sort" class="w-full" placeholder="请输入显示顺序" />
        </NFormItem>
        <NFormItem label="描述" path="description">
          <NInput v-model:value="model.description" type="textarea" placeholder="请输入描述" />
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
