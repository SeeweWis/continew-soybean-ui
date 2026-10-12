import { request } from '../request';
import { getToken } from '@/store/modules/auth/shared';
import { verifyBehaviorCaptcha } from '@/hooks/business/behavior-captcha';

/** Restore/rotate a browser session using its HttpOnly refresh cookie. */
export function fetchRefreshToken() {
  return request<Api.Auth.LoginToken>({
    url: '/auth/refresh',
    method: 'post',
    headers: { isToken: false, repeatSubmit: false }
  });
}

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

/** Send an SMS login code. */
export async function fetchSmsCaptcha(phone: string) {
  const captchaVerification = await verifyBehaviorCaptcha();
  if (!captchaVerification) return { error: new Error('验证已取消') };
  return request<void>({
    url: '/captcha/sms',
    method: 'get',
    params: { phone, captchaType: 'blockPuzzle', captchaVerification },
    headers: { isToken: false }
  });
}

/** Send an email login code. */
export async function fetchEmailCaptcha(email: string) {
  const captchaVerification = await verifyBehaviorCaptcha();
  if (!captchaVerification) return { error: new Error('验证已取消') };
  return request<void>({
    url: '/captcha/mail',
    method: 'get',
    params: { email, captchaType: 'blockPuzzle', captchaVerification },
    headers: { isToken: false }
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
export function fetchLogout(token = getToken()) {
  if (import.meta.env.VITE_APP_SSE === 'Y') {
    request({
      url: '/resource/sse/close',
      method: 'get'
    });
  }
  return request({
    url: '/auth/logout',
    method: 'post',
    headers: { isToken: false, repeatSubmit: false, Authorization: token ? `Bearer ${token}` : undefined }
  });
}
