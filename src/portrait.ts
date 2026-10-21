import type { Person } from './types';

/**
 * Portrait resolution is abstracted so illustrations can replace Wikipedia
 * thumbnails later without touching the UI: add a provider here and set
 * `portrait.provider` in the data.
 */
export type PortraitProvider = (p: Person) => Promise<string | null>;

const memo = new Map<string, Promise<string | null>>();
const LS_KEY = 'whg.portrait.v1';
let lsCache: Record<string, string | null> = {};
try { lsCache = JSON.parse(localStorage.getItem(LS_KEY) || '{}'); } catch { lsCache = {}; }
function persist() { try { localStorage.setItem(LS_KEY, JSON.stringify(lsCache)); } catch { /* ignore */ } }

const wikipedia: PortraitProvider = async (p) => {
  const tries: [string, string][] = [];
  if (p.wiki?.ja) tries.push(['ja', p.wiki.ja]);
  if (p.wiki?.en) tries.push(['en', p.wiki.en]);
  for (const [lang, title] of tries) {
    try {
      const r = await fetch(`https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title.replace(/ /g, '_'))}`, { headers: { accept: 'application/json' } });
      if (!r.ok) continue;
      const j = await r.json();
      const src: string | undefined = j?.thumbnail?.source;
      if (src) return src.replace(/\/\d+px-/, '/240px-');
    } catch { /* try next */ }
  }
  return null;
};

const providers: Record<string, PortraitProvider> = {
  wikipedia,
  url: async (p) => p.portrait?.url ?? null,
  none: async () => null,
};

export function portraitFor(p: Person): Promise<string | null> {
  const key = p.id;
  if (key in lsCache) return Promise.resolve(lsCache[key]);
  let pr = memo.get(key);
  if (!pr) {
    const prov = providers[p.portrait?.provider ?? 'wikipedia'] ?? providers.none;
    pr = prov(p).then((url) => { lsCache[key] = url; persist(); return url; }).catch(() => null);
    memo.set(key, pr);
  }
  return pr;
}
