export const fileCategories = [
  { value: 0, label: '全部', icon: 'menu-file' },
  { value: 2, label: '图片', icon: 'file-image-color' },
  { value: 3, label: '文档', icon: 'file-txt' },
  { value: 4, label: '视频', icon: 'file-video-color' },
  { value: 5, label: '音频', icon: 'file-music' },
  { value: 1, label: '其他', icon: 'file-other' }
] as const;

export function fileTypeLabel(type?: number) {
  return type === 0 ? '文件夹' : fileCategories.find(item => item.value === type)?.label || '其他';
}

export function formatFileSize(size?: number | null) {
  if (size === undefined || size === null) return '-';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const index = size > 0 ? Math.min(Math.floor(Math.log(size) / Math.log(1024)), units.length - 1) : 0;
  return `${index ? (size / 1024 ** index).toFixed(2) : size} ${units[index]}`;
}

export function fileIconUrl(name: string) {
  return new URL(`../../../../assets/file-icons/${name}.svg`, import.meta.url).href;
}

export function downloadFile(file: Api.System.ContinewFile) {
  if (!file.url || !/^https?:\/\//i.test(new URL(file.url, window.location.href).href)) return;
  const link = document.createElement('a');
  link.href = file.url;
  link.download = file.originalName || file.name;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.click();
}
