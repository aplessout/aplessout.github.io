/**
 * Poster resolution.
 *
 * Provider `stream_icon` URLs are frequently http://, which an HTTPS app cannot
 * load (same mixed-content rule that blocks Roku). We try the https variant first,
 * then optionally fall back to TMDB when the user has stored an API key locally.
 */

export function providerPoster(icon?: string | null): string | undefined {
  if (!icon) return undefined;
  const trimmed = icon.trim();
  if (!trimmed) return undefined;
  if (trimmed.startsWith('https://')) return trimmed;
  // Upgrade scheme: many panels serve the same asset on both ports.
  if (trimmed.startsWith('http://')) return `https://${trimmed.slice('http://'.length)}`;
  if (trimmed.startsWith('//')) return `https:${trimmed}`;
  return undefined;
}

export async function tmdbPoster(apiKey: string, title: string, year?: string): Promise<string | undefined> {
  if (!apiKey.trim() || !title.trim()) return undefined;
  const params = new URLSearchParams({ api_key: apiKey.trim(), query: title.trim(), include_adult: 'false' });
  if (year && /^\d{4}$/.test(year)) params.set('year', year);

  try {
    const response = await fetch(`https://api.themoviedb.org/3/search/multi?${params.toString()}`);
    if (!response.ok) return undefined;
    const data = (await response.json()) as { results?: Array<{ poster_path?: string | null }> };
    const hit = data.results?.find((entry) => entry.poster_path);
    return hit?.poster_path ? `https://image.tmdb.org/t/p/w342${hit.poster_path}` : undefined;
  } catch {
    return undefined;
  }
}

/** Stable initials used by the placeholder tile when no artwork is available. */
export function initials(name: string): string {
  return name
    .replace(/[^\p{L}\p{N} ]/gu, '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? '')
    .join('');
}
