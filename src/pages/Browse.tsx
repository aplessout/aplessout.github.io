import { useEffect, useState } from 'react';
import type { Category, Kind } from '../db';
import { useCatalogue } from '../store';
import { loadBrowsePage, loadCategories, type BrowseItem } from '../lib/query';
import { Chip, EmptyState, PosterImage, SectionHeader } from '../components/ui';
import PlaySheet, { type PlayTarget } from '../components/PlaySheet';

const titles: Record<Kind, string> = { live: 'Live TV', movie: 'Movies', series: 'Series' };
const PAGE_SIZE = 60;

export default function Browse({ kind }: { kind: Kind }) {
  const { counts } = useCatalogue();
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [items, setItems] = useState<BrowseItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [exhausted, setExhausted] = useState(false);
  const [target, setTarget] = useState<PlayTarget | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(query), 250);
    return () => clearTimeout(timer);
  }, [query]);

  // Any new filter starts again from the first page.
  useEffect(() => {
    setLimit(PAGE_SIZE);
  }, [kind, category, debounced]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    loadBrowsePage(kind, category, debounced, limit)
      .then((rows) => {
        if (cancelled) return;
        setItems(rows);
        setExhausted(rows.length < limit);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [kind, category, debounced, limit]);

  useEffect(() => {
    let cancelled = false;
    loadCategories(kind)
      .then((rows) => {
        if (!cancelled) setCategories(rows.slice(0, 24));
      })
      .catch(() => setCategories([]));
    return () => {
      cancelled = true;
    };
  }, [kind, counts[kind]]);

  const total = counts[kind];

  return (
    <div className="pt-4">
      <SectionHeader
        title={titles[kind]}
        action={total > 0 ? <span className="text-[12px] text-white/40">{total.toLocaleString()} items</span> : undefined}
      />

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
          {categories.map((entry) => (
            <Chip key={entry.id} active={category === entry.id} onClick={() => setCategory(entry.id)}>
              {entry.name}
            </Chip>
          ))}
        </div>
      )}

      {items.length === 0 ? (
        loading ? (
          <p className="px-4 py-8 text-[13px] text-white/40 md:px-8">Loading…</p>
        ) : (
          <EmptyState
            title={total === 0 ? 'Nothing here yet' : 'No matches'}
            hint={
              total === 0
                ? 'Connect your provider in Settings, or load the demo catalogue.'
                : 'Try a different search or category.'
            }
          />
        )
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3 px-4 md:grid-cols-5 md:gap-4 md:px-8 lg:grid-cols-6">
            {items.map((item) => (
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

          <div className="flex justify-center px-4 py-8">
            {exhausted ? (
              <span className="text-[12px] text-white/30">End of results</span>
            ) : (
              <button
                type="button"
                onClick={() => setLimit((value) => value + PAGE_SIZE)}
                disabled={loading}
                className="rounded-full border border-white/15 px-5 py-2 text-[13px] text-white/75 transition hover:border-white/35 disabled:opacity-40"
              >
                {loading ? 'Loading…' : `Load ${PAGE_SIZE} more`}
              </button>
            )}
          </div>
        </>
      )}

      <PlaySheet target={target} onClose={() => setTarget(null)} />
    </div>
  );
}
