/* ===== Sfida online 1 contro 1 (peer-to-peer con PeerJS) =====
   L'host simula la partita e la invia all'ospite; time-out e inizio azione sono sincronizzati dall'host.
   Non tocca il salvataggio della carriera: serve solo per giocare tra amici. */
const Vs = (() => {
  const PEER_SRC = 'https://cdnjs.cloudflare.com/ajax/libs/peerjs/1.5.4/peerjs.min.js';
  const TACS = [['bal', 'Equilibrata'], ['srv', 'Battuta forte'], ['def', 'Muro e difesa']];
  let peer = null, conn = null, role = null, state = 'closed', code = '', msg = '', backup = null;
  let mine = { lid: '', id: '', tac: 'bal', ready: false }, theirs = null, pending = [];
  const $ = s => document.querySelector(s), esc = x => String(x == null ? '' : x).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  const rep = (k, v) => k === 'vc' ? undefined : (v && typeof v === 'object' && v.id !== undefined && v.name !== undefined && v.teamId !== undefined) ? { $p: v.id } : v;
  const rev = (k, v) => (v && typeof v === 'object' && v.$p !== undefined) ? (PLAYER_INDEX[v.$p] || null) : v;
  const plain = p => JSON.parse(JSON.stringify(p, (k, v) => k === '_look' ? undefined : v));
  const snap = t => ({ id: t.id, short: t.short, full: t.full, city: t.city, color: t.color, color2: t.color2, lid: t.lid, idx: t.idx, tier: t.tier });
  const leagues = () => Object.keys(LEAGUES).filter(l => WORLD[l] && WORLD[l].length);
  const teamById = id => { for (const l of Object.keys(WORLD)) for (const t of WORLD[l]) if (t.id === id) return t; return null; };
  const send = m => { try { if (conn && conn.open) conn.send(m); } catch (e) { } };

  function ensureEntry() {
    if ($('#vsentry')) return;
    const b = document.createElement('button'); b.id = 'vsentry'; b.className = 'btn vs-entry'; b.textContent = '⚔ Sfida un amico'; b.onclick = open; document.body.appendChild(b);
    setInterval(() => { b.hidden = !!UI.match || !!$('#vsmodal'); }, 400);
  }

  /* ---------- finestra ---------- */
  function open() { if (UI.match) return; if (!$('#vsmodal')) { const d = document.createElement('div'); d.id = 'vsmodal'; d.className = 'vs-modal'; document.body.appendChild(d); } state = 'menu'; msg = ''; draw(); }
  function close() { const m = $('#vsmodal'); if (m) m.remove(); hangup(); state = 'closed'; }
  function hangup() { try { if (conn) conn.close(); } catch (e) { } try { if (peer) peer.destroy(); } catch (e) { } conn = null; peer = null; theirs = null; pending = []; mine.ready = false; }
  function teamOptions(lid, sel) { return (WORLD[lid] || []).slice().sort((a, b) => a.short.localeCompare(b.short)).map(t => `<option value="${esc(t.id)}" ${t.id === sel ? 'selected' : ''}>${esc(t.short)}</option>`).join(''); }
  function draw() {
    const m = $('#vsmodal'); if (!m) return; let h = '';
    if (state === 'menu') h = `<h3>Sfida un amico</h3><p class="muted small">Due persone, due browser, una partita dal vivo. Serve internet. Una crea la stanza e passa il codice, l'altra lo inserisce.</p><div class="row" style="gap:10px;margin-top:12px"><button class="btn primary big" id="vs-host">Crea stanza</button></div><div class="row" style="gap:8px;margin-top:14px"><input id="vs-code" class="vs-in" placeholder="Codice stanza" maxlength="8" autocapitalize="characters"><button class="btn big" id="vs-join">Entra</button></div>`;
    else if (state === 'wait') h = `<h3>Stanza creata</h3><p class="muted small">Passa questo codice al tuo amico:</p><div class="vs-code">${esc(code)}</div><p class="muted small">In attesa che si colleghi…</p>`;
    else if (state === 'connecting') h = `<h3>Connessione…</h3><p class="muted small">Mi collego alla stanza ${esc(code)}.</p>`;
    else if (state === 'lobby') {
      const lg = leagues(); if (!mine.lid) mine.lid = lg[0]; if (!mine.id) mine.id = (WORLD[mine.lid][0] || {}).id;
      const th = theirs && theirs.id ? teamById(theirs.id) : null;
      h = `<h3>${role === 'host' ? 'Tu sei la squadra di casa' : 'Sei la squadra ospite'}</h3>
      <div class="vs-grid"><label>Campionato<select id="vs-lg">${lg.map(l => `<option value="${l}" ${l === mine.lid ? 'selected' : ''}>${esc(LEAGUES[l].name)}</option>`).join('')}</select></label>
      <label>La tua squadra<select id="vs-team">${teamOptions(mine.lid, mine.id)}</select></label>
      <label>Tattica<select id="vs-tac">${TACS.map(([k, l]) => `<option value="${k}" ${k === mine.tac ? 'selected' : ''}>${l}</option>`).join('')}</select></label></div>
      <p class="small" style="margin:10px 0">Avversario: <b>${theirs && theirs.ready && th ? esc(th.short) + ' · ' + esc((TACS.find(x => x[0] === theirs.tac) || [0, ''])[1]) : 'sta scegliendo…'}</b></p>
      <div class="row" style="gap:10px"><button class="btn ${mine.ready ? '' : 'primary'}" id="vs-ready">${mine.ready ? 'Pronto ✓ (modifica)' : 'Sono pronto'}</button>${role === 'host' ? `<button class="btn primary" id="vs-start" ${mine.ready && theirs && theirs.ready ? '' : 'disabled'}>Inizia partita</button>` : '<span class="muted small">Parte quando l\'host avvia.</span>'}</div>`;
    } else if (state === 'error') h = `<h3>Qualcosa non va</h3><p class="small">${esc(msg)}</p>`;
    m.innerHTML = `<div class="vs-card card">${h}<div class="row" style="margin-top:14px"><button class="btn" id="vs-close">${state === 'lobby' || state === 'wait' || state === 'connecting' ? 'Annulla' : 'Chiudi'}</button></div></div>`;
    bind();
  }
  function bind() {
    const g = id => document.getElementById(id), on = (id, fn) => { const e = g(id); if (e) e.onclick = fn; };
    on('vs-close', close); on('vs-host', startHost); on('vs-join', () => startJoin((g('vs-code').value || '').trim().toUpperCase()));
    const lg = g('vs-lg'); if (lg) lg.onchange = () => { mine.lid = lg.value; mine.id = (WORLD[mine.lid][0] || {}).id; mine.ready = false; sendPick(); draw(); };
    const tm = g('vs-team'); if (tm) tm.onchange = () => { mine.id = tm.value; mine.ready = false; sendPick(); draw(); };
    const tc = g('vs-tac'); if (tc) tc.onchange = () => { mine.tac = tc.value; mine.ready = false; sendPick(); };
    on('vs-ready', () => { mine.ready = !mine.ready; sendPick(); draw(); });
    on('vs-start', hostStart);
  }
  const sendPick = () => send({ t: 'pick', pick: { id: mine.id, tac: mine.tac, ready: mine.ready } });
  const fail = t => { state = 'error'; msg = t; draw(); };

  /* ---------- connessione ---------- */
  function loadPeer(ok) { if (window.Peer) return ok(); const s = document.createElement('script'); s.src = PEER_SRC; s.onload = ok; s.onerror = () => fail('Non riesco a caricare il servizio di connessione. Controlla internet e riprova.'); document.head.appendChild(s); }
  const newCode = () => { const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let c = ''; for (let i = 0; i < 5; i++) c += A[Math.floor(Math.random() * A.length)]; return c; };
  function startHost() {
    role = 'host'; code = newCode(); state = 'wait'; draw();
    loadPeer(() => {
      peer = new Peer('volleymgr-' + code);
      peer.on('error', e => fail('Errore di connessione: ' + (e && e.type || e)));
      peer.on('connection', c => { if (conn) { c.close(); return; } setConn(c); c.on('open', () => { state = 'lobby'; mine.ready = false; draw(); sendPick(); }); });
    });
  }
  function startJoin(c) {
    if (!c) return; role = 'guest'; code = c; state = 'connecting'; draw();
    loadPeer(() => {
      peer = new Peer();
      peer.on('error', e => fail(e && e.type === 'peer-unavailable' ? 'Stanza non trovata: controlla il codice.' : 'Errore di connessione: ' + (e && e.type || e)));
      peer.on('open', () => { const cn = peer.connect('volleymgr-' + code, { reliable: true }); setConn(cn); cn.on('open', () => { state = 'lobby'; mine.ready = false; draw(); sendPick(); }); });
    });
  }
  function setConn(c) {
    conn = c;
    c.on('data', onData);
    c.on('close', () => { const M = UI.match; if (M && M.pvp && !M.done) { toast('L\'avversario si e\' disconnesso'); pvpFinish(M, true); } else if (state === 'lobby') fail('L\'avversario ha lasciato la stanza.'); });
  }
  function onData(d) {
    if (!d || !d.t) return; const M = UI.match;
    if (d.t === 'pick') { theirs = d.pick; if (state === 'lobby') draw(); }
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
    const th = teamById(mine.id), ta = teamById(theirs.id); if (!th || !ta) { fail('Squadra non trovata.'); return; }
    if (th === ta) { toast('Scegliete due squadre diverse'); return; }
    const lu = { h: autoLineup(th), a: autoLineup(ta) }, tac = { h: mine.tac, a: theirs.tac };
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
