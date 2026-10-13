// Exam readiness (js/readiness.js) and the mock JLPT (js/exam-data.js, js/exam.js): the question bank and scoring
// (run in Node), the readiness meter on Today and Progress, "ready for a mock", marking the real test, taking a mini
// and a timed full mock, misses going into the Garden, and the v8 → v9 migration and sync merge.
import { readFileSync } from 'node:fs';
import { test, expect, seed, saved, view, expectNoHorizontalScroll } from './helpers.js';
import { buildMock, scoreMock, mockIds, nearMisses, BANK, FORMATS } from '../js/exam-data.js';
import { CLIPS } from '../js/clips.js';

const FIXTURE_V8 = JSON.parse(readFileSync(new URL('./fixtures/progress-v8.json', import.meta.url), 'utf8'));

/** A repeatable random number generator, so the bank tests don't depend on luck. */
function seeded(n = 1) {
  return () => { n = (n * 16807) % 2147483647; return (n - 1) / 2147483646; };
}

test.describe('question bank and scoring (js/exam-data.js, run in Node)', () => {
  test('a mock has every part, right answers among distinct options, and a clip for every spoken line', () => {
    for (const format of ['mini', 'full']) {
      for (let k = 1; k <= 5; k++) {
        const m = buildMock({ format, rand: seeded(k) });
        expect(m.sections.map((s) => s.id)).toEqual(['vocab', 'grammar', 'listening']);
        expect(m.timed).toBe(format === 'full');
        const qs = m.sections.flatMap((s) => s.questions);
        expect(new Set(qs.map((q) => q.part))).toEqual(new Set(['vocab', 'grammar', 'reading', 'listening']));
        for (const q of qs) {
          expect(q.options.length, q.id).toBeGreaterThanOrEqual(2);
          expect(q.options.length, q.id).toBeLessThanOrEqual(4);
          expect(new Set(q.options).size, q.id).toBe(q.options.length);
          expect(q.options, q.id).toContain(q.answer);
          for (const line of q.say || []) expect(CLIPS[`${line.text}#${line.voice}`] || CLIPS[`${line.text}#0`], `${q.id}: ${line.text}`).toBeTruthy();
        }
      }
    }
    const full = buildMock({ format: 'full', rand: seeded(3) });
    expect(full.sections.map((s) => s.minutes)).toEqual([20, 40, 30]);
    expect(full.sections.flatMap((s) => s.questions).length).toBeGreaterThan(55);
  });

  test('the next mock picks questions not seen in the last one', () => {
    const a = buildMock({ format: 'full', rand: seeded(7) });
    const b = buildMock({ format: 'full', rand: seeded(8), seen: mockIds(a) });
    const ia = new Set(mockIds(a));
    const shared = mockIds(b).filter((id) => ia.has(id));
    expect(shared.length / mockIds(b).length).toBeLessThan(0.25);
    expect(BANK.read + BANK.spell + BANK.context).toBeGreaterThan(600);
  });

  test('wrong readings are one slip away: long vowels, voicing, small っ and ゃゅょ', () => {
    const m = nearMisses('がっこう');
    expect([...m.keys()]).toEqual(expect.arrayContaining(['かっこう', 'がこう', 'がっこ']));
    expect(m.has('がっこうう')).toBe(false);
    expect([...nearMisses('しゃしん').keys()]).toEqual(expect.arrayContaining(['しやしん', 'じゃしん']));
    expect(nearMisses('きょう').get('きょ')).toBe('long');
  });

  test('scored like the real N5: 120 + 60, pass at 80 with section minimums', () => {
    const m = buildMock({ format: 'mini', rand: seeded(2) });
    const qs = m.sections.flatMap((s) => s.questions);
    const all = Object.fromEntries(qs.map((q, i) => [i, q.answer]));
    expect(scoreMock(m, all)).toMatchObject({ lk: 120, li: 60, total: 180, pass: true });
    expect(scoreMock(m, {})).toMatchObject({ total: 0, pass: false });
    // Everything right except listening: well over 80 in total, but under the listening minimum, so not a pass.
    const noListening = Object.fromEntries(qs.map((q, i) => [i, q.part === 'listening' ? null : q.answer]));
    const r = scoreMock(m, noListening);
    expect(r.total).toBeGreaterThanOrEqual(80);
    expect(r.li).toBe(0);
    expect(r.pass).toBe(false);
    expect(FORMATS.full.sections.map((s) => s.minutes)).toEqual([20, 40, 30]);
  });
});

/** Progress that meets every N5 readiness target. */
async function readyState(page) {
  await page.goto('./');
  const st = await page.evaluate(async () => {
    const { N5_WORDS } = await import('./js/data.js');
    const { LESSONS, ALL_LESSONS } = await import('./js/dojo-data.js');
    const { TEACHABLE_KANJI } = await import('./js/readiness.js');
    const { N5_GRAMMAR_KEYS } = await import('./js/exam-data.js');
    const { dateKey } = await import('./js/store.js');
    const now = Date.now();
    const item = (level) => ({ level, due: now + 9e8, best: 0, r: 3, pl: now - 9e9, s: 20, d: 5, lr: now - 1e8 });
    const items = {};
    N5_WORDS.slice(0, 560).forEach((w) => { items[w.id] = item(2); });
    TEACHABLE_KANJI.forEach((k) => { items['kj:' + k] = item(2); });
    LESSONS.flatMap((l) => l.chars).forEach((c) => { items['kana:' + c.k] = item(3); });
    const grammar = {};
    N5_GRAMMAR_KEYS.forEach((k, i) => { grammar[k] = { due: now + 9e8, s: 10, d: 5, lr: now - 1e8, r: 3, pl: i + 1 }; });
    const tally = { [dateKey()]: { listening: [45, 50] } };
    localStorage.clear();
    return { v: 8, items, chapters: ['ch1', 'ch2', 'ch3', 'ch4', 'ch5', 'ch6'], forged: [], dojo: ALL_LESSONS.map((l) => l.id), storyReplays: {},
      settings: { hideIosHint: true }, days: {}, grammar, engine: { tally, recent: {}, mastery: {}, placement: null, placementSkip: true, checkin: '' } };
  });
  await page.goto('about:blank');
  return st;
}

test.describe('readiness meter', () => {
  test('a new learner sees the road to N5 at 0% with the next thing to grow, and no "ready" yet', async ({ page }) => {
    await page.goto('./');
    const card = view(page).locator('.road-card');
    await expect(card.getByRole('heading', { name: 'Road to N5' })).toBeVisible();
    await expect(card).toContainText('0%');
    await expect(card).toContainText('Next to grow');
    await expect(card).not.toContainText('ready for a mock');
    await page.goto('./#/progress');
    await expect(view(page).getByRole('heading', { name: 'Road to JLPT N5' })).toBeVisible();
    await expect(view(page).locator('.road svg.chart')).toHaveAttribute('aria-label', /Vocabulary 0\/515/);
    await expectNoHorizontalScroll(page);
  });

  test('once every area meets its target, Today says it is ready for a mock; Later quiets it for a week', async ({ page }) => {
    await seed(page, await readyState(page));
    await page.goto('./');
    const card = view(page).locator('.road-card');
    await expect(card).toContainText('You look ready for a mock N5.');
    await expect(card.getByRole('link', { name: 'Take a mock' })).toHaveAttribute('href', '#/exam');
    await expectNoHorizontalScroll(page);
    await card.getByRole('button', { name: 'Later' }).click();
    await expect(view(page).locator('.road-card')).toContainText('Ready for a mock N5 whenever you are.');
    const later = (await saved(page)).exam.later.N5;
    expect(later > new Date().toISOString().slice(0, 10)).toBe(true);
    await page.goto('./#/progress');
    await expect(view(page).locator('.road')).toContainText('Ready for a mock N5.');
  });

  test('marking the real N5 as passed moves the road on to N4, and it can be undone', async ({ page }) => {
    await page.goto('./#/progress');
    await view(page).getByRole('button', { name: 'I passed the real N5' }).click();
    await view(page).getByRole('button', { name: 'Yes, I passed it' }).click();
    await expect(view(page).getByRole('heading', { name: 'Road to JLPT N4' })).toBeVisible();
    await expect(view(page).locator('.road')).toContainText('still to come');
    expect((await saved(page)).exam.real.N5.on).toBe(true);
    await page.goto('./');
    await expect(view(page).locator('.road-card')).toContainText('Road to N4');
    await page.goto('./#/progress');
    await view(page).getByRole('button', { name: 'Undo' }).click();
    await expect(view(page).getByRole('heading', { name: 'Road to JLPT N5' })).toBeVisible();
  });
});

/** Goes through the mock on screen answering "I don't know" to everything. */
async function skipAll(page) {
  const v = view(page);
  for (let k = 0; k < 120; k++) {
    const begin = v.locator('[data-act=begin]');
    if (await begin.count()) { await begin.click(); continue; }
    if (!(await v.locator('[data-act=pick]').count())) return;
    await v.getByRole('button', { name: "I don't know" }).click();
  }
}

test.describe('mock exam', () => {
  test('a mini mock: no answers along the way, then the score, each part and every miss, which go into the Garden', async ({ page }) => {
    await page.goto('./#/exam');
    const v = view(page);
    await expect(v.getByRole('heading', { name: 'Mock JLPT N5' })).toBeVisible();
    await expectNoHorizontalScroll(page);
    await v.getByRole('button', { name: 'Start the mini mock' }).click();
    await expect(v.getByRole('heading', { name: 'Vocabulary' })).toBeVisible();
    await v.locator('[data-act=begin]').click();
    // Vocabulary has no reading help; there's no clock in a mini mock.
    await expect(v.locator('.exam[data-noruby]')).toHaveCount(1);
    await expect(v.locator('#ex-clock')).toHaveCount(0);
    await expectNoHorizontalScroll(page);
    await skipAll(page);
    await expect(v.getByRole('heading', { name: /Not yet/ })).toBeVisible();
    await expect(v.getByText('The pass line is 80.')).toBeVisible();
    await expect(v.locator('.exam-miss').first()).toBeVisible();
    await expectNoHorizontalScroll(page);
    const s = await saved(page);
    expect(s.v).toBe(10);
    expect(s.exam.history).toHaveLength(1);
    expect(s.exam.history[0]).toMatchObject({ level: 'N5', format: 'mini', total: 0, pass: false });
    expect(s.exam.seen.length).toBeGreaterThan(10);
    // Misses come back in the Garden: their N5 words are planted, their grammar points get cards.
    expect(Object.keys(s.items).some((id) => id.startsWith('n5:'))).toBe(true);
    expect(Object.keys(s.grammar).length).toBeGreaterThan(0);
    await page.goto('./#/progress');
    await expect(view(page).locator('.mock-list')).toContainText('Mini mock');
  });

  test('a full mock is timed per part, pauses, and moves on when time is up', async ({ page }) => {
    await page.clock.install();
    await page.goto('./#/exam');
    const v = view(page);
    await v.getByRole('button', { name: 'Start the full mock' }).click();
    await v.locator('[data-act=begin]').click();
    await expect(v.locator('#ex-clock')).toHaveText('20:00');
    await page.clock.runFor(61_000);
    await expect(v.locator('#ex-clock')).toHaveText('18:59');
    await v.getByRole('button', { name: 'Pause' }).click();
    await expect(v.getByRole('heading', { name: 'Paused' })).toBeVisible();
    await expect(v.locator('[data-act=pick]')).toHaveCount(0);
    await page.clock.runFor(120_000);
    await v.getByRole('button', { name: 'Resume' }).click();
    await expect(v.locator('#ex-clock')).toHaveText('18:59');
    // Time runs out on the vocabulary part: it moves on, and says why.
    await page.clock.runFor(19 * 60_000);
    await expect(v.getByText(/Time's up for that part/)).toBeVisible();
    await expect(v.getByRole('heading', { name: 'Grammar and reading' })).toBeVisible();
    await expectNoHorizontalScroll(page);
  });

  test('passing a full mock finishes N5: the road moves on to N4', async ({ page }) => {
    // A full mock with every answer right, recorded the way the screen records it.
    await page.goto('./#/exam');
    await page.evaluate(async () => {
      const { store } = await import('./js/store.js');
      const { buildMock, scoreMock, mockIds } = await import('./js/exam-data.js');
      const m = buildMock({ format: 'full' });
      const ans = {};
      let i = 0;
      for (const s of m.sections) for (const q of s.questions) ans[i++] = q.answer;
      store.recordMock({ level: 'N5', format: 'full', ...scoreMock(m, ans) }, mockIds(m));
    });
    await page.goto('./#/progress');
    await expect(view(page).getByRole('heading', { name: 'Road to JLPT N4' })).toBeVisible();
    await expect(view(page).locator('.road')).toContainText('N5 done (Full mock');
    await page.goto('./');
    await expect(view(page).locator('.road-card')).toContainText('Road to N4');
    await expect(view(page).locator('.road-card')).not.toContainText('Road to N5');
  });
});

test.describe('saved progress v8 → v9', () => {
  test('the v8 fixture loads with nothing lost and no mock results yet', async ({ page }) => {
    await seed(page, FIXTURE_V8);
    await page.goto('./');
    const s = await saved(page);
    expect(s.v).toBe(10);
    expect(s.exam).toEqual({ history: [], real: {}, seen: [], later: {} });
    expect(s.settings).toEqual({ ...FIXTURE_V8.settings, autoMic: false });
    for (const k of ['items', 'grammar', 'days', 'chapters', 'forged', 'dojo', 'saga', 'course', 'engine', 'coach']) expect(s[k], k).toEqual(FIXTURE_V8[k]);
  });

  test('sync keeps mock results from both devices once each, the latest real-test mark, and the later "Later"', async ({ page }) => {
    await page.goto('./');
    const r = await page.evaluate(async () => {
      const { mergeProgress } = await import('./js/store.js');
      const h = (at, format, total, pass) => ({ level: 'N5', format, at, lk: total - 30, li: 30, total, pass, ok: 10, n: 20, parts: { vocab: [5, 10] } });
      const phone = { v: 9, items: {}, exam: { history: [h(1000, 'mini', 70, false), h(3000, 'full', 95, true)], real: { N5: { on: true, at: 500 } }, seen: ['a', 'b'], later: { N5: '2026-10-20' } } };
      const pc = { v: 9, items: {}, exam: { history: [h(1000, 'mini', 70, false), h(2000, 'mini', 88, true)], real: { N5: { on: false, at: 900 } }, seen: ['b', 'c'], later: { N5: '2026-10-15' } } };
      const old = { v: 8, items: {} };
      return { m: mergeProgress(phone, pc), again: mergeProgress(mergeProgress(phone, pc), pc), old: mergeProgress(phone, old) };
    });
    expect(r.m.exam.history.map((x) => x.at)).toEqual([1000, 2000, 3000]);
    expect(r.m.exam.real.N5).toEqual({ on: false, at: 900 });
    expect(r.m.exam.seen.slice().sort()).toEqual(['a', 'b', 'c']);
    expect(r.m.exam.later.N5).toBe('2026-10-20');
    expect(r.again.exam).toEqual(r.m.exam);
    expect(r.old.exam.history).toHaveLength(2);
  });
});
