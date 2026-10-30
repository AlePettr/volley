/* Avviso rinnovi (ultime 3 giornate) e richieste di mercato in uscita da altri club. Hook: offersTick() da playRound, alertsRender() da render. */
const MIN_ROLE = { P: 1, O: 1, S: 2, C: 2, L: 1 };
const ALERT_WINDOW = 3;

function remainingRounds() { const s = SCHEDULE[G.lid]; return s ? s.length - (G.round || 0) : 99; }
function expiringPlayers() { const t = myTeam(); ensureContracts(t, G.lid); return t.players.filter(p => p.contractStatus !== "renewed").sort((a, b) => b.ovr - a.ovr); }
function leaveRisk(p) { return p.age >= 31 ? 60 : 40; }
function canSellPlayer(p) { const t = myTeam(); if (t.players.length <= 11) return false; return t.players.filter(x => x.id !== p.id && x.role === p.role).length >= (MIN_ROLE[p.role] || 1); }
function roundedFee(x) { return Math.round(x / 500) * 500; }

/* ---------- Offerte in uscita ---------- */
function pickBuyer(p) {
  const my = myTeam(), cands = [];
  for (const lid of ["A1", "A2", "A3A", "A3B"]) {
    for (const club of (WORLD[lid] || [])) {
      if (club.id === my.id) continue;
      const same = club.players.filter(x => x.role === p.role);
      if (same.length > 3 || club.players.length >= 17) continue;
      const avg = same.length ? same.reduce((n, x) => n + x.ovr, 0) / same.length : 0;
      if (p.ovr >= avg - 2) cands.push({ club, lid, w: 1 + (lid === "A1" ? 1.5 : lid === "A2" ? 1 : 0) + Math.max(0, p.ovr - avg) / 6 });
    }
  }
  if (!cands.length) return null;
  let r = Math.random() * cands.reduce((n, c) => n + c.w, 0);
  for (const c of cands) { r -= c.w; if (r <= 0) return c; }
  return cands[cands.length - 1];
}

function genOffer() {
  const t = myTeam(); G.offers = G.offers || [];
  const busy = new Set(G.offers.map(o => o.pid));
  const pool = t.players.filter(p => !busy.has(p.id) && canSellPlayer(p));
  if (!pool.length) return;
  const tot = pool.reduce((n, p) => n + Math.pow(p.ovr, 3), 0); let r = Math.random() * tot, p = pool[0];
  for (const x of pool) { r -= Math.pow(x.ovr, 3); if (r <= 0) { p = x; break; } }
  const b = pickBuyer(p); if (!b) return;
  const val = p.val || calcETV(p), fee = roundedFee(val * (0.95 + Math.random() * 0.4) * (b.lid === "A1" ? 1.12 : 1));
  const o = { id: "o" + Date.now().toString(36) + Math.floor(Math.random() * 999), pid: p.id, clubId: b.club.id, lid: b.lid, fee, exp: (G.round || 0) + 2, counter: false };
  G.offers.push(o);
  marketNews(`${b.club.short} chiede ${p.name}: offerta di ${formatEur(fee)}.`);
  toast(`Nuova offerta per ${p.name} da ${b.club.short}: ${formatEur(fee)} (scheda Mercato › Offerte).`);
}

function offersTick() {
  if (!G) return;
  G.offers = (G.offers || []).filter(o => o.exp >= (G.round || 0) && myTeam().players.some(p => p.id === o.pid));
  const rem = remainingRounds();
  if (rem >= 1 && (G.round || 0) >= 2 && G.offers.length < 3 && Math.random() < (rem <= 6 ? 0.42 : 0.26)) genOffer();
  if (rem >= 1 && rem <= ALERT_WINDOW && G.renewAlertSeason !== G.season) {
    G.renewAlertSeason = G.season;
    if (expiringPlayers().length) UI.alert = "renew";
  }
}

function offerParts(o) {
  const p = myTeam().players.find(x => x.id === o.pid), club = (WORLD[o.lid] || []).find(t => t.id === o.clubId);
  return p && club ? { p, club } : null;
}
function acceptOffer(id) {
  const o = (G.offers || []).find(x => x.id === id), pr = o && offerParts(o); if (!pr) return;
  const { p, club } = pr; if (!canSellPlayer(p)) { toast("Non puoi cederla: resteresti senza sostitute nel ruolo."); return; }
  const t = myTeam(); t.players = t.players.filter(x => x.id !== p.id);
  p.teamId = club.id; p.lid = o.lid; p.contractYears = 1; p.contractStatus = "signed"; p.wage = salaryFor(p, o.lid); p.fatigue = 0;
  club.players.push(p); PLAYER_INDEX[p.id] = p; G.budget += o.fee;
  G.offers = G.offers.filter(x => x.pid !== p.id);
  marketNews(`${p.name} ceduta a ${club.short} per ${formatEur(o.fee)}.`); toast(`Cessione: ${p.name} passa a ${club.short} (+${formatEur(o.fee)}).`);
  persist(); render();
}
function rejectOffer(id) { G.offers = (G.offers || []).filter(x => x.id !== id); toast("Offerta rifiutata."); persist(); render(); }
function counterOffer(id) {
  const o = (G.offers || []).find(x => x.id === id), pr = o && offerParts(o); if (!pr || o.counter) return;
  o.counter = true;
  if (Math.random() < 0.55) { o.fee = roundedFee(o.fee * 1.15); o.exp = Math.max(o.exp, (G.round || 0) + 1); toast(`${pr.club.short} accetta di rilanciare: ora ${formatEur(o.fee)}.`); }
  else { G.offers = G.offers.filter(x => x.id !== id); toast(`${pr.club.short} ritira l'offerta per ${pr.p.name}.`); }
  persist(); render();
}

function offersHTML() {
  const list = (G.offers || []).map(o => ({ o, pr: offerParts(o) })).filter(x => x.pr);
  const rows = list.map(({ o, pr }) => {
    const { p, club } = pr, ok = canSellPlayer(p), val = p.val || calcETV(p), left = Math.max(0, o.exp - (G.round || 0));
    return `<div class="prow">${avatar(p, 44)}<span class="nm"><b>${esc(p.name)}</b><span class="muted small">${p.role} · ${p.age} anni · OVR ${p.ovr} · valore ${formatEur(val)}</span>
      <span class="muted small">${esc(club.full || club.short)} (${LEAGUES[o.lid] ? LEAGUES[o.lid].name : o.lid}) offre <b>${formatEur(o.fee)}</b> · ${left > 0 ? `valida ancora ${left} giornat${left === 1 ? "a" : "e"}` : "ultima giornata"}</span>${ok ? "" : `<span class="muted small" style="color:var(--bad)">Non cedibile: resteresti senza sostitute nel ruolo.</span>`}</span>
      <span class="row" style="gap:6px;flex-wrap:wrap;justify-content:flex-end"><button class="btn primary" style="min-height:34px;padding:5px 10px;font-size:12px" data-act="offeraccept" data-id="${esc(o.id)}" ${ok ? "" : "disabled"}>Accetta</button>${o.counter ? "" : `<button class="btn" style="min-height:34px;padding:5px 10px;font-size:12px" data-act="offercounter" data-id="${esc(o.id)}">Chiedi +15%</button>`}<button class="btn" style="min-height:34px;padding:5px 10px;font-size:12px" data-act="offerreject" data-id="${esc(o.id)}">Rifiuta</button></span></div>`;
  }).join("");
  return `<div class="card"><h3>Richieste in uscita</h3><p class="sub">Altri club si fanno avanti per le tue giocatrici. Le offerte scadono dopo un paio di giornate; puoi rilanciare una volta (il club può anche ritirarsi).</p>${rows || `<p class="muted small">Nessuna offerta al momento: arriveranno durante la stagione.</p>`}</div>`;
}
function offersCount() { return (G.offers || []).filter(o => offerParts(o)).length; }

/* ---------- Carte home + avviso rinnovi ---------- */
function alertCardsHTML() {
  let out = ""; const n = offersCount();
  if (n) out += `<div class="card"><div class="row" style="justify-content:space-between"><div><h3>Offerte di mercato (${n})</h3><p class="muted small">Altri club chiedono le tue giocatrici.</p></div><button class="btn primary" data-act="alertoffers">Vedi</button></div></div>`;
  if (remainingRounds() <= ALERT_WINDOW && remainingRounds() >= 1) { const e = expiringPlayers(); if (e.length) out += `<div class="card"><div class="row" style="justify-content:space-between"><div><h3>Contratti in scadenza (${e.length})</h3><p class="muted small">Ultime ${remainingRounds()} giornate: rinnova prima della fine.</p></div><button class="btn primary" data-act="alertrenew">Apri</button></div></div>`; }
  return out;
}

function alertsRender() {
  const old = document.getElementById("alertmodal"); if (old) old.remove();
  if (G && UI.alert === "awards" && !UI.match) { awardsModal(); return; }
  if (G && UI.alert === "growth" && !UI.match) { growthModal(); return; }
  if (!G || UI.alert !== "renew" || UI.match) return;
  const e = expiringPlayers(); if (!e.length) { UI.alert = null; return; }
  const m = document.createElement("div"); m.id = "alertmodal"; m.className = "vs-modal";
  const rows = e.slice(0, 12).map(p => { const w = p.wage || salaryFor(p, G.lid), fee = Math.round(w * 1.10) * 2; return `<div class="prow">${avatar(p, 40)}<span class="nm"><b>${esc(p.name)}</b><span class="muted small">${p.role} · ${p.age} anni · OVR ${p.ovr} · rischio addio ${leaveRisk(p)}%</span></span><button class="btn primary" style="min-height:34px;padding:5px 10px;font-size:12px" data-act="renew" data-id="${esc(p.id)}">Rinnova · ${formatEur(fee)}</button></div>`; }).join("");
  m.innerHTML = `<div class="card vs-card"><h3>Contratti in scadenza</h3><p class="sub">Mancano ${remainingRounds()} giornate alla fine della stagione. Le giocatrici non rinnovate possono lasciare il club (${e.some(p => p.age >= 31) ? "40% per le più giovani, 60% per le over 31" : "circa 40%"}).</p>${rows}${e.length > 12 ? `<p class="muted small">+ altre ${e.length - 12} nella scheda Contratti.</p>` : ""}<div class="row" style="margin-top:12px;gap:8px"><button class="btn primary" data-act="alertrenew2" style="flex:1">Tutti i contratti</button><button class="btn" data-act="alertclose">Più tardi</button></div></div>`;
  document.body.appendChild(m);
}
