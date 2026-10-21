import type { Dataset } from './data';
import { state } from './state';
import { lt, formatYear, ui } from './i18n';
import type { HistEvent, Person, Polity } from './types';

type Hit =
  | { kind: 'event'; e: HistEvent }
  | { kind: 'person'; p: Person }
  | { kind: 'polity'; q: Polity };

function norm(s: string): string {
  return s.toLowerCase().replace(/[＝=・･\s]/g, '').replace(/[ァ-ン]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60));
}

export function initSearch(ds: Dataset, onJump: (lon: number, lat: number, zoom?: number) => void) {
  const wrap = document.getElementById('search')!;
  const input = wrap.querySelector('input')!;
  const list = wrap.querySelector('ul')!;
  input.placeholder = ui('search');

  const index: { key: string; hit: Hit }[] = [];
  for (const e of ds.events) index.push({ key: norm(e.name.ja + ' ' + e.name.en), hit: { kind: 'event', e } });
  for (const p of ds.persons) index.push({ key: norm(p.name.ja + ' ' + p.name.en), hit: { kind: 'person', p } });
  for (const q of ds.polities) index.push({ key: norm(q.name.ja + ' ' + q.name.en + ' ' + q.basemap_names.join(' ')), hit: { kind: 'polity', q } });

  let hits: Hit[] = [];
  let cursor = -1;
  const render = () => {
    list.innerHTML = '';
    hits.forEach((h, i) => {
      const li = document.createElement('li');
      li.className = (i === cursor ? 'on ' : '') + h.kind;
      if (h.kind === 'event') li.innerHTML = `<span class="k">${ui('type.' + h.e.type)}</span>${lt(h.e.name)}<span class="y">${formatYear(h.e.year)}</span>`;
      else if (h.kind === 'person') li.innerHTML = `<span class="k">${ui('layer.persons')}</span>${lt(h.p.name)}<span class="y">${formatYear(h.p.active[0], false)}〜</span>`;
      else li.innerHTML = `<span class="k">${ui('search.polity')}</span>${lt(h.q.name)}<span class="y">${formatYear(h.q.periods[0].from, false)}〜</span>`;
      li.addEventListener('mousedown', (ev) => { ev.preventDefault(); choose(h); });
      list.appendChild(li);
    });
    list.classList.toggle('hidden', hits.length === 0);
  };
  const choose = (h: Hit) => {
    input.value = '';
    hits = []; render(); input.blur();
    if (h.kind === 'event') { state.setYear(h.e.year); onJump(h.e.lon, h.e.lat); state.select({ kind: 'event', event: h.e }); }
    else if (h.kind === 'person') { state.setYear(h.p.active[0]); onJump(h.p.lon, h.p.lat); state.select({ kind: 'person', person: h.p }); }
    else {
      const per = h.q.periods.find((q) => q.from <= state.year && state.year <= q.to) ?? h.q.periods[0];
      if (!(per.from <= state.year && state.year <= per.to)) state.setYear(Math.round((per.from + per.to) / 2));
      state.select({ kind: 'polity', polity: h.q });
    }
  };
  const update = () => {
    const q = norm(input.value.trim());
    cursor = -1;
    if (q.length < 1) { hits = []; render(); return; }
    const scored = index.filter((x) => x.key.includes(q)).map((x) => ({ x, s: x.key.indexOf(q) === 0 ? 0 : 1 }));
    scored.sort((a, b) => a.s - b.s);
    hits = scored.slice(0, 12).map((s) => s.x.hit);
    render();
  };
  input.addEventListener('input', update);
  input.addEventListener('focus', update);
  input.addEventListener('blur', () => setTimeout(() => { hits = []; render(); }, 150));
  input.addEventListener('keydown', (e) => {
    e.stopPropagation();
    if (e.key === 'ArrowDown') { cursor = Math.min(hits.length - 1, cursor + 1); render(); e.preventDefault(); }
    else if (e.key === 'ArrowUp') { cursor = Math.max(0, cursor - 1); render(); e.preventDefault(); }
    else if (e.key === 'Enter') { const h = hits[cursor >= 0 ? cursor : 0]; if (h) choose(h); }
    else if (e.key === 'Escape') { input.value = ''; hits = []; render(); input.blur(); }
  });
  state.on('lang', () => { input.placeholder = ui('search'); });
  window.addEventListener('keydown', (e) => {
    if (e.key === '/' && document.activeElement !== input) { e.preventDefault(); input.focus(); }
  });
}
