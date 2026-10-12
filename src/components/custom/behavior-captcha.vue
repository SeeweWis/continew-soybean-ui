<script setup lang="ts">
import { onMounted, ref } from 'vue';
import CryptoJS from 'crypto-js';
import { request } from '@/service/request';
import { encryptWithAes } from '@/utils/crypto';

const emit = defineEmits<{ verified: [verification: string] }>();
const challenge = ref<{ originalImageBase64: string; jigsawImageBase64: string; token: string; secretKey?: string }>();
const position = ref(0);
const imageWidth = ref(310);
const pieceWidth = ref(47);
const loading = ref(false);
const message = ref('');

function measureImage(event: Event) {
  imageWidth.value = (event.target as HTMLImageElement).naturalWidth;
}

function measurePiece(event: Event) {
  pieceWidth.value = (event.target as HTMLImageElement).naturalWidth;
}

async function load() {
  if (loading.value) return;
  loading.value = true;
  challenge.value = undefined;
  position.value = 0;
  message.value = '';
  try {
    const { data, error } = await request<NonNullable<typeof challenge.value>>({
      url: '/captcha/behavior',
      params: { captchaType: 'blockPuzzle' },
      headers: { isToken: false }
    });
    if (!error) challenge.value = data;
    else message.value = '验证码加载失败，请重试';
  } finally {
    loading.value = false;
  }
}

async function verify() {
  if (!challenge.value || loading.value) return;
  loading.value = true;
  const { token, secretKey } = challenge.value;
  // AJ-Captcha's full-height puzzle template uses the protocol y coordinate 5.
  const point = JSON.stringify({ x: position.value, y: 5 });
  const encode = (value: string) => (secretKey ? encryptWithAes(value, CryptoJS.enc.Utf8.parse(secretKey)) : value);
  try {
    const { data, error } = await request<{ repCode: string; repMsg?: string }>({
      url: '/captcha/behavior',
      method: 'post',
      headers: { isToken: false, repeatSubmit: false },
      data: { captchaType: 'blockPuzzle', token, pointJson: encode(point) }
    });
    if (!error && data.repCode === '0000') emit('verified', encode(`${token}---${point}`));
    else {
      challenge.value = undefined;
      message.value = data?.repMsg || '验证失败，请刷新验证码';
    }
  } finally {
    loading.value = false;
  }
}

onMounted(load);
</script>

<template>
  <div class="w-full py-12px">
    <NSpin :show="loading">
      <div v-if="challenge" class="relative w-full overflow-hidden">
        <img
          :src="`data:image/png;base64,${challenge.originalImageBase64}`"
          alt="拼图验证码"
          class="block w-full"
          @load="measureImage"
        />
        <img
          :src="`data:image/png;base64,${challenge.jigsawImageBase64}`"
          alt="拼图块"
          class="absolute top-0"
          :style="{ left: `${(position / imageWidth) * 100}%`, width: `${(pieceWidth / imageWidth) * 100}%` }"
          @load="measurePiece"
        />
      </div>
      <NSlider
        v-model:value="position"
        class="mt-16px"
        :max="imageWidth - pieceWidth"
        :disabled="!challenge || loading"
        :tooltip="false"
        aria-label="移动拼图块"
      />
      <NText v-if="message" type="error">{{ message }}</NText>
      <NSpace justify="end" class="mt-12px">
        <NButton :disabled="loading" aria-label="刷新验证码" @click="load">
          <template #icon><SvgIcon icon="ic:round-refresh" /></template>
        </NButton>
        <NButton type="primary" :disabled="!challenge" :loading="loading" @click="verify">验证</NButton>
      </NSpace>
    </NSpin>
  </div>
</template>
