// Story (StoryView.swift): Kotoba Dojo, visual-novel style.
import { store } from '../store.js';
import { speaker } from '../audio.js';
import { CHAPTERS, CAST } from '../data.js';
import { esc, delegate } from '../ui.js';

export function mount(el, ctx) {
  let chapter = null;
  let index = 0;
  let showEnglish = false;
  let showReading = true;
  let choiceSolved = false;
  let wrongReply = null;
  let selectedWord = null;
  let finished = false;
  let isReplay = false;
  let choiceMissed = false;

  const beat = () => chapter.beats[Math.min(index, chapter.beats.length - 1)];

  function renderList() {
    const cleared = store.clearedChapters;
    el.innerHTML = `
      <div class="stack">
        <h2 class="title-jp">言葉の道場</h2>
        <p class="dim">Kotoba Dojo: Ren wants to get stronger. Each line uses words you know plus about one new one. Words you meet get planted in your garden.</p>
        ${CHAPTERS.map((ch) => {
          const unlocked = ch.number === 1 || cleared.has('ch' + (ch.number - 1));
          return `<button class="panel chapter-row" data-act="open" data-id="${ch.id}" ${unlocked ? '' : 'disabled'}>
            <span class="ch-num ${unlocked ? '' : 'locked'}">${ch.number}</span>
            <span class="grow"><span class="strong big">${esc(ch.title)}</span><br><span class="small dim">${esc(ch.en)}</span></span>
            <span>${cleared.has(ch.id) ? '<span class="good-c" aria-label="cleared">✔︎</span>' : unlocked ? '' : '🔒'}</span>
          </button>`;
        }).join('')}
        <p class="small dim">More chapters coming: the tournament arc.</p>
      </div>`;
  }

  function open(ch) {
    chapter = ch;
    index = 0;
    finished = false;
    // Furigana starts on for a new chapter and off on replays of cleared ones.
    isReplay = store.clearedChapters.has(ch.id);
    showReading = !isReplay;
    enterBeat();
  }

  function speak() {
    const b = beat();
    speaker.speak(b.jp, { mps: 4.5, voice: b.speaker.voice });
  }

  function enterBeat() {
    showEnglish = false;
    selectedWord = null;
    wrongReply = null;
    choiceSolved = false;
    choiceMissed = false;
    for (const w of beat().words) store.plant(w.gardenID);
    render();
    speak();
  }

  function advance() {
    if (index + 1 < chapter.beats.length) {
      index++;
      if (ctx.today) ctx.today.report(`${index + 1}/${chapter.beats.length}`);
      enterBeat();
    } else {
      store.clearChapter(chapter.id);
      if (isReplay) store.noteReplay(chapter.id);
      store.markStudied();
      speaker.stop();
      finished = true;
      render();
      if (ctx.today) ctx.today.done();
    }
  }

  function render() {
    if (!chapter) return renderList();
    if (finished) return renderFinished();
    const b = beat();
    const c = b.speaker;
    const pct = ((index + 1) / chapter.beats.length) * 100;
    el.innerHTML = `
      <div class="stack">
        <div class="row-between"><span class="small dim">${chapter.number}. ${esc(chapter.title)}</span>
          ${ctx.today ? '' : '<button class="btn ghost small-btn" data-act="list">Chapters</button>'}</div>
        <div class="bar"><span style="width:${pct}%"></span></div>
        <div class="speaker-row">
          <span class="avatar" style="background:${c.color}">${esc([...c.jpName][0])}</span>
          <span class="grow"><span class="strong" style="color:${c.color}">${esc(c.jpName)}</span><br><span class="small dim">${esc(c.name)}</span></span>
          <button class="chip-toggle ${showReading ? 'on' : ''}" data-act="furi" aria-pressed="${showReading}">ふりがな</button>
        </div>
        <button class="panel line-card" data-act="meaning" aria-label="Tap to show meaning">
          ${showReading ? `<span class="reading dim">${esc(b.reading)}</span>` : ''}
          <span class="line-jp" lang="ja">${esc(b.jp)}</span>
          ${showEnglish ? `<span class="trace-c">${esc(b.en)}</span>` : '<span class="small dim">Tap for meaning</span>'}
        </button>
        ${b.words.length ? `<div class="chips">${b.words.map((w, i) => `<button class="chip" data-act="word" data-i="${i}" lang="ja">${esc(w.jp)}</button>`).join('')}</div>` : ''}
        ${selectedWord ? `<p>${esc(selectedWord.jp)} (${esc(selectedWord.reading)}): ${esc(selectedWord.en)}</p>` : ''}
        ${b.note ? `<div class="panel note">💡 ${esc(b.note)}</div>` : ''}
        ${b.choice && !choiceSolved ? `
          <div class="stack-sm">
            <p class="strong">${esc(b.choice.prompt)}</p>
            ${wrongReply ? `<p class="miss-c">${esc(wrongReply)}</p>` : ''}
            ${b.choice.options.map((o, i) => `<button class="btn left" data-act="choice" data-i="${i}" lang="ja">${esc(o)}</button>`).join('')}
          </div>` : `
          <div class="row3">
            <button class="btn" data-act="replay" aria-label="Replay">🔊 Replay</button>
            <button class="btn" data-act="meaning" aria-label="Meaning">📖 Meaning</button>
            <button class="btn primary" data-act="next" aria-label="Next">Next ▶</button>
          </div>`}
      </div>`;
  }

  function renderFinished() {
    const words = chapter.beats.flatMap((b) => b.words);
    el.innerHTML = `
      <div class="stack">
        <h2 class="accent-c title-jp" data-noruby>第${chapter.number}話 クリア！</h2>
        <p>Chapter ${chapter.number} cleared. These words are now growing in your garden:</p>
        <div class="panel word-list">${words.map((w) => `
          <div class="word-row"><span class="strong" lang="ja">${esc(w.jp)}</span><span class="dim" lang="ja">${esc(w.reading)}</span><span class="small dim grow right">${esc(w.en)}</span></div>`).join('')}
        </div>
        <p class="small dim">Replay it later with furigana off to read it from memory.</p>
        ${ctx.today ? '' : '<button class="btn primary wide" data-act="list">Back to chapters</button>'}
      </div>`;
  }

  const off = delegate(el, {
    open: (b) => open(CHAPTERS.find((c) => c.id === b.dataset.id)),
    list: () => { chapter = null; speaker.stop(); render(); },
    furi: () => { showReading = !showReading; render(); },
    meaning: () => { showEnglish = !showEnglish; render(); },
    word: (b) => { selectedWord = beat().words[+b.dataset.i]; speaker.speak(selectedWord.reading, { mps: 3 }); render(); },
    replay: speak,
    next: advance,
    choice: (btn) => {
      const ch = beat().choice;
      const i = +btn.dataset.i;
      if (i === ch.answer) {
        wrongReply = null;
        choiceSolved = true;
        speaker.speak(ch.options[i], { mps: 4, voice: CAST.ren.voice });
        if (!choiceMissed) store.log(true);
      } else {
        if (!choiceMissed) store.log(false);
        choiceMissed = true;
        wrongReply = ch.wrongReply;
      }
      render();
    },
  });

  if (ctx.chapterId) {
    open(CHAPTERS.find((c) => c.id === ctx.chapterId) || CHAPTERS[0]);
    if (ctx.today) ctx.today.report(`1/${chapter.beats.length}`);
  } else {
    render();
  }
  return () => { off(); speaker.stop(); };
}
