<script setup lang="tsx">
import { computed, ref } from 'vue';
import { NEllipsis } from 'naive-ui';
import type { TreeOption } from 'naive-ui';
import { useBoolean, useLoading } from '@sa/hooks';
import {
  fetchBatchDeleteDict,
  fetchBatchDeleteDictItem,
  fetchClearDictCache,
  fetchGetDictItemList,
  fetchGetDictList
} from '@/service/api/system';
import { useAppStore } from '@/store/modules/app';
import { defaultTransform, useNaivePaginatedTable, useTableOperate } from '@/hooks/common/table';
import { useAuth } from '@/hooks/business/auth';
import ButtonIcon from '@/components/custom/button-icon.vue';
import DictTag from '@/components/custom/dict-tag.vue';
import { $t } from '@/locales';
import DictDataSearch from './modules/dict-data-search.vue';
import DictDataOperateDrawer from './modules/dict-data-operate-drawer.vue';
import DictTypeOperateDrawer from './modules/dict-type-operate-drawer.vue';

defineOptions({
  name: 'DictList'
});

const { hasAuth } = useAuth();
const appStore = useAppStore();

// ==================== 字典列表（左侧） ====================
const selectedDict = ref<Api.System.ContinewDict | null>(null);
const selectedKeys = ref<CommonType.IdType[]>([]);
const { loading: treeLoading, startLoading: startTreeLoading, endLoading: endTreeLoading } = useLoading();
const dictList = ref<Api.System.ContinewDict[]>([]);
const dictPattern = ref<string>();

async function getDictList() {
  startTreeLoading();
  const { data, error } = await fetchGetDictList();
  if (!error) {
    dictList.value = data;
    if (!selectedDict.value && data.length) {
      handleClickDict([data[0].id]);
    }
  }
  endTreeLoading();
}

getDictList();

function handleClickDict(keys: CommonType.IdType[]) {
  const id = keys.length ? keys[0] : null;
  selectedKeys.value = keys;
  selectedDict.value = dictList.value.find(item => item.id === id) ?? null;
  // eslint-disable-next-line @typescript-eslint/no-use-before-define
  checkedRowKeys.value = [];
  // eslint-disable-next-line @typescript-eslint/no-use-before-define
  getDataByPage();
}

function dictFilter(pattern: string, node: TreeOption) {
  const name = String(node.name ?? '');
  const code = String(node.code ?? '');
  return name.includes(pattern) || code.includes(pattern);
}

function renderDictSuffix({ option }: { option: TreeOption }) {
  const dict = dictList.value.find(item => item.id === option.id);
  if (!dict) return null;
  return (
    <div class="flex-center gap-12px">
      {hasAuth('system:dict:update') && (
        <ButtonIcon
          text
          type="primary"
          icon="material-symbols:drive-file-rename-outline-outline"
          tooltipContent={$t('common.edit')}
          onClick={(event: Event) => {
            event.stopPropagation();
            handleEditDict(dict);
          }}
        />
      )}
      {hasAuth('system:dict:delete') && (
        <ButtonIcon
          text
          type="error"
          icon="material-symbols:delete-outline"
          tooltipContent={$t('common.delete')}
          popconfirmContent="确定删除该字典及其所有字典项吗？"
          onClick={(event: Event) => event.stopPropagation()}
          onPositiveClick={() => handleDeleteDict(dict)}
        />
      )}
    </div>
  );
}

const dictOperateType = ref<NaiveUI.TableOperateType>('add');
const dictRowData = ref<Api.System.ContinewDict | null>(null);
const { bool: dictTypeDrawerVisible, setTrue: openDictTypeDrawer } = useBoolean();

function handleAddDict() {
  dictOperateType.value = 'add';
  dictRowData.value = null;
  openDictTypeDrawer();
}

function handleEditDict(dict: Api.System.ContinewDict) {
  dictRowData.value = dict;
  dictOperateType.value = 'edit';
  openDictTypeDrawer();
}

async function handleDeleteDict(dict: Api.System.ContinewDict) {
  const { error } = await fetchBatchDeleteDict([dict.id]);
  if (error) return;
  window.$message?.success($t('common.deleteSuccess'));
  selectedDict.value = null;
  await getDictList();
}

async function handleClearCache() {
  if (!selectedDict.value) return;
  const { error } = await fetchClearDictCache(selectedDict.value.code);
  if (error) return;
  window.$message?.success($t('page.system.dict.refreshCacheSuccess'));
}

async function handleSubmitDict(code: string) {
  await getDictList();
  const target = dictList.value.find(item => item.code === code);
  if (target) {
    handleClickDict([target.id]);
  }
}

// ==================== 字典项分页（右侧） ====================
const searchParams = ref<Api.System.ContinewDictItemQuery>({
  page: 1,
  size: 10,
  description: null,
  status: null,
  dictId: null
});

const { columns, columnChecks, data, getData, getDataByPage, loading, mobilePagination, scrollX } =
  useNaivePaginatedTable({
    api: () => {
      searchParams.value.dictId = selectedDict.value?.id ?? null;
      return fetchGetDictItemList(searchParams.value);
    },
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
        key: 'label',
        title: $t('page.system.dict.data.label'),
        align: 'center',
        minWidth: 100,
        render(row) {
          return <DictTag size="small" dictData={{ label: row.label, value: row.value, extra: row.color }} />;
        }
      },
      {
        key: 'value',
        title: $t('page.system.dict.data.value'),
        align: 'center',
        minWidth: 80
      },
      {
        key: 'status',
        title: $t('page.system.dict.data.status'),
        align: 'center',
        width: 80,
        render: row => <DictTag dictCode="dis_enable_status" value={row.status} size="small" />
      },
      {
        key: 'sort',
        title: '排序',
        align: 'center',
        width: 80
      },
      {
        key: 'description',
        title: $t('page.system.dict.data.remark'),
        align: 'center',
        minWidth: 100,
        ellipsis: { tooltip: true }
      },
      {
        key: 'createTime',
        title: $t('page.system.dict.data.createTime'),
        align: 'center',
        minWidth: 120
      },
      {
        key: 'operate',
        title: $t('common.operate'),
        align: 'center',
        width: 120,
        render: row => {
          const editBtn = () => {
            if (!hasAuth('system:dict:update')) {
              return null;
            }
            return (
              <ButtonIcon
                text
                type="primary"
                icon="material-symbols:drive-file-rename-outline-outline"
                tooltipContent={$t('common.edit')}
                // eslint-disable-next-line @typescript-eslint/no-use-before-define
                onClick={() => handleEdit(row.id)}
              />
            );
          };

          const deleteBtn = () => {
            if (!hasAuth('system:dict:delete')) {
              return null;
            }
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
              {editBtn()}
              {deleteBtn()}
            </div>
          );
        }
      }
    ]
  });

const { drawerVisible, operateType, editingData, handleAdd, handleEdit, checkedRowKeys, onBatchDeleted, onDeleted } =
  useTableOperate(data, 'id', getData);

async function handleBatchDelete() {
  const { error } = await fetchBatchDeleteDictItem(checkedRowKeys.value);
  if (error) return;
  onBatchDeleted();
}

async function handleDelete(id: CommonType.IdType) {
  const { error } = await fetchBatchDeleteDictItem([id]);
  if (error) return;
  onDeleted();
}

function handleResetSearch() {
  searchParams.value.description = null;
  searchParams.value.status = null;
  getDataByPage();
}

const tableTitle = computed(() => {
  const dict = selectedDict.value;
  return dict ? (
    <NEllipsis lineClamp={2} class="flex">
      <span>{dict.name}</span>
      <span>{` (${dict.code} )`}</span>
    </NEllipsis>
  ) : (
    <div>{$t('page.system.dict.title')}</div>
  );
});
</script>

<template>
  <TableSiderLayout :sider-title="$t('page.system.dict.dictTypeTitle')">
    <template #header-extra>
      <ButtonIcon
        v-if="hasAuth('system:dict:create')"
        size="small"
        icon="material-symbols:add-rounded"
        class="h-18px text-icon"
        :tooltip-content="$t('page.system.dict.addDictType')"
        @click.stop="() => handleAddDict()"
      />
      <ButtonIcon
        v-if="hasAuth('system:dict:update')"
        size="small"
        icon="material-symbols:cache-rounded"
        class="h-18px text-icon"
        :tooltip-content="$t('page.system.dict.refreshCache')"
        :disabled="!selectedDict"
        @click.stop="() => handleClearCache()"
      />
      <ButtonIcon
        size="small"
        icon="material-symbols:refresh-rounded"
        class="h-18px text-icon"
        :tooltip-content="$t('page.system.dict.refreshDictType')"
        @click.stop="() => getDictList()"
      />
    </template>
    <template #sider>
      <NInput v-model:value="dictPattern" clearable :placeholder="$t('common.keywordSearch')" />
      <NSpin class="dict-tree" :show="treeLoading">
        <NTree
          v-model:selected-keys="selectedKeys"
          block-node
          show-line
          :data="(dictList as [])"
          :show-irrelevant-nodes="false"
          :pattern="dictPattern"
          :filter="dictFilter"
          class="infinite-scroll h-full min-h-200px py-3"
          key-field="id"
          label-field="name"
          virtual-scroll
          :render-suffix="renderDictSuffix"
          @update:selected-keys="handleClickDict"
        >
          <template #empty>
            <NEmpty :description="$t('page.system.dict.dictTypeIsEmpty')" class="h-full min-h-200px justify-center" />
          </template>
        </NTree>
      </NSpin>
    </template>
    <div class="h-full flex-col-stretch gap-12px overflow-hidden lt-sm:overflow-auto">
      <DictDataSearch v-model:model="searchParams" @reset="handleResetSearch" @search="getDataByPage" />
      <TableRowCheckAlert v-model:checked-row-keys="checkedRowKeys" />
      <NCard :title="() => tableTitle" :bordered="false" size="small" class="card-wrapper sm:flex-1-hidden">
        <template #header-extra>
          <TableHeaderOperation
            v-model:columns="columnChecks"
            :disabled-delete="checkedRowKeys.length === 0"
            :disable-add="!selectedDict"
            :loading="loading"
            :show-add="hasAuth('system:dict:create')"
            :show-delete="hasAuth('system:dict:delete')"
            @add="handleAdd"
            @delete="handleBatchDelete"
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
          :row-key="row => row.id"
          :pagination="mobilePagination"
          class="h-full"
        />
        <DictDataOperateDrawer
          v-model:visible="drawerVisible"
          :operate-type="operateType"
          :row-data="editingData"
          :dict="selectedDict"
          @submitted="getData"
        />
        <DictTypeOperateDrawer
          v-model:visible="dictTypeDrawerVisible"
          :operate-type="dictOperateType"
          :row-data="dictRowData"
          @submitted="handleSubmitDict"
        />
      </NCard>
    </div>
  </TableSiderLayout>
</template>

<style scoped lang="scss">
.dict-tree {
  .n-button {
    --n-padding: 8px !important;
  }

  :deep(.n-tree__empty) {
    height: 100%;
    justify-content: center;
  }

  :deep(.n-spin-content) {
    height: 100%;
  }

  :deep(.infinite-scroll) {
    height: calc(100vh - 228px - var(--calc-footer-height, 0px)) !important;
    max-height: calc(100vh - 228px - var(--calc-footer-height, 0px)) !important;
  }

  @media screen and (max-width: 1024px) {
    :deep(.infinite-scroll) {
      height: calc(100vh - 227px - var(--calc-footer-height, 0px)) !important;
      max-height: calc(100vh - 227px - var(--calc-footer-height, 0px)) !important;
    }
  }

  :deep(.n-tree-node) {
    height: 30px;
  }

  :deep(.n-tree-node-switcher) {
    height: 30px;
  }

  :deep(.n-tree-node-switcher__icon) {
    font-size: 16px !important;
    height: 16px !important;
    width: 16px !important;
  }
}

:deep(.n-data-table-wrapper),
:deep(.n-data-table-base-table),
:deep(.n-data-table-base-table-body) {
  height: 100%;
}

:deep(.n-card-header__main) {
  min-width: 180px !important;
}
</style>
