<script setup lang="ts">
import { ref } from 'vue';
import { useLoading } from '@sa/hooks';
import { fetchGetRoleDict } from '@/service/api/system';

defineOptions({
  name: 'RoleSelect',
  inheritAttrs: false
});

interface Props {
  [key: string]: any;
}

defineProps<Props>();

const value = defineModel<CommonType.IdType | CommonType.IdType[] | null>('value', { required: false });

const { loading: roleLoading, startLoading: startRoleLoading, endLoading: endRoleLoading } = useLoading();

/** the role options */
const roleOptions = ref<{ label: string; value: CommonType.IdType }[]>([]);

async function getRoleOptions() {
  startRoleLoading();
  const { error, data } = await fetchGetRoleDict();

  if (!error) {
    roleOptions.value = data.map(item => ({
      label: item.label,
      value: item.value as CommonType.IdType
    }));
  }
  endRoleLoading();
}

getRoleOptions();
</script>

<template>
  <NSelect
    v-model:value="value"
    :loading="roleLoading"
    :options="roleOptions"
    v-bind="$attrs"
    placeholder="请选择角色"
  />
</template>

<style scoped></style>
