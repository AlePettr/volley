/* Cartelloni LED a bordo campo con le animazioni vere della Lega (logos/led/*.mp4, elenco in manifest.led).
   Il filmato mantiene il suo rapporto d'aspetto: sul fondo e ai lati si affiancano piu' filmati diversi. */
const LED = { vids: [], slots: [0, 1, 2], H: 1.1, L: 10.5 };
(function ledInit() {
  const files = ((window.LOGO_MANIFEST || {}).led || []);
  if (!files.length || typeof document === 'undefined') return;
  files.forEach(f => {
    const v = document.createElement('video');
    v.muted = true; v.defaultMuted = true; v.playsInline = true; v.setAttribute('playsinline', ''); v.preload = 'auto'; v.loop = false;
    v.src = f.indexOf('data:') === 0 ? f : 'logos/led/' + f;
    v.addEventListener('ended', () => ledAdvance(v));
    v.addEventListener('error', () => { v._bad = true; ledAdvance(v); });
    LED.vids.push(v);
  });
  const n = LED.vids.length, st = Math.floor(Math.random() * n);
  LED.slots = [st % n, (st + 1) % n, (st + 2) % n];
})();
function ledPlay(v) { try { v.currentTime = 0; const p = v.play(); if (p && p.catch) p.catch(() => {}); } catch (e) { } }
function ledAdvance(v) {
  const n = LED.vids.length; if (!n) return;
  const k = LED.slots.indexOf(LED.vids.indexOf(v)); if (k < 0) return;
  let c = LED.slots[k], t = 0;
  do { c = (c + 1) % n; t++; } while ((LED.slots.indexOf(c) >= 0 || LED.vids[c]._bad) && t < n + 3);
  LED.slots[k] = c; ledPlay(LED.vids[c]);
}
function ledSlot(k) { const v = LED.vids[LED.slots[k % LED.slots.length]]; return v && !v._bad && v.readyState >= 2 ? v : null; }
/* disegna un tratto di cartellone lungo la direzione indicata: pos = coordinata che varia, fixed = l'altra */
function ledStrip(c, back, fixed, a, b, tileOff) {
  const L = LED.L, step = L / 28;
  for (let p = a; p < b - 1e-6; p += step) {
    const q = Math.min(b, p + step), pos = p - a + tileOff, tile = Math.floor(pos / L + 1e-9), fr = (pos - tile * L) / L;
    const v = ledSlot(tile); if (!v) continue;
    const sw = Math.min(v.videoWidth * (q - p) / L, v.videoWidth - fr * v.videoWidth);
    const P1 = back ? proj(fixed, p, LED.H) : proj(p, fixed, LED.H), P2 = back ? proj(fixed, q, 0) : proj(q, fixed, 0);
    const x1 = Math.min(P1.x, P2.x), x2 = Math.max(P1.x, P2.x);
    const mid = back ? proj(fixed, (p + q) / 2, LED.H) : proj((p + q) / 2, fixed, LED.H), midB = back ? proj(fixed, (p + q) / 2, 0) : proj((p + q) / 2, fixed, 0);
    if (x2 - x1 < .4) continue;
    c.drawImage(v, fr * v.videoWidth, 0, Math.max(1, sw), v.videoHeight, x1, mid.y, x2 - x1 + .6, midB.y - mid.y);
  }
}
function drawLed(c, r) {
  if (!LED.vids.length) return;
  for (const k of [0, 1, 2]) { const v = LED.vids[LED.slots[k]]; if (v && v.paused && !v._bad) ledPlay(v); }
  if (!ledSlot(0) && !ledSlot(1)) return;
  c.save();
  const base = (u1, v1, u2, v2) => { const a = proj(u1, v1, 0), b = proj(u2, v2, 0), a2 = proj(u1, v1, LED.H), b2 = proj(u2, v2, LED.H); c.fillStyle = '#05080f'; polyPath(c, [a, b, b2, a2]); c.fill(); };
  base(-11.2, -9, -11.2, 9); base(-11.2, -8.8, 11.5, -8.8); base(-11.2, 8.8, 11.5, 8.8);
  ledStrip(c, true, -11.2, -9, 9, 0);          // fondo
  ledStrip(c, false, -8.8, -11.2, 11.5, 4);    // lato sinistro
  ledStrip(c, false, 8.8, -11.2, 11.5, 7);     // lato destro
  c.fillStyle = 'rgba(0,0,0,.12)';
  const a = proj(-11.2, -9, LED.H), b = proj(-11.2, 9, 0); c.fillRect(a.x, a.y, b.x - a.x, b.y - a.y);
  c.restore();
}
