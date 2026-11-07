/* Settore giovanile: rosa Under 20 che cresce a ogni giornata, struttura da potenziare, piano di allenamento individuale,
   promozione in prima squadra o cessione. A fine stagione chi arriva a 21 anni senza essere promossa lascia (svincolata).
   Stato: G.viv = { lvl, roster:[atlete], plan:{id:attributo} }. Hook: tick da offersTick, fine stagione da seasonGrowthAll. */
const VIV_MAX = 5;
function viv() { if (!G.viv) { G.viv = { lvl: 1, roster: [], plan: {} }; vivFill(); } return G.viv; }
function vivSlots() { return 5 + (viv().lvl || 1); }
function vivUpCost() { const l = viv().lvl; return Math.round(15000 * l * l * staffScale() / 500) * 500; }
function genYouth() {
  const lvl = G.viv.lvl, roles = ["P", "O", "S", "S", "C", "C", "L"], role = roles[Math.floor(Math.random() * roles.length)], t = myTeam();
  const top = t.players.slice().sort((a, b) => b.ovr - a.ovr).slice(0, 7), avg = top.length ? top.reduce((n, p) => n + p.ovr, 0) / top.length : 60;
  const p = makeRookie(t, G.lid, role), target = clamp(Math.round(avg - 34 + lvl * 3 + gauss(Math.random) * 4), 28, 62), d = target - p.ovr;
  for (const k of ["att", "blk", "srv", "rec", "def", "set"]) p[k] = clamp(p[k] + d, 25, 90);
  p.ovr = p[KEY_ATTR[role]]; p.age = 16 + Math.floor(Math.random() * 3); p.year = SEASON_YEAR + ((G.season || 1) - 1) - p.age;
  p.pot = Math.round(clamp(p.ovr + 10 + Math.random() * 14 + lvl * 2, p.ovr + 4, 92)); p.val = calcETV(p); p.id = "vv" + (G.season || 1) + "_" + Math.floor(Math.random() * 1e8);
  p.wage = Math.round(salaryFor(p, G.lid) * .5); p.acc = {}; p.vivaio = true; PLAYER_INDEX[p.id] = p; return p;
}
function vivFill() { const V = G.viv; while (V.roster.length < vivSlots()) V.roster.push(genYouth()); }
function vivTick() {
  if (!G || !G.viv) return; const V = G.viv; vivOffersGen();
  for (const p of V.roster) {
    const age = p.age <= 17 ? 1.25 : p.age <= 19 ? 1 : .75; p.acc = p.acc || {};
    for (const k of ["att", "blk", "srv", "rec", "def", "set"]) {
      const focus = V.plan[p.id] === k, rate = (.07 + .03 * V.lvl) * age * (focus ? 2.2 : .45) * (.6 + Math.random() * .8);
      p.acc[k] = (p.acc[k] || 0) + rate;
      while (p.acc[k] >= 1) { p.acc[k]--; if (k === KEY_ATTR[p.role] ? p.ovr < p.pot : p[k] < p.pot + 4) p[k] = Math.min(95, p[k] + 1); }
    }
    p.ovr = p[KEY_ATTR[p.role]]; p.val = calcETV(p);
  }
}
function vivSeasonEnd() {
  if (!G || !G.viv) return; const V = G.viv, gone = [];
  for (const p of V.roster) p.age++;
  V.roster = V.roster.filter(p => { if (p.age < 21) return true; p.teamId = null; p.lid = null; p.contractStatus = "free"; p.contractYears = 0; p.vivaio = false; (G.freeAgents = G.freeAgents || []).push(p); gone.push(p.name); delete V.plan[p.id]; return false; });
  if (gone.length) marketNews("Vivaio: a fine stagione lasciano il settore giovanile " + gone.join(", ") + ".");
  const before = V.roster.length; vivFill(); if (V.roster.length > before) marketNews(`Vivaio: arrivano ${V.roster.length - before} nuove giovani.`);
}

/* ---------- offerte per le giovani del vivaio ---------- */
const VIV_FOREIGN = ["Volley Lugano (SUI)", "Hypo Tirol (AUT)", "Cannes (FRA)", "Maritza Plovdiv (BUL)", "Budowlani \u0141\u00f3d\u017a (POL)", "Kuanysh Almaty (KAZ)", "Eczac\u0131ba\u015f\u0131 Academy (TUR)"];
const VIV_LOWER = ["Pallavolo Orsa (Serie B)", "Volley Valle (Serie B)", "Polisportiva Aurora (Serie B)", "Sport Club Fenice (Serie B)", "Volley Rosa (Serie C)", "Pallavolo Stella (Serie C)"];
function vivPickBuyer() {
  const r = Math.random() * 100;
  const tiers = [["A3", 62, 1.0], ["A2", 18, 1.25], ["lower", 9, .75], ["foreign", 8, 1.45], ["A1", 3, 1.6]];
  let acc = 0, t = tiers[0]; for (const x of tiers) { acc += x[1]; if (r < acc) { t = x; break; } }
  if (t[0] === "A3" || t[0] === "A2" || t[0] === "A1") {
    const lids = t[0] === "A3" ? ["A3A", "A3B"] : [t[0]], lid = lids[Math.floor(Math.random() * lids.length)], list = (WORLD[lid] || []).filter(c => c.id !== myTeam().id && c.players.length < 17);
    if (list.length) { const c = list[Math.floor(Math.random() * list.length)]; return { kind: t[0], lid, clubId: c.id, name: c.full || c.short, mult: t[2] }; }
  }
  const lst = t[0] === "foreign" ? VIV_FOREIGN : VIV_LOWER; return { kind: t[0] === "foreign" ? "foreign" : "lower", name: lst[Math.floor(Math.random() * lst.length)], mult: t[0] === "foreign" ? 1.45 : .75 };
}
function vivOffersGen() {
  const V = viv(); V.offers = (V.offers || []).filter(o => (G.round || 0) <= o.exp && V.roster.some(p => p.id === o.pid)); if (V.offers.length >= 3 || Math.random() > .22) return;
  const busy = new Set(V.offers.map(o => o.pid)), pool = V.roster.filter(p => !busy.has(p.id) && V.roster.length > 3); if (!pool.length) return;
  let tot = pool.reduce((n, p) => n + p.pot * p.pot, 0), r = Math.random() * tot, p = pool[0]; for (const x of pool) { r -= x.pot * x.pot; if (r <= 0) { p = x; break; } }
  const b = vivPickBuyer(), fee = Math.round((p.val || calcETV(p)) * b.mult * (.85 + Math.random() * .4) / 500) * 500;
  V.offers.push({ id: "vo" + Date.now().toString(36) + Math.floor(Math.random() * 999), pid: p.id, b, fee, exp: (G.round || 0) + 3, counter: false });
  marketNews(`${b.name} chiede ${p.name} (vivaio): ${formatEur(fee)}.`); toast(`Offerta per la giovane ${p.name} da ${b.name}: ${formatEur(fee)} (Mercato \u203a Vivaio).`);
}
function vivOfferAct(id, v) {
  const V = viv(), o = (V.offers || []).find(x => x.id === id), p = o && V.roster.find(x => x.id === o.pid); if (!p) { V.offers = (V.offers || []).filter(x => x.id !== id); render(); return; }
  if (v === "no") { V.offers = V.offers.filter(x => x.id !== id); toast("Offerta rifiutata."); }
  else if (v === "counter") {
    if (o.counter) return; o.counter = true;
    if (Math.random() < .55) { o.fee = Math.round(o.fee * 1.15 / 500) * 500; o.exp = Math.max(o.exp, (G.round || 0) + 1); toast(`${o.b.name} rilancia: ora ${formatEur(o.fee)}.`); } else { V.offers = V.offers.filter(x => x.id !== id); toast(`${o.b.name} ritira l'offerta per ${p.name}.`); }
  } else {
    V.roster = V.roster.filter(x => x.id !== p.id); delete V.plan[p.id]; V.offers = V.offers.filter(x => x.pid !== p.id); G.budget += o.fee;
    if (o.b.clubId) { const club = (WORLD[o.b.lid] || []).find(c => c.id === o.b.clubId); if (club) { p.vivaio = false; p.teamId = club.id; p.lid = o.b.lid; p.contractYears = 1; p.contractStatus = "signed"; p.wage = salaryFor(p, o.b.lid); club.players.push(p); PLAYER_INDEX[p.id] = p; } }
    marketNews(`${p.name} lascia il vivaio per ${o.b.name}: +${formatEur(o.fee)}.`); toast(`${p.name} ceduta a ${o.b.name} (+${formatEur(o.fee)}).`); vivFill();
  }
  persist(); render();
}
function vivOffersHTML() {
  const V = viv(), list = (V.offers || []).map(o => ({ o, p: V.roster.find(x => x.id === o.pid) })).filter(x => x.p); if (!list.length) return "";
  const tag = k => k === "foreign" ? "estero" : k === "lower" ? "categoria inferiore" : k === "A1" ? "Serie A1" : k === "A2" ? "Serie A2" : "Serie A3";
  return `<div style="margin:10px 0;padding:10px;border-radius:12px;background:rgba(217,119,6,.10)"><b>Offerte per le tue giovani (${list.length})</b>${list.map(({ o, p }) => { const left = Math.max(0, o.exp - (G.round || 0)); return `<div class="small" style="margin:8px 0"><b>${esc(o.b.name)}</b> <span class="muted">(${tag(o.b.kind)})</span> offre <b>${formatEur(o.fee)}</b> per ${esc(p.name)} \u00b7 ${p.age} anni \u00b7 OVR ${p.ovr}/${p.pot} \u00b7 ${left > 0 ? "valida ancora " + left + " giornat" + (left === 1 ? "a" : "e") : "ultima giornata"}
    <div class="row" style="gap:6px;margin-top:6px;flex-wrap:wrap"><button class="btn primary" style="min-height:34px;padding:5px 10px;font-size:12px" data-act="voffer" data-id="${esc(o.id)}" data-v="yes">Accetta</button>${o.counter ? "" : `<button class="btn" style="min-height:34px;padding:5px 10px;font-size:12px" data-act="voffer" data-id="${esc(o.id)}" data-v="counter">Rilancia</button>`}<button class="btn" style="min-height:34px;padding:5px 10px;font-size:12px" data-act="voffer" data-id="${esc(o.id)}" data-v="no">Rifiuta</button></div></div>`; }).join("")}</div>`;
}
function vivPromote(id) {
  const V = viv(), p = V.roster.find(x => x.id === id), t = myTeam(); if (!p) return;
  if (t.players.length >= 18) { toast("La rosa è al completo (18): cedi o libera una giocatrice prima."); return; }
  V.roster = V.roster.filter(x => x.id !== id); delete V.plan[id];
  p.vivaio = false; p.teamId = t.id; p.lid = G.lid; p.contractYears = 1; p.contractStatus = "signed"; p.wage = Math.round(salaryFor(p, G.lid) * .6); p.fatigue = 0; p.inj = 0;
  t.players.push(p); t.players.sort((a, b) => ROLE_ORDER.indexOf(a.role) - ROLE_ORDER.indexOf(b.role) || b.ovr - a.ovr); PLAYER_INDEX[p.id] = p;
  marketNews(`${p.name} promossa dal vivaio in prima squadra.`); toast(`${p.name} entra in prima squadra.`); vivFill(); persist(); render();
}
function vivSell(id) {
  const V = viv(), p = V.roster.find(x => x.id === id); if (!p) return; const price = Math.round((p.val || calcETV(p)) * .7 / 500) * 500;
  V.roster = V.roster.filter(x => x.id !== id); delete V.plan[id]; G.budget += price; marketNews(`${p.name} ceduta dal vivaio per ${formatEur(price)}.`); toast(`${p.name} ceduta: +${formatEur(price)}.`); vivFill(); persist(); render();
}
function vivUpgrade() {
  const V = viv(); if (V.lvl >= VIV_MAX) return; const c = vivUpCost(); if (G.budget < c) { toast(`Servono ${formatEur(c)}.`); return; }
  G.budget -= c; V.lvl++; vivFill(); toast(`Settore giovanile al livello ${V.lvl}: più posti e crescita più veloce.`); persist(); render();
}
function vivaioHTML() {
  const V = viv(), maxed = V.lvl >= VIV_MAX;
  const rows = V.roster.slice().sort((a, b) => b.pot - a.pot).map(p => {
    PLAYER_INDEX[p.id] = p;
    const opts = PLAN_FOCUS.map(([k, l]) => `<option value="${k}" ${V.plan[p.id] === k ? "selected" : ""}>${l}</option>`).join("");
    return `<div class="prow" style="grid-template-columns:54px 1fr;row-gap:8px">${avatar(p, 44)}<span class="nm"><b>${esc(p.name)}</b> ${p.age >= 20 ? `<span class="pill" style="font-size:10px;color:#d97706">ultimo anno</span>` : ""}
      <span class="muted small">${p.role} · ${p.age} anni · ${ovrChip(p.ovr)} · potenziale ${p.pot}</span>
      <span class="small">Allenamento: <select data-act="vplan" data-id="${esc(p.id)}"><option value="">Equilibrato</option>${opts}</select></span></span>
      <span class="row" style="gap:6px;flex-wrap:wrap;grid-column:1/-1"><button class="btn primary" style="min-height:34px;padding:5px 10px;font-size:12px" data-act="vpromote" data-id="${esc(p.id)}">Promuovi</button><button class="btn" style="min-height:34px;padding:5px 10px;font-size:12px" data-act="vsell" data-id="${esc(p.id)}">Cedi ${formatEur(Math.round((p.val || calcETV(p)) * .7 / 500) * 500)}</button></span></div>`;
  }).join("");
  return `<div class="card"><div class="row" style="justify-content:space-between"><h3>Settore giovanile</h3><span class="pill">Livello ${V.lvl}/${VIV_MAX} · ${V.roster.length}/${vivSlots()} posti</span></div>
  <p class="sub">Le Under 20 si allenano e crescono a ogni giornata. Scegli su cosa lavora ciascuna; quando è pronta, promuovila in prima squadra. A 21 anni chi non è stata promossa lascia il club. Ogni estate arrivano nuove giovani.</p>
  <div class="row" style="gap:8px;margin:8px 0">${maxed ? `<span class="muted small">Struttura al massimo.</span>` : `<button class="btn primary" data-act="vupgrade">Potenzia struttura (${formatEur(vivUpCost())})</button>`}</div>
  ${vivOffersHTML()}${rows || `<div class="empty">Nessuna giovane in vivaio.</div>`}</div>`;
}
document.addEventListener("click", e => {
  const el = e.target.closest("[data-act]"); if (!el || !G) return; const a = el.dataset.act;
  if (a === "vpromote") { vivPromote(el.dataset.id); e.stopPropagation(); } else if (a === "vsell") { vivSell(el.dataset.id); e.stopPropagation(); } else if (a === "vupgrade") { vivUpgrade(); e.stopPropagation(); } else if (a === "voffer") { vivOfferAct(el.dataset.id, el.dataset.v); e.stopPropagation(); } else if (a === "vgo") { UI.tab = "market"; UI.mktTab = "youth"; render(); e.stopPropagation(); }
}, true);
document.addEventListener("change", e => { const el = e.target; if (G && el.dataset && el.dataset.act === "vplan") { const V = viv(); if (el.value) V.plan[el.dataset.id] = el.value; else delete V.plan[el.dataset.id]; persist(); e.stopPropagation(); } }, true);
(function () {
  const tick = window.offersTick; window.offersTick = function () { tick.apply(this, arguments); try { vivTick(); } catch (e) { } };
  const sg = window.seasonGrowthAll; const cards = window.alertCardsHTML; window.alertCardsHTML = function () { let o = cards.apply(this, arguments); const n = G && G.viv && (G.viv.offers || []).length; if (n) o += `<div class="card"><div class="row" style="justify-content:space-between"><div><h3>Offerte per il vivaio (${n})</h3><p class="muted small">Altri club chiedono le tue giovani.</p></div><button class="btn primary" data-act="vgo">Vedi</button></div></div>`; return o; };
  window.seasonGrowthAll = function () { const r = sg.apply(this, arguments); try { vivSeasonEnd(); } catch (e) { } return r; };
})();
