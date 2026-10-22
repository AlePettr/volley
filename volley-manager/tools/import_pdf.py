#!/usr/bin/env python3
"""Legge i PDF "Riepilogo comparativo atleti" del Centro Statistiche LVF (stampati da Safari) e li converte in righe JSON.
Uso:  python3 tools/import_pdf.py file1.pdf [file2.pdf ...] > righe.json
Serie e ruolo si leggono dall'intestazione del PDF. Richiede: pip install pdfplumber"""
import sys, re, json
import pdfplumber

COLS = ["name","apps","sets","pts","ptsWin","ptsBP","serves","aces","serveErr","acesPerSet","serveEff",
        "recTot","recErr","recNeg","recPerf","recPerfPct","recEff",
        "attTot","attErr","attBlocked","attPerf","attPerfPct","attEff",
        "blkInv","blkPerf","blkPerSet"]
ROLES = {"Palleggiatrice":"P","Palleggiatore":"P","Opposto":"O","Schiacciatrice":"S","Centrale":"C","Libero":"L"}

def num(s):
    if s is None: return None
    s = s.strip().replace("\n","").replace(" ","")
    if s == "": return None
    try: return float(s.replace(",", ".")) if ("," in s or "." in s) else int(s)
    except ValueError: return None

def parse(path):
    out = []
    with pdfplumber.open(path) as pdf:
        text = "\n".join((p.extract_text() or "") for p in pdf.pages)
        m = re.search(r"Serie\s+(A[123])", text) or re.search(r"Serie (A[123]) Femminile", text)
        series = m.group(1) if m else None
        r = re.search(r"Ruolo:\s*([A-Za-zàèé]+)", text)
        role = ROLES.get(r.group(1)) if r else None
        s = re.search(r"Stagioni dal (\d{4}/\d{4}) al (\d{4}/\d{4})", text)
        span = (s.group(1), s.group(2)) if s else (None, None)
        for pg in pdf.pages:
            for t in pg.extract_tables():
                for row in t:
                    if len(row) < 26: continue                       # legenda e altre tabelle piccole
                    # il layout cambia da pagina a pagina (nome in colonna 0 o 1, colonne vuote ai lati):
                    # il nome e' la prima cella con lettere, i 25 valori sono le celle successive
                    k = next((i for i, c in enumerate(row) if c and re.search(r"[A-Za-zÀ-ÿ]", c)), None)
                    if k is None: continue
                    rest = row[k+1:]
                    name = re.sub(r"\s*\n\s*", " ", row[k]).strip()
                    m = re.search(r"\s+(\d+)$", name)
                    if m:                                              # presenze finite nella cella del nome: i valori seguenti partono dai set
                        name = name[:m.start()].strip(); rest = [m.group(1)] + rest
                    else:                                              # celle vuote tra nome e presenze (le presenze ci sono sempre)
                        while rest and (rest[0] is None or rest[0] == ""): rest = rest[1:]
                    vals = (rest + [None]*25)[:25]
                    if not name or name in ("Atleta",) or name.startswith(("Lega ", "Ruolo", "Prf.", "Err.", "Tipo ")) or "http" in name or "Pagina" in name: continue
                    d = {"name": name}
                    d.update({c: num(vals[i]) for i, c in enumerate(COLS[1:])})
                    if d["apps"] is None: continue
                    d.update(series=series, role=role, from_=span[0], to=span[1])
                    out.append(d)
    return out

if __name__ == "__main__":
    rows = []
    for f in sys.argv[1:]: rows += parse(f)
    json.dump(rows, sys.stdout, ensure_ascii=False)
