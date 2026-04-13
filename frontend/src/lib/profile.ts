export function buildPublicProfileHref(name: string): string | null {
  const normalized = name.trim().replace(/^@+/, "");
  if (!normalized) {
    return null;
  }

  return `/users/${encodeURIComponent(normalized)}`;
}
