import { request } from '@/service/request';

/** 获取当前用户社交绑定列表 */
export function fetchSocialList() {
  return request<Api.System.ContinewSocial[]>({
    url: '/user/profile/social',
    method: 'get'
  });
}

/** 获取社交授权地址 */
export function fetchGetSocialAuthorizeUrl(source: string) {
  return request<{ authorizeUrl: string }>({
    url: `/auth/${source}`,
    method: 'get'
  });
}

/** 解绑社交账号 */
export function fetchSocialUnbind(source: string) {
  return request<boolean>({
    url: `/user/profile/social/${source}`,
    method: 'delete'
  });
}
