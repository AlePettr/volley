/* ===== Partita in 3D (Three.js r128) =====
   Legge le stesse entita' del motore 2D (atlete con u,v e posa, palla u,v,z) e le disegna in una scena 3D.
   Mappa mondo: X = v (destra/sinistra del campo), Y = altezza, Z = u (distanza dalla rete, positivo verso la camera da fondo).
   Il canvas 2D #cv resta sopra, trasparente, per cartellini nome ed effetti: Cam.p3 fa si' che proj() usi la camera 3D. */
const S3_BUILD = 'm';
function s3Available() { return typeof THREE !== 'undefined'; }
function s3Active(M) { return !!(M && M.s3 && UI.mode3d !== false); }

const S3_FORWARD = new Set(['bump', 'receive', 'dig', 'dive']);
const S3_UP = s3Available() ? new THREE.Vector3(0, 1, 0) : null;
const S3_CROWD = ['#e8edf5', '#c3cddd', '#8da2c4', '#f2a43a', '#d6336c', '#2f6fdb', '#3a465c', '#f4d9c4'];

function s3Tex(w, h, fn) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; fn(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.anisotropy = 4; return t;
}
function s3Seg(mesh, a, b, rad) {
  const d = new THREE.Vector3().subVectors(b, a), L = Math.max(1e-4, d.length());
  mesh.position.copy(a).addScaledVector(d, .5);
  mesh.quaternion.setFromUnitVectors(S3_UP, d.multiplyScalar(1 / L));
  mesh.scale.set(rad, L, rad);
}

/* ---------- inizializzazione (una volta per partita) ---------- */
function s3Setup(M) {
  const ar = $("#arena"); if (!ar) return;
  if (!s3Available() || UI.mode3d === false) { if (M.s3) M.s3.cv.style.display = 'none'; return; }
  if (!M.s3) {
    try {
      let cv = $("#cv3");
      if (!cv) { cv = document.createElement('canvas'); cv.id = 'cv3'; cv.className = 'cv3'; ar.insertBefore(cv, ar.firstChild); }
      const renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true, powerPreference: 'high-performance' });
      M.s3 = { cv, renderer, rigs: new Map(), crowd: null, last: 0 };
      s3Build(M);
    } catch (e) { console.warn('3D non disponibile', e); UI.mode3d = false; M.s3 = null; const c = $("#cv3"); if (c) c.remove(); return; }
  }
  const S = M.s3, cv = $("#cv");
  S.cv.style.display = 'block';
  { const ctl = $("#ctl"); if (ctl && !$("#s3ver")) ctl.insertAdjacentHTML('beforeend', `<span class="pill" id="s3ver" title="Versione della grafica 3D">3D ${S3_BUILD}</span>`); }
  const w = cv.clientWidth || 800, h = Math.round(w * Cam.H / Cam.W), dpr = Math.min(2, window.devicePixelRatio || 1);
  S.renderer.setPixelRatio(dpr); S.renderer.setSize(w, h, false);
  S.aspect = w / h; S.camera.aspect = S.aspect; S.camera.updateProjectionMatrix();
  S.cur = null;
}
function s3Dispose(M) {
  if (!M || !M.s3) return;
  try { M.s3.renderer.dispose(); M.s3.renderer.forceContextLoss(); } catch (e) { }
  M.s3 = null; const c = $("#cv3"); if (c) c.remove();
}

function s3Build(M) {
  const S = M.s3, TH = arenaTheme(M.home), homeKit = Gx.kit(M.home), R = Gx.rng(Gx.hash(M.home.id + 'arena3'));
  const scene = S.scene = new THREE.Scene();
  scene.background = new THREE.Color(TH.wall[0]);
  S.camera = new THREE.PerspectiveCamera(32, 16 / 9, .5, 200);
  scene.add(new THREE.AmbientLight(0xffffff, .78));
  scene.add(new THREE.HemisphereLight(0xdfeaff, 0x2a2540, .55));
  const sun = new THREE.DirectionalLight(0xffffff, .55); sun.position.set(-6, 22, 10); scene.add(sun);
  const isA1 = ((M.home && M.home.lid) || (typeof G !== 'undefined' && G && G.lid) || 'A1') !== 'A2';

  /* pavimento: zona libera viola + campo in parquet (texture disegnata una volta) */
  const FW = 17.2, FL = 24, TW = 1536, TL = 2048;
  const floorTex = s3Tex(TW, TL, (c, w, h) => {
    const X = v => (v + FW / 2) * w / FW, Y = u => (u + FL / 2) * h / FL;
    const g = c.createLinearGradient(0, 0, 0, h);
    if (isA1) { g.addColorStop(0, '#3b1a6b'); g.addColorStop(1, '#5a2f99'); } else { g.addColorStop(0, '#4a2f86'); g.addColorStop(1, '#6f52b8'); }
    c.fillStyle = g; c.fillRect(0, 0, w, h);
    if (isA1) { c.strokeStyle = 'rgba(214,170,255,.55)'; c.lineWidth = .10 * w / FW; c.strokeRect(X(-8.55), Y(-11.95), X(8.55) - X(-8.55), Y(11.95) - Y(-11.95)); }
    const cg = c.createLinearGradient(0, Y(-9), 0, Y(9)); cg.addColorStop(0, '#d8a867'); cg.addColorStop(.5, '#e6bb80'); cg.addColorStop(1, '#efca94');
    c.fillStyle = cg; c.fillRect(X(-4.5), Y(-9), X(4.5) - X(-4.5), Y(9) - Y(-9));
    c.fillStyle = 'rgba(120,70,20,.10)'; c.fillRect(X(-4.5), Y(-3), X(4.5) - X(-4.5), Y(3) - Y(-3));
    for (let v = -4.5, k = 0; v < 4.5; v += .36, k++) { if (k % 2) continue; c.fillStyle = 'rgba(255,240,205,.11)'; c.fillRect(X(v), Y(-9), X(v + .36) - X(v), Y(9) - Y(-9)); }
    c.strokeStyle = 'rgba(90,50,10,.13)'; c.lineWidth = 1;
    for (let v = -4.3; v <= 4.4; v += .45) { c.beginPath(); c.moveTo(X(v), Y(-9)); c.lineTo(X(v), Y(9)); c.stroke(); }
    c.strokeStyle = '#fff'; c.lineWidth = .05 * w / FW; c.lineCap = 'butt';
    const L = (u1, v1, u2, v2) => { c.beginPath(); c.moveTo(X(v1), Y(u1)); c.lineTo(X(v2), Y(u2)); c.stroke(); };
    L(-9, -4.5, -9, 4.5); L(9, -4.5, 9, 4.5); L(-9, -4.5, 9, -4.5); L(-9, 4.5, 9, 4.5); L(0, -4.5, 0, 4.5); L(-3, -4.5, -3, 4.5); L(3, -4.5, 3, 4.5);
  });
  floorTex.anisotropy = Math.min(8, S.renderer.capabilities.getMaxAnisotropy());
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(FW, FL), new THREE.MeshBasicMaterial({ map: floorTex }));
  floor.rotation.x = -Math.PI / 2; floor.position.y = .0; scene.add(floor);
  const outer = new THREE.Mesh(new THREE.PlaneGeometry(90, 90), new THREE.MeshLambertMaterial({ color: 0x0e1422 }));
  outer.rotation.x = -Math.PI / 2; outer.position.y = -.02; scene.add(outer);

  /* tribune a gradoni nei colori del club di casa + pubblico a istanze */
  const seat = [Gx.dark(homeKit.main, .8), Gx.dark(homeKit.main, .72)], tint = [homeKit.main, Gx.light(homeKit.main, .4), '#f5f7fb', '#1d2a44'];
  const stepD = .95, rowsEnd = TH.rowsFar, rowsSide = TH.rowsSide, spots = [];
  const addStand = (axis, sign, rows, start, span, centre) => {
    for (let r = 0; r < rows; r++) {
      const h = .5 + r * .4, d = start + r * stepD + stepD / 2;
      const geo = axis === 'z' ? new THREE.BoxGeometry(span, h, stepD) : new THREE.BoxGeometry(stepD, h, span);
      const m = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ color: seat[r % 2] }));
      if (axis === 'z') m.position.set(centre, h / 2, sign * d); else m.position.set(sign * d, h / 2, centre);
      scene.add(m);
      const n = Math.floor(span / .56);
      for (let i = 0; i < n; i++) {
        if (R() > Math.min(1, TH.density * .95 + .1)) continue;
        const a = centre - span / 2 + (i + .5) * span / n + (R() - .5) * .12;
        spots.push(axis === 'z' ? { x: a, y: h, z: sign * (d + (R() - .5) * .25) } : { x: sign * (d + (R() - .5) * .25), y: h, z: a });
      }
    }
  };
  const END0 = 14.4, SIDE0 = 11.2, endSpan = 2 * (SIDE0 + rowsSide * stepD);
  for (const s of [-1, 1]) { addStand('z', s, rowsEnd, END0, endSpan, 0); addStand('x', s, rowsSide, SIDE0, 2 * END0 - 1, 0); }
  /* pareti scure dietro le gradinate e soffitto con fari */
  /* pareti visibili solo dall'interno: le camere larghe stanno oltre i gradoni e non devono vedere il retro */
  const wallMat = new THREE.MeshLambertMaterial({ color: new THREE.Color(TH.wall[1]).multiplyScalar(.8) });
  const zW = END0 + rowsEnd * stepD + 1, xW = SIDE0 + rowsSide * stepD + 1;
  for (const s of [-1, 1]) {
    const a = new THREE.Mesh(new THREE.PlaneGeometry(2 * xW + 4, 26), wallMat); a.position.set(0, 13, s * zW); a.rotation.y = s > 0 ? Math.PI : 0; scene.add(a);
    const b = new THREE.Mesh(new THREE.PlaneGeometry(2 * zW, 26), wallMat); b.rotation.y = s > 0 ? -Math.PI / 2 : Math.PI / 2; b.position.set(s * xW, 13, 0); scene.add(b);
  }
  const roof = new THREE.Mesh(new THREE.PlaneGeometry(2 * xW, 2 * zW), new THREE.MeshLambertMaterial({ color: 0x080c16 })); roof.rotation.x = Math.PI / 2; roof.position.y = 24; scene.add(roof);
  /* luce: pozza calda sul campo e fasci conici dai fari (additivi, molto tenui) */
  const poolTex = s3Tex(256, 256, (c, w, h) => { const g = c.createRadialGradient(w / 2, h / 2, 4, w / 2, h / 2, w / 2); g.addColorStop(0, 'rgba(255,246,226,.30)'); g.addColorStop(.6, 'rgba(255,246,226,.10)'); g.addColorStop(1, 'rgba(255,246,226,0)'); c.fillStyle = g; c.fillRect(0, 0, w, h); });
  const pool = new THREE.Mesh(new THREE.PlaneGeometry(26, 34), new THREE.MeshBasicMaterial({ map: poolTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  pool.rotation.x = -Math.PI / 2; pool.position.y = .006; scene.add(pool);
  const beamMat = new THREE.MeshBasicMaterial({ color: 0xcfdcff, transparent: true, opacity: .035, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
  for (const bx of [-5, 0, 5]) for (const bz of [-7, 0, 7]) { const cn = new THREE.Mesh(new THREE.ConeGeometry(3.6, 23, 20, 1, true), beamMat); cn.position.set(bx, 12.4, bz); scene.add(cn); }
  const lampMat = new THREE.MeshBasicMaterial({ color: 0xf2f6ff });
  for (let i = -3; i <= 3; i++) for (let j = -2; j <= 2; j++) { const l = new THREE.Mesh(new THREE.BoxGeometry(1.4, .12, .6), lampMat); l.position.set(j * 4.4, 23.9, i * 4); scene.add(l); }
  if (TH.beams) for (let i = -4; i <= 4; i++) { const b = new THREE.Mesh(new THREE.BoxGeometry(2 * xW, .5, .35), new THREE.MeshLambertMaterial({ color: 0x0d1424 })); b.position.set(0, 23.6, i * 3.3); scene.add(b); }

  /* spettatori */
  const N = spots.length, bodyG = new THREE.CylinderGeometry(.2, .22, .55, 7), headG = new THREE.SphereGeometry(.13, 8, 6);
  const bodies = new THREE.InstancedMesh(bodyG, new THREE.MeshLambertMaterial({ color: 0xffffff }), N), heads = new THREE.InstancedMesh(headG, new THREE.MeshLambertMaterial({ color: 0xffffff }), N);
  const mtx = new THREE.Matrix4(), col = new THREE.Color(), skins = ['#f1c9a5', '#e0ac82', '#b9835b', '#8a5a3b', '#f5d6bd'], base = new Float32Array(N), ph = new Float32Array(N);
  const hs = M.userSide === 'a' ? -1 : 1, kh = M.kits.h, ka = M.kits.a, team = new Uint8Array(N), flagSpots = [];
  const homePal = [kh.main, kh.main, kh.trim, Gx.light(kh.main, .3)], awayPal = [ka.main, ka.main, ka.trim, Gx.light(ka.main, .3)];
  spots.forEach((p, i) => {
    base[i] = p.y + .32; ph[i] = R() * 6.28;
    mtx.makeTranslation(p.x, base[i], p.z); bodies.setMatrixAt(i, mtx);
    mtx.makeTranslation(p.x, base[i] + .43, p.z); heads.setMatrixAt(i, mtx);
    /* tifosi: dal lato della squadra di casa colori di casa, dal lato opposto colori ospiti, il resto neutro */
    const own = p.z * hs > 0 ? 1 : 2, r = R(), pal = own === 1 ? homePal : awayPal, opp = own === 1 ? awayPal : homePal;
    let tm = 0, cc;
    if (r < .62) { cc = pal[Math.floor(R() * pal.length)]; tm = own; }
    else if (r < .72) { cc = opp[Math.floor(R() * opp.length)]; tm = own === 1 ? 2 : 1; }
    else cc = S3_CROWD[Math.floor(R() * S3_CROWD.length)];
    team[i] = tm;
    if (tm && R() < .12) flagSpots.push({ x: p.x, y: base[i] + .55, z: p.z, ph: R() * 6.28, tm, i });
    bodies.setColorAt(i, col.set(cc));
    heads.setColorAt(i, col.set(skins[Math.floor(R() * skins.length)]));
  });
  bodies.frustumCulled = false; heads.frustumCulled = false;
  scene.add(bodies); scene.add(heads);
  /* bandiere sventolate dai tifosi */
  const NF = flagSpots.length, flags = new THREE.InstancedMesh(new THREE.PlaneGeometry(.55, .34), new THREE.MeshLambertMaterial({ color: 0xffffff, side: THREE.DoubleSide }), Math.max(1, NF)), poles = new THREE.InstancedMesh(new THREE.CylinderGeometry(.012, .012, .9, 5), new THREE.MeshLambertMaterial({ color: 0xdfe3ea }), Math.max(1, NF));
  flagSpots.forEach((f, k) => { flags.setColorAt(k, col.set(f.tm === 1 ? kh.main : ka.main)); mtx.makeTranslation(f.x, f.y + .1, f.z); poles.setMatrixAt(k, mtx); });
  flags.count = NF; poles.count = NF; flags.frustumCulled = false; poles.frustumCulled = false; scene.add(flags); scene.add(poles);
  S.crowd = { bodies, heads, base, ph, N, spots, team, flags, flagSpots, NF };

  /* cartelloni LED: filmati della Lega se disponibili, altrimenti nomi di squadre e sponsor */
  S.panels = []; S.vtex = new Map();
  const fallback = s3Tex(1024, 64, (c, w, h) => {
    c.fillStyle = homeKit.shade; c.fillRect(0, 0, w, h);
    const items = [(M.home.city || M.home.short).toUpperCase(), 'FINECO', M.away.short.toUpperCase(), 'FRECCIAROSSA', M.home.short.toUpperCase(), 'FIAT'];
    c.fillStyle = Gx.onColor(homeKit.shade); c.font = '700 40px "Barlow Condensed",Arial Narrow,sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
    items.forEach((t, i) => { c.fillText(t, (i + .5) * w / items.length, h / 2 + 2, w / items.length - 20); });
  });
  const dark = new THREE.MeshLambertMaterial({ color: 0x05080f });
  S.boards = { 'e+f': [], 'e+n': [], 'e-f': [], 'e-n': [], 's+': [], 's-': [] };   /* f = meta' lontana dalla camera laterale (v<0), n = meta' vicina */
  const panel = (len, x, z, ry, slot, grp) => {
    const mat = new THREE.MeshBasicMaterial({ map: fallback });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(len - .06, 1.1), mat); m.position.set(x, .55, z); m.rotation.y = ry; scene.add(m);
    S.boards[grp].push(m);
    S.panels.push({ mat, slot, len, tex: null });
  };
  /* rettangolo chiuso oltre la zona libera: i fondi (lato corto) a 12.6 m dalla rete, i lati lunghi a 8.8 m dall'asse */
  const EB = 11.2, SB = 9.8;   /* fondi a 11.2 m dalla rete (v da -8.8 a 8.8); lati lunghi a 9.8 m dall'asse, u da -10 a 10: non toccano i fondi */
  panel(8.8, -4.4, -EB, 0, 0, 'e-f'); panel(8.8, 4.4, -EB, 0, 1, 'e-n');
  panel(8.8, 4.4, EB, Math.PI, 1, 'e+n'); panel(8.8, -4.4, EB, Math.PI, 2, 'e+f');
  panel(10, -SB, -5, Math.PI / 2, 0, 's-'); panel(10, -SB, 5, Math.PI / 2, 1, 's-');   /* panel(lunghezza, x = v, z = u, rotazione, filmato) */
  panel(10, SB, -5, -Math.PI / 2, 2, 's+'); panel(10, SB, 5, -Math.PI / 2, 0, 's+');
  S.fallbackTex = fallback;

  /* rete, montanti, antenne */
  const netTex = s3Tex(256, 32, (c, w, h) => { c.clearRect(0, 0, w, h); c.strokeStyle = 'rgba(235,240,250,.75)'; c.lineWidth = 1; for (let x = 0; x <= w; x += 8) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, h); c.stroke(); } for (let y = 0; y <= h; y += 8) { c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke(); } });
  const net = new THREE.Mesh(new THREE.PlaneGeometry(10, 1), new THREE.MeshBasicMaterial({ map: netTex, transparent: true, side: THREE.DoubleSide, depthWrite: false }));
  net.position.set(0, 1.74, 0); scene.add(net);
  const tape = new THREE.Mesh(new THREE.BoxGeometry(10, .075, .03), new THREE.MeshLambertMaterial({ color: 0xf5f7fb })); tape.position.set(0, 2.22, 0); scene.add(tape);
  const post = new THREE.MeshLambertMaterial({ color: 0x2a3347 });
  for (const x of [-5, 5]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(.055, .055, 2.55, 10), post); p.position.set(x, 1.275, 0); scene.add(p); }
  const antTex = s3Tex(8, 64, (c, w, h) => { for (let i = 0; i < 8; i++) { c.fillStyle = i % 2 ? '#f5f7fb' : '#e03a3a'; c.fillRect(0, i * 8, w, 8); } });
  for (const x of [-4.5, 4.5]) { const a = new THREE.Mesh(new THREE.CylinderGeometry(.02, .02, 1.8, 6), new THREE.MeshBasicMaterial({ map: antTex })); a.position.set(x, 2.24 + .4, 0); scene.add(a); }

  /* arbitro con sgabello */
  const ref = S.ref = new THREE.Group();
  const stool = new THREE.MeshLambertMaterial({ color: 0x3a4560 });
  for (const dz of [-.35, .35]) for (const dx of [-.25, .25]) { const l = new THREE.Mesh(new THREE.CylinderGeometry(.03, .03, 1.8, 6), stool); l.position.set(dx, .9, dz); ref.add(l); }
  const seatB = new THREE.Mesh(new THREE.BoxGeometry(.7, .08, .8), new THREE.MeshLambertMaterial({ color: 0x26304a })); seatB.position.y = 1.85; ref.add(seatB);
  const torso = new THREE.Mesh(new THREE.CylinderGeometry(.2, .22, .6, 8), new THREE.MeshLambertMaterial({ color: 0xf2f4f8 })); torso.position.y = 2.2; ref.add(torso);
  const head = new THREE.Mesh(new THREE.SphereGeometry(.12, 10, 8), new THREE.MeshLambertMaterial({ color: 0xe0b08a })); head.position.y = 2.65; ref.add(head);
  scene.add(ref);

  /* palla */
  const ballTex = s3Tex(256, 128, (c, w, h) => {
    c.fillStyle = '#fdfdfb'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#2257d6'; for (let i = 0; i < 4; i++) { c.fillRect(i * 64, h * .1, 22, h * .8); }
    c.fillStyle = '#f7c62d'; for (let i = 0; i < 4; i++) { c.fillRect(i * 64 + 26, h * .1, 22, h * .8); }
  });
  S.ball = new THREE.Mesh(new THREE.SphereGeometry(.15, 16, 12), new THREE.MeshLambertMaterial({ map: ballTex })); scene.add(S.ball);
  const shTex = s3Tex(64, 64, (c, w, h) => { const g = c.createRadialGradient(w / 2, h / 2, 2, w / 2, h / 2, w / 2); g.addColorStop(0, 'rgba(4,6,14,.62)'); g.addColorStop(.55, 'rgba(4,6,14,.32)'); g.addColorStop(1, 'rgba(4,6,14,0)'); c.fillStyle = g; c.fillRect(0, 0, w, h); });
  const shadowMat = new THREE.MeshBasicMaterial({ map: shTex, transparent: true, depthWrite: false });
  S.ballShadow = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), shadowMat); S.ballShadow.rotation.x = -Math.PI / 2; S.ballShadow.position.y = .012; scene.add(S.ballShadow);
  S.shadowMat = shadowMat;
}

/* ---------- atlete ---------- */
/* stili di capelli: coda (tail) e crocchia (bun) come [x, y, z, sx, sy, sz] rispetto alla testa; cap = calotta piu' o meno grande */
const S3_HAIR = [
  { cap: [.118, .115, .125], tail: [0, -.035, -.15, .04, .05, .14] },                       // coda bassa
  { cap: [.115, .11, .12], tail: null, bun: [0, .115, -.075, .06, .06, .06] },               // crocchia
  { cap: [.125, .12, .13], tail: null },                                                       // caschetto corto
  { cap: [.118, .115, .125], tail: [0, -.17, -.085, .085, .21, .05] },                        // lunghi sciolti
  { cap: [.118, .115, .125], tail: [0, .03, -.14, .05, .09, .12] },                           // coda alta
  { cap: [.118, .115, .125], tail: [0, -.05, -.14, .05, .06, .16] }                           // coda lunga
];
function s3Rig(M, e) {
  const S = M.s3, lib = !!e.lib, no = playerNo(M, e.p), key = e.p.id + (lib ? 'L' : '') + no;
  let rig = S.rigs.get(e.p.id);
  if (rig && rig.key === key) return rig;
  if (rig) { S.scene.remove(rig.g); S.scene.remove(rig.shadow); }
  const K = lib ? { main: M.kits.lib, num: M.kits.libNum, shorts: Gx.dark(M.kits.lib, .5), trim: Gx.lum(M.kits.lib) > .5 ? '#1b2234' : '#fff' } : M.kits[e.side];
  const look = e.p._look || (e.p._look = avatarLook(e.p));
  const mat = c => new THREE.MeshLambertMaterial({ color: c });
  const cyl = new THREE.CylinderGeometry(1, 1, 1, 8), sph = new THREE.SphereGeometry(1, 10, 8), box = new THREE.BoxGeometry(1, 1, 1);
  const tor = new THREE.CylinderGeometry(1, .78, 1, 12);   /* busto: spalle piu' larghe della vita */
  const g = new THREE.Group(), parts = {};
  const mk = (name, geo, m) => { const o = new THREE.Mesh(geo, m); g.add(o); parts[name] = o; return o; };
  const skin = mat(look.skin), jersey = mat(K.main), shorts = mat(K.shorts), hair = mat(look.hair), shoe = mat('#f4f6fa'), sock = mat(K.trim), trim = mat(K.trim), pad = mat('#1e2433'), eye = mat('#16161c');
  for (const s of ['L', 'R']) {
    mk('thigh' + s, cyl, skin); mk('shin' + s, cyl, skin); mk('sock' + s, cyl, sock); mk('knee' + s, sph, pad); mk('shoe' + s, box, shoe);
    mk('uarm' + s, cyl, skin); mk('farm' + s, cyl, skin); mk('elb' + s, sph, skin); mk('hand' + s, sph, skin); mk('sho' + s, sph, jersey);
    mk('str' + s, cyl, trim); mk('eye' + s, sph, eye);
  }
  mk('shorts', cyl, shorts); mk('torso', tor, jersey); mk('hem', cyl, trim); mk('collar', sph, trim);
  mk('head', sph, skin); mk('hair', sph, hair); mk('tail', sph, hair); mk('bun', sph, hair); mk('nose', sph, mat(Gx.dark(look.skin, .12)));
  /* schiena: cognome sopra il numero; petto: numero piccolo */
  const sur = String(e.p.name || '').trim().split(/\s+/).slice(-1)[0].toUpperCase();
  const backTex = s3Tex(128, 128, (c, w, h) => {
    c.fillStyle = K.num || '#fff'; c.textAlign = 'center'; c.textBaseline = 'middle';
    let fs = 24; c.font = `700 ${fs}px "Barlow Condensed",Arial Narrow,Arial`; while (c.measureText(sur).width > w - 6 && fs > 10) { fs--; c.font = `700 ${fs}px "Barlow Condensed",Arial Narrow,Arial`; }
    c.fillText(sur, w / 2, 20);
    c.font = '700 84px "Barlow Condensed",Arial Narrow,Arial'; c.fillText(String(no || ''), w / 2, 78);
  });
  const numM = new THREE.Mesh(new THREE.PlaneGeometry(.31, .31), new THREE.MeshBasicMaterial({ map: backTex, transparent: true })); g.add(numM); parts.num = numM;
  const frontTex = s3Tex(64, 64, (c, w, h) => { c.fillStyle = K.num || '#fff'; c.font = '700 46px "Barlow Condensed",Arial'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(String(no || ''), w / 2, h / 2 + 2); });
  const numF = new THREE.Mesh(new THREE.PlaneGeometry(.12, .12), new THREE.MeshBasicMaterial({ map: frontTex, transparent: true })); g.add(numF); parts.numF = numF;
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), S.shadowMat); shadow.rotation.x = -Math.PI / 2; shadow.position.y = .012;
  S.scene.add(g); S.scene.add(shadow);
  rig = { key, g, parts, shadow, hair: S3_HAIR[(look.style || 0) % S3_HAIR.length], ph: (Gx.hash(String(e.p.id)) % 628) / 100 };
  S.rigs.set(e.p.id, rig); return rig;
}

function s3Pose(rig, P, name, face, time) {
  const p = rig.parts, V = THREE.Vector3, v = (x, y, z) => new V(x, y, z);
  const cr = P.cr, ln = P.ln, lf = P.lf;
  const idle = !name, sw = idle ? Math.sin(time * 1.7 + rig.ph) : 0, ox = sw * .02;
  const hipH = .90 - cr * .30, hipY = lf + hipH, lean = ln * .9, tl = .52 * (1 - .2 * ln);
  const hipC = v(ox * .5, hipY, 0), shC = v(ox, hipY + tl * Math.cos(lean), tl * Math.sin(lean));
  /* gambe: coscia, stinco, calzettone, ginocchiera, scarpa */
  for (const [s, sx] of [['L', -1], ['R', 1]]) {
    const hp = v(sx * .09 + ox * .5, hipY, 0), ft = v(sx * (.11 + cr * .07), lf + .06, sx < 0 ? cr * .10 : -cr * .05);
    const mid = hp.clone().add(ft).multiplyScalar(.5), dist = hp.distanceTo(ft), d = Math.sqrt(Math.max(0, .46 * .46 - (dist / 2) * (dist / 2)));
    const kn = mid.clone().add(v(sx * .02, 0, d * .9));
    s3Seg(p['thigh' + s], hp, kn, .068); s3Seg(p['shin' + s], kn, ft, .052);
    s3Seg(p['sock' + s], ft.clone().add(v(0, .015, 0)), ft.clone().lerp(kn, .38), .058);
    p['knee' + s].position.copy(kn); p['knee' + s].scale.set(.066, .066, .06);
    p['shoe' + s].position.set(ft.x, lf + .035, ft.z + .05); p['shoe' + s].scale.set(.105, .07, .27);
  }
  p.shorts.position.set(hipC.x, hipY, 0); p.shorts.scale.set(.195, .22, .15);
  /* busto rastremato + bordo maglia, collo e strisce laterali */
  const tb = hipC.clone().add(v(0, .09, 0));
  s3Seg(p.torso, tb, shC, .185); p.torso.scale.x = .185; p.torso.scale.z = .125; p.torso.scale.y = tb.distanceTo(shC);
  p.hem.position.copy(tb).add(v(0, .012, 0)); p.hem.scale.set(.15, .02, .102);
  p.collar.position.copy(shC).add(v(0, .015, 0)); p.collar.scale.set(.085, .03, .07);
  for (const [s, sx] of [['L', -1], ['R', 1]]) s3Seg(p['str' + s], tb.clone().add(v(sx * .147, .03, 0)), shC.clone().add(v(sx * .185, -.045, 0)), .011);
  /* testa con occhi, naso e capelli (stile in base all'atleta) */
  const hd = shC.clone().add(v(0, .25, Math.sin(lean * .7) * .05)), H = rig.hair;
  p.head.position.copy(hd); p.head.scale.set(.105, .125, .11);
  p.hair.position.copy(hd).add(v(0, .028, -.022)); p.hair.scale.set(H.cap[0], H.cap[1], H.cap[2]);
  if (H.tail) { p.tail.position.copy(hd).add(v(H.tail[0], H.tail[1], H.tail[2])); p.tail.scale.set(H.tail[3], H.tail[4], H.tail[5]); } else p.tail.scale.setScalar(.0001);
  if (H.bun) { p.bun.position.copy(hd).add(v(H.bun[0], H.bun[1], H.bun[2])); p.bun.scale.set(H.bun[3], H.bun[4], H.bun[5]); } else p.bun.scale.setScalar(.0001);
  for (const [s, sx] of [['L', -1], ['R', 1]]) { p['eye' + s].position.copy(hd).add(v(sx * .04, .012, .097)); p['eye' + s].scale.set(.013, .016, .01); }
  p.nose.position.copy(hd).add(v(0, -.015, .108)); p.nose.scale.setScalar(.015);
  p.num.position.copy(shC).lerp(hipC, .38).add(v(0, 0, -.13)); p.num.rotation.set(0, Math.PI, 0);
  p.numF.position.copy(shC).lerp(hipC, .3).add(v(.07, 0, .128)); p.numF.rotation.set(0, 0, 0);
  /* braccia: L = prima, R = seconda; R e' la destra dell'atleta */
  for (const [s, sx, A] of [['L', 1, P.L], ['R', -1, P.R]]) {
    const sh = shC.clone().add(v(sx * .21, -.04, 0)), a = A[0] + (idle ? sw * .05 : 0), b = A[1];
    const fw = (S3_FORWARD.has(name)) ? 1 : (a < .9 ? .5 : 0);
    const dirF = v(sx * Math.sin(a), -Math.cos(a), 0);
    const af = (S3_FORWARD.has(name) ? .8 : .45) + a * .55;
    const dirW = v(sx * .1, -Math.cos(af), Math.sin(af));
    const dir = dirF.clone().lerp(dirW, fw).normalize();
    const el = sh.clone().addScaledVector(dir, .3);
    let bend;
    if (b < 0) bend = v(0, 0, 1); else if (a > 1.5) bend = v(0, 0, -1); else bend = v(-sx, 0, 0);
    const fdir = dir.clone().multiplyScalar(Math.cos(b)).addScaledVector(bend, Math.sin(Math.abs(b))).normalize();
    const wr = el.clone().addScaledVector(fdir, .27);
    s3Seg(p['uarm' + s], sh, el, .047); s3Seg(p['farm' + s], el, wr, .04);
    p['sho' + s].position.copy(sh); p['sho' + s].scale.set(.078, .072, .072);
    p['elb' + s].position.copy(el); p['elb' + s].scale.setScalar(.046);
    p['hand' + s].position.copy(wr); p['hand' + s].scale.setScalar(.052);
  }
  rig.g.rotation.y = face;
}

/* ---------- ciclo di disegno ---------- */
function s3Frame(M, ents, dt) {
  const S = M.s3, scene = S.scene, cam = S.camera, a = M.anim, t = a ? a.t : 0, time = M.t;
  const seen = new Set();
  for (const e of ents) {
    if (e.kind === 'b') {
      S.ball.visible = true; S.ball.position.set(e.v, Math.max(.16, e.z), e.u); S.ball.rotation.x = (time * 6) % 6.283;
      const sh = Math.max(.35, 1 - e.z * .1); S.ballShadow.position.x = e.v + .12 * (1 + e.z * .3); S.ballShadow.position.z = e.u - .07 * (1 + e.z * .3); S.ballShadow.scale.set(.32 * sh, .32 * sh, .32 * sh); continue;
    }
    seen.add(e.p.id);
    const rig = s3Rig(M, e), face = e.side === M.userSide ? Math.PI : 0;
    const breath = e.pose === POSE.ready ? Math.sin(time * 3 + e.u * 2 + e.v) * .012 : 0;
    const P = breath ? { ...e.pose, cr: e.pose.cr + breath } : e.pose;
    rig.g.position.set(e.v, 0, e.u);
    s3Pose(rig, P, e.name, face, time);
    const sh = Math.max(.35, 1 - P.lf * .45); rig.shadow.position.set(e.v + .14 * (1 + P.lf), .012, e.u - .08 * (1 + P.lf)); rig.shadow.scale.set(.5 * sh, .5 * sh, .5 * sh);
  }
  if (!ents.some(e => e.kind === 'b')) { S.ball.visible = false; S.ballShadow.scale.set(.001, .001, .001); }
  for (const [id, rig] of S.rigs) if (!seen.has(id)) { scene.remove(rig.g); scene.remove(rig.shadow); S.rigs.delete(id); }

  /* pubblico */
  const cr = S.crowd, ex = M.excite || 0, ia = cr.bodies.instanceMatrix.array, ha = cr.heads.instanceMatrix.array, lw = M.lastWin;
  for (let i = 0; i < cr.N; i++) {
    const tm = cr.team[i], win = (tm === 1 && lw === 'h') || (tm === 2 && lw === 'a');
    const y = cr.base[i] + ex * (win ? .22 : .02) + Math.max(0, Math.sin(time * (win ? 4 : 2.4) + cr.ph[i])) * (.012 + ex * (win ? .12 : .03));
    ia[i * 16 + 13] = y; ha[i * 16 + 13] = y + .43;
  }
  if (cr.NF) {
    const q = S.q || (S.q = new THREE.Quaternion()), eu = S.eu || (S.eu = new THREE.Euler()), ps = S.ps || (S.ps = new THREE.Vector3()), sc = S.sc || (S.sc = new THREE.Vector3(1, 1, 1)), mx = S.mx || (S.mx = new THREE.Matrix4());
    for (let k = 0; k < cr.NF; k++) {
      const f = cr.flagSpots[k], win = (f.tm === 1 && lw === 'h') || (f.tm === 2 && lw === 'a'), w = Math.sin(time * (win ? 6 : 2.6) + f.ph), lift = ex * (win ? .26 : .03);
      eu.set(0, w * (win ? .9 : .35), w * .12); q.setFromEuler(eu); ps.set(f.x + .22, f.y + .6 + lift + Math.max(0, w) * .05 * ex, f.z);
      mx.compose(ps, q, sc); cr.flags.setMatrixAt(k, mx);
    }
    cr.flags.instanceMatrix.needsUpdate = true;
  }
  cr.bodies.instanceMatrix.needsUpdate = true; cr.heads.instanceMatrix.needsUpdate = true;

  /* cartelloni LED con i video della Lega */
  if (typeof LED !== 'undefined' && LED.vids.length) {
    for (const k of [0, 1, 2]) { const v = LED.vids[LED.slots[k]]; if (v && v.paused && !v._bad && typeof ledPlay === 'function') ledPlay(v); }
    for (const pn of S.panels) {
      const v = typeof ledSlot === 'function' ? ledSlot(pn.slot) : null;
      if (v) {
        let tx = S.vtex.get(v); if (!tx) { tx = new THREE.VideoTexture(v); tx.minFilter = THREE.LinearFilter; S.vtex.set(v, tx); }
        tx.needsUpdate = true; if (pn.mat.map !== tx) { pn.mat.map = tx; pn.mat.needsUpdate = true; }
      } else if (pn.mat.map !== S.fallbackTex) { pn.mat.map = S.fallbackTex; pn.mat.needsUpdate = true; }
    }
  }

  { const vw = UI.camView || 'side'; for (const k in S.boards) { const hide = vw === 'side' ? (k === 's+') : (k[0] === 'e' && k[1] === '+'); for (const m of S.boards[k]) m.visible = !hide; } }
  s3Camera(M, ents, dt);
  S.ref.position.set(Cam.side || UI.camView === 'side' ? -6.1 : 6.1, 0, 0);
  S.ref.rotation.y = (UI.camView === 'side') ? Math.PI / 2 : -Math.PI / 2;
  S.renderer.render(scene, cam);
  s3Overlay(M, ents);
}

function s3Camera(M, ents, dt) {
  const S = M.s3, cam = S.camera, a = M.anim, t = a ? a.t : 0, view = UI.camView || 'side', V = THREE.Vector3;
  cam.fov = view === 'side' ? 34 : 36;
  const tf = Math.tan(cam.fov * Math.PI / 360);
  let look, pos;
  if (view === 'side') { const D = Math.max(25, 12.5 / (tf * S.aspect)); look = new V(0, 1, 0); pos = new V(D, 8 + (D - 25) * .22, 0); }
  else if (view === 'reg') { look = new V(0, 1, -1); pos = new V(0, 12.5, 30); }
  else { look = new V(0, 0, 0); pos = new V(0, 21, 33); }
  const dir = pos.clone().sub(look);
  const ball = a ? sampleBall(a.script.ball, t) : null, shot = camShot(M);
  let tg = look.clone(), zf = 1;
  if (ball) { if (view === 'side') tg.z += ball.u * .35; else { tg.x += ball.v * .22; tg.z += ball.u * .2; } }
  const clampZ = z => (view === 'side' ? Math.max(-4, Math.min(4, z)) : z);
  if (shot.cam === 'serve' && a && a.script.srvU !== undefined) { tg.set(a.script.srvV, 1.2, a.script.srvU); tg.lerp(look, .25); zf = .8; }
  else if (shot.cam === 'zoom' && a) { tg.set(shot.v, 1.6, shot.u); if (ball) tg.lerp(new V(ball.v, ball.z, ball.u), .45); zf = .6; }
  else if (shot.cam === 'react') { let sx = 0, sz = 0, n = 0; for (const e of ents) if (e.kind === 'p' && e.side === shot.side) { sx += e.v; sz += e.u; n++; } if (n) { tg.set(sx / n, 1.2, sz / n); zf = .76; } }
  tg.z = clampZ(tg.z);
  zf *= 1 - .06 * Math.min(1, M.zoom || 0);
  if (!S.cur) S.cur = { look: tg.clone(), zf, id: null, fast: 0 };
  const c = S.cur, id = shot.cam + (shot.t || 0);
  if (c.id !== id) { c.id = id; c.fast = .4; }
  c.fast = Math.max(0, c.fast - dt);
  const f = 1 - Math.exp(-dt * (c.fast > 0 ? 11 : 4.2));
  c.look.lerp(tg, f); c.zf += (zf - c.zf) * f;
  cam.position.copy(c.look).addScaledVector(dir, c.zf);
  if (M.shake > .2) cam.position.add(new V((Math.random() - .5), (Math.random() - .5), (Math.random() - .5)).multiplyScalar(M.shake * .02));
  cam.updateProjectionMatrix(); cam.lookAt(c.look); cam.updateMatrixWorld();
}

/* proiezione per i livelli 2D: stessa firma di proj(u, v, zh) */
function s3Project(u, v, zh) {
  const S = UI.match.s3, cam = S.camera, w = new THREE.Vector3(v, zh || 0, u), d = cam.position.distanceTo(w);
  const p = w.clone().project(cam);
  return { x: (p.x + 1) / 2 * Cam.W, y: (1 - p.y) / 2 * Cam.H, s: (Cam.H / 2) / (Math.tan(cam.fov * Math.PI / 360) * d) };
}
function s3Overlay(M, ents) {
  const cv = $("#cv"), c = cv.getContext('2d'), k = M.k;
  c.setTransform(k, 0, 0, k, 0, 0); c.clearRect(0, 0, Cam.W, Cam.H);
  Cam.p3 = s3Project;
  try {
    drawEffects(c, M);
    const a = M.anim, labels = [];
    if (a && !M.paused) for (const e of ents) {
      if (e.kind !== 'p' || !ACTIVE_POSES.has(e.name)) continue;
      const hp = s3Project(e.u, e.v, 1.95 + e.pose.lf);
      labels.push({ x: hp.x, y: hp.y - hp.s * .12, s: hp.s, p: e.p, side: e.side, lf: e.pose.lf });
    }
    for (const l of labels.slice(0, 3)) drawNameTag(c, l, M);
  } finally { Cam.p3 = null; }
}

/* interruttore 2D / 3D */
document.addEventListener('click', e => {
  const el = e.target.closest('[data-act="mode3d"]'), M = UI.match; if (!el || !M) return;
  UI.mode3d = UI.mode3d === false; try { localStorage.setItem('vm-mode3d', UI.mode3d ? '1' : '0'); } catch (x) { }
  el.textContent = UI.mode3d ? '2D' : '3D'; el.setAttribute('aria-pressed', String(UI.mode3d));
  if (UI.mode3d) s3Setup(M); else if (M.s3) M.s3.cv.style.display = 'none';
  const c = $("#cv"); if (c) c.getContext('2d').clearRect(0, 0, c.width, c.height);
});
try { if (typeof UI !== 'undefined' && UI.mode3d === undefined) UI.mode3d = localStorage.getItem('vm-mode3d') !== '0'; } catch (x) { }
