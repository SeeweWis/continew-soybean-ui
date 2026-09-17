<script setup lang="ts">
import { reactive, ref, watch } from 'vue';
import { useLoading } from '@sa/hooks';
import {
  fetchCreateTenant,
  fetchGetTenantDetail,
  fetchGetTenantPackageDict,
  fetchUpdateTenant
} from '@/service/api/system';
import { useNaiveForm } from '@/hooks/common/form';
import { encrypt } from '@/utils/jsencrypt';
import { $t } from '@/locales';

defineOptions({
  name: 'TenantOperateDrawer'
});

interface Props {
  /** the type of operation */
  operateType: 'add' | 'edit';
  /** the edit row id */
  tenantId?: CommonType.IdType | null;
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

const packageOptions = ref<{ label: string; value: CommonType.IdType }[]>([]);

async function getPackageOptions() {
  const { data, error } = await fetchGetTenantPackageDict();
  if (!error) {
    packageOptions.value = data.map(item => ({ label: item.label, value: item.value as CommonType.IdType }));
  }
}

const model = reactive(createDefaultModel());

function createDefaultModel() {
  return {
    name: '',
    code: '',
    domain: null as string | null,
    packageId: null as CommonType.IdType | null,
    adminUsername: '',
    adminPassword: '',
    expireTime: null as string | null,
    description: null as string | null,
    status: 1 as 1 | 2
  };
}

const rules = {
  name: [{ required: true, message: '请输入租户名称' }],
  code: [{ required: true, message: '请输入租户编码' }],
  packageId: [{ required: true, message: '请选择绑定套餐' }],
  adminUsername: [{ required: true, message: '请输入管理员账号' }],
  adminPassword: [{ required: true, message: '请输入管理员密码' }]
};

async function getDetail() {
  if (!props.tenantId) return;
  startLoading();
  const { data, error } = await fetchGetTenantDetail(props.tenantId);
  if (!error) {
    Object.assign(model, { ...createDefaultModel(), ...data, adminPassword: '' });
  }
  endLoading();
}

function closeDrawer() {
  visible.value = false;
}

async function handleSubmit() {
  await validate();

  const data: Api.System.ContinewTenantReq = {
    name: model.name,
    code: model.code,
    domain: model.domain,
    expireTime: model.expireTime,
    description: model.description,
    status: model.status,
    packageId: model.packageId!,
    adminUsername: model.adminUsername,
    adminPassword: model.adminPassword ? encrypt(model.adminPassword) || undefined : undefined
  };

  if (props.operateType === 'add') {
    const { error } = await fetchCreateTenant(data);
    if (error) return;
    window.$message?.success($t('common.addSuccess'));
  } else {
    const { error } = await fetchUpdateTenant(props.tenantId!, data);
    if (error) return;
    window.$message?.success($t('common.updateSuccess'));
  }

  closeDrawer();
  emit('submitted');
}

watch(visible, val => {
  if (val) {
    getPackageOptions();
    if (props.operateType === 'add') {
      Object.assign(model, createDefaultModel());
    } else {
      getDetail();
    }
    restoreValidation();
  }
});
</script>

<template>
  <NDrawer v-model:show="visible" display-directive="show" :width="520" class="max-w-90%">
    <NDrawerContent :title="operateType === 'add' ? '新增租户' : '编辑租户'" :native-scrollbar="false" closable>
      <NSpin :show="loading">
        <NForm ref="formRef" :model="model" :rules="rules" label-placement="left" :label-width="110">
          <NFormItem label="租户名称" path="name">
            <NInput v-model:value="model.name" placeholder="请输入租户名称" />
          </NFormItem>
          <NFormItem label="租户编码" path="code">
            <NInput v-model:value="model.code" placeholder="请输入租户编码" />
          </NFormItem>
          <NFormItem label="绑定套餐" path="packageId">
            <NSelect v-model:value="model.packageId" :options="packageOptions" placeholder="请选择绑定套餐" />
          </NFormItem>
          <NFormItem label="管理员账号" path="adminUsername">
            <NInput v-model:value="model.adminUsername" placeholder="请输入管理员账号" />
          </NFormItem>
          <NFormItem label="管理员密码" path="adminPassword">
            <NInput
              v-model:value="model.adminPassword"
              type="password"
              show-password-on="click"
              :placeholder="operateType === 'add' ? '请输入管理员密码' : '留空则不修改'"
            />
          </NFormItem>
          <NFormItem label="域名" path="domain">
            <NInput v-model:value="model.domain" placeholder="请输入域名" />
          </NFormItem>
          <NFormItem label="过期时间" path="expireTime">
            <NDatePicker
              v-model:formatted-value="model.expireTime"
              type="datetime"
              value-format="yyyy-MM-dd HH:mm:ss"
              clearable
            />
          </NFormItem>
          <NFormItem label="状态" path="status">
            <DictRadio v-model:value="model.status" dict-code="dis_enable_status" />
          </NFormItem>
          <NFormItem label="描述" path="description">
            <NInput v-model:value="model.description" type="textarea" placeholder="请输入描述" />
          </NFormItem>
        </NForm>
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
