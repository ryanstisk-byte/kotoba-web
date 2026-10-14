// Story N3: reading-passage beats. A beat with `doc` (js/story-n3.js) is drawn as a paper document with its kind label
// and title, one sentence per line, keeping furigana, word chips, replay and the meaning toggle.
import { test, expect, seed, view, expectNoHorizontalScroll } from './helpers.js';

const cleared = (n) => Array.from({ length: n }, (_, i) => 'ch' + (i + 1));
const state = (theme = 'light') => ({
  v: 12, items: {}, chapters: cleared(17), forged: [], dojo: [], storyReplays: {}, days: {},
  settings: { hideIosHint: true, readingHelp: 'off', showAllLevels: true, theme },
  exam: { history: [], real: {}, seen: [], later: {} },
});

/** Opens chapter `id` from the map, skips its new words and reads (answering any choice) until a document shows. */
async function openToDoc(page, id) {
  const v = view(page);
  await page.goto('./#/play/story');
  await v.locator(`[data-act=open][data-id=${id}]`).first().click();
  const skip = v.locator('[data-act=prestart]');
  if (await skip.count()) await skip.first().click();
  for (let i = 0; i < 30 && !(await v.locator('.doc-card').count()); i++) {
    const choices = v.locator('.stack-sm [data-act=choice]');
    if (await choices.count()) {
      const ans = await page.evaluate(async (cid) => {
        const { CHAPTERS } = await import('./js/data.js');
        const ch = CHAPTERS.find((c) => c.id === cid);
        const pct = parseFloat(document.querySelector('#view .bar span').style.width);
        return ch.beats[Math.round((pct / 100) * ch.beats.length) - 1].choice.answer;
      }, id);
      await v.locator(`[data-act=choice][data-i="${ans}"]`).click();
      continue;
    }
    await v.getByRole('button', { name: 'Next', exact: true }).click();
  }
  await expect(v.locator('.doc-card')).toBeVisible();
  return v;
}

test.describe('story: reading-passage beats', () => {
  test('every doc beat has a known kind, a title and a few sentences', async ({ page }) => {
    await page.goto('./');
    const r = await page.evaluate(async () => {
      const { CHAPTERS } = await import('./js/data.js');
      const { docSentences } = await import('./js/modes/story.js');
      const docs = CHAPTERS.flatMap((c) => c.beats.filter((b) => b.doc).map((b) => ({ c, b })));
      return {
        n: docs.length,
        bad: docs.filter(({ b }) => !['article', 'notice', 'letter', 'rules', 'essay', 'diary'].includes(b.doc.kind) || !b.doc.title
          || docSentences(b.jp).length < 3).map(({ c, b }) => `${c.id}: ${b.doc.title}`),
        levels: [...new Set(docs.map(({ c }) => c.level))],
      };
    });
    expect(r.n).toBeGreaterThan(5);
    expect(r.bad).toEqual([]);
    expect(r.levels).toEqual(['N3']);
  });

  test('a newspaper article in chapter 18 reads as a document, with furigana, meaning and word chips working', async ({ page }) => {
    await seed(page, state());
    const v = await openToDoc(page, 'ch18');
    const card = v.locator('.doc-card');
    await expect(card.locator('.doc-kind')).toContainText('新聞');
    await expect(card.locator('.doc-kind')).toContainText('Newspaper');
    await expect(card.locator('.doc-title')).toContainText('山川町の 人口');
    expect(await card.locator('.doc-p').count()).toBeGreaterThanOrEqual(5);
    // Furigana is on for a first read: one kana line per sentence. The toggle hides it.
    await expect(card.locator('.doc-reading').first()).toBeVisible();
    await v.locator('[data-act=furi]').click();
    await expect(card.locator('.doc-reading')).toHaveCount(0);
    // Meaning shows the English inside the sheet.
    await card.locator('[data-act=meaning]').click();
    await expect(card.locator('.doc-en')).toContainText('population of Yamakawa');
    // Word chips still work under the document.
    await v.locator('.chips [data-act=word]').first().click();
    await expect(v.locator('.chips + p')).toBeVisible();
    await expectNoHorizontalScroll(page);
    // The text is body-sized, not the big line size, and lines stay a readable length.
    const m = await card.locator('.doc-body').evaluate((el) => ({ fs: parseFloat(getComputedStyle(el).fontSize), w: el.getBoundingClientRect().width }));
    expect(m.fs).toBeLessThan(24);
    expect(m.w / m.fs).toBeLessThanOrEqual(34.5);
    await v.getByRole('button', { name: 'Next', exact: true }).click();
    await expect(v.locator('.doc-card')).toHaveCount(0);
  });

  test('a notice keeps its sender as a sign-off line', async ({ page }) => {
    await seed(page, state());
    const v = await openToDoc(page, 'ch18');
    await v.getByRole('button', { name: 'Next', exact: true }).click();
    // Read on to the notice (beat 8).
    for (let i = 0; i < 10 && !(await v.locator('.doc-notice').count()); i++) {
      const choices = v.locator('.stack-sm [data-act=choice]');
      if (await choices.count()) {
        const ans = await page.evaluate(async () => {
          const { CHAPTERS } = await import('./js/data.js');
          const ch = CHAPTERS.find((c) => c.id === 'ch18');
          const pct = parseFloat(document.querySelector('#view .bar span').style.width);
          return ch.beats[Math.round((pct / 100) * ch.beats.length) - 1].choice.answer;
        });
        await v.locator(`[data-act=choice][data-i="${ans}"]`).click();
        continue;
      }
      await v.getByRole('button', { name: 'Next', exact: true }).click();
    }
    const card = v.locator('.doc-notice');
    await expect(card.locator('.doc-kind')).toContainText('お知らせ');
    await expect(card.locator('.doc-kind')).toContainText('Notice');
    await expect(card.locator('.doc-sign')).toContainText('まちづくり課');
    await expectNoHorizontalScroll(page);
  });

  test('screenshot of a document beat', async ({ page }, info) => {
    await seed(page, state());
    const v = await openToDoc(page, 'ch18');
    await expectNoHorizontalScroll(page);
    await page.evaluate(() => document.fonts.ready);
    const name = info.project.name === 'phone' ? 'phone-story-doc.png' : 'desktop-story-doc.png';
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: `docs/screenshots/n3/${name}`, fullPage: true });
  });

  test('dark theme and a no-furigana challenge replay still draw the document cleanly', async ({ page }) => {
    await seed(page, { ...state('dark'), chapters: cleared(18) });
    await page.goto('./#/play/story');
    const v = view(page);
    await v.locator('[data-act=challenge][data-id=ch18]').click();
    for (let i = 0; i < 10 && !(await v.locator('.doc-card').count()); i++) await v.getByRole('button', { name: 'Next', exact: true }).click();
    const card = v.locator('.doc-card');
    await expect(card).toBeVisible();
    await expect(card.locator('.doc-reading')).toHaveCount(0);
    await expect(v.locator('[data-act=furi]')).toHaveCount(0);
    const bg = await card.evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(bg).not.toBe('rgb(255, 253, 249)');   // the dark surface, not the light paper
    await expectNoHorizontalScroll(page);
  });
});
