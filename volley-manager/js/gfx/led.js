/* Cartelloni LED a bordo campo: riproduce le animazioni vere della Lega (logos/led/*.mp4, elenco in manifest.led) */
const LED = { vids: [], i: 0, ok: false };
(function ledInit() {
  const files = ((window.LOGO_MANIFEST || {}).led || []);
  if (!files.length || typeof document === 'undefined') return;
  files.forEach((f, n) => {
    const v = document.createElement('video');
    v.muted = true; v.defaultMuted = true; v.playsInline = true; v.setAttribute('playsinline', ''); v.preload = 'auto';
    v.src = f.indexOf('data:') === 0 ? f : 'logos/led/' + f;
    v.addEventListener('ended', () => ledNext());
    v.addEventListener('error', () => { LED.vids = LED.vids.filter(x => x !== v); });
    LED.vids.push(v);
  });
  LED.i = Math.floor(Math.random() * LED.vids.length);
})();
function ledNext() {
  if (!LED.vids.length) return;
  LED.i = (LED.i + 1) % LED.vids.length;
  const v = LED.vids[LED.i]; try { v.currentTime = 0; const p = v.play(); if (p && p.catch) p.catch(() => {}); } catch (e) { }
}
function drawLed(c, r) {
  if (!r || !LED.vids.length) return;
  let v = LED.vids[LED.i % LED.vids.length];
  if (v.paused && !v.ended) { try { const p = v.play(); if (p && p.catch) p.catch(() => {}); } catch (e) { } }
  if (v.readyState < 2) return;
  c.save(); c.globalAlpha = 1;
  c.fillStyle = '#05080f'; c.fillRect(r.x - 2, r.y - 2, r.w + 4, r.h + 4);
  c.drawImage(v, r.x, r.y, r.w, r.h);
  c.fillStyle = 'rgba(0,0,0,.14)'; c.fillRect(r.x, r.y, r.w, r.h);   // leggero effetto LED
  c.strokeStyle = 'rgba(255,255,255,.25)'; c.lineWidth = 1; c.strokeRect(r.x, r.y, r.w, r.h);
  c.restore();
}
