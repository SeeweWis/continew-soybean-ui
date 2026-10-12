import { useAuthStore } from '@/store/modules/auth';
import { fetchRefreshToken } from '@/service/api/auth';
import { getToken, getSessionVersion, setAccessSession } from '@/store/modules/auth/shared';
import type { RequestInstanceState } from './type';

export function getAuthorization() {
  const token = getToken();
  const Authorization = token ? `Bearer ${token}` : null;

  return Authorization;
}

/** refresh token */
async function handleRefreshToken() {
  const version = getSessionVersion();
  const { data, error } = await fetchRefreshToken();
  if (version !== getSessionVersion()) return false;
  if (!error && data?.accessToken) {
    setAccessSession(data);
    return true;
  }
  if (getToken()) void useAuthStore().resetStore();
  return false;
}

export async function handleExpiredRequest(state: RequestInstanceState) {
  if (!state.refreshTokenPromise) {
    state.refreshTokenPromise = handleRefreshToken();
  }

  const pending = state.refreshTokenPromise;
  try {
    return await pending;
  } finally {
    if (state.refreshTokenPromise === pending) state.refreshTokenPromise = null;
  }
}

export function showErrorMsg(state: RequestInstanceState, message: string) {
  if (!state.errMsgStack?.length) {
    state.errMsgStack = [];
  }

  const isExist = state.errMsgStack.includes(message);

  if (!isExist) {
    state.errMsgStack.push(message);

    window.$message?.error(message, {
      onLeave: () => {
        state.errMsgStack = state.errMsgStack.filter(msg => msg !== message);

        setTimeout(() => {
          state.errMsgStack = [];
        }, 5000);
      }
    });
  }
}
