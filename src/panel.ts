import type { Dataset } from './data';
import { nameOf, eventsInside, personsInside, visiblePersons } from './data';
import { state, type Selection } from './state';
import { formatRange, formatYear, lt, lt2, ui, getLangMode } from './i18n';
import { portraitFor } from './portrait';
import type { HistEvent, Person, Polity, PolityPeriod } from './types';

function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}

function wikiLinks(w?: Partial<{ ja: string; en: string }>): string {
  if (!w) return '';
  const parts: string[] = [];
  if (w.ja) parts.push(`<a href="https://ja.wikipedia.org/wiki/${encodeURIComponent(w.ja.replace(/ /g, '_'))}" target="_blank" rel="noopener">${ui('panel.wiki')} (ja)</a>`);
  if (w.en) parts.push(`<a href="https://en.wikipedia.org/wiki/${encodeURIComponent(w.en.replace(/ /g, '_'))}" target="_blank" rel="noopener">${ui('panel.wiki')} (en)</a>`);
  return parts.length ? `<div class="links">${parts.join('')}</div>` : '';
}

function bi(t: { ja: string; en: string } | undefined): string {
  if (!t) return '';
  const second = lt2(t);
  return `<p>${esc(getLangMode() === 'both' ? t.ja : lt(t))}</p>${second ? `<p class="en">${esc(second)}</p>` : ''}`;
}

function eventList(events: HistEvent[], title: string): string {
  if (!events.length) return '';
  const items = events.slice(0, 60).map((e) => `<li data-event="${e.id}"><span class="y">${esc(formatYear(e.year))}</span>${esc(lt(e.name))}</li>`).join('');
  return `<h4>${title}</h4><ul class="list">${items}</ul>`;
}
function personList(ds: Dataset, ids: string[] | undefined, title: string): string {
  const ps = (ids ?? []).map((id) => ds.personById.get(id)).filter((p): p is Person => !!p);
  if (!ps.length) return '';
  return `<h4>${title}</h4><ul class="list">${ps.map((p) => `<li data-person="${p.id}">${esc(lt(p.name))} <span class="y">${esc(lt(p.role))}</span></li>`).join('')}</ul>`;
}

function periodAt(p: Polity, year: number): PolityPeriod | undefined {
  return p.periods.find((q) => q.from <= year && year <= q.to) ?? p.periods.reduce((a, b) => (Math.abs(b.from - year) < Math.abs(a.from - year) ? b : a));
}

function renderPolity(p: Polity, year: number, extraHead = ''): string {
  const per = periodAt(p, year);
  let html = `<h2>${esc(lt(p.name))}</h2>${extraHead}`;
  if (!per) return html + `<p>${ui('panel.nodata')}</p>` + wikiLinks(p.wiki);
  const row = (k: string, v?: { ja: string; en: string }) => (v ? `<dt>${ui(k)}</dt><dd>${esc(lt(v))}</dd>` : '');
  html += `<dl class="kv"><dt>${ui('panel.period')}</dt><dd>${esc(formatRange(per.from, per.to))}</dd>${row('panel.government', per.government)}${row('panel.capital', per.capital)}${row('panel.religion', per.religion)}</dl>`;
  html += bi(per.summary);
  if (per.rulers?.length) {
    html += `<h4>${ui('panel.rulers')}</h4><ul class="list rulers">` + per.rulers.map((r) => {
      const now = r.from <= year && year <= r.to;
      return `<li class="${now ? 'now' : ''}" ${r.person ? `data-person="${r.person}"` : ''}><span class="y">${esc(formatRange(r.from, r.to))}</span>${esc(lt(r.name))}</li>`;
    }).join('') + '</ul>';
  }
  html += wikiLinks(p.wiki);
  return html;
}

export function initPanel(ds: Dataset, onJump: (lon: number, lat: number) => void, geomsFor: (name: string | null, subject: string | null) => GeoJSON.Geometry[]) {
  const panel = document.getElementById('panel')!;
  const body = document.getElementById('panel-body')!;
  document.getElementById('panel-close')!.addEventListener('click', () => state.select(null));

  body.addEventListener('click', (e) => {
    const li = (e.target as HTMLElement).closest<HTMLElement>('[data-event],[data-person],[data-year]');
    if (!li) return;
    if (li.dataset.event) { const ev = ds.eventById.get(li.dataset.event); if (ev) state.select({ kind: 'event', event: ev }); }
    else if (li.dataset.person) { const p = ds.personById.get(li.dataset.person); if (p) state.select({ kind: 'person', person: p }); }
    else if (li.dataset.year) { state.setYear(Number(li.dataset.year)); if (li.dataset.lon) onJump(Number(li.dataset.lon), Number(li.dataset.lat)); }
  });

  const render = () => {
    const s: Selection = state.selection;
    if (!s) { panel.classList.add('hidden'); return; }
    panel.classList.remove('hidden');
    const year = state.year;
    if (s.kind === 'territory') {
      const name = nameOf(ds.names, s.name);
      const subj = nameOf(ds.names, s.subject);
      const partof = nameOf(ds.names, s.partof);
      const polity = (s.name && ds.polityByBasemapName.get(s.name)) || (s.subject && ds.polityByBasemapName.get(s.subject)) || null;
      const precision = `<span class="tag p${s.precision}">${ui('panel.precision' + s.precision)}</span>`;
      let head = `<div class="sub">${precision}`;
      if (subj && subj.en !== name?.en) head += ` <span class="tag">${ui('panel.sovereign')}: ${esc(lt(subj))}</span>`;
      if (partof && partof.en !== name?.en) head += ` <span class="tag">${ui('panel.partof')}: ${esc(lt(partof))}</span>`;
      head += '</div>';
      const geoms = geomsFor(s.name, s.subject);
      const span = year < -1000 ? 500 : year < 1000 ? 150 : year < 1800 ? 80 : 40;
      const local = eventList(eventsInside(ds.events, geoms, year, span), ui('panel.localEvents'));
      const people = personsInside(ds.persons, geoms, year, span).sort((a, b) => b.importance - a.importance).slice(0, 12);
      const peopleHtml = personList(ds, people.map((p) => p.id), ui('panel.localPersons'));
      if (polity) {
        const alias = name && lt(polity.name) !== lt(name) ? `<div class="sub">${esc(lt(name))}</div>` : '';
        body.innerHTML = renderPolity(polity, year, alias + head) + peopleHtml + local;
      } else {
        body.innerHTML = `<h2>${esc(lt(name) || '—')}</h2>${head}<p>${ui('panel.nodata')}</p>` + peopleHtml + local;
      }
    } else if (s.kind === 'event') {
      const e = s.event;
      const when = e.year_end && e.year_end !== e.year ? formatRange(e.year, e.year_end) : formatYear(e.year);
      body.innerHTML = `<h2>${esc(lt(e.name))}</h2><div class="sub"><span class="tag">${ui('type.' + e.type)}</span> ${esc(when)} <a href="#" data-year="${e.year}" data-lon="${e.lon}" data-lat="${e.lat}">${ui('panel.jump')}</a></div>${bi(e.desc)}${personList(ds, e.persons, ui('panel.persons'))}${wikiLinks(e.wiki)}`;
    } else if (s.kind === 'person') {
      const p = s.person;
      const ph = `<div class="portrait placeholder" id="portrait">${esc((p.name.ja || p.name.en).slice(0, 1))}</div>`;
      body.innerHTML = `${ph}<h2>${esc(lt(p.name))}</h2><div class="sub">${esc(lt(p.role))}</div><dl class="kv"><dt>${ui('panel.born')}</dt><dd>${esc(formatRange(p.born, p.died))}</dd><dt>${ui('panel.active')}</dt><dd>${esc(formatRange(p.active[0], p.active[1]))} <a href="#" data-year="${p.active[0]}" data-lon="${p.lon}" data-lat="${p.lat}">${ui('panel.jump')}</a></dd></dl>${bi(p.desc)}${eventList(ds.eventsByPerson.get(p.id) ?? [], ui('panel.events'))}${wikiLinks(p.wiki)}`;
      portraitFor(p).then((url) => {
        const el = document.getElementById('portrait');
        if (url && el && state.selection?.kind === 'person' && state.selection.person.id === p.id) {
          const img = document.createElement('img'); img.className = 'portrait'; img.src = url; img.alt = lt(p.name); el.replaceWith(img);
        }
      });
    } else if (s.kind === 'polity') {
      body.innerHTML = renderPolity(s.polity, year);
    } else if (s.kind === 'overview') {
      const span = year < -1000 ? 500 : year < 500 ? 100 : year < 1500 ? 50 : year < 1800 ? 25 : year < 1900 ? 10 : 5;
      const evs = ds.events.filter((e) => e.year >= year - span && e.year <= year + span && e.importance >= (span <= 10 ? 2 : 3));
      const people = visiblePersons(ds.persons, year).filter((p) => p.importance >= 3).slice(0, 15);
      body.innerHTML = `<h2>${esc(formatYear(year))}</h2><div class="sub">${esc(formatRange(year - span, year + span))}</div>`
        + eventList(evs, ui('panel.worldEvents')) + personList(ds, people.map((p) => p.id), ui('panel.activePersons'));
    }
    panel.scrollTop = 0;
  };
  state.on('selection', render);
  state.on('lang', render);
  // polity panels depend on the year (period / current ruler)
  let lastYearRender = 0;
  state.on('year', () => { if (state.selection && (state.selection.kind === 'territory' || state.selection.kind === 'polity' || state.selection.kind === 'overview') && Date.now() - lastYearRender > 250) { lastYearRender = Date.now(); render(); } });
}

/** Focus-mode ticker: events appearing in the current view as time advances. */
export function initTicker(getInView: () => HistEvent[]) {
  const box = document.getElementById('ticker')!;
  const list = document.getElementById('ticker-list')!;
  const seen = new Map<string, HTMLElement>();
  list.addEventListener('click', (e) => {
    const li = (e.target as HTMLElement).closest<HTMLElement>('[data-event]');
    if (li) document.dispatchEvent(new CustomEvent('ticker-select', { detail: li.dataset.event }));
  });
  const reset = () => { list.innerHTML = ''; seen.clear(); };
  const update = () => {
    if (!state.focus) return;
    // Events stay listed once they have appeared (it is a log of what happened in view).
    const inView = getInView().sort((a, b) => a.year - b.year);
    for (const e of inView) {
      if (seen.has(e.id)) continue;
      const li = document.createElement('li');
      li.dataset.event = e.id;
      li.className = 'new';
      li.innerHTML = `<span class="y">${esc(formatYear(e.year))}</span>${esc(lt(e.name))}`;
      list.prepend(li);
      seen.set(e.id, li);
      setTimeout(() => li.classList.remove('new'), 1500);
    }
    while (list.children.length > 40) { const last = list.lastElementChild as HTMLElement; seen.delete(last.dataset.event!); last.remove(); }
  };
  state.on('focus', () => { box.classList.toggle('hidden', !state.focus); reset(); update(); });
  state.on('lang', () => { reset(); update(); });
  return { update };
}
