/* ===== Funzioni da manageriale: allenamento, morale, conferenza stampa, grafici ===== */
const TRAIN_FOCUS = [['att', 'Attacco'], ['blk', 'Muro'], ['srv', 'Battuta'], ['rec', 'Ricezione'], ['def', 'Difesa'], ['set', 'Alzata'], ['rest', 'Recupero']];
function mgr() { return G.mgr || (G.mgr = { focus: 'att', morale: 65, press: null, form: [] }); }

/* risultato dell'ultima gara della squadra dell'utente (true = vittoria) */
function lastUserResult() {
  const rs = (G.results[G.lid] || []); const m = rs.length && rs[rs.length - 1].find(x => x.h === G.teamIdx || x.a === G.teamIdx);
  if (!m) return null;
  const mine = m.h === G.teamIdx ? 0 : 1; let w = 0, l = 0; (m.sets || []).forEach(s => { if (s[mine] > s[1 - mine]) w++; else l++; });
  return { win: w > l, w, l, opp: WORLD[G.lid][m.h === G.teamIdx ? m.a : m.h] };
}

/* ogni club deve avere almeno una giocatrice per ruolo (2 schiacciatrici e 2 centrali) */
function repairRoster(team) {
  const need = { P: 1, O: 1, S: 2, C: 2, L: 1 };
  for (const role in need) {
    let have = team.players.filter(p => p.role === role).length;
    while (have < need[role]) {
      const nm = FIRST[Math.floor(Math.random() * FIRST.length)] + ' ' + LAST[Math.floor(Math.random() * LAST.length)];
      const idx = 900 + team.players.length + Math.floor(Math.random() * 900);
      const p = makePlayer(team.lid, team, idx, null, Math.random, { role, name: nm });
      team.players.push(p); PLAYER_INDEX[p.id] = p; have++;
    }
  }
}

/* dopo ogni giornata: allenamento, morale, forma */
const _playRound = playRound;
playRound = function (g, res) {
  try { for (const lid of Object.keys(WORLD)) for (const t of (WORLD[lid] || [])) repairRoster(t); } catch (e) {}
  const r = _playRound(g, res);
  try {
    const m = mgr(), t = myTeam(), lr = lastUserResult();
    if (lr) { m.morale = clamp(m.morale + (lr.win ? 4 : -4) + (lr.win && lr.l === 0 ? 1 : 0), 20, 100); m.form.push(lr.win ? 1 : 0); if (m.form.length > 10) m.form.shift(); m.press = lr; }
    const gains = [];
    t.players.forEach(p => {
      if (m.focus === 'rest') { p.fatigue = clamp((p.fatigue || 0) - 12, 0, 100); return; }
      const room = (p.pot || p.ovr) - p.ovr, ch = (p.age <= 23 ? .09 : p.age <= 29 ? .045 : .02) * (room > 0 ? 1.2 : .6);
      if (p[m.focus] < 99 && Math.random() < ch) { p[m.focus]++; if (p.role && typeof KEY_ATTR !== 'undefined' && KEY_ATTR[p.role] === m.focus) p.ovr = p[m.focus]; if (p.age <= 23) gains.push(p.name); }
    });
    if (gains.length) toast('Allenamento: progressi per ' + gains.slice(0, 2).join(', '));
  } catch (e) { }
  return r;
};

/* il morale pesa fino a ±3% sulle valutazioni della squadra dell'utente */
const _ratingsOf = ratingsOf;
ratingsOf = function (team, lu, tactic, rng, noise) {
  const r = _ratingsOf(team, lu, tactic, rng, noise);
  try { if (G && team === myTeam()) { const f = 0.97 + (mgr().morale - 20) / 80 * .06; for (const k of ['att', 'blk', 'srv', 'rec', 'def', 'set']) if (typeof r[k] === 'number') r[k] *= f; } } catch (e) { }
  return r;
};

/* grafici */
function sparkForm() {
  const f = mgr().form; if (!f.length) return '<p class="muted small">Il grafico compare dopo la prima partita.</p>';
  const w = 240, h = 56, st = w / Math.max(9, f.length - 1);
  const pts = f.map((v, i) => [i * st + 8, v ? 12 : 44]);
  return `<svg viewBox="0 0 ${w + 16} ${h}" width="100%" role="img" aria-label="Ultimi risultati"><path d="${pts.map((p, i) => (i ? 'L' : 'M') + p[0] + ' ' + p[1]).join(' ')}" fill="none" stroke="var(--accent)" stroke-width="2" stroke-linejoin="round"/>${pts.map((p, i) => `<circle cx="${p[0]}" cy="${p[1]}" r="${i === pts.length - 1 ? 5 : 3.5}" fill="${f[i] ? 'var(--good)' : 'var(--bad)'}"/>`).join('')}</svg>`;
}
function radarSVG(p) {
  const ks = [['att', 'ATT'], ['blk', 'MUR'], ['srv', 'BAT'], ['rec', 'RIC'], ['def', 'DIF'], ['set', 'ALZ']], C = 80, R = 56;
  const pt = (i, v) => { const a = -Math.PI / 2 + i * Math.PI / 3; return [C + Math.cos(a) * R * v / 100, C + Math.sin(a) * R * v / 100]; };
  const ring = v => ks.map((_, i) => pt(i, v).join(',')).join(' ');
  return `<svg viewBox="0 0 160 160" width="170" height="170" role="img" aria-label="Radar abilità"><polygon points="${ring(100)}" fill="none" stroke="var(--line)"/><polygon points="${ring(66)}" fill="none" stroke="var(--line)"/><polygon points="${ring(33)}" fill="none" stroke="var(--line)"/><polygon points="${ks.map((k, i) => pt(i, clamp(p[k[0]] || 0, 0, 100)).join(',')).join(' ')}" fill="var(--accent)" fill-opacity=".28" stroke="var(--accent)" stroke-width="2"/>${ks.map((k, i) => { const q = pt(i, 118); return `<text x="${q[0]}" y="${q[1] + 3}" text-anchor="middle" font-size="9" font-weight="700" fill="var(--muted)">${k[1]}</text>`; }).join('')}</svg>`;
}
const _playerDetail = playerDetail;
playerDetail = function (p) { return _playerDetail(p) + `<div class="row" style="justify-content:center;padding:6px 0">${radarSVG(p)}</div>`; };

/* scheda allenamento e spogliatoio nella home */
function managerCardHTML() {
  if (!G) return ''; const m = mgr(), lr = m.press;
  const foc = TRAIN_FOCUS.map(([k, l]) => `<button data-mg="focus" data-v="${k}" aria-pressed="${m.focus === k}">${l}</button>`).join('');
  const mood = m.morale >= 80 ? 'Ottimo' : m.morale >= 60 ? 'Buono' : m.morale >= 40 ? 'Teso' : 'Critico';
  let press = '';
  if (lr && !m.pressDone) {
    const q = lr.win ? `Dopo la vittoria contro ${esc(lr.opp.short)}, come commenta la prestazione?` : `Dopo la sconfitta con ${esc(lr.opp.short)}, cosa non ha funzionato?`;
    press = `<h3 style="margin-top:14px">Conferenza stampa</h3><p class="sub">${q}</p><div class="seg" role="group" aria-label="Risposta"><button data-mg="press" data-v="praise">Elogio la squadra</button><button data-mg="press" data-v="calm">Resto sereno</button><button data-mg="press" data-v="blame">Alzo la voce</button></div>`;
  }
  return `<div class="card" style="margin-top:14px"><div class="row" style="justify-content:space-between"><h3>Allenamento e spogliatoio</h3><span class="pill ${m.morale >= 60 ? 'good' : 'warn'}">Morale ${mood} · ${m.morale}</span></div>
<p class="muted small">Il focus settimanale fa crescere la capacità scelta, soprattutto nelle giovani. "Recupero" riduce la fatica.</p><div class="seg" role="group" aria-label="Focus">${foc}</div>
<div class="bar" style="margin:12px 0 4px"><i style="width:${m.morale}%"></i></div><div class="muted small">Forma recente (vittorie in alto, sconfitte in basso)</div>${sparkForm()}${press}</div>`;
}
document.addEventListener('click', e => {
  const el = e.target.closest('[data-mg]'); if (!el || !G) return; const m = mgr();
  if (el.dataset.mg === 'focus') { m.focus = el.dataset.v; persist(); render(); }
  if (el.dataset.mg === 'press') {
    const v = el.dataset.v, win = m.press && m.press.win;
    if (v === 'praise') { m.morale = clamp(m.morale + (win ? 3 : 2), 20, 100); G.board.confidence = clamp((G.board.confidence || 60) + (win ? 1 : 0), 0, 100); }
    if (v === 'calm') m.morale = clamp(m.morale + 1, 20, 100);
    if (v === 'blame') { m.morale = clamp(m.morale + (win ? -3 : (Math.random() < .5 ? 3 : -4)), 20, 100); G.board.confidence = clamp((G.board.confidence || 60) + (win ? 0 : 1), 0, 100); }
    m.pressDone = true; persist(); render(); toast('Il gruppo ha recepito il messaggio');
  }
});
const _homeHTML2 = homeHTML;
homeHTML = function () { if (mgr().press && mgr().pressRound !== G.round) { mgr().pressRound = G.round; mgr().pressDone = false; } return _homeHTML2() + managerCardHTML(); };
