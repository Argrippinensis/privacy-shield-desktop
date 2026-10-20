# Erzeugt V2-QUEUE.json (maschinenlesbare Arbeitsliste). Aufruf: python3 -I make-queue.py > V2-QUEUE.json
import json
U = 'npm run test:unit'
def e2e(f): return f'xvfb-run -a node --test --test-concurrency=1 tests/{f}'
def unit(f): return f'node --test tests/unit/{f}'
P = []
def add(id, title, doc, mark, deps, allowed, tests, accept, serial=False, kann=False, model=None, effort='low', parallel=None):
    P.append(dict(id=id, title=title, doc=doc, mark=mark, model=model or ('haiku' if mark == 'H' else 'sonnet'), effort=effort,
                  serial=serial, parallel=(not serial) if parallel is None else parallel, kann=kann, deps=deps,
                  allowed=allowed, tests=tests, accept=accept, status='offen', attempts=0, branch='', commit='', lease=None, notes=''))
HTML = 'app/privacy-shield.html'
add('F2', 'Unit-Laeufer, Electron 44, Haertung', 'V2-F-fundament.md#f2', 'S', [],
    ['package.json', 'package-lock.json', '.github/workflows/*.yml', 'tests/helpers.mjs', 'tests/unit/**', 'tests/shell.test.mjs', 'tests/hygiene.test.mjs', 'main.js', 'preload.js', 'app/index.html', 'THIRD_PARTY_NOTICES.md'],
    ['tests/unit/**', 'tests/shell.test.mjs'], [U, 'xvfb-run -a npm test'], serial=True)
add('F1.spike', 'Machbarkeitspruefung Kernauslagerung (Go/Nein)', 'V2-F-fundament.md#f1', 'S', ['F2'],
    ['docs/superpowers/plans/2026-10-20-v2-0/artifacts/f1-abhaengigkeiten.md'], [], [], serial=True, effort='medium')
add('F1', 'Erkennungskern auslagern', 'V2-F-fundament.md#f1', 'S', ['F1.spike'],
    ['app/lib/detect.js', HTML, 'tests/unit/detect*.test.mjs', 'tests/eval/dump-reference.mjs', 'tests/golden/reference-v1.8.json', 'package.json'],
    ['tests/unit/detect*.test.mjs'], [U, 'xvfb-run -a npm test', 'xvfb-run -a npm run eval'], serial=True, effort='medium')
add('A1.m', 'Gegenpruefung: Modul', 'V2-A-vertrauen.md#a1', 'H', ['F2'], ['app/lib/leakcheck.js', 'tests/unit/leakcheck.test.mjs'], ['tests/unit/leakcheck.test.mjs'], [unit('leakcheck.test.mjs')])
add('A1.w', 'Gegenpruefung: Oberflaeche', 'V2-A-vertrauen.md#a1', 'S', ['A1.m'], [HTML, 'tests/leakcheck.test.mjs'], ['tests/leakcheck.test.mjs'], [U, e2e('leakcheck.test.mjs')], serial=True)
add('A2.m', 'Bericht: Modul', 'V2-A-vertrauen.md#a2', 'H', ['F2'], ['app/lib/report.js', 'tests/unit/report.test.mjs'], ['tests/unit/report.test.mjs'], [unit('report.test.mjs')])
add('A2.w', 'Bericht: Oberflaeche', 'V2-A-vertrauen.md#a2', 'S', ['A2.m', 'A1.w'], [HTML, 'tests/report.test.mjs'], ['tests/report.test.mjs'], [U, e2e('report.test.mjs')], serial=True)
add('A3.m', 'Verschluesselte Zuordnung: Modul', 'V2-A-vertrauen.md#a3', 'H', ['F2'], ['app/lib/psmap.js', 'tests/unit/psmap.test.mjs'], ['tests/unit/psmap.test.mjs'], [unit('psmap.test.mjs')])
add('A3.w', 'Verschluesselte Zuordnung: Oberflaeche', 'V2-A-vertrauen.md#a3', 'S', ['A3.m', 'A2.w'], [HTML, 'tests/psmap.test.mjs'], ['tests/psmap.test.mjs'], [U, e2e('psmap.test.mjs')], serial=True, effort='medium')
add('A4', 'Hygiene der Ausgaben', 'V2-A-vertrauen.md#a4', 'H', ['F2'], ['app/lib/hygiene.js', HTML, 'main.js', 'preload.js', 'tests/unit/hygiene.test.mjs', 'tests/hygiene2.test.mjs'], ['tests/unit/hygiene.test.mjs', 'tests/hygiene2.test.mjs'], [U, e2e('hygiene2.test.mjs')], serial=True)
add('B1.fix', 'Sofortfix: Meldung bei Mehrfachauswahl', 'V2-B-dokumente.md#b1', 'H', ['F2'], [HTML, 'tests/multifile.test.mjs'], ['tests/multifile.test.mjs'], [e2e('multifile.test.mjs')], serial=True)
add('B1.m', 'Projekt: Modul', 'V2-B-dokumente.md#b1', 'H', ['F2'], ['app/lib/project.js', 'tests/unit/project.test.mjs'], ['tests/unit/project.test.mjs'], [unit('project.test.mjs')])
add('B1.w', 'Projekt: Oberflaeche, ZIP', 'V2-B-dokumente.md#b1', 'S', ['B1.m', 'B1.fix', 'A2.w', 'A3.w', 'A4'], [HTML, 'tests/project.test.mjs'], ['tests/project.test.mjs'], [U, e2e('project.test.mjs')], serial=True, effort='medium')
add('B2.m', 'Formate: Modul', 'V2-B-dokumente.md#b2', 'H', ['F2'], ['app/lib/formats.js', 'tests/unit/formats.test.mjs'], ['tests/unit/formats.test.mjs'], [unit('formats.test.mjs')])
add('B2.w', 'Formate: Oberflaeche', 'V2-B-dokumente.md#b2', 'H', ['B2.m', 'B1.w'], [HTML, 'tests/formats.test.mjs'], ['tests/formats.test.mjs'], [U, e2e('formats.test.mjs')], serial=True)
add('C1.1', 'Korpusschleife Durchlauf 1', 'V2-C-erkennung.md#c1', 'S', ['F2'], ['tests/eval/**', 'tests/golden/**', 'tests/realdocs.test.mjs', 'app/lib/detect.js', HTML, 'docs/erkennung-entscheidungen.md'], ['tests/realdocs.test.mjs'], ['xvfb-run -a npm test', 'xvfb-run -a npm run eval'], serial=True, effort='medium')
add('C3.m', 'Eigene Regeln: Modul', 'V2-C-erkennung.md#c3', 'H', ['F2'], ['app/lib/policy.js', 'tests/unit/policy.test.mjs'], ['tests/unit/policy.test.mjs'], [unit('policy.test.mjs')])
add('C3.w', 'Eigene Regeln: Oberflaeche', 'V2-C-erkennung.md#c3', 'S', ['C3.m', 'C1.1'], [HTML, 'app/lib/detect.js', 'tests/policy.test.mjs'], ['tests/policy.test.mjs'], [U, e2e('policy.test.mjs')], serial=True)
add('C2', 'Verknuepfung derselben Person', 'V2-C-erkennung.md#c2', 'S', ['C1.1', 'F1'], ['app/lib/coref.js', 'app/lib/detect.js', HTML, 'tests/unit/coref.test.mjs', 'tests/eval/**', 'tests/golden/**', 'tests/**/*.mjs', 'CHANGELOG.md'], ['tests/unit/coref.test.mjs'], [U, 'xvfb-run -a npm test', 'xvfb-run -a npm run eval'], serial=True, effort='medium')
add('D1.m', 'Pruefansicht: Module', 'V2-D-bedienung.md#d1', 'H', ['F2'], ['app/lib/history.js', 'app/lib/review.js', 'tests/unit/history.test.mjs', 'tests/unit/review.test.mjs'], ['tests/unit/history.test.mjs', 'tests/unit/review.test.mjs'], [unit('history.test.mjs'), unit('review.test.mjs')])
add('D1.w', 'Pruefansicht: Oberflaeche', 'V2-D-bedienung.md#d1', 'S', ['D1.m', 'A1.w'], [HTML, 'tests/review.test.mjs'], ['tests/review.test.mjs'], [U, e2e('review.test.mjs')], serial=True, effort='medium')
add('D3', 'Info-Dialog', 'V2-D-bedienung.md#d3', 'H', ['F2'], [HTML, 'app/index.html', 'main.js', 'preload.js', 'tests/info.test.mjs'], ['tests/info.test.mjs'], [e2e('info.test.mjs')], serial=True)
add('D2', 'Barrierefreiheit', 'V2-D-bedienung.md#d2', 'S', ['D1.w', 'D3', 'A3.w'], [HTML, 'app/index.html', 'app/css/**', 'tests/a11y.test.mjs', 'package.json', 'package-lock.json', 'THIRD_PARTY_NOTICES.md', 'docs/a11y-backlog.md'], ['tests/a11y.test.mjs'], [e2e('a11y.test.mjs')], serial=True, effort='medium')
add('E1', 'Kommandozeile', 'V2-E-betrieb.md#e1', 'S', ['A2.w', 'A3.w', 'B1.w'], ['main.js', 'preload.js', 'app/cli.html', 'app/lib/**', 'tests/cli.test.mjs', 'docs/kommandozeile.md', 'package.json'], ['tests/cli.test.mjs'], [e2e('cli.test.mjs')], serial=True, effort='medium')
add('E2', 'Oeffnen mit, Einzelinstanz', 'V2-E-betrieb.md#e2', 'H', ['B1.w'], ['main.js', 'preload.js', HTML, 'app/index.html', 'tests/open-with.test.mjs'], ['tests/open-with.test.mjs'], [e2e('open-with.test.mjs')], serial=True)
add('F3', 'Bibliotheken aktualisieren', 'V2-F-fundament.md#f3', 'S', ['F1'], ['scripts/vendor.lock.json', 'scripts/fetch-vendor.mjs', 'THIRD_PARTY_NOTICES.md', HTML, 'app/lib/**', 'tests/**'], [], ['xvfb-run -a npm test', 'xvfb-run -a npm run eval'], serial=True, effort='medium')
add('F4', 'Stabilitaet: Eigenschafts-, Fuzz-, Installationstests', 'V2-F-fundament.md#f4', 'S', ['F1', 'B2.m'], ['tests/**', '.github/workflows/build.yml', 'package.json'], ['tests/unit/properties.test.mjs', 'tests/unit/fuzz.test.mjs'], [U], serial=True)
add('C1.2', 'Korpusschleife Durchlauf 2', 'V2-C-erkennung.md#c1', 'S', ['C1.1', 'C2'], ['tests/eval/**', 'tests/golden/**', 'tests/realdocs.test.mjs', 'app/lib/detect.js', HTML, 'docs/erkennung-entscheidungen.md'], [], ['xvfb-run -a npm test', 'xvfb-run -a npm run eval'], serial=True, effort='medium')
add('C1.3', 'Korpusschleife Durchlauf 3', 'V2-C-erkennung.md#c1', 'S', ['C1.2'], ['tests/eval/**', 'tests/golden/**', 'tests/realdocs.test.mjs', 'app/lib/detect.js', HTML, 'docs/erkennung-entscheidungen.md'], [], ['xvfb-run -a npm test', 'xvfb-run -a npm run eval'], serial=True, effort='medium')
add('G1', 'Abnahme, Dokumentation, Veroeffentlichung', 'V2-G-abschluss.md', 'S', ['A4', 'B2.w', 'C1.3', 'C3.w', 'D2', 'E1', 'E2', 'F3', 'F4'], ['docs/**', 'README.md', 'CHANGELOG.md', 'package.json', '.github/workflows/build.yml'], [], ['xvfb-run -a npm test'], serial=True, effort='medium')
for k in ['B3', 'C4', 'D4', 'D5', 'E3', 'E4', 'E5']:
    add(k, f'Kann-Paket {k}', 'V2-00-INDEX.md', 'S', ['G1'], [], [], [], serial=True, kann=True)
M = [
  dict(id='beta1', version='2.0.0-beta.1', kind='prerelease', after=['A1.w', 'A2.w', 'A3.w', 'A4', 'F1.spike'], audit=True, status='offen', note=''),
  dict(id='beta2', version='2.0.0-beta.2', kind='prerelease', after=['B1.w', 'B2.w', 'C1.1', 'C3.w', 'D1.w', 'D3'], audit=False, status='offen', note=''),
  dict(id='rc1', version='2.0.0-rc.1', kind='prerelease', after=['C2', 'D2', 'E1', 'E2'], audit=True, status='offen', note=''),
  dict(id='final', version='2.0.0', kind='final', after=['G1'], audit=True, status='offen', note='Gate: nur mit schriftlicher Freigabe des Nutzers'),
]
print(json.dumps({'version': 1, 'maxAttempts': 3, 'packages': P, 'milestones': M}, indent=1, ensure_ascii=False))
