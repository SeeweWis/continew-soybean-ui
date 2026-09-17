<script setup lang="tsx">
import { onMounted } from 'vue';
import type { TreeOption } from 'naive-ui';
import { useLoading } from '@sa/hooks';
import { fetchGetMenuTree } from '@/service/api/system';
import SvgIcon from '@/components/custom/svg-icon.vue';

defineOptions({
  name: 'MenuTreeSelect',
  inheritAttrs: false
});

interface Props {
  immediate?: boolean;
  [key: string]: any;
}

const props = withDefaults(defineProps<Props>(), {
  immediate: true
});

const value = defineModel<CommonType.IdType | null>('value', { required: false });
const options = defineModel<Api.System.ContinewMenu[]>('options', { required: false, default: [] });

const { loading, startLoading, endLoading } = useLoading();

async function getMenuTree() {
  startLoading();
  const { error, data } = await fetchGetMenuTree();
  if (error) {
    endLoading();
    return;
  }
  // 上级菜单仅可选目录和菜单，根节点为 0
  const filterButtons = (menus: Api.System.ContinewMenu[]): Api.System.ContinewMenu[] =>
    menus
      .filter(item => item.type !== 3)
      .map(item => ({ ...item, children: item.children ? filterButtons(item.children) : undefined }));
  options.value = [
    {
      id: 0,
      title: '根目录',
      parentId: 0,
      type: 1,
      status: 1,
      children: filterButtons(data)
    }
  ];
  endLoading();
}

onMounted(() => {
  if (props.immediate) {
    getMenuTree();
  }
});

function renderLabel({ option }: { option: TreeOption }) {
  return <div>{String(option.title)}</div>;
}

function renderPrefix({ option }: { option: TreeOption }) {
  const renderLocalIcon = String(option.icon ?? '').startsWith('local-icon-');
  const icon = renderLocalIcon ? undefined : String(option.icon ?? '');
  const localIcon = renderLocalIcon ? String(option.icon).replace('local-icon-', 'menu-') : undefined;
  return <SvgIcon icon={icon} localIcon={localIcon} />;
}
</script>

<template>
  <NTreeSelect
    v-model:value="value"
    filterable
    class="h-full"
    :loading="loading"
    key-field="id"
    label-field="title"
    :options="(options as unknown as TreeOption[])"
    :default-expanded-keys="[0]"
    :render-label="renderLabel"
    :render-prefix="renderPrefix"
    v-bind="$attrs"
  />
</template>

<style scoped></style>
