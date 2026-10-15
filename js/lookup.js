// Tap a word to look it up: any word in a Story line, one of Ren's Messages or a Library reader. The words and their
// dictionary forms are worked out ahead of time (tools/build_lookup.py writes js/lookup-data.js), so lookup works
// offline. A word that is a Garden card shows the card's meaning and can be planted from here; particles and endings
// get a short note; other words show a meaning from JMdict (EDRDG, CC BY-SA 4.0).
//
// Use: put `lookupHTML(text)` where the text goes (it falls back to the plain text for a line it doesn't know), and
// call `mountLookup(root)` once per screen; it returns a function that removes it.
import { store } from './store.js';
import { speaker } from './audio.js';
import { GARDEN_CATALOG } from './data.js';
import { isUnlocked, levelOf } from './levels.js';
import { romaji } from './romaji.js';
import { esc, toast } from './ui.js';
import { TOKENS, ENTRIES } from './lookup-data.js';

/** Short notes for particles and grammar endings (keyed by dictionary form). */
export const LOOKUP_GRAMMAR = {
  'は': ['wa', 'Topic marker: what the sentence is about ("as for…"). Written は, read "wa".'],
  'が': ['ga', 'Marks who or what does it, often new or key information. At the start of a clause it can also mean "but".'],
  'を': ['o', 'Marks the thing an action is done to (eat WHAT, read WHAT). Written を, read "o".'],
  'に': ['ni', 'Where something goes or is, a time (at 7), or the person you give to or meet: "to, at, in".'],
  'へ': ['e', 'Direction: "toward, to". Written へ, read "e".'],
  'で': ['de', 'Where an action happens ("in, at"), or the means ("by train, with chopsticks").'],
  'と': ['to', '"And" between nouns, "with" someone, or quoting what was said or thought.'],
  'の': ['no', 'Links nouns like \'s or "of" (Ren\'s book). At the end of a sentence it softens or asks a question.'],
  'も': ['mo', '"Too, also"; it replaces は or が. With a number it can mean "as many as".'],
  'や': ['ya', '"And" in a list that isn\'t complete ("A and B, among others").'],
  'か': ['ka', 'Question marker at the end of a sentence; between nouns, "or".'],
  'ね': ['ne', 'At the end: "right?" or "isn\'t it?", looking for agreement.'],
  'よ': ['yo', 'At the end: tells the listener something new, like "you know!".'],
  'ぞ': ['zo', 'At the end: a rough, emphatic "I\'m telling you!" Tough anime characters use it a lot.'],
  'ぜ': ['ze', 'At the end: a casual, cocky "let\'s go!" or "you know!". Used by young men in casual speech.'],
  'な': ['na', 'At the end: a soft "huh" to yourself, or after a plain verb, a blunt "don\'t!". It also links な-adjectives to nouns.'],
  'から': ['kara', '"From" (a place or time), or after a clause, "because, so".'],
  'まで': ['made', '"Until, as far as".'],
  'より': ['yori', '"Than" in comparisons; also "from" in formal writing.'],
  'だけ': ['dake', '"Only, just".'],
  'しか': ['shika', '"Only, nothing but", always with a negative verb after it.'],
  'でも': ['demo', '"Even", or "…or something" in suggestions. At the start of a sentence, "but".'],
  'けど': ['kedo', '"But, although" (casual). Often softens a sentence left unfinished.'],
  'けれど': ['keredo', '"But, although".'],
  'が、': ['ga', '"But".'],
  'って': ['tte', 'Casual quote marker ("he said…"), or a casual topic marker ("about…").'],
  'ながら': ['nagara', '"While" doing something at the same time.'],
  'ので': ['node', '"Because, so" (softer and more polite than から).'],
  'のに': ['noni', '"Even though"; or "in order to".'],
  'たり': ['tari', 'Listing a few actions as examples: "things like doing A and B".'],
  'ば': ['ba', '"If": the ば conditional.'],
  'て': ['te', 'The て form joins actions: "do A and (then) B".'],
  'ても': ['temo', '"Even if".'],
  'ほど': ['hodo', '"About, to the extent of"; with a negative, "not as … as".'],
  'くらい': ['kurai', '"About, around" (an amount), or "at least".'],
  'ぐらい': ['gurai', '"About, around" (an amount).'],
  'など': ['nado', '"And so on, things like".'],
  'わ': ['wa', 'At the end: soft emphasis (older or feminine speech), or surprise.'],
  'さ': ['sa', 'Casual filler at the end of a phrase, like "you see".'],
  'じゃ': ['ja', 'Casual では: "well then", or part of じゃない (isn\'t).'],
  'ちゃ': ['cha', 'Casual ては: part of 〜ちゃ いけない (must not).'],
  'し': ['shi', '"And also, and besides" when listing reasons.'],
  'ばかり': ['bakari', '"Nothing but, only"; after the た form, "just did".'],
  'こそ': ['koso', 'Strong emphasis: "THIS is the one".'],
  'さえ': ['sae', '"Even".'],
  'すら': ['sura', '"Even" (written style).'],
  'とか': ['toka', '"Things like" in a casual list.'],
  'なんて': ['nante', '"Things like…" with surprise or dismissal.'],
  'かな': ['kana', 'At the end: "I wonder".'],
  'っけ': ['kke', 'At the end: "what was it again?", trying to remember.'],
  // Endings (auxiliaries)
  'です': ['desu', 'Polite "is / am / are".'],
  'だ': ['da', 'Plain (casual) "is / am / are".'],
  'ます': ['masu', 'Polite verb ending.'],
  'た': ['ta', 'Past tense (did) or a finished action.'],
  'ない': ['nai', 'Negative: "not".'],
  'たい': ['tai', '"Want to" do something.'],
  'う': ['u', 'Volitional: "let\'s" or "I think I\'ll".'],
  'よう': ['you', '"Let\'s", "I\'ll", or "looks like".'],
  'らしい': ['rashii', '"Apparently, I hear", or "typical of".'],
  'そうだ': ['souda', '"Looks like" or "I heard that".'],
  'みたい': ['mitai', '"Seems like, like".'],
  'ん': ['n', 'Casual ない (not), or the explaining ん in 〜んです.'],
  'ぬ': ['nu', 'Old or rough negative: "not".'],
  'まい': ['mai', '"Will not, probably not" (written style).'],
};

/** Counters a number can come with (二本, 三時). */
const COUNTERS = {
  '時': "o'clock", '分': 'minutes', '時間': 'hours', '本': 'long, thin things (pens, bottles, skewers)', '人': 'people',
  '円': 'yen', '月': 'month of the year', 'か月': 'months', '日': 'day of the month, or days', '年': 'year(s)',
  'つ': 'things (general counter)', '個': 'small things', '枚': 'flat things (paper, plates, shirts)', '回': 'times',
  '歳': 'years old', 'さい': 'years old', '階': 'floor (of a building)', '匹': 'small animals', 'ひき': 'small animals',
  '冊': 'books', '台': 'machines and vehicles', '杯': 'cups, glasses, bowls', '週間': 'weeks', '番': 'number (in order)',
  '度': 'times; degrees', '頭': 'large animals', '番目': 'place in order (first, second…)', '倍': 'times as much',
};

/** The token list for a text: [{ text, entry }] (entry null for gaps like spaces and punctuation), or null. */
export function tokens(text) {
  const seq = TOKENS[text];
  if (!seq) return null;
  const out = [];
  let at = 0;
  for (let i = 0; i < seq.length; i += 2) {
    const n = seq[i];
    out.push({ text: text.slice(at, at + n), entry: seq[i + 1] >= 0 ? seq[i + 1] : null });
    at += n;
  }
  if (at < text.length) out.push({ text: text.slice(at), entry: null });
  return out;
}

/** A text as tappable words (the plain text if it isn't one the lookup knows). */
export function lookupHTML(text) {
  const t = tokens(text);
  if (!t) return esc(text);
  return t.map((x) => (x.entry === null ? esc(x.text)
    : `<span class="lk" role="button" tabindex="0" data-lk="${x.entry}">${esc(x.text)}</span>`)).join('');
}

/** Whether a text has tappable words. */
export const canLookUp = (text) => !!TOKENS[text];

/**
 * What to show for an entry: { jp, reading, en, note, kind, id, say }. kind: 'card' (a Garden card), 'grammar',
 * 'number', 'word' (a meaning from the line or JMdict), 'unknown'.
 */
export function describe(index) {
  const e = ENTRIES[index];
  if (!e) return null;
  const [type] = e;
  if (type === 'g' || type === 'c') {
    const item = GARDEN_CATALOG[e[1]];
    if (!item) return null;
    return { kind: 'card', id: item.id, jp: item.jp, reading: item.reading, en: item.en, say: item.say || item.reading, level: levelOf(item),
      note: type === 'c' ? 'Here in its "can do" (potential) form.' : '' };
  }
  if (type === 'p') {
    const [ro, note] = LOOKUP_GRAMMAR[e[1]] || [romaji(e[1]), 'A particle or ending: it shows how the words around it fit together.'];
    return { kind: 'grammar', jp: e[1], reading: e[1], romaji: ro, en: '', note };
  }
  if (type === 'n') {
    const [, jp, reading, counter] = e;
    const what = COUNTERS[counter] || COUNTERS[jp.replace(/^[一二三四五六七八九十百千万0-9０-９]+/, '')];
    return { kind: 'number', jp, reading, en: what ? `a number + counter for ${what}` : 'a number', note: '', say: reading };
  }
  if (type === 'w' || type === 'j' || type === 'k') {
    return { kind: 'word', jp: e[1], reading: e[2], en: e[3], say: e[2], note: type === 'k' ? 'Here in its "can do" (potential) form.' : '', jmdict: type !== 'w' };
  }
  return { kind: 'unknown', jp: e[1], reading: e[2], en: '', say: e[2], note: "This word isn't in the app's word lists yet." };
}

let sheet = null;
let lastTarget = null;

function close() {
  if (!sheet) return;
  sheet.remove();
  sheet = null;
  document.removeEventListener('keydown', onKey, true);
  if (lastTarget && lastTarget.isConnected) lastTarget.classList.remove('on');
}

function onKey(e) {
  if (e.key === 'Escape') { e.preventDefault(); const t = lastTarget; close(); if (t && t.isConnected) t.focus(); }
}

function render(info) {
  const planted = info.kind === 'card' && !!store.s.items[info.id];
  const canPlant = info.kind === 'card' && !planted && isUnlocked(info.level);
  const showReading = info.reading && info.reading !== info.jp;
  return `
    <div class="lk-head">
      <span class="grow"><span class="lk-word" lang="ja" data-noruby>${esc(info.jp)}</span>
        ${showReading ? `<span class="lk-reading" lang="ja" data-noruby>${esc(info.reading)}</span>` : ''}
        <span class="lk-romaji mono dim">${esc(info.romaji || romaji(info.reading || info.jp, { particles: false }))}</span></span>
      <button class="btn ghost small-btn" data-lkact="close" aria-label="Close">✕</button>
    </div>
    ${info.en ? `<p class="lk-en strong">${esc(info.en)}</p>` : ''}
    ${info.note ? `<p class="small dim">${esc(info.note)}</p>` : ''}
    <div class="lk-actions">
      ${info.say ? '<button class="btn small-btn" data-lkact="hear">🔊 Hear it</button>' : ''}
      ${canPlant ? '<button class="btn primary small-btn" data-lkact="plant">＋ Plant in Garden</button>' : ''}
      ${planted ? '<span class="tag">🌱 In your Garden</span>' : ''}
    </div>
    ${info.jmdict ? '<p class="tiny dim">Meaning from JMdict (EDRDG, CC BY-SA 4.0).</p>' : ''}`;
}

function open(target) {
  const info = describe(+target.dataset.lk);
  if (!info) return;
  close();
  lastTarget = target;
  target.classList.add('on');
  sheet = document.createElement('div');
  sheet.className = 'lk-sheet';
  sheet.setAttribute('role', 'dialog');
  sheet.setAttribute('aria-label', `Word: ${info.jp}`);
  sheet.innerHTML = render(info);
  sheet.addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-lkact]');
    if (!b) return;
    ev.preventDefault();
    const act = b.dataset.lkact;
    if (act === 'close') { close(); if (target.isConnected) target.focus(); }
    if (act === 'hear') speaker.speak(info.say, { mps: 3 });
    if (act === 'plant') {
      store.plant(info.id);
      toast(`🌱 Planted ${info.jp}: it joins your Garden's new words.`);
      sheet.innerHTML = render(info);
      sheet.querySelector('[data-lkact=close]')?.focus();
    }
  });
  document.body.appendChild(sheet);
  document.addEventListener('keydown', onKey, true);
  sheet.querySelector('[data-lkact=hear]')?.focus({ preventScroll: true });
  if (info.say) speaker.speak(info.say, { mps: 3 });
}

/** Makes the tappable words under `root` open the lookup. Returns a function that removes it (and closes the sheet). */
export function mountLookup(root) {
  const onClick = (ev) => {
    const t = ev.target.closest('.lk');
    if (t && root.contains(t)) {
      // The word sits inside a line that does something else on a tap (show the meaning): the word wins.
      ev.preventDefault();
      ev.stopPropagation();
      if (lastTarget === t && sheet) { close(); return; }
      open(t);
      return;
    }
    if (sheet && !sheet.contains(ev.target)) close();
  };
  const onKeyDown = (ev) => {
    const t = ev.target.closest && ev.target.closest('.lk');
    if (t && (ev.key === 'Enter' || ev.key === ' ')) { ev.preventDefault(); ev.stopPropagation(); open(t); }
  };
  root.addEventListener('click', onClick, true);
  root.addEventListener('keydown', onKeyDown, true);
  return () => { root.removeEventListener('click', onClick, true); root.removeEventListener('keydown', onKeyDown, true); close(); };
}

/**
 * The words of a text (particles, endings and punctuation left out), each { entry, id (Garden card or null), known }.
 * `known`: a Garden card already planted, a number or a name. Used for "words read" and "words you've met" (Library).
 */
export function wordsIn(text) {
  const t = tokens(text);
  if (!t) return [];
  const out = [];
  for (const x of t) {
    if (x.entry === null) continue;
    const e = ENTRIES[x.entry];
    if (!e || e[0] === 'p') continue;
    const id = e[0] === 'g' || e[0] === 'c' ? e[1] : null;
    const known = id ? !!store.s.items[id] : e[0] === 'n' || (e[0] === 'w' && / name\)$/.test(e[3]));
    out.push({ entry: x.entry, id, known });
  }
  return out;
}
