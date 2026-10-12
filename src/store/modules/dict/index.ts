import { ref } from 'vue';
import { defineStore } from 'pinia';
import { SetupStoreId } from '@/enum';
import { fetchGetCommonDict } from '@/service/api/system/dict';

export const useDictStore = defineStore(SetupStoreId.Dict, () => {
  const dictData = ref<{ [key: string]: Api.System.LabelValue[] }>({});
  const pendingRequests = new Map<string, Promise<Api.System.LabelValue[] | undefined>>();

  const getDict = (key: string) => {
    return dictData.value[key];
  };

  const setDict = (key: string, dict: Api.System.LabelValue[]) => {
    dictData.value[key] = dict;
  };

  async function loadDict(key: string) {
    const cached = getDict(key);
    if (cached) return cached;
    let pending = pendingRequests.get(key);
    if (!pending) {
      pending = fetchGetCommonDict(key)
        .then(({ data, error }) => {
          if (error) return undefined;
          const items = data ?? [];
          setDict(key, items);
          return items;
        })
        .finally(() => pendingRequests.delete(key));
      pendingRequests.set(key, pending);
    }
    return pending;
  }

  const removeDict = (key: string) => {
    if (key in dictData.value) {
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete dictData.value[key];
    }
  };

  const cleanDict = () => {
    dictData.value = {};
  };

  return {
    dictData,
    getDict,
    setDict,
    loadDict,
    removeDict,
    cleanDict
  };
});

export default useDictStore;
