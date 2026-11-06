<script setup lang="tsx">
import { computed, reactive, ref, watch } from 'vue';
import { NTag } from 'naive-ui';
import { useLoading } from '@sa/hooks';
import {
  fetchAssignRoleUser,
  fetchGetRoleUserPage,
  fetchUnassignRoleUser,
  fetchGetUserDict
} from '@/service/api/system';
import { useAuth } from '@/hooks/business/auth';
import { defaultTransform, useNaivePaginatedTable } from '@/hooks/common/table';
import { $t } from '@/locales';
import ButtonIcon from '@/components/custom/button-icon.vue';
import DictTag from '@/components/custom/dict-tag.vue';

defineOptions({
  name: 'RoleUserPanel'
});

interface Props {
  /** 当前选中角色 */
  role: Api.System.ContinewRole | null;
}

const props = defineProps<Props>();

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
    api: () => fetchGetRoleUserPage(props.role!.id, searchParams),
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
          if (!hasAuth('system:role:unassign') || props.role?.isSystem) return null;
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
    userOptions.value = dictList.map(item => ({
      label: String(item.label),
      value: item.value as CommonType.IdType
    }));
  }
}

async function handleAssign() {
  if (!assignUserIds.value.length) {
    window.$message?.warning('请选择要分配的用户');
    return;
  }
  startLoading();
  const { error } = await fetchAssignRoleUser(props.role!.id, assignUserIds.value);
  endLoading();
  if (error) return;
  window.$message?.success('分配用户成功');
  assignUserIds.value = [];
  await getData();
}

async function handleUnassign(userId: CommonType.IdType) {
  const { error } = await fetchUnassignRoleUser([userId]);
  if (error) return;
  window.$message?.success('取消授权成功');
  await getData();
}

const canAssign = computed(() => hasAuth('system:role:assign') && props.role && !props.role.isSystem);

watch(
  () => props.role?.id,
  val => {
    if (val) {
      getData();
      getUserOptions();
    }
  },
  { immediate: true }
);
</script>

<template>
  <div class="h-full flex-col-stretch gap-12px">
    <NCard :bordered="false" size="small" class="card-wrapper">
      <div class="flex flex-wrap items-center justify-between gap-12px">
        <div class="flex items-center gap-8px">
          <span class="font-medium">当前角色：</span>
          <NTag type="primary" size="small" :bordered="false">
            {{ role ? `${role.name}（${role.code}）` : '请选择左侧角色' }}
          </NTag>
          <NTag v-if="role?.isSystem" type="warning" size="small" :bordered="false">内置角色</NTag>
        </div>
        <NSpace v-if="canAssign" :size="12" align="center">
          <NSelect
            v-model:value="assignUserIds"
            multiple
            filterable
            clearable
            :options="userOptions"
            placeholder="请选择要分配的用户"
            class="w-320px"
            :max-tag-count="3"
          />
          <NButton type="primary" size="small" :loading="loading" @click="handleAssign">分配用户</NButton>
        </NSpace>
      </div>
    </NCard>
    <NCard :bordered="false" size="small" class="card-wrapper flex-1-hidden">
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
    </NCard>
  </div>
</template>

<style scoped></style>
