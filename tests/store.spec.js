// The progress store's bookkeeping, checked in the browser against the real module.
import { test, expect, seed } from './helpers.js';

test.describe('store', () => {
  test.use({ timezoneId: 'America/New_York' });

  test('accuracy this week counts the 7 calendar days, even across a daylight-saving change', async ({ page }) => {
    // Clocks went forward on Sunday 8 March 2026 in New York, so that day was only 23 hours long.
    await page.clock.setFixedTime(new Date('2026-03-09T00:30:00-04:00'));
    const day = (ok, tot) => ({ ok, tot, rev: 0, newc: 0, studied: true, blocks: {} });
    await seed(page, { v: 1, items: {}, days: {
      '2026-03-09': day(1, 1), '2026-03-08': day(2, 2), '2026-03-07': day(3, 4), '2026-03-03': day(1, 1),
      '2026-03-02': day(0, 50),   // 8 days ago: outside the week
    } });
    await page.goto('./');
    const acc = await page.evaluate(async () => (await import('./js/store.js')).store.weekAccuracy());
    expect(acc).toEqual({ ok: 7, tot: 8, rate: 7 / 8 });
  });

  test('days studied this month only counts studied days in this month', async ({ page }) => {
    await page.clock.setFixedTime(new Date('2026-10-09T12:00:00'));
    const day = (studied) => ({ ok: 0, tot: 0, rev: 0, newc: 0, studied, blocks: {} });
    await seed(page, { v: 1, items: {}, days: { '2026-10-01': day(true), '2026-10-02': day(false), '2026-10-09': day(true), '2026-09-30': day(true) } });
    await page.goto('./');
    expect(await page.evaluate(async () => (await import('./js/store.js')).store.daysStudiedThisMonth())).toBe(2);
  });

  test('a garden miss shows the answer and keeps the level (no lives lost)', async ({ page }) => {
    await page.clock.setFixedTime(new Date('2026-10-09T12:00:00'));
    await seed(page, { v: 1, items: { ohayou: { level: 3, due: 0, best: 0, r: 4, pl: 1 } } });
    await page.goto('./');
    const p = await page.evaluate(async () => {
      const { store } = await import('./js/store.js');
      store.recordReview('ohayou', false);
      return store.item('ohayou');
    });
    expect(p.level).toBe(3);
    expect(p.due).toBe(Date.parse('2026-10-09T12:00:00'));
  });

  test('a long break never piles up: the daily queue is capped, the rest wait', async ({ page }) => {
    await page.clock.setFixedTime(new Date('2026-10-09T12:00:00'));
    await page.goto('./');
    const ids = await page.evaluate(async () => Object.keys((await import('./js/data.js')).GARDEN_CATALOG));
    const items = Object.fromEntries(ids.slice(0, 40).map((id) => [id, { level: 2, due: 1, best: 0, r: 3, pl: 1 }]));
    await page.goto('about:blank');
    await seed(page, { v: 1, items });
    await page.goto('./');
    const q = await page.evaluate(async () => {
      const { store } = await import('./js/store.js');
      const d = store.dailyGardenQueue(20);
      return { n: d.queue.length, waiting: d.waiting, short: store.dailyGardenQueue(10).queue.length };
    });
    expect(q).toEqual({ n: 20, waiting: 20, short: 10 });
  });
});
