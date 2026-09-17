import { request } from '@/service/request';

/** 获取公告分页列表 */
export function fetchGetNoticePage(params: Api.System.ContinewNoticeQuery) {
  return request<Api.System.ContinewNoticePage>({
    url: '/system/notice',
    method: 'get',
    params
  });
}

/** 获取公告详情 */
export function fetchGetNoticeDetail(id: CommonType.IdType) {
  return request<Api.System.ContinewNotice>({
    url: `/system/notice/${id}`,
    method: 'get'
  });
}

/** 新增公告 */
export function fetchCreateNotice(data: Api.System.ContinewNoticeReq) {
  return request<boolean>({
    url: '/system/notice',
    method: 'post',
    data
  });
}

/** 修改公告 */
export function fetchUpdateNotice(id: CommonType.IdType, data: Api.System.ContinewNoticeReq) {
  return request<boolean>({
    url: `/system/notice/${id}`,
    method: 'put',
    data
  });
}

/** 批量删除公告 */
export function fetchBatchDeleteNotice(ids: CommonType.IdType[]) {
  return request<boolean>({
    url: '/system/notice',
    method: 'delete',
    data: { ids }
  });
}
