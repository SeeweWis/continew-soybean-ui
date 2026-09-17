import { request } from '@/service/request';

/** 获取菜单树 */
export function fetchGetMenuTree(params?: Api.System.ContinewMenuQuery) {
  return request<Api.System.ContinewMenu[]>({
    url: '/system/menu/tree',
    method: 'get',
    params
  });
}

/** 新增菜单 */
export function fetchCreateMenu(data: Api.System.ContinewMenuReq) {
  return request<boolean>({
    url: '/system/menu',
    method: 'post',
    data
  });
}

/** 修改菜单 */
export function fetchUpdateMenu(id: CommonType.IdType, data: Api.System.ContinewMenuReq) {
  return request<boolean>({
    url: `/system/menu/${id}`,
    method: 'put',
    data
  });
}

/** 批量删除菜单 */
export function fetchBatchDeleteMenu(ids: CommonType.IdType[]) {
  return request<boolean>({
    url: '/system/menu',
    method: 'delete',
    data: { ids }
  });
}

/** 清除菜单缓存 */
export function fetchClearMenuCache() {
  return request<boolean>({
    url: '/system/menu/cache',
    method: 'delete'
  });
}
