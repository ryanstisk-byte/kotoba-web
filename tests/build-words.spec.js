// Sentence Builder: every sentence has a picture, a sentence with an unlearned word first offers to teach it (or skip
// to a known sentence), the answer reads word by word, and the mic only starts when the learner taps 🎤.
import { test, expect, seed, view, plainText, expectNoHorizontalScroll } from './helpers.js';

/** A recognizer stand-in that counts start() calls and "hears" the sentence on screen. */
const fakeRecognizer = () => {
  window.__recStarts = 0;
  window.webkitSpeechRecognition = window.SpeechRecognition = class {
    start() {
      window.__recStarts++;
      setTimeout(() => { this.onstart && this.onstart(); }, 20);
    }
    stop() {}
    abort() {}
  };
};

test('every sentence has a picture and only known catalog words count as words', async ({ page }) => {
  await page.goto('./');
  const r = await page.evaluate(async () => {
    const P = await import('./js/practice-data.js');
    return {
      noScene: P.BUILD_SENTENCES.filter((s) => !s.scene).map((s) => s.id),
      kind: P.wordsInTiles(['せんせい', 'は', 'やさしいです']).map((w) => w.en),
      verb: P.wordsInTiles(['パン', 'を', 'たべます']).map((w) => w.jp),
    };
  });
  expect(r.noScene).toEqual([]);
  expect(r.kind[1]).toMatch(/kind/);
  expect(r.verb).toEqual(['パン', '食べる']);
});

test('a new word appears first; learning it plants it, skipping finds a known sentence', async ({ page }) => {
  await page.addInitScript(() => { delete window.SpeechRecognition; delete window.webkitSpeechRecognition; });
  await seed(page, { v: 2, items: {}, settings: { hideIosHint: true } });   // nothing learned yet
  await page.goto('./#/play/build');
  const v = view(page);
  await expect(v.locator('.challenger-head')).toContainText(/new word/i);
  await expectNoHorizontalScroll(page);
  // Nothing is known, so there's no sentence to skip to.
  await expect(v.locator('[data-act=skipnew]')).toBeDisabled();
  const ids = await page.evaluate(async () => {
    const P = await import('./js/practice-data.js');
    const s = P.BUILD_SENTENCES.find((x) => x.id === document.querySelector('#view [data-qid]').dataset.qid);
    return P.wordsInTiles(s.tiles).map((w) => w.ids[0]);
  });
  await v.locator('[data-act=learnnew]').click();
  await expect(v.locator('.bank [data-act=tile]').first()).toBeVisible();
  const items = await page.evaluate(() => Object.keys(JSON.parse(localStorage.getItem('kotobaBeat.v1')).items));
  for (const id of ids) expect(items).toContain(id);
});

test('sentences whose words are all known come first', async ({ page }) => {
  await page.addInitScript(() => { delete window.SpeechRecognition; delete window.webkitSpeechRecognition; });
  // Know the words of exactly one sentence (I drink water: 水, のみます).
  const now = Date.now();
  const plant = { level: 1, due: now + 86_400_000, best: 0 };
  await seed(page, { v: 2, items: { 'n5:水': plant, 'n5:飲む': plant }, settings: { hideIosHint: true } });
  await page.goto('./#/play/build');
  const v = view(page);
  // A known sentence comes first, with no break (water and drink are the only words these two use).
  await expect(v.locator('.build-prompt')).toBeVisible();
  expect(['train7', 'n5:水']).toContain(await v.locator('[data-qid]').getAttribute('data-qid'));
  await expect(v.locator('.challenger')).toHaveCount(0);
});

test('the answer reads word by word, particles as wa / o', async ({ page }) => {
  await page.addInitScript(() => { delete window.SpeechRecognition; delete window.webkitSpeechRecognition; });
  await seed(page, { v: 2, items: {}, settings: { hideIosHint: true, readingHelp: 'romaji' } });
  await page.goto('./#/play/build');
  const v = view(page);
  await v.locator('[data-act=learnnew]').click();
  const s = await page.evaluate(async () => {
    const P = await import('./js/practice-data.js');
    return P.BUILD_SENTENCES.find((x) => x.id === document.querySelector('#view [data-qid]').dataset.qid);
  });
  // Match tiles by their text without the romaji over it (word-spaced romaji splits a tile like しょうぶします).
  for (const t of s.tiles) {
    const i = await v.locator('.bank [data-act=tile]').evaluateAll((els, want) => els.findIndex((el) => {
      const c = el.cloneNode(true);
      c.querySelectorAll('rt').forEach((r) => r.remove());
      return c.textContent.trim() === want;
    }), t);
    await v.locator('.bank [data-act=tile]').nth(i).click();
  }
  await v.locator('[data-act=check]').click();
  await expect(v.locator('.build-answer')).toBeVisible();
  const text = await plainText(v.locator('.build-answer'));
  if (!/\s/.test(s.say)) expect(text.split(' ').length).toBeGreaterThan(1);   // spaced by word
  const rts = await v.locator('.build-answer rt').allTextContents();
  expect(rts.join(' ')).not.toMatch(/\bha\b/);   // は as a particle is "wa"
  await expect(v.locator('.bank, [data-act=tile]')).toHaveCount(0);
});

test('the mic waits for a tap on 🎤', async ({ page }) => {
  await page.addInitScript(fakeRecognizer);
  await seed(page, { v: 2, items: {}, settings: { hideIosHint: true } });
  await page.goto('./#/play/build');
  const v = view(page);
  await v.locator('[data-act=learnnew]').click();
  await v.locator('[data-act=hint]').click();
  for (let i = 0; i < 8 && await v.locator('.bank [data-act=tile]').count(); i++) await v.locator('[data-act=hint]').click();
  await v.locator('[data-act=check]').click();
  await expect(v.getByRole('button', { name: /Say it/ })).toBeVisible();
  await page.waitForTimeout(300);
  expect(await page.evaluate(() => window.__recStarts)).toBe(0);
  await v.getByRole('button', { name: /Say it/ }).click();
  await expect.poll(() => page.evaluate(() => window.__recStarts)).toBe(1);
  await expect(v.locator('#bd-heard')).toBeVisible();
});

test('with "Start the mic on its own" on, the mic starts after the model sentence', async ({ page }) => {
  await page.addInitScript(fakeRecognizer);
  await seed(page, { v: 2, items: {}, settings: { hideIosHint: true, autoMic: true } });
  await page.goto('./#/play/build');
  const v = view(page);
  await v.locator('[data-act=learnnew]').click();
  for (let i = 0; i < 9 && await v.locator('.bank [data-act=tile]').count(); i++) await v.locator('[data-act=hint]').click();
  await v.locator('[data-act=check]').click();
  await expect.poll(() => page.evaluate(() => window.__recStarts), { timeout: 15_000 }).toBe(1);
  await expect(v.locator('#bd-heard')).toBeVisible();
  await expect(v.getByRole('button', { name: /Say it/ })).toHaveCount(0);
});

test('the Settings switch turns the auto-start mic on and off', async ({ page }) => {
  await page.goto('./#/settings');
  const sw = page.locator('[data-act=automic]');
  await expect(sw).not.toBeChecked();
  await sw.check();
  expect(await page.evaluate(async () => (await import('./js/store.js')).store.settings.autoMic)).toBe(true);
  await sw.uncheck();
  expect(await page.evaluate(async () => (await import('./js/store.js')).store.settings.autoMic)).toBe(false);
});

test('decoy particles: more at higher levels, never one that could also be right', async ({ page }) => {
  await page.goto('./');
  const r = await page.evaluate(async () => {
    const { decoysFor } = await import('./js/modes/build.js');
    const { BUILD_SENTENCES } = await import('./js/practice-data.js');
    const out = { counts: {}, clashes: [] };
    for (const s of BUILD_SENTENCES) {
      const d = decoysFor(s);
      const lv = s.level || 'N5';
      out.counts[lv] = Math.max(out.counts[lv] || 0, d.length);
      const has = new Set(s.tiles);
      for (const p of d) {
        if (has.has(p) || (['は', 'が', 'も'].includes(p) && s.tiles.some((t) => ['は', 'が', 'も'].includes(t)))) out.clashes.push(`${s.id}: ${p}`);
      }
    }
    return out;
  });
  expect(r.counts.N5).toBe(1);
  if (r.counts.N4 != null) expect(r.counts.N4).toBe(2);
  expect(r.clashes).toEqual([]);
});

test('a sentence can be checked with a decoy tile left over', async ({ page }) => {
  await page.goto('./#/play/build');
  const v = view(page);
  if (await v.locator('[data-act=learnnew]').count()) await v.locator('[data-act=learnnew]').click();
  for (let i = 0; i < 9; i++) await v.locator('[data-act=hint]').click();
  await expect(v.locator('.bank [data-act=tile]')).toHaveCount(1);   // the decoy
  await v.locator('[data-act=check]').click();
  await expect(v.getByText(/Built \(with a hint\)/)).toBeVisible();
});
