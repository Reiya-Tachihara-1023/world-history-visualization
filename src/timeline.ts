import { state, YEAR_MIN, YEAR_MAX } from './state';
import { formatYear, ui, primaryLang } from './i18n';
import type { TerritoryIndex } from './types';

// Piecewise-linear slider so that sparse millennia take little space and
// the well-documented centuries get room. [year, slider position 0..1]
const STOPS: [number, number][] = [
  [-10000, 0], [-3000, 0.05], [-1000, 0.12], [-500, 0.16], [1, 0.25], [500, 0.32], [1000, 0.40],
  [1500, 0.52], [1800, 0.68], [1900, 0.82], [2020, 1],
];
const RES = 10000;

export function yearToPos(y: number): number {
  for (let i = 1; i < STOPS.length; i++) {
    const [y0, p0] = STOPS[i - 1], [y1, p1] = STOPS[i];
    if (y <= y1) return p0 + ((y - y0) / (y1 - y0)) * (p1 - p0);
  }
  return 1;
}
export function posToYear(p: number): number {
  for (let i = 1; i < STOPS.length; i++) {
    const [y0, p0] = STOPS[i - 1], [y1, p1] = STOPS[i];
    if (p <= p1) return Math.round(y0 + ((p - p0) / (p1 - p0)) * (y1 - y0));
  }
  return YEAR_MAX;
}

const ERAS: { key: string; year: number }[] = [
  { key: 'era.prehistory', year: -8000 }, { key: 'era.ancient', year: -1500 }, { key: 'era.classical', year: -300 },
  { key: 'era.medieval', year: 800 }, { key: 'era.earlymodern', year: 1550 }, { key: 'era.modern', year: 1850 },
  { key: 'era.ww', year: 1920 }, { key: 'era.contemporary', year: 1975 },
];

export function parseYearInput(s: string): number | null {
  s = s.trim().replace(/[０-９]/g, (d) => String.fromCharCode(d.charCodeAt(0) - 0xfee0)).replace(/[年]/g, '');
  let neg = false;
  if (/^(前|BC|B\.C\.|bc|-|−)/i.test(s)) { neg = true; s = s.replace(/^(前|BC|B\.C\.|bc|-|−)\s*/i, ''); }
  else if (/(BC|B\.C\.)$/i.test(s)) { neg = true; s = s.replace(/\s*(BC|B\.C\.)$/i, ''); }
  s = s.replace(/^(AD|A\.D\.)\s*/i, '');
  const n = parseInt(s, 10);
  if (!Number.isFinite(n)) return null;
  return neg ? -n : n;
}

export function initTimeline(index: TerritoryIndex) {
  const slider = document.getElementById('year-slider') as HTMLInputElement;
  const input = document.getElementById('year-input') as HTMLInputElement;
  const play = document.getElementById('btn-play') as HTMLButtonElement;
  const speed = document.getElementById('speed') as HTMLSelectElement;
  const eras = document.getElementById('eras')!;
  const ticks = document.getElementById('slider-ticks')!;
  slider.max = String(RES);

  const render = () => {
    slider.value = String(Math.round(yearToPos(state.year) * RES));
    if (document.activeElement !== input) input.value = formatYear(state.year);
    eras.querySelectorAll('button').forEach((b) => {
      const y = Number(b.dataset.year);
      const next = ERAS[ERAS.findIndex((e) => e.year === y) + 1]?.year ?? Infinity;
      b.classList.toggle('on', state.year >= y && state.year < next);
    });
  };

  slider.addEventListener('input', () => state.setYear(posToYear(Number(slider.value) / RES)));
  input.addEventListener('change', () => { const y = parseYearInput(input.value); if (y != null) state.setYear(y); else render(); });
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') input.blur(); e.stopPropagation(); });
  input.addEventListener('blur', render);
  document.querySelectorAll<HTMLButtonElement>('.step button').forEach((b) => b.addEventListener('click', () => state.setYear(state.year + Number(b.dataset.step))));
  play.addEventListener('click', () => state.setPlaying(!state.playing));
  speed.addEventListener('change', () => { state.speed = Number(speed.value); });
  state.speed = Number(speed.value);

  const buildEras = () => {
    eras.innerHTML = '';
    for (const e of ERAS) {
      const b = document.createElement('button');
      b.dataset.year = String(e.year);
      b.textContent = ui(e.key);
      b.addEventListener('click', () => state.setYear(e.year));
      eras.appendChild(b);
    }
    ticks.innerHTML = '';
    const major = [-10000, -3000, -1000, -500, 1, 500, 1000, 1500, 1700, 1800, 1900, 1950, 2000];
    for (const y of major) {
      const s = document.createElement('span');
      s.style.left = `${yearToPos(y) * 100}%`;
      s.textContent = primaryLang() === 'ja' ? (y < 0 ? `前${-y}` : `${y}`) : y < 0 ? `${-y}BC` : `${y}`;
      ticks.appendChild(s);
    }
    for (const y of index.years) {
      if (major.includes(y)) continue;
      const s = document.createElement('span');
      s.className = 'snap';
      s.style.left = `${yearToPos(y) * 100}%`;
      s.title = String(y);
      ticks.appendChild(s);
    }
    render();
  };
  buildEras();

  state.on('year', render);
  state.on('lang', buildEras);
  state.on('play', () => { play.textContent = state.playing ? '❚❚' : '▶'; play.classList.toggle('on', state.playing); });

  // playback loop
  let last = 0, acc = 0;
  const tick = (t: number) => {
    if (state.playing) {
      if (last) {
        acc += ((t - last) / 1000) * state.speed;
        const whole = Math.trunc(acc);
        if (whole !== 0) { acc -= whole; state.setYear(state.year + whole); }
        if (state.year >= YEAR_MAX) state.setPlaying(false);
      }
      last = t;
    } else { last = 0; acc = 0; }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);

  // keyboard
  window.addEventListener('keydown', (e) => {
    const tgt = e.target as HTMLElement;
    if (tgt && (tgt.tagName === 'INPUT' || tgt.tagName === 'SELECT' || tgt.tagName === 'TEXTAREA')) return;
    const step = e.altKey ? 100 : e.shiftKey ? 10 : 1;
    if (e.key === 'ArrowLeft') { state.setYear(state.year - step); e.preventDefault(); }
    else if (e.key === 'ArrowRight') { state.setYear(state.year + step); e.preventDefault(); }
    else if (e.key === ' ') { state.setPlaying(!state.playing); e.preventDefault(); }
    else if (e.key === 'Escape') { state.select(null); }
  });

  // clamp guard: years outside range are not representable on the slider
  if (state.year < YEAR_MIN || state.year > YEAR_MAX) state.setYear(1500);
}
