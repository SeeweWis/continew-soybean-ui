import { ref } from 'vue';
import { localStg } from '@/utils/storage';

export const accessToken = ref('');
let sessionVersion = 0;

// Browser sessions use an HttpOnly refresh cookie; discard legacy persisted tokens.
localStg.remove('token');
localStg.remove('refreshToken');

export function getSessionVersion() {
  return sessionVersion;
}

export function setAccessSession(session: Api.Auth.LoginToken) {
  accessToken.value = session.accessToken;
  if (session.tenantId != null) localStg.set('tenantId', session.tenantId);
  else localStg.remove('tenantId');
}

/** Get token */
export function getToken() {
  return accessToken.value;
}

/** Clear auth storage */
export function clearAuthStorage() {
  sessionVersion += 1;
  accessToken.value = '';
  localStg.remove('token');
  localStg.remove('refreshToken');
  localStg.remove('tenantId');
}
