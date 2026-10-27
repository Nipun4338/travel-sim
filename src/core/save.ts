// The save (SPEC §15): one record in IndexedDB, loaded once at start-up into memory so the rest of
// the game reads it synchronously; every change is written back. Device-only, no accounts. The
// export code is the record deflated and base64url-encoded, for moving devices or after eviction.
import type { Career, Progress } from './progress';
import type { Settings } from './settings';

export interface SaveData {
  version: 1;
  settings?: Partial<Settings>;
  progress?: Progress;
  landmarks?: string[];
  liveries?: { bus: string; plane: string };
  lang?: 'bn' | 'en';
}

const DB = 'travel-sim', STORE = 'save', KEY = 'main';
const CODE_PREFIX = 'TS1-';
let data: SaveData = { version: 1 };
let db: IDBDatabase | null = null;

function openDb(): Promise<IDBDatabase | null> {
  return new Promise(resolve => {
    try {
      const req = indexedDB.open(DB, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch { resolve(null); }
  });
}

/** Saves made before M9 lived in localStorage; carry them over once. */
function fromLocalStorage(): SaveData {
  const read = <T>(k: string): T | undefined => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) as T : undefined; } catch { return undefined; } };
  const progress = read<Progress>('travel-sim.progress');
  const done = read<string[]>('travel-sim.flight.done') ?? [];
  if (progress) for (const id of done) progress.challenges[id] ??= { done: true };
  return { version: 1, settings: read<Settings>('travel-sim.settings'), progress, landmarks: read<string[]>('travel-sim.landmarks') };
}

/** Loads the save; call once before anything reads settings or progress. */
export async function initSave(): Promise<void> {
  db = await openDb();
  const stored = db ? await new Promise<SaveData | undefined>(resolve => {
    const req = db!.transaction(STORE).objectStore(STORE).get(KEY);
    req.onsuccess = () => resolve(req.result as SaveData | undefined);
    req.onerror = () => resolve(undefined);
  }) : undefined;
  data = stored ?? fromLocalStorage();
  if (!stored) write();
  // Ask the browser not to evict the save (and, from M11, downloaded Regions) under storage pressure.
  void navigator.storage?.persist?.().catch(() => false);
}

function write(): void {
  if (!db) return;
  try { db.transaction(STORE, 'readwrite').objectStore(STORE).put(data, KEY); } catch { /* storage blocked */ }
}

export function readSave(): SaveData { return data; }

export function updateSave(fn: (d: SaveData) => void): void {
  fn(data);
  write();
}

const emptyCareer = (): Career => ({ km: 0, passengers: 0, stops: 0, flightsLanded: 0, taka: 0 });
export const emptyProgress = (): Progress => ({ legs: {}, challenges: {}, career: emptyCareer() });

// ---------- export / import code ----------

async function deflate(text: string): Promise<Uint8Array> {
  const stream = new Blob([text]).stream().pipeThrough(new CompressionStream('deflate-raw'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function inflate(bytes: Uint8Array): Promise<string> {
  const stream = new Blob([bytes as Uint8Array<ArrayBuffer>]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
  return new Response(stream).text();
}

const toB64 = (b: Uint8Array) => btoa(String.fromCharCode(...b)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const fromB64 = (s: string) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));

export async function exportCode(): Promise<string> {
  let lang: SaveData['lang'];
  try { lang = (localStorage.getItem('travel-sim.lang') as SaveData['lang']) ?? undefined; } catch { /* ignore */ }
  return CODE_PREFIX + toB64(await deflate(JSON.stringify({ ...data, lang })));
}

/** Replaces the save with the one in `code`. Throws if the code isn't a Travel Sim save. */
export async function importCode(code: string): Promise<void> {
  const s = code.trim();
  if (!s.startsWith(CODE_PREFIX)) throw new Error('not a save code');
  const parsed = JSON.parse(await inflate(fromB64(s.slice(CODE_PREFIX.length)))) as SaveData;
  if (parsed.version !== 1) throw new Error('unknown save version');
  data = { ...parsed, progress: parsed.progress ?? emptyProgress() };
  if (parsed.lang) try { localStorage.setItem('travel-sim.lang', parsed.lang); } catch { /* ignore */ }
  write();
}
