/* ===== Sfida online 1 contro 1 (peer-to-peer con PeerJS) =====
   L'host simula la partita e la invia all'ospite; time-out e inizio azione sono sincronizzati dall'host.
   Non tocca il salvataggio della carriera: serve solo per giocare tra amici. */
const Vs = (() => {
  const PEER_SRC = 'https://cdnjs.cloudflare.com/ajax/libs/peerjs/1.5.4/peerjs.min.js';
  const VER = 'h';
  const TACS = [['bal', 'Equilibrata'], ['srv', 'Battuta forte'], ['def', 'Muro e difesa']];
  let peer = null, conn = null, role = null, state = 'closed', code = '', msg = '', backup = null;
  let logs = [], timer = null;
  const lsGet = (k, d) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } };
  const lsSet = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } };
  const nick = () => lsGet('vm-nick', '') || '';
  let oppNick = '';
  const boardRec = (name, win, sf, ss) => { const b = lsGet('vm-vs-board', {}), r = b[name] || { w: 0, l: 0, sf: 0, ss: 0 }; if (win) r.w++; else r.l++; r.sf += sf; r.ss += ss; b[name] = r; lsSet('vm-vs-board', b); };
  const boardHTML = () => { const b = lsGet('vm-vs-board', {}), n = nick() || 'Tu'; let w = 0, l = 0; const rows = Object.keys(b).map(k => ({ k, ...b[k] })).sort((a, c) => (c.w - c.l) - (a.w - a.l) || (c.sf - c.ss) - (a.sf - a.ss)); rows.forEach(r => { w += r.w; l += r.l; }); if (!rows.length) return '<p class="muted small" style="margin-top:12px">Nessuna sfida giocata: la classifica compare dopo la prima partita.</p>'; return `<h3 style="margin-top:14px">Classifica sfide</h3><p class="muted small">${esc(n)}: ${w} vittorie, ${l} sconfitte. I tuoi risultati contro ciascun amico.</p>` + rows.map((r, i) => `<div class="prow"><span class="nm"><b>${i + 1}. ${esc(r.k)}</b><span class="muted small">V ${r.w} · S ${r.l} · set ${r.sf}-${r.ss}</span></span></div>`).join(''); };
  let mine = { lid: '', id: '', tac: 'bal', ready: false, career: false }, theirs = null, pending = [];
  const $ = s => document.querySelector(s), esc = x => String(x == null ? '' : x).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  const rep = (k, v) => k === 'vc' ? undefined : (v && typeof v === 'object' && v.id !== undefined && v.name !== undefined && v.teamId !== undefined) ? { $p: v.id } : v;
  const rev = (k, v) => (v && typeof v === 'object' && v.$p !== undefined) ? (PLAYER_INDEX[v.$p] || null) : v;
  const plain = p => JSON.parse(JSON.stringify(p, (k, v) => k === '_look' ? undefined : v));
  const snap = t => ({ id: t.id, short: t.short, full: t.full, city: t.city, color: t.color, color2: t.color2, lid: t.lid, idx: t.idx, tier: t.tier });
  const leagues = () => Object.keys(LEAGUES).filter(l => WORLD[l] && WORLD[l].length);
  const teamById = id => { for (const l of Object.keys(WORLD)) for (const t of WORLD[l]) if (t.id === id) return t; return null; };
  const log = t => { logs.push(t); if (logs.length > 8) logs.shift(); const e = $('#vslog'); if (e) e.textContent = logs.join(' · '); };
  const ICE = { config: { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:global.stun.twilio.com:3478' }, { urls: ['turn:eu-0.turn.peerjs.com:3478', 'turn:us-0.turn.peerjs.com:3478'], username: 'peerjs', credential: 'peerjsp' }, { urls: ['turn:openrelay.metered.ca:80', 'turn:openrelay.metered.ca:443', 'turn:openrelay.metered.ca:443?transport=tcp'], username: 'openrelayproject', credential: 'openrelayproject' }] } };
  const send = m => { try { if (conn && conn.open) conn.send(m); } catch (e) { } };

  function ensureEntry() {
    if ($('#vsentry')) return;
    const b = document.createElement('button'); b.id = 'vsentry'; b.className = 'btn vs-entry'; b.textContent = '⚔ Sfida un amico'; b.onclick = open; document.body.appendChild(b);
    setInterval(() => { b.hidden = !!UI.match || !!$('#vsmodal') || !!$('#alertmodal') || !!document.querySelector('.introov') || (!!G && UI.tab !== 'home'); }, 400);
  }

  /* ---------- finestra ---------- */
  function open() { if (UI.match) return; if (!$('#vsmodal')) { const d = document.createElement('div'); d.id = 'vsmodal'; d.className = 'vs-modal'; document.body.appendChild(d); } state = 'menu'; msg = ''; draw(); }
  function close() { const m = $('#vsmodal'); if (m) m.remove(); hangup(); state = 'closed'; }
  function hangup() { clearTimeout(timer); try { if (conn) conn.close(); } catch (e) { } try { if (peer) peer.destroy(); } catch (e) { } conn = null; peer = null; theirs = null; pending = []; mine.ready = false; }
  function teamOptions(lid, sel) { return (WORLD[lid] || []).slice().sort((a, b) => a.short.localeCompare(b.short)).map(t => `<option value="${esc(t.id)}" ${t.id === sel ? 'selected' : ''}>${esc(t.short)}</option>`).join(''); }
  function draw() {
    const m = $('#vsmodal'); if (!m) return; let h = '';
    if (state === 'menu') h = `<h3>Sfida un amico</h3><p class="muted small">Due persone, due browser, una partita dal vivo. Serve internet. Una crea la stanza e passa il codice, l'altra lo inserisce.</p><div class="row" style="gap:10px;margin-top:12px"><button class="btn primary big" id="vs-host">Crea stanza</button></div><div class="row" style="gap:8px;margin-top:14px"><input id="vs-code" class="vs-in" placeholder="Codice stanza" maxlength="8" autocapitalize="characters"><button class="btn big" id="vs-join">Entra</button></div><label class="small" style="display:block;margin-top:14px">Il tuo nome in classifica<input id="vs-nick" class="vs-in" placeholder="Es. Ale" maxlength="14" value="${esc(nick())}" style="width:100%;margin-top:4px"></label>${boardHTML()}`;
    else if (state === 'wait') h = code ? `<h3>Stanza creata</h3><p class="muted small">Passa questo codice al tuo amico:</p><div class="vs-code">${esc(code)}</div><p class="muted small">In attesa che si colleghi…</p>` : `<h3>Creo la stanza…</h3><p class="muted small">Mi collego al servizio di connessione.</p>`;
    else if (state === 'connecting') h = `<h3>Connessione…</h3><p class="muted small">Mi collego alla stanza ${esc(code)}.</p>`;
    else if (state === 'lobby') {
      const lg = leagues(); if (!mine.lid) mine.lid = lg[0]; if (!mine.id) mine.id = (WORLD[mine.lid][0] || {}).id;
      const th = theirs && theirs.ready ? (theirs.snap || teamById(theirs.id)) : null, cm = mine.career && hasCareer();
      h = `<h3>${role === 'host' ? 'Tu sei la squadra di casa' : 'Sei la squadra ospite'}</h3>
      ${hasCareer() ? `<label class="small" style="display:flex;gap:8px;align-items:center;margin-top:8px"><input type="checkbox" id="vs-car" ${cm ? 'checked' : ''}> Usa la mia squadra della carriera (${esc(myTeam().short)}, con rosa, formazione e tattica attuali)</label>` : ''}
      ${cm ? `<p class="small" style="margin:10px 0">Giochi con <b>${esc(myTeam().short)}</b>. Sfida amichevole: non cambia nulla nella tua carriera.</p>` : `<div class="vs-grid"><label>Campionato<select id="vs-lg">${lg.map(l => `<option value="${l}" ${l === mine.lid ? 'selected' : ''}>${esc(LEAGUES[l].name)}</option>`).join('')}</select></label>
      <label>La tua squadra<select id="vs-team">${teamOptions(mine.lid, mine.id)}</select></label>
      <label>Tattica<select id="vs-tac">${TACS.map(([k, l]) => `<option value="${k}" ${k === mine.tac ? 'selected' : ''}>${l}</option>`).join('')}</select></label></div>`}
      <p class="small" style="margin:10px 0">Avversario: <b>${th ? esc(th.short) + ' · ' + esc((TACS.find(x => x[0] === theirs.tac) || [0, ''])[1]) + (theirs.career ? ' (squadra di carriera)' : '') : 'sta scegliendo…'}</b></p>
      <div class="row" style="gap:10px"><button class="btn ${mine.ready ? '' : 'primary'}" id="vs-ready">${mine.ready ? 'Pronto ✓ (modifica)' : 'Sono pronto'}</button>${role === 'host' ? `<button class="btn primary" id="vs-start" ${mine.ready && theirs && theirs.ready ? '' : 'disabled'}>Inizia partita</button>` : '<span class="muted small">Parte quando l\'host avvia.</span>'}</div>`;
    } else if (state === 'error') h = `<h3>Qualcosa non va</h3><p class="small">${esc(msg)}</p>`;
    m.innerHTML = `<div class="vs-card card">${h}<p class="muted small" id="vslog" style="margin-top:10px;font-size:11px;opacity:.7">${esc(logs.join(' · '))}</p><div class="row" style="margin-top:14px;justify-content:space-between;align-items:center"><button class="btn" id="vs-close">${state === 'lobby' || state === 'wait' || state === 'connecting' ? 'Annulla' : 'Chiudi'}</button><span class="muted" style="font-size:11px;opacity:.6">versione ${VER}</span></div></div>`;
    bind();
  }
  function bind() {
    const g = id => document.getElementById(id), on = (id, fn) => { const e = g(id); if (e) e.onclick = fn; };
    on('vs-close', close); on('vs-host', startHost); on('vs-join', () => startJoin((g('vs-code').value || '').trim().toUpperCase()));
    const nk = g('vs-nick'); if (nk) nk.oninput = () => lsSet('vm-nick', nk.value.trim().slice(0, 14));
    const lg = g('vs-lg'); if (lg) lg.onchange = () => { mine.lid = lg.value; mine.id = (WORLD[mine.lid][0] || {}).id; mine.ready = false; sendPick(); draw(); };
    const tm = g('vs-team'); if (tm) tm.onchange = () => { mine.id = tm.value; mine.ready = false; sendPick(); draw(); };
    const cb = g('vs-car'); if (cb) cb.onchange = () => { mine.career = cb.checked; mine.ready = false; sendPick(); draw(); };
    const tc = g('vs-tac'); if (tc) tc.onchange = () => { mine.tac = tc.value; mine.ready = false; sendPick(); };
    on('vs-ready', () => { mine.ready = !mine.ready; sendPick(); draw(); });
    on('vs-start', hostStart);
  }
  const hasCareer = () => typeof G !== 'undefined' && !!G && typeof myTeam === 'function';
  /* la squadra della carriera: rosa, formazione e tattica attuali */
  function careerPick() { const t = myTeam(); return { id: t.id, tac: G.tactic || 'bal', snap: snap(t), players: t.players.map(plain), lu: { ...lineupFor(G, t) } }; }
  const sendPick = () => send({ t: 'pick', nick: nick(), pick: mine.career && hasCareer() ? { ...careerPick(), career: true, ready: mine.ready } : { id: mine.id, tac: mine.tac, ready: mine.ready } });
  const fail = t => { state = 'error'; msg = t; draw(); };

  /* ---------- connessione ---------- */
  function loadPeer(ok) { if (window.Peer) return ok(); const s = document.createElement('script'); s.src = PEER_SRC; s.onload = ok; s.onerror = () => fail('Non riesco a caricare il servizio di connessione. Controlla internet e riprova.'); document.head.appendChild(s); }
  const newCode = () => { const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let c = ''; for (let i = 0; i < 5; i++) c += A[Math.floor(Math.random() * A.length)]; return c; };
  function startHost() {
    role = 'host'; code = ''; state = 'wait'; logs = []; draw();
    loadPeer(() => {
      const id = newCode(); log('servizio: collegamento…');
      peer = new Peer('volleymgr-' + id, ICE);
      peer.on('open', () => { code = id; log('servizio ok'); draw(); });
      peer.on('disconnected', () => { log('servizio perso, riconnetto'); try { peer.reconnect(); } catch (e) { } });
      peer.on('error', e => { log('errore ' + (e && e.type)); fail('Errore di connessione: ' + (e && e.type || e)); });
      peer.on('connection', c => {
        if (conn) { c.close(); return; } log('amico trovato, apro il canale…'); setConn(c);
        clearTimeout(timer); timer = setTimeout(() => { if (state === 'wait') fail('Ti ha trovato ma non riesce a stabilire la connessione diretta (rete o firewall). Provate sulla stessa rete Wi-Fi o disattivate la VPN, poi riprovate.'); }, 20000);
        c.on('open', () => { clearTimeout(timer); log('canale aperto'); state = 'lobby'; mine.ready = false; draw(); sendPick(); });
      });
    });
  }
  function startJoin(c) {
    if (!c) return; role = 'guest'; code = c; state = 'connecting'; logs = []; draw();
    loadPeer(() => {
      log('servizio: collegamento…'); peer = new Peer(undefined, ICE);
      peer.on('error', e => { log('errore ' + (e && e.type)); fail(e && e.type === 'peer-unavailable' ? 'Stanza non trovata: controlla il codice (e che l\'altra persona sia ancora in attesa).' : 'Errore di connessione: ' + (e && e.type || e)); });
      peer.on('open', () => {
        log('servizio ok, cerco la stanza ' + code); const cn = peer.connect('volleymgr-' + code, { reliable: true }); setConn(cn);
        clearTimeout(timer); timer = setTimeout(() => { if (state === 'connecting') fail('Ho trovato la stanza ma non riesco a stabilire la connessione diretta (rete o firewall). Provate sulla stessa rete Wi-Fi o disattivate la VPN, poi riprovate.'); }, 20000);
        cn.on('open', () => { clearTimeout(timer); log('canale aperto'); state = 'lobby'; mine.ready = false; draw(); sendPick(); });
        cn.on('error', e => log('canale: ' + e));
      });
    });
  }
  /* diagnostica: stato ICE e tipi di candidati (host = rete locale, srflx = via STUN, relay = via TURN) */
  function watchIce(c) {
    let tries = 0; const att = () => {
      const pc = c.peerConnection; if (!pc) { if (tries++ < 40) setTimeout(att, 250); return; }
      const types = {}; pc.addEventListener('icecandidate', e => { if (e.candidate) { const t = (e.candidate.candidate.match(/ typ (\w+)/) || [])[1] || '?'; types[t] = (types[t] || 0) + 1; } });
      pc.addEventListener('iceconnectionstatechange', () => log('ice ' + pc.iceConnectionState));
      setTimeout(() => log('candidati ' + JSON.stringify(types)), 5000); setTimeout(() => log('candidati ' + JSON.stringify(types)), 15000);
    }; att();
  }
  function setConn(c) {
    conn = c; watchIce(c);
    c.on('data', onData);
    c.on('close', () => { const M = UI.match; if (M && M.pvp && !M.done) { toast('L\'avversario si e\' disconnesso'); pvpFinish(M, true); } else if (state === 'lobby') fail('L\'avversario ha lasciato la stanza.'); });
  }
  function onData(d) {
    if (!d || !d.t) return; const M = UI.match;
    if (d.t === 'pick') { theirs = d.pick; if (d.nick) oppNick = String(d.nick).slice(0, 14); if (state === 'lobby') draw(); }
    else if (d.t === 'init' && role === 'guest') guestStart(d);
    else if (d.t === 'toReq' && M && M.pvp && role === 'host') callTimeout(M, 'a');
    else if ((d.t === 'go' || d.t === 'to') && M && M.pvp) M.pvp.q.push(d);
  }

  /* ---------- avvio partita ---------- */
  function buildM(home, away, lu, tac, res, userSide) {
    return { event: null, fx: { home: userSide === 'h', h: 0, a: 1 }, home, away, res, i: 0, speed: 1, paused: false, done: false, anim: null, sh: 0, sa: 0, setScores: [], userSide, lu, subsUsed: 0, tactic: tac[userSide], view: { h: courtView(rotOf(lu.h), PLAYER_INDEX[lu.h.L]), a: courtView(rotOf(lu.a), PLAYER_INDEX[lu.a.L]) }, cur: null, last: 0, raf: 0, frame: 0, colors: null };
  }
  function enter(M) {
    const m = $('#vsmodal'); if (m) m.remove();
    UI.match = M; renderMatch();
    for (const s of ['[data-act=skip]', '[data-act=submodal]', '#vcpill']) { const e = $(s); if (e) e.remove(); }
  }
  function hostStart() {
    if (!(mine.ready && theirs && theirs.ready)) return;
    const cm = mine.career && hasCareer(), mp = cm ? careerPick() : null;
    const th = cm ? myTeam() : teamById(mine.id); if (!th) { fail('Squadra non trovata.'); return; }
    const hid = th.id; if (hid === theirs.id) { toast('Scegliete due squadre diverse'); return; }
    let ta;
    if (theirs.career && theirs.snap) {
      backup = backup || {}; for (const p of theirs.players) { if (!(p.id in backup)) backup[p.id] = PLAYER_INDEX[p.id]; PLAYER_INDEX[p.id] = p; }
      ta = { ...theirs.snap, players: theirs.players.map(p => PLAYER_INDEX[p.id]) };
    } else ta = teamById(theirs.id);
    if (!ta) { fail('Squadra non trovata.'); return; }
    const lu = { h: cm ? mp.lu : autoLineup(th), a: theirs.career && theirs.lu ? theirs.lu : autoLineup(ta) }, tac = { h: cm ? mp.tac : mine.tac, a: theirs.tac };
    const res = simMatch(th, ta, lu, tac, Math.random, true); res.rallies.forEach(r => { r.vc = null; });
    const M = buildM(th, ta, lu, tac, res, 'h'); M.pvp = { role: 'host', q: [], sent: new Set() }; M.toLeft = { h: 2, a: 2 };
    send({ t: 'init', home: snap(th), away: snap(ta), homePl: th.players.map(plain), awayPl: ta.players.map(plain), lu, tac, res: JSON.stringify(res, rep) });
    enter(M);
  }
  function guestStart(d) {
    backup = {}; for (const p of d.homePl.concat(d.awayPl)) { backup[p.id] = PLAYER_INDEX[p.id]; PLAYER_INDEX[p.id] = p; }
    const mk = (s, pl) => ({ ...s, players: pl.map(p => PLAYER_INDEX[p.id]) });
    const home = mk(d.home, d.homePl), away = mk(d.away, d.awayPl), res = JSON.parse(d.res, rev);
    const M = buildM(home, away, d.lu, d.tac, res, 'a'); M.pvp = { role: 'guest', q: [], sent: new Set() }; M.toLeft = { h: 2, a: 2 };
    enter(M);
  }

  /* ---------- sincronizzazione: chiamata dal ciclo di gioco prima di ogni azione ---------- */
  function gate(M) {
    const P = M.pvp;
    if (P.role === 'host') {
      if (M.toCall) { startTimeout(M); return false; }
      if (!P.sent.has(M.i)) { P.sent.add(M.i); send({ t: 'go', i: M.i }); }
      return true;
    }
    while (P.q.length) {
      const m = P.q[0];
      if (m.t === 'to') { P.q.shift(); applyTo(M, m); return false; }
      if (m.t === 'go') { if (m.i < M.i) { P.q.shift(); continue; } if (m.i === M.i) { P.q.shift(); return true; } return false; }
      P.q.shift();
    }
    return false;
  }
  /* l'host ha eseguito un time-out: invia il nuovo seguito della partita */
  function sendTimeout(M, side, run) {
    const tail = { rallies: M.res.rallies.slice(M.i), sets: M.res.sets, hs: M.res.hs, as: M.res.as, pts: M.res.pts };
    send({ t: 'to', i: M.i, side, run, toLeft: M.toLeft, tail: JSON.stringify(tail, rep) });
  }
  function applyTo(M, m) {
    const tail = JSON.parse(m.tail, rev);
    M.res.rallies = M.res.rallies.slice(0, m.i).concat(tail.rallies); M.res.sets = tail.sets; M.res.hs = tail.hs; M.res.as = tail.as; M.res.pts = tail.pts;
    M.toLeft = m.toLeft; toLabel(M); showTimeout(M, m.side, m.run);
  }
  function request(M) { send({ t: 'toReq' }); }

  function pvpFinish(M, abandoned) {
    M.done = true; const res = M.res, me = M.userSide, mineS = me === 'h' ? res.hs : res.as, thS = me === 'h' ? res.as : res.hs, win = mineS > thS;
    const opp = me === 'h' ? M.away : M.home;
    if (!abandoned || win) boardRec(oppNick || 'Amico', win, mineS, thS);
    $('#ctl').innerHTML = ''; if (typeof Snd !== 'undefined') Snd.end(win && !abandoned);
    $('#feed').textContent = `Finale: ${M.home.short} ${res.hs}-${res.as} ${M.away.short}.`; $('#sets').textContent = `FINALE · ${res.hs}-${res.as}`;
    const last = res.sets[res.sets.length - 1]; if (last) { $('#sc-h').textContent = last[0]; $('#sc-a').textContent = last[1]; }
    $('#sum').innerHTML = `<div class="card" style="margin-top:6px"><h3>${abandoned ? 'Partita interrotta' : win ? 'Hai vinto!' : 'Hai perso'} · ${mineS}-${thS}</h3><p class="sub" style="margin:8px 0 0">Sfida contro ${esc(opp.short)}. ${res.sets.map((s, i) => `Set ${i + 1}: ${s[0]}-${s[1]}`).join(' · ')}</p><div class="row" style="margin-top:14px"><button class="btn primary big" data-act="vsend">Esci</button></div></div>`;
  }
  function leave() {
    const M = UI.match; if (M) { cancelAnimationFrame(M.raf); if (typeof s3Dispose === 'function') s3Dispose(M); if (typeof Snd !== 'undefined') Snd.stop(); }
    if (backup) { for (const id in backup) { if (backup[id]) PLAYER_INDEX[id] = backup[id]; else delete PLAYER_INDEX[id]; } backup = null; }
    hangup(); UI.match = null; render(); window.scrollTo(0, 0);
  }
  document.addEventListener('click', e => { if (e.target.closest('[data-act="vsend"]')) leave(); });
  if (typeof document !== 'undefined') { if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ensureEntry); else ensureEntry(); }
  return { open, gate, sendTimeout, request, pvpFinish };
})();
