import { Api } from './generated/Api';
import { HttpClient, type HttpResponse } from './generated/http-client';
import { Test } from './generated/Test';
import { V1 } from './generated/V1';
import type { ApiServerConfig, AuthSession, ServerPreset } from '../types/api';

export const SERVER_PRESETS: Record<
  Exclude<ServerPreset, 'custom'>,
  { label: string; url: string; description: string }
> = {
  staging: {
    label: 'Staging',
    url: 'https://be.quickgg.top',
    description: 'Máy chủ Staging mặc định (qua proxy tránh CORS)',
  },
  local: {
    label: 'Local',
    url: 'http://localhost:8080',
    description: 'Máy chủ phát triển cục bộ trên máy cá nhân',
  },
};

export interface BearerSecurityData {
  accessToken: string;
  tokenType?: string;
}

export interface BackendClient {
  http: HttpClient<BearerSecurityData>;
  /** /v1/* endpoints: account, github-upload, postgres-backup, X-video manage */
  v1: V1<BearerSecurityData>;
  /** /api/* endpoints: megaxh, Xvideos */
  api: Api<BearerSecurityData>;
  /** /test/* endpoints: internal test utilities */
  test: Test<BearerSecurityData>;
}

export class ApiClientError extends Error {
  status: number;
  code: string;
  detail?: string;

  constructor(message: string, status: number, code = 'API_ERROR', detail?: string) {
    super(message);
    this.name = 'ApiClientError';
    this.status = status;
    this.code = code;
    this.detail = detail;
  }
}

export function isLocalhostUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return (
      parsed.hostname === 'localhost' ||
      parsed.hostname === '127.0.0.1' ||
      parsed.hostname === '::1' ||
      parsed.hostname === '0.0.0.0'
    );
  } catch {
    return false;
  }
}

export function normalizeBaseUrl(raw: string): string {
  return raw.trim().replace(/\/+$/, '');
}

export function getDefaultServerConfig(): ApiServerConfig {
  return {
    preset: 'staging',
    baseUrl: SERVER_PRESETS.staging.url,
    useProxy: true,
  };
}

function extractErrorMessage(body: unknown, status: number): { message: string; detail?: string } {
  if (body && typeof body === 'object') {
    const record = body as Record<string, unknown>;
    const detail = typeof record.detail === 'string' ? record.detail : undefined;

    if (typeof record.message === 'string' && record.message.trim()) {
      return { message: record.message, detail };
    }
    if (typeof record.error === 'string' && record.error.trim()) {
      return { message: record.error, detail };
    }
    if (Array.isArray(record.errors) && record.errors.length > 0) {
      const first = record.errors[0];
      if (typeof first === 'string') return { message: first, detail };
      if (first && typeof first === 'object' && 'defaultMessage' in first) {
        return { message: String((first as { defaultMessage: unknown }).defaultMessage), detail };
      }
    }
    if (record.errors && typeof record.errors === 'object') {
      const entries = Object.entries(record.errors as Record<string, unknown>);
      if (entries.length > 0) {
        const [field, msg] = entries[0];
        return { message: `${field}: ${String(msg)}`, detail };
      }
    }
  }

  if (typeof body === 'string' && body.trim()) {
    return { message: body.trim().slice(0, 220) };
  }

  if (status === 401) {
    return { message: 'Thông tin xác thực không hợp lệ hoặc phiên đăng nhập đã hết hạn.' };
  }
  if (status === 403) {
    return { message: 'Bạn không có quyền Super Admin để thực hiện thao tác này.' };
  }
  if (status === 404) {
    return { message: 'Không tìm thấy tài nguyên hoặc tài khoản yêu cầu.' };
  }
  if (status >= 500) {
    return { message: `Máy chủ API gặp lỗi nội bộ (HTTP ${status}).` };
  }

  return { message: `Yêu cầu thất bại với mã trạng thái HTTP ${status}.` };
}

let cacheBustSeq = 0;

function appendCacheBuster(rawUrl: string): string {
  const token = `${Date.now()}_${++cacheBustSeq}`;
  const hashIndex = rawUrl.indexOf('#');
  const basePart = hashIndex >= 0 ? rawUrl.slice(0, hashIndex) : rawUrl;
  const hashPart = hashIndex >= 0 ? rawUrl.slice(hashIndex) : '';
  const separator = basePart.includes('?') ? '&' : '?';
  return `${basePart}${separator}_t=${token}${hashPart}`;
}

const noCacheFetch: typeof fetch = (input, init) => {
  const method = (
    init?.method ||
    (input instanceof Request ? input.method : 'GET')
  ).toUpperCase();

  if (method !== 'GET') {
    return fetch(input, init);
  }

  const nextInit: RequestInit = {
    ...init,
    cache: 'no-store',
  };

  if (typeof input === 'string') {
    return fetch(appendCacheBuster(input), nextInit);
  }

  if (input instanceof URL) {
    const nextUrl = new URL(input.toString());
    nextUrl.searchParams.set('_t', `${Date.now()}_${++cacheBustSeq}`);
    return fetch(nextUrl, nextInit);
  }

  return fetch(new Request(appendCacheBuster(input.url), input), nextInit);
};

/**
 * Creates a typed OpenAPI client bundle (v1, api, test) configured with the active
 * Staging/Local/Custom server, optional CORS proxy header, and Bearer JWT authentication.
 */
export function createBackendClient(
  config: ApiServerConfig,
  session?: Pick<AuthSession, 'accessToken' | 'tokenType'> | null
): BackendClient {
  const normalizedBaseUrl = normalizeBaseUrl(config.baseUrl);
  if (!normalizedBaseUrl) {
    throw new ApiClientError('Vui lòng nhập địa chỉ máy chủ API hợp lệ.', 0, 'INVALID_URL');
  }

  const defaultHeaders: Record<string, string> = {
    Accept: 'application/json, text/plain, */*',
  };

  if (config.useProxy) {
    defaultHeaders['x-target-base-url'] = normalizedBaseUrl;
  }

  if (session?.accessToken) {
    const scheme = session.tokenType?.trim() || 'Bearer';
    defaultHeaders.Authorization = `${scheme} ${session.accessToken}`;
  }

  const http = new HttpClient<BearerSecurityData>({
    baseUrl: config.useProxy ? '/api/proxy' : normalizedBaseUrl,
    customFetch: noCacheFetch,
    baseApiParams: {
      headers: defaultHeaders,
      format: 'json',
    },
    securityWorker: (securityData) => {
      if (!securityData?.accessToken) return {};
      const scheme = securityData.tokenType?.trim() || 'Bearer';
      return {
        headers: {
          Authorization: `${scheme} ${securityData.accessToken}`,
        },
      };
    },
  });

  if (session?.accessToken) {
    http.setSecurityData({
      accessToken: session.accessToken,
      tokenType: session.tokenType || 'Bearer',
    });
  }

  return {
    http,
    v1: new V1(http),
    api: new Api(http),
    test: new Test(http),
  };
}

function isHttpResponse(err: unknown): err is HttpResponse<unknown, unknown> {
  return (
    typeof err === 'object' &&
    err !== null &&
    'status' in err &&
    'ok' in err &&
    typeof (err as Response).text === 'function'
  );
}

/**
 * Executes a generated OpenAPI client call, safely handling JSON or plain-text responses
 * (for Springdoc wildcard media-type endpoints) and normalizing failures into ApiClientError.
 */
export async function executeApi<T>(
  requestPromise: Promise<HttpResponse<T, unknown>>,
  useProxy = true
): Promise<T> {
  try {
    const response = await requestPromise;
    if (response.data !== null && response.data !== undefined) {
      return response.data;
    }

    // Fallback when server returned plain text or empty body despite format: 'json'
    if (!response.bodyUsed) {
      const rawText = await response.text();
      if (!rawText) return undefined as T;
      try {
        return JSON.parse(rawText) as T;
      } catch {
        return rawText as unknown as T;
      }
    }

    return response.data;
  } catch (err: unknown) {
    if (err instanceof ApiClientError) {
      throw err;
    }

    if (isHttpResponse(err)) {
      let body: unknown = err.error;
      if (body instanceof SyntaxError || body === null || body === undefined) {
        try {
          const text = !err.bodyUsed ? await err.text() : '';
          if (text) {
            try {
              body = JSON.parse(text);
            } catch {
              body = text;
            }
          }
        } catch {
          // Ignore secondary body read error
        }
      }

      const { message, detail } = extractErrorMessage(body, err.status);
      const code =
        err.status === 401
          ? 'UNAUTHORIZED'
          : err.status === 403
            ? 'FORBIDDEN'
            : 'HTTP_ERROR';
      throw new ApiClientError(message, err.status, code, detail);
    }

    const detail = err instanceof Error ? err.message : undefined;
    const hint = useProxy
      ? 'Không thể kết nối qua máy chủ trung gian.'
      : 'Không thể kết nối trực tiếp tới máy chủ API (kiểm tra CORS hoặc đảm bảo backend đang chạy).';
    throw new ApiClientError(hint, 0, 'NETWORK_ERROR', detail);
  }
}
