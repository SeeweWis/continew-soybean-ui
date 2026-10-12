<script setup lang="ts">
import { computed, defineAsyncComponent, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useDraggable, useWindowSize } from '@vueuse/core';
import { downloadFile } from './file-utils';
import ButtonIcon from '@/components/custom/button-icon.vue';
import SvgIcon from './file-action-icon.vue';
import '@vue-office/docx/lib/index.css';
import '@vue-office/excel/lib/index.css';

const props = defineProps<{ file: Api.System.ContinewFile }>();
const emit = defineEmits<{ close: [] }>();
const Docx = defineAsyncComponent(() => import('@vue-office/docx'));
const Excel = defineAsyncComponent(() => import('@vue-office/excel'));
const Pdf = defineAsyncComponent(() => import('@vue-office/pdf'));
const extension = computed(() => props.file.extension?.toLowerCase());
const renderer = computed(() =>
  extension.value === 'docx'
    ? Docx
    : ['xls', 'xlsx'].includes(extension.value || '')
      ? Excel
      : extension.value === 'pdf'
        ? Pdf
        : undefined
);
const failed = ref(false);
const loading = ref(Boolean(renderer.value));
const audioHeader = ref<HTMLElement>();
const videoElement = ref<HTMLElement>();
let player: { destroy: () => void } | undefined;
onMounted(async () => {
  if (props.file.type !== 4) return;
  const { default: Player } = await import('xgplayer');
  await nextTick();
  if (!videoElement.value) return;
  const videoPlayer = new Player({
    el: videoElement.value,
    url: props.file.url || '',
    lang: 'zh-cn',
    autoplay: true,
    closeVideoClick: true,
    videoInit: true,
    width: '100%',
    height: '100%'
  });
  videoPlayer.on('error', () => {
    failed.value = true;
  });
  player = videoPlayer;
});
onBeforeUnmount(() => player?.destroy());
const { width, height } = useWindowSize();
const { x, y } = useDraggable(audioHeader, { initialValue: { x: Math.max(0, width.value - 320), y: 40 } });
const audioStyle = computed(() => ({
  left: `${Math.max(0, Math.min(x.value, width.value - 300))}px`,
  top: `${Math.max(0, Math.min(y.value, height.value - 125))}px`
}));
watch(
  () => props.file.id,
  () => {
    failed.value = false;
    loading.value = Boolean(renderer.value);
  }
);
</script>

<template>
  <NModal
    v-if="file.type === 5"
    :show="true"
    preset="card"
    class="file-audio-player"
    :style="audioStyle"
    :bordered="false"
    :mask="false"
    :block-scroll="false"
    :trap-focus="false"
    @update:show="emit('close')"
  >
    <template #header>
      <div ref="audioHeader" class="file-audio-header">
        <SvgIcon icon="lucide:music" />
        <span>{{ file.originalName || file.name }}</span>
      </div>
    </template>
    <audio :src="file.url" controls autoplay @error="failed = true" />
    <NAlert v-if="failed" type="error">音频加载失败</NAlert>
  </NModal>
  <NModal
    v-else
    :show="true"
    preset="card"
    :title="file.type === 4 ? '视频播放' : file.originalName || file.name"
    class="file-dialog preview-dialog"
    :bordered="false"
    @update:show="emit('close')"
  >
    <template #header-extra>
      <ButtonIcon text aria-label="打开文件" tooltip-content="打开文件" @click="downloadFile(file)">
        <SvgIcon icon="lucide:external-link" />
      </ButtonIcon>
    </template>
    <div v-if="file.type === 4" ref="videoElement" class="file-video" />
    <NSpin v-else :show="loading" class="document-preview">
      <component
        :is="renderer"
        v-if="renderer && !failed"
        :src="file.url"
        :options="{ xls: extension === 'xls' }"
        @rendered="loading = false"
        @error="
          failed = true;
          loading = false;
        "
      />
      <NEmpty v-else :description="failed ? '预览失败' : '此格式暂不支持在线预览'">
        <template #extra><NButton @click="downloadFile(file)">下载文件</NButton></template>
      </NEmpty>
    </NSpin>
    <NAlert v-if="failed && file.type === 4" type="error">
      视频加载失败
      <NButton text @click="downloadFile(file)">下载文件</NButton>
    </NAlert>
  </NModal>
</template>

<style scoped>
.document-preview {
  height: min(700px, calc(100dvh - 160px));
  overflow: auto;
}
.file-video {
  width: 100%;
  height: min(650px, calc(100dvh - 160px));
  background: black;
}
.file-audio-player {
  position: fixed;
  width: min(90vw, 300px);
  margin: 0;
}
.file-audio-header {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: move;
  touch-action: none;
}
.file-audio-header span {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.file-audio-player audio {
  width: 100%;
}
</style>
