// The guided "Today" plan: its shape for every weekday, Short and Quiet sessions, beginners, and running its blocks.
import { test, expect, seed, saved, readerState, view } from './helpers.js';

// Week of Monday 5 October 2026. Odd dates get Rhythm for speaking, even dates Speak Slice.
const WEEK = [
  { day: 'Monday', date: '2026-10-05', speak: 'Rhythm', skill: 'Particle Train' },
  { day: 'Tuesday', date: '2026-10-06', speak: 'Speak Slice', skill: 'Pitch Duel' },
  { day: 'Wednesday', date: '2026-10-07', speak: 'Rhythm', skill: 'Kanji Forge' },
  { day: 'Thursday', date: '2026-10-08', speak: 'Speak Slice', skill: 'Shopkeeper' },
  { day: 'Friday', date: '2026-10-09', speak: 'Rhythm', skill: 'Particle Train' },
  { day: 'Saturday', date: '2026-10-10', speak: 'Speak Slice', skill: 'Free choice' },
  { day: 'Sunday', date: '2026-10-11', speak: 'Rhythm', skill: null },
];

const blockTitles = (page) => view(page).locator('.block-row .strong').allInnerTexts();

async function openHomeOn(page, date, extra) {
  const state = await readerState(page, extra);
  await page.clock.setFixedTime(new Date(`${date}T10:00:00`));
  await seed(page, state);
  await page.goto('./#/');
  await expect(view(page).locator('.block-row').first()).toBeVisible();
}

test.describe('Today plan (reader who finished the Dojo)', () => {
  for (const w of WEEK) {
    test(`${w.day}: standard session`, async ({ page }) => {
      await openHomeOn(page, w.date);
      const want = ['Garden review', 'Story', `Speaking · ${w.speak}`];
      if (w.skill) want.push(`Skill focus · ${w.skill}`);
      expect(await blockTitles(page)).toEqual(want);
      const sundayNote = view(page).getByText('Sunday: review only.', { exact: false });
      if (w.day === 'Sunday') await expect(sundayNote).toBeVisible(); else await expect(sundayNote).toHaveCount(0);
    });

    test(`${w.day}: quiet mode swaps speaking for listening`, async ({ page }) => {
      await openHomeOn(page, w.date, { settings: { quiet: true, hideIosHint: true } });
      const titles = await blockTitles(page);
      const quietSpeak = w.skill === 'Pitch Duel' ? 'Shopkeeper' : 'Pitch Duel';
      expect(titles[2]).toBe(`Speaking · ${quietSpeak}`);
      expect(titles.join()).not.toMatch(/Rhythm|Speak Slice/);
      await expect(page.locator('#quiet-badge')).toBeVisible();
    });

    test(`${w.day}: short session is review and story only`, async ({ page }) => {
      await openHomeOn(page, w.date, { settings: { length: 'short', hideIosHint: true } });
      expect(await blockTitles(page)).toEqual(['Garden review', 'Story']);
      await expect(view(page).getByRole('radio', { name: /Short/ })).toHaveAttribute('aria-checked', 'true');
    });
  }

  test('Saturday free choice opens a mode picker that runs inside the plan', async ({ page }) => {
    await openHomeOn(page, '2026-10-10');
    await view(page).locator('.block-row', { hasText: 'Free choice' }).getByRole('link', { name: 'Start' }).click();
    await expect(page.locator('#title')).toHaveText('Free choice');
    await view(page).locator('.mode-card', { hasText: 'Pitch Duel' }).click();
    await expect(page.locator('#title')).toHaveText('Pitch Duel');
    await expect(page.locator('#banner')).toContainText('Today · block 4');
    await page.locator('#banner').getByRole('button', { name: /Done/ }).click();
    await expect(view(page).locator('.block-row.done', { hasText: 'Free choice' })).toBeVisible();
  });

  test('Session length switch on the home screen', async ({ page }) => {
    await openHomeOn(page, '2026-10-05');
    await view(page).getByRole('radio', { name: /Short/ }).click();
    expect(await blockTitles(page)).toEqual(['Garden review', 'Story']);
    await view(page).getByRole('radio', { name: /Standard/ }).click();
    expect(await blockTitles(page)).toHaveLength(4);
    expect((await saved(page)).settings.length).toBe('standard');
  });

  test('Quiet switch on the home screen', async ({ page }) => {
    await openHomeOn(page, '2026-10-05');
    await view(page).getByRole('checkbox').check();
    expect((await blockTitles(page))[2]).toBe('Speaking · Pitch Duel');
    expect((await saved(page)).settings.quiet).toBe(true);
  });
});

test.describe('Today plan (beginner)', () => {
  test('a new learner starts with the Reading Dojo and no skill block', async ({ page }) => {
    await page.clock.setFixedTime(new Date('2026-10-05T10:00:00'));
    await page.goto('./#/');
    expect(await blockTitles(page)).toEqual(['Reading Dojo', 'Garden review', 'Story', 'Speaking · Rhythm']);
    await expect(view(page).getByText(/Next lesson: Hiragana/)).toBeVisible();
  });

  test('a beginner\'s short session is reading and review', async ({ page }) => {
    await page.clock.setFixedTime(new Date('2026-10-05T10:00:00'));
    await seed(page, { items: {}, settings: { length: 'short' } });
    await page.goto('./#/');
    expect(await blockTitles(page)).toEqual(['Reading Dojo', 'Garden review']);
  });
});

test.describe('running the plan', () => {
  test('every block of a standard day can be started, and the day finishes with a summary', async ({ page }) => {
    test.setTimeout(60_000);
    await openHomeOn(page, '2026-10-07');   // Wednesday: Garden, Story, Rhythm, Kanji Forge
    const n = (await blockTitles(page)).length;
    for (let i = 0; i < n; i++) {
      const row = view(page).locator('.block-row').nth(i);
      await row.getByRole('link', { name: 'Start' }).click();
      await expect(page.locator('#banner')).toContainText(`block ${i + 1}`);
      await expect(page.locator('#back')).toBeVisible();
      const done = page.locator('#banner').getByRole('button', { name: /Done/ });
      if (await done.isVisible()) await done.click();
      else await page.locator('#banner').getByRole('link', { name: 'Back to Today' }).click();
      await expect(view(page).locator('.block-row').nth(i)).toHaveClass(/done/);
    }
    await expect(view(page).getByText("Today's done", { exact: false })).toBeVisible();
    const s = await saved(page);
    expect(s.days['2026-10-07'].blocks).toEqual({ garden: 'done', input: 'done', speak: 'done', skill: 'done' });
    expect(s.days['2026-10-07'].studied).toBe(true);
  });

  test('skipping a block is remembered, and it can still be done', async ({ page }) => {
    await openHomeOn(page, '2026-10-07');
    const row = () => view(page).locator('.block-row').nth(1);
    await row().getByRole('button', { name: 'Skip' }).click();
    await expect(row()).toHaveClass(/skipped/);
    await expect(row().getByRole('link', { name: 'Do it' })).toBeVisible();
    expect((await saved(page)).days['2026-10-07'].blocks.input).toBe('skipped');
  });

  test('the Garden block finishes itself after watering today\'s plants', async ({ page }) => {
    await openHomeOn(page, '2026-10-07');
    await view(page).locator('.block-row', { hasText: 'Garden review' }).getByRole('link', { name: 'Start' }).click();
    const v = view(page);
    for (let i = 0; i < 25; i++) {
      if (await page.locator('#banner .banner.done').isVisible()) break;
      await v.getByRole('button', { name: /Check/ }).click();
      await v.getByRole('button', { name: /Knew it/ }).click();
    }
    await expect(page.locator('#banner')).toContainText('Block 1 done');
    expect((await saved(page)).days['2026-10-07'].rev).toBe(5);   // 5 new words a day
  });
});
