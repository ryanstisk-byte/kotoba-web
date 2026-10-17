// Ren's Messages: phone-style chats with Ren and the rest of the story cast (Kaito, the Master, Sora and Granny Kiku join
// as the story goes on). The learner switches between them; each person keeps their own speech level (casual or
// polite), and starting a chat means picking the opener in the level that fits them. Opening the app can bring one new
// message a day; beyond that the learner can chat with anyone as much as they like: a reply that carries the
// conversation on is answered right away, and a finished conversation can be followed by a new one. Each one is pitched at the learner's level (tier from the course, the Reading Dojo and
// known Garden words), uses known words plus at most one new one (tap it to plant it), shows kanji only once every
// kanji in it is known, and is voiced in the sender's voice. A "what did they mean?" tap checks comprehension lightly,
// and the reply chosen picks the next message. After time away the next note is a warm 久しぶり！, never a guilt trip.
// Nothing expires and nothing is lost when days are skipped.
import { store, dateKey } from './store.js';
import { speaker } from './audio.js';
import { GARDEN_CATALOG } from './data.js';
import { WELCOME_BACK, MESSAGE_BY_ID, SENDERS, CONTACTS } from './messages-data.js';
import { content, isUnlocked, itemOpen } from './levels.js';
import { esc, shuffle, delegate, toast } from './ui.js';
import * as fx from './fx.js';
import { lookupHTML, mountLookup } from './lookup.js';

const DAY = 86_400_000;
/** Days away after which the next message is a welcome back. */
export const AWAY_DAYS = 4;

// ---------- the learner's level ----------
const reviewedWords = () => store.planted().filter(({ prog }) => prog.r > 0).length;

/**
 * Which tier of message fits: 1 kana-only polite; 2 casual speech, once hiragana is done and the course is a few units
 * in (or 60 words are known); 3 N4 grammar, once the N5 core course is done (or 200 words are known); 4 N4 casual
 * chat, once N4 is unlocked as well; 5 N3 grammar in chat, once N3 is unlocked.
 */
export function learnerTier() {
  const done = new Set(store.s.course.done);
  const words = reviewedWords();
  let t = 1;
  if (store.trackDone('hiragana') && (done.size >= 4 || words >= 60)) t = 2;
  if (t === 2 && (done.has('p1-10') || words >= 200)) t = 3;
  // 4: N4 plain, casual speech between friends, once N4 is unlocked (js/levels.js).
  if (t === 3 && isUnlocked('N4')) t = 4;
  // 5: N3 grammar in casual chat, once N3 is unlocked.
  if (t === 4 && isUnlocked('N3')) t = 5;
  return t;
}

/** Kanji the learner knows: learned in the Reading Dojo or forged in Kanji Forge. */
export function knownKanji() {
  const out = new Set(store.forgedKanji);
  for (const [id, p] of Object.entries(store.s.items)) if (id.startsWith('kj:') && p.r > 0) out.add(id.slice(3));
  return out;
}

/** The text to show: with kanji only when every kanji in it is known, otherwise the kana version. */
export function shownText(m, known = knownKanji()) {
  const kanji = [...m.jp].filter((c) => /[一-鿿々]/.test(c));
  return kanji.length && kanji.every((c) => known.has(c)) ? m.jp : kanji.length ? m.kana : m.jp;
}

/** Words in a message the learner hasn't planted yet. */
export const newWords = (m) => m.words.filter((id) => !store.item(id));

const cleared = () => store.clearedChapters;
/** Whether the learner has met this person in the story yet. */
export const contactOpen = (from) => { const s = SENDERS[from]; return !!s && (!s.after || cleared().has(s.after)); };
const senderOpen = (m) => contactOpen(m.from);

/** One person's messages, oldest first. */
export const threadOf = (from) => store.messages.filter((e) => MESSAGE_BY_ID[e.id]?.from === from);

/** Whether a message can arrive now: its sender and story moment are reached, its tier fits, at most one new word. */
export function eligible(m, tier = learnerTier()) {
  return itemOpen(m) && senderOpen(m) && (!m.after || cleared().has(m.after)) && m.tier <= tier && newWords(m).length <= 1;
}

/** Messages that are only meant to come as an answer to a reply (the middle of a short conversation). */
const CHAINED = new Set(Object.values(MESSAGE_BY_ID).flatMap((m) => m.replies.map((r) => r.next).filter(Boolean)));

/**
 * The next message (from anyone, or from `from` only): the one the last reply asked for, if it fits; otherwise a
 * fresh conversation: their hello when messaging someone new, then story moments (the latest chapter reached), then the learner's own tier before easier
 * ones, in writing order.
 */
export function pickNext(from = null) {
  const thread = from ? threadOf(from) : store.messages;
  const had = new Set(store.messages.map((e) => e.id));
  const tier = learnerTier();
  const last = thread[thread.length - 1];
  if (last && last.reply != null) {
    const want = MESSAGE_BY_ID[last.id]?.replies[last.reply]?.next;
    const m = want && MESSAGE_BY_ID[want];
    if (m && !had.has(m.id) && eligible(m, tier)) return m;
  }
  const open = content('messages').filter((m) => (!from || m.from === from) && !had.has(m.id) && eligible(m, tier));
  const starts = open.filter((m) => !CHAINED.has(m.id));
  const pool = starts.length ? starts : open;
  const chapterNo = (m) => (m.after ? Number(m.after.slice(2)) : 0);
  // Messaging someone for the first time: they say hello first.
  const hello = (m) => !!from && !!m.intro && !thread.length;
  return pool.slice().sort((a, b) => hello(b) - hello(a) || chapterNo(b) - chapterNo(a) || (b.tier === tier) - (a.tier === tier) || b.tier - a.tier)[0] || null;
}

/** A warm note for someone coming back after AWAY_DAYS or more: the closest one at or under their tier. */
export function welcomeBack(tier = learnerTier()) {
  return WELCOME_BACK.filter((m) => m.tier <= tier && itemOpen(m)).slice(-1)[0];
}

/**
 * Called when the app opens (Today): brings at most one new message a day. Returns the message that arrived, or null.
 * `away`: ms since the previous session (null on a first visit).
 */
export function deliver(now = Date.now(), away = store.previousSession ? now - store.previousSession : null) {
  const today = dateKey(new Date(now));
  if (store.messages.some((e) => e.day === today)) return null;
  const m = away != null && away >= AWAY_DAYS * DAY && store.messages.length ? welcomeBack() : pickNext();
  if (!m) return null;
  store.deliverMessage(m.id, now);
  return m;
}

/** Messages not replied to yet (from one person, or from everyone). */
export const unread = (from = null) => (from ? threadOf(from) : store.messages).filter((e) => e.reply == null).length;

/**
 * Whether the learner can message this person now: met in the story, nothing of theirs waiting for a reply, and they
 * have something at the learner's level to say. There's no daily limit: chat as much as the messages allow.
 */
export function canStart(from) {
  return contactOpen(from) && !unread(from) && !!pickNext(from);
}

/** The speech level that fits when writing to this person ('polite' or 'casual'). */
export const registerFor = (from, tier = learnerTier()) => SENDERS[from].answer(tier);

/** The learner messages this person first: their next message arrives. Returns it, or null. */
export function startChat(from, now = Date.now()) {
  if (!canStart(from)) return null;
  const m = pickNext(from);
  store.deliverMessage(m.id, now);
  return m;
}

/** The little card on Today. */
export function inboxCard() {
  const thread = store.messages;
  if (!thread.length) return '';
  const last = thread[thread.length - 1];
  const m = MESSAGE_BY_ID[last.id];
  if (!m) return '';
  const s = SENDERS[m.from];
  const n = unread();
  return `<a class="panel link-panel msg-card" href="#/messages" style="--who:${s.color}">
      <span class="msg-face" lang="ja" data-noruby aria-hidden="true">${esc(s.jpName.slice(0, 1))}</span>
      <span class="grow"><span class="strong">💬 ${n ? `${n} new message${n === 1 ? '' : 's'}` : 'Messages'}</span> <span class="small dim">from ${esc(s.name)}</span><br>
      <span class="small msg-preview" lang="ja" data-noruby>${esc(shownText(m))}</span></span>
      <span class="dim chev" aria-hidden="true">›</span></a>`;
}

// ---------- the inbox screen ----------
/** The person whose chat is open (kept while the app is open). */
let current = null;
/** The opener the learner sent to start a chat, by the message it brought: { jp, en, ok, reg } (kept while the app is open). */
const openers = new Map();

/** Who to show first: whoever has the newest message waiting for a reply, else the newest message's sender, else Ren. */
function firstContact() {
  const list = store.messages;
  const waiting = [...list].reverse().find((e) => e.reply == null && MESSAGE_BY_ID[e.id]);
  const last = waiting || [...list].reverse().find((e) => MESSAGE_BY_ID[e.id]);
  return last ? MESSAGE_BY_ID[last.id].from : 'ren';
}

const REGISTER = { polite: 'Polite (です・ます)', casual: 'Casual (plain forms)' };

export function mount(el) {
  deliver();   // opened straight from a bookmark or the Home Screen: today's message comes here too
  if (!current || !SENDERS[current]) current = firstContact();
  const quizzes = new Map();   // message id -> [{ text, right }] in the order shown
  let greet = null;   // { from, opts: [{ jp, en, reg }], picked: -1 } while choosing how to start a chat
  const say = (m) => speaker.speak(m.jp, { voice: SENDERS[m.from].voice, mps: 4 });
  const quizFor = (m) => {
    if (!quizzes.has(m.id)) quizzes.set(m.id, shuffle(m.meaning.map((text, k) => ({ text, right: k === 0 }))));
    return quizzes.get(m.id);
  };

  function bubble(e, i, list) {
    const m = MESSAGE_BY_ID[e.id];
    if (!m) return '';
    const s = SENDERS[m.from];
    const latest = i === list.length - 1;
    const fresh = newWords(m);
    const word = fresh[0] && GARDEN_CATALOG[fresh[0]];
    const open = e.reply == null;
    let body = '';
    if (open && e.ok == null) {
      body = `<div class="msg-check stack-sm"><p class="small strong">What did ${esc(s.name)} mean?</p>
        <div class="msg-opts">${quizFor(m).map((o, k) => `<button class="btn left" data-act="mean" data-id="${esc(e.id)}" data-k="${k}">${esc(o.text)}</button>`).join('')}</div></div>`;
    } else if (open) {
      const right = m.meaning[0];
      body = `<p class="small ${e.ok ? 'good-c' : 'miss-c'}">${e.ok ? '✓ ' : ''}${esc(right)}</p>
        <p class="small dim">${esc(m.en)}</p>
        <div class="msg-replies stack-sm"><p class="small strong">Reply:</p>
          ${m.replies.map((r, k) => `<button class="btn msg-reply" data-act="reply" data-id="${esc(e.id)}" data-k="${k}"><span lang="ja">${esc(r.jp)}</span><span class="small dim">${esc(r.en)}</span></button>`).join('')}</div>`;
    } else {
      body = `<p class="small dim">${esc(m.en)}</p>`;
    }
    const reply = e.reply != null ? m.replies[e.reply] : null;
    const sent = openers.get(e.id);
    const fit = sent && (sent.ok ? `✓ Right: with ${esc(s.name)}, ${sent.reg} speech fits.` : `With ${esc(s.name)}, ${sent.reg} speech fits better. ${esc(s.name)} still wrote back.`);
    return `${sent ? `<div class="msg-row mine"><div class="msg-bubble mine"><p class="msg-text" lang="ja">${esc(sent.jp)}</p><p class="tiny dim">${esc(sent.en)}</p></div></div>
      <p class="small msg-fit ${sent.ok ? 'good-c' : 'miss-c'}">${fit}</p>` : ''}
      <div class="msg-row" data-msg="${esc(e.id)}">
        <span class="msg-face" lang="ja" data-noruby aria-hidden="true" style="--who:${s.color}">${esc(s.jpName.slice(0, 1))}</span>
        <div class="msg-bubble" style="--who:${s.color}">
          <p class="tiny dim">${esc(s.name)} · ${esc(e.day)}</p>
          <p class="msg-text" lang="ja">${lookupHTML(shownText(m))}</p>
          <div class="row-gap wrap-gap">
            <button class="btn small-btn" data-act="hear" data-id="${esc(e.id)}">🔊 Hear it</button>
            ${word && latest ? `<button class="btn small-btn msg-new" data-act="plant" data-id="${esc(word.id)}">＋ New word: <span lang="ja">${esc(word.jp)}</span> · ${esc(word.en)}</button>` : ''}
          </div>
          ${body}
        </div>
      </div>
      ${reply ? `<div class="msg-row mine"><div class="msg-bubble mine"><p class="msg-text" lang="ja">${esc(reply.jp)}</p><p class="tiny dim">${esc(reply.en)}</p></div></div>` : ''}`;
  }

  /** The row of people to switch between. */
  function contacts() {
    return `<div class="msg-contacts" role="group" aria-label="Who to message">${CONTACTS.map((id) => {
      const s = SENDERS[id];
      const met = contactOpen(id);
      const n = met ? unread(id) : 0;
      return `<button class="msg-contact${met ? '' : ' locked'}" data-act="who" data-who="${id}" aria-pressed="${id === current}" style="--who:${s.color}">
          <span class="msg-face" lang="ja" data-noruby aria-hidden="true">${met ? esc(s.jpName.slice(0, 1)) : '🔒'}</span>
          <span class="msg-contact-name">${esc(s.name.replace('Granny ', ''))}</span>
          ${n ? `<span class="msg-dot" aria-label="${n} new"></span>` : ''}
        </button>`;
    }).join('')}</div>`;
  }

  /** Who they are, how they talk, and how to talk back. */
  function about(id) {
    const s = SENDERS[id];
    const reg = registerFor(id);
    return `<div class="panel msg-about" style="--who:${s.color}">
        <p><span class="strong">${esc(s.name)}</span> <span class="small dim">· ${esc(s.role)}</span></p>
        <p class="small">${esc(s.talk)}</p>
        <p class="small"><span class="dim">Write back:</span> <span class="msg-reg">${REGISTER[reg]}</span></p>
      </div>`;
  }

  /** What comes after the chat: start it, or a short note on why there's nothing to do. */
  function footer(id, list) {
    const s = SENDERS[id];
    if (!contactOpen(id)) return `<div class="panel note">You'll meet ${esc(s.name)} in Story chapter ${esc(s.after.slice(2))}. After that you can message them here.</div>`;
    if (unread(id)) return '';
    if (canStart(id)) {
      if (!greet || greet.from !== id) {
        const right = registerFor(id);
        greet = { from: id, opts: shuffle(['polite', 'casual'].map((reg) => ({ jp: s.open[reg][0], en: s.open[reg][1], reg, right: reg === right }))) };
      }
      return `<div class="panel msg-start stack-sm">
          <p class="small strong">${list.length ? 'Start a new chat with' : 'Message'} ${esc(s.name)}: which opener fits?</p>
          <div class="msg-opts">${greet.opts.map((o, k) => `<button class="btn msg-reply" data-act="greet" data-k="${k}"><span lang="ja">${esc(o.jp)}</span><span class="small dim">${esc(o.en)}</span></button>`).join('')}</div>
        </div>`;
    }
    return `<p class="small dim center-text">${list.length ? `${esc(s.name)} has nothing new at your level yet.` : `${esc(s.name)} has nothing to say at your level yet.`} Plant more words in the Garden and check back.</p>`;
  }

  function render() {
    const list = threadOf(current);
    el.innerHTML = `
      <div class="stack msgs">
        <p class="small dim">Text Ren and friends at your level, as much as you like. Each person talks their own way, so match how you write back. Nothing expires, so skip days freely.</p>
        ${contacts()}
        ${about(current)}
        ${list.length ? `<div class="msg-thread">${list.map((e, i) => bubble(e, i, list)).join('')}</div>` : ''}
        ${footer(current, list)}
      </div>`;
  }

  /** Brings the newest row of the open chat into view. */
  const toEnd = () => el.querySelector('.msg-thread > .msg-row:last-child, .msg-start')?.scrollIntoView({ block: 'nearest' });

  const off = delegate(el, {
    hear: (b) => { const m = MESSAGE_BY_ID[b.dataset.id]; if (m) say(m); },
    plant: (b) => {
      const it = GARDEN_CATALOG[b.dataset.id];
      store.plant(b.dataset.id);
      toast(`Planted ${it ? it.jp : 'it'} in the Garden`);
      render();
    },
    who: (b) => {
      if (b.dataset.who === current) return;
      speaker.stop();
      current = b.dataset.who;
      render();
      el.querySelector(`[data-act=who][data-who="${current}"]`)?.focus();
    },
    greet: (b) => {
      const o = greet && greet.opts[+b.dataset.k];
      if (!o) return;
      const from = greet.from;
      store.grade({ skill: 'grammar', id: 'reg:' + from, ok: o.right });
      if (o.right) fx.hit(); else fx.miss();
      const m = startChat(from);
      const reg = registerFor(from);
      if (m) openers.set(m.id, { jp: o.jp, en: o.en, ok: o.right, reg });
      fx.announce(o.right ? 'Right.' : `With ${SENDERS[from].name}, ${reg} speech fits better.`);
      greet = null;
      render();
      toEnd();
      if (m) setTimeout(() => say(m), 300);
    },
    mean: (b) => {
      const m = MESSAGE_BY_ID[b.dataset.id];
      const o = m && quizFor(m)[+b.dataset.k];
      if (!o) return;
      store.answerMessage(m.id, o.right);
      store.grade({ skill: 'vocab', id: 'msg:' + m.id, ok: o.right });
      if (o.right) fx.hit(); else fx.miss();
      fx.announce(o.right ? 'Right.' : `Not quite. ${m.meaning[0]}`);
      quizzes.delete(m.id);
      render();
      if (!o.right) say(m);
    },
    reply: (b) => {
      const m = MESSAGE_BY_ID[b.dataset.id];
      store.replyMessage(b.dataset.id, +b.dataset.k);
      // A reply that carries the conversation on gets its answer right away.
      const want = m?.replies[+b.dataset.k]?.next;
      const next = want && pickNext(m.from)?.id === want ? startChat(m.from) : null;
      render();
      const mine = el.querySelectorAll('.msg-row.mine');
      (next ? el.querySelector('.msg-thread > .msg-row:last-child') : mine[mine.length - 1])?.scrollIntoView({ block: 'nearest' });
      if (next) setTimeout(() => say(next), 300);
    },
  });

  render();
  // The open chat's newest message plays once when the inbox opens, if it hasn't been answered yet.
  const list = threadOf(current);
  const last = list[list.length - 1];
  const m = last && last.reply == null && MESSAGE_BY_ID[last.id];
  const t = m ? setTimeout(() => say(m), 300) : 0;
  el.querySelector('.msg-thread > .msg-row:last-child')?.scrollIntoView({ block: 'nearest' });
  const offLookup = mountLookup(el);
  return () => { off(); offLookup(); clearTimeout(t); speaker.stop(); };
}
