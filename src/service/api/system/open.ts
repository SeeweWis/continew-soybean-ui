import { request } from '@/service/request';

/** 获取开放应用分页列表 */
export function fetchGetOpenAppPage(params: Api.Open.OpenAppQuery) {
  return request<Api.Open.OpenAppPage>({
    url: '/open/app',
    method: 'get',
    params
  });
}

/** 新增开放应用 */
export function fetchCreateOpenApp(data: { name: string; description?: string; expireTime?: string }) {
  return request<CommonType.IdType>({
    url: '/open/app',
    method: 'post',
    data
  });
}

/** 删除开放应用 */
export function fetchBatchDeleteOpenApp(ids: CommonType.IdType[]) {
  return request<boolean>({
    url: '/open/app',
    method: 'delete',
    data: { ids }
  });
}

/** 获取应用密钥 */
export function fetchGetOpenAppSecret(id: CommonType.IdType) {
  return request<{ accessKey: string; secretKey: string }>({
    url: `/open/app/${id}/secret`,
    method: 'get'
  });
}
