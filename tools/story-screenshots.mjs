// Phone-size screenshots of the Story saga (chapter map, a new chapter with a note, questions, Paste a line) as JPGs.
// Run with the test server up (node tests/server.mjs 4173), then: node tools/story-screenshots.mjs [out-dir]
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const OUT = process.argv[2] || 'docs/screenshots/story';
const BASE = process.env.BASE_URL || 'http://localhost:4173/kotoba-web/';
mkdirSync(OUT, { recursive: true });

const cleared = (n) => Array.from({ length: n }, (_, i) => 'ch' + (i + 1));
const base = { v: 3, items: {}, lastSession: Date.parse('2026-10-06T10:00:00'), chapters: cleared(5), forged: [], dojo: [],
  storyReplays: {}, settings: { hideIosHint: true, readingHelp: 'kana' }, days: {},
  saga: { mined: [{ id: 'mine:1', jp: '本気で 行くぞ', reading: 'ほんきで いくぞ', en: "I'm going all out", parts: [['本気', 'ほんき'], ['で', null], [' ', null], ['行', 'い'], ['くぞ', null]], at: 1 }],
    seq: 1, quiz: { ch1: { ok: 3, tot: 3, best: 3, at: 1 }, ch2: { ok: 2, tot: 3, best: 2, at: 1 } }, challenge: { ch1: { ok: 2, tot: 3, best: 2, runs: 1, at: 1 } } },
};

const next = (p) => p.getByRole('button', { name: 'Next', exact: true }).click();
const SHOTS = [
  ['map', { ...base, chapters: cleared(8) }, async (p) => { await p.evaluate(() => window.scrollTo(0, 260)); }],
  ['map-next', { ...base, chapters: cleared(8) }, async (p) => { await p.locator('.saga-node.next').scrollIntoViewIfNeeded(); await p.evaluate(() => window.scrollBy(0, 200)); }],
  ['scene-note', { ...base, chapters: cleared(8) }, async (p) => {
    await p.click('.saga-node.next [data-act=open]'); await next(p);
  }],
  ['questions', base, async (p) => {
    await p.click('.saga-node.next [data-act=open]');
    for (let i = 0; i < 30 && !(await p.locator('.saga-quiz').isVisible()); i++) {
      if (await p.locator('#view [data-act=choice]').count()) { await p.locator('#view [data-act=choice][data-i="0"]').click(); continue; }
      await next(p);
    }
    await p.locator('#view [data-act=choice][data-i="1"]').click();
  }],
  ['paste-a-line', base, async (p) => {
    await p.click('[data-act=mine]');
    await p.fill('#mine-jp', 'おれの 拳は まだ 折れてねえ！');
    await p.click('[data-act=m-read]');
    await p.fill('#mine-en', "My fist isn't broken yet!");
  }],
];

const browser = await chromium.launch();
for (const [name, state, act] of SHOTS) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, serviceWorkers: 'block', hasTouch: true });
  const page = await ctx.newPage();
  await page.addInitScript((s) => { if (!sessionStorage.getItem('seeded')) { sessionStorage.setItem('seeded', '1'); localStorage.setItem('kotobaBeat.v1', JSON.stringify(s)); } }, state);
  await page.goto(BASE + '#/play/story');
  await page.waitForTimeout(400);
  await act(page);
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${OUT}/phone-${name}.jpg`, type: 'jpeg', quality: 62 });
  await ctx.close();
}
await browser.close();
console.log('Screenshots in', OUT);
