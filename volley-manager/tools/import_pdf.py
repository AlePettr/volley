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
                    if len(row) != 26 or not row[0] or row[0] in ("Atleta",) or row[0].startswith(("Lega ","Ruolo")): continue
                    if row[1] is None and row[2] is None and all(c in (None,"") for c in row[3:]): pass
                    d = {c: (re.sub(r"\s*\n\s*"," ",row[i]).strip() if c=="name" else num(row[i])) for i,c in enumerate(COLS)}
                    d["name"] = re.sub(r"\s+\d+$", "", d["name"] or "").strip()   # a volte le presenze finiscono nella cella del nome
                    if not d["name"] or "http" in d["name"] or "Pagina" in d["name"] or d["apps"] is None: continue
                    d.update(series=series, role=role, from_=span[0], to=span[1])
                    out.append(d)
    return out

if __name__ == "__main__":
    rows = []
    for f in sys.argv[1:]: rows += parse(f)
    json.dump(rows, sys.stdout, ensure_ascii=False)
