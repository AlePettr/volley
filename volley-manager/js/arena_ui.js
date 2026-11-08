/* Interfaccia B "Arena": stile notturno + home con scheda partita, statistiche e scorciatoie. Il tasto Stile (in alto a destra) alterna A/B. */
(function () {
  const KEY = "vm_skin";
  const on = () => { try { return localStorage.getItem(KEY) === "2" || /[?&]ui=2/.test(location.search); } catch (e) { return /[?&]ui=2/.test(location.search); } };
  const apply = () => document.documentElement.classList.toggle("ui2", on());
  apply();
  function form() {
    const out = [], res = (G.results[G.lid] || []);
    for (let i = res.length - 1; i >= 0 && out.length < 5; i--) { const m = res[i].find(x => x.h === G.teamIdx || x.a === G.teamIdx); if (m) out.unshift((m.h === G.teamIdx ? m.hs > m.as : m.as > m.hs) ? "w" : "l"); }
    return out;
  }
  function top() {
    const t = myTeam(), fx = nextFixture(G), ev = G.event, st = standings(G.lid, G.results), pos = st.findIndex(r => r.idx === G.teamIdx), total = SCHEDULE[G.lid] ? SCHEDULE[G.lid].length : 0;
    let opp = null, home = true, label = "Prossima gara", cta = "";
    if (ev) { opp = eventOppTeam(ev); home = !!ev.home; label = ev.stage; cta = `<button class="btn primary" data-act="play">Gioca</button><button class="btn" data-act="quick">Simula</button>`; }
    else if (fx && fx.rest) { label = "Turno di riposo"; cta = `<button class="btn primary" data-act="rest">Avanza</button>`; }
    else if (fx) { opp = WORLD[G.lid][fx.home ? fx.a : fx.h]; home = !!fx.home; label = `Giornata ${(G.round || 0) + 1}/${total}`; cta = `<button class="btn primary" data-act="play">Gioca la partita</button><button class="btn" data-act="quick">Simula</button>`; }
    else label = "Stagione conclusa";
    const ovr = x => { try { return Math.round(teamStrength(x, lineupFor(G, x))); } catch (e) { return ""; } };
    const side = (x, me) => x ? `<div class="ar-side">${crest(x)}<b>${esc(x.short)}</b><i>FORZA ${ovr(x)}</i></div>` : `<div class="ar-side"><b style="opacity:.5">—</b></div>`;
    const f = form(), ic = k => ICON[k] || "";
    const tiles = [["squad", "Rosa"], ["lineup", "Modulo"], ["market", "Mercato"], ["scouting", "Scouting"], ["travel", "Viaggi"], ["league", "Classifica"]].map(([k, l]) => `<button class="ar-tile" data-act="tab" data-v="${k}"><span style="display:grid">${ic(k)}</span>${l}</button>`).join("");
    return `<section class="ar-match"><div class="ar-tag"><span>${esc(label)}</span><b>${opp ? (home ? "In casa" : "In trasferta") : ""}</b></div>
      <div class="ar-vs${opp ? "" : " solo"}">${side(t, true)}<div class="ar-x">${opp ? "VS" : ""}</div>${side(opp)}</div><div class="ar-cta">${cta}</div></section>
      <div class="ar-stats"><div class="ar-stat"><span>Budget</span><strong>${formatEur(G.budget)}</strong><small>${esc(LEAGUES[G.lid] ? LEAGUES[G.lid].name : G.lid)}</small></div>
      <div class="ar-stat"><span>Posizione</span><strong>${pos >= 0 ? pos + 1 : "—"}º</strong><small>su ${st.length} squadre</small></div>
      <div class="ar-stat"><span>Forma</span><div class="ar-form">${f.length ? f.map(c => `<i class="${c}"></i>`).join("") : "<small>nessuna gara</small>"}</div><small>ultime ${f.length || 5}</small></div>
      <div class="ar-stat"><span>Stagione</span><strong>${G.season || 1}ª</strong><small>2026/27</small></div></div>
      <div class="ar-tiles">${tiles}</div>`;
  }
  const hh = window.homeHTML; window.homeHTML = function () { return on() && G ? top() + hh.apply(this, arguments) : hh.apply(this, arguments); };
  const r = window.render;
  window.render = function () {
    apply(); const o = r.apply(this, arguments);
    try { document.querySelectorAll(".ar-skin").forEach(b => b.remove()); const b = document.createElement("button"); b.className = "btn ar-skin"; b.dataset.act = "skin"; b.textContent = on() ? "Stile: Arena" : "Stile: Classico"; document.body.appendChild(b); } catch (e) { }
    return o;
  };
  document.addEventListener("click", e => {
    const el = e.target.closest("[data-act=skin]"); if (!el) return; e.stopPropagation();
    try { localStorage.setItem(KEY, on() ? "1" : "2"); } catch (err) { }
    apply(); window.render();
  }, true);
})();
