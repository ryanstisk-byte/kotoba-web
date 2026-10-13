// Mock JLPT N4: vocabulary (paraphrase and usage), text grammar and reading content.
// All original writing for this app (not taken from official samples, past tests, textbooks or other apps).
// Right answer is always options[0]; the app shuffles. Only N5 and N4 kanji, everything else in kana.

export const N4_PARAPHRASE = [
  {
    id: 'n4para1',
    sentence: { before: 'きのう 田中さんの 家へ 行きましたが、田中さんは ', mark: 'るすでした', after: '。' },
    options: [
      'きのう 田中さんの 家へ 行きましたが、田中さんは 家に いませんでした。',
      'きのう 田中さんの 家へ 行きましたが、田中さんは ねて いました。',
      'きのう 田中さんの 家へ 行きましたが、田中さんは いそがしかったです。',
      'きのう 田中さんの 家へ 行きましたが、田中さんは 病気でした。',
    ],
    why: 'るす means nobody is at home.',
  },
  {
    id: 'n4para2',
    sentence: { before: 'レンは ししょうに ', mark: 'あやまりました', after: '。' },
    options: [
      'レンは ししょうに 「すみませんでした」と 言いました。',
      'レンは ししょうに 「ありがとうございました」と 言いました。',
      'レンは ししょうに 「おねがいします」と 言いました。',
      'レンは ししょうに 「おめでとうございます」と 言いました。',
    ],
    why: 'あやまる means to apologize: to say "I\'m sorry."',
  },
  {
    id: 'n4para3',
    sentence: { before: 'この 自転車は ', mark: 'こしょうして います', after: '。' },
    options: [
      'この 自転車は こわれて います。',
      'この 自転車は よごれて います。',
      'この 自転車は とても 新しいです。',
      'この 自転車は とても 高いです。',
    ],
    why: 'こしょうする means to break down, the same as こわれる.',
  },
  {
    id: 'n4para4',
    sentence: { before: 'きのう ならった ことを ', mark: 'ふくしゅうしました', after: '。' },
    options: [
      'きのう ならった ことを もう 一度 勉強しました。',
      'きのう ならった ことを 友だちに 教えました。',
      'きのう ならった ことを ぜんぶ わすれました。',
      'きのう ならった ことを 先生に 聞きました。',
    ],
    why: 'ふくしゅう means reviewing: studying something again.',
  },
  {
    id: 'n4para5',
    sentence: { before: 'その ニュースを 聞いて、', mark: 'おどろきました', after: '。' },
    options: [
      'その ニュースを 聞いて、びっくりしました。',
      'その ニュースを 聞いて、わらいました。',
      'その ニュースを 聞いて、おこりました。',
      'その ニュースを 聞いて、なきました。',
    ],
    why: 'おどろく means to be surprised, the same as びっくりする.',
  },
  {
    id: 'n4para6',
    sentence: { before: 'この 村から 見る 山は ', mark: 'うつくしいです', after: '。' },
    options: [
      'この 村から 見る 山は きれいです。',
      'この 村から 見る 山は 高いです。',
      'この 村から 見る 山は 近いです。',
      'この 村から 見る 山は 小さいです。',
    ],
    why: 'うつくしい means beautiful, like きれい.',
  },
  {
    id: 'n4para7',
    sentence: { before: '今日の 電車は ', mark: 'すいて いました', after: '。' },
    options: [
      '今日の 電車は 人が 少なかったです。',
      '今日の 電車は 人が 多かったです。',
      '今日の 電車は おくれて 来ました。',
      '今日の 電車は 早く 着きました。',
    ],
    why: 'A train that is すいて いる has few people on it.',
  },
  {
    id: 'n4para8',
    sentence: { before: 'カイトは けさ 学校に ', mark: 'ちこくしました', after: '。' },
    options: [
      'カイトは けさ 学校に おくれました。',
      'カイトは けさ 学校に 早く 着きました。',
      'カイトは けさ 学校に 行きませんでした。',
      'カイトは けさ 学校に 歩いて 行きました。',
    ],
    why: 'ちこくする means to be late, the same as おくれる.',
  },
  {
    id: 'n4para9',
    sentence: { before: 'おじいさんは きのう ', mark: 'たいいんしました', after: '。' },
    options: [
      'おじいさんは きのう 病院を 出て、家に 帰りました。',
      'おじいさんは きのう 病院に 入りました。',
      'おじいさんは きのう 病気に なりました。',
      'おじいさんは きのう 病院で はたらきました。',
    ],
    why: 'たいいんする means to leave hospital and go home.',
  },
  {
    id: 'n4para10',
    sentence: { before: 'あしたの 試合は ', mark: '中止に なりました', after: '。' },
    options: [
      'あしたの 試合は しない ことに なりました。',
      'あしたの 試合は あさってに なりました。',
      'あしたの 試合は 午後からに なりました。',
      'あしたの 試合は 早く 始まる ことに なりました。',
    ],
    why: '中止 (ちゅうし) means it was called off: it will not happen.',
  },
  {
    id: 'n4para11',
    sentence: { before: 'この まちに 住む 人が ', mark: 'ふえました', after: '。' },
    options: [
      'この まちに 住む 人が 多く なりました。',
      'この まちに 住む 人が 少なく なりました。',
      'この まちに 住む 人が かわりました。',
      'この まちに 住む 人が いなく なりました。',
    ],
    why: 'ふえる means to increase: there are more people now.',
  },
  {
    id: 'n4para12',
    sentence: { before: 'ソラは 日本の れきしに ', mark: 'きょうみが あります', after: '。' },
    options: [
      'ソラは 日本の れきしを 知りたいと 思って います。',
      'ソラは 日本の れきしが きらいです。',
      'ソラは 日本の れきしを よく 教えて います。',
      'ソラは 日本の れきしを 勉強した ことが ありません。',
    ],
    why: 'きょうみが ある means being interested: wanting to know more.',
  },
  {
    id: 'n4para13',
    sentence: { before: 'カイトは 料理が ', mark: 'とくいです', after: '。' },
    options: [
      'カイトは 料理が 上手です。',
      'カイトは 料理が へたです。',
      'カイトは 料理が きらいです。',
      'カイトは 料理を した ことが ありません。',
    ],
    why: 'とくい means good at something, like 上手.',
  },
  {
    id: 'n4para14',
    sentence: { before: 'ケンは 友だちを たんじょう日の パーティーに ', mark: 'しょうたいしました', after: '。' },
    options: [
      'ケンは 友だちを たんじょう日の パーティーに よびました。',
      'ケンは 友だちと たんじょう日の パーティーに 行きませんでした。',
      'ケンは 友だちに たんじょう日の パーティーの 話を 聞きました。',
      'ケンは 友だちと たんじょう日の パーティーで 会いました。',
    ],
    why: 'しょうたいする means to invite someone, the same as よぶ.',
  },
];

export const N4_USAGE = [
  {
    id: 'n4use1',
    word: 'とどける',
    reading: 'とどける',
    en: 'to deliver; to hand in',
    options: [
      '駅で ひろった さいふを こうばんに とどけました。',
      'この バスは 駅まで 二十分で とどけます。',
      '先生に わからない ところを とどけました。',
      'あしたの 試合で 自分の 力を ぜんぶ とどけたいです。',
    ],
    why: 'とどける is taking something to a person or place: handing a found wallet in to the police box. Arriving is 着く, asking is 聞く, giving your all is 出す.',
  },
  {
    id: 'n4use2',
    word: '間に合う',
    reading: 'まにあう',
    en: 'to be in time',
    options: [
      'タクシーに 乗ったので、九時の 電車に 間に合いました。',
      'この 青い 服は あなたに よく 間に合いますね。',
      '駅の 前で ぐうぜん 友だちに 間に合いました。',
      'テストの 答えが ぜんぶ 間に合って いました。',
    ],
    why: '間に合う means making it in time, like catching the nine o\'clock train. Suiting someone is にあう, meeting is 会う, being right is 合う.',
  },
  {
    id: 'n4use3',
    word: 'にあう',
    reading: 'にあう',
    en: 'to suit, to look good on',
    options: [
      'その 赤い セーターは あなたに よく にあいますね。',
      '急いだので、さいごの バスに にあいました。',
      'この かぎは ドアに にあいませんから、開きません。',
      'きのう 駅で ぐうぜん 先生に にあいました。',
    ],
    why: 'にあう is used when clothes or colors look good on someone. Being in time is 間に合う, a key that fits is 合う, meeting is 会う.',
  },
  {
    id: 'n4use4',
    word: 'かたづける',
    reading: 'かたづける',
    en: 'to tidy up, to put away',
    options: [
      'あそんだ 後は、おもちゃを ちゃんと かたづけましょう。',
      '風が 強いので、まどを かたづけて ください。',
      '新しい ことばを ノートに かたづけました。',
      'ねる 前に シャワーで からだを かたづけます。',
    ],
    why: 'かたづける is putting things back where they belong. Closing a window is しめる, writing is 書く, washing is あらう.',
  },
  {
    id: 'n4use5',
    word: 'ざんねん',
    reading: 'ざんねん',
    en: 'a pity, disappointing',
    options: [
      'あしたの パーティーに 行けないのは ざんねんです。',
      '道で ころんで、足が とても ざんねんです。',
      '弟は いつも へやを ざんねんに して います。',
      'テストで 百てんを とって、とても ざんねんでした。',
    ],
    why: 'ざんねん is the feeling when something you hoped for does not happen. A hurting leg is いたい, a messy room is きたない, and 100 points is good news.',
  },
  {
    id: 'n4use6',
    word: 'ねっしん',
    reading: 'ねっしん',
    en: 'keen, hard-working',
    options: [
      'レンは 毎朝 早く 起きて、ねっしんに れんしゅうして います。',
      'この スープは ねっしんですから、気を つけて ください。',
      'かぜを ひいて、きのうから からだが ねっしんです。',
      '今日は ねっしんな 雨が 一日中 ふって います。',
    ],
    why: 'ねっしん describes a person who puts their heart into something. Hot soup is あつい, a fever is ねつが ある, heavy rain is はげしい or 強い.',
  },
  {
    id: 'n4use7',
    word: 'ずいぶん',
    reading: 'ずいぶん',
    en: 'quite a lot, very',
    options: [
      'しばらく 会わない 間に、ソラは ずいぶん 大きく なったね。',
      'あしたは ずいぶん 八時に 学校へ 来て ください。',
      'わたしは 毎朝 ずいぶん 七時に 起きます。',
      'ずいぶん 一度 京都へ 行って みたいです。',
    ],
    why: 'ずいぶん says something has changed or is much more than expected: Sora grew a lot. For sure is かならず, about is だいたい, someday is いつか.',
  },
  {
    id: 'n4use8',
    word: 'かならず',
    reading: 'かならず',
    en: 'without fail, always',
    options: [
      '出かける 前に、かならず 電気を けして ください。',
      '空が 暗いですね。かならず 雨が ふりそうです。',
      'その 話を 聞いて、かならず びっくりしました。',
      'きのうの 夜は かならず 十時に ねました。',
    ],
    why: 'かならず is for something that must always or surely happen: always turn off the lights. It does not go with ～そう, with feelings like びっくりした, or with one past event.',
  },
  {
    id: 'n4use9',
    word: '楽しみ',
    reading: 'たのしみ',
    en: 'something to look forward to',
    options: [
      '来週の 旅行を とても 楽しみに して います。',
      'きのう 見た 映画は とても 楽しみでした。',
      'きのうは 友だちと 楽しみに あそびました。',
      'この 本は 楽しみですから、ぜひ 読んで ください。',
    ],
    why: '楽しみに する means looking forward to something still to come. A film you already saw was 楽しかった, playing happily is 楽しく, an interesting book is おもしろい.',
  },
  {
    id: 'n4use10',
    word: 'けしき',
    reading: 'けしき',
    en: 'scenery, view',
    options: [
      'この 山の 上から 見る けしきは ほんとうに きれいです。',
      'あの 人の けしきは 母に よく にて います。',
      'あしたの けしきは 雨だと テレビで 言って いました。',
      'となりの へやから 子どもの けしきが 聞こえます。',
    ],
    why: 'けしき is the view you see from a place. A face is 顔, the weather is 天気, a voice is 声.',
  },
  {
    id: 'n4use11',
    word: 'よやく',
    reading: 'よやく',
    en: 'reservation, booking',
    options: [
      '人気の 店なので、一週間 前に せきを よやくしました。',
      'あしたの 天気を テレビで よやくしました。',
      '先生に しゅくだいを よやくしました。',
      '来年 日本の 大学に 入る ことを よやくしました。',
    ],
    why: 'よやく is booking a seat, a room or a ticket ahead of time. Checking the weather is 見る, handing in homework is 出す, deciding is きめる.',
  },
  {
    id: 'n4use12',
    word: '都合',
    reading: 'つごう',
    en: 'convenience, how your schedule fits',
    options: [
      'あしたは 都合が 悪いので、あさってに して くれませんか。',
      'かぜを ひいて、からだの 都合が 悪いです。',
      'テストの 都合は 八十てんでした。',
      'この 店の ラーメンは 都合が いいですね。',
    ],
    why: '都合 is about whether a time or plan suits you. Feeling unwell is ぐあいが 悪い, a test result is けっか, tasty ramen is おいしい.',
  },
  {
    id: 'n4use13',
    word: 'やっと',
    reading: 'やっと',
    en: 'at last, finally',
    options: [
      '三十分 待って、やっと バスが 来ました。',
      'あしたは やっと 雨が ふるでしょう。',
      'わたしは やっと 毎日 運動して います。',
      'この ケーキは やっと おいしいです。',
    ],
    why: 'やっと is for something that finally happens after a long wait. Probably is たぶん, always is いつも, very is とても.',
  },
  {
    id: 'n4use14',
    word: 'ていねい',
    reading: 'ていねい',
    en: 'careful, polite',
    options: [
      '田中さんは いつも 字を ていねいに 書きます。',
      'この 道は ていねいなので、車が たくさん 通ります。',
      'ていねいに 走ったので、電車に 間に合いました。',
      '今日は ていねいな 天気ですね。',
    ],
    why: 'ていねい means doing something carefully or politely, like neat handwriting. A wide road is 広い, running fast is 急いで, nice weather is いい 天気.',
  },
];

export const N4_TEXT_GRAMMAR = [
  {
    id: 'n4tg1',
    title: 'しょくどうの アルバイト',
    author: 'ジェイク・ミラー',
    text: 'わたしは 去年の 春から 日本の 大学で 勉強して います。日本に 来た ころは、日本語が ほとんど 話せませんでした。でも、今は 少しずつ 話せる {1}。それは、毎週 土曜日に 近所の 食堂で アルバイトを して いるからです。\n食堂の 主人は 声が 大きくて、はじめは こわい 人だと 思いました。でも、ほんとうは とても やさしい 人で、仕事の 後で よく ばんご飯を 作って {2}。食堂には 近所の 人が たくさん 来ます。みんな いろいろな 話を して くれる {3}、毎週 新しい ことばを おぼえます。\n{4}、きのうは 料理を 運ぶ ときに おさらを わって {5}。主人は 「だいじょうぶ、気に しないで」と 言って くれました。',
    blanks: [
      { options: ['ように なりました', 'ように しました', 'ことに なりました', 'ことが あります'], why: '～ように なる describes a change: now he has become able to speak a little.' },
      { options: ['くれます', 'あげます', 'もらいます', 'やります'], why: 'The owner cooks for the writer, so it is ～て くれます.' },
      { options: ['ので', 'のに', 'ても', 'ながら'], why: 'ので gives the reason: people talk to him, so he learns new words.' },
      { options: ['でも', 'それで', 'だから', 'すると'], why: 'でも turns from the good news to a bad thing that happened.' },
      { options: ['しまいました', 'おきました', 'みました', 'いきました'], why: '～て しまう shows something done by mistake and regretted.' },
    ],
  },
  {
    id: 'n4tg2',
    title: 'はじめての 試合',
    author: 'リン・チェン',
    text: 'わたしは 半年前から 空手を ならって います。先月、はじめて まちの 大会に 出ました。試合の 前の 日は、しんぱいで よく ねられませんでした。{1}、その 日の 朝は 少し 頭が いたかったです。\n試合の あいては わたしより せが 高くて、強そうな 人でした。わたしは あいてに 一回 {2} しまいましたが、先生の ことばを 思い出して、さいごまで がんばりました。試合には まけましたが、先生は 「よく がんばったね」と {3}。とても うれしかったです。\nつぎの 大会では かてる {4}、毎日 れんしゅうする {5}。',
    blanks: [
      { options: ['だから', 'けれども', 'ところで', 'または'], why: 'She could not sleep, so her head hurt: だから gives the result.' },
      { options: ['たおされて', 'たおして', 'たおさせて', 'たおすと'], why: 'あいてに with the passive: she was knocked down by her opponent.' },
      { options: ['言って くれました', '言って あげました', '言って もらいました', '言って やりました'], why: 'The teacher said it for her, so it is ～て くれました.' },
      { options: ['ように', 'ために', 'のに', 'ほど'], why: 'A potential form like かてる takes ～ように (so that I can win), not ～ために.' },
      { options: ['ことに しました', 'ことが できました', 'ことが ありました', 'ところでした'], why: '～ことに する is deciding to do something.' },
    ],
  },
  {
    id: 'n4tg3',
    title: 'まちの まつり',
    author: 'アリ・ハサン',
    text: 'わたしが 住んで いる まちでは、毎年 八月に 大きい まつりが あります。去年、となりの 家の 田中さんに さそわれて、はじめて 行きました。\nまつりの 日は、道の りょうがわに 店が たくさん {1}、とても にぎやかでした。わたしは ゆかたを 着て みたかったですが、持って いなかった {2}、田中さんの おくさんが 自分の ゆかたを {3}。夜には 花火も 見ました。空が 赤や 青に 光って、ほんとうに きれいでした。\n今年も ぜひ 行きたいです。{4}、今年は 国から 来る 妹も つれて 行く {5}です。',
    blanks: [
      { options: ['ならんで いて', 'ならべて いて', 'ならんで みて', 'ならべて しまって'], why: 'ならぶ (intransitive) with が: shops were lined up.' },
      { options: ['ので', 'のに', 'ても', 'まま'], why: 'ので gives the reason: she had none, so Mrs. Tanaka lent her one.' },
      { options: ['貸して くれました', '貸して もらいました', '借りて くれました', '借りて あげました'], why: 'Mrs. Tanaka is the one who lends (貸す), and she does it for the writer (くれる).' },
      { options: ['それに', 'けれども', 'たとえば', 'それでは'], why: 'それに adds one more thing: also, this year she will bring her sister.' },
      { options: ['つもり', 'ため', 'ほう', 'まま'], why: '～つもりです says what you plan to do.' },
    ],
  },
  {
    id: 'n4tg4',
    title: '日本で びっくりした こと',
    author: 'ソフィア・ロッシ',
    text: '日本に 来てから、びっくりした ことが いろいろ あります。\nまず、電車です。日本の 電車は 毎日 時間 {1} 来ます。わたしの 国では、電車が 十分ぐらい おくれる ことは めずらしく ありません。\nつぎに、コンビニです。夜 おそく {2} 開いて いて、とても べんりです。コピーを したり、お金を 出したり する ことも できます。\nそれから、道に ごみが ほとんど {3}。でも、ごみばこも あまり 見ません。日本人の 友だちに 聞いて みると、「ごみは 家に 持って 帰るんだよ」{4} 教えて くれました。わたしも 今は そう {5} います。',
    blanks: [
      { options: ['どおりに', 'までに', 'ばかり', 'ほど'], why: '時間どおりに means right on time.' },
      { options: ['ても', 'たら', 'ので', 'と'], why: '～ても: even late at night they are open.' },
      { options: ['ありません', 'あります', 'ありました', 'あるでしょう'], why: 'ほとんど with a negative means almost none.' },
      { options: ['と', 'を', 'に', 'で'], why: 'と marks the words someone says, before 教える or 言う.' },
      { options: ['して', 'させて', 'されて', 'しないで'], why: 'わたしも: she does the same, so it is そう して います.' },
    ],
  },
];

export const N4_SHORT = [
  {
    id: 'n4short1',
    kind: 'memo',
    text: '中川さんへ\n十一時ごろ、工場の 川口さんから 電話が ありました。あした 着く はずだった 品物が、あさっての 午後に なるそうです。おきゃくさんに 知らせる 前に、もう 一度 川口さんに 電話を して、何時に 着くか 聞いて ください。\n山本',
    questions: [
      {
        q: '中川さんは まず 何を しなければ なりませんか。',
        options: ['川口さんに 電話を して、品物が 着く 時間を 聞く。', 'おきゃくさんに 品物が おくれる ことを 知らせる。', 'あした 工場へ 品物を とりに 行く。', '山本さんに 電話を して、話を 聞く。'],
        why: 'Before telling the customer, Nakagawa must call Kawaguchi and ask the time.',
      },
    ],
  },
  {
    id: 'n4short2',
    kind: 'email',
    text: 'クラスの みなさん\nあしたの 午後の じゅぎょうは、教室では なく、図書館の 二かいで します。じしょは 図書館で 借りる ことが できますから、持って 来なくても いいです。ただ、図書館の 中では 何も 飲んでは いけません。気を つけて ください。\n小川',
    questions: [
      {
        q: 'あしたの 午後の じゅぎょうに ついて、正しい ものは どれですか。',
        options: ['図書館で あって、じしょは 持って 行かなくても いい。', '教室で あって、じしょを 持って 行かなければ ならない。', '図書館で あって、中で 飲み物を 飲んでも いい。', '図書館で あって、じしょを 買わなければ ならない。'],
        why: 'Class is in the library, dictionaries can be borrowed there, and no drinking inside.',
      },
    ],
  },
  {
    id: 'n4short3',
    kind: 'notice',
    text: 'アパートに 住んで いる みなさんへ\n来週の 水曜日、午前十時から 午後二時まで、水道の 工事が あります。その 間は 水が 使えません。料理や せんたくに 使う 水は、前の 日の 夜までに 用意して おいて ください。\nさくらアパート',
    questions: [
      {
        q: 'アパートに 住んで いる 人は 何を しなければ なりませんか。',
        options: ['火曜日の 夜までに 水を 用意して おく。', '水曜日の 午前十時までに アパートを 出る。', '水曜日の 午後二時に 工事を 見に 行く。', '水曜日の 朝に 水を 買いに 行く。'],
        why: 'The work is on Wednesday, so water must be ready by the night before: Tuesday night.',
      },
    ],
  },
  {
    id: 'n4short4',
    kind: 'diary',
    text: '今日は 朝から 雨だったので、ジョギングは やめて、家で 本を 読んだ。昼ごろ 雨が やんだので、近くの 池まで 歩いて 行った。池の そばで、小さい 犬が 一ぴきで ないて いた。首に 名前と 住所が 書いて あったので、その 家まで つれて 行った。家の 人は とても よろこんで、おかしを くれた。',
    questions: [
      {
        q: 'この 人は 犬を 見つけて、どう しましたか。',
        options: ['犬の 家まで つれて 行った。', '自分の 家に つれて 帰った。', 'こうばんに つれて 行った。', '池の そばで 家の 人を 待った。'],
        why: 'The address was on the collar, so the writer took the dog home.',
      },
    ],
  },
  {
    id: 'n4short5',
    kind: 'notice',
    text: 'さくら市民プールからの おしらせ\n八月十日（月）から 十六日（日）まで、プールの そうじを するので、プールは 休みです。この 間は、プールの うけつけも 休みです。となりの たいいくかんは いつもどおり 使う ことが できます。',
    questions: [
      {
        q: '八月十二日に できる ことは 何ですか。',
        options: ['たいいくかんで 運動する。', 'プールで およぐ。', 'プールの うけつけで カードを 買う。', 'プールの そうじを 見に 行く。'],
        why: 'The pool and its desk are closed from the 10th to the 16th, but the gym next door is open.',
      },
    ],
  },
  {
    id: 'n4short6',
    kind: 'email',
    text: 'ケンさん\n来週の 土曜日の ハイキングの ことですが、天気よほうでは 雨だそうです。もし 雨が ふったら、ハイキングは やめて、駅の 近くの 映画館で 映画を 見ませんか。天気が よかったら、はじめに 話した とおり、朝 七時に 駅で 会いましょう。\nマリア',
    questions: [
      {
        q: 'マリアさんは、雨が ふったら 何を したいと 言って いますか。',
        options: ['駅の 近くで 映画を 見たい。', '朝 七時に 駅で 会って、ハイキングに 行きたい。', '家で 映画を 見たい。', 'つぎの 週に ハイキングに 行きたい。'],
        why: 'If it rains, Maria suggests a film at the cinema near the station.',
      },
    ],
  },
  {
    id: 'n4short7',
    kind: 'notice',
    text: 'おとしものの おしらせ\n十月三日（金）の 夕方、二かいの 音楽室で 黒い かさと 青い ペンケースが 見つかりました。今は 一かいの しょくいんしつに あります。十月十日（金）までに とりに 来て ください。来る ときは、何を どこに わすれたか、先生に 言って ください。',
    questions: [
      {
        q: 'かさを わすれた 人は どう しなければ なりませんか。',
        options: ['十日までに しょくいんしつへ 行って、わすれた ものと 場所を 言う。', '十日までに 音楽室へ かさを とりに 行く。', '十日より 後に しょくいんしつへ 行く。', '自分の 名前を 書いた 紙を 先生に 出す。'],
        why: 'The umbrella is in the staff room until the 10th; say what you lost and where.',
      },
    ],
  },
  {
    id: 'n4short8',
    kind: 'memo',
    text: 'ソラへ\nお母さんは 今日、おばあちゃんの 家に 行くので、帰りが おそく なります。夕飯の カレーは 作って おいたので、あたためて 食べてね。それから、六時ごろ にもつが とどく ことに なって いるから、家に いてね。\n母',
    questions: [
      {
        q: 'ソラくんは 何を しなければ なりませんか。',
        options: ['六時ごろ 家に いて、にもつを うけとる。', 'カレーを 作って、お母さんを 待つ。', 'おばあちゃんの 家に にもつを とどける。', '六時までに おばあちゃんの 家に 行く。'],
        why: 'A parcel arrives around six, so Sora must stay home. The curry is already made.',
      },
    ],
  },
  {
    id: 'n4short9',
    kind: 'email',
    text: 'レンへ\nあしたの 朝の れんしゅうだけど、ししょうに 用事が できたので、九時からでは なくて 十一時からに なったそうだ。場所も いつもの 道場では なくて、川の そばの グラウンドだ。ひるご飯は みんなで 食べるから、おべんとうを 持って 来いよ。おくれるなよ。\nカイト',
    questions: [
      {
        q: 'レンは あした 何時に どこへ 行きますか。',
        options: ['十一時に 川の そばの グラウンドへ 行く。', '九時に 川の そばの グラウンドへ 行く。', '十一時に 道場へ 行く。', '九時に 道場へ 行く。'],
        why: 'Both changed: practice is at eleven, at the field by the river.',
      },
    ],
  },
  {
    id: 'n4short10',
    kind: 'notice',
    text: 'やおや「みどり」の おしらせ\n今週の 金曜日と 土曜日は、野菜が ぜんぶ いつもより 二わり 安く なります。また、この 二日間に 千円以上 買い物を した 人には、たまごを 一パック さしあげます。土曜日は 午後五時に 店を しめますので、ご注意 ください。',
    questions: [
      {
        q: 'たまごを もらえる 人は だれですか。',
        options: ['金曜日に 野菜を 千二百円 買った 人', '木曜日に 野菜を 二千円 買った 人', '土曜日の 午後六時に 野菜を 千五百円 買った 人', '金曜日に 野菜を 八百円 買った 人'],
        why: 'Eggs are for 1,000 yen or more on Friday or Saturday, and on Saturday the shop shuts at five.',
      },
    ],
  },
];

export const N4_MID = [
  {
    id: 'n4mid1',
    title: '一人ぐらし',
    text: 'わたしは 今年の 春から 大学の 近くの アパートで 一人で 住んで います。国に いた ときは 家族と いっしょに 住んで いたので、料理も せんたくも ほとんど 母が して くれました。\nはじめの 一か月は たいへんでした。毎日 コンビニの おべんとうばかり 食べて いたら、だんだん からだの ちょうしが 悪く なって きました。それで、自分で 料理を 作って みる ことに しました。\nさいしょは 本を 見ながら 作りましたが、なかなか うまく できませんでした。ある 日、国の 母に 電話を して、母の 野菜スープの 作り方を 聞きました。母は 「肉と 野菜を 小さく 切って、ゆっくり にれば いいのよ」と 言いました。その とおりに 作ると、なつかしい 味が しました。\n今では、しゅうまつに 一週間分の 料理を まとめて 作って おく ように して います。お金も 前ほど 使わなく なりました。母が 毎日 して くれた ことの たいへんさが、少し わかった 気が します。',
    questions: [
      {
        q: 'この 人は どうして 自分で 料理を 作る ことに しましたか。',
        options: ['からだの ちょうしが 悪く なったから', 'コンビニの おべんとうが 高かったから', '母に 作るように 言われたから', '料理の 本を もらったから'],
        why: 'Eating only convenience-store lunches made the writer feel unwell.',
      },
      {
        q: '「その とおりに」とは、どう する ことですか。',
        options: ['肉と 野菜を 小さく 切って、ゆっくり にる。', '料理の 本を 見ながら 作る。', '国の 母に 電話で 作り方を 聞く。', 'コンビニで 野菜スープを 買う。'],
        why: 'It points back to the mother\'s words: cut small, simmer slowly.',
      },
      {
        q: 'この 人は 今 どう して いますか。',
        options: ['しゅうまつに 一週間の 料理を まとめて 作って いる。', '毎日 母に 電話を して、作り方を 聞いて いる。', '毎日 コンビニの おべんとうを 食べて いる。', '友だちと いっしょに 料理を 作って いる。'],
        why: 'Now the writer cooks a week\'s food at the weekend.',
      },
    ],
  },
  {
    id: 'n4mid2',
    title: 'さいふを わすれた 日',
    text: 'れんしゅうの 後、レンは おなかが すいて、駅前の ラーメン屋に 入った。いちばん 大きい ラーメンを たのんで、あっと いう 間に 食べて しまった。ところが、お金を はらおうと した とき、さいふが ない ことに 気が ついた。道場に わすれて 来たのだ。\n「すみません、さいふを わすれて しまいました。今 すぐ とりに 行って きます。」レンが 頭を 下げると、店長は わらって 言った。「いいよ、あしたで。そのかわり、また 食べに 来いよ。」\nつぎの 日、レンは お金を 持って 店へ 行った。お金を わたすと、店長は 「ほんとうに 来たね」と うれしそうに 言った。レンは きのうの おれいに、店の さらあらいを てつだう ことに した。一時間 てつだった 後、店長は 小さい ラーメンを 作って くれた。\n「これは、おれいの おれいだよ。」\nレンは 「これじゃ、あしたも 来なきゃ」と 言って わらった。店長も 大きな 声で わらって、「待ってるよ」と 言った。',
    questions: [
      {
        q: 'レンは どうして お金を はらう ことが できませんでしたか。',
        options: ['さいふを 道場に わすれて 来たから', 'お金が 足りなかったから', 'さいふを 道で おとしたから', 'ラーメンが 高すぎたから'],
        why: 'He had left his wallet at the dojo.',
      },
      {
        q: 'つぎの 日、レンは 店で 何を しましたか。',
        options: ['お金を はらって、さらあらいを てつだった。', 'お金を はらって、大きい ラーメンを また 食べた。', '店長に さいふを 見せて、すぐ 帰った。', '店長と いっしょに ラーメンを 作った。'],
        why: 'He paid and then helped wash the dishes to say thanks.',
      },
      {
        q: '「おれいの おれい」とは 何ですか。',
        options: ['店長が レンに 作った 小さい ラーメン', 'レンが 店長に はらった お金', 'レンが きのう 食べた 大きい ラーメン', 'レンが 店長に 言った おれいの ことば'],
        why: 'Ren washed dishes as thanks, and the owner thanked him back with a small ramen.',
      },
    ],
  },
  {
    id: 'n4mid3',
    title: 'おばあちゃんの はがき',
    text: 'わたしの おばあちゃんは いなかに 住んで いて、毎月 一回 わたしに はがきを 送って くれます。はがきには いつも、にわに さいた 花の えと 短い 文が 書いて あります。\n子どもの ころ、わたしは へんじを あまり 書きませんでした。電話の ほうが 早いし、何を 書けば いいか わからなかったからです。\n中学生に なった 年、おばあちゃんが 入院しました。おみまいに 行くと、おばあちゃんの ベッドの そばに、わたしが 小学生の とき 書いた はがきが 一まい ありました。字も へたで、「げんきですか。わたしは げんきです。」しか 書いて いない はがきです。おばあちゃんは 「これを 見ると、元気が 出るのよ」と 言いました。\nその 日から、わたしも 毎月 はがきを 書く ように して います。上手な 文は 書けませんが、学校で あった ことや 楽しかった ことを 書いて います。手で 書いた 字には、電話とは ちがう 力が あると 思います。',
    questions: [
      {
        q: '子どもの ころ、この 人が あまり へんじを 書かなかったのは どうしてですか。',
        options: ['何を 書けば いいか わからなかったから', 'おばあちゃんが へんじを ほしがらなかったから', '字を 書くのが きらいだったから', 'はがきを 買う お金が なかったから'],
        why: 'Phoning was faster and the writer did not know what to write.',
      },
      {
        q: 'おばあちゃんの ベッドの そばに 何が ありましたか。',
        options: ['この 人が 小学生の とき 書いた はがき', 'おばあちゃんが かいた 花の え', 'この 人が 中学生の とき 書いた 手紙', 'おばあちゃんの 友だちから 来た はがき'],
        why: 'It was the short card the writer sent in elementary school.',
      },
      {
        q: 'この 人が いちばん 言いたい ことは 何ですか。',
        options: ['手で 書いた 字には 人を 元気に する 力が ある。', 'はがきより 電話の ほうが 早くて べんりだ。', 'はがきには 上手な 文を 書かなければ ならない。', 'おばあちゃんの えは とても 上手だ。'],
        why: 'A simple handwritten card cheered the grandmother up: handwriting has its own power.',
      },
    ],
  },
  {
    id: 'n4mid4',
    title: 'ソラの 自転車',
    text: 'ソラは 八さいだが、まだ 自転車に 乗れない。友だちは みんな 乗れるので、いつも はずかしいと 思って いた。\nある 日曜日、ソラは レンに 「にいちゃん、乗り方を 教えて」と たのんだ。レンは 「よし、まかせろ」と 言って、川の そばの 広い 道に ソラを つれて 行った。\nレンは 自転車の 後ろを 持って、「前を 見ろ。下を 見るな」と 何回も 言った。ソラは 何回も たおれて、ひざに けがを した。いたくて なきそうに なったが、それでも、やめるとは 一度も 言わなかった。レンも 何も 言わないで、また 自転車を 持った。\n夕方に なった ころ、ソラは 一人で 十メートルぐらい 走る ことが できた。ふりかえると、レンは ずっと 後ろの ほうで 手を ふって いた。\n「にいちゃん、いつ 手を はなしたの？」\n「さいしょの 五メートルからだよ。」\nソラは びっくりしたが、すぐに 大きな 声で わらった。帰り道、ソラは 「来週は 友だちと こうえんまで 自転車で 行く」と うれしそうに 言った。',
    questions: [
      {
        q: 'ソラは どうして レンに 自転車の 乗り方を 教えて もらいましたか。',
        options: ['友だちは みんな 乗れて、はずかしかったから', '新しい 自転車を 買って もらったから', 'レンに 乗るように 言われたから', 'こうえんで 自転車の 大会が あるから'],
        why: 'All Sora\'s friends could ride and he felt embarrassed.',
      },
      {
        q: 'ソラが 一人で 走れた とき、レンは どこに いましたか。',
        options: ['ソラより ずっと 後ろの ほうに いた。', 'ソラの 自転車の 後ろを 持って いた。', 'ソラの 前で 手を ふって いた。', '川の そばの 家に 帰って いた。'],
        why: 'When Sora looked back, Ren was far behind, waving.',
      },
      {
        q: 'ソラが びっくりしたのは どうしてですか。',
        options: ['レンが ずっと 前から 手を はなして いたから', 'ひざに けがを して いたから', 'レンが 大きな 声で わらったから', '友だちが こうえんで 待って いたから'],
        why: 'Ren had let go after the first five meters, and Sora had not noticed.',
      },
    ],
  },
];

export const N4_INFO = [
  {
    id: 'n4info1',
    kind: 'timetable',
    title: 'みどり駅 → みなと駅',
    lead: '朝の 電車の 時間',
    table: {
      head: ['電車', 'みどり駅を 出る 時間', 'みなと駅に 着く 時間', '料金'],
      rows: [
        ['ふつう', '8:05', '9:20', '600円'],
        ['急行', '8:20', '9:10', '900円'],
        ['ふつう', '8:35', '9:50', '600円'],
        ['急行', '8:50', '9:40', '900円'],
        ['特急', '9:00', '9:30', '1,500円'],
      ],
    },
    notes: ['特急は 土曜日と 日曜日だけ 走ります。', '料金は 大人 一人の 料金です。'],
    questions: [
      {
        q: 'マイさんは 日曜日の 8時10分に みどり駅に 着きます。9時45分までに みなと駅に 着きたいです。お金は できるだけ 安い ほうが いいです。いくら はらいますか。',
        options: ['900円', '600円', '1,500円', '1,800円'],
        why: 'The 8:05 has gone and the 8:35 arrives too late, so the cheapest is an express at 900 yen.',
      },
      {
        q: 'ケンさんは 水曜日の 8時40分に みどり駅に 着きます。いちばん 早く みなと駅に 着く 電車は どれですか。',
        options: ['8時50分の 急行', '9時の 特急', '8時35分の ふつう', '8時20分の 急行'],
        why: 'The limited express runs only at weekends, so on Wednesday the 8:50 express arrives first.',
      },
    ],
  },
  {
    id: 'n4info2',
    kind: 'poster',
    title: 'さくら市民センター 秋の 教室',
    lead: '10月から 12月まで',
    table: {
      head: ['教室', '曜日', '時間', '1か月の 料金'],
      rows: [
        ['生け花', '月・木', '10:00〜11:30', '3,000円'],
        ['空手（子ども）', '火・金', '16:00〜17:00', '2,000円'],
        ['英会話', '水', '19:00〜20:30', '4,000円'],
        ['料理', '土', '10:00〜12:00', '3,500円'],
        ['写真', '日', '13:00〜15:00', '2,500円'],
      ],
    },
    notes: [
      '料理教室は、1か月の 料金の ほかに ざいりょう代が 1,000円 かかります。',
      '65さい以上の 人は、どの 教室も 1か月の 料金が 500円 安く なります。',
      'もうしこみは 9月20日までに 電話で して ください。',
    ],
    questions: [
      {
        q: '田中さん（40さい）は 月曜日から 金曜日まで、朝 9時から 夜 6時まで 会社で 働いて います。土曜日か 日曜日に ならいたいです。1か月 3,000円までが いいです。どの 教室に 入りますか。',
        options: ['写真', '料理', '英会話', '生け花'],
        why: 'Weekend classes are cooking and photography; cooking costs 4,500 yen with materials, so photography.',
      },
      {
        q: 'キクさん（70さい）は 生け花と 料理の 教室に 入ります。1か月に ぜんぶで いくら はらいますか。',
        options: ['6,500円', '7,500円', '7,000円', '5,500円'],
        why: 'Ikebana 3,000 - 500 = 2,500; cooking 3,500 - 500 + 1,000 = 4,000; together 6,500 yen.',
      },
    ],
  },
  {
    id: 'n4info3',
    kind: 'notice',
    title: 'さくら市 秋まつり',
    lead: '10月18日（土）・19日（日）　さくらこうえん',
    table: {
      head: ['日', '時間', 'イベント', 'ばしょ'],
      rows: [
        ['18日（土）', '11:00〜12:00', '子ども 空手大会', '広場'],
        ['18日（土）', '14:00〜16:00', 'ラーメン 大食い大会', '池の 前'],
        ['18日（土）', '18:00〜19:00', 'たいこの コンサート', '広場'],
        ['19日（日）', '10:00〜11:30', 'たいこを たたいて みよう（子どもだけ）', 'テント'],
        ['19日（日）', '13:00〜15:00', 'カラオケ大会', '広場'],
        ['19日（日）', '19:00〜19:30', '花火', '池の まわり'],
      ],
    },
    notes: [
      '雨が ふったら、広場の イベントは さくら市民館で します。ほかの イベントは 中止です。',
      '大食い大会と カラオケ大会に 出る ことが できるのは、中学生以上の 人です。',
      'もうしこみは 10月10日（金）までに、さくら市民館の うけつけで して ください。',
    ],
    questions: [
      {
        q: '19日は 朝から 夜まで 雨でした。この 日に あった イベントは どれですか。',
        options: ['カラオケ大会', 'たいこを たたいて みよう', '花火', '子ども 空手大会'],
        why: 'On a rainy day only the open-square events go ahead, indoors. On the 19th that is karaoke; karate is on the 18th.',
      },
      {
        q: 'ラーメン 大食い大会に 出る ことが できるのは だれですか。',
        options: ['10月8日に 市民館で もうしこんだ 中学生', '10月8日に 市民館で もうしこんだ 小学生', '10月12日に 市民館で もうしこんだ 高校生', '10月18日に こうえんで もうしこんだ 大学生'],
        why: 'You must be in junior high or older and sign up at the hall by October 10.',
      },
    ],
  },
];
