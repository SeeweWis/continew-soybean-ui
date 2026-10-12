<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { fileIconUrl } from './file-utils';

const props = defineProps<{ file: Api.System.ContinewFile }>();
const broken = ref(false);
watch(
  () => [props.file.id, props.file.thumbnailUrl, props.file.url],
  () => {
    broken.value = false;
  }
);
const icons: Record<string, string> = {
  mp3: 'music',
  mp4: 'video',
  ppt: 'ppt',
  pptx: 'ppt',
  doc: 'wps',
  docx: 'wps',
  xls: 'excel',
  xlsx: 'excel',
  pdf: 'pdf-color',
  txt: 'txt',
  rar: 'rar',
  zip: 'zip',
  html: 'html',
  css: 'css',
  js: 'js',
  json: 'json',
  java: 'java',
  sql: 'sql',
  vue: 'vue'
};
const src = computed(() => {
  if (props.file.type === 0) return fileIconUrl('file-dir');
  if (props.file.type === 2 && !broken.value && (props.file.thumbnailUrl || props.file.url)) {
    return props.file.thumbnailUrl || props.file.url;
  }
  return fileIconUrl(
    `file-${props.file.type === 2 ? 'image-color' : icons[props.file.extension?.toLowerCase() || ''] || 'other'}`
  );
});
</script>

<template>
  <img :src="src" alt="" class="file-icon" draggable="false" @error="broken = true" />
</template>

<style scoped>
.file-icon {
  width: 100%;
  height: 100%;
  object-fit: contain;
}
</style>
