/* ===== Regia dell'azione: trasforma l'esito di uno scambio in una sequenza animata ===== */
/* Coordinate in metri: u = distanza dalla rete (positivo verso la camera), v = destra/sinistra sullo schermo, z = altezza. */
const RALLY = { prep: .55 };

function rallyUV(M, side, i) {
  const sg = side === M.userSide ? 1 : -1, b = BASE[i];
  return [sg * (9 - b[0]), (b[1] - 4.5) * sg];
}
function buildScript(M, ry) {
  const S = ry.sideS, R = ry.sideR;
  const sgn = s => (s === M.userSide ? 1 : -1);
  const sS = sgn(S), sR = sgn(R);
  const view = {}; view[S] = ry.sview || M.view[S]; view[R] = ry.rview || M.view[R];
  const tracks = {}, ball = [], fx = [];
  const rr = (a, b) => a + Math.random() * (b - a);
  const idxOf = (side, pid) => view[side].findIndex(x => x.p.id === pid);
  const baseOf = (side, pid) => { const i = idxOf(side, pid); return rallyUV(M, side, i < 0 ? 1 : i); };
  const key = (pid, t, u, v, pose) => { (tracks[pid] || (tracks[pid] = [])).push({ t, u, v, pose: typeof pose === 'string' ? POSE[pose] : pose, name: typeof pose === 'string' ? pose : '' }); };
  const seg = (t0, d, A, B, arc) => ball.push({ t0, t1: t0 + d, A, B, arc: arc || 0 });
  const lastKey = pid => { const k = tracks[pid]; return k && k[k.length - 1]; };

  /* posizioni di partenza e rientro in formazione */
  const tPrep = RALLY.prep;
  const server = ry.server;
  for (const side of [S, R]) view[side].forEach((o, i) => {
    const b = rallyUV(M, side, i), from = M.pos[o.p.id] || b;
    key(o.p.id, 0, from[0], from[1], 'walk');
    key(o.p.id, tPrep * .85, b[0], b[1], 'ready');
  });
  /* il battitore va dietro la linea di fondo */
  const sIdx = idxOf(S, server.id), sb = rallyUV(M, S, sIdx < 0 ? 0 : sIdx);
  const su = sS * 9.9, sv = sb[1];
  tracks[server.id] = [];
  { const from = M.pos[server.id] || sb; key(server.id, 0, from[0], from[1], 'walk'); key(server.id, tPrep * .9, su, sv, 'ready'); }

  /* servizio */
  const tToss = tPrep;
  seg(0, tToss, [su, sv, 1.15], [su, sv, 1.15], 0);
  seg(tToss, .5, [su, sv, 1.15], [su, sv, 2.95], .55);
  key(server.id, tToss, su, sv, 'toss'); key(server.id, tToss + .4, su, sv, 'toss'); key(server.id, tToss + .52, su, sv, 'serveHit'); key(server.id, tToss + .9, su, sv, 'ready');
  const tHit0 = tToss + .52;
  const rIdx = idxOf(R, ry.receiver.id), rb = rallyUV(M, R, rIdx < 0 ? 1 : rIdx);
  let tgt = [rb[0] + rr(-.5, .5), rb[1] + rr(-.5, .5)];
  const serveD = .85;
  let tEnd = 0, landU = 0, landV = 0, winner = ry.winner, pointText = '', pointU = 0, pointV = 0;

  const finishBounce = (t, u, v, big) => {
    seg(t, .32, [u, v, 0], [u + sgn(R) * rr(-.4, .4) * (big ? 1 : .4), v + rr(-.5, .5), 0], big ? .5 : .28);
    return t + .32;
  };
  const dive = (side, pid, t, u, v, pose) => {
    const k0 = lastKey(pid), b = k0 || { u, v };
    key(pid, t - .28, b.u, b.v, 'ready'); key(pid, t - .05, u, v, pose || 'dive'); key(pid, t + .55, u, v, 'down');
  };
  const blkAt = (pid, bv, side, th, dly) => { const b = baseOf(side, pid); key(pid, th - .4, b[0], b[1], 'ready'); key(pid, th - .22 + dly, sgn(side) * .75, bv, 'ready'); key(pid, th - .06 + dly, sgn(side) * .55, bv, 'block'); key(pid, th + .08 + dly, sgn(side) * .5, bv, 'blockUp'); key(pid, th + .52 + dly, sgn(side) * .5, bv, 'ready'); };
  const nearestBack = (side, u, v, excl) => {
    let best = null, bd = 1e9;
    view[side].forEach((o, i) => { if (i > 2 || (excl && excl.includes(o.p.id))) return; const b = rallyUV(M, side, i), d = Math.hypot(b[0] - u, (b[1] - v) * 1.3); if (d < bd) { bd = d; best = { pid: o.p.id, base: b }; } });
    return best;
  };

  if (ry.type === 'serr') {
    const net = Math.random() < .5;
    if (net) {
      seg(tHit0, .6, [su, sv, 2.8], [sS * .15, sv, 1.55], .3); tEnd = tHit0 + .6;
      seg(tEnd, .38, [sS * .15, sv, 1.55], [sS * .5, sv, 0], 0); tEnd += .38; landU = sS * .5; landV = sv;
    } else {
      const lu = sR * (9 + rr(.6, 1.8)); landU = lu; landV = rr(-3, 3);
      seg(tHit0, serveD, [su, sv, 2.8], [lu, landV, 0], 2.4); tEnd = tHit0 + serveD;
    }
    pointText = 'ERRORE'; pointU = landU; pointV = landV;
    key(server.id, tEnd, su, sv, 'down');
  } else {
    /* palla in battuta fino alla zona di ricezione */
    if (ry.type === 'ace') { tgt = [rb[0] + sR * rr(-1, 1) * .0 + rr(-.6, .6), rb[1] + (Math.random() < .5 ? 1 : -1) * rr(1.3, 1.9)]; }
    seg(tHit0, serveD, [su, sv, 2.8], [tgt[0], tgt[1], ry.type === 'ace' ? 0 : .95], 2.3);
    const tArr = tHit0 + serveD;
    const rpid = ry.receiver.id;
    key(rpid, tHit0 + .05, rb[0], rb[1], 'ready');
    if (ry.type === 'ace') {
      key(rpid, tArr - .22, tgt[0], tgt[1], 'dive'); key(rpid, tArr + .5, tgt[0], tgt[1], 'down');
      tEnd = finishBounce(tArr, tgt[0], tgt[1], false); landU = tgt[0]; landV = tgt[1]; pointText = 'ACE!'; pointU = landU; pointV = landV;
    } else {
      key(rpid, tArr - .28, tgt[0], tgt[1], 'receive'); key(rpid, tArr, tgt[0], tgt[1], 'bump'); key(rpid, tArr + .45, tgt[0], tgt[1], 'ready');
      /* alzata */
      const setter = ry.setter, sB = baseOf(R, setter.id);
      const setT = [sR * 1.25, 1.0 * sR];
      const tSet = tArr + .72;
      seg(tArr, .72, [tgt[0], tgt[1], .95], [setT[0], setT[1], 2.3], 2.2);
      key(setter.id, tHit0 + .05, sB[0], sB[1], 'ready'); key(setter.id, tArr + .1, setT[0], setT[1], 'setReady'); key(setter.id, tSet, setT[0], setT[1], 'set'); key(setter.id, tSet + .25, setT[0], setT[1], 'ready');
      /* attacco */
      const atk = ry.atkR, aI = idxOf(R, atk.id), aB = rallyUV(M, R, aI < 0 ? 4 : aI);
      const cu = sR * .9, cv = clamp(aB[1] * .92, -3.7, 3.7);
      const dSet = .46, tHit = tSet + dSet;
      seg(tSet, dSet, [setT[0], setT[1], 2.3], [cu, cv, 3.08], 1.4);
      key(atk.id, tSet - .4, aB[0], aB[1], 'ready'); key(atk.id, tHit - .42, cu + sR * 2.3, cv, 'ready'); key(atk.id, tHit - .17, cu + sR * .85, cv, 'cock'); key(atk.id, tHit, cu, cv, 'spike'); key(atk.id, tHit + .13, cu - sR * .05, cv, 'spikeTop'); key(atk.id, tHit + .5, cu - sR * .1, cv, 'ready');
      fx.push({ t: tHit, type: 'ring', u: cu, v: cv, z: 3.05 });
      /* muro avversario */
      const blk = (pid, bv, side, dly) => blkAt(pid, bv, side, tHit, dly);
      const front = side => view[side].map((o, i) => ({ pid: o.p.id, i })).filter(o => o.i >= 3);
      const pickBlockers = (side, v, force) => {
        const fr = front(side).map(o => ({ ...o, b: rallyUV(M, side, o.i) })).sort((a, b) => Math.abs(a.b[1] - v) - Math.abs(b.b[1] - v));
        const main = force ? fr.find(o => o.pid === force) || fr[0] : fr[0], out = [{ ...main, v: clamp(v, -3.6, 3.6) }];
        if (fr[1] && Math.random() < .55) out.push({ ...fr[1], v: clamp(v + (fr[1].b[1] > v ? .8 : -.8), -3.8, 3.8) });
        return out;
      };
      if (ry.type === 'block') {
        const bl = pickBlockers(S, cv, ry.blocker.id);
        bl.forEach((o, k) => blk(o.pid, o.v, S, k * .03));
        const bu = sS * .3, bv = bl[0].v;
        seg(tHit, .13, [cu, cv, 3.08], [bu, bv, 2.7], .1);
        const lu = sR * rr(1.0, 4.2), lv = clamp(cv + rr(-1.4, 1.4), -4.1, 4.1);
        seg(tHit + .13, .5, [bu, bv, 2.7], [lu, lv, 0], 1.6);
        tEnd = finishBounce(tHit + .63, lu, lv, true); landU = lu; landV = lv; pointText = 'MURO!'; pointU = bu; pointV = bv;
        key(atk.id, tHit + .6, cu - sR * .1, cv, 'down');
        const dg = nearestBack(R, lu, lv, [atk.id]); if (dg) dive(R, dg.pid, tHit + .63, lu - sR * .0, lv + .3, 'dive');
      } else {
        const bl = pickBlockers(S, cv);
        bl.forEach((o, k) => blk(o.pid, o.v, S, k * .03));
        if (ry.type === 'kill') {
          const lu = sS * rr(2.3, 8), lv = rr(-3.7, 3.7);
          seg(tHit, .44, [cu, cv, 3.08], [lu, lv, 0], .25);
          const dg = nearestBack(S, lu, lv, bl.map(o => o.pid)); if (dg) dive(S, dg.pid, tHit + .44, lu + sS * .55, lv + (lv > 0 ? -.45 : .45), 'dive');
          tEnd = finishBounce(tHit + .44, lu, lv, true); landU = lu; landV = lv; pointText = 'PUNTO'; pointU = lu; pointV = lv;
        } else if (ry.type === 'rerr') {
          if (Math.random() < .45) {
            seg(tHit, .24, [cu, cv, 3.08], [sS * .2, cv, 1.3], .1); seg(tHit + .24, .36, [sS * .2, cv, 1.3], [sR * .1, cv, 0], 0);
            tEnd = tHit + .6; landU = sR * .1; landV = cv; pointText = 'RETE'; pointU = 0; pointV = cv;
          } else {
            const lu = sS * (9 + rr(.6, 1.8)), lv = clamp(cv + rr(-2, 2), -5.5, 5.5);
            seg(tHit, .5, [cu, cv, 3.08], [lu, lv, 0], .3); tEnd = tHit + .5; landU = lu; landV = lv; pointText = 'FUORI'; pointU = lu; pointV = lv;
          }
          key(atk.id, tEnd, cu - sR * .1, cv, 'down');
        } else {
          /* contrattacco: la difesa recupera e la squadra al servizio chiude */
          const dpos = [sS * rr(5, 7.5), clamp(cv + rr(-1.5, 1.5), -3.6, 3.6)];
          const dg = nearestBack(S, dpos[0], dpos[1], bl.map(o => o.pid)) || { pid: view[S][1].p.id, base: rallyUV(M, S, 1) };
          const tDig = tHit + .46;
          seg(tHit, .46, [cu, cv, 3.08], [dpos[0], dpos[1], .55], .3);
          dive(S, dg.pid, tDig, dpos[0], dpos[1], 'dig');
          const setS = (view[S].find(o => o.p.role === 'P') || view[S][4]).p, sSB = baseOf(S, setS.id);
          const setT2 = [sS * 1.25, 1.0 * sS], tSet2 = tDig + .78;
          seg(tDig, .78, [dpos[0], dpos[1], .55], [setT2[0], setT2[1], 2.3], 2.8);
          key(setS.id, tHit - .2, sSB[0], sSB[1], 'ready'); key(setS.id, tDig - .1, setT2[0], setT2[1], 'setReady'); key(setS.id, tSet2, setT2[0], setT2[1], 'set'); key(setS.id, tSet2 + .25, setT2[0], setT2[1], 'ready');
          const atk2 = ry.atkS, bI = idxOf(S, atk2.id), bB = rallyUV(M, S, bI < 0 ? 4 : bI);
          const cu2 = sS * .9, cv2 = clamp(bB[1] * .92, -3.7, 3.7), tHit2 = tSet2 + .46;
          seg(tSet2, .46, [setT2[0], setT2[1], 2.3], [cu2, cv2, 3.08], 1.4);
          key(atk2.id, tSet2 - .45, bB[0], bB[1], 'ready'); key(atk2.id, tHit2 - .42, cu2 + sS * 2.3, cv2, 'ready'); key(atk2.id, tHit2 - .17, cu2 + sS * .85, cv2, 'cock'); key(atk2.id, tHit2, cu2, cv2, 'spike'); key(atk2.id, tHit2 + .13, cu2 - sS * .05, cv2, 'spikeTop'); key(atk2.id, tHit2 + .5, cu2 - sS * .1, cv2, 'ready');
          fx.push({ t: tHit2, type: 'ring', u: cu2, v: cv2, z: 3.05 });
          const bl2 = pickBlockers(R, cv2).filter(o => o.pid !== atk.id);
          bl2.forEach((o, k) => blkAt(o.pid, o.v, R, tHit2, k * .03));
          const lu = sR * rr(2.3, 8), lv = rr(-3.7, 3.7);
          seg(tHit2, .44, [cu2, cv2, 3.08], [lu, lv, 0], .25);
          const dg2 = nearestBack(R, lu, lv, bl2.map(o => o.pid).concat([atk.id])); if (dg2) dive(R, dg2.pid, tHit2 + .44, lu + sR * .55, lv + (lv > 0 ? -.45 : .45), 'dive');
          tEnd = finishBounce(tHit2 + .44, lu, lv, true); landU = lu; landV = lv; pointText = 'PUNTO'; pointU = lu; pointV = lv;
        }
      }
    }
  }
  /* festa e delusione */
  const tPoint = tEnd, loser = winner === 'h' ? 'a' : 'h';
  view[winner].forEach((o, i) => { const l = lastKey(o.p.id), u = l ? l.u : 0, v = l ? l.v : 0; if (!l || l.t < tPoint - .1) key(o.p.id, tPoint, u, v, 'ready'); key(o.p.id, tPoint + .2, u, v, i % 2 ? 'cheerUp' : 'cheer'); key(o.p.id, tPoint + .45, u, v, 'ready'); key(o.p.id, tPoint + .65, u, v, i % 2 ? 'cheer' : 'cheerUp'); });
  view[loser].forEach(o => { const l = lastKey(o.p.id), u = l ? l.u : 0, v = l ? l.v : 0; if (!l || l.t < tPoint - .1) key(o.p.id, tPoint, u, v, 'ready'); key(o.p.id, tPoint + .35, u, v, 'down'); });
  fx.push({ t: tPoint, type: 'dust', u: landU, v: landV });
  fx.push({ t: tPoint + .05, type: 'text', text: pointText, u: pointU, v: pointV, z: 1.4 });
  const dur = tPoint + 1.0;
  for (const pid in tracks) tracks[pid].sort((a, b) => a.t - b.t);
  return { tracks, ball, fx, point: tPoint, end: dur, view };
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
