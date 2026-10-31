/* Modello 3D con scheletro per le atlete (opzionale: attivo con ?sk=1 oppure localStorage vm-sk=1; se non si carica, restano le figure classiche).
   Modello: "Sporty Girl _Rigged_ Free." di NABEEL619 (https://sketchfab.com/NABEEL619), licenza CC-BY-4.0 (http://creativecommons.org/licenses/by/4.0/)
   Le pose arrivano da s3Pose(): posizioni di anca, ginocchia, caviglie, spalle, gomiti, polsi e testa vengono convertite in rotazioni delle ossa. */
const SK = { url: 'vendor/models/sporty_girl/scene.gltf', state: 'idle', gltf: null, bind: null };
/* attivo di default; ?sk=0 (o localStorage vm-sk=0) lo spegne, ?sk=1 lo forza anche se il dispositivo e' lento */
function skEnabled() { const q = location.search; if (/[?&]sk=0/.test(q)) return false; if (/[?&]sk=1/.test(q)) return true; try { return localStorage.getItem('vm-sk') !== '0'; } catch (e) { return true; } }
const skForced = () => /[?&]sk=1/.test(location.search);
const skBase = n => String(n).replace(/_\d+$/, '');
function skBones(root) { const m = {}; root.traverse(o => { if (o.isBone) m[skBase(o.name)] = o; }); return m; }

function skLoad() {
  if (SK.state !== 'idle' || !skEnabled() || !THREE.GLTFLoader) return;
  SK.state = 'loading';
  new THREE.GLTFLoader().load(SK.url, g => {
    try {
      g.scene.updateMatrixWorld(true); const B = skBones(g.scene), bind = { q: {}, p: {}, dir: {} }, Q = THREE.Quaternion, V = THREE.Vector3;
      for (const n in B) { const q = new Q(), p = new V(); B[n].matrixWorld.decompose(p, q, new V()); bind.q[n] = q; bind.p[n] = p; }
      const d = (a, b) => bind.dir[a] = bind.p[b].clone().sub(bind.p[a]).normalize();
      d('LeftArm', 'LeftForeArm'); d('RightArm', 'RightForeArm'); d('LeftForeArm', 'LeftHand'); d('RightForeArm', 'RightHand'); d('LeftHand', 'LeftHandMiddle1'); d('RightHand', 'RightHandMiddle1');
      d('LeftUpLeg', 'LeftLeg'); d('RightUpLeg', 'RightLeg'); d('LeftLeg', 'LeftFoot'); d('RightLeg', 'RightFoot'); d('LeftFoot', 'LeftToeBase'); d('RightFoot', 'RightToeBase');
      bind.torso = bind.p.Neck.clone().sub(bind.p.Hips).normalize(); bind.head = bind.p.HeadTop_End.clone().sub(bind.p.Neck).normalize();
      bind.mHead = B.Head.matrixWorld.clone();
      bind.hipsParentInv = B.Hips.parent.matrixWorld.clone().invert();
      bind.len = {}; for (const n of ['LeftForeArm', 'LeftHand', 'RightForeArm', 'RightHand', 'LeftLeg', 'LeftFoot', 'RightLeg', 'RightFoot']) bind.len[n] = B[n].position.length();
      try { const im = g.scene.getObjectByProperty('type', 'SkinnedMesh'); let tone = [.88, .67, .55]; g.scene.traverse(o => { if (o.isMesh && o.material.name === 'Wolf3D_Body' && o.material.map && o.material.map.image) { const c = document.createElement('canvas'); c.width = c.height = 1; const x = c.getContext('2d'); x.drawImage(o.material.map.image, 0, 0, 1, 1); const d = x.getImageData(0, 0, 1, 1).data; tone = [d[0] / 255, d[1] / 255, d[2] / 255]; } }); bind.tone = tone; } catch (e) { bind.tone = [.88, .67, .55]; }
      SK.bind = bind; SK.gltf = g; SK.state = 'ready';
    } catch (e) { SK.state = 'error'; console.warn('Modello atleta non utilizzabile', e); }
  }, undefined, e => { SK.state = 'error'; console.warn('Modello atleta non caricato', e); });
}

/* aggiunge il modello a una atleta e nasconde le parti della figura classica */
function skAttach(rig) {
  if (rig.sk || SK.off || SK.state !== 'ready') return;
  const root = THREE.SkeletonUtils.clone(SK.gltf.scene);
  root.traverse(o => { if (o.isMesh) { o.castShadow = true; o.frustumCulled = false; } });
  const mats = {}; root.traverse(o => { if (o.isMesh) { const n = o.material.name; o.material = mats[n] || (mats[n] = skMat(o.material, rig)); } });
  rig.g.add(root);
  { const head = skBones(root).Head, H = skHairStyle(rig), inv = SK.bind.mHead.clone().invert(), qi = SK.bind.q.Head.clone().invert();
    if (head && H.parts.length) { const hm = new THREE.MeshStandardMaterial({ color: rig.look.hair, roughness: .6 }); SK.hairGeo = SK.hairGeo || new THREE.SphereGeometry(1, 14, 10);
      for (const q of H.parts) { const o = new THREE.Mesh(SK.hairGeo, hm); o.position.set(...q.c).applyMatrix4(inv); o.quaternion.copy(qi); if (q.rx) o.rotateX(q.rx); o.scale.set(...q.s); o.castShadow = true; head.add(o); } } }
  /* numeri di maglia attaccati al busto (ossa della schiena): seguono la rotazione e stanno sulla superficie della maglia */
  const ch = skBones(root).Spine2; if (ch && rig.parts.num) { ch.add(rig.parts.num, rig.parts.numF); rig.parts.num.position.set(0, -.09, -.102); rig.parts.num.rotation.set(0, Math.PI, 0); rig.parts.numF.position.set(-.075, -.05, .153); rig.parts.numF.rotation.set(0, 0, 0);
    /* stemma della squadra sul petto, a destra guardando la giocatrice di fronte */
    if (rig.team) { const cm = new THREE.Mesh(SK.crestGeo || (SK.crestGeo = new THREE.PlaneGeometry(.12, .12)), new THREE.MeshBasicMaterial({ map: skCrestTex(rig.team), transparent: true })); cm.position.set(.08, -.035, .154); ch.add(cm); } }
  for (const n in rig.parts) if (n !== 'num' && n !== 'numF') rig.parts[n].visible = false;
  rig.sk = { root, B: skBones(root) };
}

/* due ossa con lunghezze l1 e l2: dato spalla/anca S, bersaglio W e direzione del gomito/ginocchio (polo), ritorna [giunto, estremo] */
function skIK(S, W, pole, l1, l2) {
  const V = THREE.Vector3, to = W.clone().sub(S); let d = to.length(); const dir = d > 1e-6 ? to.clone().divideScalar(d) : new V(0, -1, 0);
  d = Math.min(d, l1 + l2 - 1e-3);
  const a = (l1 * l1 - l2 * l2 + d * d) / (2 * d), h = Math.sqrt(Math.max(0, l1 * l1 - a * a));
  const pv = pole.clone().sub(S); pv.addScaledVector(dir, -pv.dot(dir));
  if (pv.lengthSq() < 1e-8) pv.set(0, 0, 1).addScaledVector(dir, -dir.z);
  pv.normalize();
  const E = S.clone().addScaledVector(dir, a).addScaledVector(pv, h);
  return [E, S.clone().addScaledVector(dir, d)];
}

function skPose(rig, J) {
  const R = rig.sk, B = R.B, bind = SK.bind, V = THREE.Vector3, Q = THREE.Quaternion, root = R.root, I = new Q();
  const Qw = {}, Pw = {};
  const wq = b => { if (b === root || !b) return I; if (Qw[b.id]) return Qw[b.id]; return Qw[b.id] = wq(b.parent).clone().multiply(b.quaternion); };
  const pw = b => { if (Pw[b.id]) return Pw[b.id]; const par = b.parent; return Pw[b.id] = pw(par).clone().add(b.position.clone().applyQuaternion(wq(par))); };
  const drive = (b, qd) => { const pq = wq(b.parent); b.quaternion.copy(pq.clone().invert().multiply(qd)); Qw[b.id] = qd.clone(); };
  const aim = (n, target) => new Q().setFromUnitVectors(bind.dir[n], target.clone().normalize()).multiply(bind.q[n]);
  /* anca: l'altezza segue la posa; se le gambe non arrivano a terra il bacino si abbassa */
  const off = bind.p.Hips.clone().sub(bind.p.LeftUpLeg.clone().add(bind.p.RightUpLeg).multiplyScalar(.5));
  const hipsT = J.hipC.clone().add(off);
  { const hq = wq(B.Hips); let need = 0;
    for (const L of J.legs) { const side = L.sx < 0 ? 'Right' : 'Left', S = hipsT.clone().add(B[side + 'UpLeg'].position.clone().applyQuaternion(hq)), A = new V(L.ft.x, L.ft.y + .055, L.ft.z), reach = bind.len[side + 'Leg'] + bind.len[side + 'Foot'] - .004; need = Math.max(need, S.distanceTo(A) - reach); }
    hipsT.y -= need; }
  B.Hips.position.copy(hipsT).applyMatrix4(bind.hipsParentInv); Pw[B.Hips.id] = hipsT.clone(); Qw[B.Hips.id] = wq(B.Hips).clone();
  /* busto: la rotazione si distribuisce sulle tre vertebre; collo e testa */
  const Qt = new Q().setFromUnitVectors(bind.torso, J.shC.clone().sub(J.hipC).normalize());
  ['Spine', 'Spine1', 'Spine2'].forEach((n, i) => drive(B[n], new Q().slerpQuaternions(I, Qt, (i + 1) / 3).multiply(bind.q[n])));
  const Qh = new Q().setFromUnitVectors(bind.head, J.hd.clone().sub(J.shC).normalize());
  drive(B.Neck, new Q().slerpQuaternions(I, Qh, .5).multiply(bind.q.Neck)); drive(B.Head, Qh.clone().multiply(bind.q.Head));
  /* braccia */
  for (const A of J.arms) {
    const s = A.sx > 0 ? 'Left' : 'Right', S = pw(B[s + 'Arm']), [E, W] = skIK(S, A.wr, A.el, bind.len[s + 'ForeArm'], bind.len[s + 'Hand']);
    drive(B[s + 'Arm'], aim(s + 'Arm', E.clone().sub(S))); drive(B[s + 'ForeArm'], aim(s + 'ForeArm', W.clone().sub(E))); drive(B[s + 'Hand'], aim(s + 'Hand', A.fdir));
  }
  /* gambe */
  for (const L of J.legs) {
    const s = L.sx < 0 ? 'Right' : 'Left', S = pw(B[s + 'UpLeg']), [K, F] = skIK(S, new V(L.ft.x, L.ft.y + .055, L.ft.z), L.kn, bind.len[s + 'Leg'], bind.len[s + 'Foot']);
    drive(B[s + 'UpLeg'], aim(s + 'UpLeg', K.clone().sub(S))); drive(B[s + 'Leg'], aim(s + 'Leg', F.clone().sub(K))); drive(B[s + 'Foot'], aim(s + 'Foot', new V(0, -.3, 1)));
  }
}

/* acconciature: cut = quota sotto la quale il caschetto del modello viene tagliato; poi codini, crocchia, treccia o lunghi, attaccati alla testa */
const SK_HAIR = [
  { cut: 1.585, parts: [{ c: [0, 1.56, -.125], s: [.034, .095, .034] }] },                          // coda bassa
  { cut: 1.60, parts: [{ c: [0, 1.775, -.04], s: [.055, .05, .055] }] },                             // crocchia
  { cut: 0, parts: [] },                                                                              // caschetto (resta quello del modello)
  { cut: 0, parts: [{ c: [0, 1.50, -.10], s: [.12, .19, .04] }] },                                   // lunghi sciolti
  { cut: 1.615, parts: [{ c: [0, 1.74, -.125], s: [.04, .11, .04], rx: .55 }] },                     // coda alta
  { cut: 1.575, parts: [{ c: [0, 1.50, -.125], s: [.036, .16, .036] }, { c: [0, 1.61, -.10], s: [.045, .03, .045] }] }   // coda lunga con elastico
];
function skHairStyle(rig) { return SK_HAIR[((rig.look && rig.look.style) || 0) % SK_HAIR.length]; }
/* materiali per atleta: divisa di squadra (maglia, pantaloncini corti, scarpe), pelle e capelli */
function skMat(base, rig) {
  const m = base.clone(), K = rig.K, look = rig.look, hh = rig.hh, n = base.name, flat = c => { m.map = null; m.metalnessMap = null; m.roughnessMap = null; m.metalness = 0; m.roughness = .85; m.color.set(c); };
  if (n === 'Wolf3D_Outfit_Top') flat(K.main);
  else if (n === 'Wolf3D_Outfit_Bottom') {
    flat(K.shorts); m.normalMap = null;
    /* il modello ha i leggings lunghi: sotto la coscia il tessuto diventa del colore della pelle, cosi' restano pantaloncini corti */
    const skinC = new THREE.Color(look.skin);
    m.onBeforeCompile = sh => {
      sh.uniforms.skinC = { value: skinC };
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying float vBY;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvBY = position.y;');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying float vBY;\nuniform vec3 skinC;').replace('#include <color_fragment>', '#include <color_fragment>\n if (vBY < .74) diffuseColor.rgb = skinC;');
    };
  }
  else if (n === 'Wolf3D_Outfit_Footwear') flat(['#f4f6fa', '#f4f6fa', '#1d2230', Gx.light(K.main, .72)][hh % 4]);
  else if (n === 'Wolf3D_Hair') {
    m.map = null; m.color.set(look.hair); const cut = skHairStyle(rig).cut;
    if (cut) m.onBeforeCompile = sh => {   /* capelli raccolti: del caschetto resta solo la calotta sopra le orecchie */
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying float vHY;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvHY = position.y;');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying float vHY;').replace('#include <color_fragment>', '#include <color_fragment>\n if (vHY < ' + cut.toFixed(3) + ') discard;');
    };
  }
  else if (n === 'Wolf3D_Body') { m.map = null; m.color.set(look.skin); }
  else if (n === 'Wolf3D_Skin') { const t = SK.bind.tone, c = new THREE.Color(look.skin); m.color.setRGB(Math.min(1.5, Math.max(.5, c.r / t[0])), Math.min(1.5, Math.max(.5, c.g / t[1])), Math.min(1.5, Math.max(.5, c.b / t[2]))); }
  return m;
}

/* se il dispositivo e' lento, torna alle figure classiche (non succede con ?sk=1) */
function skPerf(M, dt) {
  if (SK.off || skForced() || !dt || dt > .5) return;
  const S = M.s3; if (!S || !S.rigs.size || ![...S.rigs.values()].some(r => r.sk)) return;
  S.skN = (S.skN || 0) + 1; S.skT = (S.skT || 0) + dt;
  if (S.skN >= 90) {
    if (S.skT / S.skN > .045) { SK.off = true; for (const r of S.rigs.values()) skDetach(r); console.warn('Dispositivo lento: figure classiche'); }
    S.skN = -1e9;
  }
}
function skDetach(rig) { if (!rig.sk) return; rig.g.remove(rig.sk.root); rig.g.add(rig.parts.num, rig.parts.numF); rig.sk = null; for (const n in rig.parts) rig.parts[n].visible = true; }

/* credito richiesto dalla licenza CC BY, in fondo alla Home quando il modello e' attivo */
const _homeHTMLsk = homeHTML;
homeHTML = function () {
  return _homeHTMLsk() + (skEnabled() && SK.state !== 'error' && !SK.off ? `<p class="muted small" style="margin:14px 0 4px;text-align:center;font-size:11px">Modello 3D delle atlete: "Sporty Girl _Rigged_ Free." di <a href="https://sketchfab.com/NABEEL619" target="_blank" rel="noopener">NABEEL619</a> (<a href="https://sketchfab.com/3d-models/sporty-girl--rigged--free-00d9e7c3bc1648fd8d994bf27640d8a7" target="_blank" rel="noopener">fonte</a>), licenza <a href="http://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener">CC BY 4.0</a>. Modificato: colori e texture.</p>` : '');
};

/* texture dello stemma: usa il logo del club se c'e' (cartella logos/), altrimenti lo stemma generato; si disegna quando l'immagine e' pronta */
const SK_CREST = {};
function skCrestTex(t) {
  const key = t.id; if (SK_CREST[key]) return SK_CREST[key];
  const c = document.createElement('canvas'); c.width = c.height = 128; const tex = new THREE.CanvasTexture(c); tex.anisotropy = 4; SK_CREST[key] = tex;
  const img = new Image();
  img.onload = () => { const x = c.getContext('2d'), r = Math.min(124 / img.width, 124 / img.height), w = img.width * r, h = img.height * r; x.clearRect(0, 0, 128, 128); x.drawImage(img, (128 - w) / 2, (128 - h) / 2, w, h); tex.needsUpdate = true; };
  try { img.src = t.logo || ('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(crestSVG(t, 128))); } catch (e) { }
  return tex;
}
