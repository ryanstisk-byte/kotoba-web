// What the pronunciation check says about each issue it finds (pron-analysis.js): one short, specific, encouraging
// tip and a short example. A fixed table, not generated: {word}, {mora} and friends are filled in from the word.
//   {word} the word as written    {reading} its kana        {mora} the mora in question
//   {prev} the mora before it     {next} the mora after it  {vowel} the vowel held (as kana)
//   {heard} the mora recognition heard instead              {shape} how the word's pitch moves

export const TIPS = {
  silent: {
    tip: "I couldn't hear much. Try again a little closer to the mic, at your normal voice.",
    example: 'Speak right after you tap, then pause; the check stops on its own.',
  },
  not_heard: {
    tip: "Recognition didn't catch any words that time, so the sound check is skipped. Your pitch and rhythm are below.",
    example: 'Say it a touch louder and clearer, like a game announcer.',
  },
  sound_swap: {
    tip: 'Listen for the {mora}: it came out closer to {heard}. Hear the model once more, then copy that beat.',
    example: 'つ vs す: つ starts with a tiny "t". ふ vs ほ: ふ is a soft breath through barely-round lips.',
  },
  long_short: {
    tip: 'Hold the {prev} longer: {word} has a long {vowel}, two full beats.',
    example: 'おばさん (aunt, 4 beats) vs おばあさん (grandma, 5 beats).',
  },
  long_added: {
    tip: 'Keep the {mora} short: {word} has no long vowel there.',
    example: 'おばあさん (grandma) vs おばさん (aunt): one beat less.',
  },
  sokuon_missing: {
    tip: 'Give っ a tiny pause before the {next}: hold your breath for one beat.',
    example: 'きて (come) vs きって (stamp): ki - (pause) - te.',
  },
  n_short: {
    tip: 'Give ん its own beat in {word}: hum it as long as any other sound.',
    example: 'こんにちは is five beats: こ・ん・に・ち・は.',
  },
  devoice: {
    tip: 'Let the {vowel} in {mora} go quiet, almost a whisper.',
    example: 'です sounds like "dess", ～ます like "mass", すき like "ski".',
  },
  pitch_start_high: {
    tip: 'Start {word} high, then drop: {shape}.',
    example: 'はし (chopsticks): HA-shi, high then low.',
  },
  pitch_start_low: {
    tip: 'Start {word} low and rise on the next beat: {shape}.',
    example: 'はし (bridge): ha-SHI, low then high.',
  },
  pitch_no_drop: {
    tip: 'Let your pitch fall after the {mora}: {shape}.',
    example: 'たまご (egg): ta-MA-go, it drops after ま.',
  },
  pitch_end_drop: {
    tip: 'Keep your pitch up to the end of {word}: {shape}.',
    example: 'さかな (fish): sa-KA-NA, it stays up, no drop.',
  },
  pitch_rise_end: {
    tip: 'Your pitch went up at the end; in {word} it {shape}.',
    example: 'はし (chopsticks) starts high and drops, so it never ends on a rise.',
  },
  pitch_flat: {
    tip: 'Let your voice move a little: in {word} the pitch {shape}.',
    example: 'Japanese pitch is a gentle step up or down, like humming two notes.',
  },
  rushed: {
    tip: 'Slow down a touch: give every beat of {word} the same length.',
    example: 'がっこう is four beats: が・っ・こ・う.',
  },
};

const ORD = ['', 'first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh'];

/** How a word's pitch moves, in words: "starts high and drops", "rises, then drops after the second beat"… */
export function pitchShape(highs) {
  if (!highs || !highs.length) return 'follows the model';
  const n = highs.length;
  const drop = highs.findIndex((h, i) => h && highs[i + 1] === false);
  if (highs[0] && drop === 0) return 'starts high and drops';
  if (drop > 0) return `rises, then drops after the ${ORD[drop + 1] || drop + 1 + 'th'} beat`;
  if (!highs[0] && highs.slice(1).every(Boolean)) return 'starts low, rises, and stays up';
  if (highs.every(Boolean)) return 'stays high';
  return n > 1 && !highs[n - 1] ? 'ends low' : 'stays up';
}

const VOWEL_KANA = { a: 'あ', i: 'い', u: 'う', e: 'え', o: 'お' };

/** The tip and example for an issue, filled in for this word. */
export function tipFor(issue, target, morae, highs) {
  const rule = TIPS[issue.id];
  if (!rule) return null;
  const at = Number.isInteger(issue.at) ? issue.at : -1;
  const m = morae && at >= 0 ? morae[at] : null;
  const vals = {
    word: target.jp || target.reading,
    reading: target.reading,
    mora: m ? m.kana : '',
    prev: morae && at > 0 ? morae[at - 1].kana : (m ? m.kana : ''),
    next: morae && at >= 0 && morae[at + 1] ? morae[at + 1].kana : '',
    vowel: m && m.vowel ? VOWEL_KANA[m.vowel] : '',
    heard: issue.heard || '',
    shape: pitchShape(highs),
  };
  const fill = (s) => s.replace(/\{(\w+)\}/g, (_, k) => vals[k] ?? '');
  return { id: issue.id, tip: fill(rule.tip), example: rule.example };
}
