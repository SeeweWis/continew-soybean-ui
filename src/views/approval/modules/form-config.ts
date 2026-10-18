export type FormFieldType = 'TEXT' | 'TEXTAREA' | 'NUMBER' | 'AMOUNT' | 'DATE' | 'DATERANGE' | 'SELECT' | 'RADIO';

export type FormOption = { label: string; value: string };

export type FormField = {
  id: string;
  key: string;
  label: string;
  type: FormFieldType;
  required: boolean;
  placeholder?: string;
  defaultValue?: unknown;
  validation?: { minLength?: number; maxLength?: number; min?: number; max?: number };
  options?: FormOption[];
};

export type FormConfig = { version: 1; fields: FormField[] };

export const fieldTypeOptions: Array<{ label: string; value: FormFieldType }> = [
  { label: '单行文本', value: 'TEXT' },
  { label: '多行文本', value: 'TEXTAREA' },
  { label: '数字', value: 'NUMBER' },
  { label: '金额', value: 'AMOUNT' },
  { label: '日期', value: 'DATE' },
  { label: '日期范围', value: 'DATERANGE' },
  { label: '下拉选择', value: 'SELECT' },
  { label: '单选', value: 'RADIO' }
];

export const defaultFormConfig = (): FormConfig => ({
  version: 1,
  fields: [
    {
      id: 'reason',
      key: 'reason',
      label: '申请说明',
      type: 'TEXTAREA',
      required: true,
      placeholder: '请填写申请原因',
      validation: { maxLength: 1000 }
    }
  ]
});

export function createField(type: FormFieldType = 'TEXT'): FormField {
  const id = `field_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const field: FormField = { id, key: id, label: '新字段', type, required: false, placeholder: '' };
  if (type === 'TEXTAREA') field.validation = { maxLength: 1000 };
  if (type === 'SELECT' || type === 'RADIO') field.options = [{ label: '选项 1', value: 'option_1' }];
  return field;
}

export function parseFormConfig(value?: string | null): FormConfig {
  if (!value?.trim()) return defaultFormConfig();
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    throw new Error('申请表单配置不是有效的 JSON');
  }
  if (!parsed || typeof parsed !== 'object' || !Array.isArray((parsed as { fields?: unknown }).fields)) {
    throw new Error('申请表单配置必须包含字段列表');
  }
  const fields = (parsed as { fields: unknown[] }).fields as FormField[];
  if (!fields.length) throw new Error('请至少添加一个申请字段');
  if (fields.length > 30) throw new Error('申请字段不能超过 30 个');
  return { version: 1, fields: fields.map(field => ({ ...field, required: Boolean(field.required) })) };
}

export function serializeFormConfig(config: FormConfig): string {
  validateFormConfig(config);
  return JSON.stringify(config);
}

export function validateFormConfig(config: FormConfig) {
  if (!config.fields.length) throw new Error('请至少添加一个申请字段');
  const keys = new Set<string>();
  config.fields.forEach(field => {
    if (!/^[A-Za-z][A-Za-z0-9_]{0,49}$/.test(field.key)) {
      throw new Error(`字段“${field.label || field.key}”的编码格式无效`);
    }
    if (keys.has(field.key)) throw new Error(`字段编码“${field.key}”重复`);
    keys.add(field.key);
    if (!field.label?.trim()) throw new Error('字段名称不能为空');
    if ((field.type === 'SELECT' || field.type === 'RADIO') && !field.options?.length) {
      throw new Error(`字段“${field.label}”必须配置选项`);
    }
  });
}

export function formValueDefaults(config: FormConfig): Record<string, unknown> {
  return Object.fromEntries(config.fields.map(field => [field.key, field.defaultValue ?? null]));
}

export function formFieldLabel(config: FormConfig | undefined, key: string) {
  return config?.fields.find(field => field.key === key)?.label ?? key;
}
