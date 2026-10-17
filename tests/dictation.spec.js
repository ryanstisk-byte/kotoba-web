// Dictation Drops: the mora-by-mora check (in Node: kana or romaji, either script, long vowels either way, particles as
// they sound, small っ and long vowels "close", only the off morae marked), every line has a voice clip, and a round of
// words and of sentences in the page (a right answer, a miss that shows the marked answer and comes back, "I was right").
import { test, expect, seed, view, expectNoHorizontalScroll } from './helpers.js';
import { checkDictation, morae } from '../js/dictation-check.js';

const now = Date.now();
const card = (extra = {}) => ({ level: 3, due: now + 9e8, best: 0, r: 3, pl: now - 9e8, s: 5, d: 5, lr: now - 1e8, ...extra });
const base = (extra = {}) => ({ v: 13, items: {}, chapters: [], forged: [], dojo: [], storyReplays: {}, days: {}, settings: { hideIosHint: true, readingHelp: 'off' }, ...extra });
const marks = (r, side = 'answer') => r[side].map((m) => (m.wrong ? `[${m.s}]` : m.s)).join('');

test.describe('Dictation check (Node)', () => {
  test('morae: small kana join the one before; っ, ん and ー stand alone; punctuation is dropped', () => {
    expect(morae('きょうは、がっこう。')).toEqual(['きょ', 'う', 'は', 'が', 'っ', 'こ', 'う']);
    expect(morae('コーヒー')).toEqual(['コ', 'ー', 'ヒ', 'ー']);
  });

  test('right in kana or romaji, in either script, with long vowels spelled either way and particles as they sound', () => {
    expect(checkDictation('kitte', { reading: 'きって' }).ok).toBe('exact');
    expect(checkDictation('キッテ', { reading: 'きって' }).ok).toBe('exact');
    expect(checkDictation('kouhii', { reading: 'コーヒー' }).ok).toBe('exact');
    expect(checkDictation('こおひい', { reading: 'コーヒー' }).ok).toBe('exact');
    expect(checkDictation('せんせえ', { reading: 'せんせい' }).ok).toBe('exact');
    expect(checkDictation('jizu', { reading: 'ちず'.replace('ち', 'ぢ') }).ok).toBe('exact');
    const p = checkDictation('watashi wa gakusei desu', { reading: 'わたしはがくせいです。' });
    expect(p.ok).toBe('exact');
    expect(p.particle).toBe(true);
    expect(checkDictation('私', { reading: 'わたし', jp: '私' }).ok).toBe('exact');
  });

  test('a small っ or long vowel off is close and marked; other misses mark only the off morae', () => {
    const c = checkDictation('kite', { reading: 'きって' });
    expect(c.ok).toBe('close');
    expect(marks(c)).toBe('き[っ]て');
    expect(checkDictation('tokyo', { reading: 'とうきょう' }).ok).toBe('close');
    const m = checkDictation('kaba', { reading: 'かばん' });
    expect(m.ok).toBe(false);
    expect(marks(m)).toBe('かば[ん]');
    const s = checkDictation('しゅし', { reading: 'すし' });
    expect(marks(s)).toBe('[す]し');
    expect(marks(s, 'typed')).toBe('[しゅ]し');
    // One sound off in a long sentence still counts; two in a short one doesn't.
    expect(checkDictation('あしたはやまにいきました', { reading: 'あしたはやまへいきます。' }).ok).toBe(false);
    expect(checkDictation('まいにちとしょかんでほんおよみます', { reading: 'まいにちとしょかんでほんをよみます。' }).ok).toBe('exact');
    expect(checkDictation('まいにちとしょかんでほんをよみまう', { reading: 'まいにちとしょかんでほんをよみます。' }).ok).toBe('close');
  });

  test('kanji that are not the written form are not graded; empty is a miss with every mora shown', () => {
    expect(checkDictation('雨', { reading: 'あめ', jp: 'あめ' }).kanji).toBe(true);
    const e = checkDictation('', { reading: 'あめ' });
    expect(e.ok).toBe(false);
    expect(e.answer.length).toBe(2);
  });
});

test.describe('Dictation Drops', () => {
  test('every word and sentence it can offer has a voice clip', async ({ page }) => {
    await page.goto('./');
    const r = await page.evaluate(async () => {
      const { asLine } = await import('./js/modes/dictation.js');
      const { allContent } = await import('./js/levels.js');
      const { CLIPS } = await import('./js/clips.js');
      const out = { words: 0, sentences: 0, missing: [] };
      for (const w of allContent('dictation')) for (const kind of ['words', 'sentences']) {
        const x = asLine(w, kind);
        if (!x) continue;
        out[kind]++;
        if (!CLIPS[x.say + '#0']) out.missing.push(x.say);
      }
      return out;
    });
    expect(r.missing).toEqual([]);
    expect(r.words).toBeGreaterThan(1500);
    expect(r.sentences).toBeGreaterThan(1000);
  });

  test('words: a right answer, then a miss that marks the answer, comes back, and can be counted right', async ({ page }) => {
    await seed(page, base({ items: { 'n5:雨': card({ due: 0 }) } }));
    await page.goto('./#/play/dictation');
    const v = view(page);
    await expect(v.getByText('Hear it, then type it in kana.')).toBeVisible();
    await v.getByRole('radio', { name: 'Words' }).click();
    await expectNoHorizontalScroll(page);
    await v.getByRole('button', { name: /Start a round/ }).click();
    await expect(v.locator('.dict-pos')).toHaveText(/^1\/\d+/);
    await v.getByRole('button', { name: 'Hint' }).click();
    await expect(v.locator('.dict-slot').first()).toBeVisible();
    // Line 1: show the answer (it comes back as line 5).
    await v.getByRole('button', { name: 'Show me the answer' }).click();
    await expect(v.getByText('It was:')).toBeVisible();
    const answer = (await v.locator('.dict-morae.key').textContent()).trim();
    await v.getByRole('button', { name: /Next/ }).click();
    // Line 2: a miss marks the off sounds; "I was right" counts it and takes back its repeat.
    await v.locator('#dict-answer').fill('zzzzz');
    await v.getByRole('button', { name: /Check/ }).click();
    await expect(v.getByText('Not quite.', { exact: true })).toBeVisible();
    await expect(v.locator('.dict-morae.key .dict-mora.off').first()).toBeVisible();
    await v.getByRole('button', { name: /I was right/ }).click();
    await expect(v.getByText('Counted right.')).toBeVisible();
    await expectNoHorizontalScroll(page);
    await v.getByRole('button', { name: /Next/ }).click();
    for (let k = 0; k < 2; k++) {
      await v.getByRole('button', { name: 'Show me the answer' }).click();
      await v.getByRole('button', { name: /Next/ }).click();
    }
    // Line 5 is line 1 again.
    await expect(v.locator('.dict-pos')).toHaveText(/^5\//);
    await v.locator('#dict-answer').fill(answer);
    await v.locator('#dict-answer').press('Enter');
    await expect(v.getByText('Right!')).toBeVisible();
  });

  test('sentences: type the romaji and it turns into kana; a particle typed as it sounds is right', async ({ page }) => {
    await seed(page, base());
    await page.goto('./#/play/dictation');
    const v = view(page);
    await v.getByRole('radio', { name: 'Sentences' }).click();
    await v.getByRole('button', { name: /Start a round/ }).click();
    await v.getByRole('button', { name: 'Show me the answer' }).click();
    const reading = (await v.locator('.dict-morae.key').textContent()).trim();
    expect(morae(reading).length).toBeLessThanOrEqual(20);
    await expectNoHorizontalScroll(page);
    await v.getByRole('button', { name: /Next/ }).click();
    // The revealed line comes back four lines on; skip to it.
    for (let k = 0; k < 3; k++) {
      await v.getByRole('button', { name: 'Show me the answer' }).click();
      await v.getByRole('button', { name: /Next/ }).click();
    }
    const { romaji } = await import('../js/romaji.js');
    await v.locator('#dict-answer').pressSequentially(romaji(reading).replace(/ /g, ''));
    await expect(v.locator('.type-preview')).not.toHaveText(/^\s*$/);
    await v.locator('#dict-answer').press('Enter');
    await expect(v.getByText(/Right!|Close enough!/)).toBeVisible();
  });
});
