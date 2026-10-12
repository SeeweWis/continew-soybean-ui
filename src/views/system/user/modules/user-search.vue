<script setup lang="ts">
import { ref, toRaw } from 'vue';
import { NDatePicker } from 'naive-ui';
import { jsonClone } from '@sa/utils';
import { useNaiveForm } from '@/hooks/common/form';
import { $t } from '@/locales';

defineOptions({
  name: 'UserSearch'
});

interface Emits {
  (e: 'reset'): void;
  (e: 'search'): void;
}

const emit = defineEmits<Emits>();

const { formRef, validate, restoreValidation } = useNaiveForm();

const model = defineModel<Api.System.ContinewUserQuery>('model', { required: true });

const defaultModel = jsonClone(toRaw(model.value));

const dateRangeCreateTime = ref<[string, string] | null>(null);

function onDateRangeCreateTimeUpdate(value: [string, string] | null) {
  model.value.createTime = value;
}

function resetModel() {
  dateRangeCreateTime.value = null;
  Object.assign(model.value, defaultModel);
}

async function reset() {
  await restoreValidation();
  resetModel();
  emit('reset');
}

async function search() {
  await validate();
  emit('search');
}
</script>

<template>
  <NForm ref="formRef" :model="model" label-placement="left" :label-width="72" size="small">
    <NGrid responsive="screen" item-responsive :x-gap="12" :y-gap="8">
      <NFormItemGi span="24 s:12 m:8" label="用户名" path="description">
        <NInput v-model:value="model.description" placeholder="用户名/昵称/描述" @keyup.enter="search" />
      </NFormItemGi>
      <NFormItemGi span="24 s:12 m:8" :label="$t('page.system.user.status')" path="status">
        <DictSelect
          v-model:value="model.status"
          :placeholder="$t('page.system.user.form.status.required')"
          dict-code="dis_enable_status_enum"
          clearable
        />
      </NFormItemGi>
      <NFormItemGi span="24 s:12 m:8" :label="$t('page.system.user.createTime')" path="createTime">
        <NDatePicker
          v-model:formatted-value="dateRangeCreateTime"
          type="datetimerange"
          value-format="yyyy-MM-dd HH:mm:ss"
          clearable
          :default-time="['00:00:00', '23:59:59']"
          @update:formatted-value="onDateRangeCreateTimeUpdate"
        />
      </NFormItemGi>
      <NFormItemGi span="24" class="flex justify-end">
        <NSpace>
          <NButton type="primary" @click="search">
            <template #icon><icon-ic-round-search class="text-icon" /></template>
            {{ $t('common.search') }}
          </NButton>
          <NButton @click="reset">
            <template #icon><icon-ic-round-refresh class="text-icon" /></template>
            {{ $t('common.reset') }}
          </NButton>
        </NSpace>
      </NFormItemGi>
    </NGrid>
  </NForm>
</template>

<style scoped></style>
