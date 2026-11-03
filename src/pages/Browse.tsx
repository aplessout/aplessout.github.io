import { useMemo, useState } from 'react';
import type { Kind } from '../db';
import { useCatalogue } from '../store';
import { Chip, EmptyState, PosterImage, SectionHeader } from '../components/ui';
import PlaySheet, { type PlayTarget } from '../components/PlaySheet';

const titles: Record<Kind, string> = { live: 'Live TV', movie: 'Movies', series: 'Series' };

export default function Browse({ kind }: { kind: Kind }) {
  const { live, movies, series } = useCatalogue();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const [target, setTarget] = useState<PlayTarget | null>(null);

  const items = useMemo(() => {
    if (kind === 'live') return live.map((c) => ({ id: c.id, name: c.name, icon: c.icon, categoryId: c.categoryId, ext: undefined as string | undefined }));
    if (kind === 'movie') return movies.map((m) => ({ id: m.id, name: m.name, icon: m.icon, categoryId: m.categoryId, ext: m.ext }));
    return series.map((s) => ({ id: s.id, name: s.name, icon: s.icon, categoryId: s.categoryId, ext: undefined as string | undefined }));
  }, [kind, live, movies, series]);

  const categories = useMemo(() => {
    const seen = new Map<string, string>();
    for (const item of items) {
      if (!seen.has(item.categoryId)) seen.set(item.categoryId, item.categoryId.split(':')[1] ?? item.categoryId);
    }
    return [...seen.entries()].slice(0, 12);
  }, [items]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return items.filter((item) => {
      if (category && item.categoryId !== category) return false;
      if (!needle) return true;
      return item.name.toLowerCase().includes(needle);
    });
  }, [items, query, category]);

  return (
    <div className="pt-4">
      <SectionHeader title={titles[kind]} />

      <div className="mb-4 px-4 md:px-8">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={`Search ${titles[kind].toLowerCase()}`}
          className="w-full rounded-xl border border-white/10 bg-panel px-3.5 py-2.5 text-[14px] outline-none placeholder:text-white/35 focus:border-white/30"
        />
      </div>

      {categories.length > 1 && (
        <div className="no-scrollbar mb-5 flex gap-2 overflow-x-auto px-4 md:px-8">
          <Chip active={category === null} onClick={() => setCategory(null)}>
            All
          </Chip>
          {categories.map(([id, label]) => (
            <Chip key={id} active={category === id} onClick={() => setCategory(id)}>
              {label}
            </Chip>
          ))}
        </div>
      )}

      {filtered.length === 0 ? (
        <EmptyState
          title={items.length === 0 ? 'Nothing here yet' : 'No matches'}
          hint={
            items.length === 0
              ? 'Connect your provider in Settings, or load the demo catalogue.'
              : 'Try a different search or category.'
          }
        />
      ) : (
        <div className="grid grid-cols-3 gap-3 px-4 pb-10 md:grid-cols-5 md:gap-4 md:px-8 lg:grid-cols-6">
          {filtered.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTarget({ kind, id: item.id, name: item.name, icon: item.icon, ext: item.ext })}
              className="text-left transition hover:scale-[1.02]"
            >
              <PosterImage name={item.name} icon={item.icon} square={kind === 'live'} />
              <p className="mt-1.5 line-clamp-2 text-[12px] leading-snug text-white/80">{item.name}</p>
            </button>
          ))}
        </div>
      )}

      <PlaySheet target={target} onClose={() => setTarget(null)} />
    </div>
  );
}
