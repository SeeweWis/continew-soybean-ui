<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { jsonClone } from '@sa/utils';
import { useLoading } from '@sa/hooks';
import { fetchCreateDept, fetchUpdateDept } from '@/service/api/system';
import { useNaiveForm } from '@/hooks/common/form';
import { $t } from '@/locales';

defineOptions({
  name: 'DeptOperateDrawer'
});

interface Props {
  /** the type of operation */
  operateType: NaiveUI.TableOperateType;
  /** the edit row data */
  rowData?: Api.System.ContinewDept | null;
  /** 新增时预选的上级部门 */
  defaultParentId?: CommonType.IdType | null;
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
const { loading: detailLoading } = useLoading();

const title = computed(() => {
  const titles: Record<NaiveUI.TableOperateType, string> = {
    add: '新增部门',
    edit: '编辑部门'
  };
  return titles[props.operateType];
});

type Model = {
  parentId: CommonType.IdType | null;
  name: string;
  sort: number | null;
  description: string | null;
  status: number;
};

const model = ref<Model>(createDefaultModel());

function createDefaultModel(): Model {
  return {
    parentId: 0,
    name: '',
    sort: 999,
    description: null,
    status: 1
  };
}

type RuleKey = Extract<keyof Model, 'name'>;

const rules: Record<RuleKey, App.Global.FormRule[]> = {
  name: [{ required: true, message: '请输入部门名称' }]
};

function handleUpdateModelWhenEdit() {
  if (props.operateType === 'add') {
    model.value = createDefaultModel();
    model.value.parentId = props.defaultParentId ?? 0;
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

  const data: Api.System.ContinewDeptReq = {
    parentId: model.value.parentId ?? 0,
    name: model.value.name,
    sort: model.value.sort ?? undefined,
    description: model.value.description ?? undefined,
    status: model.value.status as 1 | 2
  };

  // request
  if (props.operateType === 'add') {
    const { error } = await fetchCreateDept(data);
    if (error) return;
    window.$message?.success($t('common.addSuccess'));
  }

  if (props.operateType === 'edit') {
    const { error } = await fetchUpdateDept(props.rowData!.id, data);
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
      <NSpin :show="detailLoading">
        <NForm ref="formRef" :model="model" :rules="rules" label-placement="left" :label-width="80">
          <NFormItem label="上级部门" path="parentId">
            <DeptTreeSelect v-model:value="model.parentId" />
          </NFormItem>
          <NFormItem label="部门名称" path="name">
            <NInput v-model:value="model.name" placeholder="请输入部门名称" />
          </NFormItem>
          <NFormItem label="排序" path="sort">
            <NInputNumber v-model:value="model.sort" class="w-full" placeholder="请输入排序" />
          </NFormItem>
          <NFormItem label="状态" path="status">
            <DictSelect v-model:value="model.status" dict-code="dis_enable_status_enum" />
          </NFormItem>
          <NFormItem label="描述" path="description">
            <NInput v-model:value="model.description" type="textarea" placeholder="请输入描述" />
          </NFormItem>
        </NForm>
      </NSpin>
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
