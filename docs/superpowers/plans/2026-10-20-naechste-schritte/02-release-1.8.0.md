# WP 02: Release 1.8.0 aus der Referenzserie

**Ziel:** Die 11 geprüften Patches als Pull Request einspielen, CI auf drei Plattformen grün bekommen, nach Bestätigung (G1)
mergen, taggen, das Release prüfen.
**Modell:** Sonnet niedrig bis mittel. **Aufwand:** 2-3 Stunden (überwiegend Warten auf CI). **Gate:** G1.
**Voraussetzung:** WP 01 erledigt. Repo: `~/projects/privacy-shield-desktop`, Basis `main` auf `dcb1503` (v1.7.0).

## Was die Serie enthält (Reihenfolge ist wichtig, jeder Commit ist für sich lauffähig)

| Patch | Inhalt |
|---|---|
| 0001 | Stabilere Testinfrastruktur (Startwettlauf, Speichermessung, kein echter Browser im Test) |
| 0002 | KI-Erkennung standardmäßig an (Start bei Bedarf, Entladen nach 5 Minuten) |
| 0003 | Mess-Harness für die Erkennungsqualität mit Ratsche (`tests/eval/`) |
| 0004 | Erkennung Welle 1 (Kennzahlen, Adressen, Namen) |
| 0005 | Leistung: große Dokumente bis 8-mal schneller, Ausgabe bitgleich |
| 0006 | Erkennung Welle 2 (Geräte, Zugangsdaten, Standort, Auslandskennungen, Art. 9/10 DSGVO) |
| 0007 | Updater sperrt nie aus; manueller Weg, wo automatisches Installieren nicht möglich ist |
| 0008 | Oberfläche: keine Emojis, korrekte Umlaute, Wortlaut Desktop, Diagnose |
| 0009 | Build/CI/Release: feste Dateinamen, macOS beide Architekturen, Prüfsummen, CHANGELOG, `scripts/verify-release.mjs` |
| 0010 | Version 1.8.0 |
| 0011 | Fehlerdiagnose bei Modellstartfehlern, Installationsprüfung, 0-Byte-Dateien |

## Schritte

- [ ] **1. Arbeitszweig anlegen und Patches einspielen**

```bash
cd ~/projects/privacy-shield-desktop
git status --short                      # erwartet: nur "?? docs/" (Plan) oder leer
git fetch origin main
git checkout -b release/1.8.0 origin/main
git log --oneline -1                    # erwartet: dcb1503 Merge PR #1 ...
PLAN=docs/superpowers/plans/2026-10-20-naechste-schritte/artifacts
rm -rf /tmp/ps-plan && mkdir -p /tmp/ps-plan && git archive plan/naechste-schritte $PLAN | tar -x -C /tmp/ps-plan
git am /tmp/ps-plan/$PLAN/patches/*.patch
git log --oneline dcb1503..HEAD | wc -l # erwartet: 11
```

Bricht `git am` ab: `git am --abort`, Bericht (Stopp-Regel 2). Nicht manuell nachbessern.

- [ ] **2. Abhängigkeiten und Tests lokal**

```bash
npm ci
npm run fetch-vendor                    # lädt Bibliotheken und Modell, prüft SHA-256 gegen scripts/vendor.lock.json
xvfb-run -a npm test 2>&1 | tee /tmp/ps-test.log | tail -15
grep -E '^# (tests|pass|fail)' /tmp/ps-test.log
```

Erwartet: `# tests 33`, `# pass 33`, `# fail 0`. Dauer etwa 3 Minuten. Fehlschlag: einmal wiederholen (Zeitabhängigkeit bei Speicher-
und Ruhetests ist bekannt); schlägt derselbe Test erneut fehl, Stopp-Regel 1.

```bash
npm run eval 2>&1 | tail -20            # Ratsche: darf nicht schlechter sein als tests/eval/baseline.json
```

Erwartet: synthetisch 1 von 276 Lecks (Basis: 87), Handfälle 0 von 91, Fehlalarme 0.

- [ ] **3. CHANGELOG-Datum setzen und Branch pushen**

`CHANGELOG.md`: Überschrift `## [1.8.0] - noch nicht veröffentlicht` ersetzen durch `## [1.8.0] - JJJJ-MM-TT` (Tag der Veröffentlichung).

```bash
git add CHANGELOG.md
git commit -m "docs: Veroeffentlichungsdatum 1.8.0

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
git push -u origin release/1.8.0
gh pr create --draft --base main --head release/1.8.0 --title "PrivacyShield Desktop 1.8.0" --body-file /tmp/ps-plan/$PLAN/pr-body-1.8.0.md
```

Der PR-Text liegt fertig in `artifacts/pr-body-1.8.0.md` (Kurzfassung der Tabelle oben plus Messwerte). Er endet mit der Textzeile
"Erstellt mit Claude Code" (Hausregel: keine Emojis, auch nicht in PR-Texten).

- [ ] **4. CI abwarten**

```bash
gh pr checks --watch
```

`ci.yml` läuft auf Ubuntu und Windows. Typische Windows-Abweichungen (zuerst hier suchen): Pfadtrenner in Tests, Zeilenenden (`.gitattributes`),
Dateisperren beim Aufräumen von Temp-Ordnern, langsamerer Start (Zeitfenster in `waitFor`). Fehler analysieren (Log mit
`gh run view <id> --log-failed`), **höchstens zwei Reparaturversuche** je Fehler, dann Stopp-Regel 1.

- [ ] **5. Gate G1: eine Frage an den Nutzer**

> Release 1.8.0 ist bereit (11 Patches, 33/33 Tests lokal, CI grün auf Ubuntu und Windows). Soll ich den Pull Request mergen, `v1.8.0` taggen
> und das Release prüfen? Empfehlung: ja. Hinweis: Unter Windows lädt das Update von 1.7.0 auf 1.8.0 einmalig den vollen Installer (feste
> Dateinamen), danach differenziell.

Ohne schriftliches "Ja" nicht weitermachen.

- [ ] **6. Nach Bestätigung: Merge, Tag, Build beobachten**

```bash
gh pr ready && gh pr merge --merge --delete-branch
git checkout main && git pull --ff-only origin main
git tag v1.8.0 && git push origin v1.8.0
gh run watch $(gh run list --workflow build.yml --limit 1 --json databaseId -q '.[0].databaseId')
```

`build.yml` baut je Plattform, testet das **gebaute** Programm (`PS_PACKAGED_BIN`) und erstellt das Release nur bei grün.

- [ ] **7. Release prüfen (Pflicht, nichts glauben)**

```bash
xvfb-run -a node scripts/verify-release.mjs v1.8.0 --upgrade-from v1.7.0 --deep
```

Erwartet: Assets `PrivacyShield-Setup.exe`, `-mac-arm64.zip`, `-mac-x64.zip`, `PrivacyShield.AppImage`, `.deb`, `latest*.yml`,
`SHA256SUMS.txt`; Größen plausibel (exe etwa 184 MB); feste Links unter `releases/latest/download/` antworten mit 200 nach Weiterleitung;
Upgrade 1.7.0 auf 1.8.0 (AppImage) erfolgreich. Zusätzlich:

```bash
gh release view v1.8.0 --json body -q .body | head -30   # erwartet: Inhalt des CHANGELOG-Abschnitts, keine builder-debug.yml
```

- [ ] **8. Nutzer bitten, auf einem echten Windows-Rechner zu prüfen (nicht ersetzbar)**

Kurzliste: installieren, KI-Panel zeigt "Aktiv (NER-Modell)" nach erster Analyse, "Auf Updates prüfen" ohne Symbol, Test-Dokument
anonymisieren, "Diagnose kopieren" einfügen. Der betroffene Freund prüft zusätzlich, ob sein Modellfehler verschwunden ist; falls nicht,
liefert "Details kopieren" jetzt die Ursache.

## Abnahme

* `git log --oneline origin/main` enthält die 11 Commits plus Datum-Commit; Tag `v1.8.0` existiert.
* `verify-release.mjs` endet ohne `FEHLER`.
* Release-Text stammt aus dem CHANGELOG; `builder-debug.yml` ist **nicht** unter den Assets.
* WP 03 darf jetzt starten (feste Links existieren).

## Rückfall

Release fehlerhaft: **nicht löschen**, sondern `v1.8.1` mit Korrektur (Updater sieht nur höhere Versionen). Nur ein Tag ohne Assets
(Build fehlgeschlagen) darf gelöscht und neu gesetzt werden: `git push origin :refs/tags/v1.8.0`, Ursache beheben, neuen Tag setzen.
