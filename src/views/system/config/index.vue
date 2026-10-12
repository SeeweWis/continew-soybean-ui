<script setup lang="ts">
import { ref } from 'vue';
import OptionForm from './modules/option-form.vue';
import SiteConfig from './site/index.vue';
import ClientTable from './modules/client-table.vue';
import StorageTable from './modules/storage-table.vue';
import SmsConfigTable from './modules/sms-config-table.vue';

defineOptions({
  name: 'Config'
});

type ConfigKey = 'site' | 'security' | 'login' | 'mail' | 'sms' | 'storage' | 'client';

const configMenuOptions = [
  { label: '网站配置', key: 'site' },
  { label: '安全配置', key: 'security' },
  { label: '登录配置', key: 'login' },
  { label: '邮件配置', key: 'mail' },
  { label: '短信配置', key: 'sms' },
  { label: '存储配置', key: 'storage' },
  { label: '客户端配置', key: 'client' }
];

const activeKey = ref<ConfigKey>('site');
</script>

<template>
  <div class="min-h-500px">
    <NCard :bordered="false" class="card-wrapper" size="small">
      <NLayout has-sider class="bg-transparent">
        <NLayoutSider bordered collapse-mode="width" :width="180" :native-scrollbar="false" class="bg-transparent">
          <NMenu v-model:value="activeKey" :options="configMenuOptions" :default-expanded-keys="['site']" />
        </NLayoutSider>
        <NLayoutContent content-style="padding: 16px 24px;" :native-scrollbar="false">
          <template v-if="activeKey === 'site'">
            <SiteConfig />
          </template>
          <template v-else-if="activeKey === 'security'">
            <OptionForm category="PASSWORD" />
          </template>
          <template v-else-if="activeKey === 'login'">
            <OptionForm category="LOGIN" />
          </template>
          <template v-else-if="activeKey === 'mail'">
            <OptionForm category="MAIL" />
          </template>
          <template v-else-if="activeKey === 'sms'">
            <SmsConfigTable />
          </template>
          <template v-else-if="activeKey === 'storage'">
            <StorageTable />
          </template>
          <template v-else-if="activeKey === 'client'">
            <ClientTable />
          </template>
        </NLayoutContent>
      </NLayout>
    </NCard>
  </div>
</template>

<style scoped></style>
