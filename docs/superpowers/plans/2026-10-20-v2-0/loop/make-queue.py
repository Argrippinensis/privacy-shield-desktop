# Erzeugt V2-QUEUE.json (maschinenlesbare Arbeitsliste).
# Aufruf:  python3 -I make-queue.py > V2-QUEUE.json
# Mit Zustand der alten Liste (Status, Versuche, Lease, Notizen bleiben erhalten; die Umleitung ">" leert die Zieldatei VOR dem Start,
# deshalb zuerst eine Kopie anlegen):
#   cp V2-QUEUE.json /tmp/q.old && python3 -I make-queue.py --keep-state /tmp/q.old > V2-QUEUE.json
# Stand: Planhaertung P0 (2026-10-21): Pakete geteilt (Modul ".m" parallel, Oberflaeche ".w" seriell; weitere Teilungen je Aufgabe),
# F1.spike entfaellt (Machbarkeit in P0 gemessen), neue Pakete M1.m, F5, C1.0, C1.r.
import json
import sys

U = 'npm run test:unit'
PACK = 'npm run build:linux && PS_PACKAGED_BIN=dist/linux-unpacked/privacy-shield-desktop xvfb-run -a npm test'
DIFF_APP = 'xvfb-run -a node tests/eval/diff-reference.mjs'
DIFF_NODE = 'node tests/eval/diff-reference.mjs --node'
def e2e(f): return f'xvfb-run -a node --test --test-concurrency=1 tests/{f}'
def unit(f): return f'node --test tests/unit/{f}'

P = []
# Art der Aufgabe (bestimmt Modell und Denkaufwand der Rollen, siehe V2-LOOP.md Abschnitt 8)
SPIKE = {'P0'}
DENK = {'F2', 'F2.e', 'F2.h', 'F1.a', 'F1.b', 'F5', 'C3.m', 'C1.0', 'C1.r', 'C1.1', 'C1.2', 'C1.3', 'C2.m', 'C2.w', 'B1.w1', 'B1.w2',
        'D1.w1', 'D1.w2', 'D2.1', 'D2.2', 'E1.w', 'F3.a', 'F3.b', 'F3.c', 'F3.d', 'F4.a', 'F4.b', 'G1.docs', 'G1'}
REVIEW = {'A3.m', 'A3.w', 'D1.m', 'D3', 'E2', 'C3.m', 'M1.m'}           # zusaetzlich: alle ".w" und alle Nicht-"bau"-Pakete
CRYPTO = {'A3.m', 'A3.w', 'C3.m'}                                     # Sicherheitsgrenze: Pruefer mit hoechstem Aufwand

def add(id, title, doc, mark, deps, allowed, tests, accept, serial=False, kann=False, build=False):
    tier = 'spike' if id in SPIKE else ('denk' if id in DENK else 'bau')
    P.append(dict(id=id, title=title, doc=doc, tier=tier, review=(tier != 'bau' or '.w' in id or id in REVIEW), crypto=(id in CRYPTO),
                  serial=serial, parallel=(not serial), kann=kann, build=build, deps=deps,
                  allowed=allowed, tests=tests, accept=accept, status='offen', attempts=0, branch='', commit='', lease=None, notes=''))

HTML = 'app/privacy-shield.html'
IDX = 'app/index.html'
EVAL_FILES = ['tests/eval/cases.mjs', 'tests/eval/cases-gdpr.mjs', 'tests/eval/cases-v2.mjs', 'tests/eval/generate.mjs', 'tests/eval/run-eval.mjs',
              'tests/eval/baseline.json', 'tests/eval/baseline-v2.json', 'tests/eval/out/**']
GOLDEN = ['tests/golden/baseline.json', 'tests/golden/reference-allow.json']   # die Referenz von 1.8.0 (reference-v1.8.json) bleibt nach F2 unveraenderlich

# ---- Planhaertung --------------------------------------------------------------------------------------------------------------
add('P0', 'Planhaertung: Spezifikationen gegen den echten Code pruefen und nachbessern', 'V2-LOOP.md#planhaertung', 'S', [],
    ['docs/superpowers/plans/2026-10-20-v2-0/**'], [], [], serial=True)

# ---- Fundament -----------------------------------------------------------------------------------------------------------------
add('F2', 'Unit-Laeufer, Referenz von 1.8.0, Lader, Platzhaltermodul, Test-Hilfen', 'V2-F-fundament.md#f2', 'S', ['P0'],
    ['package.json', '.github/workflows/ci.yml', 'tests/helpers.mjs', 'tests/unit/**', 'app/lib/placeholder.js', 'tests/eval/dump-reference.mjs',
     'tests/eval/diff-reference.mjs', 'tests/golden/reference-v1.8.json', 'tests/golden/reference-allow.json', 'tests/hygiene.test.mjs', 'tests/downloads.test.mjs'],
    ['tests/unit/smoke.test.mjs', 'tests/unit/loadlib.test.mjs', 'tests/unit/placeholder.test.mjs', 'tests/unit/lib-static.test.mjs',
     'tests/unit/diff-reference.test.mjs', 'tests/downloads.test.mjs'],
    [U, DIFF_APP, DIFF_APP, 'xvfb-run -a npm test'], serial=True)
add('F1.a', 'Erkennungskern als Modul (Node), HTML unberuehrt', 'V2-F-fundament.md#f1', 'S', ['F2'],
    ['app/lib/detect.js', 'tests/unit/detect*.test.mjs', 'tests/eval/diff-reference.mjs'],
    ['tests/unit/detect.differential.test.mjs', 'tests/unit/detect.api.test.mjs'],
    [U, "node -e \"require('./app/lib/detect.js')\"", DIFF_NODE])
add('F2.e', 'Electron 44, Fuses', 'V2-F-fundament.md#f2e', 'S', ['F2'],
    ['package.json', 'package-lock.json', '.github/workflows/*.yml', 'THIRD_PARTY_NOTICES.md', 'CHANGELOG.md', 'tests/helpers.mjs', 'tests/unit/**'],
    ['tests/unit/electron-config.test.mjs'], [U, 'xvfb-run -a npm test', DIFF_APP, PACK], serial=True, build=True)
add('F1.b', 'Erkennungskern in die HTML einbinden', 'V2-F-fundament.md#f1', 'S', ['F1.a'],
    [HTML, 'tests/unit/detect.wiring.test.mjs', 'docs/v2/web-tool-kern.md'], ['tests/unit/detect.wiring.test.mjs'],
    [U, 'xvfb-run -a npm test', DIFF_APP, 'xvfb-run -a npm run eval', PACK], serial=True, build=True)
add('F2.h', 'Haertung der Bruecke (Absender, Argumente, Ursprung, Berechtigungen)', 'V2-F-fundament.md#f2h', 'S', ['F2.e'],
    ['main.js', 'preload.js', IDX, HTML, 'tests/ipc-security.test.mjs', 'tests/helpers.mjs'], ['tests/ipc-security.test.mjs'],
    [e2e('ipc-security.test.mjs'), 'xvfb-run -a npm test'], serial=True)
add('F5', 'Kern-Leistung bei pathologischen Eingaben (lange Zeilen, Leerraumfolgen)', 'V2-F-fundament.md#f5', 'S', ['F1.b'],
    ['app/lib/detect.js', HTML, 'tests/unit/detect.pathological.test.mjs', 'tests/golden/reference-allow.json', 'docs/erkennung-entscheidungen.md'],
    ['tests/unit/detect.pathological.test.mjs'], [U, DIFF_NODE, DIFF_APP, 'xvfb-run -a npm run eval'], serial=True)

# ---- Vertrauen -----------------------------------------------------------------------------------------------------------------
add('M1.m', 'Manuelle Markierungen als Daten: Modul', 'V2-A-vertrauen.md#m1', 'H', ['F2'],
    ['app/lib/marks.js', 'tests/unit/marks.test.mjs'], ['tests/unit/marks.test.mjs'], [unit('marks.test.mjs')])
add('A1.m', 'Gegenpruefung: Modul', 'V2-A-vertrauen.md#a1', 'H', ['F2'],
    ['app/lib/leakcheck.js', 'tests/unit/leakcheck.test.mjs'], ['tests/unit/leakcheck.test.mjs'], [unit('leakcheck.test.mjs')])
add('A1.w', 'Gegenpruefung: Oberflaeche, Annotieren als Daten', 'V2-A-vertrauen.md#a1', 'S', ['A1.m', 'M1.m', 'F1.b'],
    [HTML, 'tests/leakcheck.test.mjs'], ['tests/leakcheck.test.mjs'], [U, e2e('leakcheck.test.mjs')], serial=True)
add('A2.m', 'Bericht: Modul', 'V2-A-vertrauen.md#a2', 'H', ['F2'],
    ['app/lib/report.js', 'tests/unit/report.test.mjs'], ['tests/unit/report.test.mjs'], [unit('report.test.mjs')])
add('A2.w', 'Bericht: Oberflaeche', 'V2-A-vertrauen.md#a2', 'S', ['A2.m', 'A1.w'],
    [HTML, 'tests/report.test.mjs'], ['tests/report.test.mjs'], [U, e2e('report.test.mjs')], serial=True)
add('A3.m', 'Verschluesselte Zuordnung: Modul', 'V2-A-vertrauen.md#a3', 'H', ['F2'],
    ['app/lib/psmap.js', 'tests/unit/psmap.test.mjs'], ['tests/unit/psmap.test.mjs'], [unit('psmap.test.mjs')])
add('A3.w', 'Verschluesselte Zuordnung: Oberflaeche', 'V2-A-vertrauen.md#a3', 'S', ['A3.m', 'A2.w'],
    [HTML, 'tests/psmap.test.mjs'], ['tests/psmap.test.mjs'], [U, e2e('psmap.test.mjs')], serial=True)
add('A4.m', 'Hygiene: Dateinamen (Modul)', 'V2-A-vertrauen.md#a4', 'H', ['F2'],
    ['app/lib/hygiene.js', 'tests/unit/hygiene.test.mjs'], ['tests/unit/hygiene.test.mjs'], [unit('hygiene.test.mjs')])
add('A4.w', 'Hygiene: PDF-Metadaten, Download-URL, Schliessen-Rueckfrage', 'V2-A-vertrauen.md#a4', 'H', ['A4.m', 'A3.w', 'F2.h'],
    [HTML, 'main.js', 'preload.js', 'tests/export-hygiene.test.mjs'], ['tests/export-hygiene.test.mjs'], [U, e2e('export-hygiene.test.mjs')], serial=True)

# ---- Dokumente -----------------------------------------------------------------------------------------------------------------
add('B1.fix', 'Sofortfix Mehrfachauswahl: gemeinsamer Handler, ZIP-Namen ohne Originalnamen, Hinweis', 'V2-B-dokumente.md#b1fix', 'H', ['F2', 'A4.m'],
    [HTML, 'tests/multifile.test.mjs'], ['tests/multifile.test.mjs'], [e2e('multifile.test.mjs')], serial=True)
add('B1.m', 'Projekt: Modul', 'V2-B-dokumente.md#b1m', 'H', ['F2'],
    ['app/lib/project.js', 'tests/unit/project.test.mjs'], ['tests/unit/project.test.mjs'], [unit('project.test.mjs')])
add('B1.w1', 'Projekt: Dokumentenliste und Lauf', 'V2-B-dokumente.md#b1w1', 'S', ['B1.m', 'B1.fix', 'A1.w', 'A2.w', 'A3.w', 'A4.w'],
    [HTML, 'tests/project-list.test.mjs'], ['tests/project-list.test.mjs'], [U, e2e('project-list.test.mjs')], serial=True)
add('B1.w2', 'Projekt: ZIP, Bericht, Zuordnung, Rundlauf', 'V2-B-dokumente.md#b1w2', 'S', ['B1.w1'],
    [HTML, 'tests/project.test.mjs'], ['tests/project.test.mjs'], [U, e2e('project.test.mjs')], serial=True)
add('B2.m1', 'Formate: Text- und Pruefmodul (detect, guard, decodeText, HTML, EML, RTF)', 'V2-B-dokumente.md#b2', 'H', ['F2'],
    ['app/lib/formats.js', 'tests/unit/formats.test.mjs'], ['tests/unit/formats.test.mjs'], [unit('formats.test.mjs')])
add('B2.m2', 'Formate: Office-Modul (XLSX, ODF, PPTX, DOCX-Zusatztexte)', 'V2-B-dokumente.md#b2', 'H', ['B2.m1'],
    ['app/lib/officefmt.js', 'tests/unit/officefmt.test.mjs'], ['tests/unit/officefmt.test.mjs'], [unit('officefmt.test.mjs')])
add('B2.w', 'Formate: Verdrahtung', 'V2-B-dokumente.md#b2', 'H', ['B2.m2', 'B1.w1'],
    [HTML, 'tests/formats.test.mjs'], ['tests/formats.test.mjs'], [U, e2e('formats.test.mjs')], serial=True)

# ---- Erkennung -----------------------------------------------------------------------------------------------------------------
add('C1.0', 'Korpusausbau: Vorlagen, Faelle, Modus fallback, Basis fuer die neue Menge', 'V2-C-erkennung.md#c10', 'S', ['F2'],
    ['tests/eval/generate.mjs', 'tests/eval/cases-v2.mjs', 'tests/eval/run-eval.mjs', 'tests/eval/baseline.json', 'tests/eval/baseline-v2.json',
     'tests/eval/out/**', 'tests/eval-v2.test.mjs', 'docs/erkennung-entscheidungen.md'],
    ['tests/eval-v2.test.mjs'], ['xvfb-run -a npm test', DIFF_APP, 'xvfb-run -a npm run eval -- --set v2'], serial=True)
add('C1.r', 'Realistische Formate Ende-zu-Ende (DOCX, PDF, OCR, TXT)', 'V2-C-erkennung.md#c1r', 'S', ['C1.0'],
    ['tests/realdocs.test.mjs', 'tests/helpers.mjs', 'docs/erkennung-entscheidungen.md'], ['tests/realdocs.test.mjs'], [e2e('realdocs.test.mjs')], serial=True)
add('C1.1', 'Korpusschleife Durchlauf 1', 'V2-C-erkennung.md#c11-bis-c13', 'S', ['C1.0', 'C1.r', 'F1.b', 'F5'],
    ['app/lib/detect.js', HTML, 'tests/realdocs.test.mjs', 'docs/erkennung-entscheidungen.md'] + EVAL_FILES + GOLDEN, [],
    ['xvfb-run -a npm test', 'xvfb-run -a npm run eval', 'xvfb-run -a npm run eval -- --set v2', DIFF_NODE], serial=True)
add('C2.m', 'Verknuepfung derselben Person: Modul', 'V2-C-erkennung.md#c2', 'S', ['F2'],
    ['app/lib/coref.js', 'tests/unit/coref.test.mjs'], ['tests/unit/coref.test.mjs'], [unit('coref.test.mjs')])
add('C2.w', 'Verknuepfung derselben Person: Einbindung in den Kern und Harness', 'V2-C-erkennung.md#c2', 'S', ['C2.m', 'C1.1', 'F1.b'],
    ['app/lib/detect.js', HTML, 'tests/unit/detect.coref.test.mjs', 'tests/unit/placeholder-usage.test.mjs', 'CHANGELOG.md', 'docs/erkennung-entscheidungen.md'] + EVAL_FILES + GOLDEN,
    ['tests/unit/detect.coref.test.mjs', 'tests/unit/placeholder-usage.test.mjs'],
    [U, 'xvfb-run -a npm test', 'xvfb-run -a npm run eval', DIFF_NODE], serial=True)
add('C3.m', 'Eigene Regeln: Modul (sichere Regex-Teilmenge)', 'V2-C-erkennung.md#c3', 'H', ['F2'],
    ['app/lib/policy.js', 'tests/unit/policy.test.mjs'], ['tests/unit/policy.test.mjs'], [unit('policy.test.mjs')])
add('C3.w', 'Eigene Regeln: Oberflaeche und Kern', 'V2-C-erkennung.md#c3w', 'S', ['C3.m', 'C1.1', 'F1.b'],
    [HTML, 'app/lib/detect.js', 'tests/policy.test.mjs'], ['tests/policy.test.mjs'], [U, e2e('policy.test.mjs')], serial=True)
add('C1.2', 'Korpusschleife Durchlauf 2', 'V2-C-erkennung.md#c11-bis-c13', 'S', ['C1.1', 'C2.w'],
    ['app/lib/detect.js', HTML, 'tests/realdocs.test.mjs', 'docs/erkennung-entscheidungen.md'] + EVAL_FILES + GOLDEN, [],
    ['xvfb-run -a npm test', 'xvfb-run -a npm run eval', 'xvfb-run -a npm run eval -- --set v2', DIFF_NODE], serial=True)
add('C1.3', 'Korpusschleife Durchlauf 3', 'V2-C-erkennung.md#c11-bis-c13', 'S', ['C1.2'],
    ['app/lib/detect.js', HTML, 'tests/realdocs.test.mjs', 'docs/erkennung-entscheidungen.md'] + EVAL_FILES + GOLDEN, [],
    ['xvfb-run -a npm test', 'xvfb-run -a npm run eval', 'xvfb-run -a npm run eval -- --set v2', DIFF_NODE], serial=True)

# ---- Bedienung -----------------------------------------------------------------------------------------------------------------
add('D1.m', 'Pruefansicht: Module (review, history)', 'V2-D-bedienung.md#d1', 'H', ['F2'],
    ['app/lib/history.js', 'app/lib/review.js', 'tests/unit/history.test.mjs', 'tests/unit/review.test.mjs'],
    ['tests/unit/history.test.mjs', 'tests/unit/review.test.mjs'], [unit('history.test.mjs'), unit('review.test.mjs')])
add('D1.w1', 'Pruefansicht: Seitenleiste und Entscheidungen', 'V2-D-bedienung.md#d1w1', 'S', ['D1.m', 'A1.w', 'F1.b'],
    [HTML, 'app/lib/detect.js', 'tests/review.test.mjs'], ['tests/review.test.mjs'], [U, e2e('review.test.mjs')], serial=True)
add('D1.w2', 'Pruefansicht: Rueckgaengig, Tastatur, Filter, grosse Listen', 'V2-D-bedienung.md#d1w2', 'S', ['D1.w1'],
    [HTML, 'tests/review-undo.test.mjs'], ['tests/review-undo.test.mjs'], [U, e2e('review-undo.test.mjs')], serial=True)
add('D3', 'Info-Dialog', 'V2-D-bedienung.md#d3', 'H', ['F2.h'],
    [IDX, 'main.js', 'preload.js', 'tests/info.test.mjs', 'tests/helpers.mjs'], ['tests/info.test.mjs'], [e2e('info.test.mjs')], serial=True)
D2_FILES = [HTML, IDX, 'app/css/**', 'package.json', 'package-lock.json', 'THIRD_PARTY_NOTICES.md', 'tests/helpers.mjs']
add('D2.1', 'Barrierefreiheit: Struktur, Beschriftung, Tastatur, Ansagen', 'V2-D-bedienung.md#d2', 'S', ['D1.w2', 'D3', 'A3.w', 'B1.w2', 'C3.w', 'B2.w'],
    D2_FILES + ['tests/a11y-struktur.test.mjs'], ['tests/a11y-struktur.test.mjs'], [e2e('a11y-struktur.test.mjs')], serial=True)
add('D2.2', 'Barrierefreiheit: Kontrast, Bewegung, Zoom, Gesamtpruefung', 'V2-D-bedienung.md#d2', 'S', ['D2.1'],
    D2_FILES + ['tests/a11y-struktur.test.mjs', 'tests/a11y.test.mjs', 'docs/a11y-backlog.md'], ['tests/a11y.test.mjs'],
    [e2e('a11y.test.mjs'), e2e('a11y-struktur.test.mjs')], serial=True)

# ---- Betrieb -------------------------------------------------------------------------------------------------------------------
add('E1.m', 'Kommandozeile: Argument-Modul', 'V2-E-betrieb.md#e1m', 'H', ['F2'],
    ['app/lib/cliargs.js', 'tests/unit/cliargs.test.mjs'], ['tests/unit/cliargs.test.mjs'], [unit('cliargs.test.mjs')])
add('E1.w', 'Kommandozeilenmodus', 'V2-E-betrieb.md#e1w', 'S', ['E1.m', 'A2.w', 'A3.w', 'B1.w2', 'F2.h'],
    ['main.js', 'preload.js', 'app/cli.html', 'app/lib/**', 'tests/cli.test.mjs', 'docs/kommandozeile.md', 'package.json'],
    ['tests/cli.test.mjs'], [U, e2e('cli.test.mjs')], serial=True)
add('E2', 'Oeffnen mit, Einzelinstanz', 'V2-E-betrieb.md#e2', 'H', ['B1.w2', 'E1.m', 'F2.h'],
    ['main.js', 'preload.js', HTML, IDX, 'tests/open-with.test.mjs', 'tests/helpers.mjs'], ['tests/open-with.test.mjs'], [e2e('open-with.test.mjs')], serial=True)

# ---- Fundament, Teil 2 ---------------------------------------------------------------------------------------------------------
F3_FILES = ['scripts/vendor.lock.json', 'scripts/fetch-vendor.mjs', 'THIRD_PARTY_NOTICES.md', 'CHANGELOG.md', HTML, 'app/ner-worker.js', 'app/lib/**', 'tests/**']
F3_ACCEPT = ['xvfb-run -a npm test', 'xvfb-run -a npm run eval', DIFF_APP]
add('F3.a', 'Bibliotheken: mammoth, JSZip, jsPDF', 'V2-F-fundament.md#f3', 'S', ['F1.b', 'B2.m2'], F3_FILES, [], F3_ACCEPT, serial=True)
add('F3.b', 'Bibliotheken: Tesseract.js', 'V2-F-fundament.md#f3', 'S', ['F3.a'], F3_FILES, [], F3_ACCEPT, serial=True)
add('F3.c', 'Bibliotheken: pdf.js (Entscheidung, sonst verschoben)', 'V2-F-fundament.md#f3', 'S', ['F3.b'], F3_FILES, [], F3_ACCEPT, serial=True)
add('F3.d', 'Bibliotheken: Transformers.js 4 (nur mit Messprotokoll, sonst verschoben)', 'V2-F-fundament.md#f3', 'S', ['F3.c'], F3_FILES, [], F3_ACCEPT + [PACK], serial=True, build=True)
add('F4.a', 'Stabilitaet: Eigenschafts- und Fuzz-Tests', 'V2-F-fundament.md#f4a', 'S', ['F1.b', 'F5', 'B2.m2'],
    ['tests/unit/properties.test.mjs', 'tests/unit/fuzz.test.mjs', 'app/lib/**', HTML, 'tests/golden/reference-allow.json', 'docs/erkennung-entscheidungen.md'],
    ['tests/unit/properties.test.mjs', 'tests/unit/fuzz.test.mjs'], [U, DIFF_NODE], serial=True)
add('F4.b', 'Stabilitaet: Windows-Installationstest in der CI, Leistungsbudgets', 'V2-F-fundament.md#f4b', 'S', ['F2.e'],
    ['.github/workflows/build.yml', 'tests/perf.test.mjs', 'tests/unit/ci-config.test.mjs', 'tests/installed.test.mjs'],
    ['tests/unit/ci-config.test.mjs'], [unit('ci-config.test.mjs'), e2e('perf.test.mjs')], serial=True)

# ---- Abschluss -----------------------------------------------------------------------------------------------------------------
add('G1.docs', 'Dokumentation (README, Handbuch, Kommandozeile, Richtlinie, CHANGELOG)', 'V2-G-abschluss.md#3-dokumentation', 'S',
    ['A4.w', 'B1.w2', 'B2.w', 'C1.3', 'C2.w', 'C3.w', 'D2.2', 'E1.w', 'E2', 'F3.d', 'F4.a', 'F4.b'],
    ['docs/**', 'README.md', 'CHANGELOG.md'], [], ['xvfb-run -a npm test'], serial=True)
add('G1', 'Abnahme, Veroeffentlichungsfrage', 'V2-G-abschluss.md', 'S', ['G1.docs'],
    ['docs/**', 'README.md', 'CHANGELOG.md', 'package.json', '.github/workflows/build.yml'], [],
    ['xvfb-run -a npm test', DIFF_APP, PACK], serial=True, build=True)
for k in ['B3', 'C4', 'D4', 'D5', 'E3', 'E4', 'E5']:
    add(k, f'Kann-Paket {k}', 'V2-00-INDEX.md', 'S', ['G1'], [], [], [], serial=True, kann=True)

M = [
  dict(id='phase-vertrauen', version='', kind='audit', after=['A1.w', 'A2.w', 'A3.w', 'A4.w', 'F1.b', 'F2.h'], audit=True, status='offen', note='Phasenpruefung Vertrauen (kein Release)'),
  dict(id='phase-dokumente', version='', kind='audit', after=['B1.w2', 'B2.w', 'C1.1', 'C3.w'], audit=True, status='offen', note='Phasenpruefung Dokumente und Erkennung (kein Release)'),
  dict(id='phase-bedienung', version='', kind='audit', after=['D1.w2', 'D3', 'C2.w', 'D2.2', 'E1.w', 'E2'], audit=True, status='offen', note='Phasenpruefung Bedienung und Betrieb (kein Release)'),
  dict(id='final', version='2.0.0', kind='final', after=['G1'], audit=True, status='offen', note='Gate: nur mit schriftlicher Freigabe des Nutzers'),
]
PROFILES = {
  # Standard: nur Sonnet, Denkaufwand nach Art der Aufgabe (kein Wechsel durch den Nutzer noetig)
  'sonnet': dict(testAutor=dict(model='sonnet', bau='low', denk='medium', spike='high'),
                 implementer=dict(model='sonnet', bau='low', denk='high', spike='xhigh'),
                 pruefer=dict(model='sonnet', normal='medium', crypto='xhigh'),
                 audit=dict(model='sonnet', effort='xhigh')),
  # Sparvariante: Bau-Pakete (Module mit fertigen Tests) mit Haiku
  'gemischt': dict(testAutor=dict(model='sonnet', bau='low', denk='medium', spike='high'),
                   implementer=dict(model='sonnet', bau='low', denk='high', spike='xhigh', bauModel='haiku'),
                   pruefer=dict(model='sonnet', normal='medium', crypto='xhigh'),
                   audit=dict(model='sonnet', effort='xhigh')),
}

queue = {'version': 2, 'maxAttempts': 3, 'profile': 'sonnet', 'profiles': PROFILES, 'packages': P, 'milestones': M}

# Pruefung der Liste (Abhaengigkeiten vorhanden, keine Zyklen)
ids = [p['id'] for p in P]
assert len(ids) == len(set(ids)), 'doppelte Paket-Ids'
byid = {p['id']: p for p in P}
for p in P:
    for d in p['deps']:
        assert d in byid, f"{p['id']}: unbekannte Voraussetzung {d}"
for m in M:
    for d in m['after']:
        assert d in byid, f"Meilenstein {m['id']}: unbekanntes Paket {d}"
state, order = {}, []
def visit(i, path):
    if state.get(i) == 2: return
    assert state.get(i) != 1, 'Zyklus: ' + ' -> '.join(path + [i])
    state[i] = 1
    for d in byid[i]['deps']: visit(d, path + [i])
    state[i] = 2; order.append(i)
for i in ids: visit(i, [])

# Zustand der alten Liste uebernehmen (Status, Versuche, Branch, Commit, Lease, Notizen; Meilensteine: Status und Notiz)
if '--keep-state' in sys.argv:
    old = json.load(open(sys.argv[sys.argv.index('--keep-state') + 1], encoding='utf-8'))
    oldp = {p['id']: p for p in old.get('packages', [])}
    kept = []
    for p in P:
        o = oldp.get(p['id'])
        if o:
            for k in ('status', 'attempts', 'branch', 'commit', 'lease', 'notes'): p[k] = o.get(k, p[k])
            if o.get('status') != 'offen' or o.get('attempts'): kept.append(p['id'])
    oldm = {m['id']: m for m in old.get('milestones', [])}
    for m in M:
        o = oldm.get(m['id'])
        if o and o.get('status') != 'offen': m['status'] = o['status']; m['note'] = o.get('note', m['note'])
    queue['profile'] = old.get('profile', queue['profile'])
    lost = [i for i, o in oldp.items() if i not in byid and (o.get('status') != 'offen' or o.get('attempts'))]
    print('Zustand uebernommen fuer:', ', '.join(kept) or 'nichts', '| verloren (Paket entfallen):', ', '.join(lost) or 'nichts', file=sys.stderr)

print(json.dumps(queue, indent=1, ensure_ascii=False))
