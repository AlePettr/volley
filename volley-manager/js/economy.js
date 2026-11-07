/* Economia ridimensionata (bilancio semplice).
   Ricavi annui R per serie e dimensione del club: 55% sponsor+diritti TV (a ogni giornata), 40% biglietti (partite in casa), 5% quota in trasferta; premi di classifica a fine stagione.
   Costi: stipendi, viaggi, staff. Cassa iniziale = 40% di R. Cartellini = 30% del valore precedente (in pallavolo i cartellini sono bassi). */
function ecoRevenue(lid, tier) { lid = lid || G.lid; tier = tier === undefined ? ((myTeam() || {}).tier || 3) : tier; return lid === "A1" ? 480000 + 130000 * tier : lid === "A2" ? 160000 + 40000 * tier : 55000 + 8000 * tier; }
function ecoRounds() { const s = SCHEDULE[G.lid]; return s ? s.length : 26; }
function initBudget(lid, tier) { return Math.round(ecoRevenue(lid, tier) * .4 / 500) * 500; }
function fin() { const s = G.season || 1; if (!G.fin || G.fin.season !== s) G.fin = { season: s, sp: 0, gate: 0, prize: 0, wages: 0, b0: G.budget }; return G.fin; }
function ecoRankOf(idx) { try { const tb = standings(G.lid, G.results), k = tb.findIndex(r => r.idx === idx); return { r: k < 0 ? 1 : k + 1, n: tb.length, played: tb.some(r => r.pl > 0) }; } catch (e) { return { r: 1, n: 12, played: false }; } }
/* biglietti = spettatori x prezzo medio. Prezzo: A2 8-10 EUR, A1 17-25 EUR (piu' alto nei club forti), A3 circa 5 EUR. Capienza tarata sui ricavi del club.
   Affluenza: classifica di entrambe, big match, derby (vicinanza), posta in gioco (volata titolo/salvezza, playoff, finale) e vittoria; sold out -> prezzi maggiorati. In trasferta non si incassa nulla. */
function ecoPrice(lid, tier) { return lid === "A1" ? 12 + 2.2 * tier : lid === "A2" ? 8 + .7 * Math.max(0, tier - 2.2) : 5 + .3 * Math.max(0, tier - 2); }
/* capienza: posti disegnati nel palazzetto x fattore di scala, con minimo e massimo per serie */
function ecoCapacity(t, lid) {
  lid = lid || G.lid; const n = (typeof HALL_SEATS !== "undefined" && HALL_SEATS[t.id]) || 0, k = lid === "A1" ? [2.0, 1400, 4500] : lid === "A2" ? [2.2, 450, 2200] : [.8, 250, 700];
  if (!n) return Math.round(.45 * ecoRevenue(lid, t.tier) / (ecoRounds() / 2) / (ecoPrice(lid, t.tier) * .765) / 10) * 10;
  return Math.round(Math.max(k[1], Math.min(k[2], n * k[0])) / 10) * 10;
}
/* sponsor e diritti TV a giornata: completano i ricavi annui R quando i biglietti (capienza x prezzo) non li coprono */
function ecoBaseRound() { const t = myTeam(), R = ecoRevenue(), n = ecoRounds(), gateExp = .765 * ecoCapacity(t, G.lid) * ecoPrice(G.lid, t.tier) * (n / 2); return Math.round(Math.max(.35 * R, R - gateExp) / n / 50) * 50; }
function ecoStakes(me, opp, ev) {
  const n = me.n, rounds = ecoRounds(), left = rounds - (G.round || 0); let s = 0, tag = "";
  if (ev) { const st = ev.stage || ""; if (/^Finale/.test(st)) { s = .6; tag = /scudetto|playoff/i.test(st) || ev.kind === "playoffA1" ? "finale scudetto" : "finale"; } else if (/^Semifinale/.test(st)) { s = .4; tag = "semifinale"; } else { s = .25; tag = "playoff"; } return { s, tag }; }
  if (me.played && left <= 6) { if (me.r <= 2) { s = .18; tag = "volata per il titolo"; } else if (me.r <= 4) { s = .08; tag = "corsa ai playoff"; } else if (me.r >= n - 3) { s = .10; tag = "lotta salvezza"; } }
  return { s, tag };
}
function matchIncome(win, home, fx, ev) {
  if (!home) return 0;
  const lid = G.lid, t = myTeam(), R = ecoRevenue(), half = ecoRounds() / 2, morale = ((G.mgr || {}).morale) || 65, price0 = ecoPrice(lid, t.tier), cap = ecoCapacity(t, lid);
  const me = ecoRankOf(G.teamIdx), oppIdx = fx ? (fx.h === G.teamIdx ? fx.a : fx.h) : -1, opp = oppIdx >= 0 ? ecoRankOf(oppIdx) : { r: Math.ceil(me.n / 2), n: me.n, played: false };
  const top = x => x.played ? 1 - (x.r - 1) / Math.max(1, x.n - 1) : .5, tags = [];
  let att = .72 + .22 * (top(me) + top(opp)) / 2 + (opp.played && opp.r <= 3 ? .08 : 0) + (me.played && me.r <= 3 ? .05 : 0);
  if (opp.played && opp.r <= 3) tags.push("big match");
  try { const o = oppIdx >= 0 ? (WORLD[lid] || []).find(x => x.idx === oppIdx) : null, km = o ? travelDistance(t, o) : 999; if (km <= 90) { att += .18; tags.push("derby"); } else if (km <= 180) { att += .08; tags.push("sfida di vicinato"); } } catch (e) { }
  const st = ecoStakes(me, opp, ev); if (st.s) { att += st.s; tags.push(st.tag); }
  att *= (win ? 1.08 : .94) * (.96 + morale / 1500);
  const fill = Math.min(1, att * .85), spec = Math.round(fill * cap), sold = att * .85 > 1, price = price0 * (sold ? Math.min(1.15, 1 + (att * .85 - 1)) : 1);
  const inc = Math.round(spec * price / 50) * 50, F = fin(); F.gate += inc; Object.assign(F, { lastAtt: Math.round(att * 100), lastOpp: opp.r, lastSpec: spec, lastCap: cap, lastPrice: price, lastTags: tags.join(", "), lastSold: sold });
  return inc;
}
function ecoGateNote() { const F = fin(); if (!F.lastSpec) return ""; return `<p class="muted small" style="margin-top:4px">Spettatori <b>${F.lastSpec.toLocaleString("it-IT")}</b> su ${F.lastCap.toLocaleString("it-IT")}${F.lastSold ? " (tutto esaurito)" : ""} \u00b7 biglietto medio ${F.lastPrice.toFixed(1).replace(".", ",")} \u20ac${F.lastTags ? ` \u00b7 <b>${esc(F.lastTags)}</b>` : ""}</p>`; }
function ecoSeasonBonus(rank) { const R = ecoRevenue(); return Math.round(R * (rank === 1 ? .20 : rank >= 1 && rank <= 3 ? .10 : rank >= 1 && rank <= 6 ? .04 : 0) / 500) * 500; }
function ecoBold() { return ecoSponsorDeal("premi").endBonus; }
/* sponsor di maglia: tre formule, pagate a giornata (non una cifra unica); chi firma tardi incassa solo le giornate che restano */
function ecoSponsorDeal(kind) {
  const R = ecoRevenue(), n = ecoRounds(), r5 = x => Math.round(x / 50) * 50;
  if (kind === "fisso") return { kind, name: "Sponsor di maglia · Fisso", perRound: r5(.09 * R / n), perWin: 0, endBonus: 0, endRank: 0, label: "Cifra fissa a ogni giornata, qualunque sia il risultato." };
  if (kind === "premi") return { kind, name: "Sponsor di maglia · A premi", perRound: r5(.035 * R / n), perWin: r5(.0035 * R), endBonus: Math.round(.05 * R / 500) * 500, endRank: 4, label: "Meno fisso, ma un bonus per ogni vittoria e un premio se chiudi tra le prime 4." };
  return { kind: "visibilita", name: "Sponsor di maglia · Visibilità", perRound: r5(.04 * R / n), perWin: 0, endBonus: Math.round(.12 * R / 500) * 500, endRank: 2, label: "Poco fisso, grosso premio solo se chiudi tra le prime 2: rischio alto." };
}
function chooseSponsor(kind) {
  if (!G.management) G.management = { sponsor: null, news: [], youth: [] }; if (G.management.sponsor) { toast("Hai gi\u00e0 uno sponsor di maglia per questa stagione."); return; }
  const d = ecoSponsorDeal(kind); d.left = Math.max(0, ecoRounds() - (G.round || 0)); d.earned = 0; d.season = G.season || 1; G.management.sponsor = d;
  marketNews(`Firmato lo sponsor di maglia (${d.kind}): ${formatEur(d.perRound)} a giornata.`); toast("Sponsor di maglia firmato."); persist(); render();
}
function ecoSponsorTick(won) {
  const sp = G.management && G.management.sponsor; if (!sp || !sp.kind || sp.left <= 0) return 0; sp.left--;
  const v = sp.perRound + (won ? sp.perWin : 0); G.budget += v; sp.earned += v; fin().sp += v; return v;
}
function ecoSponsorEnd(rank) { const sp = G.management && G.management.sponsor; if (!sp || !sp.kind || !sp.endBonus || rank > sp.endRank) return; G.budget += sp.endBonus; fin().prize += sp.endBonus; marketNews(`Sponsor di maglia: premio di ${formatEur(sp.endBonus)} per il piazzamento.`); }
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
    try { if (g && g === G) { const F = fin(), sp = ecoBaseRound(); G.budget += sp; F.sp += sp; try { const lr = lastUserResult(); ecoSponsorTick(lr && lr.win); } catch (e2) { } F.wages += payrollFor(myTeam()); } } catch (e) { }
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
  window.clubManagementHTML = function () {
    const m = G.management || (G.management = { sponsor: null, news: [], youth: [] }), sp = m.sponsor && m.sponsor.kind ? m.sponsor : null, news = (m.news || []).slice(0, 4), n = ecoRounds();
    let spHTML;
    if (sp) spHTML = `<b>${esc(sp.name)}</b><div class="muted small" style="margin-top:4px">${formatEur(sp.perRound)} a giornata${sp.perWin ? ` + ${formatEur(sp.perWin)} a vittoria` : ""}${sp.endBonus ? ` \u00b7 premio ${formatEur(sp.endBonus)} se chiudi tra le prime ${sp.endRank}` : ""}. Incassati finora: <b>${formatEur(sp.earned)}</b> \u00b7 giornate restanti ${sp.left}.</div>`;
    else spHTML = `<b>Sponsor di maglia: nessun accordo</b><div class="muted small" style="margin:4px 0 8px">Scegli una formula: viene pagata a ogni giornata fino a fine stagione (${Math.max(0, n - (G.round || 0))} giornate restanti).</div>` +
      ["fisso", "premi", "visibilita"].map(k => { const d = ecoSponsorDeal(k); return `<div style="margin:6px 0;padding:8px;border:1px solid var(--line);border-radius:10px"><b>${d.name.replace("Sponsor di maglia \u00b7 ", "")}</b> <span class="muted small">\u00b7 ${formatEur(d.perRound)}/giornata${d.perWin ? ` + ${formatEur(d.perWin)}/vittoria` : ""}${d.endBonus ? ` + premio ${formatEur(d.endBonus)} (top ${d.endRank})` : ""}</span><div class="muted small">${d.label}</div><button class="btn" style="margin-top:6px;min-height:34px;padding:5px 12px;font-size:12px" data-act="sponsor" data-v="${k}">Firma</button></div>`; }).join("");
    return `<div class="card"><div class="row" style="justify-content:space-between"><h3>Direzione sportiva</h3><span class="pill acc">Sponsor \u00b7 contratti</span></div>
      <p class="sub" style="margin:8px 0 12px">Sponsor, vivaio e mercato. Le scadenze richiedono rinnovi: chi non rinnova pu\u00f2 partire a fine stagione.</p>
      <div style="padding:10px;border:1px solid var(--line);border-radius:10px">${spHTML}</div>
      <div style="padding:10px;border:1px solid var(--line);border-radius:10px;margin-top:8px"><b>Settore giovanile</b><div class="muted small">Under 20 che crescono, promozioni e offerte degli altri club.</div><button class="btn primary" style="margin-top:8px" data-act="vgo">Apri il vivaio</button></div>
      <h3 style="margin-top:14px">Notizie di mercato</h3>${news.length ? news.map(x => `<div class="feed" style="margin-top:7px">${esc(x)}</div>`).join("") : `<p class="muted small">Nessuna notizia: avanzando le giornate appariranno qui.</p>`}</div>`;
  };
})();
