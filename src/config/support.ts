export const SUPPORT_WEBSITE_URL =
  (import.meta.env.VITE_SUPPORT_WEBSITE_URL as string | undefined)?.trim() ||
  'https://www.tesora.com.br';

export const SUPPORT_PHONE =
  (import.meta.env.VITE_SUPPORT_PHONE as string | undefined)?.trim() || '';

export function supportPhoneDialUrl(): string | null {
  const digits = SUPPORT_PHONE.replace(/\D/g, '');

  if (!digits) {
    return null;
  }

  return `tel:${digits}`;
}
