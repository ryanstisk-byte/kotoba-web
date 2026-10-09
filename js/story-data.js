// Kotoba Dojo, chapters 5-12 (the tournament and final arcs), the arc list and the comprehension questions.
// Original writing in shōnen style. Chapters 5-8 stay at N5 (words met so far plus about one new word a line);
// chapters 9-12 move toward N4 and bring in casual and anime speech (おれ, ぜ, ねえ, じゃねえ), each explained in a note.
// data.js passes its CAST in (this file imports nothing, so there is no import cycle) and re-exports everything
// as part of CHAPTERS. Every beat has an explicit hiragana reading; every new kanji run is also in js/readings.js.

/** The three arcs of the saga, for the chapter map. */
export const ARCS = [
  { id: 'dojo', title: '道場編', en: 'Dojo Arc', level: 'N5', chapters: ['ch1', 'ch2', 'ch3', 'ch4'] },
  { id: 'tournament', title: '大会編', en: 'Tournament Arc', level: 'N5', chapters: ['ch5', 'ch6', 'ch7', 'ch8'] },
  { id: 'final', title: '決勝編', en: 'Final Arc', level: 'Toward N4 · casual speech', chapters: ['ch9', 'ch10', 'ch11', 'ch12'] },
];

/** The shop customers from Shopkeeper mode join the story, each with the voice they already use there. */
export const SAGA_CAST = {
  sora: { name: 'Sora (a kid)', jpName: 'ソラ', color: 'var(--electric)', voice: 5 },
  tanaka: { name: 'Mr. Tanaka (office worker)', jpName: '田中さん', color: 'var(--miss)', voice: 3 },
  kiku: { name: 'Granny Kiku', jpName: 'キクさん', color: 'var(--good)', voice: 4 },
};

/**
 * Story words written in kana whose N5 deck entry is written with kanji: they share the deck's Garden card.
 * (Words written the same way as a deck word match automatically.)
 */
const N5_ALIAS = {
  'いる': '要る', 'はたらく': '働く', 'となり': '隣', 'まつ': '待つ', 'ことば': '言葉', 'おおい': '多い',
  'れんしゅう': '練習', 'はなし': '話', 'わすれる': '忘れる', 'たのしい': '楽しい', 'いってきます': '行ってきます',
  'いく': '行く', 'かるい': '軽い', 'かお': '顔',
};

/**
 * Chapters 5-12. `cast` is data.js's CAST (which includes SAGA_CAST); `n5` is the raw N5 deck (js/n5.js).
 * A story word that is also in the N5 deck reuses the deck's Garden id ('n5:…'), so it never becomes a second plant.
 */
export function sagaChapters(cast, n5 = []) {
  const deck = new Map();
  for (const [jp, kana] of n5) deck.set(jp, deck.has(jp) ? deck.get(jp) : 'n5:' + jp);   // same ids as data.js N5_WORDS
  const W = (jp, reading, en) => ({ jp, reading, en, gardenID: deck.get(jp) || deck.get(N5_ALIAS[jp]) || 'w:' + jp });
  const B = (speaker, jp, reading, en, extra = {}) => ({ speaker, jp, reading, en, words: [], note: null, choice: null, ...extra });
  const C = (prompt, options, answer, wrongReply) => ({ prompt, options, answer, wrongReply });
  const { narrator, ren, master, kaito, sora, tanaka, kiku } = cast;

  return [
    // ---------------- Tournament arc (N5) ----------------
    { id: 'ch5', number: 5, title: '大会の おしらせ', en: 'The Tournament Notice', beats: [
      B(narrator, 'ある 日、町に ポスターが ありました。', 'ある ひ、まちに ぽすたーが ありました。', 'One day, there was a poster in town.',
        { words: [W('ポスター', 'ぽすたー', 'poster')] }),
      B(kaito, '大会だ！ 強い 人が たくさん 来るぞ。', 'たいかいだ！ つよい ひとが たくさん くるぞ。', "A tournament! Lots of strong people are coming.",
        { words: [W('大会', 'たいかい', 'tournament, competition'), W('たくさん', 'たくさん', 'a lot, many')],
          note: 'ぞ at the end is a rough, punchy "I\'m telling you!". Tough guys in anime use it a lot; it sounds pushy in everyday talk.' }),
      B(ren, 'おれも 出たい！', 'おれも でたい！', 'I want to enter too!',
        { words: [W('出る', 'でる', 'to go out; to enter (a contest)')],
          note: 'も means "too": おれも = "me too". 出る (go out) → 出たい (want to enter), the same 〜たい as 強く なりたい.' }),
      B(narrator, 'でも、大会には お金が いります。', 'でも、たいかいには おかねが いります。', 'But the tournament costs money.',
        { words: [W('お金', 'おかね', 'money'), W('いる', 'いる', 'to need (要る)')] }),
      B(ren, 'おれ、お金が ない…', 'おれ、おかねが ない…', "I don't have any money…",
        { words: [W('ない', 'ない', "there isn't; don't have")],
          note: 'ない is the casual "there isn\'t / don\'t have", the opposite of ある. Politely: おかねが ありません.' }),
      B(master, 'それなら、はたらけ。', 'それなら、はたらけ。', 'Then work.',
        { words: [W('はたらく', 'はたらく', 'to work')],
          note: 'はたらけ is the blunt command form of はたらく, like はしれ in chapter 3. それなら = "in that case".' }),
      B(master, 'となりの 店が 人を さがして いる。', 'となりの みせが ひとを さがして いる。', 'The shop next door is looking for help.',
        { words: [W('となり', 'となり', 'next door, next to'), W('さがす', 'さがす', 'to look for')],
          note: '〜て いる is "-ing": さがす (look for) → さがして いる (is looking for).' }),
      B(ren, 'はい！ がんばります！', 'はい！ がんばります！', "Yes! I'll do my best!",
        { words: [W('がんばる', 'がんばる', 'to do your best, hang in there')],
          choice: C('師匠: 「レン、なにを する？」 (Ren, what will you do?)',
            ['店で はたらきます！', 'ねます。', 'お金は いりません。'], 0,
            '師匠: 「お金が いるぞ。もう一度。」 (You need money. Again.)') }),
      B(kaito, '大会で まって いるぞ、レン。', 'たいかいで まって いるぞ、れん。', "I'll be waiting at the tournament, Ren.",
        { words: [W('まつ', 'まつ', 'to wait')] }),
    ] },

    { id: 'ch6', number: 6, title: '店の しごと', en: 'Working the Shop', beats: [
      B(narrator, 'つぎの 日から、レンは だんごの 店で はたらきました。', 'つぎの ひから、れんは だんごの みせで はたらきました。', 'From the next day, Ren worked at a dango shop.',
        { words: [W('だんご', 'だんご', 'dango (rice dumplings on a skewer)')] }),
      B(sora, 'だんご、二本 ちょうだい！', 'だんご、にほん ちょうだい！', 'Two dango, gimme!',
        { words: [W('ちょうだい', 'ちょうだい', 'gimme (casual, kid-like)')],
          note: 'ちょうだい is a casual, kid-like "gimme". 本 counts long, thin things like skewers: 二本 (にほん) = two of them.' }),
      B(ren, 'ほら。おれの だんごは うまいぞ！', 'ほら。おれの だんごは うまいぞ！', 'Here. My dango are tasty!',
        { words: [W('うまい', 'うまい', 'tasty (rough, casual)')],
          note: 'うまい is a rough, casual "tasty". The everyday polite word is おいしい. ほら = "here you go / look".' }),
      B(tanaka, 'すみません。だんごを 三本 ください。', 'すみません。だんごを さんぼん ください。', 'Excuse me. Three dango, please.',
        { words: [W('ください', 'ください', 'please give me')],
          note: '〜を ください is the standard polite "please give me". Listen: 三本 is さんぼん, because 本 changes its sound after 三.' }),
      B(ren, 'おう、三本だな！', 'おう、さんぼんだな！', 'Yeah, three, got it!',
        { words: [W('おう', 'おう', 'yeah (a rough "yes")')] }),
      B(kiku, 'あらあら。お店では ていねいに 話しましょうね。', 'あらあら。おみせでは ていねいに はなしましょうね。', "Oh my. In a shop, let's speak politely.",
        { words: [W('ていねい', 'ていねい', 'polite, careful')],
          note: '〜ましょう means "let\'s": 話す (speak) → 話しましょう. あらあら is a gentle "oh my", the kind of thing a grandmother says.' }),
      B(ren, 'い、いらっしゃいませ！ だんご 三本ですね！', 'い、いらっしゃいませ！ だんご さんぼんですね！', 'W-welcome! Three dango, right!',
        { words: [W('いらっしゃいませ', 'いらっしゃいませ', 'welcome (said to customers)')],
          note: 'Same order, new words: おう、三本だな！ is rough; 三本ですね！ is polite. ですね checks politely: "…, right?"' }),
      B(master, 'ことばも 力だ、レン。', 'ことばも ちからだ、れん。', 'Words are strength too, Ren.',
        { words: [W('ことば', 'ことば', 'words, language'), W('力', 'ちから', 'power, strength')],
          note: 'This is the dojo\'s name: 言葉 (ことば) means "words". Choosing the right words is a kind of strength.',
          choice: C('キクさん: 「お客さんが 来ました。なんと いいますか？」 (A customer came in. What do you say?)',
            ['いらっしゃいませ！', 'おまえ、だれだ？', 'しょうぶだ！'], 0,
            'キクさん: 「あらあら、ちがいますよ。」 (Oh my, that\'s not it.)') }),
      B(narrator, 'レンは 一か月 はたらきました。お金が たまりました！', 'れんは いっかげつ はたらきました。おかねが たまりました！', 'Ren worked for a month. He saved up the money!',
        { words: [W('たまる', 'たまる', 'to pile up, be saved up')] }),
    ] },

    { id: 'ch7', number: 7, title: '一回戦', en: 'Round One', beats: [
      B(narrator, '大会の 日が 来ました。ここは 東京です。', 'たいかいの ひが きました。ここは とうきょうです。', 'Tournament day came. This is Tokyo.',
        { note: '来ました (きました) is the polite past of 来る: "came". 東京 is Tokyo.' }),
      B(ren, '人が おおい…ちょっと こわい。', 'ひとが おおい…ちょっと こわい。', "So many people… I'm a little scared.",
        { words: [W('おおい', 'おおい', 'many, a lot'), W('こわい', 'こわい', 'scary, scared')] }),
      B(sora, 'レン！ がんばれー！', 'れん！ がんばれー！', 'Ren! Go for it!',
        { note: 'がんばれ is the command form of がんばる: the standard cheer, "go for it!". The long ー is Sora shouting.' }),
      B(narrator, 'しんぱんは 田中さんでした。', 'しんぱんは たなかさんでした。', 'The referee was Mr. Tanaka.',
        { words: [W('しんぱん', 'しんぱん', 'referee, judge')],
          note: 'でした is the past of です: "was".' }),
      B(tanaka, '一回戦、はじめ！', 'いっかいせん、はじめ！', 'Round one, begin!',
        { words: [W('一回戦', 'いっかいせん', 'first round (of a tournament)'), W('はじめ', 'はじめ', 'begin! (start signal)')] }),
      B(narrator, 'あいては 大きい 男です。', 'あいては おおきい おとこです。', 'His opponent is a big man.',
        { words: [W('あいて', 'あいて', 'opponent, the other person'), W('大きい', 'おおきい', 'big')] }),
      B(ren, '毎日 はしった。だいじょうぶだ！', 'まいにち はしった。だいじょうぶだ！', "I ran every day. I'm OK!",
        { note: 'はしった is the casual past of はしる: "ran". In casual speech the past ends in た or だ (polite: はしりました).' }),
      B(narrator, 'レンの かちです！', 'れんの かちです！', 'Ren wins!',
        { words: [W('かち', 'かち', 'a win, victory')],
          note: 'かつ (to win) → かち (a win). The noun form of many verbs ends in い-sound like this.',
          choice: C('しんぱんは だれ？ (Who is the referee?)', ['田中さん', 'ソラ', 'キクさん'], 0,
            '田中さん: 「わたしですよ！」 (It\'s me!)') }),
      B(kaito, 'おれも かったぞ。決勝で あおう。', 'おれも かったぞ。けっしょうで あおう。', "I won too. Let's meet in the final.",
        { words: [W('決勝', 'けっしょう', 'the final (match)')],
          note: 'あおう is the casual "let\'s" form of あう (to meet). Politely: あいましょう.' }),
    ] },

    { id: 'ch8', number: 8, title: 'キクさんの ひみつ', en: "Granny Kiku's Secret", beats: [
      B(narrator, 'その 夜、レンは れんしゅう して いました。', 'その よる、れんは れんしゅう して いました。', 'That night, Ren was practicing.',
        { words: [W('夜', 'よる', 'night'), W('れんしゅう', 'れんしゅう', 'practice')],
          note: '〜て いました is "was -ing": れんしゅう して いました = "was practicing".' }),
      B(kiku, 'こんばんは、レンくん。', 'こんばんは、れんくん。', 'Good evening, Ren.',
        { note: 'くん is a friendly name ending for boys and younger guys. さん is the safe, polite one for anyone.' }),
      B(ren, 'キクさん！ どうして ここに？', 'きくさん！ どうして ここに？', 'Granny Kiku! Why are you here?',
        { words: [W('どうして', 'どうして', 'why')] }),
      B(master, 'お久しぶりです、師匠。', 'おひさしぶりです、ししょう。', "It's been a long time, Master.",
        { words: [W('お久しぶり', 'おひさしぶり', "it's been a long time")] }),
      B(ren, 'えっ！？ 師匠の 師匠！？', 'えっ！？ ししょうの ししょう！？', "What!? The Master's master!?",
        { note: 'の links nouns: 師匠の 師匠 = "the master\'s master".' }),
      B(kiku, 'むかしの はなしですよ。', 'むかしの はなしですよ。', "That's an old story.",
        { words: [W('むかし', 'むかし', 'long ago'), W('はなし', 'はなし', 'story, talk')] }),
      B(kiku, '明日は 力を ぬいて くださいね。', 'あしたは ちからを ぬいて くださいね。', 'Tomorrow, please relax.',
        { words: [W('ぬく', 'ぬく', 'to pull out; 力を ぬく = to relax')],
          note: '〜て ください is a polite "please do". 力を ぬく is literally "take the strength out": relax your body.' }),
      B(ren, '力を…ぬく？', 'ちからを…ぬく？', 'Relax…?'),
      B(master, 'キク師匠の ことばだ。わすれるな。', 'きくししょうの ことばだ。わすれるな。', "Those are Master Kiku's words. Don't forget them.",
        { words: [W('わすれる', 'わすれる', 'to forget')],
          note: 'な after a plain verb is a blunt "don\'t!": わすれるな = "don\'t forget". It\'s harsh in daily life.',
          choice: C('キクさんは なんと いいましたか？ (What did Kiku say?)',
            ['力を ぬいて ください。', '毎日 はしって ください。', '店で はたらいて ください。'], 0,
            'キクさん: 「力を ぬいて、ですよ。」 (Relax, I said.)') }),
    ] },

    // ---------------- Final arc (toward N4: casual and anime speech) ----------------
    { id: 'ch9', number: 9, title: 'カイトの 本音', en: "Kaito's True Feelings", beats: [
      B(narrator, '決勝の 前の 夜。', 'けっしょうの まえの よる。', 'The night before the final.',
        { words: [W('前', 'まえ', 'before; in front')] }),
      B(kaito, 'よう、レン。ねむれねえのか？', 'よう、れん。ねむれねえのか？', "Yo, Ren. Can't sleep?",
        { words: [W('ねむる', 'ねむる', 'to sleep')],
          note: 'ねえ is rough speech for ない: ねむれない (can\'t sleep) → ねむれねえ. Anime tough guys do this constantly. Polite: ねむれませんか？ Never use ねえ with teachers, at work or with strangers.' }),
      B(ren, 'おまえこそ。', 'おまえこそ。', "Look who's talking.",
        { words: [W('こそ', 'こそ', '(emphasis) X, of all people')],
          note: 'こそ throws it back: おまえこそ = "you\'re the one who can\'t". Between rivals, おまえ is fine; to anyone else it\'s rude.' }),
      B(kaito, 'おれは ずっと 一人で 修行して きた。', 'おれは ずっと ひとりで しゅぎょうして きた。', "I've always trained alone.",
        { words: [W('ずっと', 'ずっと', 'all along, the whole time'), W('一人', 'ひとり', 'alone; one person')],
          note: '〜て きた = "have been doing (up to now)". Casual speech drops です and ます: きた instead of きました.' }),
      B(kaito, 'でも、おまえと たたかって、たのしかったぜ。', 'でも、おまえと たたかって、たのしかったぜ。', 'But fighting you was fun.',
        { words: [W('たのしい', 'たのしい', 'fun')],
          note: 'ぜ is a rough, cool ending used by guys: it adds swagger, like "…y\'know". Fine among friends; odd in polite talk. たのしい → たのしかった (was fun).' }),
      B(ren, 'へへっ、おれもだ。', 'へへっ、おれもだ。', 'Heh, me too.',
        { note: 'おれもだ = "me too" in casual speech. Politely you would say わたしも です.' }),
      B(kaito, '明日は 手かげん しねえぞ。', 'あしたは てかげん しねえぞ。', "Tomorrow I won't go easy on you.",
        { words: [W('手かげん', 'てかげん', 'holding back, going easy')],
          note: 'しねえ = しない (won\'t do) in rough speech, the same ない → ねえ change. ぞ turns it into a warning.' }),
      B(ren, 'あたりまえだ！ 本気で こい！', 'あたりまえだ！ ほんきで こい！', 'Of course! Come at me for real!',
        { words: [W('あたりまえ', 'あたりまえ', 'of course, natural'), W('本気', 'ほんき', 'serious, for real')],
          note: 'こい is the blunt command form of 来る (come). 本気で こい = "come at me with everything". Only for rivals and friends.',
          choice: C('カイト: 「明日は 手かげん しねえぞ。」 What does he mean?',
            ["He won't go easy on Ren", 'He will go easy on Ren', "He won't come tomorrow"], 0,
            'カイト: 「ちげえよ！ 本気だぜ。」 (Wrong! I\'m serious.)') }),
      B(narrator, '二人は わらいました。', 'ふたりは わらいました。', 'The two of them laughed.',
        { words: [W('わらう', 'わらう', 'to laugh, to smile')] }),
    ] },

    { id: 'ch10', number: 10, title: 'たのしんで おいで', en: 'Go Have Fun', beats: [
      B(narrator, '決勝の 朝。', 'けっしょうの あさ。', 'The morning of the final.'),
      B(ren, 'くそっ、手が ふるえてる…', 'くそっ、てが ふるえてる…', 'Dammit, my hands are shaking…',
        { words: [W('手', 'て', 'hand'), W('ふるえる', 'ふるえる', 'to shake, tremble')],
          note: 'ふるえてる is ふるえて いる with the い dropped. Casual speech does this all the time (みてる, しってる). くそっ is a mild curse, "dammit": fine in anime, rude in real life.' }),
      B(kiku, 'こわいのは、本気だからだよ。', 'こわいのは、ほんきだからだよ。', "You're scared because you're serious.",
        { words: [W('から', 'から', 'because')],
          note: '〜から means "because". だよ is a friendly, casual "you know". Older people often speak casually to younger ones.' }),
      B(ren, 'おれ…まけたくねえんだ。', 'おれ…まけたくねえんだ。', "I… I don't want to lose.",
        { note: 'まけたくない (don\'t want to lose) → まけたくねえ, the rough ない → ねえ again. んだ explains a feeling: "the thing is…". Polite: まけたくないんです.' }),
      B(kiku, 'かっても まけても、いいんだよ。', 'かっても まけても、いいんだよ。', "Win or lose, it's all right.",
        { note: '〜ても = "even if": かっても まけても = "whether you win or lose". いいんだよ = "it\'s fine, really".' }),
      B(kiku, 'たのしんで おいで。', 'たのしんで おいで。', 'Go and have fun.',
        { words: [W('たのしむ', 'たのしむ', 'to enjoy')],
          note: 'おいで is a warm, motherly "go on (and come back)". You hear it from parents and grandparents, not between friends.' }),
      B(master, 'レン。おまえは もう 強い。', 'れん。おまえは もう つよい。', 'Ren. You are already strong.',
        { words: [W('もう', 'もう', 'already')],
          note: 'In chapter 1 the Master said きみ. Now he says おまえ: from a teacher, it sounds close and fatherly, not rude.' }),
      B(ren, 'へへ…いって くるぜ！', 'へへ…いって くるぜ！', "Heh… I'm off!",
        { words: [W('いってきます', 'いってきます', "I'm off (said when leaving)")],
          note: 'いって くる = "go and come back", what you say when leaving. The polite, everyday version is いって きます. くるぜ adds Ren\'s swagger.',
          choice: C('キクさん: 「たのしんで おいで。」 What does she want Ren to do?',
            ['Enjoy the match', 'Win at any cost', 'Go home'], 0,
            'キクさん: 「たのしんで、だよ。」 (Have fun, I said.)') }),
    ] },

    { id: 'ch11', number: 11, title: '決勝', en: 'The Final', beats: [
      B(tanaka, '決勝、レン 対 カイト！ はじめ！', 'けっしょう、れん たい かいと！ はじめ！', 'The final: Ren versus Kaito! Begin!',
        { words: [W('対', 'たい', 'versus (vs.)')] }),
      B(kaito, 'いくぜ、レン！', 'いくぜ、れん！', 'Here I come, Ren!',
        { words: [W('いく', 'いく', 'to go; "here I come"')],
          note: 'いくぜ is a shōnen battle cry: "here I come!". いく (go) + ぜ (swagger).' }),
      B(ren, 'こいよ！', 'こいよ！', 'Bring it!',
        { note: 'こい (come!) + よ = "bring it on!". A classic rival line; never say it to someone you don\'t know.' }),
      B(narrator, 'カイトの パンチは 前より はやい！', 'かいとの ぱんちは まえより はやい！', "Kaito's punches are faster than before!",
        { words: [W('パンチ', 'ぱんち', 'punch'), W('より', 'より', 'than')],
          note: 'A より B = "B-er than A": 前より はやい = "faster than before".' }),
      B(kaito, 'どうした！ そんな もんじゃ ねえだろ！', 'どうした！ そんな もんじゃ ねえだろ！', "What's wrong! That's not all you've got!",
        { words: [W('じゃねえ', 'じゃねえ', "isn't (rough じゃない)")],
          note: 'じゃねえ is rough for じゃない ("isn\'t"). だろ (short for だろう) asks for agreement: "right?". もん is a casual もの (thing). Very rough: anime, sports, close friends only. Polite: そんな ものじゃ ないでしょう.' }),
      B(ren, '力を ぬいて…たのしむんだ。', 'ちからを ぬいて…たのしむんだ。', 'Relax… and enjoy it.',
        { note: 'Here んだ is Ren telling himself what to do: "I\'ve got to enjoy it." Kiku\'s two lessons, joined with 〜て.' }),
      B(narrator, 'レンの 体が かるく なった。', 'れんの からだが かるく なった。', "Ren's body felt light.",
        { words: [W('かるい', 'かるい', 'light (not heavy)')],
          note: 'かるい → かるく なる: an い-adjective + なる means "become ~", like 強く なりたい in chapter 1. なった is casual past.' }),
      B(ren, 'これが おれの 全力だ！', 'これが おれの ぜんりょくだ！', 'This is my full strength!',
        { words: [W('全力', 'ぜんりょく', 'full strength, all-out')],
          choice: C('What changed when Ren relaxed?', ['His body felt light', 'He got tired', 'He ran away'], 0,
            'レン: 「ちがう！ 体が かるく なったんだ！」 (No! My body got light!)') }),
      B(narrator, 'そして…しょうぶは きまった。', 'そして…しょうぶは きまった。', 'And then… the match was decided.',
        { words: [W('きまる', 'きまる', 'to be decided')] }),
    ] },

    { id: 'ch12', number: 12, title: 'あたらしい 道', en: 'A New Road', beats: [
      B(tanaka, 'しょうしゃ、レン！', 'しょうしゃ、れん！', 'The winner: Ren!',
        { words: [W('しょうしゃ', 'しょうしゃ', 'winner')] }),
      B(sora, 'やったー！ レン、すげえ！', 'やったー！ れん、すげえ！', 'Yay! Ren, that was awesome!',
        { words: [W('すごい', 'すごい', 'amazing')],
          note: 'すげえ is rough for すごい (amazing): kids and young guys say it constantly. Polite: すごいですね. やった = "I did it / yay!".' }),
      B(kaito, 'ちっ…まけたぜ。', 'ちっ…まけたぜ。', 'Tch… I lost.',
        { note: 'ちっ is a tongue click, "tch": anime frustration. Doing it at someone in real life is rude.' }),
      B(kaito, 'つぎは ぜったい かつからな！', 'つぎは ぜったい かつからな！', "Next time I'll win for sure!",
        { words: [W('ぜったい', 'ぜったい', 'definitely, absolutely')],
          note: '〜からな = "…just so you know!", a rough promise or warning. Politely: つぎは ぜったい かちます.' }),
      B(ren, 'おう！ いつでも こい！', 'おう！ いつでも こい！', 'Yeah! Come any time!',
        { words: [W('いつでも', 'いつでも', 'any time')] }),
      B(kiku, '二人とも、いい かおを してるね。', 'ふたりとも、いい かおを してるね。', 'You both look wonderful.',
        { words: [W('かお', 'かお', 'face')],
          note: 'いい かおを して いる = "have a good face": look happy and proud. してる is the casual して いる. 二人とも = "both of you".' }),
      B(master, '修行は まだまだ これからだぞ。', 'しゅぎょうは まだまだ これからだぞ。', 'Your training is only just beginning.',
        { words: [W('これから', 'これから', 'from now on')] }),
      B(sora, 'ねえ、おれも 道場に 入りたい！', 'ねえ、おれも どうじょうに はいりたい！', 'Hey, I want to join the dojo too!',
        { words: [W('入る', 'はいる', 'to enter, to join'), W('道場', 'どうじょう', 'dojo, training hall')],
          note: 'Sora says おれ now, copying Ren. Kids pick up anime speech fast! ねえ at the start is "hey" (not the rough ない).' }),
      B(ren, 'いいぜ！ ようこそ、言葉の 道場へ！', 'いいぜ！ ようこそ、ことばの どうじょうへ！', 'Sure! Welcome to the Kotoba Dojo!',
        { words: [W('ようこそ', 'ようこそ', 'welcome')],
          choice: C('だれが 道場に 入りたいですか？ (Who wants to join the dojo?)', ['ソラ', 'カイト', '田中さん'], 0,
            'ソラ: 「おれだよ！」 (Me!)') }),
    ] },
  ];
}

/**
 * Comprehension questions after each chapter: short multiple choice in English about the Japanese.
 * `line` is the beat it's about (its clip can be replayed), `skill` feeds store.grade, `why` shows after answering.
 * The right answer is listed first here; the app shuffles the options.
 */
const Q = (q, options, skill, why, line = null) => ({ q, options, answer: 0, skill, why, line });

export const QUIZZES = {
  ch1: [
    Q('Why did Ren come to the dojo?', ['To get stronger', 'To eat ramen', 'To find his dog'], 'listening', '強く なりたい！ = "I want to get stronger!"', 2),
    Q('When does training start?', ['Tomorrow (明日)', 'Today (今日)', 'Next month'], 'vocab', '明日から 修行だ！ = "Training starts tomorrow!"', 6),
    Q('What does 〜たい add to a verb?', ['"want to"', '"don\'t"', '"did"'], 'grammar', 'なる (become) → なりたい (want to become).'),
  ],
  ch2: [
    Q('Who won the first showdown?', ['Kaito', 'Ren', 'The Master'], 'listening', 'レンは まけました。 = "Ren lost."', 6),
    Q('What kind of word is おまえ?', ['A rough "you"', 'A polite "you"', 'A word for "I"'], 'vocab', 'おまえ is fine between anime rivals, rude in real life.', 1),
    Q('つぎは まけない！ What does まけない mean?', ['"won\'t lose"', '"lost"', '"want to lose"'], 'grammar', 'まける (lose) → まけない (won\'t lose).', 8),
  ],
  ch3: [
    Q('How often did the Master tell Ren to run?', ['Every day', 'Once a week', 'Only today'], 'listening', '毎日、はしれ！ = "Run every day!"', 0),
    Q('What does すこしずつ mean?', ['Little by little', 'All at once', 'Never'], 'vocab', '毎日 すこしずつ = "a little at a time, every day".', 2),
    Q('How much time passed before Ren challenged Kaito again?', ['One month', 'One day', 'One year'], 'listening', '一か月後 = "one month later".', 6),
  ],
  ch4: [
    Q('Why was Kaito shocked?', ['Ren was fast', 'Ren was late', 'Ren was tired'], 'listening', 'なに！？ はやい！ = "What!? So fast!"', 3),
    Q('What does the Master call the two of them?', ['Good rivals', 'Old friends', 'Bad students'], 'vocab', 'いい ライバルだな。 = "You\'re good rivals."', 7),
    Q('How do you read 今日?', ['きょう', 'あした', 'まいにち'], 'vocab', '今日 (きょう) = today. 明日 (あした) = tomorrow.', 1),
  ],
  ch5: [
    Q('Why can\'t Ren enter the tournament right away?', ['He has no money', 'He is hurt', 'Kaito said no'], 'listening', 'おれ、お金が ない… = "I don\'t have any money…"', 4),
    Q('What does the Master tell Ren to do?', ['Work', 'Run', 'Rest'], 'vocab', 'はたらけ is the blunt command form of はたらく (to work).', 5),
    Q('In さがして いる, what does 〜て いる add?', ['"-ing": is looking for', 'Past: looked for', '"want to": wants to look for'], 'grammar', '〜て いる is the "-ing" form.', 6),
  ],
  ch6: [
    Q('Sora orders だんご、二本 ちょうだい！ How many?', ['Two', 'Three', 'One'], 'vocab', '二本 (にほん) = two long things. 三本 (さんぼん) = three.', 1),
    Q('Who told Ren to speak politely?', ['Granny Kiku', 'Sora', 'Kaito'], 'listening', 'キクさん: お店では ていねいに 話しましょうね。', 5),
    Q('Which is the polite word for "tasty"?', ['おいしい', 'うまい', 'つよい'], 'vocab', 'うまい is rough and casual; おいしい is polite.', 2),
  ],
  ch7: [
    Q('How did Ren feel when he saw the crowd?', ['A little scared', 'Bored', 'Hungry'], 'listening', 'ちょっと こわい = "a little scared".', 1),
    Q('はしった is the casual past of はしる. What does it mean?', ['"ran"', '"will run"', '"run!"'], 'grammar', 'Casual past ends in た: はしる → はしった.', 6),
    Q('Where will Kaito and Ren meet?', ['In the final', 'At the shop', 'At the station'], 'listening', '決勝で あおう = "let\'s meet in the final".', 8),
  ],
  ch8: [
    Q('Who is Granny Kiku, really?', ['The Master\'s master', 'Kaito\'s grandmother', 'The referee'], 'listening', '師匠の 師匠 = "the Master\'s master".', 4),
    Q('What does わすれるな mean?', ['"Don\'t forget"', '"I forgot"', '"Let\'s forget"'], 'grammar', 'A plain verb + な is a blunt "don\'t!".', 8),
    Q('What does どうして mean?', ['Why', 'Where', 'Who'], 'vocab', 'どうして ここに？ = "Why are you here?"', 2),
  ],
  ch9: [
    Q('ねむれねえ is rough speech. What is the polite version?', ['ねむれません', 'ねむります', 'ねむりたいです'], 'grammar', 'ねえ = ない (rough). ねむれない → polite ねむれません.', 1),
    Q('How did Kaito feel about fighting Ren?', ['It was fun', 'It was boring', 'It was scary'], 'listening', 'たのしかったぜ = "it was fun".', 4),
    Q('When is it OK to end sentences with ぜ?', ['Joking with friends', 'Talking to your boss', 'In a job interview'], 'grammar', 'ぜ is rough and cool: friends and rivals only.'),
  ],
  ch10: [
    Q('ふるえてる is a short form of…', ['ふるえて いる', 'ふるえた', 'ふるえない'], 'grammar', 'Casual speech drops the い in 〜て いる.', 1),
    Q('Why is Ren scared, according to Kiku?', ['Because he is serious', 'Because Kaito is bigger', 'Because he is hungry'], 'listening', 'こわいのは、本気だからだよ。', 2),
    Q('What do you say politely when you leave home?', ['いって きます', 'いって くるぜ', 'いただきます'], 'grammar', 'いって くるぜ is Ren\'s rough version of いって きます.', 7),
  ],
  ch11: [
    Q('じゃねえ is rough speech. What is the standard form?', ['じゃない', 'です', 'でした'], 'grammar', 'ない → ねえ in rough speech: じゃない → じゃねえ.', 4),
    Q('What does 前より はやい mean?', ['Faster than before', 'Fast in front', 'Slower than before'], 'grammar', 'A より B = "B-er than A".', 3),
    Q('What did Ren tell himself to do?', ['Relax and enjoy it', 'Give up', 'Hit harder'], 'listening', '力を ぬいて…たのしむんだ。', 5),
  ],
  ch12: [
    Q('What does Kaito promise?', ['To win next time', 'To quit fighting', 'To work at the shop'], 'listening', 'つぎは ぜったい かつからな！', 3),
    Q('すげえ is a rough way to say…', ['すごい (amazing)', 'すき (like)', 'すこし (a little)'], 'vocab', 'ごい → げえ is the same rough sound change as ない → ねえ.', 1),
    Q('What does the Master say about Ren\'s training?', ['It\'s only just beginning', 'It\'s finished', 'It\'s too hard'], 'listening', 'まだまだ これからだ = "only just beginning".', 6),
  ],
};
