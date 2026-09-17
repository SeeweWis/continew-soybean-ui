import { request } from '@/service/request';

/** 获取部门树 */
export function fetchGetDeptTree(params?: Api.System.ContinewDeptQuery) {
  return request<Api.Common.CommonTreeRecord>({
    url: '/system/dept/tree',
    method: 'get',
    params
  });
}

/** 新增部门 */
export function fetchCreateDept(data: Api.System.ContinewDeptReq) {
  return request<boolean>({
    url: '/system/dept',
    method: 'post',
    data
  });
}

/** 修改部门 */
export function fetchUpdateDept(id: CommonType.IdType, data: Api.System.ContinewDeptReq) {
  return request<boolean>({
    url: `/system/dept/${id}`,
    method: 'put',
    data
  });
}

/** 批量删除部门 */
export function fetchBatchDeleteDept(ids: CommonType.IdType[]) {
  return request<boolean>({
    url: '/system/dept',
    method: 'delete',
    data: { ids }
  });
}
