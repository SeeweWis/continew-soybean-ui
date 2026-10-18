<script setup lang="tsx">
import { computed, ref, watch } from 'vue';
import { NTag } from 'naive-ui';
import { approveTask, cancelApproval, fetchApprovalDetail, rejectTask, transferTask } from '@/service/api/approval';
import { fetchGetUserDict } from '@/service/api/system';
import { useAuth } from '@/hooks/business/auth';
import { useAuthStore } from '@/store/modules/auth';
import { actionLabels, statusLabels, statusTypes } from './status';
import FormRenderer from './form-renderer.vue';
import { defaultFormConfig, formValueDefaults, parseFormConfig } from './form-config';

const props = defineProps<{ id?: CommonType.IdType }>();
const emit = defineEmits<{ changed: [] }>();
const visible = defineModel<boolean>('visible', { default: false });
const { hasAuth } = useAuth();
const authStore = useAuthStore();
const detail = ref<Api.Approval.Detail>();
const loading = ref(false);
let loadVersion = 0;
const failed = ref(false);
const processing = ref(false);
const action = ref<'approve' | 'reject' | 'transfer' | 'cancel'>();
const opinion = ref('');
const target = ref<CommonType.IdType | null>(null);
const users = ref<Api.System.LabelValue[]>([]);
const usersLoading = ref(false);
const usersFailed = ref(false);
const actionVisible = ref(false);
const currentTask = computed(() => detail.value?.instance.status === 'PENDING' ? detail.value.tasks.find(t =>
  String(t.assignee) === String(authStore.userInfo.id) && t.status === 'PENDING' && t.nodeId === detail.value?.instance.currentNodeId) : undefined);
const personalTask = computed(() => detail.value?.tasks.find(t => String(t.assignee) === String(authStore.userInfo.id)));
const personalState = computed(() => {
  if (currentTask.value) return '待你处理';
  if (personalTask.value?.status === 'APPROVED') return '你已同意';
  if (personalTask.value?.status === 'REJECTED') return '你已拒绝';
  if (personalTask.value?.status === 'TRANSFERRED') return '你已转办';
  if (personalTask.value?.status === 'CANCELLED') return '无需处理';
  if (detail.value?.instance.status === 'PENDING') return '当前不需要你处理';
  return '你未参与当前审批节点';
});
const currentNodeName = computed(() => {
  if (!detail.value) return '审批流转中';
  return detail.value.tasks.find(task => task.nodeId === detail.value?.instance.currentNodeId)?.nodeName || '审批流转中';
});
const canCancel = computed(() => detail.value?.instance.status === 'PENDING' && String(detail.value.instance.startUser) === String(authStore.userInfo.id) && hasAuth('approval:instance:cancel'));
const actionTitle = computed(() => ({ approve: '同意审批', reject: '拒绝审批', transfer: '转办审批', cancel: '撤销申请' })[action.value || 'approve']);
const formContent = computed(() => {
  try { return JSON.stringify(JSON.parse(detail.value?.instance.formData || '{}'), null, 2); }
  catch { return detail.value?.instance.formData || '无'; }
});
const formConfig = computed(() => {
  try {
    return parseFormConfig(detail.value?.instance.formConfig);
  } catch {
    return defaultFormConfig();
  }
});
const formValues = computed(() => {
  try {
    return { ...formValueDefaults(formConfig.value), ...JSON.parse(detail.value?.instance.formData || '{}') };
  } catch {
    return formValueDefaults(formConfig.value);
  }
});
const taskColumns: NaiveUI.TableColumn<Api.Approval.Task>[] = [
  { key: 'nodeName', title: '审批节点', minWidth: 140 },
  { key: 'assignee', title: '审批人', minWidth: 120, render: row => userName(row.assignee) },
  { key: 'status', title: '任务状态', minWidth: 100, render: row => <NTag size="small" type={statusTypes[row.status]}>{taskStatusLabel(row.status)}</NTag> },
  { key: 'opinion', title: '审批意见', minWidth: 180, ellipsis: { tooltip: true } },
  { key: 'completeTime', title: '处理时间', minWidth: 170 }
];
function userName(id?: CommonType.IdType | null): string {
  return id == null ? '—' : detail.value?.userNames[String(id)] || String(id);
}

function taskStatusLabel(status: Api.Approval.Status) {
  if (status === 'PENDING') return '待处理';
  if (status === 'CANCELLED') return '无需处理';
  return statusLabels[status];
}

async function load() {
  if (!props.id) return;
  const version = ++loadVersion;
  loading.value = true;
  failed.value = false;
  try {
    const { data, error } = await fetchApprovalDetail(props.id);
    if (version !== loadVersion || !visible.value) return;
    if (error) failed.value = true;
    else detail.value = data;
  } finally { if (version === loadVersion) loading.value = false; }
}

async function loadUsers() {
  usersLoading.value = true;
  usersFailed.value = false;
  try {
    const { data, error } = await fetchGetUserDict();
    if (error) usersFailed.value = true;
    else users.value = data.filter(user => String(user.value) !== String(authStore.userInfo.id));
  } finally { usersLoading.value = false; }
}

function openAction(value: typeof action.value) {
  action.value = value;
  opinion.value = '';
  target.value = null;
  actionVisible.value = true;
  if (value === 'transfer') void loadUsers();
}

async function confirmAction() {
  if (processing.value || !detail.value || !action.value) return;
  if (action.value !== 'approve' && !opinion.value.trim()) {
    window.$message?.warning('请填写原因'); return;
  }
  if (action.value === 'transfer' && target.value == null) {
    window.$message?.warning('请选择转办用户'); return;
  }
  if (action.value !== 'cancel' && !currentTask.value) {
    window.$message?.warning('当前任务已变更，请刷新后重试'); return;
  }
  processing.value = true;
  try {
    let result;
    if (action.value === 'cancel') result = await cancelApproval(detail.value.instance.id, opinion.value);
    else if (action.value === 'transfer') result = await transferTask(currentTask.value!.id, { toUserId: target.value!, reason: opinion.value });
    else if (action.value === 'reject') result = await rejectTask(currentTask.value!.id, { opinion: opinion.value });
    else result = await approveTask(currentTask.value!.id, { opinion: opinion.value });
    if (result.error) return;
    actionVisible.value = false;
    window.$message?.success('操作成功');
    emit('changed');
    await load();
  } finally { processing.value = false; }
}

watch(visible, show => {
  if (show) { detail.value = undefined; void load(); }
  else { loadVersion += 1; actionVisible.value = false; }
});
</script>

<template>
  <NDrawer
    v-model:show="visible"
    :width="900"
    class="max-w-95%"
    :mask-closable="!processing"
    :close-on-esc="!processing"
  >
    <NDrawerContent title="审批详情" :native-scrollbar="false" :closable="!processing">
      <NSpin :show="loading">
        <NAlert v-if="failed" type="error">
          详情加载失败或已无权访问。
          <NButton text @click="load">重试</NButton>
        </NAlert>
        <template v-else-if="detail">
          <div class="mb-16px flex flex-wrap items-center gap-12px">
            <h2 class="text-18px font-semibold break-all">{{ detail.instance.title }}</h2>
            <NTag :type="statusTypes[detail.instance.status]">{{ statusLabels[detail.instance.status] }}</NTag>
          </div>
          <NAlert :type="currentTask ? 'warning' : 'info'" class="mb-16px">
            <template v-if="currentTask">
              待你处理：{{ currentTask.nodeName }}。请先查看申请内容和历史，再选择处理动作。
            </template>
            <template v-else-if="detail.instance.status === 'PENDING'">
              {{ personalState }}。当前申请节点：{{ currentNodeName }}。
            </template>
            <template v-else>
              {{ personalState }}，申请最终状态为“{{ statusLabels[detail.instance.status] }}”。
            </template>
          </NAlert>
          <NDescriptions bordered :column="2" label-placement="top" size="small">
            <NDescriptionsItem label="发起人">{{ userName(detail.instance.startUser) }}</NDescriptionsItem>
            <NDescriptionsItem label="发起时间">{{ detail.instance.startTime }}</NDescriptionsItem>
          </NDescriptions>
          <NCollapse class="mt-12px">
            <NCollapseItem title="技术信息" name="technical">
              <NDescriptions bordered :column="2" size="small">
                <NDescriptionsItem label="申请编号">{{ detail.instance.id }}</NDescriptionsItem>
                <NDescriptionsItem label="审批编码">{{ detail.instance.definitionCode }}</NDescriptionsItem>
                <NDescriptionsItem label="业务类型">{{ detail.instance.businessType }}</NDescriptionsItem>
                <NDescriptionsItem label="业务单号">{{ detail.instance.businessKey }}</NDescriptionsItem>
              </NDescriptions>
            </NCollapseItem>
          </NCollapse>
          <NDivider title-placement="left">申请内容</NDivider>
          <FormRenderer v-if="detail.instance.formConfig" :config="formConfig" :model-value="formValues" readonly />
          <pre v-else class="max-h-320px overflow-auto whitespace-pre-wrap break-all rounded bg-layout p-12px">{{ formContent }}</pre>
          <NDivider title-placement="left">审批任务</NDivider>
          <NDataTable
            :columns="taskColumns"
            :data="detail.tasks"
            :row-key="row => row.id"
            :scroll-x="700"
            size="small"
          />
          <NDivider title-placement="left">操作历史</NDivider>
          <NTimeline>
            <NTimelineItem
              v-for="item in detail.history"
              :key="item.id"
              :title="`${userName(item.operator)} · ${actionLabels[item.action]}`"
              :time="item.createTime"
            >
              <div v-if="item.nodeName">{{ item.nodeName }}</div>
              <div v-if="item.opinion" class="whitespace-pre-wrap break-all">{{ item.opinion }}</div>
              <div v-if="item.toUser">转办给 {{ userName(item.toUser) }}</div>
            </NTimelineItem>
          </NTimeline>
          <NEmpty v-if="!detail.history.length" description="暂无操作历史" />
        </template>
      </NSpin>
      <template #footer>
        <NSpace justify="end">
          <NButton :disabled="processing" @click="load">刷新</NButton>
          <NButton
            v-if="canCancel"
            type="warning"
            :disabled="loading || processing || failed"
            @click="openAction('cancel')"
          >
            撤销申请
          </NButton>
          <template v-if="currentTask">
            <NButton
              v-if="hasAuth('approval:task:transfer')"
              :disabled="loading || processing || failed"
              @click="openAction('transfer')"
            >
              转办
            </NButton>
            <NButton
              v-if="hasAuth('approval:task:reject')"
              type="error"
              :disabled="loading || processing || failed"
              @click="openAction('reject')"
            >
              拒绝
            </NButton>
            <NButton
              v-if="hasAuth('approval:task:approve')"
              type="primary"
              :disabled="loading || processing || failed"
              @click="openAction('approve')"
            >
              同意
            </NButton>
          </template>
        </NSpace>
      </template>
    </NDrawerContent>
  </NDrawer>
  <NModal
    v-model:show="actionVisible"
    preset="card"
    :title="actionTitle"
    class="w-480px max-w-90%"
    :mask-closable="!processing"
    :close-on-esc="!processing"
    :closable="!processing"
  >
    <NAlert v-if="action === 'reject' || action === 'cancel'" type="warning" class="mb-16px">
      本操作将结束此申请，未处理的任务将取消。请确认后提交。
    </NAlert>
    <NForm :disabled="processing">
      <NFormItem v-if="action === 'transfer'" label="转办用户" required>
        <NSelect
          v-model:value="target"
          :options="users"
          :loading="usersLoading"
          filterable
          placeholder="选择同一租户的用户"
        />
      </NFormItem>
      <NAlert v-if="action === 'transfer' && usersFailed" type="error" class="mb-16px">
        用户加载失败。
        <NButton text @click="loadUsers">重试</NButton>
      </NAlert>
      <NFormItem :label="action === 'approve' ? '审批意见' : '原因'" :required="action !== 'approve'">
        <NInput
          v-model:value="opinion"
          type="textarea"
          :maxlength="500"
          show-count
          :autosize="{ minRows: 3, maxRows: 8 }"
        />
      </NFormItem>
    </NForm>
    <template #footer>
      <NSpace justify="end">
        <NButton :disabled="processing" @click="actionVisible = false">取消</NButton>
        <NButton type="primary" :loading="processing" @click="confirmAction">确认提交</NButton>
      </NSpace>
    </template>
  </NModal>
</template>
