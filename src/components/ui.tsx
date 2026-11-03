import { useState } from 'react';
import { initials, providerPoster } from '../lib/posters';

export function PosterImage({
  name,
  icon,
  className = '',
  square = false,
}: {
  name: string;
  icon?: string;
  className?: string;
  square?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const src = providerPoster(icon);

  if (!src || failed) {
    return (
      <div
        className={`flex items-center justify-center bg-gradient-to-br from-panel to-ink ${
          square ? 'aspect-square rounded-xl' : 'aspect-[2/3] rounded-lg'
        } ${className}`}
      >
        <span className="text-lg font-semibold tracking-wide text-white/40">{initials(name)}</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={name}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
      // Posters are a third-party asset; a referrer policy avoids leaking the app URL.
      referrerPolicy="no-referrer"
      className={`${square ? 'aspect-square rounded-xl' : 'aspect-[2/3] rounded-lg'} w-full bg-panel object-cover ${
        square ? 'object-contain p-3' : ''
      } ${className}`}
    />
  );
}

export function Rail({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-7">
      <h2 className="mb-3 px-4 text-[15px] font-semibold tracking-tight text-white/90 md:px-8">{title}</h2>
      <div className="no-scrollbar flex gap-3 overflow-x-auto px-4 pb-1 md:px-8">{children}</div>
    </section>
  );
}

export function SectionHeader({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <div className="mb-4 flex items-end justify-between px-4 md:px-8">
      <h1 className="text-xl font-semibold tracking-tight md:text-2xl">{title}</h1>
      {action}
    </div>
  );
}

export function Chip({
  active,
  children,
  onClick,
}: {
  active?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 rounded-full border px-3.5 py-1.5 text-[13px] transition ${
        active
          ? 'border-white/80 bg-white text-black'
          : 'border-white/15 bg-white/5 text-white/70 hover:border-white/30 hover:text-white'
      }`}
    >
      {children}
    </button>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="mx-4 mt-10 rounded-2xl border border-white/10 bg-panel/60 px-6 py-10 text-center md:mx-8">
      <p className="text-[15px] font-medium">{title}</p>
      {hint && <p className="mx-auto mt-2 max-w-sm text-[13px] leading-relaxed text-white/50">{hint}</p>}
    </div>
  );
}
