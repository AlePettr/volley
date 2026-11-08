/* Luce e ombre migliori per il 3D: riflesso reale sul parquet (specchio piano a bassa risoluzione) e ombre morbide da piu' fari.
   Si puo' spegnere con ?fx=0 (o dal pulsante in Home); se il dispositivo rallenta si disattiva da solo. Non cambia colori ne' luci del resto della scena. */
function s3Fx() {
  try { const q = new URLSearchParams(location.search).get('fx'); if (q !== null) return q !== '0'; return localStorage.getItem('vm-fx') !== 'off'; } catch (e) { return true; }
}

/* ---------- ombre morbide: tre fari sopra il campo, la media delle loro ombre ---------- */
function s3SoftShadows(S, scene, sun, shadowPlane) {
  if (!s3Fx()) return;
  const small = Math.min(innerWidth, innerHeight) < 600, q = small ? 1024 : 2048, lights = [sun];
  sun.intensity = .2 * (window.S3_LK || 1);
  for (const [x, y, z, k] of [[8, 23, -7, .11], [-4, 24, -9, .11]]) {
    const l = new THREE.DirectionalLight(0xffffff, k * (window.S3_LK || 1)); l.position.set(x, y, z); scene.add(l);
    l.castShadow = true; l.shadow.mapSize.set(q, q); l.shadow.bias = -.0004; l.shadow.normalBias = .03;
    Object.assign(l.shadow.camera, { left: -13, right: 13, top: 13, bottom: -13, near: 8, far: 52 }); l.shadow.camera.updateProjectionMatrix(); lights.push(l);
  }
  /* il piano d'ombra usa la media delle ombre invece del prodotto: i bordi diventano penombre */
  const m = shadowPlane.material; m.opacity = .5;
  m.onBeforeCompile = sh => {
    const ch = THREE.ShaderChunk.shadowmask_pars_fragment.replace('float shadow = 1.0;', 'float shadow = 0.0;').replace(/shadow \*= /g, 'shadow += ').replace('return shadow;', 'return shadow / float( max( 1, NUM_DIR_LIGHT_SHADOWS + NUM_SPOT_LIGHT_SHADOWS + NUM_POINT_LIGHT_SHADOWS ) );');
    sh.fragmentShader = sh.fragmentShader.replace('#include <shadowmask_pars_fragment>', ch);
  };
  m.needsUpdate = true;
  S.softLights = lights;
}

/* ---------- riflesso sul parquet ---------- */
function s3ShineSetup(S, scene, FW, FL) {
  if (!s3Fx()) return;
  const small = Math.min(innerWidth, innerHeight) < 600, sc = small ? .42 : .55;
  const rt = new THREE.WebGLRenderTarget(256, 256, { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: true });
  const vc = new THREE.PerspectiveCamera(), texM = new THREE.Matrix4();
  const mat = new THREE.ShaderMaterial({
    uniforms: { tRef: { value: rt.texture }, textureMatrix: { value: texM }, uK: { value: 4 }, uTexel: { value: new THREE.Vector2(1 / 256, 1 / 256) } },
    vertexShader: 'uniform mat4 textureMatrix; varying vec4 vUv; varying vec3 vW; void main(){ vec4 wp = modelMatrix * vec4(position,1.0); vW = wp.xyz; vUv = textureMatrix * wp; gl_Position = projectionMatrix * viewMatrix * wp; }',
    fragmentShader: `uniform sampler2D tRef; uniform float uK; uniform vec2 uTexel; varying vec4 vUv; varying vec3 vW;
      void main(){
        vec3 V = normalize(cameraPosition - vW); float c = clamp(V.y, 0.0, 1.0);
        float f = 0.05 + 0.95 * pow(1.0 - c, 5.0);
        float k = min(0.32, f * uK);
        vec2 uv = vUv.xy / vUv.w; float d = length(cameraPosition - vW);
        vec2 r = uTexel * (1.2 + d * 0.10);
        vec3 a = texture2D(tRef, uv).rgb * 0.24;
        a += texture2D(tRef, uv + vec2( r.x, 0.0)).rgb * 0.11; a += texture2D(tRef, uv + vec2(-r.x, 0.0)).rgb * 0.11;
        a += texture2D(tRef, uv + vec2(0.0,  r.y)).rgb * 0.11; a += texture2D(tRef, uv + vec2(0.0, -r.y)).rgb * 0.11;
        a += texture2D(tRef, uv + r * 1.6).rgb * 0.08; a += texture2D(tRef, uv - r * 1.6).rgb * 0.08;
        a += texture2D(tRef, uv + vec2(r.x, -r.y) * 1.6).rgb * 0.08; a += texture2D(tRef, uv + vec2(-r.x, r.y) * 1.6).rgb * 0.08;
        gl_FragColor = vec4(a * k, 1.0);
      }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
  });
  const ov = new THREE.Mesh(new THREE.PlaneGeometry(FW, FL), mat); ov.rotation.x = -Math.PI / 2; ov.position.y = .008; ov.renderOrder = 3; ov.frustumCulled = false; scene.add(ov);
  S.shine = { rt, vc, texM, mat, ov, sc, off: false, slow: 0, last: 0, clip: new THREE.Plane(new THREE.Vector3(0, -1, 0), 5.5), tmp: { v: new THREE.Vector3(), t: new THREE.Vector3(), la: new THREE.Vector3(), rot: new THREE.Matrix4() } };
}

function s3ShineUpdate(S, scene, cam) {
  const H = S.shine; if (!H || H.off) return;
  const r = S.renderer, now = performance.now();
  if (H.last) { const dt = now - H.last; H.slow = dt > 34 ? H.slow + 1 : Math.max(0, H.slow - 2); if (H.slow > 90) { H.off = true; H.ov.visible = false; return; } } H.last = now;
  const sz = r.getSize(new THREE.Vector2()), w = Math.max(64, Math.round(sz.x * H.sc * (r.getPixelRatio() > 1 ? 1 : 1))), h = Math.max(64, Math.round(sz.y * H.sc));
  if (H.rt.width !== w || H.rt.height !== h) { H.rt.setSize(w, h); H.mat.uniforms.uTexel.value.set(1 / w, 1 / h); }
  const { v, t, la, rot } = H.tmp, n = new THREE.Vector3(0, 1, 0), rp = new THREE.Vector3(0, 0, 0), cp = cam.position;
  cam.updateMatrixWorld();
  v.subVectors(rp, cp).reflect(n).negate().add(rp);
  rot.extractRotation(cam.matrixWorld);
  la.set(0, 0, -1).applyMatrix4(rot).add(cp); t.subVectors(rp, la).reflect(n).negate().add(rp);
  const vc = H.vc; vc.position.copy(v); vc.up.set(0, 1, 0).applyMatrix4(rot).reflect(n); vc.lookAt(t);
  vc.far = cam.far; vc.near = cam.near; vc.updateMatrixWorld(); vc.projectionMatrix.copy(cam.projectionMatrix); vc.projectionMatrixInverse.copy(cam.projectionMatrixInverse);
  H.texM.set(.5, 0, 0, .5, 0, .5, 0, .5, 0, 0, .5, .5, 0, 0, 0, 1).multiply(vc.projectionMatrix).multiply(vc.matrixWorldInverse);
  const old = r.getRenderTarget(), oc = r.clippingPlanes;
  H.ov.visible = false; r.clippingPlanes = [H.clip];
  r.setRenderTarget(H.rt); r.render(scene, vc); r.setRenderTarget(old);
  r.clippingPlanes = oc; H.ov.visible = true;
  r.shadowMap.autoUpdate = false; H.restore = true;   /* le ombre le ha gia' calcolate il passaggio del riflesso */
}
function s3ShineAfter(S) { const H = S.shine; if (H && H.restore) { S.renderer.shadowMap.autoUpdate = true; H.restore = false; } }
