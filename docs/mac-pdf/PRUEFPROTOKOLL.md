# 2.0.3 – Mac-PDF-Auswertung und konsistente Veröffentlichung

Abgleich: Source main b27dbdbbdedd7908c622341f086cbbb2d6ece539, Website main 74a10b6993ee67107d84d2549cab6c785b693ec8. Website-PR #10 bleibt bis zum vollständigen Desktop-Release zurückgehalten. Der öffentliche Desktop Latest ist bis dahin v2.0.1.

## Belegte Ursache und Korrektur

Der unveröffentlichte Tag v2.0.2 meldete im Release-Lauf 40541832717 auf macos-14 drei Fehler bei PDF-Textvergleichen. Die eigenständige Diagnose 40554039251 reproduzierte genau diese drei Fehler auf macos-15-intel und sicherte die tatsächlichen synthetischen PDF-Dateien samt PDF.js-Textobjekten. CoreText zerlegt die Apple-Systemschrift in kurze Zeichenfragmente; PDF.js liefert echte Wortabstände bereits als eigene Textobjekte. Der bisherige Testleser fügte nach jedem Objekt ein weiteres Leerzeichen ein. Dadurch wurden zum Beispiel „ReguSafe“ und die UUID zerstückelt. Die Druckdatei selbst ist korrekt: Poppler pdftotext bestätigt UUID und Ergebnis-SHA-256 unabhängig, die gerenderte Seite wurde visuell geprüft.

Der Testleser übernimmt jetzt die vorhandenen Zeichen, Leerzeichen und echten Zeilenumbrüche. Keine normalisierende Entfernung echter Wortabstände, keine Abschwächung der ID-/Hash-/Vollständigkeitsprüfungen und keine Änderung am Produkt-Druckrenderer. Zwei feste echte Mac-PDFs unter tests/fixtures/pdf-portability sichern Kennung, Hash, Wortabstände, letzte Dokumentseite und inerten eigenen Profiltext. Rohvergleich in logs/mac-baseline-analysis.json.

## Zusätzliche Sicherung

- Schnelle separate Mac-PDF-CI auf dem Standard-Intel-Rechner macos-15-intel, mit synthetischen PDF-/Textartefakten auch bei Fehlern. Die vollständige native Release-Matrix bleibt Windows, Linux und ARM-Mac; das von GitHub als veraltet markierte macos-14 wird durch macos-15 ersetzt. Quelle: https://github.com/actions/runner-images#available-images.
- Vor jeder Veröffentlichung muss zusätzlich die vollständige Source-CI für exakt den getaggten Commit erfolgreich sein. Ein Ergebnis eines anderen Commits oder ein älterer Erfolg vor einem neueren laufenden/fehlgeschlagenen Lauf reicht nicht. Fehlende, abgebrochene oder unbestätigte Prüfung blockiert die Freigabe. Drei unabhängige Zustandsprüfungen dafür; echte API-Prüfung am bereits erfolgreichen Source-Commit.
- Neuer Tag/Version 2.0.3, unveränderte Abhängigkeiten. Der Tag 2.0.2 wird nicht verschoben und wurde nicht als Desktop-Release veröffentlicht. Sichtbare Versionsfelder und synthetisches Beispiel neu erzeugt; gemeinsamer Verarbeitungskern bleibt a8870f775f50b7b1a1256f814861e1e0aaa1b3a665b9e13d9a62114bafed2a70. Keine Erkennungs-, RAM-, Übergabe- oder Gültigkeitsregel geändert.

## Lokale Prüfung

- Alle 14 betroffenen Browser-/Druck-/Nachweisprüfungen bestanden mit korrigiertem Leser.
- Zwei feste echte Mac-PDF-Regressionsfälle und drei Release-Gate-Prüfungen bestanden.
- 16/16 Browser-/echte Electron-Versionsprüfungen bestanden für 2.0.3.
- Aktueller synthetischer Arbeitsvertragsnachweis 2.0.3: unabhängige SHA-256, PDF-Text und eine A4-Seite bestätigt; persönliche Prüfung bleibt nicht bestätigt.

Vollständige CI, gebaute/unter Windows installierte Programme und öffentliche HTTPS-/Download-/Offline-Prüfungen werden am verknüpften PR für den endgültigen Commit ergänzt. Physische iPhone-/Android-Geräte, native App-Übernahme, VoiceOver und Papierausdruck bleiben manuell abzunehmen.
