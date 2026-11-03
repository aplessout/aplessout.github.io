import Dexie, { type Table } from 'dexie';

export type Kind = 'live' | 'movie' | 'series';
export type Destination = 'device' | 'roku';

export interface ProviderConfig {
  baseUrl: string;
  username: string;
  password: string;
  liveFormat: 'm3u8' | 'ts';
  updatedAt: number;
}

export interface AppSettings {
  provider?: ProviderConfig;
  rokuIp?: string;
  rokuShortcut?: string;
  tmdbKey?: string;
}

export interface Category {
  id: string;
  kind: Kind;
  name: string;
  hidden?: number;
}

export interface LiveChannel {
  id: string;
  categoryId: string;
  name: string;
  icon?: string;
  num?: number;
}

export interface Movie {
  id: string;
  categoryId: string;
  name: string;
  icon?: string;
  year?: string;
  rating?: string;
  ext?: string;
  added?: number;
}

export interface Series {
  id: string;
  categoryId: string;
  name: string;
  icon?: string;
  year?: string;
  rating?: string;
  plot?: string;
}

export interface Favourite {
  key: string;
  kind: Kind;
  itemId: string;
  name: string;
  icon?: string;
  addedAt: number;
}

export interface HistoryEntry {
  key: string;
  kind: Kind;
  itemId: string;
  name: string;
  icon?: string;
  destination: Destination;
  playedAt: number;
}

export interface Progress {
  key: string;
  positionSec: number;
  durationSec: number;
  completed: number;
  updatedAt: number;
}

export interface SettingRow {
  key: string;
  value: unknown;
}

class IptvDb extends Dexie {
  live!: Table<LiveChannel, string>;
  movies!: Table<Movie, string>;
  series!: Table<Series, string>;
  categories!: Table<Category, string>;
  favourites!: Table<Favourite, string>;
  history!: Table<HistoryEntry, string>;
  progress!: Table<Progress, string>;
  settings!: Table<SettingRow, string>;

  constructor() {
    super('iptv-pwa');
    this.version(1).stores({
      live: 'id, categoryId, name',
      movies: 'id, categoryId, name',
      series: 'id, categoryId, name',
      categories: 'id, kind',
      favourites: 'key, kind, itemId',
      history: 'key, playedAt',
      progress: 'key, updatedAt',
      settings: 'key',
    });

    // v2 adds the indexes needed to page a large catalogue instead of loading it
    // whole: recency for movies, channel numbers for live.
    this.version(2).stores({
      live: 'id, categoryId, name, num',
      movies: 'id, categoryId, name, added',
      series: 'id, categoryId, name',
    });
  }
}

export const db = new IptvDb();

export async function getSetting<K extends keyof AppSettings>(key: K): Promise<AppSettings[K]> {
  const row = await db.settings.get(key);
  return row?.value as AppSettings[K];
}

export async function setSetting<K extends keyof AppSettings>(key: K, value: AppSettings[K]): Promise<void> {
  await db.settings.put({ key, value });
}

/** Bulk writes are chunked so a 50k-row catalogue never blocks the main thread in one go. */
export async function replaceAll<T>(table: Table<T, string>, rows: T[]): Promise<void> {
  const CHUNK = 4000;
  await table.clear();
  for (let index = 0; index < rows.length; index += CHUNK) {
    await table.bulkPut(rows.slice(index, index + CHUNK));
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
}
