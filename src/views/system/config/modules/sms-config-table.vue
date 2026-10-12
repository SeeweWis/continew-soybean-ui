<script setup lang="tsx">
import { reactive, ref } from 'vue';
import { NTag } from 'naive-ui';
import { useLoading } from '@sa/hooks';
import { jsonClone } from '@sa/utils';
import {
  fetchBatchDeleteSmsConfig,
  fetchCreateSmsConfig,
  fetchGetSmsConfigDetail,
  fetchGetSmsConfigPage,
  fetchSetDefaultSmsConfig,
  fetchUpdateSmsConfig
} from '@/service/api/system';
import { useAuth } from '@/hooks/business/auth';
import { defaultTransform, useNaivePaginatedTable } from '@/hooks/common/table';
import { $t } from '@/locales';
import ButtonIcon from '@/components/custom/button-icon.vue';
import DictTag from '@/components/custom/dict-tag.vue';

defineOptions({
  name: 'SmsConfigTable'
});

const { hasAuth } = useAuth();

const checkedRowKeys = ref<CommonType.IdType[]>([]);

const searchParams = ref<Api.System.ContinewSmsConfigQuery>({
  page: 1,
  size: 10,
  name: null,
  supplier: null,
  status: null
});

const { columns, columnChecks, data, getData, getDataByPage, loading, mobilePagination, scrollX } =
  useNaivePaginatedTable({
    api: () => fetchGetSmsConfigPage(searchParams.value),
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
        key: 'name',
        title: '配置名称',
        align: 'center',
        minWidth: 120
      },
      {
        key: 'supplier',
        title: '供应商',
        align: 'center',
        minWidth: 100,
        render: row => <DictTag size="small" dictCode="sms_supplier" value={row.supplier} />
      },
      {
        key: 'signature',
        title: '签名',
        align: 'center',
        minWidth: 100,
        ellipsis: { tooltip: true }
      },
      {
        key: 'templateId',
        title: '模板 ID',
        align: 'center',
        minWidth: 120,
        ellipsis: { tooltip: true }
      },
      {
        key: 'isDefault',
        title: '默认',
        align: 'center',
        width: 70,
        render: row => (row.isDefault ? <NTag type="success">是</NTag> : null)
      },
      {
        key: 'status',
        title: '状态',
        align: 'center',
        width: 80,
        render: row => <DictTag dictCode="dis_enable_status_enum" value={row.status} size="small" />
      },
      {
        key: 'operate',
        title: $t('common.operate'),
        align: 'center',
        width: 200,
        render: row => {
          const editBtn = () => {
            if (!hasAuth('system:smsConfig:update')) return null;
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
          const defaultBtn = () => {
            if (row.isDefault || !hasAuth('system:smsConfig:update')) return null;
            return (
              <ButtonIcon
                text
                type="primary"
                icon="material-symbols:star-outline"
                tooltipContent="设为默认"
                popconfirmContent="确定设为默认短信配置吗？"
                onPositiveClick={() => handleSetDefault(row.id)}
              />
            );
          };
          const deleteBtn = () => {
            if (!hasAuth('system:smsConfig:delete')) return null;
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
              {defaultBtn()}
              {deleteBtn()}
            </div>
          );
        }
      }
    ]
  });

const modalVisible = ref(false);
const operateType = ref<'add' | 'edit'>('add');
const editingId = ref<CommonType.IdType | null>(null);
const { loading: saveLoading, startLoading: startSaveLoading, endLoading: endSaveLoading } = useLoading();

const formModel = reactive(createDefaultForm());

function createDefaultForm() {
  return {
    name: '',
    supplier: null as string | null,
    accessKey: '',
    secretKey: '',
    signature: null as string | null,
    templateId: '',
    weight: 1,
    retryInterval: 300,
    maxRetries: 3,
    maximum: 200,
    status: 1 as 1 | 2
  };
}

async function handleEdit(id: CommonType.IdType) {
  operateType.value = 'edit';
  editingId.value = id;
  const { data: detail, error } = await fetchGetSmsConfigDetail(id);
  if (!error) {
    Object.assign(formModel, jsonClone({ ...createDefaultForm(), ...detail, secretKey: '' }));
  }
  modalVisible.value = true;
}

function handleAdd() {
  operateType.value = 'add';
  editingId.value = null;
  Object.assign(formModel, createDefaultForm());
  modalVisible.value = true;
}

async function handleSubmit() {
  const payload: Api.System.ContinewSmsConfigReq = { ...formModel, supplier: formModel.supplier! };
  startSaveLoading();
  if (operateType.value === 'add') {
    const { error } = await fetchCreateSmsConfig(payload);
    endSaveLoading();
    if (error) return;
    window.$message?.success($t('common.addSuccess'));
  } else {
    const { error } = await fetchUpdateSmsConfig(editingId.value!, payload);
    endSaveLoading();
    if (error) return;
    window.$message?.success($t('common.updateSuccess'));
  }
  modalVisible.value = false;
  await getData();
}

async function handleSetDefault(id: CommonType.IdType) {
  const { error } = await fetchSetDefaultSmsConfig(id);
  if (error) return;
  window.$message?.success('设置成功');
  await getData();
}

async function handleDelete(id: CommonType.IdType) {
  const { error } = await fetchBatchDeleteSmsConfig([id]);
  if (error) return;
  onBatchDeletedMessage();
  await getData();
}

function onBatchDeletedMessage() {
  window.$message?.success($t('common.deleteSuccess'));
}

async function handleBatchDelete() {
  const { error } = await fetchBatchDeleteSmsConfig(checkedRowKeys.value);
  if (error) return;
  onBatchDeletedMessage();
  await getData();
}

function handleResetSearch() {
  searchParams.value.name = null;
  searchParams.value.supplier = null;
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
              <NFormItemGi span="24 s:12 m:8" label="配置名称" class="pr-24px">
                <NInput v-model:value="searchParams.name" placeholder="请输入配置名称" />
              </NFormItemGi>
              <NFormItemGi span="24 s:12 m:8" label="供应商" class="pr-24px">
                <DictSelect v-model:value="searchParams.supplier" dict-code="sms_supplier" clearable />
              </NFormItemGi>
              <NFormItemGi span="24 s:12 m:8" label="状态" class="pr-24px">
                <DictSelect v-model:value="searchParams.status" dict-code="dis_enable_status_enum" clearable />
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
    <NCard title="短信配置" :bordered="false" size="small" class="card-wrapper">
      <template #header-extra>
        <TableHeaderOperation
          v-model:columns="columnChecks"
          v-model:checked-row-keys="checkedRowKeys"
          :disabled-delete="checkedRowKeys.length === 0"
          :loading="loading"
          :show-add="hasAuth('system:smsConfig:create')"
          :show-delete="hasAuth('system:smsConfig:delete')"
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
      v-model:show="modalVisible"
      preset="card"
      :title="operateType === 'add' ? '新增短信配置' : '编辑短信配置'"
      class="w-620px"
    >
      <NForm :model="formModel" label-placement="left" :label-width="130">
        <NFormItem label="配置名称" required>
          <NInput v-model:value="formModel.name" placeholder="请输入配置名称" />
        </NFormItem>
        <NFormItem label="供应商" required>
          <DictSelect v-model:value="formModel.supplier" dict-code="sms_supplier" />
        </NFormItem>
        <NFormItem label="访问密钥" required>
          <NInput v-model:value="formModel.accessKey" placeholder="请输入 Access Key" />
        </NFormItem>
        <NFormItem v-if="operateType === 'add'" label="私有密钥" required>
          <NInput v-model:value="formModel.secretKey" type="password" placeholder="请输入 Secret Key" />
        </NFormItem>
        <NFormItem label="短信签名">
          <NInput v-model:value="formModel.signature" placeholder="请输入短信签名" />
        </NFormItem>
        <NFormItem label="模板 ID" required>
          <NInput v-model:value="formModel.templateId" placeholder="请输入模板 ID" />
        </NFormItem>
        <NFormItem label="权重">
          <NInputNumber v-model:value="formModel.weight" class="w-full" :min="1" />
        </NFormItem>
        <NFormItem label="状态">
          <DictSelect v-model:value="formModel.status" dict-code="dis_enable_status_enum" />
        </NFormItem>
      </NForm>
      <template #footer>
        <NSpace justify="end">
          <NButton @click="modalVisible = false">取消</NButton>
          <NButton type="primary" :loading="saveLoading" @click="handleSubmit">保存</NButton>
        </NSpace>
      </template>
    </NModal>
  </div>
</template>

<style scoped></style>
