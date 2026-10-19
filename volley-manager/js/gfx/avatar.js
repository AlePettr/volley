/* ===== Avatar stilizzati + Foto reali automatiche (LVF / Wikipedia / Galleria iPad) ===== */
const SKIN = ['#f7d9c4', '#efc3a1', '#e0a981', '#c98b62', '#a86a45', '#7c4a2e'];
const HAIR = ['#14110f', '#2b1a12', '#4a2c1a', '#7a4a26', '#b07a3c', '#d8b36a', '#8c2f1c', '#c9c9cf'];

function avatarLook(p) {
  const h = Gx.hash((p && (p.id || p.name)) || 'x'), R = Gx.rng(h);
  const nat = (p && p.nat) || '';
  let skin = Math.floor(R() * 6);
  if (nat === 'ITA' || !nat) skin = R() < .88 ? Math.floor(R() * 3) : 2 + Math.floor(R() * 3);
  let hair = Math.floor(R() * 8); if (hair === 7 && R() < .8) hair = Math.floor(R() * 5);
  return { skin: SKIN[skin], hair: HAIR[hair], style: Math.floor(R() * 6), brow: R(), mouth: R() };
}

function avatarSVG(p, px) {
  const L = avatarLook(p), id = 'a' + (++_crestUid);
  const team = Gx.teamOf(p);
  const kit = team ? Gx.kit(team) : { main: '#64748b', trim: '#ffffff', num: '#ffffff', shade: '#475569' };
  const hairD = Gx.dark(L.hair, .25), skinD = Gx.dark(L.skin, .14);
  const back = [
    `<path d="M16 34 C14 14 50 14 48 34 L52 56 L12 56 Z" fill="${L.hair}"/>`,
    `<ellipse cx="32" cy="14" rx="9" ry="8" fill="${L.hair}"/><path d="M26 22 H38 L36 28 H28 Z" fill="${hairD}"/>`,
    `<path d="M45 24 C58 26 58 46 50 52 C52 42 49 34 44 30 Z" fill="${L.hair}"/>`,
    `<path d="M18 30 C16 12 48 12 46 30 L47 40 L17 40 Z" fill="${L.hair}"/>`,
    `<path d="M42 28 C56 32 56 50 54 60 C50 54 50 44 42 36 Z" fill="${L.hair}"/><path d="M44 36 l5 6 M46 44 l4 6" stroke="${hairD}" stroke-width="1.6"/>`,
    ``
  ][L.style];
  const front = [
    `<path d="M18 30 C18 14 46 14 46 30 C42 22 36 21 32 21 C26 21 21 24 18 30 Z" fill="${L.hair}"/>`,
    `<path d="M19 30 C19 16 45 16 45 30 C41 23 36 22 32 22 C27 22 22 25 19 30 Z" fill="${L.hair}"/>`,
    `<path d="M19 31 C17 14 47 13 45 31 C43 24 38 21 32 21 C26 21 21 24 19 31 Z" fill="${L.hair}"/>`,
    `<path d="M18 33 C16 14 48 14 46 33 C44 25 39 22 32 22 C25 22 20 25 18 33 Z" fill="${L.hair}"/>`,
    `<path d="M19 31 C18 14 46 14 45 31 C42 24 37 21 32 21 C27 21 22 24 19 31 Z" fill="${L.hair}"/>`,
    `<path d="M20 28 C19 15 45 15 44 28 C42 22 37 20 32 20 C27 20 22 22 20 28 Z" fill="${L.hair}"/><path d="M22 20 C26 16 38 16 42 20" stroke="${hairD}" stroke-width="1.5" fill="none"/>`
  ][L.style];
  return `<svg viewBox="0 0 64 64" width="${px || 44}" height="${px || 44}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
<defs><clipPath id="${id}"><circle cx="32" cy="32" r="31"/></clipPath><linearGradient id="${id}b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${Gx.light(kit.main, .55)}"/><stop offset="1" stop-color="${kit.main}"/></linearGradient></defs>
<g clip-path="url(#${id})"><rect width="64" height="64" fill="url(#${id}b)" opacity=".5"/>
${back}
<path d="M10 66 C10 52 20 47 32 47 C44 47 54 52 54 66 Z" fill="${kit.main}"/><path d="M24 47 C26 53 38 53 40 47 L38 46 C36 50 28 50 26 46 Z" fill="${kit.trim}"/>
<rect x="27.5" y="38" width="9" height="11" rx="3" fill="${skinD}"/>
<ellipse cx="32" cy="30" rx="12.5" ry="14" fill="${L.skin}"/>
<ellipse cx="19.8" cy="31" rx="2" ry="3" fill="${L.skin}"/><ellipse cx="44.2" cy="31" rx="2" ry="3" fill="${L.skin}"/>
${front}
<circle cx="27" cy="31" r="1.35" fill="#1b1b1f"/><circle cx="37" cy="31" r="1.35" fill="#1b1b1f"/>
<path d="M23.5 ${27 + L.brow * 1.2} q3.5-2 7 0 M33.5 ${27 + L.brow * 1.2} q3.5-2 7 0" stroke="${hairD}" stroke-width="1.3" fill="none" stroke-linecap="round"/>
<path d="M28.3 37.2 q3.7 ${2 + L.mouth * 1.6} 7.4 0" stroke="#7a3b3b" stroke-width="1.4" fill="none" stroke-linecap="round"/>
</g></svg>`;
}

/* ===== Gestione Foto Reali (Cache su iPad + Ricerca Automatica LVF/Wiki) ===== */
const FACE_STORAGE_KEY = 'vm_faces_v1';
const SURNAME_FULL = {
  'haak': 'Isabelle Haak', 'wolosz': 'Joanna Wolosz', 'gabi': 'Gabriela Guimaraes',
  'skinner': 'Avery Skinner', 'ognjenovic': 'Maja Ognjenovic', 'tolok': 'Tatiana Tolok',
  'alsmeier': 'Lina Alsmeier', 'herbots': 'Britt Herbots', 'kurtagic': 'Hena Kurtagic',
  'cekulaev': 'Anastasia Cekulaev', 'bici': 'Erblira Bici', 'nemeth': 'Anett Nemeth',
  'kipp': 'Kendall Kipp', 'pucelj': 'Masa Pucelj', 'kavalenka': 'Julia Kavalenka',
  'sillah': 'Fatoumatta Sillah', 'seki': 'Nanami Seki', 'parra': 'Melanie Parra'
};

let _faceCache = null;
const _facePending = new Set();
const _faceQueue = [];
let _faceRunning = false;

function faceLoadCache() {
  if (_faceCache) return _faceCache;
  try { _faceCache = JSON.parse(localStorage.getItem(FACE_STORAGE_KEY)) || {}; } catch (e) { _faceCache = {}; }
  return _faceCache;
}
function faceSaveCache() {
  if (!_faceCache) return;
  try { localStorage.setItem(FACE_STORAGE_KEY, JSON.stringify(_faceCache)); } catch (e) {}
}
function faceKey(name) {
  return String(name || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}
function fullSearchName(name) {
  const clean = String(name || '').trim();
  const k = faceKey(clean);
  if (SURNAME_FULL[k]) return SURNAME_FULL[k];
  // Cerca se nelle statistiche LVF c'è il nome completo corrispondente al solo cognome
  if (clean.indexOf(' ') < 0 && typeof LVF_HISTORICAL_STATS !== 'undefined') {
    const found = LVF_HISTORICAL_STATS.find(x => faceKey(x.name).endsWith('_' + k));
    if (found && found.name) return found.name;
  }
  return clean;
}

async function fetchAthletePhoto(fullName) {
  const surname = faceKey(fullName.split(/\s+/).pop());
  // 1) Prova l'archivio fotografico ufficiale di Lega Volley Femminile
  try {
    const q = encodeURIComponent(fullName);
    const r = await fetch(`https://www.legavolleyfemminile.it/wp-json/wp/v2/media?search=${q}&per_page=5`);
    if (r.ok) {
      const items = await r.json();
      if (Array.isArray(items)) {
        for (const it of items) {
          const src = it.source_url || '';
          const slug = faceKey((it.slug || '') + ' ' + ((it.title && it.title.rendered) || ''));
          if (src && slug.includes(surname) && !/logo|banner|sponsor|icon/i.test(src)) {
            const sizes = (it.media_details && it.media_details.sizes) || {};
            return (sizes.medium && sizes.medium.source_url) || (sizes.thumbnail && sizes.thumbnail.source_url) || src;
          }
        }
      }
    }
  } catch (e) {}

  // 2) Fallback su Wikipedia (IT e EN) per le stelle internazionali e italiane
  for (const lang of ['it', 'en']) {
    try {
      const title = encodeURIComponent(fullName.replace(/\s+/g, '_'));
      const r = await fetch(`https://${lang}.wikipedia.org/api/rest_v1/page/summary/${title}`);
      if (r.ok) {
        const d = await r.json();
        if (d && d.thumbnail && d.thumbnail.source) return d.thumbnail.source;
      }
    } catch (e) {}
  }
  return null;
}

function processFaceQueue() {
  if (_faceRunning || !_faceQueue.length) return;
  _faceRunning = true;
  const { key, fullName } = _faceQueue.shift();
  fetchAthletePhoto(fullName).then(url => {
    const cache = faceLoadCache();
    cache[key] = url || 'none';
    faceSaveCache();
    if (url && typeof document !== 'undefined') {
      document.querySelectorAll(`img[data-face-key="${key}"]`).forEach(img => {
        img.src = url;
        img.style.display = 'block';
      });
    }
  }).finally(() => {
    _faceRunning = false;
    setTimeout(processFaceQueue, 120);
  });
}

function requestFace(p) {
  if (!p || p.gen || !p.name) return null;
  const key = faceKey(p.name);
  const cache = faceLoadCache();
  if (key in cache) return cache[key] === 'none' ? null : cache[key];
  if (!_facePending.has(key)) {
    _facePending.add(key);
    _faceQueue.push({ key, fullName: fullSearchName(p.name) });
    setTimeout(processFaceQueue, 40);
  }
  return null;
}

const avatar = (p, px, opts) => {
  const o = opts || {};
  const size = px || 44;
  const key = p && p.name ? faceKey(p.name) : '';
  const url = requestFace(p);
  const imgTag = key
    ? `<img data-face-key="${key}" src="${url ? esc(url) : ''}" alt="" loading="lazy" style="width:${size}px;height:${size}px;object-fit:cover;object-position:top center;border-radius:50%;position:absolute;top:0;left:0;z-index:2;display:${url ? 'block' : 'none'}" onerror="this.style.display='none'">`
    : '';
  return `<span class="avatar${o.cls ? ' ' + o.cls : ''}" style="--as:${size}px;position:relative;display:inline-block;overflow:hidden">${avatarSVG(p, size)}${imgTag}${o.role === false ? '' : `<i class="av-role" style="z-index:3">${esc(p.role || '')}</i>`}</span>`;
};

/* Permette di caricare o cambiare la foto di qualsiasi giocatrice dalla Galleria dell'iPad */
document.addEventListener('change', e => {
  const el = e.target;
  if (!el || !el.dataset || !el.dataset.faceUpload || !el.files || !el.files[0]) return;
  const key = el.dataset.faceUpload;
  const img = new Image(), url = URL.createObjectURL(el.files[0]);
  img.onload = () => {
    const c = document.createElement('canvas'), s = 160;
    const minSide = Math.min(img.width, img.height);
    c.width = s; c.height = s;
    c.getContext('2d').drawImage(img, (img.width - minSide) / 2, 0, minSide, minSide, 0, 0, s, s);
    URL.revokeObjectURL(url);
    const cache = faceLoadCache();
    cache[key] = c.toDataURL('image/jpeg', 0.82);
    faceSaveCache();
    if (typeof render === 'function') render();
    if (typeof toast === 'function') toast('Foto giocatrice salvata');
  };
  img.src = url;
});
