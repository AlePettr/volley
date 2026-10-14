/* ===== Colori, hash e divise ===== */
const Gx = (() => {
  const hash = s => { let h = 2166136261; s = String(s); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
  const rng = seed => { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
  const hex2rgb = h => { h = String(h || '#888888').replace('#', ''); if (h.length === 3) h = h.split('').map(c => c + c).join(''); const n = parseInt(h, 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
  const rgb2hex = ([r, g, b]) => '#' + [r, g, b].map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
  const mix = (a, b, t) => { const A = hex2rgb(a), B = hex2rgb(b); return rgb2hex(A.map((v, i) => v + (B[i] - v) * t)); };
  const lum = c => { const [r, g, b] = hex2rgb(c).map(v => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }); return .2126 * r + .7152 * g + .0722 * b; };
  const dist = (a, b) => { const A = hex2rgb(a), B = hex2rgb(b); const rm = (A[0] + B[0]) / 2; const dr = A[0] - B[0], dg = A[1] - B[1], db = A[2] - B[2]; return Math.sqrt((2 + rm / 256) * dr * dr + 4 * dg * dg + (2 + (255 - rm) / 256) * db * db); };
  const dark = (c, t = .35) => mix(c, '#05080f', t);
  const light = (c, t = .35) => mix(c, '#ffffff', t);
  const onColor = c => (lum(c) > .45 ? '#0b1220' : '#ffffff');
  const teamOf = p => { if (!p) return null; if (typeof WORLD !== 'undefined' && WORLD[p.lid]) return WORLD[p.lid].find(t => t.id === p.teamId) || null; return null; };

  /* divisa base di un club */
  const kitCache = new Map();
  function kit(team) {
    const key = team.id + team.color + (team.color2 || '');
    if (kitCache.has(key)) return kitCache.get(key);
    const main = team.color || '#2563eb';
    const trim = team.color2 || (lum(main) > .5 ? dark(main, .62) : '#ffffff');
    const shorts = lum(main) > .55 ? dark(main, .55) : dark(main, .38);
    const k = { main, trim, shorts, num: onColor(main), shade: dark(main, .22), hi: light(main, .22) };
    kitCache.set(key, k);
    return k;
  }
  /* se due club hanno colori troppo simili, la squadra ospite usa la divisa alternativa */
  function altKit(team) {
    const k = kit(team);
    const main = lum(k.main) > .6 ? '#16233b' : '#f6f7fa';
    const trim = lum(main) > .5 ? k.main : '#ffffff';
    return { main, trim, shorts: lum(main) > .5 ? k.main : dark(main, .1), num: onColor(main), shade: dark(main, .12), hi: light(main, .2) };
  }
  function matchKits(home, away) {
    const kh = kit(home); let ka = kit(away);
    if (dist(kh.main, ka.main) < 130) ka = altKit(away);
    if (dist(kh.main, ka.main) < 130) ka = { ...ka, main: '#f6f7fa', trim: kit(away).main, shorts: kit(away).main, num: '#0b1220', shade: '#cfd5df', hi: '#ffffff' };
    const pick = (a, b) => { const cands = ['#ffd24a', '#ff8a3d', '#37d6b5', '#ffffff', '#1b2234']; let best = cands[0], bd = -1; for (const c of cands) { const d = Math.min(dist(c, a), dist(c, b)); if (d > bd) { bd = d; best = c; } } return best; };
    const lib = pick(kh.main, ka.main);
    return { h: kh, a: ka, lib, libNum: onColor(lib) };
  }
  return { hash, rng, hex2rgb, rgb2hex, mix, lum, dist, dark, light, onColor, teamOf, kit, altKit, matchKits };
})();
