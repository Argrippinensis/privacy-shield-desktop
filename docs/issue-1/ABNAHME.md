# Auftrag arcangeli.eu#1 – Prüfprotokoll

Erste Übergabe als Draft; die anschließend beauftragte Veröffentlichung und CI-Korrekturen stehen in [FREIGABE.md](FREIGABE.md).

## Startabgleich (26.10.2026)

- Desktop: `main` = `808bd97cf4d1d99d5349ae5335c6df8e68e4020d`.
- Website: `main` = `8c913bfb9134de569f8b4b49658904937d77bc7d`.
- Beide Arbeitsverzeichnisse waren sauber. Keine AGENTS.md gefunden. Repository-Kontext und Browser-Bauanleitung gelesen.
- Remote-Heads mit `git fetch origin` und `git ls-remote --heads origin` abgeglichen. Keine offenen PRs laut GitHub-Abfrage.
- Die im Issue genannten lokalen Launch-Audit-/CLI-Safety-/Claims-Branches waren nicht vorhanden. Vorhandene Remote-Branches (u.a. launch-readiness-auftrag, release-gate-completeness und a11y-no-text-fade) unverändert erhalten. Keine ungeprüften Vorarbeiten übernommen.
- Gemeinsame Quelle `app/privacy-shield.html`, `app/lib/`, neu `app/ui/`; Browser nur über `scripts/build-web-beta.mjs`. Kein duplizierter Erkennungskern.

## Umsetzung und Prüfzuordnung

| Punkt | Umsetzung | Reproduzierbare Prüfung |
|---|---|---|
| A Startabgleich | erledigt, siehe oben | aktuelle Heads, saubere Ausgangsbäume, offene PRs geprüft |
| F1 PDF-Abdeckung | jede Seite einzeln; Text, Bild/OCR, gerenderte Leerseite; unklare Grafik, OCR-Fehler und >20 OCR-/unklare Seiten werden vollständig abgelehnt | `processing-evidence.test.mjs`: echte native/Scan/Misch-/Grafik-/Leerseiten-PDFs, kaputtes PDF, 21 Scan-Seiten; echter Tesseract-Lauf |
| F2 Laufbindung | Eingabe/Einstellungen/Regeln/Freigaben/Markierungen/Ergebnis/Projekt an Lauf gebunden; Änderungen sperren Ausgaben und setzen Sichtprüfung zurück; Hash-/ZIP-Prüfung vor Ausgabe; native Nachprüfung nach Speicherdialog | Browser-Regressionen für Änderungsgruppen, Hash-Rennen, Projektbearbeitung/-löschung/Teilimport; Desktop-Test mit verzögertem echten IPC-Speicherweg und Abbruch |
| F3 Zuordnung | Browserrahmen und interne Links: bleiben, herunterladen, bewusst verlassen; bedingtes beforeunload; gestarteter Browserdownload zählt erst nach bewusster Speicherbestätigung | echter Rahmenklick, Abbruch des Passwortdialogs, bewusster Wechsel, Reload-Warnung, neue Zuordnung; Mobilgrenzen siehe unten |
| F4 Caches | alter Worker löscht nur obsolete `ps-shell-ps-*` / `ps-libs-ps-*`; Versionswechsel erzwingt Aktualisierung | Website-Test mit echtem Worker, Aktivierung und Update, eigener alter/aktueller Familie, transformers-cache, anderem App-Cache und Importcache |
| F5 Ressourcen | fehlende Importbibliotheken, PDF-Worker oder OCR-Ressourcen separat von Dateischäden; PDF-Worker in eigenem Ressourcencache; kein automatischer KI-Download | Offline-Erstbedarf/unterbrochene Ressource, vorbereiteter Offline-PDF-Import, Cache-Löschung, beschädigte Datei |
| F6 Kopieren | Hauptknopf nutzt Brücke mit Clipboard-/execCommand-Ersatz; bei Fehlschlag sichtbare Anleitung und ausgewählter Text | tatsächlicher Knopfklick bei erlaubter, abgewiesener und fehlender API; keine unbehandelte Promise-Ablehnung |
| C Verarbeitungsnachweis | Vorschau, Druck/PDF und JSON aus ausdrücklicher Feldliste desselben Laufs; keine Inhalte/Dateinamen/Originalhashes; menschliche Bestätigung nicht vorausgewählt | unabhängige PDF-Textextraktion, Hashvergleich, private synthetische Marker, bestätigtes/unbestätigtes Beispiel, echte lokale NER-Nutzung mit anschließendem Entladen |
| E Verständlichkeit | eindeutige alte Webfassung / Online 2.0 Beta / Desktop 2.0; korrigierter Desktop-Anker; sachliche Aussagen; reduzierte doppelte mobile Statusleiste | Browserbreiten, bestehende Browser-/Layout-/A11y-Tests und Website-Bau |
| F gemeinsame Abnahme | automatisierte lokale Prüfung; reale Geräte ausdrücklich offen | Befehle/Ergebnisse unten, manuelle Prüfliste unten |

## Nachweis verwenden

1. Dokument importieren oder Text eingeben und verarbeiten. Ein abgelehnter oder unvollständiger Import erzeugt keinen erfolgreichen Nachweis.
2. Ergebnis, Importumfang und bekannte Restfunde selbst prüfen. Bei jeder Änderung erneut verarbeiten.
3. „Nachweis drucken / als PDF speichern“ öffnet die Vorschau. Ohne Häkchen bleibt „Menschliche Sichtprüfung: nicht bestätigt“ sichtbar.
4. Nur nach eigener Prüfung das Häkchen setzen. Druckdialog oder JSON-Download starten. Browser können die tatsächliche Speicherung nicht bestätigen.
5. Das pseudonymisierte Ergebnis separat über „Pseudonymisierten Text speichern“ sichern. Der Nachweis enthält dessen SHA-256 über unveränderte UTF-8-Bytes ohne BOM. Die Zuordnung separat verschlüsselt sichern.

`examples/unconfirmed.pdf` + JSON und `examples/confirmed.pdf` + JSON sind ausschließlich synthetisch. Beide stammen aus demselben Lauf und unterscheiden sich im bewusst gesetzten menschlichen Prüfstatus. Keine Inhalte werden an den Nachweis angehängt. Die automatische Gegenprüfung verwendet Regeln/Wortlisten ohne KI; freigegebene/ignorierte Funde werden gesondert gezählt. Weder Gegenprüfung noch Sichtprüfung beweisen vollständige Erkennung oder DSGVO-Konformität.

## Testumgebung und Befehle

Linux, Node 24, Chromium 154 (`/usr/bin/chromium`), Electron gemäß package-lock (44.9.3), synthetische Daten. Keine TLS-Prüfung abgeschaltet. Keine Live-HTTPS-Geräteabnahme.

Die vorbereitete Umgebung hatte zunächst Electron 35 und mehrere nicht zum Lock passende Vendor-Dateien. Neuinstallation mit `npm ci` (beschreibbarer npm-Cache), Electron-Installation mit beschreibbarem `electron_config_cache` und `fetch-vendor.mjs` stellten die vorgesehenen Versionen/Prüfsummen her. Xvfb wurde ohne Root-Systemänderung im Workspace bereitgestellt; `DISPLAY=:99`. Fehlgeschlagene/abgebrochene Vorläufe sind keine bestandenen Prüfungen.

```sh
npm_config_cache=/workspace/.cache/npm NODE_USE_ENV_PROXY=1 npm ci
electron_config_cache=/workspace/.cache/electron NODE_USE_ENV_PROXY=1 node node_modules/electron/install.js
NODE_USE_ENV_PROXY=1 node scripts/fetch-vendor.mjs
DISPLAY=:99 npm test
node --test tests/processing-evidence.test.mjs
DISPLAY=:99 node --test tests/processing-evidence-desktop.test.mjs
node scripts/build-web-beta.mjs
# Website:
node --test tests/privacyshield-cache.test.mjs
node build.js
npm test
```

### Ausgeführte Läufe und Ergebnisse

- `npm test` vollständig ausgeführt: **1.624 Tests, 1.609 bestanden, 7 fehlgeschlagen, 7 bestehende SKIP, 1 bestehendes TODO**, Dauer rund 25,5 Minuten. Dieser Langlauf begann während der Umsetzung und ist **kein grüner Abschlusslauf**. Rohprotokoll: [full-suite-intermediate.log](logs/full-suite-intermediate.log).
- Die sieben Fehlstände wurden anschließend korrigiert und die betroffenen kompletten Testdateien erneut ausgeführt: **61/61 bestanden**. Enthalten: Exporthygiene, Gegenprüfung, Regeln/Policy, native Nachweisspeicherung, Projekt/ZIP, Bericht und Browser-Beta. [affected-regressions-final.log](logs/affected-regressions-final.log).
- Einordnung der sieben Fehlstände: zwei ältere Exporttests mussten aktuelle Verarbeitung bzw. den nun gemeinsamen Clipboard-Weg berücksichtigen; drei Gegenprüfungs-Texttests wurden durch die präzisere Formulierung wieder kompatibel; die GUI-Berichtserzeugung wurde auf historische erlaubte Moduswerte korrigiert; der Projektlöschtest prüft jetzt ausdrücklich die Sperre und den erforderlichen neuen Lauf. Sicherheits-/Datenschutzanforderungen wurden nicht abgeschwächt.
- Echte zusätzliche Chromium-Regressionen: **10/10 bestanden**, einschließlich tatsächlicher OCR, Offline-/Cachefälle, Hauptknopf-Kopieren, Rahmenlinks, Reload, Hash-Rennen, Projektrevisionen, PDF-/JSON-Ausgaben und laufbezogenem Fallbackgrund. [chromium-final.log](logs/chromium-final.log).
- Nach der abschließenden Fallback-Korrektur zusätzlich **12/12 Desktop-/KI-Tests bestanden**, einschließlich tatsächlichem lokalem NER-Lauf, Entladen, fehlendem Modell und Speicher-/Speicherdialog-Fällen. [desktop-ai-final.log](logs/desktop-ai-final.log).
- Echter Projektabbruch mit verweigertem Nachweis/ZIP: **1/1 bestanden**. [project-abort-final.log](logs/project-abort-final.log).
- Wiederholung der F1-Fälle mit den fest eingecheckten PDF-Fixtures nach der Schlusskorrektur: **1/1 bestanden**, mit tatsächlicher OCR. [pdf-fixtures-final.log](logs/pdf-fixtures-final.log).
- Berichtsschema und Konfigurationsprüfungen: **53/53 bestanden**. [report-schema-final.log](logs/report-schema-final.log).
- PDF-Beispiele: PDF-Text mit `pdftotext` unabhängig extrahiert; UTF-8-Ergebnishash unabhängig nachgerechnet; `pdfinfo` bestätigt je eine A4-Seite; PNG-Rendering visuell auf Graustufen, Umlaute, lange Kennungen und Ränder geprüft. Beispiel-Kernidentität stimmt mit der erzeugten Quellenidentität überein.
- Browserbau: **39 Dateien, rund 39,6 MiB**, kein Modell im Paket; wiederholter Bau deterministisch (bestehender Buildtest), Website-Kopie bytegleich, Paketdateien per SHA-256 überprüft.
- Website: `node build.js` bestanden; echter Worker-Test **1/1 bestanden**. Breiter Console-Check **nicht bestanden** (11 Seiten, insbesondere CDN-Fehler `ERR_CERT_AUTHORITY_INVALID`). Separater Smoke-Test: Startseite, PrivacyShield und Yield-Curve bestanden; RAG/SAA/Systemic-Risk scheiterten an Ressourcen-/3D-/Timeoutfehlern. Diese unbeteiligten Tools wurden nicht umgebaut.

Es wurde kein zweiter vollständiger 25-Minuten-Lauf auf dem finalen Stand behauptet; die korrigierten und nachträglich geänderten Bereiche wurden gezielt vollständig erneut geprüft. Bestehende SKIP/TODOs werden nicht als bestandene Anforderungen gezählt. Das TODO betrifft eine bestehende Whitelist-Eigenschaft im Erkennungskern (248/800 synthetische Fälle), nicht einen neuen behobenen Befund dieses Auftrags.

Der breite Website-Gesamtcheck bleibt offen. Die automatische Freigabeprüfung lehnte den Import der öffentlichen Umgebungs-CA in die persistente Chromium/NSS-Vertrauensdatenbank ab: dauerhafte Erweiterung der TLS-Vertrauensbasis ohne ausdrückliche Autorisierung. Der Import wurde nicht vorgenommen, TLS blieb aktiv. In der Fortsetzung wurde die Nutzerfreigabe ausdrücklich erteilt; die Website-Prüfung mit aktivem TLS-Vertrauen besteht inzwischen. Siehe [FREIGABE.md](FREIGABE.md).

Verknüpfte Drafts: [gemeinsame Quelle #8](https://github.com/Argrippinensis/privacy-shield-desktop/pull/8), [Website #2](https://github.com/Argrippinensis/arcangeli.eu/pull/2). Die genaue Quellrevision des ausgelieferten Browserpakets und alle Paketprüfsummen stehen im Website-Protokoll. Beide Hauptbranches blieben unverändert.

## Offene manuelle Abnahmen vor Veröffentlichung

Auf **physischem iPhone mit Safari** und **Android mit Chrome**, jeweils Browser/OS-Version und Gerät dokumentieren:

1. Frischer Browserzustand: Beta öffnen, KI zunächst aus, synthetische Textdatei und native/Misch-/Scan-PDFs importieren. Importumfang und Ablehnungen vergleichen. Keine echten personenbezogenen Dokumente verwenden.
2. Ergebnis kopieren: Berechtigung erlauben/verweigern, ggf. manuell kopieren. Inhalt mit Ergebnis vergleichen.
3. Nachweis ohne und mit ausdrücklicher Sichtprüfung ansehen. A4/Graustufen/PDF, Umlaute, lange Kennungen, Ränder und ggf. mehrere Seiten prüfen. JSON mit PDF vergleichen, Druckdialog und Download abbrechen, anschließend erneut ausgeben.
4. Ohne gesicherte Zuordnung Rahmenlink, internen Link, Reload und Tab-Schließen prüfen; bleiben, Download abbrechen, bewusst verlassen testen. Nach bestätigter Speicherung und nach neuer Zuordnung erneut prüfen. Mobile Browser können bei Tab-/Prozessbeendigung kein beforeunload garantieren; die drei kontrollierten Navigationsaktionen bleiben erforderlich.
5. Offline vor erstem PDF-/OCR-Bedarf prüfen; online vorbereiten, offline erneut prüfen, Cache löschen und erneut testen. Ressourcenfehler dürfen nicht als Dateischaden erscheinen. Browser können Caches entfernen; keine pauschale Offline-Garantie.
6. KI ausdrücklich einschalten: vollständigen ca. 135-MB-Download, Fortschritt, unterbrochenen Download, Wiederverwendung aus Cache, Browser-Neustart und Speicherdruck prüfen. Modell-/Fallbackangaben im Nachweis vergleichen. Kein Modellwechsel Bestandteil dieses Auftrags.

Zusätzlich: echte Desktop-Druckdialoge unter Windows/macOS/Linux und Safari/WebKit-Druckdarstellung prüfen. Automatisierte Chromium-PDFs sind keine Bestätigung physischer Drucker, mobiler Speicherorte oder erfolgreicher Betriebssystem-Downloads. Die Tests bestätigen einzelne Abläufe, keine vollständige Erkennung aller Dokumenttypen.

Die gesonderte Nutzerfreigabe für Push und Veröffentlichung wurde am 26.10.2026 erteilt. Die Online-Fassung bleibt Beta; ausstehende physische Geräteprüfungen werden nicht als bestanden ausgewiesen.
