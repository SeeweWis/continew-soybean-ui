<script setup lang="tsx">
import { reactive, ref, watch } from 'vue';
import { useLoading } from '@sa/hooks';
import { fetchAssignRoleUser, fetchGetRoleUserPage, fetchUnassignRoleUser, fetchGetUserDict } from '@/service/api/system';
import { useAuth } from '@/hooks/business/auth';
import { defaultTransform, useNaivePaginatedTable } from '@/hooks/common/table';
import { $t } from '@/locales';
import ButtonIcon from '@/components/custom/button-icon.vue';
import DictTag from '@/components/custom/dict-tag.vue';

defineOptions({
  name: 'RoleAuthUserDrawer'
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

const { hasAuth } = useAuth();
const { loading, startLoading, endLoading } = useLoading();

const assignUserIds = ref<CommonType.IdType[]>([]);
const userOptions = ref<{ label: string; value: CommonType.IdType }[]>([]);

const searchParams = reactive<Api.System.ContinewRoleUserQuery>({
  page: 1,
  size: 10,
  description: null
});

const { columns, data, getData, loading: tableLoading, mobilePagination, scrollX } =
  useNaivePaginatedTable({
    api: () => fetchGetRoleUserPage(props.rowData!.id, searchParams),
    transform: response => defaultTransform(response),
    onPaginationParamsChange: params => {
      searchParams.page = params.page ?? 1;
      searchParams.size = params.pageSize ?? 10;
    },
    columns: () => [
      {
        key: 'nickname',
        title: '昵称',
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
        key: 'deptName',
        title: '部门',
        align: 'center',
        minWidth: 100
      },
      {
        key: 'gender',
        title: '性别',
        align: 'center',
        width: 80,
        render: row => (row.gender === undefined ? null : <DictTag dictCode="gender_enum" value={row.gender} />)
      },
      {
        key: 'operate',
        title: $t('common.operate'),
        align: 'center',
        width: 80,
        render: row => {
          if (!hasAuth('system:role:unassign')) return null;
          return (
            <ButtonIcon
              text
              type="error"
              icon="material-symbols:user-minus-rounded"
              tooltipContent="取消授权"
              popconfirmContent="确定取消该用户的授权吗？"
              onPositiveClick={() => handleUnassign(row.id)}
            />
          );
        }
      }
    ]
  });

async function getUserOptions() {
  const { data: dictList, error } = await fetchGetUserDict();
  if (!error) {
    userOptions.value = dictList.map(item => ({ label: String(item.label), value: item.value as CommonType.IdType }));
  }
}

async function handleAssign() {
  if (!assignUserIds.value.length) {
    window.$message?.warning('请选择要分配的用户');
    return;
  }
  startLoading();
  const { error } = await fetchAssignRoleUser(props.rowData!.id, assignUserIds.value);
  endLoading();
  if (error) return;
  window.$message?.success('分配用户成功');
  assignUserIds.value = [];
  await getData();
  emit('submitted');
}

async function handleUnassign(userId: CommonType.IdType) {
  const { error } = await fetchUnassignRoleUser([userId]);
  if (error) return;
  window.$message?.success('取消授权成功');
  await getData();
  emit('submitted');
}

watch(visible, val => {
  if (val) {
    getData();
    getUserOptions();
  }
});
</script>

<template>
  <NDrawer v-model:show="visible" display-directive="show" :width="700" class="max-w-90%">
    <NDrawerContent title="分配用户" :native-scrollbar="false" closable>
      <div class="flex-col-stretch gap-12px">
        <NSpace v-if="hasAuth('system:role:assign')">
          <NSelect
            v-model:value="assignUserIds"
            multiple
            filterable
            clearable
            :options="userOptions"
            placeholder="请选择要分配的用户"
            class="w-360px"
            :max-tag-count="3"
          />
          <NButton type="primary" :loading="loading" @click="handleAssign">分配用户</NButton>
        </NSpace>
        <NDataTable
          :columns="columns"
          :data="data"
          size="small"
          :scroll-x="scrollX"
          :loading="tableLoading"
          remote
          :row-key="row => row.id"
          :pagination="mobilePagination"
          class="h-full"
        />
      </div>
    </NDrawerContent>
  </NDrawer>
</template>

<style scoped></style>
