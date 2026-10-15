// Free chat (optional): type your own Japanese to someone from the story, and an AI playing them writes back at your
// level, with a gentle fix for what you wrote. It does nothing until a Claude API key is pasted in Settings; after
// that it talks only to api.anthropic.com. Like sync's token (js/sync.js), the key lives in this device's storage
// under its own key, never in progress or an export code, and is never logged. The chats themselves are kept on this
// device only (a convenience, not progress), so the saved progress shape doesn't change.

const KEY = 'kotobaBeat.ai';
const CHATS_KEY = 'kotobaBeat.aiChats';
export const API = 'https://api.anthropic.com/v1/messages';
/** Lines kept per person on this device, and lines sent back as context with each new message. */
const KEEP = 60;
const CONTEXT = 16;

/** The models offered in Settings: the most capable one by default, and a much cheaper one. */
export const MODELS = {
  'claude-opus-5-5': { name: 'Claude Opus 5.5', note: 'Best Japanese. Roughly a cent per reply (estimate).' },
  'claude-haiku-5-5': { name: 'Claude Haiku 5.5', note: 'Much cheaper, a little less natural. Well under a tenth of a cent per reply (estimate).' },
};
export const DEFAULT_MODEL = 'claude-opus-5-5';

let cfg = loadCfg();
let chats = loadChats();

function loadCfg() {
  try {
    const c = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (c && typeof c === 'object' && typeof c.key === 'string') return { key: c.key, model: MODELS[c.model] ? c.model : DEFAULT_MODEL };
  } catch (e) { /* private mode or damaged: off */ }
  return { key: '', model: DEFAULT_MODEL };
}
function saveCfg() {
  try { localStorage.setItem(KEY, JSON.stringify(cfg)); } catch (e) { /* storage blocked: this visit only */ }
}

/** What Settings and the chat screen show. Never includes the key. */
export const status = () => ({ on: !!cfg.key, model: cfg.model });
/** A Claude API key looks like sk-ant-… */
export const looksLikeKey = (k) => /^sk-ant-[A-Za-z0-9_-]{20,}$/.test(String(k).trim());
export function connect(key, model = cfg.model) {
  cfg = { key: String(key).trim(), model: MODELS[model] ? model : DEFAULT_MODEL };
  saveCfg();
}
export function setModel(model) {
  if (!MODELS[model]) return;
  cfg.model = model;
  saveCfg();
}
/** Forgets the key on this device (the chats stay until cleared). */
export function disconnect() {
  cfg = { key: '', model: cfg.model };
  saveCfg();
}

// ---------- the chats (this device only) ----------
function loadChats() {
  try {
    const c = JSON.parse(localStorage.getItem(CHATS_KEY) || 'null');
    if (c && typeof c === 'object') {
      const out = {};
      for (const [who, lines] of Object.entries(c)) if (/^[a-z]{1,20}$/.test(who) && Array.isArray(lines)) out[who] = lines.filter(okLine).slice(-KEEP);
      return out;
    }
  } catch (e) { /* damaged: start fresh */ }
  return {};
}
const str = (s) => typeof s === 'string';
function okLine(l) {
  return l && typeof l === 'object' && (l.who === 'me' ? str(l.text) : l.who === 'them' && str(l.jp) && str(l.kana) && str(l.en));
}
function saveChats() {
  try { localStorage.setItem(CHATS_KEY, JSON.stringify(chats)); } catch (e) { /* storage blocked: this visit only */ }
}
/** One person's free chat, oldest first: { who: 'me', text, check? } and { who: 'them', jp, kana, en }. */
export const chatOf = (from) => chats[from] || [];
export function clearChat(from) {
  delete chats[from];
  saveChats();
}

// ---------- talking to Claude ----------
const LEVELS = {
  1: 'an absolute beginner who is still learning hiragana and katakana. Write one or two very short sentences with the most basic N5 words. Write `jp` in kana only, no kanji.',
  2: 'a beginner at JLPT N5 level. Write one or two short sentences with N5 words and grammar only.',
  3: 'a learner finishing JLPT N5 and starting N4 (～たら, ～てしまう, ～そうだ, ～かもしれない). Write two short sentences at most.',
  4: 'a learner at JLPT N4 level. Write two or three short sentences with N4 words and grammar.',
  5: 'a learner at JLPT N3 level. Write two or three natural sentences with N3 words and grammar.',
};

/** The cast: who they are in the story (original characters from the app's shōnen-style story). */
const CAST = {
  ren: 'Ren (レン), a cheerful, hard-working teenage martial artist who trains at a small town dojo under his Master. He is the learner\'s friend.',
  kaito: 'Kaito (カイト), Ren\'s rival at the dojo. Gruff and proud, secretly kind, and he never admits he likes anyone.',
  master: 'the Master (師匠), the stern, calm teacher who runs the dojo. Few words, wise, warm underneath.',
  sora: 'Sora (ソラ), a lively little kid from the neighbourhood shop who idolises Ren and wants to join the dojo.',
  kiku: 'Granny Kiku (キクさん), a gentle old lady and long-time friend of the dojo. Long ago she was the Master\'s own teacher.',
};

/** The instructions for one person at one level. Stable for a given person and level, so it caches well. */
export function systemPrompt(from, sender, tier) {
  const reg = sender.answer(tier) === 'polite' ? 'polite (です・ます)' : 'casual (plain forms)';
  return `You are ${CAST[from] || sender.name} You are texting a Japanese learner on a phone, inside a language-learning game.

Stay in character and write the way ${sender.name} talks: ${sender.talk}
The learner is ${LEVELS[tier] || LEVELS[2]}
When the learner writes to ${sender.name}, ${reg} speech fits.

Every reply has two parts:
- reply: your next text message. jp is the message as a Japanese person would write it (kanji where natural, except at the beginner level). kana is the same message in hiragana and katakana only, with a space between words, the way children's books write it. en is a natural English translation. Keep it short like a real text, keep the conversation going (often end with an easy question), and react to what the learner said.
- check: a gentle look at the learner's last message. ok is true when a Japanese person would understand it, even with small mistakes. better is a more natural way to say what they meant, in kana with spaces between words (empty when theirs was already natural). note is one short, kind sentence in English about the most useful fix, or a word of praise. Never scold. If the learner wrote in English or romaji, ok is false, better shows how to say it in Japanese, and the note says so warmly.

Keep everything friendly and suitable for all ages. Stay inside the story world: the dojo, training, the town, food, school, everyday life. If the learner asks for something unrelated to chatting in Japanese, steer back gently in character.`;
}

/** The reply's shape, enforced by the API (structured outputs). */
const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['reply', 'check'],
  properties: {
    reply: {
      type: 'object', additionalProperties: false, required: ['jp', 'kana', 'en'],
      properties: { jp: { type: 'string' }, kana: { type: 'string' }, en: { type: 'string' } },
    },
    check: {
      type: 'object', additionalProperties: false, required: ['ok', 'better', 'note'],
      properties: { ok: { type: 'boolean' }, better: { type: 'string' }, note: { type: 'string' } },
    },
  },
};

export class ChatError extends Error {
  constructor(kind, detail = '') { super(kind); this.kind = kind; this.detail = detail; }
}
export const NOTES = {
  off: 'Free chat is off. Paste a Claude API key in Settings to turn it on.',
  offline: 'Couldn\'t reach Claude just now (offline?). Your message is kept; try sending again.',
  key: 'Claude didn\'t accept the API key. It may be wrong, expired or out of credit. Paste a new one in Settings.',
  rate: 'Claude asked the app to slow down. Wait a moment and send again.',
  busy: 'Claude is busy right now. Try again in a minute.',
  refused: 'They didn\'t answer that one. Try saying something else.',
  bad: 'The reply came back garbled. Try sending again.',
  request: 'Claude couldn\'t take that request.',
};

/** The request body for the next reply (exported for tests). */
export function requestBody(from, sender, tier, lines) {
  const messages = [];
  for (const l of lines.slice(-CONTEXT)) {
    const role = l.who === 'me' ? 'user' : 'assistant';
    const text = l.who === 'me' ? l.text : l.jp;
    // The first message must come from the learner, and turns alternate.
    if (!messages.length && role === 'assistant') continue;
    const last = messages[messages.length - 1];
    if (last && last.role === role) last.content += '\n' + text;
    else messages.push({ role, content: text });
  }
  const opus = cfg.model === 'claude-opus-5-5';
  return {
    model: cfg.model,
    max_tokens: 4000,
    system: [{ type: 'text', text: systemPrompt(from, sender, tier), cache_control: { type: 'ephemeral' } }],
    messages,
    output_config: { effort: 'low', format: { type: 'json_schema', schema: SCHEMA } },
    // If Claude Opus 5.5 declines, the API retries on Anthropic's recommended fallback model in the same call.
    ...(opus ? { fallbacks: 'default' } : {}),
  };
}

/**
 * Sends the learner's message to `from` and returns their reply line. The learner's line is saved first, so nothing
 * typed is lost if the call fails; the check on it is added when the reply comes.
 */
export async function send(from, sender, tier, text, { fetchFn = fetch } = {}) {
  if (!cfg.key) throw new ChatError('off');
  const said = String(text).trim().slice(0, 400);
  if (!said) return null;
  chats[from] = chatOf(from).concat({ who: 'me', text: said }).slice(-KEEP);
  saveChats();
  return reply(from, sender, tier, { fetchFn });
}

/** Asks for a reply to the chat as it stands (also used to retry after a failure). */
export async function reply(from, sender, tier, { fetchFn = fetch } = {}) {
  if (!cfg.key) throw new ChatError('off');
  const lines = chatOf(from);
  if (!lines.length || lines[lines.length - 1].who !== 'me') return null;
  const opus = cfg.model === 'claude-opus-5-5';
  let res;
  try {
    res = await fetchFn(API, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': cfg.key,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
        ...(opus ? { 'anthropic-beta': 'server-side-fallback-2026-07-01' } : {}),
      },
      body: JSON.stringify(requestBody(from, sender, tier, lines)),
    });
  } catch (e) {
    throw new ChatError('offline');
  }
  if (!res.ok) {
    let detail = '';
    try { detail = (await res.json())?.error?.message || ''; } catch (e) { /* no body */ }
    if (res.status === 401 || res.status === 403) throw new ChatError('key');
    if (res.status === 402) throw new ChatError('key');
    if (res.status === 429) throw new ChatError('rate');
    if (res.status >= 500) throw new ChatError('busy');
    throw new ChatError('request', detail);
  }
  let msg;
  try { msg = await res.json(); } catch (e) { throw new ChatError('bad'); }
  if (msg.stop_reason === 'refusal') throw new ChatError('refused');
  const text = (msg.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('');
  let out;
  try { out = JSON.parse(text); } catch (e) { throw new ChatError('bad'); }
  const r = out && out.reply;
  if (!r || !str(r.jp) || !str(r.kana) || !str(r.en) || !r.jp.trim()) throw new ChatError('bad');
  const c = out.check;
  const mine = lines[lines.length - 1];
  if (c && typeof c.ok === 'boolean') mine.check = { ok: c.ok, better: str(c.better) ? c.better.trim() : '', note: str(c.note) ? c.note.trim() : '' };
  const line = { who: 'them', jp: r.jp.trim(), kana: r.kana.trim(), en: r.en.trim() };
  chats[from] = lines.concat(line).slice(-KEEP);
  saveChats();
  return line;
}
