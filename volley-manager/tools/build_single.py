#!/usr/bin/env python3
"""Crea un unico file HTML autosufficiente (script, stile, loghi e video LED incorporati).
Uso, dalla cartella volley-manager:   python3 tools/build_single.py   ->  volley-manager-singolo.html
Richiede Python 3 e Pillow (pip install pillow)."""
import re, os, base64, io
from PIL import Image
os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
OUT = 'volley-manager-singolo.html'
h = open('index.html', encoding='utf8').read()
def uri(path):
    im = Image.open(path).convert('RGBA'); im.thumbnail((300, 300), Image.LANCZOS)
    b = io.BytesIO(); im.save(b, 'PNG', optimize=True); return 'data:image/png;base64,' + base64.b64encode(b.getvalue()).decode()
def sc(m):
    p = m.group(1)
    if not os.path.exists(p): return m.group(0)
    t = open(p, encoding='utf8').read()
    if p == 'logos/manifest.js':
        t = re.sub(r'/\*.*?\*/', '', t, flags=re.S)
        a, b = t.split('sponsors:'); b, lp = b.split('led:')
        f = lambda d: (lambda x: '"%s": "%s"' % (x.group(1), uri(d + x.group(2))))
        a = re.sub(r'"([\w]+)": "([^"]+\.png)"', f('logos/clubs/'), a)
        b = re.sub(r'"([\w]+)": "([^"]+\.png)"', f('logos/sponsors/'), b)
        lp = re.sub(r'"([\w]+\.mp4)"', lambda x: '"data:video/mp4;base64,' + base64.b64encode(open('logos/led/' + x.group(1), 'rb').read()).decode() + '"', lp)
        t = a + 'sponsors:' + b + 'led:' + lp
    if p == 'js/gfx/logos.js':
        t = t.replace("'logos/clubs/' + m[id]", "m[id]").replace("'logos/sponsors/' + man.sponsors[id]", "man.sponsors[id]")
    return '<script>' + t.replace('</script', '<\\/script') + '</script>'
h = re.sub(r'<script src="([^"]+)"></script>', sc, h)
h = re.sub(r'<link rel="stylesheet" href="([^"]+)">', lambda m: '<style>' + open(m.group(1), encoding='utf8').read() + '</style>' if os.path.exists(m.group(1)) else m.group(0), h)
h = re.sub(r'<link rel="manifest"[^>]*>', '', h)
h = '\n'.join(l for l in h.split('\n') if 'serviceWorker' not in l)
open(OUT, 'w', encoding='utf8').write(h); print(OUT, len(h) // 1024, 'KB')
