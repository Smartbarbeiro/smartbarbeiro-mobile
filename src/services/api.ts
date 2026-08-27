import { Capacitor, CapacitorHttp } from '@capacitor/core';
import type {
  ApiUser,
  BarbershopProfileResponse,
  BarbershopSearchResponse,
  CheckoutResponse,
  GoogleConfigResponse,
  GoogleRegistrationRequiredResponse,
} from '@/types/api';
import { clearAuth, getToken } from './storage';

const API_URL = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') ?? 'http://127.0.0.1:8000';

export function getApiBaseUrl(): string {
  return API_URL;
}

export class ApiError extends Error {
  status: number;
  errors: Record<string, string[]>;

  constructor(message: string, status: number, errors: Record<string, string[]> = {}) {
    super(message);
    this.status = status;
    this.errors = errors;
  }
}

type HttpPayload = Record<string, unknown>;

function connectionErrorMessage(): string {
  return `Sem conexão com ${API_URL}. Confirme que o Laravel está rodando com php artisan serve --host=0.0.0.0 --port=8000 e que o celular está na mesma rede Wi‑Fi.`;
}

function buildHeaders(options: RequestInit, authenticated: boolean): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'ngrok-skip-browser-warning': 'true',
    ...(options.headers as Record<string, string> | undefined),
  };

  if (options.body && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  return headers;
}

async function attachAuthHeader(headers: Record<string, string>, authenticated: boolean): Promise<void> {
  if (!authenticated) {
    return;
  }

  const token = await getToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
}

async function performHttpRequest(
  url: string,
  options: RequestInit,
  headers: Record<string, string>,
): Promise<{ ok: boolean; status: number; payload: HttpPayload }> {
  if (Capacitor.isNativePlatform()) {
    const method = (options.method ?? 'GET').toUpperCase();
    let data: unknown;

    if (options.body && typeof options.body === 'string') {
      try {
        data = JSON.parse(options.body);
      } catch {
        data = options.body;
      }
    }

    try {
      const response = await CapacitorHttp.request({
        url,
        method,
        headers,
        data,
      });

      let payload: HttpPayload = {};

      if (typeof response.data === 'string' && response.data !== '') {
        try {
          const parsed = JSON.parse(response.data) as unknown;
          if (typeof parsed === 'object' && parsed !== null) {
            payload = parsed as HttpPayload;
          }
        } catch {
          payload = {};
        }
      } else if (typeof response.data === 'object' && response.data !== null) {
        payload = response.data as HttpPayload;
      }

      return {
        ok: response.status >= 200 && response.status < 300,
        status: response.status,
        payload,
      };
    } catch {
      throw new ApiError(connectionErrorMessage(), 0);
    }
  }

  let response: Response;

  try {
    response = await fetch(url, {
      ...options,
      headers,
    });
  } catch {
    throw new ApiError(connectionErrorMessage(), 0);
  }

  const payload = (await response.json().catch(() => ({}))) as HttpPayload;

  return {
    ok: response.ok,
    status: response.status,
    payload,
  };
}

function throwApiError(status: number, payload: HttpPayload): never {
  const errors = (payload.errors ?? {}) as Record<string, string[]>;
  const message =
    (payload.message as string | undefined) ??
    Object.values(errors).flat()[0] ??
    'Não foi possível concluir a solicitação.';

  throw new ApiError(message, status, errors);
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  authenticated = false,
): Promise<T> {
  const headers = buildHeaders(options, authenticated);
  await attachAuthHeader(headers, authenticated);

  const { ok, status, payload } = await performHttpRequest(`${API_URL}${path}`, options, headers);

  if (!ok) {
    if (status === 401 && authenticated) {
      await clearAuth();
    }

    throwApiError(status, payload);
  }

  return payload as T;
}

export async function login(email: string, password: string): Promise<{ token: string; user: ApiUser }> {
  return request('/api/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password, device_name: 'tesora-mobile' }),
  });
}

export async function fetchGoogleConfig(): Promise<GoogleConfigResponse> {
  return request('/api/v1/auth/google/config');
}

export async function loginWithGoogle(tokens: {
  accessToken?: string;
  idToken?: string;
}): Promise<{ token: string; user: ApiUser } | GoogleRegistrationRequiredResponse> {
  const body: Record<string, string> = {
    device_name: 'tesora-mobile',
  };

  // Prefer id_token (native OpenID). Only send access_token when no id_token.
  if (tokens.idToken) {
    body.id_token = tokens.idToken;
  } else if (tokens.accessToken) {
    body.access_token = tokens.accessToken;
  }

  const options: RequestInit = {
    method: 'POST',
    body: JSON.stringify(body),
  };
  const headers = buildHeaders(options, false);
  const { ok, status, payload } = await performHttpRequest(`${API_URL}/api/v1/auth/google`, options, headers);

  if (status === 422 && payload.status === 'registration_required') {
    return payload as unknown as GoogleRegistrationRequiredResponse;
  }

  if (!ok) {
    const errors = (payload.errors ?? {}) as Record<string, string[]>;
    const message =
      (payload.message as string | undefined) ??
      Object.values(errors).flat()[0] ??
      'Não foi possível entrar com Google.';

    throw new ApiError(message, status, errors);
  }

  return payload as { token: string; user: ApiUser };
}

export async function registerWithGoogle(payload: {
  accessToken?: string;
  idToken?: string;
  oauthCode?: string;
  name: string;
  cpf: string;
  barbershop_username: string;
}): Promise<{ token: string; user: ApiUser }> {
  const body: Record<string, string> = {
    name: payload.name,
    cpf: payload.cpf,
    barbershop_username: payload.barbershop_username,
    device_name: 'tesora-mobile',
  };

  if (payload.oauthCode) {
    body.oauth_code = payload.oauthCode;
  } else if (payload.idToken) {
    body.id_token = payload.idToken;
  } else if (payload.accessToken) {
    body.access_token = payload.accessToken;
  }

  return request('/api/v1/auth/google/register', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function register(payload: {
  name: string;
  cpf: string;
  email: string;
  password: string;
  password_confirmation: string;
  barbershop_username: string;
}): Promise<{ token: string; user: ApiUser }> {
  return request('/api/v1/auth/register', {
    method: 'POST',
    body: JSON.stringify({ ...payload, device_name: 'tesora-mobile' }),
  });
}

export async function fetchMe(): Promise<{ user: ApiUser }> {
  return request('/api/v1/me', {}, true);
}

export async function fetchBarbershop(username: string): Promise<BarbershopProfileResponse> {
  return request(`/api/v1/barbearias/${encodeURIComponent(username)}`);
}

export function getBarbershopProfileBaseUrl(): string {
  return `${API_URL.replace(/\/$/, '')}/barbearias/`;
}

export function resolveApiAssetUrl(path: string | null | undefined): string | null {
  if (!path) {
    return null;
  }

  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  return `${API_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

export async function searchBarbershops(query: string): Promise<BarbershopSearchResponse> {
  const params = new URLSearchParams({ q: query });

  return request(`/api/v1/barbearias/search?${params.toString()}`);
}

export async function prepareCheckout(
  username: string,
  packageType: string,
  addonIds: number[],
): Promise<import('@/types/api').CheckoutPrepareResponse> {
  return request(
    `/api/v1/barbearias/${encodeURIComponent(username)}/service-plans/checkout/prepare`,
    {
      method: 'POST',
      body: JSON.stringify({
        package_type: packageType,
        addon_ids: addonIds,
      }),
    },
    true,
  );
}

export async function confirmCheckout(
  username: string,
  subscriptionId: string,
): Promise<CheckoutResponse> {
  return request(
    `/api/v1/barbearias/${encodeURIComponent(username)}/service-plans/checkout/confirm`,
    {
      method: 'POST',
      body: JSON.stringify({ subscription_id: subscriptionId }),
    },
    true,
  );
}

export function parseBarbershopUsernameFromQr(value: string): string | null {
  const trimmed = value.trim();

  try {
    const url = new URL(trimmed);
    const match = url.pathname.match(/\/barbearias\/([^/]+)\/?$/i);
    if (match?.[1]) {
      return decodeURIComponent(match[1]);
    }
  } catch {
    // not a URL
  }

  const pathMatch = trimmed.match(/\/barbearias\/([^/?#]+)/i);
  if (pathMatch?.[1]) {
    return decodeURIComponent(pathMatch[1]);
  }

  if (/^[a-z0-9._-]+$/i.test(trimmed)) {
    return trimmed;
  }

  return null;
}

export function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
