import { computed, reactive } from 'vue';
import { useRoute } from 'vue-router';
import { defineStore } from 'pinia';
import { useLoading } from '@sa/hooks';
import { fetchGetUserInfo, fetchLogin, fetchLogout } from '@/service/api';
import { request } from '@/service/request';
import { handleExpiredRequest } from '@/service/request/shared';
import { useRouterPush } from '@/hooks/common/router';
import { localStg } from '@/utils/storage';
import { encryptPassword } from '@/utils/jsencrypt';
import { SetupStoreId } from '@/enum';
import { useRouteStore } from '../route';
import { useTabStore } from '../tab';
import { useNoticeStore } from '../notice';
import { accessToken, clearAuthStorage, getToken, getSessionVersion, setAccessSession } from './shared';

export const useAuthStore = defineStore(SetupStoreId.Auth, () => {
  const route = useRoute();
  const authStore = useAuthStore();
  const routeStore = useRouteStore();
  const tabStore = useTabStore();
  const noticeStore = useNoticeStore();
  const { toLogin, redirectFromLogin } = useRouterPush(false);
  const { loading: loginLoading, startLoading, endLoading } = useLoading();

  const token = accessToken;
  let restored = false;
  let restorePromise: Promise<void> | null = null;

  const userInfo: Api.Auth.UserInfo = reactive({
    roles: [],
    permissions: [],
    roleNames: []
  });

  /** is super role in static route */
  const isStaticSuper = computed(() => {
    const { VITE_AUTH_ROUTE_MODE, VITE_STATIC_SUPER_ROLE } = import.meta.env;

    return VITE_AUTH_ROUTE_MODE === 'static' && userInfo.roles.includes(VITE_STATIC_SUPER_ROLE);
  });

  /** Is login */
  const isLogin = computed(() => Boolean(token.value));

  /** Reset auth store */
  async function resetStore(redirect = true) {
    restored = true;
    recordUserId();

    clearAuthStorage();

    authStore.$reset();

    if (redirect && !route?.meta.constant) {
      await toLogin();
    }

    noticeStore.clearNotice();
    tabStore.cacheTabs();
    routeStore.resetStore();
  }

  async function logout() {
    const previousToken = getToken();
    clearAuthStorage();
    await request.state.refreshTokenPromise;
    try {
      await fetchLogout(previousToken);
    } finally {
      await resetStore();
    }
  }

  /** Record the user ID of the previous login session Used to compare with the current user ID on next login */
  function recordUserId() {
    if (!userInfo.id) {
      return;
    }

    // Store current user ID locally for next login comparison
    localStg.set('lastLoginUserId', userInfo.id);
  }

  /**
   * Check if current login user is different from previous login user If different, clear all tabs
   *
   * @returns {boolean} Whether to clear all tabs
   */
  function checkTabClear(): boolean {
    if (!userInfo.id) {
      return false;
    }

    const lastLoginUserId = localStg.get('lastLoginUserId');

    // Clear all tabs if current user is different from previous user
    if (!lastLoginUserId || lastLoginUserId !== userInfo.id) {
      localStg.remove('globalTabs');
      tabStore.clearTabs();

      localStg.remove('lastLoginUserId');
      return true;
    }

    localStg.remove('lastLoginUserId');
    return false;
  }

  /**
   * Login
   *
   * @param [redirect=true] Whether to redirect after login. Default is `true`
   */
  async function login(loginForm: Api.Auth.LoginForm, redirect = true) {
    if (loginLoading.value) return;
    startLoading();
    restored = true;
    clearAuthStorage();
    const version = getSessionVersion();
    try {
      await request.state.refreshTokenPromise;
      if (version !== getSessionVersion()) return;

      const { VITE_APP_CLIENT_ID } = import.meta.env;

      const loginData: Api.Auth.LoginForm = {
        ...loginForm,
        clientId: VITE_APP_CLIENT_ID!
      };

      if (loginData.authType === 'ACCOUNT') {
        loginData.password = encryptPassword(loginData.password);
      }

      const { data: loginToken, error } = await fetchLogin(loginData);
      if (version !== getSessionVersion()) return;

      if (!error) {
        const pass = await loginByToken(loginToken);

        if (pass) {
          // Check if the tab needs to be cleared
          const isClear = checkTabClear();
          let needRedirect = redirect;

          if (isClear) {
            // If the tab needs to be cleared,it means we don't need to redirect.
            needRedirect = false;
          }
          await redirectFromLogin(needRedirect);

          // window.$notification?.success({
          //   title: $t('page.login.common.loginSuccess'),
          //   content: $t('page.login.common.welcomeBack', { userName: userInfo.userName }),
          //   duration: 4500
          // });
        }
      } else {
        void resetStore(false);
      }

      return error ? Promise.reject(error) : Promise.resolve();
    } finally {
      endLoading();
    }
  }

  async function loginByToken(loginToken: Api.Auth.LoginToken) {
    if (!loginToken.accessToken) throw new Error('登录响应缺少 accessToken');
    setAccessSession(loginToken);

    // 2. get user info
    const pass = await getUserInfo();

    if (pass) {
      return true;
    }

    await resetStore(false);
    return false;
  }

  async function getUserInfo() {
    const version = getSessionVersion();
    const { data: info, error } = await fetchGetUserInfo();

    if (!error && version === getSessionVersion() && getToken()) {
      // update store
      Object.assign(userInfo, info);

      return true;
    }

    return false;
  }

  async function initUserInfo() {
    const maybeToken = getToken();

    if (maybeToken) {
      token.value = maybeToken;
      const pass = await getUserInfo();

      if (!pass) {
        void resetStore(false);
      }
    }
  }

  async function restoreSession() {
    if (restored) return restorePromise;
    restored = true;
    restorePromise = (async () => {
      const success = await handleExpiredRequest(request.state);
      if (success) await initUserInfo();
    })();
    try {
      await restorePromise;
    } finally {
      restorePromise = null;
    }
  }

  return {
    token,
    userInfo,
    isStaticSuper,
    isLogin,
    loginLoading,
    resetStore,
    login,
    logout,
    restoreSession,
    initUserInfo
  };
});
