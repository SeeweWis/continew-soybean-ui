<script setup lang="ts">
import { reactive, ref, watch } from 'vue';
import { useLoading } from '@sa/hooks';
import { fetchGetDeptTree, fetchGetRoleDetail, fetchUpdateRole } from '@/service/api/system';
import { useNaiveForm } from '@/hooks/common/form';
import { $t } from '@/locales';

defineOptions({
  name: 'RoleDataScopeDrawer'
});

interface Props {
  /** the edit row data */
  rowData?: Api.System.ContinewRole | null;
}

const props = defineProps<Props>();

interface Emits {
  (e: 'submitted'): void;
}

const emit = defineEmits<Emits>();

const visible = defineModel<boolean>('visible', {
  default: false
});

const { formRef } = useNaiveForm();
const { loading, startLoading, endLoading } = useLoading();

const deptTreeData = ref<Api.Common.CommonTreeRecord>([]);

const model = reactive({
  name: '',
  code: '',
  sort: undefined as number | undefined,
  description: undefined as string | undefined,
  dataScope: 1 as 1 | 2 | 3 | 4 | 5,
  deptIds: [] as CommonType.IdType[],
  deptCheckStrictly: true
});

async function getDetail() {
  if (!props.rowData) return;
  startLoading();
  const { data, error } = await fetchGetRoleDetail(props.rowData.id);
  if (!error) {
    model.name = data.name;
    model.code = data.code;
    model.sort = data.sort;
    model.description = data.description;
    model.dataScope = data.dataScope ?? 1;
    model.deptIds = data.deptIds ?? [];
    model.deptCheckStrictly = data.deptCheckStrictly ?? true;
  }
  const { data: deptTree, error: deptError } = await fetchGetDeptTree();
  if (!deptError) {
    deptTreeData.value = deptTree;
  }
  endLoading();
}

function closeDrawer() {
  visible.value = false;
}

async function handleSubmit() {
  const { error } = await fetchUpdateRole(props.rowData!.id, {
    name: model.name,
    code: model.code,
    sort: model.sort,
    description: model.description,
    dataScope: model.dataScope,
    deptIds: model.dataScope === 5 ? model.deptIds : undefined,
    deptCheckStrictly: model.deptCheckStrictly
  });
  if (error) return;

  window.$message?.success($t('common.updateSuccess'));
  closeDrawer();
  emit('submitted');
}

watch(visible, val => {
  if (val) {
    getDetail();
  }
});
</script>

<template>
  <NDrawer v-model:show="visible" display-directive="show" :width="480" class="max-w-90%">
    <NDrawerContent title="数据范围权限" :native-scrollbar="false" closable>
      <NSpin :show="loading">
        <NForm ref="formRef" :model="model">
          <NFormItem label="角色名称">
            <NInput :value="model.name" disabled />
          </NFormItem>
          <NFormItem label="数据范围" path="dataScope">
            <DictSelect v-model:value="model.dataScope" dict-code="data_scope" />
          </NFormItem>
          <NFormItem v-if="model.dataScope === 5" label="部门范围" path="deptIds">
            <NTreeSelect
              v-model:value="model.deptIds"
              multiple
              checkable
              cascade
              clearable
              :options="deptTreeData as []"
              key-field="id"
              label-field="name"
              children-field="children"
              placeholder="请选择部门范围"
              :max-tag-count="3"
            />
          </NFormItem>
        </NForm>
      </NSpin>
      <template #footer>
        <NSpace :size="16">
          <NButton @click="closeDrawer">{{ $t('common.cancel') }}</NButton>
          <NButton type="primary" :loading="loading" @click="handleSubmit">{{ $t('common.save') }}</NButton>
        </NSpace>
      </template>
    </NDrawerContent>
  </NDrawer>
</template>

<style scoped></style>
