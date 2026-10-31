/* Crescita e allenamenti: staff e strutture, piani individuali, crescita stagionale per eta' e report di fine stagione.
   Hook: trainRound() da manager.js (dopo ogni giornata), seasonGrowthAll() da finishSeasonCareer (engine.js), staffHTML() scheda Mercato > Staff. */
const STAFF = [
  { k: 'coach', n: 'Allenatore in seconda', d: 'Allenamenti più efficaci (+12% a livello) e più crescita a fine stagione per le under 24.' },
  { k: 'fit', n: 'Preparatore atletico', d: 'Smaltisce la fatica ogni giornata: meno rischio di infortuni da sovraccarico.' },
  { k: 'med', n: 'Fisioterapista', d: 'Recupero più rapido dagli infortuni (probabilità di rientro anticipato a ogni giornata).' },
  { k: 'gym', n: 'Palestra e strutture', d: 'Un posto in più nei piani di allenamento individuali per ogni livello.' }
];
const STAFF_MAX = 5;
const PLAN_FOCUS = [['att', 'Attacco'], ['blk', 'Muro'], ['srv', 'Battuta'], ['rec', 'Ricezione'], ['def', 'Difesa'], ['set', 'Alzata']];

function staff() { return G.staff || (G.staff = { coach: 1, fit: 1, med: 1, gym: 1 }); }
function staffScale() { const l = G.lid || ''; return l === 'A1' ? 1 : l === 'A2' ? 0.16 : 0.08; }
function staffCost(k) { const lv = staff()[k]; return Math.round(20000 * lv * lv * staffScale() / 500) * 500; }
function staffUpkeep() { const s = staff(); return Math.round(((s.coach - 1) + (s.fit - 1) + (s.med - 1) + (s.gym - 1)) * 600 * staffScale() / 50) * 50; }
function planSlots() { return 2 + staff().gym; }
function planCount() { const t = myTeam(), pl = (mgr().plans || {}); return t.players.filter(p => pl[p.id]).length; }

function staffUp(k) {
  const s = staff(); if (s[k] >= STAFF_MAX) return;
  const c = staffCost(k); if (G.budget < c) { toast('Budget insufficiente: servono ' + formatEur(c) + '.'); return; }
  G.budget -= c; s[k]++; toast('Potenziato: ' + STAFF.find(x => x.k === k).n + ' (livello ' + s[k] + ').'); persist(); render();
}
function staffHTML() {
  const s = staff();
  return `<div class="card"><div class="row" style="justify-content:space-between"><h3>Staff e strutture</h3><span class="pill">Costo fisso: ${formatEur(staffUpkeep())}/giornata</span></div>
  <p class="sub">Investi sullo staff: ogni livello costa di più e aggiunge un piccolo costo per giornata. Gli effetti valgono per tutta la rosa.</p>
  ${STAFF.map(x => { const lv = s[x.k], max = lv >= STAFF_MAX, c = staffCost(x.k); return `<div class="prow"><span class="nm"><b>${x.n}</b> <span class="pill ${lv >= 4 ? 'good' : ''}" style="font-size:10px">Livello ${lv}/${STAFF_MAX}</span><span class="muted small">${x.d}</span></span>${max ? '<span class="muted small">Massimo</span>' : `<button class="btn primary" style="min-height:34px;padding:5px 10px;font-size:12px" data-act="staffup" data-v="${x.k}" ${G.budget < c ? 'disabled' : ''}>Potenzia · ${formatEur(c)}</button>`}</div>`; }).join('')}</div>`;
}

/* ---------- piani individuali ---------- */
function setPlan(pid, f) {
  const m = mgr(), pl = m.plans || (m.plans = {});
  if (!f) { delete pl[pid]; persist(); render(); return; }
  if (!pl[pid] && planCount() >= planSlots()) { toast('Slot esauriti (' + planSlots() + '): potenzia la palestra o libera un piano.'); render(); return; }
  pl[pid] = f; persist(); render();
}
function planCardHTML() {
  if (!G) return ''; const t = myTeam(), m = mgr(), pl = m.plans || {};
  const rows = t.players.slice().sort((a, b) => (pl[b.id] ? 1 : 0) - (pl[a.id] ? 1 : 0) || (b.pot - b.ovr) - (a.pot - a.ovr) || a.age - b.age).map(p => {
    const room = Math.max(0, (p.pot || p.ovr) - p.ovr);
    return `<div class="prow">${avatar(p, 36)}<span class="nm"><b>${esc(p.name)}</b><span class="muted small">${p.role} · ${p.age} anni · OVR ${p.ovr}${room ? ` · margine +${room}` : ''}</span></span><select aria-label="Piano di ${esc(p.name)}" onchange="setPlan('${esc(p.id)}',this.value)" style="min-height:34px"><option value="">Focus di squadra</option>${PLAN_FOCUS.map(([k, l]) => `<option value="${k}" ${pl[p.id] === k ? 'selected' : ''}>${l} (+80%)</option>`).join('')}</select></div>`;
  }).join('');
  return `<div class="card" style="margin-top:14px"><details><summary><b>Piani individuali</b> <span class="pill">${planCount()}/${planSlots()} slot</span></summary><p class="muted small" style="margin:8px 0">Una giocatrice con un piano si allena sull'abilità scelta con probabilità quasi doppia, indipendentemente dal focus di squadra (anche in "Recupero"). Le giovani con margine di crescita rendono di più.</p>${rows}</details></div>`;
}

/* ---------- allenamento dopo ogni giornata ---------- */
function trainRound(t, m) {
  const s = staff(), pl = m.plans || (m.plans = {}), cm = 1 + 0.12 * (s.coach - 1), gains = [];
  t.players.forEach(p => {
    if (s.fit > 1) p.fatigue = clamp((p.fatigue || 0) - (s.fit - 1) * 2.5, 0, 100);
    if (p.inj > 0 && s.med > 1 && Math.random() < 0.15 * (s.med - 1)) { p.inj--; if (p.inj === 0) p.injName = ''; }
    const pf = pl[p.id];
    if (!pf && m.focus === 'rest') { p.fatigue = clamp((p.fatigue || 0) - 12, 0, 100); return; }
    const f = pf || m.focus, room = (p.pot || p.ovr) - p.ovr;
    let ch = (p.age <= 23 ? .09 : p.age <= 29 ? .045 : .02) * (room > 0 ? 1.2 : .6) * cm * clamp((100 - p[f]) / 45, .15, 1.2); /* piu' e' alta l'abilita', piu' e' difficile migliorarla */ if (pf) ch = Math.min(.3, ch * 1.8);
    if (p[f] < 99 && Math.random() < ch) { p[f]++; p.trainGain = (p.trainGain || 0) + 1; if (KEY_ATTR[p.role] === f) p.ovr = p[f]; if (pf && p.age <= 25) gains.push(p.name); }
  });
  if (gains.length) toast('Piani individuali: progressi per ' + gains.slice(0, 2).join(', '));
}

/* ---------- crescita di fine stagione ---------- */
function growthDelta(p, coachLv) {
  const sh = p.role === 'L' ? 2 : p.role === 'P' ? 1 : 0, a = p.age - sh, room = (p.pot || p.ovr) - p.ovr;
  let b = a <= 19 ? 3.2 : a <= 21 ? 2.4 : a <= 23 ? 1.5 : a <= 25 ? .6 : a <= 29 ? 0 : a <= 31 ? -.5 : a <= 33 ? -1.2 : -2;
  if (b > 0) { b *= clamp(.5 + room / 8, .3, 1.4); if (coachLv > 1 && p.age <= 23) b += .25 * (coachLv - 1); }
  b += gauss(Math.random) * .9;
  return Math.round(b);
}
function yearLabel(season) { const y = 2026 + season - 1; return y + '/' + String((y + 1) % 100).padStart(2, '0'); }

function seasonGrowthAll() {
  const mine = myTeam(), rows = [], coachLv = (G.staff || {}).coach || 1;
  for (const lid of Object.keys(WORLD)) {
    if (!Array.isArray(WORLD[lid]) || /^A3_(PROM|RETR)$/.test(lid)) continue;
    for (const club of WORLD[lid]) for (const p of club.players) {
      if (p.age === undefined) p.age = 24;
      const isMine = club.id === mine.id, ovr0 = p.ovr, tg = p.trainGain || 0;
      p.age++;
      const d = growthDelta(p, isMine ? coachLv : 1);
      for (const k of ['att', 'blk', 'srv', 'rec', 'def', 'set']) p[k] = clamp(p[k] + d + (Math.random() < .3 ? (Math.random() < .5 ? 1 : -1) : 0), 25, 98);
      p.ovr = p[KEY_ATTR[p.role]];
      p.pot = p.age <= 23 ? Math.max(p.ovr, Number(p.pot || p.ovr)) : p.ovr;
      if (p.age >= 33 && Math.random() < Math.min(.7, .10 * (p.age - 32))) p.retiring = true;
      p.val = calcETV(p); p.trainGain = 0; PLAYER_INDEX[p.id] = p;
      (p.growth || (p.growth = [])).push({ s: yearLabel(G.season || 1), o: p.ovr }); if (p.growth.length > 8) p.growth.shift();
      if (isMine) rows.push({ id: p.id, name: p.name, role: p.role, age: p.age, o0: ovr0, o1: p.ovr, tg, ret: false });
    }
  }
  const retiring = new Set(); for (const lid of Object.keys(WORLD)) if (Array.isArray(WORLD[lid])) for (const c of WORLD[lid]) if (c.id === mine.id) c.players.forEach(p => { if (p.retiring) retiring.add(p.id); });
  rows.forEach(r => { r.ret = retiring.has(r.id); });
  G.growthReport = { season: yearLabel(G.season || 1), rows };
  UI.alert = 'growth';
}

function growthModal() {
  const old = document.getElementById('alertmodal'); if (old) old.remove();
  const r = G && G.growthReport; if (!r) { UI.alert = null; return; }
  const sorted = r.rows.slice().sort((a, b) => (b.o1 - b.o0) - (a.o1 - a.o0)), up = sorted.filter(x => x.o1 > x.o0), down = sorted.filter(x => x.o1 < x.o0).reverse();
  const line = x => `<div class="prow"><span class="nm"><b>${esc(x.name)}</b><span class="muted small">${x.role} · ${x.age} anni${x.tg ? ` · ${x.tg} progressi in allenamento` : ''}${x.ret ? ' · <b>annuncia il ritiro</b>' : ''}</span></span><span class="num" style="font-size:16px;color:var(--${x.o1 > x.o0 ? 'good' : 'bad'})">${x.o0} → ${x.o1} (${x.o1 > x.o0 ? '+' : ''}${x.o1 - x.o0})</span></div>`;
  const m = document.createElement('div'); m.id = 'alertmodal'; m.className = 'vs-modal';
  m.innerHTML = `<div class="card vs-card"><h3>Report di crescita ${esc(r.season)}</h3><p class="sub">Come sono cambiate le tue giocatrici in estate.</p>
  ${up.length ? `<h3 style="margin-top:10px">In crescita (${up.length})</h3>${up.slice(0, 8).map(line).join('')}` : ''}
  ${down.length ? `<h3 style="margin-top:10px">In calo (${down.length})</h3>${down.slice(0, 6).map(line).join('')}` : ''}
  ${r.rows.filter(x => x.o1 === x.o0).length ? `<p class="muted small" style="margin-top:8px">Invariate: ${r.rows.filter(x => x.o1 === x.o0).length}.</p>` : ''}
  <div class="row" style="margin-top:12px"><button class="btn primary" data-act="alertclose" style="flex:1">Continua</button></div></div>`;
  document.body.appendChild(m);
}

/* storico OVR nella scheda giocatrice + scheda piani nella home */
const _playerDetail2 = playerDetail;
playerDetail = function (p) {
  const g = (p.growth || []).slice(-5), h = g.length ? `<p class="muted small" style="text-align:center;margin:4px 0">Storico OVR: ${g.map(x => x.s + ' ' + x.o).join(' · ')}</p>` : '';
  return _playerDetail2(p) + h;
};
const _homeHTML3 = homeHTML;
homeHTML = function () { return _homeHTML3() + planCardHTML(); };
