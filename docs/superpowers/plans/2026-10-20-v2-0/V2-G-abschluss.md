# V2-G: Abnahme, Dokumentation, Veröffentlichung

**Marke:** S. **Aufwand:** 4 h plus Wartezeiten. **Gate:** G1 (Pre-release und Release). Voraussetzung: alle **Muss**- und **Soll**-Pakete laut `V2-STATUS.md` erledigt oder begründet verschoben.

## 1. Pre-releases (Beta-Verteilung)

- [ ] Nach P2 (Vertrauen): `package.json` Version `2.0.0-beta.1`, `CHANGELOG.md` Abschnitt `## [2.0.0-beta.1] - Datum`, Tag `v2.0.0-beta.1`. **Gate G1** (Frage mit Empfehlung). Release mit `--prerelease` (Workflow: Tags mit Bindestrich als Pre-release markieren; Schritt in `build.yml` ergänzen: `gh release create ... $( [[ "$TAG" == *-* ]] && echo --prerelease )`). Der Link `releases/latest` zeigt weiter auf die stabile Version.
- [ ] Prüfung der Betas wie `02-release-1.8.0.md` Schritt 7 (`verify-release.mjs`), **ohne** feste Links zu prüfen, die nur für das stabile Release gelten.
- [ ] Rückmeldung einholen (Nutzer plus 2 bis 3 Testpersonen): Installation, Mehrfachverarbeitung, Passwortdialog, Prüfansicht; Fehler als Fälle in die Tests.
- [ ] `2.0.0-beta.2` nach P3, `2.0.0-rc.1` nach P5, jeweils gleiches Verfahren.

## 2. Abnahmelauf (vor `2.0.0`)

```bash
npm ci && npm run fetch-vendor
xvfb-run -a npm test                       # alle Suiten inkl. Unit, a11y, cli, project, realdocs
npm run eval                               # Ratsche, beide Modi; Tabelle in den PR-Text
npm run build:linux && PS_PACKAGED_BIN=dist/linux-unpacked/privacy-shield-desktop xvfb-run -a npm test
git log --oneline v1.8.0..HEAD | wc -l     # Umfang notieren
```

Zusätzlich manuell (Nutzer, echter Windows-Rechner; Checkliste in `docs/abnahme-windows.md`): Installation, erster Start ohne Netz (Flugmodus), KI-Panel "Aktiv", 3 Dokumente gemeinsam anonymisieren, Passwort-Zuordnung speichern und laden, Prüfansicht, Bericht, Kommandozeile (`start /wait`), Update von 1.8.0 (Hinweis, Download, Neustart in 2.0.0).

## 3. Dokumentation

- [ ] `README.md`: Funktionen 2.0, Kommandozeile, Richtliniendatei, Formate, Tests.
- [ ] `docs/benutzerhandbuch.md` (Kurzfassung, 2 bis 3 Seiten): Ablauf, Gegenprüfung, Bericht, verschlüsselte Zuordnung (**Passwortverlust ist endgültig**), Prüfansicht, Projekte, bekannte Grenzen (OCR, Zahlen in Bildern, Sprachen).
- [ ] `docs/kommandozeile.md`, `docs/policy-format.md`, `docs/erkennung-entscheidungen.md`, `docs/a11y-backlog.md`.
- [ ] `CHANGELOG.md` Abschnitt 2.0.0 (Erkennung, Vertrauen, Dokumente, Bedienung, Betrieb, Verteilung; **Hinweis "Platzhalterformat" und "Zuordnung jetzt verschlüsselt"**).
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
