// Mock JLPT N3: vocabulary (paraphrase and usage), text grammar and reading content.
// All original writing for this app (not taken from official samples, past tests, textbooks or other apps).
// Right answer is always options[0]; the app shuffles. Only N5, N4 and N3 kanji, everything else in kana.

export const N3_PARAPHRASE = [
  {
    id: 'n3para1',
    sentence: { before: '駅で ', mark: 'たまたま', after: ' 昔の 友だちに 会った。' },
    options: [
      '駅で 偶然 昔の 友だちに 会った。',
      '駅で 約束して 昔の 友だちに 会った。',
      '駅で 毎朝 昔の 友だちに 会った。',
      '駅で 急いで 昔の 友だちに 会った。',
    ],
    why: 'たまたま means by chance, the same as 偶然 (ぐうぜん).',
  },
  {
    id: 'n3para2',
    sentence: { before: '目覚まし時計が 鳴らなくて、', mark: 'あわてて', after: ' 家を 出た。' },
    options: [
      '目覚まし時計が 鳴らなくて、急いで 家を 出た。',
      '目覚まし時計が 鳴らなくて、ゆっくり 家を 出た。',
      '目覚まし時計が 鳴らなくて、一人で 家を 出た。',
      '目覚まし時計が 鳴らなくて、楽しそうに 家を 出た。',
    ],
    why: 'あわてて means in a rush and a panic, so 急いで fits.',
  },
  {
    id: 'n3para3',
    sentence: { before: '一日中 練習して、レンは ', mark: 'くたくただった', after: '。' },
    options: [
      '一日中 練習して、レンは とても 疲れて いた。',
      '一日中 練習して、レンは とても 元気だった。',
      '一日中 練習して、レンは とても 楽しかった。',
      '一日中 練習して、レンは とても 強く なった。',
    ],
    why: 'くたくた means worn out: very tired.',
  },
  {
    id: 'n3para4',
    sentence: { before: 'ソラは 宿題が 多いと ', mark: 'ぶつぶつ 言って いた', after: '。' },
    options: [
      'ソラは 宿題が 多いと 小さい 声で 文句を 言って いた。',
      'ソラは 宿題が 多いと 大きい 声で 笑って いた。',
      'ソラは 宿題が 多いと 楽しそうに 歌って いた。',
      'ソラは 宿題が 多いと 先生に ていねいに 説明して いた。',
    ],
    why: 'ぶつぶつ 言う is grumbling: complaining in a low voice.',
  },
  {
    id: 'n3para5',
    sentence: { before: '試合の 開始に ', mark: 'ぎりぎり 間に合った', after: '。' },
    options: [
      'もう 少しで 試合の 開始に 遅れる ところだった。',
      '試合の 開始より ずっと 早く 着いた。',
      '試合の 開始に 遅れて しまった。',
      '試合の 開始を 一時間 待った。',
    ],
    why: 'ぎりぎり 間に合う is making it just in time: you were nearly late.',
  },
  {
    id: 'n3para6',
    sentence: { before: '駅前の ラーメン屋は ', mark: 'しばらく', after: ' 店を 休むそうだ。' },
    options: [
      '駅前の ラーメン屋は 少しの 間 店を 休むそうだ。',
      '駅前の ラーメン屋は 今日の 午後だけ 店を 休むそうだ。',
      '駅前の ラーメン屋は もう 店を 開けないそうだ。',
      '駅前の ラーメン屋は 毎週 店を 休むそうだ。',
    ],
    why: 'しばらく means for a while: a period of time, not for good.',
  },
  {
    id: 'n3para7',
    sentence: { before: 'ソラは お父さんに ', mark: 'そっくりだ', after: '。' },
    options: [
      'ソラは お父さんに よく 似て いる。',
      'ソラは お父さんに 全然 似て いない。',
      'ソラは お父さんに とても やさしい。',
      'ソラは お父さんに よく しかられる。',
    ],
    why: 'そっくり means looking exactly alike.',
  },
  {
    id: 'n3para8',
    sentence: { before: '旅館の 予約を ', mark: 'キャンセルした', after: '。' },
    options: [
      '旅館の 予約を 取り消した。',
      '旅館の 予約を もう 一度 確認した。',
      '旅館の 予約を 一日 増やした。',
      '旅館の 予約を 友だちに 頼んだ。',
    ],
    why: 'キャンセルする means cancelling, the same as 取り消す.',
  },
  {
    id: 'n3para9',
    sentence: { before: '師匠は ', mark: 'あいかわらず', after: ' 元気だ。' },
    options: [
      '師匠は 前と 同じように 元気だ。',
      '師匠は 前より ずっと 元気に なった。',
      '師匠は 前ほど 元気では ない。',
      '師匠は 急に 元気に なった。',
    ],
    why: 'あいかわらず means as always: nothing has changed.',
  },
  {
    id: 'n3para10',
    sentence: { before: '三時間 歩いて、', mark: 'ようやく', after: ' 山の 上に 着いた。' },
    options: [
      '三時間 歩いて、やっと 山の 上に 着いた。',
      '三時間 歩いて、すぐに 山の 上に 着いた。',
      '三時間 歩いて、一人で 山の 上に 着いた。',
      '三時間 歩いて、思ったより 早く 山の 上に 着いた。',
    ],
    why: 'ようやく means at last, after a long time, the same as やっと.',
  },
  {
    id: 'n3para11',
    sentence: { before: '先に 一点 取って、カイトは ', mark: '油断した', after: '。' },
    options: [
      '先に 一点 取って、カイトは もう 大丈夫だと 思って 気を ゆるめた。',
      '先に 一点 取って、カイトは もう だめだと 思って あきらめた。',
      '先に 一点 取って、カイトは うれしくて 泣いた。',
      '先に 一点 取って、カイトは 前より もっと 注意した。',
    ],
    why: '油断する is letting your guard down because you think you are safe.',
  },
  {
    id: 'n3para12',
    sentence: { before: 'きのう 見た 映画は ', mark: 'たいくつだった', after: '。' },
    options: [
      'きのう 見た 映画は つまらなかった。',
      'きのう 見た 映画は こわかった。',
      'きのう 見た 映画は 悲しかった。',
      'きのう 見た 映画は とても 人気が あった。',
    ],
    why: 'たいくつ means boring, the same as つまらない.',
  },
  {
    id: 'n3para13',
    sentence: { before: '祭りの 準備は ', mark: 'ほぼ', after: ' 終わった。' },
    options: [
      '祭りの 準備は だいたい 終わった。',
      '祭りの 準備は まだ 少しも 終わって いない。',
      '祭りの 準備は 一人で 終わった。',
      '祭りの 準備は もう 一度 やり直した。',
    ],
    why: 'ほぼ means almost, nearly: the same as だいたい.',
  },
  {
    id: 'n3para14',
    sentence: { before: '新しい くつを もらって、', mark: 'さっそく', after: ' はいて みた。' },
    options: [
      '新しい くつを もらって、すぐに はいて みた。',
      '新しい くつを もらって、何日か して から はいて みた。',
      '新しい くつを もらって、だれにも 言わずに はいて みた。',
      '新しい くつを もらって、いやいや はいて みた。',
    ],
    why: 'さっそく means right away, the same as すぐに.',
  },
  {
    id: 'n3para15',
    sentence: { before: '', mark: 'うっかり', after: ' かぎを かけるのを 忘れて 出かけた。' },
    options: [
      '気が つかないで かぎを かけるのを 忘れて 出かけた。',
      'わざと かぎを かけないで 出かけた。',
      'ちゃんと かぎを かけて 出かけた。',
      'かぎを なくして しまって 出かけた。',
    ],
    why: 'うっかり means carelessly, without noticing. わざと is on purpose.',
  },
  {
    id: 'n3para16',
    sentence: { before: 'この くつは 少し ', mark: 'きつい', after: '。' },
    options: [
      'この くつは 少し 小さい。',
      'この くつは 少し 大きい。',
      'この くつは 少し 重い。',
      'この くつは 少し 古い。',
    ],
    why: 'Shoes that are きつい are tight: a little too small.',
  },
];

export const N3_USAGE = [
  {
    id: 'n3use1',
    word: '解決',
    reading: 'かいけつ',
    en: 'solving, settling (a problem)',
    options: [
      'みんなで 話し合って、やっと 問題が 解決した。',
      '新しい くつを 買って、足に 解決した。',
      '駅の 前で 友だちと 三時に 解決した。',
      '明日の 予定を ノートに 解決して おいた。',
    ],
    why: '解決 is used for problems and troubles that get settled. The others need 合う, 会う and 書く.',
  },
  {
    id: 'n3use2',
    word: 'さっぱり',
    reading: 'さっぱり',
    en: 'refreshed, clean',
    options: [
      'たくさん 汗を かいたので、シャワーを 浴びて さっぱりした。',
      'レンは さっぱり 走って、一位に なった。',
      '昼から さっぱり 雨が 降って きた。',
      '駅まで 歩くと さっぱり 十分 かかる。',
    ],
    why: 'さっぱりする is feeling fresh and clean. Running fast is 速く, rain starting suddenly is 急に, about ten minutes is だいたい.',
  },
  {
    id: 'n3use3',
    word: '支度',
    reading: 'したく',
    en: 'getting ready, preparations',
    options: [
      'もう 出かける 時間だから、早く 支度を しなさい。',
      'かぜを ひいたので、病院で 支度を して もらった。',
      'この 部屋は 支度が 広くて 気持ちが いい。',
      '先生の 支度に 答えて ください。',
    ],
    why: '支度 is getting ready, for going out or for a meal. Treatment is 治療 or みて もらう, space is 広さ, a question is 質問.',
  },
  {
    id: 'n3use4',
    word: '引き受ける',
    reading: 'ひきうける',
    en: 'to take on (a job, a request)',
    options: [
      'だれも やりたがらない 仕事を、田中さんが 引き受けて くれた。',
      'たんじょう日に 友だちから プレゼントを 引き受けた。',
      '来年、大学の 試験を 引き受ける つもりだ。',
      '電車の 中で 知らない 人に 足を 引き受けられた。',
    ],
    why: '引き受ける is agreeing to take on a task. Receiving a present is もらう, taking an exam is 受ける, having your foot stepped on is ふまれる.',
  },
  {
    id: 'n3use5',
    word: '落ち着く',
    reading: 'おちつく',
    en: 'to calm down, to settle',
    options: [
      '試合の 前は、深く 息を して 気持ちを 落ち着かせる。',
      '秋に なって、木の 葉が 道に 落ち着いた。',
      'エレベーターで 一階に 落ち着いた。',
      '使わなく なった 自転車を 友だちに 落ち着いた。',
    ],
    why: '落ち着く is about a calm mind or a situation settling. Leaves fall (落ちる), you arrive at a floor (着く), and you give a bike away (あげる).',
  },
  {
    id: 'n3use6',
    word: '夢中',
    reading: 'むちゅう',
    en: 'absorbed in, crazy about',
    options: [
      'ソラは ゲームに 夢中で、呼んでも 返事を しない。',
      '夢中に 雨が 降りだしたので、急いで 帰った。',
      'この スープは 夢中なので、気を つけて 飲んで ください。',
      '夢中な 道を 歩いて、駅まで 行った。',
    ],
    why: '夢中 means being so absorbed in something that you forget everything else. Suddenly is 急に, hot is 熱い, a narrow road is せまい 道.',
  },
  {
    id: 'n3use7',
    word: 'もったいない',
    reading: 'もったいない',
    en: 'wasteful, a waste',
    options: [
      'まだ 使えるのに、捨てるのは もったいない。',
      '道が 込んで いて、とても もったいない。',
      'ソラは 前より 背が もったいなく なった。',
      'かぜを ひいて、のどが もったいない。',
    ],
    why: 'もったいない is the feeling that something useful is being wasted. A busy road is 込んで いて 大変, growing taller is 高く なる, a sore throat is いたい.',
  },
  {
    id: 'n3use8',
    word: 'かなう',
    reading: 'かなう',
    en: '(a dream or wish) to come true',
    options: [
      '小さい ころからの 夢が、やっと かなった。',
      '急いだので、九時の 電車に かなった。',
      'この 青い シャツは あなたに よく かなう。',
      'テストの 答えが 全部 かなって いた。',
    ],
    why: 'かなう is for dreams and wishes coming true. Being in time is 間に合う, suiting someone is 似合う, being correct is 合う.',
  },
  {
    id: 'n3use9',
    word: '経験',
    reading: 'けいけん',
    en: 'experience',
    options: [
      '外国で 働いた 経験が ある 人を さがして いる。',
      '今日の 経験は 晴れのち くもりだそうだ。',
      'この 店の ラーメンは 経験が 安い。',
      '経験を 曲がると、右に 駅が 見えます。',
    ],
    why: '経験 is something you have done or lived through. The weather is 天気, the price is 値段, a corner is かど.',
  },
  {
    id: 'n3use10',
    word: 'ぐっすり',
    reading: 'ぐっすり',
    en: '(sleep) soundly',
    options: [
      'ゆうべは 疲れて いたので、朝まで ぐっすり 眠った。',
      '夕方から ぐっすり 雨が 降って いる。',
      'おなかが すいて、ラーメンを ぐっすり 食べた。',
      'ぐっすり 走ったので、電車に 間に合った。',
    ],
    why: 'ぐっすり only goes with sleeping deeply. Heavy rain is ざあざあ, eating a lot is たくさん, running hard is 急いで or 全力で.',
  },
  {
    id: 'n3use11',
    word: '感心',
    reading: 'かんしん',
    en: 'admiration, being impressed',
    options: [
      '毎朝 早く 起きて 練習する レンに、みんな 感心して いる。',
      'カイトは 昔から 歴史に 感心が ある。',
      'かぜを ひいて、きのうから 感心が 悪い。',
      '車が 多いので、感心して 道を わたって ください。',
    ],
    why: '感心 is being impressed by someone. Interest is 関心 (another kanji), feeling unwell is ぐあい, being careful is 注意 or 気を つけて.',
  },
  {
    id: 'n3use12',
    word: '発表',
    reading: 'はっぴょう',
    en: 'announcement, presentation',
    options: [
      'クラスの みんなの 前で、調べた ことを 発表した。',
      '朝 七時に 発表して、昼に 京都に 着いた。',
      '国の 家族に 手紙を 発表で 送った。',
      '春に なって、庭に きれいな 発表が 咲いた。',
    ],
    why: '発表 is presenting or announcing something to people. Setting off is 出発, post is 郵便, flowers are 花.',
  },
  {
    id: 'n3use13',
    word: 'たまる',
    reading: 'たまる',
    en: 'to pile up, to be saved up',
    options: [
      'アルバイトを 続けて、旅行に 行ける ぐらい お金が たまった。',
      'バスが 駅の 前に たまって、人が 降りた。',
      '友だちの 家に 一晩 たまった。',
      '朝から 何も 食べて いないので、おなかが たまった。',
    ],
    why: 'たまる is money, work or stress building up. A bus stops (止まる), you stay the night (泊まる), you are hungry (すいた).',
  },
  {
    id: 'n3use14',
    word: '性格',
    reading: 'せいかく',
    en: 'personality, character',
    options: [
      'カイトは まじめな 性格で、練習を 一日も 休まない。',
      'この カレーの 性格は ちょっと からい。',
      '明日の 性格は 雨だと 言って いた。',
      '駅までの 性格を 教えて ください。',
    ],
    why: '性格 is what a person is like. Taste is 味, the weather is 天気, the way is 道.',
  },
  {
    id: 'n3use15',
    word: 'ゆずる',
    reading: 'ゆずる',
    en: 'to give up (a seat), to hand over',
    options: [
      '電車で お年寄りに 席を ゆずった。',
      '駅で 友だちを 一時間 ゆずった。',
      '夕方から 雨が ゆずって きた。',
      'ラーメンに こしょうを たくさん ゆずった。',
    ],
    why: 'ゆずる is letting someone else have something, like your seat. Waiting is 待つ, rain starts to fall (降る), adding pepper is 入れる or かける.',
  },
  {
    id: 'n3use16',
    word: 'はりきる',
    reading: 'はりきる',
    en: 'to be full of energy, eager',
    options: [
      '初めての 大会なので、レンは 朝から はりきって いる。',
      'かぜで 熱が はりきって、学校を 休んだ。',
      'この シャツは 小さくて、はりきって 着られない。',
      '店が はりきって いて、中に 入れなかった。',
    ],
    why: 'はりきる is being eager and full of energy for something. A fever goes up (上がる), a shirt is tight (きつい), a shop is crowded (込んで いる).',
  },
];

export const N3_TEXT_GRAMMAR = [
  {
    id: 'n3tg1',
    title: '朝の 散歩',
    author: 'マテオ・ガルシア',
    text: '日本に 来て 二年に なる。来た ばかりの ころは、朝 起きるのが 苦手で、授業に 遅れる ことも よく あった。そこで、毎朝 三十分 散歩する {1}。\n始めた ころは、眠くて つらかった。{2}、一か月ほど 続けて いる {3}、自然に 早く 目が 覚める ように なった。散歩の 途中で 近所の 人に 会うと、あいさつを して くれる。花屋の おばあさんは、わたしの 顔を 見る {4}、「今日も 元気ね」と 声を かけて くれる。\n散歩を 始めて、早起きが できる ように なった {5}、町の 人と 知り合う ことも できた。これからも 続けて いきたい。',
    blanks: [
      { options: ['ことに した', 'ことに なった', 'ように なった', 'わけには いかない'], why: 'そこで (so) leads to his own decision: ～ことに した.' },
      { options: ['しかし', 'そのうえ', 'たとえば', 'つまり'], why: 'It was hard at first, but things changed: しかし turns the story.' },
      { options: ['うちに', 'あいだ', 'ところに', 'までに'], why: '～て いる うちに: while he kept it up, something changed without him noticing.' },
      { options: ['たびに', 'ために', 'ように', 'ばかりに'], why: '～たびに means every time: every time she sees him.' },
      { options: ['だけで なく', 'かわりに', 'くせに', 'ところで'], why: '～だけで なく ～も: not only early rising, but also getting to know people.' },
    ],
  },
  {
    id: 'n3tg2',
    title: '弟の 夢',
    author: 'ハンナ・シュミット',
    text: 'わたしの 弟は 十五歳で、サッカーが 大好きだ。毎日 暗く なるまで 練習して いる。母の 話 {1}、弟は 将来 プロの 選手に なりたい {2}。\nしかし、両親は 弟の 夢に 賛成して いる {3}。サッカーより 勉強の ほうが 大切だと 考えて いるからだ。先月も、試験の 点が 悪かったので、弟は 父に 「しばらく 練習を 休みなさい」と 言われた。\nその 夜、弟は 自分の 部屋で 一人で 泣いて いた。わたしには 弟の 気持ちが よく わかった。わたしも 子どもの ころ、好きだった ピアノを やめ {4} 経験が あるからだ。\nそこで、わたしは 両親に 「勉強も ちゃんと する ことを 約束させるから、弟に 練習を 続け {5} ください」と お願いした。両親は しばらく 考えて、「それなら」と 言って くれた。',
    blanks: [
      { options: ['に よると', 'に とって', 'に ついて', 'に 対して'], why: '～に よると gives the source of what you heard: according to Mom.' },
      { options: ['らしい', 'ことに した', 'ために', 'ばかりだ'], why: 'She heard it from Mom, so it is hearsay: ～らしい.' },
      { options: ['わけでは ない', 'わけだ', 'に ちがいない', 'ことに して いる'], why: 'しかし and the next sentence show the parents do not really agree: ～わけでは ない.' },
      { options: ['させられた', 'させた', 'られる', 'させる'], why: 'She was made to quit piano by someone else: the causative passive させられた.' },
      { options: ['させて あげて', 'させられて', 'られて', 'て もらって'], why: 'She asks the parents to let her brother continue: 続けさせて あげて ください.' },
    ],
  },
  {
    id: 'n3tg3',
    title: 'はじめての 一人旅',
    author: 'ルーカス・ベルナール',
    text: '去年の 夏、はじめて 一人で 旅行に 出かけた。行き先は 北の 小さな 港町だ。\n駅に 着いた {1}、強い 雨が 降りだした。かさを 持って 来れば {2} と 思ったが、しかたが ない。駅の 前で 困って いると、店の おじさんが 古い かさを 貸して くれた。\nおじさんの {3}、ぬれ {4} 旅館まで 行く ことが できた。次の 日、かさを 返しに 行くと、おじさんは 「わざわざ 来て くれたのか」と 喜んで、魚の 干物まで くれた。\n旅行の 前は、一人で 大丈夫だろうかと 心配して いた。しかし、この 旅で、知らない 人の やさしさに 何度も 助けられた。一人旅だった {5}、こういう 出会いが あったのだと 思う。',
    blanks: [
      { options: ['とたん', 'あいだ', 'うちに', 'ついでに'], why: '～た とたん: the moment he arrived, the rain started.' },
      { options: ['よかった', 'いい', 'よくない', 'いけなかった'], why: '～ば よかった expresses regret: I should have brought an umbrella.' },
      { options: ['おかげで', 'せいで', 'くせに', 'ために'], why: 'The man helped him, so it is the good-result おかげで.' },
      { options: ['ずに', 'ながら', 'たら', 'させて'], why: 'ぬれずに means without getting wet.' },
      { options: ['からこそ', 'ばかりに', 'くせに', 'としても'], why: '～からこそ stresses the reason: precisely because he travelled alone.' },
    ],
  },
  {
    id: 'n3tg4',
    title: 'スマートフォンと わたし',
    author: 'グエン・ティ・ラン',
    text: '最近、スマートフォンを 使う 時間が 長く なりすぎて いる {1} 気が ついた。一日に 五時間 以上 使う 日も あった。\nスマートフォンは わたし {2} とても 便利な ものだ。地図も 辞書も 入って いるし、国の 家族とも すぐ 連絡できる。しかし、使えば 使う {3}、勉強や 寝る 時間が 減って いった。\nそこで、先月から、夜 十時を 過ぎたら スマートフォンを 使わない {4} して いる。その {5}、寝る 前に 本を 読む ことに した。はじめは 落ち着かなかったが、今では よく 眠れる ように なった。',
    blanks: [
      { options: ['ことに', 'ように', 'ために', 'ほどに'], why: '～ことに 気が つく: to notice that something is so.' },
      { options: ['に とって', 'に よって', 'に ついて', 'と して'], why: '～に とって gives the point of view: for me, it is very useful.' },
      { options: ['ほど', 'まで', 'うちに', 'たびに'], why: '～ば ～ほど: the more she used it, the less time she had.' },
      { options: ['ように', 'ために', 'ほうが', 'ばかり'], why: '～ない ように して いる: making a habit of not doing something.' },
      { options: ['かわりに', 'せいで', 'とおりに', 'くせに'], why: 'その かわりに: instead of the phone, she reads a book.' },
    ],
  },
  {
    id: 'n3tg5',
    title: 'わたしの アルバイト',
    author: 'チェ・ミンジュン',
    text: 'わたしは 週に 三回、駅前の 本屋で アルバイトを して いる。仕事は 本を 並べたり、レジで お金を 受け取ったり する ことだ。\n働き始めた ころ、店長から 「お客様には、必ず 目を 見て 『いらっしゃいませ』と 言う {1}」と 言われた。最初は はずかしくて、なかなか 大きな 声が 出なかった。{2}、毎日 言って いる うちに、だんだん 平気に なって きた。\n先週、小さな 女の子が 一人で 絵本を 買いに 来た。お金が 少し 足りなかった {3}、女の子は 泣きそうな 顔を して いた。すると、後ろに 並んで いた 男の人が 「これで 足りるかな」と 言って、十円玉を 二まい 出して くれた。女の子は 何度も 頭を 下げて、うれしそうに 帰って 行った。\nその 時、わたしは 本屋の 仕事 {4} 本を 売る だけでは ない と 思った。人と 人が 出会う 場所 {5} あるのだ。',
    blanks: [
      { options: ['ように', 'ために', 'ほど', 'ばかり'], why: '～ように 言う reports an instruction: he was told to do it.' },
      { options: ['けれども', 'そのうえ', 'それとも', 'たとえば'], why: 'It was hard at first, but he got used to it: けれども turns the story.' },
      { options: ['らしく', 'ように', 'ために', 'ほど'], why: 'He guesses from what he sees: it seemed (らしく) she was short of money.' },
      { options: ['とは', 'ほど', 'しか', 'さえ'], why: 'A とは B: he is thinking about what a bookshop job really is.' },
      { options: ['でも', 'しか', 'ほど', 'ばかり'], why: 'でも ある: it is also a place where people meet.' },
    ],
  },
];

export const N3_SHORT = [
  {
    id: 'n3short1',
    kind: 'notice',
    text: '町の 道場からの お知らせ\n来月から、子ども向けの 空手教室の 時間が 変わります。これまでは 土曜日の 午前に 行って いましたが、近くの 小学校の 行事と 重なる ことが 多いため、日曜日の 午後二時から 三時半までに 変更します。場所と 料金は 変わりません。新しい 時間に 来られない 方は、今月中に 受付まで ご連絡ください。来月の 予定表は、受付に 置いて あります。\n道場 事務室',
    questions: [
      {
        q: 'この お知らせで いちばん 伝えたい ことは 何か。',
        options: ['子どもの 空手教室の 曜日と 時間が 変わる こと。', '子どもの 空手教室の 場所と 料金が 変わる こと。', '小学校の 行事に 参加して ほしい こと。', '来月から 子どもの 空手教室が なくなる こと。'],
        why: 'The class moves from Saturday morning to Sunday afternoon; place and fee stay the same.',
      },
    ],
  },
  {
    id: 'n3short2',
    kind: 'email',
    text: '営業部の みなさん\nお疲れさまです。田中です。\n明日 十時からの 会議ですが、部長が 出張から 戻るのが 遅れる ため、午後二時からに 変更に なりました。場所は 同じ 三階の 会議室です。なお、会議で 使う 資料は、今日中に 私から メールで 送ります。各自 印刷して、会議の 前に 目を 通して おいて ください。資料が 届かない 場合は、私まで 連絡を お願いします。',
    questions: [
      {
        q: 'この メールを 読んだ 人は、会議の 前に 何を しなければ ならないか。',
        options: ['送られて きた 資料を 印刷して、読んで おく。', '三階の 会議室を 予約して おく。', '会議の 資料を 作って、田中さんに 送る。', '部長に 会議の 時間を 連絡する。'],
        why: 'Everyone must print the materials Tanaka sends and read them before the meeting.',
      },
    ],
  },
  {
    id: 'n3short3',
    kind: 'memo',
    text: 'レンへ\n今朝、急に 古い 友人に 会いに 行く ことに なった。帰りは 明日の 夕方の 予定だ。今日の 練習は いつもどおり やって おくように。ただし、カイトが 来ても、試合形式の 練習は しない こと。けがを した とき、止める 者が いないからだ。それから、夕方 米屋が 米を 届けに 来るので、代金を 払って おいて くれ。お金は 台所の 引き出しに 入れて ある。\n師匠',
    questions: [
      {
        q: 'レンが 今日 しては いけない ことは 何か。',
        options: ['カイトと 試合形式の 練習を する こと。', '一人で いつもの 練習を する こと。', '米屋に 代金を 払う こと。', '台所の 引き出しを 開ける こと。'],
        why: 'Normal training is fine, but no match-style sparring with Kaito while the Master is away.',
      },
    ],
  },
  {
    id: 'n3short4',
    kind: 'essay',
    text: '子どもの ころ、私は 失敗するのが こわくて、新しい ことに なかなか 手を 出せなかった。うまく できなかったら 笑われると 思って いたからだ。しかし、大人に なって わかったのは、失敗を 笑う 人は 思ったより 少ないと いう ことだ。むしろ、何かに 一生けんめい 取り組んで いる 人を 見ると、多くの 人は 応援したく なるものだ。失敗を おそれて 何も しないより、一歩 前に 出る ほうが ずっと 多くの ことを 学べる。',
    questions: [
      {
        q: '筆者の 考えに 合う ものは どれか。',
        options: ['失敗を おそれずに やって みる ほうが 学べる ことが 多い。', '失敗すると 多くの 人に 笑われるので、注意した ほうが いい。', '子どもの ころは 新しい ことを しない ほうが いい。', '何かに 取り組んで いる 人を 応援する 人は 少ない。'],
        why: 'The last sentence: stepping forward teaches far more than doing nothing out of fear.',
      },
    ],
  },
  {
    id: 'n3short5',
    kind: 'notice',
    text: 'さくら団地に お住まいの みなさまへ\n四月から、ごみの 出し方が 一部 変わります。これまで 毎週 水曜日に 集めて いた プラスチックごみは、第一と 第三 金曜日に 集める ことに なります。また、ごみは 必ず 当日の 朝 八時までに 出して ください。前の 晩に 出すと、鳥や ねこに 荒らされる ことが あります。燃える ごみの 日は、これまでどおり 月曜日と 木曜日です。\nさくら団地 管理事務所',
    questions: [
      {
        q: '四月から 変わる ことは 何か。',
        options: ['プラスチックごみを 集める 曜日', '燃える ごみを 集める 曜日', 'ごみを 出す 場所', 'ごみの 袋の 値段'],
        why: 'Plastic moves from every Wednesday to the first and third Fridays; burnable days stay the same.',
      },
    ],
  },
  {
    id: 'n3short6',
    kind: 'email',
    text: '山田 様\nこの たびは、当店で ご注文いただき、ありがとうございます。ご注文の 青い セーターですが、Mサイズが 品切れの ため、お届けが 二週間ほど 遅れる 予定です。お待ちいただける 場合は、このまま 手続きを 進めます。お急ぎの 場合は、同じ 形の 黒い セーターで あれば すぐに お送りできますので、今週の 金曜日までに ご返信ください。\nスポーツ用品店 ハヤテ',
    questions: [
      {
        q: '山田さんが 黒い セーターに したい 場合、どう しなければ ならないか。',
        options: ['金曜日までに 店に 返事を する。', '何も しないで 二週間 待つ。', '店に 行って 黒い セーターを 買う。', '青い セーターを 店に 送り返す。'],
        why: 'To get the black sweater right away, Yamada must reply by Friday. Doing nothing means waiting for the blue one.',
      },
    ],
  },
  {
    id: 'n3short7',
    kind: 'essay',
    text: '最近、駅で 立ったまま パンを 食べる 人を よく 見かける。忙しい 現代人に とって、食事は 短い 時間で すませる ものに なって しまったのかも しれない。しかし、食事は ただ おなかを いっぱいに する ための ものでは ない。家族や 友人と 話しながら ゆっくり 食べれば、料理の 味も よく わかるし、心も 休まる。一日に 一回でも いいから、時間を かけて 食事を 楽しむ ように したい。',
    questions: [
      {
        q: '筆者が いちばん 言いたい ことは 何か。',
        options: ['一日に 一回は ゆっくり 食事を 楽しみたい。', '忙しい ときは 立ったまま 食べても かまわない。', '食事は 短い 時間で すませる ほうが いい。', '友人と 話しながら 食べるのは よくない。'],
        why: 'The writer\'s point comes at the end: take time to enjoy at least one meal a day.',
      },
    ],
  },
  {
    id: 'n3short8',
    kind: 'notice',
    text: '市立図書館からの お知らせ\n六月一日から 十日まで、建物の 工事の ため 休館します。この 間、本を 返す ときは、正面入口の 横に ある ブックポストを ご利用ください。ただし、CDや DVDは こわれる おそれが あるため、ポストには 入れないで ください。これらは 十一日 以降に、カウンターまで お持ちください。休館中に 返す 期限が 来る ものは、自動的に 期限が のびます。',
    questions: [
      {
        q: '六月五日に DVDを 返したい 人は どう すれば いいか。',
        options: ['十一日 以降に カウンターへ 持って 行く。', '五日に ブックポストに 入れる。', '五日に カウンターへ 持って 行く。', '十日までに 図書館に 電話する。'],
        why: 'The library is closed until the 10th and DVDs may not go in the box, so bring them to the desk from the 11th.',
      },
    ],
  },
  {
    id: 'n3short9',
    kind: 'email',
    text: 'レン\nこの前は ありがとう。おかげで 足の けがも だいぶ よく なった。医者には、来週までは 走るなと 言われて いるけど、軽い 練習なら 始めても いいそうだ。だから、土曜日の 朝 道場に 行こうと 思う。ただ、試合形式の 練習は もう 少し 待って くれ。それと、借りて いた 本は その 時に 返す。おまえに 負けた ままで いる つもりは ないからな。\nカイト',
    questions: [
      {
        q: 'カイトは 土曜日に 何を する つもりか。',
        options: ['道場で 軽い 練習を して、本を 返す。', '道場で レンと 試合形式の 練習を する。', '病院へ 行って、足を みて もらう。', '道場まで 走って 行って、本を 借りる。'],
        why: 'He may do light training, so he will come to the dojo and return the book; sparring has to wait.',
      },
    ],
  },
  {
    id: 'n3short10',
    kind: 'memo',
    text: '中村さんへ\n午後、A社の 木村さんから 電話が ありました。来週 届ける 予定の 商品の 数を、百個から 百五十個に 増やして ほしいそうです。ただ、今 ある 商品だけでは 足りないかもしれません。木村さんには、明日の 昼までに 返事を すると 伝えて あります。その 前に、倉庫の 森さんに 商品が いくつ 残って いるか 確認して ください。よろしく お願いします。\n山口',
    questions: [
      {
        q: '中村さんは まず 何を しなければ ならないか。',
        options: ['森さんに 商品が いくつ あるか 確認する。', '木村さんに 電話で 返事を する。', '商品を 百五十個 注文する。', 'A社に 商品を 届ける。'],
        why: 'Before replying to Kimura, Nakamura must ask Mori how many are left.',
      },
    ],
  },
  {
    id: 'n3short11',
    kind: 'notice',
    text: '夏祭りの ボランティアを 求めて います\n今年も 八月の 第一土曜日に 夏祭りを 行います。会場の 準備や 片付けを 手伝って くださる 方を さがして います。高校生 以上なら、どなたでも 参加できます。参加できる 時間だけで かまいません。参加したい 方は、七月二十日までに 町内会館の 受付で、お名前と 連絡先を お書きください。当日は 動きやすい 服で お越しください。',
    questions: [
      {
        q: 'ボランティアに ついて 正しい ものは どれか。',
        options: ['都合の いい 時間だけ 手伝っても いい。', '中学生も 参加する ことが できる。', '朝から 夜まで 必ず 手伝わなければ ならない。', '祭りの 日に 会場で 申し込めば いい。'],
        why: 'Helping only for the hours you can is fine. It is high school and up, and you sign up by July 20.',
      },
    ],
  },
  {
    id: 'n3short12',
    kind: 'essay',
    text: '雨の 日が 好きだと 言うと、たいてい おどろかれる。たしかに、服は ぬれるし、出かけるのも 面倒に なる。けれども、雨の 日には 雨の 日に しか ない 楽しみが ある。窓の 外の 音を 聞きながら 本を 読むと、不思議と 集中できる。町の 音が 小さく なり、自分の 考えが はっきり 聞こえて くるような 気が するのだ。晴れの 日には 気が つかない 小さな 幸せを、雨は 教えて くれる。',
    questions: [
      {
        q: '筆者は 雨の 日に ついて どう 考えて いるか。',
        options: ['晴れの 日には 気が つかない 楽しみが ある。', '出かけるのが 面倒なので、好きでは ない。', '服が ぬれるので、本を 読む ことが できない。', '町が にぎやかに なって、楽しい。'],
        why: 'Rainy days have their own pleasures, small joys you miss on sunny days.',
      },
    ],
  },
];

export const N3_MID = [
  {
    id: 'n3mid1',
    title: '「すみません」と 「ありがとう」',
    text: '日本語を 勉強して いる 留学生から、こんな 質問を された ことが ある。「日本人は、どうして お礼を 言う ときにも 『すみません』と 言うのですか。」\n言われて みると、たしかに そうだ。道を 教えて もらった ときや、落とした ものを 拾って もらった とき、私たちは よく 「すみません」と 言う。本当は 「ありがとう」と 言う べき 場面で ある。\nこの 「すみません」には、相手に 手間を かけさせて 悪かったと いう 気持ちが 含まれて いるのだろう。感謝と おわびの 気持ちが、一つの ことばに 入って いるのだ。そう 考えると、便利な ことばでも ある。\nしかし、私は 最近、できるだけ 「ありがとう」と 言う ように して いる。きっかけは、ある 店員の ことばだった。「すみません」と 言われるより、「ありがとう」と 言われる ほうが、自分の した ことを 喜んで もらえた 気が して うれしいのだそうだ。たしかに、言われる 側に なって みると、その 気持ちは よく わかる。',
    questions: [
      {
        q: '留学生は 何を 不思議に 思ったか。',
        options: ['日本人が お礼を 言う ときにも 「すみません」と 言う こと。', '日本人が おわびの ときに 「ありがとう」と 言う こと。', '日本人が あまり お礼を 言わない こと。', '日本人が 道を ていねいに 教えて くれる こと。'],
        why: 'The student asked why Japanese people say すみません even when thanking someone.',
      },
      {
        q: '「便利な ことば」とは どういう 意味か。',
        options: ['一つの ことばで、感謝と おわびの 両方を 伝えられる。', 'どんな 相手にも 使えるので、ていねいだ。', '短くて、外国人にも 覚えやすい。', '店員が 客に 使う ことが できる。'],
        why: 'The sentence before says thanks and apology both fit into one word.',
      },
      {
        q: '筆者が 最近 「ありがとう」と 言う ように して いるのは なぜか。',
        options: ['「ありがとう」の ほうが、言われた 人が うれしいと わかったから', '「すみません」は 失礼な ことばだと 教えられたから', '留学生に 正しい 日本語を 教えたかったから', '店員に 「すみません」を やめて ほしいと 頼まれたから'],
        why: 'A shop worker said ありがとう feels better to hear, and the writer agreed.',
      },
    ],
  },
  {
    id: 'n3mid2',
    title: '師匠の 宿題',
    text: '大会まで あと 一か月と いう ある 朝、師匠は レンに 一本の ほうきを 渡した。「今日から 毎朝、神社の 階段を そうじしなさい。」\nレンは 耳を 疑った。大会前の 大事な 時期に、なぜ そうじなのか。しかし、師匠の 顔は まじめだった。しかたなく、レンは 次の 日から、百段 以上 ある 階段を 毎朝 一段ずつ はいた。\nほうきを 持つ 手には まめが できた。一週間 たつと、足が 重く なった。二週間 たつと、腰が 痛く なった。三週間 目には、文句を 言う 元気も なくなった。それでも、レンは 一日も 休まなかった。\nそして 大会の 一週間 前、久しぶりに カイトと 組手を した。すると、不思議な ことに、どんなに 動いても 体が ぶれない。足が 地面に しっかり ついて いる 感じが した。\n「やっと 気が ついたか。」\n道場の すみで 見て いた 師匠は、そう 言って 小さく 笑った。レンは ほうきを 持って いた 自分の 手を、じっと 見つめた。',
    questions: [
      {
        q: 'レンが 「耳を 疑った」のは なぜか。',
        options: ['大会の 前なのに、そうじを するように 言われたから', '師匠の 声が 小さくて、よく 聞こえなかったから', '神社の 階段が 百段 以上 あると 聞いたから', '大会が 一か月 後に なったと 言われたから'],
        why: 'He could not believe he was told to sweep steps at such an important time before the tournament.',
      },
      {
        q: '三週間 目の レンは どんな 様子だったか。',
        options: ['とても 疲れて いて、文句も 言わなく なった。', '足が 軽く なって、楽に そうじが できた。', '毎日 師匠に 文句を 言って いた。', 'そうじを 休んで、カイトと 練習して いた。'],
        why: 'By the third week he had no energy left even to complain, but still did not skip a day.',
      },
      {
        q: '師匠が レンに そうじを させたのは なぜだと 考えられるか。',
        options: ['レンの 足や 腰を 強く する ため', '神社を きれいに したかった ため', 'レンを 大会に 出させない ため', 'レンの 文句を 聞きたくなかった ため'],
        why: 'After weeks of stairs, his stance was rock solid in sparring: the sweeping was training.',
      },
    ],
  },
  {
    id: 'n3mid3',
    title: '昼寝の すすめ',
    text: '昼ご飯の 後、急に 眠く なった 経験は だれにでも あるだろう。これは 食べすぎの せいだけでは なく、人間の 体の リズムに よる ものだと 言われて いる。人の 体は、夜中だけで なく、午後の 早い 時間にも 眠く なる ように できて いるのだ。\nそこで、最近 注目されて いるのが 短い 昼寝で ある。午後に 十五分から 二十分ほど 眠ると、頭が すっきりして、その 後の 仕事や 勉強が よく 進むと いう。目を 閉じて 横に なるだけでも 効果が あるそうだ。実際に、社員の 昼寝を 認める 会社も 増えて きた。\nただし、昼寝には 注意する 点も ある。三十分 以上 眠って しまうと、深い 眠りに 入って しまい、起きた 後 かえって ぼんやりする。また、夕方に 昼寝を すると、夜 なかなか 眠れなく なる。昼寝は 「短く、早めに」が 大切なのだ。\n眠いのを がまんして 机に 向かうより、思いきって 少し 目を 閉じた ほうが、結果的に 時間を 上手に 使えるのかも しれない。',
    questions: [
      {
        q: '昼ご飯の 後に 眠く なるのは なぜだと 言って いるか。',
        options: ['人の 体が もともと 午後にも 眠く なる ように できて いるから', 'みんな 昼ご飯を 食べすぎて いるから', '夜中に よく 眠れて いないから', '午後の 仕事が つまらないから'],
        why: 'Not only overeating: the body is built to get sleepy in the early afternoon too.',
      },
      {
        q: '昼寝に ついて、正しい ものは どれか。',
        options: ['長く 眠ると、起きた 後 かえって 頭が はっきりしない。', '三十分 以上 眠った ほうが、頭が すっきりする。', '夕方に 昼寝を すると、夜 よく 眠れる。', '昼寝を 認める 会社は 少なく なって きた。'],
        why: 'Over thirty minutes you fall into deep sleep and wake up groggy.',
      },
      {
        q: '筆者の 考えに 合う ものは どれか。',
        options: ['眠い ときは 少し 寝た ほうが、時間を うまく 使える。', '眠くても がまんして 勉強を 続ける べきだ。', '昼寝は 体に 悪いので、しない ほうが いい。', '昼ご飯を 食べなければ、眠く ならない。'],
        why: 'The last paragraph: a short nap may use your time better than fighting sleep.',
      },
    ],
  },
  {
    id: 'n3mid4',
    title: '道に 迷う 楽しさ',
    text: '最近は、知らない 町へ 行っても、道に 迷う ことが ほとんど ない。スマートフォンの 地図を 見れば、目的地までの 道を すぐに 教えて くれるからだ。便利な 時代に なった ものだと 思う。\nしかし 先日、スマートフォンの 電池が 切れて しまい、久しぶりに 道に 迷った。はじめは あせったが、しかたなく 町の 人に 道を 聞きながら 歩く ことに した。すると、パン屋の 主人は 道を 教えて くれた うえに、「この 先の 公園の 桜が きれいだよ」と 教えて くれた。言われた とおり 寄って みると、本当に 見事な 桜だった。\n地図の とおりに 歩いて いたら、あの 桜を 見る ことは なかっただろう。目的地に 早く 着く ことだけを 考えて いると、途中に ある すてきな ものを 見落として しまう。\nもちろん、急いで いる ときは 地図が 役に 立つ。それでも、たまには 地図を 閉じて、町を 自由に 歩いて みるのも いいのでは ないだろうか。',
    questions: [
      {
        q: '筆者が 道に 迷ったのは なぜか。',
        options: ['スマートフォンの 電池が なくなったから', 'スマートフォンの 地図が まちがって いたから', 'パン屋の 主人が まちがった 道を 教えたから', '公園で 桜を 見て いたから'],
        why: 'The phone battery died, so there was no map.',
      },
      {
        q: '「あの 桜」とは どんな 桜か。',
        options: ['パン屋の 主人に 教えて もらった 公園の 桜', '地図で 見つけた 有名な 桜', '目的地の 前に あった 桜', '筆者が 子どもの ころに 見た 桜'],
        why: 'The baker told the writer about the cherry blossoms in the park ahead.',
      },
      {
        q: '筆者の 考えに 合う ものは どれか。',
        options: ['ときどきは 地図を 使わずに 歩くのも いい。', 'スマートフォンの 地図は 使わない ほうが いい。', '急いで いる ときも 町の 人に 道を 聞く べきだ。', '知らない 町には 行かない ほうが いい。'],
        why: 'Maps help when you are in a hurry, but now and then it is good to close them and wander.',
      },
    ],
  },
  {
    id: 'n3mid5',
    title: '祖母の ノート',
    text: '祖母が 亡くなって 一年が たった ころ、母が 古い ノートを 見つけた。表紙には、祖母の 字で 「料理」と だけ 書いて あった。\n中を 開くと、にものや みそしるの 作り方が 細かく 書いて あった。ところが、よく 読むと、少し 変わって いる。「しょうゆ 少し」「さとうは 好きなだけ」「火は 様子を 見て」など、はっきりした 量が ほとんど 書かれて いないのだ。これでは、作り方が わからない。\nそれでも、母と 私は 祖母の にものを 作って みる ことに した。何度も 味を 見て、「もう 少し あまかった」「いや、もっと しょうゆの 味が した」と 言い合いながら、少しずつ 味を 近づけて いった。三回 目に 作った とき、母が 「これだ」と 小さな 声で 言った。\n今 思うと、祖母は わざと 量を 書かなかったのかも しれない。料理の 好みは 人に よって 違う。ノートの とおりに 作るより、食べる 人の 顔を 思い出しながら 作りなさい。そう 言いたかったような 気が するのだ。',
    questions: [
      {
        q: 'ノートの 作り方が 「少し 変わって いる」のは なぜか。',
        options: ['材料の 量が はっきり 書かれて いないから', '祖母の 字が 読みにくいから', '作り方が 一つしか 書かれて いないから', '外国の 料理の 作り方だったから'],
        why: 'Notes like "a little soy sauce" give almost no exact amounts.',
      },
      {
        q: '母が 「これだ」と 言ったのは なぜか。',
        options: ['祖母の にものと 同じ 味に なったから', 'ノートの 最後の ページを 見つけたから', '三回 作って、もう 作りたくなかったから', '母が 一人で 作った にものが おいしかったから'],
        why: 'After three tries the taste finally matched Grandma\'s.',
      },
      {
        q: '筆者は、祖母が 量を 書かなかったのは なぜだと 考えて いるか。',
        options: ['食べる 人の ことを 考えて 作って ほしかったから', '量を 書くのが 面倒だったから', '料理の 作り方を 忘れて しまったから', '家族に 料理を 作って ほしくなかったから'],
        why: 'The writer thinks Grandma wanted them to cook thinking of the people who would eat.',
      },
    ],
  },
];

export const N3_LONG = [
  {
    id: 'n3long1',
    title: 'ほめる ことと しかる こと',
    text: '子どもを 育てる とき、ほめる ほうが いいのか、しかる ほうが いいのか。これは、親や 先生なら 一度は 考えた ことの ある 問題だろう。\n私は 中学生の ころ、陸上部に 入って いた。当時の コーチは とても きびしい 人で、記録が 悪いと 大きな 声で しかった。私たちは しかられないように 必死で 走った。たしかに 記録は のびたが、走るのが 楽しいと 思った ことは 一度も なかった。練習の 前の 日は、いつも 気が 重かった。卒業と 同時に、私は 走るのを やめて しまった。\n高校で もう 一度 陸上部に 入ると、コーチの タイプは まったく 違った。新しい コーチは ほとんど しからなかった。その かわり、私たちの 走りを よく 見て いて、「今日は 腕の ふり方が よかった」「スタートが 前より 速く なった」と、具体的に ほめて くれた。ほめられると、もっと うまく なりたいと 思う ように なる。私は 自分から 練習の 方法を 調べたり、先ぱいに 質問したり する ように なった。そして、記録も 中学の ころより ずっと のびた。\nでは、しかる ことは 必要ないのだろうか。私は そうは 思わない。高校の コーチも、私たちが 練習を なまけたり、仲間を 大切に しなかったり した ときには、きびしく しかった。大切なのは、何の ために しかるのかが 相手に 伝わる ことでは ないだろうか。\nほめる ことも しかる ことも、相手を よく 見て いなければ できない。結局 いちばん 大切なのは、相手に 関心を 持ち 続ける ことなのだと 思う。',
    questions: [
      {
        q: '中学生の ころ、筆者は 走る ことを どう 感じて いたか。',
        options: ['楽しいと 思った ことは なかった。', '記録が のびて、楽しかった。', 'コーチに ほめられて、うれしかった。', 'しかられても、走るのが 好きだった。'],
        why: 'His times improved, but he never once enjoyed running and quit after graduating.',
      },
      {
        q: '高校の コーチは どんな 人だったか。',
        options: ['選手の 走りを よく 見て、よかった 点を ほめる 人', '記録が 悪いと 大きな 声で しかる 人', '一度も しからない、やさしい 人', '練習の 方法を 選手に 全部 教える 人'],
        why: 'He watched closely and praised specific things. He did scold sometimes, so 一度も しからない is wrong.',
      },
      {
        q: '高校生に なって、筆者は どう 変わったか。',
        options: ['自分から 練習の 方法を 調べる ように なった。', '走るのを やめて しまった。', '先ぱいに 練習の 方法を 教える ように なった。', 'コーチに しかられないように 走る ように なった。'],
        why: 'Praise made him want to improve, so he looked up training methods himself.',
      },
      {
        q: '筆者が いちばん 言いたい ことは 何か。',
        options: ['ほめるにも しかるにも、相手に 関心を 持つ ことが 大切だ。', '子どもは しからずに ほめて 育てる ほうが いい。', 'きびしい コーチの ほうが 記録は のびる。', 'しかる ときは 大きな 声を 出す べきだ。'],
        why: 'The conclusion: both need you to watch the person, so staying interested in them matters most.',
      },
    ],
  },
  {
    id: 'n3long2',
    title: '商店街に 戻った 声',
    text: '私の 生まれた 町には、駅から まっすぐ のびる 小さな 商店街が ある。子どもの ころは、八百屋や 魚屋、本屋などが 並び、夕方に なると 買い物客で いっぱいだった。\nところが、十年ほど 前に、町の 外に 大きな ショッピングセンターが できてから、様子が 変わった。車で 行けば 何でも そろうので、商店街に 来る 人は 年々 減り、店も 一けん、また 一けんと 閉まって いった。久しぶりに 帰った とき、シャッターの 閉まった 通りを 見て、私は ことばを 失った。\nその 商店街が、最近 少しずつ にぎやかさを 取り戻して いると いう。話を 聞きに 行くと、きっかけを 作ったのは 町の 高校生たちだった。授業で 町の 問題を 調べた 生徒たちが、「空いて いる 店を 使わせて ほしい」と 商店街の 人たちに 頼んだのだ。\n生徒たちは 空いた 店を 借りて、週末だけの 小さな カフェを 開いた。最初の 週末に 来た 客は、たった 十人ほどだったと いう。しかし、生徒たちは あきらめずに、町の あちこちに 手作りの ポスターを はった。メニューは、商店街の 店で 買った 材料を 使った パンや ケーキだ。カフェに 来た 客が、ついでに 近くの 店に 寄る ように なり、通りに 少しずつ 人が 戻って きた。今では、カフェを 見て、商店街で 新しく 店を 始める 若い 人も 出て きたそうだ。\n八百屋の 主人は、「若い 人の 力は すごい。でも、いちばん うれしいのは、店の 前で また 子どもの 声が 聞こえる ように なった ことだよ」と 笑った。町を 元気に するのは、大きな 建物では なく、人と 人との つながりなのかも しれない。',
    questions: [
      {
        q: '商店街に 来る 人が 減ったのは なぜか。',
        options: ['車で 行ける 大きな 店が できたから', '駅が 遠くへ 移ったから', '店の 主人たちが 年を 取ったから', '商店街の 店の 値段が 高く なったから'],
        why: 'A big shopping center opened outside town, where you could get everything by car.',
      },
      {
        q: '「ことばを 失った」とき、筆者は どんな 気持ちだったか。',
        options: ['商店街の 変わりように 強い ショックを 受けた。', '久しぶりに 町に 帰って、うれしかった。', '店の シャッターが 新しく なって、おどろいた。', '商店街の 人に 何と 言えば いいか 考えて いた。'],
        why: 'Seeing the street of closed shutters left the writer speechless with shock.',
      },
      {
        q: '高校生たちは 何を したか。',
        options: ['空いて いる 店を 借りて、週末に カフェを 開いた。', '商店街の 店で アルバイトを 始めた。', 'ショッピングセンターで パンを 売った。', '授業で 商店街の 歴史を 発表した。'],
        why: 'They borrowed an empty shop and ran a weekend cafe with ingredients from the street.',
      },
      {
        q: '八百屋の 主人が いちばん うれしいと 思って いるのは 何か。',
        options: ['また 子どもの 声が 聞こえる ように なった こと', '若い 人が 新しく 店を 始めた こと', '野菜が たくさん 売れる ように なった こと', 'カフェで パンや ケーキが 食べられる こと'],
        why: 'He says what makes him happiest is hearing children\'s voices in front of the shop again.',
      },
    ],
  },
  {
    id: 'n3long3',
    title: 'ライバルからの 手紙',
    text: '京都の 大会から 一年。全国大会の 予選を 一週間 後に ひかえた 夜、ハルトの もとに 一通の 手紙が 届いた。手紙を 送って きたのは ソウタだった。\nソウタは 半年前、父親の 仕事の 都合で 遠くの 町へ 引っ越して いた。別れの 日、二人は 駅の ホームで 「次は 予選で 会おう」と だけ 言って 別れた。それ以来、電話も メールも 一度も ない。いかにも ソウタらしいと、ハルトは 思って いた。そう 思う ハルト自身も、一度も 連絡して いなかったのだが。\n手紙には、短い 文が 並んで いた。新しい 道場で 毎日 遅くまで 練習して いる こと。そこの 先生が とても きびしい こと。そして 最後に、こう 書いて あった。\n「正直に 言うと、こっちに 来た ばかりの ころは、おまえと 練習できないのが つらかった。一人で 練習して いても、何かが 足りなかった。でも、今は わかる。おまえが いなくても、おまえに 勝つ ために 練習して いる 自分が いる。予選で 待って いる。手かげんは するなよ。」\nハルトは 手紙を 二回 読んだ。読み終わると、胸の 奥が 熱く なった。それから、何も 言わずに 外へ 出た。夜の 道場は しんと して いた。\n「どうした、こんな 時間に。」\nふりむくと、道場の 先生が 立って いた。ハルトは 手紙の ことを 話した。先生は しばらく だまって 聞いて いたが、やがて 静かに 言った。\n「ライバルと いうのは、となりに いなくても 力を くれる ものだ。」\nハルトは うなずいて、帯を 強く しめ直した。月の 光の 中で、一人きりの 練習が 始まった。',
    questions: [
      {
        q: 'ソウタが 遠くの 町に 引っ越したのは なぜか。',
        options: ['父親の 仕事の 都合で', '新しい 道場で 練習する ために', '全国大会の 予選に 出る ために', 'ハルトと けんかを したから'],
        why: 'He moved because of his father\'s work.',
      },
      {
        q: 'ハルトが 「ソウタらしい」と 思ったのは、ソウタの どんな ところか。',
        options: ['別れて から 一度も 連絡して こなかった ところ', '長い 手紙を 書いて きた ところ', '新しい 道場で 毎日 練習して いる ところ', '駅の ホームで 泣いて いた ところ'],
        why: 'No calls or emails since parting: Haruto found that very like Sota.',
      },
      {
        q: '手紙で ソウタが いちばん 伝えたかった ことは 何か。',
        options: ['予選では お互いに 全力で 戦おう と いう こと', '新しい 道場の 先生が きびしい と いう こと', 'さびしいので、前の 町に 帰りたい と いう こと', '予選には 出ない ことに した と いう こと'],
        why: 'The letter ends with "I\'ll be waiting at the qualifier. Don\'t hold back."',
      },
      {
        q: '先生の ことばの 意味に 近い ものは どれか。',
        options: ['ライバルは はなれて いても、がんばる 力を くれる。', 'ライバルとは いつも いっしょに 練習した ほうが いい。', 'ライバルが いなければ、強く なる ことは できない。', 'ライバルの 手紙には すぐ 返事を 書く べきだ。'],
        why: 'A rival gives you strength even when he is not beside you.',
      },
    ],
  },
];

export const N3_INFO = [
  {
    id: 'n3info1',
    kind: 'poster',
    title: 'さくら市 スポーツセンター 利用料金',
    lead: '月曜日は 休みです（祝日の 場合は 次の 日）',
    table: {
      head: ['しせつ', '利用できる 時間', '大人（高校生 以上）', '中学生 以下'],
      rows: [
        ['プール', '9:00〜21:00', '1回 400円', '1回 200円'],
        ['トレーニング室', '9:00〜22:00', '1回 300円', '利用できません'],
        ['体育館（半面）', '9:00〜22:00', '1時間 1,200円', '1時間 600円'],
        ['テニスコート（1面）', '7:00〜19:00', '1時間 800円', '1時間 400円'],
        ['武道場', '9:00〜21:00', '1時間 1,000円', '1時間 500円'],
      ],
    },
    notes: [
      '体育館・テニスコート・武道場の 料金は、利用する 人数に 関係なく、場所を 借りる 料金です。',
      '土曜日・日曜日・祝日は、体育館・テニスコート・武道場の 料金が 1時間 200円 高く なります。',
      'トレーニング室を 初めて 利用する 方は、受付で 30分の 説明（無料）を 受けて ください。',
      '予約は 利用する 日の 1か月前から、電話か 受付で できます。',
    ],
    questions: [
      {
        q: 'レンさん（17歳）は 道場の 仲間 5人と いっしょに、土曜日の 午後に 武道場を 2時間 借りたい。料金は 全部で いくらか。',
        options: ['2,400円', '2,000円', '12,000円', '14,400円'],
        why: 'The hall is charged per hour, not per person: (1,000 + 200 for Saturday) x 2 hours = 2,400 yen.',
      },
      {
        q: 'ソラくん（10歳）と お母さんは、水曜日に 二人で プールを 利用する。その 後、お母さんだけ 初めて トレーニング室を 利用する。料金は 全部で いくらか。',
        options: ['900円', '600円', '1,200円', '1,000円'],
        why: 'Pool: 200 (child) + 400 (adult); training room 300 for Mom, and the briefing is free. Total 900 yen.',
      },
    ],
  },
  {
    id: 'n3info2',
    kind: 'notice',
    title: 'ラーメン はやて 駅前店 アルバイト 募集',
    lead: 'いっしょに 働きませんか。経験が なくても 大丈夫です。',
    table: {
      head: ['時間帯', '時間', '時給', '仕事の 内容'],
      rows: [
        ['朝', '7:00〜11:00', '1,100円', '料理の 準備・そうじ'],
        ['昼', '11:00〜15:00', '1,050円', '注文を 聞く・料理を 運ぶ'],
        ['夕方', '15:00〜19:00', '1,050円', '注文を 聞く・皿洗い'],
        ['夜', '19:00〜23:00', '1,200円', '注文を 聞く・片付け'],
      ],
    },
    notes: [
      '高校生は 夜の 時間帯には 働けません。',
      '週 2日、1日 1つの 時間帯から 働けます。',
      '土曜日・日曜日に 働く 場合は、時給が 100円 上がります。',
      '交通費は 1日 500円まで 出ます。',
      '働きたい 方は、写真を はった りれきしょを 持って、店まで 来て ください。',
    ],
    questions: [
      {
        q: '高校生の ミナさんは、平日の 学校の 後に 働きたい。授業は 2時に 終わり、学校から 店までは 30分 かかる。どの 時間帯なら 働けるか。',
        options: ['夕方', '昼', '夜', '朝'],
        why: 'She can reach the shop at 2:30, so the evening slot from 3:00 fits. High school students cannot do nights.',
      },
      {
        q: '大学生の ケンさんは、土曜日に 夜の 時間帯で 働く。1日に もらえる お金は、交通費を 入れないで いくらか。',
        options: ['5,200円', '4,800円', '5,600円', '4,400円'],
        why: 'Night pays 1,200 yen, plus 100 on Saturday: 1,300 x 4 hours = 5,200 yen.',
      },
    ],
  },
  {
    id: 'n3info3',
    kind: 'timetable',
    title: '高速バス 時刻表（さくら駅前 → みなと温泉）',
    lead: '毎日 同じ 時刻で 走ります。',
    table: {
      head: ['バス', 'さくら駅前 発', 'みなと温泉 着', '片道 料金（大人）'],
      rows: [
        ['1号', '7:30', '10:10', '2,800円'],
        ['3号', '9:00', '11:40', '2,800円'],
        ['5号（直行）', '10:30', '12:30', '3,300円'],
        ['7号', '13:00', '15:40', '2,800円'],
        ['9号（直行）', '15:30', '17:30', '3,300円'],
      ],
    },
    notes: [
      '小学生の 料金は、大人の 半分です。',
      '直行バスは 予約が 必要です。乗る 日の 前の 日までに、電話で 予約して ください。',
      '直行バス 以外の バスは、途中で 15分 休みます。',
      '往復きっぷを 買うと、片道 料金の 2倍より 500円 安く なります。',
    ],
    questions: [
      {
        q: 'マリさんは 予約を して いない。今日の 朝 8時50分に さくら駅前に 着いた。12時までに みなと温泉に 着きたい。どの バスに 乗るか。',
        options: ['3号', '1号', '5号（直行）', '7号'],
        why: 'The 1 has gone; the 5 needs a booking and arrives too late anyway. The 3 leaves at 9:00 and arrives 11:40.',
      },
      {
        q: '大人 1人と 小学生 1人が、9号で みなと温泉へ 行く。片道の 料金は 二人で いくらか。',
        options: ['4,950円', '6,600円', '3,300円', '4,200円'],
        why: 'Adult 3,300 yen plus half for the child, 1,650 yen: 4,950 yen.',
      },
    ],
  },
];
