// Ren's Messages: a phone-style thread from Ren (Kaito and the Master join later). Original writing.
// Each message: who sends it, its tier (1 kana-only polite, 2 casual speech, 3 N4 grammar), the story chapter it
// waits for (if any), the text with kanji (jp) and in kana with spaces (kana, shown until every kanji in jp is known),
// an English line, the Garden words it uses (ids from GARDEN_CATALOG; at most one may be new to the learner when it
// arrives), a "what did they mean?" question (right answer first), and 2-3 replies. A reply's `next` picks the next
// message. Every message is voiced in its sender's VOICEVOX voice (tools/collect.mjs).

import { N4_MESSAGES, N4_WELCOME_BACK } from './n4-extras.js';
import { N3_MESSAGES, N3_WELCOME_BACK } from './n3-extras.js';
import { GARDEN_CATALOG, deckIdFor } from './data.js';
import { tagLevel } from './level-tag.js';

/** M(id, from, tier, jp, kana, en, words, meaning [right, wrong, wrong], replies, extra) */
const M = (id, from, tier, jp, kana, en, words, meaning, replies, extra = {}) => ({ id, from, tier, jp, kana, en, words, meaning, replies, after: null, ...extra });
/** R(reply text, English, next message id or null) */
const R = (jp, en, next = null) => ({ jp, en, next });

export const SENDERS = {
  ren: { name: 'Ren', jpName: 'レン', voice: 1, color: 'var(--accent)' },
  kaito: { name: 'Kaito', jpName: 'カイト', voice: 3, color: 'var(--trace)', after: 'ch2' },
  master: { name: 'Master', jpName: '師匠', voice: 2, color: 'var(--good)', after: 'ch4' },
};

export const MESSAGES = [
  // ---------- Tier 1: kana only, polite ----------
  M('r1', 'ren', 1, 'こんにちは！ レンです。よろしく おねがいします！', 'こんにちは！ れんです。よろしく おねがいします！',
    "Hello! I'm Ren. Nice to meet you!", ['konnichiwa'],
    ['Ren is saying hello and introducing himself.', 'Ren is saying goodbye.', 'Ren is asking for help.'],
    [R('はじめまして！', 'Nice to meet you!', 'r2'), R('こんにちは！', 'Hello!', 'r2')]),
  M('r2', 'ren', 1, 'わたしは がくせいです。あなたも がくせいですか。', 'わたしは がくせいです。あなたも がくせいですか。',
    "I'm a student. Are you a student too?", ['n5:私', 'n5:学生', 'n5:あなた'],
    ['Ren is a student and asks if you are one too.', 'Ren is a teacher.', "Ren doesn't like school."],
    [R('はい、がくせいです。', "Yes, I'm a student.", 'r3'), R('いいえ、がくせいじゃないです。', "No, I'm not a student.", 'r3')]),
  M('r3', 'ren', 1, 'そうですか！ まいにち どうじょうで れんしゅう します。', 'そうですか！ まいにち どうじょうで れんしゅう します。',
    'I see! I practise at the dojo every day.', ['n5:毎日', 'n5:練習する'],
    ['Ren practises at the dojo every day.', 'Ren goes to the dojo once a week.', 'Ren is tired of practice.'],
    [R('すごいですね！', "That's amazing!", 'r4'), R('がんばって ください！', 'Good luck!', 'r4')]),
  M('r4', 'ren', 1, 'ありがとう！ あなたは なにが すきですか。', 'ありがとう！ あなたは なにが すきですか。',
    'Thanks! What do you like?', ['arigatou', 'n5:何', 'n5:好き'],
    ['Ren asks what you like.', 'Ren asks where you live.', 'Ren asks your name.'],
    [R('アニメが すきです！', 'I like anime!', 'r5'), R('ねこが すきです。', 'I like cats.', 'r6')]),
  M('r5', 'ren', 1, 'ぼくも アニメが だいすきです！ いっしょに みましょう！', 'ぼくも アニメが だいすきです！ いっしょに みましょう！',
    "I love anime too! Let's watch together!", ['n5:大好き', 'n5:一緒に', 'n5:見る'],
    ['Ren loves anime too and wants to watch together.', "Ren doesn't watch anime.", 'Ren wants to draw anime.'],
    [R('はい、みましょう！', "Yes, let's watch!"), R('いいですね！', 'Sounds good!')]),
  M('r6', 'ren', 1, 'ねこ、かわいいですね！ ぼくの いえにも ねこが います。', 'ねこ、かわいいですね！ ぼくの いえにも ねこが います。',
    "Cats are cute! There's a cat at my house too.", ['neko', 'n5:可愛い', 'n5:家'],
    ['Ren has a cat at home too.', 'Ren is afraid of cats.', 'Ren wants a dog.'],
    [R('なまえは なんですか。', "What's its name?"), R('いいですね！', 'Nice!')]),
  M('r7', 'ren', 1, 'おはようございます！ きょうは いい てんきですね。', 'おはようございます！ きょうは いい てんきですね。',
    "Good morning! Nice weather today, isn't it?", ['n5:おはようございます', 'n5:今日', 'n5:天気'],
    ["Ren says good morning and that the weather is nice.", "Ren says it's raining.", 'Ren says good night.'],
    [R('はい、いい てんきです！', "Yes, it's nice weather!", 'r8'), R('ちょっと さむいです。', "It's a little cold.", 'r8')]),
  M('r8', 'ren', 1, 'こうえんを はしりませんか。', 'こうえんを はしりませんか。',
    "Want to go for a run in the park?", ['n5:公園', 'n5:走る'],
    ['Ren invites you to run in the park.', 'Ren is at the hospital.', 'Ren asks where the park is.'],
    [R('いいですね！', 'Sounds good!'), R('きょうは ちょっと……', "Today's a bit…")]),
  M('r9', 'ren', 1, 'いま ラーメンを たべて います。おいしいです！', 'いま ラーメンを たべて います。おいしいです！',
    "I'm eating ramen right now. It's delicious!", ['n5:今', 'n5:食べる', 'n5:美味しい'],
    ['Ren is eating ramen and it tastes good.', 'Ren is cooking ramen for you.', "Ren doesn't like ramen."],
    [R('いいですね！ わたしも たべたいです。', 'Nice! I want some too.', 'r10'), R('どこの みせですか。', 'Which shop?', 'r10')]),
  M('r10', 'ren', 1, 'えきの ちかくの みせです。こんど いっしょに いきましょう。', 'えきの ちかくの みせです。こんど いっしょに いきましょう。',
    "It's the shop near the station. Let's go together next time.", ['n5:駅', 'n5:近く', 'n5:店', 'n5:行く'],
    ["The shop is near the station; Ren wants to go together.", 'The shop is far from the station.', 'The shop is closed.'],
    [R('はい、ぜひ！', 'Yes, definitely!'), R('ありがとう！', 'Thanks!')]),
  M('r11', 'ren', 1, 'すみません、きょうは いそがしいです。あした はなしましょう！', 'すみません、きょうは いそがしいです。あした はなしましょう！',
    "Sorry, I'm busy today. Let's talk tomorrow!", ['sumimasen', 'n5:忙しい', 'n5:明日', 'n5:話す'],
    ["Ren is busy today and will talk tomorrow.", 'Ren is free today.', 'Ren is sick.'],
    [R('わかりました！', 'Got it!'), R('がんばって ください！', 'Hang in there!')]),
  M('r12', 'ren', 1, 'あめです。かさが ありません……。', 'あめです。かさが ありません……。',
    "It's raining. I don't have an umbrella…", ['n5:雨', 'n5:傘', 'n5:ある'],
    ["It's raining and Ren has no umbrella.", "Ren bought a new umbrella.", "It's sunny."],
    [R('だいじょうぶですか。', 'Are you okay?', 'r13'), R('はしって ください！', 'Run!', 'r13')]),
  M('r13', 'ren', 1, 'だいじょうぶです！ コンビニで かさを かいました。', 'だいじょうぶです！ コンビニで かさを かいました。',
    "I'm fine! I bought an umbrella at the convenience store.", ['daijoubu', 'n5:傘', 'n5:買う'],
    ['Ren bought an umbrella, so he is fine.', 'Ren got wet.', 'Ren lost his umbrella.'],
    [R('よかったです！', "That's good!"), R('ははは！', 'Haha!')]),
  M('r14', 'ren', 1, 'しゅくだいが おおいです。たすけて ください！', 'しゅくだいが おおいです。たすけて ください！',
    'I have so much homework. Please help!', ['n5:宿題', 'n5:多い'],
    ['Ren has lots of homework and asks for help.', 'Ren finished his homework.', 'Ren gives you homework.'],
    [R('いっしょに しましょう。', "Let's do it together."), R('がんばって！', 'You can do it!')]),
  M('r15', 'ren', 1, 'きのう ししょうと れんしゅうしました。たいへんでした！ でも げんきです！', 'きのう ししょうと れんしゅうしました。たいへんでした！ でも げんきです！',
    "Yesterday I practised with the Master. It was tough! But I'm fine!", ['n5:昨日', 'n5:大変', 'n5:元気'],
    ['Ren practised hard with the Master, but he is okay.', 'Ren skipped practice.', 'Ren is sad and quit.'],
    [R('おつかれさまでした！', 'Good work!'), R('レンさん、がんばって！', 'Hang in there, Ren!')], { after: 'ch1' }),
  M('r16', 'ren', 1, 'おやすみなさい！ また あした。', 'おやすみなさい！ また あした。',
    'Good night! See you tomorrow.', ['n5:おやすみなさい', 'n5:明日'],
    ['Ren says good night.', 'Ren says good morning.', 'Ren says he is hungry.'],
    [R('おやすみなさい！', 'Good night!'), R('また あした！', 'See you tomorrow!')]),

  // ---------- Tier 2: casual speech, kanji once known ----------
  M('r20', 'ren', 2, '今日、カイトに 会った。あいつ、また 勝負しようって。', 'きょう、かいとに あった。あいつ、また しょうぶしようって。',
    'I ran into Kaito today. That guy wants another match.', ['n5:今日', 'n5:会う'],
    ['Kaito wants to fight Ren again.', 'Kaito says sorry to Ren.', 'Kaito moved away.'],
    [R('がんばって！', 'Go for it!', 'r21'), R('また？ すごいね。', 'Again? Wow.', 'r21')], { after: 'ch2' }),
  M('r21', 'ren', 2, '今度は ぜったい 負けない。いっしょに 練習しない？', 'こんどは ぜったい まけない。いっしょに れんしゅうしない？',
    "I'm definitely not losing next time. Want to practise together?", ['n5:練習する', 'n5:一緒に'],
    ['Ren wants to practise together so he won\'t lose.', 'Ren wants to stop practising.', 'Ren already lost.'],
    [R('うん、しよう！', "Yeah, let's!"), R('いいよ！', 'Sure!')]),
  M('r22', 'ren', 2, 'ねえ、週末 ひま？ 映画 見に 行かない？', 'ねえ、しゅうまつ ひま？ えいが みに いかない？',
    'Hey, free this weekend? Want to go see a movie?', ['n5:暇', 'n5:映画', 'n5:行く'],
    ['Ren is asking you to a movie this weekend.', 'Ren is busy this weekend.', 'Ren saw a movie last week.'],
    [R('行く行く！', "I'm in!", 'r23'), R('ごめん、ちょっと いそがしい。', 'Sorry, a bit busy.', 'r24')]),
  M('r23', 'ren', 2, 'やった！ じゃあ 土曜日の 午後、駅で 待ってる。', 'やった！ じゃあ どようびの ごご、えきで まってる。',
    "Yes! Then I'll wait at the station on Saturday afternoon.", ['n5:土曜日', 'n5:午後', 'n5:駅', 'n5:待つ'],
    ["They'll meet at the station on Saturday afternoon.", 'They meet on Sunday morning.', 'Ren cancels.'],
    [R('わかった！', 'Got it!'), R('楽しみ！', "Can't wait!")]),
  M('r24', 'ren', 2, 'そっか。じゃあ また 今度ね！ 無理しないで。', 'そっか。じゃあ また こんどね！ むりしないで。',
    "I see. Next time then! Don't push yourself.", ['n5:また'],
    ["Ren is fine with next time and tells you not to overdo it.", 'Ren is angry.', 'Ren will go alone.'],
    [R('ありがとう！', 'Thanks!'), R('うん、また 今度！', 'Yeah, next time!')]),
  M('r25', 'ren', 2, '朝ご飯、何 食べた？ ぼくは パンと 牛乳。', 'あさごはん、なに たべた？ ぼくは ぱんと ぎゅうにゅう。',
    'What did you have for breakfast? I had bread and milk.', ['n5:朝ご飯', 'n5:パン', 'n5:牛乳'],
    ['Ren asks about your breakfast; he had bread and milk.', 'Ren skipped breakfast.', 'Ren cooked rice.'],
    [R('ご飯と みそしる！', 'Rice and miso soup!'), R('何も 食べなかった……', "I didn't eat anything…")]),
  M('r26', 'ren', 2, 'この 漢字、むずかしすぎる！ どうやって 覚えてる？', 'この かんじ、むずかしすぎる！ どうやって おぼえてる？',
    'These kanji are way too hard! How do you remember them?', ['n5:漢字', 'n5:難しい', 'n5:覚える'],
    ['Ren finds kanji too hard and asks how you remember them.', 'Ren thinks kanji are easy.', 'Ren forgot his book.'],
    [R('毎日 少しずつ！', 'A little every day!'), R('書いて 覚える。', 'I write them to remember.')]),
  M('r27', 'ren', 2, '師匠が 「まだまだだ」って。でも、ちょっと 笑ってた。', 'ししょうが 「まだまだだ」って。でも、ちょっと わらってた。',
    'The Master said "Not yet." But he was smiling a little.', ['n5:ちょっと'],
    ['The Master said Ren is not there yet, but he smiled.', 'The Master was very angry.', 'The Master praised Ren a lot.'],
    [R('いい しるしだね！', "That's a good sign!"), R('よかったね！', 'Good for you!')], { after: 'ch4' }),
  M('r28', 'ren', 2, '大会の おしらせ、見た？ ぼく、出るよ！', 'たいかいの おしらせ、みた？ ぼく、でるよ！',
    "Did you see the tournament notice? I'm entering!", ['n5:見る', 'n5:出る'],
    ['Ren is entering the tournament.', 'Ren will just watch the tournament.', 'The tournament was cancelled.'],
    [R('おうえん するよ！', "I'll cheer for you!", 'r29'), R('すごい！ がんばって！', 'Wow! Good luck!', 'r29')], { after: 'ch5' }),
  M('r29', 'ren', 2, 'ありがとう。でも ちょっと こわい。強い 人が 多いんだ。', 'ありがとう。でも ちょっと こわい。つよい ひとが おおいんだ。',
    "Thanks. But I'm a bit scared. There are lots of strong people.", ['n5:強い', 'n5:人', 'n5:多い'],
    ["Ren is a little scared because many strong people are entering.", 'Ren is sure he will win.', 'Ren is sick.'],
    [R('レンなら だいじょうぶ！', "You'll be fine, Ren!"), R('楽しんで！', 'Have fun!')]),
  M('r30', 'ren', 2, '一回戦、勝った！！ 足が まだ ふるえてる。', 'いっかいせん、かった！！ あしが まだ ふるえてる。',
    'I won round one!! My legs are still shaking.', ['n5:足', 'n5:まだ'],
    ['Ren won the first round and is still shaking.', 'Ren lost the first round.', 'Ren hurt his leg.'],
    [R('おめでとう！！', 'Congratulations!!'), R('すごい！ 次も がんばって！', 'Amazing! Good luck in the next one!')], { after: 'ch7' }),
  M('r31', 'ren', 2, 'キクさんが 師匠の 師匠だった！ びっくりした。', 'きくさんが ししょうの ししょうだった！ びっくりした。',
    "Granny Kiku was the Master's master! I was so surprised.", [],
    ["Ren learned that Granny Kiku taught the Master.", "Granny Kiku is Ren's grandmother.", 'Granny Kiku is a shop owner only.'],
    [R('えっ、本当に？', 'What, really?'), R('すごい ひみつだね！', "What a secret!")], { after: 'ch8' }),
  M('r32', 'ren', 2, '雨の 日は 道場の そうじ。めんどくさいけど、きらいじゃない。', 'あめの ひは どうじょうの そうじ。めんどくさいけど、きらいじゃない。',
    "Rainy days mean cleaning the dojo. It's a pain, but I don't hate it.", ['n5:雨', 'n5:嫌い'],
    ['Ren cleans the dojo on rainy days and does not mind it.', 'Ren hates cleaning.', 'Ren skips practice when it rains.'],
    [R('えらいね！', "Good on you!"), R('手伝おうか？', 'Want help?')]),
  M('r33', 'ren', 2, 'さっき 犬に 追いかけられた。めっちゃ 走った。', 'さっき いぬに おいかけられた。めっちゃ はしった。',
    'A dog chased me just now. I ran like crazy.', ['inu', 'n5:走る'],
    ['A dog chased Ren and he ran a lot.', 'Ren chased a dog.', 'Ren bought a dog.'],
    [R('ははは！ だいじょうぶ？', 'Haha! You okay?'), R('いい 練習だね！', 'Good practice!')]),
  M('r34', 'ren', 2, '明日 テストなんだ。全然 勉強してない……。', 'あした てすとなんだ。ぜんぜん べんきょうしてない……。',
    "I have a test tomorrow. I haven't studied at all…", ['n5:明日', 'n5:テスト', 'n5:全然', 'n5:勉強する'],
    ["Ren has a test tomorrow and hasn't studied.", 'Ren finished his test.', 'Ren studied all day.'],
    [R('今から しよう！', "Start now!"), R('いっしょに 勉強する？', 'Want to study together?')]),

  // ---------- Tier 3: N4 grammar ----------
  M('r40', 'ren', 3, '決勝の 前に、カイトと 話したら、少し 落ち着いた。', 'けっしょうの まえに、かいとと はなしたら、すこし おちついた。',
    'Before the final I talked with Kaito, and I calmed down a bit.', ['n5:前', 'n5:話す', 'n5:少し'],
    ['Talking with Kaito calmed Ren down before the final.', 'Ren and Kaito had a fight before the final.', 'Ren missed the final.'],
    [R('よかったね。', "I'm glad."), R('いい ライバルだね！', "He's a good rival!")], { after: 'ch10' }),
  M('r41', 'ren', 3, '決勝、負けちゃった。でも 楽しかった。また 強く なろうと 思う。', 'けっしょう、まけちゃった。でも たのしかった。また つよく なろうと おもう。',
    "I lost the final. But it was fun. I'm going to get stronger again.", ['n5:楽しい', 'n5:強い', 'n5:思う'],
    ['Ren lost the final but enjoyed it and wants to get stronger.', 'Ren won the final.', 'Ren is quitting.'],
    [R('すごく かっこよかったよ！', 'You were really cool!'), R('次は 勝てるよ！', "You'll win next time!")], { after: 'ch11' }),
  M('r42', 'ren', 3, '宿題、もう 終わらせて しまった。今日は 遊べる！', 'しゅくだい、もう おわらせて しまった。きょうは あそべる！',
    "I already finished my homework. I can play today!", ['n5:宿題', 'n5:もう', 'n5:遊ぶ'],
    ['Ren finished his homework and can play today.', 'Ren forgot his homework.', 'Ren has to study all day.'],
    [R('はやい！', "That was fast!"), R('何して 遊ぶ？', 'What will you do?')]),
  M('r43', 'ren', 3, '明日は 朝 六時に 起きなければ ならない。早く 寝よう。', 'あしたは あさ ろくじに おきなければ ならない。はやく ねよう。',
    "Tomorrow I have to get up at six. I'd better sleep early.", ['n5:明日', 'n5:朝', 'n5:起きる', 'n5:寝る'],
    ['Ren must get up at six tomorrow, so he will sleep early.', 'Ren will stay up late.', 'Ren gets up at nine.'],
    [R('おやすみ！', 'Good night!'), R('がんばって 起きてね。', 'Good luck getting up.')]),
  M('r44', 'ren', 3, '空が 暗いね。雨が ふりそうだ。かさ、持って いった ほうが いいよ。', 'そらが くらいね。あめが ふりそうだ。かさ、もって いった ほうが いいよ。',
    "The sky's dark. Looks like rain. You'd better take an umbrella.", ['n5:空', 'n5:暗い', 'n5:雨', 'n5:傘'],
    ['It looks like rain, so Ren says to take an umbrella.', "It's snowing.", 'Ren lost his umbrella.'],
    [R('ありがとう！ 持って いく。', "Thanks! I'll take one."), R('レンも 気を つけて。', 'You too, Ren.')]),
  M('r45', 'ren', 3, 'もし 日本に 来たら、ぼくの 町を 案内するよ！', 'もし にほんに きたら、ぼくの まちを あんないするよ！',
    "If you ever come to Japan, I'll show you around my town!", ['nihon', 'n5:来る', 'n5:町'],
    ['Ren will show you his town if you come to Japan.', 'Ren is moving abroad.', 'Ren is coming to your country.'],
    [R('ぜったい 行く！', "I'll definitely go!"), R('楽しみに してる！', "I'm looking forward to it!")]),
  M('r46', 'ren', 3, '新しい 道場が できるかもしれない。ちょっと さびしいけど、楽しみ。', 'あたらしい どうじょうが できるかもしれない。ちょっと さびしいけど、たのしみ。',
    "There might be a new dojo. A bit sad, but I'm looking forward to it.", ['n5:新しい', 'n5:できる'],
    ['A new dojo might open; Ren feels sad but excited.', 'The dojo closed for good.', 'Ren is leaving Japan.'],
    [R('どんな 道場？', 'What kind of dojo?'), R('ずっと 応援してる！', "I'll always cheer for you!")], { after: 'ch12' }),

  // ---------- Kaito (after chapter 2) ----------
  M('k1', 'kaito', 2, 'おい。レンから 聞いた。おまえも 日本語、やってるんだって？', 'おい。れんから きいた。おまえも にほんご、やってるんだって？',
    "Hey. I heard from Ren. You're doing Japanese too?", ['n5:聞く', 'n5:日本語'],
    ['Kaito heard from Ren that you study Japanese.', 'Kaito wants to learn English.', 'Kaito is angry at Ren.'],
    [R('うん、がんばってる！', "Yeah, I'm working hard!", 'k2'), R('少しだけ……', 'Just a little…', 'k2')], { after: 'ch2' }),
  M('k2', 'kaito', 2, 'ふん。まあ、悪くない。毎日 やれよ。', 'ふん。まあ、わるくない。まいにち やれよ。',
    "Hmph. Well, not bad. Do it every day.", ['n5:悪い', 'n5:毎日'],
    ['Kaito says not bad and tells you to keep at it daily.', 'Kaito says you should quit.', 'Kaito wants a match now.'],
    [R('ありがとう、カイト！', 'Thanks, Kaito!'), R('カイトも がんばって！', 'You too, Kaito!')], { after: 'ch2' }),
  M('k3', 'kaito', 2, 'レンの やつ、また 強く なってた。くやしい。', 'れんの やつ、また つよく なってた。くやしい。',
    "Ren got stronger again. It's so frustrating.", ['n5:強い', 'n5:また'],
    ['Kaito is frustrated that Ren got stronger.', 'Kaito is happy he beat Ren.', 'Kaito is sick.'],
    [R('カイトも 強いよ。', "You're strong too."), R('いっしょに 練習したら？', 'Why not practise together?')], { after: 'ch3' }),
  M('k4', 'kaito', 3, 'レンには 言うなよ。ほんとうは あいつに 会えて よかったと 思ってる。', 'れんには いうなよ。ほんとうは あいつに あえて よかったと おもってる。',
    "Don't tell Ren. Honestly, I'm glad I met him.", ['n5:言う', 'n5:会う', 'n5:思う'],
    ["Kaito is secretly glad he met Ren.", 'Kaito wishes he never met Ren.', 'Kaito wants you to tell Ren.'],
    [R('言わないよ。', "I won't tell."), R('やさしいね、カイト。', "You're kind, Kaito.")], { after: 'ch9' }),

  // ---------- Master (after chapter 4) ----------
  M('m1', 'master', 2, 'レンが いつも 世話に なって いるな。ありがとう。', 'れんが いつも せわに なって いるな。ありがとう。',
    'Ren is always in your care. Thank you.', ['n5:いつも', 'arigatou'],
    ['The Master thanks you for looking after Ren.', 'The Master scolds you.', 'The Master asks you to train Ren.'],
    [R('いいえ、こちらこそ。', 'No, thank you.'), R('レンは いい ともだちです。', 'Ren is a good friend.')], { after: 'ch4' }),
  M('m2', 'master', 2, 'ことばも わざと 同じだ。毎日 少しずつ。それで いい。', 'ことばも わざと おなじだ。まいにち すこしずつ。それで いい。',
    "Words are like techniques. A little every day. That's enough.", ['n5:同じ', 'n5:毎日', 'n5:少し'],
    ['The Master says language, like technique, grows a little each day.', 'The Master says study all night.', 'The Master says words are useless.'],
    [R('はい、師匠！', 'Yes, Master!'), R('がんばります。', "I'll do my best.")], { after: 'ch4' }),
  M('m3', 'master', 3, '休む ことも 修行だ。つかれたら、むりを しない ように。', 'やすむ ことも しゅぎょうだ。つかれたら、むりを しない ように。',
    "Resting is training too. When you're tired, don't overdo it.", ['n5:休む', 'n5:疲れる'],
    ['The Master says resting is part of training.', 'The Master says never rest.', 'The Master is tired.'],
    [R('わかりました。', 'Understood.'), R('ありがとう ございます。', 'Thank you.')], { after: 'ch6' }),
];

/** Warm notes after time away. Never guilt: nothing was lost, and Ren is just glad. One per tier. */
export const WELCOME_BACK = [
  M('back1', 'ren', 1, 'ひさしぶり！ げんきでしたか。また はなしましょう！', 'ひさしぶり！ げんきでしたか。また はなしましょう！',
    "Long time no see! Have you been well? Let's talk again!", ['n5:元気', 'n5:話す'],
    ['Ren is happy to hear from you again.', 'Ren is upset you were away.', 'Ren is going away.'],
    [R('ひさしぶり！ げんきです！', "Long time! I'm fine!"), R('ただいま！', "I'm back!")]),
  M('back2', 'ren', 2, '久しぶり！ 元気だった？ ぼくは ずっと 練習してたよ。', 'ひさしぶり！ げんきだった？ ぼくは ずっと れんしゅうしてたよ。',
    "Long time no see! Were you well? I've been practising the whole time.", ['n5:元気', 'n5:練習する'],
    ['Ren is glad you are back and has been practising.', 'Ren stopped practising.', 'Ren is angry you were away.'],
    [R('うん、元気！', 'Yeah, all good!'), R('ただいま！', "I'm back!")]),
  M('back3', 'ren', 3, '久しぶり！ 待ってたよ。また いっしょに がんばろう。', 'ひさしぶり！ まってたよ。また いっしょに がんばろう。',
    "Long time no see! I was waiting. Let's keep at it together.", ['n5:待つ', 'n5:一緒に'],
    ['Ren waited for you and wants to keep going together.', 'Ren gave up waiting.', 'Ren is moving.'],
    [R('ただいま！', "I'm back!"), R('また よろしく！', 'Count on me again!')]),
];

tagLevel(MESSAGES, 'N5');
tagLevel(WELCOME_BACK, 'N5');

// N4 (tier 4: plain, casual N4 speech, like real chat between friends) from js/n4-extras.js. Their words are written
// forms; each becomes its Garden id (the N4 or N5 deck card), and words without a card are left out.
const wordIds = (m) => ({ ...m, words: m.words.map((w) => (GARDEN_CATALOG[w] ? w : deckIdFor(w))).filter((id) => id && GARDEN_CATALOG[id]) });
MESSAGES.push(...tagLevel(N4_MESSAGES.map(wordIds), 'N4'));
WELCOME_BACK.push(...tagLevel([N4_WELCOME_BACK].map(wordIds), 'N4'));
// N3 (tier 5: N3 grammar in casual chat, わけ, はず, ように, っぽい, ちゃう) from js/n3-extras.js.
MESSAGES.push(...tagLevel(N3_MESSAGES.map(wordIds), 'N3'));
WELCOME_BACK.push(...tagLevel([N3_WELCOME_BACK].map(wordIds), 'N3'));

export const ALL_MESSAGES = [...MESSAGES, ...WELCOME_BACK];
export const MESSAGE_BY_ID = Object.fromEntries(ALL_MESSAGES.map((m) => [m.id, m]));
