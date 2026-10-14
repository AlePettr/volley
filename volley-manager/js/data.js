/* Dati: squadre, rose reali 2026/27, statistiche storiche LVF e tabelle viaggi */
const LEAGUES = { A1: { name: "Serie A1", rounds: 26, teams: [ { id: "con", short: "Conegliano", full: "Prosecco DOC Imoco Conegliano", city: "Conegliano", tier: 5.0, color: "#1d4ed8", p: ["C|Linda Manfredini||","C|Raphaela Folie||","S|Anna Piovesan||","L|Monica De Gennaro||","L|Elena Arici||","O|Merit Adigwe||","C|Sarah Fahr||","C|Cekulaev||","S|Gabi||","O|Haak||","S|Sillah||","P|Wolosz||","S|Zhu Ting||","P|Yao Di||"] }, { id: "sca", short: "Scandicci", full: "Savino Del Bene Scandicci", city: "Scandicci", tier: 4.8, color: "#be123c", p: ["P|Chidera Eze||","L|Imma Sirressi||","S|Sofia D'Odorico||","S|Caterina Bosetti||","L|Martina Armini||","C|Emma Graziani||","C|Linda Nwakalor||","C|Sara Alberti||","P|Ognjenovic||","S|Skinner||","C|Aleksic||","S|Bergmann||","O|Van Hecke||","O|Van Ryk||"] }, { id: "mil", short: "Milano", full: "Numia Vero Volley Milano", city: "Milano", tier: 4.9, color: "#111827", p: ["P|Francesca Bosio||","P|Giulia Gennari||","L|Virginia Paola Di Napoli||","L|Eleonora Fersino||","C|Benedetta Maria Sartori||","C|Anna Danesi||","O|Paola Egonu||","O|Binto Diop||","S|Rebecca Piva||","C|Kurtagic||","S|Lanier||","C|Dautova||","S|Sato||","S|Vázquez Gomez||"] }, { id: "nov", short: "Novara", full: "Igor Gorgonzola Novara", city: "Novara", tier: 4.2, color: "#0369a1", p: ["P|Carlotta Cambi||","P|Giulia Carraro||","C|Federica Squarcini||","C|Benedetta Bartolini||","C|Sara Bonifacio||","L|Giulia De Nardi||","L|Ilenia Moro||","S|Elena Perinelli||","S|Alsmeier||","S|Herbots||","O|Tolok||","C|Awoleye||","O|Grobelna||","C|Gambatto Kudiess||","O|Weske||"] }, { id: "chi", short: "Chieri", full: "Reale Mutua Fenera Chieri '76", city: "Chieri", tier: 3.9, color: "#b91c1c", p: ["L|Alessia Regoni||","L|Ilaria Spirito||","C|Katja Eckl||","C|Marina Lubian||","C|Yasmina Akrari||","S|Stella Nervini||","O|Marina Giacomello||","C|Gray||","O|Németh||","P|van Aalen||","S|Cooper||","S|Eggleston||","P|Glaab||","S|Guezen||","C|Stuut||"] }, { id: "bus", short: "Busto Arsizio", full: "Laica Cioccolato UYBA Busto Arsizio", city: "Busto Arsizio", tier: 3.5, color: "#f59e0b", p: ["P|Asia Spaziano||","C|Matilde Munarini||","C|Maia Carlotta Monaco||","C|Dalila Marchesini||","C|Alice Torcolacci||","L|Francesca Parlangeli||","L|Federica Pelloni||","S|Valeria Battista||","O|Ajack Jhon Majak Malual||","S|Parra||","P|Seki||","S|Akimoto||","S|Grozer||","S|Wada||"] }, { id: "ber", short: "Bergamo", full: "Volley Bergamo 1991", city: "Bergamo", tier: 3.5, color: "#15803d", p: ["P|Ilaria Battistoni||","P|Safa Allaoui||","C|Giada Agazzi||","C|Denise Meli||","C|Maria Adelaide Babatunde||","L|Anna Rocca||","S|Maria Teresa Bassi||","S|Elena Pietrini||","S|Erika Esposito||","S|Federica Carletti||","O|Kipp||","L|Gelin||","S|Stigrot||","S|Ungureanu||","C|Van Avermaet||"] }, { id: "val", short: "Vallefoglia", full: "Megabox Ond. Savio Vallefoglia", city: "Vallefoglia", tier: 3.2, color: "#0e7490", p: ["P|Ulrike Bridi||","L|Sophie Andrea Blasi||","L|Chiara De Bortoli||","C|Sonia Candi||","S|Alessia Bolzonetti||","S|Gaia Giovannini||","S|Loveth Omoruyi||","O|Bici||","S|Bierria||","O|Davidovic||","P|Gray||","C|Kochurina||","C|Varela Gómez||"] }, { id: "fir", short: "Firenze", full: "Azzurra Volley Firenze / Il Bisonte Firenze", city: "Firenze", tier: 3.1, color: "#7e22ce", p: ["P|Beatrice Agrifoglio||","P|Jennifer Boldini||","C|Nausica Acciarri||","C|Federica Piacentini||","C|Sara Caruso||","L|Beatrice Negretti||","L|Sofia Valoppi||","L|Giulia Fanfani||","S|Aneta Zojzi||","S|Alice Tanase||","S|Baird||","S|Damaske||","O|Cugno||","O|Lokhmanchuk||"] }, { id: "cun", short: "Cuneo", full: "Granda Volley Cuneo", city: "Cuneo", tier: 3.0, color: "#dc2626", p: ["P|Laura Pasquino||","P|Noemi Signorile||","C|Ludovica Guidi||","C|Sofia Ferrarini||","L|Carola Bonafede||","L|Linda Magnani||","C|Koulisiani||","S|Pucelj||","S|Baka||","S|Cucu||","O|Grafort||","O|McBride||","S|Tik homirova||"] }, { id: "mac", short: "Macerata", full: "CBF Balducci Macerata", city: "Macerata", tier: 2.8, color: "#0f766e", p: ["P|Roberta Carraro||","P|Asia Bonelli||","C|Chiara Landucci||","C|Alessia Mazzon||","C|Bianca Farriol||","C|Alessia Mazzaro||","L|Melissa Tesi||","L|Giorgia Caforio||","S|Nicole Piomboni||","S|Beatrice Gardini||","O|Clara Decortes||","S|Schut||","O|Stoyanova||"] }, { id: "mar", short: "Marignano", full: "Omag Consolini Volley 1907", city: "S. Giovanni", tier: 2.6, color: "#ea580c", p: ["P|Anita Bagnoli||","P|Rachele Morello||","C|Veronica Costantini||","C|Margherita Brandi||","L|Rebecca Scialanca||","L|Sara Panetoni||","S|Martina Bracchi||","S|Alice Nardo||","S|Dominika Giuliani||","O|Anna Adelusi||","C|Wilson||","O|Eroktay||","C|Jehlářová||","S|Rivero||"] }, { id: "tal", short: "Talmassons", full: "CDA Volley Talmassons FVG", city: "Talmassons", tier: 2.5, color: "#2563eb", p: ["P|Francesca Scola||","C|Karin Barbazeni||","C|Islam Gannar||","C|Beatrice Molinaro||","L|Alessandra Mistretta||","L|Aurora Cassan||","S|Aurora Rossetto||","O|Giorgia Frosini||","O|Amelie Vighetto||","S|Bakodimou||","S|Grabić||","C|Herrera Blanco||","S|Lengweiler||","P|Schmit||"] }, { id: "bre", short: "Brescia", full: "Millenium Brescia", city: "Brescia", tier: 2.4, color: "#1e40af", p: ["P|Caterina Schillkowski||","P|Valentina Bartolucci||","C|Rossella Olivotto||","C|Dalila Modestino||","L|Beatrice Parrocchiale||","L|Paola Ruggieri||","S|Giorgia Amoruso||","S|Rachele Nardelli||","O|Kavalenka||","S|Bytsenko||","C|Marković||","O|Mihaljević||","S|Novosel||","S|Ven eva||"] } ]}, A2: { name: "Serie A2", rounds: 34, teams: [ { id: "per", short: "Perugia", full: "Bartoccini +Energia Perugia", city: "Perugia", tier: 4.0, color: "#b91c1c", p: ["P|Cecilia Nicolini|ITA|1994","P|Giovanna Fratangelo|ITA|2007","O|Sofia Biagianti|ITA|2007","O|Lena Große Scharmann|GER|1998","S|Carolina Martinelli|ITA|2005","S|Francesca Michieletto|ITA|1997","S|Alessia Fiesoli|ITA|1994","S|Natasza Ornoch|POL|2007","C|Claudia Consoli|ITA|2002","C|Valentina Colombo|ITA|2003","C|Giulia Mancini|ITA|1998","L|Stefania Recchia|ITA|2005","L|Aurora Brambilla|ITA|2007"] }, { id: "cos", short: "Vallecamonica", full: "Pallavolo Vallecamonica Sebino / C.B.L. Costa Volpino", city: "Costa Volpino", tier: 3.5, color: "#0369a1", p: ["P|Francesca Dell'Orto|ITA|2003","P|Giulia Nonato|ITA|2005","O|Arianna Populini|ITA|2005","O|Monika Krasteva|BUL|1999","S|Puck Hoogers|NED|2003","S|Marika Longobardi|ITA|1998","S|Carolina Fumagalli|ITA|2004","S|Giulia Viscioni|ITA|2004","C|Alessandra Talarico|ITA|2007","C|Valeria Pizzolato|ITA|1999","C|Fatim Kone|ITA|2000","L|Nicole Gamba|ITA|1998","L|Nicole Busetti|ITA|2005"] }, { id: "cas", short: "Casalmaggiore", full: "Volleyball Casalmaggiore", city: "Casalmaggiore", tier: 3.5, color: "#7c3aed", p: ["P|Alice Bernardeschi|ITA|2004","P|Vittoria Prandi|ITA|1994","O|Natasha Calkins|CAN|1996","O|Chiara Muzi|ITA|1998","S|Alessia Populini|ITA|2000","S|Layla Viti|ITA|2008","S|Irene Mescoli|ITA|2006","S|Sara Loda|ITA|1990","C|Ilaria Menon|ITA|2005","C|Sara Tajè|ITA|1998","C|Betsy Nwokoye|ITA|2005","C|Miranda Zanella|ITA|2008","L|Ludovica Franzoso|ITA|2003","L|Arianna Gambini|ITA|2005"] }, { id: "imo", short: "Imola", full: "Clai Imola Volley", city: "Imola", tier: 3.1, color: "#15803d", p: ["P|Sofia Cavalli|ITA|1998","P|Elena Foresi|ITA|2000","O|Serena Ortolani|ITA|1987","O|Sveva Mugnaini|ITA|2005","S|Bianca Orlandi|ITA|2003","S|Sofia Taiani|ITA|2002","S|Lisa Esposito|ITA|2005","S|Asja Zolota|CRO|2008","C|Alessandra Colzi|ITA|1997","C|Ada Fabbri|ITA|2005","C|Chiara Bergese|ITA|2003","L|Chiara Adorni|ITA|2004","L|Agata Tellone|ITA|2002"] }, { id: "ita", short: "Club Italia", full: "Club Italia", city: "Milano - Roma", tier: 2.2, color: "#1d4ed8", p: ["P|Andrea Carlotta Monetti|ITA|2008","P|Vanessa Hernandez|ITA|2008","O|Alexandra Nikolaeva Baleva|ITA|2008","O|Mariia Solovei|UKR|2009","S|Stella Caruso|ITA|2008","S|Giulia Voerzio|ITA|2009","S|Ludovica Tosini|ITA|2008","S|Giulia Faleschini|ITA|2009","C|Giulia Savioli|ITA|2008","C|Alice Guerra|ITA|2008","C|Ginevra Neri|ITA|2008","C|Letizia Feriozzi|ITA|2008","L|Sofia Giulì|ITA|2008","L|Stella Cornelli|ITA|2008"] }, { id: "mes", short: "Messina", full: "Akademia Messina", city: "Messina", tier: 2.6, color: "#ea580c", p: ["P|Sara Colombano|ITA|2000","P|Gaia Guiducci|ITA|2002","O|Saana Lindgren|FIN|2000","S|Caterina Peroni|ITA|2007","S|Sara Bellia|ITA|2004","S|Payton Henderson|CAN|2003","S|Elisabeth Caruso|ITA|2007","C|Veronica Quero|ITA|2007","C|Martina Pegoraro|ITA|2002","C|Laura Franceschini|ITA|2006","L|Sofia Gazzola|ITA|2006","L|Elena Rolando|ITA|1999"] }, { id: "fut", short: "Futura Busto", full: "Futura Giovani Busto Arsizio", city: "Busto Arsizio", tier: 2.6, color: "#f59e0b", p: ["P|Helena Sassolini|ITA|2005","P|Natasha Spinello|ITA|1998","P|Eleonora Muscetti|ITA|2002","O|Edinara Brancher|BRA|1996","O|Gaia Moroni|ITA|2005","S|Brunella Fusco|ITA|2007","S|Emili Ndoci|ITA|2006","S|Emma Cagnin|ITA|2002","S|Mija Šiftar|SLO|2006","C|Francesca Cosi|ITA|2000","C|Giulia Marconato|ITA|2003","C|Sofia Moroni|ITA|2007","L|Giada Di Mario|ITA|2004","L|Serena Scognamillo|ITA|2001"] }, { id: "rom", short: "Roma", full: "Ferraro SMI Roma Volley", city: "Roma", tier: 3.5, color: "#9a3412", p: ["P|Sofia Turlà|ITA|1998","P|Margherita Muzi|ITA|1994","O|Nikoleta Perović|MNE|1994","S|Teresa Bosso|ITA|2005","S|Carolina Pecorari|ITA|2003","S|Ana Escamilla|ESP|1998","S|Kata Török|HUN|1998","C|Giulia Polesello|ITA|2004","C|Chiara Biesso|ITA|2002","C|Melissa Martinelli|ITA|1993","L|Federica Baratella|ITA|2006","L|Giorgia Zannoni|ITA|1998"] }, { id: "tre", short: "Trentino", full: "Itas Trentino", city: "Trento", tier: 3.0, color: "#b91c1c", p: ["P|Emma Rizzieri|ITA|2002","P|Sofia Monza|ITA|2002","O|Polona Frelih|SLO|2004","S|Virginia Ristori|ITA|1999","S|Emma Galbero|ITA|2001","S|Alice Pamio|ITA|1998","S|Martina Susio|ITA|2007","S|Emily Colombo|ITA|2007","S|Alexandra Ravarini|ITA|2005","C|Ludovica Sismondi|ITA|2007","C|Arianna Bovolenta|ITA|2008","C|Greta Iob|ITA|2006","L|Sofia Luchi|ITA|2008","L|Rebecca Laporta|ITA|2003"] }, { id: "mel", short: "Melendugno", full: "Narconon Volley Melendugno", city: "Melendugno", tier: 3.0, color: "#0e7490", p: ["P|Giorgia Compagnin|ITA|2005","P|Giorgia Avenia|ITA|1994","O|Margherita Meoni|ITA|2005","O|Polina Malik|ISR|1998","S|Gaia Novello|ITA|2007","S|Perla Massaglia|ITA|2008","S|Beatrice Perfetto|ITA|2005","S|Natalia Lijewska|POL|2001","C|Aurora Micheletti|ITA|2005","C|Arianna Tomasetig|ITA|2001","C|Lara Gianfico|ITA|2002","L|Aurora Morandini|ITA|2000","L|Gaia Roserba|ITA|2008"] }, { id: "pad", short: "Altafratte Padova", full: "Nuvolì Altafratte Padova", city: "Trebaseleghe", tier: 3.1, color: "#1e3a8a", p: ["C|Laura Bovo|ITA|1996", "S|Giulia Bozzoli|ITA|2004", "S|Cristina Fiorio|ITA|1997", "C|Gaia Genovese|ITA|2007", "L|Celeste Sposetti Perissinotto|ITA|2005", "L|Marianna Maggipinto|ITA|1996", "C|Greta Catania|ITA|2004", "P|Rebecca Mirarchi|ITA|2006", "S|Chiara Mason|ITA|2000", "S|Giulia Angelina|ITA|1997", "O|Genevieve Lewis|USA|2004", "P|Martina Stocco|ITA|2000", "O|Giorgia Mazzon|ITA|1998"] }, { id: "fas", short: "Fasano", full: "Olio Pantaleo Volley Fasano", city: "Fasano", tier: 3.0, color: "#16a34a", p: ["P|Alice Turco|ITA|2000","P|Nicole Da Pos|ITA|2007","O|Piia Korhonen|FIN|1997","O|Federica Favaretto|ITA|2002","S|Beatrice Pozzoni|ITA|1995","S|Candela Salinas|ARG|2000","S|Ilaria Maiorano|ITA|2004","S|Katarina Bulovic|ITA|2002","C|Isabella Lavagnino|ITA|2007","C|Chiara Salvatori|ITA|2003","C|Anna Caneva|ITA|1992","L|Martina Bondavalli|ITA|2004","L|Federica Vittorio|ITA|1991"] }, { id: "alt", short: "Altamura", full: "Leonessa Volley Altamura", city: "Altamura", tier: 2.9, color: "#be123c", p: ["P|Valeria Caracuta|ITA|1987","P|Ester Serafini|ITA|2001","O|Ashley Adubea|ITA|2003","O|Dezirett Madan|CUB|2002","S|Alice Cacciatore|ITA|2006","S|Eva Svobodová|CZE|1997","S|Alessia Arciprete|ITA|1997","S|Nicole Mastrangelo|ITA|2008","S|Rosanna Montarulo|ITA|2007","C|Emanuela Agbortabi|ITA|2002","C|Francesca Evola|ITA|2005","C|Lea Orlandi|ITA|2006","C|Alessia Pulliero|ITA|2004","C|Giorgia Gismondi|ITA|2009","L|Giulia Biagini|ITA|2000","L|Noemi D'Onofrio|ITA|2003"] }, { id: "mar2", short: "Marsala", full: "Marsala Volley", city: "Marsala", tier: 2.9, color: "#0369a1", p: ["P|Veronica Allasia|ITA|2000","P|Erin Grippo|ITA|2002","O|Anja Ašonja|SRB|1999","O|Federica Nonnati|ITA|1999","S|Nelly Adamczewska|POL|2008","S|Sara Dodi|ITA|2007","S|Victoria Sassolini|ITA|2005","S|Elisa Bole|ITA|2003","C|Giulia Caserta|ITA|1999","C|Gaia Biondi|ITA|2003","C|Maria Marcuzzi|ITA|2004","L|Luna Cicola|ITA|2004","L|Chiara Lo Dico|ITA|2008"] }, { id: "avs", short: "Altino", full: "Tenaglia Altino Avastese Volley", city: "Altino", tier: 2.5, color: "#ca8a04", p: ["P|Camilla Lupoli|ITA|2003","P|Florencia Ferraro|ARG|2001","O|Sara Stival|ITA|2001","O|Valentina Omonoyan|ITA|2005","S|Claudia Provaroni|ITA|1998","S|Adji Astou Ndoye|SEN|2006","S|Gaia Riva|ITA|2000","S|Gaia Farelli|ITA|2006","C|Sara Mori|ITA|2008","C|Amelie Joyce Pixner|ITA|2006","C|Viola Tonello|ITA|1994","C|Giorgia Bernasconi|ITA|2001","L|Ilaria Maiezza|ITA|2006","L|Martina Ferrara|ITA|1999"] }, { id: "off", short: "Offanengo", full: "Dragons Volleyball Offanengo", city: "Offanengo", tier: 2.4, color: "#15803d", p: ["P|Sara Cakovic|ITA|2007","P|Emma Magnabosco|ITA|2006","O|Veronica Taborelli|ITA|1994","S|Chiara Costagli|ITA|1998","S|Arianna Visentin|ITA|2006","S|Giulia Resmini|ITA|2005","S|Jessica Joly|ITA|2000","C|Benedetta Campagnolo|ITA|2003","C|Sara Pedrolli|ITA|2007","C|Silene Martinelli|ITA|2006","L|Camilla Riccardi|ITA|2000","L|Alice Feduzzi|ITA|2006"] }, { id: "mon", short: "Monviso", full: "Wash4Green Monviso Volley", city: "Pinerolo", tier: 3.0, color: "#be185d", p: ["P|Ludovica Mennecozzi|ITA|2003","P|Maria Irene Ricci|ITA|1996","O|Irbe Lazda|LAT|2001","O|Olimpia Cicogna|ITA|1997","S|Francesca Bosso|ITA|2002","S|Bianca Bucciarelli|ITA|2001","S|Alyssa Enneking|USA|1997","S|Aurora Pistolesi|ITA|1999","C|Nicole Modesti|ITA|2004","C|Sveva Parini|ITA|2001","C|Alice Farina|ITA|2000","L|Manuela Ribechi|ITA|2004","L|Emma Bonansea|ITA|2006","L|Giulia De Nardi|ITA|1994"] } ]},   A3A: { name: "Serie A3 - Girone A", rounds: 14, teams: [
    { id: "mon_a3", short: "Mondovì", full: "Mondovì Volley", city: "Mondovì", tier: 2.6, color: "#c2185b", p: [
      "P|Valentina Brandi|ITA|2004", "P|Matilde Rostagno|ITA|2006",
      "O|Maria Sofia Barbaro|ITA|2003", "O|Petra Di Blasi|ITA|2009",
      "S|Sofia Cusma|ITA|0", "S|Vivien Di Diego|ITA|0", "S|Emma Cantamessi|ITA|2007", "S|Anna Sclavo|ITA|2009", "S|Simona Sciarrotta|ITA|0",
      "C|Anna Aliberti|ITA|0", "C|Martina Veneriano|ITA|0", "C|Melissa Mattioli|ITA|0",
      "L|Michelle Gueli|ITA|0", "L|Anna Imarisio|ITA|0"
    ] },
    { id: "con_a3", short: "Concorezzo", full: "Pallavolo Concorezzo", city: "Concorezzo", tier: 2.5, color: "#dc2626", p: [
      "P|Giulia Pasini|ITA|2004"
    ] },
    { id: "gar_a3", short: "Garlasco", full: "Volley 2001 Garlasco", city: "Garlasco", tier: 2.4, color: "#15803d", p: [
      "P|Mariaelena Aluigi|ITA|2001", "P|Camilla Trevisan|ITA|2007",
      "O|Chiara Rognoni|ITA|2007", "O|Marta Prinetti|ITA|0"
    ] },
    { id: "vig_a3", short: "Florens Vigevano", full: "INT – Florens Vigevano", city: "Vigevano", tier: 2.5, color: "#2563eb", p: [
      "O|Glenda Messaggi|ITA|1999", "S|Lucrezia Rossi|ITA|1999", "S|Alessandra Gerbaudo|ITA|2005", "L|Matilde Bonitempo|ITA|2006",
      "C|Aurora Bellinzona|ITA|1997", "C|Giulia Deambrogio|ITA|2003", "P|Anna Lualdi|ITA|2000", "C|Giorgia De Bortoli|ITA|2003",
      "L|Giorgia Colombo|ITA|1999", "S|Greta Valli|ITA|1992", "C|Matilde Calvelli|ITA|2005", "P|Marta Gulli|ITA|1999"
    ] },
    { id: "rip_a3", short: "Ripalta", full: "C.R. Transport Ripalta", city: "Ripalta Cremasca", tier: 2.4, color: "#ea580c", p: [] },
    { id: "vil_a3", short: "Villa Cortese", full: "Villa Cortese Volley", city: "Villa Cortese", tier: 2.5, color: "#06b6d4", p: [
      "P|Sofia Alberti|ITA|2003", "P|Katia Mapelli|ITA|2008", "O|Valentina Viola|ITA|2004", "O|Lavinia Borroni|ITA|2004",
      "S|Giulia Baldizzone|ITA|2004", "S|Claudia Talerico|ITA|2006", "S|Clarissa Elli|ITA|1995", "S|Erika Ghezzi|ITA|1995",
      "C|Greta Pegoraro|ITA|2002", "C|Greta Donato Biasi|ITA|2006", "C|Oriola Shpuza|ITA|1996", "L|Alice Brunelli|ITA|2001", "L|Giulia Osana|ITA|2005"
    ] },
    { id: "mod_a3", short: "Volley Modena", full: "Volley Modena", city: "Modena", tier: 2.6, color: "#ca8a04", p: ["P|Theresa Barner|GER|2004", "P|Beatrice Balconati|ITA|2004", "O|Sonia Ratti|ITA|2001", "O|Amelia Pasini|ITA|2008", "S|Valentina Adani|ITA|2002", "S|Linda Cabassa|ITA|2004", "S|Chiara Martinato|ITA|2005", "S|Anja Nella|ITA|2006", "C|Monica Tirisegu Oke|ITA|2006", "C|Marta Semprini Cesari|ITA|2004", "C|Sofia Migliorini|ITA|2001", "C|Anna Pettiti|ITA|2007", "L|Lia Righi|ITA|2006", "L|Victoria Cavallieri|ITA|2005"] },
    { id: "val_a3", short: "Valdarno", full: "Passione Valdarno Volley", city: "Figline Incisa Valdarno", tier: 2.3, color: "#0284c7", p: [
      "P|Ester Grucka|ITA|2004", "P|Elena Bortolot|ITA|1995"
    ] }
  ] },
  A3B: { name: "Serie A3 - Girone B", rounds: 14, teams: [
    { id: "gio_a3", short: "Giorgione", full: "Azimut Giorgione", city: "Castelfranco Veneto", tier: 2.6, color: "#dc2626", p: [
      "P|Silvia Romanin|ITA|2003", "P|Margherita Bottura|ITA|2007", "O|Alessia Cicolini|ITA|2000", "O|Sara Esposito|ITA|2000",
      "S|Sindi Mico|SUI|2004", "S|Alice Bellini|ITA|2001", "S|Arianna Rizzo|ITA|2001", "S|Alessandra Bartolomei|ITA|2008",
      "C|Tatjana Fucka|ITA|0", "C|Rebeka Fucka|ITA|0", "C|Chiara Zamprogno|ITA|2008", "C|Angela Facchinato|ITA|0",
      "L|Gaia Moretto|ITA|2002", "L|Lucia Morra|ITA|1997"
    ] },
    { id: "sma_a3", short: "Arena Volley", full: "Smapiù Arena Volley", city: "Verona", tier: 2.4, color: "#f97316", p: [
      "P|Sofia Grandi|ITA|2008", "P|Beatrice Giroldi|ITA|1995", "P|Elisa Fusa|ITA|2007", "O|Vittoria Adami|ITA|2007", "O|Nicole Tellaroli|ITA|2001",
      "S|Alice Trampus|ITA|2004", "S|Francesca Trevisan|ITA|1995", "S|Aurora Piron|ITA|2007", "S|Isabel Ceccon|ITA|0",
      "C|Anna Riccato|ITA|2004", "C|Valentina Gatti|ITA|2007", "C|Chiara Murari|ITA|2007", "C|Sara Bonini|ITA|2004", "L|Isabella Monaco|ITA|2001"
    ] },
    { id: "adu_a3", short: "Aduna", full: "Banca Annia Aduna Women", city: "Padova", tier: 2.4, color: "#14b8a6", p: [
      "P|Marianna Giay|ITA|2005", "P|Emma Venturi|ITA|2006", "O|Martina Simoncelli|ITA|2006", "O|Chiara Wabersich|ITA|2003",
      "S|Aurora Marchesini|ITA|2004", "S|Alessia Pasa|ITA|2004", "S|Irene Gomiero|ITA|1990", "S|Elisa Vecerina|ITA|2002",
      "C|Francesca Volpin|ITA|1995", "C|Linda Damian|ITA|2005", "C|Sofia Fenzio|ITA|2005", "C|Ludovica Marinucci|ITA|2007",
      "L|Marta Masiero|ITA|1998", "L|Linda Callegaro|ITA|2006"
    ] },
    { id: "vvm_a3", short: "V&V Modena", full: "V&V Modena Volley", city: "Modena", tier: 2.4, color: "#6366f1", p: [
      "P|Theresa Barner|GER|2004", "P|Beatrice Balconati|ITA|2004", "O|Amelia Pasini|ITA|2008", "O|Sonia Ratti|ITA|2001",
      "S|Linda Cabassa|ITA|2004", "S|Chiara Martinato|ITA|2005", "S|Anja Nella|ITA|2006", "S|Valentina Adani|ITA|2002",
      "C|Sofia Migliorini|ITA|0", "C|Vittoria Fornari|ITA|2002", "L|Giulia Rastelli|ITA|1990", "L|Emma Falcone|ITA|2001", "L|Elena Lutti|ITA|2007", "L|Elena Brancato|ITA|2009"
    ] },
    { id: "oly_a3", short: "Olympia di Navigazione", full: "Olympia di Navigazione", city: "Ravenna", tier: 2.3, color: "#0ea5e9", p: [] },
    { id: "ves_a3", short: "Vesuvio Oplonti", full: "CO.GE. Vesuvio Oplonti", city: "Torre Annunziata", tier: 2.4, color: "#d946ef", p: [
      "P|Emma Sturniolo|ITA|2003", "P|Giulia Picchi|ITA|2002", "O|Sofia Felappi|ITA|2003", "O|Ginevra Bazzani|ITA|2002",
      "S|Giorgia Coveccia|ITA|2004", "S|Gioia Riccato|ITA|2002", "S|Sara Bassi|ITA|2007", "S|Vittoria Zuliani|ITA|0",
      "L|Jessica Lanari|ITA|1993", "L|Annapaola Truono|ITA|1990"
    ] },
    { id: "cas_a3", short: "Castellana Grotte", full: "Zero5 Castellana Grotte", city: "Castellana Grotte", tier: 2.3, color: "#0284c7", p: [
      "P|Francesca Saveriano|ITA|1993", "P|Martina Merati|ITA|2002", "O|Federica Stroppa|ITA|1997",
      "S|Alessia Corradetti|ITA|2001", "S|Ginevra Camerini|ITA|2006", "S|Giorgia Rizza|ITA|2006", "S|Vera Bondarenko|UKR|2002",
      "C|Asya Zingoni|ITA|1999", "C|Camilla Grazia|ITA|2000", "C|Marjolijn Oskam|NED|1996", "C|Sara Marchesano|ITA|0"
    ] },
    { id: "ton_a3", short: "Tonno Callipo", full: "Tonno Callipo Calabria", city: "Vibo Valentia", tier: 2.6, color: "#b91c1c", p: [
      "P|Chiara Scacchetti|ITA|1995", "P|Romina Courroux|ARG|1998", "O|Giulia Colombo|ITA|2007", "O|Irene Botarelli|ITA|1996",
      "S|Agnes Pallag|HUN|1993", "S|Giulia Felappi|ITA|2002", "S|Laura Grigolo|ITA|1996", "S|Valentina Pomili|ITA|1994",
      "C|Chiara Albano|ITA|1999", "C|Chiara Riparbelli|ITA|1996", "C|Giada Civitico|ITA|2000", "C|Sarah Mazzuca|ITA|2002",
      "L|Marta Gazzerro|ITA|2005", "L|Marta Pecalli|ITA|2001"
    ] }
  ] }};

const STAR_BONUS = { "Paola Egonu": 9, "Zhu Ting": 9, "Monica De Gennaro": 7, "Anna Danesi": 6, "Wolosz": 5, "Ognjenovic": 4, "Sarah Fahr": 3, "Raphaela Folie": 3, "Caterina Bosetti": 3, "Elena Pietrini": 4, "Marina Lubian": 3, "Gabi": 5, "Skinner": 4, "Lanier": 3, "Stella Nervini": 3 };

function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

const ROLE_NAME={P:"Palleggiatrice",O:"Opposto",S:"Schiacciatrice",C:"Centrale",L:"Libero"};

const ROLE_ORDER=["P","O","S","C","L"];

const SEASON_YEAR=2026;

const FIRST=["Giulia","Martina","Sara","Chiara","Alice","Elena","Francesca","Beatrice","Giorgia","Aurora","Sofia","Ilaria","Federica","Valentina","Silvia","Laura","Marta","Elisa","Camilla","Noemi" ,"Arianna","Ginevra","Greta","Irene"];

const LAST=["Rossi","Ferrari","Bianchi","Romano","Colombo","Ricci","Marino","Greco","Bruno","Gallo","Conti","De Luca","Mancini","Costa","Giordano","Rizzo","Lombardi","Moretti","Barbieri","Fontana","Santoro","Mariani","Rinaldi","Caruso"];

const ROLE_ATTR={ P:{att:-18,blk:-8,srv:0,rec:-8,def:-2,set:5}, O:{att:4,blk:0,srv:0,rec:-20,def:-10,set:-30}, S:{att:0,blk:-6,srv:0,rec:4,def:2,set:-30}, C:{att:-1,blk:6,srv:-4,rec:-25,def:-10,set:-30}, L:{att:-30,blk:-30,srv:-10,rec:8,def:10,set:-15} };

const KEY_ATTR={P:"set",O:"att",S:"att",C:"blk",L:"rec"};

const LVF_HISTORICAL_STATS = [
 {name:"Nikoleta Perović",season:"2025/26",series:"A2",points:556},
 {name:"Monika Krasteva",season:"2025/26",series:"A2",points:534},
 {name:"Giorgia Frosini",season:"2025/26",series:"A2",points:501},
 {name:"Polina Malik",season:"2025/26",series:"A2",points:495},
 {name:"Lena Grosse Scharmann",season:"2025/26",series:"A2",points:494},
 {name:"Irbe Lazda",season:"2025/26",series:"A2",points:488},
 {name:"Piia Korhonen",season:"2025/26",series:"A2",points:469},
 {name:"Chiara Salvatori",season:"2025/26",series:"A2",blocks:93},
 {name:"Maria Adelaide Babatunde",season:"2025/26",series:"A2",blocks:88,aces:41},
 {name:"Francesca Cosi",season:"2025/26",series:"A2",blocks:85},
 {name:"Laura Bovo",season:"2025/26",series:"A2",blocks:85},
 {name:"Giorgia Amoruso",season:"2025/26",series:"A2",aces:41},
 {name:"Maria Teresa Bassi",season:"2025/26",series:"A2",aces:38},
 {name:"Chiara Riparbelli",season:"2025/26",series:"A2",aces:33},
 {name:"Sophie Andrea Blasi",season:"2025/26",series:"A2",receptionPct:50.9},
 {name:"Isidora Rodic",season:"2025/26",series:"A2",receptionPct:45.5},
 {name:"Beatrice Parrocchiale",season:"2025/26",series:"A2",receptionPct:44.1},











 {name:"Ivonee Daniela Montano Lucumi",season:"2024/25",series:"A2",points:643},
 {name:"Binto Diop",season:"2024/25",series:"A2",points:593,aces:49},
 {name:"Lena Grosse Scharmann",season:"2024/25",series:"A2",points:495},
 {name:"Clara Decortes",season:"2024/25",series:"A2",points:475},
 {name:"Elisa Zanette",season:"2024/25",series:"A2",points:469},
 {name:"Alyssa Enneking",season:"2024/25",series:"A2",points:460},
 {name:"Mija Šiftar",season:"2024/25",series:"A2",points:454},
 {name:"Valentina Zago",season:"2024/25",series:"A2",points:440},
 {name:"Giorgia Amoruso",season:"2024/25",series:"A2",points:426},
 {name:"Emilia Weske",season:"2024/25",series:"A2",points:424},
 {name:"Sara Caruso",season:"2024/25",series:"A2",blocks:99},
 {name:"Laura Bovo",season:"2024/25",series:"A2",blocks:91},
 {name:"Erika Esposito",season:"2024/25",series:"A2",aces:37},
 {name:"Dayana Kosareva",season:"2024/25",series:"A2",aces:37},
 {name:"Sophie Andrea Blasi",season:"2024/25",series:"A2",receptionPct:45.56},
 {name:"Giorgia Caforio",season:"2024/25",series:"A2",receptionPct:45.1},
 {name:"Giulia Bresciani",season:"2024/25",series:"A2",receptionPct:43.4},
 {name:"Paola Egonu",season:"2025/26",series:"A1",points:564},
 {name:"Ekaterina Antropova",season:"2025/26",series:"A1",points:484,blocks:66,aces:50},
 {name:"Anett Németh",season:"2025/26",series:"A1",points:465},
 {name:"Josephine Obossa",season:"2025/26",series:"A1",points:463,aces:33},
 {name:"Erblira Bici",season:"2025/26",series:"A1",points:451},
 {name:"Jolien Knollema",season:"2025/26",series:"A1",points:447},
 {name:"Kendall Kipp",season:"2025/26",series:"A1",points:437},
 {name:"Binto Diop",season:"2025/26",series:"A1",points:428,aces:33},
 {name:"Beatrice Gardini",season:"2025/26",series:"A1",points:412},
 {name:"Isabelle Haak",season:"2025/26",series:"A1",points:411},
 {name:"Anna Danesi",season:"2025/26",series:"A1",blocks:63},
 {name:"Anna Gray",season:"2025/26",series:"A1",blocks:57},
 {name:"Denise Meli",season:"2025/26",series:"A1",blocks:56},
 {name:"Eleonora Fersino",season:"2025/26",series:"A1",receptionPct:43.9},
 {name:"Ekaterina Antropova",season:"2024/25",series:"A1",points:569},
 {name:"Anett Németh",season:"2024/25",series:"A1",points:559},
 {name:"Ajack Jhon Majak Malual",season:"2024/25",series:"A1",points:499},
 {name:"Erblira Bici",season:"2024/25",series:"A1",points:481},
 {name:"Malwina Smarzek",season:"2024/25",series:"A1",points:428},
 {name:"Ailama Cese Montalvo",season:"2024/25",series:"A1",points:412},
 {name:"Paola Egonu",season:"2024/25",series:"A1",points:375},
 // Integrazione LVF 2025/26: classifiche di fine stagione pubblicate dalla Lega.
 {name:"Isabelle Haak",season:"2025/26",series:"A1",points:411,attackPct:52.6},
 {name:"Tatiana Tolok",season:"2025/26",series:"A1",points:396,attackPct:50.5},
 {name:"Jolien Knollema",season:"2025/26",series:"A1",points:447},
 {name:"Beatrice Gardini",season:"2025/26",series:"A1",points:412},
 {name:"Anna Davyskiba",season:"2025/26",series:"A1",points:407,aces:33},
 {name:"Chidera Eze",season:"2025/26",series:"A1",points:81,aces:21,blocks:16},
 {name:"Laura Bovo",season:"2025/26",series:"A2",blocks:85},
 {name:"Maria Teresa Bassi",season:"2025/26",series:"A2",aces:38},
 {name:"Chiara Riparbelli",season:"2025/26",series:"A2",aces:33},
 {name:"Sophie Andrea Blasi",season:"2025/26",series:"A2",receptionPct:50.9},
 {name:"Isidora Rodic",season:"2025/26",series:"A2",receptionPct:45.5},
 {name:"Beatrice Parrocchiale",season:"2025/26",series:"A2",receptionPct:44.1},
 {name:"Giorgia Amoruso",season:"2025/26",series:"A2",points:455},
 {name:"Candela Sol Salinas",season:"2025/26",series:"A2",points:445},
 {name:"Tay Masin Bierria",season:"2025/26",series:"A2",points:444},
 {name:"Alice Farina",season:"2025/26",series:"A2",points:323},
 {name:"Islam Gannar",season:"2025/26",series:"A2",points:279},
 {name:"Martina Stocco",season:"2025/26",series:"A2",points:123},
 {name:"Giorgia Avenia",season:"2025/26",series:"A2",points:101},
 {name:"Francesca Scola",season:"2025/26",series:"A2",points:89}
];

// Unisce le righe della stessa atleta/stagione/serie senza duplicare la scheda storica.
const LVF_STATS_MERGED=new Map();

for(const row of LVF_HISTORICAL_STATS){const k=normalizeStatKey(row.name)+"|"+row.season+"|"+row.series;const prev=LVF_STATS_MERGED.get(k)||{};LVF_STATS_MERGED.set(k,{...row,...prev});}

LVF_HISTORICAL_STATS.splice(0,LVF_HISTORICAL_STATS.length,...LVF_STATS_MERGED.values());

function normalizeStatKey(s){return String(s||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim();}

const LVF_STATS_SOURCES={
 "A1-2025/26":"https://www.legavolleyfemminile.it/statsrecapa1-antropova-fa-la-storia-trionfando-nelle-classifiche-di-muri-ed-ace-egonu-top-scorer-e-fersino-miglior-ricevitrice/",
 "A2-2025/26":"https://www.legavolleyfemminile.it/statsrecapa2-perovic-top-scorer-salvatori-regina-dei-muri-babatunde-guida-la-classifica-degli-ace-e-blasi-prima-tra-le-ricevitrici/",
 "all":"https://www.legavolleyfemminile.it/centro-statistiche/"
};

function normalizeAthleteName(s){return String(s||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim();}

function playerHistory(name){
 const key=normalizeAthleteName(name);
 const exact=LVF_HISTORICAL_STATS.filter(x=>normalizeAthleteName(x.name)===key);
 if(exact.length)return exact.slice().sort((a,b)=>b.season.localeCompare(a.season));
 // Le rose storiche contengono talvolta solo il cognome: fallback soltanto se quel cognome
 // identifica una sola atleta nel dataset, per evitare di assegnare statistiche alla persona sbagliata.
 const surname=key.split(" ").pop();
 if(!surname||surname.length<5)return [];
 const candidates=LVF_HISTORICAL_STATS.filter(x=>normalizeAthleteName(x.name).split(" ").pop()===surname);
 const identities=[...new Set(candidates.map(x=>normalizeAthleteName(x.name)))];
 return identities.length===1?candidates.slice().sort((a,b)=>b.season.localeCompare(a.season)):[];
}

function latestHistoricalValue(rows,key){const r=rows.find(x=>Number.isFinite(x[key]));return r?r[key]:null;}

const TRAVEL_CITY={
"Perugia":[43.1107,12.3908],"Costa Volpino":[45.825,10.100],"Casalmaggiore":[44.989,10.420],"Cremona":[45.133,10.022],"Imola":[44.355,11.716],"Parma":[44.8015,10.3279],"Milano - Roma":[44.8015,10.3279],"Messina":[38.1938,15.554],"Busto Arsizio":[45.611,8.852],"Roma":[41.9028,12.4964],"Trento":[46.0748,11.1217],"Melendugno":[40.273,18.336],"Trebaseleghe":[45.590,11.994],"Fasano":[40.837,17.359],"Altamura":[40.826,16.552],"Marsala":[37.799,12.436],"Altino":[42.101,14.331],"Offanengo":[45.378,9.744],"Pinerolo":[44.885,7.332],"S. Giovanni":[43.941,12.712],"Talmassons":[45.890,13.116],"Brescia":[45.5416,10.2118],"Ravenna":[44.418,12.203],"Bergamo":[45.698,9.677],"Novara":[45.446,8.621],"Firenze":[43.7696,11.2558],"Cuneo":[44.384,7.542],"Chieri":[45.009,7.821],"Vallefoglia":[43.817,12.803],"San Giovanni in Marignano":[43.941,12.712],"Talmassons":[45.890,13.116],"Conegliano":[45.887,12.298],"Scandicci":[43.754,11.187],"Roma":[41.9028,12.4964],"Caserta":[41.074,14.332],"Aversa":[40.973,14.207],"Modena":[44.647,10.925],"Firenze":[43.7696,11.2558],"Cervia":[44.263,12.350],"Altamura":[40.826,16.552]};

const TRAVEL_DATES_A2=["04/10/2026","11/10/2026","14/10/2026","18/10/2026","25/10/2026","01/11/2026","08/11/2026","15/11/2026","22/11/2026","25/11/2026","29/11/2026","06/12/2026","13/12/2026","16/12/2026","20/12/2026","26/12/2026","06/01/2027","10/01/2027","17/01/2027","20/01/2027","24/01/2027","31/01/2027","03/02/2027","07/02/2027","14/02/2027","21/02/2027","28/02/2027","03/03/2027","07/03/2027","14/03/2027","21/03/2027","28/03/2027","04/04/2027","11/04/2027"];
