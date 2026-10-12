import SparkMD5 from 'spark-md5';

// Worker postMessage uses a transfer list, not a Window target origin.
/* oxlint-disable unicorn/require-post-message-target-origin */
self.addEventListener('message', async (event: MessageEvent<File>) => {
  try {
    const hash = new SparkMD5.ArrayBuffer();
    const file = event.data;
    const size = 2 * 1024 * 1024;
    for (let offset = 0; offset < file.size; offset += size) {
      hash.append(await file.slice(offset, offset + size).arrayBuffer());
    }
    self.postMessage({ hash: hash.end() });
  } catch (error) {
    self.postMessage({ error: error instanceof Error ? error.message : '读取文件失败' });
  }
});
