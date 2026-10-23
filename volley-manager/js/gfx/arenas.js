/* ===== Palazzetti ufficiali: nome, citta', capienza e stile di sala =====
   Fonti: Wikipedia (Italian Women's Volleyball League 2025-26) e pagine dei club.
   Il disegno usa capienza e stile per densita' del pubblico, gradinate e luci. */
const ARENAS = {
  con: { name: "PalaVerde", place: "Villorba", cap: 5344 },
  sca: { name: "PalaWanny", place: "Firenze", cap: 3500 },
  mil: { name: "Allianz Cloud", place: "Milano", cap: 5309 },
  nov: { name: "Pala Igor Gorgonzola", place: "Novara", cap: 4000 },
  chi: { name: "PalaFenera", place: "Chieri", cap: 1506 },
  bus: { name: "E-Work Arena", place: "Busto Arsizio", cap: 4490 },
  ber: { name: "PalaFacchetti", place: "Treviglio", cap: 2880 },
  val: { name: "PalaMegabox", place: "Pesaro", cap: 2001 },
  fir: { name: "PalaWanny", place: "Firenze", cap: 3500 },
  cun: { name: "PalaCastagnaretta", place: "Cuneo", cap: 4700 },
  mac: { name: "PalaFontescodella", place: "Macerata", cap: 2100 },
  mar: { name: "PalaCervia", place: "Cervia", cap: 2000 },
  tal: { name: "Palasport Latisana", place: "Latisana", cap: 1500 },
  bre: { name: "PalaGeorge", place: "Montichiari", cap: 4000 },
  per: { name: "PalaBarton", place: "Perugia", cap: 4000 },
  mon: { name: "Pala Bus Company", place: "Pinerolo", cap: 1500 }
};
/* Tema grafico ricavato dalla scheda: sala grande = piu' file e luci piu' intense */
function arenaTheme(team) {
  const a = (team && ARENAS[team.id]) || null, cap = a ? a.cap : 2500;
  const big = cap >= 4000, mid = cap >= 2500;
  return {
    info: a,
    density: Math.max(.45, Math.min(1.25, cap / 4000)),
    rowsFar: big ? 8 : mid ? 6 : 4,
    rowsSide: big ? 5 : mid ? 4 : 3,
    wall: big ? ['#070c18', '#17284a'] : mid ? ['#05080f', '#122036'] : ['#06070d', '#161d2c'],
    light: big ? .26 : mid ? .20 : .15
  };
}
