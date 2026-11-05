<script setup lang="ts">
import { computed, ref } from 'vue';
import { VueDraggable } from 'vue-draggable-plus';
import type { FormConfig, FormField, FormFieldType } from '../../modules/form-config';
import { createField, fieldTypeOptions, formValueDefaults, validateFormConfig } from '../../modules/form-config';
import FormRenderer from '../../modules/form-renderer.vue';

const props = defineProps<{ modelValue: FormConfig; readonly?: boolean }>();
const emit = defineEmits<{ 'update:modelValue': [FormConfig] }>();
const selectedId = ref<string>();
const previewData = ref<Record<string, unknown>>(formValueDefaults(props.modelValue));
const selected = computed(() => props.modelValue.fields.find(field => field.id === selectedId.value));
const selectedField = computed(() => selected.value || createField());

function update(config: FormConfig) {
  emit('update:modelValue', config);
}

function add(type: FormFieldType) {
  const field = createField(type);
  update({ ...props.modelValue, fields: [...props.modelValue.fields, field] });
  selectedId.value = field.id;
}

function cloneField(field: FormField) {
  return {
    ...field,
    id: `${field.id}_${Date.now()}`,
    key: `${field.key}_copy`,
    options: field.options?.map(option => ({ ...option }))
  };
}

function clonePalette(item: { value: FormFieldType }) {
  return createField(item.value);
}

function remove(field: FormField) {
  update({ ...props.modelValue, fields: props.modelValue.fields.filter(item => item.id !== field.id) });
  if (selectedId.value === field.id) selectedId.value = undefined;
}

function copy(field: FormField) {
  const clone = cloneField(field);
  const index = props.modelValue.fields.findIndex(item => item.id === field.id);
  const fields = [...props.modelValue.fields];
  fields.splice(index + 1, 0, clone);
  update({ ...props.modelValue, fields });
  selectedId.value = clone.id;
}

function updateField(patch: Partial<FormField>) {
  if (!selected.value) return;
  update({
    ...props.modelValue,
    fields: props.modelValue.fields.map(field => (field.id === selected.value?.id ? { ...field, ...patch } : field))
  });
}

function updateType(type: FormFieldType) {
  const field = selected.value;
  if (!field) return;
  const next = createField(type);
  updateField({ type, options: next.options, validation: next.validation });
}

function validate() {
  try {
    validateFormConfig(props.modelValue);
    return true;
  } catch (error) {
    window.$message?.error(error instanceof Error ? error.message : '请检查表单配置');
    return false;
  }
}

defineExpose({ validate });
</script>

<template>
  <div class="grid grid-cols-[150px_minmax(280px,1fr)_240px] gap-12px max-md:grid-cols-1">
    <NCard title="字段组件" size="small">
      <VueDraggable
        :model-value="fieldTypeOptions"
        item-key="value"
        :sort="false"
        :disabled="readonly"
        :group="{ name: 'approval-fields', pull: 'clone', put: false }"
        :clone="clonePalette"
        class="flex-col gap-8px"
      >
        <NButton
          v-for="item in fieldTypeOptions"
          :key="item.value"
          secondary
          :disabled="readonly"
          @click="add(item.value)"
        >
          {{ item.label }}
        </NButton>
      </VueDraggable>
      <div class="mt-12px text-12px text-gray-500">点击添加，也可以拖入中间画布排序。</div>
    </NCard>
    <NCard title="申请表单" size="small">
      <VueDraggable
        :model-value="modelValue.fields"
        item-key="id"
        :animation="150"
        :disabled="readonly"
        :group="{ name: 'approval-fields', pull: true, put: true }"
        :clone="cloneField"
        class="min-h-180px flex-col gap-8px"
        @update:model-value="(fields: FormField[]) => update({ ...modelValue, fields })"
        @add="event => (selectedId = modelValue.fields[event.newIndex!]?.id)"
      >
        <div
          v-for="field in modelValue.fields"
          :key="field.id"
          class="cursor-pointer rounded border border-solid p-10px"
          :class="selectedId === field.id ? 'border-primary bg-primary bg-opacity-10' : 'border-gray-200'"
          @click="selectedId = field.id"
        >
          <div class="flex items-center justify-between gap-8px">
            <span class="font-medium">{{ field.label }}</span>
            <NSpace v-if="!readonly" size="small">
              <NButton text size="tiny" @click.stop="copy(field)">复制</NButton>
              <NButton text type="error" size="tiny" @click.stop="remove(field)">删除</NButton>
            </NSpace>
          </div>
          <div class="mt-4px text-12px text-gray-500">
            {{ fieldTypeOptions.find(item => item.value === field.type)?.label }} · {{ field.key }}
          </div>
        </div>
      </VueDraggable>
      <NEmpty v-if="!modelValue.fields.length" description="从左侧添加字段" />
    </NCard>
    <NCard title="字段属性" size="small">
      <NEmpty v-if="!selected" description="请选择一个字段" />
      <NForm v-else :disabled="readonly" label-placement="top">
        <NFormItem label="字段名称" required>
          <NInput v-model:value="selectedField.label" @update:value="value => updateField({ label: value })" />
        </NFormItem>
        <NFormItem label="字段编码" required>
          <NInput v-model:value="selectedField.key" @update:value="value => updateField({ key: value })" />
        </NFormItem>
        <NFormItem label="字段类型">
          <NSelect :value="selectedField.type" :options="fieldTypeOptions" @update:value="updateType" />
        </NFormItem>
        <NFormItem label="提示文字">
          <NInput :value="selectedField.placeholder" @update:value="value => updateField({ placeholder: value })" />
        </NFormItem>
        <NCheckbox :checked="selectedField.required" @update:checked="value => updateField({ required: value })">
          必填
        </NCheckbox>
        <template v-if="selectedField.type === 'TEXT' || selectedField.type === 'TEXTAREA'">
          <NFormItem label="最大长度" class="mt-12px">
            <NInputNumber
              :value="selectedField.validation?.maxLength"
              :min="1"
              :max="5000"
              class="w-full"
              @update:value="
                value => updateField({ validation: { ...selectedField.validation, maxLength: value ?? undefined } })
              "
            />
          </NFormItem>
        </template>
        <template v-if="selectedField.type === 'NUMBER' || selectedField.type === 'AMOUNT'">
          <NFormItem label="最小值" class="mt-12px">
            <NInputNumber
              :value="selectedField.validation?.min"
              class="w-full"
              @update:value="
                value => updateField({ validation: { ...selectedField.validation, min: value ?? undefined } })
              "
            />
          </NFormItem>
          <NFormItem label="最大值">
            <NInputNumber
              :value="selectedField.validation?.max"
              class="w-full"
              @update:value="
                value => updateField({ validation: { ...selectedField.validation, max: value ?? undefined } })
              "
            />
          </NFormItem>
        </template>
        <template v-if="selectedField.type === 'SELECT' || selectedField.type === 'RADIO'">
          <NDivider title-placement="left">选项</NDivider>
          <div
            v-for="(option, index) in selectedField.options"
            :key="`${selectedField.id}-${index}`"
            class="mb-8px flex gap-4px"
          >
            <NInput v-model:value="option.label" placeholder="名称" />
            <NInput v-model:value="option.value" placeholder="值" />
            <NButton text type="error" @click="selectedField.options?.splice(index, 1)">删</NButton>
          </div>
          <NButton
            dashed
            block
            @click="
              selectedField.options?.push({
                label: `选项 ${(selectedField.options?.length ?? 0) + 1}`,
                value: `option_${Date.now()}`
              })
            "
          >
            添加选项
          </NButton>
        </template>
      </NForm>
    </NCard>
  </div>
  <NDivider title-placement="left">实时预览</NDivider>
  <NCard size="small" embedded>
    <FormRenderer v-model="previewData" :config="modelValue" />
  </NCard>
</template>
