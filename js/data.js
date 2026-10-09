// All study content, ported verbatim from the Kotoba Beat SwiftUI prototype (plus the N5 deck in n5.js).
import { N5 } from './n5.js';

// ---------- Phrases (Phrases.swift) ----------

/** Builds morae from "あ|り|が|と|う" and a pattern like "LHLLL". っ is a held silence. */
function m(kana, pattern) {
  return kana.split('|').map((k, i) => ({ kana: k, high: pattern[i] === 'H', silent: k === 'っ' }));
}

function P(id, display, speak, meaning, prompt, morae, accept, isBoss = false) {
  return { id, display, speak, meaning, prompt, morae, accept, isBoss, kana: morae.map((x) => x.kana).join('') };
}

/** Starter set: common N5 greetings and words plus pitch-accent minimal pairs (standard Tokyo accent). */
export const PHRASES = [
  P('arigatou', 'ありがとう', 'ありがとう', 'Thank you', 'Thank you', m('あ|り|が|と|う', 'LHLLL'), ['ありがとう', '有難う', '有り難う']),
  P('ohayou', 'おはよう', 'おはよう', 'Good morning', 'Good morning', m('お|は|よ|う', 'LHHH'), ['おはよう', 'お早う']),
  P('konnichiwa', 'こんにちは', 'こんにちは', 'Hello', 'Hello', m('こ|ん|に|ち|は', 'LHHHH'), ['こんにちは', 'こんにちわ', '今日は']),
  P('konbanwa', 'こんばんは', 'こんばんは', 'Good evening', 'Good evening', m('こ|ん|ば|ん|は', 'LHHHH'), ['こんばんは', 'こんばんわ', '今晩は']),
  P('sayounara', 'さようなら', 'さようなら', 'Goodbye', 'Goodbye', m('さ|よ|う|な|ら', 'LHHHL'), ['さようなら', 'さよなら']),
  P('sumimasen', 'すみません', 'すみません', 'Excuse me / Sorry', 'Excuse me', m('す|み|ま|せ|ん', 'LHHHL'), ['すみません', '済みません']),
  P('itadakimasu', 'いただきます', 'いただきます', "Let's eat (before a meal)", 'Before you eat', m('い|た|だ|き|ま|す', 'LHHHHL'), ['いただきます', '頂きます']),
  P('hajimemashite', 'はじめまして', 'はじめまして', 'Nice to meet you', 'Nice to meet you', m('は|じ|め|ま|し|て', 'LHHHLL'), ['はじめまして', '初めまして']),
  P('wakarimashita', 'わかりました', 'わかりました', 'Got it / I understand', 'Got it', m('わ|か|り|ま|し|た', 'LHHHLL'), ['わかりました', '分かりました', '解りました']),
  P('onegaishimasu', 'お願いします', 'お願いします', 'Please', 'Please', m('お|ね|が|い|し|ま|す', 'LHHHHHL'), ['おねがいします', 'お願いします']),
  P('daijoubu', '大丈夫', '大丈夫', "It's okay / I'm fine", "I'm fine", m('だ|い|じょ|う|ぶ', 'LHHLL'), ['だいじょうぶ', '大丈夫']),
  P('nihon', '日本', '日本', 'Japan', '🗾', m('に|ほ|ん', 'LHL'), ['にほん', 'にっぽん', '日本']),
  P('toukyou', '東京', '東京', 'Tokyo', '🗼', m('と|う|きょ|う', 'LHHH'), ['とうきょう', '東京']),
  P('sensei', '先生', '先生', 'teacher', '🧑‍🏫', m('せ|ん|せ|い', 'LHHL'), ['せんせい', '先生']),
  P('gakusei', '学生', '学生', 'student', '🧑‍🎓', m('が|く|せ|い', 'LHHH'), ['がくせい', '学生']),
  P('mizu', '水', '水', 'water', '💧', m('み|ず', 'LH'), ['みず', '水']),
  P('neko', '猫', '猫', 'cat', '🐱', m('ね|こ', 'HL'), ['ねこ', '猫']),
  P('inu', '犬', '犬', 'dog', '🐶', m('い|ぬ', 'LH'), ['いぬ', '犬']),

  // Boss levels: same sounds, different pitch. The particle が shows where the pitch lands.
  P('hashi_chopsticks', '箸が', '箸が', 'chopsticks (+ が)', '🥢', m('は|し|が', 'HLL'), ['はし', '箸', '橋', '端'], true),
  P('hashi_bridge', '橋が', '橋が', 'bridge (+ が)', '🌉', m('は|し|が', 'LHL'), ['はし', '箸', '橋', '端'], true),
  P('ame_rain', '雨が', '雨が', 'rain (+ が)', '☔️', m('あ|め|が', 'HLL'), ['あめ', '雨', '飴'], true),
  P('ame_candy', '飴が', '飴が', 'candy (+ が)', '🍬', m('あ|め|が', 'LHH'), ['あめ', '雨', '飴'], true),
  P('hana_flower', '花が', '花が', 'flower (+ が)', '🌸', m('は|な|が', 'LHL'), ['はな', '花', '鼻'], true),
  P('hana_nose', '鼻が', '鼻が', 'nose (+ が)', '👃', m('は|な|が', 'LHH'), ['はな', '花', '鼻'], true),
];

export const PHRASE_BY_ID = Object.fromEntries(PHRASES.map((p) => [p.id, p]));

// ---------- Story (StoryData.swift) ----------

export const CAST = {
  narrator: { name: 'Narrator', jpName: 'ナレーター', color: 'var(--dim)', voice: 0 },
  ren: { name: 'Ren', jpName: 'レン', color: 'var(--accent)', voice: 1 },
  master: { name: 'Master', jpName: '師匠', color: 'var(--good)', voice: 2 },
  kaito: { name: 'Kaito', jpName: 'カイト', color: 'var(--trace)', voice: 3 },
};

const W = (jp, reading, en) => ({ jp, reading, en, gardenID: 'w:' + jp });
const B = (speaker, jp, reading, en, extra = {}) => ({ speaker, jp, reading, en, words: [], note: null, choice: null, ...extra });
const C = (prompt, options, answer, wrongReply) => ({ prompt, options, answer, wrongReply });
const { narrator, ren, master, kaito } = CAST;

/** An original shōnen story, written to N5 level: each line adds about one new word. */
export const CHAPTERS = [
  { id: 'ch1', number: 1, title: 'はじまり', en: 'The Beginning', beats: [
    B(narrator, 'ここは 小さい 町です。', 'ここは ちいさい まちです。', 'This is a small town.',
      { words: [W('小さい', 'ちいさい', 'small'), W('町', 'まち', 'town')] }),
    B(ren, 'おれは レン！', 'おれは れん！', "I'm Ren!",
      { words: [W('おれ', 'おれ', 'I, me (rough, boyish)')],
        note: 'おれ is a rough, confident way for guys to say "I". Shōnen heroes almost always use it. In polite settings, use わたし.' }),
    B(ren, '強く なりたい！', 'つよく なりたい！', 'I want to get stronger!',
      { words: [W('強い', 'つよい', 'strong')],
        note: '〜たい means "want to". なる (become) → なりたい (want to become).' }),
    B(master, 'きみは だれ？', 'きみは だれ？', 'Who are you?',
      { words: [W('だれ', 'だれ', 'who')] }),
    B(ren, 'レンです。よろしく おねがいします！', 'れんです。よろしく おねがいします！', "I'm Ren. Nice to meet you, please teach me!",
      { words: [W('よろしくおねがいします', 'よろしくおねがいします', 'please treat me well / nice to meet you')],
        choice: C('師匠: 「なぜ ここに 来た？」 (Why did you come here?)',
          ['強く なりたいです！', 'ラーメンが すきです。', 'さようなら。'], 0,
          '師匠: 「…え？ ちがう！もう一度。」 (…Huh? Wrong! Again.)') }),
    B(master, 'いい 目だ。', 'いい めだ。', 'You have good eyes.',
      { words: [W('目', 'め', 'eye')],
        note: 'だ is the casual version of です. Tough characters use it constantly.' }),
    B(master, '明日から 修行だ！', 'あしたから しゅぎょうだ！', 'Training starts tomorrow!',
      { words: [W('明日', 'あした', 'tomorrow'), W('修行', 'しゅぎょう', 'training (martial, spiritual)')] }),
    B(ren, 'はい、師匠！', 'はい、ししょう！', 'Yes, Master!',
      { words: [W('師匠', 'ししょう', 'master, mentor')] }),
  ] },
  { id: 'ch2', number: 2, title: 'ライバル', en: 'The Rival', beats: [
    B(narrator, 'つぎの 日。あさです。', 'つぎの ひ。あさです。', "The next day. It's morning.",
      { words: [W('つぎ', 'つぎ', 'next'), W('あさ', 'あさ', 'morning')] }),
    B(kaito, 'おまえ、だれだ？', 'おまえ、だれだ？', 'Hey, you. Who are you?',
      { words: [W('おまえ', 'おまえ', 'you (rough)')],
        note: 'おまえ is a rough "you". Fine between rivals in anime, rude in real life.' }),
    B(ren, 'おれは レンだ。きみは？', 'おれは れんだ。きみは？', "I'm Ren. And you?"),
    B(kaito, 'カイトだ。おれは この 町で いちばん 強い。', 'かいとだ。おれは この まちで いちばん つよい。', "I'm Kaito. I'm the strongest in this town.",
      { words: [W('いちばん', 'いちばん', 'number one, the most')] }),
    B(ren, 'ほんとう？', 'ほんとう？', 'Really?',
      { words: [W('ほんとう', 'ほんとう', 'true, really')] }),
    B(kaito, 'しょうぶだ！', 'しょうぶだ！', "Let's settle this!",
      { words: [W('しょうぶ', 'しょうぶ', 'match, showdown')],
        choice: C('What does Kaito want?', ['A fight', 'Lunch', 'Directions to the station'], 0,
          'カイト: 「ちがう！しょうぶだ！」 (No! A showdown!)') }),
    B(narrator, 'レンは まけました。', 'れんは まけました。', 'Ren lost.',
      { words: [W('まける', 'まける', 'to lose')] }),
    B(kaito, 'まだまだだな。', 'まだまだだな。', "You've got a long way to go.",
      { words: [W('まだまだ', 'まだまだ', 'not yet, still a long way')],
        note: 'な at the end adds a musing, tough-guy feel: "…huh."' }),
    B(ren, 'つぎは まけない！', 'つぎは まけない！', "Next time I won't lose!",
      { note: 'まける (lose) → まけない (won\'t lose). The ない form makes verbs negative.' }),
  ] },
  { id: 'ch3', number: 3, title: '修行', en: 'Training', beats: [
    B(master, '毎日、はしれ！', 'まいにち、はしれ！', 'Run every day!',
      { words: [W('毎日', 'まいにち', 'every day'), W('はしる', 'はしる', 'to run')],
        note: 'はしれ is a blunt command form of はしる. Masters and drill sergeants love it.' }),
    B(ren, '毎日ですか？', 'まいにちですか？', 'Every day?'),
    B(master, 'そうだ。毎日 すこしずつ。', 'そうだ。まいにち すこしずつ。', "That's right. A little at a time, every day.",
      { words: [W('すこしずつ', 'すこしずつ', 'little by little')] }),
    B(narrator, 'レンは 毎日 はしりました。', 'れんは まいにち はしりました。', 'Ren ran every day.'),
    B(ren, 'つかれた…', 'つかれた…', "I'm exhausted…",
      { words: [W('つかれる', 'つかれる', 'to get tired')] }),
    B(master, '休む ことも 修行だ。', 'やすむ ことも しゅぎょうだ。', 'Resting is part of training too.',
      { words: [W('休む', 'やすむ', 'to rest')],
        choice: C('What did the master say about resting?',
          ['Resting is part of training', 'Never rest', 'Rest is for the weak'], 0,
          '師匠: 「ちがう。休む ことも 修行だ。」 (No. Resting is training too.)') }),
    B(narrator, 'そして、一か月後…', 'そして、いっかげつご…', 'And then, one month later…',
      { words: [W('一か月', 'いっかげつ', 'one month')] }),
    B(ren, 'カイト！もう一度 しょうぶだ！', 'かいと！もういちど しょうぶだ！', 'Kaito! One more showdown!',
      { words: [W('もう一度', 'もういちど', 'once more')] }),
  ] },
  { id: 'ch4', number: 4, title: 'さいごの しょうぶ', en: 'The Final Showdown', beats: [
    B(kaito, '来たな、レン。', 'きたな、れん。', 'So you came, Ren.',
      { words: [W('来る', 'くる', 'to come')] }),
    B(ren, '今日は まけない！', 'きょうは まけない！', "Today I won't lose!",
      { words: [W('今日', 'きょう', 'today')] }),
    B(narrator, '二人は たたかいました。', 'ふたりは たたかいました。', 'The two of them fought.',
      { words: [W('二人', 'ふたり', 'two people'), W('たたかう', 'たたかう', 'to fight')] }),
    B(kaito, 'なに！？ はやい！', 'なに！？ はやい！', 'What!? So fast!',
      { words: [W('はやい', 'はやい', 'fast')] }),
    B(narrator, 'レンが かちました！', 'れんが かちました！', 'Ren won!',
      { words: [W('かつ', 'かつ', 'to win')],
        choice: C('だれが かちましたか？ (Who won?)', ['レン', 'カイト', '師匠'], 0, 'レン: 「おれだよ！」 (It was me!)') }),
    B(kaito, '…強く なったな。', '…つよく なったな。', "…You've gotten stronger."),
    B(ren, 'ありがとう。でも、まだまだだ。', 'ありがとう。でも、まだまだだ。', "Thanks. But I've still got a long way to go.",
      { words: [W('でも', 'でも', 'but')] }),
    B(master, 'いい ライバルだな。', 'いい らいばるだな。', 'You two are good rivals.',
      { words: [W('ライバル', 'らいばる', 'rival')] }),
  ] },
];

export const STORY_WORDS = (() => {
  const seen = new Set();
  return CHAPTERS.flatMap((c) => c.beats.flatMap((b) => b.words)).filter((w) => !seen.has(w.jp) && seen.add(w.jp));
})();

// ---------- Particle Train (ParticleTrainView.swift) ----------

export const TRAIN_PALETTE = ['は', 'が', 'を', 'に', 'で', 'へ', 'と', 'の', 'も'];

const WHY = {
  topic: 'は marks the topic: what the sentence is about. "As for Ren…"',
  object: 'を marks the thing an action is done to: eat WHAT, drink WHAT.',
  place: 'で marks where an action happens: run IN town.',
  goal: "に (or へ) marks where you're headed: go TO the dojo.",
  with: 'と means "with" (or "and" between nouns).',
  possessive: "の links nouns like 's: Ren's book.",
  also: 'も means "also" and replaces は or が.',
  newSubject: "が marks who does it when that's the new or key information, and after question words like だれ.",
  time: 'に marks a specific time: AT 7 o\'clock.',
};
const G = (correct, why) => ({ correct, why });

export const TRAINS = [
  { cars: ['レン', 'ラーメン', 'たべます'], gaps: [G(['は'], WHY.topic), G(['を'], WHY.object)], en: 'Ren eats ramen.' },
  { cars: ['わたし', '学生です'], gaps: [G(['は'], WHY.topic)], en: 'I am a student.' },
  { cars: ['毎日', '町', 'はしります'], gaps: [null, G(['で'], WHY.place)], en: 'I run in town every day.' },
  { cars: ['道場', 'いきます'], gaps: [G(['に', 'へ'], WHY.goal)], en: 'I go to the dojo.' },
  { cars: ['師匠', 'はなします'], gaps: [G(['と'], WHY.with)], en: 'I talk with the master.' },
  { cars: ['これ', 'レン', '本です'], gaps: [G(['は'], WHY.topic), G(['の'], WHY.possessive)], en: "This is Ren's book." },
  { cars: ['カイト', '強いです'], gaps: [G(['も'], WHY.also)], en: 'Kaito is strong too.' },
  { cars: ['水', 'のみます'], gaps: [G(['を'], WHY.object)], en: 'I drink water.' },
  { cars: ['七時', 'おきます'], gaps: [G(['に'], WHY.time)], en: 'I get up at 7.' },
  { cars: ['だれ', 'かちましたか'], gaps: [G(['が'], WHY.newSubject)], en: 'Who won?' },
  { cars: ['レン', 'カイト', 'しょうぶします'],
    gaps: [G(['と'], WHY.with), G(['は', 'が'], 'Tricky one: the topic usually takes は, but が also works when stressing who.')],
    en: 'Ren and Kaito have a showdown.' },
  { cars: ['日本', 'ともだち', 'あいます'],
    gaps: [G(['で'], WHY.place), G(['に', 'と'], 'あう (meet) takes に (or と, "meet with") for the person you meet.')],
    en: 'I meet a friend in Japan.' },
];

export function assembleTrain(t, filled) {
  let s = '';
  t.cars.forEach((car, i) => {
    s += car;
    if (i < t.gaps.length && t.gaps[i]) s += filled[i] || '';
  });
  return s;
}

// ---------- Kanji Forge (KanjiForgeView.swift) ----------

export const PART_NAMES = {
  '亻': 'person', '木': 'tree', '日': 'sun', '月': 'moon', '田': 'rice field', '力': 'power',
  '女': 'woman', '子': 'child', '本': 'origin', '門': 'gate', '耳': 'ear', '言': 'say',
  '舌': 'tongue', '山': 'mountain', '石': 'stone', '丁': 'block',
};

const K = (kanji, parts, meaning, story, word, reading, wordEn) => ({ kanji, parts, meaning, story, word, reading, wordEn, gardenID: 'k:' + kanji });

/** Ordered roughly from simplest and most useful to harder. Several appear in Story Mode. */
export const KANJI = [
  K('休', ['亻', '木'], 'rest', 'A person leaning against a tree takes a rest.', '休む', 'やすむ', 'to rest'),
  K('明', ['日', '月'], 'bright', 'Sun and moon together: as bright as it gets.', '明日', 'あした', 'tomorrow'),
  K('林', ['木', '木'], 'grove', 'Two trees make a small grove.', '林', 'はやし', 'grove, woods'),
  K('森', ['木', '木', '木'], 'forest', 'Three trees make a whole forest.', '森', 'もり', 'forest'),
  K('男', ['田', '力'], 'man', 'Power in the rice field: the old picture of a working man.', '男', 'おとこ', 'man'),
  K('好', ['女', '子'], 'like', 'A woman holding her child: someone she loves.', '好き', 'すき', 'to like'),
  K('町', ['田', '丁'], 'town', 'Fields divided into blocks become a town.', '町', 'まち', 'town'),
  K('体', ['亻', '本'], 'body', "A person's origin is their body.", '体', 'からだ', 'body'),
  K('岩', ['山', '石'], 'boulder', 'A mountain-sized stone is a boulder.', '岩', 'いわ', 'rock, boulder'),
  K('間', ['門', '日'], 'interval', 'Sunlight through the gap in a gate: the space between.', '時間', 'じかん', 'time'),
  K('聞', ['門', '耳'], 'hear', 'An ear pressed to the gate to hear.', '聞く', 'きく', 'to listen, to hear'),
  K('話', ['言', '舌'], 'talk', 'Words plus a tongue: talking.', '話す', 'はなす', 'to speak'),
];

// ---------- Shopkeeper (ShopkeeperView.swift) ----------

export const COUNTERS = {
  tsu: {
    symbol: 'つ',
    explanation: '〜つ is the all-purpose counter for small things (1–9).',
    say: ['ひとつ', 'ふたつ', 'みっつ', 'よっつ', 'いつつ'],
  },
  hon: {
    symbol: '本',
    explanation: '〜本 (ほん/ぼん/ぽん) counts long, thin things: bottles, skewers, pens.',
    say: ['いっぽん', 'にほん', 'さんぼん', 'よんほん', 'ごほん'],
  },
  mai: {
    symbol: '枚',
    explanation: '〜枚 (まい) counts flat things: tickets, crackers, shirts.',
    say: ['いちまい', 'にまい', 'さんまい', 'よんまい', 'ごまい'],
  },
};

export const SHOP_STOCK = [
  { emoji: '🍎', name: 'りんご', en: 'apple', counter: 'tsu' },
  { emoji: '🍙', name: 'おにぎり', en: 'rice ball', counter: 'tsu' },
  { emoji: '🥤', name: 'ジュース', en: 'juice', counter: 'hon' },
  { emoji: '🍡', name: 'だんご', en: 'dango skewer', counter: 'hon' },
  { emoji: '🎫', name: 'チケット', en: 'ticket', counter: 'mai' },
  { emoji: '🍘', name: 'せんべい', en: 'rice cracker', counter: 'mai' },
];

export const CUSTOMERS = {
  kid: {
    emoji: '🧒', label: 'A kid', voice: 5,
    order: (item, count) => `${item.name}、${count} ちょうだい！`,
    styleNote: 'ちょうだい is a casual, kid-like "gimme".',
  },
  worker: {
    emoji: '🧑‍💼', label: 'An office worker', voice: 3,
    order: (item, count) => `${item.name}を ${count} ください。`,
    styleNote: '〜を ください is the standard polite "please give me".',
  },
  elder: {
    emoji: '👵', label: 'An older customer', voice: 4,
    order: (item, count) => `${item.name}を ${count} いただけますか。`,
    styleNote: '〜を いただけますか is extra polite: "might I receive…?"',
  },
};

export const SHOP_GREETINGS = ['いらっしゃいませ！', 'おかえりなさい！', 'いただきます！'];
export const SHOP_THANKS = ['ありがとうございました！', 'じゃあね！', 'どういたしまして。'];

// ---------- Garden catalog (GardenView.swift) ----------

/** Every item the app knows how to show, keyed by its progress id. */
// ---------- N5 vocabulary deck (generated js/n5.js, source tools/n5.tsv) ----------

/** Split kana into morae (small ゃゅょ etc. join the kana before them). */
export function toMorae(kana) {
  return kana.match(/.[ゃゅょぁぃぅぇぉゎャュョァィゥェォヮ]?/g) || [];
}

/** Morae with high/low pitch for a Tokyo-accent downstep number (0 = flat), as the word sounds said alone. */
export function accentMorae(kana, accent) {
  return toMorae(kana).map((k, i) => ({
    kana: k,
    high: accent === 1 ? i === 0 : i > 0 && (accent === 0 || i < accent),
    silent: k === 'っ' || k === 'ッ',
  }));
}

export function accentName(accent, n) {
  if (accent === 0) return 'flat (heiban): low, then stays high, even on a following particle';
  if (accent === 1) return 'high first, then drops (atamadaka)';
  if (accent >= n) return 'high to the end, then drops on a following particle (odaka)';
  return `drops after the ${['', 'first', 'second', 'third', 'fourth', 'fifth', 'sixth'][accent] || accent + 'th'} mora (nakadaka)`;
}

const n5Seen = new Set();
export const N5_WORDS = N5.map(([jp, kana, en, accent, ex, exReading, exEn, say]) => {
  // A few words share a written form (十 is both じゅう and とお): those get the reading in their id and clip.
  const dup = n5Seen.has(jp);
  n5Seen.add(jp);
  return { id: 'n5:' + jp + (dup ? '|' + kana : ''), jp, reading: kana, en, accent, ex, exReading, exEn, say: say || (dup ? kana : jp) };
});

export const GARDEN_CATALOG = (() => {
  const out = {};
  for (const p of PHRASES) out[p.id] = { id: p.id, jp: p.display, reading: p.kana, en: p.meaning };
  for (const w of STORY_WORDS) out[w.gardenID] = { id: w.gardenID, jp: w.jp, reading: w.reading, en: w.en };
  for (const r of KANJI) out[r.gardenID] = { id: r.gardenID, jp: r.word, reading: r.reading, en: r.wordEn };
  for (const w of N5_WORDS) out[w.id] = { ...w, deck: 'n5' };
  return out;
})();

export function gardenStage(level) {
  if (level <= 0) return '🌱';
  if (level === 1) return '🌿';
  if (level <= 3) return '🪴';
  if (level <= 5) return '🌳';
  return '🌸';
}

// ---------- Mode list (App.swift) ----------

export const MODES = [
  { id: 'dojo', title: 'Reading Dojo', jp: '読み道場', group: 'Read', icon: '🔤', mic: false,
    body: 'Start here if you can\'t read Japanese yet: hiragana, then katakana, then your first kanji, a few at a time.' },
  { id: 'garden', title: 'Garden', jp: '庭', group: 'Review', icon: '🌱', mic: false,
    body: "Every word you learn becomes a plant. Water the thirsty ones by remembering them. Nothing dies if you're away." },
  { id: 'story', title: 'Story', jp: '物語', group: 'Understand', icon: '📖', mic: false,
    body: 'Kotoba Dojo: an original shōnen story at your level. Each line adds about one new word, with notes on anime speech.' },
  { id: 'particle', title: 'Particle Train', jp: '助詞列車', group: 'Understand', icon: '🚃', mic: false,
    body: 'Couple word cars with the right particle. A wrong one derails the train and tells you why.' },
  { id: 'forge', title: 'Kanji Forge', jp: '漢字鍛冶', group: 'Understand', icon: '🔨', mic: false,
    body: 'Combine parts like 亻 + 木 into kanji, and each one unlocks a real word.' },
  { id: 'rhythm', title: 'Rhythm', jp: 'リズム', group: 'Speak & listen', icon: '〰️', mic: true,
    body: 'Say each mora as the line sweeps by. Follow the pink pitch melody. It speeds up and hides the lyrics as you improve.' },
  { id: 'duel', title: 'Pitch Duel', jp: 'ピッチ対決', group: 'Speak & listen', icon: '👂', mic: false,
    body: 'Hear a word in a different voice each time and pick the melody: 箸 or 橋? 雨 or 飴?' },
  { id: 'slice', title: 'Speak Slice', jp: 'スピーク斬り', group: 'Speak & listen', icon: '⚔️', mic: true,
    body: 'Objects fly up. Say the Japanese word out loud to cut them. Recall under pressure, with no lives to lose.' },
  { id: 'shop', title: 'Shopkeeper', jp: 'お店', group: 'Speak & listen', icon: '🛒', mic: false,
    body: 'Customers order out loud. Count it out with the right counter and answer like a real shop.' },
];
export const MODE_BY_ID = Object.fromEntries(MODES.map((x) => [x.id, x]));
