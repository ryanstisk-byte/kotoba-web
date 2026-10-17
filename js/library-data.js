// The Library: short graded readers at each JLPT level, for reading lots of easy Japanese (extensive reading).
// Each reader is original writing: side stories of the Kotoba Dojo cast and everyday scenes, written almost entirely
// in words the decks up to its level teach, so a learner at that level knows nearly every word (about 95-98% is the
// sweet spot for reading for pleasure). Every line is voiced in its speaker's voice, and every word can be tapped to
// look it up (js/lookup.js). Readers live in one file per level; this file adds the speakers and levels.
import { CAST } from './data.js';
import { tagLevel } from './level-tag.js';
import { N5_READERS } from './library-n5.js';
import { N4_READERS } from './library-n4.js';
import { N3_READERS } from './library-n3.js';

/** A reader's line: [speaker key in CAST, Japanese, its hiragana reading, English]. */
const line = ([who, jp, reading, en]) => ({ who: CAST[who] ? who : 'narrator', speaker: CAST[who] || CAST.narrator, jp, reading, en });

const shape = (r) => ({ ...r, lines: r.lines.map(line), questions: r.questions || [] });

/** Every reader, easiest level first, in reading order within a level. */
export const READERS = [
  ...tagLevel(N5_READERS.map(shape), 'N5'),
  ...tagLevel(N4_READERS.map(shape), 'N4'),
  ...tagLevel(N3_READERS.map(shape), 'N3'),
];
export const READER_BY_ID = Object.fromEntries(READERS.map((r) => [r.id, r]));
