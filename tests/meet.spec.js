// Encounters: the pick screen (people, scenes, your look), the talk on the battle arena (right, tone and wrong replies,
// a bubble that lands), the breather when nerve runs out, grading as speaking, the next scene, Quiet mode, and every
// line voiced with readings that match.
import { test, expect, seed, saved, view, expectNoHorizontalScroll } from './helpers.js';

const fresh = { v: 12, items: {}, chapters: [], settings: { hideIosHint: true } };

/** Index of the option that is the right reply (`kind` 'good'), the tone reply ('tone') or a wrong one ('miss'). */
async function optionIndex(page, kind) {
  return page.evaluate(async (kind) => {
    const root = document.querySelector('.meet[data-scene]');
    const { SCENE_BY_ID } = await import('./js/encounter-data.js');
    const t = SCENE_BY_ID[root.dataset.scene].turns[+root.dataset.turn];
    const want = kind === 'good' ? [t.reply.jp] : kind === 'tone' ? [t.tone && t.tone.jp] : t.wrong.map((l) => l.jp);
    const text = (b) => { const c = b.cloneNode(true); c.querySelectorAll('rt').forEach((r) => r.remove()); return c.textContent.trim(); };
    return [...document.querySelectorAll('.practice-opts button')].findIndex((b) => want.includes(text(b)));
  }, kind);
}

async function reply(page, kind) {
  const v = view(page);
  await expect(v.locator('.meet[data-scene]')).toBeVisible();
  const i = await optionIndex(page, kind);
  expect(i).toBeGreaterThanOrEqual(0);
  await v.locator('.practice-opts button').nth(i).click();
}

async function startScene(page, who = 'clerk') {
  await page.goto('./#/play/meet');
  await view(page).locator(`[data-act=who][data-id=${who}]`).click();
  await view(page).locator('[data-act=start]').click();
  await expect(view(page).locator('.meet[data-scene]')).toBeVisible();
}

test.describe('Encounters', () => {
  test('listed in Modes; pick who to meet, a scene, and how you look (remembered)', async ({ page }) => {
    await seed(page, fresh);
    await page.goto('./#/modes');
    await expect(view(page).locator('a[href="#/play/meet"]')).toContainText('Encounters');
    await page.goto('./#/play/meet');
    const v = view(page);
    await expect(v.locator('[data-act=who]')).toHaveCount(3);
    await expect(v.locator('[data-act=scene]').first()).toContainText('At the register');
    await expect(v.locator('[data-act=scene]')).toHaveCount(2);   // N5 only until N4 is unlocked
    await v.locator('[data-act=who][data-id=student]').click();
    await expect(v).toContainText('Casual speech is natural here');
    await expect(v.locator('[data-act=start]')).toContainText('Kenta');
    await v.locator('[data-act=look][data-id=wrestler]').click();
    await page.reload();
    await expect(v.locator('[data-act=look][data-id=wrestler]')).toHaveAttribute('aria-checked', 'true');
    await expect(v.locator('.meet-pic img').first()).toHaveJSProperty('complete', true);
    expect(await v.locator('.meet-pic img').first().evaluate((i) => i.naturalWidth)).toBeGreaterThan(100);
    await expectNoHorizontalScroll(page);
  });

  test('a right reply builds the bond; the right words too casually still count, with a note; a wrong one costs nerve', async ({ page }) => {
    await seed(page, fresh);
    await startScene(page, 'clerk');
    const v = view(page);
    await expect(v.locator('.meet-bubble')).toContainText('ふくろ');
    await reply(page, 'tone');   // ううん、いらない。 to a shop clerk
    await expect(v.locator('.panel.note')).toContainText('Understood, but');
    await expect(v.locator('.panel.note')).toContainText('safe choice');
    await expect(v.locator('.rap-bar')).toHaveAttribute('aria-valuenow', '1');
    await v.locator('[data-act=next]').click();
    await reply(page, 'good');
    await expect(v.locator('.good-panel')).toContainText('Nice reply');
    await expect(v.locator('.rap-bar')).toHaveAttribute('aria-valuenow', '3');
    await v.locator('[data-act=next]').click();
    await reply(page, 'miss');
    await expect(v).toContainText("That one didn't fit");
    await expect(v.locator('.practice-opts .good')).toHaveCount(1);   // the right reply is shown
    await expect(v.locator('.nerve-bar')).toHaveAttribute('aria-valuenow', '15');
    await expect(v.locator('.rival-text')).not.toHaveClass(/quiet/);   // Mika looks puzzled
    const s = await saved(page);
    expect(s.engine.mastery['speaking|meet:clerk-1:0'][0]).toBe(70);
    expect(s.engine.mastery['speaking|meet:clerk-1:2'][0]).toBe(20);
    await expectNoHorizontalScroll(page);
  });

  test('with a classmate, the stiff polite reply is the one that gets a note', async ({ page }) => {
    await seed(page, fresh);
    await startScene(page, 'student');
    await reply(page, 'tone');
    await expect(view(page).locator('.panel.note')).toContainText('Between classmates, casual speech is natural');
  });

  test('a bubble that lands before you reply counts as a slip', async ({ page }) => {
    await page.clock.install();
    await seed(page, fresh);
    await startScene(page, 'chef');
    await page.clock.runFor(40_000);
    await expect(view(page)).toContainText('Too slow');
    await expect(view(page).locator('.nerve-bar')).toHaveAttribute('aria-valuenow', '15');
    await expect(view(page).locator('.meet-bubble')).toHaveClass(/landed/);
  });

  test('out of nerve: take a breath on the replies that slipped, then carry on; the scene comes back next time', async ({ page }) => {
    await seed(page, fresh);
    await startScene(page, 'clerk');
    const v = view(page);
    for (let n = 0; n < 4; n++) { await reply(page, 'miss'); await v.locator('[data-act=next]').click(); }
    await expect(v.locator('.breath')).toBeVisible();
    await expect(v).toContainText('TAKE A BREATH');
    for (let n = 0; n < 4; n++) {
      const right = await page.evaluate(async () => {
        const text = (b) => { const c = b.cloneNode(true); c.querySelectorAll('rt').forEach((r) => r.remove()); return c.textContent.trim(); };
        const { SCENES } = await import('./js/encounter-data.js');
        const replies = SCENES.flatMap((s) => s.turns.map((t) => t.reply.jp));
        return [...document.querySelectorAll('.practice-opts button')].findIndex((b) => replies.includes(text(b)));
      });
      await v.locator('.practice-opts button').nth(right).click();
      await v.locator('[data-act=bnext]').click();
    }
    // Back in the talk at the last line, with half the nerve back.
    await expect(v.locator('.meet[data-turn="4"]')).toBeVisible();
    await expect(v.locator('.nerve-bar')).toHaveAttribute('aria-valuenow', '10');
    await reply(page, 'good');
    await v.locator('[data-act=next]').click();
    await expect(v.locator('.rival-kicker')).toContainText('AT THE REGISTER');
    await expect(v).toContainText('REPLIES TO PRACTISE');
    await expect(v.locator('[data-act=start]')).toContainText('At the register');   // not learned yet: it comes back
  });

  test('a scene with every reply right is learned, and the next one comes up', async ({ page }) => {
    await seed(page, fresh);
    await startScene(page, 'clerk');
    const v = view(page);
    for (let n = 0; n < 5; n++) { await reply(page, 'good'); await v.locator('[data-act=next]').click(); }
    await expect(v).toContainText('5 of 5 replies fit');
    await expect(v.locator('[data-act=start]')).toContainText('Looking for an umbrella');
    await v.locator('[data-act=pickscreen]').click();
    await expect(v.locator('[data-act=scene][data-id=clerk-1]')).toContainText('Learned');
  });

  test('Quiet mode: tap replies only', async ({ page }) => {
    await seed(page, { ...fresh, settings: { hideIosHint: true, quiet: true } });
    await startScene(page, 'clerk');
    await expect(view(page).locator('[data-act=mic]')).toHaveCount(0);
  });

  test("every line has a clip in its speaker's voice, every reply in the narrator's, and readings match", async ({ page }) => {
    await page.goto('./');
    const r = await page.evaluate(async () => {
      const { encounterLines, SCENES } = await import('./js/encounter-data.js');
      const { CLIPS } = await import('./js/clips.js');
      const { readingOf } = await import('./js/furigana.js');
      const { toHiragana } = await import('./js/romaji.js');
      const missing = encounterLines().flatMap(([l, v]) => [`${l.jp}#${v}`, `${l.jp}#${v}#slow`]).filter((k) => !CLIPS[k]);
      const clean = (s) => toHiragana(s).replace(/[、。！？「」…・\s]/g, '');
      const split = (s) => s.split(/[\s、。！？「」…]+/).filter(Boolean);
      const wrong = [];
      const all = [...encounterLines().map(([l]) => l), ...SCENES.flatMap((s) => s.turns.flatMap((t) => t.wrong))];
      for (const l of all) {
        const js = split(l.jp), ks = split(l.reading);
        if (js.length !== ks.length) { wrong.push(l.jp); continue; }
        js.forEach((seg, i) => { const rd = readingOf(seg); if (rd == null || clean(rd) !== clean(ks[i])) wrong.push(`${seg} (${rd} vs ${ks[i]})`); });
      }
      return { missing, wrong, count: encounterLines().length };
    });
    expect(r.missing).toEqual([]);
    expect(r.wrong).toEqual([]);
    expect(r.count).toBeGreaterThan(200);
  });
});
