/* Fine stagione: premi + Albo d'oro, finestra di mercato estiva (4 settimane), poi avvio della nuova stagione.
   Hook: endSeason() dal pulsante "Nuova stagione", mwAdvance()/closeMarketWindow() dalla home durante il mercato. */
const AW_ROLE = { O: 'Miglior opposta', S: 'Miglior schiacciatrice', C: 'Miglior centrale', P: 'Miglior palleggiatrice', L: 'Miglior libero' };

function computeAwards() {
  const out = [], lids = ['A1']; if (G.lid !== 'A1' && WORLD[G.lid] && !/^A3/.test(G.lid)) lids.push(G.lid);
  const lid = 'A1', st = standings(lid, G.results), rankOf = {}; st.forEach((r, i) => rankOf[r.id] = i + 1);
  const pool = [];
  (WORLD[lid] || []).forEach(c => c.players.forEach(p => { const rk = rankOf[c.id] || 12; pool.push({ p, c, s: p.ovr + Math.max(0, 7 - rk) * 0.6 + Math.random() * 3.5 }); }));
  const best = f => pool.filter(f).sort((a, b) => b.s - a.s)[0];
  const add = (k, label, x) => { if (x) out.push({ k, label, pid: x.p.id, name: x.p.name, club: x.c.short, ovr: x.p.ovr, mine: x.c.id === myTeam().id }); };
  add('mvp', 'MVP del campionato', best(() => true));
  Object.keys(AW_ROLE).forEach(r => add('r' + r, AW_ROLE[r], best(x => x.p.role === r)));
  add('rev', 'Rivelazione (under 22)', best(x => x.p.age <= 21));
  return out;
}

function awardsModal() {
  const old = document.getElementById('alertmodal'); if (old) old.remove();
  const h = (G.hall || [])[0]; if (!h) { UI.alert = UI.next || null; UI.next = null; return; }
  const m = document.createElement('div'); m.id = 'alertmodal'; m.className = 'vs-modal';
  m.innerHTML = `<div class="card vs-card"><h3>Premi di fine stagione ${esc(h.season)}</h3>
  <p class="sub">Campione A1: <b>${esc(h.champ.A1 || '—')}</b>${h.champ.A2 ? ` · Campione A2: <b>${esc(h.champ.A2)}</b>` : ''}</p>
  ${h.awards.map(a => `<div class="prow"><span class="nm"><b>${esc(a.label)}</b><span class="muted small">${esc(a.name)} · ${esc(a.club)}</span></span>${a.mine ? '<span class="pill good">La tua!</span>' : `<span class="num" style="font-size:15px">${a.ovr}</span>`}</div>`).join('')}
  ${h.prize ? `<p class="small" style="margin-top:8px">Premi alle tue atlete: <b>+${formatEur(h.prize)}</b> di budget.</p>` : ''}
  <div class="row" style="margin-top:12px"><button class="btn primary" data-act="alertclose" style="flex:1">Continua</button></div></div>`;
  document.body.appendChild(m);
}

function endSeason() {
  const club = myTeam(); completeSeasonLeagueResults();
  const aw = computeAwards(), a1 = standings('A1', G.results)[0], a2 = (WORLD.A2 && WORLD.A2.length) ? standings('A2', G.results)[0] : null;
  const prize = Math.round(aw.filter(a => a.mine).length * 6000 * staffScale() / 250) * 250;
  const result = finishSeasonCareer();
  (G.hall = G.hall || []).unshift({ season: yearLabel(G.season || 1), champ: { A1: a1 && a1.short, A2: a2 && a2.short }, awards: aw, prize, mine: { club: club.short, rank: result.rank, league: result.entry.league } });
  G.hall = G.hall.slice(0, 15); if (prize) G.budget += prize;
  const departures = [], retained = []; ensureContracts(club, G.lid);
  club.players.forEach(p => {
    if (p.contractStatus === 'renewed') { p.contractYears = 1; p.contractStatus = 'signed'; retained.push(p.name); }
    else { const chance = p.age >= 31 ? .60 : .40; if (Math.random() < chance && club.players.length - departures.length > 7) { p.teamId = null; p.lid = null; p.contractYears = 0; p.contractStatus = 'free'; G.freeAgents.push(p); departures.push(p.name); } else { p.contractYears = 1; p.contractStatus = 'signed'; retained.push(p.name); } }
  });
  club.players = club.players.filter(p => !departures.includes(p.name));
  if (departures.length) marketNews('Fine stagione: atlete partite per il mercato: ' + departures.join(', ') + '.');
  if (retained.length) marketNews('Rinnovi annuali: ' + retained.join(', ') + '.');
  G.mw = { week: 1, max: 4, rank: result.rank, left: departures.length }; G.offers = [];
  mwOffers(2);
  UI.alert = 'awards'; UI.next = 'growth'; UI.tab = 'home';
  persist(); render(); window.scrollTo(0, 0);
}

function mwOffers(n) {
  const before = (G.offers || []).length;
  for (let i = 0; i < n; i++) if ((G.offers || []).length < 4) genOffer();
  (G.offers || []).forEach(o => { o.exp = 999; });
  return (G.offers || []).length - before;
}
function mwAdvance() {
  if (!G.mw || G.mw.week >= G.mw.max) return;
  G.mw.week++; G.offers = [];
  for (let i = 0; i < 8; i++) aiMarketMove();
  mwOffers(1 + (Math.random() < .5 ? 1 : 0));
  marketNews('Calciomercato estivo: settimana ' + G.mw.week + ' di ' + G.mw.max + '.');
  persist(); render(); toast('Settimana ' + G.mw.week + ' di mercato: i club si muovono.');
}
function closeMarketWindow() {
  G.round = 0; G.season++; G.phase = 1; G.event = null; G.cupA2 = null; G.cupA1 = null; G.playoffsA1 = null; G.playoffsA2 = null;
  G.results = { A1: [], A2: [], A3A: [], A3B: [] };
  delete WORLD.A3_PROM; delete WORLD.A3_RETR; delete LEAGUES.A3_PROM; delete LEAGUES.A3_RETR; delete SCHEDULE.A3_PROM; delete SCHEDULE.A3_RETR;
  SCHEDULE.A3A = makeSchedule(8); SCHEDULE.A3B = makeSchedule(8);
  WORLD.A3A.forEach((t, i) => syncClubLeague(t, 'A3A', i)); WORLD.A3B.forEach((t, i) => syncClubLeague(t, 'A3B', i));
  if (!WORLD[G.lid]) G.lid = 'A2';
  G.budget += Math.round(initBudget(G.lid, myTeam().tier) * 0.6); const sponsor = Math.round(9000 + myTeam().tier * 4500); G.budget += sponsor;
  if (G.management) { G.management.sponsor = null; G.management.news = (G.management.news || []).slice(0, 8); }
  if (!G.board) G.board = { confidence: 60, goal: 'salvezza' };
  const rank = G.mw ? G.mw.rank : 0; G.mw = null; G.offers = [];
  persist(); render(); toast(`Stagione archiviata (${rank}º posto). Nuova stagione avviata: +${formatEur(sponsor)} di contributo.`); window.scrollTo(0, 0);
}

function hallHTML(open) {
  const h = G.hall || []; if (!h.length) return '';
  return `<div class="card" style="margin-top:14px"><details ${open ? 'open' : ''}><summary><b>Albo d'oro</b> <span class="pill">${h.length} stagion${h.length === 1 ? 'e' : 'i'}</span></summary>${h.map(x => {
    const mvp = x.awards.find(a => a.k === 'mvp');
    return `<div class="prow"><span class="nm"><b>${esc(x.season)}</b><span class="muted small">A1: ${esc(x.champ.A1 || '—')}${x.champ.A2 ? ' · A2: ' + esc(x.champ.A2) : ''}${mvp ? ' · MVP ' + esc(mvp.name) : ''}</span><span class="muted small">Tu: ${esc(x.mine.club)}, ${x.mine.rank}º in ${esc(x.mine.league)}${x.awards.some(a => a.mine) ? ' · premi: ' + x.awards.filter(a => a.mine).map(a => esc(a.name)).join(', ') : ''}</span></span></div>`;
  }).join('')}</details></div>`;
}
function mwHTML() {
  const w = G.mw, last = w.week >= w.max, n = (G.offers || []).filter(o => offerParts(o)).length;
  return `<div class="card"><div class="row" style="justify-content:space-between"><h3>Calciomercato estivo</h3><span class="pill">Settimana ${w.week}/${w.max}</span></div>
  <p class="sub">Stagione chiusa al ${w.rank}º posto. Rinforza la rosa prima di ripartire: ${w.left ? `${w.left} atlete hanno lasciato il club, ` : ''}gli svincolati sono sul mercato e gli altri club si muovono ogni settimana.</p>
  <div class="row" style="gap:8px;flex-wrap:wrap;margin-top:8px"><button class="btn primary" data-act="mwmarket">Vai al mercato</button><button class="btn" data-act="mwoffers">Offerte (${n})</button>${last ? '' : '<button class="btn" data-act="mwadvance">Avanza di una settimana</button>'}<button class="btn ${last ? 'primary' : ''}" data-act="mwclose">${last ? 'Chiudi il mercato e inizia la stagione' : 'Chiudi subito il mercato'}</button></div>
  <p class="muted small" style="margin-top:8px">Budget: ${formatEur(G.budget)} · Rosa: ${myTeam().players.length} atlete</p></div>`;
}

const _homeHTML4 = homeHTML;
homeHTML = function () { return G && G.mw ? mwHTML() + hallHTML(true) : _homeHTML4() + hallHTML(false); };
