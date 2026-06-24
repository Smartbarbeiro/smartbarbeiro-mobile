import { Preferences } from '@capacitor/preferences';

const KEYS = {
  token: 'auth_token',
  user: 'auth_user',
  onboardingComplete: 'onboarding_complete',
} as const;

export async function getToken(): Promise<string | null> {
  const { value } = await Preferences.get({ key: KEYS.token });
  return value;
}

export async function setAuth(token: string, user: unknown): Promise<void> {
  await Preferences.set({ key: KEYS.token, value: token });
  await Preferences.set({ key: KEYS.user, value: JSON.stringify(user) });
}

export async function clearAuth(): Promise<void> {
  await Preferences.remove({ key: KEYS.token });
  await Preferences.remove({ key: KEYS.user });
}

export async function getStoredUser<T>(): Promise<T | null> {
  const { value } = await Preferences.get({ key: KEYS.user });
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

export async function isOnboardingComplete(): Promise<boolean> {
  const { value } = await Preferences.get({ key: KEYS.onboardingComplete });
  return value === 'true';
}

export async function setOnboardingComplete(): Promise<void> {
  await Preferences.set({ key: KEYS.onboardingComplete, value: 'true' });
}
