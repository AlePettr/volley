/* ===== Partita in 3D (Three.js r128) =====
   Legge le stesse entita' del motore 2D (atlete con u,v e posa, palla u,v,z) e le disegna in una scena 3D.
   Mappa mondo: X = v (destra/sinistra del campo), Y = altezza, Z = u (distanza dalla rete, positivo verso la camera da fondo).
   Il canvas 2D #cv resta sopra, trasparente, per cartellini nome ed effetti: Cam.p3 fa si' che proj() usi la camera 3D. */
const S3_BUILD = 's';
function s3Available() { return typeof THREE !== 'undefined'; }
function s3Active(M) { return !!(M && M.s3 && UI.mode3d !== false); }

const S3_FORWARD = new Set(['bump', 'receive', 'dig', 'dive', 'shake']);
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

/* solido di rotazione da profilo [[t(0..1 lungo l'asse), raggio]]: t=0 e' il primo punto del segmento, y da -.5 a +.5 */
function s3Lathe(prof, seg) {
  const pts = [new THREE.Vector2(.0005, -.5)]; for (const [t, r] of prof) pts.push(new THREE.Vector2(r, t - .5)); pts.push(new THREE.Vector2(.0005, .5));
  return new THREE.LatheGeometry(pts, seg || 14);
}
let S3_G = null;
function s3Geos() {
  if (S3_G) return S3_G;
  return S3_G = {
    thigh: s3Lathe([[.02, .55], [.08, .9], [.3, 1.0], [.6, .86], [.92, .68], [.99, .52]]),
    shin: s3Lathe([[.02, .5], [.06, .72], [.3, 1.0], [.55, .82], [.9, .56], [.99, .46]]),
    uarm: s3Lathe([[.02, .6], [.08, .92], [.35, 1.0], [.8, .84], [.99, .62]]),
    farm: s3Lathe([[.02, .66], [.1, .95], [.4, 1.0], [.85, .66], [.99, .54]]),
    sock: s3Lathe([[0, .9], [.5, .86], [1, 1.0]]),
    cuff: s3Lathe([[0, 1.0], [.9, .92], [1, .9]], 12),
    hand: s3Lathe([[.02, .7], [.15, 1.0], [.5, 1.0], [.85, .7], [.99, .35]], 10),
    neck: s3Lathe([[0, 1], [1, .9]], 10),
    /* busto: spalle larghe, petto pieno, vita stretta */
    torso: s3Lathe([[.02, .62], [.1, .72], [.3, .8], [.55, .93], [.78, 1.0], [.93, .96], [.99, .72]], 18),
    hips: s3Lathe([[.02, .8], [.2, 1.0], [.6, .98], [.98, .84]], 16),
    head: s3Lathe([[.0, .07], [.08, .46], [.25, .8], [.5, .98], [.75, 1.0], [.92, .8], [.99, .3]], 16),
    /* scarpa: sfera con suola piatta, tallone stretto e punta tonda */
    shoe: (() => { const g = new THREE.SphereGeometry(1, 16, 12), pa = g.attributes.position; for (let i = 0; i < pa.count; i++) { let x = pa.getX(i), y = pa.getY(i), z = pa.getZ(i); if (y < 0) y *= .22; x *= z < 0 ? .78 + .22 * (1 + z) : 1 - .3 * z * z; pa.setXYZ(i, x, y, z); } g.computeVertexNormals(); return g; })()
  };
}

/* ---------- inizializzazione (una volta per partita) ---------- */
function s3Setup(M) {
  const ar = $("#arena"); if (!ar) return;
  if (!s3Available() || UI.mode3d === false) { if (M.s3) M.s3.cv.style.display = 'none'; return; }
  if (!M.s3) {
    try {
      let cv = $("#cv3");
      if (!cv) { cv = document.createElement('canvas'); cv.id = 'cv3'; cv.className = 'cv3'; ar.insertBefore(cv, ar.firstChild); }
      /* Three r158: stessa resa di r128 (colori e luci "legacy"); si puo' passare al nuovo modello in un secondo momento */
      if (THREE.ColorManagement) THREE.ColorManagement.enabled = false;
      const renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true, powerPreference: 'high-performance' });
      if ('outputColorSpace' in renderer) renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
      if ('useLegacyLights' in renderer) renderer.useLegacyLights = true;
      renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      M.s3 = { cv, renderer, rigs: new Map(), crowd: null, last: 0 };
      if (typeof skLoad === 'function') skLoad();
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
  scene.add(new THREE.AmbientLight(0xffffff, .6));
  scene.add(new THREE.HemisphereLight(0xdfeaff, 0x2a2540, .42));
  const sun = new THREE.DirectionalLight(0xffffff, .42); sun.position.set(-6, 22, 10); scene.add(sun);
  /* ombre reali: il sole proietta giocatrici, rete, pali e palla sul campo (piano che riceve solo l'ombra) */
  sun.castShadow = true; { const q = Math.min(innerWidth, innerHeight) < 600 ? 1024 : 2048; sun.shadow.mapSize.set(q, q); } sun.shadow.bias = -.0004; sun.shadow.normalBias = .03; sun.shadow.radius = 3;
  Object.assign(sun.shadow.camera, { left: -13, right: 13, top: 13, bottom: -13, near: 8, far: 50 }); sun.shadow.camera.updateProjectionMatrix();
  const isA1 = ((M.home && M.home.lid) || (typeof G !== 'undefined' && G && G.lid) || 'A1') !== 'A2';

  /* pavimento: zona libera viola + campo in parquet (texture disegnata una volta) */
  const FW = 17.2, FL = 24, TW = 1536, TL = 2048;
  const floorTex = s3Tex(TW, TL, (c, w, h) => {
    const X = v => (v + FW / 2) * w / FW, Y = u => (u + FL / 2) * h / FL;
    const g = c.createLinearGradient(0, 0, 0, h);
    if (isA1) { g.addColorStop(0, '#cdae80'); g.addColorStop(1, '#dcc093'); } else { g.addColorStop(0, '#4a2f86'); g.addColorStop(1, '#6f52b8'); }
    c.fillStyle = g; c.fillRect(0, 0, w, h);
    /* taraflex A1: il viola e' esterno al campo, una cornice attorno alle linee */
    if (isA1) { c.fillStyle = '#8f2c93'; c.fillRect(X(-7.3), Y(-11.8), X(7.3) - X(-7.3), Y(11.8) - Y(-11.8)); }
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
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(FW, FL), new THREE.MeshBasicMaterial({ map: floorTex, color: 0xd4d4d4 }));
  floor.rotation.x = -Math.PI / 2; floor.position.y = .0; scene.add(floor);
  const shadowPlane = new THREE.Mesh(new THREE.PlaneGeometry(FW, FL), new THREE.ShadowMaterial({ opacity: .34 }));
  shadowPlane.rotation.x = -Math.PI / 2; shadowPlane.position.y = .004; shadowPlane.receiveShadow = true; scene.add(shadowPlane);
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
  const poolTex = s3Tex(256, 256, (c, w, h) => { const g = c.createRadialGradient(w / 2, h / 2, 4, w / 2, h / 2, w / 2); g.addColorStop(0, 'rgba(255,246,226,.20)'); g.addColorStop(.6, 'rgba(255,246,226,.07)'); g.addColorStop(1, 'rgba(255,246,226,0)'); c.fillStyle = g; c.fillRect(0, 0, w, h); });
  const pool = new THREE.Mesh(new THREE.PlaneGeometry(26, 34), new THREE.MeshBasicMaterial({ map: poolTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  pool.rotation.x = -Math.PI / 2; pool.position.y = .006; scene.add(pool);
  const beamMat = new THREE.MeshBasicMaterial({ color: 0xcfdcff, transparent: true, opacity: .025, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
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
  const EB = 12.0, SB = 9.8;   /* fondi a 11.2 m dalla rete (v da -8.8 a 8.8); lati lunghi a 9.8 m dall'asse, u da -10 a 10: non toccano i fondi */
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
  for (const x of [-5, 5]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(.055, .055, 2.55, 10), post); p.position.set(x, 1.275, 0); p.castShadow = true; scene.add(p); }
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

  /* panchine, tavolo del segnapunti, raccattapalle, segnalinee e tabellone sospeso */
  S.extras = [];
  const mats = {}, lam = c => mats[c] || (mats[c] = new THREE.MeshLambertMaterial({ color: c }));
  const skinC = ['#e0b08a', '#c68a62', '#8d5a3a', '#f0c9a6'];
  const person = (x, z, ry, shirt, shorts, sit, tm, ph) => {
    const g = new THREE.Group(), k = skinC[Math.floor(R() * skinC.length)], H = sit ? 0 : .45;
    const torso = new THREE.Mesh(new THREE.CylinderGeometry(.17, .15, .52, 8), lam(shirt)); torso.position.y = .72 + H + (sit ? 0 : .25); g.add(torso);
    const head = new THREE.Mesh(new THREE.SphereGeometry(.105, 8, 6), lam(k)); head.position.y = 1.15 + H + (sit ? 0 : .25); g.add(head);
    const hair = new THREE.Mesh(new THREE.SphereGeometry(.108, 8, 6, 0, 6.3, 0, 1.6), lam(['#1c1410', '#3a2a1c', '#6b4a2a', '#caa05a'][Math.floor(R() * 4)])); hair.position.y = 1.17 + H + (sit ? 0 : .25); g.add(hair);
    if (sit) { for (const dx of [-.08, .08]) { const th = new THREE.Mesh(new THREE.BoxGeometry(.1, .1, .42), lam(shorts)); th.position.set(dx, .48, .2); g.add(th); const sh = new THREE.Mesh(new THREE.CylinderGeometry(.05, .045, .45, 6), lam(k)); sh.position.set(dx, .24, .4); g.add(sh); } }
    else { for (const dx of [-.07, .07]) { const lg = new THREE.Mesh(new THREE.CylinderGeometry(.06, .05, .95, 6), lam(shorts)); lg.position.set(dx, .48, 0); g.add(lg); } }
    g.position.set(x, 0, z); g.rotation.y = ry; scene.add(g); S.extras.push({ g, tm, ph, y0: 0 }); return g;
  };
  const BX = -7.7, benchMat = lam(0x2a3347);
  for (const [tm, sgn] of [[1, hs], [2, -hs]]) {
    const kit = tm === 1 ? kh : ka, zc = sgn * 5.6;
    const bench = new THREE.Mesh(new THREE.BoxGeometry(.5, .45, 4.2), benchMat); bench.position.set(BX, .22, zc); scene.add(bench);
    const back = new THREE.Mesh(new THREE.BoxGeometry(.06, .5, 4.2), lam(kit.main)); back.position.set(BX - .3, .7, zc); scene.add(back);
    for (let i = 0; i < 6; i++) person(BX, zc - 1.7 + i * .68, Math.PI / 2, i < 5 ? kit.main : '#16213a', i < 5 ? kit.shorts : '#16213a', true, tm, i * 1.3);
    person(BX + .9, zc + (sgn > 0 ? -2.6 : 2.6), sgn > 0 ? Math.PI * .85 : Math.PI * .15, '#1c2538', '#1c2538', false, tm, 0);   /* allenatore in piedi */
  }
  { /* tavolo del segnapunti dietro l'arbitro */
    const tb = new THREE.Mesh(new THREE.BoxGeometry(.8, .75, 4.2), lam(0x39425a)); tb.position.set(BX - .9, .38, 0); scene.add(tb);
    const top = new THREE.Mesh(new THREE.BoxGeometry(.9, .05, 4.3), lam(0xe9edf5)); top.position.set(BX - .9, .77, 0); scene.add(top);
    for (let i = 0; i < 3; i++) person(BX - 1.55, -1.2 + i * 1.2, Math.PI / 2, '#233a63', '#1c2538', true, 0, 0);
  }
  /* raccattapalle ai quattro angoli e segnalinee con bandierina */
  for (const [x, z] of [[-8, -10.4], [8, -10.4], [-8, 10.4], [8, 10.4]]) person(x, z, Math.atan2(-x, -z), '#f2f4f8', '#243153', true, 0, 0).scale.setScalar(.8);
  for (const [x, z] of [[-6.4, -10.3], [6.4, 10.3]]) { const g = person(x, z, Math.atan2(-x, -z), '#f2f4f8', '#141b2d', false, 0, 0); const fl = new THREE.Mesh(new THREE.PlaneGeometry(.28, .22), new THREE.MeshBasicMaterial({ color: 0xf2c230, side: THREE.DoubleSide })); fl.position.set(.3, 1.45, .1); g.add(fl); }
  /* tabellone sospeso sopra il campo (4 facce) */
  { const bt = S.sbTex = s3Tex(512, 192, () => { }), bm = new THREE.MeshBasicMaterial({ map: bt });
    const body = new THREE.Mesh(new THREE.BoxGeometry(5.4, 2.1, 5.4), lam(0x0a0f1c)); body.position.set(0, 16.2, 0); scene.add(body);
    for (const [px, pz, ry] of [[2.71, 0, Math.PI / 2], [-2.71, 0, -Math.PI / 2], [0, 2.71, 0], [0, -2.71, Math.PI]]) { const f = new THREE.Mesh(new THREE.PlaneGeometry(5.2, 1.95), bm); f.position.set(px, 16.2, pz); f.rotation.y = ry; scene.add(f); }
    for (const [cx, cz] of [[-2.4, -2.4], [2.4, -2.4], [-2.4, 2.4], [2.4, 2.4]]) { const cb = new THREE.Mesh(new THREE.CylinderGeometry(.03, .03, 7, 4), lam(0x303a52)); cb.position.set(cx, 20.4, cz); scene.add(cb); }
    S.sbKey = ''; }

  /* palla */
  /* pallone ufficiale Molten V5M5000: tre spicchi a spirale bianco / verde / rosso */
  const ballTex = s3Tex(512, 256, (c, w, h) => {
    const im = c.createImageData(w, h), d = im.data, seg = [[.20, 255, 255, 252], [.30, 22, 150, 112], [.10, 255, 255, 252], [.28, 226, 58, 86], [.12, 255, 255, 252]];
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const v = y / h; let t = (x / w * 3 + .45 * Math.sin(v * Math.PI) * 1.2 + v * .5) % 1; if (t < 0) t += 1;
      let acc = 0, col = seg[0]; for (const s of seg) { acc += s[0]; if (t < acc) { col = s; break; } }
      const hex = ((x * 7 + y * 5) % 9 < 1) ? .93 : 1, i = (y * w + x) * 4; d[i] = col[1] * hex; d[i + 1] = col[2] * hex; d[i + 2] = col[3] * hex; d[i + 3] = 255;
    }
    c.putImageData(im, 0, 0);
  });
  S.ball = new THREE.Mesh(new THREE.SphereGeometry(.15, 16, 12), new THREE.MeshLambertMaterial({ map: ballTex })); S.ball.castShadow = true; scene.add(S.ball);
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
  const cyl = new THREE.CylinderGeometry(1, 1, 1, 8), sph = new THREE.SphereGeometry(1, 14, 10), box = new THREE.BoxGeometry(1, 1, 1);
  const G = s3Geos();
  const g = new THREE.Group(), parts = {};
  const mk = (name, geo, m) => { const o = new THREE.Mesh(geo, m); o.castShadow = true; g.add(o); parts[name] = o; return o; };
  const hh = Gx.hash(String(e.p.id));
  /* maglia con texture: pannelli laterali piu' scuri, scollo a V, pieghe leggere */
  const jTex = s3Tex(256, 256, (c, w, h) => {
    const RR = Gx.rng(hh), sh = Gx.dark(K.main, .22), hi = Gx.light(K.main, .12);
    c.fillStyle = K.main; c.fillRect(0, 0, w, h);
    const gx = c.createLinearGradient(0, 0, w, 0); gx.addColorStop(0, hi); gx.addColorStop(.1, K.main); gx.addColorStop(.2, sh); gx.addColorStop(.3, K.main); gx.addColorStop(.5, K.main); gx.addColorStop(.7, K.main); gx.addColorStop(.8, sh); gx.addColorStop(.9, K.main); gx.addColorStop(1, hi);
    c.globalAlpha = .55; c.fillStyle = gx; c.fillRect(0, 0, w, h); c.globalAlpha = 1;
    const gy = c.createLinearGradient(0, 0, 0, h); gy.addColorStop(0, 'rgba(255,255,255,.16)'); gy.addColorStop(.5, 'rgba(0,0,0,0)'); gy.addColorStop(1, 'rgba(0,0,0,.14)'); c.fillStyle = gy; c.fillRect(0, 0, w, h);
    c.lineWidth = 2; for (let i = 0; i < 16; i++) { const x = RR() * w, y = h * (.35 + RR() * .6), l = 14 + RR() * 22; c.strokeStyle = RR() < .5 ? 'rgba(0,0,0,.09)' : 'rgba(255,255,255,.08)'; c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + 8, y + l * .5, x - 5, y + l); c.stroke(); }
    c.fillStyle = K.trim; c.fillRect(w * .245, 0, w * .012, h); c.fillRect(w * .743, 0, w * .012, h);
    c.fillStyle = look.skin; for (const dx of [0, w]) { c.beginPath(); c.moveTo(dx - w * .055, 0); c.lineTo(dx + w * .055, 0); c.lineTo(dx, h * .15); c.closePath(); c.fill(); }
    c.strokeStyle = K.trim; c.lineWidth = 3; for (const dx of [0, w]) { c.beginPath(); c.moveTo(dx - w * .06, 0); c.lineTo(dx, h * .16); c.lineTo(dx + w * .06, 0); c.stroke(); }
  });
  const skin = mat(look.skin), jersey = mat(K.main), shorts = mat(K.shorts), hair = new THREE.MeshPhongMaterial({ color: look.hair, shininess: 38, specular: 0x333333 }), shoe = mat(['#f4f6fa', '#f4f6fa', '#1d2230', Gx.light(K.main, .72)][hh % 4]), sock = mat(K.trim), trim = mat(K.trim), pad = mat('#1e2433'), eye = mat('#16161c');
  const jerseyT = new THREE.MeshLambertMaterial({ map: jTex });
  for (const s of ['L', 'R']) {
    mk('thigh' + s, G.thigh, skin); mk('shin' + s, G.shin, skin); mk('sock' + s, G.sock, sock); mk('knee' + s, sph, pad); mk('shoe' + s, G.shoe, shoe); mk('sole' + s, box, mat('#eef1f6'));
    mk('uarm' + s, G.uarm, skin); mk('farm' + s, G.farm, skin); mk('elb' + s, sph, skin); mk('hand' + s, G.hand, skin); mk('fing' + s, sph, skin); mk('thumb' + s, sph, skin); mk('wb' + s, cyl, trim); mk('sho' + s, sph, jersey);
    mk('slv' + s, G.cuff, jersey); mk('shl' + s, G.cuff, shorts); mk('ear' + s, sph, skin); mk('brow' + s, box, hair);
    mk('str' + s, cyl, trim); mk('eye' + s, sph, mat('#f3f1ee')); mk('iris' + s, sph, mat(['#2a1a10', '#2a1a10', '#2d4a66', '#3d5a2c'][hh % 4]));
  }
  mk('shorts', G.hips, shorts); mk('torso', G.torso, jerseyT); mk('fringe', sph, hair); mk('hem', cyl, trim); mk('collar', sph, trim); mk('neck', G.neck, skin); mk('mouth', sph, mat('#a8484f'));
  mk('head', G.head, skin); mk('hair', sph, hair); mk('tail', sph, hair); mk('bun', sph, hair); mk('nose', sph, mat(Gx.dark(look.skin, .12)));
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
  rig = { K, look, hh, key, g, parts, shadow, hair: S3_HAIR[(look.style || 0) % S3_HAIR.length], ph: (hh % 628) / 100, band: hh % 3 === 0, fringe: (look.style === 2 || look.style === 3) };
  S.rigs.set(e.p.id, rig); return rig;
}

function s3Pose(rig, P, name, face, time) {
  const p = rig.parts, V = THREE.Vector3, v = (x, y, z) => new V(x, y, z);
  const run0 = ((!name || name === 'shake') && rig.run) || 0;
  const cr = P.cr, ln = P.ln + .1 * run0, lf = P.lf;
  const idle = !name, sw = idle ? Math.sin(time * 1.7 + rig.ph) : 0, ox = sw * .02;
  const hipH = .90 - cr * .30, hipY = lf + hipH, lean = ln * .9, tl = .52 * (1 - .2 * ln);
  const hipC = v(ox * .5, hipY, 0), shC = v(ox, hipY + tl * Math.cos(lean), tl * Math.sin(lean));
  /* gambe: coscia, stinco, calzettone, ginocchiera, scarpa */
  const J = { hipC, shC, hd: null, legs: [], arms: [] };
  for (const [s, sx] of [['L', -1], ['R', 1]]) {
    const run = ((!name || name === 'shake') && rig.run) || 0, ph = (rig.sph || 0) + (sx < 0 ? 0 : Math.PI);
    const hp = v(sx * .09 + ox * .5, hipY, 0), ft = v(sx * (.11 + cr * .07), lf + .06 + Math.max(0, Math.cos(ph)) * .09 * run, (sx < 0 ? cr * .10 : -cr * .05) + Math.sin(ph) * .2 * run);
    const mid = hp.clone().add(ft).multiplyScalar(.5), dist = hp.distanceTo(ft), d = Math.sqrt(Math.max(0, .46 * .46 - (dist / 2) * (dist / 2)));
    const kn = mid.clone().add(v(sx * .02, 0, d * .9));
    J.legs.push({ sx, hp, kn, ft });
    s3Seg(p['thigh' + s], hp, kn, .074); s3Seg(p['shin' + s], kn, ft, .056);
    s3Seg(p['sock' + s], ft.clone().add(v(0, .015, 0)), ft.clone().lerp(kn, .42), .058);
    s3Seg(p['shl' + s], hp.clone().add(v(0, .03, 0)), hp.clone().lerp(kn, .3), .083);
    p['knee' + s].position.copy(kn); p['knee' + s].scale.set(.066, .066, .06);
    p['shoe' + s].position.set(ft.x, lf + .042, ft.z + .05); p['shoe' + s].scale.set(.088, .075, .215);
    p['sole' + s].position.set(ft.x, lf + .011, ft.z + .055); p['sole' + s].scale.set(.098, .02, .25);
  }
  p.shorts.position.set(hipC.x, hipY + .01, 0); p.shorts.scale.set(.2, .25, .145);
  /* busto rastremato + bordo maglia, collo e strisce laterali */
  const tb = hipC.clone().add(v(0, .09, 0));
  s3Seg(p.torso, tb, shC, .185); p.torso.scale.x = .185; p.torso.scale.z = .128; p.torso.scale.y = tb.distanceTo(shC) + .03;
  p.hem.position.copy(tb).add(v(0, .012, 0)); p.hem.scale.set(.15, .02, .102);
  p.collar.position.copy(shC).add(v(0, .015, 0)); p.collar.scale.set(.085, .03, .07);
  for (const [s, sx] of [['L', -1], ['R', 1]]) s3Seg(p['str' + s], tb.clone().add(v(sx * .147, .03, 0)), shC.clone().add(v(sx * .185, -.045, 0)), .011);
  /* testa con occhi, naso e capelli (stile in base all'atleta) */
  const hd = shC.clone().add(v(0, .25, Math.sin(lean * .7) * .05)), H = rig.hair; J.hd = hd;
  p.head.position.copy(hd).add(v(0, -.005, 0)); p.head.scale.set(.1, .135, .108);
  s3Seg(p.neck, shC.clone().add(v(0, -.02, 0)), hd.clone().add(v(0, -.09, 0)), .046);
  for (const [s, sx] of [['L', -1], ['R', 1]]) { p['ear' + s].position.copy(hd).add(v(sx * .099, -.005, .0)); p['ear' + s].scale.set(.016, .026, .02); p['brow' + s].position.copy(hd).add(v(sx * .042, .05, .099)); p['brow' + s].scale.set(.03, .0055, .008); }
  p.mouth.position.copy(hd).add(v(0, -.058, .1)); p.mouth.scale.set(.022, .006, .01);
  p.hair.position.copy(hd).add(v(0, .028, -.022)); p.hair.scale.set(H.cap[0], H.cap[1], H.cap[2]);
  const tsw = Math.sin(time * 2.6 + rig.ph) * .012 + Math.sin((rig.sph || 0) * .5) * .035 * run0;
  if (H.tail) { p.tail.position.copy(hd).add(v(H.tail[0] + tsw, H.tail[1] + Math.abs(tsw) * -.4, H.tail[2])); p.tail.scale.set(H.tail[3], H.tail[4], H.tail[5]); } else p.tail.scale.setScalar(.0001);
  if (H.bun) { p.bun.position.copy(hd).add(v(H.bun[0], H.bun[1], H.bun[2])); p.bun.scale.set(H.bun[3], H.bun[4], H.bun[5]); } else p.bun.scale.setScalar(.0001);
  if (rig.fringe) { p.fringe.position.copy(hd).add(v(0, .075, .068)); p.fringe.scale.set(.098, .04, .05); } else p.fringe.scale.setScalar(.0001);
  for (const [s, sx] of [['L', -1], ['R', 1]]) { p['eye' + s].position.copy(hd).add(v(sx * .04, .012, .098)); p['eye' + s].scale.set(.019, .014, .01); p['iris' + s].position.copy(hd).add(v(sx * .04, .012, .105)); p['iris' + s].scale.set(.0095, .0095, .006); }
  p.nose.position.copy(hd).add(v(0, -.015, .108)); p.nose.scale.setScalar(.015);
  if (!rig.sk) {
  p.num.position.copy(shC).lerp(hipC, .38).add(v(0, 0, -.13)); p.num.rotation.set(0, Math.PI, 0);
  p.numF.position.copy(shC).lerp(hipC, .3).add(v(.07, 0, .128)); p.numF.rotation.set(0, 0, 0);
  }
  /* braccia: L = prima, R = seconda; R e' la destra dell'atleta */
  for (const [s, sx, A] of [['L', 1, P.L], ['R', -1, P.R]]) {
    const swing = Math.sin((rig.sph || 0) + (sx > 0 ? 0 : Math.PI)) * .55 * run0, sh = shC.clone().add(v(sx * .21, -.04, 0)), a = A[0] + (idle ? sw * .05 : 0) + swing, b = A[1] - Math.abs(swing) * .5;
    const fw = (S3_FORWARD.has(name)) ? 1 : (a < .9 ? .5 : 0);
    const dirF = v(sx * Math.sin(a), -Math.cos(a), 0);
    const af = (S3_FORWARD.has(name) ? .8 : .45) + a * .55;
    const dirW = v(sx * .1, -Math.cos(af), Math.sin(af));
    const dir = dirF.clone().lerp(dirW, fw).normalize();
    const el = sh.clone().addScaledVector(dir, .3);
    let bend;
    if (b < 0) bend = v(0, 0, 1); else if (a > 1.5) bend = v(0, 0, -1); else bend = v(-sx, 0, 0);
    const fdir = dir.clone().multiplyScalar(Math.cos(b)).addScaledVector(bend, Math.sin(Math.abs(b))).normalize();
    const wr = el.clone().addScaledVector(fdir, .27); J.arms.push({ sx, sh, el, wr, fdir });
    s3Seg(p['uarm' + s], sh, el, .05); s3Seg(p['farm' + s], el, wr, .042);
    s3Seg(p['slv' + s], sh.clone().add(v(0, .005, 0)), sh.clone().lerp(el, .42), .062);
    p['sho' + s].position.copy(sh); p['sho' + s].scale.set(.078, .072, .072);
    p['elb' + s].position.copy(el); p['elb' + s].scale.setScalar(.046);
    s3Seg(p['hand' + s], wr.clone().addScaledVector(fdir, -.01), wr.clone().addScaledVector(fdir, .1), .043);
    s3Seg(p['fing' + s], wr.clone().addScaledVector(fdir, .085), wr.clone().addScaledVector(fdir, .165), .029);
    s3Seg(p['thumb' + s], wr.clone().addScaledVector(fdir, .03).addScaledVector(bend, -.03), wr.clone().addScaledVector(fdir, .095).addScaledVector(bend, -.045), .014);
    if (rig.band) s3Seg(p['wb' + s], wr.clone().addScaledVector(fdir, -.05), wr.clone().addScaledVector(fdir, -.005), .046); else p['wb' + s].scale.setScalar(.0001);
  }
  rig.g.rotation.y = face;
  if (!rig.sk && typeof skAttach === 'function') skAttach(rig);
  if (rig.sk) skPose(rig, J);
}

/* ---------- ciclo di disegno ---------- */
function s3Frame(M, ents, dt) {
  if (typeof skPerf === 'function') skPerf(M, dt);
  const S = M.s3, scene = S.scene, cam = S.camera, a = M.anim, t = a ? a.t : 0, time = M.t;
  const seen = new Set();
  const bE = ents.find(e => e.kind === 'b');
  for (const e of ents) {
    if (e.kind === 'b') {
      S.ball.visible = true; S.ball.position.set(e.v, Math.max(.16, e.z), e.u); S.ball.rotation.x = (time * 6) % 6.283;
      const sh = Math.max(.35, 1 - e.z * .1); S.ballShadow.position.x = e.v + .12 * (1 + e.z * .3); S.ballShadow.position.z = e.u - .07 * (1 + e.z * .3); S.ballShadow.scale.set(.32 * sh, .32 * sh, .32 * sh); continue;
    }
    seen.add(e.p.id);
    const rig = s3Rig(M, e), base = e.side === M.userSide ? Math.PI : 0;
    /* sguardo e corpo seguono la palla (con inerzia) */
    let tgt = base;
    if (bE && !e.name) { const d = Math.atan2(bE.v - e.v, bE.u - e.u); let df = d - base; df = Math.atan2(Math.sin(df), Math.cos(df)); tgt = base + Math.max(-.8, Math.min(.8, df)) * .55; }
    if (rig.yaw === undefined) rig.yaw = tgt; rig.yaw += (tgt - rig.yaw) * Math.min(1, dt * 7);
    const face = rig.yaw;
    /* velocita' -> corsa */
    if (rig.lu === undefined) { rig.lu = e.u; rig.lv = e.v; rig.sp = 0; rig.sph = 0; }
    const spd = dt > 0 ? Math.hypot(e.u - rig.lu, e.v - rig.lv) / dt : 0; rig.lu = e.u; rig.lv = e.v;
    rig.sp += (Math.min(7, spd) - rig.sp) * Math.min(1, dt * 9); rig.sph += rig.sp * dt * 3.4; rig.run = Math.min(1, rig.sp / 3);
    const breath = e.pose === POSE.ready ? Math.sin(time * 3 + e.u * 2 + e.v) * .012 : 0;
    let P = breath ? { ...e.pose, cr: e.pose.cr + breath } : e.pose;
    if (e.pose === POSE.cheer || e.pose === POSE.cheerUp) P = { ...P, lf: P.lf + Math.abs(Math.sin(time * 7 + e.u * 1.3)) * .14 };
    /* atterraggio: dopo un salto le ginocchia ammortizzano */
    if (rig.air === undefined) { rig.air = 0; rig.land = 0; }
    rig.air = Math.max(P.lf, rig.air - dt * 1.6); if (rig.air > .3 && P.lf < .08) { rig.land = 1; rig.air = 0; }
    rig.land = Math.max(0, rig.land - dt * 2.8);
    if (rig.land > .01) P = { ...P, cr: P.cr + .34 * rig.land, ln: P.ln + .1 * rig.land };
    rig.g.position.set(e.v, 0, e.u);
    s3Pose(rig, P, e.name, face, time);
    const sh = Math.max(.35, 1 - P.lf * .45); rig.shadow.position.set(e.v + .14 * (1 + P.lf), .012, e.u - .08 * (1 + P.lf)); rig.shadow.scale.set(.5 * sh, .5 * sh, .5 * sh);
  }
  if (!ents.some(e => e.kind === 'b')) { S.ball.visible = false; S.ballShadow.scale.set(.001, .001, .001); }
  for (const [id, rig] of S.rigs) if (!seen.has(id)) { scene.remove(rig.g); scene.remove(rig.shadow); S.rigs.delete(id); }

  /* tabellone sospeso: ridisegna solo se cambia il punteggio */
  { const sh = document.getElementById('sc-h'), sa = document.getElementById('sc-a'), h = sh ? sh.textContent : '0', aw = sa ? sa.textContent : '0', key = h + '-' + aw;
    if (key !== S.sbKey) {
      S.sbKey = key; const c = S.sbTex.image.getContext('2d'), w = 512, hh = 192, kh = M.kits.h, ka = M.kits.a;
      c.fillStyle = '#070b16'; c.fillRect(0, 0, w, hh);
      c.fillStyle = kh.main; c.fillRect(0, 0, w / 2, 34); c.fillStyle = ka.main; c.fillRect(w / 2, 0, w / 2, 34);
      c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = '700 28px "Barlow Condensed",Arial Narrow,sans-serif';
      c.fillStyle = Gx.onColor(kh.main); c.fillText(M.home.short.toUpperCase(), w / 4, 18, 230); c.fillStyle = Gx.onColor(ka.main); c.fillText(M.away.short.toUpperCase(), w * .75, 18, 230);
      c.fillStyle = '#ffd24a'; c.font = '700 120px "Barlow Condensed",Arial Narrow,sans-serif'; c.fillText(h, w / 4, 112); c.fillText(aw, w * .75, 112);
      c.fillStyle = '#6b7690'; c.fillText(':', w / 2, 108); S.sbTex.needsUpdate = true;
    } }
  /* panchine in festa quando segna la propria squadra */
  { const ex0 = M.excite || 0, lw0 = M.lastWin; for (const x of S.extras) { const win = x.tm && ((x.tm === 1 && lw0 === 'h') || (x.tm === 2 && lw0 === 'a')); x.g.position.y = win ? Math.abs(Math.sin(time * 7 + x.ph)) * .2 * ex0 : 0; } }

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
