import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  db,
  getSetting,
  replaceAll,
  type Destination,
  type Favourite,
  type HistoryEntry,
  type Kind,
  type LiveChannel,
  type Movie,
  type Progress,
  type ProviderConfig,
  type Series,
} from './db';
import { seedDemo } from './lib/fixtures';
import { fetchCategories, fetchLive, fetchMovies, fetchSeries, fetchSeriesDetail } from './lib/xtream';

/** Home only ever renders a handful of titles, so it never needs the full table. */
const HOME_LIMIT = 24;
const LIVE_RAIL_LIMIT = 400;

export interface CatalogueCounts {
  live: number;
  movie: number;
  series: number;
}

interface SeriesDetailResult {
  seasons: number;
  episodes: number;
  error?: string;
}

interface CatalogueContext {
  live: LiveChannel[];
  movies: Movie[];
  series: Series[];
  counts: CatalogueCounts;
  favourites: Favourite[];
  history: HistoryEntry[];
  progress: Progress[];
  provider: ProviderConfig | null;
  loading: boolean;
  status: string;
  setStatus: (message: string) => void;
  reload: () => Promise<void>;
  seed: () => Promise<void>;
  syncProvider: (creds: ProviderConfig) => Promise<void>;
  syncSeriesDetail: (seriesId: string) => Promise<SeriesDetailResult>;
  clearCatalogue: () => Promise<void>;
  reloadSettings: () => Promise<void>;
  toggleFavourite: (kind: Kind, itemId: string, name: string, icon?: string) => Promise<void>;
  recordHistory: (
    kind: Kind,
    itemId: string,
    name: string,
    destination: Destination,
    icon?: string,
    extra?: { streamId?: string; ext?: string }
  ) => Promise<void>;
}

const CatalogueCtx = createContext<CatalogueContext | null>(null);

export function CatalogueProvider({ children }: { children: ReactNode }) {
  const [live, setLive] = useState<LiveChannel[]>([]);
  const [movies, setMovies] = useState<Movie[]>([]);
  const [series, setSeries] = useState<Series[]>([]);
  const [counts, setCounts] = useState<CatalogueCounts>({ live: 0, movie: 0, series: 0 });
  const [favourites, setFavourites] = useState<Favourite[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [progress, setProgress] = useState<Progress[]>([]);
  const [provider, setProvider] = useState<ProviderConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');

  const reload = useCallback(async () => {
    const [
      liveRows,
      movieRows,
      seriesRows,
      favouriteRows,
      historyRows,
      progressRows,
      savedProvider,
      liveCount,
      movieCount,
      seriesCount,
    ] = await Promise.all([
      db.live.orderBy('num').limit(LIVE_RAIL_LIMIT).toArray(),
      db.movies.orderBy('added').reverse().limit(HOME_LIMIT).toArray(),
      db.series.orderBy('name').limit(HOME_LIMIT).toArray(),
      db.favourites.toArray(),
      db.history.orderBy('playedAt').reverse().limit(40).toArray(),
      db.progress.orderBy('updatedAt').reverse().limit(60).toArray(),
      getSetting('provider'),
      db.live.count(),
      db.movies.count(),
      db.series.count(),
    ]);

    setLive(liveRows);
    setMovies(movieRows);
    setSeries(seriesRows);
    setFavourites(favouriteRows.sort((a, b) => b.addedAt - a.addedAt));
    setHistory(historyRows);
    setProgress(progressRows);
    setProvider(savedProvider ?? null);
    setCounts({ live: liveCount, movie: movieCount, series: seriesCount });
  }, []);

  useEffect(() => {
    reload()
      .catch((error) => setStatus(`Could not open local storage: ${String(error)}`))
      .finally(() => setLoading(false));
  }, [reload]);

  const seed = useCallback(async () => {
    setStatus('Loading demo catalogue…');
    await seedDemo();
    await reload();
    setStatus('Demo catalogue loaded.');
  }, [reload]);

  const syncProvider = useCallback(
    async (creds: ProviderConfig) => {
      setStatus('Downloading catalogue…');
      try {
        const [liveRows, movieRows, seriesRows, liveCategories, movieCategories, seriesCategories] = await Promise.all([
          fetchLive(creds),
          fetchMovies(creds),
          fetchSeries(creds),
          fetchCategories(creds, 'live').catch(() => []),
          fetchCategories(creds, 'movie').catch(() => []),
          fetchCategories(creds, 'series').catch(() => []),
        ]);

        setStatus(
          `Writing ${liveRows.length + movieRows.length + seriesRows.length} entries… this is the slow part, once.`
        );

        await db.categories.clear();
        await db.categories.bulkPut([...liveCategories, ...movieCategories, ...seriesCategories]);
        await replaceAll<LiveChannel>(db.live, liveRows);
        await replaceAll<Movie>(db.movies, movieRows);
        await replaceAll<Series>(db.series, seriesRows);

        await reload();
        setStatus(
          `Synced ${liveRows.length} channels, ${movieRows.length} movies and ${seriesRows.length} series. Browsing now reads from local storage only.`
        );
      } catch (error) {
        // Existing catalogue is deliberately left untouched on failure.
        setStatus(error instanceof Error ? error.message : 'Sync failed.');
      }
    },
    [reload]
  );

  /** Episodes are fetched per series on demand: syncing every series up front would be enormous. */
  const syncSeriesDetail = useCallback(
    async (seriesId: string): Promise<SeriesDetailResult> => {
      if (!provider) return { seasons: 0, episodes: 0, error: 'No provider configured.' };
      try {
        const detail = await fetchSeriesDetail(provider, seriesId);
        await db.transaction('rw', [db.seasons, db.episodes], async () => {
          await db.seasons.where('seriesId').equals(seriesId).delete();
          await db.episodes.where('seriesId').equals(seriesId).delete();
          await db.seasons.bulkPut(detail.seasons);
          await db.episodes.bulkPut(detail.episodes);
        });
        return { seasons: detail.seasons.length, episodes: detail.episodes.length };
      } catch (error) {
        return {
          seasons: 0,
          episodes: 0,
          error: error instanceof Error ? error.message : 'Could not load episodes.',
        };
      }
    },
    [provider]
  );

  const clearCatalogue = useCallback(async () => {
    await db.transaction('rw', [db.live, db.movies, db.series, db.categories, db.seasons, db.episodes], async () => {
      await db.live.clear();
      await db.movies.clear();
      await db.series.clear();
      await db.categories.clear();
      await db.seasons.clear();
      await db.episodes.clear();
    });
    await reload();
    setStatus('Catalogue cleared. Favourites and history were kept.');
  }, [reload]);

  const toggleFavourite = useCallback(async (kind: Kind, itemId: string, name: string, icon?: string) => {
    const key = `${kind}:${itemId}`;
    const existing = await db.favourites.get(key);
    if (existing) await db.favourites.delete(key);
    else await db.favourites.put({ key, kind, itemId, name, icon, addedAt: Date.now() });
    setFavourites((await db.favourites.toArray()).sort((a, b) => b.addedAt - a.addedAt));
  }, []);

  const recordHistory = useCallback(
    async (
      kind: Kind,
      itemId: string,
      name: string,
      destination: Destination,
      icon?: string,
      extra?: { streamId?: string; ext?: string }
    ) => {
      const entry: HistoryEntry = {
        key: `${kind}:${itemId}`,
        kind,
        itemId,
        name,
        icon,
        destination,
        playedAt: Date.now(),
        streamId: extra?.streamId,
        ext: extra?.ext,
      };
      await db.history.put(entry);
      setHistory(await db.history.orderBy('playedAt').reverse().limit(40).toArray());
    },
    []
  );

  const value = useMemo<CatalogueContext>(
    () => ({
      live,
      movies,
      series,
      counts,
      favourites,
      history,
      progress,
      provider,
      loading,
      status,
      setStatus,
      reload,
      seed,
      syncProvider,
      syncSeriesDetail,
      clearCatalogue,
      reloadSettings: reload,
      toggleFavourite,
      recordHistory,
    }),
    [
      live,
      movies,
      series,
      counts,
      favourites,
      history,
      progress,
      provider,
      loading,
      status,
      reload,
      seed,
      syncProvider,
      syncSeriesDetail,
      clearCatalogue,
      toggleFavourite,
      recordHistory,
    ]
  );

  return <CatalogueCtx.Provider value={value}>{children}</CatalogueCtx.Provider>;
}

export function useCatalogue(): CatalogueContext {
  const context = useContext(CatalogueCtx);
  if (!context) throw new Error('useCatalogue must be used inside CatalogueProvider');
  return context;
}
