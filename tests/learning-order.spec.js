// Words come before the story uses them, and a course unit's Particle Train has variety without untaught particles.
import { test, expect, saved, view, plainText } from './helpers.js';

test('Story: a first read teaches the scene words, checks them, then starts the story', async ({ page }) => {
  await page.goto('./#/play/story');
  const v = view(page);
  await v.locator('[data-act=open]').first().click();
  await expect(v.getByRole('heading', { name: 'New words in this scene' })).toBeVisible();
  const cards = v.locator('[data-act=preword]');
  expect(await cards.count()).toBe(10);   // chapter 1 tags 10 words
  await expect(cards.first()).toContainText('small');
  expect(Object.keys((await saved(page)).items)).toContain('w:小さい');   // planted for Garden review

  await v.getByRole('button', { name: /Quick check/ }).click();
  for (let i = 0; i < 10; i++) {
    await expect(v.getByText('What does it mean?')).toBeVisible();
    await v.locator('[data-act=preans]').first().click();   // right or wrong, the answer is shown and nothing is lost
    await v.locator('[data-act=prenext]').click();
  }
  await expect(v.locator('.line-jp')).toBeVisible();
  expect(await plainText(v.locator('.line-jp'))).toBe('ここは 小さい 町です。');
});

test('Story: replays of a cleared chapter skip the word preview', async ({ page }) => {
  await page.goto('./#/play/story');
  await page.evaluate(async () => (await import('./js/store.js')).store.clearChapter('ch1'));
  await page.reload();
  const v = view(page);
  await v.locator('[data-act=open]').first().click();
  await expect(v.locator('.line-jp')).toBeVisible();
});

test('Particle Train: unit 1 adds trains that use only は and の', async ({ page }) => {
  await page.goto('./#/course');
  const r = await page.evaluate(async () => {
    const { TRAINS, trainParticles } = await import('./js/data.js');
    const { UNITS } = await import('./js/course-data.js');
    const { extraTrains } = await import('./js/course.js');
    const extra = extraTrains(UNITS[0]);
    return { n: extra.length, particles: [...new Set(extra.flatMap((i) => trainParticles(TRAINS[i])))].sort() };
  });
  expect(r.n).toBeGreaterThanOrEqual(5);
  expect(r.particles).toEqual(['の', 'は'].sort());
});

test('Particle Train: every palette particle has at least three sentences', async ({ page }) => {
  await page.goto('./');
  const counts = await page.evaluate(async () => {
    const { TRAINS, TRAIN_PALETTE } = await import('./js/data.js');
    return TRAIN_PALETTE.map((p) => TRAINS.filter((t) => t.gaps.some((g) => g && g.correct.includes(p))).length);
  });
  for (const c of counts) expect(c).toBeGreaterThanOrEqual(3);
});
