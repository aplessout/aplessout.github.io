/**
 * Roku Media Assistant dispatch.
 *
 * A page served over HTTPS cannot POST to http://<roku>:8060 (mixed content), and
 * the Roku sends no CORS headers, so a browser fetch can neither succeed nor be read.
 * Verified on Roku OS 15.3.4: GET /launch returns 404, POST returns 200.
 *
 * The workaround is an on-device iOS Shortcut that performs the POST natively.
 */

export const ROKU_CHANNEL_ID = '782875'; // Media Assistant
export const DEFAULT_SHORTCUT_NAME = 'Roku Play';

function rokuHost(ip: string): string {
  return ip
    .trim()
    .replace(/^https?:\/\//i, '')
    .replace(/\/.*$/, '')
    .replace(/:\d+$/, '');
}

/** The exact URL the Roku expects. Everything nested inside `u` must be encoded. */
export function buildLaunchUrl(ip: string, streamUrl: string, format: 'hls' | 'mp4' | 'mkv' = 'hls'): string {
  const params = new URLSearchParams();
  params.set('u', streamUrl);
  params.set('t', 'v');
  if (format !== 'hls') params.set('videoFormat', format);
  return `http://${rokuHost(ip)}:8060/launch/${ROKU_CHANNEL_ID}?${params.toString()}`;
}

export function buildShortcutUrl(shortcut: string, launchUrl: string, returnTo?: string): string {
  const params = new URLSearchParams();
  params.set('name', shortcut);
  // Without input=text Safari silently drops the payload.
  params.set('input', 'text');
  params.set('text', launchUrl);
  if (returnTo) params.set('x-success', returnTo);
  return `shortcuts://run-shortcut?${params.toString()}`;
}

export function isIos(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  const iOS = /iPad|iPhone|iPod/.test(ua);
  const iPadOS = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
  return iOS || iPadOS;
}

export interface RokuDispatchResult {
  dispatched: boolean;
  reason?: string;
  shortcutUrl?: string;
}

/** Hands the request to the Shortcut. The browser cannot observe the Roku's reply. */
export function dispatchToRoku(ip: string, streamUrl: string, shortcut: string): RokuDispatchResult {
  if (!ip.trim()) return { dispatched: false, reason: 'No Roku IP configured yet.' };
  if (!isIos()) {
    return {
      dispatched: false,
      reason: 'Automatic Roku dispatch needs the iOS Shortcut. On desktop, run the generated URL with curl.',
    };
  }

  const launchUrl = buildLaunchUrl(ip, streamUrl, streamUrl.toLowerCase().includes('.m3u8') ? 'hls' : 'mp4');
  const shortcutUrl = buildShortcutUrl(shortcut.trim() || DEFAULT_SHORTCUT_NAME, launchUrl, window.location.href);
  window.location.href = shortcutUrl;
  return { dispatched: true, shortcutUrl };
}
