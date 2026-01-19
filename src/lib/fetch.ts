import { buildPath } from '@/lib/url';

export interface ErrorResponse {
  error: {
    status: number;
    message: string;
    code?: string;
  };
}

export interface FetchResponse {
  ok: boolean;
  status: number;
  data?: any;
  error?: ErrorResponse;
}

export async function request(
  method: string,
  url: string,
  body?: string,
  headers: object = {},
): Promise<FetchResponse> {
  return fetch(url, {
    method,
    cache: 'no-cache',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...headers,
    },
    body,
  }).then(async res => {
    const data = await res.json();

    return {
      ok: res.ok,
      status: res.status,
      data,
    };
  });
}

export async function httpGet(path: string, params: object = {}, headers: object = {}) {
  return request('GET', buildPath(path, params), undefined, headers);
}

export async function httpDelete(path: string, params: object = {}, headers: object = {}) {
  return request('DELETE', buildPath(path, params), undefined, headers);
}

export async function httpPost(path: string, params: object = {}, headers: object = {}) {
  return httpSend('POST', path, params, headers);
}

export async function httpPut(path: string, params: object = {}, headers: object = {}) {
  return httpSend('PUT', path, params, headers);
}

async function httpSend(method: string, path: string, params: object = {}, headers: object = {}) {
  // EdgeOne workaround: Send payload as query params to avoid body stream issues
  if (process.env.NEXT_PUBLIC_EDGE_COMPAT) {
    const searchParams = new URLSearchParams();
    // Flatten params to string for URLSearchParams
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        if (typeof value === 'object') {
          searchParams.append(key, JSON.stringify(value));
        } else {
          searchParams.append(key, String(value));
        }
      }
    });

    // Append query params to URL
    const separator = path.includes('?') ? '&' : '?';
    const urlWithParams = `${path}${separator}${searchParams.toString()}`;

    return request(method, urlWithParams, undefined, headers);
  }

  return request(method, path, JSON.stringify(params), headers);
}
