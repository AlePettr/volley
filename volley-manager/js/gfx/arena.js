/* ===== Palazzetto: camera in prospettiva, campo, tribune e rete ===== */
const Cam = { W: 1280, H: 720, F: 1000, K: 12000, Hc: 12, hy: -100, cx: 640, xs: 1.4, Dc: 26, portrait: false };
function camSetup(W, H) {
  Cam.W = W; Cam.H = H; Cam.portrait = H > W * 0.95;
  const view = (typeof UI !== 'undefined' && UI.camView) || 'side';
  const tv = view === 'tv', side = view === 'side';
  Cam.tv = tv; Cam.side = side;
  if (side) {
    /* regia laterale: camera rialzata sul lato lungo, il campo scorre in orizzontale */
    Cam.Dc = 21; Cam.Hc = 9;
    const zN = Cam.Dc - 4.5, zF = Cam.Dc + 4.5;
    const top = Cam.portrait ? 0.46 : 0.58, bot = Cam.portrait ? 0.67 : 0.86;
    Cam.K = H * (bot - top) / (1 / zN - 1 / zF); Cam.F = Cam.K / Cam.Hc; Cam.hy = H * bot - Cam.K / zN; Cam.cx = W / 2;
    const half = (Cam.portrait ? 0.47 : 0.43) * W; Cam.xs = half / (9 * Cam.F / zN);
    return;
  }
  Cam.Dc = tv ? 31 : 26; Cam.Hc = tv ? 21 : 12;
  const zN = Cam.Dc - 9, zF = Cam.Dc + 9;
  const top = tv ? (Cam.portrait ? 0.30 : 0.31) : (Cam.portrait ? 0.34 : 0.38), bot = tv ? (Cam.portrait ? 0.86 : 0.89) : (Cam.portrait ? 0.79 : 0.83);
  Cam.K = H * (bot - top) / (1 / zN - 1 / zF);
  Cam.F = Cam.K / Cam.Hc;
  Cam.hy = H * bot - Cam.K / zN;
  Cam.cx = W / 2;
  const half = (Cam.portrait ? 0.47 : (tv ? 0.36 : 0.325)) * W;
  Cam.xs = half / (4.5 * Cam.F / zN);
}
/* u: distanza dalla rete (positivo = lato vicino alla camera), v: sinistra/destra, zh: altezza in metri */
function proj(u, v, zh) {
  if (Cam.side) { const z = Cam.Dc - v, sc = Cam.F / z; return { x: Cam.cx - u * sc * Cam.xs, y: Cam.hy + Cam.K / z - (zh || 0) * sc, s: sc }; }
  const z = Cam.Dc - u, sc = Cam.F / z;
  return { x: Cam.cx + v * sc * Cam.xs, y: Cam.hy + Cam.K / z - (zh || 0) * sc, s: sc };
}
function polyPath(c, pts) { c.beginPath(); pts.forEach((p, i) => i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y)); c.closePath(); }
function lineWorld(c, u1, v1, u2, v2, wMeters, steps) {
  const n = steps || 1;
  for (let i = 0; i < n; i++) {
    const a = proj(u1 + (u2 - u1) * i / n, v1 + (v2 - v1) * i / n), b = proj(u1 + (u2 - u1) * (i + 1) / n, v1 + (v2 - v1) * (i + 1) / n);
    c.lineWidth = Math.max(1, wMeters * (a.s + b.s) / 2 * 1.15);
    c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); c.stroke();
  }
}

const LOGO_IMG = {};
function loadLogos(M, done) {
  let pending = 0, changed = false;
  for (const sp of LEAGUE_SPONSORS) {
    const f = SPONSOR_FILE[sp.id], key = 's:' + sp.id;
    if (!f || (LOGO_IMG[key] && LOGO_IMG[key].src.endsWith(f))) continue;
    const im = new Image(); LOGO_IMG[key] = im; pending++;
    im.onload = im.onerror = () => { changed = true; if (--pending === 0) done(); };
    im.src = f;
  }
  for (const t of [M.home, M.away]) {
    if (!t.logo || (LOGO_IMG[t.id] && LOGO_IMG[t.id].src === t.logo)) continue;
    const im = new Image(); LOGO_IMG[t.id] = im; pending++;
    im.onload = im.onerror = () => { changed = true; if (--pending === 0) done(); };
    im.src = t.logo;
  }
}
const CROWD_PAL = ['#e8edf5', '#c3cddd', '#8da2c4', '#f2a43a', '#d6336c', '#2f6fdb', '#3a465c', '#f4d9c4'];
function arenaBuild(M, k) {
  if (Cam.side) return arenaBuildSide(M, k);
  const W = Cam.W, H = Cam.H, cv = document.createElement('canvas');
  cv.width = Math.round(W * k); cv.height = Math.round(H * k);
  const c = cv.getContext('2d'); c.setTransform(k, 0, 0, k, 0, 0);
  const R = Gx.rng(Gx.hash(M.home.id + 'arena'));
  const hc = M.home.color || '#2563eb', homeKit = Gx.kit(M.home);

  /* parete e luci */
  const wall = c.createLinearGradient(0, 0, 0, H * .55);
  wall.addColorStop(0, '#05080f'); wall.addColorStop(1, '#122036');
  c.fillStyle = wall; c.fillRect(0, 0, W, H);
  for (let i = 0; i < 9; i++) {
    const lx = W * (.06 + i * .11), g = c.createRadialGradient(lx, 6, 2, lx, 6, H * .38);
    g.addColorStop(0, 'rgba(210,225,255,.20)'); g.addColorStop(1, 'rgba(210,225,255,0)');
    c.fillStyle = g; c.fillRect(0, 0, W, H * .6);
  }

  /* tribune di fondo e laterali: file di spettatori con tinta del club di casa */
  const crowd = [];
  const tint = [homeKit.main, Gx.light(homeKit.main, .4), '#f5f7fb', '#1d2a44'];
  const addRow = (pts, n, rr) => {
    for (let i = 0; i < n; i++) {
      const f = (i + R() * .6) / n, a = pts[0], b = pts[1];
      const x = a.x + (b.x - a.x) * f, y = a.y + (b.y - a.y) * f;
      const col = R() < .55 ? tint[Math.floor(R() * tint.length)] : CROWD_PAL[Math.floor(R() * CROWD_PAL.length)];
      crowd.push({ x, y, r: rr * (.85 + R() * .3), col, ph: R() * 6.28 });
    }
  };
  /* gradoni di fondo: 6 file che salgono */
  const gradFar = [];
  for (let r = 0; r < 7; r++) {
    const u = -12.2 - r * 1.15, zh = 1.4 + r * .95;
    const a = proj(u, -14, zh), b = proj(u, 14, zh);
    gradFar.push([a, b]);
  }
  for (let r = gradFar.length - 1; r >= 0; r--) {
    const [a, b] = gradFar[r], a2 = { x: a.x, y: a.y + 60 }, b2 = { x: b.x, y: b.y + 60 };
    c.fillStyle = r % 2 ? '#0d1626' : '#101b2f'; polyPath(c, [a, b, b2, a2]); c.fill();
  }
  for (let r = gradFar.length - 1; r >= 0; r--) { const [a, b] = gradFar[r]; const rr = Math.max(2.2, proj(-12.2 - r * 1.15, 0).s * .22); addRow([a, b], Math.round(Math.abs(b.x - a.x) / (rr * 2.1)), rr); }
  /* tribune laterali (vista di scorcio) */
  for (const side of [-1, 1]) {
    for (let r = 0; r < 4; r++) {
      const v = side * (9.6 + r * 1.25), zh = 0.9 + r * 1.0;
      const a = proj(-12, v, zh), b = proj(11, v, zh);
      c.fillStyle = r % 2 ? '#0d1626' : '#101b2f'; polyPath(c, [a, b, { x: b.x, y: b.y + 80 }, { x: a.x, y: a.y + 80 }]); c.fill();
      const rr = Math.max(3, proj(0, v).s * .2);
      addRow([a, b], Math.round(Math.hypot(b.x - a.x, b.y - a.y) / (rr * 2.4)), rr);
    }
  }

  /* pavimento: zona libera + campo */
  const F = (u, v) => proj(u, v);
  const freeQ = [F(-12, -8.6), F(-12, 8.6), F(12, 8.6), F(12, -8.6)];
  const fg = c.createLinearGradient(0, F(-12, 0).y, 0, F(12, 0).y);
  /* Taraflex ufficiale LVF 2026/27: campo parquet con zona libera viola (A1: viola profondo con cornice; A2: viola piu' chiaro) */
  const isA1 = ((M.home && M.home.lid) || (typeof G !== 'undefined' && G && G.lid) || 'A1') !== 'A2';
  if (isA1) { fg.addColorStop(0, '#3b1a6b'); fg.addColorStop(1, '#5a2f99'); } else { fg.addColorStop(0, '#4a2f86'); fg.addColorStop(1, '#6f52b8'); }
  c.fillStyle = fg; polyPath(c, freeQ); c.fill();
  /* doghe */
  c.strokeStyle = 'rgba(255,255,255,.03)';
  for (let v = -8.4; v <= 8.4; v += .55) lineWorld(c, -12, v, 12, v, .03, 6);
  /* campo */
  const courtQ = [F(-9, -4.5), F(-9, 4.5), F(9, 4.5), F(9, -4.5)];
  const cg = c.createLinearGradient(0, F(-9, 0).y, 0, F(9, 0).y);
  cg.addColorStop(0, '#d8a867'); cg.addColorStop(1, '#efca94');
  c.fillStyle = cg; polyPath(c, courtQ); c.fill();
  /* zone d'attacco leggermente piu' scure */
  c.fillStyle = 'rgba(120,70,20,.10)';
  polyPath(c, [F(-3, -4.5), F(-3, 4.5), F(0, 4.5), F(0, -4.5)]); c.fill();
  polyPath(c, [F(0, -4.5), F(0, 4.5), F(3, 4.5), F(3, -4.5)]); c.fill();
  /* listoni del parquet */
  for (let v = -4.5, k = 0; v < 4.5; v += .36, k++) { if (k % 2) continue; c.fillStyle = 'rgba(255,240,205,.10)'; polyPath(c, [F(-9, v), F(-9, Math.min(4.5, v + .36)), F(9, Math.min(4.5, v + .36)), F(9, v)]); c.fill(); }
  if (isA1) { c.strokeStyle = 'rgba(214,170,255,.55)'; c.lineCap = 'butt'; lineWorld(c, -12, -8.6, -12, 8.6, .10, 1); lineWorld(c, 12, -8.6, 12, 8.6, .10, 1); lineWorld(c, -12, -8.6, 12, -8.6, .10, 12); lineWorld(c, -12, 8.6, 12, 8.6, .10, 12); }
  c.strokeStyle = 'rgba(90,50,10,.12)';
  for (let v = -4.3; v <= 4.4; v += .45) lineWorld(c, -9, v, 9, v, .02, 8);
  /* riflessi di luce */
  const rf = c.createRadialGradient(Cam.cx, F(0, 0).y, 10, Cam.cx, F(0, 0).y, W * .45);
  rf.addColorStop(0, 'rgba(255,255,255,.16)'); rf.addColorStop(1, 'rgba(255,255,255,0)');
  c.fillStyle = rf; polyPath(c, freeQ); c.fill();
  /* linee */
  c.strokeStyle = '#ffffff'; c.lineCap = 'butt';
  lineWorld(c, -9, -4.5, -9, 4.5, .06, 1); lineWorld(c, 9, -4.5, 9, 4.5, .06, 1);
  lineWorld(c, -9, -4.5, 9, -4.5, .06, 10); lineWorld(c, -9, 4.5, 9, 4.5, .06, 10);
  lineWorld(c, 0, -4.5, 0, 4.5, .06, 1);
  lineWorld(c, -3, -4.5, -3, 4.5, .06, 1); lineWorld(c, 3, -4.5, 3, 4.5, .06, 1);
  c.setLineDash([]);
  /* stemma del club di casa al centro della zona libera vicina */
  /* cartelloni LED */
  const boards = [], nb = 7, bu = -11.2;
  for (let i = 0; i < nb; i++) {
    const v0 = -9 + i * (18 / nb), v1 = v0 + 18 / nb - .12;
    const a = proj(bu, v0, 0), b = proj(bu, v1, 0), a2 = proj(bu, v0, .95), b2 = proj(bu, v1, .95);
    c.fillStyle = i % 2 ? '#0b1a33' : homeKit.shade; polyPath(c, [a, b, b2, a2]); c.fill();
    c.strokeStyle = 'rgba(255,255,255,.25)'; c.lineWidth = 1; polyPath(c, [a, b, b2, a2]); c.stroke();
    boards.push({ x: (a.x + b.x) / 2, y: (a2.y + a.y) / 2, w: b.x - a.x, h: a.y - a2.y });
  }
  const items = [{ k: 't', s: (M.home.city || M.home.short).toUpperCase() }, { k: 's', id: 'fineco' }, { k: 's', id: 'frecciarossa' }, { k: 'c', t: M.home }, { k: 's', id: 'fiat' }, { k: 's', id: 'md' }, { k: 'c', t: M.away }];
  c.textAlign = 'center'; c.textBaseline = 'middle';
  const drawImgBoard = (b, im) => {
    const s = Math.min(b.w * .8 / im.naturalWidth, b.h * .8 / im.naturalHeight);
    c.fillStyle = 'rgba(255,255,255,.92)'; c.fillRect(b.x - b.w * .46, b.y - b.h * .46, b.w * .92, b.h * .92);
    c.drawImage(im, b.x - im.naturalWidth * s / 2, b.y - im.naturalHeight * s / 2, im.naturalWidth * s, im.naturalHeight * s);
  };
  boards.forEach((b, i) => {
    const it = items[i]; let im = null, txt = '';
    if (it.k === 's') { im = LOGO_IMG['s:' + it.id]; txt = (LEAGUE_SPONSORS.find(x => x.id === it.id) || {}).name || ''; }
    else if (it.k === 'c') { im = it.t.logo && LOGO_IMG[it.t.id]; txt = it.t.short.toUpperCase(); }
    else txt = it.s;
    if (im && im.complete && im.naturalWidth) { drawImgBoard(b, im); return; }
    c.fillStyle = i % 2 ? '#dfe8f7' : Gx.onColor(homeKit.shade);
    c.font = `700 ${Math.max(9, b.h * .5)}px "Barlow Condensed",Arial Narrow,sans-serif`;
    c.fillText(txt, b.x, b.y, b.w * .9);
  });
  /* vignettatura */
  const vg = c.createRadialGradient(W / 2, H * .55, H * .35, W / 2, H * .55, H * .95);
  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.55)');
  c.fillStyle = vg; c.fillRect(0, 0, W, H);
  const la = proj(bu, -9, .95), lb = proj(bu, 9, 0);
  return { cv, crowd, led: { x: la.x, y: la.y, w: lb.x - la.x, h: lb.y - la.y } };
}

function drawCrowd(c, crowd, t, excite) {
  const groups = new Map();
  for (const d of crowd) { if (!groups.has(d.col)) groups.set(d.col, []); groups.get(d.col).push(d); }
  c.globalAlpha = .88;
  for (const [col, arr] of groups) {
    c.fillStyle = col; c.beginPath();
    for (const d of arr) {
      const bob = Math.sin(t * 2.2 + d.ph) * (.5 + excite * 2.4) * (d.r / 3);
      c.moveTo(d.x + d.r, d.y + bob); c.arc(d.x, d.y + bob, d.r, 0, 6.2832);
    }
    c.fill();
  }
  c.globalAlpha = 1;
}

function drawNet(c) {
  const post = 5.0, top = 2.24, bot = 1.24;
  const a = proj(0, -post, top), b = proj(0, post, top), b2 = proj(0, post, bot), a2 = proj(0, -post, bot);
  c.fillStyle = 'rgba(8,12,22,.34)'; polyPath(c, [a, b, b2, a2]); c.fill();
  c.strokeStyle = 'rgba(235,240,250,.30)'; c.lineWidth = 1;
  for (let v = -post; v <= post + .01; v += .3) { const p = proj(0, v, top), q = proj(0, v, bot); c.beginPath(); c.moveTo(p.x, p.y); c.lineTo(q.x, q.y); c.stroke(); }
  for (let z = bot; z <= top + .01; z += .16) { const p = proj(0, -post, z), q = proj(0, post, z); c.beginPath(); c.moveTo(p.x, p.y); c.lineTo(q.x, q.y); c.stroke(); }
  /* nastro superiore e inferiore */
  c.strokeStyle = '#f5f7fb'; c.lineCap = 'butt';
  const sc = proj(0, 0).s;
  c.lineWidth = Math.max(2, .075 * sc); c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); c.stroke();
  c.lineWidth = Math.max(1, .04 * sc); c.beginPath(); c.moveTo(a2.x, a2.y); c.lineTo(b2.x, b2.y); c.stroke();
  /* montanti */
  c.strokeStyle = '#2a3347'; c.lineCap = 'round';
  for (const v of [-post, post]) { const g = proj(0, v, 0), t = proj(0, v, 2.55); c.lineWidth = Math.max(3, .11 * sc); c.beginPath(); c.moveTo(g.x, g.y); c.lineTo(t.x, t.y); c.stroke(); }
  /* antenne a strisce */
  for (const v of [-4.5, 4.5]) {
    const g = proj(0, v, top), t = proj(0, v, top + .8);
    c.lineWidth = Math.max(2, .045 * sc);
    c.strokeStyle = '#f5f7fb'; c.beginPath(); c.moveTo(g.x, g.y); c.lineTo(t.x, t.y); c.stroke();
    c.strokeStyle = '#e03a3a'; c.setLineDash([.1 * sc, .1 * sc]); c.beginPath(); c.moveTo(g.x, g.y); c.lineTo(t.x, t.y); c.stroke(); c.setLineDash([]);
  }
}
function drawRefStand(c) {
  const v = Cam.side ? -6.1 : 6.1, sc = proj(0, v).s, g = proj(0, v, 0), seat = proj(0, v, 1.85);
  c.strokeStyle = '#3a4560'; c.lineWidth = Math.max(2, .07 * sc); c.lineCap = 'round';
  for (const dv of [-.35, .35]) { const a = proj(.35, v + dv, 0), b = proj(.35, v + dv, 1.8), a2 = proj(-.35, v + dv, 0), b2 = proj(-.35, v + dv, 1.8); c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); c.moveTo(a2.x, a2.y); c.lineTo(b2.x, b2.y); c.stroke(); }
  c.fillStyle = '#26304a'; c.fillRect(seat.x - .45 * sc, seat.y - .06 * sc, .9 * sc, .12 * sc);
  /* arbitro seduto */
  c.fillStyle = '#f2f4f8'; c.beginPath(); c.roundRect(seat.x - .2 * sc, seat.y - .72 * sc, .4 * sc, .7 * sc, .08 * sc); c.fill();
  c.fillStyle = '#e0b08a'; c.beginPath(); c.arc(seat.x, seat.y - .86 * sc, .115 * sc, 0, 7); c.fill();
  c.fillStyle = '#2b1f18'; c.beginPath(); c.arc(seat.x, seat.y - .9 * sc, .12 * sc, Math.PI, 0); c.fill();
  c.fillStyle = '#26304a'; c.fillRect(seat.x - .2 * sc, seat.y - .02 * sc, .4 * sc, .22 * sc);
}

/* ===== Palazzetto visto dal lato lungo (regia laterale) ===== */
function arenaBuildSide(M, k) {
  const W = Cam.W, H = Cam.H, cv = document.createElement('canvas');
  cv.width = Math.round(W * k); cv.height = Math.round(H * k);
  const c = cv.getContext('2d'); c.setTransform(k, 0, 0, k, 0, 0);
  const R = Gx.rng(Gx.hash(M.home.id + 'arena')), homeKit = Gx.kit(M.home);
  const isA1 = ((M.home && M.home.lid) || (typeof G !== 'undefined' && G && G.lid) || 'A1') !== 'A2';
  const wall = c.createLinearGradient(0, 0, 0, H * .6); wall.addColorStop(0, '#05080f'); wall.addColorStop(1, '#122036');
  c.fillStyle = wall; c.fillRect(0, 0, W, H);
  for (let i = 0; i < 9; i++) { const lx = W * (.06 + i * .11), g = c.createRadialGradient(lx, 6, 2, lx, 6, H * .38); g.addColorStop(0, 'rgba(210,225,255,.20)'); g.addColorStop(1, 'rgba(210,225,255,0)'); c.fillStyle = g; c.fillRect(0, 0, W, H * .6); }
  const crowd = [], tint = [homeKit.main, Gx.light(homeKit.main, .4), '#f5f7fb', '#1d2a44'];
  const addRow = (a, b, n, rr) => { for (let i = 0; i < n; i++) { const f = (i + R() * .6) / n, x = a.x + (b.x - a.x) * f, y = a.y + (b.y - a.y) * f; const col = R() < .55 ? tint[Math.floor(R() * tint.length)] : CROWD_PAL[Math.floor(R() * CROWD_PAL.length)]; crowd.push({ x, y, r: rr * (.85 + R() * .3), col, ph: R() * 6.28 }); } };
  /* tribuna sul lato lungo opposto */
  const rows = [];
  for (let r = 0; r < 8; r++) { const v = -7.4 - r * 1.1, zh = 1.1 + r * .95; rows.push([proj(15, v, zh), proj(-15, v, zh), v]); }
  for (let r = rows.length - 1; r >= 0; r--) { const [a, b] = rows[r]; c.fillStyle = r % 2 ? '#0d1626' : '#101b2f'; polyPath(c, [a, b, { x: b.x, y: b.y + 60 }, { x: a.x, y: a.y + 60 }]); c.fill(); }
  for (let r = rows.length - 1; r >= 0; r--) { const [a, b, v] = rows[r]; const rr = Math.max(2.2, proj(0, v).s * .2); addRow(a, b, Math.round(Math.abs(b.x - a.x) / (rr * 2.1)), rr); }
  /* tribune di testata */
  for (const sd of [-1, 1]) for (let r = 0; r < 5; r++) {
    const u = sd * (12.6 + r * 1.2), zh = .9 + r * 1.0, a = proj(u, -7.2, zh), b = proj(u, 6.5, zh);
    c.fillStyle = r % 2 ? '#0d1626' : '#101b2f'; polyPath(c, [a, b, { x: b.x, y: b.y + 80 }, { x: a.x, y: a.y + 80 }]); c.fill();
    const rr = Math.max(2.6, proj(u, 0).s * .2); addRow(a, b, Math.round(Math.hypot(b.x - a.x, b.y - a.y) / (rr * 2.4)), rr);
  }
  /* pavimento: zona libera viola + campo parquet */
  const F = (u, v) => proj(u, v);
  const freeQ = [F(-12.2, -7), F(12.2, -7), F(12.2, 9), F(-12.2, 9)];
  const fg = c.createLinearGradient(0, F(0, -7).y, 0, F(0, 9).y);
  if (isA1) { fg.addColorStop(0, '#3b1a6b'); fg.addColorStop(1, '#5a2f99'); } else { fg.addColorStop(0, '#4a2f86'); fg.addColorStop(1, '#6f52b8'); }
  c.fillStyle = fg; polyPath(c, freeQ); c.fill();
  if (isA1) { c.strokeStyle = 'rgba(214,170,255,.55)'; c.lineCap = 'butt'; lineWorld(c, -12.2, -7, 12.2, -7, .10, 12); lineWorld(c, -12.2, -7, -12.2, 9, .10, 6); lineWorld(c, 12.2, -7, 12.2, 9, .10, 6); }
  const courtQ = [F(-9, -4.5), F(9, -4.5), F(9, 4.5), F(-9, 4.5)];
  const cg = c.createLinearGradient(0, F(0, -4.5).y, 0, F(0, 4.5).y); cg.addColorStop(0, '#d8a867'); cg.addColorStop(1, '#efca94');
  c.fillStyle = cg; polyPath(c, courtQ); c.fill();
  c.fillStyle = 'rgba(120,70,20,.10)'; polyPath(c, [F(-3, -4.5), F(3, -4.5), F(3, 4.5), F(-3, 4.5)]); c.fill();
  for (let v = -4.5, kk = 0; v < 4.5; v += .36, kk++) { if (kk % 2) continue; c.fillStyle = 'rgba(255,240,205,.10)'; polyPath(c, [F(-9, v), F(9, v), F(9, Math.min(4.5, v + .36)), F(-9, Math.min(4.5, v + .36))]); c.fill(); }
  c.strokeStyle = 'rgba(90,50,10,.12)'; for (let v = -4.3; v <= 4.4; v += .45) lineWorld(c, -9, v, 9, v, .02, 8);
  const rf = c.createRadialGradient(Cam.cx, F(0, 0).y, 10, Cam.cx, F(0, 0).y, W * .5); rf.addColorStop(0, 'rgba(255,255,255,.16)'); rf.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = rf; polyPath(c, freeQ); c.fill();
  c.strokeStyle = '#ffffff'; c.lineCap = 'butt';
  lineWorld(c, -9, -4.5, 9, -4.5, .06, 10); lineWorld(c, -9, 4.5, 9, 4.5, .06, 10); lineWorld(c, -9, -4.5, -9, 4.5, .06, 4); lineWorld(c, 9, -4.5, 9, 4.5, .06, 4);
  lineWorld(c, 0, -4.5, 0, 4.5, .06, 4); lineWorld(c, -3, -4.5, -3, 4.5, .06, 4); lineWorld(c, 3, -4.5, 3, 4.5, .06, 4);
  /* base del cartellone LED (le animazioni vengono disegnate sopra) */
  const bu = -6.7, a = proj(-12.2, bu, 0), b = proj(12.2, bu, 0), a2 = proj(-12.2, bu, 1.1), b2 = proj(12.2, bu, 1.1);
  c.fillStyle = '#0b1a33'; polyPath(c, [a, b, b2, a2]); c.fill();
  c.fillStyle = '#dfe8f7'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = `700 ${Math.max(9, (a.y - a2.y) * .5)}px "Barlow Condensed",Arial Narrow,sans-serif`;
  for (let i = 0; i < 4; i++) { const p = proj(-9 + i * 6, bu, .55); c.fillText(i % 2 ? M.away.short.toUpperCase() : M.home.short.toUpperCase(), p.x, p.y, 200); }
  const vg = c.createRadialGradient(W / 2, H * .6, H * .35, W / 2, H * .6, H * .95); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.5)'); c.fillStyle = vg; c.fillRect(0, 0, W, H);
  return { cv, crowd, led: null };
}
