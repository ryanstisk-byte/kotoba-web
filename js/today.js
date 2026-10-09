// "Today": a guided daily plan. Nothing is lost by skipping blocks or days, and there are no streaks.
import { store, DAILY_REVIEW_CAP, DAILY_REVIEW_CAP_SHORT } from './store.js';
import { MODE_BY_ID } from './data.js';
import { TRACKS } from './dojo-data.js';
import { coursePlan } from './course.js';

const SKILL_BY_WEEKDAY = {
  1: 'particle', // Mon
  2: 'duel',     // Tue
  3: 'forge',    // Wed
  4: 'shop',     // Thu
  5: 'particle', // Fri
  6: 'free',     // Sat
  0: null,       // Sun: review only
};
const WEEKDAY = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** Builds today's blocks from the date and settings. Statuses come from the store. */
export function todayPlan(date = new Date()) {
  const short = store.settings.length === 'short';
  const quiet = store.settings.quiet;
  const cap = short ? DAILY_REVIEW_CAP_SHORT : DAILY_REVIEW_CAP;
  const blocks = [];
  const day = store.day();
  const status = (id) => day.blocks[id] || null;

  // Reading first while the kana and starter kanji are still being learned.
  const nextLesson = store.nextLesson();
  const dojoDue = store.dojoDue().length;
  const beginner = !store.trackDone('hiragana') || !store.trackDone('katakana');
  if (nextLesson || dojoDue >= 5) {
    const review = !nextLesson || dojoDue >= 8;
    const track = nextLesson && TRACKS.find((t) => t.id === nextLesson.track);
    blocks.push({
      id: 'dojo', mode: 'dojo', mins: 5, title: review ? 'Reading review' : 'Reading Dojo',
      desc: review ? `${Math.min(dojoDue, 15)} learned characters come back for review.` : `Next lesson: ${track.title} · ${nextLesson.title}.`,
      ctx: { review },
    });
  }

  const garden = store.dailyGardenQueue(cap);
  blocks.push({
    id: 'garden', mode: 'garden', mins: 5, title: 'Garden review',
    desc: garden.queue.length
      ? `${garden.queue.length} to water today (max ${cap}, up to ${store.newCap()} new).${garden.waiting ? ` ${garden.waiting} more wait; no rush.` : ''}`
      : store.thirsty().length
        ? `Today's share is done. ${store.thirsty().length} more wait for later days (new words arrive ${store.newCap()} a day); nothing wilts.`
        : 'Nothing due right now. Your garden is fine.',
    ctx: { cap },
  });

  // With the course on, Input is the current unit's lesson (then its story scene), and grammar/counter skill days
  // practise the unit (see coursePlan in course.js). Otherwise the next story chapter, as before.
  const course = coursePlan();
  const { chapter, replay } = store.nextChapter();
  if (!(short && beginner)) blocks.push(course ? course.input : {
    id: 'input', mode: 'story', mins: 5, title: replay ? 'Story replay' : 'Story',
    desc: `${replay ? 'Replay (furigana off)' : 'Next scene'}: ${chapter.number}. ${chapter.title} · ${chapter.en}`,
    ctx: { chapterId: chapter.id },
  });

  if (!short) {
    const weekday = date.getDay();
    const skill = SKILL_BY_WEEKDAY[weekday];
    const odd = date.getDate() % 2 === 1;
    let speak = odd ? 'rhythm' : 'slice';
    let speakDesc = odd ? 'Shadow 3 phrases with the sweeping line.' : 'One 60-second round: say the words out loud.';
    if (quiet) {
      speak = skill === 'duel' ? 'shop' : 'duel';
      speakDesc = speak === 'duel' ? 'Quiet mode: listening instead of speaking. 10 pitch questions.' : 'Quiet mode: listen to 3 customers and serve them.';
    }
    blocks.push({ id: 'speak', mode: speak, mins: 5, title: `Speaking · ${MODE_BY_ID[speak].title}`, desc: speakDesc, ctx: {} });

    // While learning to read, the Dojo takes the skill-focus slot so the day stays about 20 minutes.
    if (beginner) {
      // no skill block
    } else if (skill === 'free') {
      blocks.push({ id: 'skill', mode: null, mins: 5, title: 'Skill focus · Free choice', desc: 'Saturday: play any mode you like.', ctx: {} });
    } else if (skill && course && course.skill(skill)) {
      const cs = course.skill(skill);
      blocks.push({ id: 'skill', mode: cs.mode, mins: 5, title: `Skill focus · ${MODE_BY_ID[cs.mode].title}`, desc: `${WEEKDAY[weekday]}: ${cs.desc}`, ctx: cs.ctx, unit: cs.unit });
    } else if (skill) {
      const goals = { particle: '6 trains.', duel: '10 pitch questions.', forge: '3 kanji.', shop: '3 customers.' };
      blocks.push({ id: 'skill', mode: skill, mins: 5, title: `Skill focus · ${MODE_BY_ID[skill].title}`, desc: `${WEEKDAY[weekday]}: ${goals[skill]}`, ctx: {} });
    }
  }

  blocks.forEach((b, i) => { b.n = i + 1; b.status = status(b.id); });
  const sunday = !short && date.getDay() === 0;
  const finished = blocks.every((b) => b.status);
  return { blocks, short, quiet, sunday, finished, minutes: blocks.reduce((a, b) => a + b.mins, 0) };
}

export function accuracyNote(rate, short) {
  if (rate == null) return 'Answer a few questions and your accuracy shows up here. About 85% is the sweet spot.';
  const pct = Math.round(rate * 100);
  if (rate > 0.95) {
    return `${pct}% is above the ~85% sweet spot, so it may be too easy. ${short ? 'Try the Standard length,' : 'Try'} new content: the next story chapter or more Kanji Forge.`;
  }
  if (rate < 0.7) return `${pct}% is below the ~85% sweet spot. Lean on review for a few days (Short sessions are perfect) and skip new content.`;
  return `${pct}%: right around the ~85% sweet spot, where learning sticks best.`;
}
