/* Palazzetto: personale a rosa (gestore, pulizie, magazzinieri, steward, bar).
   Stipendi pagati a ogni giornata; utenze e bar contano solo nelle partite in casa. Il bar e' un ricavo. */
const HALL_ROLES = [
  { k: "gest", n: "Gestore del palazzetto", m: 2, d: "Utenze, manutenzione, rapporti col Comune. Senza gestore le utenze costano di più." },
  { k: "pul", n: "Addetti alle pulizie", m: 1, d: "Pulizia di campo e tribune. Meno pulizie, bar e immagine ne risentono." },
  { k: "mag", n: "Magazzinieri", m: 1, d: "Attrezzature, allestimento del campo, scorte del bar." },
  { k: "ste", n: "Sicurezza e steward", m: 1, d: "Ingressi e tribune. Se mancano, capienza utilizzabile ridotta e rischio multe." },
  { k: "vc", n: "Video check", m: 1, d: "1-2 addetti che montano e smontano la postazione video check a ogni partita in casa. Se mancano, multa della Lega." },
  { k: "bar", n: "Bar e ristoro", m: 1, d: "Ogni addetto serve il pubblico: il bar è un ricavo a ogni partita in casa." }
];
const HALL_NAMES = ["Marco", "Luca", "Paolo", "Giorgio", "Sara", "Elena", "Chiara", "Franco", "Andrea", "Marta", "Davide", "Irene", "Stefano", "Giulia", "Nicola", "Rosa", "Enzo", "Laura"];
const HALL_SUR = ["Rossi", "Bianchi", "Conti", "Ferri", "Greco", "Villa", "Neri", "Costa", "Riva", "Sala", "Fabbri", "Moretti", "Pace", "Longo", "Serra"];
function hallScale() { return G.lid === "A1" ? 1.6 : G.lid === "A2" ? 1 : .4; }
function hallCap() { try { return ecoCapacity(myTeam(), G.lid); } catch (e) { return 1500; } }
function hallNeeds() { const c = hallCap(); return { gest: 1, pul: Math.max(1, Math.ceil(c / 2000)), mag: Math.max(1, Math.ceil(c / 3000)), ste: Math.max(1, Math.ceil(c / 1000)), bar: Math.max(1, Math.ceil(c / 1200)), vc: G.lid === "A1" ? 2 : G.lid === "A2" ? 1 : 0 }; }
function hallWage(role, lvl) { const r = HALL_ROLES.find(x => x.k === role); return Math.round(1250 * r.m * hallScale() * (.8 + .2 * lvl) / 50) * 50; }
function hallDisc(y) { return y >= 3 ? .9 : y === 2 ? .95 : 1; }
function hallMk(role, lvl, yrs) { yrs = yrs || 2; return { yrs, id: "hs" + Math.random().toString(36).slice(2, 8), role, lvl, name: HALL_NAMES[Math.floor(Math.random() * HALL_NAMES.length)] + " " + HALL_SUR[Math.floor(Math.random() * HALL_SUR.length)], wage: Math.round(hallWage(role, lvl) * hallDisc(yrs) / 50) * 50 }; }
function arena() {
  if (!G.arena || G.arena.lid !== G.lid) { G.arena = { lid: G.lid, staff: [], fines: 0 }; const n = hallNeeds(); for (const r of HALL_ROLES) for (let i = 0; i < n[r.k]; i++) G.arena.staff.push(hallMk(r.k, 2)); }
  G.arena.staff.forEach(x => { if (x.yrs === undefined) x.yrs = 2; });
  if (!G.arena.vcV) { G.arena.vcV = 1; for (let i = 0; i < hallNeeds().vc; i++) G.arena.staff.push(hallMk("vc", 2)); }
  return G.arena;
}
function hallCov(role) { const a = arena(), n = hallNeeds()[role], got = a.staff.filter(s => s.role === role); return { n, got: got.length, cov: n ? Math.min(1, got.length / n) : 1, avg: got.length ? got.reduce((x, s) => x + s.lvl, 0) / got.length : 0 }; }
function hallSeasonWages() { return arena().staff.reduce((n, s) => n + s.wage, 0); }
function hallRoundWages() { return Math.round(hallSeasonWages() / ecoRounds() / 10) * 10; }
function hallUtilities() { const g = hallCov("gest"), base = hallCap() * .3 * hallScale() ** .5; return Math.round(base * (g.got ? 1.08 - .03 * g.avg : 1.3) / 10) * 10; }
function hallBar(spec) {
  const b = hallCov("bar"), p = hallCov("pul"), m = hallCov("mag"), per = (G.lid === "A1" ? 2.2 : G.lid === "A2" ? 1.3 : .8);
  return Math.round(spec * per * b.cov * (.8 + .08 * b.avg) * (.85 + .15 * p.cov) * (.9 + .1 * m.cov) / 10) * 10;
}
function hallHire(role, lvl) {
  const a = arena(), s = hallMk(role, lvl, UI.hallYrs || 1), fee = Math.round(s.wage * .25 / 10) * 10;
  if (G.budget < fee) { toast("Cassa insufficiente per l'ingaggio."); return; }
  G.budget -= fee; a.staff.push(s); toast(s.name + " assunto/a."); persist(); render();
}
function hallBuyout(s) { return Math.round(s.wage * Math.max(.25, .5 * (s.yrs || 1)) / 10) * 10; }
function hallRenew(id) {
  const a = arena(), s = a.staff.find(x => x.id === id); if (!s) return; const y = UI.hallYrs || 1; s.yrs = (s.yrs || 0) + y; s.wage = Math.round(hallWage(s.role, s.lvl) * hallDisc(y) / 50) * 50; toast("Contratto di " + s.name + " rinnovato."); persist(); render();
}
function hallSeasonEnd() {
  const a = arena(), gone = []; let auto = 0; a.staff.forEach(s => { s.yrs = (s.yrs || 1) - 1; if (s.yrs <= 0) { if (s.auto) { const y = s.autoYrs || 1; s.yrs = y; s.wage = Math.round(hallWage(s.role, s.lvl) * hallDisc(y) / 50) * 50; auto++; } else gone.push(s); } });
  if (auto) marketNews("Palazzetto: rinnovati automaticamente " + auto + " contratti.");
  if (gone.length) { a.staff = a.staff.filter(s => s.yrs > 0); marketNews("Palazzetto: contratti scaduti per " + gone.length + " addetti (" + gone.map(s => s.name).join(", ") + "). Rinnova o assumi sostituti."); }
  persist();
}
function hallFire(id) {
  const a = arena(), s = a.staff.find(x => x.id === id); if (!s) return; const fee = hallBuyout(s);
  if (G.budget < fee) { toast("Cassa insufficiente per la buonuscita."); return; }
  G.budget -= fee; a.staff = a.staff.filter(x => x.id !== id); toast(s.name + " licenziato/a."); persist(); render();
}
function hallHTML() {
  const a = arena(), n = hallNeeds(), F = fin(), btn = "min-height:32px;padding:4px 9px;font-size:12px";
  const head = `<div class="card"><div class="row" style="justify-content:space-between"><h3>Palazzetto</h3><span class="pill">Stipendi: ${formatEur(hallRoundWages())}/giornata</span></div>
  <p class="sub">Capienza ${hallCap().toLocaleString("it-IT")} posti. Utenze per partita in casa circa ${formatEur(hallUtilities())}. Il rinnovo automatico rinnova alla scadenza, per la durata scelta in quel momento. Contratti a stagione: più lungo il contratto, più basso lo stipendio (2 stagioni −5%, 3 stagioni −10%). Assunzione 25% dello stipendio annuo; licenziare prima della scadenza costa metà stipendio per ogni stagione residua.</p>
  <div class="row" style="gap:6px;margin:6px 0"><span class="muted small">Durata dei nuovi contratti:</span>${[1, 2, 3].map(y => `<button class="btn ${(UI.hallYrs || 1) === y ? "primary" : ""}" style="${btn}" data-act="hallyrs" data-v="${y}">${y} ${y === 1 ? "stagione" : "stagioni"}</button>`).join("")}</div>
  <div class="row" style="gap:6px;margin:6px 0"><button class="btn" style="${btn}" data-act="hallautoall" data-v="1">Rinnovo automatico a tutti</button><button class="btn" style="${btn}" data-act="hallautoall" data-v="0">Disattiva per tutti</button></div>
  <p class="muted small">Stagione: bar ${formatEur(F.bar || 0)} · utenze e multe ${formatEur(F.hall || 0)} · personale ${formatEur(F.hstaff || 0)}</p></div>`;
  return head + HALL_ROLES.filter(r => n[r.k] > 0).map(r => {
    const c = hallCov(r.k), list = a.staff.filter(s => s.role === r.k);
    return `<div class="card"><div class="row" style="justify-content:space-between"><h3>${r.n}</h3><span class="pill ${c.cov >= 1 ? "good" : ""}">${c.got}/${n[r.k]}</span></div><p class="muted small">${r.d}</p>
    ${list.map(s => `<div class="prow"><span class="nm"><b>${esc(s.name)}</b> <span class="muted small">Liv. ${s.lvl} · ${formatEur(s.wage)}/anno · ${s.yrs || 1} ${(s.yrs || 1) === 1 ? "stagione (in scadenza)" : "stagioni"}</span></span><button class="btn ${s.auto ? "primary" : ""}" style="${btn}" data-act="hallauto" data-v="${s.id}" aria-pressed="${!!s.auto}">Rinnovo auto: ${s.auto ? "sì" : "no"}</button><button class="btn" style="${btn}" data-act="hallrenew" data-v="${s.id}">Rinnova</button><button class="btn" style="${btn}" data-act="hallfire" data-v="${s.id}">Licenzia · ${formatEur(hallBuyout(s))}</button></div>`).join("")}
    <div class="row" style="gap:6px;flex-wrap:wrap;margin-top:6px"><span class="muted small">Assumi:</span>${[1, 2, 3, 4].map(l => `<button class="btn primary" style="${btn}" data-act="hallhire" data-v="${r.k}:${l}">Liv. ${l} · ${formatEur(Math.round(hallWage(r.k, l) * hallDisc(UI.hallYrs || 1) / 50) * 50)}</button>`).join("")}</div></div>`;
  }).join("");
}
document.addEventListener("click", e => {
  const el = e.target.closest("[data-act]"); if (!el || !G) return; const a = el.dataset.act;
  if (a === "hallhire") { const [r, l] = el.dataset.v.split(":"); hallHire(r, +l); e.stopPropagation(); } else if (a === "hallyrs") { UI.hallYrs = +el.dataset.v; render(); e.stopPropagation(); } else if (a === "hallauto") { const x = arena().staff.find(q => q.id === el.dataset.v); if (x) { x.auto = !x.auto; x.autoYrs = UI.hallYrs || 1; } persist(); render(); e.stopPropagation(); } else if (a === "hallautoall") { arena().staff.forEach(x => { x.auto = el.dataset.v === "1"; x.autoYrs = UI.hallYrs || 1; }); persist(); render(); e.stopPropagation(); } else if (a === "hallrenew") { hallRenew(el.dataset.v); e.stopPropagation(); } else if (a === "hallfire") { hallFire(el.dataset.v); e.stopPropagation(); }
}, true);
(function () {
  const mi = window.matchIncome;
  window.matchIncome = function (win, home) {
    const inc = mi.apply(this, arguments); if (!home) return inc;
    try {
      const F = fin(), a = arena(), spec = F.lastSpec || 0, st = hallCov("ste"), vc = hallCov("vc"), cv = Math.min(st.cov, vc.cov); let util = hallUtilities(), bar = hallBar(spec);
      if (cv < 1 && Math.random() < .15 * (1 - cv) + .05) { const fine = Math.round(ecoRevenue() * .004 / 50) * 50; util += fine; a.fines = (a.fines || 0) + fine; marketNews("Multa della Lega per carenza di personale (steward/video check): " + formatEur(fine) + "."); }
      F.bar = (F.bar || 0) + bar; F.hall = (F.hall || 0) + util; F.lastBar = bar; return inc + bar - util;
    } catch (e) { return inc; }
  };
  const pr = window.playRound;
  window.playRound = function (g) { const r = pr.apply(this, arguments); try { if (g && g === G) { const w = hallRoundWages(); G.budget -= w; fin().hstaff = (fin().hstaff || 0) + w; } } catch (e) { } return r; };
  const sg = window.seasonGrowthAll; window.seasonGrowthAll = function () { const r = sg.apply(this, arguments); try { hallSeasonEnd(); } catch (e) { } return r; };
  const cards = window.alertCardsHTML;
  window.alertCardsHTML = function () {
    let o = cards.apply(this, arguments); if (window.orgOn && orgOn()) return o;
    try { const F = fin(), net = (F.bar || 0) - (F.hall || 0) - (F.hstaff || 0); o += `<div class="card"><div class="row" style="justify-content:space-between"><h3>Palazzetto</h3><span class="pill ${net >= 0 ? "good" : ""}">${net >= 0 ? "+" : ""}${formatEur(net)}</span></div><p class="muted small" style="margin-top:6px">Bar ${formatEur(F.bar || 0)} · utenze e multe ${formatEur(F.hall || 0)} · personale ${formatEur(F.hstaff || 0)}.</p></div>`; } catch (e) { }
    return o;
  };
})();
