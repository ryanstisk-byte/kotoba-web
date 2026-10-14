// Ren's Messages: a phone-style thread from Ren (Kaito and the Master join as the story goes on). Opening the app can
// bring one new message a day. Each one is pitched at the learner's level (tier from the course, the Reading Dojo and
// known Garden words), uses known words plus at most one new one (tap it to plant it), shows kanji only once every
// kanji in it is known, and is voiced in the sender's voice. A "what did they mean?" tap checks comprehension lightly,
// and the reply chosen picks the next message. After time away the next note is a warm 久しぶり！, never a guilt trip.
// Nothing expires and nothing is lost when days are skipped.
import { store, dateKey } from './store.js';
import { speaker } from './audio.js';
import { GARDEN_CATALOG } from './data.js';
import { WELCOME_BACK, MESSAGE_BY_ID, SENDERS } from './messages-data.js';
import { content, isUnlocked, itemOpen } from './levels.js';
import { esc, shuffle, delegate, toast } from './ui.js';
import * as fx from './fx.js';

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
const senderOpen = (m) => { const s = SENDERS[m.from]; return !s.after || cleared().has(s.after); };

/** Whether a message can arrive now: its sender and story moment are reached, its tier fits, at most one new word. */
export function eligible(m, tier = learnerTier()) {
  return itemOpen(m) && senderOpen(m) && (!m.after || cleared().has(m.after)) && m.tier <= tier && newWords(m).length <= 1;
}

/** Messages that are only meant to come as an answer to a reply (the middle of a short conversation). */
const CHAINED = new Set(Object.values(MESSAGE_BY_ID).flatMap((m) => m.replies.map((r) => r.next).filter(Boolean)));

/**
 * The next message: the one the last reply asked for, if it fits; otherwise a fresh conversation, story moments
 * first (the latest chapter reached), then the learner's own tier before easier ones, in writing order.
 */
export function pickNext() {
  const thread = store.messages;
  const had = new Set(thread.map((e) => e.id));
  const tier = learnerTier();
  const last = thread[thread.length - 1];
  if (last && last.reply != null) {
    const want = MESSAGE_BY_ID[last.id]?.replies[last.reply]?.next;
    const m = want && MESSAGE_BY_ID[want];
    if (m && !had.has(m.id) && eligible(m, tier)) return m;
  }
  const open = content('messages').filter((m) => !had.has(m.id) && eligible(m, tier));
  const starts = open.filter((m) => !CHAINED.has(m.id));
  const pool = starts.length ? starts : open;
  const chapterNo = (m) => (m.after ? Number(m.after.slice(2)) : 0);
  return pool.slice().sort((a, b) => chapterNo(b) - chapterNo(a) || (b.tier === tier) - (a.tier === tier) || b.tier - a.tier)[0] || null;
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

/** Messages not replied to yet. */
export const unread = () => store.messages.filter((e) => e.reply == null).length;

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
export function mount(el) {
  deliver();   // opened straight from a bookmark or the Home Screen: today's message comes here too
  let quiz = null;   // { id, opts: [{ text, right }], picked }
  const say = (m) => speaker.speak(m.jp, { voice: SENDERS[m.from].voice, mps: 4 });

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
      if (!quiz || quiz.id !== e.id) quiz = { id: e.id, opts: shuffle(m.meaning.map((text, k) => ({ text, right: k === 0 }))), picked: -1 };
      body = `<div class="msg-check stack-sm"><p class="small strong">What did ${esc(s.name)} mean?</p>
        <div class="choice-grid practice-opts">${quiz.opts.map((o, k) => `<button class="btn" data-act="mean" data-k="${k}">${esc(o.text)}</button>`).join('')}</div></div>`;
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
    return `<div class="msg-row" data-msg="${esc(e.id)}">
        <span class="msg-face" lang="ja" data-noruby aria-hidden="true" style="--who:${s.color}">${esc(s.jpName.slice(0, 1))}</span>
        <div class="msg-bubble" style="--who:${s.color}">
          <p class="tiny dim">${esc(s.name)} · ${esc(e.day)}</p>
          <p class="msg-text" lang="ja">${esc(shownText(m))}</p>
          <div class="row-gap wrap-gap">
            <button class="btn small-btn" data-act="hear" data-id="${esc(e.id)}">🔊 Hear it</button>
            ${word && latest ? `<button class="btn small-btn msg-new" data-act="plant" data-id="${esc(word.id)}">＋ New word: <span lang="ja">${esc(word.jp)}</span> · ${esc(word.en)}</button>` : ''}
          </div>
          ${body}
        </div>
      </div>
      ${reply ? `<div class="msg-row mine"><div class="msg-bubble mine"><p class="msg-text" lang="ja">${esc(reply.jp)}</p><p class="tiny dim">${esc(reply.en)}</p></div></div>` : ''}`;
  }

  function render() {
    const list = store.messages;
    const lastDone = list.length && list[list.length - 1].reply != null;
    el.innerHTML = `
      <div class="stack msgs">
        <p class="small dim">Messages from Ren and friends, at your level. One can arrive each day you open the app; nothing expires, so skip days freely.</p>
        ${list.length ? `<div class="msg-thread">${list.map((e, i) => bubble(e, i, list)).join('')}</div>`
          : '<div class="panel note">No messages yet. Ren will write the next time you open the app.</div>'}
        ${lastDone ? '<p class="small dim center-text">Ren will write back another day.</p>' : ''}
      </div>`;
  }

  const off = delegate(el, {
    hear: (b) => { const m = MESSAGE_BY_ID[b.dataset.id]; if (m) say(m); },
    plant: (b) => {
      const it = GARDEN_CATALOG[b.dataset.id];
      store.plant(b.dataset.id);
      toast(`Planted ${it ? it.jp : 'it'} in the Garden`);
      render();
    },
    mean: (b) => {
      const e = store.messages[store.messages.length - 1];
      const m = MESSAGE_BY_ID[quiz.id];
      const o = quiz.opts[+b.dataset.k];
      const entry = store.messageEntry(quiz.id);
      store.answerMessage(quiz.id, o.right);
      store.grade({ skill: 'vocab', id: 'msg:' + quiz.id, ok: o.right });
      if (o.right) fx.hit(); else fx.miss();
      fx.announce(o.right ? 'Right.' : `Not quite. ${m.meaning[0]}`);
      quiz = null;
      render();
      if (!o.right && entry === e) say(m);
    },
    reply: (b) => {
      store.replyMessage(b.dataset.id, +b.dataset.k);
      render();
      el.querySelector('.msg-row.mine:last-of-type')?.scrollIntoView({ block: 'nearest' });
    },
  });

  render();
  // The newest message plays once when the inbox opens, if it hasn't been answered yet.
  const last = store.messages[store.messages.length - 1];
  const m = last && last.reply == null && MESSAGE_BY_ID[last.id];
  const t = m ? setTimeout(() => say(m), 300) : 0;
  el.querySelector('.msg-row:last-child')?.scrollIntoView({ block: 'nearest' });
  return () => { off(); clearTimeout(t); speaker.stop(); };
}
