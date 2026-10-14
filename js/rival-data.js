// Rival Battle content: the rivals from the Kotoba Dojo story, when each one first challenges you, and their lines.
// Original shōnen-style writing, each line in the character's own VOICEVOX voice (the same voices as the story).
// Every line has a hiragana reading and an English line; tools/collect.mjs voices them all.

import { N4_RIVALS } from './n4-extras.js';
import { N3_RIVALS } from './n3-extras.js';
import { tagLevel } from './level-tag.js';

/** L(jp, reading, en) */
const L = (jp, reading, en) => ({ jp, reading, en });

/**
 * Rivals in the order they unlock (the newest one unlocked is offered first). `after`: the story chapter that must be cleared first (null: from the start).
 * `hp`: hits to win (a finisher hits 3 times). Later rivals stand a little longer.
 */
export const RIVALS = [
  {
    id: 'kaito', name: 'Kaito', jpName: 'カイト', voice: 3, color: 'var(--trace)', after: null, hp: 8,
    blurb: "The proud fighter who calls himself the strongest in town. He hates losing almost as much as he hates admitting you're good.",
    intro: [
      L('また 来たな、レン。きょうは まけないぞ！', 'また きたな、れん。きょうは まけないぞ！', "You came back, Ren. I won't lose today!"),
      L('しょうぶだ！ おれの こうげき、うけて みろ！', 'しょうぶだ！ おれの こうげき、うけて みろ！', 'Fight me! Try and take my attacks!'),
    ],
    counter: [
      L('あまい！ こたえは これだ！', 'あまい！ こたえは これだ！', 'Too soft! The answer is this!'),
      L('おそい！ よく きけよ！', 'おそい！ よく きけよ！', 'Too slow! Listen up!'),
      L('まだまだだな。', 'まだまだだな。', "You've still got a long way to go."),
    ],
    defeat: L('くっ……強く なったな、レン。', 'くっ……つよく なったな、れん。', "Tch… you've gotten stronger, Ren."),
    respect: L('あきらめない やつは きらいじゃない。また やろうぜ。', 'あきらめない やつは きらいじゃない。また やろうぜ。', "I don't hate people who don't give up. Let's go again sometime."),
  },
  {
    id: 'master', name: 'Master', jpName: '師匠', voice: 2, color: 'var(--good)', after: 'ch4', hp: 9,
    blurb: 'Your teacher. He doesn\'t fight to win; he fights to see how far you\'ve come.',
    intro: [
      L('来い、レン。おまえの ことばを 見せて みろ。', 'こい、れん。おまえの ことばを みせて みろ。', 'Come, Ren. Show me your words.'),
      L('けいこを はじめる。ほんきで 来い。', 'けいこを はじめる。ほんきで こい。', 'Practice begins. Come at me for real.'),
    ],
    counter: [
      L('ちがう。こたえは これだ。', 'ちがう。こたえは これだ。', 'No. The answer is this.'),
      L('あわてるな。よく 聞け。', 'あわてるな。よく きけ。', "Don't rush. Listen carefully."),
      L('目を ひらけ。', 'めを ひらけ。', 'Open your eyes.'),
    ],
    defeat: L('みごとだ。よく ここまで 来た。', 'みごとだ。よく ここまで きた。', "Splendid. You've come a long way."),
    respect: L('まける ことも 修行だ。おまえは もっと 強く なる。', 'まける ことも しゅぎょうだ。おまえは もっと つよく なる。', "Losing is training too. You'll grow stronger still."),
  },
  {
    id: 'sora', name: 'Sora', jpName: 'ソラ', voice: 5, color: 'var(--electric)', after: 'ch6', hp: 10,
    blurb: "A kid from the shop, fast and fearless. He's been practising in secret to beat you.",
    intro: [
      L('にいちゃん、しょうぶ しよう！', 'にいちゃん、しょうぶ しよう！', "Big bro, let's have a match!"),
      L('ぼくだって まいにち れんしゅう したんだ！', 'ぼくだって まいにち れんしゅう したんだ！', "I've been practising every day too!"),
    ],
    counter: [
      L('へへっ、ざんねん！ こたえは ね……', 'へへっ、ざんねん！ こたえは ね……', 'Heh, too bad! The answer is…'),
      L('それ、ちがうよ！', 'それ、ちがうよ！', "That's not it!"),
      L('ぼくの ばんだ！', 'ぼくの ばんだ！', 'My turn!'),
    ],
    defeat: L('すごい！ にいちゃん、つよすぎるよ！', 'すごい！ にいちゃん、つよすぎるよ！', "Wow! Big bro, you're way too strong!"),
    respect: L('にいちゃん、いっしょに がんばろうね！', 'にいちゃん、いっしょに がんばろうね！', "Big bro, let's both keep at it!"),
  },
  {
    id: 'kiku', name: 'Granny Kiku', jpName: 'キクさん', voice: 4, color: 'var(--miss)', after: 'ch8', hp: 12,
    blurb: "The kind old regular at the shop, who turned out to be the Master's own teacher. She still has the moves.",
    intro: [
      L('ほほほ、わかい もんには まけないよ。', 'ほほほ、わかい もんには まけないよ。', "Ho ho, I won't lose to young folks."),
      L('むかしは わたしも 強かったんだよ。', 'むかしは わたしも つよかったんだよ。', 'I was strong too, back in the day.'),
    ],
    counter: [
      L('おしいねえ。こたえは これさ。', 'おしいねえ。こたえは これさ。', 'So close. The answer is this.'),
      L('あらあら、ゆっくりで いいんだよ。', 'あらあら、ゆっくりで いいんだよ。', 'Oh my, take your time.'),
      L('まだ わかいねえ。', 'まだ わかいねえ。', 'Still young, aren\'t you.'),
    ],
    defeat: L('まいった、まいった。りっぱに なったねえ。', 'まいった、まいった。りっぱに なったねえ。', "I give up, I give up. You've grown into something fine."),
    respect: L('がんばる 子は だいすきだよ。また おいで。', 'がんばる こは だいすきだよ。また おいで。', 'I love a kid who tries hard. Come again.'),
  },
];
tagLevel(RIVALS, 'N5');
// N4 rivals (js/n4-extras.js): the same faces at full power, unlocked by the N4 story chapters, with more hits to win
// and attacks drawn mostly from N4 content.
RIVALS.push(...tagLevel(N4_RIVALS.map((r) => ({ ...r })), 'N4'));
// N3 rivals (js/n3-extras.js): the Rivals arc's rematches, unlocked by the N3 chapters, attacking mostly with N3 items.
RIVALS.push(...tagLevel(N3_RIVALS.map((r) => ({ ...r })), 'N3'));
export const RIVAL_BY_ID = Object.fromEntries(RIVALS.map((r) => [r.id, r]));

/** Ren (the learner's side, voice 1) shouts one of these with each finisher. */
export const REN_VOICE = 1;
export const FINISHERS = [
  { name: 'Word Storm', line: L('いくぞ！ ことばの あらし！', 'いくぞ！ ことばの あらし！', 'Here I go! Storm of words!') },
  { name: 'Memory Strike', line: L('ぜんぶ おぼえて いるぞ！ とどめだ！', 'ぜんぶ おぼえて いるぞ！ とどめだ！', 'I remember all of it! This ends now!') },
  { name: 'Dojo Finisher', line: L('これで きめる！ ひっさつ わざ！', 'これで きめる！ ひっさつ わざ！', 'This settles it! Special move!') },
];
/** Ren's line when the fight turns into a training montage. */
export const MONTAGE_LINE = L('もう いちど！ とっくんだ！', 'もう いちど！ とっくんだ！', 'One more time! Training!');

/** Every voiced line with its voice and level, for tools/collect.mjs. */
export function rivalLines() {
  const out = [];
  for (const r of RIVALS) for (const l of [...r.intro, ...r.counter, r.defeat, r.respect]) out.push([l, r.voice, r.level]);
  for (const f of FINISHERS) out.push([f.line, REN_VOICE]);
  out.push([MONTAGE_LINE, REN_VOICE]);
  return out;
}
