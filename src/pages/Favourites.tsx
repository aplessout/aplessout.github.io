import { useState } from 'react';
import type { Kind } from '../db';
import { useCatalogue } from '../store';
import { Chip, EmptyState, PosterImage, SectionHeader } from '../components/ui';
import PlaySheet, { type PlayTarget } from '../components/PlaySheet';

export default function Favourites() {
  const { favourites } = useCatalogue();
  const [filter, setFilter] = useState<Kind | 'all'>('all');
  const [target, setTarget] = useState<PlayTarget | null>(null);
  const visible = favourites.filter((entry) => filter === 'all' || entry.kind === filter);

  return (
    <div className="pt-4">
      <SectionHeader title="Favourites" />

      <div className="mb-5 flex gap-2 px-4 md:px-8">
        {(['all', 'live', 'movie', 'series'] as const).map((value) => (
          <Chip key={value} active={filter === value} onClick={() => setFilter(value)}>
            {value === 'all' ? 'All' : value === 'live' ? 'Live' : value === 'movie' ? 'Movies' : 'Series'}
          </Chip>
        ))}
      </div>

      {visible.length === 0 ? (
        <EmptyState title="No favourites yet" hint="Open any title and choose Add to favourites." />
      ) : (
        <div className="grid grid-cols-3 gap-3 px-4 pb-10 md:grid-cols-5 md:gap-4 md:px-8 lg:grid-cols-6">
          {visible.map((entry) => (
            <button
              key={entry.key}
              type="button"
              onClick={() => setTarget({ kind: entry.kind, id: entry.itemId, name: entry.name, icon: entry.icon })}
              className="text-left transition hover:scale-[1.02]"
            >
              <PosterImage name={entry.name} icon={entry.icon} square={entry.kind === 'live'} />
              <p className="mt-1.5 line-clamp-2 text-[12px] leading-snug text-white/80">{entry.name}</p>
            </button>
          ))}
        </div>
      )}

      <PlaySheet target={target} onClose={() => setTarget(null)} />
    </div>
  );
}
