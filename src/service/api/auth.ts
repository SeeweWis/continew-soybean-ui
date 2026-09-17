import { request } from '../request';

/** Get tenant list */
export function fetchTenantList() {
  return request<Api.Auth.LoginTenant>({
    url: '/auth/tenant/list',
    method: 'get'
  });
}

/** Get image code */
export function fetchCaptchaCode() {
  return request<Api.Auth.CaptchaCode>({
    url: '/captcha/image',
    method: 'get'
  });
}

/**
 * Login
 *
 * @param username User name
 * @param password Password
 */
export function fetchLogin(data: Api.Auth.LoginForm) {
  return request<Api.Auth.LoginToken>({
    url: '/auth/login',
    method: 'post',
    headers: {
      isToken: false,
      repeatSubmit: false
    },
    data
  });
}

/** Get user info */
export function fetchGetUserInfo() {
  return request<Api.Auth.UserInfo>({ url: '/auth/user/info' });
}

/** Logout */
export function fetchLogout() {
  if (import.meta.env.VITE_APP_SSE === 'Y') {
    request({
      url: '/resource/sse/close',
      method: 'get'
    });
  }
  return request({
    url: '/auth/logout',
    method: 'post'
  });
}
