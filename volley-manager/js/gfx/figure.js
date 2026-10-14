/* ===== Figura della giocatrice: disegno vettoriale articolato con pose interpolabili ===== */
/* Una posa e' un vettore: cr=accovacciata 0..1, ln=inclinazione 0..1, lf=quota di salto in metri,
   L e R = [angolo spalla, piegatura gomito] per braccio sinistro e destro dello schermo.
   Angolo 0 = braccio lungo il corpo, PI/2 = orizzontale verso l'esterno, PI = verticale verso l'alto. */
const POSE = {
  ready:    { cr: .30, ln: .20, lf: 0,   L: [.38, -.95], R: [.38, -.95] },
  walk:     { cr: .12, ln: .10, lf: 0,   L: [.25, -.40], R: [.25, -.40] },
  receive:  { cr: .72, ln: .55, lf: 0,   L: [.20, -.55], R: [.20, -.55] },
  bump:     { cr: .52, ln: .40, lf: .03, L: [-.02, -.10], R: [-.02, -.10] },
  setReady: { cr: .18, ln: .05, lf: 0,   L: [2.25, .40], R: [2.25, .40] },
  set:      { cr: .06, ln: 0,   lf: .05, L: [2.75, .25], R: [2.75, .25] },
  toss:     { cr: .10, ln: .05, lf: 0,   L: [3.00, 0],   R: [.55, -.80] },
  serveHit: { cr: .00, ln: .00, lf: .22, L: [.55, -.40], R: [3.05, .05] },
  cock:     { cr: .35, ln: .10, lf: .18, L: [2.45, .10], R: [1.95, 1.50] },
  spike:    { cr: .00, ln: -.05, lf: .62, L: [.45, -.50], R: [3.05, .12] },
  spikeTop: { cr: .00, ln: -.05, lf: .78, L: [.70, -.40], R: [3.05, .08] },
  block:    { cr: .05, ln: 0,   lf: .55, L: [2.95, -.05], R: [2.95, -.05] },
  blockUp:  { cr: .05, ln: 0,   lf: .70, L: [3.05, 0],   R: [3.05, 0] },
  dive:     { cr: .96, ln: .95, lf: .02, L: [.15, .20],  R: [.15, .20] },
  dig:      { cr: .85, ln: .70, lf: .00, L: [.10, -.30], R: [.10, -.30] },
  cheer:    { cr: .05, ln: 0,   lf: .10, L: [2.75, .30], R: [2.75, .30] },
  cheerUp:  { cr: .20, ln: 0,   lf: .02, L: [2.55, .10], R: [2.95, .20] },
  run:      { cr: .20, ln: .40, lf: 0,   L: [.30, -.70], R: [.30, -.15] },
  setJump:  { cr: .06, ln: 0,   lf: .32, L: [2.80, .25], R: [2.80, .25] },
  down:     { cr: .22, ln: .35, lf: 0,   L: [.12, -.25], R: [.12, -.25] }
};
const POSE_KEYS = ['cr', 'ln', 'lf'];
function poseBlend(a, b, f) {
  const k = f < 0 ? 0 : f > 1 ? 1 : f, e = k * k * (3 - 2 * k);
  const m = (x, y) => x + (y - x) * e;
  return { cr: m(a.cr, b.cr), ln: m(a.ln, b.ln), lf: m(a.lf, b.lf), L: [m(a.L[0], b.L[0]), m(a.L[1], b.L[1])], R: [m(a.R[0], b.R[0]), m(a.R[1], b.R[1])] };
}

function drawFigure(c, X, Y, s, f) {
  const P = f.pose || POSE.ready, front = !!f.front, K = f.kit, look = f.look;
  const skin = look.skin, skinD = Gx.dark(skin, .16), hair = look.hair, hairD = Gx.dark(hair, .3);
  const lift = P.lf, Yf = Y - lift * s;
  const hipH = .90 - P.cr * .30, hipY = Yf - hipH * s;
  const tl = .50 * (1 - .20 * P.ln), shY = hipY - tl * s;
  const lean = P.ln * .05 * s;                 // la parte alta si sposta leggermente verso la rete
  const dir = front ? 1 : -1;                  // verso la rete sullo schermo
  const shX = X, tx = lean * 0;

  /* ombra a terra */
  const shr = Math.max(.35, 1 - lift * .45);
  c.fillStyle = `rgba(6,10,20,${.30 * shr})`;
  c.beginPath(); c.ellipse(X, Y + .01 * s, .27 * s * shr, .085 * s * shr, 0, 0, 7); c.fill();

  /* gambe */
  const spread = .095 + P.cr * .08;
  for (const side of [-1, 1]) {
    const hx = X + side * .075 * s, hy = hipY + .02 * s;
    const fx = X + side * (spread + .02) * s, fy = Yf;
    const kx = (hx + fx) / 2 + side * (.03 + P.cr * .11) * s, ky = (hy + fy) / 2 - P.cr * .03 * s;
    c.lineCap = 'round'; c.lineJoin = 'round';
    c.strokeStyle = skin; c.lineWidth = .128 * s;
    c.beginPath(); c.moveTo(hx, hy); c.lineTo(kx, ky); c.stroke();
    c.lineWidth = .102 * s; c.beginPath(); c.moveTo(kx, ky); c.lineTo(fx, fy - .05 * s); c.stroke();
    c.fillStyle = '#232b3d'; c.globalAlpha = .85; c.beginPath(); c.arc(kx, ky, .046 * s, 0, 7); c.fill(); c.globalAlpha = 1;               // ginocchiera
    c.fillStyle = '#f4f6fa'; c.beginPath(); c.ellipse(fx + side * .015 * s, fy - .018 * s, .068 * s, .042 * s, 0, 0, 7); c.fill(); // scarpa
    c.fillStyle = K.trim; c.fillRect(fx - .06 * s + side * .0, fy - .085 * s, .12 * s, .028 * s);   // calzino
  }
  /* pantaloncini */
  c.fillStyle = K.shorts;
  c.beginPath();
  c.moveTo(X - .165 * s, hipY - .06 * s); c.lineTo(X + .165 * s, hipY - .06 * s);
  c.lineTo(X + .172 * s, hipY + .15 * s); c.lineTo(X + .02 * s, hipY + .12 * s);
  c.lineTo(X - .02 * s, hipY + .12 * s); c.lineTo(X - .172 * s, hipY + .15 * s); c.closePath(); c.fill();

  /* capelli lunghi / coda dietro al busto (vista di spalle) */
  const st = look.style, sway = (f.sway || 0);
  const headR = .118 * s, headY = shY - .150 * s;
  const drawHairBack = () => {
    c.fillStyle = hair;
    if (!front) {
      if (st === 0) { c.beginPath(); c.ellipse(X, headY + .13 * s, .15 * s, .24 * s, 0, 0, 7); c.fill(); }
    } else if (st === 0) { c.beginPath(); c.ellipse(X, headY + .1 * s, .15 * s, .20 * s, 0, 0, 7); c.fill(); }
  };
  if (st === 0) drawHairBack();

  /* busto */
  c.fillStyle = K.main;
  c.beginPath();
  c.moveTo(X - .145 * s, hipY - .02 * s);
  c.quadraticCurveTo(X - .185 * s, hipY - .24 * s, X - .205 * s, shY + .02 * s);
  c.lineTo(X + .205 * s, shY + .02 * s);
  c.quadraticCurveTo(X + .185 * s, hipY - .24 * s, X + .145 * s, hipY - .02 * s);
  c.closePath(); c.fill();
  c.fillStyle = K.shade; c.globalAlpha = .55; c.fillRect(X - .145 * s, hipY - .1 * s, .29 * s, .08 * s); c.globalAlpha = 1;
  c.fillStyle = K.trim; c.fillRect(X - .205 * s, shY + .005 * s, .41 * s, .035 * s);
  /* numero */
  const no = String(f.no || '');
  if (no && s > 22) {
    c.fillStyle = K.num; c.textAlign = 'center'; c.textBaseline = 'middle';
    if (!front) { c.font = `700 ${.21 * s}px "Barlow Condensed",Arial Narrow,sans-serif`; c.fillText(no, X, shY + .21 * s); }
    else { c.font = `700 ${.13 * s}px "Barlow Condensed",Arial Narrow,sans-serif`; c.fillText(no, X + .045 * s, shY + .13 * s); }
  }
  if (front) { c.fillStyle = K.trim; c.beginPath(); c.moveTo(X - .06 * s, shY + .005 * s); c.lineTo(X, shY + .07 * s); c.lineTo(X + .06 * s, shY + .005 * s); c.closePath(); c.fill(); }

  /* braccia */
  const armPts = (side, a1, e) => {
    const sx = X + side * .205 * s, sy = shY + .04 * s;
    const d = th => [side * Math.sin(th), Math.cos(th)];
    const d1 = d(a1), d2 = d(a1 + e);
    const ex = sx + d1[0] * .285 * s, ey = sy + d1[1] * .285 * s;
    const hx = ex + d2[0] * .265 * s, hy = ey + d2[1] * .265 * s;
    return { sx, sy, ex, ey, hx, hy };
  };
  const arms = [[-1, P.L], [1, P.R]].map(([sd, a]) => ({ sd, ...armPts(sd, a[0], a[1]) }));
  for (const A of arms) {
    c.lineCap = 'round';
    c.strokeStyle = skin; c.lineWidth = .082 * s;
    c.beginPath(); c.moveTo(A.sx, A.sy); c.lineTo(A.ex, A.ey); c.lineTo(A.hx, A.hy); c.stroke();
    /* manica */
    const ml = .38, mx = A.sx + (A.ex - A.sx) * ml, my = A.sy + (A.ey - A.sy) * ml;
    c.strokeStyle = K.main; c.lineWidth = .105 * s; c.beginPath(); c.moveTo(A.sx, A.sy); c.lineTo(mx, my); c.stroke();
    c.strokeStyle = K.trim; c.lineWidth = .105 * s; c.beginPath(); c.moveTo(mx - (mx - A.sx) * .22, my - (my - A.sy) * .22); c.lineTo(mx, my); c.stroke();
    c.fillStyle = skin; c.beginPath(); c.arc(A.hx, A.hy, .05 * s, 0, 7); c.fill();
  }

  /* collo e testa */
  c.fillStyle = skinD; c.fillRect(X - .04 * s, shY - .07 * s, .08 * s, .09 * s);
  if (!front) {
    /* di spalle: tutta la testa e' capelli */
    c.fillStyle = skin; c.beginPath(); c.arc(X, headY, headR * .98, 0, 7); c.fill();
    c.fillStyle = hair; c.beginPath(); c.arc(X, headY - .008 * s, headR * 1.06, Math.PI * .93, Math.PI * 2.07); c.lineTo(X + headR * .98, headY + .02 * s); c.quadraticCurveTo(X, headY + headR * 1.25, X - headR * .98, headY + .02 * s); c.closePath(); c.fill();
    c.fillStyle = hairD; c.beginPath(); c.ellipse(X, headY + .035 * s, headR * .75, headR * .5, 0, 0, Math.PI); c.fill();
    if (st === 1) { c.fillStyle = hair; c.beginPath(); c.arc(X, headY - headR * 1.12, headR * .52, 0, 7); c.fill(); }
    else if (st === 2 || st === 4) {
      const tx2 = X + (st === 2 ? 1 : -1) * (headR * .95) + sway * .1 * s, ty2 = headY + headR * 1.5 + Math.abs(sway) * .02 * s;
      c.strokeStyle = hair; c.lineWidth = .075 * s; c.lineCap = 'round';
      c.beginPath(); c.moveTo(X + (st === 2 ? 1 : -1) * headR * .72, headY - headR * .1); c.quadraticCurveTo(tx2 + (st === 2 ? .06 : -.06) * s, headY + headR * .5, tx2, ty2); c.stroke();
    } else if (st === 3) { c.fillStyle = hair; c.beginPath(); c.ellipse(X, headY + headR * .7, headR * 1.12, headR * .75, 0, 0, Math.PI); c.fill(); }
  } else {
    c.fillStyle = skin; c.beginPath(); c.arc(X, headY, headR, 0, 7); c.fill();
    c.fillStyle = hair; c.beginPath(); c.arc(X, headY - .012 * s, headR * 1.05, Math.PI * 1.02, Math.PI * 1.98); c.quadraticCurveTo(X + headR * .5, headY - headR * .4, X, headY - headR * .35); c.quadraticCurveTo(X - headR * .5, headY - headR * .4, X - headR * 1.03, headY - .012 * s); c.closePath(); c.fill();
    if (st === 1) { c.fillStyle = hair; c.beginPath(); c.arc(X, headY - headR * 1.12, headR * .5, 0, 7); c.fill(); }
    else if (st === 2 || st === 4) { c.strokeStyle = hair; c.lineWidth = .07 * s; c.lineCap = 'round'; c.beginPath(); c.moveTo(X + headR * .8, headY - headR * .3); c.quadraticCurveTo(X + headR * 1.5, headY + headR * .2, X + headR * 1.3 + sway * .05 * s, headY + headR * 1.4); c.stroke(); }
    else if (st === 3) { c.fillStyle = hair; c.beginPath(); c.ellipse(X - headR * 1.0, headY + headR * .5, headR * .3, headR * .9, 0, 0, 7); c.ellipse(X + headR * 1.0, headY + headR * .5, headR * .3, headR * .9, 0, 0, 7); c.fill(); }
    if (s > 30) {
      c.fillStyle = '#1b1b1f'; const er = Math.max(1, .016 * s);
      c.beginPath(); c.arc(X - .045 * s, headY + .012 * s, er, 0, 7); c.arc(X + .045 * s, headY + .012 * s, er, 0, 7); c.fill();
      c.strokeStyle = '#8a4a4a'; c.lineWidth = Math.max(1, .012 * s); c.beginPath(); c.arc(X, headY + .055 * s, .03 * s, .15, Math.PI - .15); c.stroke();
    }
  }
  /* fascia / elastico e leggero riflesso */
  c.strokeStyle = K.trim; c.globalAlpha = .9; c.lineWidth = Math.max(1, .016 * s);
  c.beginPath(); c.arc(X, headY - .008 * s, headR * 1.02, Math.PI * 1.08, Math.PI * 1.92); c.stroke(); c.globalAlpha = 1;
  return { head: [X, headY], arms };
}
