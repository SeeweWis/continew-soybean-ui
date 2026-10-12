import { markRaw, onBeforeUnmount, ref } from 'vue';
import {
  fetchCancelMultipartUpload,
  fetchCompleteMultipartUpload,
  fetchGetFileUploadConfig,
  fetchGetUploadProgress,
  fetchInitMultipartUpload,
  fetchUploadFile,
  fetchUploadMultipartPart
} from '@/service/api/system/file';

export type UploadStatus = 'waiting' | 'uploading' | 'paused' | 'completed' | 'failed' | 'cancelled';
export interface FileTask {
  id: string;
  file: File;
  parentPath: string;
  progress: number;
  status: UploadStatus;
  phase?: 'hashing' | 'finalizing';
  error?: string;
}
interface Session {
  init?: Api.System.ContinewMultipartInitResp;
  parts: Set<number>;
  controller?: AbortController;
  running: boolean;
}

export function useFileUpload(rootPath: string) {
  const tasks = ref<FileTask[]>([]);
  const config = ref<Api.System.ContinewFileUploadConfig>();
  const loadingConfig = ref(false);
  const configError = ref(false);
  const sessions = new Map<string, Session>();
  let disposed = false;

  async function loadConfig() {
    loadingConfig.value = true;
    configError.value = false;
    const { data, error } = await fetchGetFileUploadConfig();
    loadingConfig.value = false;
    if (error || !data || !(data.multipartUploadThreshold >= 0) || !(data.multipartUploadPartSize > 0)) {
      configError.value = true;
      return;
    }
    config.value = data;
  }

  function addFiles(files: Iterable<File>) {
    for (const file of files) {
      if (!file.size) {
        window.$message?.warning(`不能上传空文件：${file.name}`);
        continue;
      }
      const relative = file.webkitRelativePath?.split('/').slice(0, -1).join('/');
      const parentPath = `${rootPath || '/'}${relative ? `/${relative}` : ''}`.replace(/\/{2,}/g, '/');
      if (parentPath.split('/').some(part => part === '..' || part === '.')) continue;
      if (
        tasks.value.some(
          task => task.file.name === file.name && task.parentPath === parentPath && task.status !== 'cancelled'
        )
      ) {
        window.$message?.warning(`文件已在任务列表：${file.name}`);
        continue;
      }
      const id = crypto.randomUUID();
      tasks.value.push({ id, file: markRaw(file), parentPath, progress: 0, status: 'waiting' });
      sessions.set(id, { running: false, parts: new Set() });
    }
  }

  function hashFile(file: File, signal: AbortSignal): Promise<string> {
    return new Promise((resolve, reject) => {
      const worker = new Worker(new URL('./md5.worker.ts', import.meta.url), { type: 'module' });
      function cleanup() {
        worker.terminate();
        signal.removeEventListener('abort', abort);
      }
      function abort() {
        cleanup();
        reject(new Error('上传已暂停或取消'));
      }
      worker.addEventListener(
        'message',
        event => {
          cleanup();
          if (event.data.error) reject(new Error(event.data.error));
          else resolve(event.data.hash);
        },
        { once: true }
      );
      worker.addEventListener(
        'error',
        () => {
          cleanup();
          reject(new Error('计算 MD5 失败'));
        },
        { once: true }
      );
      signal.addEventListener('abort', abort, { once: true });
      if (signal.aborted) abort();
      // Worker messages have no targetOrigin argument.
      // oxlint-disable-next-line unicorn/require-post-message-target-origin
      else worker.postMessage(file);
    });
  }

  async function normalUpload(task: FileTask, session: Session, signal: AbortSignal) {
    const uploadTaskId = crypto.randomUUID();
    let done = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    async function poll() {
      if (done || signal.aborted) return;
      const { data } = await fetchGetUploadProgress(uploadTaskId, signal);
      if (!done && !signal.aborted && data) {
        task.progress = Math.max(task.progress, Math.min(99, data.percentage || 0));
        if (data.status === 'FINALIZING') task.phase = 'finalizing';
      }
      if (!done && !signal.aborted) timer = setTimeout(poll, 500);
    }
    timer = setTimeout(poll, 350);
    try {
      const { error } = await fetchUploadFile(task.file, task.parentPath, uploadTaskId, signal);
      if (error) throw new Error(error.response?.data?.msg || '文件上传失败');
      // A successful response is authoritative even if pause raced with completion.
      task.status = 'completed';
      task.progress = 100;
    } finally {
      done = true;
      clearTimeout(timer);
      session.controller?.abort();
    }
  }

  async function multipartUpload(task: FileTask, session: Session, signal: AbortSignal) {
    if (!session.init) {
      task.phase = 'hashing';
      const fileMd5 = await hashFile(task.file, signal);
      if (signal.aborted) return;
      task.phase = undefined;
      // Keep init alive so a late session can be cancelled or used after resume.
      const { data, error } = await fetchInitMultipartUpload({
        fileName: task.file.name,
        fileSize: task.file.size,
        fileMd5,
        contentType: task.file.type || undefined,
        parentPath: task.parentPath,
        metaData: { originalName: task.file.name }
      });
      if (error || !data) throw new Error(error?.response?.data?.msg || '初始化分片上传失败');
      session.init = data;
      session.parts = new Set(data.uploadedPartNumbers || []);
      if (disposed || task.status === 'cancelled' || !sessions.has(task.id)) {
        await fetchCancelMultipartUpload(data.uploadId);
        return;
      }
    }
    const { uploadId, path, partSize } = session.init;
    if (!Number.isFinite(partSize) || partSize <= 0) throw new Error('服务端返回的分片大小无效');
    const partCount = Math.ceil(task.file.size / partSize);
    const updateProgress = () => {
      let bytes = 0;
      for (const part of session.parts) {
        if (part >= 1 && part <= partCount) bytes += Math.min(partSize, task.file.size - (part - 1) * partSize);
      }
      task.progress = Math.min(99, Math.round((bytes / task.file.size) * 100));
    };
    updateProgress();
    for (let partNumber = 1; partNumber <= partCount; partNumber += 1) {
      if (signal.aborted || disposed) return;
      if (session.parts.has(partNumber)) continue;
      const blob = task.file.slice((partNumber - 1) * partSize, partNumber * partSize);
      const { data, error } = await fetchUploadMultipartPart({ uploadId, partNumber, path }, blob, signal);
      if (error || !data?.success) throw new Error(data?.errorMessage || error?.response?.data?.msg || '分片上传失败');
      session.parts.add(partNumber);
      updateProgress();
    }
    if (signal.aborted || disposed) return;
    task.phase = 'finalizing';
    const { error } = await fetchCompleteMultipartUpload(uploadId);
    if (error) throw new Error(error.response?.data?.msg || '合并分片失败');
    session.init = undefined;
    task.status = 'completed';
    task.progress = 100;
  }

  async function run(task: FileTask, session: Session) {
    session.running = true;
    session.controller = new AbortController();
    const signal = session.controller.signal;
    task.status = 'uploading';
    task.error = undefined;
    try {
      if (task.file.size > config.value!.multipartUploadThreshold) await multipartUpload(task, session, signal);
      else await normalUpload(task, session, signal);
    } catch (error) {
      if (!signal.aborted && task.status === 'uploading') {
        task.status = 'failed';
        task.error = error instanceof Error ? error.message : '上传失败';
      }
    } finally {
      task.phase = undefined;
      session.running = false;
      session.controller = undefined;
      pump();
    }
  }

  // One file at a time matches the original page's uploader configuration.
  const queued = new Set<string>();
  function pump() {
    if (disposed || !config.value || [...sessions.values()].some(session => session.running)) return;
    const task = tasks.value.find(item => queued.has(item.id) && item.status === 'waiting');
    if (!task) return;
    queued.delete(task.id);
    void run(task, sessions.get(task.id)!);
  }
  function startTask(task: FileTask) {
    if (!config.value || task.status === 'completed' || task.status === 'cancelled') return;
    if (task.status === 'uploading') return;
    task.status = 'waiting';
    queued.add(task.id);
    pump();
  }
  function startAll() {
    for (const task of tasks.value) {
      if (['waiting', 'paused', 'failed'].includes(task.status)) {
        task.status = 'waiting';
        queued.add(task.id);
      }
    }
    pump();
  }
  function pauseTask(task: FileTask) {
    if (task.phase === 'finalizing') return;
    task.status = 'paused';
    queued.delete(task.id);
    sessions.get(task.id)?.controller?.abort();
    if (!sessions.get(task.id)?.init) task.progress = 0;
  }
  async function cancelTask(task: FileTask) {
    if (task.phase === 'finalizing') return false;
    task.status = 'cancelled';
    queued.delete(task.id);
    const session = sessions.get(task.id);
    session?.controller?.abort();
    if (session?.init) {
      const { error } = await fetchCancelMultipartUpload(session.init.uploadId);
      if (error) {
        task.error = '清理分片失败，请重试取消';
        return false;
      }
      session.init = undefined;
    }
    return true;
  }
  async function removeTask(task: FileTask) {
    if (!(await cancelTask(task))) return;
    sessions.delete(task.id);
    tasks.value = tasks.value.filter(item => item.id !== task.id);
  }
  async function clearTasks() {
    await Promise.all(tasks.value.map(removeTask));
    return tasks.value.length === 0;
  }
  onBeforeUnmount(() => {
    disposed = true;
    for (const session of sessions.values()) session.controller?.abort();
    for (const task of tasks.value) {
      if (task.status !== 'completed') void cancelTask(task);
    }
  });
  return {
    tasks,
    config,
    loadingConfig,
    configError,
    loadConfig,
    addFiles,
    startTask,
    startAll,
    pauseTask,
    cancelTask,
    removeTask,
    clearTasks
  };
}
