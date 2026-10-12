import type { CreateAxiosDefaults } from 'axios';
import type { IAxiosRetryConfig } from 'axios-retry';
import { stringify } from 'qs';
import { isHttpSuccess } from './shared';
import type { RequestOption } from './type';

export function createDefaultOptions<
  ResponseData,
  ApiData = ResponseData,
  State extends Record<string, unknown> = Record<string, unknown>
>(options?: Partial<RequestOption<ResponseData, ApiData, State>>) {
  const opts: RequestOption<ResponseData, ApiData, State> = {
    defaultState: {} as State,
    transform: async response => response.data as unknown as ApiData,
    transformBackendResponse: async response => response.data as unknown as ApiData,
    onRequest: async config => config,
    isBackendSuccess: _response => true,
    onBackendFail: async () => {},
    onError: async () => {}
  };

  if (options?.transform) {
    opts.transform = options.transform;
  } else {
    opts.transform = options?.transformBackendResponse || opts.transform;
  }

  Object.assign(opts, options);

  return opts;
}

export function createRetryOptions(config?: Partial<CreateAxiosDefaults>) {
  const retryConfig: IAxiosRetryConfig = {
    retries: 0
  };

  Object.assign(retryConfig, config);

  return retryConfig;
}

export function createAxiosConfig(config?: Partial<CreateAxiosDefaults>) {
  // 30s：后端偶发慢响应（远程 DB/Redis + 调试环境）时避免 10s 就中断请求
  const DEFAULT_TIMEOUT = 30 * 1000;

  const axiosConfig: CreateAxiosDefaults = {
    timeout: DEFAULT_TIMEOUT,
    headers: {
      'Content-Type': 'application/json'
    },
    validateStatus: isHttpSuccess,
    paramsSerializer: params => {
      return stringify(params, { arrayFormat: 'repeat' });
    }
  };

  Object.assign(axiosConfig, config);

  return axiosConfig;
}
