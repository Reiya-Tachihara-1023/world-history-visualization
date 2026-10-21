import type { TerritoryFC } from './data';
import type { LText, TerritoryProps, LabelProps } from './types';

export interface TerritoryChange {
  id: string;
  year: number;
  match: { n?: string | string[]; s?: string | string[] };
  set: { n?: string; s?: string; p?: number };
  note?: LText;
}

function matches(props: { n: string | null; s: string | null }, m: TerritoryChange['match']): boolean {
  const ok = (v: string | null, want?: string | string[]) => want === undefined || (v !== null && (Array.isArray(want) ? want.includes(v) : want === v));
  return (m.n !== undefined || m.s !== undefined) && ok(props.n, m.n) && ok(props.s, m.s);
}

/** Changes that apply to a snapshot at a given year (snapshot < change.year <= year). */
export function applicableChanges(changes: TerritoryChange[], snapshot: number, year: number): TerritoryChange[] {
  return changes.filter((c) => c.year > snapshot && c.year <= year);
}

/** Returns a new FeatureCollection with the changes applied (features are shallow-copied). */
export function applyChanges(fc: TerritoryFC, changes: TerritoryChange[], names: Record<string, { ja: string }>, mapSafe: (s: string) => string, hash: (s: string) => number): TerritoryFC {
  if (!changes.length) return fc;
  const features = fc.features.map((f) => {
    const p = f.properties as TerritoryProps | LabelProps;
    let out: (TerritoryProps | LabelProps) | null = null;
    for (const c of changes) {
      const cur = out ?? p;
      if (!matches({ n: cur.n ?? null, s: cur.s ?? null }, c.match)) continue;
      const next = { ...cur } as TerritoryProps & LabelProps & { ch?: string };
      if (c.set.n !== undefined) { next.n = c.set.n; next.nj = names[c.set.n] ? mapSafe(names[c.set.n].ja) : undefined; }
      if (c.set.s !== undefined) { next.s = c.set.s; next.sj = names[c.set.s] ? mapSafe(names[c.set.s].ja) : undefined; if ('c' in next) next.c = hash(c.set.s); }
      if (c.set.p !== undefined && 'p' in next) next.p = c.set.p;
      next.ch = c.id;
      out = next;
    }
    return out ? { ...f, properties: out } : f;
  });
  return { type: 'FeatureCollection', features };
}

/** Same hash as scripts/build-data.mjs so recoloured polities stay consistent across years. */
export function colorSlot(name: string, slots = 20): number {
  let h = 2166136261;
  for (const ch of name) { h ^= ch.codePointAt(0)!; h = Math.imul(h, 16777619) >>> 0; }
  return h % slots;
}
