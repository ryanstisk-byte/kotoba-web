// Speech output (Speaker.swift), speech recognition (Recognizer.swift) and pitch tracking (PitchTracker.swift).

// ---------------- Speaker ----------------

/** Reads phrases aloud with the device's Japanese voices, rotating voices each time. */
class Speaker {
  constructor() {
    this.supported = typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
    this.voices = [];
    this.voiceIndex = 0;
    this.currentVoiceName = '';
    this.unlocked = false;
    this.listeners = new Set();
    if (!this.supported) return;
    this.loadVoices();
    try {
      speechSynthesis.addEventListener('voiceschanged', () => this.loadVoices());
    } catch (e) {
      speechSynthesis.onvoiceschanged = () => this.loadVoices();
    }
    // Some browsers fill the list late without firing the event.
    let tries = 0;
    const poll = setInterval(() => {
      if (this.voices.length || ++tries > 20) clearInterval(poll);
      else this.loadVoices();
    }, 250);
    // iOS only allows speech after a user gesture: speak a silent utterance on the first tap.
    const unlock = () => {
      if (this.unlocked) return;
      this.unlocked = true;
      try {
        const u = new SpeechSynthesisUtterance(' ');
        u.volume = 0;
        u.lang = 'ja-JP';
        speechSynthesis.speak(u);
      } catch (e) { /* ignore */ }
      this.loadVoices();
    };
    window.addEventListener('pointerdown', unlock, { capture: true });
    window.addEventListener('keydown', unlock, { capture: true });
  }

  loadVoices() {
    try {
      const all = speechSynthesis.getVoices() || [];
      const ja = all.filter((v) => /^ja([-_]|$)/i.test(v.lang || ''));
      // Prefer local voices first so offline still works, but keep all of them in the rotation.
      ja.sort((a, b) => (b.localService ? 1 : 0) - (a.localService ? 1 : 0));
      const changed = ja.length !== this.voices.length;
      this.voices = ja;
      if (changed) this.listeners.forEach((fn) => fn());
    } catch (e) { /* ignore */ }
  }

  onVoices(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }

  /**
   * @param mps rough target speed in morae per second; natural speech is about 7.
   * @param voice pass a fixed number to always use the same voice (e.g. one per story character).
   */
  speak(text, { mps = 4, voice = null, onend = null } = {}) {
    if (!this.supported || !text) { if (onend) setTimeout(onend, 0); return; }
    if (!this.voices.length) this.loadVoices();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'ja-JP';
    if (this.voices.length) {
      let v;
      if (voice !== null && voice !== undefined) {
        v = this.voices[Math.abs(voice) % this.voices.length];
        // Shift the overall pitch per character so they sound different even with one voice installed.
        const shifts = [1.0, 0.8, 1.2, 0.9, 1.1];
        u.pitch = shifts[Math.abs(voice) % shifts.length];
      } else {
        v = this.voices[this.voiceIndex % this.voices.length];
        this.voiceIndex += 1;
      }
      u.voice = v;
      this.currentVoiceName = v.name;
    } else {
      this.currentVoiceName = 'default';
    }
    // Map our speed to the speech rate scale (1 is the voice's normal speed).
    const normalized = Math.min(Math.max(mps / 7, 0.3), 1);
    u.rate = 0.45 + 0.55 * normalized;
    if (onend) { u.onend = onend; u.onerror = onend; }
    try {
      if (speechSynthesis.speaking || speechSynthesis.pending) speechSynthesis.cancel();
      speechSynthesis.resume();
      speechSynthesis.speak(u);
    } catch (e) { if (onend) onend(); }
  }

  stop() {
    if (!this.supported) return;
    try { speechSynthesis.cancel(); } catch (e) { /* ignore */ }
  }
}

export const speaker = new Speaker();

// ---------------- Recognizer ----------------

const SRClass = typeof window !== 'undefined' ? (window.SpeechRecognition || window.webkitSpeechRecognition) : null;
export const recognitionSupported = !!SRClass;

/** Strip spaces and punctuation and turn katakana into hiragana, so ネコ and ねこ match. */
export function normalizeJa(s) {
  let out = '';
  for (const ch of String(s)) {
    if (' 　、。,.!?！？「」・'.includes(ch)) continue;
    const c = ch.codePointAt(0);
    out += c >= 0x30a1 && c <= 0x30f6 ? String.fromCodePoint(c - 0x60) : ch;
  }
  return out;
}

/** Continuous Japanese speech recognition with restart-on-end. Publishes the transcript of the current window. */
export class Recognizer {
  constructor() {
    this.transcript = '';
    this.status = '';
    this.listening = false;
    this.unavailable = !SRClass;
    this.unavailableReason = SRClass ? '' : 'Speech recognition is not supported in this browser.';
    this.onTranscript = null;
    this.onRestart = null;
    this.onState = null;
    this.onUnavailable = null;
    this.want = false;
    this.gen = 0;
    this.rec = null;
    this.windowTimer = null;
    this.failures = [];
  }

  emit() { if (this.onState) this.onState(this); }

  fail(reason) {
    this.unavailable = true;
    this.unavailableReason = reason;
    this.stop();
    this.emit();
    if (this.onUnavailable) this.onUnavailable(reason);
  }

  start(hints = []) {
    if (!SRClass) { this.fail(this.unavailableReason); return; }
    this.hints = hints;
    this.want = true;
    this.begin();
  }

  stop() {
    this.want = false;
    clearTimeout(this.windowTimer);
    this.teardown();
    this.listening = false;
    this.emit();
  }

  begin() {
    if (!this.want) return;
    this.teardown();
    const gen = ++this.gen;
    let rec;
    try {
      rec = new SRClass();
    } catch (e) {
      this.fail('Speech recognition could not start.');
      return;
    }
    rec.lang = 'ja-JP';
    rec.continuous = true;
    rec.interimResults = true;
    rec.maxAlternatives = 3;
    this.rec = rec;
    this.transcript = '';
    if (this.onRestart) this.onRestart();

    rec.onstart = () => {
      if (gen !== this.gen) return;
      this.listening = true;
      this.status = 'Listening';
      this.emit();
    };
    rec.onresult = (ev) => {
      if (gen !== this.gen) return;
      // Best transcript of the whole window, plus any alternatives of the latest result appended.
      let text = '';
      for (let i = 0; i < ev.results.length; i++) text += ev.results[i][0].transcript;
      const last = ev.results[ev.results.length - 1];
      let alts = '';
      for (let j = 1; j < last.length; j++) alts += '|' + last[j].transcript;
      this.transcript = normalizeJa(text);
      this.emit();
      if (this.onTranscript) this.onTranscript(this.transcript, normalizeJa(alts));
    };
    rec.onerror = (ev) => {
      if (gen !== this.gen) return;
      const err = ev.error || 'error';
      if (err === 'not-allowed' || err === 'service-not-allowed') {
        this.fail('Microphone or speech recognition permission is off.');
      } else if (err === 'audio-capture') {
        this.fail('No microphone was found.');
      } else if (err === 'network') {
        this.fail('Speech recognition needs an internet connection in this browser.');
      } else if (err === 'language-not-supported') {
        this.fail('Japanese speech recognition is not available here.');
      }
      // no-speech / aborted: onend restarts.
    };
    rec.onend = () => {
      if (gen !== this.gen) return;
      this.listening = false;
      this.emit();
      if (!this.want) return;
      // Give up gracefully if it keeps ending instantly (broken service).
      const now = Date.now();
      this.failures = this.failures.filter((t) => now - t < 5000);
      this.failures.push(now);
      if (this.failures.length > 6) { this.fail('Speech recognition keeps stopping on this device.'); return; }
      setTimeout(() => { if (gen === this.gen) this.begin(); }, 150);
    };
    try {
      rec.start();
      this.status = 'Starting…';
      this.emit();
    } catch (e) {
      this.fail('Speech recognition could not start.');
      return;
    }
    // Recognition windows are limited, so roll over to a fresh one regularly.
    clearTimeout(this.windowTimer);
    this.windowTimer = setTimeout(() => { if (gen === this.gen && this.want) this.begin(); }, 40000);
  }

  teardown() {
    this.gen++;
    if (this.rec) {
      const r = this.rec;
      this.rec = null;
      r.onresult = r.onerror = r.onend = r.onstart = null;
      try { r.abort(); } catch (e) { /* ignore */ }
    }
  }
}

// ---------------- Pitch tracker ----------------

let sharedCtx = null;
export function audioContext() {
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  if (!sharedCtx || sharedCtx.state === 'closed') sharedCtx = new AC();
  if (sharedCtx.state === 'suspended') sharedCtx.resume().catch(() => {});
  return sharedCtx;
}

export const micSupported = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);

/** Listens to the mic and estimates the speaker's pitch (YIN-style), on device. */
export class PitchTracker {
  constructor() {
    this.samples = [];
    this.running = false;
    this.noiseFloor = 0.01;
    this.liveHz = null;
    this.liveLevel = 0;
  }

  async start() {
    if (this.running) return;
    if (!micSupported) throw new Error('This browser has no microphone access.');
    const ctx = audioContext();
    if (!ctx) throw new Error('This browser has no Web Audio.');
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
    });
    if (ctx.state === 'suspended') await ctx.resume().catch(() => {});
    this.ctx = ctx;
    this.source = ctx.createMediaStreamSource(this.stream);
    this.analyser = ctx.createAnalyser();
    this.analyser.fftSize = 2048;
    this.source.connect(this.analyser);
    this.buf = new Float32Array(2048);
    this.startTime = performance.now();
    this.samples = [];
    this.timer = setInterval(() => this.poll(), 30);
    this.running = true;
  }

  poll() {
    if (!this.analyser) return;
    this.analyser.getFloatTimeDomainData(this.buf);
    const frames = this.buf;
    let sum = 0;
    for (let i = 0; i < frames.length; i++) sum += frames[i] * frames[i];
    const rms = Math.sqrt(sum / frames.length);
    const voiced = rms > Math.max(this.noiseFloor * 2.5, 0.008);
    const hz = voiced ? detectPitch(frames, this.ctx.sampleRate) : null;
    const t = (performance.now() - this.startTime) / 1000;
    this.liveLevel = rms;
    this.liveHz = hz;
    this.samples.push({ time: t, hz, level: rms });
  }

  /** Restart the clock without stopping the mic (call right as the countdown starts). */
  resetClock() {
    this.startTime = performance.now();
    this.samples = [];
  }

  /** Sample ~1 second of room noise so quiet rooms and noisy rooms both work. */
  calibrateNoise(recent) {
    const levels = recent.map((s) => s.level).sort((a, b) => a - b);
    if (levels.length) this.noiseFloor = levels[Math.floor(levels.length / 2)];
  }

  stop() {
    clearInterval(this.timer);
    if (this.source) { try { this.source.disconnect(); } catch (e) { /* ignore */ } }
    if (this.stream) this.stream.getTracks().forEach((t) => t.stop());
    this.stream = null;
    this.source = null;
    this.analyser = null;
    this.running = false;
    this.liveHz = null;
    this.liveLevel = 0;
  }
}

/** YIN pitch detection on a 2x-decimated frame. Returns Hz in the human voice range, or null. */
export function detectPitch(raw, sampleRate) {
  const half = raw.length >> 1;
  const x = new Float32Array(half);
  for (let i = 0, j = 0; j < half; i += 2, j++) x[j] = (raw[i] + raw[i + 1]) * 0.5;
  const sr = sampleRate / 2;
  const n = x.length;
  const minLag = Math.max(2, Math.floor(sr / 450));
  const maxLag = Math.min(Math.floor(sr / 70), Math.floor(n / 2));
  if (!(maxLag > minLag + 2)) return null;

  const diff = new Float32Array(maxLag + 1);
  const window = n - maxLag;
  for (let tau = 1; tau <= maxLag; tau++) {
    let s = 0;
    for (let j = 0; j < window; j++) {
      const d = x[j] - x[j + tau];
      s += d * d;
    }
    diff[tau] = s;
  }
  const cmnd = new Float32Array(maxLag + 1).fill(1);
  let running = 0;
  for (let tau = 1; tau <= maxLag; tau++) {
    running += diff[tau];
    cmnd[tau] = running > 0 ? (diff[tau] * tau) / running : 1;
  }
  let tau = minLag;
  while (tau <= maxLag) {
    if (cmnd[tau] < 0.15) {
      while (tau + 1 <= maxLag && cmnd[tau + 1] < cmnd[tau]) tau++;
      // Parabolic interpolation for a smoother estimate.
      let better = tau;
      if (tau > 1 && tau < maxLag) {
        const a = cmnd[tau - 1], b = cmnd[tau], c = cmnd[tau + 1];
        const denom = a - 2 * b + c;
        if (Math.abs(denom) > 1e-9) better += (0.5 * (a - c)) / denom;
      }
      return sr / better;
    }
    tau++;
  }
  return null;
}

/** Semitones between a frequency and a reference frequency. */
export const semitones = (hz, ref) => 12 * Math.log2(hz / ref);

/** A short click at context time `when`, for latency calibration. */
export function click(ctx, when, freq = 1000) {
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.frequency.value = freq;
  g.gain.setValueAtTime(0.0001, when);
  g.gain.exponentialRampToValueAtTime(0.5, when + 0.005);
  g.gain.exponentialRampToValueAtTime(0.0001, when + 0.08);
  o.connect(g).connect(ctx.destination);
  o.start(when);
  o.stop(when + 0.1);
}
