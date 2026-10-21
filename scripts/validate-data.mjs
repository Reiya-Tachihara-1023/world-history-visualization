// Consistency checks for data/ (run: npm run check)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATA = path.join(ROOT, 'data');
const readDir = (d) => (fs.existsSync(path.join(DATA, d)) ? fs.readdirSync(path.join(DATA, d)).filter((f) => f.endsWith('.json')).sort() : []);
const load = (d) => readDir(d).flatMap((f) => { try { return JSON.parse(fs.readFileSync(path.join(DATA, d, f), 'utf8')).map((x) => ({ ...x, _file: `${d}/${f}` })); } catch (e) { console.error(`${d}/${f}: ${e.message}`); process.exitCode = 1; return []; } });

const TYPES = new Set(['battle', 'treaty', 'founding', 'fall', 'revolution', 'religion', 'culture', 'exploration', 'politics', 'other']);
let errors = 0, warnings = 0;
const err = (m) => { errors++; console.log('ERROR', m); };
const warn = (m) => { warnings++; console.log('warn ', m); };
const isText = (t) => t && typeof t.ja === 'string' && t.ja.trim() && typeof t.en === 'string' && t.en.trim();
const coordOk = (x) => typeof x.lat === 'number' && typeof x.lon === 'number' && Math.abs(x.lat) <= 90 && Math.abs(x.lon) <= 180;

const events = load('events');
const persons = load('persons');
const polities = load('polities');
const names = {};
for (const f of readDir('names')) Object.assign(names, JSON.parse(fs.readFileSync(path.join(DATA, 'names', f), 'utf8')));

const idRe = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const seen = new Map();
function checkId(x, kind) {
  if (!idRe.test(x.id ?? '')) err(`${kind} bad id ${JSON.stringify(x.id)} in ${x._file}`);
  const k = `${kind}:${x.id}`;
  if (seen.has(k)) err(`${kind} duplicate id ${x.id} in ${x._file} and ${seen.get(k)}`);
  seen.set(k, x._file);
}

const personIds = new Set(persons.map((p) => p.id));
for (const e of events) {
  checkId(e, 'event');
  if (!TYPES.has(e.type)) err(`event ${e.id}: bad type ${e.type}`);
  if (!Number.isInteger(e.year) || e.year === 0) err(`event ${e.id}: bad year ${e.year}`);
  if (e.year_end != null && (!Number.isInteger(e.year_end) || e.year_end < e.year)) err(`event ${e.id}: bad year_end`);
  if (!coordOk(e)) err(`event ${e.id}: bad coordinates`);
  if (!isText(e.name) || !isText(e.desc)) err(`event ${e.id}: missing name/desc`);
  if (![1, 2, 3].includes(e.importance)) err(`event ${e.id}: importance must be 1..3`);
  for (const p of e.persons ?? []) if (!personIds.has(p)) warn(`event ${e.id}: unknown person ${p}`);
}
for (const p of persons) {
  checkId(p, 'person');
  if (!Array.isArray(p.active) || p.active.length !== 2 || p.active[0] > p.active[1]) err(`person ${p.id}: bad active`);
  if (p.born != null && p.died != null && p.born > p.died) err(`person ${p.id}: born after died`);
  if (!coordOk(p)) err(`person ${p.id}: bad coordinates`);
  if (!isText(p.name) || !isText(p.desc) || !isText(p.role)) err(`person ${p.id}: missing text`);
  if (![1, 2, 3].includes(p.importance)) err(`person ${p.id}: importance must be 1..3`);
}
const basemapOwner = new Map();
for (const p of polities) {
  checkId(p, 'polity');
  if (!isText(p.name)) err(`polity ${p.id}: missing name`);
  if (!Array.isArray(p.basemap_names) || !p.basemap_names.length) warn(`polity ${p.id}: no basemap_names`);
  for (const b of p.basemap_names ?? []) {
    if (!(b in names)) err(`polity ${p.id}: unknown basemap name ${JSON.stringify(b)}`);
    if (basemapOwner.has(b) && basemapOwner.get(b) !== p.id) warn(`basemap name ${JSON.stringify(b)} claimed by ${basemapOwner.get(b)} and ${p.id}`);
    basemapOwner.set(b, p.id);
  }
  if (!Array.isArray(p.periods) || !p.periods.length) err(`polity ${p.id}: no periods`);
  for (const q of p.periods ?? []) {
    if (!Number.isInteger(q.from) || !Number.isInteger(q.to) || q.from > q.to) err(`polity ${p.id}: bad period ${q.from}..${q.to}`);
    if (!isText(q.summary)) err(`polity ${p.id}: period ${q.from} missing summary`);
    for (const r of q.rulers ?? []) {
      if (!isText(r.name)) err(`polity ${p.id}: ruler without name`);
      if (r.person && !personIds.has(r.person)) warn(`polity ${p.id}: ruler ${r.name?.en} references unknown person ${r.person}`);
    }
  }
}
const changes = load('changes');
const idx = fs.existsSync(path.join(ROOT, 'public/data/territories/index.json')) ? JSON.parse(fs.readFileSync(path.join(ROOT, 'public/data/territories/index.json'), 'utf8')).years : [];
for (const c of changes) {
  checkId(c, 'change');
  if (!Number.isInteger(c.year)) err(`change ${c.id}: bad year`);
  const snap = idx.filter((y) => y < c.year).pop();
  if (snap === undefined) err(`change ${c.id}: year before first snapshot`);
  if (!c.match || (c.match.n === undefined && c.match.s === undefined)) err(`change ${c.id}: match needs n or s`);
  for (const k of ['n', 's']) for (const v of [].concat(c.match?.[k] ?? [])) if (!(v in names)) err(`change ${c.id}: unknown match name ${JSON.stringify(v)}`);
  if (!c.set || (c.set.n === undefined && c.set.s === undefined && c.set.p === undefined)) err(`change ${c.id}: set needs n, s or p`);
  for (const k of ['n', 's']) if (c.set?.[k] !== undefined && !(c.set[k] in names)) err(`change ${c.id}: set.${k} ${JSON.stringify(c.set[k])} has no Japanese name in data/names`);
  if (c.set?.p !== undefined && ![1, 2, 3].includes(c.set.p)) err(`change ${c.id}: set.p must be 1..3`);
  if (!isText(c.note)) warn(`change ${c.id}: no note`);
  // the matched name must exist in the snapshot the change applies to
  if (snap !== undefined) {
    const f = path.join(ROOT, 'public/data/territories', `${snap}.json`);
    if (fs.existsSync(f)) {
      const fc = JSON.parse(fs.readFileSync(f, 'utf8'));
      const hit = fc.features.some((ft) => ft.geometry.type !== 'Point' && (c.match.n === undefined || [].concat(c.match.n).includes(ft.properties.n)) && (c.match.s === undefined || [].concat(c.match.s).includes(ft.properties.s)));
      if (!hit) err(`change ${c.id}: nothing matches in snapshot ${snap}`);
    }
  }
}
console.log(`events ${events.length}, persons ${persons.length}, polities ${polities.length}, changes ${changes.length}, names ${Object.keys(names).length}`);
console.log(`${errors} errors, ${warnings} warnings`);
if (errors) process.exitCode = 1;
