// Kana Brush content: which kana can be drawn, and a short picture mnemonic for writing each one (original wording,
// stroke by stroke, so it helps the hand as well as the eye). English only, so no voice clips are needed.
// The strokes themselves come from KanjiVG (js/kana-strokes.js).
import { LESSONS } from './dojo-data.js';
import { STROKES } from './kana-strokes.js';
import { N4_BRUSH_WORDS } from './n4-extras.js';
import { N3_BRUSH_WORDS } from './n3-extras.js';
import { tagLevel } from './level-tag.js';

/** Hiragana: a picture that walks through the strokes. */
const HIRA = {
  あ: 'A bar, a sword stabbed down through it, then a big swirl wrapping around the blade: "ah!"',
  い: 'Two blades of grass: a long one with a little flick at the bottom, then a short one.',
  う: 'A tiny hat, then a curly ear underneath: "oo, my ear".',
  え: 'A hat, then a dancer who zig-zags and kicks out a foot: "eh!"',
  お: 'A bar, a sword with a swirl like あ, then a spark flying off the top right: "oh!"',
  か: 'A kick with a bent leg, a sword through it, then a spark of power on the right: "ka!"',
  き: 'Two key teeth across, a slanted shaft down, then the curve of the handle at the bottom.',
  く: 'One stroke: a bird beak open to the left, "ku ku".',
  け: 'A post on the left, then a gate bar with a long leg dropping down: a keg on tap.',
  こ: 'Two short coins: the top one ends in a tiny hook, the bottom one curves up.',
  さ: 'A bar, a sword slashing down through it, then a little curl at the bottom: a samurai.',
  し: 'One stroke: a fishing hook dropping straight down and curling up to the right.',
  す: 'A long bar, then a swing rope that drops, loops once, and swishes down.',
  せ: 'A long bar, a tall post on the right that hooks back, then a post on the left that bends along the floor.',
  そ: 'One stroke: a zig-zag thread across the top, then down into a big curve, like sewing.',
  た: 'A bar, a slashing sword, then a little こ tucked on the right: "ta-da".',
  ち: 'A bar, then a sword that comes down and bends into a big belly curve: a cheerleader.',
  つ: 'One stroke: a wave rolling right and crashing down: tsunami.',
  て: 'One stroke: an arm reaching across, bending down into a hand: "te".',
  と: 'A short splinter, then a toe curving down and out along the floor.',
  な: 'A bar, a slash through it, a little dot of tear, then a loop like a kneeling nun.',
  に: 'A post on the left, then two short bars: a knee by a fence.',
  ぬ: 'A slash, then a noodle that crosses it, loops around and ties a knot at the end.',
  ね: 'A tall post, then a line that zig-zags across and curls into a cat tail loop.',
  の: 'One stroke: a swoosh down and all the way around: "no entry".',
  は: 'A post on the left, a bar, then a long line down that loops at the bottom: "ha!"',
  ひ: 'One stroke: a big grinning mouth that dips down and flicks up: "hee hee".',
  ふ: 'A dot on top, a curl in the middle, then two puffs left and right: Mount Fuji in clouds.',
  へ: 'One stroke: up a short slope, down a long one: a little hill, "heh".',
  ほ: 'A post on the left, two bars, then a line down that loops: a ha with a hat.',
  ま: 'Two bars, then a line down that loops at the bottom: mama with her skirt.',
  み: 'A cursive "21", then a short slash through the tail: me at twenty-one.',
  む: 'A bar, a line that drops, loops and sweeps right, then a dot of a cow horn: "moo".',
  め: 'A slash down, then a line that crosses it and curves round into an eye.',
  も: 'A hook down the middle, then two bars across it: catching more fish.',
  や: 'A curved horn, a dot, then a long slash down: a yak lowering its head.',
  ゆ: 'A curve that loops back like a fish, then one long line through its middle: "you".',
  よ: 'A short bar on the right, then a post down that loops at the bottom: a yo-yo.',
  わ: 'A tall post, then a line that zig-zags over and swoops out in a wide curve: "wa".',
  ん: 'One stroke: down, back up and over a small bump: a cursive n.',
  ら: 'A small dot of an ear, then a line down that curves into a round belly: a rabbit.',
  り: 'Two reeds: a short one with a flick, then a long one that bends down.',
  る: 'One stroke: zig across, down into a curve, and finish with a little loop: a loop for "ru".',
  れ: 'A tall post, then a line that zig-zags across and kicks straight out at the end.',
  ろ: 'One stroke: zig across, down into a curve, and stop with no loop: an open road.',
};

/** Katakana: sharper shapes, fewer curves. */
const KATA = {
  ア: 'A flag bent down to the left, then a pole slanting down from its corner: an axe.',
  イ: 'A slash down to the left, then a straight post: an easel.',
  ウ: 'A dot, a short post, then a flat roof that bends down: う with a hard hat.',
  エ: 'Top bar, a post down the middle, bottom bar: an elevator between floors.',
  オ: 'A bar, a post down with a hook, then a slash to the lower left: rowing an oar.',
  カ: 'A bent arm that hooks down, then a slash down the left: か without the spark.',
  キ: 'Two bars, then a long post slicing down through both: a key.',
  ク: 'A short slash, then a roof that bends into a long slash: a folded hat brim.',
  ケ: 'A short slash, a bar out to the right, then a long slash down: a K leaning over.',
  コ: 'A bar that bends down, then a bottom bar: a box with one side open.',
  サ: 'A long bar, a short post through it, then a long post that curves down: sa.',
  シ: 'Two dots lying flat, then a long stroke sweeping UP from the bottom left: a smile.',
  ス: 'A roof that bends into a long slash, then a little leg kicking out: a squatting sumo.',
  セ: 'A bar that hooks down, then a post that bends along the floor: せ missing a tooth.',
  ソ: 'A dot, then a long stroke falling DOWN from the top right: a needle sewing.',
  タ: 'A short slash, a roof bending into a slash, then a small bar inside: ク with tape on it.',
  チ: 'A short slash, a long bar, then a post that curves down: a cheerleader with arms out.',
  ツ: 'Three strokes all falling DOWN from the top: two drops and a long wave.',
  テ: 'A short bar, a long bar, then a slash hanging down: a telephone pole.',
  ト: 'A tall post, then a short branch to the right: a totem pole.',
  ナ: 'A long bar, then a slash down through it: a knife in a cross.',
  ニ: 'Two bars, short then long: "ni" means two.',
  ヌ: 'A roof bending into a slash, then a short stroke crossing it: chopsticks in noodles.',
  ネ: 'A dot, a roof that bends into a slash, a post down, then a little dot: a necktie.',
  ノ: 'One slash down to the left: "no!"',
  ハ: 'A slash down to the left, then one down to the right: a laugh spreading out.',
  ヒ: 'A short bar, then a post that bends into a long flat foot: a heel.',
  フ: 'One stroke: a bar that bends into a slash: one slope of Mount Fuji.',
  ヘ: 'One stroke: up a short slope, down a long one: the same hill as へ.',
  ホ: 'A bar, a post with a hook, then two little legs: a cross on two feet.',
  マ: 'A bar that bends into a slash, then a little dot: mama bowing her head.',
  ミ: 'Three short slanted lines, top to bottom: me, me, me.',
  ム: 'A slash that bends into a flat floor, then a small dot on the right: a cow head.',
  メ: 'A long slash, then a short one crossing it: X marks the spot.',
  モ: 'Two bars, then a post that bends along the floor: more lines than も.',
  ヤ: 'A bar that hooks back, then a long slash down through it: a straightened yak.',
  ユ: 'A bar that bends down, then a long floor bar: a U-turn sign.',
  ヨ: 'A bar that bends down, a middle bar, then a bottom bar: a backwards E, "yo".',
  ワ: 'A short post, then a roof bending into a slash: a watering can.',
  ン: 'A dot, then a long stroke sweeping UP from the bottom: "n".',
  ラ: 'A short bar, then a roof that bends into a slash: a rabbit in a flat cap.',
  リ: 'A short post, then a long one that curves down: two reeds.',
  ル: 'A slash down, then a post that kicks up at the bottom: two roots.',
  レ: 'One stroke: down, then kick up to the right: an L leaning back.',
  ロ: 'A post, a bar that bends down, then a bottom bar: a square box.',
};

const DAKU = { が: 'か', ぎ: 'き', ぐ: 'く', げ: 'け', ご: 'こ', ざ: 'さ', じ: 'し', ず: 'す', ぜ: 'せ', ぞ: 'そ', だ: 'た', で: 'て', ど: 'と',
  ば: 'は', び: 'ひ', ぶ: 'ふ', べ: 'へ', ぼ: 'ほ', ガ: 'カ', ギ: 'キ', グ: 'ク', ゲ: 'ケ', ゴ: 'コ', ザ: 'サ', ジ: 'シ', ズ: 'ス', ゼ: 'セ',
  ゾ: 'ソ', ダ: 'タ', デ: 'テ', ド: 'ト', バ: 'ハ', ビ: 'ヒ', ブ: 'フ', ベ: 'ヘ', ボ: 'ホ' };
const HANDAKU = { ぱ: 'は', ぴ: 'ひ', ぷ: 'ふ', ぺ: 'へ', ぽ: 'ほ', パ: 'ハ', ピ: 'ヒ', プ: 'フ', ペ: 'ヘ', ポ: 'ホ' };

/** Sound-alikes left out, because a sound alone can't say which one to draw: ぢ (= じ), づ (= ず), を / ヲ (= お / オ). */
export const SOUND_ALIKES = new Set(['ぢ', 'づ', 'を', 'ヲ']);

/** Every kana Kana Brush can ask for, in Reading Dojo order: { k, r, track, lesson, m (the writing mnemonic) }. */
export const BRUSH_KANA = [];
for (const l of LESSONS) {
  for (const c of l.chars) {
    if (c.k.length !== 1 || SOUND_ALIKES.has(c.k) || !STROKES[c.k]) continue;
    const base = DAKU[c.k] || HANDAKU[c.k];
    const m = HIRA[c.k] || KATA[c.k]
      || (DAKU[c.k] ? `Write ${base} first, then two quick drops of sweat ( ゛) at the top right: the sound gets heavier.`
        : `Write ${base} first, then a small circle ( ゜) at the top right: a puff of air, "p".`);
    BRUSH_KANA.push({ k: c.k, r: c.r, track: l.track, lesson: l.id, m, base: base || null });
  }
}
tagLevel(BRUSH_KANA, 'N5');
export const BRUSH_BY_KANA = Object.fromEntries(BRUSH_KANA.map((x) => [x.k, x]));

/**
 * N4: whole words drawn kana by kana from hearing them (js/n4-extras.js), so the hand learns words, not just letters.
 * Only words whose every kana can be drawn.
 */
export const BRUSH_WORDS = tagLevel(N4_BRUSH_WORDS.filter((w) => [...w.kana].every((k) => BRUSH_BY_KANA[k]))
  .map((w) => ({ ...w, id: 'bw:' + w.kana })), 'N4');
// N3: longer words (js/n3-extras.js), drawn the same way. A word already in the N4 set keeps its N4 card.
{
  const have = new Set(BRUSH_WORDS.map((w) => w.kana));
  BRUSH_WORDS.push(...tagLevel(N3_BRUSH_WORDS.filter((w) => [...w.kana].every((k) => BRUSH_BY_KANA[k]) && !have.has(w.kana) && have.add(w.kana))
    .map((w) => ({ ...w, id: 'bw:' + w.kana })), 'N3'));
}

/**
 * Look-alikes: when a drawing comes out as a different kana, both are shown side by side with what tells them apart
 * (original wording). Either order; pairs not listed get a general tip.
 */
const LOOKALIKES = [
  ['ぬ', 'め', 'ぬ ends in a little loop at the bottom right; め just sweeps out and stops.'],
  ['ね', 'れ', 'Both start with a post. ね finishes with a loop; れ kicks out to the right like a leg.'],
  ['ね', 'わ', 'Both start with a post. ね finishes with a loop; わ rounds off into a wide curve.'],
  ['れ', 'わ', 'Both start with a post. れ kicks out to the right; わ rounds off into a wide curve.'],
  ['る', 'ろ', 'る closes with a loop at the bottom; ろ stays open.'],
  ['さ', 'ち', 'Mirror images: the bottom curve of さ opens to the right, the belly of ち opens to the left.'],
  ['き', 'さ', 'き has two bars across the top; さ has one.'],
  ['は', 'ほ', 'ほ has a bar across the top of its right side; は does not.'],
  ['け', 'は', 'Both start with a post. は ties a loop at the bottom right; け just drops a long leg.'],
  ['ほ', 'ま', 'ほ has a post on the left; ま is only the right side.'],
  ['い', 'り', 'In い the left stroke is the long one; in り the right stroke is long and curves down.'],
  ['こ', 'に', 'に has a post on the left; こ is only the two short bars.'],
  ['シ', 'ツ', 'シ: dots stacked on the left, long stroke sweeping UP. ツ: dots side by side on top, long stroke falling DOWN.'],
  ['ソ', 'ン', 'ソ\'s long stroke falls from the top right; ン\'s long stroke sweeps up from the bottom left.'],
  ['シ', 'ン', 'シ has two dots, ン has one; both long strokes sweep up from the bottom.'],
  ['ツ', 'ソ', 'ツ has two dots, ソ has one; both long strokes fall from the top.'],
  ['ク', 'タ', 'タ has an extra stroke tucked inside; ク does not.'],
  ['ク', 'ケ', 'ク\'s second stroke is a roof that bends down; ケ has a flat bar and a separate stroke falling from it.'],
  ['ウ', 'ワ', 'ウ has a little post sticking up on top; ワ does not.'],
  ['フ', 'ワ', 'ワ has a short post on the left; フ is only the roof.'],
  ['ア', 'マ', 'ア ends with a long slash down; マ ends with a short tick in the middle.'],
  ['コ', 'ユ', 'ユ\'s bottom bar runs out past the side; コ\'s corners stay closed.'],
  ['チ', 'テ', 'チ starts with a slanted tick on top; テ starts with a flat bar.'],
  ['ナ', 'メ', 'ナ is a flat bar with a post through it; メ is a slanted X.'],
  ['ス', 'ヌ', 'ヌ\'s second stroke cuts right through the first; ス\'s only kicks out from its corner.'],
];
const LOOK = new Map(LOOKALIKES.flatMap(([a, b, t]) => [[a + b, t], [b + a, t]]));

/** What tells kana `a` and `b` apart, for the side-by-side shown when one was drawn for the other. */
export function lookalikeTip(a, b) {
  return LOOK.get(a + b) || 'Watch where each stroke starts and which way it goes: that\'s what tells these two apart.';
}
