<script setup lang="tsx">
import { computed, reactive, ref, watch } from 'vue';
import type { FormRules } from 'naive-ui';
import { fetchApprovalDefinition, fetchApprovalDefinitions, startApproval } from '@/service/api/approval';
import { fetchGetUserDict } from '@/service/api/system';
import { useAuth } from '@/hooks/business/auth';
import { useNaiveForm } from '@/hooks/common/form';
import FormRenderer from './form-renderer.vue';
import { defaultFormConfig, formValueDefaults, parseFormConfig, type FormConfig } from './form-config';

const emit = defineEmits<{ submitted: [] }>();
const visible = defineModel<boolean>('visible', { default: false });
const { hasAuth } = useAuth();
const { formRef, validate, restoreValidation } = useNaiveForm();
const definitions = ref<Api.Approval.Definition[]>([]);
const selectedDetail = ref<Api.Approval.DefinitionDetail>();
const users = ref<Api.System.LabelValue[]>([]);
const loading = ref(false);
const flowLoading = ref(false);
const failed = ref(false);
const flowFailed = ref(false);
const submitting = ref(false);
const formModel = reactive({ definitionCode: '', title: '' });
const formConfig = ref<FormConfig>(defaultFormConfig());
const formData = ref<Record<string, unknown>>(formValueDefaults(formConfig.value));
const options = computed(() => definitions.value.map(d => ({ label: d.name, value: d.code })));
const selected = computed(() => definitions.value.find(d => d.code === formModel.definitionCode));
const previewNodes = computed<Api.Approval.FlowNode[]>(() => {
  if (!selectedDetail.value?.flowConfig) return [];
  try {
    return (JSON.parse(selectedDetail.value.flowConfig) as { nodes?: Api.Approval.FlowNode[] }).nodes ?? [];
  } catch {
    return [];
  }
});
const userNames = computed(() => new Map(users.value.map(user => [String(user.value), user.label])));
const rules: FormRules = {
  definitionCode: { required: true, message: '请选择审批类型', trigger: ['blur', 'change'] },
  title: { required: true, whitespace: true, message: '请输入申请事项', trigger: ['blur', 'input'] }
};

function approverName(id: CommonType.IdType) {
  return userNames.value.get(String(id)) || `用户 ${id}`;
}

function reset() {
  Object.assign(formModel, { definitionCode: '', title: '' });
  formConfig.value = defaultFormConfig();
  formData.value = formValueDefaults(formConfig.value);
  selectedDetail.value = undefined;
  restoreValidation();
}

async function load() {
  loading.value = true;
  failed.value = false;
  try {
    const [definitionResult, userResult] = await Promise.all([
      fetchApprovalDefinitions({ status: 1 }),
      fetchGetUserDict()
    ]);
    if (definitionResult.error) failed.value = true;
    else definitions.value = definitionResult.data.filter(d => d.status === 1);
    if (!userResult.error) users.value = userResult.data;
  } finally {
    loading.value = false;
  }
}

async function loadFlow(code: string) {
  selectedDetail.value = undefined;
  formConfig.value = defaultFormConfig();
  formData.value = formValueDefaults(formConfig.value);
  flowFailed.value = false;
  if (!code) return;
  flowLoading.value = true;
  try {
    const definition = definitions.value.find(item => item.code === code);
    if (!definition) return;
    const { data, error } = await fetchApprovalDefinition(definition.id);
    if (error) flowFailed.value = true;
    else {
      try {
        selectedDetail.value = data;
        formConfig.value = parseFormConfig(data.formConfig);
        formData.value = formValueDefaults(formConfig.value);
      } catch {
        flowFailed.value = true;
      }
    }
  } finally {
    flowLoading.value = false;
  }
}

async function submit() {
  if (submitting.value || flowLoading.value) return;
  try {
    await validate();
  } catch {
    return;
  }
  const selectedDefinition = selected.value;
  if (!selectedDefinition || !selectedDetail.value) {
    window.$message?.warning('审批流程还没有加载完成，请稍候再提交');
    return;
  }
  const missing = formConfig.value.fields.find(field => {
    const value = formData.value[field.key];
    return field.required
      && (value == null || (typeof value === 'string' && !value.trim()) || (Array.isArray(value) && !value.length));
  });
  if (missing) {
    window.$message?.warning(`请填写：${missing.label}`);
    return;
  }
  submitting.value = true;
  try {
    const result = await startApproval({
      definitionCode: selectedDefinition.code,
      businessType: selectedDefinition.code,
      businessKey: `approval-${Date.now()}`,
      title: formModel.title,
      formData: JSON.stringify(formData.value)
    });
    if (result.error) return;
    window.$message?.success('审批已发起');
    visible.value = false;
    emit('submitted');
    reset();
  } finally {
    submitting.value = false;
  }
}

watch(() => formModel.definitionCode, code => void loadFlow(code));
watch(visible, show => {
  if (show && hasAuth('approval:definition:list')) void load();
});
</script>

<template>
  <NDrawer v-model:show="visible" :width="1000" class="max-w-95%" :mask-closable="!submitting" :close-on-esc="!submitting">
    <NDrawerContent title="发起审批" :native-scrollbar="false" :closable="!submitting">
      <NSpin :show="loading">
        <NAlert v-if="!hasAuth('approval:instance:start') || !hasAuth('approval:definition:list')" type="warning">
          需要审批发起及审批模板查询权限
        </NAlert>
        <NAlert v-else-if="failed" type="error" class="mb-16px">
          审批模板加载失败，未提交任何申请。
          <NButton text @click="load">重试</NButton>
        </NAlert>
        <NEmpty v-else-if="!loading && !definitions.length" description="暂无已启用的审批模板，请联系管理员配置" />
        <NForm v-else ref="formRef" :model="formModel" :rules="rules" :disabled="submitting" label-placement="top">
          <NGrid cols="1 m:2" responsive="screen" :x-gap="24">
            <NGridItem>
              <NFormItem label="审批类型" path="definitionCode">
                <NSelect v-model:value="formModel.definitionCode" :options="options" :loading="loading" filterable placeholder="请选择要办理的事项" />
              </NFormItem>
              <NAlert v-if="selected?.description" type="info" class="mb-16px">{{ selected.description }}</NAlert>
              <NDivider title-placement="left">填写申请</NDivider>
              <NFormItem label="申请事项" path="title">
                <NInput v-model:value="formModel.title" :maxlength="200" placeholder="例如：2026 年 5 月 10 日至 12 日年假" />
              </NFormItem>
              <FormRenderer v-model="formData" :config="formConfig" />
              <NAlert type="info">提交后将按照右侧流程依次审批；已提交申请使用当前流程快照。</NAlert>
            </NGridItem>
            <NGridItem>
              <NCard title="审批流程预览" size="small" class="sticky top-16px">
                <NSpin :show="flowLoading">
                  <NEmpty v-if="!formModel.definitionCode" description="选择审批类型后查看流程" />
                  <NAlert v-else-if="flowFailed" type="error">
                    流程预览加载失败。
                    <NButton text @click="loadFlow(formModel.definitionCode)">重试</NButton>
                  </NAlert>
                  <NSteps v-else-if="previewNodes.length" vertical size="small">
                    <NStep v-for="(node, index) in previewNodes" :key="node.id" :title="node.name" :description="`${node.approveMode === 'AND' ? '所有审批人同意后通过' : '任一审批人同意后通过'} · ${node.approvers.map(approverName).join('、')}`" :status="index === 0 ? 'process' : 'wait'" />
                  </NSteps>
                  <NEmpty v-else description="此审批模板没有可执行的节点" />
                </NSpin>
              </NCard>
            </NGridItem>
          </NGrid>
        </NForm>
      </NSpin>
      <template #footer>
        <NSpace justify="end">
          <NButton :disabled="submitting" @click="visible = false">取消</NButton>
          <NButton type="primary" :loading="submitting" :disabled="loading || failed || flowLoading || !previewNodes.length" @click="submit">提交审批</NButton>
        </NSpace>
      </template>
    </NDrawerContent>
  </NDrawer>
</template>
