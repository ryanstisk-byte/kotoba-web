// Static checks that need no browser. Run: node tests/static-checks.mjs
// - every file in sw.js's precache list exists (a missing one makes the whole offline install fail)
// - every clip in js/clips.js exists in audio/
// - every site file (js, css, icons, clips) is in the precache list, so the app is complete offline
// - every Japanese line the app speaks has a clip at normal and slow speed (else tools/build_assets.py needs a run)
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const errors = [];

// ---- sw.js precache list ----
const sw = readFileSync(join(ROOT, 'sw.js'), 'utf8');
const listSrc = /const FILES = \[([\s\S]*?)\];/.exec(sw);
if (!listSrc) errors.push('sw.js: could not find the FILES precache list');
const files = listSrc ? [...listSrc[1].matchAll(/'([^']+)'/g)].map((m) => m[1]) : [];
const version = /const CACHE_VERSION = '([^']+)'/.exec(sw);
if (!version) errors.push('sw.js: CACHE_VERSION is missing');

const seen = new Set();
for (const f of files) {
  if (seen.has(f)) errors.push(`sw.js precache lists ${f} twice`);
  seen.add(f);
  if (f === './') continue;
  const p = join(ROOT, f);
  if (!existsSync(p) || !statSync(p).isFile()) errors.push(`sw.js precaches ${f}, but that file does not exist`);
}

// ---- clips ----
const clipsSrc = readFileSync(join(ROOT, 'js/clips.js'), 'utf8');
const clipFiles = [...clipsSrc.matchAll(/":\s*"([^"]+\.mp3)"/g)].map((m) => m[1]);
if (!clipFiles.length) errors.push('js/clips.js: no clips found (did the format change?)');
for (const f of new Set(clipFiles)) {
  if (!existsSync(join(ROOT, 'audio', f))) errors.push(`js/clips.js references audio/${f}, but that file does not exist`);
  if (!seen.has('./audio/' + f)) errors.push(`audio/${f} is used by js/clips.js but is not in the sw.js precache list`);
}

// ---- every spoken line has its clips ----
const clipKeys = new Set([...clipsSrc.matchAll(/^"(.*)":\s*"[^"]+\.mp3"/gm)].map((m) => JSON.parse(`"${m[1]}"`)));
const collected = JSON.parse(execFileSync(process.execPath, [join(ROOT, 'tools/collect.mjs')], { encoding: 'utf8' }));
const noClip = [];
for (const [text, voice] of collected.clips) {
  for (const key of [`${text}#${voice}`, `${text}#${voice}#slow`]) if (!clipKeys.has(key)) noClip.push(key);
}
// The Japanese voices can't read English, so no line without Japanese should be spoken.
const english = collected.clips.filter(([text]) => !/[ぁ-ゖァ-ヺ一-鿿]/.test(text)).map(([text]) => text);
if (english.length) errors.push(`${english.length} spoken lines have no Japanese in them: ${english.slice(0, 5).join(' | ')}`);
if (noClip.length) {
  errors.push(`${noClip.length} spoken lines have no clip in js/clips.js (run tools/build_assets.py, see README): `
    + noClip.slice(0, 10).join(' | ') + (noClip.length > 10 ? ' …' : ''));
}

// ---- everything the site needs offline is precached ----
const walk = (dir) => readdirSync(join(ROOT, dir), { withFileTypes: true })
  .flatMap((d) => (d.isDirectory() ? walk(join(dir, d.name)) : [join(dir, d.name)]));
const required = ['index.html', 'styles.css', 'manifest.webmanifest', 'audio/silence.mp3', ...walk('js'), ...walk('icons')];
for (const f of required) {
  const rel = './' + relative(ROOT, join(ROOT, f)).split('\\').join('/');
  if (!seen.has(rel)) errors.push(`${rel} is part of the site but missing from the sw.js precache list`);
}

if (errors.length) {
  console.error(`Static checks failed (${errors.length}):\n- ` + errors.join('\n- '));
  process.exit(1);
}
console.log(`Static checks passed: ${files.length} precached files exist, ${new Set(clipFiles).size} clips exist in audio/, `
  + `all ${collected.clips.length} spoken lines have clips, ${version[1]}.`);
