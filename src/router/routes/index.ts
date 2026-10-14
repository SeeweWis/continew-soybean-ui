import type { CustomRoute, ElegantConstRoute, ElegantRoute, RouteKey } from '@elegant-router/types';
import { generatedRoutes } from '../elegant/routes';
import { layouts, views } from '../elegant/imports';
import { transformElegantRoutesToVueRoutes } from '../elegant/transform';

/**
 * custom routes
 *
 * @link https://github.com/soybeanjs/elegant-router?tab=readme-ov-file#custom-route
 */
const customRoutes: CustomRoute[] = [];

/** create routes when the auth route mode is static */
export function createStaticRoutes() {
  const constantRoutes: ElegantRoute[] = [];

  const authRoutes: ElegantRoute[] = [];

  [...customRoutes, ...generatedRoutes].forEach(item => {
    // The route store injects the local workbench in both auth modes.
    if (item.name === 'home' || item.name === 'workbench') return;

    if (item.meta?.constant) {
      constantRoutes.push(item);
    } else {
      authRoutes.push(item);
    }
  });

  return {
    constantRoutes,
    authRoutes
  };
}

const dynamicConstantRoutes: ElegantRoute[] = [
  {
    name: 'workbench',
    path: '/workbench',
    component: 'layout.base',
    redirect: '/home',
    meta: {
      title: '工作台',
      i18nKey: 'route.workbench',
      icon: 'mdi:monitor-dashboard',
      order: -1
    },
    children: [
      {
        name: 'workbench_home',
        path: '/home',
        component: 'view.workbench_home',
        meta: {
          title: '首页',
          i18nKey: 'route.workbench_home',
          icon: 'mdi:home-outline',
          order: 0
        }
      },
      {
        name: 'workbench_charts',
        path: '/workbench/charts',
        component: 'view.workbench_charts',
        meta: {
          title: '仪表盘',
          i18nKey: 'route.workbench_charts',
          icon: 'mdi:chart-box-outline',
          order: 1
        }
      }
    ]
  },
  {
    name: '403',
    path: '/403',
    component: 'layout.blank$view.403',
    meta: {
      title: '403',
      i18nKey: 'route.403',
      constant: true,
      hideInMenu: true
    }
  },
  {
    name: '404',
    path: '/404',
    component: 'layout.blank$view.404',
    meta: {
      title: '404',
      i18nKey: 'route.404',
      constant: true,
      hideInMenu: true
    }
  },
  {
    name: '500',
    path: '/500',
    component: 'layout.blank$view.500',
    meta: {
      title: '500',
      i18nKey: 'route.500',
      constant: true,
      hideInMenu: true
    }
  },
  {
    name: 'login',
    path: '/login/:module(pwd-login|code-login|email-login|register|reset-pwd|bind-wechat)?',
    component: 'layout.blank$view.login',
    props: true,
    meta: {
      title: 'login',
      i18nKey: 'route.login',
      constant: true,
      hideInMenu: true
    }
  },
  {
    name: 'iframe-page',
    path: '/iframe-page/:url',
    component: 'layout.base$view.iframe-page',
    props: true,
    meta: {
      title: 'iframe-page',
      i18nKey: 'route.iframe-page',
      constant: true,
      hideInMenu: true,
      keepAlive: true,
      icon: 'material-symbols:iframe-outline'
    }
  },
  {
    name: 'social-callback',
    path: '/social-callback',
    component: 'layout.blank$view.social-callback',
    meta: {
      title: 'social-callback',
      i18nKey: 'route.social-callback',
      constant: true,
      hideInMenu: true,
      icon: 'simple-icons:authy'
    }
  },
  {
    name: 'user-center',
    path: '/user-center',
    component: 'layout.base$view.user-center',
    meta: {
      title: 'user-center',
      i18nKey: 'route.user-center',
      icon: 'material-symbols:account-circle-full',
      hideInMenu: true
    }
  }
];

/** create routes when the auth route mode is static */
export function createDynamicRoutes() {
  const constantRoutes: ElegantConstRoute[] = [];

  const authRoutes: ElegantConstRoute[] = [];

  [...customRoutes, ...dynamicConstantRoutes].forEach(item => {
    if (item.meta?.constant) {
      constantRoutes.push(item);
    } else {
      authRoutes.push(item);
    }
  });

  return {
    constantRoutes,
    authRoutes
  };
}

const layoutRouteKeys = new Set<RouteKey>([
  'monitor',
  'open',
  'schedule',
  'system',
  'tenant',
  'tool',
  'code'
] as RouteKey[]);

/** Transform ContiNew server routes into routes supported by the current elegant-router setup. */
export function createServerDynamicRoutes(routes: Api.Auth.Route[]) {
  return routes.flatMap(transformServerDynamicRoute);
}

function transformServerDynamicRoute(route: Api.Auth.Route): ElegantConstRoute[] {
  if (route.type === 3) {
    return [];
  }

  const meta = {
    title: route.title,
    icon: route.icon,
    order: route.sort,
    hideInMenu: route.isHidden,
    keepAlive: route.isCache
  };

  if (route.component === 'Layout') {
    const name = route.path.replace(/^\//, '').replaceAll('/', '_') as RouteKey;
    const children = route.children?.flatMap(transformServerDynamicRoute);
    if (!layoutRouteKeys.has(name) || !children?.length) {
      return [];
    }

    return [
      {
        name,
        path: route.path,
        component: 'layout.base',
        redirect: route.redirect,
        meta,
        children
      }
    ];
  }

  const viewName = route.component
    ?.replace(/^\//, '')
    .replace(/\/index$/, '')
    .replaceAll('/', '_');
  if (!viewName || !(viewName in views)) {
    return [];
  }

  // 子菜单平铺为同级路由：后端路径均为绝对路径，且 elegant 转换器会给
  // 带 children 的视图路由自动加 redirect 到第一个子路由，导致点击
  // 父菜单（如通知公告）跳到隐藏子页（如查看公告）
  const self: ElegantConstRoute = {
    name: viewName as RouteKey,
    path: route.path,
    component: `view.${viewName}`,
    redirect: route.redirect,
    meta
  };
  return [self, ...(route.children?.flatMap(transformServerDynamicRoute) ?? [])];
}

/**
 * Get auth vue routes
 *
 * @param routes Elegant routes
 */
export function getAuthVueRoutes(routes: ElegantConstRoute[]) {
  return transformElegantRoutesToVueRoutes(routes, layouts, views);
}
