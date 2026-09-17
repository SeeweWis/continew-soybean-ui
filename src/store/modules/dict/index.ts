import { ref } from 'vue';
import { defineStore } from 'pinia';
import { SetupStoreId } from '@/enum';

export const useDictStore = defineStore(SetupStoreId.Dict, () => {
  const dictData = ref<{ [key: string]: Api.System.LabelValue[] }>({});

  const getDict = (key: string) => {
    return dictData.value[key];
  };

  const setDict = (key: string, dict: Api.System.LabelValue[]) => {
    dictData.value[key] = dict;
  };

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
    removeDict,
    cleanDict
  };
});

export default useDictStore;
