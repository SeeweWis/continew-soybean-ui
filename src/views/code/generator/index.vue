<script setup lang="tsx">
import { reactive, ref } from 'vue';
import { fetchGetGenConfigPage } from '@/service/api/system';
import { useAppStore } from '@/store/modules/app';
import { defaultTransform, useNaivePaginatedTable } from '@/hooks/common/table';
import { $t } from '@/locales';

defineOptions({
  name: 'CodeGenerator'
});

const appStore = useAppStore();

const searchParams = reactive({
  page: 1,
  size: 10,
  tableName: null as string | null
});

const { columns, columnChecks, data, getData, getDataByPage, loading, mobilePagination, scrollX } =
  useNaivePaginatedTable({
    api: () => fetchGetGenConfigPage(searchParams),
    transform: response => defaultTransform(response),
    onPaginationParamsChange: params => {
      searchParams.page = params.page ?? 1;
      searchParams.size = params.pageSize ?? 10;
    },
    columns: () => [
      {
        type: 'selection',
        align: 'center',
        width: 48
      },
      {
        key: 'tableName',
        title: '表名称',
        align: 'center',
        minWidth: 180,
        ellipsis: { tooltip: true }
      },
      {
        key: 'comment',
        title: '表注释',
        align: 'center',
        minWidth: 140,
        ellipsis: { tooltip: true }
      },
      {
        key: 'classNamePrefix',
        title: '类名前缀',
        align: 'center',
        minWidth: 140,
        ellipsis: { tooltip: true }
      },
      {
        key: 'moduleName',
        title: '所属模块',
        align: 'center',
        minWidth: 120
      },
      {
        key: 'packageName',
        title: '包名',
        align: 'center',
        minWidth: 180,
        ellipsis: { tooltip: true }
      },
      {
        key: 'author',
        title: '作者',
        align: 'center',
        minWidth: 100
      },
      {
        key: 'updateTime',
        title: '更新时间',
        align: 'center',
        minWidth: 150
      }
    ]
  });

const checkedRowKeys = ref<CommonType.IdType[]>([]);

function handleResetSearch() {
  searchParams.tableName = null;
  getDataByPage();
}
</script>

<template>
  <div class="min-h-500px flex-col-stretch gap-16px overflow-hidden lt-sm:overflow-auto">
    <NCard :bordered="false" size="small" class="table-search card-wrapper">
      <NCollapse>
        <NCollapseItem :title="$t('common.search')" name="search">
          <NForm label-placement="left" :label-width="80">
            <NGrid responsive="screen" cols="1 s:2 m:3" :x-gap="8" :y-gap="8" item-responsive>
              <NFormItemGi span="24 s:12 m:8" label="表名称" class="pr-24px">
                <NInput
                  v-model:value="searchParams.tableName"
                  placeholder="请输入表名称"
                  @keyup.enter="() => getDataByPage()"
                />
              </NFormItemGi>
              <NFormItemGi span="24 s:12 m:8" class="pr-24px">
                <NSpace class="w-full" justify="end">
                  <NButton @click="handleResetSearch">
                    <template #icon>
                      <icon-ic-round-refresh class="text-icon" />
                    </template>
                    重置
                  </NButton>
                  <NButton type="primary" ghost @click="() => getDataByPage()">
                    <template #icon>
                      <icon-ic-round-search class="text-icon" />
                    </template>
                    搜索
                  </NButton>
                </NSpace>
              </NFormItemGi>
            </NGrid>
          </NForm>
        </NCollapseItem>
      </NCollapse>
    </NCard>
    <NCard title="代码生成" :bordered="false" size="small" class="card-wrapper sm:flex-1-hidden">
      <template #header-extra>
        <TableHeaderOperation
          v-model:columns="columnChecks"
          v-model:checked-row-keys="checkedRowKeys"
          :loading="loading"
          :show-add="false"
          :show-delete="false"
          @refresh="getData"
        />
      </template>
      <NDataTable
        v-model:checked-row-keys="checkedRowKeys"
        :columns="columns"
        :data="data"
        size="small"
        :flex-height="!appStore.isMobile"
        :scroll-x="scrollX"
        :loading="loading"
        remote
        :row-key="row => row.tableName"
        :pagination="mobilePagination"
        class="h-full"
      />
    </NCard>
  </div>
</template>

<style scoped></style>
