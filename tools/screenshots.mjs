// Screenshots of every screen at phone (390x844) and desktop (1280x800) size, for design reviews and PRs.
// Run with the test server up (node tests/server.mjs), then: node tools/screenshots.mjs <out-dir> [light|dark]
// Needs Playwright (npm install).
import { chromium } from 'playwright';
import { mkdirSync, readFileSync } from 'node:fs';

const OUT = process.argv[2] || 'screenshots';
const SCHEME = process.argv[3] || 'light';
const BASE = process.env.BASE_URL || 'http://localhost:4173/kotoba-web/';
const FIXTURE = JSON.parse(readFileSync(new URL('../tests/fixtures/progress-v1.json', import.meta.url), 'utf8'));
mkdirSync(OUT, { recursive: true });

const NOW = new Date('2026-10-07T10:00:00');   // a Wednesday
const mid = { ...FIXTURE, lastSession: NOW.getTime() - 3 * 86_400_000,
  settings: { ...FIXTURE.settings, quiet: false, length: 'standard', theme: 'auto', readingHelp: 'auto', speed: 'normal' } };

const SCREENS = [
  ['home-new', null, '#/', { full: true }],
  ['home', mid, '#/', { full: true }],
  ['modes', mid, '#/modes', { full: true }],
  ['progress', mid, '#/progress', { full: true }],
  ['dojo', null, '#/play/dojo'],
  ['dojo-learn', null, '#/play/dojo', { act: async (p) => { await p.click('[data-act=lesson]'); } }],
  ['dojo-quiz', null, '#/play/dojo', { act: async (p) => {
    await p.click('[data-act=lesson]'); await p.click('[data-act=practice]'); await p.click('[data-act=pick]');
  } }],
  ['garden', mid, '#/play/garden'],
  ['garden-card', mid, '#/play/garden', { act: async (p) => { await p.click('[data-act=water]'); await p.click('[data-act=check]'); } }],
  ['story-list', mid, '#/play/story'],
  ['story', null, '#/play/story', { act: async (p) => { await p.click('[data-act=open]'); } }],
  ['particle', mid, '#/play/particle'],
  ['forge', null, '#/play/forge', { act: async (p) => { await p.locator('[data-act=add]').first().click(); } }],
  ['rhythm', null, '#/play/rhythm'],
  ['duel', mid, '#/play/duel', { act: async (p) => { await p.waitForTimeout(400); await p.locator('[data-act=choose]').first().click(); } }],
  ['slice', null, '#/play/slice', { noSR: true, act: async (p) => { await p.click('[data-act=start]'); await p.waitForTimeout(2500); } }],
  ['shop', null, '#/play/shop', { act: async (p) => { await p.locator('[data-act=greet]').first().click(); } }],
  ['today-block', mid, '#/', { act: async (p) => { await p.locator('.block-row a').first().click(); } }],
  ['today-done', { ...mid, days: { '2026-10-07': { ok: 9, tot: 10, rev: 5, newc: 2, studied: true, blocks: { garden: 'done', input: 'done', speak: 'done', skill: 'skipped' } } } }, '#/', { full: true }],
  ['settings', mid, '#/settings', { full: true }],
  ['check', null, '#/check'],
];

const browser = await chromium.launch({ args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'] });
for (const [size, w, h] of [['phone', 390, 844], ['desktop', 1280, 800]]) {
  for (const [name, state, hash, opt = {}] of SCREENS) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, serviceWorkers: 'block', colorScheme: SCHEME, hasTouch: size === 'phone' });
    const page = await ctx.newPage();
    await page.clock.setFixedTime(NOW);
    await page.addInitScript(([s, noSR]) => {
      if (noSR) { delete window.SpeechRecognition; delete window.webkitSpeechRecognition; }
      if (s && !sessionStorage.getItem('seeded')) { sessionStorage.setItem('seeded', '1'); localStorage.setItem('kotobaBeat.v1', JSON.stringify(s)); }
    }, [state, !!opt.noSR]);
    await page.goto(BASE + hash);
    await page.waitForTimeout(500);
    try { if (opt.act) await opt.act(page); } catch (e) { console.warn(`${size}/${name}: ${e.message.split('\n')[0]}`); }
    await page.waitForTimeout(900);
    await page.screenshot({ path: `${OUT}/${size}-${name}.png`, fullPage: !!opt.full });
    await ctx.close();
  }
}
await browser.close();
console.log('Screenshots in', OUT);
