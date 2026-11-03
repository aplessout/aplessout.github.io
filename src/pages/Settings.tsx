import { useEffect, useState } from 'react';
import { db, getSetting, setSetting, type ProviderConfig } from '../db';
import { authenticate, isBlockedByMixedContent, normalizeBase } from '../lib/xtream';
import { buildLaunchUrl, isIos } from '../lib/roku';
import { useCatalogue } from '../store';
import { SectionHeader } from '../components/ui';

const field = 'w-full rounded-xl border border-white/10 bg-panel px-3.5 py-2.5 text-[14px] outline-none placeholder:text-white/30 focus:border-white/30';

export default function Settings() {
  const { status, setStatus, syncProvider, seed, clearCatalogue } = useCatalogue();
  const [baseUrl, setBaseUrl] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [liveFormat, setLiveFormat] = useState<'m3u8' | 'ts'>('m3u8');
  const [rokuIp, setRokuIp] = useState('');
  const [rokuShortcut, setRokuShortcut] = useState('Roku Play');
  const [tmdbKey, setTmdbKey] = useState('');
  const [usage, setUsage] = useState('');

  useEffect(() => {
    void (async () => {
      const provider = await getSetting('provider');
      if (provider) {
        setBaseUrl(provider.baseUrl);
        setUsername(provider.username);
        setPassword(provider.password);
        setLiveFormat(provider.liveFormat);
      }
      setRokuIp((await getSetting('rokuIp')) ?? '');
      setRokuShortcut((await getSetting('rokuShortcut')) ?? 'Roku Play');
      setTmdbKey((await getSetting('tmdbKey')) ?? '');
      if (navigator.storage?.estimate) {
        const { usage: used } = await navigator.storage.estimate();
        if (used) setUsage(`${(used / 1024 / 1024).toFixed(1)} MB used`);
      }
    })();
  }, []);

  async function saveAndSync() {
    const creds: ProviderConfig = {
      baseUrl: normalizeBase(baseUrl),
      username: username.trim(),
      password,
      liveFormat,
      updatedAt: Date.now(),
    };
    if (!creds.baseUrl || !creds.username || !creds.password) {
      setStatus('Server URL, username and password are all required.');
      return;
    }
    await setSetting('provider', creds);
    setStatus('Checking credentials…');
    try {
      const auth = await authenticate(creds);
      if (!auth.ok) {
        setStatus(`Provider rejected these credentials (status: ${auth.status}).`);
        return;
      }
      setStatus(`Authenticated. ${auth.maxConnections ? `Connection limit: ${auth.maxConnections}. ` : ''}Syncing catalogue…`);
    } catch (error) {
      setStatus(`${error instanceof Error ? error.message : 'Login failed.'} Your saved settings were kept.`);
      return;
    }
    await syncProvider(creds);
  }

  async function saveRoku() {
    await setSetting('rokuIp', rokuIp.trim());
    await setSetting('rokuShortcut', rokuShortcut.trim() || 'Roku Play');
    setStatus('Roku settings saved.');
  }

  async function saveTmdb() {
    await setSetting('tmdbKey', tmdbKey.trim());
    setStatus('Poster key saved locally.');
  }

  const sampleLaunch = buildLaunchUrl(
    rokuIp || '192.168.1.50',
    'https://example.com/stream.m3u8',
    'hls'
  );

  return (
    <div className="px-4 pt-4 pb-12 md:px-8">
      <SectionHeader title="Settings" />

      {status && (
        <div className="mb-5 rounded-xl border border-white/10 bg-panel/70 px-3.5 py-2.5 text-[12.5px] leading-relaxed text-white/70">
          {status}
        </div>
      )}

      <section className="mb-8 rounded-2xl border border-white/10 bg-panel/40 p-4">
        <h2 className="text-[15px] font-semibold">IPTV provider</h2>
        <p className="mt-1 text-[12px] leading-relaxed text-white/45">
          Xtream Codes API. Credentials stay in this browser's IndexedDB and are never sent anywhere except your provider.
        </p>
        {isBlockedByMixedContent(baseUrl) && (
          <p className="mt-3 rounded-lg border border-brand/40 bg-brand/10 px-3 py-2 text-[12px] leading-relaxed text-brand">
            This server URL is plain http and this page is https, so the browser will block every request to it —
            including the catalogue and playback. Open the app over http (for example the local dev server), or ask
            your provider for an https server URL.
          </p>
        )}
        <div className="mt-4 space-y-2.5">
          <input className={field} placeholder="Server URL (e.g. http://provider.example:8080)" value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} autoCapitalize="none" autoCorrect="off" spellCheck={false} />
          <input className={field} placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} autoCapitalize="none" autoCorrect="off" spellCheck={false} />
          <input className={field} type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
          <label className="flex items-center justify-between rounded-xl bg-white/5 px-3.5 py-2.5 text-[13px]">
            <span className="text-white/70">Live stream format</span>
            <select
              value={liveFormat}
              onChange={(e) => setLiveFormat(e.target.value as 'm3u8' | 'ts')}
              className="rounded-lg bg-ink px-2 py-1 text-[13px] outline-none"
            >
              <option value="m3u8">HLS (.m3u8) — recommended</option>
              <option value="ts">MPEG-TS</option>
            </select>
          </label>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" onClick={() => void saveAndSync()} className="rounded-lg bg-white px-4 py-2 text-[13px] font-semibold text-black hover:bg-white/90">
            Save &amp; sync
          </button>
          <button type="button" onClick={() => void seed()} className="rounded-lg border border-white/15 px-4 py-2 text-[13px] text-white/80 hover:border-white/35">
            Load demo catalogue
          </button>
          <button type="button" onClick={() => void clearCatalogue()} className="rounded-lg border border-white/10 px-4 py-2 text-[13px] text-white/50 hover:text-white">
            Clear catalogue
          </button>
        </div>
        <p className="mt-3 text-[11.5px] leading-relaxed text-white/35">
          If sync reports a CORS or JSON error, the provider is blocking browser requests. A static app cannot proxy around that.
          {usage ? ` ${usage} stored.` : ''}
        </p>
      </section>

      <section className="mb-8 rounded-2xl border border-white/10 bg-panel/40 p-4">
        <h2 className="text-[15px] font-semibold">Roku (Media Assistant)</h2>
        <p className="mt-1 text-[12px] leading-relaxed text-white/45">
          An HTTPS page cannot POST to your Roku, and the Roku sends no CORS headers — verified: GET returns 404, POST returns 200.
          Dispatch therefore runs through an iOS Shortcut that performs the POST natively.
        </p>
        <div className="mt-4 space-y-2.5">
          <input className={field} placeholder="Roku IP (e.g. 192.168.1.50)" value={rokuIp} onChange={(e) => setRokuIp(e.target.value)} inputMode="decimal" />
          <input className={field} placeholder="Shortcut name" value={rokuShortcut} onChange={(e) => setRokuShortcut(e.target.value)} />
        </div>
        <button type="button" onClick={() => void saveRoku()} className="mt-3 rounded-lg bg-white px-4 py-2 text-[13px] font-semibold text-black hover:bg-white/90">
          Save Roku settings
        </button>
        <ol className="mt-4 list-decimal space-y-1.5 pl-5 text-[12px] leading-relaxed text-white/55">
          <li>In Shortcuts, create “{rokuShortcut || 'Roku Play'}” and set it to receive Text input.</li>
          <li>Add Get Contents of URL → URL = Shortcut Input, Method POST, Request Body JSON with {'{}'}.</li>
          <li>Optionally read the status code and open <code className="text-white/40">?roku=&lt;code&gt;</code> to return to this app.</li>
          <li>Enable Roku → Settings → System → Advanced system settings → Control by mobile apps.</li>
        </ol>
        <a
          href="/roku-test.html"
          target="_blank"
          rel="noreferrer"
          className="mt-4 inline-block rounded-lg border border-white/15 px-4 py-2 text-[13px] text-white/80 transition hover:border-white/35"
        >
          Open Roku validator
        </a>
        <p className="mt-3 text-[11px] uppercase tracking-wide text-white/30">Test URL for this configuration</p>
        <code className="mt-1 block break-all rounded-lg bg-black/40 px-3 py-2 text-[11px] leading-relaxed text-white/55">{sampleLaunch}</code>
        <p className="mt-2 text-[11.5px] leading-relaxed text-white/35">
          {isIos() ? 'Shortcut dispatch is available on this device.' : 'Automatic dispatch requires iOS; elsewhere run the URL above with curl.'}
        </p>
      </section>

      <section className="rounded-2xl border border-white/10 bg-panel/40 p-4">
        <h2 className="text-[15px] font-semibold">Posters</h2>
        <p className="mt-1 text-[12px] leading-relaxed text-white/45">
          Provider artwork is used first with an https upgrade. Missing or blocked posters fall back to a placeholder. Add a TMDB key to
          look up artwork by title — it is stored locally and used only from this browser.
        </p>
        <input className={`${field} mt-3`} placeholder="TMDB API key (optional)" value={tmdbKey} onChange={(e) => setTmdbKey(e.target.value)} />
        <button type="button" onClick={() => void saveTmdb()} className="mt-3 rounded-lg border border-white/15 px-4 py-2 text-[13px] text-white/80 hover:border-white/35">
          Save key
        </button>
      </section>
    </div>
  );
}
