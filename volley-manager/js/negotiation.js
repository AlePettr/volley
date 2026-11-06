/* Mercato piu' vivo: trattative a piu' round (club + giocatrice), personalita', club rivali e richieste delle giocatrici.
   Sostituisce openNegotiation/submitOffer di club.js. Stato: UI.nego (trattativa aperta), G.negoCool (pause dopo una rottura), G.requests (richieste in corso). */
const NEGO_PATIENCE = 3, NEGO_COOL = 3;
const TRAITS = {
  mercenaria: { label: "Mercenaria", hint: "Sembra molto attenta ai soldi.", wage: 1.15 },
  fedele: { label: "Legata al club", hint: "Sembra legata al suo club attuale.", fee: 1.12 },
  ambiziosa: { label: "Ambiziosa", hint: "Punta a giocare ai massimi livelli.", wage: 1 },
  giovane: { label: "Vuole giocare", hint: "Vuole minuti in campo.", wage: 1 },
  tranquilla: { label: "Tranquilla", hint: "Sembra aperta a un accordo.", wage: .96 }
};
function playerTrait(p) {
  if (p.trait && TRAITS[p.trait]) return p.trait;
  const h = Gx.hash(p.id + "tr") % 10;
  return p.age <= 22 && h < 5 ? "giovane" : ["mercenaria", "mercenaria", "fedele", "fedele", "ambiziosa", "ambiziosa", "tranquilla", "tranquilla", "tranquilla", "giovane"][h];
}
const LEAGUE_RANK = { A1: 3, A2: 2, A3A: 1, A3B: 1 };

function negoAsks(p, seller, rivals, promise) {
  const baseVal = p.val || calcETV(p), baseWage = salaryFor(p, G.lid), tr = TRAITS[playerTrait(p)];
  const rng = mulberry32(Gx.hash(p.id + (G.round || 0) + (G.season || 1)));
  let fee = baseVal * (1.05 + rng() * .30) * (tr.fee || 1), wage = baseWage * (1 + rng() * .20) * (tr.wage || 1);
  if (playerTrait(p) === "ambiziosa") { const d = (LEAGUE_RANK[p.lid] || 1) - (LEAGUE_RANK[G.lid] || 1); wage *= d > 0 ? 1.2 : d < 0 ? .95 : 1; }
  if (promise) wage *= .92;
  const heat = 1 + .05 * rivals.length; fee *= heat; wage *= heat;
  return { fee: Math.round(fee / 100) * 100, wage: Math.round(wage / 10) * 10, baseVal, baseWage };
}
function negoRivals(p) {
  const rng = mulberry32(Gx.hash(p.id + "riv" + (G.season || 1) + Math.floor((G.round || 0) / 3)));
  const n = p.ovr >= 80 ? (rng() < .6 ? 2 : 1) : p.ovr >= 72 ? (rng() < .5 ? 1 : 0) : (rng() < .15 ? 1 : 0), out = [];
  const pool = []; for (const lid of ["A1", "A2"]) for (const c of (WORLD[lid] || [])) if (c.id !== p.teamId && !(lid === G.lid && c.id === myTeam().id)) pool.push(c);
  for (let i = 0; i < n && pool.length; i++) out.push(pool.splice(Math.floor(rng() * pool.length), 1)[0].short);
  return out;
}
function negoCooling(pid) { const c = (G.negoCool || {})[pid]; return c !== undefined && (G.round || 0) < c; }

function openNegotiation(pid) {
  const p = PLAYER_INDEX[pid]; if (!p) return;
  if (negoCooling(pid)) { toast(`${p.name}: la trattativa si è rotta da poco, riprova tra qualche giornata.`); return; }
  const rivals = negoRivals(p), a = negoAsks(p, null, rivals, false);
  UI.nego = { pid, round: 1, patience: NEGO_PATIENCE, fee: a.baseVal, wage: a.baseWage, promise: false, rivals, log: [], seen: { fee: null, wage: null }, hintShown: false };
  negoModal();
}
function negoModal() {
  const N = UI.nego; if (!N) return; const p = PLAYER_INDEX[N.pid]; if (!p) return;
  const seller = (WORLD[p.lid] || []).find(t => t.id === p.teamId), tr = TRAITS[playerTrait(p)];
  const dots = Array.from({ length: NEGO_PATIENCE }, (_, i) => `<i style="display:inline-block;width:10px;height:10px;border-radius:50%;margin-right:4px;background:${i < N.patience ? "var(--acc, #d6336c)" : "rgba(128,128,128,.35)"}"></i>`).join("");
  const log = N.log.slice(-4).map(l => `<div class="small" style="margin:4px 0;padding:6px 8px;border-radius:8px;background:rgba(128,128,128,.12)">${l}</div>`).join("");
  const html = `<div class="modal-backdrop" id="nego-modal" style="position:fixed;inset:0;background:rgba(5,8,16,.85);z-index:9999;display:flex;align-items:center;justify-content:center;padding:14px;overflow:auto">
  <div class="card" style="max-width:420px;width:100%;max-height:94vh;overflow:auto">
    <div class="row" style="justify-content:space-between;align-items:center;margin-bottom:6px"><h3>Trattativa per ${esc(p.name)}</h3><button class="btn" data-act="negoclose">X</button></div>
    <p class="muted small">${p.role} · ${p.age} anni · OVR ${p.ovr} · ${esc(seller ? seller.short : "")} · valore ${formatEur(p.val || calcETV(p))}</p>
    <div class="row" style="justify-content:space-between;margin:8px 0"><span class="small">Round ${N.round} di ${NEGO_PATIENCE}</span><span title="Pazienza delle parti">${dots}</span></div>
    ${N.hintShown ? `<p class="small" style="margin:4px 0"><b>${tr.label}.</b> ${tr.hint}</p>` : ""}
    ${N.rivals.length ? `<p class="small" style="margin:4px 0;color:#d97706"><b>Concorrenza:</b> ${N.rivals.map(esc).join(", ")} ${N.rivals.length > 1 ? "sono interessate" : "è interessata"}. Più tempo passa, più rischi di perderla.</p>` : ""}
    ${log}
    <div style="margin:10px 0"><label class="muted small" style="display:block;margin-bottom:4px">Cartellino al club ${N.seen.fee ? `<b>(chiedono circa ${formatEur(N.seen.fee)})</b>` : ""}</label>
      <input type="number" id="offer-fee" value="${N.fee}" style="width:100%;padding:8px;border-radius:6px;border:1px solid var(--line)" step="500"></div>
    <div style="margin:10px 0"><label class="muted small" style="display:block;margin-bottom:4px">Ingaggio per giornata alla giocatrice ${N.seen.wage ? `<b>(chiede circa ${formatEur(N.seen.wage)})</b>` : ""}</label>
      <input type="number" id="offer-wage" value="${N.wage}" style="width:100%;padding:8px;border-radius:6px;border:1px solid var(--line)" step="50"></div>
    <label class="small" style="display:flex;gap:8px;align-items:center;margin:8px 0"><input type="checkbox" id="offer-promise" ${N.promise ? "checked" : ""}> Prometto una maglia da titolare (ingaggio più basso, ma se resta in panchina si arrabbia)</label>
    <div class="row" style="margin-top:12px;gap:8px"><button class="btn primary big" style="flex:1" data-act="negosend">Invia offerta</button><button class="btn" data-act="negoclose">Lascia</button></div>
  </div></div>`;
  const old = document.getElementById("nego-modal"); if (old) old.remove();
  document.body.insertAdjacentHTML("beforeend", html);
}
function negoBreak(p, why) {
  G.negoCool = G.negoCool || {}; G.negoCool[p.id] = (G.round || 0) + NEGO_COOL; UI.nego = null;
  const m = document.getElementById("nego-modal"); if (m) m.remove(); toast(why); persist(); render();
}
function submitOffer() {
  const N = UI.nego; if (!N) return; const p = PLAYER_INDEX[N.pid]; if (!p) return;
  const F = parseInt(document.getElementById("offer-fee").value) || 0, W = parseInt(document.getElementById("offer-wage").value) || 0, promise = document.getElementById("offer-promise").checked;
  N.fee = F; N.wage = W; N.promise = promise; N.hintShown = true;
  const seller = (WORLD[p.lid] || []).find(t => t.id === p.teamId); if (!seller) return;
  const a = negoAsks(p, seller, N.rivals, promise), fr = F / a.fee, wr = W / a.wage, tr = playerTrait(p);
  /* richiesta di minuti: le giovani senza promessa e senza posto in squadra rifiutano */
  if (tr === "giovane" && !promise) {
    const mine = myTeam().players.filter(x => x.role === p.role).sort((x, y) => y.ovr - x.ovr), need = Math.min(2, mine.length) - 1;
    if (mine[need] && mine[need].ovr > p.ovr + 2) { N.log.push(`${esc(p.name)} vuole giocare: nel suo ruolo hai già chi parte davanti. Con una promessa di maglia potrebbe accettare.`); return negoNext(N, p, 1); }
  }
  /* un rivale chiude prima di te (dal secondo round), a meno di un'offerta irrinunciabile */
  const strong = fr >= 1.15 && wr >= 1.1;
  if (N.round >= 2 && N.rivals.length && !strong && Math.random() < .2 * N.rivals.length) {
    const r = N.rivals[0]; const m = document.getElementById("nego-modal"); if (m) m.remove(); UI.nego = null;
    p.contractStatus = p.contractStatus; marketNews(`${r} chiude per ${p.name}: affare saltato per te.`); toast(`${r} ti ha anticipato: ${p.name} ha firmato altrove.`);
    try { const club = [...(WORLD.A1 || []), ...(WORLD.A2 || [])].find(c => c.short === r); if (club && club.id !== p.teamId && club.players.length < 17 && seller.players.length > 11) { seller.players = seller.players.filter(x => x.id !== p.id); p.teamId = club.id; p.lid = (WORLD.A1 || []).includes(club) ? "A1" : "A2"; p.wage = salaryFor(p, p.lid); club.players.push(p); PLAYER_INDEX[p.id] = p; } } catch (e) { }
    persist(); render(); return;
  }
  if (fr >= 1 && wr >= 1) {
    const total = F + W * 2; if (G.budget < total) { toast(`Fondi insufficienti: servono ${formatEur(total)}, hai ${formatEur(G.budget)}.`); return; }
    G.budget -= total; seller.budget = (seller.budget || 0) + F; seller.players = seller.players.filter(x => x.id !== p.id); try { repairRoster(seller); } catch (e) { }
    p.teamId = myTeam().id; p.lid = G.lid; p.wage = W; p.contractYears = 1; p.contractStatus = "signed"; p.fatigue = 0; p.inj = 0; p.mood = 0; p.ovrSigned = p.ovr; p.benchStreak = 0;
    p.promise = promise ? (G.round || 0) : null; myTeam().players.push(p); myTeam().players.sort((x, y) => ROLE_ORDER.indexOf(x.role) - ROLE_ORDER.indexOf(y.role) || y.ovr - x.ovr);
    const m = document.getElementById("nego-modal"); if (m) m.remove(); UI.nego = null;
    marketNews(`Accordo raggiunto! ${p.name} acquistata da ${seller.short} per ${formatEur(F)}.`); toast(`Trattativa conclusa! ${p.name} è una tua giocatrice.`); persist(); render(); return;
  }
  /* risposte: club e giocatrice, con la richiesta rivelata dal secondo round */
  const lines = []; let pen = 1;
  if (fr < .7 || wr < .7) { pen = 2; lines.push("Offerta offensiva: la controparte si irrigidisce."); }
  if (fr < 1) lines.push(fr >= .93 ? `${esc(seller.short)}: “Ci siamo quasi, ancora un piccolo sforzo sul cartellino.”` : fr >= .8 ? `${esc(seller.short)}: “Il cartellino è ancora basso.”` : `${esc(seller.short)}: “Siamo molto lontani sul cartellino.”`);
  if (wr < 1) lines.push(wr >= .93 ? `${esc(p.name)}: “Quasi, ma voglio qualcosa in più di ingaggio.”` : wr >= .8 ? `${esc(p.name)}: “L'ingaggio non mi convince.”` : `${esc(p.name)}: “Così non se ne parla.”`);
  if (N.round >= 2 || fr >= .9) { if (fr < 1) N.seen.fee = Math.round(a.fee * 1.02 / 100) * 100; }
  if (N.round >= 2 || wr >= .9) { if (wr < 1) N.seen.wage = Math.round(a.wage * 1.02 / 10) * 10; }
  N.log.push(lines.join("<br>")); negoNext(N, p, pen);
}
function negoNext(N, p, pen) {
  N.patience -= pen; N.round++;
  if (N.patience <= 0) { negoBreak(p, `Trattativa saltata per ${p.name}: le parti hanno perso la pazienza.`); return; }
  negoModal();
}
document.addEventListener("click", e => {
  const el = e.target.closest("[data-act]"); if (!el) return; const act = el.dataset.act;
  if (act === "negosend") { submitOffer(); e.stopPropagation(); }
  else if (act === "negoclose") { const m = document.getElementById("nego-modal"); if (m) m.remove(); UI.nego = null; e.stopPropagation(); }
  else if (act === "nreq") { handleRequest(el.dataset.id, el.dataset.v); e.stopPropagation(); }
}, true);

/* ---------- richieste delle giocatrici ---------- */
function myLineupIds() { try { return new Set(Object.values(lineupFor(G, myTeam()))); } catch (e) { return new Set(); } }
function negoTick() {
  if (!G) return; const t = myTeam(), start = myLineupIds(); G.requests = (G.requests || []).filter(r => t.players.some(p => p.id === r.pid) && r.exp >= (G.round || 0));
  const has = (pid, type) => G.requests.some(r => r.pid === pid && r.type === type);
  for (const p of t.players) {
    if (p.promise !== null && p.promise !== undefined) {
      p.benchStreak = start.has(p.id) ? 0 : (p.benchStreak || 0) + 1;
      if (p.benchStreak >= 3 && !has(p.id, "minutes")) G.requests.push({ id: "q" + p.id + (G.round || 0), pid: p.id, type: "minutes", exp: (G.round || 0) + 3 });
    }
    if (G.requests.length < 2 && !has(p.id, "raise") && (G.round || 0) >= 4 && !p.askedRaise && ((p.ovrSigned && p.ovr >= p.ovrSigned + 2) || (playerTrait(p) === "mercenaria" && Math.random() < .03))) { p.askedRaise = true; G.requests.push({ id: "r" + p.id + (G.round || 0), pid: p.id, type: "raise", exp: (G.round || 0) + 3 }); }
  }
}
function handleRequest(id, v) {
  const r = (G.requests || []).find(x => x.id === id); if (!r) return; const p = myTeam().players.find(x => x.id === r.pid); G.requests = G.requests.filter(x => x.id !== id); if (!p) { render(); return; }
  p.mood = p.mood || 0;
  if (r.type === "raise") {
    if (v === "yes") { p.wage = Math.round((p.wage || salaryFor(p, G.lid)) * 1.15); p.mood = Math.min(2, p.mood + 1); toast(`${p.name} ha il suo aumento: ingaggio ${formatEur(p.wage)}.`); }
    else { p.mood -= 1; toast(`${p.name} ci resta male per il no all'aumento.`); }
  } else if (r.type === "minutes") {
    if (v === "ok") { p.promise = null; p.mood -= 1; toast(`${p.name} accetta la panchina, ma non è contenta.`); }
    else { p.promise = null; p.mood -= 2; toast(`${p.name} è furiosa per la promessa mancata.`); }
  }
  if (p.mood <= -2) marketNews(`${p.name} è scontenta e potrebbe lasciare a fine stagione.`);
  persist(); render();
}
(function () {
  const tick = window.offersTick; window.offersTick = function () { tick.apply(this, arguments); try { negoTick(); } catch (e) { } };
  const cards = window.alertCardsHTML;
  window.alertCardsHTML = function () {
    let out = cards.apply(this, arguments);
    for (const r of (G.requests || [])) {
      const p = myTeam().players.find(x => x.id === r.pid); if (!p) continue;
      const txt = r.type === "raise" ? `${esc(p.name)} chiede un aumento del 15% (ora ${formatEur(p.wage || salaryFor(p, G.lid))} a giornata): è migliorata e vuole essere pagata di più.` : `${esc(p.name)} è in panchina da giornate, ma le avevi promesso una maglia da titolare.`;
      const btns = r.type === "raise" ? `<button class="btn primary" style="min-height:34px;padding:5px 10px;font-size:12px" data-act="nreq" data-id="${esc(r.id)}" data-v="yes">Concedi</button><button class="btn" style="min-height:34px;padding:5px 10px;font-size:12px" data-act="nreq" data-id="${esc(r.id)}" data-v="no">Rifiuta</button>` : `<button class="btn" style="min-height:34px;padding:5px 10px;font-size:12px" data-act="nreq" data-id="${esc(r.id)}" data-v="ok">Le parlo</button><button class="btn" style="min-height:34px;padding:5px 10px;font-size:12px" data-act="nreq" data-id="${esc(r.id)}" data-v="no">Ignora</button>`;
      out += `<div class="card"><h3>Richiesta di ${esc(p.name)}</h3><p class="muted small">${txt}</p><div class="row" style="gap:8px;margin-top:8px">${btns}</div></div>`;
    }
    return out;
  };
})();
