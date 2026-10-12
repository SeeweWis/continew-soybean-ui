import { computed, onMounted, ref, toValue, watch } from 'vue';
import type { MaybeRefOrGetter } from 'vue';
import { useDictStore } from '@/store/modules/dict';
import { isNull } from '@/utils/common';

export function useDict(dictCode: MaybeRefOrGetter<string>, immediate: boolean = true) {
  const dictStore = useDictStore();
  const code = computed(() => toValue(dictCode));
  const data = computed(() => dictStore.getDict(code.value) ?? []);
  const record = computed<Record<string, string>>(() =>
    Object.fromEntries(data.value.map(dict => [String(dict.value), dict.label]))
  );
  const options = computed<CommonType.Option<string | number>[]>(() =>
    data.value.map(dict => ({ label: dict.label, value: dict.value }))
  );
  const loading = ref(false);
  const loadError = ref(false);

  async function getData() {
    const currentCode = code.value;
    if (!currentCode) {
      loading.value = false;
      loadError.value = false;
      return;
    }
    loading.value = true;
    loadError.value = false;
    try {
      const items = await dictStore.loadDict(currentCode);
      if (currentCode === code.value) loadError.value = items === undefined;
    } catch {
      if (currentCode === code.value) loadError.value = true;
    } finally {
      if (currentCode === code.value) loading.value = false;
    }
  }

  async function getRecord() {
    await getData();
    return record.value;
  }

  async function getOptions() {
    await getData();
    return options.value;
  }

  function transformDictData(dictValue: string[] | number[] | string | number) {
    if (isNull(dictValue)) return undefined;
    const values = Array.isArray(dictValue) ? dictValue : [dictValue];
    return data.value.filter(dict => values.some(value => String(dict.value) === String(value)));
  }

  watch(code, () => getData(), { immediate });
  if (!immediate) onMounted(getData);

  return { data, record, options, loading, loadError, getData, getRecord, getOptions, transformDictData };
}
