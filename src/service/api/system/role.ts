import { request } from '@/service/request';

/** 获取角色列表 */
export function fetchGetRoleList(params?: Api.System.ContinewRoleQuery) {
  return request<Api.System.ContinewRole[]>({
    url: '/system/role/list',
    method: 'get',
    params
  });
}

/** 获取角色字典 */
export function fetchGetRoleDict() {
  return request<Api.System.LabelValue[]>({
    url: '/system/role/dict',
    method: 'get'
  });
}

/** 获取角色详情 */
export function fetchGetRoleDetail(id: CommonType.IdType) {
  return request<Api.System.ContinewRole>({
    url: `/system/role/${id}`,
    method: 'get'
  });
}

/** 新增角色 */
export function fetchCreateRole(data: Api.System.ContinewRoleReq) {
  return request<boolean>({
    url: '/system/role',
    method: 'post',
    data
  });
}

/** 修改角色 */
export function fetchUpdateRole(id: CommonType.IdType, data: Api.System.ContinewRoleReq) {
  return request<boolean>({
    url: `/system/role/${id}`,
    method: 'put',
    data
  });
}

/** 批量删除角色 */
export function fetchBatchDeleteRole(ids: CommonType.IdType[]) {
  return request<boolean>({
    url: '/system/role',
    method: 'delete',
    data: { ids }
  });
}

/** 获取角色功能权限树 */
export function fetchGetRolePermissionTree() {
  return request<Api.System.ContinewRolePermission[]>({
    url: '/system/role/permission/tree',
    method: 'get'
  });
}

/** 修改角色功能权限 */
export function fetchUpdateRolePermission(id: CommonType.IdType, data: Api.System.ContinewRolePermissionReq) {
  return request<boolean>({
    url: `/system/role/${id}/permission`,
    method: 'put',
    data
  });
}

/** 获取角色下用户分页列表 */
export function fetchGetRoleUserPage(id: CommonType.IdType, params: Api.System.ContinewRoleUserQuery) {
  return request<Api.System.ContinewRoleUserPage>({
    url: `/system/role/${id}/user`,
    method: 'get',
    params
  });
}

/** 角色分配用户 */
export function fetchAssignRoleUser(id: CommonType.IdType, userIds: CommonType.IdType[]) {
  return request<boolean>({
    url: `/system/role/${id}/user`,
    method: 'post',
    data: userIds
  });
}

/** 角色取消分配用户 */
export function fetchUnassignRoleUser(userIds: CommonType.IdType[]) {
  return request<boolean>({
    url: '/system/role/user',
    method: 'delete',
    data: userIds
  });
}
