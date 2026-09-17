import { request } from '@/service/request';

/** 获取在线用户分页列表 */
export function fetchGetOnlineUserPage(params: Api.Monitor.ContinewOnlineUserQuery) {
  return request<Api.Monitor.ContinewOnlineUserPage>({
    url: '/monitor/online',
    method: 'get',
    params
  });
}

/** 强退在线用户 */
export function fetchKickoutOnlineUser(token: string) {
  return request<boolean>({
    url: `/monitor/online/${token}`,
    method: 'delete'
  });
}
