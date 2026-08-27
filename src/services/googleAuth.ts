import { App } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { Capacitor } from '@capacitor/core';
import { fetchGoogleConfig, fetchMe, getApiBaseUrl, registerWithGoogle } from './api';
import { setAuth } from './storage';
import type { ApiUser } from '@/types/api';

export const MOBILE_OAUTH_SCHEME = 'tesora://oauth/callback';

export interface GoogleBrowserLoginResult {
  token: string;
  user: ApiUser;
}

export interface GoogleBrowserRegistrationRequired {
  status: 'registration_required';
  oauthCode: string;
  name: string;
  email: string;
}

export type GoogleBrowserAuthResult = GoogleBrowserLoginResult | GoogleBrowserRegistrationRequired;

let cachedClientId: string | null = null;

async function resolveClientId(): Promise<string | null> {
  if (cachedClientId) {
    return cachedClientId;
  }

  const envClientId = (import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined)?.trim();
  if (envClientId) {
    cachedClientId = envClientId;
    return cachedClientId;
  }

  try {
    const config = await fetchGoogleConfig();
    if (config.enabled && config.client_id) {
      cachedClientId = config.client_id;
      return cachedClientId;
    }
  } catch {
    // ignore
  }

  return null;
}

function buildGoogleRedirectUrl(intent: 'login' | 'register', redirectPath?: string): string {
  const params = new URLSearchParams({
    intent,
    mobile: '1',
  });

  if (redirectPath) {
    params.set('redirect', redirectPath);
  }

  return `${getApiBaseUrl()}/auth/google/redirect?${params.toString()}`;
}

function parseCallbackParams(url: string): URLSearchParams {
  const queryIndex = url.indexOf('?');
  const query = queryIndex >= 0 ? url.slice(queryIndex + 1) : '';
  return new URLSearchParams(query);
}

export async function isGoogleAuthAvailable(): Promise<boolean> {
  try {
    if (Capacitor.isNativePlatform()) {
      return true;
    }

    return Boolean(await resolveClientId());
  } catch {
    return false;
  }
}

export async function initializeGoogleAuth(): Promise<void> {
  // Browser OAuth needs no native SDK initialization.
}

export async function signInWithGoogleBrowser(
  intent: 'login' | 'register' = 'login',
  redirectPath?: string,
): Promise<GoogleBrowserAuthResult> {
  if (!Capacitor.isNativePlatform()) {
    throw new Error('No celular, o login com Google abre no navegador do site.');
  }

  return new Promise<GoogleBrowserAuthResult>((resolve, reject) => {
    let settled = false;

    const finish = (handler: () => void) => {
      if (settled) {
        return;
      }

      settled = true;
      void listener.then((handle) => handle.remove());
      handler();
    };

    const listener = App.addListener('appUrlOpen', async ({ url }) => {
      if (!url.startsWith(MOBILE_OAUTH_SCHEME)) {
        return;
      }

      await Browser.close();

      const params = parseCallbackParams(url);
      const status = params.get('status');

      if (status === 'authenticated') {
        const token = params.get('token');
        if (!token) {
          finish(() => reject(new Error('Login com Google não retornou token.')));
          return;
        }

        try {
          await setAuth(token, { email: null });
          const { user } = await fetchMe();
          await setAuth(token, user);
          finish(() => resolve({ token, user }));
        } catch (err) {
          finish(() =>
            reject(err instanceof Error ? err : new Error('Não foi possível concluir o login com Google.')),
          );
        }

        return;
      }

      if (status === 'registration_required') {
        const oauthCode = params.get('code');
        if (!oauthCode) {
          finish(() => reject(new Error('Cadastro com Google expirou. Tente novamente.')));
          return;
        }

        finish(() =>
          resolve({
            status: 'registration_required',
            oauthCode,
            name: params.get('name') ?? '',
            email: params.get('email') ?? '',
          }),
        );

        return;
      }

      finish(() => reject(new Error(params.get('message') ?? 'Não foi possível entrar com Google.')));
    });

    void Browser.open({ url: buildGoogleRedirectUrl(intent, redirectPath) }).catch((err) => {
      finish(() => reject(err instanceof Error ? err : new Error('Não foi possível abrir o Google.')));
    });
  });
}

async function signInWithGoogleWeb(clientId: string): Promise<{ accessToken: string }> {
  await new Promise<void>((resolve, reject) => {
    if (document.getElementById('google-gsi-script')) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.id = 'google-gsi-script';
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Não foi possível carregar o Google Sign-In.'));
    document.head.appendChild(script);
  });

  return new Promise((resolve, reject) => {
    const google = (window as typeof window & { google?: any }).google;
    if (!google?.accounts?.oauth2) {
      reject(new Error('Google Sign-In indisponível no navegador.'));
      return;
    }

    const tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: 'email profile openid',
      callback: (response: { access_token?: string; error?: string }) => {
        if (response.error || !response.access_token) {
          reject(new Error('Login com Google cancelado.'));
          return;
        }

        resolve({ accessToken: response.access_token });
      },
    });

    tokenClient.requestAccessToken({ prompt: 'select_account' });
  });
}

/** Web dev fallback only — native apps use signInWithGoogleBrowser(). */
export async function signInWithGoogle(): Promise<{ accessToken?: string; idToken?: string }> {
  const clientId = await resolveClientId();
  if (!clientId) {
    throw new Error('Login com Google não está configurado.');
  }

  if (Capacitor.isNativePlatform()) {
    const result = await signInWithGoogleBrowser('login');
    if ('status' in result) {
      throw new Error('Conta Google nova. Escaneie o QR da barbearia para se cadastrar.');
    }

    throw new Error('Use loginWithGoogleBrowser() no app.');
  }

  const { accessToken } = await signInWithGoogleWeb(clientId);
  return { accessToken };
}

export async function loginWithGoogleBrowser(): Promise<GoogleBrowserLoginResult> {
  const result = await signInWithGoogleBrowser('login');

  if ('status' in result) {
    throw new Error('Conta Google nova. Escaneie o QR da barbearia para se cadastrar.');
  }

  return result;
}

export async function completeGoogleBrowserRegistration(payload: {
  oauthCode: string;
  name: string;
  cpf: string;
  barbershop_username: string;
}): Promise<{ token: string; user: ApiUser }> {
  return registerWithGoogle({
    oauthCode: payload.oauthCode,
    name: payload.name,
    cpf: payload.cpf,
    barbershop_username: payload.barbershop_username,
  });
}
