// Small DOM helpers shared by every mode.

export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export function shuffle(a) {
  const arr = a.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export const pick = (a) => a[Math.floor(Math.random() * a.length)];
export const rand = (lo, hi) => lo + Math.random() * (hi - lo);

/** Event delegation: calls handlers[action](el, ev) for clicks on [data-act]. */
export function delegate(root, handlers) {
  const fn = (ev) => {
    const el = ev.target.closest('[data-act]');
    if (!el || !root.contains(el) || el.disabled) return;
    const h = handlers[el.dataset.act];
    if (h) { ev.preventDefault(); h(el, ev); }
  };
  root.addEventListener('click', fn);
  return () => root.removeEventListener('click', fn);
}

/** A small pitch melody drawing (H/L dots joined by a line), reused across modes. */
export function melodySVG(morae, { showKana = true, color = 'var(--accent)', height = 80 } = {}) {
  const n = morae.length;
  if (!n) return '';
  const slot = 40;
  const w = n * slot;
  const h = 80;
  const highY = h * 0.18;
  const lowY = h * (showKana ? 0.52 : 0.82);
  const pts = [];
  morae.forEach((mo, i) => { if (!mo.silent) pts.push([(i + 0.5) * slot, mo.high ? highY : lowY]); });
  const line = pts.map((p) => p.join(',')).join(' ');
  const dots = pts.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="6" fill="${color}"/>`).join('');
  const kana = showKana
    ? morae.map((mo, i) => `<text x="${(i + 0.5) * slot}" y="${h * 0.9}" text-anchor="middle" class="melody-kana">${esc(mo.kana)}</text>`).join('')
    : '';
  return `<svg class="melody" viewBox="0 0 ${w} ${h}" style="height:${height}px" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
    <polyline points="${line}" fill="none" stroke="${color}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>${dots}${kana}</svg>`;
}

let toastTimer;
export function toast(msg) {
  let el = document.getElementById('toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'toast';
    el.setAttribute('role', 'status');
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2600);
}

/** Self-grade bar used when speech recognition is unavailable, so speaking modes stay playable. */
export function selfGradeHTML({ revealed = false, label = '' } = {}) {
  return `<div class="selfgrade" role="group" aria-label="Grade yourself">
    ${label ? `<p class="small dim">${esc(label)}</p>` : ''}
    <div class="row3">
      <button class="btn" data-act="sg-reveal" ${revealed ? 'disabled' : ''}>Reveal</button>
      <button class="btn good" data-act="sg-ok">I said it ✓</button>
      <button class="btn" data-act="sg-miss">Missed</button>
    </div></div>`;
}
