// Content for the newer practice modes: Listening Lab, Conjugation Dojo, Sentence Builder, Katakana Rush and
// Numbers & Time. Vocabulary comes from the N5 deck (n5.js) and the story; many lines reuse N5 example sentences,
// which already have voice clips. Only the short dialogues and a few scenarios are new, original writing.
import { CAST, TRAINS, CHAPTERS, SHOP_STOCK, COUNTERS, CUSTOMERS, GARDEN_CATALOG, N5_WORDS, assembleTrain } from './data.js';
import { READ_WORDS } from './dojo-data.js';

const { narrator, ren, master, kaito } = CAST;

// ---------- shared ----------

/** Garden ids (from GARDEN_CATALOG) for the known words that appear in a Japanese text. */
export function gardenIdsIn(text) {
  const t = String(text || '').replace(/\s+/g, '');
  const K = /[一-鿿々]/;
  // A whole word only: a kanji word must not sit inside a longer kanji run (道 is not in 道場).
  const whole = (jp) => {
    for (let i = t.indexOf(jp); i >= 0; i = t.indexOf(jp, i + 1)) {
      const before = t[i - 1] || '';
      const after = t[i + jp.length] || '';
      if (!(K.test(jp[0]) && K.test(before)) && !(K.test(jp[jp.length - 1]) && K.test(after))) return true;
    }
    return false;
  };
  return Object.values(GARDEN_CATALOG)
    .filter((it) => (it.jp.length >= 2 || K.test(it.jp)) && whole(it.jp))
    .map((it) => it.id);
}

// ---------- Listening Lab ----------
// L(speaker, text, reading, English). Q(question, options with the right one first, why).
const L = (who, jp, reading, en) => ({ who, jp, reading, en });
const Q = (q, options, why = '') => ({ q, options, why });

/** Short audio-only scenes between the story characters, each with comprehension questions. */
export const DIALOGUES = [
  { id: 'd1', title: 'Morning run', scene: '🌅', lines: [
    L(master, 'レン、あさだ！ はしるぞ！', 'れん、あさだ！ はしるぞ！', "Ren, it's morning! We're running!"),
    L(ren, 'え、今日も ですか？', 'え、きょうも ですか？', 'Huh, today too?'),
    L(master, 'そうだ。毎日 はしる。', 'そうだ。まいにち はしる。', 'That\'s right. We run every day.'),
    L(ren, 'はい、師匠！', 'はい、ししょう！', 'Yes, Master!'),
  ], questions: [
    Q('What does the master want to do?', ['Go running', 'Eat breakfast', 'Sleep in'], 'はしる = to run. はしるぞ is a tough "Let\'s run!"'),
    Q('How often do they do it?', ['Every day', 'Only today', 'Starting tomorrow'], '毎日 (まいにち) = every day.'),
  ] },
  { id: 'd2', title: 'Ramen after training', scene: '🍜', lines: [
    L(kaito, 'おい、レン。ラーメン たべるか？', 'おい、れん。らーめん たべるか？', 'Hey, Ren. Want some ramen?'),
    L(ren, 'たべる！ ラーメン、すきだ！', 'たべる！ らーめん、すきだ！', "Yes! I love ramen!"),
    L(kaito, 'じゃあ、いこう！', 'じゃあ、いこう！', "Then let's go!"),
  ], questions: [
    Q('What does Kaito invite Ren to eat?', ['Ramen', 'Sushi', 'Bread'], 'ラーメン = ramen. たべるか？ = "(want to) eat?"'),
    Q('Does Ren want to go?', ['Yes, he loves it', 'No, he is full', "He isn't sure"], 'すきだ = (I) like it. たべる！ on its own means "I\'ll eat!"'),
  ] },
  { id: 'd3', title: 'A day off', scene: '😮‍💨', lines: [
    L(ren, '師匠、つかれました…', 'ししょう、つかれました…', "Master, I'm worn out…"),
    L(master, 'では、今日は 休め。', 'では、きょうは やすめ。', 'Then rest today.'),
    L(ren, 'ほんとうですか？', 'ほんとうですか？', 'Really?'),
    L(master, 'ああ。明日から また 修行だ。', 'ああ。あしたから また しゅぎょうだ。', 'Yes. Training starts again tomorrow.'),
  ], questions: [
    Q('How does Ren feel?', ['Tired', 'Hungry', 'Angry'], 'つかれました = (I) got tired.'),
    Q('When does training start again?', ['Tomorrow', 'Today', 'In a month'], '明日から (あしたから) = from tomorrow.'),
  ] },
  { id: 'd4', title: 'A challenge', scene: '⚔️', lines: [
    L(narrator, 'ひるです。町に カイトが きました。', 'ひるです。まちに かいとが きました。', "It's noon. Kaito came to town."),
    L(kaito, 'レン！ 明日、しょうぶだ！', 'れん！ あした、しょうぶだ！', 'Ren! Showdown tomorrow!'),
    L(ren, 'いいよ。どこで？', 'いいよ。どこで？', 'Sure. Where?'),
    L(kaito, '道場で。あさ 七時だ。', 'どうじょうで。あさ しちじだ。', 'At the dojo. Seven in the morning.'),
  ], questions: [
    Q('When is the showdown?', ['Tomorrow', 'Today', 'Next week'], '明日 (あした) = tomorrow.'),
    Q('Where and what time?', ['The dojo, 7:00', 'In town, 7:00', 'The dojo, 1:00'], '道場で = at the dojo. 七時 (しちじ) = 7 o\'clock; いちじ would be 1.'),
  ] },
  { id: 'd5', title: 'The trip', scene: '🚃', lines: [
    L(ren, '師匠、東京に いきますか？', 'ししょう、とうきょうに いきますか？', 'Master, are you going to Tokyo?'),
    L(master, 'ああ。でんしゃで いく。', 'ああ。でんしゃで いく。', "Yes. I'm taking the train."),
    L(ren, 'おれも いきたい！', 'おれも いきたい！', 'I want to go too!'),
    L(master, 'だめだ。おまえは 修行だ。', 'だめだ。おまえは しゅぎょうだ。', 'No. You have training.'),
  ], questions: [
    Q('Where is the master going?', ['Tokyo', 'The dojo', 'A ramen shop'], '東京に いきます = going to Tokyo.'),
    Q('How is he getting there?', ['By train', 'By bus', 'On foot'], 'でんしゃで = by train (で marks the means).'),
    Q('Can Ren come?', ['No, he has training', 'Yes', 'Only tomorrow'], 'だめだ = no / not allowed.'),
  ] },
  { id: 'd6', title: 'The strongest', scene: '💪', lines: [
    L(kaito, 'この 町で だれが いちばん 強い？', 'この まちで だれが いちばん つよい？', 'Who is the strongest in this town?'),
    L(ren, 'もちろん、おれだ！', 'もちろん、おれだ！', "Me, obviously!"),
    L(kaito, 'ちがう。師匠だ。', 'ちがう。ししょうだ。', "Wrong. It's the master."),
    L(ren, '…そうだな。', '…そうだな。', '…Yeah, true.'),
  ], questions: [
    Q('Who does Ren say is the strongest?', ['Himself', 'Kaito', 'The master'], 'おれだ = it\'s me (おれ is Ren\'s "I").'),
    Q('Who does Kaito say is the strongest?', ['The master', 'Ren', 'Himself'], 'ちがう。師匠だ。 = Wrong. It\'s the master.'),
  ] },
  { id: 'd7', title: 'Water break', scene: '💧', lines: [
    L(master, 'レン、水を のめ。', 'れん、みずを のめ。', 'Ren, drink some water.'),
    L(ren, 'ありがとうございます！', 'ありがとうございます！', 'Thank you very much!'),
    L(master, 'すこしずつ のめよ。', 'すこしずつ のめよ。', 'Drink it a little at a time.'),
  ], questions: [
    Q('What does the master give Ren?', ['Water', 'Tea', 'Juice'], '水 (みず) = water. のめ = drink! (a blunt command).'),
    Q('How should Ren drink it?', ['A little at a time', 'All at once', 'Later'], 'すこしずつ = little by little.'),
  ] },
  { id: 'd8', title: 'Rainy day', scene: '☔', lines: [
    L(narrator, 'あさから 雨です。', 'あさから あめです。', "It's been raining since morning."),
    L(ren, '雨だ…。はしりたくない。', 'あめだ…。はしりたくない。', "Rain… I don't want to run."),
    L(kaito, 'なに？ 雨の 日も 修行だ！', 'なに？ あめの ひも しゅぎょうだ！', 'What? Rainy days are training too!'),
  ], questions: [
    Q("What's the weather like?", ['Rain', 'Snow', 'Sunny'], '雨 (あめ) = rain.'),
    Q('What does Kaito think?', ['Train anyway', 'Rest today', 'Go home'], '雨の 日も 修行だ = rainy days are training too.'),
  ] },
];

// ---------- shared N5 lookups ----------

const N5_BY_JP = new Map();
for (const w of N5_WORDS) if (!N5_BY_JP.has(w.jp)) N5_BY_JP.set(w.jp, w);
/** The N5 deck entry for a written word (the first one, when two share a spelling). Throws on a typo. */
export function n5(jp) {
  const w = N5_BY_JP.get(jp);
  if (!w) throw new Error('Not in the N5 deck: ' + jp);
  return w;
}

// ---------- Numbers & Time ----------
// Most scenes reuse an N5 word's example sentence (its clip already exists, voice 0). A few short new lines cover
// what the examples don't: dates, sound changes in prices, and minutes.
// X(N5 word whose example is spoken, kind, scene, question, options with the right one first, why)
const X = (word, kind, scene, q, options, why) => {
  const w = n5(word);
  return { id: 'n5:' + word, kind, scene, voice: 0, jp: w.ex, reading: w.exReading, en: w.exEn, q, options, why, garden: [w.id] };
};
// S(id, kind, scene, voice, spoken line, reading, question, options with the right one first, why, English, garden ids)
const S = (id, kind, scene, voice, jp, reading, q, options, why, en, garden = []) => ({ id, kind, scene, voice, jp, reading, q, options, why, en, garden });
const order = (who, name, count) => CUSTOMERS[who].order(SHOP_STOCK.find((s) => s.name === name), count);

/** Prices, times, dates and counters by ear, as tiny scenes. */
export const NUMBER_SCENES = [
  // Times
  X('三', 'time', '🕒', 'What time do they meet?', ['3:00', '4:00', '8:00', '1:00'], 'さんじ = 3 o\'clock. じ (時) after a number means "o\'clock".'),
  X('六', 'time', '⏰', 'What time do they get up?', ['6:00', '9:00', '2:00', '7:00'], 'ろくじ = 6:00.'),
  X('起きる', 'time', '⏰', 'What time do they get up?', ['7:00', '1:00', '4:00', '8:00'], 'しちじ = 7:00. For hours, 7 is しち. Careful: いちじ is 1:00.'),
  X('八', 'time', '🏫', 'What time do they go to school?', ['8:00', '4:00', '1:00', '6:00'], 'はちじ = 8:00.'),
  X('始まる', 'time', '🏫', 'When does school begin?', ['9:00', '5:00', '7:00', '10:00'], 'くじ = 9:00. For hours, 9 is く (not きゅう).'),
  X('着く', 'time', '🚃', 'When does the train arrive?', ['10:00', '2:00', '11:00', '4:00'], 'じゅうじ = 10:00. 電車 (でんしゃ) = train.'),
  X('午前', 'time', '🗓️', 'When do they meet?', ['10 a.m.', '10 p.m.', '4 a.m.', '2 p.m.'], '午前 (ごぜん) = a.m. In the afternoon it would be 午後 (ごご).'),
  X('半', 'time', '🕞', 'What time is it?', ['3:30', '3:00', '4:30', '3:15'], 'はん = half past. さんじはん = 3:30.'),
  X('閉まる', 'time', '🏪', 'When does the shop close?', ['8:00', '4:00', '1:00', '6:00'], 'はちじ = 8:00. 閉まります = closes.'),
  X('五', 'time', '⏳', 'How long should you wait?', ['5 minutes', '15 minutes', '50 minutes', '2 minutes'], 'ごふん = 5 minutes. 分 is ふん after 5 (and ぷん after 1, 3, 4, 6, 8, 10).'),
  S('t5', 'time', '🚉', 0, 'でんしゃは にじ ごふんに きます。', '', 'When does the train come?', ['2:05', '2:00', '12:05', '2:50'],
    'ごふん = 5 minutes. 50 minutes would be ごじゅっぷん.', 'The train comes at 2:05.', [n5('電車').id]),
  S('t3', 'time', '🚌', 0, 'バスは よじ じゅっぷんです。', '', 'When is the bus?', ['4:10', '4:00', '7:10', '4:15'],
    'よじ = 4:00 (4 is よ for hours, not し or よん). じゅっぷん = 10 minutes.', 'The bus is at 4:10.', [n5('バス').id]),
  // Prices
  X('百', 'price', '🖊️', 'How much is the pen?', ['¥100', '¥1,000', '¥10', '¥200'], 'ひゃく = 100, えん = yen.'),
  X('千', 'price', '📕', 'How much is the book?', ['¥1,000', '¥100', '¥10,000', '¥1,500'], 'せん = 1,000.'),
  X('万', 'price', '💴', 'How much do they want to borrow?', ['¥10,000', '¥1,000', '¥100,000', '¥100'], 'いちまん = 10,000. Japanese counts big numbers in 万 (ten thousands).'),
  S('p3', 'price', '🍜', ren.voice, 'ラーメンは はっぴゃくえんです。', '', 'How much is the ramen?', ['¥800', '¥600', '¥8,000', '¥300'],
    'はっぴゃく = 800: はち + ひゃく squeeze together. Also さんびゃく (300) and ろっぴゃく (600).', 'Ramen is 800 yen.'),
  S('p5', 'price', '🍡', ren.voice, 'だんごは さんびゃくえんです。', '', 'How much are the dango?', ['¥300', '¥3,000', '¥800', '¥130'],
    'さんびゃく = 300 (ひゃく turns into びゃく after さん).', 'Dango are 300 yen.'),
  // Days and dates
  X('火曜日', 'date', '📝', 'Which day is the test?', ['Tuesday', 'Thursday', 'Friday', 'Sunday'], '火曜日 (かようび) = Tuesday, "fire day".'),
  X('土曜日', 'date', '🥋', 'Which day do they go to the dojo?', ['Saturday', 'Sunday', 'Monday', 'Wednesday'], '土曜日 (どようび) = Saturday, "earth day".'),
  X('生まれる', 'date', '🎂', 'Which month were they born?', ['August', 'April', 'October', 'June'], 'はちがつ = August (month 8). Months are just number + がつ.'),
  S('d1', 'date', '📅', 0, 'しょうぶは いつかです。', '', 'Which day is the showdown?', ['the 5th', 'the 4th', 'the 8th', 'the 10th'],
    'いつか = the 5th. Days 1 to 10 have their own names: ついたち, ふつか, みっか, よっか, いつか…', 'The showdown is on the 5th.', ['w:しょうぶ']),
  S('d2', 'date', '🏆', 0, 'たいかいは しがつ とおかです。', '', 'When is the tournament?', ['April 10', 'April 4', 'July 10', 'April 20'],
    'しがつ = April (month 4 is し). とおか = the 10th.', 'The tournament is on April 10.'),
  S('d3', 'date', '📅', 0, 'あしたは くがつ ついたちです。', '', "What's the date tomorrow?", ['September 1', 'September 7', 'November 1', 'September 2'],
    'くがつ = September (month 9 is く). ついたち = the 1st.', 'Tomorrow is September 1.', ['w:明日']),
  // Counters
  X('家族', 'count', '👨‍👩‍👧‍👦', 'How many people are in the family?', ['4', '3', '5', '7'], 'よにん = 4 people. 1 and 2 are special: ひとり, ふたり.'),
  X('二人', 'count', '👥', 'How many people practise together?', ['2', '1', '3', '4'], 'ふたり (二人) = two people.'),
  X('三つ', 'count', '🍙', 'How many rice balls did they eat?', ['3', '2', '4', '6'], COUNTERS.tsu.explanation + ' みっつ = 3.'),
  X('五つ', 'count', '🍊', 'How many mandarins?', ['5', '4', '6', '9'], 'いつつ = 5 things.'),
  X('六つ', 'count', '🥛', 'How many glasses are there?', ['6', '7', '8', '3'], 'むっつ = 6 things.'),
  X('八つ', 'count', '🍬', 'How many candies?', ['8', '7', '4', '9'], 'やっつ = 8 things.'),
  X('九つ', 'count', '📦', 'How many boxes?', ['9', '5', '7', '10'], 'ここのつ = 9 things.'),
  X('水', 'count', '💧', 'How much water?', ['One glass', 'Two glasses', 'A bottle', 'Ten glasses'], 'いっぱい = one glass (〜杯 counts cups and glasses).'),
  X('週', 'count', '🏊', 'How often do they go to the pool?', ['Twice a week', 'Once a week', 'Every day', 'Twice a month'], 'しゅうに にかい = twice (2 times) a week.'),
  X('九', 'count', '🚌', 'Which bus are they waiting for?', ['Number 9', 'Number 5', 'Number 7', 'Number 1'], 'きゅうばん = number 9. 〜ばん = number ….'),
  S('c2', 'count', '🥤', CUSTOMERS.worker.voice, order('worker', 'ジュース', 'にほん'), '', 'How many bottles of juice?', ['2', '1', '3', '4'],
    COUNTERS.hon.explanation + ' にほん = 2.', 'Two bottles of juice, please.', [n5('ジュース').id]),
  S('c3', 'count', '🎫', CUSTOMERS.elder.voice, order('elder', 'チケット', 'さんまい'), '', 'How many tickets?', ['3', '4', '2', '5'],
    COUNTERS.mai.explanation + ' さんまい = 3.', 'Might I have three tickets?'),
  S('c4', 'count', '🍡', CUSTOMERS.worker.voice, order('worker', 'だんご', 'いっぽん'), '', 'How many dango skewers?', ['1', '3', '5', '2'],
    COUNTERS.hon.explanation + ' いっぽん = 1.', 'One dango skewer, please.'),
];

// ---------- Katakana Rush ----------

const isKatakana = (w) => /^[゠-ヿ]+$/.test(w);
/** Loanwords in katakana: the N5 deck first (each has a Garden card and a clip), then Reading Dojo, shop and story words. */
export const KATA_WORDS = (() => {
  const out = new Map();
  for (const w of N5_WORDS) if (isKatakana(w.jp)) out.set(w.jp, { w: w.jp, en: w.en, garden: w.id, say: w.say });
  for (const v of READ_WORDS) if (isKatakana(v.w) && !out.has(v.w)) out.set(v.w, { w: v.w, en: v.en, say: v.w });
  for (const s of SHOP_STOCK) if (isKatakana(s.name) && !out.has(s.name)) out.set(s.name, { w: s.name, en: s.en, say: s.name });
  for (const it of Object.values(GARDEN_CATALOG)) if (isKatakana(it.jp) && !out.has(it.jp)) out.set(it.jp, { w: it.jp, en: it.en, garden: it.id, say: it.jp });
  return [...out.values()];
})();

// ---------- Conjugation Dojo ----------
// Groups: 'u' (godan), 'ru' (ichidan), 'suru', 'kuru', 'aru' (like u, but its negative is ない); adjectives 'i', 'ii', 'na'.
const NV = (jp, group) => { const w = n5(jp); return { type: 'verb', jp, kana: w.reading, en: w.en, group, garden: w.id }; };
const NA = (jp, group) => { const w = n5(jp); return { type: 'adj', jp, kana: w.reading, en: w.en, group, garden: w.id }; };
const V = (jp, kana, en, group, garden = null) => ({ type: 'verb', jp, kana, en, group, garden });

/** N5 verbs and adjectives (the common core), plus the story's own verbs. */
export const CONJ_WORDS = [
  ...[['行く', 'u'], ['来る', 'kuru'], ['帰る', 'u'], ['食べる', 'ru'], ['飲む', 'u'], ['見る', 'ru'], ['聞く', 'u'], ['話す', 'u'],
    ['言う', 'u'], ['読む', 'u'], ['書く', 'u'], ['買う', 'u'], ['する', 'suru'], ['ある', 'aru'], ['いる', 'ru'], ['分かる', 'u'],
    ['起きる', 'ru'], ['寝る', 'ru'], ['出る', 'ru'], ['入る', 'u'], ['会う', 'u'], ['待つ', 'u'], ['持つ', 'u'], ['作る', 'u'],
    ['使う', 'u'], ['休む', 'u'], ['遊ぶ', 'u'], ['泳ぐ', 'u'], ['走る', 'u'], ['知る', 'u'], ['死ぬ', 'u'], ['呼ぶ', 'u'],
    ['着る', 'ru'], ['切る', 'u'], ['教える', 'ru'], ['歌う', 'u'], ['乗る', 'u'], ['立つ', 'u'], ['疲れる', 'ru'], ['なる', 'u'],
    ['勉強する', 'suru'], ['練習する', 'suru']].map(([jp, g]) => NV(jp, g)),
  V('まける', 'まける', 'to lose', 'ru', 'w:まける'),
  V('かつ', 'かつ', 'to win', 'u', 'w:かつ'),
  V('たたかう', 'たたかう', 'to fight', 'u', 'w:たたかう'),
  ...[['いい', 'ii'], ['大きい', 'i'], ['小さい', 'i'], ['新しい', 'i'], ['古い', 'i'], ['高い', 'i'], ['安い', 'i'], ['長い', 'i'],
    ['遠い', 'i'], ['近い', 'i'], ['暑い', 'i'], ['寒い', 'i'], ['難しい', 'i'], ['面白い', 'i'], ['楽しい', 'i'], ['美味しい', 'i'],
    ['強い', 'i'], ['弱い', 'i'], ['忙しい', 'i'], ['赤い', 'i'], ['速い', 'i'],
    ['好き', 'na'], ['元気', 'na'], ['静か', 'na'], ['綺麗', 'na'], ['嫌い', 'na'], ['有名', 'na'], ['便利', 'na'], ['上手', 'na'], ['暇', 'na']]
    .map(([jp, g]) => NA(jp, g)),
];

export const VERB_FORMS = ['masu', 'nai', 'ta', 'te', 'plain'];
export const ADJ_FORMS = ['nai', 'ta', 'te'];
export const FORM_LABEL = {
  masu: 'polite ます form', nai: 'negative (ない)', ta: 'past (た)', te: 'て-form', plain: 'plain (dictionary) form',
};

// Kana rows for godan endings.
const ROW = {
  う: ['わ', 'い', 'う'], く: ['か', 'き', 'く'], ぐ: ['が', 'ぎ', 'ぐ'], す: ['さ', 'し', 'す'], つ: ['た', 'ち', 'つ'],
  ぬ: ['な', 'に', 'ぬ'], ぶ: ['ば', 'び', 'ぶ'], む: ['ま', 'み', 'む'], る: ['ら', 'り', 'る'],
};
const TE = { う: 'って', つ: 'って', る: 'って', む: 'んで', ぶ: 'んで', ぬ: 'んで', く: 'いて', ぐ: 'いで', す: 'して' };
const head = (s) => s.slice(0, -1);
const last = (s) => s.slice(-1);
const toTa = (te) => te.replace('て', 'た').replace('で', 'だ');

/** One verb form of a dictionary word, treating it as `group` (so wrong-group answers make good distractors). */
function verbForm(dict, group, form, isIku = false) {
  if (group === 'suru') return dict.slice(0, -2) + { masu: 'します', nai: 'しない', ta: 'した', te: 'して', plain: 'する' }[form];
  if (group === 'kuru') return { masu: 'きます', nai: 'こない', ta: 'きた', te: 'きて', plain: 'くる' }[form];
  if (group === 'aru' && form === 'nai') return 'ない';
  const stem = head(dict);
  const end = last(dict);
  if (group === 'ru') return { masu: stem + 'ます', nai: stem + 'ない', ta: stem + 'た', te: stem + 'て', plain: dict }[form];
  const r = ROW[end];
  if (!r) return null;
  if (form === 'masu') return stem + r[1] + 'ます';
  if (form === 'nai') return stem + r[0] + 'ない';
  if (form === 'plain') return dict;
  const te = isIku ? 'って' : TE[end];
  return stem + (form === 'te' ? te : toTa(te));
}

function adjForm(jp, group, form) {
  if (group === 'ii') return { nai: 'よくない', ta: 'よかった', te: 'よくて' }[form];
  if (group === 'i') return { nai: head(jp) + 'くない', ta: head(jp) + 'かった', te: head(jp) + 'くて' }[form];
  return { nai: jp + 'じゃない', ta: jp + 'だった', te: jp + 'で' }[form];
}

/** The right answer for a word and form, written and in kana. 来る's changing forms are written in kana. */
export function conjugate(word, form) {
  if (word.type === 'adj') return { jp: adjForm(word.jp, word.group, form), kana: adjForm(word.kana, word.group, form) };
  const iku = word.kana === 'いく';
  if (word.group === 'kuru') { const k = verbForm(word.kana, 'kuru', form); return { jp: form === 'plain' ? word.jp : k, kana: k }; }
  return { jp: verbForm(word.jp, word.group, form, iku), kana: verbForm(word.kana, word.group, form, iku) };
}

/** The prompt shown for a question: the dictionary form, or for "plain" the ます form to turn back. */
export function conjPrompt(word, form) {
  return form === 'plain' ? conjugate(word, 'masu') : { jp: word.jp, kana: word.kana };
}

/** Plausible wrong answers: the same word run through the other group's rules, and the classic slips. */
export function conjDistractors(word, form) {
  const right = conjugate(word, form).jp;
  const out = new Set();
  const w = word.jp;
  if (word.type === 'adj') {
    if (word.group === 'ii') {
      out.add({ nai: 'いくない', ta: 'いかった', te: 'いくて' }[form]);
      out.add({ nai: 'いいじゃない', ta: 'いいだった', te: 'いいで' }[form]);
      out.add({ nai: 'いいない', ta: 'いいでした', te: 'よいで' }[form]);
    } else if (word.group === 'i') {
      out.add(adjForm(w, 'na', form));
      out.add({ nai: w + 'ない', ta: w + 'でした', te: w + 'で' }[form]);
      out.add({ nai: w + 'くない', ta: w + 'かった', te: head(w) + 'かって' }[form]);
    } else {
      // な-adjectives that end in い (綺麗 きれい, 嫌い きらい) tempt the い-adjective rule.
      if (/い$/.test(word.kana)) out.add(/い$/.test(w) ? adjForm(w, 'i', form) : adjForm(word.kana, 'i', form));
      out.add({ nai: w + 'ない', ta: w + 'かった', te: w + 'て' }[form]);
      out.add({ nai: w + 'くない', ta: w + 'でした', te: w + 'だて' }[form]);
    }
  } else {
    const dict = word.group === 'kuru' ? word.kana : w;
    const iku = word.kana === 'いく';
    const masuStem = (verbForm(dict, word.group, 'masu') || dict).slice(0, -2);
    const uStem = (verbForm(dict, 'u', 'masu') || dict).slice(0, -2);
    if (word.group === 'suru') {
      const pre = dict.slice(0, -2);
      out.add(pre + { masu: 'すります', nai: 'すらない', ta: 'すった', te: 'すって', plain: 'しる' }[form]);
      out.add(pre + { masu: 'さます', nai: 'さない', ta: 'さた', te: 'さて', plain: 'すう' }[form]);
      out.add(pre + { masu: 'するます', nai: 'するない', ta: 'するた', te: 'するて', plain: 'しす' }[form]);
    } else if (form === 'plain') {
      out.add(masuStem + 'る');
      for (const e of ['う', 'む', 'つ']) out.add(head(dict) + e);
      if (word.group === 'kuru') { out.add('きる'); out.add('こる'); }
    } else {
      for (const g of ['u', 'ru']) if (g !== word.group) out.add(verbForm(dict, g, form, false));
      if (word.group === 'aru' && form === 'nai') { out.add('あらない'); out.add('ありない'); out.add('あるない'); }
      if (form === 'te' || form === 'ta') {
        out.add(masuStem + (form === 'te' ? 'て' : 'た'));
        if (word.group === 'u' || word.group === 'aru') for (const alt of ['って', 'んで', 'いて', 'して']) out.add(head(dict) + (form === 'te' ? alt : toTa(alt)));
        if (iku) out.add(head(dict) + (form === 'te' ? 'いて' : 'いた'));
        out.add(dict + (form === 'te' ? 'て' : 'た'));
        out.add(uStem + (form === 'te' ? 'て' : 'た'));
      }
      if (form === 'nai') { out.add(masuStem + 'ない'); out.add(dict + 'ない'); out.add(uStem + 'ない'); }
      if (form === 'masu') { out.add(dict + 'ます'); out.add(head(dict) + 'ます'); out.add(masuStem + 'ります'); }
      if (word.group === 'kuru') { out.add({ masu: 'くります', nai: 'くない', ta: 'くった', te: 'くって' }[form]); out.add({ masu: 'こます', nai: 'きない', ta: 'こた', te: 'こて' }[form]); }
    }
  }
  // Drop the right answer and anything that has lost the word itself (a bare ending is no real slip).
  return [...out].filter((x) => x && x !== right && x.length >= 2 && !['ります', 'ない', 'ます'].includes(x));
}

const I_OR_E = /[いきしちにひみりぎじびえけせてねへめれげぜべ]る$/;

/** Why the right answer is right, shown after a miss. */
export function conjWhy(word, form) {
  const r = conjugate(word, form).jp;
  const w = word.jp;
  if (word.type === 'adj') {
    if (word.group === 'ii') return `いい is the one irregular adjective: its forms are built on よい → ${r}.`;
    if (word.group === 'i') return `${w} is an い-adjective: drop the last い and add ${{ nai: 'くない', ta: 'かった', te: 'くて' }[form]} → ${r}.`;
    const trap = /い$/.test(word.kana) ? ` Watch out: ${w} (${word.kana}) ends in い but is a な-adjective.` : '';
    return `${w} is a な-adjective: it works like a noun, so add ${{ nai: 'じゃない', ta: 'だった', te: 'で' }[form]} → ${r}.${trap}`;
  }
  if (word.group === 'suru') return `${w} ends in する, which is irregular: します, しない, した, して. So ${r}.`;
  if (word.group === 'kuru') return '来る (くる) is irregular and its first sound changes: きます, こない, きた, きて.';
  if (word.group === 'aru' && form === 'nai') return 'ある is special: its negative is just ない ("there isn\'t"), never あらない.';
  if (form === 'plain') {
    return word.group === 'ru'
      ? `${conjugate(word, 'masu').jp}: drop ます and add る, because ${w} is a る-verb.`
      : `${conjugate(word, 'masu').jp} is an う-verb: the い-sound before ます goes back to its う-sound → ${w}.`;
  }
  if (word.group === 'ru') return `${w} is a る-verb: drop る and add ${{ masu: 'ます', nai: 'ない', ta: 'た', te: 'て' }[form]} → ${r}.`;
  const tricky = I_OR_E.test(word.kana) ? ` Watch out: ${w} (${word.kana}) ends in -${word.kana.slice(-2)} like a る-verb, but it's an う-verb.` : '';
  if (form === 'masu') return `${w} is an う-verb: change the last sound to its い-sound and add ます → ${r}.${tricky}`;
  if (form === 'nai') return `${w} is an う-verb: change the last sound to its あ-sound and add ない → ${r}${last(word.kana) === 'う' ? ' (う becomes わ)' : ''}.${tricky}`;
  if (word.kana === 'いく') return `行く is the one exception: its ${form === 'te' ? 'て' : 'た'}-form is ${r}, not ${head(w)}${form === 'te' ? 'いて' : 'いた'}.`;
  const end = last(word.kana);
  const groupEnds = { う: 'う, つ, る', つ: 'う, つ, る', る: 'う, つ, る', む: 'む, ぶ, ぬ', ぶ: 'む, ぶ, ぬ', ぬ: 'む, ぶ, ぬ', く: 'く', ぐ: 'ぐ', す: 'す' }[end];
  const shown = form === 'te' ? TE[end] : toTa(TE[end]);
  return `${w} is an う-verb ending in ${end}. Verbs ending in ${groupEnds} take ${shown} → ${r}.${tricky}`;
}

// ---------- Sentence Builder ----------

const SCENES = ['🍜', '🎓', '🏃', '🥋', '🗣️', '📕', '💪', '💧', '⏰', '🏆', '⚔️', '🗾'];
/** Other word orders that are just as natural (the learner gets credit for these too). */
const TRAIN_ALTS = { 2: ['町で毎日はしります'], 10: ['カイトとレンはしょうぶします'], 11: ['ともだちに日本であいます'] };
const bare = (s) => s.replace(/[\s。、！？!?]/g, '');

const beatByText = (jp) => {
  for (const ch of CHAPTERS) for (const b of ch.beats) if (b.jp === jp) return b;
  throw new Error('No story line: ' + jp);
};
const fromBeat = (id, jp, tiles, scene, alts = []) => {
  const b = beatByText(jp);
  return { id, en: b.en, scene, tiles, alts, say: b.jp, voice: b.speaker.voice, garden: b.words.map((w) => w.gardenID) };
};
/** An N5 example sentence (it has a clip already), cut into tiles. */
const fromN5 = (word, tiles, scene, alts = []) => {
  const w = n5(word);
  if (bare(w.ex) !== tiles.join('')) throw new Error(`Tiles don't spell ${w.ex}`);
  return { id: 'n5:' + word, en: w.exEn, scene, tiles, alts, say: w.ex, voice: 0, garden: [w.id] };
};

/** English (and a scene) to build in Japanese from shuffled tiles: Particle Train sentences, story lines, N5 examples. */
export const BUILD_SENTENCES = [
  ...TRAINS.map((t, i) => {
    const filled = Object.fromEntries(t.gaps.map((g, j) => [j, g ? g.correct[0] : null]).filter(([, p]) => p));
    const tiles = [];
    t.cars.forEach((car, j) => { tiles.push(car); if (j < t.gaps.length && t.gaps[j]) tiles.push(t.gaps[j].correct[0]); });
    const say = assembleTrain(t, filled);
    return { id: 'train' + i, en: t.en, scene: SCENES[i], tiles, alts: TRAIN_ALTS[i] || [], say, voice: 0, garden: gardenIdsIn(say) };
  }),
  fromBeat('ch1a', 'ここは 小さい 町です。', ['ここ', 'は', '小さい', '町です'], '🏘️'),
  fromBeat('ch1b', '明日から 修行だ！', ['明日', 'から', '修行', 'だ'], '🥋'),
  fromBeat('ch2a', 'つぎは まけない！', ['つぎ', 'は', 'まけない'], '🔥'),
  fromBeat('ch3a', 'レンは 毎日 はしりました。', ['レン', 'は', '毎日', 'はしりました'], '🏃', ['毎日レンははしりました']),
  fromBeat('ch3b', '休む ことも 修行だ。', ['休む', 'ことも', '修行だ'], '🌳'),
  fromBeat('ch4a', '今日は まけない！', ['今日', 'は', 'まけない'], '⚔️'),
  fromBeat('ch4b', '二人は たたかいました。', ['二人', 'は', 'たたかいました'], '🤜'),
  fromBeat('ch4c', 'レンが かちました！', ['レン', 'が', 'かちました'], '🏆'),
  fromN5('友達', ['友達', 'と', 'えいが', 'を', '見ます'], '🎬', ['えいがを友達と見ます']),
  fromN5('六', ['六時', 'に', 'おきます'], '⏰'),
  fromN5('水', ['水', 'を', '一ぱい', 'ください'], '💧'),
  fromN5('八', ['八時', 'に', '学校', 'へ', '行きます'], '🏫', ['学校へ八時に行きます']),
  fromN5('何', ['何', 'を', '食べますか'], '🍱'),
  fromN5('いくら', ['この', '本', 'は', 'いくら', 'ですか'], '📕'),
  fromN5('一つ', ['りんご', 'を', '一つ', 'ください'], '🍎'),
  fromN5('駅', ['駅', 'は', 'どこ', 'ですか'], '🚉'),
  fromN5('毎日', ['毎日', 'れんしゅう', 'します'], '💪'),
];
