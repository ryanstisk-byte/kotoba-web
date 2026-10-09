// Sound & mic check: one screen to find out why audio or the mic isn't working, with fixes for each case.
import { speaker, PitchTracker, Recognizer, recognitionSupported, micSupported, micHelp, noRecognitionReason, isIOS, isStandalone } from './audio.js';
import { esc, delegate } from './ui.js';

export function mount(el) {
  let heard = null;          // null | 'yes' | 'no'
  let played = '';           // which test was played last
  let mic = null;            // { tracker, peak, error }
  let micTimer = 0;
  let rec = null;            // { r, text, state, error, timer }

  const env = isIOS ? (isStandalone() ? 'iPhone Home Screen app' : 'iPhone/iPad Safari') : /Edg\//.test(navigator.userAgent) ? 'Edge' : /Chrome\//.test(navigator.userAgent) ? 'Chrome' : /Firefox\//.test(navigator.userAgent) ? 'Firefox' : /Safari\//.test(navigator.userAgent) ? 'Safari' : 'this browser';

  function render() {
    el.innerHTML = `
      <div class="stack">
        <p class="dim">Three quick tests. Each one says what to change if it doesn't work. Detected: <span class="strong">${esc(env)}</span>.</p>

        <section class="panel stack-sm">
          <h2 class="section-title">1 · Can you hear it?</h2>
          <div class="row2"><button class="btn primary" data-act="play" data-src="clips">🔊 Built-in voice</button>
            <button class="btn" data-act="play" data-src="device">🔊 Device voice</button></div>
          ${played ? `<p class="small dim">Played with: ${played === 'device' ? `device voice (${esc(speaker.currentVoiceName || 'default')})` : 'built-in voice clip'}${speaker.lastError ? ` · <span class="miss-c">${esc(speaker.lastError)}</span>` : ''}</p>
            <div class="row2"><button class="btn ${heard === 'yes' ? 'good' : ''}" data-act="heard" data-v="yes">✓ I heard it</button><button class="btn ${heard === 'no' ? 'wrong' : ''}" data-act="heard" data-v="no">✕ Silence</button></div>` : ''}
          ${heard === 'yes' ? '<p class="good-c small">Sound works. Games use the built-in voice unless you pick device voices in Settings.</p>' : ''}
          ${heard === 'no' ? `<div class="panel note small stack-sm">
            ${isIOS ? `<p>On iPhone:</p><ul>
              <li>Turn the volume up with the side buttons while the sound plays (media volume is separate from the ringer).</li>
              <li>Check that Bluetooth headphones or a speaker aren't connected somewhere else.</li>
              <li>Flip the ring/silent switch to ring (no orange showing) and try again.</li>
              <li>Close the tab, reopen the site, and tap once anywhere before testing.</li></ul>`
            : `<p>On PC:</p><ul>
              <li>Make sure the tab isn't muted: right-click the tab and look for "Unmute site".</li>
              <li>Check the volume and output device (the speaker icon in the taskbar).</li>
              <li>Click once anywhere on the page, then try again: browsers block sound until you interact.</li></ul>`}
            <p>If the built-in voice is silent but the device voice works, tell Claude in the bug-fix thread.</p></div>` : ''}
        </section>

        <section class="panel stack-sm">
          <h2 class="section-title">2 · Does the mic hear you?</h2>
          ${!micSupported ? '<p class="miss-c small">This browser gives no microphone access to websites. Try Chrome or Edge on PC, or Safari on iPhone.</p>' : `
          <button class="btn ${mic ? '' : 'primary'}" data-act="mic">${mic ? '■ Stop mic' : '🎤 Start mic'}</button>
          ${mic ? `${mic.error ? `<p class="miss-c small">${esc(mic.error)}</p>` : `
            <p class="small">Say "あー" in a normal voice. The bar should jump.</p>
            <div class="meter" aria-label="Mic level"><span id="mic-bar"></span></div>
            <p class="mono small" id="mic-txt">listening…</p>`}` : '<p class="small dim">Your browser will ask for permission the first time: choose Allow.</p>'}`}
        </section>

        <section class="panel stack-sm">
          <h2 class="section-title">3 · Does it understand Japanese?</h2>
          ${!recognitionSupported ? `<p class="miss-c small">${esc(noRecognitionReason())} Speaking games still work: you grade yourself.</p>` : `
          <button class="btn ${rec && rec.r.want ? '' : 'primary'}" data-act="rec">${rec && rec.r.want ? '■ Stop' : '🗣 Say こんにちは'}</button>
          ${rec ? `<p class="small">${esc(rec.state)}</p>
            ${rec.text ? `<p class="lead strong" lang="ja">「${esc(rec.text)}」</p>` : ''}
            ${rec.ok ? '<p class="good-c small">It understood you. Speak Slice will work.</p>' : ''}
            ${rec.error ? `<p class="miss-c small">${esc(rec.error)}</p>` : ''}` : `<p class="small dim">${isIOS ? 'Uses Apple dictation, so Dictation needs to be on.' : 'Uses the browser\'s online speech service, so it needs internet.'}</p>`}`}
        </section>
        <a class="btn wide" href="#/settings">Open Settings</a>
      </div>`;
  }

  function play(src) {
    played = src;
    heard = null;
    speaker.lastError = '';
    if (src === 'device') speaker.speakDevice('こんにちは。きこえますか？', { mps: 4 });
    else {
      const prev = speaker.source;
      speaker.source = 'clips';
      speaker.speak('こんにちは', { mps: 4 });
      speaker.source = prev;
    }
    render();
    // Re-render once the result (or an error) is known.
    setTimeout(render, 900);
  }

  async function toggleMic() {
    if (mic) { stopMic(); render(); return; }
    stopRec();
    const tracker = new PitchTracker();
    mic = { tracker, peak: 0, error: '' };
    render();
    try {
      await tracker.start();
      micTimer = setInterval(() => {
        const lvl = tracker.liveLevel;
        mic.peak = Math.max(mic.peak * 0.95, lvl);
        const bar = el.querySelector('#mic-bar');
        const txt = el.querySelector('#mic-txt');
        if (bar) bar.style.width = Math.min(100, Math.sqrt(lvl / 0.2) * 100) + '%';
        if (txt) txt.textContent = mic.peak > 0.01
          ? `✓ hearing you · ${tracker.liveHz ? Math.round(tracker.liveHz) + ' Hz' : 'no pitch yet'}`
          : 'very quiet: speak up or move closer (or pick another mic in system settings)';
      }, 100);
    } catch (e) {
      tracker.stop();
      mic.error = e && (e.name === 'NotAllowedError' || e.name === 'SecurityError') ? micHelp()
        : e && e.name === 'NotFoundError' ? 'No microphone was found. Plug one in or check system settings.'
          : `The mic could not start (${(e && (e.name || e.message)) || e}).`;
      render();
    }
  }

  function stopMic() {
    clearInterval(micTimer);
    if (mic) mic.tracker.stop();
    mic = null;
  }

  function toggleRec() {
    if (rec) { stopRec(); render(); return; }
    stopMic();
    speaker.stop();
    const r = new Recognizer();
    rec = { r, text: '', state: 'Starting… (allow the mic if asked)', error: '', ok: false };
    r.onState = () => {
      if (!rec) return;
      rec.state = r.listening ? 'Listening… say こんにちは' : r.unavailable ? 'Stopped.' : rec.state;
      render();
    };
    r.onTranscript = (t) => {
      if (!rec) return;
      rec.text = t;
      if (/こんにち|今日/.test(t)) { rec.ok = true; rec.state = 'Heard it!'; stopRec(true); }
      render();
    };
    r.onUnavailable = (reason) => { if (rec) { rec.error = reason; rec.state = 'Stopped.'; render(); } };
    r.start(['こんにちは']);
    rec.timer = setTimeout(() => {
      if (rec && !rec.ok) {
        rec.state = rec.text ? 'Heard something, but not こんにちは. Try again slowly.' : 'Heard nothing in 10 seconds. Check test 2, then try again.';
        stopRec(true);
        render();
      }
    }, 10000);
    render();
  }

  function stopRec(keep = false) {
    if (!rec) return;
    clearTimeout(rec.timer);
    rec.r.stop();
    if (!keep) rec = null;
    else rec.r.onState = rec.r.onTranscript = rec.r.onUnavailable = null;
  }

  const off = delegate(el, {
    play: (b) => play(b.dataset.src),
    heard: (b) => { heard = b.dataset.v; render(); },
    mic: toggleMic,
    rec: () => { if (rec && !rec.r.want) { rec = null; } toggleRec(); },
  });
  render();
  return () => { off(); stopMic(); stopRec(); speaker.stop(); };
}
