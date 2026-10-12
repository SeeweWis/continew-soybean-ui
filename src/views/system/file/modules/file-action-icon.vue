<script setup lang="ts">
import type { Component } from 'vue';
import LayoutGrid from '~icons/lucide/layout-grid';
import ChevronUp from '~icons/lucide/chevron-up';
import Upload from '~icons/lucide/upload';
import Folder from '~icons/lucide/folder';
import Search from '~icons/lucide/search';
import Trash from '~icons/lucide/trash-2';
import ListChecks from '~icons/lucide/list-checks';
import List from '~icons/lucide/list';
import Link from '~icons/lucide/link';
import Ellipsis from '~icons/lucide/ellipsis';
import Copy from '~icons/lucide/copy';
import Pencil from '~icons/lucide/pencil';
import Info from '~icons/lucide/info';
import Download from '~icons/lucide/download';
import Play from '~icons/lucide/play';
import Pause from '~icons/lucide/pause';
import RotateCw from '~icons/lucide/rotate-cw';
import RefreshCw from '~icons/lucide/refresh-cw';
import Close from '~icons/lucide/x';
import Music from '~icons/lucide/music';
import ExternalLink from '~icons/lucide/external-link';

defineProps<{ icon: string }>();
const icons: Record<string, Component> = {
  'lucide:layout-grid': LayoutGrid,
  'lucide:chevron-up': ChevronUp,
  'lucide:upload': Upload,
  'lucide:folder': Folder,
  'lucide:search': Search,
  'lucide:trash-2': Trash,
  'lucide:list-checks': ListChecks,
  'lucide:list': List,
  'lucide:link': Link,
  'lucide:ellipsis': Ellipsis,
  'lucide:copy': Copy,
  'lucide:pencil': Pencil,
  'lucide:info': Info,
  'lucide:download': Download,
  'lucide:play': Play,
  'lucide:pause': Pause,
  'lucide:rotate-cw': RotateCw,
  'lucide:refresh-cw': RefreshCw,
  'lucide:x': Close,
  'lucide:music': Music,
  'lucide:external-link': ExternalLink
};
</script>

<template><component :is="icons[icon]" aria-hidden="true" /></template>
