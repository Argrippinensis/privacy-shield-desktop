# Änderungsprotokoll

Format: ein Abschnitt je Version, Überschrift `## [x.y.z] - JJJJ-MM-TT`. Der Release-Workflow übernimmt den Abschnitt
der getaggten Version als Text des GitHub-Releases (Fallback: "PrivacyShield vX.Y.Z").

## [2.0.4] - 2026-10-27

- Annotieren schaltet erkannte und manuell markierte Werte gezielt zwischen Maskieren und Freigeben um. Ganze erkannte Begriffe bleiben zusammen; gleiche Werte derselben Kategorie gelten gemeinsam. Rückgängig/Wiederholen und Tastaturbedienung werden unterstützt. Wiederholte oder gleichwertige Markierungen erzeugen keine zusätzlichen Regeln.
- Deutlichere Flugmodus-Anleitung im Stil eines iPhone-Kontrollzentrums: Wischgeste, Flugmodus und zusätzliches Ausschalten von WLAN. Reine Illustration mit Pause/reduzierter Bewegung; der echte Ressourcenstatus bleibt separat ermittelt.
- Desktop-Update-Hinweise auch für manuelle Installationen ohne automatischen Installer; erneute Prüfung nach Netzrückkehr, Aufwachen und regelmäßig im Hintergrund. Ausschließlich öffentliche Versionsmetadaten, keine Dokumentinhalte.
- Korrekte Mac-PDF-Auswertung und echte Größen-/Zoomprüfung auch auf kleineren virtuellen Testbildschirmen. Die geometrischen Anforderungen bleiben unverändert. Native Tests weiterhin auf Windows, Mac und Linux.
- Beinhaltet die aktuellen lokalen Anbieterlogos und den gestalteten Verarbeitungsnachweis. Die Desktop-Builds 2.0.2 und 2.0.3 wurden nicht veröffentlicht.

## [2.0.3] - 2026-10-27

Dieser Desktop-Build wurde nicht veröffentlicht; ersetzt durch 2.0.4.

- Aktuelle Online-Beta als Browser-Haupteinstieg, mit sichtbarer Paketversion und Hinweis auf mögliche Fehler und nötige Ergebniskontrolle.
- Lokale Anbieterlogos, animierte Flugmodus-Anleitung und gestalteter Verarbeitungsnachweis aus dem nicht veröffentlichten Build 2.0.2 übernommen.
- Plattformunabhängige Prüfung der echten PDF-Druckausgabe; zusätzliche gezielte Mac-Prüfung und aufbewahrte synthetische Druckdateien.

## [2.0.2] - 2026-10-27

Dieser Build wurde nicht als Desktop-Release veröffentlicht; ersetzt durch 2.0.3.

- Lokale Logos für ChatGPT, Claude, Gemini, Grok und DeepSeek.
- Animierte Flugmodus-Anleitung mit ehrlichem Ressourcenstatus, Pause und reduzierter Bewegung; kein Zugriff auf Betriebssystemeinstellungen.
- Hochwertiger Verarbeitungsnachweis mit Briefkopf arcangeli.eu / ReguSafe, strukturierter Übersicht und grafischem Siegel. Keine behauptete digitale Signatur oder Zertifizierung.

## [2.0.1] - 2026-10-27

- Arbeitsvertrag-Profil mit gezieltem Schutz für Tarifgruppe, Berufsjahr, Team, Arbeitszeit, Urlaub, Probezeit/Befristung, Anrede und Abschluss. Allgemeine Vertragsbegriffe und Paragrafen bleiben in diesem Profil lesbar.
- Arbeitgeber-Kurzformen und bekannte Varianten, mehrteilige Straßennamen und Vertragsorte werden verlässlicher geschützt. Falsche NER-Treffer für allgemeine Vertragsbegriffe und GeschGehG werden gefiltert. Eigene Markierungen bleiben möglich; keine Vollständigkeitsgarantie.
- Direkter, bewusst geklickter App-Aufruf auf Mobilgeräten ohne vorgeschaltete Auswahl; Web-Ausweichweg und Zwischenablagefehler werden angezeigt. Zusätzlich Grok, DeepSeek, Mistral Le Chat, Perplexity und Microsoft Copilot als Übergabeziele. Kein Dokumenttext in Links, keine automatischen Prompts und keine zusätzlichen lokalen Modelle.
- Dauerhafter lokaler Status mit reduzierbarer Animation sowie ausdrücklich vorbereitete Offline-Browserfassung inklusive PDF/OCR und optionalem geprüftem KI-Modell. Cache-Verlust wird erkannt und repariert. Desktop-Verarbeitung weiterhin technisch vom Netz getrennt; separate Update-Prüfung bleibt online.
- Druckbarer Verarbeitungsnachweis mit Vorschau, PDF-Druck und inhaltsfreier JSON-Datei; konsistente Exporte und vollständigerer Scan-PDF-Import. Siehe verknüpfte Prüfprotokolle und synthetische Beispiele.

## [2.0.0] - 2026-10-26

**HINWEIS Platzhalterformat:** Nennt ein Text dieselbe Person in mehreren Formen (Hans Müller, Herr Müller, Hans), bekommen alle Formen dieselbe Nummer mit Endung: `{{NAME_1}}`, `{{NAME_1.NACHNAME}}`, `{{NAME_1.VORNAME}}`, `{{NAME_1.KURZ}}`. Verknüpft wird nur, wenn es eindeutig ist (zwei Personen mit gleichem Nachnamen bleiben getrennt, Gegenhinweise wie gegensätzliche Anreden oder Beziehungswörter verhindern eine Verknüpfung). Die Rückübersetzung stellt die Originalwerte wieder her (über die `.psmap` exakt; die unverschlüsselte CSV ist bei wörtlichen Platzhaltern im Originaltext nicht verlustfrei). Wer Platzhalter in eigenen Skripten oder Vorlagen auswertet, muss die Endung nach dem Punkt zulassen.

**HINWEIS Zuordnung jetzt verschlüsselt:** "Zuordnung speichern" erzeugt standardmäßig eine verschlüsselte `.psmap`-Datei (Passwort, mindestens 10 Zeichen). **Ohne das Passwort ist sie nicht wiederherstellbar; Passwortverlust ist endgültig.** Der Export als unverschlüsselte CSV bleibt als bewusste Alternative (mit Rückfrage).

### Erkennung
- Wortlisten sind der Normalfall ohne KI-Treffer: Auch bei ausgeschalteter KI, zu wenig Arbeitsspeicher oder Startfehler gelten Regeln plus Wortlisten (bisher in diesen Fällen nur die Regeln).
- Verknüpfung derselben Person über mehrere Namensformen (siehe HINWEIS Platzhalterformat), im Projekt über alle Dokumente.
- Namen: Wortlisten ergänzen das Modell um Personennamen (Chat-Sprecher, Ansprache), GROSSGESCHRIEBENE Nachnamen mit Komma, Spitznamen und Kurzformen, Kennzahlen mit einem Verb zwischen Stichwort und Wert.
- Weniger Fehlalarme: Gattungswörter nach Präpositionen ("Im Kapitel 3", "Auf der Seite 3"), Abkürzungen hinter Jahreszahlen, Zahlenreihen mit Stichwort (Lottozahlen, Version, Nr.).
- Wörtliche Platzhalter im Originaltext (zum Beispiel `{{NAME_7}}` in einem früheren Ergebnis) werden reserviert und nie neu vergeben; sie bleiben unverändert stehen, die Rückübersetzung über die `.psmap` bleibt exakt.
- Eigene Regeln und Richtliniendatei (`policy.json`): Begriffslisten und Muster aus einer sicheren Teilmenge regulärer Ausdrücke (keine unbegrenzten Wiederholungen, keine Rückverweise, keine Vor- und Rückschau, `{m,n}` bis 64), Import und Export in der Oberfläche, `--policy` in der Kommandozeile. Dieselbe Prüfung gilt für die "Eigenen Variablen". Format: `docs/policy-format.md`.
- Messstand (Testmengen, keine Zusage für echte Dokumente): mit Modell und im Ausfallmodus (Regeln plus Wortlisten) auf allen Handfällen und synthetischen Dokumenten keine Lecks; reine Regeln ohne Wortlisten sind nur noch Diagnosemodus. Reste und bewusst offene Fehlalarme: `docs/erkennung-entscheidungen.md`.

### Vertrauen
- Gegenprüfung: Nach dem Anonymisieren läuft die Erkennung (mit Regeln und Wortlisten, ohne KI-Modell) ein zweites Mal über das Ergebnis; mögliche Reste werden mit Schwere (hoch, mittel) aufgelistet und lassen sich maskieren oder ignorieren.
- Bericht (`bericht.txt`, im Projekt-ZIP und in der Kommandozeile zusätzlich `bericht.json`): Version, Zeitpunkt, Profil, KI-Modus, Zahl der Freigaben und eigenen Regeln, je Dokument Zeichenzahl, Funde je Kategorie, Gegenprüfung und SHA-256 des Ergebnisses. Keine personenbezogenen Werte.
- Verschlüsselte Zuordnung `.psmap`: AES-256-GCM, PBKDF2-HMAC-SHA-256 mit 600.000 Iterationen, zufälliges Salz und Nonce je Datei, nur Web Crypto. Eine Warnung beim Schließen erscheint, wenn eine Zuordnung nicht gespeichert wurde ("gespeichert" gilt erst nach bestätigtem Schreiben).
- Manuelle Markierungen sind Daten, die beim erneuten Anonymisieren erhalten bleiben.
- Hygiene der Ausgaben: neutrale Dateinamen (`anonymisiert_001.txt`), PDF ohne Metadaten aus dem Original.
- Veraltete Ergebnisse (nach geänderten Einstellungen) werden gesperrt, statt mit altem Stand gespeichert zu werden.

### Dokumente
- Projekte mit mehreren Dateien (bis 200 Dokumente, 200 MB Text): Liste, gemeinsame Platzhalter, Fortschritt, Abbrechen, ZIP mit Ergebnissen, Bericht und Zuordnung, Rundlauf (Anonymisieren, Zuordnung als `.psmap` speichern, laden, Rückübersetzen) ergibt den Originaltext.
- Neue Formate: `.xlsx`, `.pptx`, `.odt`, `.ods`, `.odp`, `.rtf` (bisher Rohtext), `.eml`, `.html`. DOCX: Kopfzeilen, Fußzeilen, Fußnoten, Endnoten und Kommentare werden nach dem Haupttext angehängt.
- Kodierung: UTF-8 (streng), UTF-16 mit BOM, sonst Windows-1252 (Latin-1-Dateien und RTF-Umlaute wurden zuvor nicht erkannt).
- `.doc`, `.xls` und `.ppt` (alte Binärformate) werden mit einer klaren Meldung abgelehnt.
- PDF: Die Oberfläche nennt für PDF mit Textebene etwa 50 Seiten als Richtwert (eine feste Seitengrenze gibt es nicht, nur 30 MB je Datei). Gescannte PDFs werden per OCR gelesen, aber nur die ersten 20 Seiten.
- Schutz vor präparierten Archiven (ZIP-Bomben): Prüfung der Größen vor dem Entpacken, Zählung der tatsächlich entpackten Bytes, höchstens 2.000 Einträge und 200 MiB.

### Bedienung
- Prüfansicht "Funde": alle Funde nach Typ und Wert mit Filter, Suche, "Nur Zweifelsfälle", Freigeben und Maskieren (exakt für Typ und Wert), Rückgängig und Wiederholen mit Strg+Z, Strg+Y bzw. Cmd+Z, Cmd+Umschalt+Z, Tastatursteuerung, große Listen bleiben flüssig.
- Barrierefreiheit: Struktur, Beschriftungen, weitgehende Bedienung mit der Tastatur (Ausnahme: Der Modus "Annotieren" ist nur mit der Maus bedienbar), Fokusführung in Dialogen, Ansagen für Hilfstechnik, Kontraste, reduzierte Bewegung, Zoom bis 200 Prozent. Automatischer Test (axe-core) ohne Verstöße der Stufen serious und critical; Restbefunde in `docs/a11y-backlog.md`.
- Info-Dialog: Version, Systemdaten, Zustand der KI-Installation, Lizenzen, Impressum und Datenschutz, "Diagnose kopieren" (ohne Dokumentinhalte und Dateinamen).
- Die Versionsanzeige (Fußzeile, Berichte) kommt aus `package.json` statt aus festen Texten.

### Betrieb
- Kommandozeilenmodus `--cli` für Stapelverarbeitung ohne Fenster (Profil, Richtlinie, Bericht, verschlüsselte Zuordnung, Rückgabecodes, `--fail-on-findings`); unbekannte Schalter werden mit Code 2 abgelehnt. Siehe `docs/kommandozeile.md`.
- "Öffnen mit" und Einzelinstanz: Dateien als Programmargument oder per "Öffnen mit"; ein zweiter Start übergibt sie an die laufende App. Keine automatische Dateizuordnung.
- Härtung: Absenderprüfung für alle Kanäle zum Hauptprozess, von der Seite gelieferte Pfade werden nie gelesen, nur die Berechtigung "Zwischenablage schreiben" ist erlaubt, Electron 35 auf 44 mit gehärteten Fuses.
- Stabilität: Eigenschafts- und Fuzz-Tests, Leistungsgrenzen (lange Leerraum- oder Buchstabenfolgen rechnen nicht mehr Minuten), Windows-Installationstest in der CI.

### Verteilung
- Der Release-Ablauf prüft vor dem Anlegen, dass Tag und `package.json` übereinstimmen, dass `CHANGELOG.md` einen datierten Abschnitt hat und dass alle fünf Installationsdateien vorhanden sind (`PrivacyShield-Setup.exe`, `PrivacyShield-mac-arm64.zip`, `PrivacyShield-mac-x64.zip`, `PrivacyShield.AppImage`, `PrivacyShield.deb`). Das Release entsteht als Entwurf und wird erst nach Prüfung der hochgeladenen Dateien samt `SHA256SUMS.txt` veröffentlicht.
- Ein Probelauf der Paketbauten für Windows, macOS und Linux ist ohne Release möglich (`workflow_dispatch`). Dateinamen der Installer unverändert.
- Handprüfung auf einem echten Windows-Rechner: `docs/abnahme-windows.md`.

### Behebungen gegenüber 1.8.0
- Manuelle Markierungen (Annotieren) gehen beim erneuten Anonymisieren nicht mehr verloren und damit nicht mehr aus der Rückübersetzung.
- Dateinamen im ZIP enthalten nicht mehr die Originalnamen (neutrale Namen, Originalnamen nur auf ausdrücklichen Wunsch); bei Mehrfachauswahl bleibt die Zuordnung aller Dateien rückübersetzbar (bisher nur die der letzten Datei).
- Wortlisten ohne KI sind immer aktiv.
- Keine Minuten-Rechenzeit mehr bei sehr langen Leerraum-, Zeilenumbruch- oder Buchstabenfolgen.
- "Kopieren" funktioniert weiterhin trotz der strengeren Berechtigungsprüfung (erlaubt ist nur das Schreiben in die Zwischenablage).
- Eigene Variablen: Muster werden geprüft (ein Muster wie `(a+)+$` konnte die App einfrieren); Namen werden strikt validiert.

### Migrationshinweise
- Alte CSV-Zuordnungen aus 1.x bleiben ladbar ("Zuordnung laden").
- Einstellungen aus 1.x (zum Beispiel KI-Modus) bleiben erhalten.
- Das Platzhalterformat erweitert sich um die Endung (siehe HINWEIS); Platzhalter ohne Endung aus früheren Versionen werden weiterhin zurückübersetzt, wenn die alte Zuordnung geladen ist.

### Zurückgestellt (mit Grund)
- pdf.js bleibt bei 3.11.174: Version 4 liefert nur ES-Module und bräuchte eine zusätzliche Brücke. Das Restrisiko ist bewusst in Kauf genommen und durch Schutzmaßnahmen begrenzt (30-MB-Grenze, `isEvalSupported: false`, kein Netzzugriff).
- Transformers.js 4: nur mit Messprotokoll; Modell und KI-Kern bleiben unverändert (Transformers.js 3.5.2), weil das Risiko kurz vor 2.0.0 größer ist als der Nutzen.
- Für Version 2.1 oder später vorgesehen: formattreuer Export (DOCX, XLSX), weitere Sprachen, englische Oberfläche, dunkles Design, zentrale Konfiguration, tragbare Version, Signierung der Installationsdateien (braucht den Kauf eines Zertifikats).

### Bekannte Grenzen
- Windows: kein `--password-stdin` (Fenster-Programm ohne Standardeingabe, auch beim Start aus dem Quelltext); dort `--password-env` verwenden.
- Niederländische Postleitzahlen mit Buchstabenpaaren wie AD, AG oder CE bleiben lesbar, die Straße davor wird maskiert.
- Ortsnamen in Firmennamen werden bewusst maskiert (lieber ein Wort zu viel).
- Die Ausnahmeliste (Whitelist) macht den ganzen Fund sichtbar, Teilreste davon werden aber weiter maskiert (Beispiel: Eintrag "Berlin" bei "Hauptstr. 46, 65311 Berlin": "Berlin" bleibt lesbar, die Straße bleibt ersetzt).
- Die Gegenprüfung nutzt nur Regeln und Wortlisten, nicht das KI-Modell; "keine Auffälligkeiten" sagt daher wenig über Namen, die das Modell übersehen hat.
- PDF: Für PDF mit Textebene gibt es keine feste Seitengrenze (nur 30 MB je Datei). Gescannte PDFs werden nur bis zur 20. Seite per OCR gelesen; spätere Seiten fehlen im Ergebnis. Enthält ein PDF teils Text, teils Scan-Seiten, wird nicht per OCR gelesen, und die Scan-Seiten fehlen.
- Die unverschlüsselte CSV-Zuordnung lässt Einträge für Platzhalter weg, die wörtlich im Originaltext standen; die Rückübersetzung aus der CSV ist dann nicht verlustfrei. Die `.psmap` enthält sie.
- Der Modus "Annotieren" ist nur mit der Maus bedienbar.
- Eine präparierte oder sehr große DOCX-Datei kann das Programm stark verlangsamen oder zum Absturz bringen (hoher Speicherbedarf); die mitgelieferte DOCX-Bibliothek enthält ältere Teile mit bekannten Meldungen zu Rechenzeit-Angriffen. Betroffen ist nur die Verfügbarkeit, nicht der Datenschutz.
- Erkennung ist nie vollständig; OCR-Lesefehler, Text in Bildern und weitere Sprachen bleiben Grenzen (siehe `docs/benutzerhandbuch.md`). Unter macOS umgeht Cmd+Q die Rückfrage bei nicht gespeicherter Zuordnung. Das Schreiben der Ausgabedateien in der Kommandozeile ist nicht atomar.

### Intern
- Erkennungskern als Modul `app/lib/detect.js` (ohne Oberflächenzugriff, in Node testbar); neue Logik in Modulen mit Unit-Tests; Differenztest gegen die Referenz von 1.8.0 (`node tests/eval/diff-reference.mjs`), Korpus mit 263 weiteren Fällen und 98 synthetischen Dokumenten (`npm run eval -- --set v2`), Realdokument-Test für TXT, DOCX, PDF und OCR.
- mammoth.js 1.6.0 auf 1.13.0 (DOCX lesen; Browser-Datei 642.759 auf 405.060 Bytes, Lizenz unverändert BSD-2-Clause). Umlaute und Sonderzeichen im DOCX-Rundlauf unverändert, Differenztest: keine unerlaubten Abweichungen von 645 Referenzfällen.
- JSZip 3.10.1 auf 3.10.2 (ZIP lesen und schreiben; Datei 97.630 auf 97.781 Bytes, Lizenz unverändert MIT; Korrekturen: Erkennung von Binärdaten aus anderem Kontext, Blob-Lesen ab Node 18). Die ZIP-Prüfung in `app/lib/formats.js` liest weiterhin `_data.uncompressedSize`; `formats.test` grün.
- jsPDF 2.5.1 auf 4.2.1 (PDF schreiben; Datei 364.463 auf 420.165 Bytes, Lizenz unverändert MIT; enthält die Sicherheitskorrekturen der Versionen 3 und 4). Die optionalen Nachlade-Abhängigkeiten (canvg, html2canvas, dompurify) werden nicht verwendet und lösen keinen Netzzugriff aus. Umlaute und Sonderzeichen im PDF-Export unverändert (WinAnsi); Zeichen außerhalb davon (z. B. polnisches ł, kyrillisch, CJK) gab es mit der Standardschrift schon vorher nicht, unverändert.
- Tesseract.js 5.1.1 auf 7.0.0 samt Core 5.1.1 auf 7.0.0 (OCR; Lizenz unverändert Apache-2.0; Sprachdaten deu/eng best_int 4.0.0 aus derselben Quelle, Prüfsumme unverändert). Neu im Paket: `tesseract-core-relaxedsimd-lstm.wasm.js` (die Bibliothek wählt zur Laufzeit relaxedsimd, simd oder die einfache Datei; ohne die neue Datei fände ein aktueller Chromium den Kern nicht). Aufrufcode unverändert. Messung auf einem gescannten Testdokument (3 Seiten, 1.478 Zeichen): Zeichenfehlerrate 2,98 % vorher und nachher (44 Fehler, identisch), Zeit 6,4 bis 7,3 s vorher, 5,2 bis 5,3 s nachher; OCR-Realdokumente weiter 1 Rest von 24 (4,2 %), OCR-Teil des Tests 19,1 s auf 17,3 s; kein Netzzugriff (alle Dateien von `app://`).

## [2.0.0-beta.1] - 2026-10-25

**Vorabversion zum Ausprobieren (abgelöst durch 2.0.0, siehe oben).** Wer 2.0 testen möchte, installiert diese Datei zusätzlich oder anstelle von 1.8.0 und kann jederzeit wieder 1.8.0 installieren.

Was Sie in der Beta prüfen können:
- Mehrere Dokumente gemeinsam anonymisieren, dieselbe Person bekommt überall denselben Platzhalter (neues Format mit Endung, z. B. `{{NAME_1.NACHNAME}}`).
- Zuordnung speichern ist jetzt passwortgeschützt (`.psmap`). **Passwortverlust ist endgültig.**
- Prüfansicht mit Rückgängig/Wiederholen, Filter und Suche, Gegenprüfung, Bericht.
- Kommandozeile, "Öffnen mit", eigene Regeln per Richtliniendatei.
- Bessere Erkennung (Adressen, Kontakte, Zugangsdaten, Gesundheits- und Strafdaten), barrierefreie und besser lesbare Oberfläche, aktuelle Bibliotheken.

Bitte beachten Sie:
- Die Beta ist **nicht signiert**; Windows kann bei der Installation eine SmartScreen-Warnung zeigen.
- Keine Erkennung ist vollständig. Prüfen Sie das Ergebnis, bevor Sie Dokumente weitergeben, und nutzen Sie für wichtige Dokumente zunächst weiter die stabile Version.
- Rückmeldungen: In der App "Diagnose kopieren" wählen und den Text mit Ihrer Beschreibung senden. Er enthält keine Dokumentinhalte.
- Die vollständige Liste der Neuerungen, Behebungen und bekannten Grenzen steht unten im Abschnitt zu 2.0.0.

## [1.8.0] - 2026-10-20

### Erkennung
- Neue Kategorien: Kreditkartennummern (mit Prüfziffer), Kfz-Kennzeichen und Fahrgestellnummern, IPv6, Weblinks.
- IBAN: alphanumerische Kontonummern (NL, GB, FR, IT, ES ...), Kleinschreibung und Schreibweise ohne Leerzeichen.
- Telefonnummern: internationale Formate, Vorwahl mit Schrägstrich, Klammern.
- Datumsangaben mit Monatsnamen und Schrägstrich, Steuer-ID in allen gängigen Schreibweisen.
- Namen: Initialen, GROSSGESCHRIEBENE Namen, Namenszusätze (von, van, de), Bindestrich-Namen, Sonderzeichen (Ö, Ü, Ç, ë ...).
- Adressen: Schweizer und österreichische Schreibweise, vierstellige Postleitzahlen.
- Weniger Fehlalarme (Länder, "Zentrale", Rechnungsnummern mit führenden Nullen).

### Fehlerdiagnose
- Startet die KI-Erkennung nicht, nennt die App jetzt den Grund (fehlende oder unvollständige Modelldatei, zu wenig Arbeitsspeicher,
  Laufzeitfehler) samt Lösungshinweis statt nur "Modell konnte nicht geladen werden". Knöpfe "Erneut versuchen" und "Details kopieren".
- Die Installation wird beim Fehler gegen ein Manifest geprüft (Dateien und Größen); "Diagnose kopieren" enthält den KI-Fehler.
- Bei Thread- oder Speicherproblemen wird einmal automatisch mit einem Rechenthread wiederholt.
- Leere Dateien (0 Bytes, z. B. nur online in OneDrive vorhanden) werden erklärt statt stumm angezeigt.
- Der Hinweis zur Standard-Erkennung sagt ehrlich, dass sie weniger erkennt (bisher: "ohne Einschränkung").

### Bedienung und Leistung
- KI-Erkennung ist standardmäßig aktiv: Das Modell startet bei der ersten Analyse und gibt nach 5 Minuten Leerlauf den Speicher frei.
- Große Dokumente werden bis zu 8-mal schneller anonymisiert.
- Update-Hinweise sperren die App nie mehr; wo automatisches Installieren nicht möglich ist, führt ein Link zur Download-Seite.

### Verteilung
- Feste Dateinamen der Installer (immer die neueste Version unter `releases/latest/download/`).
- macOS: Intel- und Apple-Silicon-Version, Ad-hoc-Signatur.
- Prüfsummen (`SHA256SUMS.txt`) im Release.

## [1.7.0] - 2026-10-20

- KI-Erkennung läuft im Hintergrund, die Oberfläche bleibt bedienbar.
- Bibliotheken, OCR-Daten und KI-Modell sind Teil der Installation; kein Download beim ersten Start, vollständig offline.
- Echte Arbeitsspeicher-Anzeige, KI-Modell entladbar.
- Update-Dialog sperrt die App offline nicht mehr, externe Links öffnen im Browser.
