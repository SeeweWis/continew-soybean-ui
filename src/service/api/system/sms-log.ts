import { request } from '@/service/request';

/** 获取短信日志分页列表 */
export function fetchGetSmsLogPage(params: Api.System.ContinewSmsLogQuery) {
  return request<Api.System.ContinewSmsLogPage>({
    url: '/system/sms/log',
    method: 'get',
    params
  });
}

/** 批量删除短信日志 */
export function fetchBatchDeleteSmsLog(ids: CommonType.IdType[]) {
  return request<boolean>({
    url: '/system/sms/log',
    method: 'delete',
    data: { ids }
  });
}
