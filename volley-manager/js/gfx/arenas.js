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
  fir: { name: "Pala BigMat", place: "Firenze", cap: 2000, est: 1 },
  cun: { name: "PalaCastagnaretta", place: "Cuneo", cap: 4700 },
  mac: { name: "PalaFontescodella", place: "Macerata", cap: 2100 },
  mar: { name: "PalaCervia", place: "Cervia", cap: 2000 },
  tal: { name: "Palasport Latisana", place: "Latisana", cap: 1500 },
  bre: { name: "PalaGeorge", place: "Montichiari", cap: 4000 },
  per: { name: "PalaBarton", place: "Perugia", cap: 3800 },
  mon: { name: "Pala Bus Company", place: "Pinerolo", cap: 1500 },
  /* A2: sedi 2025/26 (solo Roma e' confermata per il 2026/27); capienza "est" = stima, dato non trovato */
  cos: { name: "PalaCbl", place: "Costa Volpino", cap: 1200, est: 1 },
  cas: { name: "PalaFarina", place: "Viadana", cap: 1500, est: 1 },
  imo: { name: "PalaRuggi", place: "Imola", cap: 1500, est: 1 },
  ita: { name: null, place: "Milano", cap: 800, est: 1 },
  mes: { name: "PalaRescifina", place: "Messina", cap: 2500, est: 1 },
  fut: { name: "Soevis Arena", place: "Castellanza", cap: 1200, est: 1 },
  rom: { name: "PalaTiziano", place: "Roma", cap: 1500, est: 1 },
  tre: { name: "Sanbapolis", place: "Trento", cap: 1500, est: 1 },
  mel: { name: "Palasport San Giuseppe da Copertino", place: "Lecce", cap: 1500, est: 1 },
  pad: { name: "Palazzetto di Trebaseleghe", place: "Trebaseleghe", cap: 1200, est: 1 },
  fas: { name: "Pala Vigna Marina", place: "Fasano", cap: 2200, est: 1 },
  alt: { name: "PalaBaldassarra", place: "Altamura", cap: 1500, est: 1 },
  mar2: { name: "Palestra Bellina", place: "Marsala", cap: 500, est: 1 },
  avs: { name: "Palazzetto di Vasto", place: "Vasto", cap: 1500, est: 1 },
  off: { name: "PalaCoim", place: "Offanengo", cap: 1000, est: 1 }
};
/* Tema grafico ricavato dalla scheda: sala grande = piu' file e luci piu' intense */
function arenaTheme(team) {
  const a = (team && ARENAS[team.id]) || null, cap = a ? a.cap : 2500;
  const big = cap >= 4000, mid = cap >= 2500;
  return {
    info: a && a.name ? a : null,
    density: Math.max(.45, Math.min(1.25, cap / 4000)),
    rowsFar: big ? 8 : mid ? 6 : 4,
    rowsSide: big ? 5 : mid ? 4 : 3,
    wall: big ? ['#070c18', '#17284a'] : mid ? ['#05080f', '#122036'] : ['#06070d', '#161d2c'],
    beams: big ? 3 : mid ? 2 : 0,
    light: big ? .26 : mid ? .20 : .15
  };
}
