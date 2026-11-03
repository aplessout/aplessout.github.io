import type { Category, Kind, LiveChannel, Movie, Series } from '../db';

export interface XtreamCreds {
  baseUrl: string;
  username: string;
  password: string;
  liveFormat?: 'm3u8' | 'ts';
}

export interface AuthResult {
  ok: boolean;
  status: string;
  expiresAt?: string;
  maxConnections?: string;
}

interface RawCategory {
  category_id?: string;
  category_name?: string;
}

interface RawLive {
  stream_id?: number | string;
  name?: string;
  stream_icon?: string;
  category_id?: string;
  num?: number;
}

interface RawVod {
  stream_id?: number | string;
  name?: string;
  stream_icon?: string;
  category_id?: string;
  year?: string;
  rating?: string;
  added?: string;
  container_extension?: string;
}

interface RawSeries {
  series_id?: number | string;
  name?: string;
  cover?: string;
  category_id?: string;
  year?: string;
  rating?: string;
  plot?: string;
}

interface AuthPayload {
  user_info?: {
    auth?: number | string;
    status?: string;
    exp_date?: string;
    max_connections?: string;
  };
}

/** Strip trailing slashes, a pasted player_api.php path, and force a scheme. */
export function normalizeBase(raw: string): string {
  let base = raw.trim().replace(/\/+$/, '');
  if (!/^https?:\/\//i.test(base)) base = `https://${base}`;
  return base.replace(/\/player_api\.php.*$/i, '').replace(/\/get\.php.*$/i, '');
}

async function api<T>(creds: XtreamCreds, params: Record<string, string | number> = {}): Promise<T> {
  const query = new URLSearchParams();
  query.set('username', creds.username);
  query.set('password', creds.password);
  for (const [key, value] of Object.entries(params)) query.set(key, String(value));

  let response: Response;
  try {
    response = await fetch(`${normalizeBase(creds.baseUrl)}/player_api.php?${query.toString()}`, {
      headers: { Accept: 'application/json' },
    });
  } catch {
    throw new Error(
      'Could not reach the provider. Either the URL is wrong, it is http:// only (blocked on an HTTPS app), or it does not allow browser requests (CORS).'
    );
  }
  if (!response.ok) throw new Error(`Provider returned HTTP ${response.status}.`);

  const text = await response.text();
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error('Provider did not return JSON — usually a CORS block, an HTML error page, or wrong credentials.');
  }
}

export async function authenticate(creds: XtreamCreds): Promise<AuthResult> {
  const payload = await api<AuthPayload>(creds);
  const info = payload.user_info;
  const ok = String(info?.auth ?? '0') === '1';
  return {
    ok,
    status: info?.status ?? (ok ? 'Active' : 'Rejected'),
    expiresAt: info?.exp_date ?? undefined,
    maxConnections: info?.max_connections ?? undefined,
  };
}

const CATEGORY_ACTION: Record<Kind, string> = {
  live: 'get_live_categories',
  movie: 'get_vod_categories',
  series: 'get_series_categories',
};

export async function fetchCategories(creds: XtreamCreds, kind: Kind): Promise<Category[]> {
  const rows = await api<RawCategory[]>(creds, { action: CATEGORY_ACTION[kind] });
  return (rows ?? [])
    .filter((row) => row.category_id)
    .map((row) => ({
      id: `${kind}:${row.category_id}`,
      kind,
      name: row.category_name ?? 'Unnamed category',
    }));
}

export async function fetchLive(creds: XtreamCreds): Promise<LiveChannel[]> {
  const rows = await api<RawLive[]>(creds, { action: 'get_live_streams' });
  return (rows ?? [])
    .filter((row) => row.stream_id !== undefined)
    .map((row) => ({
      id: String(row.stream_id),
      categoryId: `live:${row.category_id ?? '0'}`,
      name: row.name ?? 'Unnamed channel',
      icon: row.stream_icon || undefined,
      num: row.num,
    }));
}

export async function fetchMovies(creds: XtreamCreds): Promise<Movie[]> {
  const rows = await api<RawVod[]>(creds, { action: 'get_vod_streams' });
  return (rows ?? [])
    .filter((row) => row.stream_id !== undefined)
    .map((row) => ({
      id: String(row.stream_id),
      categoryId: `movie:${row.category_id ?? '0'}`,
      name: row.name ?? 'Untitled',
      icon: row.stream_icon || undefined,
      year: row.year || undefined,
      rating: row.rating || undefined,
      ext: row.container_extension || 'mp4',
      added: row.added ? Number(row.added) : undefined,
    }));
}

export async function fetchSeries(creds: XtreamCreds): Promise<Series[]> {
  const rows = await api<RawSeries[]>(creds, { action: 'get_series' });
  return (rows ?? [])
    .filter((row) => row.series_id !== undefined)
    .map((row) => ({
      id: String(row.series_id),
      categoryId: `series:${row.category_id ?? '0'}`,
      name: row.name ?? 'Untitled',
      icon: row.cover || undefined,
      year: row.year || undefined,
      rating: row.rating || undefined,
      plot: row.plot || undefined,
    }));
}

/** Xtream delivers streams as conventional paths rather than full URLs. */
export function streamUrl(creds: XtreamCreds, kind: Kind, itemId: string, ext?: string): string {
  const base = normalizeBase(creds.baseUrl);
  const user = encodeURIComponent(creds.username);
  const pass = encodeURIComponent(creds.password);

  if (kind === 'live') {
    return `${base}/live/${user}/${pass}/${itemId}.${creds.liveFormat ?? 'm3u8'}`;
  }
  const extension = (ext ?? 'mp4').replace(/^\./, '') || 'mp4';
  const section = kind === 'movie' ? 'movie' : 'series';
  return `${base}/${section}/${user}/${pass}/${itemId}.${extension}`;
}

/** Roku needs to know the container, and HLS is the only one it streams natively well. */
export function rokuFormatFor(url: string): 'hls' | 'mp4' | 'mkv' {
  const lower = url.toLowerCase();
  if (lower.includes('.m3u8')) return 'hls';
  if (lower.includes('.mkv')) return 'mkv';
  return 'mp4';
}

/**
 * True when this page is https and the target is plain http.
 *
 * Browsers block that as mixed content, and no setting on our side can override it.
 * Loopback is exempt because it counts as potentially trustworthy.
 */
export function isBlockedByMixedContent(target: string): boolean {
  if (typeof window === 'undefined' || window.location.protocol !== 'https:') return false;
  if (!/^http:\/\//i.test(target)) return false;
  try {
    const host = new URL(target).hostname;
    return host !== 'localhost' && host !== '127.0.0.1' && host !== '[::1]';
  } catch {
    return false;
  }
}
