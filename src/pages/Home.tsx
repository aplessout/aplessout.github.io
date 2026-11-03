import { useState } from 'react';
import { useCatalogue } from '../store';
import { PosterImage, Rail, EmptyState } from '../components/ui';
import PlaySheet, { type PlayTarget } from '../components/PlaySheet';

export default function Home() {
  const { movies, series, live, history, loading } = useCatalogue();
  const [target, setTarget] = useState<PlayTarget | null>(null);

  const featured = movies[0];
  const resume = history.filter((entry) => entry.kind !== 'live');

  return (
    <div className="pb-8">
      {featured ? (
        <section className="relative">
          <div className="relative h-[46vh] min-h-[260px] w-full overflow-hidden md:h-[54vh]">
            <PosterImage name={featured.name} icon={featured.icon} className="h-full w-full rounded-none object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/40 to-transparent" />
          </div>
          <div className="relative -mt-24 px-4 md:px-8">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand">Featured</p>
            <h1 className="mt-1 max-w-xl text-2xl font-bold leading-tight md:text-4xl">{featured.name}</h1>
            <p className="mt-1 text-[13px] text-white/55">
              {[featured.year, featured.rating ? `${featured.rating} rating` : null, 'Movie'].filter(Boolean).join(' · ')}
            </p>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setTarget({ kind: 'movie', id: featured.id, name: featured.name, icon: featured.icon, ext: featured.ext })}
                className="rounded-lg bg-white px-5 py-2.5 text-[13px] font-semibold text-black hover:bg-white/90"
              >
                Play
              </button>
              <button
                type="button"
                onClick={() => setTarget({ kind: 'movie', id: featured.id, name: featured.name, icon: featured.icon, ext: featured.ext })}
                className="rounded-lg border border-white/20 px-5 py-2.5 text-[13px] font-semibold text-white/85 hover:border-white/40"
              >
                More info
              </button>
            </div>
          </div>
        </section>
      ) : (
        !loading && (
          <div className="pt-6">
            <EmptyState
              title="No catalogue yet"
              hint="Open Settings to connect your Xtream provider, or load the demo catalogue to explore the interface."
            />
          </div>
        )
      )}

      {resume.length > 0 && (
        <Rail title="Continue watching">
          {resume.slice(0, 12).map((entry) => (
            <button
              key={entry.key}
              type="button"
              onClick={() => setTarget({ kind: entry.kind, id: entry.itemId, name: entry.name, icon: entry.icon })}
              className="w-[112px] shrink-0 text-left transition hover:opacity-90 md:w-[132px]"
            >
              <PosterImage name={entry.name} icon={entry.icon} />
              <p className="mt-1.5 truncate text-[12px] text-white/80">{entry.name}</p>
            </button>
          ))}
        </Rail>
      )}

      {movies.length > 0 && (
        <Rail title="Movies">
          {movies.slice(0, 18).map((movie) => (
            <button
              key={movie.id}
              type="button"
              onClick={() => setTarget({ kind: 'movie', id: movie.id, name: movie.name, icon: movie.icon, ext: movie.ext })}
              className="w-[112px] shrink-0 text-left transition hover:scale-[1.03] md:w-[132px]"
            >
              <PosterImage name={movie.name} icon={movie.icon} />
              <p className="mt-1.5 truncate text-[12px] text-white/80">{movie.name}</p>
            </button>
          ))}
        </Rail>
      )}

      {series.length > 0 && (
        <Rail title="Series">
          {series.slice(0, 18).map((show) => (
            <button
              key={show.id}
              type="button"
              onClick={() => setTarget({ kind: 'series', id: show.id, name: show.name, icon: show.icon })}
              className="w-[112px] shrink-0 text-left transition hover:scale-[1.03] md:w-[132px]"
            >
              <PosterImage name={show.name} icon={show.icon} />
              <p className="mt-1.5 truncate text-[12px] text-white/80">{show.name}</p>
            </button>
          ))}
        </Rail>
      )}

      {live.length > 0 && (
        <Rail title="Live now">
          {live.slice(0, 14).map((channel) => (
            <button
              key={channel.id}
              type="button"
              onClick={() => setTarget({ kind: 'live', id: channel.id, name: channel.name, icon: channel.icon })}
              className="w-[128px] shrink-0 rounded-xl border border-white/8 bg-panel/60 p-2 text-left transition hover:border-white/25 md:w-[150px]"
            >
              <PosterImage name={channel.name} icon={channel.icon} square />
              <p className="mt-1.5 truncate text-[12px] text-white/80">{channel.name}</p>
            </button>
          ))}
        </Rail>
      )}

      <PlaySheet target={target} onClose={() => setTarget(null)} />
    </div>
  );
}
