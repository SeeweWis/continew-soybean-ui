import { request } from '@/service/request';
import { encrypt } from '@/utils/jsencrypt';

export function fetchGetContinewUserList(params: Api.System.ContinewUserQuery) {
  return request<Api.System.ContinewUserPage>({
    url: '/system/user',
    method: 'get',
    params
  });
}
/** 新增用户信息 */
export function fetchCreateUser(data: Api.System.ContinewUserReq) {
  return request<boolean>({
    url: '/system/user',
    method: 'post',
    data: data.password ? { ...data, password: encrypt(data.password) } : data
  });
}

/** 修改用户信息 */
export function fetchUpdateUser(id: CommonType.IdType, data: Api.System.ContinewUserReq) {
  return request<boolean>({
    url: `/system/user/${id}`,
    method: 'put',
    data
  });
}

/** 获取用户字典列表 */
export function fetchGetUserDict() {
  return request<Api.System.LabelValue[]>({
    url: '/system/user/dict',
    method: 'get'
  });
}

/** 批量删除用户信息 */
export function fetchBatchDeleteUser(userIds: CommonType.IdType[]) {
  return request<boolean>({
    url: '/system/user',
    method: 'delete',
    data: { ids: userIds }
  });
}

/** 重置用户密码 */
export function fetchResetUserPassword(userId: CommonType.IdType, password: string) {
  return request<boolean>({
    url: `/system/user/${userId}/password`,
    method: 'patch',
    headers: {
      repeatSubmit: false
    },
    data: { newPassword: encrypt(password) }
  });
}

/** 修改用户基本信息 */
export function fetchUpdateUserProfile(data: Api.System.UserProfileOperateParams) {
  return request<boolean>({
    url: '/system/user/profile',
    method: 'put',
    data
  });
}

/** 修改用户密码 */
export function fetchUpdateUserPassword(data: Api.System.UserPasswordOperateParams) {
  return request<boolean>({
    url: '/system/user/profile/updatePwd',
    method: 'put',
    headers: {
      isEncrypt: true
    },
    data
  });
}

/** 修改用户头像 */
export function fetchUpdateUserAvatar(formData: FormData) {
  return request<boolean>({
    url: '/system/user/profile/avatar',
    method: 'post',
    data: formData
  });
}
