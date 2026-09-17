<script setup lang="ts">
import { reactive, watch } from 'vue';
import { fetchResetUserPassword } from '@/service/api/system';
import { useFormRules, useNaiveForm } from '@/hooks/common/form';
import { $t } from '@/locales';

defineOptions({
  name: 'UserPasswordDrawer'
});

interface Props {
  /** the edit row data */
  rowData?: Api.System.ContinewUser | null;
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
const { patternRules } = useFormRules();

type Model = {
  id?: CommonType.IdType;
  username: string;
  nickname: string;
  deptName: string;
  password: string;
};

const model: Model = reactive(createDefaultModel());

function createDefaultModel(): Model {
  return {
    id: undefined,
    username: '',
    nickname: '',
    deptName: '',
    password: ''
  };
}

type RuleKey = Extract<keyof Model, 'password'>;

const rules: Record<RuleKey, App.Global.FormRule[]> = {
  password: [{ ...patternRules.pwd }]
};

function handleUpdateModelWhenEdit() {
  Object.assign(model, props.rowData);
  model.password = '';
}

function closeDrawer() {
  visible.value = false;
}

async function handleSubmit() {
  await validate();

  const { id, password } = model;

  // request
  const { error } = await fetchResetUserPassword(id!, password!);
  if (error) return;

  window.$message?.success($t('common.updateSuccess'));
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
  <NDrawer v-model:show="visible" display-directive="show" :width="800" class="max-w-90%">
    <NDrawerContent title="重置密码" :native-scrollbar="false" closable>
      <NForm ref="formRef" :model="model" :rules="rules">
        <NFormItem :label="$t('page.system.user.nickName')" path="nickname">
          <NInput v-model:value="model.nickname" disabled />
        </NFormItem>
        <NFormItem :label="$t('page.system.user.deptName')" path="deptName">
          <NInput v-model:value="model.deptName" disabled />
        </NFormItem>
        <NFormItem :label="$t('page.system.user.userName')" path="username">
          <NInput v-model:value="model.username" disabled />
        </NFormItem>
        <NFormItem :label="$t('page.system.user.password')" path="password">
          <NInput
            v-model:value="model.password"
            type="password"
            show-password-on="click"
            :input-props="{ autocomplete: 'off' }"
            :placeholder="$t('page.system.user.form.password.required')"
          />
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
