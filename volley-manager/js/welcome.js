/* Schermata di benvenuto prima della scelta della squadra (solo al primo accesso senza carriera; sempre riapribile da "Come si gioca"). */
function welcomeSeen() { try { return localStorage.getItem('vm-welcome') === '1'; } catch (e) { return true; } }
function welcomeHTML() {
  const step = (n, t, d) => `<div class="prow"><span class="num" style="font-size:22px;min-width:28px;color:var(--accent)">${n}</span><span class="nm"><b>${t}</b><span class="muted small" style="white-space:normal">${d}</span></span></div>`;
  return `<div class="hero" style="margin-top:8px"><span class="pill acc" style="justify-self:start">Benvenuto</span><h1>Volley Manager Italia</h1>
  <p class="sub">Guida un club di pallavolo femminile tra Serie A1, A2 e A3, stagione dopo stagione, con rose, calendari e squadre reali.</p></div>
  <div class="card" style="margin-top:14px"><h3>Come si gioca</h3>
  ${step(1, 'Scegli una squadra', 'Il numero accanto al nome è la sua forza: più è alto, più è competitiva. Con le piccole puoi puntare alla salvezza o alla promozione.')}
  ${step(2, 'Prepara la formazione', 'Nelle schede Rosa e Modulo scegli le sei titolari e la tattica. La formazione automatica sceglie le migliori.')}
  ${step(3, 'Gioca la giornata', 'Dalla Home guarda la partita in 3D con audio, oppure falla simulare. Gli incassi entrano nel budget.')}
  ${step(4, 'Gestisci il club', 'Mercato per comprare e vendere, Staff e piani individuali per far crescere le giovani, Contratti da rinnovare prima della fine.')}
  ${step(5, 'Chiudi la stagione', 'A fine campionato arrivano i premi, il report di crescita e il mercato estivo di 4 settimane. Poi si riparte, con promozioni e retrocessioni.')}</div>
  <div class="card" style="margin-top:14px"><h3>Da sapere</h3>
  <ul class="muted small" style="margin:6px 0 0 18px;line-height:1.5"><li>Il gioco salva da solo nel browser di questo dispositivo: se cancelli i dati del sito perdi la carriera. Usa l'esportazione per tenerne una copia.</li><li>"Sfida un amico" (in Home) permette una partita dal vivo a due, con un codice stanza.</li><li>Rose e valutazioni arrivano da fonti pubbliche e sono in parte stimate: alcune A3 sono ancora incomplete.</li></ul></div>
  <div class="row" style="margin-top:16px"><button class="btn primary big" data-act="welcomeok" style="flex:1">Scegli la tua squadra</button></div>`;
}
const _startHTML5 = startHTML;
startHTML = function () {
  if (UI.welcome === undefined) UI.welcome = !welcomeSeen() && !validSave(loadLocal());
  if (UI.welcome) return welcomeHTML();
  return _startHTML5() + `<p style="text-align:center;margin:18px 0 0"><button class="btn" data-act="welcomeopen">Come si gioca</button></p>`;
};
