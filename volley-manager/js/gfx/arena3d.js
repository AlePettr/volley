/* Palazzetto 3D ad alto dettaglio: pubblico con corpo, testa, capelli, gambe e braccia che si alzano ai punti; seggiolini, parapetti, capriate del tetto,
   pilastri, portali, fascia LED, striscioni, telecamere TV e steward. Si attiva con "Palazzetto 3D: Alta" (Home) o ?gfx=hi; ?gfx=lo torna alla versione leggera. */
function s3Hi() {
  try {
    const q = new URLSearchParams(location.search).get('gfx'); if (q === 'hi' || q === 'lo') return q === 'hi';
    const v = localStorage.getItem('vm-gfx'); if (v === 'hi' || v === 'lo') return v === 'hi';
  } catch (e) { }
  return !(/Android|iPhone|iPad|Mobi/i.test(navigator.userAgent) || Math.min(innerWidth, innerHeight) < 520);
}
function s3Rnd() { try { return localStorage.getItem('vm-arena') === 'rnd'; } catch (e) { return false; } }
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
/* forme e palette dei palazzetti: ogni club ne ha una stabile (da id), oppure casuale a ogni partita */
const S3_PAL = [
  { conc: 0x1a2438, steel: 0x1b2438, pil: 0x15203a, glow: 0xbfd9ff, win: 0x24385e },
  { conc: 0x3a3028, steel: 0x2c2823, pil: 0x2a221c, glow: 0xffe2b0, win: 0x4a3a28 },
  { conc: 0x4a5262, steel: 0x6a7384, pil: 0x3a4252, glow: 0xffffff, win: 0x56688a }
];
const S3_FORMS = [
  { name: 'Arena a due anelli', xl: 2, gap: 2, ru: 4, dh: .45, du: .55 },
  { name: 'Palasport a un anello', xl: 5, gap: 0, ru: 0, dh: .5, du: .5 },
  { name: 'Conca ripida', xl: 1, gap: 1, ru: 6, dh: .5, du: .7 },
  { name: 'Doppio anello largo', xl: 3, gap: 3, ru: 3, dh: .4, du: .5 },
  { name: 'Palazzetto a staffa', xl: 5, gap: 0, ru: 0, dh: .5, du: .5, horse: true },
  { name: 'Arena ad arco', xl: 2, gap: 2, ru: 4, dh: .45, du: .55, arch: true },
  { name: 'Palasport ad arco', xl: 5, gap: 0, ru: 0, dh: .5, du: .5, arch: true },
  { name: 'Staffa con tetto ad arco', xl: 5, gap: 0, ru: 0, dh: .5, du: .5, horse: true, arch: true }
];
/* palazzetti piccoli (serie A3): poche file, senza secondo anello */
const S3_SMALL = [
  { name: 'Palazzetto piccolo', rows: 7, xl: -3, gap: 0, ru: 0, dh: .5, du: .5 },
  { name: 'Palazzetto piccolo ad arco', rows: 7, xl: -3, gap: 0, ru: 0, dh: .5, du: .5, arch: true },
  { name: 'Piccolo a staffa', rows: 7, xl: -2, gap: 0, ru: 0, dh: .5, du: .5, horse: true },
  { name: 'Piccolo a staffa con arco', rows: 7, xl: -2, gap: 0, ru: 0, dh: .5, du: .5, horse: true, arch: true }
];
function s3IsA3(id) { try { return ['A3A', 'A3B'].some(l => WORLD[l] && WORLD[l].some(t => t.id === id)); } catch (e) { return false; } }
/* palazzetti con disegno proprio (id club) */
const S3_ROUND = [
  { name: 'Arena circolare', xl: 1, gap: 2, ru: 4, dh: .45, du: .55, round: true },
  { name: 'Anfiteatro circolare', xl: 4, gap: 0, ru: 0, dh: .5, du: .5, round: true },
  { name: 'Arena circolare ripida', xl: 0, gap: 1, ru: 6, dh: .5, du: .7, round: true }
];
/* texture delle pareti piene: colore, pannelli pubblicitari generici, pilastri */
function s3WallTex(AV, kit) {
  const t = s3Tex(1024, 256, (c, w, h) => {
    c.fillStyle = AV.wall || '#8a8a88'; c.fillRect(0, 0, w, h);
    for (let x = 0; x < w; x += 64) { c.fillStyle = 'rgba(0,0,0,.13)'; c.fillRect(x, 0, 3, h); }
    const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, 'rgba(0,0,0,.4)'); g.addColorStop(.4, 'rgba(0,0,0,0)'); c.fillStyle = g; c.fillRect(0, 0, w, h);
    if (AV.banners) for (const [x0, k] of [[.1, 0], [.56, 1]]) {   /* due grandi pannelli blu: mare e montagna */
      const bx = w * x0, bw = w * .34, by = h * .58, bh = h * .34, gr = c.createLinearGradient(0, by, 0, by + bh);
      gr.addColorStop(0, k ? '#6fa6d8' : '#2f78b8'); gr.addColorStop(.6, k ? '#dfeaf5' : '#7ec0e0'); gr.addColorStop(1, k ? '#274a7a' : '#1b4f86');
      c.fillStyle = gr; c.fillRect(bx, by, bw, bh); c.fillStyle = 'rgba(255,255,255,.85)'; c.beginPath(); c.moveTo(bx, by + bh * .75); c.lineTo(bx + bw * .35, by + bh * .38); c.lineTo(bx + bw * .6, by + bh * .62); c.lineTo(bx + bw * .8, by + bh * .45); c.lineTo(bx + bw, by + bh * .7); c.lineTo(bx + bw, by + bh); c.lineTo(bx, by + bh); c.fill();
      c.strokeStyle = '#1a2a44'; c.lineWidth = 5; c.strokeRect(bx, by, bw, bh);
    }
    if (AV.gallery) {   /* due ordini di balconate con parapetto in vetro e parete scura */
      c.fillStyle = '#9ea1a6'; c.fillRect(0, 0, w, h);
      for (const [y0, y1] of [[.08, .36], [.46, .76]]) {
        c.fillStyle = '#101216'; c.fillRect(0, h * y0, w, h * (y1 - y0));
        for (let x = 0; x < w; x += 128) { c.fillStyle = '#3a4048'; c.fillRect(x + 6, h * y0 + 6, 118, h * (y1 - y0) - 12); }
        c.fillStyle = 'rgba(180,215,230,.35)'; c.fillRect(0, h * (y1 - .07), w, h * .07);
        c.fillStyle = '#d9dde0'; c.fillRect(0, h * (y1 - .075), w, 4);
        for (let x = 0; x < w; x += 64) { c.fillStyle = '#3c4148'; c.fillRect(x, h * (y1 - .07), 3, h * .07); }
      }
      c.fillStyle = '#c9a050'; c.fillRect(0, h * .78, w, h * .04);
    }
    if (AV.stripe) { c.fillStyle = AV.stripe; c.fillRect(0, h * .9, w, h * .05); }
  });
  t.wrapS = THREE.RepeatWrapping; t.repeat.set(AV.banners ? 1 : 3, 1); return t;
}
const S3_ROUND_CLUB = { chi: [0, 0], rom: [0, 2], sca: [0, 1], mil: [2, 2], nov: [1, 0] };   /* club con tribune circolari: [forma, palette] */
const S3_CUSTOM = {
  mar2: { name: 'Marsala', rows: 10, xl: 0, gap: 0, ru: 0, dh: .5, du: .5, ends: false, openX: 1, wall: '#cfc7b0', stripe: '#2a6fb0', boxCol: 0x5a5f66, seatCols: ['#2a6fb0', '#e8e8e4', '#2a6fb0', '#1c4f8a'], arch: true, roofCol: 0xb8b2a0, pal: 2, palx: { steel: 0x8a8a8a, pil: 0xb8ae94, conc: 0x4a4d52, win: 0xd8d0b0 } },
  tre: { name: 'Trentino', rows: 9, xl: 0, gap: 0, ru: 0, dh: .5, du: .5, ends: false, openX: -1, wall: '#7d8087', gallery: true, balc: { sign: -1, rows: 3, h0: 3.6, k: .8 }, boxCol: 0x4a4e58, seatCols: ['#5a5f6a', '#646a76', '#50555f', '#6c727e'], arch: true, roofCol: 0x5a3018, pal: 2, palx: { steel: 0x9a5a2c, pil: 0x8a8c90, conc: 0x3a3d44, win: 0x8fb4c8 } },
  imo: { name: 'Imola', rows: 8, xl: 0, gap: 0, ru: 0, dh: .5, du: .5, sep: true, horse: true, openSign: 1, arch: true, wall: '#ebe7dc', parquet: true, boxCol: 0x2a1a14, seatCols: ['#e8761a', '#f2f0e8', '#e8761a', '#2a2a2e', '#f08a2c'], roofCol: 0x6b4426, pal: 1, palx: { steel: 0x8a5a34, pil: 0xcbbf9e, conc: 0x3a3a40, win: 0xd8d2c0 } },
  cas: { name: 'Casalmaggiore', rows: 8, xl: 0, gap: 0, ru: 0, dh: .5, du: .5, sep: true, horse: true, openSign: 1, arch: true, arches: true, wall: '#d9d2bf', parquet: true, boxCol: 0x14281a, seatCols: ['#2f8f4a', '#f2f0e8', '#2f8f4a', '#1f6a38', '#4aa862'], roofCol: 0x6b4426, pal: 1, palx: { steel: 0x8a5a34, pil: 0xcbbf9e, conc: 0x3a3a40, win: 0xd8d2c0 } },
  mes: { name: 'Messina', stairs: { every: 8, color: 0xe0742a }, rows: 10, xl: 3, gap: 1, ru: 5, dh: .5, du: .6, boxCol: 0x2a5a36, seatCols: ['#2f9a4e', '#3aa85c', '#27874a', '#46b466', '#e0742a'], roofCol: 0x6a7076, pal: 2, palx: { steel: 0x9aa0a8, pil: 0xb8b0a0, conc: 0x7a7e84, win: 0xe8e8e8, glow: 0xffffff } },
  mon: { name: 'Monviso', rows: 7, xl: 0, gap: 0, ru: 0, dh: .5, du: .5, sep: true, wall: '#9aa4ac', windows: false, boxCol: 0x1f3f8a, seatCols: ['#f2d21a', '#e8c010', '#f5dc3a', '#d94a2a', '#f2d21a', '#2a52b0'], roofCol: 0x8a5a2c, arch: true, pal: 2, palx: { steel: 0xb07a3c, pil: 0xd8d8d4, conc: 0x44484e, win: 0xe8f0ff } },
  avs: { name: 'Altino', rows: 10, xl: 0, gap: 0, ru: 0, dh: .5, du: .5, ends: false, wall: '#d9772a', boxCol: 0xd9772a, seatCols: ['#8d9293', '#9ca1a0', '#80868a', '#a5aaa8'], roofCol: 0x6a7076, arch: true, pal: 2, palx: { steel: 0x8a8a8a, pil: 0xc86a22, conc: 0x7a5a3a, win: 0xe8d8b0 } },
  fut: { name: 'Futura Busto', rows: 7, xl: 0, gap: 0, ru: 0, dh: .5, du: .5, sep: true, horse: true, openSign: -1, wall: '#7a2a2a', boxCol: 0x3a1418, seatCols: ['#c4202e', '#d12a37', '#a8182a', '#e0453a'], roofCol: 0x3a2a28, pal: 1, palx: { steel: 0x8a3a2c, pil: 0x5a2a2a, conc: 0x3a2a2a, win: 0x8a5a4a } },
  ita: { name: 'Club Italia', rows: 12, xl: 0, gap: 0, ru: 0, dh: .58, du: .5, openX: -1, wall: '#b9b5a8', boxCol: 0x24305a, seatCols: ['#2a3f9a', '#3250b0', '#243a8a', '#f2c21a'], roofCol: 0x9a9680, pal: 2, palx: { steel: 0xb0ae98, pil: 0x8a8678, conc: 0x4a4a50, win: 0x7a7668 } },
  fas: { name: 'Fasano', rows: 8, xl: 0, gap: 0, ru: 0, dh: .5, du: .5, sep: true, horse: true, openSign: 1, arch: true, wall: '#ebe7dc', parquet: true, boxCol: 0x1b1f2a, seatCols: ['#1f3f9a', '#f2f0e8', '#1f3f9a', '#f2f0e8', '#2a4fb0'], roofCol: 0x6b4426, pal: 1, palx: { steel: 0x8a5a34, pil: 0xcbbf9e, conc: 0x3a3a40, win: 0xd8d2c0 } },
  alt: { name: 'Altamura', rows: 8, xl: 0, gap: 0, ru: 0, dh: .5, du: .5, ends: false, trap: -.9, wall: '#e3d6a4', boxCol: 0x6b6f70, seatCols: ['#8d9293', '#9ca1a0', '#80868a', '#a5aaa8'], roofCol: 0xd9d2bc, arch: true, pal: 2, palx: { steel: 0x8a8a8a, pil: 0xcfc4a0, conc: 0x55575a, win: 0xe8e0c0 } },
  bre: { name: 'Brescia', rows: 5, xl: 0, gap: 1, ru: 4, dh: .45, du: .55, sep: true, zd: 2, zRaise: 1.5, uz: true, pal: 0 },
  cos: { name: 'Costa Volpino', rows: 9, xl: 0, gap: 1, ru: 5, dh: .5, du: .6, ends: false, openX: -1, wall: '#b9b5a8', roofCol: 0x2c2a2a, pal: 2, palx: { steel: 0x6a6a70, pil: 0x8a8678, conc: 0x4a4a50, win: 0x7a7668 } },
  pad: { name: 'Padova', rows: 9, xl: 0, gap: 1, ru: 5, dh: .5, du: .6, ends: false, openX: -1, wall: '#9fd3e6', roofCol: 0x2c2a2a, pal: 2, palx: { steel: 0x6a6a70, pil: 0x7fb8cc, conc: 0x4a4a50, win: 0x8fc4d8 } },
  off: { name: 'Offanengo', rows: 5, xl: 0, gap: 0, ru: 0, dh: .5, du: .5, sep: true, sepK: .8, wall: '#c9972e', boxCol: 0x2e4a24, seatCols: ['#3f8f3a', '#4aa043', '#357f32', '#56ad4c'], roofCol: 0x6b4c1a, pal: 1, palx: { steel: 0x9a6a20, pil: 0xb88a2c, conc: 0x5a4418, win: 0xd8b050 } },
  con: { name: 'Conegliano', xl: 2, gap: 1, ru: 4, dh: .45, du: .55, boxCol: 0x1e4a34, seatCols: ['#2f9a52', '#3aa85c', '#27874a', '#4bb36a'], roofCol: 0x0c1612, pal: 0, palx: { steel: 0x2c5a40, pil: 0x1a2a22, conc: 0x24302a, win: 0x35503f } },
  bus: { name: 'Busto Arsizio', xl: 2, gap: 1, ru: 5, dh: .5, du: .6, horse: true, openSign: 1, wall: '#34343a', stripe: '#c4202e', boxCol: 0x4a1a1e, seatCols: ['#c4202e', '#d12a37', '#a8182a', '#e0453a', '#b01e2a'], roofCol: 0x3a2418, pal: 1, palx: { steel: 0x7a4a2c, pil: 0x3a2a2a, conc: 0x2a2024, win: 0x6a4a3a } },
  ber: { name: 'Bergamo', xl: 1, gap: 2, ru: 4, dh: .45, du: .55, sepEnd: 1, pal: 0 },
  per: { name: 'Perugia', xl: 1, gap: 2, ru: 4, dh: .45, du: .55, sepEnd: 1, sepEndK: .8, boxCol: 0x4a1a1e, seatCols: ['#c4202e', '#d12a37', '#a8182a', '#e0453a', '#b01e2a'], pal: 0, palx: { conc: 0x2a1c22, glow: 0xffd0c8 } },
  val: { name: 'Vallefoglia', rows: 8, xl: -3, gap: 0, ru: 0, dh: .45, du: .5, sep: true, sepK: .72, pal: 2 },
  fir: { name: 'Firenze', xl: 3, gap: 1, ru: 3, dh: .5, du: .6, sep: true, zd: -2, boxCol: 0x262a30, seatCols: ['#e53935', '#1e88e5', '#43a047', '#fb8c00', '#8e24aa', '#fdd835', '#00acc1', '#ec407a'], roofCol: 0x2c2f35, pal: 2, palx: { steel: 0xa8aeb8, pil: 0x6a6e74, conc: 0x50545a, win: 0x70747a } },
  cun: { name: 'Cuneo', xl: 2, gap: 1, ru: 5, dh: .5, du: .6, round: true, duct: true, roofCol: 0x4a2e1e, pal: 1, palx: { steel: 0x7a4a2c, pil: 0x3a281c, conc: 0x2a2420, win: 0x5a4a38, glow: 0xffe2b0 } },
  mac: { name: 'Macerata', xl: 0, gap: 1, ru: 3, dh: .5, du: .6, openX: -1, wall: '#c9c4ba', banners: true, roofCol: 0x2a1c14, pal: 1, palx: { steel: 0x7a4a2c, pil: 0x6a6258, conc: 0x3a342c, win: 0x6a5a48 } },
  tal: { name: 'Talmassons', rows: 9, xl: -1, gap: 0, ru: 0, dh: .5, du: .5, openX: -1, sep: true, wall: '#9b9b97', banners: true, roofCol: 0x3a2a28, pal: 2, palx: { steel: 0x8a2e26, pil: 0x7c7c78, conc: 0x55555a, win: 0x70706c } },
  mar: { name: 'Marignano', rows: 9, xl: -3, gap: 0, ru: 0, dh: .42, du: .5, ends: false, wall: '#d7c48e', stripe: '#2f6fb3', roofCol: 0x9a8a70, pal: 2, palx: { steel: 0xa8322a, pil: 0xb5a070, conc: 0x6a6a70, win: 0xc9b98a } },
  mel: { name: 'Melendugno', xpUpper: 4, xpRaise: 3.0, cornerWalk: true, rows: 7, gap: 1, ru: 3, sep: true, sepK: 1, boxCol: 0x16224a, seatCols: ['#2a5fd0', '#3a72e0', '#1f4cb0', '#4a84ee', '#2a5fd0'], crew: [[10.7, 6.0, -Math.PI / 2], [10.8, 7.1, -Math.PI / 2 - .2]], drummer: { x: -12.65, y: 1.0, z: 8.2 }, xl: 0, dh: .5, du: .55, horse: true, arch: true, openSign: 1, wall: '#5e0f20', windows: true, push: { xp: 2.3, zm: 1.4 }, pal: 0 }
};
function s3ArenaVariant(M) {
  { const q0 = new URLSearchParams(location.search).get('round'); if (q0 !== null) return Object.assign({ pal: +q0 % 3 }, S3_ROUND[+q0 % S3_ROUND.length]); }
  if (M && M.home && S3_ROUND_CLUB[M.home.id] !== undefined) return Object.assign({ pal: S3_ROUND_CLUB[M.home.id][1] }, S3_ROUND[S3_ROUND_CLUB[M.home.id][0]]);
  if (M && M.home && S3_CUSTOM[M.home.id]) return Object.assign({}, S3_CUSTOM[M.home.id]);
  let rnd = false; try { rnd = localStorage.getItem('vm-arena') === 'rnd'; } catch (e) { }
  const q = new URLSearchParams(location.search).get('arena'), h = Gx.hash(String((M.home && M.home.id) || 'x') + 'forma') >>> 0;
  const FM = (!q && !rnd && M.home && s3IsA3(M.home.id)) ? S3_SMALL : S3_FORMS;
  const NF = FM.length, f = q !== null ? +q % NF : rnd ? Math.floor(Math.random() * NF) : h % NF, p = q !== null ? Math.floor(+q / NF) % 3 : rnd ? Math.floor(Math.random() * 3) : (h >>> 4) % 3;
  return Object.assign({ pal: p }, FM[f]);
}
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
  if (cr.drum) { const hit = 9 + ex * 3; cr.drum.arms.forEach((a, k) => { a.rotation.x = -1.15 + Math.sin(time * hit + k * Math.PI) * .38; }); cr.drum.g.position.y = cr.drum.y0 + Math.max(0, Math.sin(time * hit * .5)) * .015; }
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

/* tifosa con il tamburo (anima le braccia ogni frame) */
function s3Drummer(S, scene, d, kit) {
  const g = new THREE.Group(), L = c => new THREE.MeshLambertMaterial({ color: c }), B = new THREE.BoxGeometry(1, 1, 1);
  const bx = (w, h, dd, x, y, z, m, par) => { const o = new THREE.Mesh(B, m); o.scale.set(w, h, dd); o.position.set(x, y, z); (par || g).add(o); return o; };
  bx(.13, .8, .15, -.1, .4, 0, L(0x1f2a44)); bx(.13, .8, .15, .1, .4, 0, L(0x1f2a44));
  bx(.36, .55, .21, 0, 1.07, 0, L(kit)); bx(.2, .06, .2, 0, 1.38, 0, L(0xe8c3a4));
  const head = new THREE.Mesh(new THREE.SphereGeometry(.12, 12, 10), L(0xe8c3a4)); head.position.set(0, 1.55, .01); g.add(head);
  bx(.25, .17, .24, 0, 1.6, -.03, L(0x2a1a12)); bx(.07, .3, .07, 0, 1.42, -.17, L(0x2a1a12));
  const drum = new THREE.Mesh(new THREE.CylinderGeometry(.25, .25, .3, 20), L(0xb3202e)); drum.position.set(0, .88, .3); drum.rotation.x = -.35; g.add(drum);
  const skin = new THREE.Mesh(new THREE.CylinderGeometry(.235, .235, .02, 20), L(0xf4f4ee)); skin.position.set(0, .13, 0); drum.add(skin);
  const arms = [];
  for (const sg of [-1, 1]) {
    const piv = new THREE.Group(); piv.position.set(sg * .22, 1.3, 0); g.add(piv);
    bx(.09, .5, .09, 0, -.25, 0, L(0xe8c3a4), piv); bx(.02, .32, .02, 0, -.5, .1, L(0xf0e6c8), piv).rotation.x = .9; arms.push(piv);
  }
  g.position.set(d.x, d.y, d.z); g.rotation.y = Math.PI / 2; scene.add(g);
  S.crowd.drum = { arms, g, y0: d.y };
}

/* persona in felpa nera (staff a bordo campo) */
function s3Person(scene, x, z, yaw, hood) {
  const g = new THREE.Group(), L = c => new THREE.MeshLambertMaterial({ color: c }), B = new THREE.BoxGeometry(1, 1, 1);
  const bx = (w, h, dd, px, py, pz, m) => { const o = new THREE.Mesh(B, m); o.scale.set(w, h, dd); o.position.set(px, py, pz); g.add(o); return o; };
  const hd = L(hood || 0x121216);
  bx(.14, .85, .16, -.1, .43, 0, L(0x1d2230)); bx(.14, .85, .16, .1, .43, 0, L(0x1d2230));
  bx(.4, .6, .24, 0, 1.15, 0, hd); bx(.1, .56, .12, -.26, 1.12, 0, hd); bx(.1, .56, .12, .26, 1.12, 0, hd); bx(.3, .12, .2, 0, 1.5, -.1, hd);
  const hh = new THREE.Mesh(new THREE.SphereGeometry(.12, 12, 10), L(0xe2b894)); hh.position.set(0, 1.62, .02); g.add(hh);
  bx(.24, .1, .24, 0, 1.7, -.02, L(0x2a1d14));
  g.position.set(x, 0, z); g.rotation.y = yaw; scene.add(g); return g;
}

/* ---------- struttura del palazzetto ---------- */
function s3RichArena(S, scene, c) {
  const OF = c.OFF || { xp: 0, xm: 0, zp: 0, zm: 0 }, { TH, kit, xW, zW, END0, SIDE0, endSpan, stepD, seats, rowsEnd, rowsSide } = c, R = Gx.rng(Gx.hash('rich-arena')), BOX = new THREE.BoxGeometry(1, 1, 1);
  const PAL = c.pal || S3_PAL[0], steel = new THREE.MeshLambertMaterial({ color: PAL.steel }), dark = new THREE.MeshLambertMaterial({ color: 0x0c1220 });
  const beam = (a, b, t) => { const d = b.clone().sub(a), len = d.length(), q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()); return { g: BOX, m: new THREE.Matrix4().compose(a.clone().add(b).multiplyScalar(.5), q, new THREE.Vector3(t, len, t)) }; };
  const V = (x, y, z) => new THREE.Vector3(x, y, z), add = (g, m) => { const o = new THREE.Mesh(g, m); scene.add(o); return o; };

  if (c.drummer) s3Drummer(S, scene, c.drummer, kit.main);
  /* seggiolini a istanze */
  const seatG = s3Merge([{ g: BOX, m: s3M4(0, .03, .02, .42, .06, .38) }, { g: BOX, m: s3M4(0, .3, -.19, .42, .5, .05) }]);
  const seatM = new THREE.InstancedMesh(seatG, new THREE.MeshLambertMaterial({ color: 0xffffff }), Math.max(1, seats.length)), mtx = new THREE.Matrix4(), q = new THREE.Quaternion(), up = V(0, 1, 0), col = new THREE.Color();
  const sc = [kit.main, Gx.dark(kit.main, .6), Gx.light(kit.main, .35), '#1d2a44'];
  seats.forEach((s, i) => { q.setFromAxisAngle(up, s.yaw); mtx.compose(V(s.x, s.y, s.z), q, V(1, 1, 1)); seatM.setMatrixAt(i, mtx); const k = (Math.floor(s.a / 3.4) + s.r) % 7; seatM.setColorAt(i, c.seatCols ? col.set(c.seatCols[(s.r * 5 + Math.floor(s.a * 2.3) + (k === 3 ? 3 : 0)) % c.seatCols.length]) : col.set(k === 0 ? sc[2] : k === 3 ? sc[3] : sc[(s.r + Math.floor(s.a * .25)) % 2])); });
  seatM.frustumCulled = false; scene.add(seatM);

  /* parapetti trasparenti davanti ai gradoni */
  const glass = new THREE.MeshLambertMaterial({ color: 0x9fc4e6, transparent: true, opacity: .16, depthWrite: false }), rail = new THREE.MeshLambertMaterial({ color: 0xcfd6e2 });
  for (const s of c.round ? [] : [-1, 1]) {
    if (!(c.open && s === c.openSign) && !c.noEnd) { add(new THREE.BoxGeometry(endSpan, .8, .04), glass).position.set(0, .9, s * (END0 + OF[s > 0 ? 'zp' : 'zm'] - .22)); add(new THREE.BoxGeometry(endSpan, .05, .09), rail).position.set(0, 1.32, s * (END0 + OF[s > 0 ? 'zp' : 'zm'] - .22)); }
    if (c.openX !== s) { add(new THREE.BoxGeometry(.04, .8, 2 * END0 - 1), glass).position.set(s * (SIDE0 + OF[s > 0 ? 'xp' : 'xm'] - .22), .9, 0); add(new THREE.BoxGeometry(.09, .05, 2 * END0 - 1), rail).position.set(s * (SIDE0 + OF[s > 0 ? 'xp' : 'xm'] - .22), 1.32, 0); }
  }
  /* anello superiore: parapetti e fascia luminosa al bordo di ogni settore */
  if (c.RU && !c.round) {
    const glow = new THREE.MeshBasicMaterial({ color: PAL.glow });
    for (const s of [-1, 1]) {
      const zl = END0 + c.rEL * stepD, zu = END0 + (c.rEL + c.GAP) * stepD, xl = SIDE0 + c.rSL * stepD, xu = SIDE0 + (c.rSL + c.GAP) * stepD, yu = c.hTopE + 1.8 + .5, ys = c.hTopS + 1.8 + .5;
      add(new THREE.BoxGeometry(2 * (SIDE0 + c.rEL * stepD), .8, .04), glass).position.set(0, c.hTopE + .9, s * (zl - .1)); add(new THREE.BoxGeometry(2 * (SIDE0 + c.rEL * stepD), .05, .09), rail).position.set(0, c.hTopE + 1.32, s * (zl - .1));
      add(new THREE.BoxGeometry(.04, .8, 2 * (END0 + c.rSL * stepD)), glass).position.set(s * (xl - .1), c.hTopS + .9, 0); add(new THREE.BoxGeometry(.09, .05, 2 * (END0 + c.rSL * stepD)), rail).position.set(s * (xl - .1), c.hTopS + 1.32, 0);
      add(new THREE.BoxGeometry(2 * (SIDE0 + (c.rEL + c.GAP) * stepD), .1, .12), glow).position.set(0, yu - .05, s * (zu + .02)); add(new THREE.BoxGeometry(.12, .1, 2 * (END0 + (c.rSL + c.GAP) * stepD)), glow).position.set(s * (xu + .02), ys - .05, 0);
    }
  }
  /* le pareti dal lato della camera (x+ per la laterale, z+ per le altre) nascondono i propri dettagli: la camera sta oltre il muro */
  const W = S.richWall = { xp: [], xm: [], zp: [], zm: [], cc: [] }, keyZ = s => s > 0 ? 'zp' : 'zm', keyX = s => s > 0 ? 'xp' : 'xm';
  const wadd = (key, obj) => { W[key].push(obj); return obj; };
  const grp = (list, mat) => { const by = {}; for (const [k, it] of list) (by[k] = by[k] || []).push(it); for (const k in by) wadd(k, add(s3Merge(by[k]), mat)); };
  /* pilastri a parete, fascia LED, finestre alte */
  const pil = []; for (let x = -xW + 1; x <= xW - .9; x += 3.4) for (const s of [-1, 1]) pil.push([keyZ(s), { g: BOX, m: s3M4(x, 12, s * (zW - .25), .5, 24, .5) }]);
  for (let z = -zW + 1; z <= zW - .9; z += 3.4) for (const s of [-1, 1]) pil.push([keyX(s), { g: BOX, m: s3M4(s * (xW - .25), 12, z, .5, 24, .5) }]);
  grp(pil, new THREE.MeshLambertMaterial({ color: PAL.pil }));
  const win = []; for (let x = -xW + 2; x <= xW - 2; x += 3.4) for (const s of [-1, 1]) win.push([keyZ(s), { g: BOX, m: s3M4(x + 1.7, 17.5, s * (zW - .15), 2.2, 2.4, .05) }]);
  for (let z = -zW + 2; z <= zW - 2; z += 3.4) for (const s of [-1, 1]) win.push([keyX(s), { g: BOX, m: s3M4(s * (xW - .15), 17.5, z + 1.7, .05, 2.4, 2.2) }]);
  grp(win, new THREE.MeshBasicMaterial({ color: PAL.win }));
  /* portali con insegna USCITA */
  const exitTex = s3Tex(128, 32, (cx, w, h) => { cx.fillStyle = '#0c6b3a'; cx.fillRect(0, 0, w, h); cx.fillStyle = '#e8fff0'; cx.font = '700 22px Arial'; cx.textAlign = 'center'; cx.textBaseline = 'middle'; cx.fillText('USCITA', w / 2, h / 2 + 1); });
  const frameM = new THREE.MeshBasicMaterial({ color: 0x20314f }), holeM = new THREE.MeshBasicMaterial({ color: 0x02040a }), signM = new THREE.MeshBasicMaterial({ map: exitTex });
  const portal = (x, z, ry, key) => { const g = new THREE.Group(); const fr = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 4.4), frameM), ho = new THREE.Mesh(new THREE.PlaneGeometry(3.1, 4), holeM), sg = new THREE.Mesh(new THREE.PlaneGeometry(1.4, .35), signM); ho.position.z = .01; sg.position.set(0, 2.6, .02); g.add(fr, ho, sg); g.position.set(x, (c.topH || 4) + 3.4, z); g.rotation.y = ry; scene.add(g); W[key].push(g); };
  for (const x of [-8, 0, 8]) for (const s of [-1, 1]) portal(x, s * (zW - .32), s > 0 ? Math.PI : 0, keyZ(s));
  for (const z of [-8, 0, 8]) for (const s of [-1, 1]) portal(s * (xW - .32), z, s > 0 ? -Math.PI / 2 : Math.PI / 2, keyX(s));

  /* capriate del tetto, arcarecci e colonne */
  const rY = S.roofY || (() => 23.6), tr = [], L = xW; for (let i = -4; i <= 4; i++) {
    const z = i * 3.3, n = Math.ceil(2 * L / 1.4), dx = 2 * L / n;
    for (let k = 0; k < n; k++) {
      const x0 = -L + k * dx, x1 = x0 + dx, t0 = rY(x0), t1 = rY(x1);
      tr.push(beam(V(x0, t0, z), V(x1, t1, z), .16), beam(V(x0, t0 - .9, z), V(x1, t1 - .9, z), .12), k % 2 ? beam(V(x0, t0, z), V(x1, t1 - .9, z), .07) : beam(V(x0, t0 - .9, z), V(x1, t1, z), .07));
    }
  }
  for (let x = -xW + 2; x <= xW - 2; x += 4.2) tr.push(beam(V(x, rY(x) + .25, -zW), V(x, rY(x) + .25, zW), .1));
  add(s3Merge(tr), steel);
  const cols = []; for (const x of [-xW + .6, xW - .6]) for (const z of [-zW + .6, zW - .6, 0]) cols.push([x > 0 && z > 0 ? 'cc' : z === 0 ? keyX(x) : x > 0 ? keyX(x) : keyZ(z), beam(V(x, 0, z), V(x, rY(x), z), .55)]);
  grp(cols, steel);
  const lite = []; for (let i = -4; i <= 4; i++) for (let x = -L + 2; x < L - 1; x += 4.4) lite.push({ g: BOX, m: s3M4(x, rY(x) - 1.15, i * 3.3, .5, .14, .28) });
  add(s3Merge(lite), new THREE.MeshBasicMaterial({ color: 0xfff1d6 }));

  if (c.duct) { const d = new THREE.Mesh(new THREE.TorusGeometry(15, .9, 10, 48), new THREE.MeshLambertMaterial({ color: 0x2f9a5c })); d.rotation.x = Math.PI / 2; d.scale.set(1, 1.28, 1); d.position.y = 20.4; scene.add(d); }
  if (c.arches) {   /* corridoio dietro gli archi: parete scura, pavimento chiaro e luci calde */
    const sg = c.arches, zc = sg * (END0 + 1.7 + 4.5), bk = new THREE.Mesh(new THREE.PlaneGeometry(2 * xW, 14), new THREE.MeshLambertMaterial({ color: 0x1a1618 }));
    bk.position.set(0, 7, zc); bk.rotation.y = sg > 0 ? Math.PI : 0; scene.add(bk);
    const fl = new THREE.Mesh(new THREE.PlaneGeometry(2 * xW, 4.6), new THREE.MeshLambertMaterial({ color: 0x6a5a48 })); fl.rotation.x = -Math.PI / 2; fl.position.set(0, .02, sg * (END0 + 1.7 + 2.3)); scene.add(fl);
    const lm = new THREE.MeshBasicMaterial({ color: 0xffd9a0 }); for (let x = -xW + 3; x < xW - 2; x += 5.5) { const l = new THREE.Mesh(new THREE.BoxGeometry(.5, .5, .2), lm); l.position.set(x, 6.6, sg * (END0 + 1.7 + 4.3)); scene.add(l); }
  }
  if (c.gallery) {   /* balconate che si affacciano sul campo: solette, parapetti in vetro, pilastri e retro scuro */
    const sg = c.gallery, wx = sg * (SIDE0 + 2.6), len = 2 * END0 + 6, slabM = new THREE.MeshLambertMaterial({ color: 0xcfd2d4 }), pilM = new THREE.MeshLambertMaterial({ color: 0x8a8d92 }), backM = new THREE.MeshLambertMaterial({ color: 0x16191e }), floorM = new THREE.MeshLambertMaterial({ color: 0x4a4540 });
    const D = 3.4, parts = [], gl = [], rl = [], pl = [], fl = [];
    for (const y of [4.2, 8.4]) {
      const cx = wx - sg * D / 2;
      parts.push({ g: BOX, m: s3M4(cx, y, 0, D, .35, len) });                      /* soletta */
      fl.push({ g: BOX, m: s3M4(cx, y + .19, 0, D - .2, .03, len - .4) });         /* pavimento corridoio */
      gl.push({ g: BOX, m: s3M4(wx - sg * (D - .05), y + .75, 0, .04, 1.0, len) }); /* parapetto in vetro */
      rl.push({ g: BOX, m: s3M4(wx - sg * (D - .05), y + 1.27, 0, .09, .06, len) });
      for (let z = -len / 2 + 1; z <= len / 2 - .9; z += 3.6) pl.push({ g: BOX, m: s3M4(wx - sg * (D - .2), y - 2.1, z, .35, 4.2, .35) });
      for (let z = -len / 2 + 1; z <= len / 2 - .9; z += 3.6) pl.push({ g: BOX, m: s3M4(wx - sg * .08, y + 2, z, .18, 3.8, .3) });
    }
    add(s3Merge(parts), slabM); add(s3Merge(fl), floorM); add(s3Merge(pl), pilM); add(s3Merge(rl), new THREE.MeshLambertMaterial({ color: 0xd9dde0 }));
    add(s3Merge(gl), new THREE.MeshLambertMaterial({ color: 0x9fc4e6, transparent: true, opacity: .22, depthWrite: false }));
    for (const y of [4.2, 8.4]) { const bk = new THREE.Mesh(new THREE.PlaneGeometry(len, 3.4), backM); bk.position.set(wx - sg * .05, y + 1.9, 0); bk.rotation.y = sg > 0 ? -Math.PI / 2 : Math.PI / 2; scene.add(bk); }
  }
  if (c.crew) { for (const p of c.crew) s3Person(scene, p[0], p[1], p[2]); }
  /* telecamere TV e steward dietro i cartelloni */
  const camG = (x, z, ry) => { const g = new THREE.Group(), leg = new THREE.MeshLambertMaterial({ color: 0x141a28 }); for (const a of [0, 2.1, 4.2]) { const l = new THREE.Mesh(new THREE.CylinderGeometry(.015, .02, 1.3, 5), leg); l.position.set(Math.cos(a) * .22, .65, Math.sin(a) * .22); l.rotation.set(Math.sin(a) * .18, 0, -Math.cos(a) * .18); g.add(l); } const body = new THREE.Mesh(new THREE.BoxGeometry(.32, .28, .6), leg); body.position.set(0, 1.45, 0); const lens = new THREE.Mesh(new THREE.CylinderGeometry(.09, .1, .36, 10), new THREE.MeshLambertMaterial({ color: 0x0a0e18 })); lens.rotation.x = Math.PI / 2; lens.position.set(0, 1.45, .46); const lamp = new THREE.Mesh(new THREE.SphereGeometry(.03, 6, 4), new THREE.MeshBasicMaterial({ color: 0xff2a2a })); lamp.position.set(0, 1.62, -.2); g.add(body, lens, lamp); g.position.set(x, 0, z); g.rotation.y = ry; scene.add(g); };
  if (c.crew) camG(10.7, 9.6, -Math.PI / 2); camG(-3.2, 13.2, Math.PI); camG(3.4, -13.2, 0); camG(-10.7, 6, Math.PI / 2); camG(10.7, -4, -Math.PI / 2);
  S.richStewards = [[-8, 13.4], [0, 13.4], [8, 13.4], [-8, -13.4], [0, -13.4], [8, -13.4], [-10.9, -8], [-10.9, 8], [10.9, -8], [10.9, 8]];
}

/* ---------- impostazione dal menu ---------- */
document.addEventListener('click', e => {
  const el2 = e.target.closest('[data-arena]');
  if (el2) { let r = false; try { r = localStorage.getItem('vm-arena') === 'rnd'; localStorage.setItem('vm-arena', r ? 'club' : 'rnd'); } catch (x) { } if (typeof toast === 'function') toast(r ? 'Ogni club avra\' il proprio palazzetto.' : 'Palazzetto casuale a ogni partita.'); if (typeof render === 'function') render(); return; }
  const el = e.target.closest('[data-gfx]'); if (!el) return;
  let hi = s3Hi(); try { localStorage.setItem('vm-gfx', hi ? 'lo' : 'hi'); } catch (x) { }
  if (typeof toast === 'function') toast(hi ? 'Palazzetto standard: dalla prossima partita.' : 'Palazzetto ad alto dettaglio: dalla prossima partita.');
  if (typeof render === 'function') render();
});
(function () {
  const _h = homeHTML;
  homeHTML = function () { const h = _h.apply(this, arguments); return h + `<p style="text-align:center;margin:10px 0 0"><button class="btn" data-gfx="1">Palazzetto 3D: ${s3Hi() ? 'Alta definizione' : 'Standard'}</button>${s3Hi() ? ` <button class="btn" data-arena="1">Forma: ${s3Rnd() ? 'casuale' : 'per club'}</button>` : ''}</p>`; };
})();
