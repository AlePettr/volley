/* Motore: generazione giocatrici, simulazione partite, calendari, stagione, coppe e playoff */
function gauss(r){let u=0,v=0;while(!u)u=r();while(!v)v=r();return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v);}

function calcETV(p){ const baseFactor = Math.pow(p.ovr / 40, 3.8); let val = baseFactor * 6500; if(p.age <= 21) val *= 1.35; if(p.age >= 32) val *= 0.75; return Math.round(val / 500) * 500; }

function salaryFor(p,lid){const tier=lid==="A1"?1:lid==="A2"?0.42:0.25;return Math.round((180+Math.pow(Math.max(35,p.ovr),2)*0.25)*tier/50)*50;}

function ensureContracts(team,lid){
  team.players.forEach(p=>{
    if(!Number.isFinite(p.wage)) p.wage=salaryFor(p,lid);
    if(!Number.isFinite(p.contractYears)) p.contractYears=1;
    if(!p.contractStatus) p.contractStatus="signed";
  });
}


function payrollFor(team){return team.players.reduce((n,p)=>n+(p.wage||salaryFor(p,team.lid||G.lid)),0);}

function makePlayer(lid,team,i,raw,rng,gen){
 let role,name,nat="",year=0;
 if(gen){role=gen.role;name=gen.name;year=SEASON_YEAR-(17+Math.floor(rng()*4));nat="ITA";}
 else{const f=raw.split("|");role=f[0];name=f[1];nat=f[2]||"";year=f[3]?+f[3]:0;}
 const surnameOnly=!gen&&lid==="A1"&&name.indexOf(" ")<0;
 const history=playerHistory(name);
 const points=latestHistoricalValue(history,"points");
 const base=lid==="A1"?58+team.tier*5.2:lid==="A2"?44+team.tier*4.2:38+team.tier*3.8;
 let historicalBoost=0;
 if(points!==null&&(role==="O"||role==="S")){
   const baseline=lid==="A1"?430:lid==="A2"?390:340;
   historicalBoost=clamp((points-baseline)/60,-2.5,4.5);
 }
 let ovr=base+gauss(rng)*4.0+(STAR_BONUS[name]||0)+(surnameOnly?3:0)+historicalBoost;
 let est=false;
 if(!year){year=SEASON_YEAR-(20+Math.floor(rng()*14));est=true;}
 const age=SEASON_YEAR-year;
 if(age<=19)ovr-=4;
 if(gen)ovr-=9;
 ovr=clamp(ovr,36,115); /* il tetto morbido si applica alla fine, in finalizeOverall() */
 const verifiedRoster=(lid==="A3A"||lid==="A3B"||team.id==="mod_a3"||team.id==="ton_a3"||team.id==="rom"||(lid==="A2"&&(team.id==="ita"||team.id==="per"||team.id==="cos"||team.id==="imo"||team.id==="mes"||team.id==="fut"))); const ra=ROLE_ATTR[role],p={id:lid+":"+team.id+":"+i,name,role,nat,year,age,est,gen:!!gen,rosterStatus:gen?"simulated":(verifiedRoster?"verified":"pending"),teamId:team.id,lid,fatigue:0,inj:0,injName:"",history};
 for(const k of ["att","blk","srv","rec","def","set"])p[k]=Math.round(clamp(ovr+ra[k]+gauss(rng)*2.3,25,115));
 const blocks=latestHistoricalValue(history,"blocks"), aces=latestHistoricalValue(history,"aces"), receptionPct=latestHistoricalValue(history,"receptionPct");
 if(blocks!==null)p.blk=Math.round(clamp(p.blk+clamp((blocks-(lid==="A1"?55:60))/12,-2,4),25,115));
 if(aces!==null)p.srv=Math.round(clamp(p.srv+clamp((aces-25)/8,-1.5,3.5),25,115));
 if(receptionPct!==null)p.rec=Math.round(clamp(p.rec+clamp((receptionPct-42)/2,-2,2.5),25,115));
 p.ovr=p[KEY_ATTR[role]];
 p.pot=age<=21?Math.round(clamp(p.ovr+4+rng()*9,p.ovr,Math.max(96,p.ovr))):p.ovr;
 p.val=calcETV(p);
 return p;
}

function generateFreeAgents(){ const fa=[]; const rng=mulberry32(992026); let count=0; for(const role of ROLE_ORDER){ for(let i=0;i<4;i++){ const nm=FIRST[Math.floor(rng()*FIRST.length)]+" "+LAST[Math.floor(rng()*LAST.length)]; const dummyTeam={tier:2.8,id:"fa"}; const p=makePlayer("FA",dummyTeam,count++,null,rng,{role,name:nm}); p.teamId=null;p.lid=null; fa.push(p); } } return fa.sort((a,b)=>b.ovr-a.ovr); }

function buildWorld(){ const W={A1:[],A2:[],A3A:[],A3B:[]}; let seed=2026101; for(const lid of Object.keys(W)){ LEAGUES[lid].teams.forEach((t,ti)=>{ const rng=mulberry32(seed+ti*977+(lid.includes("A3")?8500:lid==="A2"?5000:0)); const team={...t,lid,idx:ti,players:[]}; (t.p||[]).forEach((raw,i)=>team.players.push(makePlayer(lid,team,i,raw,rng,null))); const need={P:2,O:2,S:4,C:4,L:2}; let n=team.players.length; for(const role of ROLE_ORDER){ const have=team.players.filter(x=>x.role===role).length; for(let k=have;k<need[role];k++){ const nm=FIRST[Math.floor(rng()*FIRST.length)]+" "+LAST[Math.floor(rng()*LAST.length)]; team.players.push(makePlayer(lid,team,n++,null,rng,{role,name:nm})); } } team.players.sort((a,b)=>ROLE_ORDER.indexOf(a.role)-ROLE_ORDER.indexOf(b.role)||b.ovr-a.ovr); W[lid].push(team); }); } return W; }

const WORLD=buildWorld();

const FREE_AGENTS=generateFreeAgents();

const PLAYER_INDEX={};

for(const lid of Object.keys(WORLD))for(const t of WORLD[lid])for(const p of t.players)PLAYER_INDEX[p.id]=p;

for(const p of FREE_AGENTS)PLAYER_INDEX[p.id]=p;

function autoLineup(team){ const used=new Set(); const pool=r=>{ const own=team.players.filter(p=>p.role===r&&!used.has(p.id)); const ok=own.filter(p=>!p.inj); const list=(ok.length?ok:own).sort((a,b)=>b.ovr-a.ovr); return list.length?list:team.players.filter(p=>!used.has(p.id)).sort((a,b)=>b.ovr-a.ovr); }; const take=r=>{ const p=pool(r)[0]; if(!p)return undefined; used.add(p.id); return p.id; }; const o={}; for(const [k,r] of [["P","P"],["O","O"],["S1","S"],["S2","S"],["C1","C"],["C2","C"],["L","L"]])o[k]=take(r); return o; }

function lineupValid(team,lu){ if(!lu)return false; const need={P:"P",O:"O",S1:"S",S2:"S",C1:"C",C2:"C",L:"L"},seen={}; for(const k in need){ const p=PLAYER_INDEX[lu[k]]; if(!p||p.teamId!==team.id||p.role!==need[k]||p.inj>0||seen[p.id])return false; seen[p.id]=1; } return true; }

function ratingsOf(team,lu,tactic,rng,noise){ const g=k=>PLAYER_INDEX[lu[k]]; const P=g("P"),O=g("O"),S1=g("S1"),S2=g("S2"),C1=g("C1"),C2=g("C2"),L=g("L"); const f=()=>noise?gauss(rng)*1.2:0; const starters=[P,O,S1,S2,C1,C2,L]; const avgFatigue=starters.reduce((acc,pl)=>acc+(pl.fatigue||0),0)/7; const malus=avgFatigue>60?(avgFatigue-60)*0.25:0; let r={ srv:((P.srv+O.srv+S1.srv+S2.srv+C1.srv+C2.srv)/6)-malus, rec:(L.rec*.38+S1.rec*.27+S2.rec*.27+O.rec*.08)-malus, att:(O.att*.28+S1.att*.22+S2.att*.22+C1.att*.14+C2.att*.14)-malus, blk:(C1.blk*.3+C2.blk*.3+O.blk*.2+S1.blk*.1+S2.blk*.1)-malus, def:(L.def*.35+S1.def*.2+S2.def*.2+P.def*.1+O.def*.1+C1.def*.025+C2.def*.025)-malus, set:P.set-malus }; if(tactic==="srv"){r.srv+=5;r.att-=2;} else if(tactic==="def"){r.blk+=3;r.def+=3;r.srv-=3;} for(const k in r)r[k]+=f(); return r; }

function teamStrength(team,lu){const r=ratingsOf(team,lu,"bal",null,false);return (r.srv+r.rec+r.att+r.blk+r.def+r.set)/6;}

function pickW(items,wfn,rng){let tot=0;const ws=items.map(i=>{const w=Math.max(.01,wfn(i));tot+=w;return w;});let x=rng()*tot;for(let i=0;i<items.length;i++){x-=ws[i];if(x<=0)return items[i];}return items[items.length-1];}

function rotOf(lu){const g=k=>PLAYER_INDEX[lu[k]];return [g("P"),g("C1"),g("S1"),g("O"),g("C2"),g("S2")];}

function rotate(a){return [a[5],a[0],a[1],a[2],a[3],a[4]];}

function courtView(rot,lib){return rot.map((p,i)=>(i===1||i===2)&&p.role==="C"?{p:lib,lib:true}:{p,lib:false});}

/* Check VAR (video check): in alcuni scambi la chiamata arbitrale e' dubbia; se errata, la squadra che la contesta ribalta il punto */
const VAR_KINDS={kill:["Pallone dentro o fuori","Tocco a muro"],att:["Pallone dentro o fuori","Tocco a muro"],block:["Tocco a muro","Tocco di rete"],ace:["Servizio dentro o fuori","Tocco di rete"],serr:["Servizio fuori","Piede sulla linea"],rerr:["Pallone dentro o fuori","Tocco a muro"]};
function varCandidate(ry){ if(Math.random()>.06)return null; const ks=VAR_KINDS[ry.type]||VAR_KINDS.kill; const wrong=Math.random()<.4; return {kind:ks[Math.floor(Math.random()*ks.length)],wrong,strong:wrong?Math.random()<.65:Math.random()<.3,done:false}; }
function playRally(sideS,rots,libs,R,rng,homeSide,detail){ const sideR=sideS==="h"?"a":"h"; const rs=R[sideS],rr=R[sideR]; let pR=.64+.0033*((.35*rr.rec+.40*rr.att+.25*rr.set)-(.38*rs.srv+.37*rs.blk+.25*rs.def)); pR+=sideR===homeSide?.012:-.012; pR=clamp(pR,.42,.84); const recvWins=rng()<pR; const server=rots[sideS][0]; const rview=courtView(rots[sideR],libs[sideR]); const sview=courtView(rots[sideS],libs[sideS]); const receiver=pickW(rview.map(x=>x.p),p=>p.role==="L"?3:p.role==="S"?1.6:p.role==="O"?.2:p.role==="P"?.15:.1,rng); const front=(rot)=>[rot[3],rot[4],rot[5]]; const atkR=pickW(front(rots[sideR]),p=>Math.pow(p.att/70,3)*(p.role==="C"?.8:p.role==="P"?.12:1 ),rng); const atkS=pickW(front(rots[sideS]),p=>Math.pow(p.att/70,3)*(p.role==="C"?.8:p.role==="P"?.12:1) ,rng); const blkS=pickW(front(rots[sideS]),p=>Math.pow(p.blk/70,3)*(p.role==="C"?1.6:1),rng); const setterR=rots[sideR].find(p=>p.role==="P"); let winner,type,actor=null,cred=null; if(recvWins){ winner=sideR; if(rng()<.2){type="serr";} else{type="kill";actor=atkR;cred=atkR;} }else{ winner=sideS; const x=rng(); const aceP=.2+(R[sideS].srv-R[sideR].rec)*.004; if(x<aceP){type="ace";actor=server;cred=server;} else if(x<aceP+.3){type="block";actor=blkS;cred=blkS;} else if(x<aceP+.56){type="att";actor=atkS;cred=atkS;} else{type="rerr";} } return {sideS,sideR,winner,type,actor,cred,server,receiver,atkR,atkS,atk:recvWins?atkR:atkS,atkSide:recvWins?sideR:sideS,setter:setterR,blocker:blkS, sview:detail?sview:null,rview:detail?rview:null}; }

function simMatch(home,away,lineups,tactics,rng,detail){ const R={h:ratingsOf(home,lineups.h,tactics.h,rng,true),a:ratingsOf(away,lineups.a,tactics.a,rng,true)}; const libs={h:PLAYER_INDEX[lineups.h.L],a:PLAYER_INDEX[lineups.a.L]}; const sets=[],pts={},rallies=[]; let hs=0,as=0,set=0,firstServer=rng()<.5?"h":"a"; while(hs<3&&as<3){ set++; const target=set===5?15:25; let h=0,a=0; const rots={h:rotOf(lineups.h),a:rotOf(lineups.a)}; let srv=set===5?(rng()<.5?"h":"a"):(set%2===1?firstServer:(firstServer==="h"?"a":"h")); let guard=0; while(!((h>=target||a>=target)&&Math.abs(h-a)>=2)&&guard++<150){ const ry=playRally(srv,rots,libs,R,rng,"h",detail); if(detail)ry.vc=varCandidate(ry); if(ry.winner==="h")h++;else a++; if(ry.cred)pts[ry.cred.id]=(pts[ry.cred.id]||0)+1; if(detail){ry.set=set;ry.h=h;ry.a=a;ry.sets=[hs,as];rallies.push(ry);} if(ry.winner!==srv){rots[ry.winner]=rotate(rots[ry.winner]);srv=ry.winner;} } sets.push([h,a]); if(h>a)hs++;else as++; } return {sets,hs,as,pts,rallies}; }

function makeSchedule(n){ const ids=[];for(let i=0;i<n;i++)ids.push(i); if(n%2)ids.push(-1); const m=ids.length,rounds=[]; let arr=ids.slice(); for(let r=0;r<m-1;r++){ const pairs=[]; for(let i=0;i<m/2;i++){ let a=arr[i],b=arr[m-1-i]; if(a===-1||b===-1)continue; if(i===0&&r%2===1){const t=a;a=b;b=t;} else if(i>0&&(r+i)%2===1){const t=a;a=b;b=t;} pairs.push([a,b]); } rounds.push(pairs); arr=[arr[0]].concat([arr[m-1]],arr.slice(1,m-1)); } const second=rounds.map(rd=>rd.map(([a,b])=>[b,a])); return rounds.concat(second); }

const SCHEDULE={A1:makeSchedule(14),A2:makeSchedule(17),A3A:makeSchedule(8),A3B:makeSchedule(8)};

function standings(lid,results){ const teams=WORLD[lid]||[],tb=teams.map(t=>({idx:t.idx,id:t.id,short:t.short,pl:0,w:0,l:0,pts:0,sw:0,sl:0,pf:0,pa:0})); for(const rd of results[lid]||[])for(const m of rd){ const H=tb[m.h],A=tb[m.a]; if(!H||!A)continue; H.pl++;A.pl++;H.sw+=m.hs;H.sl+=m.as;A.sw+=m.as;A.sl+=m.hs; for(const s of m.sets){H.pf+=s[0];H.pa+=s[1];A.pf+=s[1];A.pa+=s[0];} if(m.hs>m.as){H.w++;A.l++;H.pts+=m.as<=1?3:2;A.pts+=m.as===2?1:0;} else{A.w++;H.l++;A.pts+=m.hs<=1?3:2;H.pts+=m.hs===2?1:0;} } tb.sort((a,b)=>b.pts-a.pts||b.w-a.w||(b.sw/Math.max(1,b.sl))-(a.sw/Math.max(1,a.sl))||(b.pf/Math.max(1,b.pa))-(a.pf/Math.max(1,a.pa))||a.idx-b.idx); return tb; }

function lineupFor(G,team){ if(G&&team.lid===G.lid&&team.idx===G.teamIdx&&lineupValid(team,G.lineup))return G.lineup; return autoLineup(team); }

function packMatch(h,a,r){return {h,a,sets:r.sets,hs:r.hs,as:r.as};}

function playRound(G,userRes){ aiMarketMove(); const rnd=G.round; const userLeague=G.lid; const activeLeagues=Object.keys(SCHEDULE).filter(l=>SCHEDULE[l]); for(const lid of activeLeagues){ const sched=SCHEDULE[lid]; if(!sched)continue; if(!G.results[lid])G.results[lid]=[]; const leagueRound=G.results[lid].length; if(leagueRound>=sched.length)continue; const out=[]; for(const [hi,ai] of sched[leagueRound]){ const home=WORLD[lid][hi],away=WORLD[lid][ai]; if(userRes&&lid===userLeague&&(hi===G.teamIdx||ai===G.teamIdx)){out.push(packMatch( hi,ai,userRes));continue;} const isU=lid===userLeague&&(hi===G.teamIdx||ai===G.teamIdx); const tac={h:isU&&hi===G.teamIdx?G.tactic:"bal",a:isU&&ai===G.teamIdx?G.tactic:"bal"}; const r=simMatch(home,away,{h:lineupFor(G,home),a:lineupFor(G,away)},tac,Math.random,false); out.push(packMatch(hi,ai,r)); } G.results[lid].push(out); }
// Monitoraggio medico a fine giornata: fatica e infortuni
for(const lid of Object.keys(WORLD)){ for(const t of WORLD[lid]){ const lu=lineupFor(G,t); const starters=new Set(Object.values(lu)); t.players.forEach(p=>{ if(p.inj>0){ p.inj--; if(p.inj===0)p.injName=""; } if(starters.has(p.id)){ const roleStrain = (p.role === "C" || p.role === "L") ? 9 : 12; p.fatigue=clamp((p.fatigue||0)+roleStrain-4,0,100); const injProb=p.fatigue>80?0.04:(p.fatigue>65?0.012:0.003); if(Math.random()<injProb&&p.inj===0){ p.inj=Math.floor(Math.random()*2)+1; p.injName=p.fatigue>75?"Sovraccarico muscolare":"Distorsione alla caviglia"; if(t.id===myTeam().id)toast(`Infortunio: ${p.name} (${p.injName}, ${p.inj}t stop)`); } }else{ p.fatigue=clamp((p.fatigue||0)-60,0,100); } }); } } if(!lineupValid(myTeam(),G.lineup))G.lineup=autoLineup(myTeam()); 
// Finanze e contratti
processTravelForRound();ensureContracts(myTeam(),G.lid);const wageBill=payrollFor(myTeam());G.budget-=wageBill;if(G.budget<0)toast(`Attenzione: budget in rosso (${formatEur(G.budget)}). Riduci il monte ingaggi.`);G.round=rnd+1;
// Transizione Serie A3 alle Pool
if(G.phase===1&&G.results["A3A"]&&G.results["A3A"].length>=14&&G.results["A3B"]&&G.results["A3B"].length>=14){ G.phase=2; const stA=standings("A3A",G.results); const stB=standings("A3B",G.results); WORLD["A3_PROM"]=[]; WORLD["A3_RETR"]=[]; for(let i=0;i<4;i++){ WORLD["A3_PROM"].push({...WORLD["A3A"][stA[i].idx]}); WORLD["A3_PROM"].push({...WORLD["A3B"][stB[i].idx]}); } for(let i=4;i<8;i++){ WORLD["A3_RETR"].push({...WORLD["A3A"][stA[i].idx]}); WORLD["A3_RETR"].push({...WORLD["A3B"][stB[i].idx]}); } WORLD["A3_PROM"].forEach((t,i)=>{t.lid="A3_PROM";t.idx=i;}); WORLD["A3_RETR"].forEach((t,i)=>{t.lid="A3_RETR";t.idx=i;}); LEAGUES["A3_PROM"]={name:"Serie A3 - Pool Promozione",rounds:14,teams:WORLD["A3_PROM"]}; LEAGUES["A3_RETR"]={name:"Serie A3 - Pool Retrocessione",rounds:14,teams:WORLD["A3_RETR"]}; SCHEDULE["A3_PROM"]=makeSchedule(8); SCHEDULE["A3_RETR"]=makeSchedule(8); delete SCHEDULE["A3A"]; delete SCHEDULE["A3B"]; G.results["A3_PROM"]=[]; G.results["A3_RETR"]=[]; if(G.lid==="A3A"||G.lid==="A3B"){ const isFromA=G.lid==="A3A"; const oldRank=(isFromA?stA:stB).findIndex(r=>r.idx===G.teamIdx); const oldId=WORLD[G.lid][G.teamIdx].id; G.lid=oldRank<4?"A3_PROM":"A3_RETR"; G.teamIdx=WORLD[G.lid].findIndex(t=>t.id===oldId); G.round=0; toast("Fine Regular Season: Iniziano le Pool di Serie A3!"); } } }


function syncClubLeague(team,lid,idx){team.lid=lid;team.idx=idx;team.players.forEach(p=>{p.lid=lid;p.teamId=team.id;PLAYER_INDEX[p.id]=p;});}

function exchangeClubs(from,fromIdx,to,toIdx){if(!WORLD[from]||!WORLD[to]||!WORLD[from][fromIdx]||!WORLD[to][toIdx])return null;const a=WORLD[from][fromIdx],b=WORLD[to][toIdx];WORLD[from][fromIdx]=b;WORLD[to][toIdx]=a;WORLD[from].forEach((t,i)=>syncClubLeague(t,from,i));WORLD[to].forEach((t,i)=>syncClubLeague(t,to,i));return {a,b};}

function moveA3ClubToA2(promoted,demoted){const id=promoted.id;let source=null,sourceIdx=-1;for(const lid of ["A3A","A3B"]){const i=WORLD[lid].findIndex(t=>t.id===id);if(i>=0){source=lid;sourceIdx=i;break;}}if(!source)return false;const replacement={...demoted,players:demoted.players.slice()};WORLD[source][sourceIdx]=replacement;WORLD[source].forEach((t,i)=>syncClubLeague(t,source,i));const poolIdx=WORLD.A3_PROM.findIndex(t=>t.id===id);if(poolIdx>=0)WORLD.A3_PROM[poolIdx]=promoted;const a2idx=WORLD.A2.findIndex(t=>t.id===demoted.id);if(a2idx>=0){WORLD.A2[a2idx]=promoted;WORLD.A2.forEach((t,i)=>syncClubLeague(t,"A2",i));}return true;}

function completeSeasonLeagueResults(){
 // Completa le giornate delle altre serie prima di calcolare promozioni e retrocessioni.
 for(const lid of Object.keys(SCHEDULE)){const sched=SCHEDULE[lid];if(!sched||!WORLD[lid])continue;if(!G.results[lid])G.results[lid]=[];for(let r=G.results[lid].length;r<sched.length;r++){const out=[];for(const [hi,ai] of sched[r]){const home=WORLD[lid][hi],away=WORLD[lid][ai];if(!home||!away)continue;const res=simMatch(home,away,{h:autoLineup(home),a:autoLineup(away)},{h:"bal",a:"bal"},Math.random,false);out.push(packMatch(hi,ai,res));}G.results[lid].push(out);}}
}

function finishSeasonCareer(){
 completeSeasonLeagueResults();
 const oldLid=G.lid,oldTeam=myTeam(),oldTeamId=oldTeam.id,table=standings(oldLid,G.results),rank=table.findIndex(r=>r.id===oldTeamId)+1;
 const entry={season:2026+G.season-1,league:LEAGUES[oldLid]?.name||oldLid,leagueId:oldLid,teamId:oldTeamId,club:oldTeam.short,rank:rank||table.length,teams:table.length,points:(table.find(r=>r.id===oldTeamId)||{}).pts||0,wins:(table.find(r=>r.id===oldTeamId)||{}).w||0,goal:G.board?.goal||"salvezza",budgetEnd:G.budget,notes:[]};
 if(!G.careerHistory)G.careerHistory=[];
 // Evoluzione stagionale: crescita più rapida per giovani ad alto potenziale, lieve calo per veterane.
 for(const lid of Object.keys(WORLD))for(const club of WORLD[lid])for(const p of club.players){if(p.age===undefined)p.age=24;p.age++;const pot=Number(p.pot||p.ovr);let delta=p.age<=23?Math.max(0,Math.min(3,Math.round((pot-p.ovr)*.22))):p.age>=32?-1:0;if(p.age>=35&&Math.random()<.22){p.retiring=true;}if(delta)p.ovr=clamp(p.ovr+delta,36,96);if(p.age>=32&&Math.random()<.25)p.ovr=clamp(p.ovr-1,36,96);p.pot=Math.max(p.ovr,Number(p.pot||p.ovr));p.val=calcETV(p);for(const k of ["att","blk","srv","rec","def","set"])p[k]=clamp(p[k]+(delta>0?Math.min(2,delta):p.age>=33?-1:0),25,98);PLAYER_INDEX[p.id]=p;}
 // I contratti restano gestibili: rimuove le atlete ritirate e annota l'evento.
 for(const lid of Object.keys(WORLD))for(const club of WORLD[lid]){const gone=club.players.filter(p=>p.retiring);if(gone.length){club.players=club.players.filter(p=>!p.retiring);gone.forEach(p=>{p.teamId=null;p.lid=null;p.retiring=false;p.contractYears=0;p.contractStatus="retired";});}}
 // Passaggio di categoria applicato a ogni club, indipendentemente dalla squadra controllata.
 const swapTeams=(lidA,idA,lidB,idB)=>{const ia=WORLD[lidA]?.findIndex(t=>t.id===idA)??-1,ib=WORLD[lidB]?.findIndex(t=>t.id===idB)??-1;if(ia<0||ib<0)return false;const a=WORLD[lidA][ia],b=WORLD[lidB][ib];WORLD[lidA][ia]=b;WORLD[lidB][ib]=a;WORLD[lidA].forEach((t,i)=>syncClubLeague(t,lidA,i));WORLD[lidB].forEach((t,i)=>syncClubLeague(t,lidB,i));return true;};
 const playTwoLegTie=(a,b)=>{const one=simMatch(a,b,{h:autoLineup(a),a:autoLineup(b)},{h:"bal",a:"bal"},Math.random,false);const two=simMatch(b,a,{h:autoLineup(b),a:autoLineup(a)},{h:"bal",a:"bal"},Math.random,false);let aw=(one.hs>one.as?1:0)+(two.as>two.hs?1:0),bw=2-aw;let winner;if(aw!==bw)winner=aw>bw?a:b;else{const strengthA=teamStrength(a,autoLineup(a)),strengthB=teamStrength(b,autoLineup(b));winner=Math.random()<(.5+(strengthA-strengthB)*.012)?a:b;}return {winner,one,two,golden:aw===bw};};
 const simulateA2Playoffs=()=>{const table=standings("A2",G.results);if(table.length<9)return null;let entrants=table.slice(1,9).map(r=>WORLD.A2[r.idx]);const initial=[[entrants[0],entrants[7]],[entrants[1],entrants[6]],[entrants[2],entrants[5]],[entrants[3],entrants[4]]];const round=(pairs,label)=>{const winners=[];for(const [a,b] of pairs){const series=playTwoLegTie(a,b);entry.notes.push(`${label}: ${a.short} – ${b.short}, passa ${series.winner.short}${series.golden?" dopo Golden Set simulato":""}.`);winners.push(series.winner);}return winners;};let winners=round(initial,"Quarti playoff A2");winners=round([[winners[0],winners[3]],[winners[1],winners[2]]],"Semifinali playoff A2");const final=playTwoLegTie(winners[0],winners[1]);entry.notes.push(`Finale playoff A2: ${winners[0].short} – ${winners[1].short}, promossa ${final.winner.short}${final.golden?" dopo Golden Set simulato":""}.`);return final.winner;};
 const bestA3=()=>{const st=standings("A3_PROM",G.results);return st.map(r=>WORLD.A3_PROM?.find(t=>t.id===r.id)).filter(Boolean);};
 const a1=standings("A1",G.results),a2=standings("A2",G.results),a3=bestA3();
 let promotedA2=null,playoffWinner=null;
 if(a2.length){promotedA2=WORLD.A2[a2[0].idx];playoffWinner=simulateA2Playoffs();if(playoffWinner&&playoffWinner.id===promotedA2.id)playoffWinner=null;}
 // A1: prima promossa diretta dall'A2 e vincitrice playoff; due retrocessioni simulate.
 if(a1.length>=2&&promotedA2){const relegated=a1.slice(-2).map(r=>WORLD.A1[r.idx]);const incoming=[promotedA2,playoffWinner].filter(Boolean);for(let i=0;i<Math.min(relegated.length,incoming.length);i++){if(swapTeams("A1",relegated[i].id,"A2",incoming[i].id))entry.notes.push(`${incoming[i].short} promossa in A1; ${relegated[i].short} retrocessa in A2.`);}}
 // A2: la posizione del Club Italia determina il numero di retrocessioni previsto per il 2026/27.
 const a2After=a2;const clubItaliaRank=a2After.findIndex(r=>/club italia/i.test(r.short))+1;const relegatedA2=a2After.slice().reverse().map(r=>WORLD.A2[r.idx]).filter(t=>t&&!/club italia/i.test(t.short)).slice(0,4);
 // Le prime due della Pool Promozione A3 salgono; se Club Italia chiude oltre il 12° posto, ne salgono tre.
 const a3Pool=bestA3();const a3Count=clubItaliaRank>12?3:2;const a3Promoted=a3Pool.slice(0,a3Count);for(let i=0;i<Math.min(relegatedA2.length,a3Promoted.length);i++){if(moveA3ClubToA2(a3Promoted[i],relegatedA2[i]))entry.notes.push(`${a3Promoted[i].short} promossa in A2; ${relegatedA2[i].short} retrocessa in A3.`);}
 if(clubItaliaRank>0&&clubItaliaRank<=12&&a2After.length>=13&&a3Pool.length>=4){const rank13=WORLD.A2[a2After[12].idx],fourthA3=a3Pool[3];const po=playTwoLegTie(rank13,fourthA3);const loser=po.winner.id===rank13.id?fourthA3:rank13;entry.notes.push(`Playout A2/A3: ${rank13.short} – ${fourthA3.short}; resta in A2 ${po.winner.short}${po.golden?" dopo Golden Set simulato":""}.`);if(loser.id===rank13.id)moveA3ClubToA2(fourthA3,rank13);}
 if(oldLid.startsWith("A3")&&oldLid!=="A3_PROM"&&oldLid!=="A3_RETR")entry.notes.push("Fase A3: la classifica finale dipende dalle Pool Promozione e Salvezza; i passaggi di categoria sono riepilogati sopra.");
 // Riallinea la carriera all'eventuale nuova categoria del club dell'utente.
 let userLoc=null;for(const lid of Object.keys(WORLD)){const i=WORLD[lid].findIndex(t=>t.id===oldTeamId);if(i>=0){userLoc={lid,idx:i};break;}}
 if(userLoc){G.lid=userLoc.lid;G.teamIdx=userLoc.idx;entry.newLeague=LEAGUES[G.lid]?.name||G.lid;}
 G.careerHistory.unshift(entry);G.careerHistory=G.careerHistory.slice(0,12);
 G.seasonAwards=G.seasonAwards||[];G.seasonAwards.unshift({season:entry.season,champions:Object.fromEntries(["A1","A2","A3_PROM","A3_RETR"].filter(l=>WORLD[l]&&WORLD[l].length).map(l=>[l,(standings(l,G.results)[0]||{}).short||"—"]))});
 if(G.board){const target=G.board.goal;let met=target==="titolo"?rank<=1:target==="playoff"?rank<=8:target==="promozione"?rank<=2:target==="salvezza"?rank<=Math.max(1,table.length-3):true;G.board.confidence=clamp((G.board.confidence||60)+(met?8:-12),5,95);}
 if(G.management&&G.management.sponsor&&G.management.sponsor.name==="Sponsor ambizioso"&&rank<=3)G.budget+=12000;
 return {entry,rank,oldLid};
}

function initA1Cup(){
 if(G.cupA1||G.lid!=="A1"||G.round<Math.floor((SCHEDULE.A1||[]).length/2))return;
 const st=standings("A1",G.results),ids=st.slice(0,8).map(x=>x.id);G.cupA1={qualified:ids,done:!ids.includes(myTeam().id),results:[]};
 if(!ids.includes(myTeam().id)){G.cupA1.note="Non qualificata: la coppa è riservata alle prime otto all'andata.";return;}
 const pairs=[[ids[0],ids[7]],[ids[1],ids[6]],[ids[2],ids[5]],[ids[3],ids[4]]],pair=pairs.find(x=>x.includes(myTeam().id)),oppId=pair.find(x=>x!==myTeam().id);
 const otherPairs=pairs.filter(x=>x!==pair),other=otherPairs.flat().map(id=>WORLD.A1.find(t=>t.id===id)).filter(Boolean).sort((a,b)=>teamStrength(b,autoLineup(b))-teamStrength(a,autoLineup(a)))[0];
 G.cupA1.otherFinalistId=other?.id;G.event={kind:"cupA1",stage:"Quarti di finale",lid:"A1",opponentId:oppId,home:true,legs:1,leg:1};
}

function initA1Playoffs(){
 if(G.playoffsA1||G.lid!=="A1"||G.round<(SCHEDULE.A1||[]).length)return;
 const st=standings("A1",G.results),rank=st.findIndex(x=>x.id===myTeam().id)+1;G.playoffsA1={rank,done:rank>8,history:[]};
 if(rank>8){G.playoffsA1.note="Non qualificata ai playoff scudetto (prime otto).";return;}
 const ids=st.slice(0,8).map(x=>x.id),pairs=[[ids[0],ids[7]],[ids[1],ids[6]],[ids[2],ids[5]],[ids[3],ids[4]]],pair=pairs.find(x=>x.includes(myTeam().id));
 G.event={kind:"playoffA1",stage:"Quarti playoff scudetto",lid:"A1",opponentId:pair.find(id=>id!==myTeam().id),home:false,legs:1,leg:1};
}

function advanceSingleElimination(ev,won){
 const cup=ev.kind==="cupA1",state=cup?G.cupA1:G.playoffsA1;if(!state)return;
 state.history=state.history||[];state.history.push(`${ev.stage}: ${won?myTeam().short:(eventOppTeam(ev)?.short||"Avversaria")} ${won?"passa il turno":"vince la sfida"}.`);
 if(!won){state.done=true;state.note=cup?"Eliminata dalla Coppa Italia A1.":"Percorso playoff scudetto terminato.";G.event=null;return;}
 let stage,oppId;
 if(ev.stage==="Quarti di finale"||ev.stage==="Quarti playoff scudetto"){
   stage=cup?"Semifinale":"Semifinale playoff scudetto";
   const candidates=(cup?G.cupA1.qualified:G.playoffsA1.qualified)||standings("A1",G.results).slice(0,8).map(x=>x.id);
   const pool=candidates.filter(id=>id!==myTeam().id&&id!==ev.opponentId).map(id=>WORLD.A1.find(t=>t.id===id)).filter(Boolean).sort((a,b)=>teamStrength(b,autoLineup(b))-teamStrength(a,autoLineup(a)));
   oppId=pool[0]?.id;
 }else if(ev.stage==="Semifinale"||ev.stage==="Semifinale playoff scudetto"){
   stage=cup?"Finale":"Finale playoff scudetto";
   const id=cup?G.cupA1.otherFinalistId:null;
   const pool=WORLD.A1.filter(t=>t.id!==myTeam().id&&t.id!==ev.opponentId).sort((a,b)=>teamStrength(b,autoLineup(b))-teamStrength(a,autoLineup(a)));
   oppId=(id&&id!==myTeam().id)?id:pool[0]?.id;
 }else{state.done=true;state.note=cup?"Coppa Italia A1 vinta!":"Playoff scudetto completati: titolo conquistato!";G.event=null;return;}
 if(!oppId){state.done=true;state.note="Competizione completata.";G.event=null;return;}
 G.event={kind:ev.kind,stage,lid:"A1",opponentId:oppId,home:stage.startsWith("Finale"),legs:1,leg:1};
}

function eventOppTeam(ev){return ev&&WORLD[ev.lid]?.find(t=>t.id===ev.opponentId)||null;}

function initA2Cup(){
 if(G.cupA2||G.lid!=="A2"||G.round<Math.floor(SCHEDULE.A2.length/2))return;
 const firstHalf=standings("A2",G.results).slice(0,4);const ids=firstHalf.map(x=>WORLD.A2.find(t=>t.id===x.id)?.id).filter(Boolean);
 G.cupA2={qualified:ids,done:false,round:0,results:[]};
 if(!ids.includes(myTeam().id)){G.cupA2.done=true;G.cupA2.note="Non qualificata: Coppa Italia A2 riservata alle prime quattro al termine dell’andata.";return;}
 const myRank=ids.indexOf(myTeam().id),pairs=[[ids[0],ids[3]],[ids[1],ids[2]]],mine=pairs.find(x=>x.includes(myTeam().id)),otherPair=pairs.find(x=>!x.includes(myTeam().id));
 const opp=WORLD.A2.find(t=>t.id===mine.find(id=>id!==myTeam().id));
 const oa=WORLD.A2.find(t=>t.id===otherPair[0]),ob=WORLD.A2.find(t=>t.id===otherPair[1]);
 const otherFinalist=(Math.random()<(.5+(teamStrength(oa,autoLineup(oa))-teamStrength(ob,autoLineup(ob)))*.012)?oa:ob);
 G.cupA2.round=1;G.cupA2.otherFinalistId=otherFinalist.id;G.event={kind:"cup",stage:"Semifinale",lid:"A2",opponentId:opp.id,home:true,leg:1,legs:1,queueIndex:0};
}

function initA2Playoffs(){
 if(G.playoffsA2||G.lid!=="A2"||G.round<(SCHEDULE.A2||[]).length)return;
 const st=standings("A2",G.results),rank=st.findIndex(x=>x.id===myTeam().id)+1;
 G.playoffsA2={rank,done:rank<2||rank>9,stage:0,history:[]};
 if(rank<2||rank>9){G.playoffsA2.note="La squadra non si è qualificata ai playoff promozione (ammessi i piazzamenti dal 2° al 9°).";return;}
 const ids=st.slice(1,9).map(x=>x.id),pairs=[[ids[0],ids[7]],[ids[1],ids[6]],[ids[2],ids[5]],[ids[3],ids[4]]];
 const pair=pairs.find(x=>x.includes(myTeam().id));const oppId=pair.find(x=>x!==myTeam().id);
 G.event={kind:"playoff",stage:"Quarti di finale",lid:"A2",opponentId:oppId,home:false,leg:1,legs:2,seriesWins:0,opponentWins:0,queueIndex:0};
}

function prepareNextPlayoffEvent(ev,won){
 ev.seriesWins=(ev.seriesWins||0)+(won?1:0);ev.opponentWins=(ev.opponentWins||0)+(won?0:1);
 if(ev.leg<2){ev.leg=2;ev.home=!ev.home;return;}
 let advanced=ev.seriesWins>ev.opponentWins;
 if(ev.seriesWins===ev.opponentWins){const a=myTeam(),b=eventOppTeam(ev);advanced=Math.random()<(.5+(teamStrength(a,autoLineup(a))-teamStrength(b,autoLineup(b)))*.012);G.playoffsA2.history.push(`${ev.stage}: serie 1-1, Golden Set simulato; ${advanced?myTeam().short:(b?.short||"Avversaria")} passa il turno.`);}
 else G.playoffsA2.history.push(`${ev.stage}: ${advanced?myTeam().short:(eventOppTeam(ev)?.short||"Avversaria")} ${advanced?"avanza":"elimina la squadra"}.`);
 if(!advanced){G.playoffsA2.done=true;G.playoffsA2.note="Percorso playoff terminato.";G.event=null;return;}
 if(ev.stage==="Quarti di finale"){
  const st=standings("A2",G.results),ids=st.slice(1,9).map(x=>x.id);const remaining=ids.filter(id=>id!==myTeam().id&&id!==ev.opponentId);
  const oppId=remaining.sort((a,b)=>teamStrength(WORLD.A2.find(t=>t.id===b),autoLineup(WORLD.A2.find(t=>t.id===b)))-teamStrength(WORLD.A2.find(t=>t.id===a),autoLineup(WORLD.A2.find(t=>t.id===a))))[0]||ids[0];
  G.event={kind:"playoff",stage:"Semifinale",lid:"A2",opponentId:oppId,home:true,leg:1,legs:2,seriesWins:0,opponentWins:0,queueIndex:0};
 }else if(ev.stage==="Semifinale"){
  const opp=WORLD.A2.filter(t=>t.id!==myTeam().id).sort((a,b)=>teamStrength(b,autoLineup(b))-teamStrength(a,autoLineup(a)))[0];G.event={kind:"playoff",stage:"Finale",lid:"A2",opponentId:opp.id,home:true,leg:1,legs:2,seriesWins:0,opponentWins:0,queueIndex:0};
 }else{G.playoffsA2.done=true;G.playoffsA2.note="Playoff completati.";G.event=null;}
}

function nextFixture(G){ const sched=SCHEDULE[G.lid]; if(!sched||G.round>=sched.length)return null; for(const [h,a] of sched[G.round])if(h===G.teamIdx||a===G.teamIdx)return {h,a,home:h===G.teamIdx}; return {rest:true}; }
function simRemainingRallies(M) {
  const currentRy = M.res.rallies[M.i] || { set: 1, h: 0, a: 0 };
  const targetSet = currentRy.set;
  let h = currentRy.h, a = currentRy.a;
  const target = targetSet === 5 ? 15 : 25;
  const newRallies = [];
  const rots = { h: rotOf(M.lu.h), a: rotOf(M.lu.a) };
  const libs = { h: PLAYER_INDEX[M.lu.h.L], a: PLAYER_INDEX[M.lu.a.L] };
  const R = {
    h: ratingsOf(M.home, M.lu.h, M.tactic || "bal", Math.random, true),
    a: ratingsOf(M.away, M.lu.a, "bal", Math.random, true)
  };
  let srv = currentRy.winner || "h";
  let guard = 0;

  // Completa il set attualmente in corso
  while (!((h >= target || a >= target) && Math.abs(h - a) >= 2) && guard++ < 120) {
    const ry = playRally(srv, rots, libs, R, Math.random, "h", true); ry.vc = varCandidate(ry);
    if (ry.winner === "h") h++; else a++;
    if (ry.cred) M.res.pts[ry.cred.id] = (M.res.pts[ry.cred.id] || 0) + 1;
    ry.set = targetSet; ry.h = h; ry.a = a; ry.sets = [M.sh, M.sa];
    newRallies.push(ry);
    if (ry.winner !== srv) { rots[ry.winner] = rotate(rots[ry.winner]); srv = ry.winner; }
  }

  // Ricostruisce l'elenco dei set completati + il set corrente
  const updatedSets = M.setScores.map(s => [s[0], s[1]]);
  updatedSets.push([h, a]);

  let hs = M.sh + (h > a ? 1 : 0), as = M.sa + (a > h ? 1 : 0);
  let nextSet = targetSet;

  // Simula gli eventuali set successivi
  while (hs < 3 && as < 3) {
    nextSet++;
    const nextTarget = nextSet === 5 ? 15 : 25;
    let sh = 0, sa = 0;
    let srvNext = nextSet % 2 === 1 ? "h" : "a";
    let g2 = 0;
    while (!((sh >= nextTarget || sa >= nextTarget) && Math.abs(sh - sa) >= 2) && g2++ < 120) {
      const ry = playRally(srvNext, rots, libs, R, Math.random, "h", true); ry.vc = varCandidate(ry);
      if (ry.winner === "h") sh++; else sa++;
      if (ry.cred) M.res.pts[ry.cred.id] = (M.res.pts[ry.cred.id] || 0) + 1;
      ry.set = nextSet; ry.h = sh; ry.a = sa; ry.sets = [hs, as];
      newRallies.push(ry);
      if (ry.winner !== srvNext) { rots[ry.winner] = rotate(rots[ry.winner]); srvNext = ry.winner; }
    }
    updatedSets.push([sh, sa]);
    if (sh > sa) hs++; else as++;
  }

  // Aggiorna sia i rally sia il risultato finale della partita
  M.res.rallies = M.res.rallies.slice(0, M.i + 1).concat(newRallies);
  M.res.sets = updatedSets;
  M.res.hs = hs;
  M.res.as = as;
}
