// Free chat (js/ai-chat.js): optional, off until a Claude API key is pasted in Settings. All calls go to a fake
// api.anthropic.com here (no real network). The key must never reach progress, an export code, or any other host.
import { test, expect, seed, saved, view, expectNoHorizontalScroll } from './helpers.js';

const KEY = 'sk-ant-api03-ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789abcdefghij';
const T = (d) => new Date(`${d}T10:00:00`);
const HIRAGANA = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'h7', 'h8', 'h9', 'h10', 'h11', 'h12'];

async function learner(page, { chapters = ['ch1', 'ch2', 'ch3', 'ch4', 'ch5', 'ch6'] } = {}) {
  await page.goto('./');
  const st = await page.evaluate(async ({ chapters, dojo }) => {
    const { N5_WORDS } = await import('./js/data.js');
    const now = Date.now();
    const items = {};
    for (const w of N5_WORDS.slice(0, 300)) items[w.id] = { level: 3, due: now + 9e8, best: 0, r: 3, pl: now - 9e8, s: 5, d: 5, lr: now - 1e8 };
    return { v: 10, items, dojo, chapters, settings: { hideIosHint: true }, days: {}, lastSession: now, messages: { thread: [] } };
  }, { chapters, dojo: HIRAGANA });
  await page.evaluate(() => localStorage.clear());
  await page.goto('about:blank');
  return st;
}

/** A fake Messages API: records each request and answers with `answer(body)` (or a status). */
async function fakeClaude(page, { status = 200, answer = null } = {}) {
  const calls = [];
  await page.route('https://api.anthropic.com/**', async (route) => {
    const req = route.request();
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': 'POST' } });
    const body = JSON.parse(req.postData() || '{}');
    calls.push({ url: req.url(), headers: req.headers(), body });
    const cors = { 'access-control-allow-origin': '*', 'content-type': 'application/json' };
    if (status !== 200) return route.fulfill({ status, headers: cors, body: JSON.stringify({ type: 'error', error: { type: 'authentication_error', message: 'invalid x-api-key' } }) });
    const out = answer ? answer(body) : {
      reply: { jp: 'よう！ 今日も 練習 したか？', kana: 'よう！ きょうも れんしゅう したか？', en: 'Yo! Did you practise today too?' },
      check: { ok: true, better: '', note: 'Nice and natural!' },
    };
    return route.fulfill({ status: 200, headers: cors, body: JSON.stringify({ id: 'msg_1', type: 'message', role: 'assistant', model: body.model, stop_reason: 'end_turn', content: [{ type: 'text', text: JSON.stringify(out) }] }) });
  });
  return calls;
}

/** Every request the page makes must stay on the site or go to api.anthropic.com. */
function watchHosts(page) {
  const other = [];
  page.on('request', (r) => {
    const u = new URL(r.url());
    if (!['localhost', '127.0.0.1', 'api.anthropic.com'].includes(u.hostname) && !u.protocol.startsWith('data') && !u.protocol.startsWith('blob')) other.push(r.url());
  });
  return other;
}

test.describe('Free chat (AI, opt-in)', () => {
  test('off by default: Free chat explains itself and points to Settings, with no network call', async ({ page }) => {
    const calls = await fakeClaude(page);
    await page.clock.setFixedTime(T('2026-10-15'));
    await seed(page, await learner(page));
    await page.goto('./#/messages');
    const v = view(page);
    await v.locator('[data-act=who][data-who=kaito]').click();
    await v.locator('[data-act=mode][data-mode=free]').click();
    await expect(v).toContainText('off until you paste your own Claude API key');
    await expect(v.locator('a[href="#/settings"]')).toBeVisible();
    await expect(v.locator('#ai-text')).toHaveCount(0);
    expect(calls).toHaveLength(0);
    await expectNoHorizontalScroll(page);
  });

  test('Settings: a bad key is refused; a good one turns it on and stays out of progress and exports', async ({ page }) => {
    await seed(page, await learner(page));
    await page.goto('./#/settings');
    const v = view(page);
    await v.locator('#ai-key').fill('not a key');
    await v.locator('[data-act=aiconnect]').click();
    await expect(v.locator('#ai-panel')).toContainText("doesn't look like a Claude API key");
    await v.locator('[data-act=aimodel][data-model=claude-haiku-5-5]').click();
    await v.locator('#ai-key').fill(KEY);
    await v.locator('[data-act=aiconnect]').click();
    await expect(v.locator('#ai-panel')).toContainText('On.');
    const cfg = await page.evaluate(() => JSON.parse(localStorage.getItem('kotobaBeat.ai')));
    expect(cfg).toEqual({ key: KEY, model: 'claude-haiku-5-5' });
    expect(JSON.stringify(await saved(page))).not.toContain(KEY);
    const code = await page.evaluate(async () => (await import('./js/store.js')).store.exportCode());
    expect(code).not.toContain(KEY);
    await v.locator('[data-act=aioff]').click();
    await expect(v.locator('#ai-key')).toBeVisible();
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('kotobaBeat.ai')).key)).toBe('');
    await expectNoHorizontalScroll(page);
  });

  test('typing to Kaito: the request is well formed, the reply and a gentle fix show, and it plays', async ({ page }) => {
    const other = watchHosts(page);
    const calls = await fakeClaude(page, { answer: () => ({
      reply: { jp: 'よう！ 今日も 練習 したか？', kana: 'よう！ きょうも れんしゅう したか？', en: 'Yo! Did you practise today too?' },
      check: { ok: true, better: 'カイト、げんき？', note: 'Good! With a friend, casual げんき？ sounds more natural.' },
    }) });
    await page.clock.setFixedTime(T('2026-10-15'));
    await seed(page, await learner(page));
    await page.addInitScript((key) => localStorage.setItem('kotobaBeat.ai', JSON.stringify({ key, model: 'claude-opus-5-5' })), KEY);
    await page.goto('./#/messages');
    const v = view(page);
    await v.locator('[data-act=who][data-who=kaito]').click();
    await v.locator('[data-act=mode][data-mode=free]').click();
    await expect(v.locator('.ai-chat')).toContainText('Try:');
    await v.locator('#ai-text').fill('カイトさん、おげんきですか');
    await v.locator('#ai-text').press('Enter');
    await expect(v.locator('.ai-chat .msg-row:not(.mine) .msg-text')).toContainText('れんしゅう');   // kanji not known yet: the kana version
    await expect(v.locator('.ai-chat .msg-bubble.mine')).toContainText('おげんきですか');
    await expect(v.locator('.ai-chat .msg-fit')).toContainText('More natural');
    await expect(v.locator('.ai-chat details')).toContainText('Did you practise today too?');
    expect(calls).toHaveLength(1);
    const { headers, body } = calls[0];
    expect(headers['x-api-key']).toBe(KEY);
    expect(headers['anthropic-version']).toBe('2023-06-01');
    expect(headers['anthropic-dangerous-direct-browser-access']).toBe('true');
    expect(headers['anthropic-beta']).toBe('server-side-fallback-2026-07-01');
    expect(body.model).toBe('claude-opus-5-5');
    expect(body.fallbacks).toBe('default');
    expect(body.output_config.format.type).toBe('json_schema');
    expect(body.thinking).toBeUndefined();
    expect(body.messages).toEqual([{ role: 'user', content: 'カイトさん、おげんきですか' }]);
    expect(body.system[0].text).toContain('Kaito');
    expect(body.system[0].text).toContain('casual');
    expect(JSON.stringify(body)).not.toContain(KEY);
    // The chat is kept on this device, not in progress; the grade counts as grammar practice.
    expect(JSON.stringify(await saved(page))).not.toContain('おげんきですか');
    // A second message carries the conversation so far.
    await v.locator('#ai-text').fill('うん、した！');
    await v.locator('[data-act=aisend]').click();
    await expect(v.locator('.ai-chat .msg-row:not(.mine)')).toHaveCount(2);
    expect(calls[1].body.messages.map((m) => m.role)).toEqual(['user', 'assistant', 'user']);
    // Back to Story texts and to Free chat again: the chat is still there.
    await v.locator('[data-act=mode][data-mode=story]').click();
    await v.locator('[data-act=mode][data-mode=free]').click();
    await expect(v.locator('.ai-chat .msg-bubble.mine')).toHaveCount(2);
    expect(other).toEqual([]);
    await expectNoHorizontalScroll(page);
  });

  test('Haiku 5.5 sends no fallback; a rejected key keeps the message and says what to do', async ({ page, allowErrors }) => {
    allowErrors.push(/Failed to load resource/);
    const calls = await fakeClaude(page, { status: 401 });
    await page.clock.setFixedTime(T('2026-10-15'));
    await seed(page, await learner(page));
    await page.addInitScript((key) => localStorage.setItem('kotobaBeat.ai', JSON.stringify({ key, model: 'claude-haiku-5-5' })), KEY);
    await page.goto('./#/messages');
    const v = view(page);
    await v.locator('[data-act=mode][data-mode=free]').click();
    await v.locator('#ai-text').fill('こんにちは');
    await v.locator('[data-act=aisend]').click();
    await expect(v.locator('.ai-chat')).toContainText("didn't accept the API key");
    await expect(v.locator('.ai-chat .msg-bubble.mine')).toContainText('こんにちは');
    await expect(v.locator('[data-act=airetry]')).toBeVisible();
    expect(calls[0].body.model).toBe('claude-haiku-5-5');
    expect(calls[0].body.fallbacks).toBeUndefined();
    expect(calls[0].headers['anthropic-beta']).toBeUndefined();
  });
});
