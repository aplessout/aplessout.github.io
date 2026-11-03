import { useEffect, useRef, useState } from 'react';
import { db, getSetting, type Kind } from '../db';
import { dispatchToRoku, buildLaunchUrl, isIos } from '../lib/roku';
import { isBlockedByMixedContent, streamUrl } from '../lib/xtream';
import { useCatalogue } from '../store';
import { PosterImage } from './ui';

export interface PlayTarget {
  kind: Kind;
  /** Local key: movie/channel id, or the composite episode key. */
  id: string;
  name: string;
  icon?: string;
  ext?: string;
  /** Provider id when it differs from the local key (episodes). */
  streamId?: string;
  /** Favourite entry to toggle, when playing something nested (an episode of a series). */
  favourite?: { kind: Kind; id: string; name: string; icon?: string };
}

export default function PlaySheet({ target, onClose }: { target: PlayTarget | null; onClose: () => void }) {
  const { provider, favourites, toggleFavourite, recordHistory, reload } = useCatalogue();
  const [mode, setMode] = useState<'choose' | 'device'>('choose');
  const [note, setNote] = useState('');
  const [launchUrl, setLaunchUrl] = useState('');
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const lastSaved = useRef(0);
  const resumeAt = useRef(0);

  const url = target && provider ? streamUrl(provider, target.kind, target.streamId ?? target.id, target.ext) : '';
  const favourite = target?.favourite ?? (target ? { kind: target.kind, id: target.id, name: target.name, icon: target.icon } : null);
  const isFavourite = favourite ? favourites.some((entry) => entry.key === `${favourite.kind}:${favourite.id}`) : false;

  useEffect(() => {
    setMode('choose');
    setNote('');
    setLaunchUrl('');
    resumeAt.current = 0;
    if (!target) return;

    let cancelled = false;
    void db.progress.get(`${target.kind}:${target.id}`).then((row) => {
      // Only a half-watched item resumes; a finished one starts over.
      if (!cancelled && row && row.completed === 0) resumeAt.current = row.positionSec;
    });
    return () => {
      cancelled = true;
    };
  }, [target]);

  if (!target) return null;

  async function playOnDevice() {
    if (!url) {
      setNote('Connect your provider in Settings first — demo entries have no real stream.');
      return;
    }
    if (isBlockedByMixedContent(url)) {
      setNote(
        'This stream is http:// while the app is served over https://, so the browser blocks it before it reaches your device. Roku still works, because the Shortcut fetches the stream, not the browser.'
      );
      return;
    }
    setMode('device');
    await recordHistory(target!.kind, target!.id, target!.name, 'device', target!.icon, {
      streamId: target!.streamId,
      ext: target!.ext,
    });
  }

  async function playOnRoku() {
    const ip = (await getSetting('rokuIp')) ?? '';
    const shortcut = (await getSetting('rokuShortcut')) ?? 'Roku Play';

    setLaunchUrl(ip && url ? buildLaunchUrl(ip, url, url.includes('.m3u8') ? 'hls' : 'mp4') : '');
    if (!url) {
      setNote('Connect your provider in Settings first — demo entries have no real stream.');
      return;
    }
    if (!ip.trim()) {
      setNote('Add your Roku IP in Settings.');
      return;
    }

    const result = dispatchToRoku(ip, url, shortcut);
    if (result.dispatched) {
      setNote('Handed to the Roku Shortcut. Confirmation appears when the Shortcut calls back.');
      await recordHistory(target!.kind, target!.id, target!.name, 'roku', target!.icon, {
        streamId: target!.streamId,
        ext: target!.ext,
      });
    } else {
      setNote(result.reason ?? 'Dispatch is not available in this browser.');
    }
  }

  async function saveProgress(completed = false) {
    const video = videoRef.current;
    if (!video || !Number.isFinite(video.duration) || video.duration === 0) return;
    const now = Date.now();
    if (!completed && now - lastSaved.current < 15000) return;
    lastSaved.current = now;

    const atEnd = completed || video.currentTime / video.duration >= 0.95 || video.duration - video.currentTime < 30;
    await db.progress.put({
      key: `${target!.kind}:${target!.id}`,
      positionSec: video.currentTime,
      durationSec: video.duration,
      completed: atEnd ? 1 : 0,
      updatedAt: now,
    });
    // Keeps the Continue Watching rail honest as soon as a title finishes.
    if (atEnd) await reload();
  }

  function handleLoadedMetadata() {
    const video = videoRef.current;
    if (!video || resumeAt.current <= 5) return;
    if (video.duration - resumeAt.current > 30) {
      video.currentTime = resumeAt.current;
      setNote(`Resumed at ${Math.floor(resumeAt.current / 60)} min.`);
    }
  }

  async function copyLaunchUrl() {
    try {
      await navigator.clipboard.writeText(launchUrl);
      setNote('Launch URL copied.');
    } catch {
      setNote('Clipboard blocked — select the URL manually.');
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm md:items-center md:p-6">
      <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-2xl border border-white/10 bg-panel p-5 md:rounded-2xl">
        <div className="flex items-start gap-3">
          <div className="w-14 shrink-0">
            <PosterImage name={target.name} icon={target.icon} />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-[16px] font-semibold">{target.name}</h2>
            <p className="text-[12px] capitalize text-white/45">{target.kind}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-full p-1.5 text-white/60 hover:text-white">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {mode === 'choose' ? (
          <div className="mt-5 space-y-2">
            <button
              type="button"
              onClick={() => void playOnDevice()}
              className="w-full rounded-xl bg-white px-4 py-3 text-left text-[14px] font-semibold text-black transition hover:bg-white/90"
            >
              Play on this device
              <span className="mt-0.5 block text-[12px] font-normal text-black/60">Native player, HLS or MP4</span>
            </button>
            <button
              type="button"
              onClick={() => void playOnRoku()}
              className="w-full rounded-xl border border-white/15 px-4 py-3 text-left text-[14px] font-semibold transition hover:border-white/35"
            >
              Play on Roku
              <span className="mt-0.5 block text-[12px] font-normal text-white/45">
                Media Assistant via iOS Shortcut{isIos() ? '' : ' (iOS only)'}
              </span>
            </button>
            <button
              type="button"
              onClick={() => favourite && void toggleFavourite(favourite.kind, favourite.id, favourite.name, favourite.icon)}
              className="w-full rounded-xl border border-white/10 px-4 py-2.5 text-left text-[13px] text-white/70 transition hover:text-white"
            >
              {isFavourite ? 'Remove from favourites' : 'Add to favourites'}
            </button>
          </div>
        ) : (
          <div className="mt-4">
            {url ? (
              <video
                ref={videoRef}
                src={url}
                controls
                autoPlay
                playsInline
                onLoadedMetadata={handleLoadedMetadata}
                onTimeUpdate={() => void saveProgress()}
                onPause={() => void saveProgress()}
                onEnded={() => void saveProgress(true)}
                onError={() => setNote('This stream would not play. The format may be unsupported on this device.')}
                className="w-full rounded-xl bg-black"
              />
            ) : (
              <p className="text-[13px] text-white/60">No stream available.</p>
            )}
            <button
              type="button"
              onClick={() => setMode('choose')}
              className="mt-3 text-[13px] text-white/60 hover:text-white"
            >
              Back to destinations
            </button>
          </div>
        )}

        {note && <p className="mt-3 rounded-lg bg-white/5 px-3 py-2 text-[12px] leading-relaxed text-white/65">{note}</p>}

        {mode === 'choose' && launchUrl && (
          <div className="mt-3">
            <p className="mb-1 text-[11px] uppercase tracking-wide text-white/35">Roku launch URL</p>
            <code className="block break-all rounded-lg bg-black/40 px-3 py-2 text-[11px] leading-relaxed text-white/60">
              {launchUrl}
            </code>
            <button type="button" onClick={() => void copyLaunchUrl()} className="mt-2 text-[12px] text-white/50 hover:text-white">
              Copy
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
