import type { AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { BACKEND_ERROR_CODE, REQUEST_CANCELED_CODE, createFlatRequest } from '@sa/axios';
import { useAuthStore } from '@/store/modules/auth';
import { getToken, getSessionVersion } from '@/store/modules/auth/shared';
import { localStg, sessionStg } from '@/utils/storage';
import { getServiceBaseURL } from '@/utils/service';
import { getAuthorization, handleExpiredRequest, showErrorMsg } from './shared';
import type { RequestInstanceState } from './type';

const isHttpProxy = import.meta.env.DEV && import.meta.env.VITE_HTTP_PROXY === 'Y';
const { baseURL } = getServiceBaseURL(import.meta.env, isHttpProxy);

export const request = createFlatRequest(
  {
    baseURL,
    withCredentials: true,
    'axios-retry': {
      retries: 0
    }
  },
  {
    defaultState: {
      errMsgStack: [],
      refreshTokenPromise: null
    } as RequestInstanceState,
    transform(response: AxiosResponse<App.Service.Response<any>>) {
      // 二进制数据则直接返回
      if (response.request.responseType === 'blob' || response.request.responseType === 'arraybuffer') {
        return response.data;
      }

      if (response.data.rows) {
        return response.data;
      }

      return response.data.data;
    },
    async onRequest(config) {
      config.authSessionVersion ??= getSessionVersion();
      const isToken = config.headers?.isToken === false;
      // set token
      if (!isToken) {
        const Authorization = getAuthorization();
        Object.assign(config.headers, { Authorization });
      }

      // 租户上下文请求头，后端默认租户 ID 为 0
      const tenantId = localStg.get('tenantId');
      if (tenantId !== null) {
        config.headers['X-Tenant-Id'] = tenantId;
      }
      // 对应国际化资源文件后缀
      config.headers['Content-Language'] = (localStg.get('lang') || 'zh-CN').replace('-', '_');

      handleRepeatSubmit(config);

      // FormData数据去请求头Content-Type
      if (config.data instanceof FormData) {
        delete config.headers['Content-Type'];
      }

      return config;
    },
    isBackendSuccess(response) {
      return Number(response.data.code) === 0;
    },
    async onBackendFail(response, instance) {
      const authStore = useAuthStore();
      const responseCode = String(response.data?.code);

      function handleLogout() {
        authStore.resetStore();
      }

      function logoutAndCleanup() {
        handleLogout();
        window.removeEventListener('beforeunload', handleLogout);

        request.state.errMsgStack = request.state.errMsgStack.filter(msg => msg !== response.data.msg);
      }

      const isLogin = Boolean(getToken());
      const expiredTokenCodes = import.meta.env.VITE_SERVICE_EXPIRED_TOKEN_CODES?.split(',') || [];
      const isExpired = response.status === 401 || responseCode === '401' || expiredTokenCodes.includes(responseCode);
      if (isExpired && response.config.headers.isToken !== false) {
        if (response.config.authSessionVersion !== getSessionVersion()) return null;
        if (isLogin && response.config.headers.authRetry !== false) {
          // A late response may carry the token from before another request refreshed it.
          const changed = response.config.headers.Authorization !== getAuthorization();
          const success = changed || (await handleExpiredRequest(request.state));
          if (success && getToken()) {
            response.config.headers.authRetry = false;
            response.config.headers.repeatSubmit = false;
            response.config.headers.Authorization = getAuthorization();
            return instance.request(response.config) as Promise<AxiosResponse>;
          }
        } else if (isLogin && response.config.headers.Authorization === getAuthorization()) {
          void authStore.resetStore();
        }
        return null;
      }

      if (response.config.headers.isToken === false) return null;

      // when the backend response code is in `logoutCodes`, it means the user will be logged out and redirected to login page
      const logoutCodes = import.meta.env.VITE_SERVICE_LOGOUT_CODES?.split(',') || [];
      if (logoutCodes.includes(responseCode) && !isLogin) {
        logoutAndCleanup();
        return null;
      }

      // when the backend response code is in `modalLogoutCodes`, it means the user will be logged out by displaying a modal
      const modalLogoutCodes = import.meta.env.VITE_SERVICE_MODAL_LOGOUT_CODES?.split(',') || [];
      if (modalLogoutCodes.includes(responseCode) && isLogin) {
        const isExist = request.state.errMsgStack?.includes(response.data.msg);
        if (isExist) {
          return null;
        }
        if (window.location.pathname?.startsWith('/login')) {
          logoutAndCleanup();
          return null;
        }

        request.state.errMsgStack = [...(request.state.errMsgStack || []), response.data.msg];

        window.$dialog?.warning({
          title: '系统提示',
          content: '登录状态已过期，请重新登录',
          positiveText: '重新登录',
          maskClosable: false,
          closeOnEsc: false,
          onAfterEnter() {
            // prevent the user from refreshing the page
            window.addEventListener('beforeunload', handleLogout);
          },
          onPositiveClick() {
            logoutAndCleanup();
          },
          onClose() {
            logoutAndCleanup();
          }
        });
        request.cancelAllRequest();
        return null;
      }

      return null;
    },
    onError(error) {
      // when the request is fail, you can show error message
      if (error.code === REQUEST_CANCELED_CODE) {
        return;
      }

      let message = error.message;
      let backendErrorCode = '';

      // get backend error message and code
      if (error.code === BACKEND_ERROR_CODE || error.response) {
        message = error.response?.data?.msg || message;
        backendErrorCode = String(error.response?.data?.code || '');
      }

      if (error.config?.url === '/auth/refresh' && (error.response?.status === 401 || backendErrorCode === '401')) {
        return;
      }

      // the error message is displayed in the modal
      const modalLogoutCodes = import.meta.env.VITE_SERVICE_MODAL_LOGOUT_CODES?.split(',') || [];
      if (error.config?.headers.isToken !== false && modalLogoutCodes.includes(backendErrorCode)) {
        return;
      }

      // when the token is expired, refresh token and retry request, so no need to show error message
      const expiredTokenCodes = import.meta.env.VITE_SERVICE_EXPIRED_TOKEN_CODES?.split(',') || [];
      if (error.config?.headers.isToken !== false && expiredTokenCodes.includes(backendErrorCode)) {
        return;
      }

      showErrorMsg(request.state, message);
    }
  }
);

function handleRepeatSubmit(config: InternalAxiosRequestConfig) {
  // 是否需要防止数据重复提交
  const isRepeatSubmit = config.headers?.repeatSubmit === false;

  if (!isRepeatSubmit && (config.method === 'post' || config.method === 'put')) {
    const requestObj = {
      url: config.url!,
      data: typeof config.data === 'object' ? JSON.stringify(config.data) : config.data,
      time: new Date().getTime()
    };
    const sessionObj = sessionStg.get('sessionObj');
    if (!sessionObj) {
      sessionStg.set('sessionObj', requestObj);
    } else {
      const s_url = sessionObj.url; // 请求地址
      const s_data = sessionObj.data; // 请求数据
      const s_time = sessionObj.time; // 请求时间
      const interval = 500; // 间隔时间(ms)，小于此时间视为重复提交
      if (s_data === requestObj.data && requestObj.time - s_time < interval && s_url === requestObj.url) {
        const message = '数据正在处理，请勿重复提交';
        // eslint-disable-next-line no-console
        console.warn(`[${s_url}]: ${message}`);
        throw new Error(message);
      }
      sessionStg.set('sessionObj', requestObj);
    }
  }
}
