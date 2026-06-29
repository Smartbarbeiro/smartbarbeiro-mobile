import { Preferences } from '@capacitor/preferences';

const KEYS = {
  token: 'auth_token',
  user: 'auth_user',
  onboardingComplete: 'onboarding_complete',
  preferredBarbershop: 'preferred_barbershop',
  lastLoginEmail: 'last_login_email',
} as const;

export interface PreferredBarbershop {
  username: string;
  name: string;
  profile_photo_url: string | null;
}

export async function getToken(): Promise<string | null> {
  const { value } = await Preferences.get({ key: KEYS.token });
  return value;
}

export async function getLastLoginEmail(): Promise<string | null> {
  const { value } = await Preferences.get({ key: KEYS.lastLoginEmail });
  return value;
}

export async function setLastLoginEmail(email: string): Promise<void> {
  const normalized = email.trim().toLowerCase();
  if (!normalized) {
    return;
  }

  await Preferences.set({ key: KEYS.lastLoginEmail, value: normalized });
}

export async function setAuth(token: string, user: unknown): Promise<void> {
  await Preferences.set({ key: KEYS.token, value: token });
  await Preferences.set({ key: KEYS.user, value: JSON.stringify(user) });

  const email = (user as { email?: string | null })?.email;
  if (email) {
    await setLastLoginEmail(email);
  }
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

export async function getPreferredBarbershop(): Promise<PreferredBarbershop | null> {
  const { value } = await Preferences.get({ key: KEYS.preferredBarbershop });
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value) as PreferredBarbershop;
  } catch {
    return null;
  }
}

export async function setPreferredBarbershop(barbershop: PreferredBarbershop): Promise<void> {
  await Preferences.set({
    key: KEYS.preferredBarbershop,
    value: JSON.stringify(barbershop),
  });
}
