import type { Lang, LangMode, LText } from './types';

const UI: Record<string, LText> = {
  title: { ja: '世界史地球儀', en: 'World History Globe' },
  'layer.territories': { ja: '国境', en: 'Borders' },
  'layer.labels': { ja: '国名', en: 'Names' },
  'layer.events': { ja: '事件', en: 'Events' },
  'layer.persons': { ja: '人物', en: 'People' },
  'layer.rivers': { ja: '河川', en: 'Rivers' },
  focus: { ja: '注目モード', en: 'Focus mode' },
  search: { ja: '検索  (/)', en: 'Search  (/)' },
  'search.polity': { ja: '政体', en: 'Polity' },
  overview: { ja: 'この年の世界', en: 'World now' },
  'panel.worldEvents': { ja: '主な出来事', en: 'Major events' },
  'panel.activePersons': { ja: '活動中の人物', en: 'Active people' },
  ticker: { ja: 'この範囲の出来事', en: 'Events in view' },
  speed: { ja: '速度', en: 'Speed' },
  'legend.exact': { ja: '確定した国境', en: 'Defined border' },
  'legend.approx': { ja: 'おおよその国境', en: 'Approximate border' },
  'legend.fuzzy': { ja: '勢力圏・あいまい', en: 'Sphere of influence' },
  'type.battle': { ja: '戦い', en: 'Battle' },
  'type.treaty': { ja: '条約・会議', en: 'Treaty' },
  'type.founding': { ja: '建国', en: 'Founding' },
  'type.fall': { ja: '滅亡', en: 'Fall' },
  'type.revolution': { ja: '革命・反乱', en: 'Revolution' },
  'type.religion': { ja: '宗教', en: 'Religion' },
  'type.culture': { ja: '文化', en: 'Culture' },
  'type.exploration': { ja: '探検', en: 'Exploration' },
  'type.politics': { ja: '政治', en: 'Politics' },
  'type.other': { ja: 'その他', en: 'Other' },
  'attrib.portrait': { ja: '肖像: Wikipedia', en: 'Portraits: Wikipedia' },
  snapshot: { ja: '地図は{y}の状態', en: 'map as of {y}' },
  snapshotGap: { ja: '地図は{y}の状態(次の地図は{n})', en: 'map as of {y} (next map: {n})' },
  'speed.unit': { ja: '{n}年/秒', en: '{n} yr/s' },
  'panel.sovereign': { ja: '宗主', en: 'Sovereign' },
  'panel.partof': { ja: '文化圏', en: 'Part of' },
  'panel.precision1': { ja: '境界は概略', en: 'approximate border' },
  'panel.precision2': { ja: '境界はやや正確', en: 'moderately precise' },
  'panel.precision3': { ja: '国際法上の国境', en: 'legal border' },
  'panel.government': { ja: '政体', en: 'Government' },
  'panel.capital': { ja: '首都', en: 'Capital' },
  'panel.religion': { ja: '宗教', en: 'Religion' },
  'panel.rulers': { ja: '君主・指導者', en: 'Rulers' },
  'panel.events': { ja: '関連する出来事', en: 'Related events' },
  'panel.persons': { ja: '関連人物', en: 'People' },
  'panel.period': { ja: '時期', en: 'Period' },
  'panel.localEvents': { ja: 'この地域の出来事(前後)', en: 'Events in this area (around this time)' },
  'panel.localPersons': { ja: 'この地域の人物', en: 'People in this area' },
  'panel.nodata': { ja: 'この政体の解説はまだありません。', en: 'No description for this polity yet.' },
  'panel.wiki': { ja: 'Wikipedia', en: 'Wikipedia' },
  'panel.jump': { ja: 'この年へ', en: 'Go to year' },
  'panel.born': { ja: '生没', en: 'Lived' },
  'panel.active': { ja: '活動', en: 'Active' },
  'help.title': { ja: '使い方', en: 'How to use' },
  'help.body': {
    ja: '<p>地球儀をドラッグして回し、スクロールで拡大。下のスライダーか <kbd>←</kbd><kbd>→</kbd> で年を動かします(<kbd>Shift</kbd> で10年、<kbd>Alt</kbd> で100年)。<kbd>Space</kbd> で再生/停止。</p><p>領域をクリックすると政体の情報、丸い印は事件、顔は人物です。</p><p><b>注目モード</b>は地球儀を固定して年を自動で進め、画面内で起きた出来事を左に流します。見たい地域に寄せてから押してください。</p><p>国境線の見た目は確からしさを表します。実線は国際法で確定した国境、破線はおおよその線、ぼかしは勢力圏程度のあいまいな範囲です。地図は最も近い過去のスナップショットを表示します。</p>',
    en: '<p>Drag to rotate the globe, scroll to zoom. Move time with the slider or <kbd>←</kbd><kbd>→</kbd> (<kbd>Shift</kbd> = 10 years, <kbd>Alt</kbd> = 100 years). <kbd>Space</kbd> plays/pauses.</p><p>Click a territory for the polity, a dot for an event, a face for a person.</p><p><b>Focus mode</b> locks the camera, advances time automatically and lists the events that happen in view on the left.</p><p>Border style shows confidence: solid = legally defined, dashed = approximate, blurred = sphere of influence. The map shows the nearest earlier snapshot.</p>',
  },
  'era.prehistory': { ja: '先史', en: 'Prehistory' },
  'era.ancient': { ja: '古代', en: 'Ancient' },
  'era.classical': { ja: '古典古代', en: 'Classical' },
  'era.medieval': { ja: '中世', en: 'Medieval' },
  'era.earlymodern': { ja: '近世', en: 'Early modern' },
  'era.modern': { ja: '近代', en: 'Modern' },
  'era.ww': { ja: '世界大戦', en: 'World wars' },
  'era.contemporary': { ja: '現代', en: 'Contemporary' },
};

let mode: LangMode = 'ja';
export function setLangMode(m: LangMode) { mode = m; }
export function getLangMode(): LangMode { return mode; }
export function primaryLang(): Lang { return mode === 'en' ? 'en' : 'ja'; }

export function ui(key: string, vars?: Record<string, string | number>): string {
  const t = UI[key];
  let s = t ? t[primaryLang()] : key;
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.replace(`{${k}}`, String(v));
  return s;
}

/** Bilingual text for the current mode. In 'both' mode returns "ja / en". */
export function lt(t: Partial<LText> | undefined | null, sep = ' / '): string {
  if (!t) return '';
  const ja = t.ja ?? t.en ?? '';
  const en = t.en ?? t.ja ?? '';
  if (mode === 'ja') return ja;
  if (mode === 'en') return en;
  return ja === en ? ja : `${ja}${sep}${en}`;
}

/** Secondary language text when in 'both' mode, otherwise empty. */
export function lt2(t: Partial<LText> | undefined | null): string {
  if (!t || mode !== 'both') return '';
  return t.en && t.en !== t.ja ? t.en : '';
}

export function formatYear(y: number, withEra = true): string {
  const l = primaryLang();
  if (l === 'ja') {
    if (y < 0) return `前${-y}年`;
    return withEra ? `${y}年` : `${y}`;
  }
  if (y < 0) return `${-y} BC`;
  return withEra && y < 1000 ? `AD ${y}` : `${y}`;
}

export function formatRange(a?: number | null, b?: number | null): string {
  if (a == null && b == null) return '';
  const l = primaryLang();
  const f = (y: number) => (l === 'ja' ? (y < 0 ? `前${-y}` : `${y}`) : y < 0 ? `${-y} BC` : `${y}`);
  return `${a != null ? f(a) : '?'}〜${b != null ? f(b) : ''}`;
}

export function applyStaticTexts(root: ParentNode = document) {
  root.querySelectorAll<HTMLElement>('[data-i18n]').forEach((el) => {
    const k = el.dataset.i18n!;
    if (k === 'help.body') el.innerHTML = ui(k);
    else el.textContent = ui(k);
  });
  document.documentElement.lang = primaryLang();
}
