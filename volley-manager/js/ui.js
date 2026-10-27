/* Stato di gioco e schermate principali */
const SAVE_KEY="volley-manager-italia-v3";

let G=null;

const UI={tab:"home",lg:"A1",rd:null,sel:null,confirm:false,match:null,lgTab:"table",mktTab:"buy",mktLid:"Tutte",mktRole:"Tutti",mktSearch:"",scoutLid:"A1",scoutTeam:null,scoutRole:"Tutti",scoutQuery:"",compareA:"",compareB:""};

const esc=s=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));

const $=s=>document.querySelector(s);

const myTeam=()=>WORLD[G.lid][G.teamIdx];

const ovrColor=v=>v>=85?"#d6336c":v>=75?"#d98a1f":v>=65?"#2f9e8f":v>=55?"#4f86c6":"#7a869a";

const ovrChip=v=>`<span class="ovr" style="background:${ovrColor(v)}">${Math.round(v)}</span>`;

const formatEur=v=>"€ "+Number(v).toLocaleString("it-IT");

function worldSnap(){ const w={}; for(const k of Object.keys(WORLD)){ if(Array.isArray(WORLD[k])) w[k]=WORLD[k]; } return w; }
function worldRestore(w){ if(!w)return; const fresh={}; for(const k of Object.keys(WORLD))if(Array.isArray(WORLD[k]))for(const t of WORLD[k])for(const p of t.players)fresh[p.id]=p; for(const k of Object.keys(w)) WORLD[k]=w[k]; /* migrazione: porta nei salvataggi vecchi età reali e stato "verificata" dei dati aggiornati */ for(const k of Object.keys(w))if(Array.isArray(w[k]))for(const t of w[k])for(const p of t.players){const f=fresh[p.id];if(f&&f.name===p.name&&!p.gen&&(f.year!==p.year||f.rosterStatus!==p.rosterStatus)){const seasons=Math.max(0,(p.age||0)-(SEASON_YEAR-(p.year||SEASON_YEAR-24)));p.year=f.year;p.est=f.est;p.age=SEASON_YEAR-f.year+seasons;p.rosterStatus=f.rosterStatus;try{p.val=calcETV(p);}catch(e){}}if(f&&f.name===p.name&&f._adjD!=null&&p._adjD==null&&typeof applyOvrAdj==="function")applyOvrAdj(p,f._adjD);} for(const k of Object.keys(WORLD)){ if(Array.isArray(WORLD[k])&&!w[k]&&/^A3_(PROM|RETR)$/.test(k)) delete WORLD[k]; } for(const k of Object.keys(PLAYER_INDEX))delete PLAYER_INDEX[k]; for(const lid of Object.keys(WORLD))if(Array.isArray(WORLD[lid]))for(const t of WORLD[lid])for(const p of t.players)PLAYER_INDEX[p.id]=p; if(typeof syncClubLeague==="function")for(const lid of Object.keys(WORLD))if(Array.isArray(WORLD[lid]))WORLD[lid].forEach((t,i)=>{try{syncClubLeague(t,lid,i)}catch(e){}}); }
function persist(){ if(!G)return; G.t=Date.now(); try{localStorage.setItem(SAVE_KEY,JSON.stringify(G));localStorage.setItem(SAVE_KEY+"-w",JSON.stringify(worldSnap()));}catch(e){} }
function exportSave(){ return JSON.stringify({app:"volley-manager-italia",ver:2,G,W:worldSnap()}); }
function importSave(txt){ let o; try{o=JSON.parse(txt);}catch(e){return "File non valido: il testo non è JSON."} if(!o||o.app!=="volley-manager-italia"||!o.G||!o.W)return "Questo non sembra un salvataggio di Volley Manager."; worldRestore(o.W); if(!validSave(o.G))return "Salvataggio incompatibile o danneggiato."; G=o.G; UI.lg=G.lid;UI.tab="home";UI.sel=null; persist(); render(); return ""; }

function loadLocal(){try{const s=localStorage.getItem(SAVE_KEY);return s?JSON.parse(s):null;}catch(e){return null;}}

function validSave(s){return s&&s.v===2&&WORLD[s.lid]&&WORLD[s.lid][s.teamIdx]&&s.results&&typeof s.round==="number";}

function toast(msg){ const el=document.createElement("div");el.className="toast";el.textContent=msg;el.setAttribute("role","status"); document.body.appendChild(el);setTimeout(()=>el.remove(),3200); }

function initBudget(lid,tier){ if(lid==="A1")return Math.round(tier*750000); if(lid==="A2")return Math.round(tier*110000); return Math.round(tier*75000); }

function newGame(lid,idx){ const t=WORLD[lid][idx]; G={ v:2,t:0,lid,teamIdx:idx,round:0,season:1,phase:1,travelPlan:{mode:"bus",hotel:"smart"},travelLog:[], budget:initBudget(lid,t.tier), freeAgents:FREE_AGENTS.slice(), results:{A1:[],A2:[],A3A:[],A3B:[]}, careerHistory:[], event:null,cupA2:null,cupA1:null,playoffsA1:null,playoffsA2:null, board:{confidence:60,goal:"salvezza"}, seasonAwards:[], careerStats:{players:{}}, lineup:autoLineup(t),tactic:"bal" }; ensureContracts(t,lid); UI.tab="home";UI.lg=lid;UI.rd=null;UI.sel=null; persist();render(); }

function render(){ const app=$("#app"); if(UI.match)return; if(!G){app.innerHTML=startHTML();return;} const t=myTeam(),total=SCHEDULE[G.lid]?SCHEDULE[G.lid].length:0; const head=`<div class="top"><div class="brand">${crest(t)}<div style="min-width:0"><b>${esc(t.short)}</b><span class="muted small">${LEAGUES[G.lid]?LEAGUES[G.lid].name:G.lid} · <b style="color:var(--good)">${formatEur(G.budget)}</b></span></div></div><span class="pill acc">2026/27</span></div><div class="season-strip"><div><span>Stagione</span><b>${G.season||1}ª stag.</b></div><div><span>Giornata</span><b>${Math.min((G.round||0)+1,total||1)} / ${total||"—"}</b></div><div><span>Club</span><b>${esc(t.city||t.short)}</b></div></div>`; let body=""; if(UI.tab==="home")body=homeHTML(); else if(UI.tab==="squad")body=squadHTML(); else if(UI.tab==="lineup")body=lineupHTML(); else if(UI.tab==="market")body=marketHTML(); else if(UI.tab==="scouting")body=scoutingHTML(); else if(UI.tab==="travel")body=travelHTML(); else body=leagueHTML(); const nav=[["home",ICON.home,"Home"],["squad",ICON.squad,"Rosa"],["lineup",ICON.lineup,"Modulo"],["scouting",ICON.scouting,"Scouting"],["travel",ICON.travel,"Viaggi"],["market",ICON.market,"Mercato"],["league",ICON.league,"Campionato"]].map(([k,i,l])=>`<button data-act="tab" data-v="${k}" aria-current="${UI.tab===k}"><span class="nav-icon" aria-hidden="true">${i}</span><span>${l}</span></button>`).join(""); app.style.setProperty("--team",Gx.kit(t).main); app.innerHTML=head+body+`<nav class="nav" aria-label="Sezioni">${nav}</nav>`; if(typeof alertsRender==="function")alertsRender(); }

function startHTML(){ const block=lid=>{ const teams=WORLD[lid].slice().sort((a,b)=>teamStrength(b,autoLineup(b))-teamStrength(a,autoLineup(a))); return `<section style="margin-top:22px"><div class="row" style="justify-content:space-between;margin-bottom:10px"><h2>${LEAGUES[lid].name}</h2><span class="muted small">${teams.length} squadre · ${LEAGUES[lid].rounds} giornate</span></div> <div class="pick">${teams.map(t=>`<button data-act="start" data-lid="${lid}" data-i="${t.idx}">${crest(t)}<span style="min-width:0;flex:1"><b>${esc(t.short)}</b><span class="muted small" style="display:block">${esc(t.full)}</span><span class="muted small" style="display:block">${esc(t.city)}</span></span><span class="st">${Math.round(teamStrength(t,autoLineup(t)))}</span></button>`).join("")}</div></section>`; }; const saved=loadLocal(); const cont=validSave(saved)?`<div class="card row" style="justify-content:space-between;margin-top:18px"><span>Hai una carriera con <b>${esc(WORLD[saved.lid][saved.teamIdx].short)}</b>.</span><button class="btn primary" data-act="continue">Continua</button></div>`:""; return `<div class="hero" style="margin-top:8px"><span class="pill acc" style="justify-self:start">Pallavolo femminile · 2026/27 · v22</span><h1>Volley Manager Italia</h1> <p class="sub">Guida il tuo club tra regular season, playoff promozione, mercato trasferimenti e gestione dell'organico.</p><p class="muted small">A3 femminile: prima stagione 2026/27, con 16 club reali divisi nei due gironi ufficiali. In A2 la prima classificata è promossa direttamente e le squadre 2ª–9ª disputano playoff a doppia sfida giocabili se alleni una squadra qualificata; la Coppa Italia A2 è giocabile dopo l’andata se ti qualifichi tra le prime quattro; in A1 sono giocabili Coppa Italia (prime otto all’andata) e playoff scudetto (prime otto a fine regular season); i tabelloni avversari sono in parte simulati e la formula è semplificata. Le statistiche individuali storiche sono mostrate dove disponibili per A1/A2 (2024/25–2025/26); gli organici incompleti e le valutazioni senza dati vengono segnalati come simulati o stimati. Fonti: <a href="https://www.federvolley.it/ufficializzate-le-squadre-e-i-gironi-di-a3-femminile" target="_blank" rel="noopener">FIPAV A3</a> · <a href="https://www.legavolleyfemminile.it/centro-statistiche/" target="_blank" rel="noopener">Centro Statistiche LVF</a>.</p></div>${cont} ${block("A1")}${block("A2")}${block("A3A")}${block("A3B")}`; }

function cmpHTML(u,o){ const rows=[["att","Attacco"],["blk","Muro"],["srv","Battuta"],["rec","Ricezione"],["def","Difesa"],["set", "Alzata"]]; return rows.map(([k,l])=>`<div><div class="lab">${l}</div><div class="cmp"><span class="c">${Math.round(u[k])}</span><div class="tr" aria-hidden="true"><i style="width:${(u[k]/(u[k]+o[k])*100).toFixed(1)}%"></i></div><span class="c muted">${Math.round(o[k])}</span></div></div>`).join(""); }

function homeHTMLBase(){ const t=myTeam(),total=SCHEDULE[G.lid]?SCHEDULE[G.lid].length:0; if(G.lid==="A2"&&G.round>=Math.floor(SCHEDULE.A2.length/2))initA2Cup(); if(G.lid==="A1"&&G.round>=Math.floor((SCHEDULE.A1||[]).length/2))initA1Cup(); if(G.lid==="A2"&&G.round>=(SCHEDULE.A2||[]).length)initA2Playoffs(); if(G.lid==="A1"&&G.round>=(SCHEDULE.A1||[]).length)initA1Playoffs(); const ev=G.event,fx=nextFixture(G); const st=standings(G.lid,G.results),pos=st.findIndex(r=>r.idx===G.teamIdx); let next=""; if(ev){ const opp=eventOppTeam(ev); if(opp){const home=ev.home? t:opp,away=ev.home?opp:t; const u=ratingsOf(t,lineupFor(G,t),G.tactic,null,false),o=ratingsOf(opp,autoLineup(opp),"bal",null,false); const tac=[["bal","Equilibrata"],["srv","Battuta forte"],["def","Muro e difesa"]].map(([k,l])=>`<button data-act="tactic" data-v="${k}" aria-pressed="${G.tactic===k}">${l}</button>`).join(""); next=`<div class="card"><div class="row" style="justify-content:space-between"><h3>${esc(ev.stage)} · ${ev.kind==="cup"?"Coppa Italia A2":ev.kind==="cupA1"?"Coppa Italia A1":ev.kind==="playoffA1"?"Playoff scudetto":"Playoff promozione"}</h3><span class="pill acc">${ev.legs===2?`Gara ${ev.leg}/2`:"Gara secca"}</span></div><div class="vs" style="margin:14px 0">${crestBlock(home)}<span class="num" style="font-size:22px;color:var(--muted)">VS</span>${crestBlock(away)}</div><div class="grid" style="gap:8px;margin:6px 0 14px">${cmpHTML(u,o)}</div><div class="muted small" style="margin-bottom:6px">Tattica</div><div class="seg" role="group" aria-label="Tattica">${tac}</div><div class="row" style="margin-top:14px"><button class="btn primary big" data-act="play" style="flex:1">Gioca la gara decisiva</button></div><p class="muted small">La formazione e la tattica scelte valgono anche per questa partita di coppa/playoff.</p></div>`; } } else if(!fx){ const champ=WORLD[G.lid][st[0].idx]; next=`<div class="card"><h3>Fase conclusa</h3><h2 style="margin:6px 0">${esc(t.short)} chiude al ${pos+1}º posto</h2><p class="sub">${esc(champ.short)} vince il girone con ${st[0].pts} punti.</p><div class="row" style="margin-top:12px"><button class="btn primary big" data-act="newseason">Nuova stagione</button></div></div>`; }else if(fx.rest){ next=`<div class="card"><h3>Giornata ${G.round+1}</h3><h2 style="margin:6px 0">Turno di riposo</h2><div class="row" style="margin-top:12px"><button class="btn primary big" data-act="rest">Avanza</button></div></div>`; }else{ const home=WORLD[G.lid][fx.h],away=WORLD[G.lid][fx.a],opp=fx.home?away:home; const u=ratingsOf(t,lineupFor(G,t),G.tactic,null,false),o=ratingsOf(opp,autoLineup(opp),"bal",null,false); const tac=[["bal","Equilibrata"],["srv","Battuta forte"],["def","Muro e difesa"]].map(([k,l])=>`<button data-act="tactic" data-v="${k}" aria-pressed="${G.tactic===k}">${l}</button>`).join(""); next=`<div class="card"><div class="row" style="justify-content:space-between"><h3>Prossima gara · giornata ${G.round+1}</h3><span class="pill ${fx.home?"acc":""}">${fx.home?"In casa":"Trasferta"}</span></div> <div class="vs" style="margin:14px 0">${crestBlock(home)}<span class="num" style="font-size:22px;color:var(--muted)">VS</span>${crestBlock(away)}</div> <div class="grid" style="gap:8px;margin:6px 0 14px">${cmpHTML(u,o)}</div> <div class="muted small" style="margin-bottom:6px">Tattica</div><div class="seg" role="group" aria-label="Tattica">${tac}</div> <div class="row" style="margin-top:14px"><button class="btn primary big" data-act="play" style="flex:1">Gioca la partita</button><button class="btn" data-act="quick">Simula</button></div></div>`; } const from=clamp(pos-2,0,Math.max(0,st.length-5)),sl=st.slice(from,from+5); const mini=`<div class="card"><div class="row" style="justify-content:space-between"><h3>Classifica</h3><button class="btn" data-act="tab" data-v="league" style="min-height:36px;padding:6px 12px">Completa</button></div> <div class="scroll"><table><thead><tr><th>#</th><th class="l">Squadra</th><th>G</th><th>Pt</th></tr></thead><tbody>${sl.map((r,i)=>`<tr class="${r.idx===G.teamIdx?"me":""}"><td>${from+i+1}</td><td class="l">${esc(r.short)}</td><td>${r.pl}</td><td>${r.pts}</td></tr>`).join("")}</tbody></table> </div></div>`; let last=""; for(let r=G.results[G.lid].length-1;r>=0&&!last;r--){ const m=G.results[G.lid][r].find(x=>x.h===G.teamIdx||x.a===G.teamIdx); if(m)last=`<div class="card"><h3>Ultimo match · giornata ${r+1}</h3>${resRow(G.lid,m)}<div class="setline" style="margin-top:8px">${m.sets.map(s=>`<span class="pill">${s[0]}-${s[1]}</span>`).join("")}</div></div>`; } const sb=UI.saveBox==="export"?`<div class="card" style="margin-top:10px"><h3>Esporta carriera</h3><p class="muted small">Copia il testo o scaricalo come file, poi incollalo in "Importa" su un altro dispositivo.</p><textarea id="save-out" readonly rows="5" style="width:100%;font:12px monospace">${esc(exportSave())}</textarea><div class="row" style="margin-top:8px"><button class="btn primary" data-act="copyexp">Copia</button><button class="btn" data-act="dlexp">Scarica file</button><button class="btn" data-act="closebox">Chiudi</button></div></div>`:UI.saveBox==="import"?`<div class="card" style="margin-top:10px"><h3>Importa carriera</h3><p class="muted small">Incolla qui il testo esportato. Sostituisce la carriera attuale.</p><textarea id="save-in" rows="5" style="width:100%;font:12px monospace" placeholder="Incolla il salvataggio"></textarea>${UI.saveErr?`<p class="small" style="color:var(--bad)">${esc(UI.saveErr)}</p>`:""}<div class="row" style="margin-top:8px"><button class="btn primary" data-act="doimport">Importa</button><button class="btn" data-act="closebox">Annulla</button></div></div>`:"";
const reset=`<div class="row" style="margin-top:6px;flex-wrap:wrap"><button class="btn" data-act="expbox">Esporta</button><button class="btn" data-act="impbox">Importa</button></div>${sb}<div class="row" style="margin-top:6px"><button class="btn" data-act="reset">${UI.confirm?"Conferma: cancella carriera":"Nuova carriera"}</button>${UI.confirm?`<button class="btn" data-act="noreset">Annulla</button>`:""}</div>`; const mg=clubManagementHTML(); const hist=G.careerHistory||[]; const career=`<div class="card"><div class="row" style="justify-content:space-between"><h3>Carriera pluriennale</h3><span class="pill acc">Stagione ${G.season||1}</span></div><div class="grid" style="gap:8px;margin:10px 0"><label class="muted small">Obiettivo stagionale<select data-act="goal" style="width:100%;margin-top:4px"><option value="salvezza" ${(G.board?.goal||"salvezza")==="salvezza"?"selected":""}>Salvezza</option><option value="playoff" ${G.board?.goal==="playoff"?"selected":""}>Playoff / alta classifica</option><option value="promozione" ${G.board?.goal==="promozione"?"selected":""}>Promozione</option><option value="titolo" ${G.board?.goal==="titolo"?"selected":""}>Vincere il campionato</option></select></label><div class="muted small">Fiducia della dirigenza</div><div class="bar"><i style="width:${G.board?.confidence||60}%"></i></div><div class="muted small">${G.board?.confidence||60}/100 · cambia in base al risultato rispetto all’obiettivo.</div></div><h3>Albo della carriera</h3>${hist.length?hist.slice(0,5).map(h=>`<div class="feed" style="margin-top:6px"><b>${esc(h.season+"/"+(String(h.season+1).slice(-2)))}</b> · ${esc(h.club)} · ${esc(h.league)} ·${h.rank}º posto, ${h.points} pt${h.notes&&h.notes.length?` · ${esc(h.notes.slice(0,2).join(" "))}`:""}${h.newLeague&&h.newLeague!==h.league?` · ora ${esc(h.newLeague)}`:""}</div>`).join(""):`<p class="muted small">Il riepilogo comparirà al termine della prima stagione.</p>`}</div>`; return `<div class="grid g2">${next}<div class="grid" style="align-content:start">${mg}${career}${mini}${last}</div></div>${reset}${dataIntegrityHTML()}`; }

function homeHTMLmain(){
 const t=myTeam(),st=standings(G.lid,G.results),pos=st.findIndex(r=>r.idx===G.teamIdx),total=SCHEDULE[G.lid]?SCHEDULE[G.lid].length:0,fx=nextFixture(G),played=(G.results[G.lid]||[]).length;
 const recent=(G.results[G.lid]||[]).slice().reverse().find(r=>r.some(m=>m.h===G.teamIdx||m.a===G.teamIdx));
 const myLast=recent?recent.find(m=>m.h===G.teamIdx||m.a===G.teamIdx):null;
 const record=st.find(r=>r.idx===G.teamIdx);
 const nextLabel=G.event?G.event.stage:fx?(fx.rest?'Riposo':`Giornata ${G.round+1}`):'Stagione conclusa';
 const nextOpponent=G.event?((eventOppTeam(G.event)||{}).short||'Coppa / playoff'):fx&&!fx.rest?WORLD[G.lid][fx.home?fx.a:fx.h].short:fx?'Turno di riposo':'Nessuna gara';
 const recentLabel=myLast?`${myLast.hs}-${myLast.as}`:'—';
 const dashboard=`<section class="hero dashboard-hero"><span class="pill acc">Centro operativo · stagione ${G.season||1}</span><h1>${esc(t.short)}</h1><p class="sub">La tua stagione, sotto controllo. Prossima gara, andamento in classifica e gestione del club in un unico posto.</p><div class="row" style="margin-top:8px;gap:8px"><span class="pill">${esc(LEAGUES[G.lid]?.name||G.lid)}</span><span class="pill">${esc(t.city||t.short)}</span><span class="pill">${played}/${total} giornate disputate</span></div></section>
 <section class="dashboard-kpis" aria-label="Riepilogo stagione"><div class="dashboard-kpi"><span>Budget disponibile</span><strong>${formatEur(G.budget)}</strong><small>Liquidità del club</small></div><div class="dashboard-kpi"><span>Posizione</span><strong>${pos>=0?pos+1:'—'}º <span style="font-size:14px;color:var(--muted)">/ ${st.length}</span></strong><small>${record?`${record.pts} punti in classifica`:'Classifica non disponibile'}</small></div><div class="dashboard-kpi"><span>Prossimo impegno</span><strong style="font-size:clamp(17px,2.6vw,23px)">${esc(nextOpponent)}</strong><small>${esc(nextLabel)}</small></div><div class="dashboard-kpi"><span>Ultimo risultato</span><strong>${recentLabel}</strong><small>${myLast?'Ultima gara registrata':'Ancora nessuna partita'}</small></div></section>`;
 return dashboard+homeHTMLBase().replace(/<div class="hero"[^>]*>[\s\S]*?<\/div>/,'');
}

function dataIntegrityHTML(){
 const teamsA1=WORLD.A1.length,teamsA2=WORLD.A2.length,teamsA3=(WORLD.A3A||[]).length+(WORLD.A3B||[]).length;
 const allTeams=[...WORLD.A1,...WORLD.A2,...WORLD.A3A,...WORLD.A3B];
 const generated=allTeams.reduce((n,t)=>n+t.players.filter(p=>p.gen).length,0);
 const pending=allTeams.reduce((n,t)=>n+t.players.filter(p=>!p.gen&&p.rosterStatus!=="verified").length,0);
 const stats=LVF_HISTORICAL_STATS.length;
 return `<div class="card" style="margin-top:14px"><h3>Database, fonti e attendibilità</h3><p class="muted small">Stagione di gioco 2026/27. Gli organici di club sono basati sui dati incorporati e non tutti i profili sono verificati individualmente: ${teamsA1} squadre A1, ${teamsA2} A2 e ${teamsA3} A3. La A3 è al debutto nel 2026/27: non esistono statistiche storiche di Serie A3 delle stagioni precedenti.</p><div class="grid g2" style="margin:10px 0"><div><div class="num">${stats}</div><div class="muted small">righe statistiche storiche caricate</div></div><div><div class="num">${generated}</div><div class="muted small">profili generati per completare le rose</div></div><div><div class="num">${pending}</div><div class="muted small">profili non ancora verificati individualmente</div></div></div><p class="muted small">Le statistiche storiche sono separate dalle abilità del gioco. I valori di attacco, muro, battuta, ricezione, difesa e palleggio sono rating simulativi calibrati, non statistiche ufficiali.</p><div class="row" style="flex-wrap:wrap;gap:8px"><a href="https://www.legavolleyfemminile.it/ammesse-tutte-le-societa-che-hanno-fatto-domanda-discrizione-ai-campionati-di-serie-a/" target="_blank" rel="noopener">Organici ufficiali A1/A2</a><a href="https://www.federvolley.it/ufficializzate-le-squadre-che-parteciperanno-al-campionato" target="_blank" rel="noopener">Organico ufficiale A3</a><a href="https://www.legavolleyfemminile.it/statsrecapa1-antropova-fa-la-storia-trionfando-nelle-classifiche-di-muri-ed-ace-egonu-top-scorer-e-fersino-miglior-ricevitrice/" target="_blank" rel="noopener">Statistiche A1 2025/26</a><a href="https://www.legavolleyfemminile.it/statsrecapa2-perovic-top-scorer-salvatori-regina-dei-muri-babatunde-guida-la-classifica-degli-ace-e-blasi-prima-tra-le-ricevitrici/" target="_blank" rel="noopener">Statistiche A2 2025/26</a><a href="https://www.modenavolley.it/news/modena-volley-al-via-la-stagione-2026-27-della-squadra-femminile-le-parole-di-coach-tamburello-e-sofia-migliorini/" target="_blank" rel="noopener">Rosa Volley Modena 2026/27</a></div></div>`;
}

function crestBlock(t){return `<div style="display:grid;gap:6px;justify-items:center">${crest(t)}<span class="nm">${esc(t.short)}</span><span class="at num">${Math.round(teamStrength(t,lineupFor(G,t)))}</span></div>`;}

function resRow(lid,m){ const h=WORLD[lid][m.h],a=WORLD[lid][m.a],me=lid===G.lid&&(m.h===G.teamIdx||m.a===G.teamIdx); return `<div class="res ${me?"me":""}"><span>${esc(h.short)}</span><span class="sc">${m.hs} - ${m.as}</span><span class="r">${esc(a.short)}</span></div>`; }

function allPlayableLeagues(){return ["A1","A2","A3A","A3B","A3_PROM","A3_RETR"].filter(k=>WORLD[k]&&WORLD[k].length);}

function getScoutingTeam(){const lid=UI.scoutLid;const teams=WORLD[lid]||[];return teams.find(t=>t.id===UI.scoutTeam)||teams[0]||null;}

function rosterStatusLabel(p){
 if(p.gen||p.rosterStatus==="simulated")return '<span class="data-tag sim">Generata</span>';
 if(p.rosterStatus==="verified")return '<span class="data-tag real">Verificata</span>';
 return '<span class="data-tag partial">Da verificare</span>';
}

function scoutingHTML(){
 const lids=allPlayableLeagues();if(!lids.includes(UI.scoutLid))UI.scoutLid=lids[0]||"A1";
 const teams=WORLD[UI.scoutLid]||[];const t=getScoutingTeam();if(!t)return '<div class="card">Nessuna squadra disponibile.</div>';
 UI.scoutTeam=t.id;
 const leagueBtns=lids.map(k=>`<button class="btn ${UI.scoutLid===k?'primary':''}" data-act="scoutleague" data-v="${k}">${esc(LEAGUES[k]?.name||k)}</button>`).join("");
 const clubOptions=teams.map(c=>`<option value="${esc(c.id)}" ${c.id===t.id?'selected':''}>${esc(c.short)}</option>`).join("");
 const roleOptions=[["Tutti","Tutti"],["P","Palleggiatrici"],["S","Schiacciatrici"],["O","Opposti"],["C","Centrali"],["L","Liberi"]].map(([v,l])=>`<option value="${v}" ${UI.scoutRole===v?'selected':''}>${l}</option>`).join("");
 const q=(UI.scoutQuery||"").toLocaleLowerCase("it");
 const players=t.players.filter(p=>(UI.scoutRole==="Tutti"||p.role===UI.scoutRole)&&(!q||p.name.toLocaleLowerCase("it").includes(q))).sort((a,b)=>ROLE_ORDER.indexOf(a.role)-ROLE_ORDER.indexOf(b.role)||b.ovr-a.ovr);
 const statusCounts={verified:t.players.filter(p=>p.rosterStatus==="verified"&&!p.gen).length,partial:t.players.filter(p=>!p.gen&&p.rosterStatus!=="verified").length,sim:t.players.filter(p=>p.gen||p.rosterStatus==="simulated").length};
 const a=t.players.find(p=>p.id===UI.compareA)||t.players[0],b=t.players.find(p=>p.id===UI.compareB)||t.players.find(p=>p.id!==a?.id)||t.players[0];
 const compare=a&&b?`<div class="card" style="margin-top:12px"><h3>Confronto giocatrici</h3><div class="scout-controls"><label>Giocatrice A<select data-act="compareA">${t.players.slice().sort((x,y)=>x.name.localeCompare(y.name,"it")).map(p=>`<option value="${p.id}" ${(UI.compareA||a?.id)===p.id?"selected":""}>${esc(p.name)} ·${p.role}</option>`).join("")}</select></label><label>Giocatrice B<select data-act="compareB">${t.players.slice().sort((x,y)=>x.name.localeCompare(y.name,"it")).map(p=>`<option value="${p.id}" ${(UI.compareB||b?.id)===p.id?"selected":""}>${esc(p.name)} ·${p.role}</option>`).join("")}</select></label></div><div class="grid g2"><div><b>${esc(a.name)}</b><p class="muted small">${a.role} · ${a.age||"Età n/d"} anni · OVR ${a.ovr}</p></div><div><b>${esc(b.name)}</b><p class="muted small">${b.role} · ${b.age||"Età n/d"} anni · OVR ${b.ovr}</p></div></div>${cmpHTML(a,b)}<p class="muted small">Le valutazioni tecniche sono stime di gioco, non statistiche ufficiali.</p></div>`:"";
 return `<div class="hero"><span class="pill acc">Centro scouting · v22</span><h1>Rose e giocatrici</h1><p class="sub">Consulta tutte le squadre della carriera, esplora le rose, confronta due atlete e avvia trattative dirette.</p></div>
 <div class="card"><div class="row" style="justify-content:space-between"><h3>Campionato</h3><span class="muted small">${lids.length} gironi disponibili</span></div><div class="row" style="margin-top:10px;gap:6px;flex-wrap:wrap">${leagueBtns}</div>
 <div class="scout-controls"><label>Squadra<select data-act="scoutteam">${clubOptions}</select></label><label>Ruolo<select data-act="scoutrole">${roleOptions}</select></label><label>Cerca atleta<input data-act="scoutsearch" value="${esc(UI.scoutQuery)}" placeholder="Nome o cognome"></label></div>
 <div class="row" style="align-items:center;gap:8px;margin-bottom:12px">${crest(t)}<div style="flex:1"><h2>${esc(t.full||t.short)}</h2><div class="muted small">${esc(t.city||"")} · ${esc(LEAGUES[UI.scoutLid]?.name||UI.scoutLid)}</div></div><span class="pill">Forza ${Math.round(teamStrength(t,autoLineup(t)))}</span></div>
 <div class="mini-stat"><div><strong>${t.players.length}</strong><span class="muted small">Atlete in rosa</span></div><div><strong>${statusCounts.verified}</strong><span class="muted small">Verificate</span></div><div><strong>${statusCounts.partial}</strong><span class="muted small">Da verificare</span></div><div><strong>${statusCounts.sim}</strong><span class="muted small">Generate</span></div></div>
 <div class="scroll" style="margin-top:12px"><table class="player-table"><thead><tr><th class="l">Atleta</th><th>Età</th><th>Alt.</th><th>OVR</th><th class="l">Azioni / Dati</th></tr></thead><tbody>${players.map(p=>`<tr><td class="l"><button data-act="scoutplayer" data-id="${p.id}">${esc(p.name)}</button><div class="muted small">${({P:"Palleggiatrice",S:"Schiacciatrice",O:"Opposto",C:"Centrale",L:"Libero"})[p.role]||p.role}</div></td><td>${p.age??"—"}${p.est?"~":""}</td><td>${p.height?`${p.height} cm`:"n/d"}</td><td>${ovrChip(p.ovr)}</td><td class="l">${t.id!==myTeam().id?`<button class="btn primary" style="min-height:30px;padding:4px 10px;font-size:12px;margin-right:6px" onclick="openNegotiation('${esc(p.id)}')">Tratta</button>`:""}${rosterStatusLabel(p)}</td></tr>${UI.sel===p.id?`<tr><td colspan="5" style="white-space:normal;text-align:left">${playerDetail(p)}<p class="muted small">Club: ${esc(t.short)} · Provenienza: ${p.gen?"profilo generato":p.rosterStatus==="verified"?"marcato verificato nel database":"verifica individuale non completata"}.</p></td></tr>`:""}`).join("")||`<tr><td colspan="5" class="l">Nessuna giocatrice corrisponde ai filtri.</td></tr>`}</tbody></table></div></div>
 ${compare}
 <div class="card" style="margin-top:12px"><h3>Attendibilità del database</h3><p class="muted small">“Verificata” riflette il flag presente nel database di gioco, non una nuova verifica live in questa schermata. I dati mancanti restano esplicitamente n/d; i rating tecnici sono stime simulativi. Le rose possono includere atlete generate per completare i ruoli.</p><button class="btn" data-act="tab" data-v="league">Apri classifiche e risultati</button></div>`;
}

function squadHTML(){ const t=myTeam(),lu=lineupFor(G,t),start=new Set(Object.values(lu)); let out=""; for(const role of ROLE_ORDER){ const ps=t.players.filter(p=>p.role===role).sort((a,b)=>b.ovr-a.ovr); const label=role==="S"?"Schiacciatrici":role==="C"?"Centrali":role==="P"?"Palleggiatrici":role==="O"?"Opposti":"Libero"; out+=`<div class="card" style="margin-bottom:14px"><h3>${label}</h3>`; for(const p of ps){ const statusPill=p.inj>0 ?`<span class="pill bad">${esc(p.injName)} (${p.inj}t)</span>` :(p.fatigue>50?`<span class="pill warn">Fatica ${p.fatigue}%</span>`:""); const rosterTag=p.gen?`<span class="pill warn">Profilo simulato</span>`:(p.rosterStatus==="verified"?`<span class="pill good">Rosa 2026/27 verificata</span>`:`<span class="pill warn">Tesseramento da verificare</span>`); out+=`<button class="prow" data-act="player" data-id="${esc(p.id)}">${avatar(p,44)} <span class="nm"><b>${esc(p.name)}${start.has(p.id)?" ●":""}</b> <span class="muted small">${p.age} anni · ${rosterTag} · Cartellino: ${formatEur(p.val||calcETV(p))} ${statusPill}</span></span> ${ovrChip(p.ovr)}</button>`; if(UI.sel===p.id)out+=playerDetail(p); } out+=`</div>`; } return `<div class="row" style="justify-content:space-between;margin-bottom:10px"><h2>Rosa</h2><span class="muted small">● titolare · tocca per dettagli</span></div><p class="muted small" style="margin:0 0 12px">Attendibilità: le etichette distinguono profili simulati, rose confrontate con fonti pubbliche e nomi ancora da verificare. Le valutazioni tecniche, il potenziale, il valore di mercato e i contratti sono stime di gioco, non dati ufficiali.</p>${out}`; }

function historicalStatsHTML(p){
 if(!p.history||!p.history.length)return `<p class="muted small" style="margin:10px 0 0">Nessun dato individuale LVF tra le statistiche storiche caricate. La valutazione è una stima di gioco, non un valore ufficiale.</p>`;
 const valueRow=x=>{const bits=[];if(x.points!=null)bits.push(`${x.points} punti`);if(x.blocks!=null)bits.push(`${x.blocks} muri`);if(x.aces!=null)bits.push(`${x.aces} ace`);if(x.receptionPct!=null)bits.push(`${String(x.receptionPct).replace(".",",")}% ricezioni perfette`);if(x.attacks>0&&x.attackPts!=null&&x.attackPct==null)bits.push(`${(x.attackPts/x.attacks*100).toFixed(1).replace(".",",")}% attacco (${x.attackPts}/${x.attacks})`);if(x.recPct!=null)bits.push(`${String(x.recPct).replace(".",",")}% ricezione perfetta (${x.recPerfect}/${x.recTA})`);else if(x.recPerfect>0)bits.push(`${x.recPerfect} ricezioni perfette`);if(x.apps!=null)bits.push(`${x.apps} presenze`);if(x.attackPct!=null)bits.push(`${String(x.attackPct).replace(".",",")}% efficienza/percentuale d'attacco`);return bits.join(" · ");};
 const links=[...new Set(p.history.map(x=>LVF_STATS_SOURCES[`${x.series}-${x.season}`]).filter(Boolean))];
 return `<div style="margin-top:12px"><h3>Statistiche storiche LVF</h3><p class="muted small" style="margin:4px 0 8px">Dati individuali pubblicati dalla Lega, non statistiche simulate. Le valutazioni tecniche del gioco restano stime; le classifiche A2 2025/26 comprendono Regular Season e pool, quelle A1 2025/26 la Regular Season.</p>${p.history.map(x=>`<div class="row" style="justify-content:space-between;border-bottom:1px solid var(--line);padding:7px 0"><span class="muted small">${x.series} ·${x.season}</span><b class="small">${valueRow(x)}</b></div>`).join("")}${links.length?`<p class="muted small" style="margin-top:8px">Fonte: ${links.map((u,i)=>`<a href="${u}" target="_blank" rel="noopener">Lega Volley Femminile ${p.history.filter(x=>LVF_STATS_SOURCES[`${x.series}-${x.season}`]===u)[0].series} ${p.history.filter(x=>LVF_STATS_SOURCES[`${x.series}-${x.season}`]===u)[0].season}</a>`).join(" · ")}</p>`:`<p class="muted small" style="margin-top:8px">Per le stagioni precedenti, consultare il <a href="${LVF_STATS_SOURCES.all}" target="_blank" rel="noopener">Centro Statistiche LVF</a>.</p>`}</div>`;
}

function playerDetailBase(p){
 const cs=(G?.careerStats?.players||{})[p.id]||{apps:0,points:0};
 const rows=[["att","Attacco"],["blk","Muro"],["srv","Battuta"],["rec","Ricezione"],["def","Difesa"],["set", "Alzata"]];
 const fk = typeof faceKey === "function" ? faceKey(p.name) : String(p.name||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g,"_").replace(/^_|_$/g,"");
 const isOtherClub = p.teamId && G && p.teamId !== myTeam().id;
 return `<div style="padding:10px 4px 14px;border-bottom:1px solid var(--line)">
  <div class="row" style="flex-wrap:wrap;gap:6px">
   <span class="pill">Nata nel ${p.est?"~":""}${p.year}</span>
   ${p.gen?`<span class="pill warn">Profilo simulato</span>`:`<span class="pill">Profilo atleta</span>`}
   ${p.pot>p.ovr?`<span class="pill acc">Potenziale ${p.pot}</span>`:""}
   <span class="pill good">Valore ${formatEur(p.val||calcETV(p))}</span>
   <span class="pill ${p.fatigue>60?'warn':'panel2'}">Fatica: ${p.fatigue||0}%</span>
  </div>
  <div class="row" style="margin-top:10px;gap:8px;flex-wrap:wrap">
   <label class="btn" style="cursor:pointer;min-height:34px;padding:5px 10px;font-size:12px">Carica foto da iPad<input type="file" accept="image/*" data-face-upload="${esc(fk)}" hidden></label>
   ${isOtherClub ? `<button class="btn primary" style="min-height:34px;padding:5px 12px;font-size:12px" onclick="openNegotiation('${esc(p.id)}')">Avvia trattativa</button>` : ""}
  </div>
  <div class="attrs">${rows.map(([k,l])=>`<div><span>${l}<b class="num" style="color:var(--ink)">${p[k]}</b></span><div class="bar"><i style="width:${clamp(p[k],0,100)}%"></i></div></div>`).join("")}</div>
  ${p.gen?`<p class="muted small" style="margin:10px 0 0">Giocatrice di fantasia generata per completare l'organico; non è una tesserata reale del club.</p>`:""}
  <div class="mini-stat" style="margin-top:10px"><div><strong>${cs.apps||0}</strong><span class="muted small">Presenze registrate in carriera</span></div><div><strong>${cs.points||0}</strong><span class="muted small">Punti attribuiti nel modello</span></div></div>
  ${historicalStatsHTML(p)}
 </div>`;
}

function playerDetail(p){
 const name=String(p.name||'Atleta');
 const role=(ROLE_NAME&&ROLE_NAME[p.role])||p.role||'Atleta';
 const profile=`<section class="player-profile" aria-label="Profilo atleta"><div class="player-profile-head"><div class="player-avatar" aria-hidden="true">${avatar(p,84)}</div><div style="min-width:0;position:relative;z-index:1"><span class="pill">${esc(role)}</span><h2>${esc(name)}</h2><div class="subline">${p.year?`Classe ${p.est?'circa ':''}${p.year}`:'Anno di nascita non disponibile'} · ${p.gen?'Profilo generato':'Scheda atleta'}</div><div class="row" style="margin-top:10px;gap:8px;align-items:center">${ovrChip(p.ovr)}<span class="pill">Potenziale ${p.pot||p.ovr}</span></div></div></div><div class="player-profile-body"><div class="profile-quick"><div><span>Valutazione</span><strong>${Math.round(p.ovr||0)}<small style="display:inline;color:var(--muted);font:600 12px var(--f-body)"> / 100</small></strong></div><div><span>Valore stimato</span><strong style="font-size:clamp(16px,2.5vw,22px)">${formatEur(p.val||calcETV(p))}</strong></div><div><span>Fatica</span><strong>${Math.round(p.fatigue||0)}%</strong></div></div><div class="profile-rating"><h3>Identità tecnica</h3><p class="muted small" style="margin:0 0 10px">Confronto visivo delle sei abilità principali. I valori sono rating del modello di gioco, non statistiche ufficiali.</p><div class="attrs">${[['att','Attacco'],['blk','Muro'],['srv','Battuta'],['rec','Ricezione'],['def','Difesa'],['set','Alzata']].map(([k,l])=>`<div><span>${l}<b class="num" style="color:var(--ink)">${Math.round(p[k]||0)}</b></span><div class="bar"><i style="width:${clamp(p[k]||0,0,100)}%"></i></div></div>`).join('')}</div></div></div></section>`;
 return profile+`<div class="player-detail-body">${playerDetailBase(p)}</div>`;
}

function lineupHTML(){ const t=myTeam(),lu=lineupFor(G,t); const slots=[["P","Palleggio","P"],["O","Opposto","O"],["S1","Schiacciatrice 1","S"],["S2","Schiacciatrice 2","S"],["C1","Centrale 1","C"],["C2","Centrale 2","C"],["L","Libero","L"]]; const r=ratingsOf(t,lu,G.tactic,null,false); const sel=slots.map(([k,l,role])=>{ const ps=t.players.filter(p=>p.role===role).sort((a,b)=>b.ovr-a.ovr); return `<div class="slot"><label for="sl-${k}" class="muted small" style="font-weight:600">${l}</label><select id="sl-${k}" data-act="slot" data-k="${k}">${ps.map(p=>`<option value="${esc(p.id)}"${lu[k]===p.id?" selected":""}${p.inj>0?" disabled":""}>${esc(p.name)} ·${p.ovr}${p.inj>0?" (INF)":""}${p.fatigue>60?" [FAT]":""}</option>`).join("")}</select></div>`; }).join(""); return `<div class="row" style="justify-content:space-between;margin-bottom:10px"><h2>Formazione</h2><button class="btn" data-act="autolineup">Automatica</button></div> <div class="grid g2"><div class="card">${sel}</div> <div class="card"><h3>Livello Squadra</h3><div class="attrs" style="grid-template-columns:repeat(2,1fr)">${[["att","Attacco"],["blk","Muro"],["srv","Battuta"], ["rec","Ricezione"],["def","Difesa"],["set","Alzata"]].map(([k,l])=>`<div><span>${l}<b class="num" style="color:var(--ink)">${Math.round(r[k])}</b></span><div class="bar"><i style="width:${clamp(r[k],0,100)}%"></i></div></div>`).join("")}</div></div></div>`; }

function marketHTML(){
  const t = myTeam();
  ensureContracts(t, G.lid);
  const tabs = [
    ["buy", "Svincolate"],
    ["clubs", "Trattative Club"],
    ["sell", "Cessioni"],
    ["offers", "Offerte" + (typeof offersCount === "function" && offersCount() ? " (" + offersCount() + ")" : "")],
    ["contracts", "Contratti"]
  ].map(([k, l]) => `<button data-act="mkttab" data-v="${k}" aria-pressed="${UI.mktTab === k}">${l}</button>`).join("");

  let body = "";

  if (UI.mktTab === "buy") {
    const list = G.freeAgents || [];
    body = `<div class="card">
      <div class="row" style="justify-content:space-between;margin-bottom:10px">
        <h3>Svincolate disponibili (${list.length})</h3>
        <span class="muted small">Contratto annuale</span>
      </div>
      <p class="sub">Prima di ingaggiare valuta sia il costo del cartellino sia lo stipendio per giornata. L'accordo iniziale dura 1 stagione (rinnovabile).</p>
      ${list.length === 0 ? `<div class="empty">Nessuna atleta svincolata al momento.</div>` : list.map(p => {
        const cost = p.val || calcETV(p), wage = p.wage || salaryFor(p, G.lid);
        const canAfford = G.budget >= cost + wage * 2;
        return `<div class="prow">${avatar(p, 44)}
          <span class="nm"><b>${esc(p.name)}</b>
          <span class="muted small">${p.role} · ${p.age} anni · ${ovrChip(p.ovr)} · Cartellino ${formatEur(cost)} · Ingaggio ${formatEur(wage)}/g</span></span>
          <button class="btn primary" style="min-height:36px;padding:6px 12px;font-size:13px" data-act="buyplayer" data-id="${esc(p.id)}" ${canAfford ? "" : "disabled"}>Ingaggia</button>
        </div>`;
      }).join("")}
    </div>`;
  } else if (UI.mktTab === "clubs") {
    const allClubsPlayers = [];
    const activeLids = allPlayableLeagues();
    for (const lid of activeLids) {
      if (!WORLD[lid]) continue;
      WORLD[lid].forEach(team => {
        if (team.id === t.id) return;
        team.players.forEach(p => allClubsPlayers.push({ p, team, lid }));
      });
    }
    const lidFilter = UI.mktLid || "Tutte";
    const roleFilter = UI.mktRole || "Tutti";
    const q = (UI.mktSearch || "").toLocaleLowerCase("it").trim();
    const filtered = allClubsPlayers.filter(x =>
      (lidFilter === "Tutte" || x.lid === lidFilter) &&
      (roleFilter === "Tutti" || x.p.role === roleFilter) &&
      (!q || x.p.name.toLocaleLowerCase("it").includes(q) || x.team.short.toLocaleLowerCase("it").includes(q))
    ).sort((a, b) => b.p.ovr - a.p.ovr);

    const lidOpts = [["Tutte", "Tutte le serie"], ...activeLids.map(k => [k, LEAGUES[k]?.name || k])].map(([v, l]) => `<option value="${v}" ${lidFilter === v ? "selected" : ""}>${esc(l)}</option>`).join("");
    const roleOpts = [["Tutti", "Tutti i ruoli"], ["P", "Palleggiatrici (P)"], ["O", "Opposti (O)"], ["S", "Schiacciatrici (S)"], ["C", "Centrali (C)"], ["L", "Liberi (L)"]].map(([v, l]) => `<option value="${v}" ${roleFilter === v ? "selected" : ""}>${l}</option>`).join("");

    body = `<div class="card">
      <div class="row" style="justify-content:space-between;margin-bottom:10px">
        <h3>Giocatrici sotto contratto (${filtered.length})</h3>
        <span class="pill good">Tavolo delle Trattative</span>
      </div>
      <p class="sub">Avvia una trattativa per strappare un'atleta a un altro club anche a stagione in corso. Dovrai trovare l'accordo economico sia con la società sia con la giocatrice per un contratto annuale.</p>
      <div class="scout-controls" style="margin:10px 0 14px">
        <label>Serie<select data-act="mktlid">${lidOpts}</select></label>
        <label>Ruolo<select data-act="mktrole">${roleOpts}</select></label>
        <label>Cerca atleta o club<input type="text" data-act="mktsearch" placeholder="Es. Egonu, Malik, Chieri..." value="${esc(UI.mktSearch || "")}" /></label>
      </div>
      <div class="scroll" style="max-height:560px">
        ${filtered.slice(0, 45).map(({ p, team }) => {
          const estVal = p.val || calcETV(p);
          const estWage = salaryFor(p, G.lid);
          return `<div class="prow">${avatar(p, 44)}
            <span class="nm"><b>${esc(p.name)}</b> <span class="pill" style="font-size:11px">${esc(team.short)}</span>
            <span class="muted small">${p.role} · ${p.age} anni · ${ovrChip(p.ovr)} · Val. stimato ${formatEur(estVal)} · Stip. base ${formatEur(estWage)}/g</span></span>
            <button class="btn primary" style="min-height:36px;padding:6px 12px;font-size:13px" onclick="openNegotiation('${esc(p.id)}')">Tratta</button>
          </div>`;
        }).join("") || `<div class="empty">Nessuna atleta trovata con questi filtri.</div>`}
      </div>
    </div>`;
  } else if (UI.mktTab === "offers") {
    body = offersHTML();
  } else if (UI.mktTab === "sell") {
    const lu = lineupFor(G, t), start = new Set(Object.values(lu));
    body = `<div class="card">
      <h3>Lista trasferimenti</h3>
      <p class="sub">La cessione genera un incasso immediato pari all'85% del valore stimato e libera lo stipendio dalla prossima giornata.</p>
      ${t.players.map(p => {
        const val = p.val || calcETV(p), isStarter = start.has(p.id), same = t.players.filter(x => x.role === p.role).length, canSell = !isStarter && same > 1;
        return `<div class="prow">${avatar(p, 44)}
          <span class="nm"><b>${esc(p.name)}${isStarter ? " ●" : ""}</b><span class="muted small">${p.role} · Valore ${formatEur(val)} · Ingaggio ${formatEur(p.wage || salaryFor(p, G.lid))}/giornata</span></span>
          <button class="btn" style="min-height:36px;padding:6px 12px;font-size:13px;color:var(--bad)" data-act="sellplayer" data-id="${esc(p.id)}" ${canSell ? "" : "disabled"}>Cedi</button>
        </div>`;
      }).join("")}
      <p class="muted small">Le titolari e le giocatrici senza sostitute nello stesso ruolo non possono essere cedute.</p>
    </div>`;
  } else {
    body = `<div class="card">
      <div class="row" style="justify-content:space-between">
        <h3>Situazione contratti (Annuali)</h3>
        <span class="pill">Monte ingaggi: ${formatEur(payrollFor(t))}/giornata</span>
      </div>
      <p class="sub">I contratti hanno durata annuale. Rinnova durante la stagione le giocatrici che vuoi blindare per l'anno prossimo (+10% di adeguamento e bonus firma).</p>
      ${t.players.slice().sort((a, b) => (a.contractStatus === "renewed" ? 1 : 0) - (b.contractStatus === "renewed" ? 1 : 0) || b.ovr - a.ovr).map(p => {
        const isRenewed = p.contractStatus === "renewed";
        const w = p.wage || salaryFor(p, G.lid), newW = Math.round(w * 1.10), renewFee = newW * 2;
        return `<div class="prow">${avatar(p, 44)}
          <span class="nm"><b>${esc(p.name)}</b>
          <span class="muted small">${isRenewed ? `<span class="pill good" style="font-size:10px">Rinnovata per la prossima stagione</span>` : `<span class="pill warn" style="font-size:10px">Scadenza a fine stagione</span>`} · ${formatEur(w)}/giornata</span></span>${isRenewed ? `<span class="muted small">Confermata</span>` : `<button class="btn primary" style="min-height:34px;padding:5px 10px;font-size:12px" data-act="renew" data-id="${esc(p.id)}">Rinnova · ${formatEur(renewFee)}</button>`}
        </div>`;
      }).join("")}
    </div>`;
  }

  return `<div class="row" style="justify-content:space-between;margin-bottom:10px">
    <h2>Volleymercato</h2>
    <span class="pill good" style="font-size:15px">Budget: <b>${formatEur(G.budget)}</b></span>
  </div>
  <div class="grid g2" style="margin-bottom:12px">
    <div class="card"><span class="muted small">Monte ingaggi / giornata</span><h2>${formatEur(payrollFor(t))}</h2></div>
    <div class="card"><span class="muted small">Valore stimato della rosa</span><h2>${formatEur(t.players.reduce((n, p) => n + (p.val || calcETV(p)), 0))}</h2></div>
  </div>
  <div class="tabs">${tabs}</div>${body}`;
}

function leagueHTML(){ const lid=UI.lg,teams=WORLD[lid]||[]; const validLids=["A1","A2","A3A","A3B","A3_PROM","A3_RETR"].filter(k=>WORLD[k]&&WORLD[k ].length>0); const lgBtns=validLids.map(k=>`<button data-act="lg" data-v="${k}" aria-pressed="${UI.lg===k}">${LEAGUES[k]?LEAGUES[k].name:k}</button>`).join(""); const modeBtns=[["table","Classifica"],["res","Risultati"]].map(([k,l])=>`<button data-act="lgtab" data-v="${k}" aria-pressed="${UI.lgTab===k}">${l}</button>`).join(""); let body=""; if(UI.lgTab==="table"){ const st=standings(lid,G.results),n=st.length; body=`<div class="card scroll"><table><thead><tr><th>#</th><th class="l">Squadra</th><th>G</th><th>V</th><th>P</th><th>Set</th><th>Pt</th></tr></thead><tbody>${st.map((r,i)=>{ let z=""; if(lid==="A2"){if(i===0)z="zone-up";else if(i>=n-4)z="zone-down";} else if(lid==="A3A"||lid==="A3B"){if(i<4)z="zone-up";else z="zone-down";} else if(lid==="A3_PROM"){if(i<4)z="zone-up";} else if(lid==="A3_RETR"){if(i>=4)z="zone-down";} return `<tr class="${r.idx===G.teamIdx&&lid===G.lid?"me":""} ${z}"><td>${i+1}</td><td class="l"><span class="team-cell"><span class="dot" style="background:${teams[r.idx]?teams[r.idx].color:'#ccc'}"></span>${esc(r.short)}</span></td><td>${r.pl}</td><td>${r.w}</td><td>${r.l}</td><td>${r.sw}-${r.sl}</td><td><b>${r.pts}</b></td></tr>`;}).join("")}</tbody></table> <p class="muted small" style="margin:10px 2px 0">${lid.startsWith("A3")?"Verde: Accesso a Pool Promozione o Salita in A2. Rosso: Pool Retrocessione o Discesa in B1.":"3 pt (3-0, 3-1), 2 pt (3-2 vinto), 1 pt (3-2 perso)."}</p></div>`; }else{ const played=(G.results[lid]||[]).length,total=SCHEDULE[lid]?SCHEDULE[lid].length:0; if(UI.rd===null||UI.rd>=total)UI.rd=Math.max(0,Math.min(played-1,total-1)); const rd=UI.rd; const rows=played>rd?G.results[lid][rd]:(SCHEDULE[lid]&&SCHEDULE[lid][rd]?SCHEDULE[lid][rd ].map(([h,a])=>({h,a,hs:null})):[]); body=`<div class="card"><div class="row" style="justify-content:space-between;margin-bottom:8px"><button class="btn" data-act="rd" data-v="-1" ${rd<=0?"disabled":""}>‹</button><b class="num" style="font-size:20px">Giornata ${rd+1} / ${total}</b><button class="btn" data-act="rd" data-v="1" ${rd>=total-1?"disabled":""}>›</button></div> ${rows.map(m=>m.hs===null?`<div class="res"><span>${esc(teams[m.h].short)}</span><span class="sc muted">–</span><span class="r">${esc(teams[m.a].short)}</span></div>`:resRow(lid,m)).join("")}</div>`; } return `<div class="row" style="justify-content:space-between;margin-bottom:10px"><h2>Campionato</h2></div><div class="tabs">${lgBtns}</div><div class="tabs">${modeBtns}</div>${body}`; }

function homeHTML(){ return alertCardsHTML()+homeHTMLmain()+identityHTML()+saveCardHTML(); }

/* Gestione filtri e ricerca nel tab Trattative Club senza perdere il focus su iPad */
document.addEventListener("input", e => {
  const el = e.target;
  if (el && el.dataset && el.dataset.act === "mktsearch" && G) {
    UI.mktSearch = el.value;
    const pos = el.selectionStart;
    render();
    const q = document.querySelector('[data-act="mktsearch"]');
    if (q) { q.focus(); try { q.setSelectionRange(pos, pos); } catch (err) {} }
  }
});

document.addEventListener("change", e => {
  const el = e.target;
  if (!el || !el.dataset || !G) return;
  if (el.dataset.act === "mktlid") { UI.mktLid = el.value; render(); }
  if (el.dataset.act === "mktrole") { UI.mktRole = el.value; render(); }
});
