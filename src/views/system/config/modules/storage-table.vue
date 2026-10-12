<script setup lang="tsx">
import { reactive, ref } from 'vue';
import { NTag } from 'naive-ui';
import { useLoading } from '@sa/hooks';
import {
  fetchBatchDeleteStorage,
  fetchCreateStorage,
  fetchGetStorageList,
  fetchSetDefaultStorage,
  fetchUpdateStorage,
  fetchUpdateStorageStatus
} from '@/service/api/system';
import { useAuth } from '@/hooks/business/auth';
import { useNaiveTable } from '@/hooks/common/table';
import { $t } from '@/locales';
import ButtonIcon from '@/components/custom/button-icon.vue';
import DictTag from '@/components/custom/dict-tag.vue';

defineOptions({
  name: 'StorageTable'
});

const { hasAuth } = useAuth();

const { columns, columnChecks, data, getData, loading, scrollX } = useNaiveTable({
  api: () => fetchGetStorageList(),
  transform: response => response.data ?? [],
  columns: () => [
    {
      key: 'name',
      title: '存储名称',
      align: 'center',
      minWidth: 120
    },
    {
      key: 'code',
      title: '存储编码',
      align: 'center',
      minWidth: 120
    },
    {
      key: 'type',
      title: '存储类型',
      align: 'center',
      minWidth: 100,
      render: row => <DictTag dictCode="storage_type_enum" value={row.type} size="small" />
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
      width: 90,
      render: row => <DictTag dictCode="dis_enable_status_enum" value={row.status} size="small" />
    },
    {
      key: 'createTime',
      title: '创建时间',
      align: 'center',
      minWidth: 140
    },
    {
      key: 'operate',
      title: $t('common.operate'),
      align: 'center',
      width: 200,
      render: row => {
        const editBtn = () => {
          if (!hasAuth('system:storage:update')) return null;
          return (
            <ButtonIcon
              text
              type="primary"
              icon="material-symbols:drive-file-rename-outline-outline"
              tooltipContent={$t('common.edit')}
              onClick={() => handleEdit(row)}
            />
          );
        };
        const defaultBtn = () => {
          if (row.isDefault || !hasAuth('system:storage:update')) return null;
          return (
            <ButtonIcon
              text
              type="primary"
              icon="material-symbols:star-outline"
              tooltipContent="设为默认"
              popconfirmContent="确定设为默认存储吗？"
              onPositiveClick={() => handleSetDefault(row.id)}
            />
          );
        };
        const statusBtn = () => {
          if (!hasAuth('system:storage:update')) return null;
          return (
            <ButtonIcon
              text
              type={row.status === 1 ? 'warning' : 'success'}
              icon={row.status === 1 ? 'material-symbols:pause-circle-outline' : 'material-symbols:play-circle-outline'}
              tooltipContent={row.status === 1 ? '禁用' : '启用'}
              popconfirmContent={`确定要${row.status === 1 ? '禁用' : '启用'}该存储吗？`}
              onPositiveClick={() => handleStatus(row)}
            />
          );
        };
        const deleteBtn = () => {
          if (!hasAuth('system:storage:delete')) return null;
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
            {statusBtn()}
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
    code: '',
    type: 1 as 1 | 2,
    accessKey: null as string | null,
    secretKey: null as string | null,
    endpoint: null as string | null,
    bucketName: null as string | null,
    domain: null as string | null,
    recycleBinEnabled: true,
    sort: 999,
    description: null as string | null,
    status: 1 as 1 | 2
  };
}

function handleEdit(row: Api.System.ContinewStorage) {
  operateType.value = 'edit';
  editingId.value = row.id;
  Object.assign(formModel, { ...createDefaultForm(), ...row, secretKey: null });
  modalVisible.value = true;
}

function handleAdd() {
  operateType.value = 'add';
  editingId.value = null;
  Object.assign(formModel, createDefaultForm());
  modalVisible.value = true;
}

async function handleSubmit() {
  const payload: Api.System.ContinewStorageReq = { ...formModel };
  startSaveLoading();
  if (operateType.value === 'add') {
    const { error } = await fetchCreateStorage(payload);
    endSaveLoading();
    if (error) return;
    window.$message?.success($t('common.addSuccess'));
  } else {
    const { error } = await fetchUpdateStorage(editingId.value!, payload);
    endSaveLoading();
    if (error) return;
    window.$message?.success($t('common.updateSuccess'));
  }
  modalVisible.value = false;
  await getData();
}

async function handleSetDefault(id: CommonType.IdType) {
  const { error } = await fetchSetDefaultStorage(id);
  if (error) return;
  window.$message?.success('设置成功');
  await getData();
}

async function handleStatus(row: Api.System.ContinewStorage) {
  const { error } = await fetchUpdateStorageStatus(row.id, row.status === 1 ? 2 : 1);
  if (error) return;
  window.$message?.success('状态修改成功');
  await getData();
}

async function handleDelete(id: CommonType.IdType) {
  const { error } = await fetchBatchDeleteStorage([id]);
  if (error) return;
  window.$message?.success($t('common.deleteSuccess'));
  await getData();
}
</script>

<template>
  <div class="h-full flex-col-stretch gap-12px overflow-hidden lt-sm:overflow-auto">
    <NCard title="存储列表" :bordered="false" size="small" class="card-wrapper">
      <template #header-extra>
        <TableHeaderOperation
          v-model:columns="columnChecks"
          :loading="loading"
          :show-add="hasAuth('system:storage:create')"
          :show-delete="false"
          @add="handleAdd"
          @refresh="getData"
        />
      </template>
      <NDataTable
        :columns="columns"
        :data="data"
        size="small"
        :scroll-x="scrollX"
        :loading="loading"
        :row-key="row => row.id"
        class="h-full"
      />
    </NCard>

    <NModal
      v-model:show="modalVisible"
      preset="card"
      :title="operateType === 'add' ? '新增存储' : '编辑存储'"
      class="max-w-90% w-620px"
    >
      <NForm :model="formModel" label-placement="left" :label-width="140">
        <NFormItem label="存储名称" required>
          <NInput v-model:value="formModel.name" placeholder="请输入存储名称" />
        </NFormItem>
        <NFormItem label="存储编码" required>
          <NInput v-model:value="formModel.code" placeholder="请输入存储编码" />
        </NFormItem>
        <NFormItem label="存储类型" required>
          <DictSelect v-model:value="formModel.type" dict-code="storage_type_enum" />
        </NFormItem>
        <NFormItem v-if="formModel.type === 2" label="访问密钥">
          <NInput v-model:value="formModel.accessKey" placeholder="请输入 Access Key" />
        </NFormItem>
        <NFormItem v-if="formModel.type === 2 && operateType === 'add'" label="私有密钥">
          <NInput v-model:value="formModel.secretKey" type="password" placeholder="请输入 Secret Key" />
        </NFormItem>
        <NFormItem v-if="formModel.type === 2" label="终端地址">
          <NInput v-model:value="formModel.endpoint" placeholder="请输入 Endpoint" />
        </NFormItem>
        <NFormItem :label="formModel.type === 1 ? '存储路径' : '存储桶名称'" required>
          <NInput v-model:value="formModel.bucketName" placeholder="请输入 Bucket Name" />
        </NFormItem>
        <NFormItem label="自定义域名">
          <NInput v-model:value="formModel.domain" placeholder="请输入自定义域名" />
        </NFormItem>
        <NFormItem label="回收站">
          <NSwitch v-model:value="formModel.recycleBinEnabled" />
        </NFormItem>
        <NFormItem label="排序">
          <NInputNumber v-model:value="formModel.sort" class="w-full" />
        </NFormItem>
        <NFormItem label="状态">
          <DictSelect v-model:value="formModel.status" dict-code="dis_enable_status_enum" />
        </NFormItem>
        <NFormItem label="描述">
          <NInput v-model:value="formModel.description" type="textarea" placeholder="请输入描述" />
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
