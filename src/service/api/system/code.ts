import { request } from '@/service/request';

/** 获取代码生成表配置分页列表 */
export function fetchGetGenConfigPage(params: { page: number; size: number; tableName?: string | null }) {
  return request<Api.Code.GenConfigPage>({
    url: '/code/generator/config',
    method: 'get',
    params
  });
}
