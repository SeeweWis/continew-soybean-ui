import { request } from '@/service/request';
import { encrypt, encryptPassword } from '@/utils/jsencrypt';

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

export function fetchParseUserImport(file: File) {
  const data = new FormData();
  data.append('file', file);
  return request<Api.System.UserImportParseResp>({ url: '/system/user/import/parse', method: 'post', data });
}

export function fetchImportUsers(data: Api.System.UserImportReq) {
  return request<Api.System.UserImportResp>({ url: '/system/user/import', method: 'post', data });
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
  return request<void>({
    url: '/user/profile/basic/info',
    method: 'patch',
    data
  });
}

/** 修改用户密码 */
export function fetchUpdateUserPassword(data: Api.System.UserPasswordOperateParams) {
  return request<void>({
    url: '/user/profile/password',
    method: 'patch',
    data: {
      oldPassword: data.oldPassword ? encryptPassword(data.oldPassword) : undefined,
      newPassword: encryptPassword(data.newPassword)
    }
  });
}

/** 修改用户头像 */
export function fetchUpdateUserAvatar(formData: FormData) {
  return request<{ avatar: string }>({
    url: '/user/profile/avatar',
    method: 'patch',
    data: formData
  });
}

export function fetchUpdateUserEmail(data: { email: string; captcha: string; oldPassword: string }) {
  return request<void>({
    url: '/user/profile/email',
    method: 'patch',
    data: { ...data, oldPassword: encryptPassword(data.oldPassword) }
  });
}

export function fetchUpdateUserPhone(data: { phone: string; captcha: string; oldPassword: string }) {
  return request<void>({
    url: '/user/profile/phone',
    method: 'patch',
    data: { ...data, oldPassword: encryptPassword(data.oldPassword) }
  });
}
