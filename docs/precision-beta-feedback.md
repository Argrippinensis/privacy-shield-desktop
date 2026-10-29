# Präzision nach Beta-Feedback (2026-10-29)

Ausgangspunkt: Desktop 2.0.5, Screenshot eines englischen Geschäftsdokuments. Die abgebildeten Fachbegriffe wurden als Text rekonstruiert; die Originaldatei und ihr PDF-/OCR-Import lagen nicht vor. Änderungen sind im Quellcode, noch kein veröffentlichter Windows-Installer.

## Erkennungskette und Ursachen

1. `app/lib/detect.js`, `computePass1`: feste Formate (Telefon, E-Mail, IBAN usw.) sowie eigene Regeln. Ihre Zeichenpositionen werden vor der Modellanalyse verdeckt.
2. `app/ner-worker.js`: lokal gespeicherter, quantisierter multilingualer DistilBERT-NER, WASM/CPU. Erkennt Personen, Organisationen und Orte; kein generatives Sprachmodell. 16 GB RAM erklären die gezeigten systematischen Fehlklassifikationen nicht. Kein größeres Modell oder zusätzlicher Download erforderlich.
3. `collectEntities`: weitere Regex-Muster und Wortlisten werden mit Modelltreffern vereinigt. Die Namenspaar-Regel akzeptiert auch unbekannte großgeschriebene Wortpaare. Das Modell ersetzt die Regeln nicht.
4. `postProcessSpans`: Namen wurden um weitere großgeschriebene Wörter verlängert; englische Fachbegriffe und Jobtitel waren unzureichend begrenzt. Anschließend konnte ein einzelner Zeilenumbruch sogar zwei Namenstreffer verbinden.
5. Bei der Modellanbindung wurden erst sichere Tokens ausgewählt und dann deren Textstellen gesucht. Wiederholte Wörter konnten dadurch auf eine frühere, vom Modell gar nicht als Entität klassifizierte Textstelle abgebildet werden. Oberfläche und CLI enthielten dafür getrennte Implementierungen.

## Korrekturen

- Fachvokabular ist ein Gegenhinweis für automatische NAME-/ORG-Treffer. Beispielsweise bleiben „Implementation Support“, „Customer Restricted“, „Operating Model Transformation“ und „Digital Engineering“ als allgemeine Begriffe lesbar. Rechtsformen und ausdrücklicher Identitätskontext bleiben entscheidend: „Digital Engineering GmbH“, „Firma: Digital Engineering“ mit Modellbeleg und „Frau Senior“ bleiben maskierbar. Keine allgemeine Whitelist für diese Wörter in Firmennamen.
- Jobtitel werden an der Namensgrenze abgetrennt: „Christoph Stich Executive Vice President“ → nur „Christoph Stich“; „Renz Vice President“ → nur „Renz“. Manuelle Markierungen werden durch die Namensverlängerung nicht mehr erweitert.
- Vollständige Organisationstreffer des Modells können konkurrierende Regex-Namen korrigieren. Unvollständige Wortfragmente und Treffer, die bekannten Personennamen widersprechen, erhalten diese Vorrangwirkung nicht. Ein fehlender Modelltreffer unterdrückt keine sonst belegte Person.
- Keine Zusammenführung von Namen über Zeilenumbrüche.
- Gemeinsame NER-Anbindung in `app/lib/ner.js` für Oberfläche und CLI. Worker liefert auch O-Tokens; alle Tokens werden vor der Konfidenzfilterung ausgerichtet. Token-Lücken trennen Entitäten. Unvollständige Wortfragmente werden nicht als vollständige Entitäten weitergegeben. Mindestscore wird am Modellspan mitgeführt.
- Die konservative Token-Schwelle 0,9 bleibt erhalten. Ein Versuch mit gemittelter Entitätskonfidenz erzeugte im v2-Testbestand 11 statt höchstens 9 negative Dokumente mit Fehlmarkierungen und wurde verworfen. Diese Scores sind keine kalibrierten Datenschutz-Wahrscheinlichkeiten.

## Nachweise

- 34 neue gezielte Unit-Tests: 18 allgemeine Geschäftsausdrücke, Namen mit Jobtiteln, Kontext-Gegenproben, harte Identifikatoren, manuelle Markierungen, Modellkonflikte und wiederholte Tokens.
- Desktop-Regression `tests/precision-ai.test.mjs`: 13 rekonstruierte Fachüberschriften bleiben lesbar, Namen ohne Jobtitel, Telefonnummer, E-Mail und echte Firma bleiben geschützt. Regeln/Wortlisten und echtes Offline-Modell; exakte Rückübersetzung.
- Vollständiger Unit-Lauf: 1.173 bestanden, 0 fehlgeschlagen, 2 übersprungen, 1 bereits bestehendes TODO zur Whitelist-Teilmaskierung.
- Bestehende Qualitätsgrenzen für beide Evaluationsbestände werden nicht angehoben. v2 enthält 189 positive und 74 negative Handfälle sowie 98 synthetische Dokumente mit 860 zu schützenden Werten. In den Produktmodi bleiben die Null-Leck-Grenzen für diese positiven Fälle erhalten; auch die Fehlalarm-Grenzen müssen bestehen. Das ist keine Schätzung für beliebige reale Dokumente.
- 26 geänderte Ergebnisse im gespeicherten Kern-Referenzbestand einzeln geprüft: keine zuvor maskierten Nicht-Leerraumzeichen werden freigelegt. Änderungen sind Typkorrekturen und getrennte Namen über Zeilenumbrüche. Nur diese konkreten Hashes sind in `tests/golden/reference-allow.json` erklärt; die Qualitätsbudgets und der bestehende Desktop-Golden-Stand bleiben unverändert.
- CLI-Smoke mit echtem Offline-Modell: Name und E-Mail maskiert, Jobtitel und Fachbegriffe erhalten, Exit 0. Web-Bautest prüft die zusätzliche gemeinsam genutzte Bibliothek einschließlich Offline-Dateiliste.

Reproduzierbar unter Linux ohne Display:

```sh
node --test --test-concurrency=1 tests/unit/*.test.mjs
PS_HEADLESS=1 node --test --test-concurrency=1 tests/eval-v2.test.mjs tests/eval.test.mjs tests/precision-ai.test.mjs tests/offline-ai.test.mjs
node --test --test-name-pattern '^1 Bau:' tests/web-beta.test.mjs
```

## Grenzen und Windows-Abnahme

Kein Nachweis für 99,9 %: Schon der bestehende v2-Bestand toleriert 8/74 negative Dokumente mit Fehlmarkierungen ohne Modell und 9/74 mit Modell. Weitere Fachsprachen, unbekannte Eigennamen und mehrdeutige Marken benötigen unabhängige, annotierte echte Dokumente. Das NER-Modell kann Organisationen weiterhin als Personen klassifizieren; ein kleines Fachvokabular ersetzt kein vollständiges Sprachverständnis. OCR und die konkrete Seitengestaltung des Beta-Dokuments sind hier nicht geprüft.

Vor einer Veröffentlichung: Originaldokument auf Windows mit 16 GB RAM in einem frischen Lauf prüfen, einschließlich Originalimport, Trefferliste, Bearbeitung und Rückübersetzung. Personen und Firmen müssen separat gegen ihre tatsächliche Bedeutung annotiert werden. Für das 99,9-%-Ziel sind Präzision (Anteil korrekter Markierungen), Recall (Anteil erkannter schützenswerter Werte) und exakte Treffergrenzen getrennt auf einem unabhängigen Korpus zu messen; eine einzige „Trefferquote“ verschleiert sonst Übermaskierung.
