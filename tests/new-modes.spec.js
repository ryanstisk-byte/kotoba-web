// The newer practice modes: Listening Lab, Conjugation Dojo, Sentence Builder, Katakana Rush and Numbers & Time.
// Each one loads, takes a right and a wrong answer (a wrong one reveals the answer), feeds store.grade and the
// Garden, works in Quiet mode, and finishes as a Today block. Answers come from the mode's own data, matched by the
// question id the screen shows (data-qid).
import { test, expect, seed, saved, readerState, view, expectNoHorizontalScroll } from './helpers.js';

const SKILL = { listen: 'listening', conj: 'grammar', build: 'grammar', kata: 'kana', numbers: 'counters' };
const TITLE = { listen: 'Listening Lab', conj: 'Conjugation Dojo', build: 'Sentence Builder', kata: 'Katakana Rush', numbers: 'Numbers & Time' };

/** Record every store.grade() call in window.__grades. */
async function watchGrades(page) {
  await page.evaluate(async () => {
    const { store } = await import('./js/store.js');
    window.__grades = [];
    store.onGrade((ev) => window.__grades.push(ev));
  });
}
const grades = (page) => page.evaluate(() => window.__grades);

/**
 * Does one step of a mode inside the page: answers the current question (rightly, or wrongly with `wrong`), or
 * presses whatever moves things on (Next, Start…). Returns what it did.
 */
function step(page, mode, { wrong = false, advance = true } = {}) {
  return page.evaluate(async ([mode, wrong, advance]) => {
    const P = await import('./js/practice-data.js');
    const v = document.querySelector('#view');
    const plain = (b) => { const c = b.cloneNode(true); c.querySelectorAll('rt').forEach((r) => r.remove()); return c.textContent.trim(); };
    const click = (sel) => { const b = v.querySelector(sel); if (b && !b.disabled) { b.click(); return true; } return false; };
    const pick = (right) => {
      const opts = [...v.querySelectorAll('[data-act=pick]:not([disabled])')];
      const b = opts.find((o) => (wrong ? plain(o) !== right : plain(o) === right));
      if (!b) throw new Error(`no option for "${right}" in ${opts.map(plain).join(' / ')}`);
      b.click();
      return wrong ? 'wrong' : 'right';
    };
    if (advance) for (const sel of ['[data-act=start]', '[data-act=nextscene]', '[data-act=nextsent]', '[data-act=sg-ok]', '[data-act=next]', '[data-act=again]']) if (click(sel)) return sel;
    const qid = v.querySelector('[data-qid]')?.dataset.qid;
    if (mode === 'listen') {
      const d = P.DIALOGUES.find((x) => x.id === qid);
      return pick(d.questions[+v.querySelector('[data-question]').dataset.question].options[0]);
    }
    if (mode === 'conj') {
      const [jp, form] = qid.split('|');
      return pick(P.conjugate(P.CONJ_WORDS.find((w) => w.jp === jp), form).jp);
    }
    if (mode === 'kata') return pick(P.KATA_WORDS.find((w) => w.w === qid).en);
    if (mode === 'numbers') return pick(P.NUMBER_SCENES.find((s) => s.id === qid).options[0]);
    // Sentence Builder: tap the tiles in order (or reversed, for a wrong build), then Check.
    const s = P.BUILD_SENTENCES.find((x) => x.id === qid);
    const want = wrong ? s.tiles.slice().reverse() : s.tiles;
    for (const t of want) {
      const tile = [...v.querySelectorAll('.bank [data-act=tile]')].find((b) => plain(b) === t);
      tile.click();
    }
    v.querySelector('[data-act=check]').click();
    return wrong ? 'wrong' : 'right';
  }, [mode, wrong, advance]);
}

/** Moves on until the mode shows an unanswered question. */
async function toQuestion(page, mode) {
  for (let i = 0; i < 6; i++) {
    const ready = await page.evaluate(() => !!document.querySelector('#view [data-act=pick]:not([disabled]), #view .bank [data-act=tile]'));
    if (ready) return;
    await step(page, mode);
    await page.waitForTimeout(50);
  }
}

test.beforeEach(async ({ page }) => {
  // Speech recognition differs between machines; Sentence Builder then grades the speaking step by self-grade.
  await page.addInitScript(() => { delete window.SpeechRecognition; delete window.webkitSpeechRecognition; });
});

test('the Modes screen lists the five new modes', async ({ page }) => {
  await page.goto('./#/modes');
  for (const t of Object.values(TITLE)) await expect(view(page).locator('.mode-card', { hasText: t })).toBeVisible();
  await expectNoHorizontalScroll(page);
  await view(page).locator('.mode-card', { hasText: 'Conjugation Dojo' }).click();
  await expect(page.locator('#title')).toHaveText('Conjugation Dojo');
});

for (const mode of Object.keys(TITLE)) {
  test.describe(TITLE[mode], () => {
    test('a right answer, then a wrong one that reveals the answer', async ({ page }) => {
      await page.goto(`./#/play/${mode}`);
      await expect(page.locator('#title')).toHaveText(TITLE[mode]);
      await watchGrades(page);
      await toQuestion(page, mode);
      await expectNoHorizontalScroll(page);

      // Right
      expect(await step(page, mode, { advance: false })).toBe('right');
      await expect.poll(async () => (await grades(page)).filter((g) => g.skill === SKILL[mode]).length).toBeGreaterThan(0);
      const first = (await grades(page)).find((g) => g.skill === SKILL[mode]);
      expect(first.ok).toBe(true);
      if (mode === 'build') await expect(view(page).getByText(/Built it!/)).toBeVisible();
      else if (mode !== 'conj') await expect(view(page).locator('.practice-opts .btn.good')).toHaveCount(1);   // Conjugation Dojo moves straight on
      await expectNoHorizontalScroll(page);

      // Wrong: the answer is shown, nothing is lost.
      await toQuestion(page, mode);
      const before = (await grades(page)).length;
      expect(await step(page, mode, { wrong: true, advance: false })).toBe('wrong');
      await expect.poll(async () => (await grades(page)).length).toBeGreaterThan(before);
      const last = (await grades(page)).slice(before).find((g) => g.skill === SKILL[mode]);
      expect(last.ok).toBe(false);
      if (mode === 'build') {
        await expect(view(page).getByText(/Not quite. Here's the sentence/)).toBeVisible();
        await expect(view(page).locator('.build-answer')).toBeVisible();
      } else {
        await expect(view(page).locator('.practice-opts .btn.wrong')).toHaveCount(1);
        await expect(view(page).locator('.practice-opts .btn.good')).toHaveCount(1);
        await expect(view(page).getByText(/Not quite|Time's up|It's /).first()).toBeVisible();
      }
      if (mode === 'conj') await expect(view(page).locator('.note .small')).toContainText(/verb|adjective|irregular|exception|special/);
      await expectNoHorizontalScroll(page);

      const day = Object.values((await saved(page)).days)[0];
      expect(day.tot).toBeGreaterThan(0);
    });

    test('works in Quiet mode', async ({ page }) => {
      await seed(page, { items: {}, settings: { quiet: true } });
      await page.goto(`./#/play/${mode}`);
      await expect(page.locator('#quiet-badge')).toBeVisible();
      await watchGrades(page);
      await toQuestion(page, mode);
      expect(await step(page, mode, { advance: false })).toBe('right');
      if (mode === 'build') {
        // No speaking step in Quiet mode: straight to Next.
        await expect(view(page).locator('[data-act=sg-ok]')).toHaveCount(0);
        await expect(view(page).getByRole('button', { name: /Next/ })).toBeVisible();
        expect((await grades(page)).some((g) => g.skill === 'speaking')).toBe(false);
      }
      await expect.poll(async () => (await grades(page)).some((g) => g.skill === SKILL[mode] && g.ok)).toBe(true);
    });

    test('completes as a Today block', async ({ page }) => {
      test.setTimeout(90_000);
      const state = await readerState(page);
      await page.clock.setFixedTime(new Date('2026-10-10T10:00:00'));   // Saturday: free choice
      await seed(page, state);
      await page.goto(`./#/today/skill/${mode}`);
      await expect(page.locator('#banner')).toContainText('Today · block 4');
      await watchGrades(page);
      const done = page.locator('#banner .banner.done');
      for (let i = 0; i < 120 && !(await done.isVisible()); i++) {
        await step(page, mode);
        await page.waitForTimeout(mode === 'conj' ? 120 : 30);
      }
      await expect(done).toContainText('Block 4 done');
      const s = await saved(page);
      expect(s.days['2026-10-10'].blocks.skill).toBe('done');
      // Feeds the Garden: something got planted along the way.
      expect(Object.keys(s.items).length).toBeGreaterThan(0);
      const g = await grades(page);
      expect(g.filter((x) => x.skill === SKILL[mode]).length).toBeGreaterThan(0);
      if (mode === 'build') expect(g.some((x) => x.skill === 'speaking' && x.ok)).toBe(true);
      if (mode === 'numbers') expect(g.some((x) => x.skill === 'listening')).toBe(true);
    });
  });
}

test('Katakana Rush: running out of time shows the answer and the round goes on', async ({ page }) => {
  await page.clock.install();
  await page.goto('./#/play/kata');
  await view(page).getByRole('button', { name: /Start a round/ }).click();
  await expect(view(page).locator('.rush-word')).toBeVisible();
  await page.clock.runFor(16_000);
  await expect(view(page).getByText("Time's up, no harm done:")).toBeVisible();
  await expect(view(page).locator('.practice-opts .btn.good')).toHaveCount(1);
  await view(page).getByRole('button', { name: 'Next ▶' }).click();
  await expect(view(page).locator('[data-act=pick]:enabled')).not.toHaveCount(0);
});

test('Katakana Rush: romaji training wheels for a beginner, a hint button once they know katakana', async ({ page }) => {
  await page.goto('./#/play/kata');
  await view(page).getByRole('button', { name: /Start a round/ }).click();
  await expect(view(page).locator('.rush-romaji')).not.toHaveText(/^\s*$/);
  const state = await readerState(page);
  await seed(page, state);
  await page.goto('./#/play/kata');
  await view(page).getByRole('button', { name: /Start a round/ }).click();
  await expect(view(page).getByRole('button', { name: /Show romaji/ })).toBeVisible();
});

test('Conjugation Dojo: the Garden gets the word', async ({ page }) => {
  await page.goto('./#/play/conj');
  await step(page, 'conj', { advance: false });
  const id = await page.evaluate(async () => {
    const P = await import('./js/practice-data.js');
    const [jp] = document.querySelector('#view [data-qid]').dataset.qid.split('|');
    return P.CONJ_WORDS.find((w) => w.jp === jp).garden;
  });
  if (id) expect((await saved(page)).items[id]).toBeTruthy();
});

test('Listening Lab: the text appears after the questions, with every line replayable', async ({ page }) => {
  await page.goto('./#/play/listen');
  await expect(view(page).locator('.transcript')).toHaveCount(0);
  for (let i = 0; i < 12 && !(await view(page).getByText(/Scene cleared/).isVisible()); i++) await step(page, 'listen');
  await expect(view(page).locator('.transcript .t-line').first()).toBeVisible();
  await view(page).locator('[data-act=line]').first().click();
  await view(page).getByRole('button', { name: /Slow/ }).click();
});
