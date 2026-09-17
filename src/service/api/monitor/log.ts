import { request } from '@/service/request';

/** 获取系统日志分页列表 */
export function fetchGetLogPage(params: Api.Monitor.ContinewLogQuery) {
  return request<Api.Monitor.ContinewLogPage>({
    url: '/system/log',
    method: 'get',
    params
  });
}

/** 获取系统日志详情 */
export function fetchGetLogDetail(id: CommonType.IdType) {
  return request<Api.Monitor.ContinewLogDetail>({
    url: `/system/log/${id}`,
    method: 'get'
  });
}
