import { request } from '../request';

/** get routes */
export function fetchGetRoutes() {
  return request<Api.Auth.Route[]>({ url: '/auth/user/route' });
}
