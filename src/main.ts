import { loadDataset, snapshotFor } from './data';
import { HistoryMap } from './map';
import { state, readHash, writeHash } from './state';
import { initTimeline } from './timeline';
import { initPanel, initTicker } from './panel';
import { initSearch } from './search';
import { applyStaticTexts, setLangMode, ui, formatYear } from './i18n';
import type { LangMode } from './types';
import type { Layers } from './state';
import './style.css';

async function main() {
  const h = readHash();
  const savedLang = (() => { try { return localStorage.getItem('whg.lang') as LangMode | null; } catch { return null; } })();
  const lang = h.lang ?? savedLang ?? 'ja';
  state.langMode = lang; setLangMode(lang);
  if (h.year != null) state.year = h.year;
  applyStaticTexts();

  const ds = await loadDataset();
  const hmap = new HistoryMap(document.getElementById('map')!, ds, h.cam);
  initTimeline(ds.index);
  initPanel(ds, (lon, lat) => hmap.flyTo(lon, lat), (n, sub) => hmap.territoryGeometries(n, sub));
  const ticker = initTicker(() => hmap.eventsInView());
  initSearch(ds, (lon, lat, zoom) => hmap.flyTo(lon, lat, zoom));

  // ---- language
  const langSeg = document.getElementById('lang-seg')!;
  const syncLang = () => langSeg.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.lang === state.langMode));
  langSeg.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest('button'); if (!b) return;
    state.setLangMode(b.dataset.lang as LangMode);
  });
  state.on('lang', () => {
    setLangMode(state.langMode); applyStaticTexts(); syncLang(); hmap.applyLang(); updateSnapshotNote();
    try { localStorage.setItem('whg.lang', state.langMode); } catch { /* ignore */ }
    writeHash(hmap.camera());
  });
  syncLang();

  // ---- layers
  const layerSeg = document.getElementById('layer-seg')!;
  layerSeg.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest('button'); if (!b) return;
    const k = b.dataset.layer as keyof Layers;
    state.setLayer(k, !state.layers[k]);
    b.classList.toggle('on', state.layers[k]);
  });
  state.on('layers', () => hmap.applyLayers());

  // ---- year
  const note = document.getElementById('snapshot-note')!;
  const updateSnapshotNote = () => {
    const snap = snapshotFor(ds.index, state.year);
    const next = ds.index.years.find((y) => y > snap);
    const gap = state.year - snap;
    const wide = next !== undefined && gap > (state.year >= 1800 ? 15 : state.year >= 1000 ? 40 : 150);
    note.textContent = wide ? ui('snapshotGap', { y: formatYear(snap), n: formatYear(next!) }) : ui('snapshot', { y: formatYear(snap) });
    note.classList.toggle('warn', wide);
  };
  const speedSel = document.getElementById('speed') as HTMLSelectElement;
  const renderSpeed = () => { for (const o of Array.from(speedSel.options)) o.textContent = ui('speed.unit', { n: o.value }); };
  renderSpeed();
  state.on('lang', renderSpeed);
  let raf = 0;
  state.on('year', () => {
    if (!raf) raf = requestAnimationFrame(() => { raf = 0; hmap.refresh(); updateSnapshotNote(); ticker.update(); writeHash(hmap.camera()); });
  });
  updateSnapshotNote();
  hmap.map.on('moveend', () => { writeHash(hmap.camera()); ticker.update(); });
  hmap.map.on('load', () => ticker.update());

  // ---- focus mode
  const focusBtn = document.getElementById('btn-focus')!;
  focusBtn.addEventListener('click', () => state.setFocus(!state.focus));
  state.on('focus', () => {
    focusBtn.classList.toggle('on', state.focus);
    hmap.setInteractive(!state.focus);
    if (state.focus) { state.select(null); state.setPlaying(true); } else state.setPlaying(false);
  });
  document.addEventListener('ticker-select', (e) => {
    const ev = ds.eventById.get((e as CustomEvent<string>).detail);
    if (ev) state.select({ kind: 'event', event: ev });
  });

  // ---- globe / flat
  const globeBtn = document.getElementById('btn-globe')!;
  let globe = true;
  try { globe = localStorage.getItem('whg.globe') !== '0'; } catch { /* ignore */ }
  const applyGlobe = () => { globeBtn.classList.toggle('on', globe); hmap.setGlobe(globe); try { localStorage.setItem('whg.globe', globe ? '1' : '0'); } catch { /* ignore */ } };
  globeBtn.addEventListener('click', () => { globe = !globe; applyGlobe(); });
  hmap.map.on('load', applyGlobe);

  // ---- overview
  const ovBtn = document.getElementById('btn-overview')!;
  ovBtn.addEventListener('click', () => state.select(state.selection?.kind === 'overview' ? null : { kind: 'overview' }));
  state.on('selection', () => ovBtn.classList.toggle('on', state.selection?.kind === 'overview'));

  // ---- help
  const help = document.getElementById('help')!;
  const helpBody = document.getElementById('help-body')!;
  const renderHelp = () => { helpBody.innerHTML = `<h3>${ui('help.title')}</h3>${ui('help.body')}`; };
  renderHelp();
  state.on('lang', renderHelp);
  document.getElementById('btn-help')!.addEventListener('click', () => help.classList.toggle('hidden'));
  document.getElementById('help-close')!.addEventListener('click', () => help.classList.add('hidden'));
  help.addEventListener('click', (e) => { if (e.target === help) help.classList.add('hidden'); });
  try { if (!localStorage.getItem('whg.seenHelp')) { help.classList.remove('hidden'); localStorage.setItem('whg.seenHelp', '1'); } } catch { /* ignore */ }
}

main().catch((err) => {
  console.error(err);
  const el = document.createElement('pre');
  el.style.cssText = 'position:absolute;top:60px;left:12px;color:#f88;z-index:99;background:#000c;padding:8px';
  el.textContent = String(err?.stack || err);
  document.body.appendChild(el);
});
