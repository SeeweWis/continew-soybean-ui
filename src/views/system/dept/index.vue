<script setup lang="tsx">
import { reactive, ref } from 'vue';
import { NDivider } from 'naive-ui';
import { fetchBatchDeleteDept, fetchGetDeptTree } from '@/service/api/system';
import { useAppStore } from '@/store/modules/app';
import { useAuth } from '@/hooks/business/auth';
import { useDownload } from '@/hooks/business/download';
import { useNaiveTable } from '@/hooks/common/table';
import { $t } from '@/locales';
import ButtonIcon from '@/components/custom/button-icon.vue';
import DictTag from '@/components/custom/dict-tag.vue';
import DeptOperateDrawer from './modules/dept-operate-drawer.vue';

defineOptions({
  name: 'DeptList'
});

const appStore = useAppStore();
const { hasAuth } = useAuth();
const { download } = useDownload();

const searchParams = reactive<Api.System.ContinewDeptQuery>({
  description: null,
  status: null
});

const { columns, columnChecks, data, getData, loading, scrollX } = useNaiveTable({
  api: () => fetchGetDeptTree(searchParams),
  transform: response => response.data ?? [],
  columns: () => [
    {
      key: 'name',
      title: '部门名称',
      minWidth: 180,
      ellipsis: { tooltip: true }
    },
    {
      key: 'sort',
      title: '排序',
      align: 'center',
      width: 80
    },
    {
      key: 'status',
      title: '状态',
      align: 'center',
      width: 90,
      render: row => <DictTag dictCode="dis_enable_status_enum" value={(row as unknown as Api.System.ContinewDept).status} size="small" />
    },
    {
      key: 'description',
      title: '描述',
      align: 'center',
      minWidth: 140,
      ellipsis: { tooltip: true }
    },
    {
      key: 'operate',
      title: $t('common.operate'),
      align: 'center',
      width: 190,
      render: row => {
        const addChildBtn = () => {
          if (!hasAuth('system:dept:create')) return null;
          return (
            <ButtonIcon
              text
              type="primary"
              icon="material-symbols:add-rounded"
              tooltipContent="新增下级"
              onClick={() => handleAddChild(row.id)}
            />
          );
        };

        const editBtn = () => {
          if (!hasAuth('system:dept:update')) return null;
          return (
            <ButtonIcon
              text
              type="primary"
              icon="material-symbols:drive-file-rename-outline-outline"
              tooltipContent={$t('common.edit')}
              onClick={() => handleEdit(row.id)}
            />
          );
        };

        const deleteBtn = () => {
          if (!hasAuth('system:dept:delete')) return null;
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
            {addChildBtn()}
            {addChildBtn() && editBtn() && <NDivider vertical />}
            {editBtn()}
            {editBtn() && deleteBtn() && <NDivider vertical />}
            {deleteBtn()}
          </div>
        );
      }
    }
  ]
});

const drawerVisible = ref(false);
const operateType = ref<NaiveUI.TableOperateType>('add');
const editingData = ref<Api.System.ContinewDept | null>(null);
/** 新增下级时预选的父部门 */
const defaultParentId = ref<CommonType.IdType | null>(null);

function findDept(depts: Api.System.ContinewDept[], id: CommonType.IdType): Api.System.ContinewDept | null {
  for (const dept of depts) {
    if (dept.id === id) return dept;
    if (dept.children) {
      const found = findDept(dept.children, id);
      if (found) return found;
    }
  }
  return null;
}

function handleAdd() {
  operateType.value = 'add';
  editingData.value = null;
  defaultParentId.value = null;
  drawerVisible.value = true;
}

function handleAddChild(parentId: CommonType.IdType) {
  operateType.value = 'add';
  editingData.value = null;
  defaultParentId.value = parentId;
  drawerVisible.value = true;
}

function handleEdit(id: CommonType.IdType) {
  const findItem = findDept(data.value as unknown as Api.System.ContinewDept[], id);
  operateType.value = 'edit';
  editingData.value = findItem ? { ...findItem, children: undefined } : null;
  drawerVisible.value = true;
}

async function handleDelete(id: CommonType.IdType) {
  const { error } = await fetchBatchDeleteDept([id]);
  if (error) return;
  window.$message?.success($t('common.deleteSuccess'));
  await getData();
}

async function handleResetSearch() {
  searchParams.description = null;
  searchParams.status = null;
  await getData();
}

function handleExport() {
  download('/system/dept/export', searchParams, `部门_${new Date().getTime()}.xlsx`);
}
</script>

<template>
  <div class="min-h-500px flex-col-stretch gap-16px overflow-hidden lt-sm:overflow-auto">
    <NCard :bordered="false" size="small" class="card-wrapper sm:flex-1-hidden">
      <div class="mb-12px flex flex-wrap items-center justify-between gap-12px">
        <NSpace>
          <NInput
            v-model:value="searchParams.description"
            clearable
            class="w-240px"
            placeholder="搜索名称"
            @keyup.enter="getData"
          >
            <template #prefix><SvgIcon icon="material-symbols:search-rounded" /></template>
          </NInput>
          <NButton size="small" @click="handleResetSearch">
            <template #icon><icon-ic-round-refresh class="text-icon" /></template>
            重置
          </NButton>
        </NSpace>
        <TableHeaderOperation
          v-model:columns="columnChecks"
          :loading="loading"
          :show-add="hasAuth('system:dept:create')"
          :show-delete="false"
          :show-export="hasAuth('system:dept:export')"
          @add="handleAdd"
          @refresh="getData"
          @export="handleExport"
        />
      </div>
      <NDataTable
        :columns="columns"
        :data="data"
        size="small"
        :flex-height="!appStore.isMobile"
        :scroll-x="scrollX"
        :loading="loading"
        :row-key="row => row.id"
        default-expand-all
        class="h-full"
      />
      <DeptOperateDrawer
        v-model:visible="drawerVisible"
        :operate-type="operateType"
        :row-data="editingData"
        :default-parent-id="defaultParentId"
        @submitted="getData"
      />
    </NCard>
  </div>
</template>

<style scoped></style>
