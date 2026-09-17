import { request } from '@/service/request';

/** 获取客户端分页列表 */
export function fetchGetClientPage(params: Api.System.ContinewClientQuery) {
  return request<Api.System.ContinewClientPage>({
    url: '/system/client',
    method: 'get',
    params
  });
}

/** 新增客户端 */
export function fetchCreateClient(data: Api.System.ContinewClientReq) {
  return request<boolean>({
    url: '/system/client',
    method: 'post',
    data
  });
}

/** 修改客户端 */
export function fetchUpdateClient(id: CommonType.IdType, data: Api.System.ContinewClientReq) {
  return request<boolean>({
    url: `/system/client/${id}`,
    method: 'put',
    data
  });
}

/** 批量删除客户端 */
export function fetchBatchDeleteClient(ids: CommonType.IdType[]) {
  return request<boolean>({
    url: '/system/client',
    method: 'delete',
    data: { ids }
  });
}
