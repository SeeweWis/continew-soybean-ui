import { request } from '@/service/request';

/** 获取租户套餐分页列表 */
export function fetchGetTenantPackagePage(params: Api.System.ContinewTenantPackageQuery) {
  return request<Api.System.ContinewTenantPackagePage>({
    url: '/tenant/package',
    method: 'get',
    params
  });
}

/** 获取租户套餐字典 */
export function fetchGetTenantPackageDict() {
  return request<Api.System.LabelValue[]>({
    url: '/tenant/package/dict',
    method: 'get'
  });
}

/** 获取套餐菜单树（全量） */
export function fetchGetTenantPackageMenuTree() {
  return request<Api.System.ContinewMenu[]>({
    url: '/tenant/package/menu/tree',
    method: 'get'
  });
}

/** 获取租户套餐详情 */
export function fetchGetTenantPackageDetail(id: CommonType.IdType) {
  return request<Api.System.ContinewTenantPackage>({
    url: `/tenant/package/${id}`,
    method: 'get'
  });
}

/** 新增租户套餐 */
export function fetchCreateTenantPackage(data: Api.System.ContinewTenantPackageReq) {
  return request<boolean>({
    url: '/tenant/package',
    method: 'post',
    data
  });
}

/** 修改租户套餐 */
export function fetchUpdateTenantPackage(id: CommonType.IdType, data: Api.System.ContinewTenantPackageReq) {
  return request<boolean>({
    url: `/tenant/package/${id}`,
    method: 'put',
    data
  });
}

/** 删除租户套餐 */
export function fetchDeleteTenantPackage(id: CommonType.IdType) {
  return request<boolean>({
    url: `/tenant/package/${id}`,
    method: 'delete'
  });
}
