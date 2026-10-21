import maplibregl, { type ExpressionSpecification, type LayerSpecification, type StyleSpecification } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { Dataset } from './data';
import { loadTerritories, prefetchNeighbours, snapshotFor, visibleEvents, visiblePersons, mapSafe } from './data';
import { state } from './state';
import { getLangMode, lt } from './i18n';
import { rgba, EVENT_COLORS } from './palette';
import { portraitFor } from './portrait';
import type { HistEvent, Person, TerritoryProps } from './types';
import type { TerritoryFC } from './data';
import { applicableChanges, applyChanges, colorSlot } from './changes';

const BASE = import.meta.env.BASE_URL.replace(/\/?$/, '/');
const FONT = ['Noto Sans Regular'];
const SLOTS = ['a', 'b'] as const;
const IMP_GLOW: ExpressionSpecification = ['match', ['get', 'imp'], 3, 1.4, 2, 1.1, 0.8];
const IMP_DOT: ExpressionSpecification = ['match', ['get', 'imp'], 3, 1.3, 2, 1.05, 0.8];
type Slot = (typeof SLOTS)[number];

function fillColorExpr(): ExpressionSpecification {
  const m: unknown[] = ['match', ['get', 'c']];
  for (let i = 0; i < 20; i++) {
    m.push(i, ['match', ['get', 'p'], 1, rgba(i, 0.55), 2, rgba(i, 0.65), rgba(i, 0.72)]);
  }
  m.push('rgba(150,150,150,0.3)');
  return m as ExpressionSpecification;
}
function lineColorExpr(a: number): ExpressionSpecification {
  const m: unknown[] = ['match', ['get', 'c']];
  for (let i = 0; i < 20; i++) m.push(i, rgba(i, a));
  m.push(`rgba(120,120,120,${a})`);
  return m as ExpressionSpecification;
}

function labelTextExpr(): ExpressionSpecification {
  const mode = getLangMode();
  const ja: ExpressionSpecification = ['coalesce', ['get', 'nj'], ['get', 'n']];
  if (mode === 'ja') return ja;
  if (mode === 'en') return ['get', 'n'];
  return ['case', ['has', 'nj'], ['format', ja, {}, '\n', {}, ['get', 'n'], { 'font-scale': 0.75 }], ['get', 'n']] as ExpressionSpecification;
}

function territoryFillLayers(slot: Slot): LayerSpecification[] {
  const src = `terr-${slot}`;
  const poly: ExpressionSpecification = ['==', ['geometry-type'], 'Polygon'];
  const polyFilter: ExpressionSpecification = ['any', poly, ['==', ['geometry-type'], 'MultiPolygon']];
  return [
    { id: `terr-fill-${slot}`, type: 'fill', source: src, filter: polyFilter,
      paint: { 'fill-color': fillColorExpr(), 'fill-opacity': 0, 'fill-opacity-transition': { duration: 450 }, 'fill-antialias': false } },
    // fuzzy halo for approximate borders (precision 1)
    { id: `terr-fuzzy-${slot}`, type: 'line', source: src, filter: ['all', polyFilter, ['==', ['get', 'p'], 1]],
      paint: { 'line-color': lineColorExpr(0.9), 'line-width': ['interpolate', ['linear'], ['zoom'], 1, 3, 4, 9, 7, 16], 'line-blur': ['interpolate', ['linear'], ['zoom'], 1, 3, 4, 8, 7, 14], 'line-opacity': 0, 'line-opacity-transition': { duration: 450 } } },
    { id: `terr-line2-${slot}`, type: 'line', source: src, filter: ['all', polyFilter, ['==', ['get', 'p'], 2]],
      paint: { 'line-color': 'rgba(40,30,20,0.7)', 'line-width': 0.9, 'line-dasharray': [3, 2], 'line-opacity': 0, 'line-opacity-transition': { duration: 450 } } },
    { id: `terr-line3-${slot}`, type: 'line', source: src, filter: ['all', polyFilter, ['==', ['get', 'p'], 3]],
      paint: { 'line-color': 'rgba(40,30,20,0.85)', 'line-width': ['interpolate', ['linear'], ['zoom'], 1, 0.6, 5, 1.4], 'line-opacity': 0, 'line-opacity-transition': { duration: 450 } } },
  ];
}

function territoryLabelLayer(slot: Slot): LayerSpecification {
  const src = `terr-${slot}`;
  return { id: `terr-label-${slot}`, type: 'symbol', source: src, filter: ['==', ['geometry-type'], 'Point'],
      layout: {
        'text-field': labelTextExpr(), 'text-font': FONT,
        'text-size': ['interpolate', ['linear'], ['zoom'],
          1, ['interpolate', ['linear'], ['get', 'a'], 0.5, 0, 5, 8, 100, 12, 1000, 15],
          4, ['interpolate', ['linear'], ['get', 'a'], 0.2, 9, 5, 12, 100, 16, 1000, 20],
          8, ['interpolate', ['linear'], ['get', 'a'], 0.05, 12, 5, 16, 100, 22]],
        'text-max-width': 8, 'text-padding': 4, 'symbol-sort-key': ['-', 0, ['get', 'a']], 'text-allow-overlap': false, visibility: 'none',
      },
      paint: { 'text-color': '#1d1a14', 'text-halo-color': 'rgba(255,250,235,0.85)', 'text-halo-width': 1.2 } };
}

function buildStyle(): StyleSpecification {
  const empty: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: [] };
  return {
    version: 8,
    projection: { type: 'globe' },
    glyphs: new URL(BASE, location.href).href + 'fonts/{fontstack}/{range}.pbf',
    sky: { 'atmosphere-blend': ['interpolate', ['linear'], ['zoom'], 0, 1, 5, 1, 7, 0] },
    light: { anchor: 'map', position: [1.5, 90, 80] },
    sources: {
      land: { type: 'geojson', data: `${BASE}data/base/land.json` },
      lakes: { type: 'geojson', data: `${BASE}data/base/lakes.json` },
      rivers: { type: 'geojson', data: `${BASE}data/base/rivers.json` },
      'terr-a': { type: 'geojson', data: empty },
      'terr-b': { type: 'geojson', data: empty },
      events: { type: 'geojson', data: empty },
    },
    layers: [
      { id: 'bg', type: 'background', paint: { 'background-color': '#1b3a5c' } },
      { id: 'land', type: 'fill', source: 'land', paint: { 'fill-color': '#e3dac1' } },
      ...territoryFillLayers('a'),
      ...territoryFillLayers('b'),
      { id: 'lakes', type: 'fill', source: 'lakes', paint: { 'fill-color': '#2d5a86', 'fill-opacity': 0.9 } },
      { id: 'rivers', type: 'line', source: 'rivers', minzoom: 2.5, paint: { 'line-color': '#3f6f9e', 'line-width': ['interpolate', ['linear'], ['zoom'], 2.5, 0.4, 7, 1.4], 'line-opacity': 0.8 } },
      { id: 'coast', type: 'line', source: 'land', paint: { 'line-color': 'rgba(30,50,80,0.6)', 'line-width': 0.5 } },
      { id: 'events-glow', type: 'circle', source: 'events', paint: {
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 1, ['*', 6, IMP_GLOW], 6, ['*', 14, IMP_GLOW]],
        'circle-color': ['get', 'col'], 'circle-blur': 1, 'circle-opacity': ['*', 0.5, ['-', 1, ['get', 'age']]] } },
      { id: 'events-circle', type: 'circle', source: 'events', paint: {
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 1, ['*', 3.2, IMP_DOT], 6, ['*', 7, IMP_DOT]],
        'circle-color': ['get', 'col'], 'circle-stroke-color': '#fff', 'circle-stroke-width': 1,
        'circle-opacity': ['-', 1, ['*', 0.6, ['get', 'age']]], 'circle-stroke-opacity': ['-', 1, ['*', 0.6, ['get', 'age']]] } },
      { id: 'events-label', type: 'symbol', source: 'events', minzoom: 2,
        layout: { 'text-field': ['get', 'label'], 'text-font': FONT, 'text-size': ['match', ['get', 'imp'], 3, 12, 2, 11, 10], 'text-offset': [0, 1.1], 'text-anchor': 'top', 'text-max-width': 10, 'symbol-sort-key': ['-', 3, ['get', 'imp']], 'text-optional': true },
        paint: { 'text-color': '#fff7e6', 'text-halo-color': 'rgba(10,15,30,0.9)', 'text-halo-width': 1.3, 'text-opacity': ['-', 1, ['*', 0.5, ['get', 'age']]] } },
      // Territory names last so they win symbol placement over event labels.
      territoryLabelLayer('a'),
      territoryLabelLayer('b'),
    ],
  };
}

export class HistoryMap {
  readonly map: maplibregl.Map;
  private active: Slot = 'a';
  private shownKey = '';
  private shownFC: TerritoryFC | null = null;
  private loadSeq = 0;
  private markers = new Map<string, maplibregl.Marker>();
  private ready = false;
  private hover: maplibregl.Popup;

  constructor(container: HTMLElement, private ds: Dataset, cam?: [number, number, number]) {
    this.map = new maplibregl.Map({
      container, style: buildStyle(),
      center: cam ? [cam[0], cam[1]] : [45, 28], zoom: cam ? cam[2] : 1.7,
      minZoom: 0.8, maxZoom: 9, attributionControl: false,
      localIdeographFontFamily: '"Hiragino Sans", "Noto Sans JP", "Yu Gothic", "Meiryo", sans-serif',
      maxPitch: 0, dragRotate: false, pitchWithRotate: false, touchPitch: false,
      fadeDuration: 150, canvasContextAttributes: { antialias: false },
    });
    this.hover = new maplibregl.Popup({ closeButton: false, closeOnClick: false, offset: 10 });
    this.map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'bottom-right');
    this.map.on('load', () => { this.ready = true; this.wireInteractions(); this.applyLayers(); this.refresh(true); });
  }

  // ------------------------------------------------------------ year / snapshot
  async refresh(force = false) {
    if (!this.ready) return;
    const year = state.year;
    const snap = snapshotFor(this.ds.index, year);
    const applied = applicableChanges(this.ds.changes, snap, year);
    const key = `${snap}|${applied.map((c) => c.id).join(',')}`;
    if (force || key !== this.shownKey) await this.showSnapshot(snap, applied, key);
    this.updateEvents(year);
    this.updatePersons(year);
  }

  private async showSnapshot(snap: number, applied: ReturnType<typeof applicableChanges>, key: string) {
    const seq = ++this.loadSeq;
    const base = await loadTerritories(snap, this.ds.names);
    if (seq !== this.loadSeq) return; // superseded
    const fc = applyChanges(base, applied, this.ds.names, mapSafe, colorSlot);
    const next: Slot = this.active === 'a' ? 'b' : 'a';
    (this.map.getSource(`terr-${next}`) as maplibregl.GeoJSONSource).setData(fc);
    this.setSlotOpacity(next, 1);
    this.setSlotOpacity(this.active, 0);
    this.active = next;
    this.shownKey = key;
    this.shownFC = fc;
    prefetchNeighbours(this.ds.index, snap, this.ds.names);
    document.dispatchEvent(new CustomEvent('snapshot', { detail: snap }));
  }

  private setSlotOpacity(slot: Slot, on: number) {
    const L = state.layers;
    const t = L.territories ? on : 0;
    this.map.setPaintProperty(`terr-fill-${slot}`, 'fill-opacity', t);
    this.map.setPaintProperty(`terr-fuzzy-${slot}`, 'line-opacity', t * 0.5);
    this.map.setPaintProperty(`terr-line2-${slot}`, 'line-opacity', t);
    this.map.setPaintProperty(`terr-line3-${slot}`, 'line-opacity', t);
    this.map.setLayoutProperty(`terr-label-${slot}`, 'visibility', L.labels && on ? 'visible' : 'none');
  }

  private updateEvents(year: number) {
    const vis = visibleEvents(this.ds.events, year);
    const features = vis.map(({ e, age }) => ({
      type: 'Feature' as const,
      properties: { id: e.id, t: e.type, imp: e.importance, age: +age.toFixed(2), col: EVENT_COLORS[e.type] ?? EVENT_COLORS.other, label: mapSafe(lt(e.name, '\n')) },
      geometry: { type: 'Point' as const, coordinates: [e.lon, e.lat] },
    }));
    (this.map.getSource('events') as maplibregl.GeoJSONSource).setData({ type: 'FeatureCollection', features });
  }

  private updatePersons(year: number) {
    const show = state.layers.persons;
    let list = show ? visiblePersons(this.ds.persons, year) : [];
    if (list.length > 60) list = list.filter((p) => p.importance >= 2);
    if (list.length > 60) list = list.filter((p) => p.importance >= 3);
    const keep = new Set(list.map((p) => p.id));
    for (const [id, m] of this.markers) if (!keep.has(id)) { m.remove(); this.markers.delete(id); }
    for (const p of list) {
      if (this.markers.has(p.id)) continue;
      const el = document.createElement('div');
      el.className = 'person-marker' + (p.importance < 3 ? ' sm' : '');
      el.textContent = (p.name.ja || p.name.en).slice(0, 1);
      el.title = lt(p.name);
      el.addEventListener('click', (ev) => { ev.stopPropagation(); state.select({ kind: 'person', person: p }); });
      portraitFor(p).then((url) => { if (url) { el.style.backgroundImage = `url("${url}")`; el.textContent = ''; } });
      const m = new maplibregl.Marker({ element: el, anchor: 'center' }).setLngLat([p.lon, p.lat]).addTo(this.map);
      this.markers.set(p.id, m);
    }
  }

  // ------------------------------------------------------------ settings
  applyLang() {
    if (!this.ready) return;
    for (const s of SLOTS) this.map.setLayoutProperty(`terr-label-${s}`, 'text-field', labelTextExpr());
    this.updateEvents(state.year);
    for (const [id, m] of this.markers) { const p = this.ds.personById.get(id); if (p) m.getElement().title = lt(p.name); }
  }

  applyLayers() {
    if (!this.ready) return;
    const L = state.layers;
    this.setSlotOpacity(this.active, 1);
    const other: Slot = this.active === 'a' ? 'b' : 'a';
    this.setSlotOpacity(other, 0);
    for (const id of ['events-glow', 'events-circle', 'events-label']) this.map.setLayoutProperty(id, 'visibility', L.events ? 'visible' : 'none');
    this.map.setLayoutProperty('rivers', 'visibility', L.rivers ? 'visible' : 'none');
    this.updatePersons(state.year);
  }

  /** Globe or flat (lighter) rendering. Flat mode also drops the blurred border halos. */
  setGlobe(on: boolean) {
    if (!this.ready) return;
    this.map.setProjection({ type: on ? 'globe' : 'mercator' });
    for (const s of SLOTS) this.map.setLayoutProperty(`terr-fuzzy-${s}`, 'visibility', on ? 'visible' : 'none');
  }

  setInteractive(on: boolean) {
    const h = [this.map.dragPan, this.map.scrollZoom, this.map.boxZoom, this.map.keyboard, this.map.doubleClickZoom, this.map.touchZoomRotate];
    for (const x of h) (on ? x.enable() : x.disable());
  }

  camera(): [number, number, number] {
    const c = this.map.getCenter();
    return [c.lng, c.lat, this.map.getZoom()];
  }

  flyTo(lon: number, lat: number, zoom?: number) {
    this.map.flyTo({ center: [lon, lat], zoom: zoom ?? Math.max(this.map.getZoom(), 3.5), duration: 900 });
  }

  eventsInView(): HistEvent[] {
    if (!this.ready) return [];
    const fs = this.map.queryRenderedFeatures({ layers: ['events-circle'] });
    const seen = new Set<string>();
    const out: HistEvent[] = [];
    for (const f of fs) {
      const id = f.properties?.id as string;
      if (seen.has(id)) continue;
      seen.add(id);
      const e = this.ds.eventById.get(id);
      if (e) out.push(e);
    }
    return out;
  }

  /** Full (untiled) features of the currently shown snapshot matching a basemap name. */
  territoryGeometries(name: string | null, subject: string | null): GeoJSON.Geometry[] {
    const fc = this.shownFC;
    if (!fc) return [];
    return fc.features
      .filter((f) => f.geometry.type !== 'Point' && ((name && (f.properties as TerritoryProps).n === name) || (!name && (f.properties as TerritoryProps).s === subject)))
      .map((f) => f.geometry);
  }

  personsInView(): Person[] {
    const b = this.map.getBounds();
    const out: Person[] = [];
    for (const [id] of this.markers) {
      const p = this.ds.personById.get(id);
      if (p && b.contains([p.lon, p.lat])) out.push(p);
    }
    return out;
  }

  // ------------------------------------------------------------ interactions
  private wireInteractions() {
    const map = this.map;
    const fills = SLOTS.map((s) => `terr-fill-${s}`);
    map.on('click', (e) => {
      const ev = map.queryRenderedFeatures(e.point, { layers: ['events-circle'] })[0];
      if (ev) {
        const he = this.ds.eventById.get(ev.properties.id as string);
        if (he) { state.select({ kind: 'event', event: he }); return; }
      }
      const f = map.queryRenderedFeatures(e.point, { layers: [`terr-fill-${this.active}`] })[0];
      if (f) {
        const p = f.properties as { n: string | null; s: string | null; p: number; pf?: string; ch?: string };
        state.select({ kind: 'territory', name: p.n ?? null, subject: p.s ?? null, precision: Number(p.p) || 1, partof: p.pf, change: p.ch });
        return;
      }
      state.select(null);
    });
    const setCursor = (c: string) => { map.getCanvas().style.cursor = c; };
    map.on('mousemove', (e) => {
      const ev = map.queryRenderedFeatures(e.point, { layers: ['events-circle'] })[0];
      if (ev) {
        setCursor('pointer');
        const he = this.ds.eventById.get(ev.properties.id as string);
        if (he) this.hover.setLngLat([he.lon, he.lat]).setText(`${yearText(he.year)} ${lt(he.name)}`).addTo(map);
        return;
      }
      this.hover.remove();
      const f = map.queryRenderedFeatures(e.point, { layers: fills })[0];
      setCursor(f ? 'pointer' : '');
    });
    map.on('mouseout', () => this.hover.remove());
  }
}

function yearText(y: number): string {
  return getLangMode() === 'en' ? (y < 0 ? `${-y} BC` : `${y}`) : y < 0 ? `前${-y}` : `${y}`;
}
