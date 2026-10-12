import 'axios';

export interface RequestInstanceState {
  /** the promise of refreshing token */
  refreshTokenPromise: Promise<boolean> | null;
  /** the request error message stack */
  errMsgStack: string[];
  [key: string]: unknown;
}
declare module 'axios' {
  interface AxiosRequestConfig {
    authSessionVersion?: number;
  }
}
