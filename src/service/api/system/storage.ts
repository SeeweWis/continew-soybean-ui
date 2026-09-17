import { request } from '@/service/request';

/** 获取存储列表 */
export function fetchGetStorageList() {
  return request<Api.System.ContinewStorage[]>({
    url: '/system/storage/list',
    method: 'get'
  });
}

/** 新增存储 */
export function fetchCreateStorage(data: Api.System.ContinewStorageReq) {
  return request<boolean>({
    url: '/system/storage',
    method: 'post',
    data
  });
}

/** 修改存储 */
export function fetchUpdateStorage(id: CommonType.IdType, data: Api.System.ContinewStorageReq) {
  return request<boolean>({
    url: `/system/storage/${id}`,
    method: 'put',
    data
  });
}

/** 批量删除存储 */
export function fetchBatchDeleteStorage(ids: CommonType.IdType[]) {
  return request<boolean>({
    url: '/system/storage',
    method: 'delete',
    data: { ids }
  });
}

/** 修改存储状态 */
export function fetchUpdateStorageStatus(id: CommonType.IdType, status: 1 | 2) {
  return request<boolean>({
    url: `/system/storage/${id}/status`,
    method: 'put',
    data: { status }
  });
}

/** 设为默认存储 */
export function fetchSetDefaultStorage(id: CommonType.IdType) {
  return request<boolean>({
    url: `/system/storage/${id}/default`,
    method: 'put'
  });
}
