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
  type Destination,
  type Favourite,
  type HistoryEntry,
  type Kind,
  type LiveChannel,
  type Movie,
  type ProviderConfig,
  type Series,
} from './db';
import { seedDemo } from './lib/fixtures';
import { fetchLive, fetchMovies, fetchSeries } from './lib/xtream';

interface CatalogueContext {
  live: LiveChannel[];
  movies: Movie[];
  series: Series[];
  favourites: Favourite[];
  history: HistoryEntry[];
  provider: ProviderConfig | null;
  loading: boolean;
  status: string;
  setStatus: (message: string) => void;
  reload: () => Promise<void>;
  seed: () => Promise<void>;
  syncProvider: (creds: ProviderConfig) => Promise<void>;
  clearCatalogue: () => Promise<void>;
  reloadSettings: () => Promise<void>;
  toggleFavourite: (kind: Kind, itemId: string, name: string, icon?: string) => Promise<void>;
  recordHistory: (kind: Kind, itemId: string, name: string, destination: Destination, icon?: string) => Promise<void>;
}

const CatalogueCtx = createContext<CatalogueContext | null>(null);

export function CatalogueProvider({ children }: { children: ReactNode }) {
  const [live, setLive] = useState<LiveChannel[]>([]);
  const [movies, setMovies] = useState<Movie[]>([]);
  const [series, setSeries] = useState<Series[]>([]);
  const [favourites, setFavourites] = useState<Favourite[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [provider, setProvider] = useState<ProviderConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');

  const reload = useCallback(async () => {
    const [liveRows, movieRows, seriesRows, favouriteRows, historyRows, savedProvider] = await Promise.all([
      db.live.toArray(),
      db.movies.toArray(),
      db.series.toArray(),
      db.favourites.toArray(),
      db.history.orderBy('playedAt').reverse().limit(40).toArray(),
      getSetting('provider'),
    ]);
    setLive(liveRows.sort((a, b) => (a.num ?? 0) - (b.num ?? 0)));
    setMovies(movieRows.sort((a, b) => (b.added ?? 0) - (a.added ?? 0)));
    setSeries(seriesRows.sort((a, b) => a.name.localeCompare(b.name)));
    setFavourites(favouriteRows.sort((a, b) => b.addedAt - a.addedAt));
    setHistory(historyRows);
    setProvider(savedProvider ?? null);
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
      setStatus('Contacting provider…');
      try {
        const [liveRows, movieRows, seriesRows] = await Promise.all([
          fetchLive(creds),
          fetchMovies(creds),
          fetchSeries(creds),
        ]);
        await db.transaction('rw', [db.live, db.movies, db.series], async () => {
          await db.live.clear();
          await db.movies.clear();
          await db.series.clear();
          await db.live.bulkPut(liveRows);
          await db.movies.bulkPut(movieRows);
          await db.series.bulkPut(seriesRows);
        });
        await reload();
        setStatus(`Synced ${liveRows.length} channels, ${movieRows.length} movies, ${seriesRows.length} series.`);
      } catch (error) {
        // Existing catalogue is deliberately left untouched on failure.
        setStatus(error instanceof Error ? error.message : 'Sync failed.');
      }
    },
    [reload]
  );

  const clearCatalogue = useCallback(async () => {
    await db.transaction('rw', [db.live, db.movies, db.series, db.categories], async () => {
      await db.live.clear();
      await db.movies.clear();
      await db.series.clear();
      await db.categories.clear();
    });
    await reload();
    setStatus('Catalogue cleared. Favourites and history were kept.');
  }, [reload]);

  const toggleFavourite = useCallback(
    async (kind: Kind, itemId: string, name: string, icon?: string) => {
      const key = `${kind}:${itemId}`;
      const existing = await db.favourites.get(key);
      if (existing) await db.favourites.delete(key);
      else await db.favourites.put({ key, kind, itemId, name, icon, addedAt: Date.now() });
      setFavourites((await db.favourites.toArray()).sort((a, b) => b.addedAt - a.addedAt));
    },
    []
  );

  const recordHistory = useCallback(
    async (kind: Kind, itemId: string, name: string, destination: Destination, icon?: string) => {
      const entry: HistoryEntry = {
        key: `${kind}:${itemId}`,
        kind,
        itemId,
        name,
        icon,
        destination,
        playedAt: Date.now(),
      };
      await db.history.put(entry);
      setHistory((await db.history.orderBy('playedAt').reverse().limit(40).toArray()) ?? []);
    },
    []
  );

  const value = useMemo<CatalogueContext>(
    () => ({
      live,
      movies,
      series,
      favourites,
      history,
      provider,
      loading,
      status,
      setStatus,
      reload,
      seed,
      syncProvider,
      clearCatalogue,
      reloadSettings: reload,
      toggleFavourite,
      recordHistory,
    }),
    [live, movies, series, favourites, history, provider, loading, status, reload, seed, syncProvider, clearCatalogue, toggleFavourite, recordHistory]
  );

  return <CatalogueCtx.Provider value={value}>{children}</CatalogueCtx.Provider>;
}

export function useCatalogue(): CatalogueContext {
  const context = useContext(CatalogueCtx);
  if (!context) throw new Error('useCatalogue must be used inside CatalogueProvider');
  return context;
}
