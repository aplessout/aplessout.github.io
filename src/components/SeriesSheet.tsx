import { useEffect, useState } from 'react';
import { db, type Episode, type Season } from '../db';
import { useCatalogue } from '../store';
import { PosterImage } from './ui';
import type { PlayTarget } from './PlaySheet';

export interface SeriesRef {
  id: string;
  name: string;
  icon?: string;
  plot?: string;
  year?: string;
  rating?: string;
}

export default function SeriesSheet({
  series,
  onClose,
  onPlay,
}: {
  series: SeriesRef | null;
  onClose: () => void;
  onPlay: (target: PlayTarget) => void;
}) {
  const { provider, syncSeriesDetail, favourites, toggleFavourite } = useCatalogue();
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [active, setActive] = useState<number | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState('');

  const isFavourite = series ? favourites.some((entry) => entry.key === `series:${series.id}`) : false;

  useEffect(() => {
    if (!series) return;
    let cancelled = false;
    setState('loading');
    setError('');
    setSeasons([]);
    setEpisodes([]);
    setActive(null);

    const apply = (seasonRows: Season[], episodeRows: Episode[]) => {
      const orderedSeasons = [...seasonRows].sort((a, b) => a.number - b.number);
      const orderedEpisodes = [...episodeRows].sort((a, b) => a.season - b.season || a.episodeNum - b.episodeNum);
      setSeasons(orderedSeasons);
      setEpisodes(orderedEpisodes);
      setActive(orderedSeasons[0]?.number ?? orderedEpisodes[0]?.season ?? 1);
      setState('ready');
    };

    void (async () => {
      const [cachedEpisodes, cachedSeasons] = await Promise.all([
        db.episodes.where('seriesId').equals(series.id).toArray(),
        db.seasons.where('seriesId').equals(series.id).toArray(),
      ]);
      if (cancelled) return;
      if (cachedEpisodes.length > 0) {
        apply(cachedSeasons, cachedEpisodes);
        return;
      }

      const result = await syncSeriesDetail(series.id);
      if (cancelled) return;
      if (result.error) {
        setError(result.error);
        setState('error');
        return;
      }
      const [freshEpisodes, freshSeasons] = await Promise.all([
        db.episodes.where('seriesId').equals(series.id).toArray(),
        db.seasons.where('seriesId').equals(series.id).toArray(),
      ]);
      if (cancelled) return;
      apply(freshSeasons, freshEpisodes);
    })();

    return () => {
      cancelled = true;
    };
  }, [series, syncSeriesDetail]);

  if (!series) return null;

  const visible = episodes.filter((episode) => episode.season === active);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm md:items-center md:p-6">
      <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-2xl border border-white/10 bg-panel p-5 md:rounded-2xl">
        <div className="flex items-start gap-3">
          <div className="w-16 shrink-0">
            <PosterImage name={series.name} icon={series.icon} />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-[17px] font-semibold leading-tight">{series.name}</h2>
            <p className="mt-0.5 text-[12px] text-white/45">
              {[series.year, series.rating ? `${series.rating} rating` : null, 'Series'].filter(Boolean).join(' · ')}
            </p>
            <button
              type="button"
              onClick={() => void toggleFavourite('series', series.id, series.name, series.icon)}
              className="mt-2 rounded-full border border-white/15 px-3 py-1 text-[12px] text-white/70 transition hover:border-white/35 hover:text-white"
            >
              {isFavourite ? 'Remove favourite' : 'Add favourite'}
            </button>
          </div>
          <button type="button" onClick={onClose} className="rounded-full p-1.5 text-white/60 hover:text-white">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {series.plot && <p className="mt-4 line-clamp-4 text-[12.5px] leading-relaxed text-white/55">{series.plot}</p>}

        {state === 'loading' && (
          <p className="mt-6 animate-pulse text-[13px] text-white/45">Loading seasons and episodes…</p>
        )}

        {state === 'error' && (
          <div className="mt-5 rounded-xl border border-white/10 bg-black/30 px-3.5 py-3">
            <p className="text-[12.5px] text-white/70">Could not load episodes.</p>
            <p className="mt-1 text-[11.5px] leading-relaxed text-white/40">{error}</p>
            {!provider && (
              <p className="mt-1 text-[11.5px] text-white/40">
                Demo series have no episodes — connect your provider in Settings.
              </p>
            )}
          </div>
        )}

        {state === 'ready' && episodes.length === 0 && (
          <p className="mt-6 text-[13px] text-white/50">The provider returned no episodes for this series.</p>
        )}

        {state === 'ready' && episodes.length > 0 && (
          <>
            <div className="no-scrollbar mt-5 flex gap-2 overflow-x-auto pb-1">
              {seasons.map((season) => (
                <button
                  key={season.id}
                  type="button"
                  onClick={() => setActive(season.number)}
                  className={`shrink-0 rounded-full border px-3.5 py-1.5 text-[12.5px] transition ${
                    active === season.number
                      ? 'border-white/80 bg-white text-black'
                      : 'border-white/15 bg-white/5 text-white/70 hover:border-white/30 hover:text-white'
                  }`}
                >
                  {season.name || `Season ${season.number}`}
                  {season.episodeCount ? <span className="ml-1 opacity-60">{season.episodeCount}</span> : null}
                </button>
              ))}
            </div>

            <ul className="mt-3 divide-y divide-white/5">
              {visible.map((episode) => (
                <li key={episode.id}>
                  <button
                    type="button"
                    onClick={() =>
                      onPlay({
                        kind: 'series',
                        id: episode.id,
                        streamId: episode.streamId,
                        ext: episode.ext,
                        name: `${series.name} · S${episode.season}E${episode.episodeNum}`,
                        icon: episode.icon ?? series.icon,
                        favourite: { kind: 'series', id: series.id, name: series.name, icon: series.icon },
                      })
                    }
                    className="flex w-full items-center gap-3 py-2.5 text-left transition hover:opacity-80"
                  >
                    <span className="w-9 shrink-0 text-[12px] tabular-nums text-white/35">
                      {String(episode.episodeNum).padStart(2, '0')}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] text-white/85">{episode.title}</span>
                      {episode.duration && <span className="text-[11px] text-white/35">{episode.duration}</span>}
                    </span>
                    <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-white/40" fill="currentColor">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}
