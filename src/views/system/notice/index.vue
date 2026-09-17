<script setup lang="tsx">
import { useRouter } from 'vue-router';
import { ref } from 'vue';
import { NDivider, NTag } from 'naive-ui';
import { fetchBatchDeleteNotice, fetchGetNoticePage } from '@/service/api/system';
import { useAppStore } from '@/store/modules/app';
import { useAuth } from '@/hooks/business/auth';
import { defaultTransform, useNaivePaginatedTable, useTableOperate } from '@/hooks/common/table';
import { useDict } from '@/hooks/business/dict';
import { $t } from '@/locales';
import ButtonIcon from '@/components/custom/button-icon.vue';
import DictTag from '@/components/custom/dict-tag.vue';

defineOptions({
  name: 'NoticeList'
});

const router = useRouter();
const appStore = useAppStore();
const { hasAuth } = useAuth();

useDict('notice_type');

const searchParams = ref<Api.System.ContinewNoticeQuery>({
  page: 1,
  size: 10,
  title: null,
  type: null
});

const { columns, columnChecks, data, getData, getDataByPage, loading, mobilePagination, scrollX } =
  useNaivePaginatedTable({
    api: () => fetchGetNoticePage(searchParams.value),
    transform: response => defaultTransform(response),
    onPaginationParamsChange: params => {
      searchParams.value.page = params.page ?? 1;
      searchParams.value.size = params.pageSize ?? 10;
    },
    columns: () => [
      {
        type: 'selection',
        align: 'center',
        width: 48
      },
      {
        key: 'title',
        title: '公告标题',
        align: 'center',
        minWidth: 200,
        ellipsis: { tooltip: true }
      },
      {
        key: 'type',
        title: '公告类型',
        align: 'center',
        minWidth: 100,
        render: row => (row.type ? <DictTag size="small" dictCode="notice_type" value={row.type} /> : null)
      },
      {
        key: 'isTop',
        title: '是否置顶',
        align: 'center',
        width: 90,
        render: row => (row.isTop ? <NTag type="warning">是</NTag> : null)
      },
      {
        key: 'publishTime',
        title: '发布时间',
        align: 'center',
        minWidth: 150
      },
      {
        key: 'createUserString',
        title: '创建人',
        align: 'center',
        minWidth: 100
      },
      {
        key: 'operate',
        title: $t('common.operate'),
        align: 'center',
        width: 200,
        render: row => {
          const viewBtn = () => {
            return (
              <ButtonIcon
                text
                type="primary"
                icon="material-symbols:visibility-outline-rounded"
                tooltipContent="查看"
                onClick={() => routerPushView(row.id)}
              />
            );
          };
          const editBtn = () => {
            if (!hasAuth('system:notice:update')) return null;
            return (
              <ButtonIcon
                text
                type="primary"
                icon="material-symbols:drive-file-rename-outline-outline"
                tooltipContent={$t('common.edit')}
                onClick={() => routerPushAdd(String(row.id))}
              />
            );
          };
          const deleteBtn = () => {
            if (!hasAuth('system:notice:delete')) return null;
            return (
              <ButtonIcon
                text
                type="error"
                icon="material-symbols:delete-outline"
                tooltipContent={$t('common.delete')}
                popconfirmContent={$t('common.confirmDelete')}
                onPositiveClick={() => handleDelete(row.id)}
              />
            );
          };
          return (
            <div class="flex-center gap-8px">
              {viewBtn()}
              {editBtn() && <NDivider vertical />}
              {editBtn()}
              {deleteBtn() && <NDivider vertical />}
              {deleteBtn()}
            </div>
          );
        }
      }
    ]
  });

const { checkedRowKeys, onBatchDeleted } = useTableOperate(data, 'id', getData);

async function handleDelete(id: CommonType.IdType) {
  const { error } = await fetchBatchDeleteNotice([id]);
  if (error) return;
  window.$message?.success($t('common.deleteSuccess'));
  await getData();
}

async function handleBatchDelete() {
  const { error } = await fetchBatchDeleteNotice(checkedRowKeys.value);
  if (error) return;
  onBatchDeleted();
}

function routerPushAdd(id?: string) {
  router.push({ path: '/system/notice/add', query: id ? { id } : {} });
}

function routerPushView(id: CommonType.IdType) {
  router.push({ path: '/system/notice/view', query: { id: String(id) } });
}

function handleResetSearch() {
  searchParams.value.title = null;
  searchParams.value.type = null;
  getDataByPage();
}
</script>

<template>
  <div class="min-h-500px flex-col-stretch gap-16px overflow-hidden lt-sm:overflow-auto">
    <NCard :bordered="false" size="small" class="card-wrapper sm:flex-1-hidden">
      <div class="mb-12px flex flex-wrap items-center justify-between gap-12px">
        <NSpace>
          <NInput
            v-model:value="searchParams.title"
            clearable
            class="w-240px"
            placeholder="搜索标题"
            @keyup.enter="() => getDataByPage()"
          >
            <template #prefix><SvgIcon icon="material-symbols:search-rounded" /></template>
          </NInput>
          <DictSelect
            v-model:value="searchParams.type"
            clearable
            class="w-150px"
            dict-code="notice_type"
            placeholder="请选择分类"
            @update:value="() => getDataByPage()"
          />
          <NButton size="small" @click="handleResetSearch">
            <template #icon><icon-ic-round-refresh class="text-icon" /></template>
            重置
          </NButton>
        </NSpace>
        <NSpace>
          <NButton v-if="hasAuth('system:notice:create')" type="primary" size="small" @click="routerPushAdd()">
            <template #icon>
              <icon-material-symbols-add-rounded class="text-icon" />
            </template>
            发布公告
          </NButton>
          <TableHeaderOperation
            v-model:columns="columnChecks"
            :disabled-delete="checkedRowKeys.length === 0"
            :loading="loading"
            :show-add="false"
            :show-delete="hasAuth('system:notice:delete')"
            @delete="handleBatchDelete"
            @refresh="getData"
          />
        </NSpace>
      </div>
      <NDataTable
        v-model:checked-row-keys="checkedRowKeys"
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
