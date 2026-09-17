import { request } from '@/service/request';

/** 获取短信配置分页列表 */
export function fetchGetSmsConfigPage(params: Api.System.ContinewSmsConfigQuery) {
  return request<Api.System.ContinewSmsConfigPage>({
    url: '/system/sms/config',
    method: 'get',
    params
  });
}

/** 获取短信配置详情 */
export function fetchGetSmsConfigDetail(id: CommonType.IdType) {
  return request<Api.System.ContinewSmsConfig>({
    url: `/system/sms/config/${id}`,
    method: 'get'
  });
}

/** 新增短信配置 */
export function fetchCreateSmsConfig(data: Api.System.ContinewSmsConfigReq) {
  return request<boolean>({
    url: '/system/sms/config',
    method: 'post',
    data
  });
}

/** 修改短信配置 */
export function fetchUpdateSmsConfig(id: CommonType.IdType, data: Api.System.ContinewSmsConfigReq) {
  return request<boolean>({
    url: `/system/sms/config/${id}`,
    method: 'put',
    data
  });
}

/** 批量删除短信配置 */
export function fetchBatchDeleteSmsConfig(ids: CommonType.IdType[]) {
  return request<boolean>({
    url: '/system/sms/config',
    method: 'delete',
    data: { ids }
  });
}

/** 设为默认短信配置 */
export function fetchSetDefaultSmsConfig(id: CommonType.IdType) {
  return request<boolean>({
    url: `/system/sms/config/${id}/default`,
    method: 'put'
  });
}
