// Content for the newer practice modes: Listening Lab, Conjugation Dojo, Sentence Builder, Katakana Rush and
// Numbers & Time. Everything reuses words the app already teaches (story, phrases, Reading Dojo words, shop stock);
// only the short dialogues and scenarios are new, original writing.
import { CAST, TRAINS, CHAPTERS, SHOP_STOCK, COUNTERS, CUSTOMERS, GARDEN_CATALOG, assembleTrain } from './data.js';
import { READ_WORDS } from './dojo-data.js';

const { narrator, ren, master, kaito } = CAST;

// ---------- shared ----------

/** Garden ids (from GARDEN_CATALOG) for the known words that appear in a Japanese text. */
export function gardenIdsIn(text) {
  const t = String(text || '').replace(/\s+/g, '');
  return Object.values(GARDEN_CATALOG)
    .filter((it) => (it.jp.length >= 2 || /[一-鿿]/.test(it.jp)) && t.includes(it.jp))
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

// ---------- Numbers & Time ----------
// S(id, kind, scene, voice, spoken line, reading, question, options with the right one first, why, English, garden ids)
const S = (id, kind, scene, voice, jp, reading, q, options, why, en, garden = []) => ({ id, kind, scene, voice, jp, reading, q, options, why, en, garden });
const order = (who, name, count) => CUSTOMERS[who].order(SHOP_STOCK.find((s) => s.name === name), count);

/** Prices, times, dates and counters by ear, as tiny scenes. Lines are in hiragana so every number is spelled out. */
export const NUMBER_SCENES = [
  // Train and bus times
  S('t1', 'time', '🚉', 0, 'つぎの でんしゃは しちじです。', '', 'When is the next train?', ['7:00', '1:00', '4:00', '8:00'],
    'しちじ = 7:00. For hours, 7 is しち. Careful: いちじ is 1:00.', 'The next train is at 7:00.'),
  S('t2', 'time', '🚉', 0, 'でんしゃは くじ はんに でます。', '', 'When does the train leave?', ['9:30', '9:00', '5:30', '9:15'],
    'くじ = 9:00 (9 is く for hours) and はん = half past.', 'The train leaves at 9:30.'),
  S('t3', 'time', '🚌', 0, 'バスは よじ じゅっぷんです。', '', 'When is the bus?', ['4:10', '4:00', '7:10', '4:15'],
    'よじ = 4:00 (4 is よ for hours). じゅっぷん = 10 minutes.', 'The bus is at 4:10.'),
  S('t4', 'time', '🥋', master.voice, 'しゅぎょうは ろくじからだ！', '', 'When does training start?', ['6:00', '9:00', '2:00', '7:00'],
    'ろくじ = 6:00. から = from.', 'Training starts at 6!', ['w:修行']),
  S('t5', 'time', '🚉', 0, 'でんしゃは にじ ごふんに きます。', '', 'When does the train come?', ['2:05', '2:00', '12:05', '2:50'],
    'ごふん = 5 minutes. 50 minutes would be ごじゅっぷん.', 'The train comes at 2:05.'),
  S('t6', 'time', '⌚', kaito.voice, 'いま、じゅういちじだ。', '', 'What time is it now?', ['11:00', '10:00', '1:00', '12:00'],
    'じゅういち = 11 (10 + 1). じゅうじ is 10:00 and じゅうにじ is 12:00.', "It's 11 o'clock now."),
  // Shop prices (the shopkeeper is Ren)
  S('p1', 'price', '🍙', ren.voice, 'おにぎりは ひゃくえんです。', '', 'How much is the rice ball?', ['¥100', '¥1,000', '¥10', '¥200'],
    'ひゃく = 100, えん = yen.', 'Rice balls are 100 yen.'),
  S('p2', 'price', '🥤', ren.voice, 'ジュースは ひゃくごじゅうえんです。', '', 'How much is the juice?', ['¥150', '¥105', '¥500', '¥115'],
    'ひゃく (100) + ごじゅう (50) = 150.', 'Juice is 150 yen.'),
  S('p3', 'price', '🍜', ren.voice, 'ラーメンは はっぴゃくえんです。', '', 'How much is the ramen?', ['¥800', '¥600', '¥8,000', '¥300'],
    'はっぴゃく = 800: はち + ひゃく squeeze together. Also さんびゃく (300) and ろっぴゃく (600).', 'Ramen is 800 yen.'),
  S('p4', 'price', '🎫', ren.voice, 'チケットは せんえんです。', '', 'How much is the ticket?', ['¥1,000', '¥100', '¥10,000', '¥1,500'],
    'せん = 1,000. ひゃく is 100.', 'Tickets are 1,000 yen.'),
  S('p5', 'price', '🍡', ren.voice, 'だんごは さんびゃくえんです。', '', 'How much are the dango?', ['¥300', '¥3,000', '¥800', '¥130'],
    'さんびゃく = 300 (ひゃく turns into びゃく after さん).', 'Dango are 300 yen.'),
  S('p6', 'price', '🍎', ren.voice, 'りんごは にひゃくえんです。', '', 'How much is the apple?', ['¥200', '¥2,000', '¥120', '¥20'],
    'に (2) + ひゃく (100) = 200.', 'Apples are 200 yen.'),
  // Dates
  S('d1', 'date', '📅', 0, 'しょうぶは いつかです。', '', 'Which day is the showdown?', ['the 5th', 'the 4th', 'the 8th', 'the 10th'],
    'いつか = the 5th. Days 1 to 10 have their own names: ついたち, ふつか, みっか, よっか, いつか…', 'The showdown is on the 5th.', ['w:しょうぶ']),
  S('d2', 'date', '🏆', 0, 'たいかいは しがつ とおかです。', '', 'When is the tournament?', ['April 10', 'April 4', 'July 10', 'April 20'],
    'しがつ = April (month 4 is し). とおか = the 10th.', 'The tournament is on April 10.'),
  S('d3', 'date', '📅', 0, 'あしたは くがつ ついたちです。', '', "What's the date tomorrow?", ['September 1', 'September 7', 'November 1', 'September 2'],
    'くがつ = September (month 9 is く). ついたち = the 1st.', 'Tomorrow is September 1.', ['w:明日']),
  // Counters (the same customers as the Shopkeeper)
  S('c1', 'count', '🍎', CUSTOMERS.kid.voice, order('kid', 'りんご', 'みっつ'), '', 'How many apples?', ['3', '2', '4', '6'],
    COUNTERS.tsu.explanation + ' みっつ = 3.', 'Three apples, please!'),
  S('c2', 'count', '🥤', CUSTOMERS.worker.voice, order('worker', 'ジュース', 'にほん'), '', 'How many bottles of juice?', ['2', '1', '3', '4'],
    COUNTERS.hon.explanation + ' にほん = 2.', 'Two bottles of juice, please.'),
  S('c3', 'count', '🎫', CUSTOMERS.elder.voice, order('elder', 'チケット', 'さんまい'), '', 'How many tickets?', ['3', '4', '2', '5'],
    COUNTERS.mai.explanation + ' さんまい = 3.', 'Might I have three tickets?'),
  S('c4', 'count', '🍡', CUSTOMERS.worker.voice, order('worker', 'だんご', 'いっぽん'), '', 'How many dango skewers?', ['1', '3', '5', '2'],
    COUNTERS.hon.explanation + ' いっぽん = 1.', 'One dango skewer, please.'),
  S('n1', 'count', '🥋', 0, '道場に 人が ごにん います。', 'どうじょうに ひとが ごにん います。', 'How many people are in the dojo?', ['5', '2', '9', '4'],
    'ごにん = 5 people. 1 and 2 are special: ひとり, ふたり.', 'There are five people in the dojo.'),
  S('n2', 'count', '👥', ren.voice, 'おれと カイト、ふたりで いく！', '', 'How many are going?', ['2', '1', '3', '4'],
    'ふたり (二人) = two people.', "Kaito and me, the two of us are going!", ['w:二人']),
];

// ---------- Katakana Rush ----------

const isKatakana = (w) => /^[゠-ヿ]+$/.test(w);
/** Loanwords in katakana the app already knows (Reading Dojo words, shop stock, the story). */
export const KATA_WORDS = (() => {
  const out = new Map();
  for (const v of READ_WORDS) if (isKatakana(v.w)) out.set(v.w, { w: v.w, en: v.en });
  for (const s of SHOP_STOCK) if (isKatakana(s.name)) out.set(s.name, { w: s.name, en: s.en });
  for (const it of Object.values(GARDEN_CATALOG)) if (isKatakana(it.jp) && !out.has(it.jp)) out.set(it.jp, { w: it.jp, en: it.en, garden: it.id });
  return [...out.values()];
})();

// ---------- Conjugation Dojo ----------
// V(dictionary form, its reading, English, group, garden id). Groups: 'u' (godan), 'ru' (ichidan), 'suru', 'kuru'.
// A(adjective, reading, English, 'i' | 'na', garden id).
const V = (jp, kana, en, group, garden = null) => ({ type: 'verb', jp, kana, en, group, garden });
const A = (jp, kana, en, group, garden = null) => ({ type: 'adj', jp, kana, en, group, garden });

/** Only verbs and adjectives the app already uses (story, Kanji Forge, starter kanji, Reading Dojo words). */
export const CONJ_WORDS = [
  V('はしる', 'はしる', 'to run', 'u', 'w:はしる'),
  V('まける', 'まける', 'to lose', 'ru', 'w:まける'),
  V('かつ', 'かつ', 'to win', 'u', 'w:かつ'),
  V('たたかう', 'たたかう', 'to fight', 'u', 'w:たたかう'),
  V('つかれる', 'つかれる', 'to get tired', 'ru', 'w:つかれる'),
  V('休む', 'やすむ', 'to rest', 'u', 'w:休む'),
  V('来る', 'くる', 'to come', 'kuru', 'w:来る'),
  V('聞く', 'きく', 'to listen', 'u', 'k:聞'),
  V('話す', 'はなす', 'to speak', 'u', 'k:話'),
  V('なる', 'なる', 'to become', 'u'),
  V('見る', 'みる', 'to see', 'ru'),
  V('行く', 'いく', 'to go', 'u'),
  V('食べる', 'たべる', 'to eat', 'ru'),
  V('飲む', 'のむ', 'to drink', 'u'),
  V('する', 'する', 'to do', 'suru'),
  A('強い', 'つよい', 'strong', 'i', 'w:強い'),
  A('小さい', 'ちいさい', 'small', 'i', 'w:小さい'),
  A('はやい', 'はやい', 'fast', 'i', 'w:はやい'),
  A('大きい', 'おおきい', 'big', 'i'),
  A('さむい', 'さむい', 'cold', 'i'),
  A('あかい', 'あかい', 'red', 'i'),
  A('好き', 'すき', 'liked', 'na', 'k:好'),
  A('げんき', 'げんき', 'healthy, lively', 'na'),
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

/** One verb form of a dictionary word, treating it as `group` (so wrong-group answers make good distractors). */
function verbForm(dict, group, form, isIku = false) {
  if (group === 'suru') return { masu: 'します', nai: 'しない', ta: 'した', te: 'して', plain: 'する' }[form];
  if (group === 'kuru') return { masu: 'きます', nai: 'こない', ta: 'きた', te: 'きて', plain: 'くる' }[form];
  const stem = head(dict);
  const end = last(dict);
  if (group === 'ru') return { masu: stem + 'ます', nai: stem + 'ない', ta: stem + 'た', te: stem + 'て', plain: dict }[form];
  const r = ROW[end];
  if (!r) return null;
  if (form === 'masu') return stem + r[1] + 'ます';
  if (form === 'nai') return stem + r[0] + 'ない';
  if (form === 'plain') return dict;
  const te = isIku ? 'って' : TE[end];
  return stem + (form === 'te' ? te : te.replace('て', 'た').replace('で', 'だ'));
}

function adjForm(jp, group, form) {
  if (group === 'i') return { nai: head(jp) + 'くない', ta: head(jp) + 'かった', te: head(jp) + 'くて' }[form];
  return { nai: jp + 'じゃない', ta: jp + 'だった', te: jp + 'で' }[form];
}

/** The right answer for a word and form, in its written form and in kana. 来る's forms are written in kana. */
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
  if (word.type === 'adj') {
    const w = word.jp;
    const opp = word.group === 'i' ? 'na' : 'i';
    out.add(adjForm(w, opp, form));
    if (word.group === 'i') {
      out.add({ nai: w + 'ない', ta: w + 'でした', te: w + 'で' }[form]);
      out.add({ nai: w + 'じゃない', ta: w + 'だった', te: head(w) + 'かって' }[form]);
    } else {
      out.add({ nai: w + 'ない', ta: w + 'かった', te: w + 'て' }[form]);
      out.add({ nai: w + 'くない', ta: w + 'でした', te: w + 'だて' }[form]);
    }
  } else {
    const dict = word.group === 'kuru' ? word.kana : word.jp;
    const iku = word.kana === 'いく';
    const masuStem = (verbForm(dict, word.group, 'masu') || dict).slice(0, -2);
    const uStem = (verbForm(dict, 'u', 'masu') || dict).slice(0, -2);
    if (form === 'plain') {
      out.add(masuStem + 'る');
      if (word.group === 'ru') { out.add(head(dict) + 'う'); out.add(head(dict) + 'む'); out.add(head(dict) + 'つ'); }
      if (word.group === 'u') { out.add(head(dict) + 'う'); out.add(head(dict) + 'む'); out.add(head(dict) + 'つ'); }
      if (word.group === 'kuru') { out.add('きる'); out.add('こる'); }
      if (word.group === 'suru') { out.add('しる'); out.add('すう'); }
    } else {
      for (const g of ['u', 'ru']) if (g !== word.group) out.add(verbForm(dict, g, form, false));
      if (form === 'te' || form === 'ta') {
        out.add(masuStem + (form === 'te' ? 'て' : 'た'));
        if (word.group === 'u') for (const alt of ['って', 'んで', 'いて', 'して']) out.add(head(dict) + (form === 'te' ? alt : alt.replace('て', 'た').replace('で', 'だ')));
        if (iku) out.add(head(dict) + (form === 'te' ? 'いて' : 'いた'));
        out.add(dict + (form === 'te' ? 'て' : 'た'));
        out.add(uStem + (form === 'te' ? 'て' : 'た'));
      }
      if (form === 'nai') { out.add(masuStem + 'ない'); out.add(dict + 'ない'); out.add(uStem + 'ない'); }
      if (form === 'masu') { out.add(dict + 'ます'); out.add(head(dict) + 'ます'); out.add(masuStem + 'ります'); }
      if (word.group === 'kuru') { out.add({ masu: 'くります', nai: 'くない', ta: 'くった', te: 'くって' }[form]); out.add({ masu: 'こます', nai: 'きない', ta: 'こた', te: 'こて' }[form]); }
      if (word.group === 'suru') { out.add({ masu: 'すります', nai: 'すらない', ta: 'すった', te: 'すって' }[form]); out.add({ masu: 'さます', nai: 'さない', ta: 'さた', te: 'さて' }[form]); }
    }
  }
  // Drop the right answer and anything that has lost the word itself (a bare ending is no real slip).
  return [...out].filter((x) => x && x !== right && x.length >= 2 && !['ります', 'ない', 'ます'].includes(x));
}

/** Why the right answer is right, shown after a miss. */
export function conjWhy(word, form) {
  const r = conjugate(word, form).jp;
  const w = word.jp;
  if (word.type === 'adj') {
    if (word.group === 'i') {
      return `${w} is an い-adjective: drop the last い and add ${{ nai: 'くない', ta: 'かった', te: 'くて' }[form]} → ${r}.`;
    }
    return `${w} is a な-adjective: it works like a noun, so add ${{ nai: 'じゃない', ta: 'だった', te: 'で' }[form]} → ${r}.`;
  }
  if (word.group === 'suru') return `する is irregular: します, しない, した, して. Learn these four by heart (they also power しょうぶする and more).`;
  if (word.group === 'kuru') return `来る (くる) is irregular and its first sound changes: きます, こない, きた, きて.`;
  if (form === 'plain') {
    return word.group === 'ru'
      ? `${conjugate(word, 'masu').jp} drops ます and adds る: ${w} is a る-verb.`
      : `${conjugate(word, 'masu').jp} is an う-verb: the い-sound before ます goes back to an う-sound → ${w}.`;
  }
  if (word.group === 'ru') return `${w} is a る-verb: drop る and add ${{ masu: 'ます', nai: 'ない', ta: 'た', te: 'て' }[form]} → ${r}.`;
  const tricky = /[いきしちにひみりぎじびえけせてねへめれげぜべ]る$/.test(word.kana) ? ` Watch out: ${w} ends in -${word.kana.slice(-2)} like a る-verb, but it's an う-verb.` : '';
  if (form === 'masu') return `${w} is an う-verb: change the last sound to its い-sound and add ます → ${r}.${tricky}`;
  if (form === 'nai') return `${w} is an う-verb: change the last sound to its あ-sound and add ない → ${r}${last(word.kana) === 'う' ? ' (う becomes わ)' : ''}.${tricky}`;
  if (word.kana === 'いく') return `行く is the one exception: its ${form === 'te' ? 'て' : 'た'}-form is ${r}, not ${head(w)}${form === 'te' ? 'いて' : 'いた'}.`;
  const end = last(word.kana);
  const groupEnds = { う: 'う, つ, る', つ: 'う, つ, る', る: 'う, つ, る', む: 'む, ぶ, ぬ', ぶ: 'む, ぶ, ぬ', ぬ: 'む, ぶ, ぬ', く: 'く', ぐ: 'ぐ', す: 'す' }[end];
  const te = TE[end];
  const shown = form === 'te' ? te : te.replace('て', 'た').replace('で', 'だ');
  return `${w} is an う-verb ending in ${end}. Verbs ending in ${groupEnds} take ${shown} → ${r}.${tricky}`;
}

// ---------- Sentence Builder ----------

const SCENES = ['🍜', '🎓', '🏃', '🥋', '🗣️', '📕', '💪', '💧', '⏰', '🏆', '⚔️', '🗾'];
/** Other word orders that are just as natural (the learner gets credit for these too). */
const TRAIN_ALTS = { 2: ['町で毎日はしります'], 10: ['カイトとレンはしょうぶします'], 11: ['ともだちに日本であいます'] };

const beatByText = (jp) => {
  for (const ch of CHAPTERS) for (const b of ch.beats) if (b.jp === jp) return b;
  throw new Error('No story line: ' + jp);
};
const fromBeat = (id, jp, tiles, scene, alts = []) => {
  const b = beatByText(jp);
  return { id, en: b.en, scene, tiles, alts, say: b.jp, voice: b.speaker.voice, garden: b.words.map((w) => w.gardenID) };
};

/** English (and a scene) to build in Japanese from shuffled tiles: Particle Train sentences and story lines. */
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
];
