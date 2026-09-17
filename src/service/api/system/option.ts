import { request } from '@/service/request';

/** 获取参数列表 */
export function fetchGetOptionList(category: string) {
  return request<Api.System.ContinewOption[]>({
    url: '/system/option',
    method: 'get',
    params: { category }
  });
}

/** 修改参数 */
export function fetchUpdateOptions(data: Api.System.ContinewOptionReq[]) {
  return request<boolean>({
    url: '/system/option',
    method: 'put',
    data
  });
}

/** 重置参数 */
export function fetchResetOptionValue(code: string[], category: string) {
  return request<boolean>({
    url: '/system/option/value',
    method: 'patch',
    data: { code, category }
  });
}
