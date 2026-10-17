// Mock JLPT N5: reading and vocabulary-paraphrase content.
// All original writing for this app (not taken from official samples, past tests or textbooks).
// Right answer is always options[0]; the app shuffles. Only N5 kanji, everything else in kana.

export const PARAPHRASE = [
  {
    id: 'para1',
    sentence: { before: 'きのうは ', mark: 'さむくなかったです', after: '。' },
    options: ['きのうは あたたかかったです。', 'きのうは さむかったです。', 'きのうは 雨でした。', 'きのうは いそがしかったです。'],
    why: '"Not cold" means it was warm.',
  },
  {
    id: 'para2',
    sentence: { before: 'わたしは ', mark: 'おととい', after: ' 先生に 会いました。' },
    options: ['わたしは きのうの 前の 日に 先生に 会いました。', 'わたしは きのう 先生に 会いました。', 'わたしは きょうの あさ 先生に 会いました。', 'わたしは 先週 先生に 会いました。'],
    why: 'おととい is the day before yesterday.',
  },
  {
    id: 'para3',
    sentence: { before: 'この しゃしんの 人は ', mark: 'わたしの りょうしん', after: 'です。' },
    options: ['この しゃしんの 人は わたしの 父と 母です。', 'この しゃしんの 人は わたしの あにと あねです。', 'この しゃしんの 人は わたしの おじいさんと おばあさんです。', 'この しゃしんの 人は わたしの おとうとと いもうとです。'],
    why: 'りょうしん means your father and mother.',
  },
  {
    id: 'para4',
    sentence: { before: 'あには 毎あさ ', mark: 'せんたくします', after: '。' },
    options: ['あには 毎あさ ふくを あらいます。', 'あには 毎あさ さらを あらいます。', 'あには 毎あさ へやを きれいに します。', 'あには 毎あさ りょうりを つくります。'],
    why: 'せんたくする means washing clothes.',
  },
  {
    id: 'para5',
    sentence: { before: 'リンさんは ', mark: 'えいがが 大すきです', after: '。' },
    options: ['リンさんは よく えいがを 見ます。', 'リンさんは えいがを あまり 見ません。', 'リンさんは えいがが きらいです。', 'リンさんは えいがを 見た ことが ありません。'],
    why: 'Someone who loves movies watches them often.',
  },
  {
    id: 'para6',
    sentence: { before: 'しゅくだいは ', mark: 'けさ', after: ' しました。' },
    options: ['しゅくだいは きょうの あさ しました。', 'しゅくだいは きのうの あさ しました。', 'しゅくだいは きのうの よる しました。', 'しゅくだいは きょうの ひる しました。'],
    why: 'けさ means this morning.',
  },
  {
    id: 'para7',
    sentence: { before: 'この 道は ', mark: 'せまいです', after: '。' },
    options: ['この 道は ひろくないです。', 'この 道は ひろいです。', 'この 道は ながくないです。', 'この 道は あぶなくないです。'],
    why: 'せまい (narrow) is the opposite of ひろい (wide).',
  },
  {
    id: 'para8',
    sentence: { before: 'ここは ', mark: 'としょかん', after: 'です。' },
    options: ['ここは 本を かりる ところです。', 'ここは 本を 買う ところです。', 'ここは ごはんを 食べる ところです。', 'ここは お金を 出す ところです。'],
    why: 'A library is a place where you borrow books.',
  },
  {
    id: 'para9',
    sentence: { before: 'あねは ', mark: 'ぎんこうに つとめて います', after: '。' },
    options: ['あねは ぎんこうで はたらいて います。', 'あねは ぎんこうで お金を 出しました。', 'あねは ぎんこうへ 行きたいです。', 'あねは ぎんこうの ちかくに すんで います。'],
    why: 'つとめて いる means she works there.',
  },
  {
    id: 'para10',
    sentence: { before: 'きのうの テストは ', mark: 'かんたんでした', after: '。' },
    options: ['きのうの テストは やさしかったです。', 'きのうの テストは むずかしかったです。', 'きのうの テストは ながかったです。', 'きのうの テストは つまらなかったです。'],
    why: 'かんたん means easy, the same as やさしい.',
  },
  {
    id: 'para11',
    sentence: { before: 'この 店には いつも 人が ', mark: 'おおぜい', after: ' います。' },
    options: ['この 店には いつも 人が たくさん います。', 'この 店には いつも 人が 少し います。', 'この 店には いつも 人が あまり いません。', 'この 店には いつも 人が 一人も いません。'],
    why: 'おおぜい means many people.',
  },
  {
    id: 'para12',
    sentence: { before: 'わたしは ', mark: 'ばんごはんの あとで', after: ' おふろに 入ります。' },
    options: ['わたしは ばんごはんを 食べてから おふろに 入ります。', 'わたしは ばんごはんを 食べる 前に おふろに 入ります。', 'わたしは ばんごはんを 食べないで おふろに 入ります。', 'わたしは ばんごはんを つくってから おふろに 入ります。'],
    why: '"After dinner" means after eating dinner.',
  },
];

export const TEXT_GRAMMAR = [
  {
    id: 'tg1',
    title: 'わたしの しゅうまつ',
    author: 'マリア・ロペス',
    text: 'わたしは 毎週 土よう日に 友だちと テニスを します。でも、先週の 土よう日は 雨{1}、テニスが できませんでした。それで、友だちと えきの 前の きっさてんへ 行きました。そこで コーヒーを 飲んで、たくさん 話しました。日よう日は 一日中 うちに いました。へやを そうじ{2}、それから 日本語の しゅくだいを しました。{3} 土よう日は 友だちと 山へ {4}。',
    blanks: [
      { options: ['でしたから', 'でしたが', 'でしたり', 'でしたまで'], why: 'から gives the reason: it rained, so they could not play.' },
      { options: ['して', 'します', 'しても', 'しに'], why: 'The て-form joins two actions in order: cleaned, then did homework.' },
      { options: ['つぎの', 'この前の', 'きのうの', 'どの'], why: 'The plan is for the future, so it is next Saturday.' },
      { options: ['行きたいです', '行きました', '行って いました', '行きませんでした'], why: 'Next Saturday is in the future, so she says what she wants to do.' },
    ],
  },
  {
    id: 'tg2',
    title: 'すきな 食べもの',
    author: 'トム・ブラウン',
    text: 'わたしは 日本の 食べものが 大すきです。とくに すしが すきです。わたしの 国{1} すしの 店が 少ないです。でも、日本には すしの 店が たくさん あります。先週、日本人の 友だちと えきの ちかくの すしやへ 行きました。とても おいしかったです。{2}、少し 高かったです。わたしは 日本へ 来る 前は、魚が あまり すきでは {3}。でも、今は 毎日 食べたいです。らいげつ、友だちに すしの つくりかたを {4}。',
    blanks: [
      { options: ['には', 'を', 'へ', 'から'], why: 'には marks the place where something exists.' },
      { options: ['でも', 'だから', 'それから', 'では'], why: 'Tasty but expensive: でも shows the contrast.' },
      { options: ['ありませんでした', 'ありません', 'ありました', 'です'], why: 'It is about the past (before coming) and あまり needs a negative.' },
      { options: ['ならいます', 'ならいました', 'ならって いました', 'ならいませんでした'], why: 'らいげつ (next month) needs the non-past form.' },
    ],
  },
  {
    id: 'tg3',
    title: 'わたしの まち',
    author: 'アンナ・シュミット',
    text: 'わたしは 今 大学の ちかくの アパートに すんで います。アパートの 前に 大きい こうえんが あります。わたしは 毎あさ こうえんを さんぽします。こうえん{1} 小さい 川が あって、魚も います。こうえんの 右に スーパーが あります。{2} スーパーは よる 十時まで あいて いますから、とても べんりです。でも、えきは アパートから とおいです。あるいて 二十分{3} かかります。{4}、わたしは ときどき バスで えきへ 行きます。',
    blanks: [
      { options: ['の 中に', 'の 中で', 'の 中を', 'の 中が'], why: 'に marks where something is with あります.' },
      { options: ['その', 'あの', 'どの', 'どんな'], why: 'その points back to the supermarket just mentioned.' },
      { options: ['ぐらい', 'だけ', 'まで', 'ごろ'], why: 'ぐらい gives an amount of time: about twenty minutes.' },
      { options: ['だから', 'でも', 'それに', 'では'], why: 'The station is far, so she sometimes takes the bus.' },
    ],
  },
  {
    id: 'tg4',
    title: '日本語の べんきょう',
    author: 'グエン・ミン',
    text: 'わたしは 半年前に 日本へ 来ました。今 日本語学校で べんきょうして います。じゅぎょうは 毎日 午前九時{1} 十二時までです。日本語は むずかしいです。とくに かんじが むずかしいです。かんじを 少しずつ おぼえて いますが、すぐ {2}。先生は 「毎日 れんしゅうしましょう」と 言いました。それで、わたしは 毎ばん 三十分 かんじを {3}。らいねんは 日本の 大学に {4}です。',
    blanks: [
      { options: ['から', 'まで', 'に', 'で'], why: '～から ～まで means from one time to another.' },
      { options: ['わすれます', 'おぼえます', 'わかります', '書けます'], why: 'が shows a contrast: she learns kanji but soon forgets them.' },
      { options: ['書いて います', '書いて いませんでした', '書きませんでした', '書きたくないです'], why: 'She follows the advice, so she writes kanji every night.' },
      { options: ['入りたい', '入る', '入った', '入って'], why: '～たいです says what she wants to do.' },
    ],
  },
];

export const SHORT = [
  {
    id: 'short1',
    kind: 'memo',
    text: 'リーさんへ\nやまださんから 電話が ありました。あしたの テニスの れんしゅうは 午後二時からでは なくて、三時からに なりました。あとで やまださんに メールを して ください。\nたなか',
    questions: [
      {
        q: 'リーさんは このあと 何を しますか。',
        options: ['やまださんに メールを します。', 'やまださんに 電話を します。', 'たなかさんに 電話を します。', '二時に テニスの れんしゅうに 行きます。'],
        why: 'The note asks Lee to send Yamada an email later.',
      },
    ],
  },
  {
    id: 'short2',
    kind: 'diary',
    text: 'きょうは あねと デパートへ 行きました。来週は 父の たんじょう日ですから、父に あおい ネクタイを 買いました。父には まだ 見せて いません。たんじょう日の ばんに わたします。',
    questions: [
      {
        q: 'わたしは きょう 何を しましたか。',
        options: ['あねと 父の ネクタイを 買いました。', '父と ネクタイを 買いに 行きました。', '父に ネクタイを もらいました。', '父に ネクタイを わたしました。'],
        why: 'She bought a tie for her father with her sister and has not given it yet.',
      },
    ],
  },
  {
    id: 'short3',
    kind: 'notice',
    text: '学生の みなさんへ\nあしたは 先生たちの 会が ありますから、じゅぎょうは 午前だけです。十二時に 学校を 出て ください。としょかんも 午後は 休みです。\nさくら日本語学校',
    questions: [
      {
        q: 'あした 学生は どう しますか。',
        options: ['午前だけ じゅぎょうに 出て、十二時に 学校を 出ます。', '午後 としょかんで べんきょうします。', '一日中 じゅぎょうに 出ます。', '学校を 休みます。'],
        why: 'Classes are morning only and students leave at twelve.',
      },
    ],
  },
  {
    id: 'short4',
    kind: 'letter',
    text: 'ジョンさん\nあしたは いっしょに 山へ 行く 日ですね。でも、あしたは 雨が ふるでしょう。来週の 日よう日に しませんか。へんじを ください。\nけんた',
    questions: [
      {
        q: 'ジョンさんは このあと 何を しますか。',
        options: ['けんたさんに へんじを します。', 'あした けんたさんと 山へ 行きます。', '来週の 土よう日に 山へ 行きます。', 'けんたさんに 天気を 聞きます。'],
        why: 'Kenta asks John to reply about moving the trip.',
      },
    ],
  },
  {
    id: 'short5',
    kind: 'memo',
    text: 'ゆうきへ\nお母さんは きょう おそく かえります。れいぞうこに おべんとうが ありますから、それを 食べて ください。食べた あとで、おさらを あらって ください。\n母',
    questions: [
      {
        q: 'ゆうきさんは ばんごはんの あとで 何を しますか。',
        options: ['さらを あらいます。', 'おべんとうを 買います。', 'ばんごはんを つくります。', 'お母さんを まちます。'],
        why: 'The note says to wash the dishes after eating.',
      },
    ],
  },
  {
    id: 'short6',
    kind: 'notice',
    text: 'おしらせ\nこの 店は 十月十日（木）から 十五日（火）まで 休みます。十六日（水）から また あきます。十六日は パンが ぜんぶ 百円 安く なります。\nパンの 店 ひまわり',
    questions: [
      {
        q: 'パンが 安く なる 日は いつですか。',
        options: ['十六日', '十日', '十五日', '十四日'],
        why: 'The shop reopens on the 16th, and bread is 100 yen cheaper that day.',
      },
    ],
  },
  {
    id: 'short7',
    kind: 'diary',
    text: 'きのうは 友だちの たんじょう日でしたから、友だちの うちで パーティーを しました。わたしは ケーキを つくりたかったですが、時間が ありませんでしたから、えきの 前の 店で 買いました。',
    questions: [
      {
        q: 'わたしは ケーキを どう しましたか。',
        options: ['店で 買いました。', 'うちで つくりました。', '友だちと つくりました。', '友だちに もらいました。'],
        why: 'There was no time to make one, so the writer bought it.',
      },
    ],
  },
  {
    id: 'short8',
    kind: 'letter',
    text: 'マイクさん\n本を かして くれて ありがとう。とても おもしろかったです。きょう かえしたいですが、ゆうがた 六時ごろ マイクさんの うちへ 行っても いいですか。\nさとう',
    questions: [
      {
        q: 'さとうさんは どうして マイクさんの うちへ 行きますか。',
        options: ['本を かえしに 行きます。', '本を かりに 行きます。', '本を 買いに 行きます。', '本を いっしょに 読みに 行きます。'],
        why: 'Sato wants to return the book he borrowed.',
      },
    ],
  },
];

export const MID = [
  {
    id: 'mid1',
    title: '日本の 電車',
    text: 'わたしは 先月 日本へ 来ました。毎日 電車で 学校へ 行きます。わたしの 国では、みんな 車で 学校や 会社へ 行きますから、はじめは 電車の のりかたが わかりませんでした。きっぷの 買いかたも わかりませんでした。えきで こまって いた とき、わかい 女の 人が えいごで おしえて くれました。とても うれしかったです。\n今は もう だいじょうぶです。でも、あさの 電車は 人が 多くて、たいへんです。八時の 電車では いつも 立って います。それで、今は 少し はやく うちを 出ます。七時の 電車は 八時の 電車より 人が 少ないですから、すわる ことが できます。電車の 中で 日本語の 本を 読みます。',
    questions: [
      {
        q: 'この 人は はじめ どうして こまりましたか。',
        options: ['電車の のりかたが わからなかったから', '電車が おそく 来たから', 'えいごが わからなかったから', 'きっぷが 高かったから'],
        why: 'At first the writer did not know how to ride the train.',
      },
      {
        q: 'この 人は 今 毎あさ どう して いますか。',
        options: ['七時の 電車に のって、本を 読んで います。', '八時の 電車に のって、立って います。', '車で 学校へ 行って います。', 'わかい 女の 人と 電車に のって います。'],
        why: 'The writer now takes the less crowded seven o\'clock train and reads.',
      },
    ],
  },
  {
    id: 'mid2',
    title: 'わたしの すきな こと',
    text: 'わたしは りょうりが すきです。国に いた とき、母と いっしょに よく 国の りょうりを つくりました。日本へ 来てから、日本の りょうりも つくりたいと おもいました。でも、つくりかたは ぜんぜん しりませんでした。\nそれで、先月から 毎週 土よう日に うちの ちかくの りょうりきょうしつへ 行って います。先生は 七十さいの おばあさんで、とても やさしいです。先週は 魚の りょうりを ならいました。むずかしかったですが、おいしく できました。こんどは 友だちを うちに よんで、ならった りょうりを つくって あげたいです。',
    questions: [
      {
        q: 'この 人は 先月から 何を して いますか。',
        options: ['日本の りょうりを ならって います。', '国の りょうりを おしえて います。', 'お母さんと りょうりを つくって います。', '毎日 魚の りょうりを つくって います。'],
        why: 'Since last month the writer has gone to a cooking class every Saturday.',
      },
      {
        q: 'この 人は これから 何を したいですか。',
        options: ['友だちに ならった りょうりを つくりたいです。', 'おばあさんに 国の りょうりを おしえたいです。', '国へ かえって お母さんに 会いたいです。', '友だちと りょうりきょうしつへ 行きたいです。'],
        why: 'The writer wants to invite friends and cook what they learned.',
      },
    ],
  },
  {
    id: 'mid3',
    title: 'わたしの かさ',
    text: '先週の 水よう日は あさから 雨でした。わたしは かさを もって 学校へ 行きました。じゅぎょうの あとで、としょかんで 三時間ぐらい べんきょうしました。外へ 出た とき、雨は もう ふって いませんでしたから、かさを としょかんに わすれました。うちに かえってから、かさが ない ことが わかりました。\nつぎの 日、としょかんへ 行きましたが、かさは ありませんでした。としょかんの 人に 聞きました。その 人は 「白い かさですか。きのう 学生が もって 来ましたよ。」と 言って、わたしの かさを 出しました。とても うれしかったです。',
    questions: [
      {
        q: 'この 人は どうして かさを わすれましたか。',
        options: ['外に 出た とき、雨が ふって いなかったから', 'としょかんで ねて いたから', '友だちと 話して いたから', 'いそいで うちへ かえったから'],
        why: 'The rain had stopped when the writer went outside.',
      },
      {
        q: 'つぎの 日、かさは どこに ありましたか。',
        options: ['としょかんの 人が もって いました。', 'としょかんの つくえの 上に ありました。', '学校の きょうしつに ありました。', '友だちが もって いました。'],
        why: 'A student had handed it in, and the library staff gave it back.',
      },
    ],
  },
  {
    id: 'mid4',
    title: 'なつ休みの ホームステイ',
    text: 'わたしは なつ休みに 日本人の かぞくの うちに 二週間 すみました。かぞくは お父さんと お母さんと 小学生の 男の子の 三人です。お父さんは 会社の しごとが いそがしくて、いつも よる おそく かえって きました。お母さんは 毎日 おいしい ごはんを つくって くれました。\n男の子の けんくんは さいしょ あまり 話しませんでした。でも、いっしょに サッカーを してから、なかよく なりました。さいごの 日に、けんくんは わたしに 手がみを くれました。ひらがなで 「また きてね」と 書きました。その 手がみは 今も わたしの つくえの 上に あります。',
    questions: [
      {
        q: 'この 人は どうして けんくんと なかよく なりましたか。',
        options: ['いっしょに サッカーを したから', 'けんくんが 手がみを くれたから', 'けんくんが たくさん 話したから', 'いっしょに ごはんを つくったから'],
        why: 'They became friends after playing soccer together.',
      },
      {
        q: 'けんくんの 手がみは 今 どこに ありますか。',
        options: ['この 人の つくえの 上', 'この 人の かばんの 中', 'けんくんの うち', 'お母さんの つくえの 上'],
        why: 'The letter is still on the writer\'s desk.',
      },
    ],
  },
];

export const INFO = [
  {
    id: 'info1',
    kind: 'timetable',
    title: 'さくらえき → みどりこうえん バス',
    lead: 'へいじつの 午後の バスです。',
    table: {
      head: ['バス', 'えきを 出る 時間', 'こうえんに つく 時間', 'ねだん'],
      rows: [
        ['1ばん', '2:50', '3:30', '250円'],
        ['2ばん', '3:10', '3:40', '300円'],
        ['3ばん', '3:20', '4:10', '200円'],
        ['4ばん', '3:40', '4:10', '300円'],
      ],
    },
    notes: ['土よう日と 日よう日は 時間が ちがいます。'],
    questions: [
      {
        q: 'アナさんは 3時に えきに つきます。4時までに こうえんに つきたいです。どの バスに のりますか。',
        options: ['2ばん', '1ばん', '3ばん', '4ばん'],
        why: 'Bus 1 leaves before 3:00, and buses 3 and 4 arrive at 4:10; only bus 2 works.',
      },
    ],
  },
  {
    id: 'info2',
    kind: 'menu',
    title: 'きっさてん「そら」',
    lead: 'メニュー',
    table: {
      head: ['', 'ねだん'],
      rows: [
        ['コーヒー', '350円'],
        ['こうちゃ', '300円'],
        ['ジュース', '250円'],
        ['ケーキ', '400円'],
        ['サンドイッチ', '500円'],
        ['カレーライス', '700円'],
      ],
    },
    notes: ['のみものと いっしょに たのむ とき、ケーキは 300円です。'],
    questions: [
      {
        q: 'リンさんは こうちゃと ケーキを たのみます。ぜんぶで いくらですか。',
        options: ['600円', '700円', '650円', '400円'],
        why: 'Tea is 300 yen, and cake ordered with a drink is 300 yen.',
      },
    ],
  },
  {
    id: 'info3',
    kind: 'notice',
    title: 'さくら としょかん',
    lead: 'あいて いる 時間',
    table: {
      head: ['日', '時間'],
      rows: [
        ['月よう日', '休み'],
        ['火よう日〜金よう日', '午前9時〜午後8時'],
        ['土よう日・日よう日', '午前9時〜午後5時'],
      ],
    },
    notes: ['本は 一人 5さつまで、二週間 かりる ことが できます。', 'としょかんの 中で 食べたり 飲んだり しないで ください。'],
    questions: [
      {
        q: 'ケンさんは 月よう日から 金よう日まで、午前9時から 午後7時まで しごとを します。日よう日は 一日中 出かけます。ケンさんは いつ としょかんへ 行く ことが できますか。',
        options: ['土よう日の 午前10時', '金よう日の 午後6時', '月よう日の 午後7時半', '日よう日の 午後3時'],
        why: 'Friday 6 pm is work, Monday the library is closed, and Sunday Ken is out.',
      },
    ],
  },
  {
    id: 'info4',
    kind: 'poster',
    title: '外国人の ための 日本語クラス',
    lead: 'さくら こくさいセンター 3かい',
    table: {
      head: ['クラス', '日', '時間', '1かいの ねだん'],
      rows: [
        ['A（はじめての 人）', '月よう日', '午前10時〜12時', '500円'],
        ['B（はじめての 人）', '土よう日', '午後2時〜4時', '500円'],
        ['C（少し 話す ことが できる 人）', '水よう日', '午後6時〜8時', '800円'],
        ['D（少し 話す ことが できる 人）', '日よう日', '午前10時〜12時', '800円'],
      ],
    },
    notes: ['はじめる 前に、電話を して ください。', '電話：03-1234-5678'],
    questions: [
      {
        q: 'マリーさんは 日本語を ぜんぜん 話す ことが できません。土よう日と 日よう日だけ ひまです。どの クラスに 入りますか。',
        options: ['B', 'A', 'C', 'D'],
        why: 'B is the beginner class on a weekend day.',
      },
    ],
  },
];
