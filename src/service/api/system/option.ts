import { request } from '@/service/request';

/** 获取公开的网站配置，用于应用启动时展示品牌信息。 */
export function fetchGetSiteOptionDict() {
  return request<Api.System.LabelValue[]>({
    url: '/system/common/dict/option/site',
    method: 'get',
    headers: {
      isToken: false
    }
  });
}

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
