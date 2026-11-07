/* Economia ridimensionata (bilancio semplice).
   Ricavi annui R per serie e dimensione del club: 55% sponsor+diritti TV (a ogni giornata), 40% biglietti (partite in casa), 5% quota in trasferta; premi di classifica a fine stagione.
   Costi: stipendi, viaggi, staff. Cassa iniziale = 40% di R. Cartellini = 30% del valore precedente (in pallavolo i cartellini sono bassi). */
function ecoRevenue(lid, tier) { lid = lid || G.lid; tier = tier === undefined ? ((myTeam() || {}).tier || 3) : tier; return lid === "A1" ? 480000 + 130000 * tier : lid === "A2" ? 160000 + 40000 * tier : 55000 + 8000 * tier; }
function ecoRounds() { const s = SCHEDULE[G.lid]; return s ? s.length : 26; }
function initBudget(lid, tier) { return Math.round(ecoRevenue(lid, tier) * .4 / 500) * 500; }
function fin() { const s = G.season || 1; if (!G.fin || G.fin.season !== s) G.fin = { season: s, sp: 0, gate: 0, prize: 0, wages: 0, b0: G.budget }; return G.fin; }
function matchIncome(win, home) {
  const R = ecoRevenue(), half = ecoRounds() / 2, morale = ((G.mgr || {}).morale) || 65;
  const inc = Math.round((home ? .40 * R / half * (win ? 1.15 : .85) * (.85 + morale / 400) : .05 * R / half * (win ? 1.2 : .8)) / 50) * 50;
  fin().gate += inc; return inc;
}
function ecoSeasonBonus(rank) { const R = ecoRevenue(); return Math.round(R * (rank === 1 ? .20 : rank >= 1 && rank <= 3 ? .10 : rank >= 1 && rank <= 6 ? .04 : 0) / 500) * 500; }
function ecoBold() { return Math.round(ecoRevenue() * .05 / 500) * 500; }
function chooseSponsor(kind) {
  if (!G.management) G.management = { sponsor: null, news: [], youth: [] }; if (G.management.sponsor) { toast("Hai già uno sponsor attivo per questa stagione."); return; }
  const R = ecoRevenue(), safe = Math.round(R * .03 / 500) * 500, now = Math.round(R * .01 / 500) * 500, big = ecoBold();
  if (kind === "safe") { G.budget += safe; G.management.sponsor = { name: "Partner locale", desc: `Contributo garantito di ${formatEur(safe)}` }; marketNews(`Firmato un accordo con un partner locale: +${formatEur(safe)} garantiti.`); toast(`Sponsor firmato: +${formatEur(safe)}.`); }
  else { G.budget += now; G.management.sponsor = { name: "Sponsor ambizioso", desc: `${formatEur(now)} subito, premio di ${formatEur(big)} se chiudi tra le prime 3` }; marketNews("Accordo con uno sponsor ambizioso: bonus immediato e premio legato alla classifica."); toast(`Accordo firmato: +${formatEur(now)} subito.`); }
  persist(); render();
}
function ecoMigrate() {
  if (!G || G.ecoV === 2) return; G.ecoV = 2;
  const fix = p => { if (p && p.ovr) p.val = calcETV(p); };
  for (const lid of Object.keys(WORLD)) if (Array.isArray(WORLD[lid])) for (const c of WORLD[lid]) c.players.forEach(fix);
  (G.freeAgents || []).forEach(fix); ((G.viv || {}).roster || []).forEach(fix);
  const cap = initBudget(G.lid, myTeam().tier); if (G.budget > cap) { const old = G.budget; G.budget = cap; marketNews(`Economia ridimensionata: cassa da ${formatEur(old)} a ${formatEur(cap)}.`); toast("Economia ridimensionata: nuovi ricavi (sponsor, biglietti) e prezzi più realistici."); }
  persist();
}
(function () {
  const pr = window.playRound;
  window.playRound = function (g, res) {
    const r = pr.apply(this, arguments);
    try { if (g && g === G) { const F = fin(), sp = Math.round(.55 * ecoRevenue() / ecoRounds() / 50) * 50; G.budget += sp; F.sp += sp; F.wages += payrollFor(myTeam()); } } catch (e) { }
    return r;
  };
  const cards = window.alertCardsHTML;
  window.alertCardsHTML = function () {
    try { ecoMigrate(); } catch (e) { }
    let o = cards.apply(this, arguments);
    try {
      const F = fin(), tot = F.sp + F.gate + F.prize, net = G.budget - F.b0;
      o += `<div class="card"><div class="row" style="justify-content:space-between"><h3>Bilancio stagione</h3><span class="pill ${net >= 0 ? "good" : ""}">${net >= 0 ? "+" : ""}${formatEur(net)}</span></div>
        <p class="muted small" style="margin-top:6px">Entrate ${formatEur(tot)} (sponsor e diritti ${formatEur(F.sp)} · biglietti ${formatEur(F.gate)} · premi ${formatEur(F.prize)}) · Stipendi ${formatEur(F.wages)}. Il saldo include anche viaggi, staff, mercato e vivaio.</p></div>`;
    } catch (e) { }
    return o;
  };
  const cm = window.clubManagementHTML;
  window.clubManagementHTML = function () { let h = cm.apply(this, arguments); const R = ecoRevenue(), safe = formatEur(Math.round(R * .03 / 500) * 500), now = formatEur(Math.round(R * .01 / 500) * 500); return h.replace("Partner locale · 8.000 €", "Partner locale · " + safe).replace("Sponsor ambizioso · 3.000 € + premio", "Sponsor ambizioso · " + now + " + premio"); };
})();
