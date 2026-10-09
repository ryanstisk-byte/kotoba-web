// Reading Dojo content: hiragana, katakana and starter kanji, in small lessons.
// Mnemonics are short picture hooks; they fade once the shapes are familiar.

const C = (k, r, m = '') => ({ k, r, m });

/** Combination sounds share one explanation. */
const YOON = 'A big kana plus a small ゃ/ゅ/ょ blends into one beat: き + ゃ = きゃ (kya).';
const YOON_K = 'A big kana plus a small ャ/ュ/ョ blends into one beat: キ + ャ = キャ (kya).';

export const LESSONS = [
  // ---------------- Hiragana ----------------
  { id: 'h1', track: 'hiragana', title: 'Vowels', chars: [
    C('あ', 'a', 'A cross stuck into a round apple. "Ah!"'),
    C('い', 'i', 'Two eels swimming side by side: "ee".'),
    C('う', 'u', 'A face with a little hat, lips pushed out: "oo".'),
    C('え', 'e', 'A bird with a crest on its head, puzzled: "eh?"'),
    C('お', 'o', 'Like あ, but a little UFO flies off to the right: "oh!"'),
  ] },
  { id: 'h2', track: 'hiragana', title: 'K row', chars: [
    C('か', 'ka', 'A karate chop with a spark flying off: "ka!"'),
    C('き', 'ki', 'A key: two teeth on top, a loop for the handle.'),
    C('く', 'ku', "A cuckoo's open beak: \"ku\"."),
    C('け', 'ke', 'A keg standing next to its tap.'),
    C('こ', 'ko', 'Two coins lying flat, one above the other.'),
  ] },
  { id: 'h3', track: 'hiragana', title: 'S row', chars: [
    C('さ', 'sa', 'A samurai raising a sword over a curl: "sa!"'),
    C('し', 'shi', 'A fishing hook: "she" caught a fish.'),
    C('す', 'su', 'A swing that loops once around its bar: "su".'),
    C('せ', 'se', 'A mouth showing one big tooth as you "say" it.'),
    C('そ', 'so', 'A zig-zag thread you "sew" with.'),
  ] },
  { id: 'h4', track: 'hiragana', title: 'T row', chars: [
    C('た', 'ta', 'Looks like a "t" and an "a" squeezed together.'),
    C('ち', 'chi', 'A cheerleader leaning back, one leg kicking: "chi".'),
    C('つ', 'tsu', 'A tsunami wave curling over.'),
    C('て', 'te', 'An arm reaching out its hand (て, "te", is hand in old Japanese).'),
    C('と', 'to', 'A toe with a splinter stuck in it.'),
  ] },
  { id: 'h5', track: 'hiragana', title: 'N row', chars: [
    C('な', 'na', 'A nun kneeling beside a cross: "na".'),
    C('に', 'ni', 'A knee next to a post: "ni".'),
    C('ぬ', 'nu', 'Noodles twisted around chopsticks, with a loop: "nu".'),
    C('ね', 'ne', 'A cat (ねこ) with a curly tail: "ne".'),
    C('の', 'no', 'A "no entry" sign: one round swoosh.'),
  ] },
  { id: 'h6', track: 'hiragana', title: 'H row', chars: [
    C('は', 'ha', 'An "H" on the left, laughing: "ha!" (Read "wa" when it is the topic particle.)'),
    C('ひ', 'hi', 'A big grin: "hee hee".'),
    C('ふ', 'fu', 'Mount Fuji with puffs of cloud around it: "fu".'),
    C('へ', 'he', 'A single mountain peak: "heh". (Read "e" when it means "toward".)'),
    C('ほ', 'ho', 'A "ha" with a Christmas tree: "ho ho ho".'),
  ] },
  { id: 'h7', track: 'hiragana', title: 'M row', chars: [
    C('ま', 'ma', 'A mama with a long neck and a looped skirt.'),
    C('み', 'mi', 'A cursive "21": "me" at twenty-one.'),
    C('む', 'mu', 'A cow with a horn and a swishing tail: "moo".'),
    C('め', 'me', 'An eye with a lash (め means eye). Like ぬ with no loop.'),
    C('も', 'mo', 'A fish hook catching "more" fish.'),
  ] },
  { id: 'h8', track: 'hiragana', title: 'Y, W and ん', chars: [
    C('や', 'ya', 'A yak with its horns lowered.'),
    C('ゆ', 'yu', 'A fish looking right at "you".'),
    C('よ', 'yo', 'A yo-yo hanging from its string.'),
    C('わ', 'wa', 'Like ね, but the tail curls back out: a swan, "wa".'),
    C('を', 'o', 'A person bending over a hook. Only used as the particle を, said "o".'),
    C('ん', 'n', 'A cursive lowercase "n".'),
  ] },
  { id: 'h9', track: 'hiragana', title: 'R row', chars: [
    C('ら', 'ra', 'A rabbit with one ear up: "ra".'),
    C('り', 'ri', 'Two reeds swaying by a river.'),
    C('る', 'ru', 'Like ろ, but the road ends in a loop: "loop" = "ru".'),
    C('れ', 're', 'Like ね, but the tail kicks straight out.'),
    C('ろ', 'ro', 'A road with one sharp bend and no loop.'),
  ] },
  { id: 'h10', track: 'hiragana', title: 'Dakuten: G and Z', note: 'Two little marks ( ゛) make a sound "voiced": か ka → が ga, さ sa → ざ za.', chars: [
    C('が', 'ga'), C('ぎ', 'gi'), C('ぐ', 'gu'), C('げ', 'ge'), C('ご', 'go'),
    C('ざ', 'za'), C('じ', 'ji'), C('ず', 'zu'), C('ぜ', 'ze'), C('ぞ', 'zo'),
  ] },
  { id: 'h11', track: 'hiragana', title: 'Dakuten: D, B and P', note: '゛ turns た into だ (da) and は into ば (ba). A small circle ( ゜) turns は into ぱ (pa). ぢ and づ sound like じ and ず and are rare.', chars: [
    C('だ', 'da'), C('で', 'de'), C('ど', 'do'), C('ぢ', 'ji'), C('づ', 'zu'),
    C('ば', 'ba'), C('び', 'bi'), C('ぶ', 'bu'), C('べ', 'be'), C('ぼ', 'bo'),
    C('ぱ', 'pa'), C('ぴ', 'pi'), C('ぷ', 'pu'), C('ぺ', 'pe'), C('ぽ', 'po'),
  ] },
  { id: 'h12', track: 'hiragana', title: 'Combos and small っ', note: YOON + ' A small っ is a tiny pause that doubles the next sound: きって = kitte (stamp).', chars: [
    C('きゃ', 'kya'), C('きゅ', 'kyu'), C('きょ', 'kyo'),
    C('しゃ', 'sha'), C('しゅ', 'shu'), C('しょ', 'sho'),
    C('ちゃ', 'cha'), C('ちゅ', 'chu'), C('ちょ', 'cho'),
    C('じゃ', 'ja'), C('じゅ', 'ju'), C('じょ', 'jo'),
    C('にゃ', 'nya'), C('りょ', 'ryo'), C('ぎょ', 'gyo'), C('ひゃ', 'hya'),
  ] },

  // ---------------- Katakana ----------------
  { id: 'k1', track: 'katakana', title: 'Vowels', note: 'Katakana are the same sounds as hiragana with sharper shapes. They spell foreign words (コーヒー coffee), names (レン Ren) and sound effects.', chars: [
    C('ア', 'a', 'An axe chopping down: "ah!"'),
    C('イ', 'i', 'An easel leaning on its stand: "ee".'),
    C('ウ', 'u', 'う with a flat hat on: "oo".'),
    C('エ', 'e', 'An elevator shaft between two floors.'),
    C('オ', 'o', 'A rower pulling an oar: "oh".'),
  ] },
  { id: 'k2', track: 'katakana', title: 'K row', chars: [
    C('カ', 'ka', 'か without its spark.'),
    C('キ', 'ki', 'A key with two teeth.'),
    C('ク', 'ku', "A cook's hat brim, folded over."),
    C('ケ', 'ke', 'A "K" leaning over: "ke".'),
    C('コ', 'ko', 'A corner of a box with one side open.'),
  ] },
  { id: 'k3', track: 'katakana', title: 'S row', note: 'シ (shi) and ツ (tsu) are a famous pair: シ\'s strokes lie flat and sweep up from the bottom left, ツ\'s stand up and fall from the top.', chars: [
    C('サ', 'sa', 'Like さ: a bar with two posts and a hook.'),
    C('シ', 'shi', 'A smiling face looking sideways; dots on the left, stroke sweeps up.'),
    C('ス', 'su', 'A sumo wrestler squatting.'),
    C('セ', 'se', 'Like せ, missing one tooth.'),
    C('ソ', 'so', 'A needle sewing downward: dot and stroke both fall from the top.'),
  ] },
  { id: 'k4', track: 'katakana', title: 'T row', chars: [
    C('タ', 'ta', 'Like ク with a piece of tape stuck on.'),
    C('チ', 'chi', 'A cheerleader with arms spread: "chi".'),
    C('ツ', 'tsu', 'A tsunami seen from above: three strokes falling from the top.'),
    C('テ', 'te', 'A telephone pole with its wires.'),
    C('ト', 'to', 'A totem pole with one branch.'),
  ] },
  { id: 'k5', track: 'katakana', title: 'N row', chars: [
    C('ナ', 'na', 'A knife stuck in a cross: "na".'),
    C('ニ', 'ni', 'Two lines: ni is also the word for "two".'),
    C('ヌ', 'nu', 'Chopsticks crossing over noodles.'),
    C('ネ', 'ne', 'Someone wearing a necktie.'),
    C('ノ', 'no', 'One slash: "no!"'),
  ] },
  { id: 'k6', track: 'katakana', title: 'H row', chars: [
    C('ハ', 'ha', 'Two lines spreading apart like a laugh: "ha".'),
    C('ヒ', 'hi', 'A heel kicking back: "hi".'),
    C('フ', 'fu', 'One slope of Mount Fuji.'),
    C('ヘ', 'he', 'Same as hiragana へ.'),
    C('ホ', 'ho', 'A cross with two little legs: "ho".'),
  ] },
  { id: 'k7', track: 'katakana', title: 'M row', chars: [
    C('マ', 'ma', "A mama's head bowed: \"ma\"."),
    C('ミ', 'mi', 'Three lines: "mi" (like a 3 on its side).'),
    C('ム', 'mu', "A cow's head with one horn: \"moo\"."),
    C('メ', 'me', 'An X marks the spot: "me".'),
    C('モ', 'mo', 'も without its loop, and "more" lines.'),
  ] },
  { id: 'k8', track: 'katakana', title: 'Y, W and ン', note: 'ン (n) and ソ (so) are another pair: ン\'s long stroke sweeps up, ソ\'s falls down.', chars: [
    C('ヤ', 'ya', 'Like や, straightened out.'),
    C('ユ', 'yu', 'A U-turn sign: "you" turn.'),
    C('ヨ', 'yo', 'A backwards E: "yo".'),
    C('ワ', 'wa', 'A watering can seen from the side.'),
    C('ヲ', 'o', 'Rare: only shows up in names and some signs.'),
    C('ン', 'n', 'A dot and a stroke sweeping up from the bottom.'),
  ] },
  { id: 'k9', track: 'katakana', title: 'R row', chars: [
    C('ラ', 'ra', 'A rabbit with a flat cap.'),
    C('リ', 'ri', 'Like り, two reeds.'),
    C('ル', 'ru', 'Two roots of a tree.'),
    C('レ', 're', 'An "L" leaning back.'),
    C('ロ', 'ro', 'A square road: "ro".'),
  ] },
  { id: 'k10', track: 'katakana', title: 'Dakuten: G and Z', note: 'Same marks as hiragana: カ ka → ガ ga, サ sa → ザ za.', chars: [
    C('ガ', 'ga'), C('ギ', 'gi'), C('グ', 'gu'), C('ゲ', 'ge'), C('ゴ', 'go'),
    C('ザ', 'za'), C('ジ', 'ji'), C('ズ', 'zu'), C('ゼ', 'ze'), C('ゾ', 'zo'),
  ] },
  { id: 'k11', track: 'katakana', title: 'Dakuten: D, B and P', chars: [
    C('ダ', 'da'), C('デ', 'de'), C('ド', 'do'),
    C('バ', 'ba'), C('ビ', 'bi'), C('ブ', 'bu'), C('ベ', 'be'), C('ボ', 'bo'),
    C('パ', 'pa'), C('ピ', 'pi'), C('プ', 'pu'), C('ペ', 'pe'), C('ポ', 'po'),
  ] },
  { id: 'k12', track: 'katakana', title: 'Combos, ッ and ー', note: YOON_K + ' A long dash ー stretches the vowel: ケーキ = keeki (cake). A small ッ doubles the next sound: ロボット = robotto. Katakana also borrows extra sounds like ファ (fa) and ティ (ti).', chars: [
    C('キャ', 'kya'), C('キュ', 'kyu'), C('キョ', 'kyo'),
    C('シャ', 'sha'), C('シュ', 'shu'), C('ショ', 'sho'),
    C('チャ', 'cha'), C('チュ', 'chu'), C('チョ', 'cho'),
    C('ジャ', 'ja'), C('ジュ', 'ju'), C('ジョ', 'jo'),
    C('ファ', 'fa'), C('ティ', 'ti'),
  ] },
];

// ---------------- Starter kanji ----------------
const J = (k, meaning, m, word, reading, wordEn) => ({ k, meaning, m, word, reading, wordEn });

export const KANJI_LESSONS = [
  { id: 'j1', track: 'kanji', title: 'Numbers 1 to 5', note: 'Kanji are picture-ideas, each with a meaning and one or more readings. Start with numbers: you will see them everywhere.', kanji: [
    J('一', 'one', 'One stroke: one.', '一つ', 'ひとつ', 'one (thing)'),
    J('二', 'two', 'Two strokes: two.', '二つ', 'ふたつ', 'two (things)'),
    J('三', 'three', 'Three strokes: three.', '三つ', 'みっつ', 'three (things)'),
    J('四', 'four', 'A window with curtains: four panes of light.', '四つ', 'よっつ', 'four (things)'),
    J('五', 'five', 'A sandwich of five layers.', '五つ', 'いつつ', 'five (things)'),
  ] },
  { id: 'j2', track: 'kanji', title: 'Numbers 6 to 10', kanji: [
    J('六', 'six', 'A person with a hat and spread legs: six.', '六', 'ろく', 'six'),
    J('七', 'seven', 'An upside-down 7 with a crossbar.', '七', 'なな', 'seven'),
    J('八', 'eight', 'Two lines spreading out like the bottom of an 8.', '八', 'はち', 'eight'),
    J('九', 'nine', 'A hooked arm: nine is almost ten.', '九', 'きゅう', 'nine'),
    J('十', 'ten', 'A plus sign: two hands of five, crossed. Ten.', '十', 'じゅう', 'ten'),
  ] },
  { id: 'j3', track: 'kanji', title: 'Days of the week', note: 'Each weekday is named after one of these: 月曜日 (げつようび) is Monday, moon-day.', kanji: [
    J('日', 'sun, day', 'A window with the sun shining through.', '日', 'ひ', 'day, sun'),
    J('月', 'moon, month', 'A crescent moon with two clouds across it.', '月', 'つき', 'moon'),
    J('火', 'fire', 'A campfire with sparks flying out.', '火', 'ひ', 'fire'),
    J('水', 'water', 'A stream with splashes on both sides.', '水', 'みず', 'water'),
    J('木', 'tree', 'A tree with branches and roots.', '木', 'き', 'tree'),
    J('金', 'gold, money', 'A roof over a pile of gold nuggets.', 'お金', 'おかね', 'money'),
    J('土', 'earth, soil', 'A sprout coming up out of the ground.', '土', 'つち', 'soil'),
  ] },
  { id: 'j4', track: 'kanji', title: 'Body and nature', kanji: [
    J('人', 'person', 'A person walking: two legs.', '人', 'ひと', 'person'),
    J('口', 'mouth', 'An open mouth.', '口', 'くち', 'mouth'),
    J('目', 'eye', 'An eye stood on its end.', '目', 'め', 'eye'),
    J('手', 'hand', 'A hand with fingers spread.', '手', 'て', 'hand'),
    J('山', 'mountain', 'Three peaks.', '山', 'やま', 'mountain'),
    J('川', 'river', 'Three lines of flowing water.', '川', 'かわ', 'river'),
  ] },
  { id: 'j5', track: 'kanji', title: 'Size and place', kanji: [
    J('大', 'big', 'A person stretching their arms out wide: "this big!"', '大きい', 'おおきい', 'big'),
    J('小', 'small', 'A tiny thing with two crumbs beside it.', '小さい', 'ちいさい', 'small'),
    J('中', 'middle, inside', 'A line straight through the middle of a box.', '中', 'なか', 'inside'),
    J('上', 'up, above', 'A mark above the line.', '上', 'うえ', 'above'),
    J('下', 'down, below', 'A mark hanging below the line.', '下', 'した', 'below'),
    J('本', 'book, origin', 'A tree (木) with a line marking its root: the origin. Also "book".', '本', 'ほん', 'book'),
  ] },
  { id: 'j6', track: 'kanji', title: 'People and school', kanji: [
    J('子', 'child', 'A baby wrapped up with its arms out.', '子ども', 'こども', 'child'),
    J('女', 'woman', 'A woman kneeling gracefully.', '女', 'おんな', 'woman'),
    J('男', 'man', 'Power (力) in the rice field (田).', '男', 'おとこ', 'man'),
    J('先', 'ahead, previous', 'Someone walking ahead of you.', '先生', 'せんせい', 'teacher'),
    J('生', 'life, birth', 'A plant growing up out of the ground.', '学生', 'がくせい', 'student'),
    J('学', 'study', 'A child (子) under a roof, studying.', '学校', 'がっこう', 'school'),
  ] },
  { id: 'j7', track: 'kanji', title: 'Daily verbs', note: 'Verbs keep their ending in kana: 食べる = tabe-ru. The kanji carries the meaning, the kana show the grammar.', kanji: [
    J('今', 'now', 'A roof over a single moment: now.', '今', 'いま', 'now'),
    J('何', 'what', 'A person (亻) holding a question.', '何', 'なに', 'what'),
    J('見', 'see', 'An eye (目) on legs, going to look.', '見る', 'みる', 'to see'),
    J('行', 'go', 'A crossroads: where you go.', '行く', 'いく', 'to go'),
    J('来', 'come', 'A tree with arms waving you over: come!', '来る', 'くる', 'to come'),
    J('食', 'eat', 'A lid on top of a bowl of food.', '食べる', 'たべる', 'to eat'),
    J('飲', 'drink', 'Food (食) next to someone yawning wide to drink.', '飲む', 'のむ', 'to drink'),
  ] },
];

/** Every lesson in order. Kanji lessons come after both kana tracks. */
export const ALL_LESSONS = [...LESSONS, ...KANJI_LESSONS];
export const LESSON_BY_ID = Object.fromEntries(ALL_LESSONS.map((l) => [l.id, l]));
export const TRACKS = [
  { id: 'hiragana', title: 'Hiragana', jp: 'ひらがな', body: 'The basic alphabet. Every word can be written in it.' },
  { id: 'katakana', title: 'Katakana', jp: 'カタカナ', body: 'Same sounds, sharper shapes: foreign words, names, effects.' },
  { id: 'kanji', title: 'Starter kanji', jp: '漢字', body: '42 everyday kanji: numbers, days, people, verbs.' },
];

/** Words to read once their kana are learned, so practice is real reading, not just letters. */
const V = (w, en) => ({ w, en });
export const READ_WORDS = [
  V('あい', 'love'), V('いえ', 'house'), V('うえ', 'above'), V('あお', 'blue'), V('おい', 'nephew; hey!'),
  V('かお', 'face'), V('いか', 'squid'), V('えき', 'station'), V('こえ', 'voice'), V('きく', 'to listen'), V('あかい', 'red'),
  V('すし', 'sushi'), V('あさ', 'morning'), V('いす', 'chair'), V('うし', 'cow'), V('かさ', 'umbrella'), V('せかい', 'world'),
  V('した', 'below'), V('たこ', 'octopus'), V('くつ', 'shoes'), V('ちかい', 'near'), V('て', 'hand'), V('そと', 'outside'),
  V('なつ', 'summer'), V('ねこ', 'cat'), V('いぬ', 'dog'), V('なに', 'what'), V('あに', 'older brother'), V('きのこ', 'mushroom'),
  V('はな', 'flower'), V('ひと', 'person'), V('ふね', 'boat'), V('へそ', 'belly button'), V('ほし', 'star'), V('ひとつ', 'one thing'),
  V('みみ', 'ear'), V('むし', 'bug'), V('め', 'eye'), V('もの', 'thing'), V('あたま', 'head'), V('さむい', 'cold'),
  V('やま', 'mountain'), V('ゆき', 'snow'), V('へや', 'room'), V('わたし', 'I, me'), V('ほん', 'book'), V('みかん', 'mandarin orange'), V('てんき', 'weather'),
  V('よる', 'night'), V('さる', 'monkey'), V('はる', 'spring'), V('くるま', 'car'), V('いろ', 'color'), V('ふろ', 'bath'), V('それ', 'that'),
  V('かぎ', 'key'), V('ごはん', 'rice, meal'), V('かぜ', 'wind; a cold'), V('ぞう', 'elephant'), V('ひざ', 'knee'), V('げんき', 'healthy, lively'),
  V('でんわ', 'telephone'), V('ともだち', 'friend'), V('ぶた', 'pig'), V('えんぴつ', 'pencil'), V('だれ', 'who'), V('かばん', 'bag'), V('てんぷら', 'tempura'),
  V('きょう', 'today'), V('しゃしん', 'photo'), V('おちゃ', 'green tea'), V('でんしゃ', 'train'), V('きって', 'stamp'), V('がっこう', 'school'), V('ちょっと', 'a little'), V('じゅぎょう', 'class'),
  V('アイス', 'ice cream'), V('ウエア', 'wear (clothes)'),
  V('ケーキ', 'cake'), V('カキ', 'oyster'), V('ココア', 'cocoa'),
  V('テスト', 'test'), V('スキー', 'skiing'), V('タクシー', 'taxi'), V('ノート', 'notebook'), V('テニス', 'tennis'), V('ネクタイ', 'necktie'),
  V('ホテル', 'hotel'), V('メモ', 'memo'), V('ハム', 'ham'), V('アニメ', 'anime'), V('マンガ', 'manga'),
  V('ラーメン', 'ramen'), V('レモン', 'lemon'), V('メロン', 'melon'), V('ライオン', 'lion'), V('ロケット', 'rocket'),
  V('ゲーム', 'video game'), V('テレビ', 'TV'), V('パン', 'bread'), V('バス', 'bus'), V('ピザ', 'pizza'), V('ドア', 'door'), V('ペン', 'pen'),
  V('ジュース', 'juice'), V('コーヒー', 'coffee'), V('シャツ', 'shirt'), V('チーズ', 'cheese'), V('ロボット', 'robot'), V('ニュース', 'news'), V('パーティー', 'party'),
];
