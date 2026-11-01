<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { nanoid } from '@sa/utils';
import type { FormRules } from 'naive-ui';
import { createApprovalDefinition, fetchApprovalDefinition, updateApprovalDefinition } from '@/service/api/approval';
import { fetchGetUserDict } from '@/service/api/system';
import { useNaiveForm } from '@/hooks/common/form';
import { parseFlowConfig, serializeFlowConfig } from '../../modules/flow-config';
import FormDesigner from './form-designer.vue';
import { defaultFormConfig, formValueDefaults, parseFormConfig, serializeFormConfig, type FormConfig } from '../../modules/form-config';
import FormRenderer from '../../modules/form-renderer.vue';

const props = defineProps<{ id?: CommonType.IdType; readonly?: boolean }>();
const emit = defineEmits<{ submitted: [] }>();
const visible = defineModel<boolean>('visible', { default: false });
const { formRef, validate, restoreValidation } = useNaiveForm();
const loading = ref(false);
const saving = ref(false);
const loadError = ref('');
const configError = ref('');
const usersLoading = ref(false);
const usersError = ref(false);
const users = ref<Api.System.LabelValue[]>([]);
const nodes = ref<Api.Approval.FlowNode[]>([]);
const formConfig = ref<FormConfig>(defaultFormConfig());
const step = ref(1);
const designerRef = ref<InstanceType<typeof FormDesigner>>();
const model = ref(createModel());
const formPreviewValues = computed(() => formValueDefaults(formConfig.value));
let loadVersion = 0;
const title = computed(() => (props.readonly ? '查看审批定义' : props.id ? '编辑审批定义' : '新建审批定义'));
const publishedNotice = computed(() => Boolean(props.id) && model.value.status === 1 && !props.readonly);
const rules: FormRules = {
  name: { required: true, whitespace: true, message: '请输入审批名称', trigger: ['blur', 'input'] },
  code: {
    required: true,
    pattern: /^[A-Za-z][A-Za-z0-9_]*$/,
    message: '以字母开头，仅包含字母、数字和下划线',
    trigger: ['blur', 'input']
  }
};

function createModel(): Api.Approval.DefinitionReq {
  return { code: '', name: '', category: '', description: '', status: 1, flowConfig: '', formConfig: serializeFormConfig(defaultFormConfig()) };
}

function addNode() {
  nodes.value.push({
    id: nanoid(),
    name: '',
    type: 'APPROVAL',
    approverType: 'USER',
    approvers: [],
    approveMode: 'AND'
  });
}

function moveNode(index: number, offset: number) {
  const target = index + offset;
  if (target < 0 || target >= nodes.value.length) return;
  [nodes.value[index], nodes.value[target]] = [nodes.value[target], nodes.value[index]];
}

async function loadUsers() {
  usersLoading.value = true;
  usersError.value = false;
  try {
    const result = await fetchGetUserDict();
    if (result.error) usersError.value = true;
    else users.value = result.data;
  } finally {
    usersLoading.value = false;
  }
}

async function load() {
  const version = ++loadVersion;
  loading.value = false;
  model.value = createModel();
  nodes.value = [];
  formConfig.value = defaultFormConfig();
  step.value = 1;
  loadError.value = '';
  configError.value = '';
  restoreValidation();
  void loadUsers();
  if (!props.id) {
    addNode();
    return;
  }
  loading.value = true;
  try {
    const { data, error } = await fetchApprovalDefinition(props.id);
    if (version !== loadVersion || !visible.value) return;
    if (error) {
      loadError.value = '审批定义加载失败，请重试';
      return;
    }
    const { code, name, category, description, status, flowConfig, formConfig: config } = data;
    model.value = { code, name, category, description, status, flowConfig, formConfig: config || serializeFormConfig(defaultFormConfig()) };
    try {
      nodes.value = parseFlowConfig(flowConfig);
    } catch (cause) {
      configError.value = cause instanceof Error ? cause.message : '流程配置无效';
    }
    try {
      formConfig.value = parseFormConfig(config);
    } catch (cause) {
      configError.value = cause instanceof Error ? cause.message : '表单配置无效';
    }
  } finally {
    if (version === loadVersion) loading.value = false;
  }
}

async function save() {
  if (saving.value || loading.value || loadError.value || configError.value) return;
  saving.value = true;
  try {
    await validate();
  } catch {
    saving.value = false;
    return;
  }
  try {
    model.value.flowConfig = serializeFlowConfig(nodes.value);
  } catch (cause) {
    step.value = 2;
    window.$message?.error(cause instanceof Error ? cause.message : '请检查审批节点配置');
    saving.value = false;
    return;
  }
  try {
    model.value.formConfig = serializeFormConfig(formConfig.value);
  } catch (cause) {
    step.value = 3;
    window.$message?.error(cause instanceof Error ? cause.message : '请检查表单配置');
    saving.value = false;
    return;
  }
  try {
    const result = props.id
      ? await updateApprovalDefinition(props.id, model.value)
      : await createApprovalDefinition(model.value);
    if (result.error) return;
    window.$message?.success('审批定义已保存');
    visible.value = false;
    emit('submitted');
  } finally {
    saving.value = false;
  }
}

async function nextStep() {
  if (step.value === 1) {
    try {
      await validate();
    } catch {
      return;
    }
  } else if (step.value === 2) {
    try {
      serializeFlowConfig(nodes.value);
    } catch (cause) {
      window.$message?.error(cause instanceof Error ? cause.message : '请检查审批节点配置');
      return;
    }
  } else if (step.value === 3 && !designerRef.value?.validate()) {
    return;
  }
  step.value += 1;
}

function previousStep() {
  if (step.value > 1) step.value -= 1;
}

watch(visible, show => {
  if (show) void load();
  else loadVersion += 1;
});
</script>

<template>
  <NDrawer v-model:show="visible" :width="1100" class="max-w-95%" :mask-closable="!saving" :close-on-esc="!saving">
    <NDrawerContent :title="title" :native-scrollbar="false" :closable="!saving">
      <NSpin :show="loading">
        <NAlert v-if="loadError" type="error" class="mb-16px">
          {{ loadError }}
          <NButton text type="primary" @click="load">重试</NButton>
        </NAlert>
        <NForm v-else ref="formRef" :model="model" :rules="rules" :disabled="readonly || saving || loading">
          <NSteps :current="step" size="small" class="mb-20px">
            <NStep title="基本信息" description="名称、编码和发布状态" />
            <NStep title="审批节点" description="配置审批顺序和审批人" />
            <NStep title="申请字段" description="设计提交审批时填写的字段" />
            <NStep title="审批预览" description="确认最终流程和申请表单" />
          </NSteps>

          <template v-if="step === 1">
            <NGrid cols="1 s:2" responsive="screen" :x-gap="16">
              <NFormItemGi label="审批名称" path="name">
                <NInput v-model:value="model.name" :maxlength="100" placeholder="请输入审批名称" />
              </NFormItemGi>
              <NFormItemGi label="审批编码" path="code">
                <NInput
                  v-model:value="model.code"
                  :maxlength="50"
                  :disabled="Boolean(id) || readonly"
                  placeholder="例如 LEAVE_APPROVAL"
                />
              </NFormItemGi>
              <NFormItemGi label="分类" path="category">
                <NInput v-model:value="model.category" :maxlength="50" placeholder="例如 人事管理" />
              </NFormItemGi>
              <NFormItemGi label="状态" path="status">
                <NSelect
                  v-model:value="model.status"
                  :options="[
                    { label: '已发布（用于新申请）', value: 1 },
                    { label: '已停用（不可发起新申请）', value: 0 }
                  ]"
                />
              </NFormItemGi>
            </NGrid>
            <NFormItem label="说明" path="description">
              <NInput v-model:value="model.description" type="textarea" :maxlength="500" show-count />
            </NFormItem>
            <NAlert v-if="publishedNotice" type="warning" class="mb-16px">
              这是已发布模板。保存后只对新发起的申请生效，已经进入审批的申请继续使用原流程快照。
            </NAlert>
          </template>

          <template v-else-if="step === 2">
            <NAlert v-if="configError" type="error" class="mb-16px">
              {{ configError }}。原始配置已保留，当前禁止覆盖保存。
            </NAlert>
            <NAlert v-else type="info" class="mb-16px">按排列顺序审批。会签需全部审批人同意，或签任一人同意即可。</NAlert>
            <NAlert v-if="usersError && !readonly" type="error" class="mb-16px">
              审批人加载失败。
              <NButton text type="primary" @click="loadUsers">重试</NButton>
            </NAlert>
            <div class="flex-col gap-12px">
              <NCard v-for="(node, index) in nodes" :key="node.id" :title="`第 ${index + 1} 步`" size="small">
                <template v-if="!readonly" #header-extra>
                  <NSpace size="small">
                    <NButton size="tiny" :disabled="index === 0 || saving" @click="moveNode(index, -1)">上移</NButton>
                    <NButton size="tiny" :disabled="index === nodes.length - 1 || saving" @click="moveNode(index, 1)">下移</NButton>
                    <NButton size="tiny" type="error" :disabled="saving" @click="nodes.splice(index, 1)">删除</NButton>
                  </NSpace>
                </template>
                <NFormItem label="节点名称" required>
                  <NInput v-model:value="node.name" :maxlength="100" placeholder="例如 部门审批" />
                </NFormItem>
                <NFormItem label="审批人" required>
                  <NSelect
                    v-model:value="node.approvers"
                    multiple
                    filterable
                    :loading="usersLoading"
                    :options="users"
                    placeholder="选择一名或多名用户"
                  />
                </NFormItem>
                <NFormItem label="审批模式" required>
                  <NTag v-if="node.approvers.length <= 1" type="info">单人审批，提交后直接进入下一步</NTag>
                  <NRadioGroup v-model:value="node.approveMode">
                    <NSpace v-if="node.approvers.length > 1">
                      <NRadio value="AND">会签</NRadio>
                      <NRadio value="OR">或签</NRadio>
                    </NSpace>
                  </NRadioGroup>
                </NFormItem>
              </NCard>
              <NEmpty v-if="!nodes.length && !configError" description="尚未添加审批节点" />
              <NButton v-if="!readonly && !configError" dashed :disabled="saving" @click="addNode">添加审批节点</NButton>
            </div>
          </template>

          <template v-else-if="step === 3">
            <NAlert type="info" class="mb-16px">拖动左侧字段到画布，或点击组件快速添加。字段编码保存后用于提交数据，请避免随意修改。</NAlert>
            <FormDesigner ref="designerRef" v-model="formConfig" :readonly="readonly" />
          </template>

          <template v-else>
            <NGrid cols="1 l:2" responsive="screen" :x-gap="20">
              <NGridItem>
                <NCard title="审批基本信息" size="small" embedded>
                  <NDescriptions bordered :column="1" size="small">
                    <NDescriptionsItem label="审批名称">{{ model.name || '—' }}</NDescriptionsItem>
                    <NDescriptionsItem label="审批编码">{{ model.code || '—' }}</NDescriptionsItem>
                    <NDescriptionsItem label="分类">{{ model.category || '—' }}</NDescriptionsItem>
                    <NDescriptionsItem label="状态">{{ model.status === 1 ? '已发布' : '已停用' }}</NDescriptionsItem>
                    <NDescriptionsItem label="说明">{{ model.description || '—' }}</NDescriptionsItem>
                  </NDescriptions>
                </NCard>
                <NCard title="审批流程" size="small" embedded class="mt-12px">
                  <NEmpty v-if="!nodes.length" description="尚未配置审批节点" />
                  <NSteps v-else vertical size="small">
                    <NStep
                      v-for="(node, index) in nodes"
                      :key="node.id"
                      :title="node.name || `第 ${index + 1} 步`"
                      :description="`${node.approveMode === 'AND' ? '会签：所有审批人同意' : '或签：任一审批人同意'} · ${node.approvers.length} 名审批人`"
                      :status="index === 0 ? 'process' : 'wait'"
                    />
                  </NSteps>
                </NCard>
              </NGridItem>
              <NGridItem>
                <NCard title="申请表单预览" size="small" embedded>
                  <FormRenderer :config="formConfig" :model-value="formPreviewValues" readonly />
                </NCard>
              </NGridItem>
            </NGrid>
          </template>
        </NForm>
      </NSpin>
      <template #footer>
        <NSpace justify="end">
          <NButton :disabled="saving" @click="visible = false">关闭</NButton>
          <NButton v-if="step > 1" :disabled="saving" @click="previousStep">上一步</NButton>
          <NButton
            v-if="step < 4"
            type="primary"
            :disabled="loading || Boolean(loadError || configError)"
            @click="nextStep"
          >
            下一步
          </NButton>
          <NButton
            v-if="!readonly && step === 4"
            type="primary"
            :loading="saving"
            :disabled="loading || Boolean(loadError || configError)"
            @click="save"
          >
            保存
          </NButton>
        </NSpace>
      </template>
    </NDrawerContent>
  </NDrawer>
</template>
