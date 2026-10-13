// Kana Brush checking: turns KanjiVG stroke paths into points and compares a drawing with them, generously.
// Pure functions (no DOM), so the tests can run them on made-up drawings. Coordinates are KanjiVG's 109x109 box.

/** Points per stroke when comparing. */
const N = 24;
/** A stroke matches when its points are this far from the model's on average (109 = the whole box). */
export const STROKE_OK = 24;
/** And the whole drawing's average must be within this. */
export const SHAPE_OK = 16;

// ---------- SVG path data -> points ----------
const cubic = (p0, p1, p2, p3, t) => {
  const u = 1 - t;
  return [
    u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
    u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1],
  ];
};

/** Points along an SVG path (M, L, H, V, C, S, Q, T, Z, upper and lower case), each curve cut into 8 pieces. */
export function pathPoints(d) {
  const toks = d.match(/[a-zA-Z]|-?(?:\d*\.\d+|\d+\.?)(?:e[-+]?\d+)?/g) || [];
  const pts = [];
  let i = 0, cmd = '', cur = [0, 0], start = [0, 0], ctrl = null;
  const num = () => Number(toks[i++]);
  const curve = (p1, p2, p3) => { for (let k = 1; k <= 8; k++) pts.push(cubic(cur, p1, p2, p3, k / 8)); ctrl = p2; cur = p3; };
  while (i < toks.length) {
    if (/[a-zA-Z]/.test(toks[i])) cmd = toks[i++];
    const rel = cmd === cmd.toLowerCase();
    const at = (x, y) => (rel ? [cur[0] + x, cur[1] + y] : [x, y]);
    switch (cmd.toUpperCase()) {
      case 'M': cur = at(num(), num()); start = cur; pts.push(cur); ctrl = null; cmd = rel ? 'l' : 'L'; break;
      case 'L': cur = at(num(), num()); pts.push(cur); ctrl = null; break;
      case 'H': { const x = num(); cur = [rel ? cur[0] + x : x, cur[1]]; pts.push(cur); ctrl = null; break; }
      case 'V': { const y = num(); cur = [cur[0], rel ? cur[1] + y : y]; pts.push(cur); ctrl = null; break; }
      case 'C': { const p1 = at(num(), num()), p2 = at(num(), num()), p3 = at(num(), num()); curve(p1, p2, p3); break; }
      case 'S': {
        const p1 = ctrl ? [2 * cur[0] - ctrl[0], 2 * cur[1] - ctrl[1]] : cur;
        const p2 = at(num(), num()), p3 = at(num(), num());
        curve(p1, p2, p3);
        break;
      }
      case 'Q': case 'T': {
        // Rare in KanjiVG: treated as a cubic through the same control point.
        const q = cmd.toUpperCase() === 'Q' ? at(num(), num()) : cur;
        const p3 = at(num(), num());
        curve([cur[0] + (2 / 3) * (q[0] - cur[0]), cur[1] + (2 / 3) * (q[1] - cur[1])], [p3[0] + (2 / 3) * (q[0] - p3[0]), p3[1] + (2 / 3) * (q[1] - p3[1])], p3);
        break;
      }
      case 'Z': cur = start; pts.push(cur); ctrl = null; break;
      default: i++;
    }
  }
  return pts;
}

// ---------- geometry ----------
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);

export function length(pts) {
  let l = 0;
  for (let i = 1; i < pts.length; i++) l += dist(pts[i - 1], pts[i]);
  return l;
}

/** `n` points evenly spaced along a polyline. A single point (a tap) becomes n copies of it. */
export function resample(pts, n = N) {
  if (!pts.length) return [];
  const total = length(pts);
  if (total < 1e-6) return Array.from({ length: n }, () => [pts[0][0], pts[0][1]]);
  const step = total / (n - 1);
  const out = [[pts[0][0], pts[0][1]]];
  let acc = 0, j = 1, prev = pts[0];
  while (out.length < n - 1 && j < pts.length) {
    const d = dist(prev, pts[j]);
    if (acc + d >= step && d > 0) {
      const t = (step - acc) / d;
      const p = [prev[0] + t * (pts[j][0] - prev[0]), prev[1] + t * (pts[j][1] - prev[1])];
      out.push(p);
      prev = p;
      acc = 0;
    } else {
      acc += d;
      prev = pts[j++];
    }
  }
  while (out.length < n) out.push([pts[pts.length - 1][0], pts[pts.length - 1][1]]);
  return out;
}

function bbox(strokes) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const s of strokes) for (const [x, y] of s) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
  return { x0, y0, x1, y1, w: x1 - x0, h: y1 - y0, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2 };
}

/** Moves and scales a drawing so its box lines up with the model's (same proportions, size within reason). */
function fitTo(strokes, model) {
  const a = bbox(strokes), b = bbox(model);
  const big = (box) => Math.max(box.w, box.h, 1);
  const k = Math.max(0.4, Math.min(2.5, big(b) / big(a)));
  return strokes.map((s) => s.map(([x, y]) => [b.cx + (x - a.cx) * k, b.cy + (y - a.cy) * k]));
}

/** Average distance between two strokes, point by point in drawing order (so a stroke drawn backwards doesn't match). */
export function strokeCost(a, b) {
  const p = resample(a), q = resample(b);
  let s = 0;
  for (let i = 0; i < N; i++) s += dist(p[i], q[i]);
  return s / N;
}

function permutations(n) {
  if (n === 0) return [[]];
  const out = [];
  for (const p of permutations(n - 1)) for (let i = 0; i <= p.length; i++) out.push([...p.slice(0, i), n - 1, ...p.slice(i)]);
  return out;
}

/** Scores drawn strokes against model strokes, stroke i with stroke i: { costs, mean, worst, ok }. */
function score(drawn, model) {
  const costs = drawn.map((s, i) => strokeCost(s, model[i]));
  const mean = costs.reduce((a, b) => a + b, 0) / costs.length;
  const worst = Math.max(...costs);
  return { costs, mean, worst, ok: worst <= STROKE_OK && mean <= SHAPE_OK };
}

/** Best of comparing the drawing as drawn (in the box) and lined up with the model's size and position. */
function bestScore(drawn, model) {
  const a = score(drawn, model), b = score(fitTo(drawn, model), model);
  return a.mean <= b.mean ? a : b;
}

const cache = new Map();
/** Model strokes as points (SVG paths are parsed once and remembered). */
export function modelPoints(paths) {
  return paths.map((p) => {
    if (Array.isArray(p)) return p;
    if (!cache.has(p)) cache.set(p, pathPoints(p));
    return cache.get(p);
  });
}

/** Kana drawn the same way (へ and ヘ, べ and ベ) never count as each other's look-alike. */
const twins = (paths, self, others) => !!(self && others && others[self] && others[self].length === paths.length
  && score(modelPoints(paths), modelPoints(others[self])).mean < 3);

/** A drawing matches another kana this much better than the asked one: it's that kana. */
const RIVAL = 0.75;

/** Another kana (same number of strokes, from `others`: kana -> paths) the drawing clearly looks more like. */
function rivalOf(drawn, mean, others, self) {
  let best = null;
  for (const [k, paths] of Object.entries(others || {})) {
    if (k === self || paths.length !== drawn.length || twins(paths, self, others)) continue;
    const m = bestScore(drawn, modelPoints(paths)).mean;
    if (m <= SHAPE_OK && m < mean * RIVAL && (!best || m < best.m)) best = { k, m };
  }
  return best ? best.k : null;
}

/** Whether the pen could plausibly have stayed down between two strokes (one ends near where the next starts). */
const near = (a, b) => dist(a[a.length - 1], b[0]) <= JOIN_GAP;
const JOIN_GAP = 60;

/**
 * Checks a drawing (strokes of [x, y] points in the 109 box) against a kana's model strokes (SVG paths). Generous:
 * - Size and position are forgiven (the drawing is also compared lined up with the model).
 * - Joining two neighbouring strokes that nearly touch, or splitting one in two, counts as "close".
 * - The right strokes in a different order count as "close", and the order is shown.
 * - But a drawing that clearly looks more like another kana in `others` (kana -> paths) is a miss.
 * Returns { verdict: 'great' | 'close' | 'miss', why: 'ok' | 'order' | 'joined' | 'split' | 'empty' | 'count' |
 *   'shape' | 'like', like (the other kana, for 'like'), stroke (1-based, the stroke most off, for 'shape'), drawn,
 *   expected, mean }.
 */
export function checkDrawing(drawnRaw, modelPaths, { others = null, self = null } = {}) {
  const model = modelPoints(modelPaths);
  const drawn = drawnRaw.filter((s) => s.length).map((s) => (s.length === 1 ? [s[0], s[0]] : s));
  const expected = model.length;
  const base = { drawn: drawn.length, expected };
  if (!drawn.length) return { ...base, verdict: 'miss', why: 'empty', mean: Infinity };
  const pass = (verdict, why, mean, extra = {}) => {
    const like = rivalOf(drawn, mean, others, self);
    return like ? { ...base, verdict: 'miss', why: 'like', like, mean } : { ...base, verdict, why, mean, ...extra };
  };

  if (drawn.length === expected) {
    const s = bestScore(drawn, model);
    if (s.ok) return pass('great', 'ok', s.mean);
    // The same strokes in a different order?
    if (expected > 1 && expected <= 6) {
      let best = null;
      for (const perm of permutations(expected)) {
        if (perm.every((p, i) => p === i)) continue;
        const t = bestScore(perm.map((p) => drawn[p]), model);
        if (t.ok && (!best || t.mean < best.mean)) best = { ...t, perm };
      }
      if (best) return pass('close', 'order', best.mean, { order: best.perm });
    }
    const like = rivalOf(drawn, s.mean, others, self);
    if (like) return { ...base, verdict: 'miss', why: 'like', like, mean: s.mean };
    return { ...base, verdict: 'miss', why: 'shape', stroke: s.costs.indexOf(s.worst) + 1, mean: s.mean };
  }

  // One stroke too few (two joined) or too many (one split in two).
  if (Math.abs(drawn.length - expected) === 1) {
    const joined = drawn.length < expected;
    const long = joined ? model : drawn;
    let best = null;
    for (let i = 0; i + 1 < long.length; i++) {
      if (!near(long[i], long[i + 1])) continue;
      const grouped = [...long.slice(0, i), [...long[i], ...long[i + 1]], ...long.slice(i + 2)];
      const t = joined ? bestScore(drawn, grouped) : bestScore(grouped, model);
      if (t.ok && (!best || t.mean < best.mean)) best = { ...t, at: i + 1 };
    }
    if (best) return pass('close', joined ? 'joined' : 'split', best.mean, { at: best.at });
  }
  const like = rivalOf(drawn, Infinity, others, self);
  return like ? { ...base, verdict: 'miss', why: 'like', like, mean: Infinity } : { ...base, verdict: 'miss', why: 'count', mean: Infinity };
}
