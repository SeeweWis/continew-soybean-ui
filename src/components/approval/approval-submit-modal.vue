<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { VueDraggable } from 'vue-draggable-plus';
import type { ApprovalSubmitField, ApprovalSubmitPayload } from './types';

const props = withDefaults(
  defineProps<{
    title?: string;
    definitionName?: string;
    fixedFields?: ApprovalSubmitField[];
    businessFields?: ApprovalSubmitField[];
    initialValues?: Record<string, unknown>;
    initialBusinessFieldKeys?: string[];
    flowPreview?: Api.Approval.FlowNode[];
    submitting?: boolean;
  }>(),
  {
    title: '',
    definitionName: '',
    fixedFields: () => [],
    businessFields: () => [],
    initialValues: () => ({}),
    initialBusinessFieldKeys: () => [],
    flowPreview: () => [],
    submitting: false
  }
);
const emit = defineEmits<{ submit: [ApprovalSubmitPayload]; cancel: [] }>();
const visible = defineModel<boolean>('visible', { default: false });
const titleValue = ref('');
const values = ref<Record<string, unknown>>({});
const selectedBusinessFields = ref<ApprovalSubmitField[]>([]);

const selectedKeys = computed(() => new Set(selectedBusinessFields.value.map(field => field.key)));
const availableBusinessFields = computed(() =>
  props.businessFields.filter(field => !selectedKeys.value.has(field.key))
);
const fields = computed(() => [...props.fixedFields, ...selectedBusinessFields.value]);

function reset() {
  titleValue.value = props.title;
  values.value = { ...props.initialValues };
  selectedBusinessFields.value = props.businessFields.filter(
    field => props.initialBusinessFieldKeys?.includes(field.key) || Object.hasOwn(values.value, field.key)
  );
  selectedBusinessFields.value.forEach(field => {
    if (!Object.hasOwn(values.value, field.key) && field.value !== undefined) values.value[field.key] = field.value;
  });
  props.fixedFields.forEach(field => {
    if (!Object.hasOwn(values.value, field.key) && field.value !== undefined) values.value[field.key] = field.value;
  });
}

function addField(field: ApprovalSubmitField) {
  if (selectedKeys.value.has(field.key)) return;
  selectedBusinessFields.value.push(field);
  if (!Object.hasOwn(values.value, field.key) && field.value !== undefined) values.value[field.key] = field.value;
}

function removeField(field: ApprovalSubmitField) {
  selectedBusinessFields.value = selectedBusinessFields.value.filter(item => item.key !== field.key);
  const { [field.key]: _removed, ...rest } = values.value;
  values.value = rest;
}

function updateValue(field: ApprovalSubmitField, value: unknown) {
  values.value = { ...values.value, [field.key]: value };
}

function valueOf(field: ApprovalSubmitField) {
  return values.value[field.key] ?? null;
}

function textValue(field: ApprovalSubmitField) {
  const value = valueOf(field);
  return typeof value === 'string' ? value : null;
}

function numberValue(field: ApprovalSubmitField) {
  const value = valueOf(field);
  return typeof value === 'number' ? value : null;
}

function rangeValue(field: ApprovalSubmitField) {
  const value = valueOf(field);
  return Array.isArray(value) && value.length === 2 && value.every(item => typeof item === 'number')
    ? ([value[0], value[1]] as [number, number])
    : null;
}

function isBlank(value: unknown) {
  return value == null || (typeof value === 'string' && !value.trim()) || (Array.isArray(value) && !value.length);
}

function submit() {
  const missing = fields.value.find(field => field.required && isBlank(valueOf(field)));
  if (missing) {
    window.$message?.warning(`请填写：${missing.label}`);
    return;
  }
  if (!titleValue.value.trim()) {
    window.$message?.warning('请输入申请事项');
    return;
  }
  emit('submit', {
    title: titleValue.value.trim(),
    values: { ...values.value },
    businessFieldKeys: selectedBusinessFields.value.map(field => field.key)
  });
}

watch(visible, show => {
  if (show) reset();
});
</script>

<template>
  <NModal
    v-model:show="visible"
    preset="card"
    :title="definitionName ? `发起${definitionName}` : '发起审批'"
    class="w-1100px max-w-96%"
    :mask-closable="!submitting"
    :close-on-esc="!submitting"
  >
    <NAlert type="info" class="mb-12px">
      左侧是当前业务可提交的字段。把需要审批人查看的信息拖到右侧，固定字段会始终保留。
    </NAlert>
    <NForm :disabled="submitting" label-placement="top">
      <NFormItem label="申请事项" required>
        <NInput v-model:value="titleValue" maxlength="200" placeholder="例如：采购办公用品" />
      </NFormItem>
      <div class="grid grid-cols-[220px_minmax(360px,1fr)] gap-12px max-md:grid-cols-1">
        <NCard title="业务字段" size="small" embedded>
          <VueDraggable
            :model-value="availableBusinessFields"
            item-key="key"
            :sort="false"
            :group="{ name: 'approval-submit-fields', pull: 'clone', put: false }"
            class="min-h-240px flex-col gap-8px"
          >
            <NButton
              v-for="field in availableBusinessFields"
              :key="field.key"
              secondary
              block
              class="justify-start"
              @click="addField(field)"
            >
              {{ field.label }}
            </NButton>
          </VueDraggable>
          <NEmpty v-if="!availableBusinessFields.length" description="没有可添加的业务字段" />
        </NCard>
        <NCard title="审批表单" size="small" embedded>
          <div class="flex-col gap-8px">
            <div
              v-for="field in fixedFields"
              :key="`fixed-${field.key}`"
              class="rounded border border-solid border-gray-200 p-10px"
            >
              <NFormItem :label="field.label" :required="field.required" class="mb-0">
                <slot
                  :name="`field-${field.key}`"
                  :field="field"
                  :value="valueOf(field)"
                  :update="(value: unknown) => updateValue(field, value)"
                >
                  <div v-if="field.type === 'CUSTOM' || field.type === 'ATTACHMENT'" class="text-12px text-gray-500">
                    请通过业务页面插槽提供此字段控件
                  </div>
                  <NInput
                    v-else-if="field.type === 'TEXT'"
                    :value="textValue(field)"
                    :placeholder="field.placeholder"
                    @update:value="value => updateValue(field, value)"
                  />
                  <NInput
                    v-else-if="field.type === 'TEXTAREA'"
                    :value="textValue(field)"
                    type="textarea"
                    :placeholder="field.placeholder"
                    @update:value="value => updateValue(field, value)"
                  />
                  <NInputNumber
                    v-else-if="field.type === 'NUMBER' || field.type === 'AMOUNT'"
                    :value="numberValue(field)"
                    class="w-full"
                    @update:value="value => updateValue(field, value)"
                  />
                  <NDatePicker
                    v-else-if="field.type === 'DATE'"
                    :value="numberValue(field)"
                    type="date"
                    class="w-full"
                    @update:value="value => updateValue(field, value)"
                  />
                  <NDatePicker
                    v-else-if="field.type === 'DATERANGE'"
                    :value="rangeValue(field)"
                    type="daterange"
                    class="w-full"
                    @update:value="value => updateValue(field, value)"
                  />
                  <NSelect
                    v-else-if="field.type === 'SELECT'"
                    :value="textValue(field)"
                    :options="field.options"
                    clearable
                    @update:value="value => updateValue(field, value)"
                  />
                  <NRadioGroup v-else :value="textValue(field)" @update:value="value => updateValue(field, value)">
                    <NSpace>
                      <NRadio v-for="option in field.options" :key="option.value" :value="option.value">
                        {{ option.label }}
                      </NRadio>
                    </NSpace>
                  </NRadioGroup>
                </slot>
              </NFormItem>
            </div>
            <VueDraggable
              v-model="selectedBusinessFields"
              item-key="key"
              :animation="150"
              :group="{ name: 'approval-submit-fields', pull: true, put: true }"
              class="min-h-160px flex-col gap-8px"
            >
              <div
                v-for="field in selectedBusinessFields"
                :key="field.key"
                class="rounded border border-dashed border-primary p-10px"
              >
                <div class="mb-4px flex items-center justify-between text-12px text-gray-500">
                  <span>业务字段 · {{ field.key }}</span>
                  <NButton text type="error" size="tiny" @click="removeField(field)">移除</NButton>
                </div>
                <NFormItem :label="field.label" :required="field.required" class="mb-0">
                  <slot
                    :name="`field-${field.key}`"
                    :field="field"
                    :value="valueOf(field)"
                    :update="(value: unknown) => updateValue(field, value)"
                  >
                    <div v-if="field.type === 'CUSTOM' || field.type === 'ATTACHMENT'" class="text-12px text-gray-500">
                      请通过业务页面插槽提供此字段控件
                    </div>
                    <NInput
                      v-else-if="field.type === 'TEXT'"
                      :value="textValue(field)"
                      :placeholder="field.placeholder"
                      @update:value="value => updateValue(field, value)"
                    />
                    <NInput
                      v-else-if="field.type === 'TEXTAREA'"
                      :value="textValue(field)"
                      type="textarea"
                      :placeholder="field.placeholder"
                      @update:value="value => updateValue(field, value)"
                    />
                    <NInputNumber
                      v-else-if="field.type === 'NUMBER' || field.type === 'AMOUNT'"
                      :value="numberValue(field)"
                      class="w-full"
                      @update:value="value => updateValue(field, value)"
                    />
                    <NDatePicker
                      v-else-if="field.type === 'DATE'"
                      :value="numberValue(field)"
                      type="date"
                      class="w-full"
                      @update:value="value => updateValue(field, value)"
                    />
                    <NDatePicker
                      v-else-if="field.type === 'DATERANGE'"
                      :value="rangeValue(field)"
                      type="daterange"
                      class="w-full"
                      @update:value="value => updateValue(field, value)"
                    />
                    <NSelect
                      v-else-if="field.type === 'SELECT'"
                      :value="textValue(field)"
                      :options="field.options"
                      clearable
                      @update:value="value => updateValue(field, value)"
                    />
                    <NRadioGroup v-else :value="textValue(field)" @update:value="value => updateValue(field, value)">
                      <NSpace>
                        <NRadio v-for="option in field.options" :key="option.value" :value="option.value">
                          {{ option.label }}
                        </NRadio>
                      </NSpace>
                    </NRadioGroup>
                  </slot>
                </NFormItem>
              </div>
            </VueDraggable>
          </div>
          <NEmpty
            v-if="!fixedFields.length && !selectedBusinessFields.length"
            description="从左侧选择需要提交的业务字段"
          />
        </NCard>
      </div>
    </NForm>
    <NCard v-if="flowPreview?.length" title="审批流程预览" size="small" embedded class="mt-12px">
      <NSteps vertical size="small">
        <NStep
          v-for="(node, index) in flowPreview"
          :key="node.id"
          :title="node.name"
          :description="node.approveMode === 'AND' ? '会签：所有审批人同意' : '或签：任一审批人同意'"
          :status="index === 0 ? 'process' : 'wait'"
        />
      </NSteps>
    </NCard>
    <template #footer>
      <NSpace justify="end">
        <NButton
          :disabled="submitting"
          @click="
            emit('cancel');
            visible = false;
          "
        >
          取消
        </NButton>
        <NButton type="primary" :loading="submitting" @click="submit">提交审批</NButton>
      </NSpace>
    </template>
  </NModal>
</template>
