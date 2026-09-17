<script setup lang="tsx">
import { reactive, ref } from 'vue';
import { NDivider, NTag } from 'naive-ui';
import { jsonClone } from '@sa/utils';
import { useBoolean } from '@sa/hooks';
import { fetchBatchDeleteClient, fetchCreateClient, fetchGetClientPage, fetchUpdateClient } from '@/service/api/system';
import { useAuth } from '@/hooks/business/auth';
import { defaultTransform, useNaivePaginatedTable, useTableOperate } from '@/hooks/common/table';
import { $t } from '@/locales';
import ButtonIcon from '@/components/custom/button-icon.vue';
import DictTag from '@/components/custom/dict-tag.vue';

defineOptions({
  name: 'ClientTable'
});

const { hasAuth } = useAuth();

const AUTH_TYPE_OPTIONS = ['ACCOUNT', 'EMAIL', 'PHONE', 'SOCIAL'].map(v => ({ label: v, value: v }));
const OVERFLOW_LOGOUT_OPTIONS = [
  { label: '登出会话', value: 'LOGOUT' },
  { label: '拒绝登录', value: 'REFUSE' }
];

const searchParams = ref<Api.System.ContinewClientQuery>({
  page: 1,
  size: 10,
  clientType: null,
  status: null
});

const { columns, columnChecks, data, getData, getDataByPage, loading, mobilePagination, scrollX } =
  useNaivePaginatedTable({
    api: () => fetchGetClientPage(searchParams.value),
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
        key: 'clientId',
        title: '客户端 ID',
        align: 'center',
        minWidth: 200,
        ellipsis: { tooltip: true }
      },
      {
        key: 'clientType',
        title: '客户端类型',
        align: 'center',
        minWidth: 100,
        render: row => <DictTag size="small" dictCode="client_type" value={row.clientType} />
      },
      {
        key: 'authType',
        title: '认证类型',
        align: 'center',
        minWidth: 160,
        render: row => (
          <div class="flex justify-center gap-4px">
            {(row.authType || []).map(t => (
              <NTag key={t} size="small">
                {t}
              </NTag>
            ))}
          </div>
        )
      },
      {
        key: 'activeTimeout',
        title: '活跃超时（秒）',
        align: 'center',
        width: 120
      },
      {
        key: 'timeout',
        title: '会话超时（秒）',
        align: 'center',
        width: 120
      },
      {
        key: 'status',
        title: '状态',
        align: 'center',
        width: 80,
        render: row => <DictTag dictCode="dis_enable_status" value={row.status} size="small" />
      },
      {
        key: 'operate',
        title: $t('common.operate'),
        align: 'center',
        width: 140,
        render: row => {
          const editBtn = () => {
            if (!hasAuth('system:client:update')) return null;
            return (
              <ButtonIcon
                text
                type="primary"
                icon="material-symbols:drive-file-rename-outline-outline"
                tooltipContent={$t('common.edit')}
                onClick={() => openEdit(row.id)}
              />
            );
          };
          const deleteBtn = () => {
            if (!hasAuth('system:client:delete')) return null;
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
              {editBtn() && deleteBtn() && <NDivider vertical />}
              {deleteBtn()}
            </div>
          );
        }
      }
    ]
  });

const { drawerVisible, operateType, editingData, handleAdd, checkedRowKeys, onBatchDeleted, onDeleted } =
  useTableOperate(data, 'id', getData);

const { bool: drawerSubmitting } = useBoolean();

const formModel = reactive(createDefaultForm());

function createDefaultForm() {
  return {
    clientType: 'PC',
    authType: ['ACCOUNT'] as string[],
    activeTimeout: 1800,
    timeout: 86400,
    isConcurrent: true,
    replacedRange: undefined as string | undefined,
    maxLoginCount: 1,
    overflowLogoutMode: 'LOGOUT' as string,
    status: 1 as 1 | 2
  };
}

function openEdit(id: CommonType.IdType) {
  const row = data.value.find(item => item.id === id);
  if (!row) return;
  Object.assign(formModel, jsonClone({ ...row, id: undefined }));
  operateType.value = 'edit';
  drawerVisible.value = true;
}

async function handleSubmit() {
  const payload: Api.System.ContinewClientReq = { ...formModel, replacedRange: formModel.replacedRange ?? undefined };
  drawerSubmitting.value = true;
  if (operateType.value === 'add') {
    const { error } = await fetchCreateClient(payload);
    drawerSubmitting.value = false;
    if (error) return;
    window.$message?.success($t('common.addSuccess'));
  } else {
    const { error } = await fetchUpdateClient(editingData.value!.id, payload);
    drawerSubmitting.value = false;
    if (error) return;
    window.$message?.success($t('common.updateSuccess'));
  }
  drawerVisible.value = false;
  await getData();
}

async function handleDelete(id: CommonType.IdType) {
  const { error } = await fetchBatchDeleteClient([id]);
  if (error) return;
  onDeleted();
}

async function handleBatchDelete() {
  const { error } = await fetchBatchDeleteClient(checkedRowKeys.value);
  if (error) return;
  onBatchDeleted();
}

function handleResetSearch() {
  searchParams.value.clientType = null;
  searchParams.value.status = null;
  getDataByPage();
}
</script>

<template>
  <div class="h-full flex-col-stretch gap-12px overflow-hidden lt-sm:overflow-auto">
    <NCard :bordered="false" class="table-search card-wrapper" size="small">
      <NCollapse>
        <NCollapseItem :title="$t('common.search')" name="search">
          <NForm label-placement="left" :label-width="80">
            <NGrid responsive="screen" cols="1 s:2 m:3" :x-gap="8" :y-gap="8" item-responsive>
              <NFormItemGi span="24 s:12 m:8" label="客户端类型" class="pr-24px">
                <DictSelect v-model:value="searchParams.clientType" dict-code="client_type" clearable />
              </NFormItemGi>
              <NFormItemGi span="24 s:12 m:8" label="状态" class="pr-24px">
                <DictSelect v-model:value="searchParams.status" dict-code="dis_enable_status" clearable />
              </NFormItemGi>
              <NFormItemGi span="24 s:12 m:8" class="pr-24px">
                <NSpace class="w-full" justify="end">
                  <NButton @click="() => handleResetSearch()">
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
    <NCard title="客户端列表" :bordered="false" size="small" class="card-wrapper">
      <template #header-extra>
        <TableHeaderOperation
          v-model:columns="columnChecks"
          :disabled-delete="checkedRowKeys.length === 0"
          :loading="loading"
          :show-add="hasAuth('system:client:create')"
          :show-delete="hasAuth('system:client:delete')"
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
        :scroll-x="scrollX"
        :loading="loading"
        remote
        :row-key="row => row.id"
        :pagination="mobilePagination"
        class="h-full"
      />
    </NCard>

    <NModal
      v-model:show="drawerVisible"
      preset="card"
      :title="operateType === 'add' ? '新增客户端' : '编辑客户端'"
      class="w-620px"
    >
      <NForm :model="formModel" label-placement="left" :label-width="120">
        <NFormItem label="客户端类型" required>
          <DictSelect v-model:value="formModel.clientType" dict-code="client_type" />
        </NFormItem>
        <NFormItem label="认证类型" required>
          <NSelect v-model:value="formModel.authType" multiple :options="AUTH_TYPE_OPTIONS" />
        </NFormItem>
        <NFormItem label="活跃超时（秒）" required>
          <NInputNumber v-model:value="formModel.activeTimeout" class="w-full" :min="1" />
        </NFormItem>
        <NFormItem label="会话超时（秒）" required>
          <NInputNumber v-model:value="formModel.timeout" class="w-full" :min="1" />
        </NFormItem>
        <NFormItem label="允许并发登录" required>
          <NSwitch v-model:value="formModel.isConcurrent" />
        </NFormItem>
        <NFormItem label="最大登录数" required>
          <NInputNumber v-model:value="formModel.maxLoginCount" class="w-full" :min="1" />
        </NFormItem>
        <NFormItem label="溢出处理">
          <NSelect v-model:value="formModel.overflowLogoutMode" :options="OVERFLOW_LOGOUT_OPTIONS" />
        </NFormItem>
        <NFormItem label="状态">
          <DictRadio v-model:value="formModel.status" dict-code="dis_enable_status" />
        </NFormItem>
      </NForm>
      <template #footer>
        <NSpace justify="end">
          <NButton @click="drawerVisible = false">取消</NButton>
          <NButton type="primary" :loading="drawerSubmitting" @click="handleSubmit">保存</NButton>
        </NSpace>
      </template>
    </NModal>
  </div>
</template>

<style scoped></style>
