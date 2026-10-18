<script setup lang="ts">
import type { FormConfig, FormField } from './form-config';

const props = withDefaults(
  defineProps<{ config: FormConfig; modelValue: Record<string, unknown>; readonly?: boolean }>(),
  { readonly: false }
);
const emit = defineEmits<{ 'update:modelValue': [Record<string, unknown>] }>();

function update(field: FormField, value: unknown) {
  emit('update:modelValue', { ...props.modelValue, [field.key]: value });
}

function valueOf(field: FormField) {
  return props.modelValue[field.key] ?? null;
}

function textValue(field: FormField) {
  const value = valueOf(field);
  return typeof value === 'string' ? value : null;
}

function numberValue(field: FormField) {
  const value = valueOf(field);
  return typeof value === 'number' ? value : null;
}

function rangeValue(field: FormField) {
  const value = valueOf(field);
  return Array.isArray(value) && value.length === 2 && value.every(item => typeof item === 'number')
    ? ([value[0], value[1]] as [number, number])
    : null;
}

function optionLabel(field: FormField, value: unknown) {
  if (field.type === 'DATE' && typeof value === 'number') return new Date(value).toLocaleDateString('zh-CN');
  if (field.type === 'DATERANGE' && Array.isArray(value)) {
    return value.map(item => typeof item === 'number' ? new Date(item).toLocaleDateString('zh-CN') : item).join(' 至 ');
  }
  if (Array.isArray(value)) return value.join(' 至 ');
  return field.options?.find(option => option.value === String(value))?.label ?? String(value ?? '—');
}
</script>

<template>
  <div class="flex-col gap-12px">
    <NFormItem v-for="field in config.fields" :key="field.id" :label="field.label" :required="field.required">
      <template v-if="readonly">
        <div class="min-h-34px flex items-center whitespace-pre-wrap break-all text-14px">
          {{ optionLabel(field, valueOf(field)) }}
        </div>
      </template>
      <NInput
        v-else-if="field.type === 'TEXT'"
        :value="textValue(field)"
        :placeholder="field.placeholder"
        :maxlength="field.validation?.maxLength"
        clearable
        @update:value="value => update(field, value)"
      />
      <NInput
        v-else-if="field.type === 'TEXTAREA'"
        :value="textValue(field)"
        type="textarea"
        :placeholder="field.placeholder"
        :maxlength="field.validation?.maxLength"
        show-count
        :autosize="{ minRows: 3, maxRows: 8 }"
        @update:value="value => update(field, value)"
      />
      <NInputNumber
        v-else-if="field.type === 'NUMBER' || field.type === 'AMOUNT'"
        :value="numberValue(field)"
        class="w-full"
        :min="field.validation?.min"
        :max="field.validation?.max"
        :precision="field.type === 'AMOUNT' ? 2 : undefined"
        :placeholder="field.placeholder"
        @update:value="value => update(field, value)"
      />
      <NDatePicker
        v-else-if="field.type === 'DATE'"
        :value="numberValue(field)"
        type="date"
        class="w-full"
        clearable
        @update:value="value => update(field, value)"
      />
      <NDatePicker
        v-else-if="field.type === 'DATERANGE'"
        :value="rangeValue(field)"
        type="daterange"
        class="w-full"
        clearable
        @update:value="value => update(field, value)"
      />
      <NSelect
        v-else-if="field.type === 'SELECT'"
        :value="textValue(field)"
        :options="field.options"
        :placeholder="field.placeholder || '请选择'"
        clearable
        @update:value="value => update(field, value)"
      />
      <NRadioGroup
        v-else-if="field.type === 'RADIO'"
        :value="textValue(field)"
        @update:value="value => update(field, value)"
      >
        <NSpace>
          <NRadio v-for="option in field.options" :key="option.value" :value="option.value">{{ option.label }}</NRadio>
        </NSpace>
      </NRadioGroup>
    </NFormItem>
  </div>
</template>
