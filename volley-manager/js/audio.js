/* ===== Audio: effetti sintetizzati (WebAudio) + musiche (audio/*.mp3) =====
   Modalita': 'all' = effetti + musica, 'fx' = solo effetti, 'off' = muto. Parte al primo tocco (regola dei browser). */
const Snd = (() => {
  const FILES = { inno: 'audio/inno_lega.mp3', ace: 'audio/ace.mp3', bailar: 'audio/bailar.mp3', wake: 'audio/wake_me_up.mp3' };
  const BREAKS = ['bailar', 'wake'];   /* l'ace e' riservato ai punti diretti dalla battuta */
  let ctx = null, master = null, fxBus = null, noise = null, amb = null, mode = 'all', cur = null, lastBreak = '', lastMus = 0;
  try { mode = localStorage.getItem('vm_snd') || 'all'; } catch (e) { }
  const AC = typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext);

  function init() {
    if (ctx || !AC) return !!ctx;
    try {
      ctx = new AC(); master = ctx.createGain(); master.gain.value = .9; master.connect(ctx.destination);
      fxBus = ctx.createGain(); fxBus.gain.value = .8; fxBus.connect(master);
      noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate); const d = noise.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    } catch (e) { ctx = null; return false; }
    return true;
  }
  function ok() { if (!ctx && !init()) return false; if (ctx.state === 'suspended') ctx.resume(); return mode !== 'off' && ctx.state !== 'closed'; }
  const nsrc = (loop) => { const s = ctx.createBufferSource(); s.buffer = noise; s.loop = !!loop; return s; };

  /* colpo di palla: corpo + schiocco, piu' secco se la palla e' veloce */
  function hit(pow) {
    if (!ok()) return; const t = ctx.currentTime, v = Math.min(1, .22 + pow / 15), hard = pow > 9;
    const o = ctx.createOscillator(), og = ctx.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(hard ? 240 : 170, t); o.frequency.exponentialRampToValueAtTime(65, t + .1);
    og.gain.setValueAtTime(v * .9, t); og.gain.exponentialRampToValueAtTime(.001, t + .13); o.connect(og); og.connect(fxBus); o.start(t); o.stop(t + .15);
    const n = nsrc(), bp = ctx.createBiquadFilter(), ng = ctx.createGain(); bp.type = 'bandpass'; bp.frequency.value = 700 + pow * 110; bp.Q.value = .8;
    ng.gain.setValueAtTime(v * (hard ? .9 : .4), t); ng.gain.exponentialRampToValueAtTime(.001, t + (hard ? .09 : .05)); n.connect(bp); bp.connect(ng); ng.connect(fxBus); n.start(t, Math.random()); n.stop(t + .12);
  }
  /* palla che tocca il campo */
  function thud(vol) {
    if (!ok()) return; const t = ctx.currentTime, o = ctx.createOscillator(), og = ctx.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(110, t); o.frequency.exponentialRampToValueAtTime(48, t + .12);
    og.gain.setValueAtTime(vol, t); og.gain.exponentialRampToValueAtTime(.001, t + .16); o.connect(og); og.connect(fxBus); o.start(t); o.stop(t + .18);
    const n = nsrc(), lp = ctx.createBiquadFilter(), ng = ctx.createGain(); lp.type = 'lowpass'; lp.frequency.value = 400; ng.gain.setValueAtTime(vol * .5, t); ng.gain.exponentialRampToValueAtTime(.001, t + .08); n.connect(lp); lp.connect(ng); ng.connect(fxBus); n.start(t, Math.random()); n.stop(t + .1);
  }
  function whistle(dur) {
    if (!ok()) return; const t = ctx.currentTime, g = ctx.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.16, t + .02); g.gain.setValueAtTime(.16, t + dur - .05); g.gain.linearRampToValueAtTime(0, t + dur);
    const lfo = ctx.createOscillator(), lg = ctx.createGain(); lfo.frequency.value = 32; lg.gain.value = 70; lfo.connect(lg);
    for (const f of [2850, 3080]) { const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = f; lg.connect(o.frequency); o.connect(g); o.start(t); o.stop(t + dur + .02); }
    lfo.start(t); lfo.stop(t + dur + .02); g.connect(fxBus);
  }
  /* boato del pubblico: rumore filtrato con inviluppo, piu' forte se e' la tua squadra / sala piena */
  function cheer(str, dur) {
    if (!ok()) return; const t = ctx.currentTime, d = dur || 1.8, s = Math.max(.15, Math.min(1, str));
    for (const [f, q, k] of [[650, .5, 1], [1700, .8, .55]]) {
      const n = nsrc(true), bp = ctx.createBiquadFilter(), g = ctx.createGain(); bp.type = 'bandpass'; bp.frequency.value = f; bp.Q.value = q;
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.2 * s * k, t + .22); g.gain.setValueAtTime(.2 * s * k, t + .5); g.gain.exponentialRampToValueAtTime(.001, t + d);
      n.connect(bp); bp.connect(g); g.connect(fxBus); n.start(t, Math.random()); n.stop(t + d + .05);
    }
  }
  /* brusio continuo della sala */
  function ambience(on, level) {
    if (!ctx) return;
    if (on && mode !== 'off') {
      if (!amb) { const n = nsrc(true), lp = ctx.createBiquadFilter(), g = ctx.createGain(); lp.type = 'bandpass'; lp.frequency.value = 520; lp.Q.value = .35; g.gain.value = 0; n.connect(lp); lp.connect(g); g.connect(fxBus); n.start(); amb = { n, g }; }
      amb.g.gain.setTargetAtTime(Math.max(.01, level), ctx.currentTime, .4);
    } else if (amb) amb.g.gain.setTargetAtTime(0, ctx.currentTime, .3);
  }

  /* ---- musica ---- */
  function stopMus(fade) { const a = cur; cur = null; if (!a) return; fadeTo(a, 0, fade == null ? 1.2 : fade, () => { try { a.pause(); } catch (e) { } }); }
  function fadeTo(a, vol, secs, done) {
    clearInterval(a._fi); const v0 = a.volume, t0 = performance.now(); if (secs <= 0) { a.volume = vol; if (done) done(); return; }
    a._fi = setInterval(() => { const k = Math.min(1, (performance.now() - t0) / (secs * 1000)); a.volume = Math.max(0, Math.min(1, v0 + (vol - v0) * k)); if (k >= 1) { clearInterval(a._fi); if (done) done(); } }, 50);
  }
  function music(name, o) {
    o = o || {}; if (mode !== 'all') return; init(); stopMus(.6);
    const a = new Audio(FILES[name]); a.volume = 0; a.loop = !!o.loop; cur = a;
    if (o.start) { const sk = () => { try { a.currentTime = o.start; } catch (e) { } }; a.addEventListener('loadedmetadata', sk, { once: true }); sk(); }
    const p = a.play(); if (p && p.catch) p.catch(() => { if (cur === a) cur = null; });
    fadeTo(a, o.vol == null ? .5 : o.vol, o.fadeIn == null ? 1.2 : o.fadeIn);
    if (o.max) setTimeout(() => { if (cur === a) stopMus(o.fadeOut == null ? 2.5 : o.fadeOut); }, o.max * 1000);
    lastMus = performance.now();
  }
  function pickBreak() { const c = BREAKS.filter(x => x !== lastBreak); lastBreak = c[Math.floor(Math.random() * c.length)]; return lastBreak; }

  function setMode(m) { mode = m; try { localStorage.setItem('vm_snd', m); } catch (e) { } if (m === 'off') { stopMus(.3); ambience(false); } else if (m === 'fx') stopMus(.3); const b = document.getElementById('sndbtn'); if (b) b.textContent = label(); }
  const label = () => mode === 'all' ? 'Audio: tutto' : mode === 'fx' ? 'Audio: effetti' : 'Audio: off';

  return {
    /* partita: bottone audio, inno d'ingresso */
    mount(M) {
      const ctl = document.getElementById('ctl'); if (ctl && !document.getElementById('sndbtn')) { ctl.insertAdjacentHTML('beforeend', `<button class="btn" id="sndbtn" title="Audio: tutto / solo effetti / muto">${label()}</button>`); document.getElementById('sndbtn').addEventListener('click', () => { init(); setMode(mode === 'all' ? 'fx' : mode === 'fx' ? 'off' : 'all'); if (mode === 'all' && !cur && M && !M.done) music(pickBreak(), { vol: .4, max: 8, fadeOut: 2 }); }); }
      M._snd = { pre: true }; init(); if (ctx && ctx.state === 'suspended') ctx.resume();
    },
    /* entrata in campo: inno della Lega + boato, poi fischio all'inizio del gioco */
    introStart(M) { init(); if (ctx && ctx.state === 'suspended') ctx.resume(); if (!ctx) return; cheer(.8, 3.2); ambience(true, .05); music('inno', { vol: .6, fadeIn: .5, max: 23, fadeOut: 2, start: 17 }); },
    introEnd(M) { stopMus(.8); if (ctx && mode !== 'off') whistle(.35); },
    stop() { stopMus(.5); ambience(false); },
    /* ogni frame di gioco: colpi di palla, fischi, brusio */
    tick(M, a) {
      if (!a || !ctx || mode === 'off') return;
      const bl = a.script.ball || [], f = a.sndFired || (a.sndFired = new Set());
      for (let i = 0; i < bl.length; i++) {
        const s = bl[i]; if (f.has(i) || a.t < s.t0) continue; f.add(i);
        const dz = (s.B[2] - s.A[2]), dist = Math.hypot(s.B[0] - s.A[0], s.B[1] - s.A[1], dz), dur = Math.max(.05, s.t1 - s.t0), pow = dist / dur, prev = bl[i - 1];
        if (dist < .05) continue;
        const toss = s.A[2] < 1.3 && s.B[2] >= 2.4 && dist < 2.4;
        if (toss && !a.sndWhistle) { a.sndWhistle = 1; whistle(.34); }
        const air = !prev || prev.B[2] > .22;
        if (air && s.A[2] > .22 && pow > 2.4 && !toss) hit(pow);
        if (s.B[2] <= .22 && s.A[2] > .22) { const v = Math.min(.7, .12 + pow / 24); setTimeout(() => thud(v), Math.max(0, (s.t1 - a.t) * 1000 / Math.max(1, M.speed))); }
      }
      ambience(true, .022 + (M.excite || 0) * .05 + (M.flag ? .02 : 0));
    },
    /* punto assegnato */
    point(M, a) {
      if (!ctx || mode === 'off') return; const mine = a.ry.winner === M.userSide, big = a.ry.type === 'ace' || a.ry.type === 'block' || (a.script.ball && a.script.ball.length >= 7);
      cheer((mine ? .7 : .45) + (big ? .25 : 0), mine ? 2 : 1.4);
      if (M._snd && M._snd.pre) { M._snd.pre = false; stopMus(3); }
      if (a.setEnd) { whistle(.9); setTimeout(() => { if (UI.match === M && !M.done) music(pickBreak(), { vol: .45, max: 14, fadeOut: 3 }); }, 900); }
      else if (a.hold >= 1.5) music(pickBreak(), { vol: .4, max: 7, fadeOut: 2 });
      else if (a.ry.type === 'ace') music('ace', { vol: .5, fadeIn: .3, max: 5, fadeOut: 1.2 });
    },
    end(win) { if (win) music('wake', { vol: .5, max: 9, fadeOut: 2.5 }); else stopMus(1.5); ambience(false); },
    setMode, get mode() { return mode }
  };
})();
