/* ===== Regia dell'azione v2: scambi di lunghezza variabile, ricezioni, alzate e colpi diversi ===== */
/* Coordinate in metri: u = distanza dalla rete (positivo verso la camera), v = destra/sinistra sullo schermo, z = altezza.
   Per ogni squadra si ragiona in coordinate locali (d = distanza dalla rete, w = verso la propria destra). */
const RALLY = { prep: .55 };

function rallyUV(M, side, i) {
  const sg = side === M.userSide ? 1 : -1, b = BASE[i];
  return [sg * (9 - b[0]), (b[1] - 4.5) * sg];
}

function buildScript(M, ry) {
  const S = ry.sideS, R = ry.sideR, opp = s => (s === 'h' ? 'a' : 'h');
  const sg = s => (s === M.userSide ? 1 : -1);
  const view = {}; view[S] = ry.sview || M.view[S]; view[R] = ry.rview || M.view[R];
  const tracks = {}, ball = [], fx = [], shots = [];
  const rnd = Math.random, rr = (a, b) => a + rnd() * (b - a), pick = a => a[Math.floor(rnd() * a.length)], cl = (x, a, b) => Math.max(a, Math.min(b, x));
  const W = (s, d, w) => [sg(s) * d, sg(s) * w];
  const idxOf = (s, pid) => view[s].findIndex(x => x.p.id === pid);
  const baseOf = (s, pid) => rallyUV(M, s, Math.max(0, idxOf(s, pid)) || (idxOf(s, pid) < 0 ? 1 : 0));
  const lastKey = pid => { const k = tracks[pid]; return k && k[k.length - 1]; };
  const put = (pid, t, u, v, pose) => {
    const tr = tracks[pid] || (tracks[pid] = []), l = tr[tr.length - 1];
    if (l && t <= l.t) t = l.t + .012;
    tr.push({ t, u, v, pose: typeof pose === 'string' ? POSE[pose] : pose, name: typeof pose === 'string' ? pose : '' });
    return t;
  };
  const posAt = pid => { const l = lastKey(pid); return l ? [l.u, l.v] : (M.pos[pid] || [0, 0]); };
  /* spostamento: parte a t0, arriva a t1 con la posa finale; la corsa ha una posa propria */
  const go = (pid, t0, t1, u, v, pose) => {
    const [cu, cv] = posAt(pid), l = lastKey(pid), dist = Math.hypot(u - cu, v - cv);
    if (l && l.name === 'down') t0 = Math.max(t0, l.t + .45);
    if (dist < .12) { put(pid, Math.max(t1, t0 + .05), u, v, pose); return; }
    if (t1 < t0 + .12) t1 = t0 + .12;
    if (l && l.t < t0 - .14) put(pid, t0 - .13, cu, cv, l.pose);
    const run = dist > 1.4 ? 'run' : 'walk';
    put(pid, t0, cu, cv, run);
    if (t1 - t0 > .3) put(pid, t0 + (t1 - t0) * .7, cu + (u - cu) * .86, cv + (v - cv) * .86, run);
    put(pid, t1, u, v, pose);
  };
  const seg = (t0, d, A, B, arc) => ball.push({ t0, t1: t0 + d, A, B, arc: arc || 0 });

  /* ---- posizionamento di partenza: rientro in formazione (piu' lungo se la distanza e' grande) ---- */
  let maxD = 0;
  for (const side of [S, R]) view[side].forEach((o, i) => { const b = rallyUV(M, side, i), f = M.pos[o.p.id] || b; maxD = Math.max(maxD, Math.hypot(b[0] - f[0], b[1] - f[1])); });
  const tPrep = cl(maxD / 6.0, RALLY.prep, 1.4);
  const server = ry.server, sIdx = idxOf(S, server.id), sb = rallyUV(M, S, sIdx < 0 ? 0 : sIdx);
  for (const side of [S, R]) view[side].forEach((o, i) => {
    if (o.p.id === server.id) return;
    const b = rallyUV(M, side, i), from = M.pos[o.p.id] || b;
    put(o.p.id, 0, from[0], from[1], Math.hypot(b[0] - from[0], b[1] - from[1]) > 2.5 ? 'run' : 'walk');
    put(o.p.id, tPrep * .88, b[0], b[1], 'ready');
  });

  /* ---- battuta: float o in salto, con il rituale prima del colpo ---- */
  const jump = (server.srv || 60) > 72 ? rnd() < .78 : rnd() < .16;
  const sv = cl(sb[1] + rr(-1.2, 1.2), -4.2, 4.2);
  const su = sg(S) * (jump ? 10.4 : 9.8);
  const from0 = M.pos[server.id] || sb;
  put(server.id, 0, from0[0], from0[1], 'walk');
  put(server.id, tPrep * .9, su + (jump ? sg(S) * 1.3 : 0), sv, 'ready');
  let tc = tPrep * .92;
  seg(0, tc, [su, sv, 1.1], [su, sv, 1.1], 0);
  const nb = pick([0, 0, 1, 1, 2]);
  for (let i = 0; i < nb; i++) { seg(tc, .2, [su, sv, 1.1], [su, sv, .1], 0); seg(tc + .2, .2, [su, sv, .1], [su, sv, 1.1], 0); tc += .4; }
  const pause = rr(.1, .3); seg(tc, pause, [su, sv, 1.1], [su, sv, 1.1], 0); tc += pause;
  const tToss = tc;
  let hitU, hitZ, tHit0, serveD, serveArc;
  if (jump) {
    const x0 = su + sg(S) * 1.3;
    put(server.id, tToss, x0, sv, 'toss');
    seg(tToss, .7, [x0 - sg(S) * .1, sv, 1.1], [sg(S) * 9.7, sv, 3.4], 2.0);
    put(server.id, tToss + .22, sg(S) * 10.7, sv, 'run');
    put(server.id, tToss + .5, sg(S) * 10.0, sv, 'cock');
    hitU = sg(S) * 9.6; hitZ = 3.4; tHit0 = tToss + .7;
    put(server.id, tHit0, hitU, sv, 'spike'); put(server.id, tHit0 + .14, hitU, sv, 'spikeTop');
    put(server.id, tHit0 + .7, sg(S) * 9.1, sv, 'ready');
    serveD = .62; serveArc = 1.0;
  } else {
    put(server.id, tToss, su, sv, 'toss');
    seg(tToss, .55, [su, sv, 1.1], [su, sv, 2.75], .5);
    hitU = su; hitZ = 2.45; tHit0 = tToss + .55;
    put(server.id, tToss + .42, su, sv, 'toss'); put(server.id, tHit0, su, sv, 'serveHit'); put(server.id, tHit0 + .5, su, sv, 'ready');
    serveD = rr(.95, 1.2); serveArc = 2.2;
  }
  shots.push({ t: 0, cam: (rnd() < .6) ? 'serve' : 'wide', side: S });
  shots.push({ t: tHit0 + .35, cam: 'wide' });
  /* dopo il colpo la battitrice entra in campo nella sua posizione */
  { const hb = rallyUV(M, S, sIdx < 0 ? 0 : sIdx); go(server.id, tHit0 + .5, tHit0 + 1.5, hb[0], hb[1], 'ready'); }

  const rIdx = idxOf(R, ry.receiver.id), rb = rallyUV(M, R, rIdx < 0 ? 1 : rIdx);
  let tgt = [rb[0] + rr(-.5, .5), rb[1] + rr(-.6, .6)];
  const tArr = tHit0 + serveD;
  let tEnd = 0, landU = 0, landV = 0, pointText = '', pointU = 0, pointV = 0, tFinalHit = 0, finU = 0, finV = 0;
  const winner = ry.winner;
  const finishBounce = (t, u, v, big) => {
    seg(t, .32, [u, v, 0], [u + sg(R) * rr(-.4, .4) * (big ? 1 : .4), v + rr(-.5, .5), 0], big ? .5 : .28);
    return t + .32;
  };
  const dive = (pid, t, u, v, pose) => { put(pid, t - .05, u, v, pose || 'dive'); put(pid, t + .55, u, v, 'down'); };

  if (ry.type === 'serr') {
    if (rnd() < .5) {
      seg(tHit0, .6, [hitU, sv, hitZ], [sg(S) * .15, sv, 1.55], .3); tEnd = tHit0 + .6;
      seg(tEnd, .38, [sg(S) * .15, sv, 1.55], [sg(S) * .5, sv, 0], 0); tEnd += .38; landU = sg(S) * .5; landV = sv;
    } else {
      landU = sg(R) * (9 + rr(.6, 1.8)); landV = rr(-3, 3);
      seg(tHit0, serveD, [hitU, sv, hitZ], [landU, landV, 0], serveArc + .2); tEnd = tHit0 + serveD;
    }
    pointText = 'ERRORE'; pointU = landU; pointV = landV;
    put(server.id, tEnd, hitU, sv, 'down');
  } else if (ry.type === 'ace') {
    tgt = [rb[0] + rr(-.6, .6), rb[1] + (rnd() < .5 ? 1 : -1) * rr(1.3, 1.9)];
    seg(tHit0, serveD, [hitU, sv, hitZ], [tgt[0], tgt[1], 0], serveArc);
    put(ry.receiver.id, tHit0 + .05, rb[0], rb[1], 'ready');
    put(ry.receiver.id, tArr - .3, rb[0], rb[1], 'receive');
    put(ry.receiver.id, tArr - .1, tgt[0], tgt[1], 'dive'); put(ry.receiver.id, tArr + .5, tgt[0], tgt[1], 'down');
    tEnd = finishBounce(tArr, tgt[0], tgt[1], false); landU = tgt[0]; landV = tgt[1]; pointText = 'ACE!'; pointU = landU; pointV = landV;
  } else {
    /* ----- scambio vero: battuta -> ricezione -> (alzata -> attacco -> difesa)* ----- */
    const k = pick([0, 0, 0, 0, 0, 1, 1, 2]);
    const plan = [];
    if (ry.type === 'att') { for (let i = 0; i <= k; i++) { plan.push({ side: R, res: 'dug' }); plan.push({ side: S, res: i === k ? 'kill' : 'dug' }); } }
    else { for (let i = 0; i < k; i++) { plan.push({ side: R, res: 'dug' }); plan.push({ side: S, res: 'dug' }); } plan.push({ side: R, res: ry.type === 'kill' ? 'kill' : ry.type === 'block' ? 'blocked' : 'err' }); }
    plan.forEach((p, i) => { if (i < plan.length - 1 && p.res === 'dug' && i > 0 && rnd() < .22) p.kind = 'free'; });

    /* ---- funzioni dell'azione ---- */
    const front = side => view[side].map((o, i) => ({ o, i })).filter(x => x.i >= 3);
    const setterOf = (side, excl) => {
      const ps = view[side].filter(o => o.p.id !== excl && !o.lib);
      return (ps.find(o => o.p.role === 'P') || ps.find(o => o.p.role === 'S') || ps[0]).p;
    };
    const SETPOS = { p: [.9, 1.7], o: null, x: null };
    const passTo = (side, pid, u, v, tA, q, pose, jumpBias) => {
      const [cu, cv] = posAt(pid), dist = Math.hypot(u - cu, v - cv), diving = pose === 'dig' && dist > 2.4;
      const tm = Math.max(.25, dist / 5.4);
      go(pid, tA - tm - .08, tA - .1, u, v, diving ? 'ready' : 'receive');
      put(pid, tA, u, v, diving ? 'dive' : pose === 'dig' ? 'dig' : 'bump');
      put(pid, tA + (diving ? .55 : .45), u, v, diving ? 'down' : 'ready');
      let sp, fl, arc;
      if (q === 'p') { sp = [.9 + rr(-.1, .2), 1.7 + rr(-.3, .3)]; fl = rr(.7, .8); arc = 2.2; }
      else if (q === 'o') { sp = [rr(.8, 1.9), rr(.2, 2.6)]; fl = rr(.82, .95); arc = 2.7; }
      else { sp = [rr(1.8, 3.2), rr(-.4, 3.4)]; fl = rr(1.0, 1.15); arc = 4.2; }
      const wp = W(side, sp[0], sp[1]);
      seg(tA, fl, [u, v, .95], [wp[0], wp[1], 2.3], arc);
      return { tSet: tA + fl, sp, wp, q };
    };
    const choosePasser = (side, u, v, excl) => {
      let best = null, bd = 1e9;
      view[side].forEach((o, i) => {
        if (excl && excl.includes(o.p.id)) return;
        const [cu, cv] = posAt(o.p.id), d = Math.hypot(cu - u, (cv - v) * 1.15) + (o.p.role === 'P' ? 1.6 : 0) + (i >= 3 ? 1.0 : 0) + (o.p.role === 'L' ? -.8 : 0);
        if (d < bd) { bd = d; best = o.p.id; }
      });
      return best;
    };

    /* difesa: muro + copertura del campo; restituisce i muratori */
    const setupDefense = (Y, X, tFrom, tReady, vAtk, nBlock, mainBlk, hitT) => {
      const fr = front(Y).map(x => ({ ...x, b: rallyUV(M, Y, x.i) })).sort((a, b) => Math.abs(b.b[1] * 0 + posAt(b.o.p.id)[1] - vAtk) - Math.abs(posAt(a.o.p.id)[1] - vAtk)).reverse();
      const blk = [];
      if (nBlock > 0) {
        const main = (mainBlk && fr.find(x => x.o.p.id === mainBlk)) || fr[0];
        blk.push(main);
        for (const f of fr) { if (blk.length >= nBlock) break; if (f !== main) blk.push(f); }
      }
      const bpos = blk.map((x, j) => [sg(Y) * .55, cl(vAtk + (j === 0 ? 0 : (x.b[1] > vAtk ? .8 : -.8)), -3.8, 3.8)]);
      blk.forEach((x, j) => {
        const pid = x.o.p.id, cp = posAt(pid);
        go(pid, tFrom, tReady - .2, sg(Y) * .8, cl(bpos[j][1] * 1.0, -3.8, 3.8), 'ready');
        put(pid, hitT - .22, bpos[j][0], bpos[j][1], 'ready');
        put(pid, hitT - .08, bpos[j][0], bpos[j][1], 'block');
        put(pid, hitT + .08, bpos[j][0], bpos[j][1], 'blockUp');
        put(pid, hitT + .55, bpos[j][0], bpos[j][1], 'ready');
      });
      /* i restanti coprono il campo */
      const bids = new Set(blk.map(x => x.o.p.id));
      const spots = [
        { d: 6.2, v: cl(-vAtk * .55 + rr(-.5, .5), -3.8, 3.8) },
        { d: 7.9, v: cl(vAtk * .25 + rr(-.6, .6), -3.6, 3.6) },
        { d: 5.0, v: cl(vAtk * 1.1 + (vAtk >= 0 ? 1.1 : -1.1), -4.1, 4.1) },
        { d: 3.2, v: cl(vAtk * .4 + rr(-1, 1), -3.4, 3.4) }
      ];
      for (let a = 0; a < spots.length; a++) for (let b = a + 1; b < spots.length; b++) {
        if (Math.abs(spots[a].d - spots[b].d) < 2.2 && Math.abs(spots[a].v - spots[b].v) < 1.9) spots[b].v = cl(spots[a].v + (spots[b].v >= spots[a].v ? 1.9 : -1.9), -4.2, 4.2);
        if (Math.abs(spots[a].d - spots[b].d) < 2.2 && Math.abs(spots[a].v - spots[b].v) < 1.5) spots[b].v = spots[a].v - (spots[a].v > 0 ? 1.9 : -1.9);
      }
      const free = view[Y].filter(o => !bids.has(o.p.id) && o.p.role !== 'P');
      const used = new Set(), res = [];
      spots.forEach((sp, j) => {
        let best = null, bd = 1e9;
        free.forEach(o => { if (used.has(o.p.id)) return; const [cu, cv] = posAt(o.p.id), d = Math.hypot(cu - sg(Y) * sp.d, cv - sp.v); if (d < bd) { bd = d; best = o; } });
        if (best) { used.add(best.p.id); res.push({ pid: best.p.id, u: sg(Y) * sp.d, v: sp.v, j }); go(best.p.id, tFrom + rr(0, .15), tReady, sg(Y) * sp.d, sp.v, 'ready'); }
      });
      /* l'alzatrice avversaria si porta a rete per la prossima azione */
      return { blk: blk.map(x => x.o.p.id), spots: res };
    };

    /* alzata + attacco + esito. Restituisce lo stato per il passaggio successivo */
    const rally = (X, pass, fcPid, res, tPrevHit) => {
      const Y = opp(X), q = pass.q;
      const setter = setterOf(X, fcPid), tSet = pass.tSet;
      /* chi attacca */
      const wanted = res === 'kill' || res === 'blocked' || res === 'err' ? (X === R ? ry.atkR : ry.atkS) : null;
      let cand = view[X].map((o, i) => ({ o, i })).filter(({ o, i }) => o.p.id !== setter.id && o.p.id !== fcPid && !o.lib && o.p.role !== 'L' && (i >= 3 || o.p.role === 'S' || o.p.role === 'O'));
      if (!cand.length) cand = view[X].map((o, i) => ({ o, i })).filter(({ o }) => o.p.id !== setter.id && o.p.role !== 'L');
      let ch = wanted && cand.find(c => c.o.p.id === wanted.id);
      if (!ch || (ch.i < 3 && rnd() < .5)) {
        const wts = cand.map(c => Math.pow((c.o.p.att || 60) / 70, 3) * (c.i >= 3 ? 1 : .22) * (q === 'x' && c.i === 4 ? .15 : 1));
        let r = rnd() * wts.reduce((a, b) => a + b, 0); ch = cand[cand.length - 1];
        for (let j = 0; j < cand.length; j++) { r -= wts[j]; if (r <= 0) { ch = cand[j]; break; } }
      }
      const att = ch.o.p, ai = ch.i;
      let kind = ai === 4 ? 'quick' : ai === 3 ? 'out' : ai === 5 ? 'right' : 'pipe';
      if (q === 'x' && kind === 'quick') kind = 'out';
      const SK = {
        quick: { d: .42, w: rr(-.5, .8), fl: .30, arc: .35, z: 2.95, ad: 2.8, ap: .55 },
        out:   { d: .5,  w: -3.6, fl: .82, arc: 2.5, z: 3.1, ad: 4.0, ap: .85 },
        right: { d: .5,  w: 3.5,  fl: .80, arc: 2.5, z: 3.1, ad: 4.0, ap: .85 },
        pipe:  { d: 3.5, w: rr(-.9, .9), fl: .76, arc: 2.2, z: 3.0, ad: 6.2, ap: .85 }
      }[kind];
      const wA = W(X, SK.d, SK.w), tHit = tSet + SK.fl;
      /* alzatrice */
      const sPos = pass.wp, jumpSet = kind === 'quick' && q === 'p' && rnd() < .7;
      go(setter.id, tPrevHit != null ? tSet - 1.0 : tSet - .8, tSet - .12, sPos[0], sPos[1], 'setReady');
      put(setter.id, tSet, sPos[0], sPos[1], jumpSet ? 'setJump' : 'set');
      put(setter.id, tSet + .3, sPos[0], sPos[1], 'ready');
      seg(tSet, SK.fl, [sPos[0], sPos[1], 2.3], [wA[0], wA[1], SK.z], SK.arc);
      /* attaccante: rincorsa, caricamento, colpo */
      const startW = cl(SK.w * 1.08 + (SK.w < 0 ? -.35 : .35), -4.2, 4.2), aStart = W(X, SK.ad, kind === 'quick' ? cl(SK.w + rr(-.6, .6), -2, 2) : startW);
      go(att.id, tHit - SK.ap - .55, tHit - SK.ap + .1, aStart[0], aStart[1], 'ready');
      const aMid = W(X, SK.d + (SK.ad - SK.d) * .22, SK.w);
      put(att.id, tHit - .2, aMid[0] + sg(X) * .1, aMid[1], 'cock');
      put(att.id, tHit, wA[0], wA[1], 'spike'); put(att.id, tHit + .14, wA[0] - sg(X) * .05, wA[1], 'spikeTop');
      const vAtk = wA[1];
      /* difesa avversaria */
      const nBlock = kind === 'pipe' ? (rnd() < .4 ? 1 : 0) : kind === 'quick' ? (rnd() < .6 ? 2 : 1) : (rnd() < .65 ? 2 : (rnd() < .3 ? 3 : 1));
      const mainBlk = res === 'blocked' && X === R && ry.blocker ? ry.blocker.id : null;
      const def = setupDefense(Y, X, (tPrevHit != null ? tPrevHit + .4 : tHit0 + .6), tHit - .3, vAtk, nBlock, mainBlk, tHit);
      fx.push({ t: tHit, type: 'ring', u: wA[0], v: wA[1], z: 3.05, big: res === 'kill' });
      /* esito */
      const rel = [wA[0], wA[1], SK.z];
      const finishAttacker = () => put(att.id, tHit + .55, wA[0] - sg(X) * .35, wA[1], res === 'err' || res === 'blocked' ? 'down' : 'ready');
      if (res === 'blocked') {
        const bk = def.blk.length ? def.blk : [];
        const bpid = bk[0] || null, bu = sg(Y) * .4;
        seg(tHit, .11, rel, [bu, vAtk, 2.85], .1);
        const lu = sg(X) * rr(.9, 4.2), lv = cl(vAtk + rr(-1.5, 1.5), -4.1, 4.1);
        seg(tHit + .11, .5, [bu, vAtk, 2.85], [lu, lv, 0], 1.4);
        finishAttacker();
        tFinalHit = tHit; finU = wA[0]; finV = wA[1];
        const dg = choosePasser(X, lu, lv, [att.id, setter.id]); if (dg) { const [cu, cv] = posAt(dg); go(dg, tHit + .1, tHit + .58, lu + sg(X) * .2, lv, 'ready'); dive(dg, tHit + .66, lu, lv + (lv > cv ? -.3 : .3), 'dive'); }
        tEnd = finishBounce(tHit + .61, lu, lv, true); landU = lu; landV = lv; pointText = 'MURO!'; pointU = bu; pointV = vAtk;
        return { done: true };
      }
      if (res === 'err') {
        finishAttacker(); tFinalHit = tHit; finU = wA[0]; finV = wA[1];
        if (rnd() < .4) {
          seg(tHit, .24, rel, [sg(Y) * .15, vAtk, 1.4], .1); seg(tHit + .24, .36, [sg(Y) * .15, vAtk, 1.4], [sg(X) * .1, vAtk, 0], 0);
          tEnd = tHit + .6; landU = sg(X) * .1; landV = vAtk; pointText = 'RETE'; pointU = 0; pointV = vAtk;
        } else {
          landU = sg(Y) * (9 + rr(.7, 2)); landV = cl(vAtk + rr(-2.2, 2.2), -5.8, 5.8);
          if (rnd() < .4) { landV = sg(X) * 0 + (rnd() < .5 ? -1 : 1) * rr(4.7, 5.9); landU = sg(Y) * rr(3, 8); }
          seg(tHit, .5, rel, [landU, landV, 0], .3); tEnd = tHit + .5; pointText = 'FUORI'; pointU = landU; pointV = landV;
        }
        return { done: true };
      }
      /* colpo: potente, pallonetto o piazzato; scelta in base alla zona di arrivo */
      if (res === 'kill') {
        let lu, lv;
        const sp0 = pick(def.spots.length ? def.spots : [{ u: sg(Y) * 6, v: 0 }]);
        const shot = rnd() < .2 ? 'tip' : rnd() < .25 ? 'roll' : 'power';
        if (shot === 'tip') { lu = sg(Y) * rr(1.3, 3.0); lv = cl(vAtk + rr(-1.6, 1.6), -4, 4); }
        else if (shot === 'roll') { lu = sg(Y) * rr(7, 8.7); lv = cl(vAtk * -.4 + rr(-1.5, 1.5), -4.1, 4.1); }
        else { lu = sg(Y) * rr(3.5, 8.3); lv = cl(sp0.v + (rnd() < .5 ? -1 : 1) * rr(1.8, 2.8), -4.2, 4.2); }
        const dist = Math.hypot(lu - wA[0], lv - vAtk), fl = shot === 'power' ? Math.max(.36, dist / 18) : shot === 'tip' ? Math.max(.5, dist / 5.2) : Math.max(.7, dist / 9);
        seg(tHit, fl, rel, [lu, lv, 0], shot === 'power' ? .25 : shot === 'tip' ? 1.0 : 2.0);
        finishAttacker(); tFinalHit = tHit; finU = wA[0]; finV = wA[1];
        const dg = choosePasser(Y, lu, lv, def.blk.concat([])); if (dg) { const [cu, cv] = posAt(dg); go(dg, tHit + .12, tHit + fl - .05, lu + sg(Y) * .6, lv + (lv > cv ? -.5 : .5), 'ready'); dive(dg, tHit + fl, lu + sg(Y) * .55, lv + (lv > cv ? -.45 : .45), 'dive'); }
        tEnd = finishBounce(tHit + fl, lu, lv, true); landU = lu; landV = lv; pointText = shot === 'tip' ? 'PALLONETTO' : 'PUNTO'; pointU = lu; pointV = lv;
        return { done: true };
      }
      /* 'dug': la difesa recupera */
      finishAttacker();
      const touch = def.blk.length && rnd() < .3, qd = pick(['p', 'p', 'o', 'o', 'x']);
      let lu, lv, tLand, shotName;
      if (touch) {
        const bpos = posAt(def.blk[0]), bu = sg(Y) * .45;
        seg(tHit, .11, rel, [bu, vAtk, 3.0], .1);
        lu = sg(Y) * rr(4.5, 8); lv = cl(vAtk + rr(-3, 3), -4.4, 4.4);
        seg(tHit + .11, .8, [bu, vAtk, 3.0], [lu, lv, .55], 2.8); tLand = tHit + .91;
        return { done: false, side: Y, u: lu, v: lv, t: tLand, q: 'x', pose: 'dig', tHit, def, touch: true, skip: [att.id] };
      }
      const sp0 = def.spots.length ? pick(def.spots) : { u: sg(Y) * 6, v: 0, pid: view[Y][1].p.id, j: 0 };
      lu = sp0.u + rr(-.4, .4) * sg(Y); lv = sp0.v + rr(-.4, .4);
      const dist = Math.hypot(lu - wA[0], lv - vAtk), power = sp0.j !== 3;
      const fl = power ? Math.max(.38, dist / 16) : Math.max(.5, dist / 5.6);
      seg(tHit, fl, rel, [lu, lv, .55], power ? .25 : 1.0); tLand = tHit + fl;
      return { done: false, side: Y, u: lu, v: lv, t: tLand, q: qd, pose: 'dig', tHit, def, pid: sp0.pid, skip: [att.id] };
    };

    /* ---- ciclo principale ---- */
    // prima ricezione di battuta
    const rpid = ry.receiver.id;
    put(rpid, tHit0 + .05, rb[0], rb[1], 'ready');
    const jb = jump ? .08 : 0, x0 = rnd();
    const q0 = x0 < .42 - jb ? 'p' : x0 < .8 - jb ? 'o' : 'x';
    seg(tHit0, serveD, [hitU, sv, hitZ], [tgt[0], tgt[1], .95], serveArc);
    let pass = passTo(R, rpid, tgt[0], tgt[1], tArr, q0, 'receive'), fc = rpid, tPrevHit = null, side = R;
    for (let i = 0; i < plan.length; i++) {
      const p = plan[i];
      if (p.kind === 'free') {
        /* free ball: la palla viene rimandata di bagher, senza attacco */
        const sp = pass.sp, fcp = setterOf(side, fc);
        const pid2 = choosePasser(side, pass.wp[0], pass.wp[1], [fc]);
        const t2 = pass.tSet, [cu, cv] = posAt(pid2);
        go(pid2, t2 - .8, t2 - .1, pass.wp[0], pass.wp[1], 'receive'); put(pid2, t2, pass.wp[0], pass.wp[1], 'bump'); put(pid2, t2 + .5, pass.wp[0], pass.wp[1], 'ready');
        const Y = opp(side), rb2 = rallyUV(M, Y, pick([0, 1, 2])), lu = rb2[0] + rr(-.5, .5), lv = rb2[1] + rr(-.8, .8);
        seg(t2, 1.2, [pass.wp[0], pass.wp[1], 2.2], [lu, lv, .95], 3.2);
        const rcv = choosePasser(Y, lu, lv, null), tA2 = t2 + 1.2;
        const qq = pick(['p', 'p', 'p', 'o']);
        // difesa/ricezione dell'altra squadra
        pass = passTo(Y, rcv, lu, lv, tA2, qq, 'receive'); fc = rcv; side = Y; tPrevHit = t2 + .1;
        // riallinea il piano: la squadra che aveva 'free' perde l'attacco, quindi la sequenza si sposta
        plan.splice(i, 1); i--; continue;
      }
      const out = rally(p.side, pass, fc, p.res, tPrevHit);
      if (out.done) break;
      // palla recuperata dall'altra squadra
      const dgPid = out.pid || choosePasser(out.side, out.u, out.v, out.def ? out.def.blk.concat(out.skip || []) : out.skip);
      pass = passTo(out.side, dgPid, out.u, out.v, out.t, out.q, out.pose);
      fc = dgPid; tPrevHit = out.tHit; side = out.side;
    }
  }

  /* ---- festa e delusione ---- */
  const tPoint = tEnd, loser = winner === 'h' ? 'a' : 'h';
  view[winner].forEach((o, i) => { const l = lastKey(o.p.id), u = l ? l.u : 0, v = l ? l.v : 0; if (!l || l.t < tPoint - .1) put(o.p.id, tPoint, u, v, 'ready'); put(o.p.id, tPoint + .2, u, v, i % 2 ? 'cheerUp' : 'cheer'); put(o.p.id, tPoint + .45, u, v, 'ready'); put(o.p.id, tPoint + .65, u, v, i % 2 ? 'cheer' : 'cheerUp'); });
  view[loser].forEach(o => { const l = lastKey(o.p.id), u = l ? l.u : 0, v = l ? l.v : 0; if (!l || l.t < tPoint - .1) put(o.p.id, tPoint, u, v, 'ready'); put(o.p.id, tPoint + .35, u, v, 'down'); });
  fx.push({ t: tPoint, type: 'dust', u: landU, v: landV });
  fx.push({ t: tPoint + .05, type: 'text', text: pointText, u: pointU, v: pointV, z: 1.4 });
  if (tFinalHit && rnd() < .55) {
    shots.push({ t: tFinalHit - .55, cam: 'zoom', u: finU, v: finV, tHit: tFinalHit });
    shots.push({ t: tPoint + .12, cam: 'react', side: winner }); shots.push({ t: tPoint + 1.1, cam: 'wide' });
  } else if (rnd() < .4) { shots.push({ t: tPoint + .12, cam: 'react', side: winner }); shots.push({ t: tPoint + 1.0, cam: 'wide' }); }
  const dur = tPoint + 1.0;
  for (const pid in tracks) tracks[pid].sort((a, b) => a.t - b.t);
  ball.sort((a, b) => a.t0 - b.t0);
  shots.sort((a, b) => a.t - b.t);
  return { tracks, ball, fx, point: tPoint, end: dur, view, shots, srvU: su, srvV: sv, finalHit: tFinalHit ? { t: tFinalHit, u: finU, v: finV } : null, server };
}

/* campionamento */
function sampleTrack(tr, t) {
  if (!tr || !tr.length) return null;
  if (t <= tr[0].t) return { u: tr[0].u, v: tr[0].v, pose: tr[0].pose, moving: 0, name: tr[0].name };
  for (let i = 0; i < tr.length - 1; i++) {
    const a = tr[i], b = tr[i + 1];
    if (t >= a.t && t <= b.t) {
      const f = b.t === a.t ? 1 : (t - a.t) / (b.t - a.t), e = f * f * (3 - 2 * f);
      const mv = Math.hypot(b.u - a.u, b.v - a.v) / Math.max(.05, b.t - a.t);
      return { u: a.u + (b.u - a.u) * e, v: a.v + (b.v - a.v) * e, pose: poseBlend(a.pose, b.pose, f), moving: mv, name: f < .5 ? a.name : b.name };
    }
  }
  const l = tr[tr.length - 1]; return { u: l.u, v: l.v, pose: l.pose, moving: 0, name: l.name };
}
function sampleBall(ball, t) {
  if (!ball.length) return null;
  if (t <= ball[0].t0) { const s = ball[0]; return { u: s.A[0], v: s.A[1], z: s.A[2] }; }
  for (const s of ball) {
    if (t >= s.t0 && t <= s.t1) {
      const f = (t - s.t0) / Math.max(.001, s.t1 - s.t0);
      return { u: s.A[0] + (s.B[0] - s.A[0]) * f, v: s.A[1] + (s.B[1] - s.A[1]) * f, z: s.A[2] + (s.B[2] - s.A[2]) * f + s.arc * 4 * f * (1 - f) };
    }
  }
  const l = ball[ball.length - 1]; return { u: l.B[0], v: l.B[1], z: l.B[2] };
}
