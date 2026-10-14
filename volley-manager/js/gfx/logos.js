/* ===== Loghi da file (cartella logos/) e sponsor di lega ===== */
const LEAGUE_SPONSORS = [
  { id: 'fineco', name: 'FINECO', main: true },
  { id: 'frecciarossa', name: 'FRECCIAROSSA' },
  { id: 'fiat', name: 'FIAT' },
  { id: 'md', name: 'MD' }
];
const SPONSOR_FILE = {};
(function () {
  const man = window.LOGO_MANIFEST || {};
  for (const id in (man.sponsors || {})) SPONSOR_FILE[id] = 'logos/sponsors/' + man.sponsors[id];
})();
const clubFile = id => { const m = (window.LOGO_MANIFEST || {}).clubs || {}; return m[id] ? 'logos/clubs/' + m[id] : null; };
/* i loghi caricati a mano dall'utente hanno la precedenza su quelli in cartella */
const _applyBrandBase = applyBrand;
applyBrand = function () {
  _applyBrandBase();
  for (const lid in WORLD) if (Array.isArray(WORLD[lid])) for (const t of WORLD[lid]) if (!t.logo) t.logo = clubFile(t.id);
};
