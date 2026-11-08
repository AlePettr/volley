/* Post-produzione 3D: profondita' di campo (sfondo e pubblico morbidi, giocatrici nitide) + color grading da trasmissione
   (contrasto, saturazione, toni caldi/freddi, vignettatura). Si spegne con ?post=0 o dal pulsante in Home; se il dispositivo rallenta si disattiva da solo.
   Non tocca la scena: renderizza in un buffer e poi lo ridisegna a schermo. */
function s3PostOn() {
  try { const q = new URLSearchParams(location.search).get('post'); if (q !== null) return q !== '0'; return localStorage.getItem('vm-post') !== 'off'; } catch (e) { return true; }
}
function s3PostInit(S) {
  const r = S.renderer, P = { rt: null, w: 0, h: 0, last: 0, slow: 0, off: false };
  P.cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  P.mat = new THREE.ShaderMaterial({
    depthTest: false, depthWrite: false, defines: s3CM() ? { CM: 1 } : {},
    uniforms: { tC: { value: null }, tD: { value: null }, texel: { value: new THREE.Vector2() }, near: { value: .5 }, far: { value: 200 }, focus: { value: 30 }, kPx: { value: 10 }, taps: { value: 14 }, seed: { value: 0 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
    fragmentShader: `
      varying vec2 vUv; uniform sampler2D tC, tD; uniform vec2 texel; uniform float near, far, focus, kPx, seed; uniform int taps;
      float lin(float d){ float z = d * 2.0 - 1.0; return 2.0 * near * far / (far + near - z * (far - near)); }
      float coc(float d){ if (d >= 0.99999) return kPx * 0.45; return clamp((abs(lin(d) - focus) - 7.0) * kPx * 0.042, 0.0, 7.0); }
      float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233)) + seed) * 43758.5453); }
      void main(){
        vec3 c0 = texture2D(tC, vUv).rgb, acc = c0; float wsum = 1.0;
        float r = coc(texture2D(tD, vUv).r);
        if (r > 0.6) {
          float rot = hash(gl_FragCoord.xy) * 6.2832;
          for (int i = 0; i < 24; i++) { if (i >= taps) break;
            float fi = float(i) + 0.5, rr = sqrt(fi / float(taps)) * r, a = fi * 2.39996 + rot;
            vec2 o = vec2(cos(a), sin(a)) * rr * texel, uv = vUv + o;
            float sc = coc(texture2D(tD, uv).r), w = smoothstep(rr - 1.0, rr + 0.5, sc);   /* niente aloni dei soggetti a fuoco sullo sfondo */
            acc += texture2D(tC, uv).rgb * w; wsum += w; }
        }
        vec3 c = acc / wsum;
#ifdef CM
        gl_FragColor = vec4(c, 1.0);
#include <tonemapping_fragment>
#include <colorspace_fragment>
        c = gl_FragColor.rgb;
#endif
        /* grading */
        float l = dot(c, vec3(0.299, 0.587, 0.114));
        c = mix(vec3(l), c, 1.10);                                  /* un po' piu' di colore */
        c = (c - 0.46) * 1.08 + 0.46;                                /* contrasto */
        c += vec3(0.030, 0.012, -0.024) * smoothstep(0.45, 1.0, l);  /* luci calde */
        c += vec3(-0.012, 0.004, 0.022) * (1.0 - smoothstep(0.0, 0.4, l));   /* ombre fredde */
        vec2 q = vUv - 0.5; q.x *= 1.0; float vg = smoothstep(0.80, 0.18, length(q * vec2(1.0, 1.15)));
        c *= mix(0.80, 1.0, vg);                                    /* vignettatura */
        c += (hash(gl_FragCoord.xy + 7.0) - 0.5) / 255.0;          /* niente bande nei gradienti */
        gl_FragColor = vec4(clamp(c, 0.0, 1.0), 1.0);
      }`
  });
  P.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), P.mat); P.quad.frustumCulled = false;
  P.scene = new THREE.Scene(); P.scene.add(P.quad);
  return P;
}
function s3PostRender(S, scene, cam) {
  if (!s3PostOn()) return false;
  const r = S.renderer; let P = S.post;
  if (P && P.off) return false;
  if (!P) { try { P = S.post = s3PostInit(S); } catch (e) { S.post = { off: true }; return false; } }
  const now = performance.now();
  if (P.last) { const dt = now - P.last; P.slow = dt > 36 ? P.slow + 1 : Math.max(0, P.slow - 2); if (P.slow > 120) { P.off = true; if (P.rt) { P.rt.dispose(); P.rt.depthTexture.dispose(); } return false; } } P.last = now;
  const sz = r.getSize(new THREE.Vector2()), pr = r.getPixelRatio(), w = Math.max(64, Math.round(sz.x * pr)), h = Math.max(64, Math.round(sz.y * pr));
  if (!P.rt || P.w !== w || P.h !== h) {
    if (P.rt) { P.rt.dispose(); P.rt.depthTexture.dispose(); }
    const dt = new THREE.DepthTexture(w, h); dt.type = THREE.UnsignedIntType; dt.minFilter = dt.magFilter = THREE.NearestFilter;
    P.rt = new THREE.WebGLRenderTarget(w, h, { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthTexture: dt, samples: 4, type: s3CM() ? THREE.HalfFloatType : THREE.UnsignedByteType });
    P.w = w; P.h = h; P.mat.uniforms.texel.value.set(1 / w, 1 / h); P.mat.uniforms.tC.value = P.rt.texture; P.mat.uniforms.tD.value = dt;
  }
  const u = P.mat.uniforms, small = Math.min(sz.x, sz.y) < 600;
  u.near.value = cam.near; u.far.value = cam.far; u.focus.value = S.focusD || 30; u.kPx.value = 0;   /* sfocatura disattivata: resta il grading */ u.taps.value = small ? 10 : 16; u.seed.value = (now % 1000) * .001;
  const old = r.getRenderTarget();
  r.setRenderTarget(P.rt); r.render(scene, cam);
  r.setRenderTarget(old); r.render(P.scene, P.cam);
  return true;
}
