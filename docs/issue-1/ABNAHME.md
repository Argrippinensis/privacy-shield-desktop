# Auftrag arcangeli.eu#1 – Prüfprotokoll

Arbeitsstand zur Abnahme, keine Veröffentlichung, kein Release, kein Merge.

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

Ergebnisse werden nach Abschluss der Läufe ergänzt. Die vollständige Suite enthält bestehende TODOs; diese werden nicht als bestandene Anforderungen gezählt.

## Offene manuelle Abnahmen vor Veröffentlichung

Auf **physischem iPhone mit Safari** und **Android mit Chrome**, jeweils Browser/OS-Version und Gerät dokumentieren:

1. Frischer Browserzustand: Beta öffnen, KI zunächst aus, synthetische Textdatei und native/Misch-/Scan-PDFs importieren. Importumfang und Ablehnungen vergleichen. Keine echten personenbezogenen Dokumente verwenden.
2. Ergebnis kopieren: Berechtigung erlauben/verweigern, ggf. manuell kopieren. Inhalt mit Ergebnis vergleichen.
3. Nachweis ohne und mit ausdrücklicher Sichtprüfung ansehen. A4/Graustufen/PDF, Umlaute, lange Kennungen, Ränder und ggf. mehrere Seiten prüfen. JSON mit PDF vergleichen, Druckdialog und Download abbrechen, anschließend erneut ausgeben.
4. Ohne gesicherte Zuordnung Rahmenlink, internen Link, Reload und Tab-Schließen prüfen; bleiben, Download abbrechen, bewusst verlassen testen. Nach bestätigter Speicherung und nach neuer Zuordnung erneut prüfen. Mobile Browser können bei Tab-/Prozessbeendigung kein beforeunload garantieren; die drei kontrollierten Navigationsaktionen bleiben erforderlich.
5. Offline vor erstem PDF-/OCR-Bedarf prüfen; online vorbereiten, offline erneut prüfen, Cache löschen und erneut testen. Ressourcenfehler dürfen nicht als Dateischaden erscheinen. Browser können Caches entfernen; keine pauschale Offline-Garantie.
6. KI ausdrücklich einschalten: vollständigen ca. 135-MB-Download, Fortschritt, unterbrochenen Download, Wiederverwendung aus Cache, Browser-Neustart und Speicherdruck prüfen. Modell-/Fallbackangaben im Nachweis vergleichen. Kein Modellwechsel Bestandteil dieses Auftrags.

Zusätzlich: echte Desktop-Druckdialoge unter Windows/macOS/Linux und Safari/WebKit-Druckdarstellung prüfen. Automatisierte Chromium-PDFs sind keine Bestätigung physischer Drucker, mobiler Speicherorte oder erfolgreicher Betriebssystem-Downloads. Die Tests bestätigen einzelne Abläufe, keine vollständige Erkennung aller Dokumenttypen.

**Veröffentlichung nur nach gesonderter Nutzerabnahme.** Draft-PRs niemals automatisch mergen, keine Release-Tags setzen.
