/** Display name from @username (matches web PlanBuilder / public profile). */
export function barbershopDisplayName(username: string | null | undefined, fallback = ''): string {
  const fromUsername = String(username ?? '')
    .replace(/_/g, ' ')
    .trim();

  if (fromUsername !== '') {
    return fromUsername;
  }

  return String(fallback ?? '').trim();
}
