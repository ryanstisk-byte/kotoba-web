// The learning engine: the FSRS-style scheduler, the skill model, difficulty targeting, the v3 migration,
// the placement check, the weekly check-in and the Progress charts.
import { readFileSync } from 'node:fs';
import { test, expect, seed, saved, readerState, view, expectNoHorizontalScroll } from './helpers.js';
import * as srs from '../js/srs.js';
import * as skills from '../js/skills.js';
import * as tuning from '../js/tuning.js';

const FIX = (v) => JSON.parse(readFileSync(new URL(`./fixtures/progress-v${v}.json`, import.meta.url), 'utf8'));
const DAY = 86_400_000;
const SKILLS = ['kana', 'kanji', 'vocab', 'grammar', 'listening', 'pitch', 'speaking', 'counters'];

test.describe('scheduler (js/srs.js, run in Node)', () => {
  test('retrievability follows (1 + t/9S)^-1 and an item is due when it reaches 90%', () => {
    expect(srs.retrievability(0, 5)).toBe(1);
    expect(srs.retrievability(5, 5)).toBeCloseTo(0.9, 10);
    expect(srs.retrievability(45, 5)).toBeCloseTo(0.5, 10);
    expect(srs.intervalDays(5)).toBeCloseTo(5, 10);            // at 90% target retention the interval equals S
    expect(srs.intervalDays(5, 0.8)).toBeGreaterThan(5);       // a lower target spaces reviews further out
    expect(srs.TARGET_RETENTION).toBe(0.9);
  });

  test('intervals grow with each success', () => {
    let card = { s: 0, d: 0, lr: 0 };
    let now = Date.UTC(2026, 9, 1);
    const gaps = [];
    for (let i = 0; i < 5; i++) {
      card = srs.review(card, srs.GOOD, now);
      gaps.push((card.due - now) / DAY);
      now = card.due;   // reviewed exactly when due, so R = 90%
    }
    expect(gaps[0]).toBe(2);                    // first right answer: S = 2.4 days
    for (let i = 1; i < gaps.length; i++) expect(gaps[i]).toBeGreaterThan(gaps[i - 1]);
    expect(srs.retrievability((card.due - card.lr) / DAY, card.s)).toBeCloseTo(0.9, 1);
  });

  test('a miss shrinks stability, raises difficulty and is due right away', () => {
    const now = Date.UTC(2026, 9, 1);
    const card = { s: 20, d: 5, lr: now - 20 * DAY };
    const miss = srs.review(card, srs.AGAIN, now);
    expect(miss.s).toBeLessThan(card.s);
    expect(miss.d).toBeGreaterThan(card.d);
    expect(miss.due).toBe(now);
    const pass = srs.review(card, srs.GOOD, now);
    expect(pass.s).toBeGreaterThan(card.s);
    expect(srs.review(card, srs.EASY, now).s).toBeGreaterThan(pass.s);
  });

  test('a success after a long gap boosts stability more than one on time (no backlog penalty)', () => {
    const now = Date.UTC(2026, 9, 1);
    const onTime = srs.review({ s: 4, d: 5, lr: now - 4 * DAY }, srs.GOOD, now);
    const late = srs.review({ s: 4, d: 5, lr: now - 40 * DAY }, srs.GOOD, now);
    expect(late.s).toBeGreaterThan(onTime.s);
    // Reviewing again the same day changes almost nothing.
    const again = srs.review(onTime, srs.GOOD, now + 60_000);
    expect(again.s).toBeCloseTo(onTime.s, 1);
  });

  test('ok/miss map to grades, and growth stages match the old levels', () => {
    expect(srs.gradeOf(true)).toBe(srs.GOOD);
    expect(srs.gradeOf(false)).toBe(srs.AGAIN);
    expect(srs.gradeOf(true, { easy: true })).toBe(srs.EASY);
    for (let lv = 0; lv <= 6; lv++) expect(srs.stageOf(srs.legacyStability(lv))).toBe(lv);
    expect(srs.stageOf(srs.initialStability(srs.GOOD))).toBe(1);
  });

  test('migrating an item keeps level, due, best, reviews and planted time', () => {
    const p = { level: 4, due: 1791000000000, best: 0.5, r: 6, pl: 1789000000000 };
    const m = srs.migrateItem(p);
    expect(m).toEqual(expect.objectContaining(p));
    expect(m.s).toBe(7);                         // the old level-4 interval
    expect(m.d).toBe(5);                         // a middle difficulty
    expect(m.lr).toBe(p.due - 7 * DAY);          // last review estimated from the due date
    expect(srs.migrateItem(m)).toEqual(m);       // idempotent
  });
});

test.describe('skill model and tuning (run in Node)', () => {
  test('first tries feed daily tallies, recent results and item mastery; retries do not', () => {
    const e = skills.blankEngine();
    skills.recordGrade(e, { skill: 'kana', id: 'kana:あ', ok: true }, '2026-10-09');
    skills.recordGrade(e, { skill: 'kana', id: 'kana:い', ok: false }, '2026-10-09');
    skills.recordGrade(e, { skill: 'kana', id: 'kana:い', ok: true, firstTry: false }, '2026-10-09');
    expect(e.tally['2026-10-09'].kana).toEqual([1, 2]);
    expect(e.recent.kana).toBe('10');
    expect(e.mastery['kana|kana:あ'][0]).toBeGreaterThan(e.mastery['kana|kana:い'][0]);
    for (let i = 0; i < 30; i++) skills.recordGrade(e, { skill: 'vocab', ok: true }, '2026-10-09');
    expect(e.recent.vocab).toHaveLength(20);
  });

  test('old tallies and the least recent items are pruned', () => {
    const e = skills.blankEngine();
    skills.recordGrade(e, { skill: 'pitch', ok: true }, '2026-07-01');
    skills.recordGrade(e, { skill: 'pitch', ok: true }, '2026-10-09');
    expect(Object.keys(e.tally)).toEqual(['2026-10-09']);
    for (let i = 0; i < skills.MASTERY_MAX + 20; i++) skills.recordGrade(e, { skill: 'vocab', id: 'w' + i, ok: true }, '2026-10-09');
    expect(Object.keys(e.mastery).length).toBe(skills.MASTERY_MAX);
  });

  test('ISO weeks', () => {
    expect(skills.isoWeek(new Date(2026, 9, 9))).toBe('2026-W41');
    expect(skills.isoWeek(new Date(2026, 9, 5))).toBe('2026-W41');   // Monday
    expect(skills.isoWeek(new Date(2026, 9, 4))).toBe('2026-W40');   // Sunday
    expect(skills.isoWeek(new Date(2027, 0, 1))).toBe('2026-W53');
  });

  test('new words per day never exceed 5 and drop while vocabulary accuracy is low', () => {
    const e = skills.blankEngine();
    expect(tuning.newPerDay(e)).toBe(5);
    expect(tuning.newPerDay(e, { pace: 'less' })).toBe(3);
    e.recent.vocab = '1'.repeat(20);
    expect(tuning.newPerDay(e)).toBe(5);
    e.recent.vocab = '1111100000';
    expect(tuning.newPerDay(e)).toBe(3);
    e.recent.vocab = '1111111000';   // 70%
    expect(tuning.newPerDay(e)).toBe(4);
  });

  test('speed and hints follow recent accuracy, gently', () => {
    const e = skills.blankEngine();
    expect(tuning.rhythmSpeed(e)).toBe(1);   // not enough data: no change
    e.recent.speaking = '1010101010';
    expect(tuning.rhythmSpeed(e)).toBe(0.85);
    expect(tuning.sliceSpawn(e)).toBe(4.0);
    e.recent.speaking = '1'.repeat(20);
    expect(tuning.rhythmSpeed(e)).toBe(1.1);
    e.recent.kanji = '10100000';
    expect(tuning.earlyHint(e, 'kanji')).toBe(true);
    expect(tuning.earlyHint(e, 'grammar')).toBe(false);
  });
});

/** Every original field of every item is unchanged, and the rest of the progress too. */
function expectKept(before, after) {
  for (const [id, p] of Object.entries(before.items)) expect(after.items[id], id).toEqual(expect.objectContaining(p));
  expect(Object.keys(after.items).sort()).toEqual(Object.keys(before.items).sort());
  expect(after.chapters).toEqual(before.chapters);
  expect(after.forged).toEqual(before.forged);
  expect(after.dojo).toEqual(before.dojo);
  expect(after.storyReplays).toEqual(before.storyReplays);
  expect(after.settings).toEqual(expect.objectContaining(before.settings));
  for (const [k, d] of Object.entries(before.days)) expect(after.days[k], `day ${k}`).toEqual(d);
}

const parse = (page, blob) => page.evaluate(async (b) => (await import('./js/store.js')).store.parseImport(JSON.stringify(b)), blob);

test.describe('migration to v3', () => {
  for (const v of [1, 2]) {
    test(`a v${v} blob migrates to v3 with nothing lost`, async ({ page }) => {
      const before = FIX(v);
      await page.goto('./');
      const out = await parse(page, before);
      expect(out.v).toBeGreaterThanOrEqual(3);   // v3 = engine; later versions add more
      expectKept(before, out);
      expect(out.items.arigatou).toEqual(expect.objectContaining({ s: 7, d: 5, lr: before.items.arigatou.due - 7 * DAY }));
      expect(out.items.konnichiwa).toEqual(expect.objectContaining({ s: 0, lr: 0 }));   // never reviewed
      expect(out.settings.pace).toBe('normal');
      expect(out.engine).toEqual({ tally: {}, recent: {}, mastery: {}, placement: null, placementSkip: false, checkin: '' });
    });

    test(`a v${v} blob in storage is saved back as v3 and keeps its growth stages`, async ({ page }) => {
      const before = FIX(v);
      await seed(page, before);
      await page.goto('./#/garden');
      await expect(view(page).locator('.plant').first()).toBeVisible();
      const s = await saved(page);
      expect(s.v).toBeGreaterThanOrEqual(3);
      expectKept(before, s);
    });
  }

  test('a v3 blob loads unchanged (import, load and save); later versions only add their own blocks', async ({ page }) => {
    const fx = FIX(3);
    await page.goto('./');
    const out = await parse(page, fx);
    expect(out.v).toBeGreaterThanOrEqual(3);
    const v3 = { ...fx, v: out.v };
    expect(out).toEqual(expect.objectContaining(v3));
    expect(out.saga).toEqual({ mined: [], seq: 0, quiz: {}, challenge: {} });
    await page.goto('about:blank');
    await seed(page, fx);
    await page.goto('./#/progress');
    await expect(view(page).locator('svg.chart').first()).toBeVisible();
    const s = await saved(page);
    expect({ ...s, lastSession: v3.lastSession }).toEqual(expect.objectContaining(v3));
  });
});

test.describe('store with the engine', () => {
  test('grade() keeps per-skill tallies and still emits every event', async ({ page }) => {
    await page.clock.setFixedTime(new Date('2026-10-09T12:00:00'));
    await page.goto('./');
    const r = await page.evaluate(async () => {
      const { store } = await import('./js/store.js');
      const events = [];
      const off = store.onGrade((e) => events.push(e));
      store.grade({ skill: 'counters', id: 'hon:3', ok: true });
      store.grade({ skill: 'counters', id: 'hon:3', ok: false });
      store.grade({ skill: 'counters', id: 'hon:3', ok: true, firstTry: false });
      store.grade({ skill: 'nonsense', ok: true });
      off();
      return { events: events.length, tally: store.engine.tally, m: store.engine.mastery['counters|hon:3'], days: store.skillDays('2026-10-09', '2026-10-09').counters };
    });
    expect(r.events).toBe(3);
    expect(r.tally).toEqual({ '2026-10-09': { counters: [1, 2] } });
    expect(r.m[1]).toBe(2);
    expect(r.days).toEqual({ ok: 1, tot: 2, rate: 0.5 });
    expect((await saved(page)).engine.tally['2026-10-09'].counters).toEqual([1, 2]);
  });

  test('a garden review schedules with stability and difficulty, and a pass grows one stage', async ({ page }) => {
    await page.clock.setFixedTime(new Date('2026-10-09T12:00:00'));
    await seed(page, { v: 2, items: { ohayou: { level: 3, due: 0, best: 0, r: 4, pl: 1 } } });
    await page.goto('./');
    const p = await page.evaluate(async () => {
      const { store } = await import('./js/store.js');
      store.recordReview('ohayou', true);
      return store.item('ohayou');
    });
    expect(p.level).toBe(4);
    expect(p.s).toBeGreaterThan(4);
    expect(p.lr).toBe(Date.parse('2026-10-09T12:00:00'));
    expect(p.due).toBe(p.lr + Math.round(p.s) * DAY);
  });

  test('low vocabulary accuracy lowers the new words in the daily queue; caps stay', async ({ page }) => {
    await page.clock.setFixedTime(new Date('2026-10-09T12:00:00'));
    await seed(page, { v: 3, items: {}, engine: { recent: { vocab: '1100110011' } } });
    await page.goto('./');
    const q = await page.evaluate(async () => {
      const { store } = await import('./js/store.js');
      const low = store.dailyGardenQueue(20).queue.length;
      store.engine.recent.vocab = '1'.repeat(20);
      const high = store.dailyGardenQueue(20).queue.length;
      store.s.settings.pace = 'less';
      const less = store.dailyGardenQueue(20).queue.length;
      return { low, high, less };
    });
    expect(q).toEqual({ low: 3, high: 5, less: 3 });
  });
});

test.describe('placement check', () => {
  test('offered once on Today; knowing two rows clears them and seeds their kana; "Not yet" skips the rest', async ({ page }) => {
    await page.goto('./#/');
    const card = view(page).locator('.engine-card', { hasText: 'Know some kana' });
    await expect(card).toBeVisible();
    await expectNoHorizontalScroll(page);
    await card.getByRole('link', { name: /quick check/ }).click();
    await expect(page.locator('#title')).toHaveText('Quick check');
    const answers = await page.evaluate(async () => Object.fromEntries((await import('./js/dojo-data.js')).LESSONS.flatMap((l) => l.chars.map((c) => [c.k, c.r]))));
    await view(page).getByRole('button', { name: 'Start' }).click();
    const v = view(page);
    for (let i = 0; i < 4; i++) {   // rows 1-2: right
      const k = await v.locator('.placement-k').innerText();
      await v.getByRole('button', { name: answers[k], exact: true }).click();
    }
    await expectNoHorizontalScroll(page);
    for (let i = 0; i < 4; i++) {   // rows 3-4: not yet. Each miss shows the answer.
      await v.getByRole('button', { name: "I don't know" }).click();
      await expect(v.locator('.placement-reveal')).toBeVisible();
      await v.getByRole('button', { name: 'Next' }).click();
    }
    await expect(v.getByText('Do you know any katakana or kanji yet?')).toBeVisible();
    await v.getByRole('button', { name: 'Not yet' }).click();
    await expect(v.getByText(/You already know 2 lessons/)).toBeVisible();
    const s = await saved(page);
    expect(s.dojo).toEqual(['h1', 'h2']);
    expect(s.items['kana:あ']).toEqual(expect.objectContaining({ level: 2, s: 3, r: 1 }));
    expect(s.items['kana:さ']).toBeUndefined();
    expect(s.engine.placement.lessons).toEqual(['h1', 'h2']);
    await v.getByRole('button', { name: 'Back to Today' }).click();
    await expect(page.locator('#today-h')).toBeVisible();
    await expect(view(page).locator('.engine-card', { hasText: 'Know some kana' })).toHaveCount(0);
  });

  test('never un-clears a lesson or overwrites a learned character', async ({ page }) => {
    await seed(page, { v: 2, items: { 'kana:か': { level: 5, due: 5, best: 0, r: 9, pl: 1 } }, dojo: ['h5', 'h2'] });
    await page.goto('./#/placement');
    await view(page).getByRole('button', { name: 'Start' }).click();
    await view(page).getByRole('button', { name: 'Stop here' }).click();
    await view(page).getByRole('button', { name: 'Not yet' }).click();
    const s = await saved(page);
    expect(s.dojo).toEqual(['h5', 'h2']);
    expect(s.items['kana:か']).toEqual(expect.objectContaining({ level: 5, due: 5, r: 9 }));
    const added = await page.evaluate(async () => (await import('./js/store.js')).store.applyPlacement(['h2', 'h3']));
    expect(added).toEqual(['h3']);
    expect((await saved(page)).items['kana:か'].level).toBe(5);
  });

  test('"Not now" hides the card; Settings still offers the check', async ({ page }) => {
    await page.goto('./#/');
    await view(page).getByRole('button', { name: 'Not now' }).click();
    await expect(view(page).locator('.engine-card')).toHaveCount(0);
    expect((await saved(page)).engine.placementSkip).toBe(true);
    await page.goto('./#/settings');
    await expect(view(page).getByRole('link', { name: /Placement check/ })).toBeVisible();
  });
});

test.describe('weekly check-in', () => {
  const day = (ok, tot) => ({ ok, tot, rev: 0, newc: 0, studied: true, blocks: {} });

  test('shows once per ISO week with a suggestion from last week\'s accuracy, and one tap applies it', async ({ page }) => {
    await page.clock.setFixedTime(new Date('2026-10-07T10:00:00'));   // Wednesday of week 41
    const state = await readerState(page, { days: { '2026-09-29': day(6, 12), '2026-10-02': day(5, 8), '2026-09-27': day(30, 30) } });
    await seed(page, state);
    await page.goto('./#/');
    const card = view(page).locator('.checkin');
    await expect(card).toBeVisible();
    await expect(card).toContainText('Last week: 55% right');
    await expect(card).toContainText('20 answers over 2 days');
    await expectNoHorizontalScroll(page);
    await card.getByRole('button', { name: 'Switch to Short days' }).click();
    await expect(view(page).locator('.checkin')).toHaveCount(0);
    const s = await saved(page);
    expect(s.settings.length).toBe('short');
    expect(s.engine.checkin).toBe('2026-W41');
    await page.reload();
    await expect(view(page).locator('.block-row').first()).toBeVisible();
    await expect(view(page).locator('.checkin')).toHaveCount(0);
  });

  test('a high-accuracy week on Short days suggests Standard; a quiet week shows nothing', async ({ page }) => {
    await page.clock.setFixedTime(new Date('2026-10-14T10:00:00'));   // week 42
    const state = await readerState(page, { settings: { length: 'short', hideIosHint: true },
      engine: { checkin: '2026-W41' }, days: { '2026-10-06': day(29, 30) } });
    await seed(page, state);
    await page.goto('./#/');
    const card = view(page).locator('.checkin');
    await expect(card).toContainText('97% right');
    await card.getByRole('button', { name: 'Switch to Standard days' }).click();
    expect((await saved(page)).settings.length).toBe('standard');

    await page.clock.setFixedTime(new Date('2026-10-21T10:00:00'));   // week 43: nothing last week
    await page.reload();
    await expect(view(page).locator('.block-row').first()).toBeVisible();
    await expect(view(page).locator('.checkin')).toHaveCount(0);
  });
});

test.describe('Progress screen', () => {
  test('draws readable SVG charts with text alternatives that fit the screen', async ({ page }) => {
    await page.clock.setFixedTime(new Date('2026-10-09T12:00:00'));
    const v3 = FIX(3);
    const tally = {};
    for (let i = 0; i < 28; i += 2) {
      const d = new Date(2026, 9, 9 - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      tally[key] = { kana: [8 + (i % 3), 10], vocab: [7, 9], grammar: [4, 6] };
    }
    await seed(page, { ...v3, settings: { ...v3.settings, theme: 'auto' }, engine: { ...v3.engine, tally } });
    await page.goto('./#/progress');
    const charts = view(page).locator('svg.chart');
    await expect(charts).toHaveCount(4);
    for (let i = 0; i < 4; i++) {
      await expect(charts.nth(i)).toHaveAttribute('role', 'img');
      await expect(charts.nth(i)).toHaveAttribute('aria-label', /.{20,}/);
    }
    await expect(charts.first()).toHaveAttribute('aria-label', /Kana \d+% \(\d+\)/);
    await expect(charts.first().locator('title').first()).toContainText('right on the first try');
    await expect(view(page).getByText('JLPT N5 coverage (estimate)')).toBeVisible();
    await expect(view(page).locator('.stat-grid')).toContainText('days studied this month');
    await expect(view(page).getByText(/streak/i)).toHaveText(/No streaks/);
    const vw = page.viewportSize().width;
    for (const box of await charts.evaluateAll((els) => els.map((e) => e.getBoundingClientRect().right))) expect(box).toBeLessThanOrEqual(vw);
    await expectNoHorizontalScroll(page);
  });

  test('a brand-new learner sees an empty but friendly Progress screen', async ({ page }) => {
    await page.goto('./#/progress');
    await expect(view(page).getByText('Play any mode and your accuracy per skill shows up here.')).toBeVisible();
    await expect(view(page).locator('svg.chart')).toHaveCount(2);   // kana/kanji and N5 still draw
    await expectNoHorizontalScroll(page);
  });
});
