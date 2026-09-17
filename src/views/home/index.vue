<script setup lang="ts">
import HeaderBanner from './modules/header-banner.vue';
import QuickActions from './modules/quick-actions.vue';
import ProjectList from './modules/project-list.vue';
import ProjectNews from './modules/project-news.vue';
import { $t } from '@/locales';
</script>

<template>
  <NGrid :x-gap="16" :y-gap="16" responsive="screen" item-responsive class="workplace-grid">
    <NGi span="24 s:24 m:19">
      <NSpace vertical :size="16">
        <HeaderBanner />
        <ProjectList />
        <ProjectNews />
      </NSpace>
    </NGi>
    <NGi span="24 s:24 m:5">
      <NSpace vertical :size="16">
        <QuickActions />
        <NCard title="公告" :bordered="false" size="small" class="card-wrapper">
          <template #header-extra>
            <a class="text-primary" href="javascript:;">{{ $t('page.home.projectNews.moreNews') }}</a>
          </template>
          <NEmpty :description="$t('common.noData')" class="py-16px" />
        </NCard>
        <NCard title="帮助文档" :bordered="false" size="small" class="card-wrapper">
          <NSpace vertical :size="8">
            <a
              class="text-primary"
              href="https://continew.top/docs/admin/guide/introduction.html"
              target="_blank"
              rel="noopener noreferrer"
            >
              项目简介
            </a>
            <a
              class="text-primary"
              href="https://continew.top/docs/admin/guide/quick-start.html"
              target="_blank"
              rel="noopener noreferrer"
            >
              快速开始
            </a>
            <a
              class="text-primary"
              href="https://continew.top/docs/admin/faq.html"
              target="_blank"
              rel="noopener noreferrer"
            >
              常见问题
            </a>
          </NSpace>
        </NCard>
      </NSpace>
    </NGi>
  </NGrid>
</template>

<style scoped></style>
