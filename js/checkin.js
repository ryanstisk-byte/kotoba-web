// Weekly check-in: once per ISO week, Today shows a short summary of last week and suggests one change, using the
// study program's accuracy bands: below 70% ease off (Short days, fewer new words), above 95% take on more
// (Standard days, full new words), otherwise keep going. One tap applies it; it never mentions streaks.
import { store, dateKey } from './store.js';
import { isoWeek, SKILL_LABELS } from './skills.js';
import { esc } from './ui.js';

const MIN_ANSWERS = 10;   // not enough to say anything below this

/** Monday..Sunday of the week before `now`, as date keys. */
export function lastWeekKeys(now = new Date()) {
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7) - 7);
  const keys = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i);
    keys.push(dateKey(d));
  }
  return keys;
}

/** Last week's summary and the suggestion, or null when there's nothing to say (or it was shown this week). */
export function weeklyCheckin(now = new Date()) {
  const week = isoWeek(now);
  if (store.engine.checkin === week) return null;
  const keys = lastWeekKeys(now);
  let ok = 0, tot = 0, days = 0;
  for (const k of keys) {
    const d = store.s.days[k];
    if (!d) continue;
    ok += d.ok; tot += d.tot;
    if (d.studied) days++;
  }
  if (tot < MIN_ANSWERS) return null;
  const rate = ok / tot;
  const short = store.settings.length === 'short';
  const less = store.settings.pace === 'less';
  const skills = store.skillDays(keys[0], keys[6]);
  const ranked = Object.entries(skills).filter(([, v]) => v.tot >= 5).sort((a, b) => a[1].rate - b[1].rate);
  const weakest = ranked.length >= 2 ? ranked[0] : null;
  let band, text, apply = null, applyLabel = '';
  if (rate < 0.7) {
    band = 'low';
    if (!short) { text = 'That\'s below the ~85% sweet spot. Short days for a week lean on review and skip new material.'; apply = 'short'; applyLabel = 'Switch to Short days'; }
    else if (!less) { text = 'That\'s below the ~85% sweet spot. Fewer new words (3 a day) gives review room to catch up.'; apply = 'less'; applyLabel = 'Fewer new words'; }
    else text = 'That\'s below the ~85% sweet spot, and you\'re already on the gentlest settings. Review is doing its job; it will climb.';
  } else if (rate > 0.95) {
    band = 'high';
    if (short) { text = 'That\'s above the ~85% sweet spot, so it may be too easy. Standard days add speaking and a skill block.'; apply = 'standard'; applyLabel = 'Switch to Standard days'; }
    else if (less) { text = 'That\'s above the ~85% sweet spot. Back to up to 5 new words a day?'; apply = 'normal'; applyLabel = 'More new words'; }
    else text = 'That\'s above the ~85% sweet spot. Push into new material: the next story chapter or more Kanji Forge.';
  } else {
    band = 'ok';
    text = 'Right around the ~85% sweet spot, where learning sticks best. Keep going as you are.';
  }
  return { week, ok, tot, rate, days, band, text, apply, applyLabel, weakest };
}

export function checkinCard(now = new Date()) {
  const c = weeklyCheckin(now);
  if (!c) return '';
  const pct = Math.round(c.rate * 100);
  return `<section class="panel engine-card checkin ${c.band}" aria-labelledby="checkin-h">
    <p class="hero-kicker">WEEKLY CHECK-IN</p>
    <h2 class="section-title" id="checkin-h">Last week: ${pct}% right</h2>
    <p class="small dim">${c.tot} answers over ${c.days} day${c.days === 1 ? '' : 's'} studied.${c.weakest ? ` Trickiest: ${esc(SKILL_LABELS[c.weakest[0]])} (${Math.round(c.weakest[1].rate * 100)}%).` : ''}</p>
    <p class="small">${esc(c.text)}</p>
    <div class="row2">${c.apply ? `<button class="btn primary" data-act="checkin-apply" data-v="${c.apply}">${esc(c.applyLabel)}</button>` : ''}
      <button class="btn ${c.apply ? 'ghost' : ''}" data-act="checkin-ok">${c.apply ? 'Keep as is' : 'Got it'}</button></div>
  </section>`;
}

/** Click handlers for the Today screen's engine cards. `redraw` re-renders Today. */
export function checkinHandlers(redraw) {
  return {
    'checkin-apply': (b) => {
      const v = b.dataset.v;
      if (v === 'short' || v === 'standard') store.setSetting('length', v);
      if (v === 'less' || v === 'normal') store.setSetting('pace', v);
      store.markCheckin(isoWeek());
      redraw();
    },
    'checkin-ok': () => { store.markCheckin(isoWeek()); redraw(); },
    'placement-skip': () => { store.skipPlacement(); redraw(); },
  };
}
