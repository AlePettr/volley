/* ===== Stemmi SVG generati per ogni club ===== */
let _crestUid = 0;
function initials(t) {
  const stop = new Set(['di', 'del', 'della', 'dei', 'volley', 'pallavolo', 'club', 'asd', 'e']);
  const words = String(t.short || t.full || '?').replace(/[&+]/g, ' ').split(/[\s\-–']+/).filter(w => w && !stop.has(w.toLowerCase()));
  const w = words.length ? words : [String(t.short || '?')];
  if (w.length === 1) return w[0].slice(0, 3).toUpperCase();
  return (w[0][0] + w[1][0] + (w.length > 2 ? w[2][0] : '')).toUpperCase().slice(0, 3);
}
function crestSVG(t, px) {
  const id = 'c' + (++_crestUid);
  const h = Gx.hash(t.id || t.short), R = Gx.rng(h);
  const c1 = t.color || '#2563eb';
  const light = Gx.lum(c1) > .5;
  const c2 = t.color2 || (light ? Gx.dark(c1, .7) : '#ffffff');
  const c3 = light ? Gx.dark(c1, .35) : Gx.light(c1, .5);
  const shapeN = h % 4, patN = (h >> 3) % 6;
  const shapes = [
    'M32 3 L58 10 V32 C58 47 46 57 32 62 C18 57 6 47 6 32 V10 Z',
    'M32 3 A29 29 0 1 1 31.99 3 Z',
    'M32 2 L56 15 V46 L32 62 L8 46 V15 Z',
    'M8 6 H56 V36 C56 50 44 58 32 62 C20 58 8 50 8 36 Z'
  ];
  const d = shapes[shapeN];
  let pat = '';
  switch (patN) {
    case 0: pat = `<rect x="0" y="0" width="32" height="64" fill="${c3}" opacity=".55"/>`; break;
    case 1: pat = `<path d="M-4 40 L68 14 V30 L-4 56 Z" fill="${c2}" opacity=".9"/>`; break;
    case 2: pat = `<path d="M-4 24 L32 44 L68 24 V38 L32 58 L-4 38 Z" fill="${c3}" opacity=".6"/>`; break;
    case 3: pat = [0, 1, 2, 3, 4].map(i => `<rect x="0" y="${8 + i * 12}" width="64" height="6" fill="${c3}" opacity="${i % 2 ? .0 : .5}"/>`).join(''); break;
    case 4: pat = `<circle cx="32" cy="30" r="21" fill="none" stroke="${c2}" stroke-width="3" opacity=".85"/>`; break;
    default: pat = `<path d="M0 0 H64 V22 L32 34 L0 22 Z" fill="${c3}" opacity=".55"/>`;
  }
  const txt = initials(t);
  const fs = txt.length >= 3 ? 19 : txt.length === 2 ? 23 : 28;
  const tc = patN === 1 ? (light ? '#0b1220' : '#0b1220') : Gx.onColor(c1);
  const stroke = Gx.lum(tc) > .5 ? 'rgba(0,0,0,.45)' : 'rgba(255,255,255,.55)';
  const star = (h >> 7) % 3 === 0 ? `<path d="M32 9 l2.1 4.3 4.7.7-3.4 3.3.8 4.7-4.2-2.2-4.2 2.2.8-4.7-3.4-3.3 4.7-.7z" fill="${c2}"/>` : '';
  const y = patN === 4 || shapeN === 1 ? 38 : 40;
  const svg = `<svg viewBox="0 0 64 64" width="${px || 42}" height="${px || 42}" role="img" aria-label="Stemma ${esc(t.short || '')}" xmlns="http://www.w3.org/2000/svg">
<defs><clipPath id="${id}"><path d="${d}"/></clipPath><linearGradient id="${id}g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".28"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".22"/></linearGradient></defs>
<path d="${d}" fill="${c1}"/><g clip-path="url(#${id})">${pat}<rect width="64" height="64" fill="url(#${id}g)"/></g>
<path d="${d}" fill="none" stroke="${c2}" stroke-width="2.4" stroke-linejoin="round"/><path d="${d}" fill="none" stroke="rgba(0,0,0,.35)" stroke-width=".8" transform="translate(0 .8)"/>
${star}<text x="32" y="${y}" text-anchor="middle" font-family="'Barlow Condensed','Arial Narrow',sans-serif" font-weight="700" font-size="${fs}" fill="${tc}" stroke="${stroke}" stroke-width="2.2" paint-order="stroke" letter-spacing=".5">${esc(txt)}</text></svg>`;
  return svg;
}
const crest = (t, px) => `<span class="crest${t.logo ? ' logo' : ''}"${px ? ` style="--cs:${px}px"` : ''}>${t.logo ? `<img src="${t.logo}" alt="Logo ${esc(t.short || '')}" style="width:${px || 42}px;height:${px || 42}px;object-fit:contain">` : crestSVG(t, px)}</span>`;
