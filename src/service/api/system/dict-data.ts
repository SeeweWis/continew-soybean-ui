import { request } from '@/service/request';

/** 获取字典项分页列表 */
export function fetchGetDictItemList(params: Api.System.ContinewDictItemQuery) {
  return request<Api.System.ContinewDictItemPage>({
    url: '/system/dict/item',
    method: 'get',
    params
  });
}

/** 新增字典项 */
export function fetchCreateDictItem(data: Api.System.ContinewDictItemReq) {
  return request<boolean>({
    url: '/system/dict/item',
    method: 'post',
    data
  });
}

/** 修改字典项 */
export function fetchUpdateDictItem(id: CommonType.IdType, data: Api.System.ContinewDictItemReq) {
  return request<boolean>({
    url: `/system/dict/item/${id}`,
    method: 'put',
    data
  });
}

/** 批量删除字典项 */
export function fetchBatchDeleteDictItem(ids: CommonType.IdType[]) {
  return request<boolean>({
    url: '/system/dict/item',
    method: 'delete',
    data: { ids }
  });
}
