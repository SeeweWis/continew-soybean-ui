<script setup lang="tsx">
import { ref } from 'vue';
import { NTag } from 'naive-ui';
import { useLoading } from '@sa/hooks';
import { fetchGetOnlineUserPage, fetchKickoutOnlineUser } from '@/service/api/monitor';
import { useAppStore } from '@/store/modules/app';
import { useAuth } from '@/hooks/business/auth';
import { defaultTransform, useNaivePaginatedTable } from '@/hooks/common/table';
import { $t } from '@/locales';
import ButtonIcon from '@/components/custom/button-icon.vue';

defineOptions({
  name: 'OnlineUser'
});

const appStore = useAppStore();
const { hasAuth } = useAuth();
const { startLoading: startKickLoading, endLoading: endKickLoading } = useLoading();

const searchParams = ref<Api.Monitor.ContinewOnlineUserQuery>({
  page: 1,
  size: 10,
  nickname: null,
  clientId: null,
  loginTime: null
});

const { columns, columnChecks, data, getData, getDataByPage, loading, mobilePagination, scrollX } =
  useNaivePaginatedTable({
    api: () => fetchGetOnlineUserPage(searchParams.value),
    transform: response => defaultTransform(response),
    onPaginationParamsChange: params => {
      searchParams.value.page = params.page ?? 1;
      searchParams.value.size = params.pageSize ?? 10;
    },
    columns: () => [
      {
        key: 'nickname',
        title: '用户昵称',
        align: 'center',
        minWidth: 100
      },
      {
        key: 'username',
        title: '用户名',
        align: 'center',
        minWidth: 100
      },
      {
        key: 'clientType',
        title: '终端类型',
        align: 'center',
        minWidth: 80,
        render: row => <NTag type="info">{row.clientType || '-'}</NTag>
      },
      {
        key: 'ip',
        title: '登录 IP',
        align: 'center',
        minWidth: 120
      },
      {
        key: 'address',
        title: '登录地点',
        align: 'center',
        minWidth: 120
      },
      {
        key: 'browser',
        title: '浏览器',
        align: 'center',
        minWidth: 100
      },
      {
        key: 'os',
        title: '操作系统',
        align: 'center',
        minWidth: 100
      },
      {
        key: 'loginTime',
        title: '登录时间',
        align: 'center',
        minWidth: 160
      },
      {
        key: 'operate',
        title: $t('common.operate'),
        align: 'center',
        width: 100,
        render: row => {
          if (!hasAuth('monitor:online:kickout')) return null;
          return (
            <div class="flex-center gap-8px">
              <ButtonIcon
                text
                type="error"
                icon="material-symbols:logout-rounded"
                tooltipContent="强退"
                popconfirmContent="确定要强制该用户下线吗？"
                onPositiveClick={() => handleKickout(row.token)}
              />
            </div>
          );
        }
      }
    ]
  });

async function handleKickout(token: string) {
  startKickLoading();
  const { error } = await fetchKickoutOnlineUser(token);
  endKickLoading();
  if (error) return;
  window.$message?.success('强退成功');
  await getData();
}

function handleResetSearch() {
  searchParams.value.nickname = null;
  searchParams.value.clientId = null;
  getDataByPage();
}
</script>

<template>
  <div class="min-h-500px flex-col-stretch gap-16px overflow-hidden lt-sm:overflow-auto">
    <NCard :bordered="false" size="small" class="card-wrapper sm:flex-1-hidden">
      <div class="mb-12px flex flex-wrap items-center justify-between gap-12px">
        <NSpace>
          <NInput
            v-model:value="searchParams.nickname"
            clearable
            class="w-240px"
            placeholder="搜索用户名/昵称"
            @keyup.enter="() => getDataByPage()"
          >
            <template #prefix><SvgIcon icon="material-symbols:search-rounded" /></template>
          </NInput>
          <NInput
            v-model:value="searchParams.clientId"
            clearable
            class="w-180px"
            placeholder="客户端 ID"
            @keyup.enter="() => getDataByPage()"
          />
          <NButton size="small" @click="handleResetSearch">
            <template #icon><icon-ic-round-refresh class="text-icon" /></template>
            重置
          </NButton>
        </NSpace>
        <TableHeaderOperation
          v-model:columns="columnChecks"
          :loading="loading"
          :show-add="false"
          :show-delete="false"
          @refresh="getData"
        />
      </div>
      <NDataTable
        :columns="columns"
        :data="data"
        size="small"
        :flex-height="!appStore.isMobile"
        :scroll-x="scrollX"
        :loading="loading"
        remote
        :row-key="row => row.id"
        :pagination="mobilePagination"
        class="sm:h-full"
      />
    </NCard>
  </div>
</template>

<style scoped></style>
