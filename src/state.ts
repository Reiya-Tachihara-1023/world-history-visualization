import type { HistEvent, Person, Polity, LangMode } from './types';

export const YEAR_MIN = -10000;
export const YEAR_MAX = 2020;

export type Selection =
  | { kind: 'territory'; name: string | null; subject: string | null; precision: number; partof?: string }
  | { kind: 'event'; event: HistEvent }
  | { kind: 'person'; person: Person }
  | { kind: 'polity'; polity: Polity }
  | { kind: 'overview' }
  | null;

export interface Layers { territories: boolean; labels: boolean; events: boolean; persons: boolean; rivers: boolean }

type Listener = () => void;

class State {
  year = 1500;
  langMode: LangMode = 'ja';
  playing = false;
  speed = 20; // years per second
  focus = false;
  layers: Layers = { territories: true, labels: true, events: true, persons: true, rivers: true };
  selection: Selection = null;

  private listeners: Record<string, Set<Listener>> = {};

  on(ev: 'year' | 'lang' | 'play' | 'focus' | 'layers' | 'selection', fn: Listener) {
    (this.listeners[ev] ??= new Set()).add(fn);
    return () => this.listeners[ev].delete(fn);
  }
  private emit(ev: string) { this.listeners[ev]?.forEach((f) => f()); }

  setYear(y: number) {
    y = Math.round(Math.max(YEAR_MIN, Math.min(YEAR_MAX, y)));
    if (y === 0) y = this.year < 0 ? 1 : -1;
    if (y === this.year) return;
    this.year = y;
    this.emit('year');
  }
  setLangMode(m: LangMode) { if (m !== this.langMode) { this.langMode = m; this.emit('lang'); } }
  setPlaying(p: boolean) { if (p !== this.playing) { this.playing = p; this.emit('play'); } }
  setFocus(f: boolean) { if (f !== this.focus) { this.focus = f; this.emit('focus'); } }
  setLayer(k: keyof Layers, v: boolean) { this.layers[k] = v; this.emit('layers'); }
  select(s: Selection) { this.selection = s; this.emit('selection'); }
}

export const state = new State();

// Restore from URL hash (#y=1500&l=both&c=lon,lat,zoom)
export function readHash(): { year?: number; lang?: LangMode; cam?: [number, number, number] } {
  const h = new URLSearchParams(location.hash.replace(/^#/, ''));
  const out: ReturnType<typeof readHash> = {};
  const y = Number(h.get('y'));
  if (h.has('y') && Number.isFinite(y)) out.year = y;
  const l = h.get('l');
  if (l === 'ja' || l === 'en' || l === 'both') out.lang = l;
  const c = h.get('c')?.split(',').map(Number);
  if (c && c.length === 3 && c.every(Number.isFinite)) out.cam = [c[0], c[1], c[2]];
  return out;
}

let hashTimer: number | undefined;
export function writeHash(cam: [number, number, number]) {
  clearTimeout(hashTimer);
  hashTimer = window.setTimeout(() => {
    const h = `y=${state.year}&l=${state.langMode}&c=${cam.map((v) => +v.toFixed(2)).join(',')}`;
    history.replaceState(null, '', '#' + h);
  }, 300);
}
