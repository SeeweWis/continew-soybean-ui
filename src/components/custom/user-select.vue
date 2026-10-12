<script setup lang="ts">
import { ref } from 'vue';
import { useLoading } from '@sa/hooks';
import { fetchGetUserDict } from '@/service/api/system';

defineOptions({
  name: 'UserSelect',
  inheritAttrs: false
});

interface Props {
  multiple?: boolean;
  [key: string]: any;
}

defineProps<Props>();

const value = defineModel<CommonType.IdType | CommonType.IdType[] | null>('value', { required: false });

const { loading: userLoading, startLoading: startUserLoading, endLoading: endUserLoading } = useLoading();

/** the user options */
const userOptions = ref<{ label: string; value: CommonType.IdType }[]>([]);

async function getUserOptions() {
  startUserLoading();
  const { error, data } = await fetchGetUserDict();

  if (!error) {
    userOptions.value = data.map(item => ({
      label: item.label,
      value: item.value as CommonType.IdType
    }));
  }
  endUserLoading();
}

getUserOptions();
</script>

<template>
  <NSelect
    v-model:value="value"
    :multiple="multiple"
    :loading="userLoading"
    :options="userOptions"
    v-bind="$attrs"
    placeholder="请选择用户"
  />
</template>

<style scoped></style>
