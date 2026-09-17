import { ref, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { fetchGetCommonDict } from '@/service/api/system';
import { useDictStore } from '@/store/modules/dict';
import { isNull } from '@/utils/common';

export function useDict(dictCode: string, immediate: boolean = true) {
  const dictStore = useDictStore();
  const { dictData: dictList } = storeToRefs(dictStore);

  const data = ref<Api.System.LabelValue[]>([]);
  const record = ref<Record<string, string>>({});
  const options = ref<CommonType.Option<string | number>[]>([]);

  async function getData() {
    if (!dictCode) return;

    const dicts = dictStore.getDict(dictCode);
    // 空数组也代表该字典已请求过，避免渲染时对同一编码反复发起请求。
    if (dicts) {
      data.value = dicts;
      return;
    }
    const { data: dictData, error } = await fetchGetCommonDict(dictCode);
    if (error) return;
    dictStore.setDict(dictCode, dictData);
    data.value = dictData;
  }

  async function getRecord() {
    if (!data.value.length) {
      await getData();
    }
    data.value.forEach(dict => {
      record.value[String(dict.value)] = dict.label;
    });
  }

  async function getOptions() {
    if (!data.value.length) {
      await getData();
    }

    options.value = data.value.map(dict => ({
      label: dict.label,
      value: dict.value
    }));
  }

  function transformDictData(dictValue: string[] | number[] | string | number) {
    if (isNull(dictValue)) return undefined;
    const currentData = dictStore.getDict(dictCode) ?? data.value;
    if (!currentData.length) return undefined;
    if (Array.isArray(dictValue)) {
      return currentData.filter(dict => dictValue.some(value => String(dict.value) === value.toString()));
    }
    return currentData.filter(dict => String(dict.value) === dictValue.toString());
  }

  // 无论是否 immediate 都主动拉取一次（store 缓存去重），避免多个组件互相等待导致死锁
  if (dictCode) {
    getData().then(() => {
      getRecord();
      getOptions();
    });
  }
  if (dictCode && !immediate) {
    watch(
      () => dictList.value[dictCode],
      val => {
        if (val && val.length) {
          getRecord();
          getOptions();
        }
      },
      { immediate: true }
    );
  }

  return {
    data,
    record,
    options,
    getData,
    getRecord,
    getOptions,
    transformDictData
  };
}
