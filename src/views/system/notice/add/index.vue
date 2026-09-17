<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useLoading } from '@sa/hooks';
import { fetchCreateNotice, fetchGetNoticeDetail, fetchUpdateNotice } from '@/service/api/system';
import { useNaiveForm } from '@/hooks/common/form';
import { useDict } from '@/hooks/business/dict';
import { $t } from '@/locales';

defineOptions({
  name: 'NoticeAdd'
});

const route = useRoute();
const router = useRouter();
const { formRef, validate } = useNaiveForm();
const { loading, startLoading, endLoading } = useLoading();

useDict('notice_type');

const editId = ref<CommonType.IdType | null>(null);

const model = reactive({
  title: '',
  type: null as string | null,
  noticeScope: 'ALL',
  isTiming: false,
  publishTime: null as string | null,
  isTop: false,
  content: ''
});

async function getDetail(id: CommonType.IdType) {
  startLoading();
  const { data, error } = await fetchGetNoticeDetail(id);
  if (!error) {
    Object.assign(model, {
      title: data.title,
      type: data.type,
      noticeScope: data.noticeScope || 'ALL',
      isTiming: data.isTiming ?? false,
      publishTime: data.publishTime,
      isTop: data.isTop ?? false,
      content: data.content || ''
    });
  }
  endLoading();
}

async function handleSubmit() {
  await validate();

  const data: Api.System.ContinewNoticeReq = {
    title: model.title,
    content: model.content,
    type: model.type,
    noticeScope: model.noticeScope,
    isTiming: model.isTiming,
    publishTime: model.publishTime ?? undefined,
    isTop: model.isTop
  };

  if (editId.value) {
    const { error } = await fetchUpdateNotice(editId.value, data);
    if (error) return;
    window.$message?.success($t('common.updateSuccess'));
  } else {
    const { error } = await fetchCreateNotice(data);
    if (error) return;
    window.$message?.success($t('common.addSuccess'));
  }
  router.push('/system/notice');
}

function handleCancel() {
  router.push('/system/notice');
}

onMounted(() => {
  const id = route.query.id as string | undefined;
  if (id) {
    editId.value = id;
    getDetail(id);
  }
});
</script>

<template>
  <div class="min-h-500px">
    <NCard :title="editId ? '编辑公告' : '发布公告'" :bordered="false" size="small" class="card-wrapper">
      <NSpin :show="loading">
        <NForm ref="formRef" :model="model" label-placement="left" :label-width="90" class="max-w-860px">
          <NFormItem label="公告标题" path="title">
            <NInput v-model:value="model.title" placeholder="请输入公告标题" />
          </NFormItem>
          <NFormItem label="公告类型" path="type">
            <DictSelect v-model:value="model.type" dict-code="notice_type" placeholder="请选择公告类型" />
          </NFormItem>
          <NFormItem label="通知范围" path="noticeScope">
            <NRadioGroup v-model:value="model.noticeScope">
              <NRadio value="ALL" label="全部用户" />
              <NRadio value="USER" label="指定用户" />
            </NRadioGroup>
          </NFormItem>
          <NFormItem label="是否置顶" path="isTop">
            <NSwitch v-model:value="model.isTop" />
          </NFormItem>
          <NFormItem label="定时发布" path="isTiming">
            <NSwitch v-model:value="model.isTiming" />
          </NFormItem>
          <NFormItem v-if="model.isTiming" label="发布时间" path="publishTime">
            <NDatePicker
              v-model:formatted-value="model.publishTime"
              type="datetime"
              value-format="yyyy-MM-dd HH:mm:ss"
              clearable
            />
          </NFormItem>
          <NFormItem label="公告内容" path="content">
            <NInput v-model:value="model.content" type="textarea" :rows="10" placeholder="请输入公告内容" />
          </NFormItem>
          <NFormItem>
            <NSpace>
              <NButton type="primary" @click="handleSubmit">{{ editId ? '保存' : '发布' }}</NButton>
              <NButton @click="handleCancel">取消</NButton>
            </NSpace>
          </NFormItem>
        </NForm>
      </NSpin>
    </NCard>
  </div>
</template>

<style scoped></style>
