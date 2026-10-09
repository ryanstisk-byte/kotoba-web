// App shell: router with a real back stack, tab bar, home ("Today" plan), modes, progress, today banner,
// end-of-day reward, theme and text size, service worker.
import { store, dateKey } from './store.js';
import { speaker } from './audio.js';
import { MODES, MODE_BY_ID } from './data.js';
import { esc, delegate, toast } from './ui.js';
import { todayPlan, accuracyNote } from './today.js';
import * as fx from './fx.js';
import * as garden from './modes/garden.js';
import * as story from './modes/story.js';
import * as particle from './modes/particle.js';
import * as forge from './modes/forge.js';
import * as rhythm from './modes/rhythm.js';
import * as duel from './modes/duel.js';
import * as slice from './modes/slice.js';
import * as shop from './modes/shop.js';
import * as dojo from './modes/dojo.js';
import * as settings from './settings.js';
import * as soundcheck from './soundcheck.js';
import * as placement from './placement.js';
import * as progress from './progress.js';
import { checkinCard, checkinHandlers } from './checkin.js';
import { initReadingHelp, clearReadingHelp, readingConfig } from './furigana.js';

const MOUNTS = { dojo, garden, story, particle, forge, rhythm, duel, slice, shop };
/** A one-glyph badge per mode (decorative; the English title is the label). */
const MODE_GLYPH = { dojo: '読', garden: '庭', story: '話', particle: 'は', forge: '漢', rhythm: '拍', duel: '音', slice: '斬', shop: '店' };
const TABS = { '': 'today', modes: 'modes', garden: 'garden', progress: 'progress', settings: 'settings' };

const view = document.getElementById('view');
const banner = document.getElementById('banner');
const titleEl = document.getElementById('title');
const backBtn = document.getElementById('back');
const quietBadge = document.getElementById('quiet-badge');
const rubyBtn = document.getElementById('ruby-toggle');
const slowBtn = document.getElementById('slow-toggle');
const tabs = document.getElementById('tabs');
let cleanup = null;

// ---------- theme and text size ----------
function applyTheme() {
  const t = store.settings.theme;
  if (t === 'auto') document.documentElement.removeAttribute('data-theme');
  else document.documentElement.setAttribute('data-theme', t);
  const size = store.settings.textSize;
  if (size === 'm') document.documentElement.removeAttribute('data-text');
  else document.documentElement.setAttribute('data-text', size);
  const dark = t === 'dark' || (t === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.querySelector('meta[name=theme-color]:not([media])')?.setAttribute('content', dark ? '#0e0c14' : '#f6f1e8');
}

function refreshChrome() {
  quietBadge.hidden = !store.settings.quiet;
  speaker.source = store.settings.voiceSrc;
  speaker.speed = store.settings.speed;
  slowBtn.classList.toggle('on', store.settings.speed === 'slow');
  slowBtn.title = store.settings.speed === 'slow' ? 'Slow speech is on (tap for normal speed)' : 'Normal speed (tap for slow speech)';
  slowBtn.setAttribute('aria-pressed', String(store.settings.speed === 'slow'));
  slowBtn.setAttribute('aria-label', slowBtn.title);
  const labels = { auto: 'Auto', romaji: 'Romaji', kana: 'Kana', off: 'Off' };
  rubyBtn.textContent = 'ふa';
  rubyBtn.title = `Reading help: ${labels[store.settings.readingHelp]} (tap to change)`;
  rubyBtn.setAttribute('aria-label', rubyBtn.title);
  rubyBtn.classList.toggle('off', store.settings.readingHelp === 'off');
}

/** Re-render everything with a new reading-help setting. */
export function rerender() {
  clearReadingHelp(document.body);
  route();
}

// ---------- history: a back stack that always leads somewhere in the app ----------
// Each entry we create carries its depth in history.state. Depth 0 is the bottom of the app's stack.
let depth = 0;
let direction = 'fade';
const stack = [];     // hash at each depth, for "go home" without growing the stack

function currentHash() { return location.hash || '#/'; }

function syncDepth() {
  const st = history.state;
  if (st && typeof st.kbDepth === 'number') {
    direction = st.kbDepth < depth ? 'back' : st.kbDepth > depth ? 'fwd' : 'fade';
    depth = st.kbDepth;
  } else {
    depth += 1;
    direction = 'fwd';
    history.replaceState({ kbDepth: depth }, '');
  }
  stack[depth] = currentHash();
  stack.length = depth + 1;
}

/** One step back in the app; if there's nothing behind us (a deep link), go up to the parent screen. */
function goBack() {
  if (document.querySelector('.reward')) return;
  if (depth > 0) { history.back(); return; }
  const [a] = parse();
  location.replace(a === 'play' ? '#/modes' : '#/');
}

/** Return to Today: step back if Today is right behind us, otherwise go there. */
function goHome() {
  if (depth > 0 && (stack[depth - 1] === '#/' || stack[depth - 1] === '#')) history.back();
  else location.hash = '#/';
}

// ---------- routing ----------
function parse() {
  const h = location.hash.replace(/^#\/?/, '');
  return h.split('/').filter(Boolean);
}

let lastPath = null;

function route() {
  if (cleanup) { try { cleanup(); } catch (e) { console.warn(e); } cleanup = null; }
  speaker.stop();
  banner.innerHTML = '';
  banner.hidden = true;
  view.innerHTML = '';
  view.className = 'view';
  const path = parse().join('/');
  const moved = lastPath !== null && path !== lastPath;
  if (path !== lastPath) window.scrollTo(0, 0);
  const [a, b, c] = parse();
  refreshChrome();
  const tab = a === undefined ? 'today' : TABS[a] && !b ? TABS[a] : null;
  document.body.classList.toggle('has-tabs', !!tab);
  tabs.querySelectorAll('.tab').forEach((t) => {
    if (t.dataset.tab === tab) t.setAttribute('aria-current', 'page'); else t.removeAttribute('aria-current');
  });

  routeView(a, b, c);

  if (moved && !fx.reducedMotion()) {
    view.classList.add(direction === 'back' ? 'enter-back' : direction === 'fwd' ? 'enter-fwd' : 'enter-fade');
  }
  // Move focus to the new screen so keyboard and screen-reader users start at its content.
  if (moved && !view.contains(document.activeElement)) view.focus({ preventScroll: true });
  lastPath = path;
  direction = 'fade';
}

function routeView(a, b, c) {
  if (a === 'play' && MOUNTS[b]) {
    setTitle(MODE_BY_ID[b].title, true);
    view.classList.add('mode-' + b);
    cleanup = MOUNTS[b].mount(view, { quiet: store.settings.quiet });
    return;
  }
  if (a === 'garden' && !b) {
    setTitle('Garden', false);
    view.classList.add('mode-garden');
    cleanup = garden.mount(view, { quiet: store.settings.quiet });
    return;
  }
  if (a === 'today' && b) {
    const plan = todayPlan();
    const block = plan.blocks.find((x) => x.id === b);
    if (!block) { location.replace('#/'); return; }
    const modeId = block.mode || c;
    if (!modeId || !MOUNTS[modeId]) { renderFreePicker(block); return; }
    setTitle(MODE_BY_ID[modeId].title, true);
    view.classList.add('mode-' + modeId);
    const today = makeTodayCtx(block, modeId);
    cleanup = MOUNTS[modeId].mount(view, { ...block.ctx, quiet: store.settings.quiet, today });
    return;
  }
  if (a === 'settings') {
    setTitle('Settings', false);
    cleanup = settings.mount(view, { applyTheme, refreshChrome, rerender });
    return;
  }
  if (a === 'placement') {
    setTitle('Quick check', true);
    cleanup = placement.mount(view, { done: goHome });
    return;
  }
  if (a === 'check') {
    setTitle('Sound & mic check', true);
    cleanup = soundcheck.mount(view);
    return;
  }
  if (a === 'modes') { setTitle('Modes', false); renderModes(); return; }
  if (a === 'progress') { setTitle('Progress', false); progress.render(view); return; }
  setTitle('Kotoba Beat', false);
  renderHome();
}

function setTitle(t, back) {
  titleEl.textContent = t;
  backBtn.hidden = !back;
  document.title = t === 'Kotoba Beat' ? 'Kotoba Beat' : `${t} · Kotoba Beat`;
}

// ---------- today banner ----------
function makeTodayCtx(block, modeId) {
  let progress = '';
  let doneMsg = '';
  let isDone = block.status === 'done';
  const draw = () => {
    banner.hidden = false;
    banner.innerHTML = isDone
      ? `<div class="banner done"><span class="grow"><span class="strong">✓ Block ${block.n} done</span>${doneMsg ? `<br><span class="small">${esc(doneMsg)}</span>` : ''}</span>
          <a class="btn primary small-btn" href="#/" data-bact="home">Back to Today</a></div>`
      : `<div class="banner"><span class="grow"><span class="small dim">Today · block ${block.n}</span><br><span class="strong">${esc(MODE_BY_ID[modeId].title)}</span> <span class="mono small dim">${esc(progress)}</span></span>
          <button class="btn small-btn" data-bact="skip">Skip</button><button class="btn small-btn good" data-bact="done">Done ✓</button></div>`;
  };
  banner.onclick = (ev) => {
    const t = ev.target.closest('[data-bact]');
    if (!t) return;
    ev.preventDefault();
    if (t.dataset.bact === 'skip') store.setBlock(block.id, 'skipped');
    if (t.dataset.bact === 'done') store.setBlock(block.id, 'done');
    goHome();
    if (t.dataset.bact !== 'home') setTimeout(maybeReward, 60);
  };
  draw();
  return {
    report(text) { progress = text; if (!isDone) draw(); },
    done(msg = '') {
      doneMsg = msg;
      if (!isDone) { isDone = true; store.setBlock(block.id, 'done'); setTimeout(maybeReward, 900); }
      draw();
    },
  };
}

function renderFreePicker(block) {
  setTitle('Free choice', true);
  const quiet = store.settings.quiet;
  view.innerHTML = `<div class="stack"><p class="lead strong">Saturday: pick anything.</p>
    <div class="mode-grid">${MODES.map((m) => modeCard(m, quiet, `#/today/${block.id}/${m.id}`)).join('')}</div></div>`;
}

// ---------- end-of-day reward ----------
function maybeReward() {
  const plan = todayPlan();
  if (!plan.finished || !plan.blocks.some((b) => b.status === 'done')) return;
  const key = 'kotobaBeat.reward.' + dateKey();
  try { if (sessionStorage.getItem(key)) return; sessionStorage.setItem(key, '1'); } catch (e) { /* show it anyway */ }
  showReward(plan);
}

function showReward(plan) {
  if (document.querySelector('.reward')) return;
  const acc = store.weekAccuracy();
  const d = store.day();
  const done = plan.blocks.filter((b) => b.status === 'done').length;
  const before = document.activeElement;
  const el = document.createElement('div');
  el.className = 'reward';
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-modal', 'true');
  el.setAttribute('aria-labelledby', 'reward-h');
  el.innerHTML = `<div class="reward-card">
      <p class="reward-kicker">TODAY · COMPLETE</p>
      <h2 class="reward-title" id="reward-h" lang="ja">おつかれさま！</h2>
      <p class="lead strong">That's today's training done. ${done} of ${plan.blocks.length} blocks.</p>
      <div class="tiles">
        <div class="tile"><span class="tile-v mono">${d.rev}</span><span class="small dim">reviewed</span></div>
        <div class="tile"><span class="tile-v mono">${d.tot ? Math.round((d.ok / d.tot) * 100) + '%' : '–'}</span><span class="small dim">right today</span></div>
        <div class="tile"><span class="tile-v mono">${Object.keys(store.s.items).length}</span><span class="small dim">words growing</span></div>
      </div>
      <p class="small dim">${esc(accuracyNote(acc.rate, plan.short))}</p>
      <button class="btn primary wide" data-act="close">Back to Today</button>
    </div>`;
  const close = () => {
    el.remove();
    window.removeEventListener('keydown', onKey, true);
    if (parse()[0] !== undefined) goHome(); else if (before && before.isConnected) before.focus();
  };
  const onKey = (e) => {
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); }
    if (e.key === 'Tab') { e.preventDefault(); el.querySelector('button').focus(); }   // a single control: keep focus on it
  };
  el.addEventListener('click', (e) => { if (e.target === el || e.target.closest('[data-act=close]')) close(); });
  window.addEventListener('keydown', onKey, true);
  document.body.appendChild(el);
  el.querySelector('button').focus();
  fx.sound('fanfare');
  fx.buzz([20, 60, 20, 60, 40]);
}

// ---------- shared pieces ----------
function welcome() {
  const last = store.previousSession;
  if (!last) return "ようこそ! Let's start with sounds you mostly know.";
  const days = Math.floor((Date.now() - last) / 86_400_000);
  if (days >= 2) return `おかえり! ${days} days away. Nothing was lost; let's warm up.`;
  return 'おかえり! Pick up where you left off.';
}

function modeCard(m, quiet, href) {
  const needsMic = m.mic && quiet;
  return `<a class="panel mode-card" href="${href}">
    <span class="mode-icon" aria-hidden="true" lang="ja" data-noruby>${MODE_GLYPH[m.id] || m.icon}</span>
    <span class="grow"><span class="strong big">${esc(m.title)}</span> <span class="small dim" lang="ja">${esc(m.jp)}</span>
      ${needsMic ? `<span class="tag">${m.id === 'slice' ? 'quiet: listen &amp; choose' : 'needs mic'}</span>` : ''}
      <br><span class="small dim">${esc(m.body)}</span></span>
    <span class="dim chev" aria-hidden="true">›</span></a>`;
}

function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
}

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

// ---------- home ----------
function renderHome() {
  const plan = todayPlan();
  const items = Object.values(store.s.items);
  const thirsty = store.thirsty().length;
  const well = items.filter((p) => p.level >= 2).length;
  const quiet = store.settings.quiet;
  const showHint = !isStandalone() && !store.settings.hideIosHint;
  const doneCount = plan.blocks.filter((b) => b.status === 'done').length;
  const next = plan.blocks.find((b) => !b.status) || plan.blocks.find((b) => b.status === 'skipped');
  const now = new Date();

  const blockRow = (b) => {
    const st = b.status;
    const href = `#/today/${b.id}`;
    return `<div class="block-row ${st || ''} ${b === next && !st ? 'next' : ''}">
      <span class="block-check" aria-label="${st === 'done' ? 'done' : st === 'skipped' ? 'skipped' : 'to do'}">${st === 'done' ? '✓' : st === 'skipped' ? '–' : b.n}</span>
      <span class="grow"><span class="strong">${esc(b.title)}</span> <span class="small dim">~${b.mins} min</span><br><span class="small dim">${esc(b.desc)}</span></span>
      ${st === 'done' ? `<a class="btn small-btn" href="${href}">Again</a>`
        : `<span class="block-actions"><a class="btn ${b === next ? 'primary' : ''} small-btn" href="${href}">${st === 'skipped' ? 'Do it' : 'Start'}</a>${st ? '' : `<button class="btn small-btn ghost" data-act="skip" data-id="${b.id}">Skip</button>`}</span>`}
    </div>`;
  };

  const acc = store.weekAccuracy();
  view.innerHTML = `
    <div class="home">
      <div class="stack home-main">
        <section class="hero speedlines" aria-labelledby="today-h">
          <p class="hero-kicker">${WEEKDAYS[now.getDay()]} · ${now.getDate()} ${MONTHS[now.getMonth()]}</p>
          <h1 class="hero-title"><span class="jp-mark" lang="ja" aria-hidden="true" data-noruby>今日</span><span id="today-h">Today</span></h1>
          <p class="dim">${esc(welcome())}</p>
          <div class="meter-row">
            <span class="pips" aria-hidden="true">${plan.blocks.map((b) => `<span class="pip ${b.status || ''}"></span>`).join('')}</span>
            <span class="small dim">${doneCount} of ${plan.blocks.length} done · about ${plan.minutes} min</span>
          </div>
          ${next ? `<div class="hero-next">
              <a class="btn primary wide" href="#/today/${next.id}">▶ ${next.status === 'skipped' ? 'Do' : 'Start'}: ${esc(next.title)}</a>
              <p class="small dim">${esc(next.desc)}</p></div>`
            : `<p class="lead strong good-c">✓ Today's plan is done. Come back whenever.</p>`}
        </section>

        ${checkinCard()}${placementCardHTML()}
        <section class="panel today" aria-label="Today's plan">
          <div class="row-between wrap-gap">
            <h2 class="section-title">The plan</h2>
            <div class="seg compact" role="radiogroup" aria-label="Session length">
              <button class="seg-btn ${!plan.short ? 'on' : ''}" data-act="len" data-v="standard" role="radio" aria-checked="${!plan.short}">Standard ~20m</button>
              <button class="seg-btn ${plan.short ? 'on' : ''}" data-act="len" data-v="short" role="radio" aria-checked="${plan.short}">Short ~10m</button>
            </div>
          </div>
          <label class="switch-row small"><span>🤫 Quiet mode (no speaking: trains, planes)</span><input type="checkbox" role="switch" data-act="quiet" ${quiet ? 'checked' : ''}></label>
          ${plan.blocks.map(blockRow).join('')}
          ${plan.sunday ? '<p class="small dim">Sunday: review only. 休む ことも 修行だ (resting is part of training too).</p>' : ''}
          <p class="tiny dim">Skip anything. Nothing is lost by skipping blocks or days.</p>
        </section>

        ${plan.finished && doneCount ? `
        <section class="panel summary" aria-label="Today's summary">
          <h2 class="section-title">お疲れさま! Today's done</h2>
          <div class="tiles">
            <div class="tile"><span class="tile-v mono">${Object.keys(store.s.items).length}</span><span class="small dim">words in the garden</span></div>
            <div class="tile"><span class="tile-v mono">${store.day().rev}</span><span class="small dim">reviewed today</span></div>
            <div class="tile"><span class="tile-v mono">${acc.rate == null ? '–' : Math.round(acc.rate * 100) + '%'}</span><span class="small dim">accuracy this week</span></div>
          </div>
          <p class="small">${esc(accuracyNote(acc.rate, plan.short))}</p>
          <p class="small dim">Days studied this month: ${store.daysStudiedThisMonth()}. No streaks here; come back whenever.</p>
        </section>` : ''}
      </div>

      <aside class="stack home-side" aria-label="At a glance">
        ${!store.trackDone('hiragana') && !store.clearedLessons.size ? `<a class="panel hint link-panel" href="#/play/dojo"><span class="grow small">🔤 <span class="strong">New to reading Japanese?</span> Start in the Reading Dojo: hiragana, katakana, then kanji. Until then, every game shows romaji (tap ふa at the top to change it).</span><span class="dim chev" aria-hidden="true">›</span></a>` : ''}
        <section class="panel stack-sm" aria-label="Garden at a glance">
          <div class="tiles">
            <div class="tile"><span class="tile-v mono">${thirsty}</span><span class="small dim">plants need water</span></div>
            <div class="tile"><span class="tile-v mono">${well}</span><span class="small dim">remembered well</span></div>
            <div class="tile"><span class="tile-v mono">${store.daysStudiedThisMonth()}</span><span class="small dim">days studied this month</span></div>
          </div>
          <a class="linkbtn" href="#/progress">See all your progress ›</a>
        </section>
        ${showHint ? `<div class="panel hint"><span class="grow small">📱 On iPhone: <span class="strong">Share › Add to Home Screen</span> keeps your progress safe (Safari may clear website data after ~7 days unused).</span>
          <button class="iconbtn" data-act="hidehint" aria-label="Dismiss">✕</button></div>` : ''}
        <a class="panel hint link-panel" href="#/check"><span class="grow small">🔧 No sound, or the mic doesn't hear you? Run the <span class="strong">sound &amp; mic check</span>.</span><span class="dim chev" aria-hidden="true">›</span></a>
      </aside>
    </div>`;
  const off = delegate(view, {
    skip: (b) => { store.setBlock(b.dataset.id, 'skipped'); renderHome(); maybeReward(); },
    len: (b) => { store.setSetting('length', b.dataset.v); renderHome(); },
    hidehint: () => { store.setSetting('hideIosHint', true); renderHome(); },
    ...checkinHandlers(renderHome),
  });
  const onChange = (ev) => {
    if (ev.target.matches('[data-act=quiet]')) { store.setSetting('quiet', ev.target.checked); refreshChrome(); renderHome(); view.querySelector('[data-act=quiet]')?.focus(); }
  };
  view.addEventListener('change', onChange);
  if (cleanup) cleanup();
  cleanup = () => { off(); view.removeEventListener('change', onChange); };
}

// ---------- modes ----------
function renderModes() {
  const quiet = store.settings.quiet;
  const groups = [...new Set(MODES.map((m) => m.group))];
  view.innerHTML = `<div class="stack">
    <p class="dim">Every mode, any time. The Today plan picks a few for you each day.</p>
    ${groups.map((g) => `<section class="stack-sm" aria-label="${esc(g)}">
      <h2 class="section-label">${esc(g.toUpperCase())}</h2>
      <div class="mode-grid wide">${MODES.filter((m) => m.group === g).map((m) => modeCard(m, quiet, `#/play/${m.id}`)).join('')}</div>
    </section>`).join('')}
    <p class="small dim">Tip: the app has its own built-in voice that works everywhere. For more variety, switch to your device's Japanese voices in Settings.</p>
  </div>`;
}

// ---------- progress (js/progress.js) and engine cards on Today (js/checkin.js, js/placement.js) ----------
function placementCardHTML() { return placement.placementCard(); }

// ---------- boot ----------
backBtn.addEventListener('click', goBack);
window.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape' || e.defaultPrevented || backBtn.hidden) return;
  if (e.target.closest?.('input, textarea, select')) return;
  goBack();
});
window.addEventListener('hashchange', () => { syncDepth(); route(); });
slowBtn.addEventListener('click', () => {
  const slow = store.settings.speed !== 'slow';
  store.setSetting('speed', slow ? 'slow' : 'normal');
  refreshChrome();
  toast(slow ? '🐢 Slow speech on' : 'Normal speech speed');
});
rubyBtn.addEventListener('click', () => {
  const order = ['auto', 'romaji', 'kana', 'off'];
  const next = order[(order.indexOf(store.settings.readingHelp) + 1) % order.length];
  store.setSetting('readingHelp', next);
  const c = readingConfig();
  const what = next === 'off' ? 'off' : next === 'auto'
    ? `auto (now: ${c.hira ? 'romaji over everything' : c.kata ? 'romaji over katakana, furigana over kanji' : 'furigana over kanji'})`
    : next === 'romaji' ? 'romaji over everything' : 'furigana over kanji';
  refreshChrome();
  rerender();
  toast(`Reading help: ${what}`);
});
window.matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', applyTheme);
applyTheme();
store.markSession();
refreshChrome();
initReadingHelp([document.body]);

// A screen opened directly (bookmark, home-screen shortcut, reload) gets Today underneath it, so back stays in the app.
if (history.state && typeof history.state.kbDepth === 'number') {
  depth = history.state.kbDepth;
} else if (parse().length) {
  const target = currentHash();
  history.replaceState({ kbDepth: 0 }, '', '#/');
  stack[0] = '#/';
  history.pushState({ kbDepth: 1 }, '', target);
  depth = 1;
} else {
  history.replaceState({ kbDepth: 0 }, '');
}
stack[depth] = currentHash();
route();

// Ask the browser not to evict our storage (helps on Chrome; Safari needs Add to Home Screen).
try { navigator.storage?.persist?.().catch(() => {}); } catch (e) { /* ignore */ }

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch((e) => console.warn('SW registration failed', e));
  });
}
