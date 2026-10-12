import { request } from '@/service/request';
import { encryptPassword } from '@/utils/jsencrypt';

/** 获取租户分页列表 */
export function fetchGetTenantPage(params: Api.System.ContinewTenantQuery) {
  return request<Api.System.ContinewTenantPage>({
    url: '/tenant/management',
    method: 'get',
    params
  });
}

/** 获取租户详情 */
export function fetchGetTenantDetail(id: CommonType.IdType) {
  return request<Api.System.ContinewTenant>({
    url: `/tenant/management/${id}`,
    method: 'get'
  });
}

/** 新增租户 */
export function fetchCreateTenant(data: Api.System.ContinewTenantReq) {
  return request<boolean>({
    url: '/tenant/management',
    method: 'post',
    data
  });
}

/** 修改租户 */
export function fetchUpdateTenant(id: CommonType.IdType, data: Api.System.ContinewTenantReq) {
  return request<boolean>({
    url: `/tenant/management/${id}`,
    method: 'put',
    data
  });
}

/** 删除租户 */
export function fetchDeleteTenant(id: CommonType.IdType) {
  return request<boolean>({
    url: `/tenant/management/${id}`,
    method: 'delete'
  });
}

/** 重置租户管理员密码 */
export function fetchResetTenantAdminPwd(id: CommonType.IdType, newPassword: string) {
  return request<boolean>({
    url: `/tenant/management/${id}/admin/pwd`,
    method: 'put',
    data: { password: encryptPassword(newPassword) }
  });
}
