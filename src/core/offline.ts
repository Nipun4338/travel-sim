// "Download for offline" (SPEC §16): fetch every file a Region (bus) or Flight Zone (plane) lists
// into the same cache the service worker serves Regions from, report storage per Region-mode, and
// delete them again. Without a download, Regions still stream and cache as you play.
import { REGION_CACHE } from '../shared/cache';
import type { RegionManifest } from '../shared/region';
import type { ZoneManifest } from '../shared/zone';

export type RegionMode = 'bus' | 'flight';

const base = (mode: RegionMode, region: string) => `${import.meta.env.BASE_URL}${mode === 'bus' ? 'regions' : 'zones'}/${region}/`;

/** iPhone Safari keeps a separate store per tab and the home-screen app, so offline needs the app. */
export const iosNeedsHomeScreen = () =>
  /iPhone|iPad|iPod/.test(navigator.userAgent) && !(navigator as Navigator & { standalone?: boolean }).standalone && !matchMedia('(display-mode: standalone)').matches;

export const offlineSupported = () => 'caches' in window;

/** Every file a Region-mode needs, from its manifest. */
async function files(mode: RegionMode, region: string): Promise<string[]> {
  const b = base(mode, region);
  const m = await (await fetch(`${b}manifest.json`, { cache: 'no-cache' })).json();
  const list = ['manifest.json'];
  if (mode === 'bus') {
    const r = m as RegionManifest;
    list.push(r.route, r.lanes, ...(r.rails ? [r.rails] : []), ...r.chunks.flatMap(c => c.lods));
  } else {
    const z = m as ZoneManifest;
    list.push(z.backdrop, z.height.file, z.map, ...(z.rails ? [z.rails] : []), ...z.chunks.flatMap(c => [...c.lods, ...(c.buildings ? [c.buildings] : [])]));
  }
  return list.map(f => b + f);
}

export interface DownloadProgress { done: number; total: number; bytes: number; }

/** Downloads a whole Region-mode; files already cached are skipped. */
export async function download(mode: RegionMode, region: string, onProgress: (p: DownloadProgress) => void): Promise<void> {
  const cache = await caches.open(REGION_CACHE);
  const urls = await files(mode, region);
  const p: DownloadProgress = { done: 0, total: urls.length, bytes: 0 };
  let next = 0;
  const worker = async () => {
    while (next < urls.length) {
      const url = urls[next++];
      if (!(await cache.match(url))) {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`${url}: ${res.status}`);
        p.bytes += Number(res.headers.get('content-length')) || 0;
        await cache.put(url, res);
      }
      p.done++;
      onProgress({ ...p });
    }
  };
  await Promise.all(Array.from({ length: 6 }, worker));
}

/** Asks the browser not to evict downloads; false means they may be cleared under storage pressure. */
export async function persist(): Promise<boolean> {
  try { return (await navigator.storage?.persisted?.()) || (await navigator.storage?.persist?.()) || false; } catch { return false; }
}

/** Bytes cached for a Region-mode, and whether every file it needs is there. */
export async function usage(mode: RegionMode, region: string): Promise<{ bytes: number; complete: boolean }> {
  if (!offlineSupported()) return { bytes: 0, complete: false };
  const cache = await caches.open(REGION_CACHE), prefix = new URL(base(mode, region), location.href).href;
  let bytes = 0;
  const cached = new Set<string>();
  for (const req of await cache.keys()) {
    if (!req.url.startsWith(prefix)) continue;
    cached.add(req.url);
    const res = await cache.match(req);
    bytes += Number(res?.headers.get('content-length')) || (await res?.clone().blob())?.size || 0;
  }
  let complete = false;
  try { complete = (await files(mode, region)).every(u => cached.has(new URL(u, location.href).href)); } catch { /* offline: can't check */ }
  return { bytes, complete };
}

export async function remove(mode: RegionMode, region: string): Promise<void> {
  const cache = await caches.open(REGION_CACHE), prefix = new URL(base(mode, region), location.href).href;
  await Promise.all((await cache.keys()).filter(r => r.url.startsWith(prefix)).map(r => cache.delete(r)));
}
