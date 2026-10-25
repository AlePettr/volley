/* ===== Partita: schermata, ciclo di animazione e disegno della scena ===== */
const ACTIVE_POSES = new Set(['serveHit', 'bump', 'set', 'spike', 'spikeTop', 'block', 'blockUp', 'dig', 'dive', 'receive']);

function assignNumbers(team) {
  if (team._nums) return;
  const nz = x => String(x || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const real = (typeof JERSEY !== 'undefined' && JERSEY[team.id]) || {}, ent = Object.keys(real).map(k => ({ n: real[k], t: nz(k).split(' '), s: nz(k).replace(/ /g, '') }));
  team._nums = {}; const used = new Set(), left = [];
  /* 1) numero ufficiale: nome identico, oppure i token del nome nel gioco contenuti nel nome completo LVF (cognome), oppure cognome quasi uguale */
  team.players.forEach(p => {
    const g = nz(p.name), gt = g.split(' '), gs = g.replace(/ /g, '');
    let c = ent.filter(e => !used.has(e.n) && e.s === gs);
    if (!c.length) c = ent.filter(e => !used.has(e.n) && gt.every(t => e.t.includes(t)));
    if (!c.length) c = ent.filter(e => !used.has(e.n) && e.s.endsWith(gs) && gs.length > 3);
    if (!c.length && gt.length > 1) c = ent.filter(e => !used.has(e.n) && e.t.includes(gt[gt.length - 1]));
    if (c.length === 1) { team._nums[p.id] = c[0].n; used.add(c[0].n); } else left.push(p);
  });
  /* 2) chi non ha corrispondenza: numero libero casuale ma stabile */
  const R = Gx.rng(Gx.hash(team.id + 'num')), pool = []; for (let i = 1; i <= 29; i++) if (!used.has(i)) pool.push(i);
  for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
  left.forEach((p, i) => { team._nums[p.id] = pool[i % pool.length]; });
}
function playerNo(M, p) { const t = M.home.id === p.teamId ? M.home : M.away; return (t._nums && t._nums[p.id]) || ''; }

function renderMatch() {
  const M = UI.match;
  M.pos = {}; M.shake = 0; M.excite = 0; M.t = 0; M.anim = null; M.script = null; M.fxList = []; M.trail = [];
  assignNumbers(M.home); assignNumbers(M.away);
  M.kits = Gx.matchKits(M.home, M.away);
  const kh = M.kits.h, ka = M.kits.a;
  const row = (side, team, kit) => `<div class="sb-row" style="--kit:${kit.main}"><i id="sv-${side}" class="srv" style="visibility:hidden"></i>${crest(team, 30)}<b class="sb-name">${esc(team.short)}</b><span class="pips" id="pips-${side}"></span><span class="sb-pts num" id="sc-${side}">0</span></div>`;
  const ctxLabel = M.event ? esc(M.event.stage || 'Fase finale') : `${esc(LEAGUES[G.lid] ? LEAGUES[G.lid].name : '')} · Giornata ${(G.round || 0) + 1}`;
  const venue = (typeof arenaTheme === 'function' && arenaTheme(M.home).info) ? ' · ' + esc(arenaTheme(M.home).info.name) : '';
  $("#app").innerHTML = `
  <div class="arena" id="arena">
    <canvas id="cv" class="cv" role="img" aria-label="Partita di pallavolo in corso"></canvas>
    <div class="scorebug" role="status" aria-live="polite">
      <div class="sb-ctx">${ctxLabel}${venue}</div>
      ${row('h', M.home, kh)}${row('a', M.away, ka)}
      <div class="sb-set" id="sets">SET 1 · 0-0</div>
    </div>
    <div class="caption" id="feed">Le squadre completano il riscaldamento.</div>
    <div class="banner" id="banner" hidden></div>
    <div class="lower" id="lower" hidden></div>
    <div class="rbadge" id="rbadge" hidden>REPLAY</div>
  </div>
  <div class="setline" id="setline"></div>
  <div id="ctl" class="matchctl">
    <div class="seg" role="group" aria-label="Telecamera"><button data-act="camview" data-v="side" aria-pressed="${UI.camView === 'side'}">Laterale</button><button data-act="camview" data-v="reg" aria-pressed="${UI.camView === 'reg'}">Da fondo</button><button data-act="camview" data-v="tv" aria-pressed="${UI.camView === 'tv'}">Da fondo alta</button></div>
    <div class="seg" role="group" aria-label="Velocità"><button data-act="speed" data-v="1" aria-pressed="true">1×</button><button data-act="speed" data-v="2" aria-pressed="false">2×</button><button data-act="speed" data-v="4" aria-pressed="false">4×</button><button data-act="speed" data-v="8" aria-pressed="false">8×</button></div>
    <button class="btn" data-act="pause" id="pausebtn">Pausa</button><button class="btn" data-act="mode3d" id="mode3dbtn" hidden>2D</button><button class="btn primary" data-act="submodal">Cambi</button><button class="btn" data-act="replay" id="replaybtn">Replay</button><span class="pill" id="vcpill" title="Check VAR rimasti: tuoi · avversari">VAR 2 · 2</span><button class="btn" data-act="skip">Salta alla fine</button>
  </div>
  <div id="sum"></div>`;
  sizeCanvas();
  if (typeof Snd !== 'undefined') Snd.mount(M);
  if (typeof ledForHome === 'function') ledForHome(M.home.id);
  { const b3 = $("#mode3dbtn"); if (b3 && typeof s3Available === 'function' && s3Available()) { b3.hidden = false; b3.textContent = UI.mode3d === false ? '3D' : '2D'; } }
  /* entrata in campo: parte con un tocco (serve anche a sbloccare l'audio) */
  M.intro = { t: 0, dur: 20, started: false };
  { const ar = $("#arena"); if (ar) {
    ar.insertAdjacentHTML('beforeend', '<div class="introov" id="introov"><button class="btn primary big" id="introgo">Entrata in campo ▶</button><button class="btn" id="introskip">Salta ⏭</button></div>');
    $("#introgo").onclick = () => { if (!M.intro) return; M.intro.started = true; M.intro.t = 0; const g = $("#introgo"); if (g) g.remove(); if (typeof Snd !== 'undefined') Snd.introStart(M); };
    $("#introskip").onclick = () => endIntro(M);
  } }
  M.last = performance.now();
  M.raf = requestAnimationFrame(tick);
}
/* posizione di una giocatrice durante l'entrata: dalla panchina alla riga davanti alla rete, poi saluto */
function introPos(M, side, i, N) {
  const I = M.intro, sg = side === M.userSide ? 1 : -1, d = i * .6 + (side === 'a' ? .5 : 0), k = Math.max(0, Math.min(1, (I.t - d) / 7)), e = k * k * (3 - 2 * k);
  const u0 = sg * (5.4 + (i - (N - 1) / 2) * .55), v0 = -8.3, u1 = sg * 3.1, v1 = (i - (N - 1) / 2) * 1.15;
  let pose = POSE.ready; if (I.t > I.dur - 6 && I.t < I.dur - .5) pose = Math.sin(M.t * 8 + i * 1.7) > 0 ? POSE.cheerUp : POSE.cheer;
  return { u: u0 + (u1 - u0) * e, v: v0 + (v1 - v0) * e, pose, u1, v1 };
}
function endIntro(M) {
  if (!M || !M.intro) return;
  for (const side of ['h', 'a']) { const N = M.view[side].length; M.view[side].forEach((o, i) => { const q = introPos({ ...M, intro: { t: 99, dur: 99 } }, side, i, N); M.pos[o.p.id] = [q.u1, q.v1]; }); }
  M.intro = null; const ov = $("#introov"); if (ov) ov.remove(); if (typeof Snd !== 'undefined') Snd.introEnd(M);
}


function sizeCanvas() {
  const M = UI.match, cv = $("#cv"); if (!cv || !M) return;
  const portrait = window.innerHeight > window.innerWidth * 1.05 && window.innerWidth < 900;
  const W = portrait ? 900 : 1280, H = portrait ? 1100 : 720;
  cv.style.aspectRatio = `${W} / ${H}`;
  const cssW = cv.clientWidth || (portrait ? 400 : 800), dpr = Math.min(2, window.devicePixelRatio || 1);
  cv.width = Math.round(cssW * dpr); cv.height = Math.round(cv.width * H / W);
  M.k = cv.width / W; camSetup(W, H);
  M.arena = arenaBuild(M, Math.min(M.k * 1.5, 2.6));
  if (typeof s3Setup === 'function') s3Setup(M);
  if (!M._logos) { M._logos = true; loadLogos(M, () => { if (UI.match === M) M.arena = arenaBuild(M, Math.min(M.k * 1.5, 2.6)); }); }
}

function startNext() {
  const M = UI.match;
  if (M.i >= M.res.rallies.length) { finishMatch(); return; }
  const ry = M.res.rallies[M.i], script = buildScript(M, ry);
  M.view[ry.sideS] = script.view[ry.sideS]; M.view[ry.sideR] = script.view[ry.sideR];
  const next = M.res.rallies[M.i + 1], setEnd = !next || next.set !== ry.set;
  M.anim = { ry, script, t: 0, scored: false, setEnd, fired: new Set() };
  $("#sv-h").style.visibility = ry.sideS === 'h' ? 'visible' : 'hidden';
  $("#sv-a").style.visibility = ry.sideS === 'a' ? 'visible' : 'hidden';
  M.trail = [];
  { const lw = $("#lower"); if (lw && script.server) { const nm = String(script.server.name).trim(), no = playerNo(M, script.server), sd = ry.sideS === 'h' ? M.home : M.away; lw.innerHTML = `<i style="background:${M.kits[ry.sideS].main}"></i><span>AL SERVIZIO</span><b>${no ? no + ' ' : ''}${esc(nm)}</b><em>${esc(sd.short)}</em>`; lw.hidden = false; lw.classList.remove('out'); clearTimeout(M._lwt); M._lwt = setTimeout(() => { lw.classList.add('out'); setTimeout(() => { lw.hidden = true; }, 350); }, 2300 / Math.max(1, M.speed)); } }
  const pv = (M.i > 0 && M.res.rallies[M.i - 1].set === ry.set) ? M.res.rallies[M.i - 1] : { h: 0, a: 0 }, tg = ry.set === 5 ? 15 : 25;
  let flag = '';
  for (const sd of ['h', 'a']) { const o = sd === 'h' ? 'a' : 'h'; if (pv[sd] >= tg - 1 && pv[sd] > pv[o]) flag = ((sd === 'h' ? M.sh : M.sa) >= 2) ? 'MATCH POINT' : 'SET POINT'; }
  M.flag = flag; const se = $("#sets"); if (se) se.innerHTML = `SET ${ry.set} · ${M.sh}-${M.sa}` + (flag ? ` <b class="flag">${flag}</b>` : '');
}
function applyPoint(a) {
  const M = UI.match, ry = a.ry;
  updateBoard(ry, a.setEnd);
  $("#feed").textContent = feedText(ry) + (a.setEnd ? ` Set ${ry.set} a ${ry.h > ry.a ? M.home.short : M.away.short}.` : '');
  const sc = ry.winner === 'h' ? ry.h : ry.a;
  if (!a.setEnd && ry.set < 5 && (sc === 8 || sc === 16) && !M.replay) {
    a.hold = 1.5; const b = $("#banner");
    b.innerHTML = `<span>SET ${ry.set}</span><b>TIME-OUT TECNICO</b><em>${ry.h}-${ry.a}</em>`; b.hidden = false; b.className = 'banner show';
    setTimeout(() => { const bb = $("#banner"); if (bb) { bb.hidden = true; bb.className = 'banner'; } }, 1400);
  }
  const mine = ry.winner === M.userSide;
  M.excite = 1; M.mine = mine;
  /* serie di punti, scambi lunghi, ace e muri: festa di gruppo e piccolo zoom */
  M.streak = (M.lastWin === ry.winner) ? (M.streak || 0) + 1 : 1; M.lastWin = ry.winner;
  const long = (a.script.ball ? a.script.ball.length : 0) >= 7, big = ry.type === 'ace' || ry.type === 'block';
  if (!a.setEnd && !M.replay && (M.streak >= 3 || long || big)) { a.huddle = true; a.hold = Math.max(a.hold || 0, .8); }
  if (big || long || a.setEnd) M.zoom = 1;
  if (a.setEnd) {
    const b = $("#banner"), w = ry.h > ry.a ? M.home : M.away;
    b.innerHTML = `<span>SET ${ry.set}</span><b>${esc(w.short)}</b><em>${ry.h}-${ry.a}</em>`; b.hidden = false; b.className = 'banner show';
    setTimeout(() => { const bb = $("#banner"); if (bb) { bb.hidden = true; bb.className = 'banner'; } }, 1700);
  }
  if (typeof Snd !== 'undefined' && !a.replay && !M.replay) Snd.point(M, a);
}
function updateBoard(ry, setEnd) {
  const M = UI.match;
  $("#sc-h").textContent = ry.h; $("#sc-a").textContent = ry.a;
  $("#sv-h").style.visibility = ry.winner === 'h' ? 'visible' : 'hidden';
  $("#sv-a").style.visibility = ry.winner === 'a' ? 'visible' : 'hidden';
  if (setEnd) {
    M.subsUsed = 0; // RESETTA I 6 CAMBI A FINE SET
    M.vcLeft = { h: 2, a: 2 }; varPill();
    if (ry.h > ry.a) M.sh++; else M.sa++;
    M.setScores.push([ry.h, ry.a]);
    $("#setline").innerHTML = M.setScores.map((s, i) => `<span class="pill">Set ${i + 1}: ${s[0]}-${s[1]}</span>`).join('');
    $("#sets").textContent = `SET ${ry.set} CHIUSO · ${M.sh}-${M.sa}`;
    const pip = (id, n) => { const el = $(id); if (el) el.innerHTML = '<i class="on"></i>'.repeat(n) + '<i></i>'.repeat(Math.max(0, 3 - n)); };
    pip('#pips-h', M.sh); pip('#pips-a', M.sa);
  } else {
    $("#sets").textContent = `SET ${ry.set} · ${M.sh}-${M.sa}`;
  }
}

function endRallyAnim(a) {
  const M = UI.match, tr = a.script.tracks;
  for (const pid in tr) { const l = tr[pid][tr[pid].length - 1]; M.pos[pid] = [l.u, l.v]; }
  M.lastA = a; M.i++; M.anim = null;
  if (M.i >= M.res.rallies.length) finishMatch();
}

function tick(ts) {
  const M = UI.match; if (!M) return;
  M.raf = requestAnimationFrame(tick);
  const dt = Math.min(.05, (ts - M.last) / 1000 || 0); M.last = ts;
  if (!M.done && !M.paused) {
    if (M.intro) { const I = M.intro; if (I.started) { I.t += dt; M.excite = Math.max(M.excite, .55); if (I.t >= I.dur) endIntro(M); } }
    else if (!M.anim) startNext();
    else {
      const a = M.anim; a.t += dt * M.speed;
      /* effetti nel momento giusto */
      for (const f of a.script.fx) if (a.t >= f.t && !a.fired.has(f)) {
        a.fired.add(f);
        if (f.type === 'ring') { M.shake = 4; M.fxList.push({ ...f, born: M.t }); }
        else if (f.type === 'dust') { M.fxList.push({ ...f, born: M.t }); }
        else if (f.type === 'text' && f.text) M.fxList.push({ ...f, born: M.t, win: M.anim.ry.winner === M.userSide });
      }
      if (typeof Snd !== 'undefined') Snd.tick(M, a);
      if (!a.scored && a.t >= a.script.point && !a.replay && !M.replay && a.ry.vc && !a.ry.vc.done && varMaybe(M, a)) { /* attende l'esito del check VAR */ }
      else if (!a.scored && a.t >= a.script.point) { a.scored = true; applyPoint(a); }
      if (a.replay) { if (a.t >= a.script.end + .6) { const rb = $('#rbadge'); if (rb) rb.hidden = true; M.anim = null; M.replay = false; M.speed = M.replaySpeed || 1; $("#feed").textContent = M.feedKeep || ''; } }
      else if (a.t >= a.script.end + (a.setEnd ? 1.1 : 0) + (a.hold || 0)) endRallyAnim(a);
    }
    M.t += dt * Math.max(1, Math.min(2, M.speed));
  }
  M.zoom = Math.max(0, (M.zoom || 0) - dt * .7);
  M.excite = Math.max(0, M.excite - dt * .55);
  M.shake = Math.max(0, M.shake - dt * 18);
  drawScene(M, dt);
}

function camShot(M) {
  const a = M.anim; let shot = { cam: 'wide' };
  if (a && a.replay && a.script.finalHit) { const f = a.script.finalHit; return { cam: 'zoom', u: f.u, v: f.v, tHit: f.t, t: 0 }; }
  if (a && a.script.shots) for (const s of a.script.shots) { if (s.t <= a.t) shot = s; else break; }
  return shot;
}
function camTarget(M, ents, shot) {
  const a = M.anim, t = a ? a.t : 0, k = Cam.portrait ? .8 : 1, ctr = proj(0, 0, .9);
  let fx = Cam.cx, fy = ctr.y, z = Cam.portrait ? 1.1 : 1.2;
  const ball = a ? sampleBall(a.script.ball, t) : null;
  if (shot.cam === 'serve' && a && a.script.srvU !== undefined) {
    const near = a.script.srvU > 0, sp = proj(a.script.srvU, a.script.srvV, 1.1);
    z = (near ? 1.6 : 2.2) * k; fx = Cam.cx + (sp.x - Cam.cx) * .75;
    fy = sp.y + (near ? -.3 : .22) * Cam.H / z;
  } else if (shot.cam === 'zoom' && a) {
    const p = proj(shot.u, shot.v, 2.3); z = 1.65 * k; fx = p.x; fy = p.y + 10;
    if (ball) { const bp = proj(ball.u, ball.v, ball.z), w = Math.max(0, Math.min(1, (t - shot.tHit + .05) / .45)) * .65; fx += (bp.x - fx) * w; fy += (bp.y - fy) * w; }
  } else if (shot.cam === 'react') {
    let sx = 0, sy = 0, n = 0;
    for (const e of ents) if (e.kind === 'p' && e.side === shot.side) { const p = proj(e.u, e.v, 1); sx += p.x; sy += p.y; n++; }
    if (n) { fx = sx / n; fy = sy / n; z = 1.6 * k; }
  } else if (ball) {
    const bp = proj(ball.u, ball.v, ball.z); fx = Cam.cx + (bp.x - Cam.cx) * .38; fy = ctr.y + (bp.y - ctr.y) * .16;
  }
  if (shot.cam === 'wide' && a && a.script.srvU > 0 && t < 3.2) fy += 36 * (1 - t / 3.2);
  return { fx, fy, z: Math.max(1, z) };
}
function updateCam(M, ents, dt) {
  const cs = M.cam || (M.cam = { x: Cam.cx, y: proj(0, 0, .9).y, z: Cam.side ? 1 : 1.2, id: null, fast: 0 }), shot = camShot(M);
  const id = shot.cam + (shot.t || 0);
  if (cs.id !== id) { cs.id = id; cs.fast = .4; }
  cs.fast = Math.max(0, cs.fast - dt);
  const tg0 = Cam.tv ? { fx: Cam.W / 2, fy: Cam.H / 2, z: 1 } : camTarget(M, ents, shot), tg = Cam.side ? { fx: tg0.fx, fy: tg0.fy, z: 1 + (tg0.z - 1) * .5 } : tg0, rate = cs.fast > 0 ? 11 : 4.2, f = 1 - Math.exp(-dt * rate);
  cs.x += (tg.fx - cs.x) * f; cs.y += (tg.fy - cs.y) * f; cs.z += (tg.z - cs.z) * f;
  return cs;
}
function drawScene(M, dt) {
  const cv = $("#cv"); if (!cv || !M.arena) return;
  const c = cv.getContext('2d'), k = M.k, W = Cam.W, H = Cam.H;
  c.setTransform(k, 0, 0, k, 0, 0);
  /* entita' da disegnare in ordine di profondita' */
  const a = M.anim, t = a ? a.t : 0, ents = [];
  for (const side of ['h', 'a']) {
    M.view[side].forEach((o, i) => {
      const p = o.p, tr = a ? a.script.tracks[p.id] : null;
      let u, v, pose = POSE.ready, name = '';
      const ip = M.intro ? introPos(M, side, i, M.view[side].length) : null;
      const sm = tr ? sampleTrack(tr, t) : null;
      if (sm) { u = sm.u; v = sm.v; pose = sm.pose; name = sm.name; }
      else { const b = M.pos[p.id] || rallyUV(M, side, i); u = b[0]; v = b[1]; }
      if (ip) { u = ip.u; v = ip.v; pose = ip.pose; name = ''; }
      if (a && a.setEnd && !a.replay && a.t > a.script.end - .2 && a.ry.winner === side) {
        const h = Math.min(1, (a.t - a.script.end + .2) / .7), e = h * h * (3 - 2 * h), sg = side === M.userSide ? 1 : -1;
        u += (sg * 5.2 - u) * e; v += ((i - 2.5) * .55 - v) * e;
        pose = Math.sin(M.t * 9 + i) > 0 ? POSE.cheerUp : POSE.cheer;
      }
      if (a && a.huddle && !a.replay && a.ry.winner === side && a.t > a.script.end - .35) {
        const h = Math.min(1, (a.t - a.script.end + .35) / .6), e = h * h * (3 - 2 * h), sg = side === M.userSide ? 1 : -1, an = i * 1.047 + .4;
        u += (sg * 3.4 + Math.cos(an) * .75 - u) * e; v += (Math.sin(an) * .95 - v) * e;
        pose = Math.sin(M.t * 8 + i * 1.7) > 0 ? POSE.cheerUp : POSE.cheer;
      }
      ents.push({ kind: 'p', side, p, lib: o.lib, u, v, pose, name, sway: Math.sin(M.t * 4 + i) });
    });
  }
  if (a) { const b = sampleBall(a.script.ball, t); if (b) ents.push({ kind: 'b', u: b.u, v: b.v, z: b.z }); }
  if (typeof s3Active === 'function' && s3Active(M)) { try { s3Frame(M, ents, dt || .016); return; } catch (err) { console.warn('3D non riuscito, torno al 2D', err); UI.mode3d = false; M.s3.cv.style.display = 'none'; const b3 = $("#mode3dbtn"); if (b3) b3.textContent = '3D'; } }
  const cs = updateCam(M, ents, dt || .016);
  const sh = M.shake > .2 ? [(Math.random() - .5) * M.shake, (Math.random() - .5) * M.shake] : [0, 0];
  c.save(); c.translate(sh[0], sh[1]);
  const z = cs.z * (1 + .03 * Math.min(1, M.zoom || 0)), dx = Math.sin(M.t * .8) * 1.5, dy = Math.cos(M.t * .6) * 1.2;
  const tx = Math.max(W * (1 - z), Math.min(0, W / 2 - cs.x * z + dx)), ty = Math.max(H * (1 - z), Math.min(0, H / 2 - cs.y * z + dy));
  c.translate(tx, ty); c.scale(z, z);
  c.drawImage(M.arena.cv, 0, 0, W, H);
  drawCrowd(c, M.arena.crowd, M.t, M.excite);
  if (typeof drawLed === 'function') drawLed(c, M.arena.led);
  drawRefStand(c);

  if (Cam.side) { ents.sort((x, y) => x.v - y.v); drawNet(c); } else ents.sort((x, y) => x.u - y.u);
  let net = false; const labels = [];
  for (const e of ents) {
    if (!net && (Cam.side || e.u >= 0)) { if (!Cam.side) drawNet(c); net = true; }
    if (e.kind === 'b') { drawBall(c, M, e); continue; }
    const pr = proj(e.u, e.v);
    /* leggero ondeggiamento quando ferme: respiro */
    const breath = e.pose === POSE.ready ? Math.sin(M.t * 3 + e.u * 2 + e.v) * .012 : 0;
    const pose = breath ? { ...e.pose, cr: e.pose.cr + breath } : e.pose;
    const kit = e.lib ? { ...M.kits[e.side], main: M.kits.lib, num: M.kits.libNum, shorts: Gx.dark(M.kits.lib, .5), shade: Gx.dark(M.kits.lib, .2), trim: Gx.lum(M.kits.lib) > .5 ? '#1b2234' : '#fff' } : M.kits[e.side];
    const front = e.side !== M.userSide;
    const look = e.p._look || (e.p._look = avatarLook(e.p));
    if (Cam.side) { c.save(); c.translate(pr.x, 0); c.scale(.82, 1); c.translate(-pr.x, 0); }
    const fig = drawFigure(c, pr.x, pr.y, pr.s, { pose, front: Cam.side ? true : front, kit, look, no: playerNo(M, e.p), sway: e.sway });
    if (Cam.side) c.restore();
    if (ACTIVE_POSES.has(e.name) && a && !M.paused) labels.push({ x: fig.head[0], y: fig.head[1] - pr.s * .27 - Math.max(0, pose.lf) * 0, s: pr.s, p: e.p, side: e.side, lf: pose.lf });
  }
  if (!net) drawNet(c);

  /* effetti */
  drawEffects(c, M);
  for (const l of labels.slice(0, 3)) drawNameTag(c, l, M);
  c.restore();
}

function drawBall(c, M, b) {
  const g = proj(b.u, b.v, 0), p = proj(b.u, b.v, b.z), r = Math.max(5.5, .16 * p.s);
  /* scia */
  M.trail.push({ x: p.x, y: p.y }); if (M.trail.length > 7) M.trail.shift();
  for (let i = 0; i < M.trail.length - 1; i++) { const q = M.trail[i]; c.fillStyle = `rgba(255,255,255,${.06 + i * .02})`; c.beginPath(); c.arc(q.x, q.y, r * (.45 + i * .06), 0, 7); c.fill(); }
  const sh = Math.max(.35, 1 - b.z * .12);
  c.fillStyle = `rgba(5,8,16,${.32 * sh})`; c.beginPath(); c.ellipse(g.x, g.y, r * 1.05 * sh, r * .42 * sh, 0, 0, 7); c.fill();
  c.save(); c.translate(p.x, p.y); c.rotate((M.t * 6) % 6.283);
  c.fillStyle = '#fdfdfb'; c.beginPath(); c.arc(0, 0, r, 0, 7); c.fill();
  c.save(); c.beginPath(); c.arc(0, 0, r, 0, 7); c.clip();
  c.fillStyle = '#16966f'; c.beginPath(); c.moveTo(-r, -r * .1); c.quadraticCurveTo(0, -r * .7, r, -r * .1); c.lineTo(r, r * .25); c.quadraticCurveTo(0, -r * .35, -r, r * .25); c.closePath(); c.fill();
  c.fillStyle = '#e23b56'; c.beginPath(); c.moveTo(-r, r * .45); c.quadraticCurveTo(0, -r * .1, r, r * .45); c.lineTo(r, r * .8); c.quadraticCurveTo(0, r * .25, -r, r * .8); c.closePath(); c.fill();
  c.restore();
  c.strokeStyle = 'rgba(20,30,60,.5)'; c.lineWidth = Math.max(1, r * .1); c.beginPath(); c.arc(0, 0, r, 0, 7); c.stroke();
  c.restore();
}
function drawNameTag(c, l, M) {
  const nm = String(l.p.name).trim().split(/\s+/).slice(-1)[0].toUpperCase(), no = playerNo(M, l.p);
  const fs = 15; c.font = `700 ${fs}px "Barlow Condensed",Arial Narrow,sans-serif`;
  const txt = `${no ? no + '  ' : ''}${nm}`, w = c.measureText(txt).width + 18, h = fs + 8;
  const x = Math.max(w / 2 + 4, Math.min(Cam.W - w / 2 - 4, l.x)), y = Math.max(h + 4, l.y);
  c.fillStyle = 'rgba(8,12,22,.82)'; c.beginPath(); c.roundRect(x - w / 2, y - h, w, h, 6); c.fill();
  c.fillStyle = M.kits[l.side].main; c.fillRect(x - w / 2, y - h + 3, 3.5, h - 6);
  c.fillStyle = '#fff'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(txt, x + 2, y - h / 2 + 1);
}
function drawEffects(c, M) {
  const keep = [];
  for (const f of M.fxList) {
    const age = M.t - f.born;
    if (f.type === 'ring' && age < .35) { const p = proj(f.u, f.v, f.z), q = age / .35; c.strokeStyle = `rgba(255,255,255,${.85 * (1 - q)})`; c.lineWidth = 3 * (1 - q) + 1; c.beginPath(); c.arc(p.x, p.y, 8 + q * 46, 0, 7); c.stroke(); c.fillStyle = `rgba(255,236,170,${.5 * (1 - q)})`; c.beginPath(); c.arc(p.x, p.y, 6 + q * 14, 0, 7); c.fill(); keep.push(f); }
    else if (f.type === 'dust' && age < .55) { const p = proj(f.u, f.v, 0), q = age / .55; c.fillStyle = `rgba(255,255,255,${.22 * (1 - q)})`; for (let i = 0; i < 6; i++) { const an = i * 1.047 + .3, rr = (5 + q * 26) * p.s / 55; c.beginPath(); c.arc(p.x + Math.cos(an) * rr * 1.6, p.y + Math.sin(an) * rr * .5, 3 + q * 5, 0, 7); c.fill(); } keep.push(f); }
    else if (f.type === 'text' && age < 1.25) {
      const p = proj(f.u, f.v, f.z + age * .9), q = Math.min(1, age / .18), sc = 1 + (1 - q) * .6, fade = age > .9 ? 1 - (age - .9) / .35 : 1;
      c.save(); c.translate(p.x, Math.max(40, p.y)); c.scale(sc, sc); c.globalAlpha = Math.max(0, fade);
      c.font = `700 ${Cam.portrait ? 44 : 40}px "Barlow Condensed",Arial Narrow,sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.lineWidth = 8; c.strokeStyle = 'rgba(8,12,22,.85)'; c.lineJoin = 'round'; c.strokeText(f.text, 0, 0);
      c.fillStyle = f.win ? '#7af0c0' : '#ff9a8c'; c.fillText(f.text, 0, 0); c.restore(); keep.push(f);
    }
  }
  M.fxList = keep;
}

document.addEventListener('click', e => {
  const el = e.target.closest('[data-act="replay"]'), M = UI.match; if (!el || !M || M.replay || !M.lastA) return;
  const l = M.lastA; M.replay = true; M.replaySpeed = M.speed; M.speed = .5; M.feedKeep = $("#feed").textContent;
  $("#feed").textContent = 'REPLAY · ' + M.feedKeep; M.paused = false;
  M.anim = { ry: l.ry, script: l.script, t: l.script.finalHit ? Math.max(0, l.script.finalHit.t - 2.2) : Math.max(0, l.script.point - 2.5), scored: true, setEnd: false, fired: new Set(), replay: true }; { const rb = $('#rbadge'); if (rb) rb.hidden = false; }
});

document.addEventListener('click', e => {
  const el = e.target.closest('[data-act="camview"]'); if (!el || !UI.match) return;
  UI.camView = el.dataset.v; try { localStorage.setItem('vm-camview2', UI.camView); } catch (x) { }
  document.querySelectorAll('[data-act="camview"]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.v === UI.camView)));
  UI.match.cam = null; sizeCanvas();
});
try { if (typeof UI !== 'undefined' && !UI.camView) UI.camView = localStorage.getItem('vm-camview2') || 'side'; } catch (x) { }
