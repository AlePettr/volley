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
  if (!G || !G.viv) return; const V = G.viv;
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
  ${rows || `<div class="empty">Nessuna giovane in vivaio.</div>`}</div>`;
}
document.addEventListener("click", e => {
  const el = e.target.closest("[data-act]"); if (!el || !G) return; const a = el.dataset.act;
  if (a === "vpromote") { vivPromote(el.dataset.id); e.stopPropagation(); } else if (a === "vsell") { vivSell(el.dataset.id); e.stopPropagation(); } else if (a === "vupgrade") { vivUpgrade(); e.stopPropagation(); }
}, true);
document.addEventListener("change", e => { const el = e.target; if (G && el.dataset && el.dataset.act === "vplan") { const V = viv(); if (el.value) V.plan[el.dataset.id] = el.value; else delete V.plan[el.dataset.id]; persist(); e.stopPropagation(); } }, true);
(function () {
  const tick = window.offersTick; window.offersTick = function () { tick.apply(this, arguments); try { vivTick(); } catch (e) { } };
  const sg = window.seasonGrowthAll; window.seasonGrowthAll = function () { const r = sg.apply(this, arguments); try { vivSeasonEnd(); } catch (e) { } return r; };
})();
