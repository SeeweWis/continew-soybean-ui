import { request } from '@/service/request';

export function fetchApprovalDefinitions(params?: Api.Approval.DefinitionQuery) {
  return request<Api.Approval.Definition[]>({ url: '/approval/definition/list', method: 'get', params });
}

export function fetchApprovalDefinition(id: CommonType.IdType) {
  return request<Api.Approval.DefinitionDetail>({ url: `/approval/definition/${id}`, method: 'get' });
}

export function createApprovalDefinition(data: Api.Approval.DefinitionReq) {
  return request<CommonType.IdType>({ url: '/approval/definition', method: 'post', data });
}

export function updateApprovalDefinition(id: CommonType.IdType, data: Api.Approval.DefinitionReq) {
  return request<void>({ url: `/approval/definition/${id}`, method: 'put', data });
}

export function deleteApprovalDefinitions(ids: CommonType.IdType[]) {
  return request<void>({ url: '/approval/definition', method: 'delete', data: { ids } });
}

export function startApproval(data: Api.Approval.StartReq) {
  return request<CommonType.IdType>({ url: '/approval/instance/start', method: 'post', data });
}

export function cancelApproval(id: CommonType.IdType, reason?: string) {
  return request<void>({ url: `/approval/instance/cancel/${id}`, method: 'post', data: { reason } });
}

export function approveTask(id: CommonType.IdType, data: Api.Approval.OpinionReq) {
  return request<void>({ url: `/approval/task/approve/${id}`, method: 'post', data });
}

export function rejectTask(id: CommonType.IdType, data: Api.Approval.OpinionReq) {
  return request<void>({ url: `/approval/task/reject/${id}`, method: 'post', data });
}

export function transferTask(id: CommonType.IdType, data: Api.Approval.TransferReq) {
  return request<void>({ url: `/approval/task/transfer/${id}`, method: 'post', data });
}

export function fetchMyApprovalInstances(params: Api.Approval.InstanceQuery) {
  return request<Api.Approval.Page<Api.Approval.Instance>>({ url: '/approval/instance', method: 'get', params });
}

export function fetchMyApprovalTasks(params: Api.Approval.TaskQuery) {
  return request<Api.Approval.Page<Api.Approval.Task>>({ url: '/approval/task', method: 'get', params });
}

export function fetchApprovalDetail(id: CommonType.IdType) {
  return request<Api.Approval.Detail>({ url: `/approval/instance/${id}`, method: 'get' });
}
