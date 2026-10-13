// Rhythm has to hear a real voice: a slightly noisy or quiet one, or one the pitch finder can't read on every frame.
import { test, expect } from './helpers.js';

test('the pitch finder still reads a voice through room noise', async ({ page }) => {
  await page.goto('./');
  const hz = await page.evaluate(async () => {
    const { detectPitch } = await import('./js/audio.js');
    let seed = 7;
    const noise = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647 - 0.5; };
    const sr = 48000;
    const buf = new Float32Array(2048).map((_, i) => 0.05 * Math.sin(2 * Math.PI * 220 * i / sr) + 0.05 * Math.sin(2 * Math.PI * 440 * i / sr) + 0.035 * noise());
    const quiet = buf.map((x) => x * 0.03);
    return [detectPitch(buf, sr), detectPitch(quiet, sr)];
  });
  for (const h of hz) expect(Math.abs(h - 220)).toBeLessThan(6);
});

test('timing counts sound on the beat even when no pitch was read, and room noise scores nothing', async ({ page }) => {
  await page.goto('./');
  const r = await page.evaluate(async () => {
    const { scoreRhythm } = await import('./js/modes/rhythm.js');
    const { PHRASE_BY_ID } = await import('./js/data.js');
    const p = PHRASE_BY_ID.arigatou;
    const frames = (level) => Array.from({ length: 200 }, (_, i) => ({ time: i * 0.03, hz: null, level }));
    const talk = frames(0.0005).map((s) => (s.time >= 1.6 && s.time < 1.6 + p.morae.length * 0.5 ? { ...s, level: 0.02 } : s));
    return { talk: scoreRhythm(p, talk, 0.5, 1.6, 0.0005).timing, noise: scoreRhythm(p, frames(0.003), 0.5, 1.6, 0.003).timing };
  });
  expect(r.talk).toBe(1);
  expect(r.noise).toBe(0);
});
