<script setup lang="ts">
import { toRaw } from 'vue';
import { jsonClone } from '@sa/utils';
import { useNaiveForm } from '@/hooks/common/form';
import { $t } from '@/locales';

defineOptions({
  name: 'DictDataSearch'
});

interface Emits {
  (e: 'reset'): void;
  (e: 'search'): void;
}

const emit = defineEmits<Emits>();

const { formRef, validate, restoreValidation } = useNaiveForm();

const model = defineModel<Api.System.ContinewDictItemQuery>('model', { required: true });

const defaultModel = jsonClone(toRaw(model.value));

function resetModel() {
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
  <NCard :bordered="false" class="table-search card-wrapper">
    <NCollapse>
      <NCollapseItem :title="$t('common.search')" name="search">
        <NForm ref="formRef" label-placement="left" :label-width="80" :model="model">
          <NGrid responsive="screen" cols="1 s:2 m:3" :x-gap="8" :y-gap="8" item-responsive>
            <NFormItemGi
              span="24 s:12 m:8"
              :label="$t('page.system.dict.data.label')"
              path="description"
              class="pr-24px"
            >
              <NInput v-model:value="model.description" :placeholder="$t('page.system.dict.data.label')" />
            </NFormItemGi>
            <NFormItemGi span="24 s:12 m:8" :label="$t('page.system.dict.data.status')" path="status" class="pr-24px">
              <DictSelect v-model:value="model.status" dict-code="dis_enable_status_enum" clearable />
            </NFormItemGi>
            <NFormItemGi span="24 s:12 m:8" class="pr-24px">
              <NSpace class="w-full" justify="end">
                <NButton @click="reset">
                  <template #icon>
                    <icon-ic-round-refresh class="text-icon" />
                  </template>
                  {{ $t('common.reset') }}
                </NButton>
                <NButton type="primary" ghost @click="search">
                  <template #icon>
                    <icon-ic-round-search class="text-icon" />
                  </template>
                  {{ $t('common.search') }}
                </NButton>
              </NSpace>
            </NFormItemGi>
          </NGrid>
        </NForm>
      </NCollapseItem>
    </NCollapse>
  </NCard>
</template>
