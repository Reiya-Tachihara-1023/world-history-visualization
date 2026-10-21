import type { HistEvent, NameMap, Person, Polity, TerritoryIndex, TerritoryProps, LabelProps } from './types';
import type { TerritoryChange } from './changes';

const BASE = import.meta.env.BASE_URL.replace(/\/?$/, '/') + 'data/';

async function getJSON<T>(p: string): Promise<T> {
  const r = await fetch(BASE + p);
  if (!r.ok) throw new Error(`fetch ${p}: ${r.status}`);
  return r.json();
}

export interface Dataset {
  index: TerritoryIndex;
  names: NameMap;
  events: HistEvent[];
  persons: Person[];
  polities: Polity[];
  changes: TerritoryChange[];
  changeById: Map<string, TerritoryChange>;
  personById: Map<string, Person>;
  eventById: Map<string, HistEvent>;
  polityByBasemapName: Map<string, Polity>;
  eventsByPerson: Map<string, HistEvent[]>;
}

export async function loadDataset(): Promise<Dataset> {
  const [index, names, events, persons, polities, changes] = await Promise.all([
    getJSON<TerritoryIndex>('territories/index.json'),
    getJSON<NameMap>('names.json').catch(() => ({})),
    getJSON<HistEvent[]>('events.json').catch(() => []),
    getJSON<Person[]>('persons.json').catch(() => []),
    getJSON<Polity[]>('polities.json').catch(() => []),
    getJSON<TerritoryChange[]>('changes.json').catch(() => []),
  ]);
  const changeById = new Map(changes.map((c) => [c.id, c]));
  const personById = new Map(persons.map((p) => [p.id, p]));
  const eventById = new Map(events.map((e) => [e.id, e]));
  const polityByBasemapName = new Map<string, Polity>();
  for (const p of polities) for (const n of p.basemap_names) polityByBasemapName.set(n, p);
  const eventsByPerson = new Map<string, HistEvent[]>();
  for (const e of events) for (const pid of e.persons ?? []) (eventsByPerson.get(pid) ?? eventsByPerson.set(pid, []).get(pid)!).push(e);
  return { index, names, events, persons, polities, changes, changeById, personById, eventById, polityByBasemapName, eventsByPerson };
}

/** The snapshot year to display for a given year: the latest snapshot <= year. */
export function snapshotFor(index: TerritoryIndex, year: number): number {
  const ys = index.years;
  let best = ys[0];
  for (const y of ys) { if (y <= year) best = y; else break; }
  return best;
}

export type TerritoryFC = GeoJSON.FeatureCollection<GeoJSON.Geometry, TerritoryProps | LabelProps>;

const cache = new Map<number, Promise<TerritoryFC>>();

/** Map label text must avoid characters the glyph server lacks. */
export function mapSafe(s: string): string {
  return s.replace(/＝/g, '=').replace(/（/g, '(').replace(/）/g, ')');
}

export function loadTerritories(year: number, names: NameMap): Promise<TerritoryFC> {
  let p = cache.get(year);
  if (!p) {
    p = getJSON<TerritoryFC>(`territories/${year}.json`).then((fc) => {
      for (const f of fc.features) {
        const pr = f.properties as TerritoryProps;
        if (pr.n && names[pr.n]) pr.nj = mapSafe(names[pr.n].ja);
        if (pr.s && names[pr.s]) pr.sj = mapSafe(names[pr.s].ja);
      }
      return fc;
    });
    cache.set(year, p);
    if (cache.size > 12) cache.delete(cache.keys().next().value!);
  }
  return p;
}

export function prefetchNeighbours(index: TerritoryIndex, year: number, names: NameMap) {
  const i = index.years.indexOf(snapshotFor(index, year));
  for (const j of [i + 1, i - 1]) {
    const y = index.years[j];
    if (y !== undefined && !cache.has(y)) loadTerritories(y, names).catch(() => {});
  }
}

/** How many years back events stay visible, by era (denser eras get shorter windows). */
export function eventWindow(year: number): number {
  if (year < -1000) return 300;
  if (year < 500) return 60;
  if (year < 1500) return 40;
  if (year < 1800) return 20;
  if (year < 1900) return 10;
  return 5;
}

export function visibleEvents(events: HistEvent[], year: number): { e: HistEvent; age: number }[] {
  const w = eventWindow(year);
  const out: { e: HistEvent; age: number }[] = [];
  for (const e of events) {
    if (e.year > year) break; // sorted by year
    const end = e.year_end ?? e.year;
    if (year <= end) out.push({ e, age: 0 });
    else if (year - end <= w) out.push({ e, age: (year - end) / w });
  }
  return out;
}

export function visiblePersons(persons: Person[], year: number): Person[] {
  return persons.filter((p) => p.active[0] <= year && year <= p.active[1]);
}

export function nameOf(names: NameMap, en: string | null | undefined): { ja: string; en: string } | null {
  if (!en) return null;
  return { ja: names[en]?.ja ?? en, en };
}

// ---------------------------------------------------------------- geometry helpers
function ringContains(ring: number[][], x: number, y: number): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i], [xj, yj] = ring[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
function polygonContains(poly: number[][][], x: number, y: number): boolean {
  if (!ringContains(poly[0], x, y)) return false;
  for (let i = 1; i < poly.length; i++) if (ringContains(poly[i], x, y)) return false;
  return true;
}
export function geometryContains(g: GeoJSON.Geometry, lon: number, lat: number): boolean {
  if (g.type === 'Polygon') return polygonContains(g.coordinates, lon, lat);
  if (g.type === 'MultiPolygon') return g.coordinates.some((p) => polygonContains(p, lon, lat));
  return false;
}

/** Events located inside any of the geometries, within +-span years of `year`. */
export function eventsInside(events: HistEvent[], geoms: GeoJSON.Geometry[], year: number, span: number): HistEvent[] {
  const out: HistEvent[] = [];
  for (const e of events) {
    if (e.year < year - span) continue;
    if (e.year > year + span) break;
    if (geoms.some((g) => geometryContains(g, e.lon, e.lat))) out.push(e);
  }
  return out;
}
export function personsInside(persons: Person[], geoms: GeoJSON.Geometry[], year: number, span: number): Person[] {
  return persons.filter((p) => p.active[1] >= year - span && p.active[0] <= year + span && geoms.some((g) => geometryContains(g, p.lon, p.lat)));
}
