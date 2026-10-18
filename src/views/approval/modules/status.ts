import type { TagProps } from 'naive-ui';

export const statusLabels: Record<Api.Approval.Status, string> = {
  PENDING: '审批中',
  IN_PROGRESS: '审批中',
  APPROVED: '已通过',
  REJECTED: '已拒绝',
  CANCELLED: '已撤销',
  TRANSFERRED: '已转办'
};
export const statusTypes: Record<Api.Approval.Status, TagProps['type']> = {
  PENDING: 'warning',
  IN_PROGRESS: 'warning',
  APPROVED: 'success',
  REJECTED: 'error',
  CANCELLED: 'default',
  TRANSFERRED: 'info'
};
export const actionLabels: Record<Api.Approval.History['action'], string> = {
  START: '发起审批',
  APPROVE: '同意',
  REJECT: '拒绝',
  TRANSFER: '转办',
  CANCEL: '撤销'
};
