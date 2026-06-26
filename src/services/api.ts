import type {
  ApiUser,
  BarbershopProfileResponse,
  CheckoutResponse,
  GoogleConfigResponse,
  GoogleRegistrationRequiredResponse,
} from '@/types/api';
import { clearAuth, getToken } from './storage';

const API_URL = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') ?? 'http://127.0.0.1:8000';

export class ApiError extends Error {
  status: number;
  errors: Record<string, string[]>;

  constructor(message: string, status: number, errors: Record<string, string[]> = {}) {
    super(message);
    this.status = status;
    this.errors = errors;
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  authenticated = false,
): Promise<T> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'ngrok-skip-browser-warning': 'true',
    ...(options.headers as Record<string, string> | undefined),
  };

  if (options.body && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  if (authenticated) {
    const token = await getToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    if (response.status === 401 && authenticated) {
      await clearAuth();
    }

    const errors = (payload.errors ?? {}) as Record<string, string[]>;
    const message =
      (payload.message as string | undefined) ??
      Object.values(errors).flat()[0] ??
      'Não foi possível concluir a solicitação.';

    throw new ApiError(message, response.status, errors);
  }

  return payload as T;
}

export async function login(email: string, password: string): Promise<{ token: string; user: ApiUser }> {
  return request('/api/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password, device_name: 'smartbarbeiro-mobile' }),
  });
}

export async function fetchGoogleConfig(): Promise<GoogleConfigResponse> {
  return request('/api/v1/auth/google/config');
}

export async function loginWithGoogle(tokens: {
  accessToken?: string;
  idToken?: string;
}): Promise<{ token: string; user: ApiUser } | GoogleRegistrationRequiredResponse> {
  const response = await fetch(`${API_URL}/api/v1/auth/google`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'ngrok-skip-browser-warning': 'true',
    },
    body: JSON.stringify({
      access_token: tokens.accessToken,
      id_token: tokens.idToken,
      device_name: 'smartbarbeiro-mobile',
    }),
  });

  const payload = await response.json().catch(() => ({}));

  if (response.status === 422 && payload.status === 'registration_required') {
    return payload as GoogleRegistrationRequiredResponse;
  }

  if (!response.ok) {
    const errors = (payload.errors ?? {}) as Record<string, string[]>;
    const message =
      (payload.message as string | undefined) ??
      Object.values(errors).flat()[0] ??
      'Não foi possível entrar com Google.';

    throw new ApiError(message, response.status, errors);
  }

  return payload as { token: string; user: ApiUser };
}

export async function registerWithGoogle(payload: {
  accessToken?: string;
  idToken?: string;
  name: string;
  cpf: string;
  barbershop_username: string;
}): Promise<{ token: string; user: ApiUser }> {
  return request('/api/v1/auth/google/register', {
    method: 'POST',
    body: JSON.stringify({
      access_token: payload.accessToken,
      id_token: payload.idToken,
      name: payload.name,
      cpf: payload.cpf,
      barbershop_username: payload.barbershop_username,
      device_name: 'smartbarbeiro-mobile',
    }),
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
    body: JSON.stringify({ ...payload, device_name: 'smartbarbeiro-mobile' }),
  });
}

export async function fetchMe(): Promise<{ user: ApiUser }> {
  return request('/api/v1/me', {}, true);
}

export async function fetchBarbershop(username: string): Promise<BarbershopProfileResponse> {
  return request(`/api/v1/barbearias/${encodeURIComponent(username)}`);
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
