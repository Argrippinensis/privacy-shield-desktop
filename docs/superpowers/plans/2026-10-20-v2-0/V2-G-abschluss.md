# V2-G: Abnahme, Dokumentation, Veröffentlichung

**Marke:** S. **Aufwand:** 4 h plus Wartezeiten, in zwei Paketen: **G1.docs** (Dokumentation, Voraussetzung: alle funktionalen Muss- und Soll-Pakete) und **G1** (Abnahmelauf und Veröffentlichungsfrage, Voraussetzung G1.docs). **Gate:** G1 (Release 2.0.0). Voraussetzung: alle **Muss**- und **Soll**-Pakete laut Arbeitsliste (`node loop/queue.mjs status`) erledigt oder begründet verschoben.

## 1. Keine Pre-releases

Es gibt keine Betas und keine Release Candidates (Entscheidung des Nutzers). Zwischenstände werden **nur intern** durch Phasenprüfungen (Meilensteine in der Arbeitsliste) und den Differenztest abgesichert; der Nutzer kann jederzeit einen Entwicklungsstand selbst bauen und ausprobieren (`npm run build:linux` bzw. Artefakte des Pull-Request-Laufs).

## 2. Abnahmelauf (vor `2.0.0`)

```bash
npm ci && npm run fetch-vendor
xvfb-run -a npm test                       # alle Suiten inkl. Unit, a11y, cli, project, realdocs (gemessen auf 1.8.0: 33 Tests, 3 min 5 s; wird laenger)
xvfb-run -a npm run eval                   # Ratsche, drei Modi (wortlisten/fallback/ki); Tabelle in den PR-Text
xvfb-run -a npm run eval -- --set v2       # neue Menge (C1.0): Zahlen gegen baseline-v2.json
xvfb-run -a node tests/eval/diff-reference.mjs   # Differenztest gegen die Referenz von 1.8.0 (aus F2): jede Abweichung erklaeren
node tests/eval/diff-reference.mjs --node  # dasselbe im Kern allein (Sekunden)
npm run build:linux && PS_PACKAGED_BIN=dist/linux-unpacked/privacy-shield-desktop xvfb-run -a npm test
gh workflow run build.yml --ref v2/main    # Probelauf der Paketbauten auf drei Systemen, OHNE Release (Release-Job laeuft nur bei Tags); danach gh run watch
git log --oneline v1.8.0..HEAD | wc -l     # Umfang notieren
```

**Erwartete, zu erklärende Abweichungen im Differenztest** (jede steht mit Fall-Id in `V2-ENTSCHEIDUNGEN.md` bzw. `docs/erkennung-entscheidungen.md`): Modus `w0` (C1.1: Wortlisten ohne KI-Treffer immer aktiv), Fälle mit mehreren Namensformen derselben Person (C2.w), pathologische Eingaben (F5, nicht im Korpus), Verbesserungen aus C1.1 bis C1.3. Alles andere ist ein Fehler.

Zusätzlich manuell (Nutzer, echter Windows-Rechner; Checkliste in `docs/abnahme-windows.md`): Installation, erster Start ohne Netz (Flugmodus), KI-Panel "Aktiv", 3 Dokumente gemeinsam anonymisieren, Passwort-Zuordnung speichern und laden, Prüfansicht, Bericht, Kommandozeile (`start /wait`), Update von 1.8.0 (Hinweis, Download, Neustart in 2.0.0).

## 3. Dokumentation

- [ ] `README.md`: Funktionen 2.0, Kommandozeile, Richtliniendatei, Formate, Tests (`npm run test:unit`, `npm run eval`, `diff-reference`).
- [ ] `docs/benutzerhandbuch.md` (Kurzfassung, 2 bis 3 Seiten): Ablauf, Gegenprüfung, Bericht, verschlüsselte Zuordnung (**Passwortverlust ist endgültig**), Prüfansicht, Projekte, bekannte Grenzen (OCR, Zahlen in Bildern, Sprachen).
- [ ] `docs/kommandozeile.md`, `docs/policy-format.md` (inklusive der erlaubten Regex-Teilmenge: keine unbegrenzten Quantoren), `docs/erkennung-entscheidungen.md`, `docs/a11y-backlog.md`, `docs/abnahme-windows.md`, `docs/v2/web-tool-kern.md` (aus F1.b) auf Aktualität prüfen.
- [ ] `CHANGELOG.md` Abschnitt 2.0.0 (Erkennung, Vertrauen, Dokumente, Bedienung, Betrieb, Verteilung; **Hinweis "Platzhalterformat" und "Zuordnung jetzt verschlüsselt"**; Behebungen gegenüber 1.8.0: manuelle Markierungen gehen nicht mehr verloren, Dateinamen im ZIP ohne Originalnamen, Wortlisten ohne KI immer aktiv, keine Minuten-Rechenzeit bei langen Leerraum- oder Buchstabenfolgen, Kopieren-Berechtigung).
- [ ] Migrationshinweise im CHANGELOG: alte CSV-Zuordnungen bleiben ladbar; Einstellungen aus 1.x bleiben.

## 4. Website (Gate G2, Repo `arcangeli-website`)

Texte der Download-Seite (Funktionen, Systemvoraussetzungen, Installationshinweise aus WP 09 Teil A), Link auf Benutzerhandbuch; **keine** Versionsnummer im Text (feste Links). Web-Tool unverändert (D18) außer den bereits freigegebenen Paketen 04/06 des Vorgängerplans.

## 5. Veröffentlichung 2.0.0 (Gate G1, eine Frage mit Empfehlung)

Ablauf wie `02-release-1.8.0.md` Schritte 5 bis 8, mit `xvfb-run -a node scripts/verify-release.mjs v2.0.0 --upgrade-from v1.8.0 --deep`. Danach Beobachtung 7 Tage: Downloadzahlen (`gh release view v2.0.0 --json assets`), eingehende "Details kopieren"-Berichte, Fehlerrückmeldungen. **Rückfall:** Release nie löschen, sondern `2.0.1` mit Korrektur; bei schwerem Fehler Release auf Pre-release zurückstufen (`gh release edit v2.0.0 --prerelease`), damit `latest` wieder auf die Vorversion zeigt und der Updater sie nicht mehr anbietet.

## 6. Nach dem Release

- Projektgedächtnis aktualisieren (Stand, Version, offene Punkte 2.1: Kann-Pakete, Signierung, Web-Tool mit gemeinsamem Kern, englische Oberfläche).
- Aufräumen: temporäre Ordner unter `/tmp` (`ps-*`), Branches `plan/*` und `v2/*` nach Merge löschen (nach Bestätigung).

## Abnahme

* Release-Seite zeigt 2.0.0 als "Latest", Text aus dem CHANGELOG, alle Installer, `SHA256SUMS.txt`.
* `verify-release.mjs` ohne `FEHLER`; Update 1.8.0 auf 2.0.0 bestanden.
* Nutzer hat die Windows-Checkliste durchlaufen und zurückgemeldet.
