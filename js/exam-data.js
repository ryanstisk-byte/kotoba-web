// Mock JLPT: the question bank, a mock's layout and its score. Pure data and maths (no DOM, no store), so it runs in
// Node for the tests. Every question is original: made from the app's own content (the N5 deck, the course grammar,
// Sentence Builder) or hand-written for the mock (js/exam-bank-*.js), never taken from official tests. Every spoken
// line has a VOICEVOX clip. The screen is js/exam.js; readiness is js/readiness.js.
//
// It follows the real N5: the same parts, question types, order and (approximate) counts, with the instructions in
// Japanese as in the test booklet and an English line under each:
//   Vocabulary (20 min)          漢字読み 7, 表記 5, 文脈規定 6, 言い換え類義 3
//   Grammar and reading (40 min) 文法形式の判断 9, 文の組み立て 4, 文章の文法 4, 内容理解(短文) 2, 内容理解(中文) 2, 情報検索 1
//   Listening (30 min)           課題理解 7, ポイント理解 6, 発話表現 5, 即時応答 6
// N4 and N3 have their own layouts (FORMATS_N4, FORMATS_N3) and pools; N3 is scored in three sections (SCORING).
import { N5_WORDS, N4_WORDS, N3_WORDS, KANJI } from './data.js';
import { KANJI_LESSONS, N4_KANJI_LESSONS, N3_KANJI_LESSONS } from './dojo-data.js';
import { BUILD_SENTENCES } from './practice-data.js';
import { STUDY_UNITS } from './course-data.js';
import { unitCardKeys, cardQuestion } from './grammar-cards.js';
import { PARAPHRASE, TEXT_GRAMMAR, SHORT, MID, INFO } from './exam-bank-reading.js';
import { POINT, QUICK } from './exam-bank-listen1.js';
import { TASK, UTTER } from './exam-bank-listen2.js';
import { N4_PARAPHRASE, N4_USAGE, N4_TEXT_GRAMMAR, N4_SHORT, N4_MID, N4_INFO } from './exam-bank-n4-reading.js';
import { N4_TASK, N4_POINT, N4_UTTER, N4_QUICK } from './exam-bank-n4-listen.js';
import { N3_PARAPHRASE, N3_USAGE, N3_TEXT_GRAMMAR, N3_SHORT, N3_MID, N3_LONG, N3_INFO } from './exam-bank-n3-reading.js';
import { N3_TASK, N3_POINT, N3_GIST, N3_UTTER, N3_QUICK } from './exam-bank-n3-listen.js';

/**
 * The kanji an N5 learner is expected to know (the commonly used N5 list, about 100). The vocabulary part shows no
 * furigana at all; everywhere else in the mock, like the real test, only kanji beyond this list get furigana.
 */
export const N5_KANJI = new Set([...'一二三四五六七八九十百千万円年月日時分半午前後今週毎何上下左右中外東西南北名山川天気雨電車駅道店社会学校生先友父母子女男人口目耳手足見聞読書話言語食飲行来出入休買立高安長新古大小白花空魚金土木水火国本間少多']);

/** The N4 kanji (the commonly used N4 list, about 170 beyond N5). In an N4 mock, kanji beyond N5 + N4 get furigana. */
export const N4_KANJI = new Set([...N5_KANJI, ...'同事自民発者地合市業方回場員開力問代動京通理田主題首意不作用度強持野都以思家世区県進正院心界産教文元重近考画海売知集別物引使所品計死特私始朝村運終台広住真有料工建急止送切説転研究楽起着乗病声質待試族銀早映親験働英頭低医仕去味門写字答夜音注帰歌光悪図室太歩風紙黒春赤青館屋色走秋夏顔短薬習便洋旅軽池服遠夕借曜弱肉貸堂暗鳥飯勉冬昼茶弟洗牛兄犬菜暑妹寒姉漢']);
/**
 * The kanji known by N3: N5 + N4, plus every kanji the app teaches up to N3 (the N5, N4 and N3 Reading Dojo lessons
 * and Kanji Forge). In an N3 mock, kanji beyond these get furigana.
 */
const lessonKanji = (lessons) => lessons.flatMap((l) => l.kanji.map((j) => j.k));
export const N3_KANJI = new Set([...N4_KANJI, ...lessonKanji(KANJI_LESSONS), ...lessonKanji(N4_KANJI_LESSONS), ...lessonKanji(N3_KANJI_LESSONS),
  ...KANJI.filter((k) => ['N5', 'N4', 'N3'].includes(k.level || 'N5')).map((k) => k.kanji)]);
/** Kanji a level's test expects (no furigana over these). */
export const LEVEL_KANJI = { N5: N5_KANJI, N4: N4_KANJI, N3: N3_KANJI };

/** The levels the app knows about, easiest first, and the ones with a mock. */
export const LEVELS = ['N5', 'N4', 'N3', 'N2', 'N1'];
export const MOCK_LEVELS = ['N5', 'N4', 'N3'];

/**
 * Each level's score: its scored sections (each with a maximum and a minimum), the total and the pass line. N5 and N4
 * have two sections (lk: vocabulary, grammar and reading; li: listening). N3 has three of 0-60 each (lv: vocabulary
 * and grammar; rd: reading; li: listening), a pass at 95 of 180 and at least 19 in each. The real test scales its
 * scores (each question's weight depends on how hard it proved), so the mock's score is an estimate.
 */
export const SCORING = {
  N5: { lk: { max: 120, min: 38 }, li: { max: 60, min: 19 }, total: 180, pass: 80 },
  N4: { lk: { max: 120, min: 38 }, li: { max: 60, min: 19 }, total: 180, pass: 90 },
  N3: { lv: { max: 60, min: 19 }, rd: { max: 60, min: 19 }, li: { max: 60, min: 19 }, total: 180, pass: 95 },
};

/** Every scored section a level can have: its name and the parts (PARTS) it scores. */
export const SECTION_DEFS = {
  lk: { title: 'Vocabulary, grammar, reading', short: 'language knowledge and reading', parts: ['vocab', 'grammar', 'reading'] },
  lv: { title: 'Vocabulary and grammar', short: 'language knowledge', parts: ['vocab', 'grammar'] },
  rd: { title: 'Reading', short: 'reading', parts: ['reading'] },
  li: { title: 'Listening', short: 'listening', parts: ['listening'] },
};

/** A level's scored sections, in order: [{ id, title, short, parts, max, min }]. */
export function scoreSections(level) {
  const sc = SCORING[level] || SCORING.N5;
  return Object.keys(sc).filter((k) => SECTION_DEFS[k]).map((k) => ({ id: k, ...SECTION_DEFS[k], max: sc[k].max, min: sc[k].min }));
}

/** Parts of a mock. `group` is the N5/N4 scored section (lk or li); other levels map parts with SECTION_DEFS. */
export const PARTS = {
  vocab: { title: 'Vocabulary', group: 'lk', practice: [['garden', 'Garden'], ['forge', 'Kanji Forge'], ['dojo', 'Reading Dojo']] },
  grammar: { title: 'Grammar', group: 'lk', practice: [['particle', 'Particle Train'], ['build', 'Sentence Builder'], ['conj', 'Conjugation Dojo']] },
  reading: { title: 'Reading', group: 'lk', practice: [['story', 'Story']] },
  listening: { title: 'Listening', group: 'li', practice: [['listen', 'Listening Lab'], ['dictation', 'Dictation Drops'], ['numbers', 'Numbers & Time']] },
};

/**
 * Every question type: its part, the 問題 heading and instructions as in the booklet (with an English line), and its
 * weight. Weights roughly follow the real test, where a reading question is worth a few vocabulary questions and the
 * longer listening tasks a little more than the quick replies; they only shape the estimate.
 */
export const TYPES = {
  read: { part: 'vocab', mondai: 'もんだい1', weight: 1,
    ja: '＿＿の ことばは ひらがなで どう かきますか。1・2・3・4から いちばん いい ものを ひとつ えらんで ください。',
    en: 'How is the underlined word written in hiragana? Choose the best answer.' },
  spell: { part: 'vocab', mondai: 'もんだい2', weight: 1,
    ja: '＿＿の ことばは どう かきますか。1・2・3・4から いちばん いい ものを ひとつ えらんで ください。',
    en: 'How is the underlined word written? Choose the best answer.' },
  context: { part: 'vocab', mondai: 'もんだい3', weight: 1,
    ja: '（　）に なにが はいりますか。1・2・3・4から いちばん いい ものを ひとつ えらんで ください。',
    en: 'What goes in the blank? Choose the best answer.' },
  para: { part: 'vocab', mondai: 'もんだい4', weight: 1,
    ja: '＿＿の ぶんと だいたい おなじ いみの ぶんが あります。1・2・3・4から いちばん いい ものを ひとつ えらんで ください。',
    en: 'Which sentence means about the same as the underlined one?' },
  usage: { part: 'vocab', mondai: 'もんだい5', weight: 1,
    ja: 'つぎの ことばの つかいかたで いちばん いい ものを 1・2・3・4から 一つ えらんで ください。',
    en: 'Which sentence uses the word correctly?' },
  grammar: { part: 'grammar', mondai: 'もんだい1', weight: 1,
    ja: '（　）に 何を 入れますか。1・2・3・4から いちばん いい ものを 一つ えらんで ください。',
    en: 'What goes in the blank? Choose the best answer.' },
  star: { part: 'grammar', mondai: 'もんだい2', weight: 1,
    ja: '★に 入る ものは どれですか。1・2・3・4から いちばん いい ものを 一つ えらんで ください。',
    en: 'Put the pieces in order. Which one goes in the ★ slot?' },
  textgram: { part: 'grammar', mondai: 'もんだい3', weight: 1,
    ja: '＿＿に 何を 入れますか。ぶんしょうの いみを かんがえて、1・2・3・4から いちばん いい ものを 一つ えらんで ください。',
    en: 'What goes in each numbered blank? Think about the meaning of the whole text.' },
  short: { part: 'reading', mondai: 'もんだい4', weight: 3,
    ja: 'つぎの ぶんしょうを 読んで、しつもんに こたえて ください。こたえは、1・2・3・4から いちばん いい ものを 一つ えらんで ください。',
    en: 'Read the short text and answer the question.' },
  mid: { part: 'reading', mondai: 'もんだい5', weight: 3,
    ja: 'つぎの ぶんしょうを 読んで、しつもんに こたえて ください。こたえは、1・2・3・4から いちばん いい ものを 一つ えらんで ください。',
    en: 'Read the text and answer the questions.' },
  long: { part: 'reading', mondai: 'もんだい6', weight: 3,
    ja: 'つぎの 文章を 読んで、質問に 答えなさい。答えは、1・2・3・4から 最も よい ものを 一つ えらびなさい。',
    en: 'Read the long text and answer the questions.' },
  info: { part: 'reading', mondai: 'もんだい6', weight: 3,
    ja: 'みぎの ページを 見て、下の しつもんに こたえて ください。こたえは、1・2・3・4から いちばん いい ものを 一つ えらんで ください。',
    en: 'Look at the page and answer the question.' },
  task: { part: 'listening', mondai: 'もんだい1', weight: 1.5, pause: 12,
    ja: 'もんだい1では、はじめに しつもんを 聞いて ください。それから 話を 聞いて、もんだいようしの 1から4の 中から、いちばん いい ものを 一つ えらんで ください。',
    en: 'Listen to the question, then the conversation, and choose what the person will do.' },
  point: { part: 'listening', mondai: 'もんだい2', weight: 1.5, pause: 12,
    ja: 'もんだい2では、はじめに しつもんを 聞いて ください。それから 話を 聞いて、もんだいようしの 1から4の 中から、いちばん いい ものを 一つ えらんで ください。',
    en: 'Listen to the question, then the conversation, and catch the point it asks about.' },
  gist: { part: 'listening', mondai: 'もんだい3', weight: 1.5, pause: 12,
    ja: 'もんだい3では、もんだいようしに 何も いんさつされて いません。はじめに 話を 聞いて ください。それから、しつもんを 聞いて、1から4の 中から、最も よい ものを 一つ えらんで ください。',
    en: 'Nothing is shown first. Listen to the talk; then the question is read and the options appear. Choose what it is mainly about.' },
  utter: { part: 'listening', mondai: 'もんだい3', weight: 1, pause: 8,
    ja: 'もんだい3では、えを 見ながら しつもんを 聞いて ください。→（やじるし）の 人は 何と 言いますか。1から3の 中から、いちばん いい ものを 一つ えらんで ください。',
    en: 'Look at the picture. What does the person with the arrow say?' },
  quick: { part: 'listening', mondai: 'もんだい4', weight: 1, pause: 8,
    ja: 'もんだい4は、えなどが ありません。ぶんを 聞いて、1から3の 中から、いちばん いい へんじを 一つ えらんで ください。',
    en: 'No pictures. Listen to the line and choose the best reply.' },
};

/**
 * The N3 booklet's 問題 numbers and instructions where they differ from TYPES (N3 has 長文 and 概要理解, so the later
 * 問題 move up one, and the booklet uses more kanji). `typeOf(type, level)` merges them.
 */
export const TYPES_N3 = {
  read: { ja: '＿＿の ことばの 読み方として 最も よい ものを、1・2・3・4から 一つ えらびなさい。' },
  spell: { ja: '＿＿の ことばを 漢字で 書くとき、最も よい ものを、1・2・3・4から 一つ えらびなさい。' },
  context: { ja: '（　）に 入れるのに 最も よい ものを、1・2・3・4から 一つ えらびなさい。' },
  para: { ja: '＿＿に 意味が 最も 近い ものを、1・2・3・4から 一つ えらびなさい。' },
  usage: { ja: 'つぎの ことばの 使い方として 最も よい ものを、1・2・3・4から 一つ えらびなさい。' },
  grammar: { ja: 'つぎの 文の （　）に 入れるのに 最も よい ものを、1・2・3・4から 一つ えらびなさい。' },
  star: { ja: 'つぎの 文の ★に 入る 最も よい ものを、1・2・3・4から 一つ えらびなさい。' },
  textgram: { ja: 'つぎの 文章を 読んで、文章 全体の 内容を 考えて、１から５の 中に 入る 最も よい ものを、1・2・3・4から 一つ えらびなさい。' },
  short: { ja: 'つぎの 文章を 読んで、質問に 答えなさい。答えは、1・2・3・4から 最も よい ものを 一つ えらびなさい。' },
  mid: { ja: 'つぎの 文章を 読んで、質問に 答えなさい。答えは、1・2・3・4から 最も よい ものを 一つ えらびなさい。' },
  info: { mondai: 'もんだい7', ja: '右の ページを 見て、下の 質問に 答えなさい。答えは、1・2・3・4から 最も よい ものを 一つ えらびなさい。' },
  utter: { mondai: 'もんだい4', ja: 'もんだい4では、絵を 見ながら 質問を 聞いて ください。→（やじるし）の 人は 何と 言いますか。1から3の 中から、最も よい ものを 一つ えらんで ください。' },
  quick: { mondai: 'もんだい5', ja: 'もんだい5では、もんだいようしに 何も いんさつされて いません。まず 文を 聞いて ください。それから、その へんじを 聞いて、1から3の 中から、最も よい ものを 一つ えらんで ください。' },
};
const LEVEL_TYPES = { N3: TYPES_N3 };
/** A question type's heading and instructions for a level's booklet. */
export const typeOf = (type, level = 'N5') => ({ ...TYPES[type], ...((LEVEL_TYPES[level] || {})[type] || {}) });

/**
 * Sections in order, each a list of [type, count] in the real test's order. A group type (a text with several
 * questions) counts its questions. The mini mock is the same shape with a few of each, untimed, in practice mode
 * (English hints and replay).
 */
export const FORMATS = {
  full: {
    title: 'Full mock', timed: true, practice: false,
    sections: [
      { id: 'vocab', title: 'Vocabulary', ja: 'げんごちしき（もじ・ごい）', minutes: 20, parts: [['read', 7], ['spell', 5], ['context', 6], ['para', 3]] },
      { id: 'grammar', title: 'Grammar and reading', ja: 'げんごちしき（ぶんぽう）・どっかい', minutes: 40, parts: [['grammar', 9], ['star', 4], ['textgram', 4], ['short', 2], ['mid', 2], ['info', 1]] },
      { id: 'listening', title: 'Listening', ja: 'ちょうかい', minutes: 30, parts: [['task', 7], ['point', 6], ['utter', 5], ['quick', 6]] },
    ],
  },
  mini: {
    title: 'Mini mock', timed: false, practice: true, minutes: 15,
    sections: [
      { id: 'vocab', title: 'Vocabulary', ja: 'げんごちしき（もじ・ごい）', parts: [['read', 2], ['spell', 1], ['context', 1], ['para', 1]] },
      { id: 'grammar', title: 'Grammar and reading', ja: 'げんごちしき（ぶんぽう）・どっかい', parts: [['grammar', 2], ['star', 1], ['textgram', 4], ['short', 1], ['info', 1]] },
      { id: 'listening', title: 'Listening', ja: 'ちょうかい', parts: [['task', 2], ['point', 1], ['utter', 1], ['quick', 2]] },
    ],
  },
};

/**
 * The real N4's layout (same parts as N5, a few more of each, plus 用法 "usage"):
 *   Vocabulary (25 min)          漢字読み 7, 表記 5, 文脈規定 8, 言い換え類義 4, 用法 4
 *   Grammar and reading (55 min) 文法形式の判断 13, 文の組み立て 4, 文章の文法 5 (one text), 内容理解(短文) 3, 内容理解(中文) 3, 情報検索 2
 *   Listening (35 min)           課題理解 8, ポイント理解 7, 発話表現 5, 即時応答 8
 */
export const FORMATS_N4 = {
  full: {
    title: 'Full mock', timed: true, practice: false,
    sections: [
      { id: 'vocab', title: 'Vocabulary', ja: 'げんごちしき（もじ・ごい）', minutes: 25, parts: [['read', 7], ['spell', 5], ['context', 8], ['para', 4], ['usage', 4]] },
      { id: 'grammar', title: 'Grammar and reading', ja: 'げんごちしき（ぶんぽう）・どっかい', minutes: 55, parts: [['grammar', 13], ['star', 4], ['textgram', 5], ['short', 3], ['mid', 3], ['info', 2]] },
      { id: 'listening', title: 'Listening', ja: 'ちょうかい', minutes: 35, parts: [['task', 8], ['point', 7], ['utter', 5], ['quick', 8]] },
    ],
  },
  mini: {
    title: 'Mini mock', timed: false, practice: true, minutes: 15,
    sections: [
      { id: 'vocab', title: 'Vocabulary', ja: 'げんごちしき（もじ・ごい）', parts: [['read', 2], ['spell', 1], ['context', 1], ['para', 1], ['usage', 1]] },
      { id: 'grammar', title: 'Grammar and reading', ja: 'げんごちしき（ぶんぽう）・どっかい', parts: [['grammar', 2], ['star', 1], ['textgram', 5], ['short', 1], ['info', 2]] },
      { id: 'listening', title: 'Listening', ja: 'ちょうかい', parts: [['task', 2], ['point', 1], ['utter', 1], ['quick', 2]] },
    ],
  },
};
/**
 * The real N3's layout (vocabulary 30 min; grammar and reading 70; listening 40), with 内容理解(長文) and 概要理解:
 *   Vocabulary (30 min)          漢字読み 8, 表記 6, 文脈規定 11, 言い換え類義 5, 用法 5
 *   Grammar and reading (70 min) 文法形式の判断 13, 文の組み立て 5, 文章の文法 5 (one text), 内容理解(短文) 4,
 *                                内容理解(中文) 6 (two texts), 内容理解(長文) 4 (one text), 情報検索 2 (one page)
 *   Listening (40 min)           課題理解 6, ポイント理解 6, 概要理解 3, 発話表現 4, 即時応答 9
 * The mini mock drops 情報検索 for one 長文 text, so every section has a few questions.
 */
export const FORMATS_N3 = {
  full: {
    title: 'Full mock', timed: true, practice: false,
    sections: [
      { id: 'vocab', title: 'Vocabulary', ja: '言語知識（文字・語彙）', minutes: 30, parts: [['read', 8], ['spell', 6], ['context', 11], ['para', 5], ['usage', 5]] },
      { id: 'grammar', title: 'Grammar and reading', ja: '言語知識（文法）・読解', minutes: 70, parts: [['grammar', 13], ['star', 5], ['textgram', 5], ['short', 4], ['mid', 6], ['long', 4], ['info', 2]] },
      { id: 'listening', title: 'Listening', ja: '聴解', minutes: 40, parts: [['task', 6], ['point', 6], ['gist', 3], ['utter', 4], ['quick', 9]] },
    ],
  },
  mini: {
    title: 'Mini mock', timed: false, practice: true, minutes: 20,
    sections: [
      { id: 'vocab', title: 'Vocabulary', ja: '言語知識（文字・語彙）', parts: [['read', 2], ['spell', 1], ['context', 1], ['para', 1], ['usage', 1]] },
      { id: 'grammar', title: 'Grammar and reading', ja: '言語知識（文法）・読解', parts: [['grammar', 2], ['star', 1], ['textgram', 5], ['short', 1], ['long', 4]] },
      { id: 'listening', title: 'Listening', ja: '聴解', parts: [['task', 2], ['point', 1], ['gist', 1], ['utter', 1], ['quick', 2]] },
    ],
  },
};
/** Each level's formats. */
export const LEVEL_FORMATS = { N5: FORMATS, N4: FORMATS_N4, N3: FORMATS_N3 };
export const formatsFor = (level) => LEVEL_FORMATS[level] || FORMATS;

const KANJI_RE = /[一-鿿々]/;
const HIRA_RE = /^[ぁ-ゖー]+$/;

// ---------- near-miss readings (the kind of wrong options the real kanji-reading questions use) ----------

const VOWEL = {};
for (const [v, row] of Object.entries({
  a: 'あかさたなはまやらわがざだばぱぁ', i: 'いきしちにひみりぎじぢびぴぃ', u: 'うくすつぬふむゆるぐずづぶぷぅ',
  e: 'えけせてねへめれげぜでべぺぇ', o: 'おこそとのほもよろをごぞどぼぽぉ',
})) for (const k of row) VOWEL[k] = v;
const SMALL_VOWEL = { 'ゃ': 'a', 'ゅ': 'u', 'ょ': 'o' };
const VOICING = [['か', 'が'], ['き', 'ぎ'], ['く', 'ぐ'], ['け', 'げ'], ['こ', 'ご'], ['さ', 'ざ'], ['し', 'じ'], ['す', 'ず'], ['せ', 'ぜ'],
  ['そ', 'ぞ'], ['た', 'だ'], ['て', 'で'], ['と', 'ど'], ['は', 'ば', 'ぱ'], ['ひ', 'び', 'ぴ'], ['ふ', 'ぶ', 'ぷ'],
  ['へ', 'べ', 'ぺ'], ['ほ', 'ぼ', 'ぽ']];
const VOICED = {};
for (const set of VOICING) for (const k of set) VOICED[k] = set.filter((x) => x !== k);
const SMALL = { 'ゃ': 'や', 'ゅ': 'ゆ', 'ょ': 'よ' };
const BIG = { 'や': 'ゃ', 'ゆ': 'ゅ', 'よ': 'ょ' };
const DOUBLES = /[かきくけこさしすせそたちつてとぱぴぷぺぽ]/;

const vowelAt = (r, i) => SMALL_VOWEL[r[i + 1]] || (SMALL_VOWEL[r[i]] ? SMALL_VOWEL[r[i]] : VOWEL[r[i]]);

/**
 * Readings one slip away from `r`: a long vowel added or dropped (きょう / きょ), voicing changed (かいしゃ / がいしゃ),
 * a small っ added or dropped, a small ゃゅょ written big or the other way round, an ん dropped. Each is tagged with
 * the kind of slip, so the wrong options can be varied.
 */
export function nearMisses(r) {
  const out = new Map();
  const add = (s, kind) => { if (s !== r && s.length >= 1 && !out.has(s) && !/^[ゃゅょっー]/.test(s)) out.set(s, kind); };
  for (let i = 0; i < r.length; i++) {
    const k = r[i];
    for (const v of VOICED[k] || []) add(r.slice(0, i) + v + r.slice(i + 1), 'voicing');
    if (SMALL[k]) add(r.slice(0, i) + SMALL[k] + r.slice(i + 1), 'small');
    if (BIG[k] && i > 0 && VOWEL[r[i - 1]] === 'i') add(r.slice(0, i) + BIG[k] + r.slice(i + 1), 'small');
    if (k === 'っ') add(r.slice(0, i) + r.slice(i + 1), 'double');
    if (k === 'ん' && i > 0) add(r.slice(0, i) + r.slice(i + 1), 'n');
    if (i > 0 && DOUBLES.test(k) && r[i - 1] !== 'っ' && r[i - 1] !== 'ん' && VOWEL[r[i - 1]]) add(r.slice(0, i) + 'っ' + r.slice(i), 'double');
    // Long vowels: おう / えい / うう after a kana with that vowel.
    const v = vowelAt(r, i);
    const next = SMALL_VOWEL[r[i + 1]] ? i + 2 : i + 1;
    // Not after a kana that already lengthens the one before it (no がっこうう).
    if (!v || k === 'っ' || k === 'ん' || SMALL_VOWEL[k] || (i > 0 && (k === 'う' || k === 'い') && vowelAt(r, i - 1))) continue;
    const long = { o: 'う', u: 'う', e: 'い', i: 'い', a: 'あ' }[v];
    if (r[next] === long) add(r.slice(0, next) + r.slice(next + 1), 'long');
    else if (v !== 'a' && v !== 'i') add(r.slice(0, next) + long + r.slice(next), 'long');
  }
  return out;
}

// ---------- helpers ----------

function shuffleWith(a, rand) {
  const arr = a.slice();
  for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; }
  return arr;
}

/** Takes `n` from `list`, questions not seen in recent mocks first (each group shuffled). */
function takeFresh(list, n, seen, rand, idOf = (x) => x.id) {
  const fresh = list.filter((x) => !seen.has(idOf(x)));
  const old = list.filter((x) => seen.has(idOf(x)));
  return [...shuffleWith(fresh, rand), ...shuffleWith(old, rand)].slice(0, n);
}

/** Distinct options with the right one first: the right answer, then the first n - 1 others not equal to it. */
function options(right, pool, n = 4) {
  const out = [right];
  for (const x of pool) { if (out.length >= n) break; if (x && !out.includes(x)) out.push(x); }
  return out;
}

const words = (s) => new Set(String(s).toLowerCase().split(/[^a-z]+/).filter((x) => x.length >= 4));
const sharesWord = (a, b) => { const wa = words(a); return [...words(b)].some((x) => wa.has(x)); };

/** Words the context questions avoid: pointing and question words, where more than one option can fit. */
const VAGUE = /^(this|that|which|what|who|where|when|here|there|over there|how|i \/|you|he|she)\b/i;

const kindOf = (w) => (/^to /.test(w.en) ? 'verb' : /い$/.test(w.jp) && /い$/.test(w.reading) && !KANJI_RE.test(w.jp.slice(-1)) ? 'adj' : 'noun');

/** Splits a sentence around the first place `word` appears: { before, mark, after }. */
const around = (sentence, word, shown = word) => {
  const at = sentence.indexOf(word);
  return { before: sentence.slice(0, at), mark: shown, after: sentence.slice(at + word.length) };
};

// ---------- the question bank (built once) ----------

/** A deck's question lists: words with example sentences, and the ones fit for each vocabulary question type. */
function deckBank(words) {
  const deck = words.filter((w) => w.ex && w.exEn);
  return {
    DECK: deck,
    /** Kanji reading: a word in its example sentence, underlined; pick how it's read. */
    READ: deck.filter((w) => KANJI_RE.test(w.jp) && w.jp.length <= 3 && HIRA_RE.test(w.reading) && w.ex.includes(w.jp) && nearMisses(w.reading).size >= 3),
    /** Which spelling: the word's reading underlined in its sentence; pick how it's written. */
    SPELL: deck.filter((w) => KANJI_RE.test(w.jp) && HIRA_RE.test(w.reading) && w.ex.includes(w.jp)),
    /** Word in context: the word blanked in its example; pick the word that fits (the English is shown). */
    CONTEXT: deck.filter((w) => w.ex.includes(w.jp) && w.jp.length < w.ex.length - 2 && !VAGUE.test(w.en)),
  };
}
const N5B = deckBank(N5_WORDS);
/** N4 questions ask N4 words; their wrong options may come from both decks. */
const N4B = (() => {
  const own = deckBank(N4_WORDS);
  const both = deckBank([...N5_WORDS, ...N4_WORDS]);
  return { ...own, POOL_DECK: both.DECK, POOL_SPELL: both.SPELL };
})();
/** N3 questions ask N3 words; their wrong options may come from all three decks. */
const N3B = (() => {
  const own = deckBank(N3_WORDS);
  const all = deckBank([...N5_WORDS, ...N4_WORDS, ...N3_WORDS]);
  return { ...own, POOL_DECK: all.DECK, POOL_SPELL: all.SPELL };
})();
const { DECK, READ, SPELL, CONTEXT } = N5B;

/** The N5 course's grammar cards (re-entry and N5 core units). */
export const N5_GRAMMAR_KEYS = STUDY_UNITS.filter((u) => u.phase === 'p0' || u.phase === 'p1').flatMap((u) => unitCardKeys(u.id));
/** The N4 course's grammar cards (the Phase 2 "N4 bridge" units). */
export const N4_GRAMMAR_KEYS = STUDY_UNITS.filter((u) => u.phase === 'p2').flatMap((u) => unitCardKeys(u.id));
/** The N3 course's grammar cards (the Phase 3 units). */
export const N3_GRAMMAR_KEYS = STUDY_UNITS.filter((u) => u.phase === 'p3').flatMap((u) => unitCardKeys(u.id));

/** Particles that let a phrase move: with two of them among the four slots, more than one order can be right. */
const FREE = new Set(['は', 'が', 'を', 'に', 'で', 'へ', 'と', 'も', 'から', 'まで']);
/** Time words and counted amounts can float around the sentence too (まいにち にほんごを / にほんごを まいにち). */
const FLOATS = /^(まいにち|毎日|きょう|今日|あした|明日|きのう|昨日|いつも|よく|ときどき|.+つ|.+[はぱば]い|.+[ほぼぽ]ん|.+本|.+まい|.+枚|.+人|.+時)$/;
/** Where four slots in a row can start so that only one order is right (at most one movable piece among them). */
const starts = (s) => {
  const out = [];
  for (let i = 0; i + 4 <= s.tiles.length; i++) if (s.tiles.slice(i, i + 4).filter((t) => FREE.has(t) || FLOATS.test(t)).length <= 1) out.push(i);
  return out;
};
/** Sentence Builder sentences with one right order, no repeated tiles and somewhere to put four unambiguous slots. */
const starOk = (s) => s.tiles.length >= 4 && !(s.alts || []).length && new Set(s.tiles).size === s.tiles.length && starts(s).length;
const STAR = BUILD_SENTENCES.filter((s) => (s.level || 'N5') === 'N5' && starOk(s));
const STAR_N4 = BUILD_SENTENCES.filter((s) => s.level === 'N4' && starOk(s));
const STAR_N3 = BUILD_SENTENCES.filter((s) => s.level === 'N3' && starOk(s));

// ---------- question builders ----------

function readQuestion(w, rand) {
  const misses = nearMisses(w.reading);
  // One of each kind of slip first, so the options don't all differ the same way.
  const byKind = new Map();
  for (const [s, kind] of shuffleWith([...misses], rand)) if (!byKind.has(kind)) byKind.set(kind, s);
  const pool = [...byKind.values(), ...shuffleWith([...misses.keys()], rand)];
  return {
    id: 'read:' + w.id, part: 'vocab', type: 'read', label: 'Kanji reading',
    ask: 'How is the underlined word read?', sentence: around(w.ex, w.jp), noruby: true,
    options: options(w.reading, pool), ja: true,
    answer: w.reading, why: `${w.jp} is read ${w.reading}: "${w.en}".`, garden: [w.id],
  };
}

function spellQuestion(w, rand, b = N5B) {
  const SPELL = b.POOL_SPELL || b.SPELL;
  const chars = new Set([...w.jp].filter((c) => KANJI_RE.test(c)));
  const others = SPELL.filter((x) => x.jp !== w.jp && x.reading !== w.reading && x.jp.length === w.jp.length);
  const sharing = others.filter((x) => [...x.jp].some((c) => chars.has(c)));
  const pool = [...shuffleWith(sharing, rand), ...shuffleWith(others, rand), ...shuffleWith(SPELL, rand)].map((x) => x.jp)
    .filter((jp) => jp !== w.jp);
  return {
    id: 'spell:' + w.id, part: 'vocab', type: 'spell', label: 'Which spelling',
    ask: 'How is the underlined word written?', sentence: around(w.ex, w.jp, w.reading), noruby: true,
    options: options(w.jp, pool), ja: true,
    answer: w.jp, why: `${w.reading} is written ${w.jp}: "${w.en}".`, garden: [w.id],
  };
}

function contextQuestion(w, rand, b = N5B) {
  const DECK = b.POOL_DECK || b.DECK;
  const kind = kindOf(w);
  const fits = (x) => x.jp !== w.jp && x.reading !== w.reading && !sharesWord(x.en, w.en) && !w.ex.includes(x.jp);
  const same = DECK.filter((x) => kindOf(x) === kind && fits(x));
  const pool = [...shuffleWith(same, rand), ...shuffleWith(DECK.filter(fits), rand)].map((x) => x.jp);
  const at = w.ex.indexOf(w.jp);
  return {
    id: 'ctx:' + w.id, part: 'vocab', type: 'context', label: 'Word in context',
    ask: 'Which word fits the blank?', blanked: w.ex.slice(0, at) + '（　）' + w.ex.slice(at + w.jp.length), en: w.exEn, noruby: true,
    options: options(w.jp, pool), ja: true,
    answer: w.jp, why: `${w.jp} (${w.reading}) means "${w.en}". ${w.ex} = "${w.exEn}"`, garden: [w.id], say: [{ text: w.ex, voice: 0 }],
  };
}

function grammarQuestion(key, rand) {
  const n = Math.floor(rand() * 6);
  const q = cardQuestion(key, n, 4);
  if (!q || !q.blanked) return null;
  return {
    id: 'gram:' + key, part: 'grammar', type: 'grammar', label: 'Sentence grammar',
    ask: 'Which fits the blank?', blanked: q.blanked, en: q.en,
    options: q.options, ja: true,
    answer: q.options[0], why: `${q.title}. ${q.why}`, grammar: [key], say: [q.say],
  };
}

function starQuestion(s, rand) {
  // Four slots in a row (the rest of the sentence is given), the star on one of them.
  const ok = starts(s);
  const start = ok[Math.floor(rand() * ok.length)];
  const slots = s.tiles.slice(start, start + 4);
  const star = Math.floor(rand() * 4);
  return {
    id: 'star:' + s.id, part: 'grammar', type: 'star', label: 'The starred slot',
    ask: 'Put the four pieces in order. Which one goes in the ★ slot?',
    frame: { before: s.tiles.slice(0, start).join(''), slots: 4, star, after: s.tiles.slice(start + 4).join('') }, en: s.en,
    options: options(slots[star], shuffleWith(slots, rand)), ja: true,
    answer: slots[star], why: `In order: ${s.tiles.join(' ')} = "${s.en}".`, garden: s.garden || [], say: [{ text: s.say, voice: s.voice || 0 }],
  };
}

function paraQuestion(p) {
  return {
    id: 'para:' + p.id, part: 'vocab', type: 'para', sentence: p.sentence, noruby: true,
    options: p.options.slice(), ja: true, answer: p.options[0], why: p.why,
  };
}

/** 用法 (N4): which sentence uses the word correctly. The word is shown above four sentences. */
function usageQuestion(u) {
  return {
    id: 'use:' + u.id, part: 'vocab', type: 'usage', word: u.word, wordReading: u.reading, en: u.en,
    options: u.options.slice(), ja: true, answer: u.options[0], why: u.why,
  };
}

/** A student's essay with numbered blanks: one question per blank, sharing the essay. */
function textgramQuestions(t) {
  const essay = { id: t.id, title: t.title, author: t.author, text: t.text };
  return t.blanks.map((b, i) => ({
    id: 'tg:' + t.id, qid: `tg:${t.id}:${i}`, part: 'grammar', type: 'textgram', essay, blank: i + 1,
    options: b.options.slice(), ja: true, answer: b.options[0], why: b.why,
  }));
}

/** A reading text (short, mid, long or an information page) with its questions. */
function readingQuestions(type, it) {
  return it.questions.map((q, i) => ({
    id: `${type}:${it.id}`, qid: `${type}:${it.id}:${i}`, part: 'reading', type, doc: it, ask: q.q,
    options: q.options.slice(), ja: true, answer: q.options[0], why: q.why,
  }));
}

const spoken = (l) => ({ text: l.jp, voice: l.voice, reading: l.reading });

/**
 * 概要理解 (N3): nothing is shown first. The talk plays, then the question; only then do the options appear (the
 * screen holds them back until `talk` has played). `say` is the talk and then the question.
 */
function gistQuestion(it) {
  const q = spoken(it.question);
  const talk = it.lines.map(spoken);
  return { id: `gist:${it.id}`, part: 'listening', type: 'gist', why: it.why, ja: true, ask: it.question.jp,
    talk, lead: q, say: [...talk, q], transcript: [...talk, q], afterTalk: true,
    options: it.options.slice(), answer: it.options[0] };
}

/**
 * A listening question. 課題理解 / ポイント理解: the question, the conversation, the question again; the options are
 * printed (pictures or short text). 発話表現 / 即時応答: the situation or line, then three replies that are only heard
 * (`heard`: the screen numbers them 1-3 and plays them in the order shown).
 */
function listenQuestion(type, it) {
  const base = { id: `${type}:${it.id}`, part: 'listening', type, why: it.why, ja: true };
  if (type === 'task' || type === 'point') {
    const q = spoken(it.question);
    return { ...base, ask: it.question.jp, say: [q, ...it.lines.map(spoken), q], transcript: [q, ...it.lines.map(spoken)],
      pictures: !!it.pictures, options: it.options.slice(), answer: it.options[0] };
  }
  const lead = spoken(type === 'utter' ? it.question : it.line);
  const replies = it.replies.map(spoken);
  return { ...base, ask: lead.text, scene: it.scene || null, lead, heard: true,
    replyLine: Object.fromEntries(replies.map((r) => [r.text, r])),
    say: [lead, ...replies], transcript: [lead, ...replies],
    options: replies.map((r) => r.text), answer: replies[0].text };
}

/** Each pool: the items one question type is drawn from, and how an item becomes questions. */
const POOLS = {
  read: { list: READ, id: (w) => 'read:' + w.id, make: (w, rand) => [readQuestion(w, rand)], word: true },
  spell: { list: SPELL, id: (w) => 'spell:' + w.id, make: (w, rand) => [spellQuestion(w, rand)], word: true },
  context: { list: CONTEXT, id: (w) => 'ctx:' + w.id, make: (w, rand) => [contextQuestion(w, rand)], word: true },
  para: { list: PARAPHRASE, id: (p) => 'para:' + p.id, make: (p) => [paraQuestion(p)] },
  // Like the real test, always four options: a grammar card with fewer sensible ones is left out.
  grammar: { list: null, id: (k) => 'gram:' + k, make: (k, rand) => [grammarQuestion(k, rand)].filter((q) => q && q.options.length === 4) },
  star: { list: STAR, id: (x) => 'star:' + x.id, make: (x, rand) => [starQuestion(x, rand)] },
  textgram: { list: TEXT_GRAMMAR, id: (t) => 'tg:' + t.id, make: (t) => textgramQuestions(t) },
  short: { list: SHORT, id: (t) => 'short:' + t.id, make: (t) => readingQuestions('short', t) },
  mid: { list: MID, id: (t) => 'mid:' + t.id, make: (t) => readingQuestions('mid', t) },
  info: { list: INFO, id: (t) => 'info:' + t.id, make: (t) => readingQuestions('info', t) },
  task: { list: TASK, id: (t) => 'task:' + t.id, make: (t) => [listenQuestion('task', t)] },
  point: { list: POINT, id: (t) => 'point:' + t.id, make: (t) => [listenQuestion('point', t)] },
  utter: { list: UTTER, id: (t) => 'utter:' + t.id, make: (t) => [listenQuestion('utter', t)] },
  quick: { list: QUICK, id: (t) => 'quick:' + t.id, make: (t) => [listenQuestion('quick', t)] },
};
POOLS.grammar.list = N5_GRAMMAR_KEYS;

/** The N4 mock's pools: the N4 deck, the N4 course grammar, N4 Sentence Builder lines and the N4 banks. */
const POOLS_N4 = {
  read: { list: N4B.READ, id: (w) => 'read:' + w.id, make: (w, rand) => [readQuestion(w, rand)], word: true },
  spell: { list: N4B.SPELL, id: (w) => 'spell:' + w.id, make: (w, rand) => [spellQuestion(w, rand, N4B)], word: true },
  context: { list: N4B.CONTEXT, id: (w) => 'ctx:' + w.id, make: (w, rand) => [contextQuestion(w, rand, N4B)], word: true },
  para: { list: N4_PARAPHRASE, id: (p) => 'para:' + p.id, make: (p) => [paraQuestion(p)] },
  usage: { list: N4_USAGE, id: (u) => 'use:' + u.id, make: (u) => [usageQuestion(u)] },
  grammar: { list: N4_GRAMMAR_KEYS, id: (k) => 'gram:' + k, make: POOLS.grammar.make },
  star: { list: STAR_N4, id: (x) => 'star:' + x.id, make: (x, rand) => [starQuestion(x, rand)] },
  textgram: { list: N4_TEXT_GRAMMAR, id: (t) => 'tg:' + t.id, make: (t) => textgramQuestions(t) },
  short: { list: N4_SHORT, id: (t) => 'short:' + t.id, make: (t) => readingQuestions('short', t) },
  mid: { list: N4_MID, id: (t) => 'mid:' + t.id, make: (t) => readingQuestions('mid', t) },
  info: { list: N4_INFO, id: (t) => 'info:' + t.id, make: (t) => readingQuestions('info', t) },
  task: { list: N4_TASK, id: (t) => 'task:' + t.id, make: (t) => [listenQuestion('task', t)] },
  point: { list: N4_POINT, id: (t) => 'point:' + t.id, make: (t) => [listenQuestion('point', t)] },
  utter: { list: N4_UTTER, id: (t) => 'utter:' + t.id, make: (t) => [listenQuestion('utter', t)] },
  quick: { list: N4_QUICK, id: (t) => 'quick:' + t.id, make: (t) => [listenQuestion('quick', t)] },
};
/**
 * The N3 mock's pools: the N3 deck, the Phase 3 grammar, N3 Sentence Builder lines and the N3 banks, with 長文 and
 * 概要理解.
 */
const POOLS_N3 = {
  read: { list: N3B.READ, id: (w) => 'read:' + w.id, make: (w, rand) => [readQuestion(w, rand)], word: true },
  spell: { list: N3B.SPELL, id: (w) => 'spell:' + w.id, make: (w, rand) => [spellQuestion(w, rand, N3B)], word: true },
  context: { list: N3B.CONTEXT, id: (w) => 'ctx:' + w.id, make: (w, rand) => [contextQuestion(w, rand, N3B)], word: true },
  para: { list: N3_PARAPHRASE, id: (p) => 'para:' + p.id, make: (p) => [paraQuestion(p)] },
  usage: { list: N3_USAGE, id: (u) => 'use:' + u.id, make: (u) => [usageQuestion(u)] },
  grammar: { list: N3_GRAMMAR_KEYS, id: (k) => 'gram:' + k, make: POOLS.grammar.make },
  star: { list: STAR_N3, id: (x) => 'star:' + x.id, make: (x, rand) => [starQuestion(x, rand)] },
  textgram: { list: N3_TEXT_GRAMMAR, id: (t) => 'tg:' + t.id, make: (t) => textgramQuestions(t) },
  short: { list: N3_SHORT, id: (t) => 'short:' + t.id, make: (t) => readingQuestions('short', t) },
  mid: { list: N3_MID, id: (t) => 'mid:' + t.id, make: (t) => readingQuestions('mid', t) },
  long: { list: N3_LONG, id: (t) => 'long:' + t.id, make: (t) => readingQuestions('long', t) },
  info: { list: N3_INFO, id: (t) => 'info:' + t.id, make: (t) => readingQuestions('info', t) },
  task: { list: N3_TASK, id: (t) => 'task:' + t.id, make: (t) => [listenQuestion('task', t)] },
  point: { list: N3_POINT, id: (t) => 'point:' + t.id, make: (t) => [listenQuestion('point', t)] },
  gist: { list: N3_GIST, id: (t) => 'gist:' + t.id, make: (t) => [gistQuestion(t)] },
  utter: { list: N3_UTTER, id: (t) => 'utter:' + t.id, make: (t) => [listenQuestion('utter', t)] },
  quick: { list: N3_QUICK, id: (t) => 'quick:' + t.id, make: (t) => [listenQuestion('quick', t)] },
};
const LEVEL_POOLS = { N5: POOLS, N4: POOLS_N4, N3: POOLS_N3 };

// ---------- a whole mock ----------

/**
 * Lays out a mock: { level, format, timed, practice, sections: [{ id, title, ja, minutes, questions }] }, the
 * questions in the real test's order. `seen` holds question ids from recent mocks; fresh ones are picked first, so
 * mocks in a row share few questions. `rand` is for tests.
 */
export function buildMock({ level = 'N5', format = 'mini', seen = [], rand = Math.random } = {}) {
  const formats = formatsFor(level);
  const f = formats[format] || formats.mini;
  const POOLS = LEVEL_POOLS[level] || LEVEL_POOLS.N5;
  const s = new Set(seen);
  const usedWords = new Set();   // a deck word is asked once per mock, whichever vocabulary type picks it
  const sections = f.sections.map((sec) => {
    const qs = [];
    for (const [type, n] of sec.parts) {
      const pool = POOLS[type];
      const list = pool.word ? pool.list.filter((w) => !usedWords.has(w.id)) : pool.list;
      let got = 0;
      for (const item of takeFresh(list, list.length, s, rand, pool.id)) {
        if (got >= n) break;
        const made = pool.make(item, rand);
        if (!made.length) continue;
        if (pool.word) usedWords.add(item.id);
        qs.push(...made);
        got += made.length;
      }
    }
    return { id: sec.id, title: sec.title, ja: sec.ja, minutes: f.timed ? sec.minutes : null, questions: qs };
  });
  return { level, format, timed: f.timed, practice: f.practice, sections };
}

/** Every question's id in a mock (a text with several questions counts once), for "seen recently". */
export const mockIds = (mock) => [...new Set(mock.sections.flatMap((s) => s.questions.map((q) => q.id)))];

/**
 * Scores answered questions like the real test: each scored section (scoreSections) scales to its maximum by the
 * share of its question weight answered right (weights in TYPES), then the pass line and each section's minimum are
 * checked. `answers` maps a question's index (in order, over all sections) to the option picked, or null when
 * unanswered. Returns each section's score by id (lk and li for N5/N4; lv, rd and li for N3), `sections` (with each
 * one's max, min and whether it met its minimum), the total, pass, per-part tallies and questions right. The real test
 * uses scaled scores, so this is an estimate.
 */
export function scoreMock(mock, answers) {
  const sc = SCORING[mock.level] || SCORING.N5;
  const defs = scoreSections(mock.level);
  const sectionOf = Object.fromEntries(defs.flatMap((d) => d.parts.map((p) => [p, d.id])));
  const parts = {};
  for (const id of Object.keys(PARTS)) parts[id] = [0, 0];
  const w = Object.fromEntries(defs.map((d) => [d.id, [0, 0]]));
  let i = 0;
  for (const sec of mock.sections) {
    for (const q of sec.questions) {
      const t = parts[q.part];
      const g = w[sectionOf[q.part]];
      const weight = TYPES[q.type]?.weight || 1;
      const ok = answers[i] != null && answers[i] === q.answer;
      t[1] += 1;
      if (g) g[1] += weight;
      if (ok) { t[0] += 1; if (g) g[0] += weight; }
      i++;
    }
  }
  const sections = defs.map((d) => {
    const score = w[d.id][1] ? Math.round((d.max * w[d.id][0]) / w[d.id][1]) : 0;
    return { id: d.id, title: d.title, score, max: d.max, min: d.min, met: score >= d.min };
  });
  const total = sections.reduce((a, x) => a + x.score, 0);
  const pass = total >= sc.pass && sections.every((x) => x.met);
  const n = Object.values(parts).reduce((a, t) => a + t[1], 0);
  const ok = Object.values(parts).reduce((a, t) => a + t[0], 0);
  return { ...Object.fromEntries(sections.map((x) => [x.id, x.score])), sections, total, pass, parts, ok, n };
}

/** Sizes of the bank (items per question type), for the tests and the intro screen. */
export const BANK = Object.fromEntries(Object.entries(POOLS).map(([k, p]) => [k, p.list.length]));
/** Bank sizes per level. */
export const BANKS = Object.fromEntries(Object.entries(LEVEL_POOLS).map(([lv, pools]) => [lv, Object.fromEntries(Object.entries(pools).map(([k, p]) => [k, p.list.length]))]));
