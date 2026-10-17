// Every emoji on screen is drawn as a line icon (js/icons.js): none are left as text, and each icon is either
// decoration next to words (aria-hidden) or a named image when it stands alone.
import { test, expect, view } from './helpers.js';

const ROUTES = ['#/', '#/modes', '#/garden', '#/progress', '#/settings', '#/check', '#/course', '#/course/p0-1', '#/course/p0-1/lesson',
  '#/play/dojo', '#/play/story', '#/play/particle', '#/play/forge', '#/play/rhythm', '#/play/duel', '#/play/slice', '#/play/shop',
  '#/play/listen', '#/play/conj', '#/play/build', '#/play/kata', '#/play/numbers', '#/play/library', '#/play/walk', '#/play/type'];

/** Text on the page that is still an emoji (the © in the dictionary credit is ordinary text). */
const leftovers = (page) => page.evaluate(() => {
  const re = /(?!©)(?:\p{Extended_Pictographic}|[▶✔⬇✕✓■↻⇄↩〰])/u;
  const out = [];
  const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  while (w.nextNode()) {
    const n = w.currentNode;
    if (re.test(n.nodeValue) && !n.parentElement.closest('script, style, svg, textarea, option')) out.push(n.nodeValue.trim());
  }
  return out;
});

test('no screen shows an emoji: each is a line icon, labelled or hidden from screen readers', async ({ page }) => {
  test.setTimeout(90_000);
  for (const r of ROUTES) {
    await page.goto('./' + r);
    await page.waitForTimeout(200);
    expect(await leftovers(page), r).toEqual([]);
    const unlabelled = await page.evaluate(() => [...document.querySelectorAll('svg.ico')]
      .filter((s) => s.getAttribute('aria-hidden') !== 'true' && !(s.getAttribute('role') === 'img' && s.getAttribute('aria-label'))).length);
    expect(unlabelled, r).toBe(0);
  }
});

test('icons appear as things render: toasts, buttons, and a plant standing alone gets a name', async ({ page }) => {
  await page.goto('./#/play/garden');
  await expect(view(page).getByRole('button', { name: /Water \d+ plant/ }).locator('svg.ico-drop')).toHaveCount(1);
  await page.locator('#slow-toggle').click();   // its toast says "🐢 Slow speech on"
  await expect(page.locator('#toast svg.ico-turtle')).toHaveCount(1);
  await expect(page.locator('#toast')).toHaveText(/Slow speech on/);
  // A planted word's plant is only an icon, so it's named for screen readers.
  await page.evaluate(async () => { const { store } = await import('./js/store.js'); store.plant('ohayou'); });
  await page.goto('./#/modes');
  await page.goto('./#/play/garden');
  await expect(view(page).getByRole('img', { name: 'seedling' }).first()).toBeVisible();
});

test('every emoji written in the code has a line drawing, so none can show as an emoji', async () => {
  const { readdirSync, readFileSync } = await import('node:fs');
  const { EMOJI_ICONS } = await import('../js/icons.js');
  const { ICON_ART } = await import('../js/icon-art.js');
  const re = /(?:\p{Extended_Pictographic}(?:️|‍\p{Extended_Pictographic}️?)*)/gu;
  const dir = new URL('../js/', import.meta.url);
  const files = [...readdirSync(dir).map((f) => 'js/' + f), ...readdirSync(new URL('modes/', dir)).map((f) => 'js/modes/' + f)]
    .filter((f) => f.endsWith('.js') && !/clips|readings|icon-art/.test(f));
  const missing = [];
  for (const f of files) {
    for (const e of new Set(readFileSync(new URL('../' + f, import.meta.url), 'utf8').match(re) || [])) {
      if (e === '©') continue;   // the dictionary credit: ordinary text
      const name = EMOJI_ICONS[e.replace(/️/g, '')];
      if (!name || !ICON_ART[name]) missing.push(`${e} in ${f}`);
    }
  }
  expect(missing).toEqual([]);
});
