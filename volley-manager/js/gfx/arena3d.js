/* Palazzetto 3D ad alto dettaglio: pubblico con corpo, testa, capelli, gambe e braccia che si alzano ai punti; seggiolini, parapetti, capriate del tetto,
   pilastri, portali, fascia LED, striscioni, telecamere TV e steward. Si attiva con "Palazzetto 3D: Alta" (Home) o ?gfx=hi; ?gfx=lo torna alla versione leggera. */
function s3Hi() {
  try {
    const q = new URLSearchParams(location.search).get('gfx'); if (q === 'hi' || q === 'lo') return q === 'hi';
    const v = localStorage.getItem('vm-gfx'); if (v === 'hi' || v === 'lo') return v === 'hi';
  } catch (e) { }
  return !(/Android|iPhone|iPad|Mobi/i.test(navigator.userAgent) || Math.min(innerWidth, innerHeight) < 520);
}
function s3Merge(items) {
  const P = [], N = [], I = []; let off = 0;
  for (const it of items) {
    const g = it.g.clone(); if (it.m) g.applyMatrix4(it.m);
    const p = g.attributes.position, n = g.attributes.normal;
    for (let k = 0; k < p.count; k++) { P.push(p.getX(k), p.getY(k), p.getZ(k)); N.push(n.getX(k), n.getY(k), n.getZ(k)); }
    if (g.index) for (let k = 0; k < g.index.count; k++) I.push(g.index.getX(k) + off); else for (let k = 0; k < p.count; k++) I.push(k + off);
    off += p.count; g.dispose();
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); out.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3)); out.setIndex(I);
  return out;
}
const s3M4 = (x, y, z, sx = 1, sy = 1, sz = 1, rx = 0, ry = 0, rz = 0) => new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new THREE.Vector3(sx, sy, sz));
const S3_HAIRC = ['#14100c', '#241a12', '#3a281a', '#5a3b22', '#8a5a2e', '#c9a25a', '#d9c08a', '#6b6b6b', '#b8b8b8', '#7a2a1c'];
const S3_JEANS = ['#1f2a44', '#26344f', '#141820', '#3a4a66', '#5a5040', '#d8d4c8', '#2c2c32'];

/* ---------- pubblico ---------- */
function s3RichCrowd(S, scene, o) {
  const N = o.spots.length, R = Gx.rng(Gx.hash('rich' + N)), col = new THREE.Color();
  const cyl = (a, b, h, s) => new THREE.CylinderGeometry(a, b, h, s), sph = (w, h) => new THREE.SphereGeometry(1, w, h), box = new THREE.BoxGeometry(1, 1, 1);
  const torsoG = s3Merge([{ g: cyl(.155, .19, .5, 8), m: s3M4(0, -.025, 0) }, { g: sph(8, 5), m: s3M4(0, .215, 0, .21, .1, .15) }]);
  const headG = s3Merge([{ g: cyl(.04, .045, .1, 6), m: s3M4(0, .28, 0) }, { g: sph(9, 7), m: s3M4(0, .40, 0, .113, .125, .118) }, { g: sph(5, 4), m: s3M4(-.113, .395, 0, .03, .04, .025) }, { g: sph(5, 4), m: s3M4(.113, .395, 0, .03, .04, .025) }, { g: sph(5, 4), m: s3M4(0, .385, .115, .025, .03, .03) }]);
  const hairG = s3Merge([{ g: new THREE.SphereGeometry(1, 9, 5, 0, Math.PI * 2, 0, Math.PI * .62), m: s3M4(0, .415, -.005, .128, .13, .13) }, { g: sph(7, 5), m: s3M4(0, .37, -.085, .11, .13, .07) }]);
  const legItems = []; for (const dx of [-.09, .09]) { legItems.push({ g: box, m: s3M4(dx, -.215, .2, .13, .13, .36) }, { g: box, m: s3M4(dx, -.37, .38, .11, .3, .11) }, { g: box, m: s3M4(dx, -.52, .42, .11, .06, .2) }); }
  const legsG = s3Merge(legItems), armG = s3Merge([{ g: cyl(.048, .042, .3, 6), m: s3M4(0, -.15, 0) }, { g: sph(6, 4), m: s3M4(0, -.315, 0, .05, .05, .05) }]);
  const mk = (g, mat) => { const m = new THREE.InstancedMesh(g, mat || new THREE.MeshLambertMaterial({ color: 0xffffff }), N); m.frustumCulled = false; scene.add(m); return m; };
  const torso = mk(torsoG), head = mk(headG), hair = mk(hairG), legs = mk(legsG), armL = mk(armG), armR = mk(armG);
  const mtx = new THREE.Matrix4(), q = new THREE.Quaternion(), pv = new THREE.Vector3(), one = new THREE.Vector3(1, 1, 1), sv = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
  const yaw = new Float32Array(N), team = o.team;
  o.spots.forEach((p, i) => {
    yaw[i] = p.yaw || 0; q.setFromAxisAngle(up, yaw[i]); const b = o.base[i];
    mtx.compose(pv.set(p.x, b, p.z), q, one);
    torso.setMatrixAt(i, mtx); head.setMatrixAt(i, mtx); legs.setMatrixAt(i, mtx);
    mtx.compose(pv.set(p.x, b, p.z), q, sv.set(1, .85 + R() * .35, 1)); hair.setMatrixAt(i, mtx);
    const c = Math.cos(yaw[i]), s = Math.sin(yaw[i]); mtx.compose(pv.set(p.x + .2 * c, b + .22, p.z - .2 * s), q, one); armL.setMatrixAt(i, mtx);
    mtx.compose(pv.set(p.x - .2 * c, b + .22, p.z + .2 * s), q, one); armR.setMatrixAt(i, mtx);
    torso.setColorAt(i, col.set(o.cc[i])); armL.setColorAt(i, col.set(o.cc[i])); armR.setColorAt(i, col.set(o.cc[i]));
    head.setColorAt(i, col.set(o.sk[i]));
    hair.setColorAt(i, col.set(team[i] && R() < .14 ? o.cc[i] : S3_HAIRC[Math.floor(R() * S3_HAIRC.length)]));
    legs.setColorAt(i, col.set(S3_JEANS[Math.floor(R() * S3_JEANS.length)]));
  });
  /* flash dei telefoni */
  const NP = Math.min(90, N), phones = new THREE.InstancedMesh(new THREE.BoxGeometry(.06, .1, .01), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .9, blending: THREE.AdditiveBlending, depthWrite: false }), NP);
  const phl = []; for (let k = 0; k < NP; k++) { const i = Math.floor(R() * N), p = o.spots[i]; phl.push({ i, ph: R() * 60, f: .25 + R() * .5 }); const c = Math.cos(yaw[i]), s = Math.sin(yaw[i]); mtx.makeTranslation(p.x + .28 * s, o.base[i] + .42, p.z + .28 * c); phones.setMatrixAt(k, mtx); }
  phones.frustumCulled = false; scene.add(phones);
  return { torso, head, hair, legs, armL, armR, yaw, armA: new Float32Array(N), phones, phl, NP, q: new THREE.Quaternion(), qa: new THREE.Quaternion(), zax: new THREE.Vector3(0, 0, 1), pv: new THREE.Vector3(), one, mtx: new THREE.Matrix4() };
}
function s3RichCrowdUpdate(cr, time, ex, lw) {
  const R = cr.rich, ta = R.torso.instanceMatrix.array, ha = R.head.instanceMatrix.array, ka = R.hair.instanceMatrix.array, la = R.legs.instanceMatrix.array, al = R.armL.instanceMatrix.array, ar = R.armR.instanceMatrix.array;
  const sp = cr.spots, base = cr.base, ph = cr.ph, tm = cr.team, up = R.zax, q = R.q, qa = R.qa, pv = R.pv, one = R.one, mx = R.mtx;
  const Y = new THREE.Vector3(0, 1, 0);
  for (let i = 0; i < cr.N; i++) {
    const win = (tm[i] === 1 && lw === 'h') || (tm[i] === 2 && lw === 'a');
    const y = base[i] + ex * (win ? .22 : .02) + Math.max(0, Math.sin(time * (win ? 4 : 2.4) + ph[i])) * (.012 + ex * (win ? .12 : .03));
    ta[i * 16 + 13] = y; ha[i * 16 + 13] = y; ka[i * 16 + 13] = y; la[i * 16 + 13] = y;
    const target = win ? ex * (1.9 + Math.sin(time * 8 + ph[i]) * .5) : 0; let a = R.armA[i]; a += (target - a) * .22; if (target === 0 && Math.abs(a) < .03) a = 0;
    if (a !== 0 || R.armA[i] !== 0) {
      const yw = R.yaw[i], c = Math.cos(yw), s = Math.sin(yw), p = sp[i]; q.setFromAxisAngle(Y, yw);
      qa.setFromAxisAngle(up, a); qa.premultiply(q); mx.compose(pv.set(p.x + .2 * c, y + .22, p.z - .2 * s), qa, one); R.armL.setMatrixAt(i, mx);
      qa.setFromAxisAngle(up, -a); qa.premultiply(q); mx.compose(pv.set(p.x - .2 * c, y + .22, p.z + .2 * s), qa, one); R.armR.setMatrixAt(i, mx);
    } else { al[i * 16 + 13] = y + .22; ar[i * 16 + 13] = y + .22; }
    R.armA[i] = a;
  }
  const pa = R.phones.instanceMatrix.array;
  for (let k = 0; k < R.NP; k++) { const f = R.phl[k], on = Math.sin(time * f.f + f.ph) > .93 - ex * .1 ? 1 : 0; pa[k * 16] = pa[k * 16 + 5] = pa[k * 16 + 10] = on; pa[k * 16 + 13] = base[f.i] + .42 + (ex > .3 && cr.team[f.i] ? .25 : 0); }
  for (const m of [R.torso, R.head, R.hair, R.legs, R.armL, R.armR, R.phones]) m.instanceMatrix.needsUpdate = true;
}

/* ---------- struttura del palazzetto ---------- */
function s3RichArena(S, scene, c) {
  const { TH, kit, xW, zW, END0, SIDE0, endSpan, stepD, seats, rowsEnd, rowsSide } = c, R = Gx.rng(Gx.hash('rich-arena')), BOX = new THREE.BoxGeometry(1, 1, 1);
  const steel = new THREE.MeshLambertMaterial({ color: 0x1b2438 }), dark = new THREE.MeshLambertMaterial({ color: 0x0c1220 });
  const beam = (a, b, t) => { const d = b.clone().sub(a), len = d.length(), q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()); return { g: BOX, m: new THREE.Matrix4().compose(a.clone().add(b).multiplyScalar(.5), q, new THREE.Vector3(t, len, t)) }; };
  const V = (x, y, z) => new THREE.Vector3(x, y, z), add = (g, m) => { const o = new THREE.Mesh(g, m); scene.add(o); return o; };

  /* seggiolini a istanze */
  const seatG = s3Merge([{ g: BOX, m: s3M4(0, .03, .02, .42, .06, .38) }, { g: BOX, m: s3M4(0, .3, -.19, .42, .5, .05) }]);
  const seatM = new THREE.InstancedMesh(seatG, new THREE.MeshLambertMaterial({ color: 0xffffff }), Math.max(1, seats.length)), mtx = new THREE.Matrix4(), q = new THREE.Quaternion(), up = V(0, 1, 0), col = new THREE.Color();
  const sc = [kit.main, Gx.dark(kit.main, .6), Gx.light(kit.main, .35), '#1d2a44'];
  seats.forEach((s, i) => { q.setFromAxisAngle(up, s.yaw); mtx.compose(V(s.x, s.y, s.z), q, V(1, 1, 1)); seatM.setMatrixAt(i, mtx); const k = (Math.floor(s.a / 3.4) + s.r) % 7; seatM.setColorAt(i, col.set(k === 0 ? sc[2] : k === 3 ? sc[3] : sc[(s.r + Math.floor(s.a * .25)) % 2])); });
  seatM.frustumCulled = false; scene.add(seatM);

  /* parapetti trasparenti davanti ai gradoni */
  const glass = new THREE.MeshLambertMaterial({ color: 0x9fc4e6, transparent: true, opacity: .16, depthWrite: false }), rail = new THREE.MeshLambertMaterial({ color: 0xcfd6e2 });
  for (const s of [-1, 1]) {
    add(new THREE.BoxGeometry(endSpan, .8, .04), glass).position.set(0, .9, s * (END0 - .22)); add(new THREE.BoxGeometry(endSpan, .05, .09), rail).position.set(0, 1.32, s * (END0 - .22));
    add(new THREE.BoxGeometry(.04, .8, 2 * END0 - 1), glass).position.set(s * (SIDE0 - .22), .9, 0); add(new THREE.BoxGeometry(.09, .05, 2 * END0 - 1), rail).position.set(s * (SIDE0 - .22), 1.32, 0);
  }
  /* le pareti dal lato della camera (x+ per la laterale, z+ per le altre) nascondono i propri dettagli: la camera sta oltre il muro */
  const W = S.richWall = { xp: [], xm: [], zp: [], zm: [], cc: [] }, keyZ = s => s > 0 ? 'zp' : 'zm', keyX = s => s > 0 ? 'xp' : 'xm';
  const wadd = (key, obj) => { W[key].push(obj); return obj; };
  const grp = (list, mat) => { const by = {}; for (const [k, it] of list) (by[k] = by[k] || []).push(it); for (const k in by) wadd(k, add(s3Merge(by[k]), mat)); };
  /* pilastri a parete, fascia LED, finestre alte */
  const pil = []; for (let x = -xW + 1; x <= xW - .9; x += 3.4) for (const s of [-1, 1]) pil.push([keyZ(s), { g: BOX, m: s3M4(x, 12, s * (zW - .25), .5, 24, .5) }]);
  for (let z = -zW + 1; z <= zW - .9; z += 3.4) for (const s of [-1, 1]) pil.push([keyX(s), { g: BOX, m: s3M4(s * (xW - .25), 12, z, .5, 24, .5) }]);
  grp(pil, new THREE.MeshLambertMaterial({ color: 0x15203a }));
  const win = []; for (let x = -xW + 2; x <= xW - 2; x += 3.4) for (const s of [-1, 1]) win.push([keyZ(s), { g: BOX, m: s3M4(x + 1.7, 17.5, s * (zW - .15), 2.2, 2.4, .05) }]);
  for (let z = -zW + 2; z <= zW - 2; z += 3.4) for (const s of [-1, 1]) win.push([keyX(s), { g: BOX, m: s3M4(s * (xW - .15), 17.5, z + 1.7, .05, 2.4, 2.2) }]);
  grp(win, new THREE.MeshBasicMaterial({ color: 0x24385e }));
  /* portali con insegna USCITA */
  const exitTex = s3Tex(128, 32, (cx, w, h) => { cx.fillStyle = '#0c6b3a'; cx.fillRect(0, 0, w, h); cx.fillStyle = '#e8fff0'; cx.font = '700 22px Arial'; cx.textAlign = 'center'; cx.textBaseline = 'middle'; cx.fillText('USCITA', w / 2, h / 2 + 1); });
  const frameM = new THREE.MeshBasicMaterial({ color: 0x20314f }), holeM = new THREE.MeshBasicMaterial({ color: 0x02040a }), signM = new THREE.MeshBasicMaterial({ map: exitTex });
  const portal = (x, z, ry, key) => { const g = new THREE.Group(); const fr = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 4.4), frameM), ho = new THREE.Mesh(new THREE.PlaneGeometry(3.1, 4), holeM), sg = new THREE.Mesh(new THREE.PlaneGeometry(1.4, .35), signM); ho.position.z = .01; sg.position.set(0, 2.6, .02); g.add(fr, ho, sg); g.position.set(x, 6.6, z); g.rotation.y = ry; scene.add(g); W[key].push(g); };
  for (const x of [-8, 0, 8]) for (const s of [-1, 1]) portal(x, s * (zW - .32), s > 0 ? Math.PI : 0, keyZ(s));
  for (const z of [-8, 0, 8]) for (const s of [-1, 1]) portal(s * (xW - .32), z, s > 0 ? -Math.PI / 2 : Math.PI / 2, keyX(s));

  /* capriate del tetto, arcarecci e colonne */
  const tr = [], nT = 9, L = xW; for (let i = -4; i <= 4; i++) {
    const z = i * 3.3; tr.push(beam(V(-L, 23.6, z), V(L, 23.6, z), .16), beam(V(-L, 22.7, z), V(L, 22.7, z), .12));
    for (let x = -L, k = 0; x < L - .7; x += 1.4, k++) tr.push(beam(V(x, k % 2 ? 23.6 : 22.7, z), V(x + 1.4, k % 2 ? 22.7 : 23.6, z), .07));
  }
  for (let x = -xW + 2; x <= xW - 2; x += 4.2) tr.push(beam(V(x, 23.85, -zW), V(x, 23.85, zW), .1));
  add(s3Merge(tr), steel);
  const cols = []; for (const x of [-xW + .6, xW - .6]) for (const z of [-zW + .6, zW - .6, 0]) cols.push([x > 0 && z > 0 ? 'cc' : z === 0 ? keyX(x) : x > 0 ? keyX(x) : keyZ(z), beam(V(x, 0, z), V(x, 23.6, z), .55)]);
  grp(cols, steel);
  const lite = []; for (let i = -4; i <= 4; i++) for (let x = -L + 2; x < L - 1; x += 4.4) lite.push({ g: BOX, m: s3M4(x, 22.45, i * 3.3, .5, .14, .28) });
  add(s3Merge(lite), new THREE.MeshBasicMaterial({ color: 0xfff1d6 }));

  /* telecamere TV e steward dietro i cartelloni */
  const camG = (x, z, ry) => { const g = new THREE.Group(), leg = new THREE.MeshLambertMaterial({ color: 0x141a28 }); for (const a of [0, 2.1, 4.2]) { const l = new THREE.Mesh(new THREE.CylinderGeometry(.015, .02, 1.3, 5), leg); l.position.set(Math.cos(a) * .22, .65, Math.sin(a) * .22); l.rotation.set(Math.sin(a) * .18, 0, -Math.cos(a) * .18); g.add(l); } const body = new THREE.Mesh(new THREE.BoxGeometry(.32, .28, .6), leg); body.position.set(0, 1.45, 0); const lens = new THREE.Mesh(new THREE.CylinderGeometry(.09, .1, .36, 10), new THREE.MeshLambertMaterial({ color: 0x0a0e18 })); lens.rotation.x = Math.PI / 2; lens.position.set(0, 1.45, .46); const lamp = new THREE.Mesh(new THREE.SphereGeometry(.03, 6, 4), new THREE.MeshBasicMaterial({ color: 0xff2a2a })); lamp.position.set(0, 1.62, -.2); g.add(body, lens, lamp); g.position.set(x, 0, z); g.rotation.y = ry; scene.add(g); };
  camG(-3.2, 13.2, Math.PI); camG(3.4, -13.2, 0); camG(-10.7, 6, Math.PI / 2); camG(10.7, -4, -Math.PI / 2);
  S.richStewards = [[-8, 13.4], [0, 13.4], [8, 13.4], [-8, -13.4], [0, -13.4], [8, -13.4], [-10.9, -8], [-10.9, 8], [10.9, -8], [10.9, 8]];
}

/* ---------- impostazione dal menu ---------- */
document.addEventListener('click', e => {
  const el = e.target.closest('[data-gfx]'); if (!el) return;
  let hi = s3Hi(); try { localStorage.setItem('vm-gfx', hi ? 'lo' : 'hi'); } catch (x) { }
  if (typeof toast === 'function') toast(hi ? 'Palazzetto standard: dalla prossima partita.' : 'Palazzetto ad alto dettaglio: dalla prossima partita.');
  if (typeof render === 'function') render();
});
(function () {
  const _h = homeHTML;
  homeHTML = function () { const h = _h.apply(this, arguments); return h + `<p style="text-align:center;margin:10px 0 0"><button class="btn" data-gfx="1">Palazzetto 3D: ${s3Hi() ? 'Alta definizione' : 'Standard'}</button></p>`; };
})();
