// Settings: quiet mode, session length, theme, voices, mic test, latency calibration, export/import.
import { store } from './store.js';
import { speaker, recognitionSupported, micSupported, PitchTracker, audioContext, click, micHelp } from './audio.js';
import { esc, delegate, toast } from './ui.js';
import { median } from './modes/rhythm.js';

export function mount(el, ctx) {
  let calib = null;        // { beats: [perfMs], taps: [perfMs], timers, result }
  let pending = null;      // parsed import waiting for confirmation
  let importError = '';
  let code = '';
  let micTest = null;
  let micTimer = 0;
  let resetArmed = false;

  function render() {
    const st = store.settings;
    const voices = speaker.voices;
    el.innerHTML = `
      <div class="stack">
        <section class="panel stack-sm">
          <h2 class="section-title">Study</h2>
          <label class="switch-row"><span><span class="strong">Quiet mode</span><br><span class="small dim">For trains and planes. Speaking modes switch to listen-and-choose, and the daily plan skips anything that needs the mic.</span></span>
            <input type="checkbox" data-act="quiet" ${st.quiet ? 'checked' : ''}></label>
          <div><span class="strong">Daily session</span>
            <div class="seg" role="radiogroup">
              <button class="seg-btn ${st.length === 'standard' ? 'on' : ''}" data-act="len" data-v="standard" role="radio" aria-checked="${st.length === 'standard'}">Standard ~20 min</button>
              <button class="seg-btn ${st.length === 'short' ? 'on' : ''}" data-act="len" data-v="short" role="radio" aria-checked="${st.length === 'short'}">Short ~10 min</button>
            </div></div>
          <div><span class="strong">Theme</span>
            <div class="seg" role="radiogroup">
              ${['auto', 'light', 'dark'].map((t) => `<button class="seg-btn ${st.theme === t ? 'on' : ''}" data-act="theme" data-v="${t}" role="radio" aria-checked="${st.theme === t}">${t[0].toUpperCase() + t.slice(1)}</button>`).join('')}
            </div></div>
        </section>

        <section class="panel stack-sm">
          <h2 class="section-title">Reading help</h2>
          <p class="small dim">Shows how to read the Japanese in every game. The ふa button at the top switches it quickly.</p>
          <div class="seg seg-wrap" role="radiogroup">
            ${[['auto', 'Auto'], ['romaji', 'Romaji'], ['kana', 'Furigana'], ['off', 'Off']].map(([v, t]) => `<button class="seg-btn ${st.readingHelp === v ? 'on' : ''}" data-act="ruby" data-v="${v}" role="radio" aria-checked="${st.readingHelp === v}">${t}</button>`).join('')}
          </div>
          <p class="small">${{
            auto: 'Auto: romaji over everything until you finish hiragana in the Reading Dojo, then romaji over katakana only, then just kana over kanji.',
            romaji: 'Romaji over all Japanese text.',
            kana: 'Kana (furigana) over kanji only.',
            off: 'No help: read it yourself.',
          }[st.readingHelp]}</p>
          <p class="small dim">Example: <span lang="ja">明日から 修行だ！</span></p>
        </section>

        <section class="panel stack-sm">
          <h2 class="section-title">Voice</h2>
          <div class="seg seg-wrap" role="radiogroup">
            ${[['auto', 'Best available'], ['clips', 'Built-in'], ['device', 'All device voices']].map(([v, t]) => `<button class="seg-btn ${st.voiceSrc === v ? 'on' : ''}" data-act="voice" data-v="${v}" role="radio" aria-checked="${st.voiceSrc === v}">${t}</button>`).join('')}
          </div>
          <p class="small">${{
            auto: 'The built-in VOICEVOX voices, one per character.' + (speaker.natural.length ? ` Anything without a clip uses ${esc(speaker.natural[0].name)}.` : ''),
            clips: 'The built-in VOICEVOX voices, one per character: works offline and on any device.',
            device: 'Rotates through every Japanese voice on this device, for variety.',
          }[st.voiceSrc]}</p>
          <div><span class="strong">Speed</span>
            <div class="seg" role="radiogroup">
              ${[['normal', 'Normal'], ['slow', '🐢 Slow']].map(([v, t]) => `<button class="seg-btn ${st.speed === v ? 'on' : ''}" data-act="speed" data-v="${v}" role="radio" aria-checked="${st.speed === v}">${t}</button>`).join('')}
            </div>
            <p class="small dim">Or tap 🐢 at the top of any screen.</p></div>
          <div class="row2"><button class="btn" data-act="testvoice" data-v="clips">🔊 Built-in</button><button class="btn" data-act="testvoice" data-v="device">🔊 Device</button></div>
          ${!speaker.supported ? '<p class="small miss-c">This browser has no device voices.</p>'
            : voices.length ? `<p class="small">${voices.length} Japanese device voice${voices.length === 1 ? '' : 's'}: <span class="dim">${voices.map((v) => esc(v.name) + (v.localService ? '' : ' (online)')).join(' · ')}</span></p>`
            : '<p class="small miss-c">No Japanese device voice found. The built-in voice still works.</p>'}
          <details><summary class="small strong">How to add Japanese device voices</summary>
            <ul class="small dim">
              <li>iPhone: Settings › Accessibility › Spoken Content › Voices › Japanese (download the Enhanced ones).</li>
              <li>Mac: System Settings › Accessibility › Spoken Content › System voice › Manage Voices › Japanese.</li>
              <li>Windows: Settings › Time &amp; language › Speech › Add voices › Japanese. Chrome and Edge also have online voices.</li>
            </ul></details>
          <a class="btn wide" href="#/check">🔧 Sound &amp; mic check</a>
        </section>

        <section class="panel stack-sm">
          <h2 class="section-title">Microphone</h2>
          <p class="small">Speech recognition: <span class="${recognitionSupported ? 'good-c' : 'miss-c'}">${recognitionSupported ? 'available (Japanese, needs internet in Chrome)' : 'not available here: speaking modes use self-grading'}</span></p>
          <p class="small">Pitch tracking (Rhythm): <span class="${micSupported ? 'good-c' : 'miss-c'}">${micSupported ? 'available' : 'not available'}</span></p>
          <button class="btn" data-act="mictest">${micTest ? '■ Stop mic test' : '🎤 Test mic + pitch'}</button>
          ${micTest ? `<p class="mono" id="mic-out">${esc(micTest.msg || 'Listening…')}</p>` : ''}
        </section>

        <section class="panel stack-sm">
          <h2 class="section-title">Audio latency</h2>
          <p class="small dim">Tap along with the clicks so Rhythm can line your voice up with the beat. Current offset: <span class="strong mono" id="lat-val">${st.latencyMs} ms</span></p>
          ${calibHTML()}
          <label class="small">Fine-tune <input type="range" min="-100" max="400" step="10" value="${st.latencyMs}" data-act="latrange" aria-label="Latency offset in milliseconds"></label>
        </section>

        <section class="panel stack-sm">
          <h2 class="section-title">Move progress between devices</h2>
          <p class="small dim">Export here, then import on your PC or phone. Importing replaces the progress on that device.</p>
          <div class="row2"><button class="btn" data-act="copycode">📋 Copy code</button><button class="btn" data-act="download">⬇ Download .json</button></div>
          ${code ? `<textarea class="code" readonly rows="3" aria-label="Progress code">${esc(code)}</textarea>` : ''}
          <textarea id="import-text" rows="3" placeholder="Paste a progress code or .json here" aria-label="Paste progress to import"></textarea>
          <div class="row2"><button class="btn" data-act="importtext">Import pasted</button>
            <label class="btn filebtn">📁 Pick file<input type="file" accept=".json,application/json,text/plain" data-act-change="file" hidden></label></div>
          ${importError ? `<p class="miss-c small">${esc(importError)}</p>` : ''}
          ${pending ? `<div class="panel note stack-sm"><p>Replace this device's progress with the import? It has ${Object.keys(pending.items).length} plants, ${pending.chapters.length} chapters cleared and ${pending.forged.length} kanji forged.</p>
            <div class="row2"><button class="btn primary" data-act="confirmimport">Replace</button><button class="btn" data-act="cancelimport">Cancel</button></div></div>` : ''}
        </section>

        <section class="panel stack-sm">
          <h2 class="section-title">Keep progress safe</h2>
          <p class="small">On iPhone: Share › Add to Home Screen keeps your progress safe. Safari can clear website data after about 7 days without a visit, but not for Home Screen apps. Export now and then as a backup.</p>
          ${store.saveOk ? '' : '<p class="miss-c small">Saving is blocked in this browser (private mode?). Progress will not persist.</p>'}
          <button class="btn ${resetArmed ? 'danger' : ''}" data-act="reset">${resetArmed ? 'Tap again to erase all progress' : 'Reset all progress'}</button>
        </section>
        <p class="tiny dim center-text">Kotoba Beat web · works offline once loaded</p>
        <p class="tiny dim center-text" lang="ja" data-noruby>Voices: VOICEVOX:四国めたん · VOICEVOX:白上虎太郎 · VOICEVOX:青山龍星 · VOICEVOX:玄野武宏 · VOICEVOX:東北イタコ · VOICEVOX:ずんだもん</p>
      </div>`;
  }

  function calibHTML() {
    if (!calib) return '<button class="btn primary wide" data-act="calib">Start tap-along (10 clicks)</button>';
    if (calib.result == null) {
      return `<div class="calib"><div class="calib-dot" id="calib-dot"></div>
        <button class="btn primary wide tapbtn" data-act="tap">TAP on each click (or press Space)</button>
        <p class="small dim center-text">${calib.taps.length} taps</p></div>`;
    }
    return `<div class="stack-sm"><p>Measured offset: <span class="strong mono">${calib.result} ms</span> (${calib.used} taps)</p>
      <div class="row2"><button class="btn primary" data-act="savecalib">Use it</button><button class="btn" data-act="calib">Try again</button></div></div>`;
  }

  function startCalib() {
    const ac = audioContext();
    if (!ac) { toast('No Web Audio in this browser.'); return; }
    stopCalib();
    const interval = 0.6;
    const first = ac.currentTime + 0.8;
    const perfNow = performance.now();
    const beats = [];
    calib = { beats, taps: [], timers: [], result: null };
    for (let i = 0; i < 10; i++) {
      const t = first + i * interval;
      click(ac, t, i < 2 ? 1500 : 1000);
      const perf = perfNow + (t - ac.currentTime) * 1000;
      beats.push(perf);
      calib.timers.push(setTimeout(() => {
        const d = el.querySelector('#calib-dot');
        if (d) { d.classList.add('flash'); setTimeout(() => d.classList.remove('flash'), 120); }
      }, perf - performance.now()));
    }
    calib.timers.push(setTimeout(finishCalib, beats[beats.length - 1] - performance.now() + 700));
    render();
  }

  function tap(ts) {
    if (!calib || calib.result != null) return;
    calib.taps.push(ts);
    const p = el.querySelector('.calib .small');
    if (p) p.textContent = `${calib.taps.length} taps`;
  }

  function finishCalib() {
    if (!calib) return;
    // Ignore the two warm-up clicks; match each tap to its nearest beat.
    const offs = [];
    for (const t of calib.taps) {
      let best = null;
      calib.beats.forEach((b, i) => { if (i >= 2 && (best === null || Math.abs(t - b) < Math.abs(best))) best = t - b; });
      if (best !== null && Math.abs(best) < 300) offs.push(best);
    }
    calib.used = offs.length;
    calib.result = offs.length >= 3 ? Math.round(median(offs) / 10) * 10 : null;
    if (calib.result == null) { toast('Not enough taps on the beat. Try again.'); calib = null; }
    render();
  }

  function stopCalib() {
    if (calib) calib.timers.forEach(clearTimeout);
  }

  function setLatency(v) {
    store.setSetting('latencyMs', Math.max(-100, Math.min(400, Math.round(v))));
  }

  async function toggleMic() {
    if (micTest) { micTest.tracker.stop(); clearInterval(micTimer); micTest = null; render(); return; }
    const tracker = new PitchTracker();
    micTest = { tracker, msg: 'Starting…' };
    render();
    try {
      await tracker.start();
      micTimer = setInterval(() => {
        const out = el.querySelector('#mic-out');
        const msg = `level ${tracker.liveLevel.toFixed(3)} · ${tracker.liveHz ? Math.round(tracker.liveHz) + ' Hz' : 'no pitch'}`;
        if (micTest) micTest.msg = msg;
        if (out) out.textContent = msg;
      }, 150);
    } catch (e) {
      micTest.msg = e && e.name === 'NotAllowedError' ? micHelp() : `Mic error: ${(e && e.message) || e}`;
      tracker.stop();
      render();
    }
  }

  function tryImport(text) {
    importError = '';
    pending = null;
    try {
      pending = store.parseImport(text);
    } catch (e) {
      importError = e && e.message && !/JSON|token|atob|decode/i.test(e.message) ? e.message : 'That code could not be read. Copy the whole code, including KOTOBA1:';
    }
    render();
  }

  async function copyCode() {
    code = store.exportCode();
    let ok = false;
    try { await navigator.clipboard.writeText(code); ok = true; } catch (e) { /* fall back to manual copy */ }
    render();
    const ta = el.querySelector('textarea.code');
    if (!ok && ta) { ta.focus(); ta.select(); try { ok = document.execCommand('copy'); } catch (e) { /* ignore */ } }
    toast(ok ? 'Progress code copied.' : 'Select the code and copy it.');
  }

  function download() {
    const blob = new Blob([store.exportJSON()], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `kotoba-beat-progress-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
    toast('Progress file downloaded.');
  }

  const off = delegate(el, {
    len: (b) => { store.setSetting('length', b.dataset.v); render(); },
    theme: (b) => { store.setSetting('theme', b.dataset.v); ctx.applyTheme(); render(); },
    testvoice: (b) => {
      if (b.dataset.v === 'device') speaker.speakDevice('こんにちは', { mps: 4 });
      else { const prev = speaker.source; speaker.source = 'clips'; speaker.speak('こんにちは', { mps: 4 }); speaker.source = prev; }
    },
    ruby: (b) => { store.setSetting('readingHelp', b.dataset.v); ctx.refreshChrome(); ctx.rerender(); },
    voice: (b) => { store.setSetting('voiceSrc', b.dataset.v); ctx.refreshChrome(); render(); },
    speed: (b) => { store.setSetting('speed', b.dataset.v); ctx.refreshChrome(); render(); },
    mictest: toggleMic,
    calib: startCalib,
    savecalib: () => { setLatency(calib.result); calib = null; toast('Latency saved.'); render(); },
    copycode: copyCode,
    download,
    importtext: () => tryImport(el.querySelector('#import-text').value),
    confirmimport: () => { store.applyImport(pending); pending = null; ctx.applyTheme(); toast('Progress imported.'); render(); },
    cancelimport: () => { pending = null; render(); },
    reset: () => {
      if (!resetArmed) { resetArmed = true; render(); return; }
      store.resetAll(); resetArmed = false; toast('Progress erased.'); render();
    },
  });

  const onChange = (ev) => {
    const t = ev.target;
    if (t.matches('[data-act=quiet]')) { store.setSetting('quiet', t.checked); ctx.refreshChrome(); }
    if (t.matches('[data-act=latrange]')) { setLatency(+t.value); }
    if (t.matches('[data-act-change=file]') && t.files && t.files[0]) {
      const r = new FileReader();
      r.onload = () => tryImport(String(r.result));
      r.readAsText(t.files[0]);
    }
  };
  const onInput = (ev) => {
    if (ev.target.matches('[data-act=latrange]')) {
      const v = el.querySelector('#lat-val');
      if (v) v.textContent = ev.target.value + ' ms';
    }
  };
  const onKey = (ev) => {
    if (calib && calib.result == null && ev.code === 'Space') { ev.preventDefault(); tap(ev.timeStamp || performance.now()); }
  };
  // Pointerdown gives tighter timing than click for tap-along.
  const onPointer = (ev) => {
    if (ev.target.closest('[data-act=tap]')) { ev.preventDefault(); tap(ev.timeStamp || performance.now()); }
  };
  el.addEventListener('change', onChange);
  el.addEventListener('input', onInput);
  el.addEventListener('pointerdown', onPointer);
  window.addEventListener('keydown', onKey);
  const offVoices = speaker.onVoices(render);
  render();

  return () => {
    off(); offVoices(); stopCalib();
    el.removeEventListener('change', onChange);
    el.removeEventListener('input', onInput);
    el.removeEventListener('pointerdown', onPointer);
    window.removeEventListener('keydown', onKey);
    if (micTest) micTest.tracker.stop();
    clearInterval(micTimer);
  };
}
