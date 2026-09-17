<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { jsonClone } from '@sa/utils';
import { useLoading } from '@sa/hooks';
import { fetchCreateUser, fetchGetRoleDict, fetchUpdateUser } from '@/service/api/system';
import { useFormRules, useNaiveForm } from '@/hooks/common/form';
import { $t } from '@/locales';

defineOptions({
  name: 'UserOperateDrawer'
});

interface Props {
  /** the type of operation */
  operateType: NaiveUI.TableOperateType;
  /** the edit row data */
  rowData?: Api.System.ContinewUser | null;
  /** the dept tree data */
  deptData?: Api.Common.CommonTreeRecord;
  /** the dept id */
  deptId?: CommonType.IdType | null;
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
const { formRef, validate, restoreValidation } = useNaiveForm();
const { createRequiredRule, patternRules } = useFormRules();

const title = computed(() => {
  const titles: Record<NaiveUI.TableOperateType, string> = {
    add: $t('page.system.user.addUser'),
    edit: $t('page.system.user.editUser')
  };
  return titles[props.operateType];
});

type Model = {
  id?: CommonType.IdType;
  username: string;
  nickname: string;
  password: string;
  email: string;
  phone: string;
  /** 字典项值为字符串，提交时转为后端数字枚举 */
  gender: string;
  deptId: CommonType.IdType | null;
  roleIds: CommonType.IdType[];
  description: string;
  status: string;
};

const model = ref<Model>(createDefaultModel());

const roleOptions = ref<CommonType.Option<CommonType.IdType>[]>([]);

function createDefaultModel(): Model {
  return {
    id: undefined,
    username: '',
    nickname: '',
    email: '',
    phone: '',
    gender: '0',
    deptId: null,
    password: '',
    status: '1',
    roleIds: [],
    description: ''
  };
}

type RuleKey = Extract<keyof Model, 'username' | 'nickname' | 'password' | 'phone' | 'roleIds'>;

const rules: Record<RuleKey, App.Global.FormRule[]> = {
  username: [createRequiredRule($t('page.system.user.form.userName.required'))],
  nickname: [createRequiredRule($t('page.system.user.form.nickName.required'))],
  password: [{ ...patternRules.pwd, required: props.operateType === 'add' }],
  phone: [patternRules.phone],
  roleIds: [{ ...createRequiredRule('请选择角色'), type: 'array' }]
};

async function getRoleOptions() {
  startLoading();
  const { error, data } = await fetchGetRoleDict();
  if (!error) {
    roleOptions.value = data;
  }
  endLoading();
}

function handleUpdateModelWhenEdit() {
  model.value = createDefaultModel();

  getRoleOptions();

  if (props.operateType === 'add') {
    model.value.deptId = props.deptId ?? null;
    return;
  }

  if (props.operateType === 'edit' && props.rowData) {
    Object.assign(model.value, jsonClone(props.rowData));
    // 字典项值为字符串，与后端数字枚举互转
    model.value.gender = String(props.rowData.gender ?? 0);
    model.value.status = String(props.rowData.status ?? 1);
    model.value.password = '';
  }
}

function closeDrawer() {
  visible.value = false;
}

async function handleSubmit() {
  await validate();

  const { id, username, nickname, password, email, phone, gender, deptId, roleIds, description, status } = model.value;

  const payload: Api.System.ContinewUserReq = {
    username,
    nickname,
    email,
    phone,
    gender: Number(gender) as Api.System.ContinewUser['gender'],
    deptId: deptId!,
    roleIds: roleIds ?? [],
    description,
    status: Number(status) as Api.System.ContinewUserStatus
  };

  // request
  if (props.operateType === 'add') {
    const { error } = await fetchCreateUser({ ...payload, password });
    if (error) return;
    window.$message?.success($t('common.addSuccess'));
  }

  if (props.operateType === 'edit') {
    const { error } = await fetchUpdateUser(id!, payload);
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
  <NDrawer v-model:show="visible" display-directive="show" :width="800" class="max-w-90%">
    <NDrawerContent :title="title" :native-scrollbar="false" closable>
      <NSpin :show="loading">
        <NForm ref="formRef" :model="model" :rules="rules">
          <NFormItem :label="$t('page.system.user.nickName')" path="nickname">
            <NInput v-model:value="model.nickname" :placeholder="$t('page.system.user.form.nickName.required')" />
          </NFormItem>
          <NFormItem :label="$t('page.system.user.deptName')" path="deptId">
            <NTreeSelect
              v-model:value="model.deptId"
              clearable
              :options="deptData as []"
              label-field="name"
              key-field="id"
              :default-expanded-keys="deptData?.length ? [deptData[0].id] : []"
              :placeholder="$t('page.system.user.form.deptId.required')"
            />
          </NFormItem>
          <NFormItem :label="$t('page.system.user.phonenumber')" path="phone">
            <NInput v-model:value="model.phone" :placeholder="$t('page.system.user.form.phonenumber.required')" />
          </NFormItem>
          <NFormItem :label="$t('page.system.user.email')" path="email">
            <NInput v-model:value="model.email" :placeholder="$t('page.system.user.form.email.required')" />
          </NFormItem>
          <NFormItem v-if="operateType === 'add'" :label="$t('page.system.user.userName')" path="username">
            <NInput v-model:value="model.username" :placeholder="$t('page.system.user.form.userName.required')" />
          </NFormItem>
          <NFormItem v-if="operateType === 'add'" :label="$t('page.system.user.password')" path="password">
            <NInput
              v-model:value="model.password"
              type="password"
              show-password-on="click"
              :input-props="{ autocomplete: 'off' }"
              :placeholder="$t('page.system.user.form.password.required')"
            />
          </NFormItem>
          <NFormItem :label="$t('page.system.user.sex')" path="gender">
            <DictRadio
              v-model:value="model.gender"
              dict-code="gender"
              :placeholder="$t('page.system.user.form.sex.required')"
            />
          </NFormItem>
          <NFormItem :label="$t('page.system.user.roleIds')" path="roleIds">
            <NSelect
              v-model:value="model.roleIds"
              :loading="loading"
              :options="roleOptions"
              multiple
              clearable
              placeholder="请选择角色"
            />
          </NFormItem>
          <NFormItem :label="$t('page.system.user.status')" path="status">
            <DictRadio v-model:value="model.status" dict-code="dis_enable_status" />
          </NFormItem>
          <NFormItem :label="$t('page.system.user.remark')" path="description">
            <NInput v-model:value="model.description" :placeholder="$t('page.system.user.form.remark.required')" />
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
