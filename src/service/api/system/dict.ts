import { request } from '@/service/request';

/** 查询公共字典（标签-值集合） */
export function fetchGetCommonDict(code: string) {
  return request<Api.System.LabelValue[]>({
    url: `/system/common/dict/${code}`,
    method: 'get'
  });
}

/** 获取字典列表 */
export function fetchGetDictList(params?: Api.System.ContinewDictQuery) {
  return request<Api.System.ContinewDict[]>({
    url: '/system/dict/list',
    method: 'get',
    params
  });
}

/** 新增字典 */
export function fetchCreateDict(data: Api.System.ContinewDictReq) {
  return request<boolean>({
    url: '/system/dict',
    method: 'post',
    data
  });
}

/** 修改字典 */
export function fetchUpdateDict(id: CommonType.IdType, data: Api.System.ContinewDictReq) {
  return request<boolean>({
    url: `/system/dict/${id}`,
    method: 'put',
    data
  });
}

/** 批量删除字典 */
export function fetchBatchDeleteDict(ids: CommonType.IdType[]) {
  return request<boolean>({
    url: '/system/dict',
    method: 'delete',
    data: { ids }
  });
}

/** 清除指定字典缓存 */
export function fetchClearDictCache(code: string) {
  return request<boolean>({
    url: `/system/dict/cache/${code}`,
    method: 'delete'
  });
}
