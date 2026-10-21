// Builds the static data served by the app into public/data/.
//
//   npm run data            # everything
//   npm run data -- --only territories|base|names|events|persons|polities
//
// Sources:
//   vendor/historical-basemaps  (git clone https://github.com/aourednik/historical-basemaps, GPL-3.0)
//   vendor/natural-earth        (Natural Earth GeoJSON, public domain)
//   data/                       (hand-written JSON, see data/SCHEMA.md)
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import polylabel from 'polylabel';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const VENDOR = path.join(ROOT, 'vendor');
const HB = path.join(VENDOR, 'historical-basemaps');
const NE = path.join(VENDOR, 'natural-earth');
const DATA = path.join(ROOT, 'data');
const OUT = path.join(ROOT, 'public', 'data');
const MAPSHAPER = path.join(ROOT, 'node_modules', '.bin', 'mapshaper');
const TMP = path.join(ROOT, '.cache');

const only = (() => {
  const i = process.argv.indexOf('--only');
  return i >= 0 ? new Set(process.argv[i + 1].split(',')) : null;
})();
const want = (k) => !only || only.has(k);

fs.mkdirSync(OUT, { recursive: true });
fs.mkdirSync(TMP, { recursive: true });

// ---------------------------------------------------------------- helpers
function ensureVendor() {
  if (!fs.existsSync(path.join(HB, 'geojson'))) {
    console.log('cloning historical-basemaps into vendor/ ...');
    fs.mkdirSync(VENDOR, { recursive: true });
    execFileSync('git', ['clone', '--depth', '1', 'https://github.com/aourednik/historical-basemaps.git', HB], { stdio: 'inherit' });
  }
  const neFiles = ['ne_50m_land', 'ne_50m_lakes', 'ne_50m_rivers_lake_centerlines'];
  for (const f of neFiles) {
    const p = path.join(NE, f + '.geojson');
    if (!fs.existsSync(p)) {
      console.log('downloading', f);
      fs.mkdirSync(NE, { recursive: true });
      execFileSync('curl', ['-sSL', '-o', p, `https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/${f}.geojson`], { stdio: 'inherit' });
    }
  }
}

function mapshaper(args) {
  execFileSync(MAPSHAPER, args, { stdio: ['ignore', 'ignore', 'inherit'], maxBuffer: 1 << 28 });
}

function readJSON(p) { return JSON.parse(fs.readFileSync(p, 'utf8')); }
function writeJSON(p, v, pretty = false) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, pretty ? JSON.stringify(v, null, 1) : JSON.stringify(v));
}

// Approximate planar area of a ring in lon/lat, scaled by cos(lat) so that
// comparisons between polygons are roughly fair. Units: deg^2 * cos.
function ringArea(ring) {
  let s = 0;
  for (let i = 0, n = ring.length - 1; i < n; i++) {
    const [x1, y1] = ring[i], [x2, y2] = ring[i + 1];
    s += (x1 * y2 - x2 * y1);
  }
  const lat = ring.reduce((a, p) => a + p[1], 0) / ring.length;
  return Math.abs(s / 2) * Math.cos(lat * Math.PI / 180);
}

function polygons(geom) {
  if (!geom) return [];
  if (geom.type === 'Polygon') return [geom.coordinates];
  if (geom.type === 'MultiPolygon') return geom.coordinates;
  return [];
}

function labelPoint(geom) {
  let best = null, bestArea = -1, total = 0;
  for (const poly of polygons(geom)) {
    const a = ringArea(poly[0]);
    total += a;
    if (a > bestArea) { bestArea = a; best = poly; }
  }
  if (!best) return null;
  const p = polylabel(best, 0.05);
  return { point: [Math.round(p[0] * 1000) / 1000, Math.round(p[1] * 1000) / 1000], area: total };
}

// Stable colour slot per sovereign name so a polity keeps its colour across years.
function hashSlot(name, slots) {
  let h = 2166136261;
  for (const ch of name) { h ^= ch.codePointAt(0); h = Math.imul(h, 16777619) >>> 0; }
  return h % slots;
}
const COLOR_SLOTS = 20;

// ---------------------------------------------------------------- territories
function buildTerritories() {
  const files = fs.readdirSync(path.join(HB, 'geojson')).filter((f) => /^world_(bc)?\d+\.geojson$/.test(f));
  const years = [];
  for (const f of files) {
    const m = f.match(/^world_(bc)?(\d+)\.geojson$/);
    const year = Number(m[2]) * (m[1] ? -1 : 1);
    if (year < -10000) continue; // 123000 BC map is not useful here
    const src = path.join(HB, 'geojson', f);
    const tmp = path.join(TMP, `t_${year}.geojson`);
    mapshaper(['-i', src, '-simplify', 'visvalingam', '10%', 'keep-shapes', '-clean', '-o', tmp, 'format=geojson', 'precision=0.001']);
    const fc = readJSON(tmp);
    const out = [];
    const labels = [];
    for (const ft of fc.features) {
      const p = ft.properties || {};
      const name = p.NAME || null;
      const subj = p.SUBJECTO || name || null;
      if (!ft.geometry || !polygons(ft.geometry).length) continue;
      const props = {
        n: name,
        s: subj,
        p: Number(p.BORDERPRECISION) || 1,
        c: subj ? hashSlot(subj, COLOR_SLOTS) : -1,
      };
      if (p.PARTOF && p.PARTOF !== name) props.pf = p.PARTOF;
      out.push({ type: 'Feature', properties: props, geometry: ft.geometry });
      if (name) {
        const lp = labelPoint(ft.geometry);
        if (lp) labels.push({ type: 'Feature', properties: { n: name, s: subj, a: Math.round(lp.area * 100) / 100 }, geometry: { type: 'Point', coordinates: lp.point } });
      }
    }
    writeJSON(path.join(OUT, 'territories', `${year}.json`), { type: 'FeatureCollection', features: out.concat(labels) });
    years.push(year);
    console.log(`territories ${year}: ${out.length} polygons, ${labels.length} labels`);
  }
  years.sort((a, b) => a - b);
  writeJSON(path.join(OUT, 'territories', 'index.json'), { years, colorSlots: COLOR_SLOTS, source: 'aourednik/historical-basemaps (GPL-3.0)' }, true);
}

// ---------------------------------------------------------------- base map
function buildBase() {
  const jobs = [
    ['ne_50m_land', 'land', ['-simplify', 'visvalingam', '12%', 'keep-shapes']],
    ['ne_50m_lakes', 'lakes', ['-simplify', 'visvalingam', '20%', 'keep-shapes', '-filter', 'scalerank<=5']],
    ['ne_50m_rivers_lake_centerlines', 'rivers', ['-simplify', 'visvalingam', '20%', '-filter', 'scalerank<=5']],
  ];
  for (const [src, name, extra] of jobs) {
    const tmp = path.join(TMP, `${name}.geojson`);
    mapshaper(['-i', path.join(NE, src + '.geojson'), ...extra, '-clean', '-o', tmp, 'format=geojson', 'precision=0.001']);
    const fc = readJSON(tmp);
    for (const ft of fc.features) ft.properties = {};
    writeJSON(path.join(OUT, 'base', `${name}.json`), fc);
    console.log(`base ${name}: ${fc.features.length} features`);
  }
}

// ---------------------------------------------------------------- hand-written data
function mergeDir(dir) {
  const d = path.join(DATA, dir);
  if (!fs.existsSync(d)) return [];
  return fs.readdirSync(d).filter((f) => f.endsWith('.json')).sort().flatMap((f) => readJSON(path.join(d, f)));
}

function buildNames() {
  const merged = {};
  for (const f of fs.readdirSync(path.join(DATA, 'names')).filter((f) => f.endsWith('.json')).sort()) {
    Object.assign(merged, readJSON(path.join(DATA, 'names', f)));
  }
  writeJSON(path.join(OUT, 'names.json'), merged);
  console.log(`names: ${Object.keys(merged).length}`);
}

function buildList(kind, sortKey) {
  const items = mergeDir(kind);
  items.sort((a, b) => (sortKey(a) - sortKey(b)) || a.id.localeCompare(b.id));
  writeJSON(path.join(OUT, `${kind}.json`), items);
  console.log(`${kind}: ${items.length}`);
}

// ---------------------------------------------------------------- main
ensureVendor();
if (want('territories')) buildTerritories();
if (want('base')) buildBase();
if (want('names')) buildNames();
if (want('events')) buildList('events', (e) => e.year);
if (want('persons')) buildList('persons', (p) => (p.active ? p.active[0] : p.born ?? 0));
if (want('polities')) buildList('polities', (p) => Math.min(...p.periods.map((q) => q.from)));
