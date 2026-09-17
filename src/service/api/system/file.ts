import { request } from '@/service/request';

/** 获取文件分页列表 */
export function fetchGetFilePage(params: Api.System.ContinewFileQuery) {
  return request<Api.System.ContinewFilePage>({
    url: '/system/file',
    method: 'get',
    params
  });
}

/** 上传文件（普通上传，multipart/form-data） */
export function fetchUploadFile(file: File, parentPath?: string, uploadTaskId?: string) {
  const formData = new FormData();
  formData.append('file', file);
  return request<Api.System.ContinewFileUploadResp>({
    url: '/system/file/upload',
    method: 'post',
    headers: {
      repeatSubmit: false
    },
    params: { parentPath, uploadTaskId },
    data: formData
  });
}

/** 获取上传进度 */
export function fetchGetUploadProgress(uploadTaskId: string) {
  return request<Api.System.ContinewUploadProgress>({
    url: `/system/file/upload/progress/${uploadTaskId}`,
    method: 'get'
  });
}

/** 批量删除文件 */
export function fetchBatchDeleteFile(ids: CommonType.IdType[]) {
  return request<boolean>({
    url: '/system/file',
    method: 'delete',
    data: { ids }
  });
}

/** 初始化分片上传 */
export function fetchInitMultipartUpload(data: {
  fileName: string;
  fileSize: number;
  fileMd5: string;
  contentType?: string;
  parentPath?: string;
}) {
  return request<Api.System.ContinewMultipartInitResp>({
    url: '/system/multipart-upload/init',
    method: 'post',
    data
  });
}

/** 上传分片 */
export function fetchUploadMultipartPart(params: { uploadId: string; partNumber: number; path: string }, file: Blob) {
  const formData = new FormData();
  formData.append('file', file);
  return request<boolean>({
    url: '/system/multipart-upload/part',
    method: 'post',
    headers: {
      repeatSubmit: false
    },
    params,
    data: formData
  });
}

/** 完成分片上传 */
export function fetchCompleteMultipartUpload(uploadId: string) {
  return request<boolean>({
    url: `/system/multipart-upload/complete/${uploadId}`,
    method: 'get'
  });
}

/** 取消分片上传 */
export function fetchCancelMultipartUpload(uploadId: string) {
  return request<boolean>({
    url: `/system/multipart-upload/cancel/${uploadId}`,
    method: 'get'
  });
}
