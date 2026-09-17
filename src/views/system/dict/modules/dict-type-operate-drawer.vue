<script setup lang="ts">
import { ref, watch } from 'vue';
import { jsonClone } from '@sa/utils';
import { fetchCreateDict, fetchUpdateDict } from '@/service/api/system';
import { useNaiveForm } from '@/hooks/common/form';
import { $t } from '@/locales';

defineOptions({
  name: 'DictTypeOperateDrawer'
});

interface Props {
  /** the type of operation */
  operateType: NaiveUI.TableOperateType;
  /** the edit row data */
  rowData?: Api.System.ContinewDict | null;
}

const props = defineProps<Props>();

interface Emits {
  (e: 'submitted', code: string): void;
}

const emit = defineEmits<Emits>();

const visible = defineModel<boolean>('visible', {
  default: false
});

const { formRef, validate, restoreValidation } = useNaiveForm();

type Model = Api.System.ContinewDictReq;

const model = ref<Model>(createDefaultModel());

function createDefaultModel(): Model {
  return {
    name: '',
    code: '',
    description: ''
  };
}

type RuleKey = Extract<keyof Model, 'name' | 'code'>;

const rules: Record<RuleKey, App.Global.FormRule[]> = {
  name: [{ required: true, message: '请输入字典名称' }],
  code: [{ required: true, message: '请输入字典编码' }]
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

  const { name, code, description } = model.value;

  // request
  if (props.operateType === 'add') {
    const { error } = await fetchCreateDict({ name, code, description });
    if (error) return;
    window.$message?.success($t('common.addSuccess'));
  }

  if (props.operateType === 'edit') {
    const { error } = await fetchUpdateDict(props.rowData!.id, { name, code, description });
    if (error) return;
    window.$message?.success($t('common.updateSuccess'));
  }

  closeDrawer();
  emit('submitted', code);
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
    <NDrawerContent :title="$t('page.system.dict.dictType')" :native-scrollbar="false" closable>
      <NForm ref="formRef" :model="model" :rules="rules">
        <NFormItem label="字典名称" path="name">
          <NInput v-model:value="model.name" placeholder="请输入字典名称" />
        </NFormItem>
        <NFormItem label="字典编码" path="code">
          <NInput v-model:value="model.code" placeholder="请输入字典编码" :disabled="props.rowData?.isSystem" />
        </NFormItem>
        <NFormItem label="描述" path="description">
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
