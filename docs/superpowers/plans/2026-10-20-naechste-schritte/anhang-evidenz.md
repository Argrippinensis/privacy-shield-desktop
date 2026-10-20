# Anhang: Belege und Messungen (Stand 20.10.2026)

Alles unten wurde in dieser Arbeit selbst gemessen oder ausgeführt. "Nicht geprüft" ist ausdrücklich so vermerkt.

## 1. Rollout 1.7.0

| Prüfung | Befehl / Quelle | Ergebnis |
|---|---|---|
| Release und "latest" | `gh release list` | `v1.7.0`, veröffentlicht 2026-10-20 05:39 UTC (07:39 MESZ), als `latest` markiert |
| Assets | `gh release view v1.7.0` | exe 184 MB, zip 212 MB, AppImage 220 MB, deb 195 MB, `latest*.yml`, `builder-debug.yml` (überflüssig) |
| Prüfsumme | SHA-512 der exe gegen `latest.yml` | gleich |
| Installer-Inhalt | `7z l -slt` | alle 19 gebündelten Dateien (Modell, OCR-Daten, Laufzeit) in der Größe aus `vendor.lock.json` |
| Gepacktes Programm (Linux) | `PS_PACKAGED_BIN=<AppRun> xvfb-run -a npm test` | alle 11 damaligen Tests grün |
| Update 1.6.2 auf 1.7.0 (Linux, AppImage) | `scripts/verify-release.mjs --upgrade-from` (Patch 0009) | Hinweis, Download, Austausch der Datei (SHA-512 stimmt), Neustart in 1.7.0 |
| Website | `curl` Live-Seite, Download-Links | Seite zeigt v1.7.0, 3 Links antworten 200 (Website-Commit `dc07a1e`, 20.10. 07:44 MESZ) |
| macOS-ZIP | Auflistung des Archivs | nur arm64, keine `_CodeSignature` (unsigniert) |
| Windows- und macOS-Programm gestartet | – | **nicht geprüft** (in dieser Umgebung nicht ausführbar); ab 1.8.0 testet die CI jedes gebaute Programm auf allen drei Plattformen |

### Verlauf der Download-Seite (für den gemeldeten Fehler)

| Website-Commit | Zeitpunkt (MESZ) | Verlinktes Release | Programmversion |
|---|---|---|---|
| `31981de` | 25.06.2026 | `v1.1.5` (Dateien `...-1.1.0.*`) | 1.1.0 (`package.json` im Tag) |
| `17862df` | 19.10.2026 21:52 | `v1.6.2` | 1.6.2 |
| `dc07a1e` | 20.10.2026 07:44 | `v1.7.0` | 1.7.0 |

Download des Nutzers am 19.10.2026 20:21 Uhr: Stand `31981de`, also **Version 1.1.0**.

## 2. Nachgestellter Fehler "Modell konnte nicht geladen werden" (Version 1.1.0)

Quelle: Tag `v1.1.5` ausgecheckt (`git archive`), unter Electron 35 mit Playwright gestartet, `loadAIModel()` aufgerufen (Skript `/tmp/ps-eval/repro-v110.mjs`):

| Szenario | Dauer | Anzeige | Konsole |
|---|---|---|---|
| kein Netz (`--proxy-server=http://127.0.0.1:9`) | < 1 s | Fehlerpanel "Modell konnte nicht geladen werden. Die Standard-Erkennung (Regex + Klicken) funktioniert ohne Einschränkung." | `ERR_PROXY_CONNECTION_FAILED`, `Failed to fetch dynamically imported module: https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.5.2` |
| nur `huggingface.co`, `*.huggingface.co`, `*.hf.co` nicht auflösbar | < 1 s | derselbe Text | `ERR_NAME_NOT_RESOLVED`, `Failed to fetch` |

Im Code von 1.1.0: `TRANSFORMERS_CDN = "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.5.2"`, Modell beim ersten Gebrauch aus dem Netz. Der Update-Dialog dieser Version nennt "Update erforderlich" und "Jetzt aktualisieren".

Für 1.7.0 (Modell gebündelt) reproduziert (Wegwerfkopie der Referenzserie): fehlende Modelldatei, abgeschnittene Modelldatei (10.485.760 Bytes: "10,0 MB statt 129,1 MB"), fehlendes Manifest, 0-Byte-Datei; jeweils mit Ursache in der Anzeige ab Patch 0011 (`tests/ai-fehler.test.mjs`).

Nicht belegt: warum das Netz des Nutzers blockierte (Firmenfilter, Virenschutz, Unterbrechung); das Ergebnis ist für alle Fälle gleich und mit 1.7.0 behoben.

## 3. Erkennungsqualität (Harness `npm run eval`, echte Electron-App, offline)

Testsätze: 91 kuratierte + 59 DSGVO-Fälle (positiv), 20 Negativfälle, 276 synthetische Werte in 42 Dokumenten (Seed fest).

| Stand | Modus | Positive Fälle mit Leck | Synthetisch mit Leck | Falsch maskiert |
|---|---|---|---|---|
| 1.7.0 | ohne Modell | 84 von 150 | 109 von 276 | 2 |
| 1.7.0 | mit Modell | 68 von 150 (27 + 41) | 87 von 276 | 3 |
| 1.8.0 | ohne Modell | 21 von 150 | 18 von 276 | 0 |
| 1.8.0 | mit Modell | 4 von 150 (0 + 4) | 1 von 276 | 0 |

Reste 1.8.0 mit Modell: `G-NAME` 2 (ga03, ga05: GROSSGESCHRIEBENER Name mit Komma, Rufname in Anführungszeichen), `G-NATION` 1 (ga28, Aufenthaltstitel-Nummer), `G-AUSLAND` 1 (ge01, ungültige Dummy-NI-Nummer).
Reste 1.8.0 ohne Modell: NAME 5, ORG 2, ORT 1, G-NAME 7, G-GEBURT 2, G-FAMILIE 1, G-NATION 1, G-ART9 1, G-AUSLAND 1; synthetisch 18 (Namen, Orte).

Messung Web-Tool (Chromium, ohne KI, Skript `/tmp/web-lab/web-eval.mjs`, 91 Handfälle):

| Stand | Handfälle mit Leck | Falsch maskiert | Synthetisch |
|---|---|---|---|
| live (heute) | 37 von 91 | 1 | 109 von 276 |
| mit Detektions-Patches 1 bis 5 | 8 von 91 | 0 | 21 von 276 |

Übertragbarkeit der Desktop-Serie auf das Web-Tool: nach `prettier --print-width 120` passen 43 von 48 Änderungsblöcken (Desktop 1.7.0 zu 1.8.0) automatisch; 5 sind Desktop-Spezifika bzw. brauchen Handarbeit (siehe WP 06).

## 4. Leistung und Speicher (Electron 35, Testmaschine, `tests/perf.test.mjs`, `offline-ai.test.mjs`)

| Messung | Wert |
|---|---|
| Entitäten 617 / 2.417 / 6.017 (Serie: vorher zu nachher) | 167 zu 75 ms / 1.509 zu 175 ms / 10.874 zu 1.472 ms |
| Stand des Perf-Tests am Ende der Serie | 400 Abschnitte, 2.417 Entitäten: 275 ms; 1.000 Abschnitte, 6.017 Entitäten: 723 ms |
| Ausgabe bei Leistungsänderung | Hash von Text und Zuordnung identisch, Rundreise exakt, 148 Harness-Fälle identisch |
| Analyse 8.269 Zeichen mit Modell | 5.360 ms, längster Stillstand der Oberfläche 42 ms |
| Speicher der App | Start 578 MB; mit Modell 1.221 MB; nach Entladen 905 MB; im Standardmodus mit Modell 1.264 MB, nach Leerlauf-Entladen 616 MB |
| Freeze der Oberfläche (v1.6.2 zu v1.7.0, aus der ersten Arbeitsphase) | 1,3 s zu unter 30 ms |

## 5. Tests und CI

| Prüfung | Ergebnis |
|---|---|
| Vollständige Suite Referenzserie (Electron 35) | `# tests 33`, `# pass 33`, `# fail 0`, `EXIT 0`, Dauer 182 s (Datei `/tmp/ps-ref/final-test2.log`) |
| Electron 44.9.1 (vor Patch 0011) | 26 von 26, ohne Änderung am Programmcode; Test-Helfer um `win.reload({waitUntil:'load'})` ergänzt |
| `git am` der Serie (11 Patches) in frischem Klon von `main` | identischer Baum wie im Referenzstand (`0f156a86bb59c96f08de292ac1d54e5c218fc6ba`) |
| `actionlint` für `ci.yml` und `build.yml` | ohne Beanstandung |
| Windows- und macOS-Läufe der CI | **noch nicht gelaufen**, erst nach dem Push des Pull Requests |

## 6. Handy-App (Prototyp, Chromium-Emulation)

* Installierbarkeit laut `Page.getInstallabilityErrors`: keine Fehler (Pixel 7). Manifest gültig, Anzeige `standalone`.
* Service Worker aktiv, Offline-Start aus dem Cache (Seite lädt, `anon` vorhanden, keine Skriptfehler).
* Hinweis erscheint auf Pixel 7 (Android-Anleitung) und iPhone 14 ("Teilen", "Zum Home-Bildschirm"). System-Monitor auf Handys ausgeblendet.
* **Nicht geprüft:** echte Geräte (iPhone Safari, Android Chrome); Verhalten von iOS beim Offline-Start der KI-Bibliotheken.

## 7. Modell-Spike

Siehe `10-modell-spike.md` (Kandidat `bardsai` PII v2, 308.618.574 Bytes gegenüber 135.359.829 Bytes; Handfälle 7 von 91, DSGVO 19 von 59, synthetisch 7 von 276 ohne Regeln).

## 8. Bekannte Einschränkungen dieser Prüfung

* Keine Ausführung auf Windows oder macOS; Aussagen dazu stützen sich auf Paketinhalt, Prüfsummen und die Linux-Ausführung.
* Messungen mit synthetischen und von Hand geschriebenen Texten; echte Kundendokumente wurden nicht verwendet (Datenschutz). WP 05 schließt die Lücke mit realistischen Dokumenten.
* Zeitmessungen auf einer einzelnen Maschine; Absolutwerte schwanken, die Verhältnisse nicht.
* Die Ursache der blockierten Modell-Downloads beim Nutzer ist nicht bekannt (siehe Abschnitt 2).
