import { request } from '@/service/request';

/** 获取文件分页列表 */
export function fetchGetFilePage(params: Api.System.ContinewFileQuery) {
  return request<Api.System.ContinewFilePage>({
    url: '/system/file',
    method: 'get',
    params: {
      ...params,
      type: params.type ?? undefined,
      parentPath: params.parentPath ?? undefined,
      originalName: params.originalName || undefined
    }
  });
}

/** 上传文件（普通上传，multipart/form-data） */
export function fetchUploadFile(file: File, parentPath?: string, uploadTaskId?: string, signal?: AbortSignal) {
  const formData = new FormData();
  formData.append('file', file);
  return request<Api.System.ContinewFileUploadResp>({
    url: '/system/file/upload',
    method: 'post',
    signal,
    timeout: 0,
    headers: {
      repeatSubmit: false
    },
    params: { parentPath, uploadTaskId },
    data: formData
  });
}

/** 获取上传进度 */
export function fetchGetUploadProgress(uploadTaskId: string, signal?: AbortSignal) {
  return request<Api.System.ContinewUploadProgress>({
    url: `/system/file/upload/progress/${uploadTaskId}`,
    method: 'get',
    signal
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
  metaData?: Record<string, string>;
}) {
  return request<Api.System.ContinewMultipartInitResp>({
    url: '/system/multipart-upload/init',
    method: 'post',
    headers: { repeatSubmit: false },
    data
  });
}

/** 上传分片 */
export function fetchUploadMultipartPart(
  params: { uploadId: string; partNumber: number; path: string },
  file: Blob,
  signal?: AbortSignal
) {
  const formData = new FormData();
  formData.append('file', file);
  return request<Api.System.ContinewMultipartPartResp>({
    url: '/system/multipart-upload/part',
    method: 'post',
    signal,
    timeout: 0,
    headers: {
      repeatSubmit: false
    },
    params,
    data: formData
  });
}

/** 完成分片上传 */
export function fetchCompleteMultipartUpload(uploadId: string) {
  return request<Api.System.ContinewFile>({
    url: `/system/multipart-upload/complete/${uploadId}`,
    method: 'get'
  });
}

/** 取消分片上传 */
export function fetchCancelMultipartUpload(uploadId: string) {
  return request<void>({
    url: `/system/multipart-upload/cancel/${uploadId}`,
    method: 'get'
  });
}

export function fetchGetFileUploadConfig() {
  return request<Api.System.ContinewFileUploadConfig>({ url: '/system/file/upload/config/default' });
}

export function fetchGetFileStatistics() {
  return request<Api.System.ContinewFileStatistics>({ url: '/system/file/statistics' });
}

export function fetchCreateFileDir(data: { originalName: string; parentPath: string }) {
  return request<Api.System.ContinewFile>({ url: '/system/file/dir', method: 'post', data });
}

export function fetchRenameFile(id: CommonType.IdType, originalName: string) {
  return request<void>({ url: `/system/file/${id}`, method: 'put', data: { originalName } });
}

export function fetchCalcFileDirSize(id: CommonType.IdType) {
  return request<{ size: number }>({ url: `/system/file/dir/${id}/size` });
}

export function fetchGetFileRecyclePage(params: Api.System.ContinewFileQuery) {
  return request<Api.System.ContinewFilePage>({ url: '/system/file/recycle', params });
}

export function fetchRestoreFile(id: CommonType.IdType) {
  return request<void>({ url: `/system/file/recycle/restore/${id}`, method: 'put' });
}

export function fetchDeleteRecycleFile(id: CommonType.IdType) {
  return request<void>({ url: `/system/file/recycle/${id}`, method: 'delete' });
}

export function fetchCleanFileRecycle() {
  return request<void>({ url: '/system/file/recycle/clean', method: 'delete' });
}
