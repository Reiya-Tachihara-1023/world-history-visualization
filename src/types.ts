export type Lang = 'ja' | 'en';
export type LangMode = 'ja' | 'en' | 'both';
export type LText = { ja: string; en: string };

export type EventType =
  | 'battle' | 'treaty' | 'founding' | 'fall' | 'revolution' | 'religion'
  | 'culture' | 'exploration' | 'politics' | 'other';

export interface HistEvent {
  id: string;
  type: EventType;
  year: number;
  year_end?: number | null;
  lat: number;
  lon: number;
  name: LText;
  desc: LText;
  importance: 1 | 2 | 3;
  persons?: string[];
  wiki?: Partial<LText>;
}

export interface Person {
  id: string;
  name: LText;
  born?: number | null;
  died?: number | null;
  active: [number, number];
  role: LText;
  lat: number;
  lon: number;
  desc: LText;
  importance: 1 | 2 | 3;
  wiki?: Partial<LText>;
  portrait?: { provider: 'wikipedia' | 'url' | 'none'; url?: string };
}

export interface Ruler { from: number; to: number; name: LText; person?: string }
export interface PolityPeriod {
  from: number; to: number;
  government?: LText; capital?: LText; religion?: LText; summary?: LText;
  rulers?: Ruler[];
}
export interface Polity {
  id: string;
  name: LText;
  basemap_names: string[];
  periods: PolityPeriod[];
  wiki?: Partial<LText>;
}

export type NameMap = Record<string, { ja: string }>;

export interface TerritoryIndex { years: number[]; colorSlots: number }

export interface TerritoryProps { n: string | null; s: string | null; p: number; c: number; pf?: string; nj?: string; sj?: string }
export interface LabelProps { n: string; s: string | null; a: number; nj?: string; sj?: string; label?: string }
