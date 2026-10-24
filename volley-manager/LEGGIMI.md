# Volley Manager Italia – guida per chi continua il lavoro

Gioco manageriale di pallavolo femminile (Serie A1, A2, A3) per uso personale, giocabile da iPad/telefono nel browser.
Solo HTML, CSS e JavaScript: **nessuna build, nessun framework**. Si apre `index.html` (o la versione online su GitHub Pages).

## Come lavorare
- Modifica un file alla volta e non rinominare funzioni o variabili globali già usate in altri file (i file si caricano in ordine e si parlano tramite variabili globali).
- Dopo ogni modifica controlla la sintassi: `node --check js/nomefile.js`.
- Versione "tutto in un file" (per incollarla altrove): `python3 tools/build_single.py` crea `volley-manager-singolo.html`.
- Salvataggio: `localStorage`, chiave `volley-manager-italia-v1` (partita) e `...-w` (rose). Cambiare i dati delle giocatrici NON cambia le carriere già salvate: serve una nuova carriera.

## Ordine di caricamento (index.html)
`gfx/kit, crest, avatar, figure, arena, rally, icons` → `logos/manifest.js` → `gfx/identity, logos, led` → `data.js` → `engine.js` → `stats_ruoli.js` → `stats_lvf.js` → `ui.js` → `club.js` → `match_logic.js` → `gfx/match.js` → `manager.js` → `app.js`.

## Mappa dei file
| File | Cosa contiene |
|---|---|
| `js/data.js` | Rose reali di A1, A2, A3 (`LEAGUES`), bonus stelle, storico statistiche (`LVF_HISTORICAL_STATS`), `playerHistory()` |
| `js/engine.js` | Creazione giocatrici (`makePlayer`, generatore casuale con seme fisso), mondo (`WORLD`), simulazione partite, calendari, stagione, coppe, playoff, stipendi |
| `js/stats_ruoli.js` | Riepilogo per serie e ruolo (A1 e A2, 2024/25 → 2026/27; le centrali A1 arrivano al 2025/26). Generato dai PDF del Centro Statistiche con `tools/make_ruoli_js.py` (lettore in `tools/import_pdf.py`) |
| `js/stats_lvf.js` | Statistiche reali LVF 2024/25 e 2025/26 (A1/A2) e `applyRealStats()`, che corregge attacco/muro/battuta/ricezione dopo la creazione del mondo; ricezione A1 2025/26 per le liberi |
| `js/ui.js` | Schermate (home, rosa, mercato, scouting, viaggi, campionato), salvataggio/esportazione |
| `js/club.js`, `js/manager.js`, `js/match_logic.js` | Gestione club, allenamento/morale/conferenza stampa, logica della partita |
| `js/gfx/arenas.js` | Palazzetti ufficiali (`ARENAS`: nome, citta', capienza per squadra) e `arenaTheme()`: densita' del pubblico, file di gradoni e luci in base alla capienza. Il nome della sala compare nel tabellone; gradoni nei colori del club di casa; travi e fari solo nelle sale grandi (`drawRoof` in arena.js). A2 con sedi 2025/26 e capienze in parte stimate (`est`); da completare A3 |
| `js/gfx/scene3d.js` | Partita in 3D con Three.js r128 (caricato da cdnjs in index.html): palazzetto, rete, LED con i video, pubblico a istanze, atlete articolate dalle pose di `figure.js` (maglia con bordi e strisce, cognome e numero sulla schiena, calzettoni, ginocchiere, volto, 6 stili di capelli, movimento da ferme), camere laterale/fondo/alta. Legge le stesse entita' di `drawScene` (u,v,posa) e lascia sopra il canvas 2D per cartellini ed effetti (`Cam.p3` fa usare la camera 3D a `proj`). Se Three.js non carica o WebGL fallisce si torna al 2D; tasto 2D/3D nei comandi partita |
| `js/gfx/arena.js` | Telecamera (`camSetup`, `proj(u,v,z)`), palazzetto, campo (parquet + zona libera viola), tre viste: laterale, da fondo, da fondo alta |
| `js/gfx/match.js` | Disegno della scena, regia (zoom, replay, nomi), controlli sotto la partita |
| `js/gfx/rally.js`, `figure.js` | Coreografia dello scambio e disegno delle giocatrici con pose |
| `js/gfx/led.js` | Cartelloni LED con i video della Lega (`logos/led/*.mp4`) |
| `js/gfx/logos.js`, `identity.js`, `logos/manifest.js` | Loghi dei club/sponsor e personalizzazione colori e loghi dal gioco |

## Regole importanti
1. **Mondo con seme fisso.** `buildWorld()` in `engine.js` usa un generatore casuale con seme: aggiungere o togliere chiamate a `rng()` dentro `makePlayer` cambia TUTTE le rose. Le correzioni successive vanno fatte dopo, come in `applyRealStats()`.
2. **Coordinate del campo.** `u` = distanza dalla rete lungo il campo (±9 m), `v` = lato (±4,5 m), `z` = altezza in metri. Si disegna sempre con `proj(u, v, z)`.
3. **Loghi.** Nome del file = id del club (es. `con.png`); l'elenco è in `logos/manifest.js` e gli id sono in `logos/README.md`. Mancano ancora i 16 club di A3.
4. **Overall e tetto morbido.** Gli attributi non hanno più un tetto duro a 98: `makePlayer` lascia salire i valori (fino a 115) e `finalizeOverall()` (in `stats_lvf.js`, chiamata alla fine di `applyRealStats()`) applica `softCap()` (`data.js`): invariato fino a 84, poi sale lentamente verso 98 senza pareggi. Non toccare `rng()` e non rimettere `clamp(...,98)` dentro `makePlayer`.
5. **Aggancio nomi alle statistiche.** `playerHistory()` (`data.js`) prova nell'ordine: alias espliciti (`STAT_ALIASES`, solo casi verificati a mano), nome identico, stessi token in ordine diverso o con secondo nome, cognome unico (≥5 lettere). Se un'atleta non prende le statistiche, aggiungi un alias.
6. **Dati di un'altra serie.** Se le statistiche più recenti vengono da una serie diversa da quella attuale (es. A2 → A1), la correzione statistica pesa la metà.
7. **Inizio 2026/27.** `LVF_2026_A1_START` (`stats_lvf.js`) contiene le prime 20 del Centro Statistiche dopo circa 4 giornate; si usa solo per le atlete senza storico LVF, con un bonus piccolo. Dal sito si vede solo la A1 corrente (i parametri nell'indirizzo vengono ignorati da WebFetch): per A2 o altre stagioni servono dati copiati a mano.
8. **Statistiche per ruolo.** `applyRoleStats()` (`stats_lvf.js`) usa `stats_ruoli.js`: aggancio per nome solo tra atlete dello stesso ruolo (alias in `STAT_ALIASES`), metriche confrontate con le colleghe della stessa serie e pesate per il campione. Le atlete agganciate non passano più dal vecchio calcolo. Per aggiornare i dati: scaricare i PDF dal Centro Statistiche ("Riepilogo comparativo", un file per serie e ruolo, periodo dal 2024/25) e lanciare `python3 tools/make_ruoli_js.py file1.pdf ... > js/stats_ruoli.js`.
9. **Statistiche.** I dati LVF provengono dalle pagine ufficiali (statistiche per club) e da Volleyball World (ricezione A1 2025/26). Le liberi non hanno dati nelle tabelle per club.
5. **Colori dei club.** Molti sono stime: si correggono dal gioco, scheda "Identità club".

## Idee ancora aperte
Loghi A3 e sponsor di partita; colori reali dei club; statistiche delle liberi A2 e 2024/25; giocatrici di profilo nella vista laterale; allenamento, giovani, infortuni e trattative (rimandati).
