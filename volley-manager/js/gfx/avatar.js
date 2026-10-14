/* ===== Avatar stilizzati delle giocatrici (generati dal nome, sempre uguali per la stessa atleta) ===== */
const SKIN = ['#f7d9c4', '#efc3a1', '#e0a981', '#c98b62', '#a86a45', '#7c4a2e'];
const HAIR = ['#14110f', '#2b1a12', '#4a2c1a', '#7a4a26', '#b07a3c', '#d8b36a', '#8c2f1c', '#c9c9cf'];
function avatarLook(p) {
  const h = Gx.hash((p && (p.id || p.name)) || 'x'), R = Gx.rng(h);
  const nat = (p && p.nat) || '';
  let skin = Math.floor(R() * 6);
  /* distribuzione realistica: la maggior parte delle atlete italiane ha carnagione chiara */
  if (nat === 'ITA' || !nat) skin = R() < .88 ? Math.floor(R() * 3) : 2 + Math.floor(R() * 3);
  let hair = Math.floor(R() * 8); if (hair === 7 && R() < .8) hair = Math.floor(R() * 5);
  return { skin: SKIN[skin], hair: HAIR[hair], style: Math.floor(R() * 6), brow: R(), mouth: R() };
}
function avatarSVG(p, px) {
  const L = avatarLook(p), id = 'a' + (++_crestUid);
  const team = Gx.teamOf(p);
  const kit = team ? Gx.kit(team) : { main: '#64748b', trim: '#ffffff', num: '#ffffff', shade: '#475569' };
  const hairD = Gx.dark(L.hair, .25), skinD = Gx.dark(L.skin, .14);
  /* capelli dietro la testa */
  const back = [
    `<path d="M16 34 C14 14 50 14 48 34 L52 56 L12 56 Z" fill="${L.hair}"/>`,                       // lunghi
    `<ellipse cx="32" cy="14" rx="9" ry="8" fill="${L.hair}"/><path d="M26 22 H38 L36 28 H28 Z" fill="${hairD}"/>`, // chignon
    `<path d="M45 24 C58 26 58 46 50 52 C52 42 49 34 44 30 Z" fill="${L.hair}"/>`,                  // coda di lato
    `<path d="M18 30 C16 12 48 12 46 30 L47 40 L17 40 Z" fill="${L.hair}"/>`,                       // caschetto
    `<path d="M42 28 C56 32 56 50 54 60 C50 54 50 44 42 36 Z" fill="${L.hair}"/><path d="M44 36 l5 6 M46 44 l4 6" stroke="${hairD}" stroke-width="1.6"/>`, // treccia
    ``                                                                                                  // corti
  ][L.style];
  const front = [
    `<path d="M18 30 C18 14 46 14 46 30 C42 22 36 21 32 21 C26 21 21 24 18 30 Z" fill="${L.hair}"/>`,
    `<path d="M19 30 C19 16 45 16 45 30 C41 23 36 22 32 22 C27 22 22 25 19 30 Z" fill="${L.hair}"/>`,
    `<path d="M19 31 C17 14 47 13 45 31 C43 24 38 21 32 21 C26 21 21 24 19 31 Z" fill="${L.hair}"/>`,
    `<path d="M18 33 C16 14 48 14 46 33 C44 25 39 22 32 22 C25 22 20 25 18 33 Z" fill="${L.hair}"/>`,
    `<path d="M19 31 C18 14 46 14 45 31 C42 24 37 21 32 21 C27 21 22 24 19 31 Z" fill="${L.hair}"/>`,
    `<path d="M20 28 C19 15 45 15 44 28 C42 22 37 20 32 20 C27 20 22 22 20 28 Z" fill="${L.hair}"/><path d="M22 20 C26 16 38 16 42 20" stroke="${hairD}" stroke-width="1.5" fill="none"/>`
  ][L.style];
  const num = p && p.num ? p.num : '';
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
const avatar = (p, px, opts) => {
  const o = opts || {};
  return `<span class="avatar${o.cls ? ' ' + o.cls : ''}" style="--as:${px || 44}px">${avatarSVG(p, px)}${o.role === false ? '' : `<i class="av-role">${esc(p.role || '')}</i>`}</span>`;
};
