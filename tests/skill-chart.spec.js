// Skill chart (js/skill-chart.js): the axis maths for each level, the level tabs and the "where you came from"
// outline, locked levels, the list matching the chart, the growth animation (and none with reduced motion), the
// Foundations panel, the Today card, and the layout at phone and desktop size.
import { test, expect, seed, expectNoHorizontalScroll } from './helpers.js';

const DAY = 86_400_000;
const pass = (level) => ({ level, format: 'full', pass: true, total: 130, lk: 90, li: 40, at: Date.now() - DAY });
const base = (extra = {}) => ({
  v: 12, items: {}, chapters: [], forged: [], dojo: [], storyReplays: {}, days: {},
  settings: { hideIosHint: true, readingHelp: 'off' }, exam: { history: [], real: {}, seen: [], later: {} }, ...extra,
});
const well = (skill, n) => Object.fromEntries(Array.from({ length: n }, (_, i) => [`${skill}|x${i}`, [80, 3, 20000]]));

test.describe('skill chart', () => {
  test('axis maths: counts and first-try accuracy toward each level\'s targets, with ranks', async ({ page }) => {
    const kanaItems = {};
    await page.goto('./');
    const kana = await page.evaluate(async () => (await import('./js/dojo-data.js')).LESSONS.flatMap((l) => l.chars.map((c) => c.k)));
    for (const k of kana) kanaItems['kana:' + k] = { level: 2, due: Date.now() + 9e8, best: 0, r: 2, pl: 1, s: 5, d: 5, lr: 1 };
    await page.goto('about:blank');
    await seed(page, base({
      items: kanaItems,
      engine: { tally: {}, mastery: { ...well('listening', 20), ...well('pitch', 20), ...well('speaking', 3) },
        recent: { listening: '1111111111111111111' + '0', pitch: '10101010', speaking: '1111' }, placement: null, placementSkip: true, checkin: '' },
    }));
    await page.goto('./');
    const r = await page.evaluate(async () => {
      const { axesFor, rankOf, ITEM_TARGETS } = await import('./js/skill-chart.js');
      const by = (lv) => Object.fromEntries(axesFor(lv).map((a) => [a.id, Math.round(a.value * 1000) / 1000]));
      return { n5: by('N5'), n4: by('N4'), t: ITEM_TARGETS, ranks: [0, 0.3, 0.6, 0.9].map((v) => rankOf(v).jp) };
    });
    // Kana: every kana read = 100% at N5; at N4 the aim is writing them (none drawn yet) = 0.
    expect(r.n5.kana).toBe(1);
    expect(r.n4.kana).toBe(0);
    // Listening: half items known well (20 of 40 at N5, of 100 at N4), half recent accuracy (19/20 = 95%, capped at the 80% aim).
    expect(r.n5.listening).toBeCloseTo(0.5 * (20 / 40) + 0.5, 3);
    expect(r.n4.listening).toBeCloseTo(0.5 * (20 / 100) + 0.5, 3);
    // Pitch: 20 of 20 items, 50% right of the 80% aim. Speaking: too few answers for accuracy yet, so only the items count.
    expect(r.n5.pitch).toBeCloseTo(0.5 + 0.5 * (0.5 / 0.8), 3);
    expect(r.n5.speaking).toBeCloseTo(0.5 * (3 / 30), 3);
    expect(r.ranks).toEqual(['入門', '見習い', '弟子', '師範']);
  });

  test('a new learner: N5 is the level, N4 is locked (never an empty chart), no outline behind', async ({ page }) => {
    await page.goto('./#/progress');
    const c = page.locator('.skill-chart');
    await expect(c).toHaveAttribute('data-level', 'N5');
    await expect(c.getByRole('tab', { name: /N4/ })).toBeDisabled();
    await expect(c.locator('.sc-locked')).toContainText('Unlocks when you pass a full mock N5, or mark the real N5 as passed.');
    await expect(c.locator('.sc-ghost')).toHaveCount(0);
    await expect(c.locator('.skill-radar')).toHaveAttribute('aria-label', /^Skill chart toward N5: Kana \d+%/);
    await expectNoHorizontalScroll(page);
  });

  test('once N5 is done the chart switches to N4 with N5 as a faint outline, and the N5 tab looks back', async ({ page }) => {
    await seed(page, base({ exam: { history: [pass('N5')], real: {}, seen: [], later: {} } }));
    await page.goto('./#/progress');
    const c = page.locator('.skill-chart');
    await expect(c).toHaveAttribute('data-level', 'N4');
    await expect(c.locator('.sc-ghost')).toHaveCount(1);
    await expect(c.getByText('The faint outline is N5.')).toBeVisible();
    await c.getByRole('tab', { name: /N5/ }).click();
    await expect(c).toHaveAttribute('data-level', 'N5');
    await expect(c.getByText('N5 is done: this is where you finished it.')).toBeVisible();
    await expect(c.locator('.sc-ghost')).toHaveCount(0);
    await expect(c.getByRole('link', { name: /^Train/ })).toHaveCount(0);   // looking back: no nudge
    await expectNoHorizontalScroll(page);
  });

  test('once N4 is done the chart aims at N3, with N4 as the outline, and both done tabs look back', async ({ page }) => {
    await seed(page, base({ exam: { history: [pass('N5'), pass('N4')], real: {}, seen: [], later: {} } }));
    await page.goto('./#/progress');
    const c = page.locator('.skill-chart');
    await expect(c).toHaveAttribute('data-level', 'N3');
    await expect(c.locator('.sc-ghost')).toHaveCount(1);
    await expect(c.getByText('The faint outline is N4.')).toBeVisible();
    await expect(c.locator('.sc-locked')).toHaveCount(0);
    await c.getByRole('tab', { name: /N4/ }).click();
    await expect(c).toHaveAttribute('data-level', 'N4');
    await expect(c.getByText('N4 is done: this is where you finished it.')).toBeVisible();
    await expectNoHorizontalScroll(page);
  });

  test('the list is the precise version of the chart, and an axis opens its Foundations panel', async ({ page }) => {
    await seed(page, base({ engine: { tally: {}, mastery: well('counters', 10), recent: { counters: '11111110' }, placement: null, placementSkip: true, checkin: '' } }));
    await page.goto('./#/progress');
    const c = page.locator('.skill-chart');
    const chart = (await c.locator('.sc-shape').getAttribute('data-values')).split(',').map(Number);
    const list = await c.locator('.sc-pct').evaluateAll((els) => els.map((e) => Number(e.dataset.value)));
    expect(list).toEqual(chart);
    expect(chart).toHaveLength(9);
    await c.getByRole('button', { name: /^Numbers/ }).click();
    const panel = c.locator('.sc-foundation');
    await expect(panel).toHaveAttribute('data-axis', 'counters');
    await expect(panel).toContainText('How the app builds it:');
    await expect(panel.getByRole('link', { name: 'Numbers & Time' })).toBeVisible();
    await expect(panel).toContainText('10 of 20 items answered well');
    // The strongest / weakest line names real axes, and the button opens the best mode for the weakest.
    await expect(c.locator('.sc-summary')).toContainText('Strongest: Numbers');
    const train = c.getByRole('link', { name: /^Train/ });
    expect(await train.getAttribute('href')).toMatch(/^#\//);
    await expectNoHorizontalScroll(page);
  });

  test('growth since the last visit animates and shows +%; with reduced motion it is drawn at once', async ({ page, browser }) => {
    const state = base({ engine: { tally: {}, mastery: well('pitch', 20), recent: { pitch: '11111111' }, placement: null, placementSkip: true, checkin: '' } });
    const lastVisit = { N5: { kana: 0, kanji: 0, vocab: 0, grammar: 0, listening: 0, reading: 0, speaking: 0, pitch: 0.2, counters: 0 } };
    const run = async (p) => {
      await p.addInitScript((last) => { if (!sessionStorage.getItem('chart')) { sessionStorage.setItem('chart', 1); localStorage.setItem('kotobaBeat.chart', JSON.stringify(last)); } }, lastVisit);
      await seed(p, state);
      await p.goto('./#/progress');
      const grew = await p.locator('.sc-grew').allTextContents();
      const growing = await p.locator('.skill-radar.growing').count();
      const saved = await p.evaluate(() => JSON.parse(localStorage.getItem('kotobaBeat.chart')).N5.pitch);
      return { grew, growing, saved };
    };
    const moving = await run(page);
    expect(moving.grew).toEqual(['+80%']);
    expect(moving.growing).toBe(1);
    expect(moving.saved).toBe(1);   // this visit's values are kept on this device for next time
    const ctx = await browser.newContext({ reducedMotion: 'reduce', viewport: page.viewportSize() });
    const still = await run(await ctx.newPage());
    expect(still.grew).toEqual(['+80%']);   // the text still says what grew
    expect(still.growing).toBe(0);
    await ctx.close();
  });

  test('a small version on Today opens Progress', async ({ page }) => {
    await page.goto('./');
    const mini = page.locator('.skill-mini');
    await expect(mini).toContainText('Your skills · N5');
    await expect(mini.locator('svg.skill-radar.mini')).toBeVisible();
    await mini.click();
    await expect(page).toHaveURL(/#\/progress$/);
    await expect(page.locator('.skill-chart')).toBeVisible();
    await expectNoHorizontalScroll(page);
  });

  test('nothing shrinks for time away: the values come from counts and recent answers, not the calendar', async ({ page }) => {
    const engine = { tally: {}, mastery: well('listening', 30), recent: { listening: '1111111111' }, placement: null, placementSkip: true, checkin: '' };
    await seed(page, base({ engine, lastSession: Date.now() - 90 * DAY }));
    await page.goto('./');
    const now = await page.evaluate(async () => (await import('./js/skill-chart.js')).axesFor('N5', new Date()).find((a) => a.id === 'listening').value);
    const later = await page.evaluate(async () => (await import('./js/skill-chart.js')).axesFor('N5', new Date(Date.now() + 200 * 86_400_000)).find((a) => a.id === 'listening').value);
    expect(later).toBe(now);
    expect(now).toBeGreaterThan(0.8);
  });
});
