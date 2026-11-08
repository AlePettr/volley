/* Menu organizzato: 5 sezioni (Home, Squadra, Club, Mercato, Campionato), ognuna con sottosezioni.
   Si alterna con il menu classico dal tasto in alto a destra (?org=0 per il classico). */
(function () {
  const KEY = "vm_org";
  window.orgOn = function () { try { const v = localStorage.getItem(KEY); if (/[?&]org=0/.test(location.search)) return false; return v !== "0"; } catch (e) { return true; } };
  const ic = d => `<svg viewBox="0 0 24 24" aria-hidden="true">${d}</svg>`;
  const IC = { club: ic('<path d="M3 20h18M5 20V9l7-5 7 5v11M9 20v-6h6v6"/>') };
  const SECS = {
    home: { l: "Home", i: () => ICON.home },
    team: { l: "Squadra", i: () => ICON.squad, subs: [["rosa", "Rosa"], ["lineup", "Formazione"], ["youth", "Vivaio"], ["contracts", "Contratti"]] },
    club: { l: "Club", i: () => IC.club, subs: [["bilancio", "Bilancio"], ["staff", "Staff"], ["hall", "Palazzetto"], ["travel", "Viaggi"], ["soc", "Società"]] },
    market: { l: "Mercato", i: () => ICON.market, subs: [["buy", "Svincolate"], ["clubs", "Trattative"], ["sell", "Cessioni"], ["offers", "Offerte"], ["scout", "Scouting"]] },
    league: { l: "Campionato", i: () => ICON.league }
  };
  const OLD = { squad: "team", lineup: "team", scouting: "market", travel: "club" };
  const sec = () => { const k = OLD[UI.tab] || UI.tab; return SECS[k] ? k : "home"; };
  const SUBDEF = { squad: "rosa", lineup: "lineup", scouting: "scout", travel: "travel" };
  function sub(k) { UI.subs = UI.subs || {}; const s = SECS[k].subs; if (!s) return null; if (!UI.subs[k] || !s.some(x => x[0] === UI.subs[k])) UI.subs[k] = SUBDEF[UI.tab] && OLD[UI.tab] === k ? SUBDEF[UI.tab] : s[0][0]; return UI.subs[k]; }
  window.orgNav = function () { const cur = sec(); return Object.keys(SECS).map(k => `<button data-act="sec" data-v="${k}" aria-current="${cur === k}"><span class="nav-icon" aria-hidden="true">${SECS[k].i()}</span><span>${SECS[k].l}</span></button>`).join(""); };
  function bare(k) { UI.mktTab = k; UI.mktBare = 1; try { return marketHTML(); } finally { UI.mktBare = 0; } }
  function row(l, v, cls) { return `<div class="prow"><span class="nm">${l}</span><b class="${cls || ""}">${v}</b></div>`; }
  function finHTML() {
    const F = fin(), t = myTeam(), net = G.budget - F.b0, tot = F.sp + F.gate + F.prize + (F.bar || 0), staffN = (typeof staffUpkeep === "function" ? staffUpkeep() : 0);
    const oth = net - (tot - F.wages - (F.hstaff || 0) - (F.hall || 0));
    const sp = G.management && G.management.sponsor;
    return `<div class="row" style="justify-content:flex-end;margin-bottom:10px"><span class="pill ${net >= 0 ? "good" : ""}">Saldo stagione ${net >= 0 ? "+" : ""}${formatEur(net)}</span></div>
    <div class="grid g2" style="margin-bottom:12px"><div class="card"><span class="muted small">Cassa</span><h2>${formatEur(G.budget)}</h2></div>
    <div class="card"><span class="muted small">Valore stimato della rosa</span><h2>${formatEur(t.players.reduce((n, p) => n + (p.val || calcETV(p)), 0))}</h2></div></div>
    <div class="grid g2"><div class="card"><h3>Entrate</h3>${row("Sponsor e diritti", formatEur(F.sp))}${row("Biglietti", formatEur(F.gate))}${row("Bar e ristoro", formatEur(F.bar || 0))}${row("Premi", formatEur(F.prize))}${row("Totale", formatEur(tot), "good")}</div>
    <div class="card"><h3>Uscite</h3>${row("Stipendi giocatrici", formatEur(F.wages))}${row("Personale palazzetto", formatEur(F.hstaff || 0))}${row("Utenze e multe", formatEur(F.hall || 0))}${row("Viaggi, staff, mercato, vivaio", formatEur(Math.max(0, -oth)))}${row("Totale", formatEur(F.wages + (F.hstaff || 0) + (F.hall || 0) + Math.max(0, -oth)))}</div></div>
    <div class="card" style="margin-top:12px"><h3>Per giornata</h3>${row("Monte ingaggi giocatrici", formatEur(payrollFor(t)))}${row("Personale palazzetto", formatEur(typeof hallRoundWages === "function" ? hallRoundWages() : 0))}${row("Staff tecnico", formatEur(staffN))}${row("Sponsor di maglia", sp && sp.kind ? formatEur(sp.perRound) + " (" + sp.kind + ")" : "non firmato")}${typeof ecoGateNote === "function" ? ecoGateNote() : ""}</div>`;
  }
  function stats() {
    const st = standings(G.lid, G.results), pos = st.findIndex(r => r.idx === G.teamIdx), total = SCHEDULE[G.lid] ? SCHEDULE[G.lid].length : 0, out = [], res = G.results[G.lid] || [];
    for (let i = res.length - 1; i >= 0 && out.length < 5; i--) { const m = res[i].find(x => x.h === G.teamIdx || x.a === G.teamIdx); if (m) out.unshift((m.h === G.teamIdx ? m.hs > m.as : m.as > m.hs) ? "w" : "l"); }
    return `<div class="org-stats"><div><span>Posizione</span><b>${pos >= 0 ? pos + 1 : "—"}º</b><small>su ${st.length}</small></div><div><span>Giornata</span><b>${Math.min((G.round || 0) + 1, total || 1)}/${total || "—"}</b><small>${G.season || 1}ª stagione</small></div><div><span>Cassa</span><b>${formatEur(G.budget)}</b><small>${esc(LEAGUES[G.lid] ? LEAGUES[G.lid].name : G.lid)}</small></div><div><span>Forma</span><b class="org-form">${out.length ? out.map(c => `<i class="${c}"></i>`).join("") : "—"}</b><small>ultime ${out.length || 5}</small></div></div>`;
  }
  window.orgBody = function () {
    const k = sec(); UI.tab = k; const S = SECS[k]; let s = sub(k), bar = "", body = "";
    if (S.subs) bar = `<div class="org-sub" role="tablist">${S.subs.map(([id, l]) => `<button data-act="sub" data-v="${id}" aria-pressed="${s === id}">${l}${id === "offers" && typeof offersCount === "function" && offersCount() ? ` <em>${offersCount()}</em>` : ""}</button>`).join("")}</div>`;
    if (k === "home") body = stats() + alertCardsHTML() + homeHTMLmain();
    else if (k === "league") body = leagueHTML();
    else if (s === "rosa") body = squadHTML(); else if (s === "lineup") body = lineupHTML(); else if (s === "scout") body = scoutingHTML(); else if (s === "travel") body = travelHTML();
    else if (s === "bilancio") body = finHTML(); else if (s === "soc") body = `<div class="card"><h3>Aspetto del menu</h3><p class="muted small" style="margin:4px 0 8px">Menu organizzato in sezioni, oppure il menu classico con tutte le schede in fila.</p><button class="btn" data-act="orgtoggle">Passa al menu classico</button></div>` + identityHTML() + saveCardHTML();
    else body = bare(s);
    return `<h2 class="org-title">${S.l}</h2>${bar}${body}`;
  };
  document.addEventListener("click", e => {
    const el = e.target.closest("[data-act]"); if (!el || !G) return; const a = el.dataset.act, v = el.dataset.v;
    if (a === "orgtoggle") { e.stopPropagation(); try { localStorage.setItem(KEY, orgOn() ? "0" : "1"); } catch (x) { } if (!orgOn()) UI.tab = "home"; render(); return; }
    if (!orgOn()) return;
    if (a === "sec") { e.stopPropagation(); UI.tab = v; UI.sel = null; render(); window.scrollTo(0, 0); }
    else if (a === "sub") { e.stopPropagation(); UI.subs = UI.subs || {}; UI.subs[sec()] = v; render(); window.scrollTo(0, 0); }
    else if (a === "tab") { e.stopPropagation(); const k = OLD[v] || v; UI.tab = k; UI.subs = UI.subs || {}; if (SUBDEF[v]) UI.subs[k] = SUBDEF[v]; UI.sel = null; render(); window.scrollTo(0, 0); }
  }, true);
  const r = window.render;
  window.render = function () {
    document.documentElement.classList.toggle("org", orgOn()); const o = r.apply(this, arguments);
    try { document.querySelectorAll(".org-toggle").forEach(b => b.remove()); if (G && !orgOn()) { const b = document.createElement("button"); b.className = "btn org-toggle"; b.dataset.act = "orgtoggle"; b.textContent = "Menu organizzato"; document.body.appendChild(b); } } catch (e) { }
    return o;
  };
})();
