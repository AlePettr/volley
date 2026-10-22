#!/usr/bin/env python3
"""Converte i PDF "Riepilogo comparativo atleti" della LVF (uno per ruolo e serie) in js/stats_ruoli.js.
Uso, dalla cartella volley-manager:
    python3 tools/make_ruoli_js.py Centrali_A2.pdf Opposte_A2.pdf ... > js/stats_ruoli.js
Serie, ruolo e periodo si leggono dall'intestazione di ogni PDF (vedi import_pdf.py)."""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from import_pdf import parse

FIELDS = ["apps", "sets", "pts", "serves", "aces", "serveErr", "recTot", "recErr", "recNeg", "recPerf",
          "attTot", "attErr", "attBlocked", "attPerf", "blkInv", "blkPerf"]

def main(paths):
    rows, spans = [], []
    for p in paths:
        r = parse(p)
        if not r:
            sys.stderr.write("ATTENZIONE: nessuna riga in %s\n" % p); continue
        spans.append("%s %s %s-%s: %d righe" % (r[0]["series"], r[0]["role"], r[0]["from_"], r[0]["to"], len(r)))
        for d in r:
            if not d["apps"]: continue                      # mai scese in campo
            rows.append([d["series"], d["role"], d["name"]] + [int(round(d[f] or 0)) for f in FIELDS])
    rows.sort(key=lambda x: (x[0], x[1], -x[4]))
    out = ["/* Statistiche individuali per ruolo (Centro Statistiche LVF, Riepilogo comparativo atleti), generate da tools/make_ruoli_js.py.",
           "   Colonne: serie, ruolo, nome (Cognome Nome), " + ", ".join(FIELDS) + ".",
           "   Totali sul periodo indicato per ciascun file: " + "; ".join(spans) + ". */",
           "const LVF_ROLE_FIELDS=" + repr(FIELDS).replace("'", '"') + ";",
           "const LVF_ROLE_ROWS=["]
    out += ["[" + ",".join('"%s"' % c.replace('"', '\\"') if isinstance(c, str) else str(c) for c in r) + "]," for r in rows]
    out.append("];")
    sys.stdout.write("\n".join(out) + "\n")

if __name__ == "__main__":
    main(sys.argv[1:])
