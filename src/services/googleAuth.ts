import { Capacitor } from '@capacitor/core';
import { SocialLogin } from '@capgo/capacitor-social-login';
import { fetchGoogleConfig } from './api';

export interface GoogleTokens {
  accessToken?: string;
  idToken?: string;
}

let initialized = false;
let cachedClientId: string | null = null;
let cachedIosClientId: string | null = null;

function resolveIosClientId(): string | null {
  if (cachedIosClientId) {
    return cachedIosClientId;
  }

  const envIosClientId = import.meta.env.VITE_GOOGLE_IOS_CLIENT_ID as string | undefined;
  if (envIosClientId) {
    cachedIosClientId = envIosClientId;
    return cachedIosClientId;
  }

  return null;
}

async function resolveClientId(): Promise<string | null> {
  if (cachedClientId) {
    return cachedClientId;
  }

  const envClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;
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
    // API may be unreachable during offline dev
  }

  return null;
}

export async function isGoogleAuthAvailable(): Promise<boolean> {
  const clientId = await resolveClientId();
  return Boolean(clientId);
}

export async function initializeGoogleAuth(): Promise<void> {
  if (initialized || !Capacitor.isNativePlatform()) {
    return;
  }

  const clientId = await resolveClientId();
  if (!clientId) {
    return;
  }

  const googleConfig: {
    webClientId: string;
    mode: 'online';
    iOSClientId?: string;
    iOSServerClientId?: string;
  } = {
    webClientId: clientId,
    mode: 'online',
  };

  if (Capacitor.getPlatform() === 'ios') {
    const iosClientId = resolveIosClientId();
    if (iosClientId) {
      googleConfig.iOSClientId = iosClientId;
      googleConfig.iOSServerClientId = clientId;
    }
  }

  await SocialLogin.initialize({
    google: googleConfig,
  });

  initialized = true;
}

export async function signInWithGoogle(): Promise<GoogleTokens> {
  const clientId = await resolveClientId();
  if (!clientId) {
    throw new Error('Login com Google não está configurado.');
  }

  if (Capacitor.isNativePlatform()) {
    if (Capacitor.getPlatform() === 'ios' && !resolveIosClientId()) {
      throw new Error('Configure VITE_GOOGLE_IOS_CLIENT_ID para login com Google no iPhone.');
    }

    await initializeGoogleAuth();

    const response = await SocialLogin.login({
      provider: 'google',
      options: {
        scopes: ['email', 'profile'],
      },
    });

    const result = response.result as {
      idToken?: string | null;
      accessToken?: { token?: string | null } | null;
    };

    return {
      idToken: result.idToken ?? undefined,
      accessToken: result.accessToken?.token ?? undefined,
    };
  }

  return signInWithGoogleWeb(clientId);
}

function loadGoogleScript(): Promise<void> {
  return new Promise((resolve, reject) => {
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
}

async function signInWithGoogleWeb(clientId: string): Promise<GoogleTokens> {
  await loadGoogleScript();

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
