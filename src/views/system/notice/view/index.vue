<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useLoading } from '@sa/hooks';
import { fetchGetNoticeDetail } from '@/service/api/system';
import { useDict } from '@/hooks/business/dict';

defineOptions({
  name: 'NoticeView'
});

const route = useRoute();
const router = useRouter();
const { loading, startLoading, endLoading } = useLoading();

useDict('notice_type');

const notice = ref<Api.System.ContinewNotice | null>(null);

onMounted(async () => {
  const id = route.query.id as string | undefined;
  if (!id) return;
  startLoading();
  const { data, error } = await fetchGetNoticeDetail(id);
  if (!error) {
    notice.value = data;
  }
  endLoading();
});

function handleBack() {
  router.push('/system/notice');
}
</script>

<template>
  <div class="min-h-500px">
    <NCard :title="notice?.title || '公告详情'" :bordered="false" size="small" class="card-wrapper">
      <template #header-extra>
        <NButton size="small" @click="handleBack">返回</NButton>
      </template>
      <NSpin :show="loading">
        <NDescriptions v-if="notice" :columns="2" label-placement="left" bordered>
          <NDescriptionsItem label="公告类型">
            <DictTag v-if="notice.type" dict-code="notice_type" :value="notice.type" />
          </NDescriptionsItem>
          <NDescriptionsItem label="发布时间">{{ notice.publishTime || notice.createTime }}</NDescriptionsItem>
          <NDescriptionsItem label="发布状态">
            <DictTag dict-code="notice_status_enum" :value="notice.status" />
          </NDescriptionsItem>
          <NDescriptionsItem label="通知范围">
            <DictTag dict-code="notice_scope_enum" :value="notice.noticeScope" />
          </NDescriptionsItem>
          <NDescriptionsItem label="通知方式">
            <DictTag dict-code="notice_method_enum" :value="notice.noticeMethods" />
          </NDescriptionsItem>
          <NDescriptionsItem label="创建人">{{ notice.createUserString }}</NDescriptionsItem>
          <NDescriptionsItem label="创建时间">{{ notice.createTime }}</NDescriptionsItem>
        </NDescriptions>
        <NDivider />
        <div class="whitespace-pre-wrap leading-loose">{{ notice?.content }}</div>
      </NSpin>
    </NCard>
  </div>
</template>

<style scoped></style>
