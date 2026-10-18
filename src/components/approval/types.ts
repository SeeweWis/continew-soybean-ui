export type ApprovalSubmitFieldType =
  | 'TEXT'
  | 'TEXTAREA'
  | 'NUMBER'
  | 'AMOUNT'
  | 'DATE'
  | 'DATERANGE'
  | 'SELECT'
  | 'RADIO'
  | 'ATTACHMENT'
  | 'CUSTOM';

export type ApprovalSubmitOption = { label: string; value: string };

export type ApprovalSubmitField = {
  key: string;
  label: string;
  type: ApprovalSubmitFieldType;
  required?: boolean;
  placeholder?: string;
  value?: unknown;
  options?: ApprovalSubmitOption[];
  description?: string;
};

export type ApprovalSubmitPayload = {
  title: string;
  values: Record<string, unknown>;
  businessFieldKeys: string[];
};
