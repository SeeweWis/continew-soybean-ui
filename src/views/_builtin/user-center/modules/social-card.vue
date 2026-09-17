<script lang="ts" setup>
import { ref } from 'vue';
import { useLoading } from '@sa/hooks';
import { fetchGetSocialAuthorizeUrl, fetchSocialList, fetchSocialUnbind } from '@/service/api/system';

defineOptions({
  name: 'SocialCard'
});

const socialList = ref<Api.System.ContinewSocial[]>([]);
const { loading, startLoading, endLoading } = useLoading();

/** 获取SSO账户列表 */
async function getSsoUserList() {
  startLoading();
  const { data, error } = await fetchSocialList();
  if (!error) {
    socialList.value = data || [];
  }
  endLoading();
}

/** 绑定SSO账户：跳转到授权地址 */
async function bindSsoAccount(source: string) {
  const { data, error } = await fetchGetSocialAuthorizeUrl(source);
  if (!error && data.authorizeUrl) {
    window.location.href = data.authorizeUrl;
  }
}

/** 解绑SSO账户 */
async function unbindSsoAccount(source: string) {
  const { error } = await fetchSocialUnbind(source);
  if (!error) {
    window.$message?.success('账户解绑成功');
    await getSsoUserList();
  }
}

const socialSources: {
  key: string;
  icon?: string;
  localIcon?: string;
  color: string;
  name: string;
}[] = [
  { key: 'wechat_open', icon: 'ic:outline-wechat', color: '#44b549', name: '微信' },
  { key: 'gitee', icon: 'simple-icons:gitee', color: '#c71d23', name: 'Gitee' },
  { key: 'github', icon: 'mdi:github', color: '#010409', name: 'GitHub' }
];

getSsoUserList();

function getSocial(key: string) {
  return socialList.value.find(s => s.source.toLowerCase() === key);
}
</script>

<template>
  <NSpin :show="loading" class="mt-16px">
    <div class="grid grid-cols-1 gap-16px 2xl:grid-cols-3 xl:grid-cols-2">
      <div v-for="source in socialSources" :key="source.key" class="relative">
        <NCard class="h-full transition-all duration-300 hover:shadow-md" :bordered="true">
          <template v-if="getSocial(source.key)">
            <div class="flex flex-col items-center gap-16px">
              <SvgIcon
                :local-icon="source.localIcon"
                :icon="source.icon"
                class="size-48px"
                :style="{ color: source.color }"
              />
              <div class="text-center">
                <div class="text-16px font-medium">{{ source.name }}</div>
                <div class="mt-4px text-12px text-gray-500">
                  {{ getSocial(source.key)?.description || '已绑定' }}
                </div>
              </div>
              <NButton type="error" size="small" @click="unbindSsoAccount(source.key)">解绑</NButton>
            </div>
          </template>
          <template v-else>
            <div class="h-full flex flex-col items-center justify-center gap-16px">
              <SvgIcon
                :local-icon="source.localIcon"
                :icon="source.icon"
                class="size-48px"
                :style="{ color: source.color }"
              />
              <div class="text-16px font-medium">{{ source.name }}</div>
              <NButton type="primary" size="small" @click="bindSsoAccount(source.key)">绑定</NButton>
            </div>
          </template>
        </NCard>
      </div>
    </div>
  </NSpin>
</template>

<style scoped>
.border-primary {
  border-color: var(--primary-color);
}
</style>
