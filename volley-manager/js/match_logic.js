/* Partita: flusso, punteggio e chiusura (la parte grafica e in gfx/match.js) */
const BASE=[[2.4,7.6],[2.6,4.5],[2.4,1.4],[7.0,1.4],[7.0,4.5],[7.0,7.6]];
const NETX=10.5;
const slotXY=(side,i)=>{const [bx,by]=BASE[i];return side==="h"?[1.5+bx,1.5+by]:[19.5-bx,10.5-by];};
const rnd=(a,b)=>a+Math.random()*(b-a);
const lerp=(a,b,f)=>a+(b-a)*f;

function startMatch(){ 
  const event=G.event; 
  const fx=event?{home:event.home,h:event.home?G.teamIdx:WORLD[event.lid].findIndex(t=>t.id===event.opponentId),a:event.home?WORLD[event.lid].findIndex(t=>t.id===event.opponentId):G.teamIdx}:nextFixture(G);
  const home=event?(event.home?myTeam():eventOppTeam(event)):WORLD[G.lid][fx.h];
  const away=event?(event.home?eventOppTeam(event):myTeam()):WORLD[G.lid][fx.a]; 
  const lu={h:{...lineupFor(G,home)},a:{...lineupFor(G,away)}}; 
  const tac={h:fx.home?G.tactic:"bal",a:fx.home?"bal":G.tactic}; 
  const res=simMatch(home,away,lu,tac,Math.random,true); 
  UI.match={
    event:event?JSON.parse(JSON.stringify(event)):null,
    fx,home,away,res,i:0,speed:1,paused:false,done:false,anim:null,sh:0,sa:0,setScores:[],
    userSide:fx.home?"h":"a",
    lu,
    subsUsed: 0,
    tactic: G.tactic || "bal",
    view:{h:courtView(rotOf(lu.h),PLAYER_INDEX[lu.h.L]),a:courtView(rotOf(lu.a),PLAYER_INDEX[lu.a.L])}, 
    cur:null,last:0,raf:0,frame:0,colors:null
  }; 
  renderMatch(); 
}

function posOf(view,side,pid){let i=view[side].findIndex(x=>x.p.id===pid);if(i<0)i=1;return slotXY(side,i);}
function feedText(ry){ const n=p=>p?p.name:""; switch(ry.type){ case"ace":return `Ace di ${n(ry.server)}!`; case"block":return `Muro di ${n(ry.blocker)}.`; case"att":return `${n(ry.atkS)} a segno in contrattacco.`; case"kill":return `Punto in attacco di ${n(ry.atkR)}.`; case"serr":return `Errore in battuta per ${n(ry.server)}.`; default:return `Errore offensivo di ${n(ry.atkR)}.`; } }

function skipMatch(){ const M=UI.match;if(!M||M.done)return; const rs=M.res.rallies; M.setScores=[];M.sh=0;M.sa=0; rs.forEach((ry,j)=>{const nx=rs[j+1];if(!nx||nx.set!==ry.set){M.setScores.push([ry.h,ry.a]);if(ry.h>ry.a)M.sh++;else M.sa++;}}); const last=rs[rs.length-1]; $("#sc-h").textContent=last.h;$("#sc-a").textContent=last.a; $("#sets").textContent=`FINALE · ${M.sh}-${M.sa}`; $("#setline").innerHTML=M.setScores.map((s,i)=>`<span class="pill">Set ${i+1}: ${s[0]}-${s[1]}</span>`).join(""); M.anim=null;M.i=rs.length;finishMatch(); }

function finishMatch(){ const M=UI.match;if(!M||M.done)return; M.done=true; const res=M.res; if(!G.careerStats)G.careerStats={players:{}}; if(!G.careerStats.players)G.careerStats.players={}; Object.entries(res.pts||{}).forEach(([id,v])=>{const cs=G.careerStats.players[id]||(G.careerStats.players[id]={apps:0,points:0});cs.points=(cs.points||0)+v;}); const participants=[...new Map([...(M.view?.h||[]),...(M.view?.a||[])].map(x=>[x.p.id,x.p])).values()]; participants.forEach(p=>{const cs=G.careerStats.players[p.id]||(G.careerStats.players[p.id]={apps:0,points:0});cs.apps=(cs.apps||0)+1;}); const mine=M.fx.home?[res.hs,res.as]:[res.as,res.hs]; const win=mine[0]>mine[1]; const pts=win?(mine[1]<=1?3:2):(mine[0]===2?1:0); const inc=M.event?0:(M.fx.home?(win?8500:4200):(win?2500:800)); G.budget+=inc; const all=Object.entries(res.pts).map(([id,v])=>({p:PLAYER_INDEX[id],v})).sort((x,y)=>y.v-x.v); const topU=all.find(x=>x.p.teamId===myTeam().id),topAll=all[0]; $("#feed").textContent=`Finale: ${M.home.short} ${res.hs}-${res.as} ${M.away.short}.`; $("#sets").textContent=`FINALE · ${res.hs}-${res.as}`; $("#sc-h").textContent=res.sets[res.sets.length-1][0];$("#sc-a").textContent=res.sets[res.sets .length-1][1]; $("#ctl").innerHTML=""; $("#sum").innerHTML=`<div class="card" style="margin-top:6px"><h3>${win?"Vittoria":"Sconfitta"} · ${M.event?(win?"Vittoria nella fase a eliminazione":"Sconfitta nella fase a eliminazione"):pts+" "+(pts===1?"punto":"punti")}</h3> <p class="sub" style="margin:8px 0 0;color:var(--ink)">Migliore in campo: <b>${esc(topAll.p.name)}</b>. ${topU&&topU!==topAll?`Per i tuoi: <b>${esc(topU.p.name)}</b>.`:""}</p> ${M.event?`<p class="muted small">Esito registrato nel tabellone della competizione.</p>`:`<p class="muted small" style="margin-top:4px">Incasso partita accreditato: <b style="color:var(--good)">+${formatEur(inc)}</b></p>`} <div class="row" style="margin-top:14px"><button class="btn primary big" data-act="endmatch">Continua</button></div></div>`; }

function endMatch(){ const M=UI.match;if(!M)return; cancelAnimationFrame(M.raf); if(M.event){const ev=G.event;const userWin=(M.fx.home?M.res.hs>M.res.as:M.res.as>M.res.hs);if(ev.kind==="cupA1"||ev.kind==="playoffA1"){advanceSingleElimination(ev,userWin);}else if(ev.kind==="cup"){G.cupA2.results.push({stage:ev.stage,opponentId:ev.opponentId,won:userWin});if(ev.stage==="Semifinale"&&userWin){const other=WORLD.A2.find(t=>t.id===G.cupA2.otherFinalistId);G.event={kind:"cup",stage:"Finale",lid:"A2",opponentId:other.id,home:false,leg:1,legs:1,queueIndex:1};}else{G.cupA2.done=true;G.cupA2.note=userWin?"Coppa Italia A2 vinta!":"Eliminata dalla Coppa Italia A2.";G.event=null;}}else{prepareNextPlayoffEvent(ev,userWin);} }else{playRound(G,M.res);} persist(); UI.match=null;UI.tab="home"; render();window.scrollTo(0,0); }

/* Finestra modale dei cambi durante la partita */
function openSubModal() {
  const M = UI.match; if (!M || M.done) return;
  M.paused = true;
  const pBtn = $("#pausebtn"); if (pBtn) pBtn.textContent = "Riprendi";
  const team = M.userSide === "h" ? M.home : M.away;
  const currentLu = M.lu[M.userSide];
  const activeIds = new Set(Object.values(currentLu));
  const bench = team.players.filter(p => !activeIds.has(p.id) && !p.inj);
  const slots = [
    ["P", "Palleggiatrice", currentLu.P], ["O", "Opposto", currentLu.O],
    ["S1", "Schiacciatrice 1", currentLu.S1], ["S2", "Schiacciatrice 2", currentLu.S2],
    ["C1", "Centrale 1", currentLu.C1], ["C2", "Centrale 2", currentLu.C2], ["L", "Libero", currentLu.L]
  ];

  const html = `
  <div class="modal-backdrop" id="sub-modal" style="position:fixed;inset:0;background:rgba(5,8,16,0.85);z-index:9999;display:flex;align-items:center;justify-content:center;padding:14px;">
    <div class="card" style="max-width:540px;width:100%;max-height:90vh;overflow-y:auto;">
      <div class="row" style="justify-content:space-between;align-items:center;margin-bottom:12px;">
        <h3>Sostituzioni Live (${6 - (M.subsUsed || 0)} cambi rimasti)</h3>
        <button class="btn" data-act="closesub">Chiudi</button>
      </div>
      <p class="muted small" style="margin-bottom:12px">Sostituisci un'atleta in campo con una in panchina dello stesso ruolo.</p>
      <div class="grid" style="gap:8px">
        ${slots.map(([k, label, pid]) => {
          const cur = PLAYER_INDEX[pid];
          const role = k === "S1" || k === "S2" ? "S" : (k === "C1" || k === "C2" ? "C" : k);
          const avail = bench.filter(b => b.role === role).sort((a,b)=>b.ovr-a.ovr);
          return `
          <div class="row" style="justify-content:space-between;align-items:center;padding:8px;border:1px solid var(--line);border-radius:8px">
            <div>
              <span class="muted small">${label}</span>
              <div><b>${esc(cur.name)}</b> <span class="pill" style="font-size:11px">OVR ${cur.ovr}</span> <span class="muted small">Fat: ${cur.fatigue || 0}%</span></div>
            </div>
            <div>
              ${(M.subsUsed || 0) >= 6 ? `<span class="muted small">Limite raggiunto</span>` : avail.length ? `
                <select data-act="livesub" data-k="${k}" style="padding:6px;font-size:13px;max-width:140px">
                  <option value="">Cambia con...</option>
                  ${avail.map(bp => `<option value="${bp.id}">${esc(bp.name)} (OVR ${bp.ovr} - Fat${bp.fatigue||0}%)</option>`).join("")}
                </select>
              ` : `<span class="muted small">Nessuna riserva</span>`}
            </div>
          </div>`;
        }).join("")}
      </div>
    </div>
  </div>`;
  const existing = document.getElementById("sub-modal"); if (existing) existing.remove();
  document.body.insertAdjacentHTML("beforeend", html);
}

function closeSubModal() { const el = document.getElementById("sub-modal"); if (el) el.remove(); }

function applyLiveSub(slotKey, newPid) {
  if (!newPid) return;
  const M = UI.match; if (!M) return;
  const oldPid = M.lu[M.userSide][slotKey];
  M.lu[M.userSide][slotKey] = newPid;
  M.subsUsed = (M.subsUsed || 0) + 1;
  M.view[M.userSide] = courtView(rotOf(M.lu[M.userSide]), PLAYER_INDEX[M.lu[M.userSide].L]);
  simRemainingRallies(M); // Ricalcola i punti con la nuova squadra
  const outP = PLAYER_INDEX[oldPid], inP = PLAYER_INDEX[newPid];
  toast(`Cambio effettuato: entra ${inP.name} per ${outP.name}`);
  closeSubModal();
}
