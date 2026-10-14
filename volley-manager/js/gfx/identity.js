/* ===== Identità dei club: colori sociali e loghi caricati dall'utente =====
   I loghi ufficiali sono marchi dei club: non sono inclusi. Ogni logo si può caricare
   da un file e resta solo nel browser di chi lo carica. I colori "verificati" provengono
   da fonti pubbliche; gli altri sono indicativi e modificabili. */
const BRAND = {
  /* solo colori con una fonte pubblica (club, Lega, stampa, fornitore tecnico); gli altri restano indicativi */
  con: { c1: '#1d4ed8', c2: '#f5c400' }, sca: { c1: '#1e40af', c2: '#ffffff' }, ber: { c1: '#111111', c2: '#f5c400' },
  val: { c1: '#15803d', c2: '#ffffff' }, cun: { c1: '#1d4ed8', c2: '#ffffff' }, cos: { c1: '#c8102e', c2: '#1d4ed8' },
  cas: { c1: '#38bdf8', c2: '#ffffff' }, tre: { c1: '#1d4ed8', c2: '#facc15' }, alt: { c1: '#f97316', c2: '#ffffff' },
  mar2: { c1: '#38bdf8', c2: '#ffffff' }, off: { c1: '#15803d', c2: '#111111' },
  con_a3: { c1: '#dc2626', c2: '#ffffff' }, mod_a3: { c1: '#facc15', c2: '#1d4ed8' }, vvm_a3: { c1: '#facc15', c2: '#1d4ed8' }
};
const BRAND_KEY = 'vm_brand_v1';
function brandLoad() { try { return JSON.parse(localStorage.getItem(BRAND_KEY)) || {}; } catch (e) { return {}; } }
function brandSave(o) { try { localStorage.setItem(BRAND_KEY, JSON.stringify(o)); return true; } catch (e) { toast('Spazio pieno: logo troppo grande'); return false; } }
const BRAND_BASE = {};
function applyBrand() {
  const user = brandLoad();
  for (const lid in WORLD) if (Array.isArray(WORLD[lid])) for (const t of WORLD[lid]) {
    if (!(t.id in BRAND_BASE)) BRAND_BASE[t.id] = { c1: t.color, c2: t.color2 };
    const b = BRAND_BASE[t.id], k = BRAND[t.id], u = user[t.id] || {};
    t.color = u.c1 || (k && k.c1) || b.c1;
    t.color2 = u.c2 || (k && k.c2) || b.c2 || null;
    t.logo = u.logo || null;
    t.brandVerified = !!k;
  }
}
function allClubs() { const out = []; for (const lid in WORLD) if (Array.isArray(WORLD[lid])) for (const t of WORLD[lid]) out.push({ lid, t }); return out; }
function identityHTML() {
  if (!G) return '';
  const sel = UI.idnClub || myTeam().id;
  const list = allClubs(), cur = (list.find(x => x.t.id === sel) || list[0]).t;
  const opts = list.map(x => `<option value="${esc(x.t.id)}" ${x.t.id === cur.id ? 'selected' : ''}>${esc(x.t.short)} · ${esc(LEAGUES[x.lid === 'A3A' || x.lid === 'A3B' ? x.lid : x.lid].name)}</option>`).join('');
  return `<div class="card idn" style="margin-top:14px"><div class="row" style="justify-content:space-between"><h3>Identità club</h3><span class="pill ${cur.brandVerified ? 'good' : 'warn'}">${cur.brandVerified ? 'Colori da fonti pubbliche' : 'Colori indicativi'}</span></div>
<p class="muted small">Scegli un club, imposta i suoi colori sociali e carica il logo ufficiale da un file. Il logo resta solo su questo dispositivo.</p>
<div class="row" style="gap:14px;align-items:center;margin:10px 0">${crest(cur, 64)}<div class="grid" style="gap:8px;flex:1;min-width:0">
<label class="muted small">Club<select data-idn="club" style="width:100%">${opts}</select></label>
<div class="row" style="gap:12px"><label class="muted small">Colore 1<br><input type="color" data-idn="c1" value="${cur.color.length === 7 ? cur.color : '#2563eb'}"></label><label class="muted small">Colore 2<br><input type="color" data-idn="c2" value="${(cur.color2 || '#ffffff').length === 7 ? (cur.color2 || '#ffffff') : '#ffffff'}"></label></div></div></div>
<div class="row" style="gap:8px;flex-wrap:wrap"><label class="btn" style="cursor:pointer">Carica logo<input type="file" accept="image/*" data-idn="logo" hidden></label><button class="btn" data-idn-act="rmlogo">Rimuovi logo</button><button class="btn" data-idn-act="reset">Ripristina colori</button></div></div>`;
}
document.addEventListener('change', e => {
  const el = e.target, k = el.dataset && el.dataset.idn; if (!k || !G) return;
  const id = UI.idnClub || myTeam().id;
  if (k === 'club') { UI.idnClub = el.value; render(); return; }
  const o = brandLoad(); o[id] = o[id] || {};
  if (k === 'c1' || k === 'c2') { o[id][k] = el.value; brandSave(o); applyBrand(); render(); }
  if (k === 'logo' && el.files[0]) {
    const img = new Image(), url = URL.createObjectURL(el.files[0]);
    img.onload = () => {
      const c = document.createElement('canvas'), s = 160, r = Math.min(s / img.width, s / img.height);
      c.width = Math.round(img.width * r); c.height = Math.round(img.height * r);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url);
      o[id].logo = c.toDataURL('image/png'); if (brandSave(o)) { applyBrand(); render(); toast('Logo caricato'); }
    };
    img.onerror = () => toast('File non valido'); img.src = url;
  }
});
document.addEventListener('click', e => {
  const el = e.target.closest('[data-idn-act]'); if (!el || !G) return;
  const id = UI.idnClub || myTeam().id, o = brandLoad();
  if (el.dataset.idnAct === 'rmlogo' && o[id]) delete o[id].logo;
  if (el.dataset.idnAct === 'reset') delete o[id];
  brandSave(o); applyBrand(); render();
});

/* ===== Salvataggio: esporta / importa la carriera ===== */
function saveCardHTML() {
  if (!G) return '';
  return `<div class="card" style="margin-top:14px"><h3>Salvataggio carriera</h3><p class="muted small">Il salvataggio resta nel browser di questo dispositivo. Esporta il codice per spostarlo su un altro dispositivo o tenerne una copia.</p>
<div class="row" style="gap:8px;flex-wrap:wrap"><button class="btn" data-sv="copy">Copia codice</button><button class="btn" data-sv="show">${UI.svShow ? 'Nascondi' : 'Incolla codice'}</button></div>
${UI.svShow ? `<textarea id="sv-text" rows="4" style="width:100%;margin-top:10px" placeholder="Incolla qui il codice e premi Importa"></textarea><div class="row" style="margin-top:8px"><button class="btn primary" data-sv="import">Importa</button></div>` : ''}</div>`;
}
document.addEventListener('click', e => {
  const el = e.target.closest('[data-sv]'); if (!el || !G) return;
  const a = el.dataset.sv;
  if (a === 'copy') {
    const code = btoa(unescape(encodeURIComponent(JSON.stringify(G))));
    (navigator.clipboard ? navigator.clipboard.writeText(code) : Promise.reject()).then(() => toast('Codice copiato'), () => { UI.svShow = true; render(); const t = document.getElementById('sv-text'); if (t) { t.value = code; t.select(); } toast('Copia il codice dal riquadro'); });
  }
  if (a === 'show') { UI.svShow = !UI.svShow; render(); }
  if (a === 'import') {
    const t = document.getElementById('sv-text'); if (!t || !t.value.trim()) return toast('Incolla prima il codice');
    try { const s = JSON.parse(decodeURIComponent(escape(atob(t.value.trim())))); if (!validSave(s)) throw 0; G = s; UI.svShow = false; UI.lg = G.lid; persist(); render(); toast('Carriera importata'); } catch (err) { toast('Codice non valido'); }
  }
});
