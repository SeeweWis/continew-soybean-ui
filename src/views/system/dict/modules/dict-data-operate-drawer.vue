<script setup lang="ts">
import { ref, watch } from 'vue';
import { jsonClone } from '@sa/utils';
import { fetchCreateDictItem, fetchUpdateDictItem } from '@/service/api/system';
import { useNaiveForm } from '@/hooks/common/form';
import { $t } from '@/locales';

defineOptions({
  name: 'DictDataOperateDrawer'
});

interface Props {
  /** the type of operation */
  operateType: NaiveUI.TableOperateType;
  /** the edit row data */
  rowData?: Api.System.ContinewDictItem | null;
  /** 所属字典 */
  dict?: Api.System.ContinewDict | null;
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

type Model = {
  label: string;
  value: string;
  color: string | null;
  sort: number | null;
  description: string | null;
  status: number;
};

const model = ref<Model>(createDefaultModel());

function createDefaultModel(): Model {
  return {
    label: '',
    value: '',
    color: null,
    sort: 999,
    description: null,
    status: 1
  };
}

type RuleKey = Extract<keyof Model, 'label' | 'value'>;

const rules: Record<RuleKey, App.Global.FormRule[]> = {
  label: [{ required: true, message: '请输入标签' }],
  value: [{ required: true, message: '请输入键值' }]
};

function handleUpdateModelWhenEdit() {
  if (props.operateType === 'add') {
    model.value = createDefaultModel();
    return;
  }

  if (props.operateType === 'edit' && props.rowData) {
    Object.assign(model.value, jsonClone(props.rowData));
    model.value.value = String(props.rowData.value ?? '');
  }
}

function closeDrawer() {
  visible.value = false;
}

async function handleSubmit() {
  await validate();

  const { label, value, color, sort, description, status } = model.value;

  const data: Api.System.ContinewDictItemReq = {
    label,
    value,
    color: color ?? undefined,
    sort: sort ?? undefined,
    description: description ?? undefined,
    status: status as 1 | 2,
    dictId: props.operateType === 'add' ? props.dict!.id : props.rowData!.dictId
  };

  // request
  if (props.operateType === 'add') {
    const { error } = await fetchCreateDictItem(data);
    if (error) return;
    window.$message?.success($t('common.addSuccess'));
  }

  if (props.operateType === 'edit') {
    const { error } = await fetchUpdateDictItem(props.rowData!.id, data);
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
    <NDrawerContent :title="$t('page.system.dict.data.title')" :native-scrollbar="false" closable>
      <NForm ref="formRef" :model="model" :rules="rules">
        <NFormItem :label="$t('page.system.dict.data.label')" path="label">
          <NInput v-model:value="model.label" placeholder="请输入标签" />
        </NFormItem>
        <NFormItem :label="$t('page.system.dict.data.value')" path="value">
          <NInput v-model:value="model.value" placeholder="请输入键值" />
        </NFormItem>
        <NFormItem label="颜色" path="color">
          <NSelect
            v-model:value="model.color"
            clearable
            placeholder="请选择标签颜色"
            :options="['default', 'primary', 'info', 'success', 'warning', 'error'].map(v => ({ label: v, value: v }))"
          />
        </NFormItem>
        <NFormItem label="排序" path="sort">
          <NInputNumber v-model:value="model.sort" class="w-full" placeholder="请输入排序" />
        </NFormItem>
        <NFormItem label="状态" path="status">
          <DictRadio v-model:value="model.status" dict-code="dis_enable_status" />
        </NFormItem>
        <NFormItem :label="$t('page.system.dict.data.remark')" path="description">
          <NInput v-model:value="model.description" placeholder="请输入描述" />
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
