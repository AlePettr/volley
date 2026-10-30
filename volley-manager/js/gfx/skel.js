/* Modello 3D con scheletro per le atlete (opzionale: attivo con ?sk=1 oppure localStorage vm-sk=1; se non si carica, restano le figure classiche).
   Modello: "Sporty Girl _Rigged_ Free." di NABEEL619 (https://sketchfab.com/NABEEL619), licenza CC-BY-4.0 (http://creativecommons.org/licenses/by/4.0/)
   Le pose arrivano da s3Pose(): posizioni di anca, ginocchia, caviglie, spalle, gomiti, polsi e testa vengono convertite in rotazioni delle ossa. */
const SK = { url: 'vendor/models/sporty_girl/scene.gltf', state: 'idle', gltf: null, bind: null };
function skEnabled() { try { return /[?&]sk=1/.test(location.search) || localStorage.getItem('vm-sk') === '1'; } catch (e) { return /[?&]sk=1/.test(location.search); } }
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
      bind.hipsParentInv = B.Hips.parent.matrixWorld.clone().invert();
      bind.len = {}; for (const n of ['LeftForeArm', 'LeftHand', 'RightForeArm', 'RightHand', 'LeftLeg', 'LeftFoot', 'RightLeg', 'RightFoot']) bind.len[n] = B[n].position.length();
      SK.bind = bind; SK.gltf = g; SK.state = 'ready';
    } catch (e) { SK.state = 'error'; console.warn('Modello atleta non utilizzabile', e); }
  }, undefined, e => { SK.state = 'error'; console.warn('Modello atleta non caricato', e); });
}

/* aggiunge il modello a una atleta e nasconde le parti della figura classica */
function skAttach(rig) {
  if (rig.sk || SK.state !== 'ready') return;
  const root = THREE.SkeletonUtils.clone(SK.gltf.scene);
  root.traverse(o => { if (o.isMesh) { o.castShadow = true; o.frustumCulled = false; } });
  rig.g.add(root);
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
