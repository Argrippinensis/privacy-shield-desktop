# GitHub-Abgleich nach Claude-Abschluss – 25. Oktober 2026

Diese Prüfung nutzt GitHub-Dateien und heruntergelesene Actions-Logs. Keine neue vollständige Programmausführung, kein Zugriff auf den Rechner des Inhabers oder auf uncommittierte Claude-Arbeitsbäume.

## Gesicherter Ausgangsstand

- Produktbranch `v2/main`: `019d84a7bdc8c388492551aba60b962636c7f564`, letzter Commit „Hinweiszeile in der Arbeitsansicht zentriert“ (25.10.2026, 16:10:39 UTC).
- Planungsbranch `plan/v2-0`: `acf692baf407cc00aa65bf3b857e0b3f767c26d4`.
- Beide genannten Hashes stimmen mit Claudes Abschlussmeldung überein. Der dokumentierte Produkt- und Planungsstand ist damit remote vorhanden. Nicht gepushte zusätzliche lokale Dateien können über GitHub nicht ausgeschlossen werden; dafür besteht hier kein positiver Hinweis.
- `main` steht weiterhin auf `a6acfff0a2c7bb4d16da3002d7fb654f88e8e22c`; die 2.0-Arbeit liegt 303 Commits voraus.
- [PR #4](https://github.com/Argrippinensis/privacy-shield-desktop/pull/4) ist weiterhin ein offener Draft von v2/main nach main. #5, #6 und #7 sind geschlossen und als gemergt ausgewiesen. Sie nicht erneut integrieren.
- `package.json` am Produktstand enthält Version 1.8.0. Die Referenz `v2.0.0` ließ sich beim GitHub-Abgleich nicht auflösen. Im geprüften Paket-Probelauf wurde der Release-Job übersprungen. Ein öffentlicher Release wurde in dieser Prüfung nicht separat über die Releases-API inventarisiert.
- Queue auf der Planungsbranch: 65 Einträge insgesamt, davon 58 Pflichtpakete (56 fertig, 2 begründet verschoben) und 7 verschobene Kann-Pakete. Keine offenen/laufenden Einträge. Das ist ein Planstatus, kein Beweis vollständiger Fehlerfreiheit.

## Direkt geprüfte CI-Belege

1. [Quellbaum-CI 40210435485](https://github.com/Argrippinensis/privacy-shield-desktop/actions/runs/40210435485): Ubuntu und Windows erfolgreich.
   - Die Ubuntu-Logs nennen den vollständigen Produkt-SHA.
   - Endergebnis dort: **1584 bestanden, 0 Fehler, 7 übersprungen, 1 Todo**.
   - Die Freigabeliste nennt an einer Stelle noch 1583; das ist ein Dokumentationsrückstand gegenüber dem letzten Layout-Test.
2. [Build-Probelauf 40210430501](https://github.com/Argrippinensis/privacy-shield-desktop/actions/runs/40210430501): Linux, Windows und macOS erfolgreich; Release übersprungen.
   - Windows-Installer, Modelldateiprüfung und Tests der installierten App erfolgreich.
   - Drei nicht abgelaufene Build-Artefakte vorhanden. Deren Metadaten nennen exakt den Produkt-SHA 019d84a…: builds-linux, builds-windows, builds-macos.
   - Mac-Log: ARM- und Intel-ZIP gebaut. Der Programmtest startet aber ausdrücklich `dist/mac-arm64/PrivacyShield.app`. Daraus folgt keine gleichwertige Laufzeitabnahme des Intel-ZIPs.
3. Der absichtliche Fehlerlauf ist im Abschlussbericht als erfolgreich negativ dokumentiert. Sein konkreter Lauf wurde in dieser Sitzung nicht separat identifiziert und ausgewertet. Nächste Session soll Run-ID, Commit und erwarteten Fehlerschritt nachtragen.

## Wichtige Unterscheidungen für den nächsten Review

**Grüne Tests bedeuten keine vollständige Anonymisierung.** Ein Test kann einen bekannten Restfund innerhalb einer festgelegten Grenze akzeptieren. Umgekehrt widerlegen vorhandene Restfunde nicht automatisch die Aussage „gegenüber 1.8.0 nicht schlechter“.

Claudes angehängte automatische Kritik ist ein Prüfhinweis, kein eigenes Testergebnis. „Kein neues Leck“, „kein Leck überhaupt“, „vollständiger Import“, „barrierefrei“ und „vom Nutzer gestalterisch abgenommen“ sind unterschiedliche Aussagen.

### OCR und Importabdeckung – jetzt besonders prüfen

Die direkt gelesenen aktuellen Linux-CI-Logs melden:
- OCR mit Modell: 1/24 Restfunde.
- Import: 24/27, 3 verloren.
- 1 ungemessener Wert.

Die Mac-Logs melden dagegen:
- OCR mit Modell: 1/25 Restfunde.
- Import: 25/27, 2 verloren.
- 1 ungemessener Wert.

Diese Zahlen sind Testkorpuswerte, keine allgemeine Fehlerquote. Sie zeigen aber, dass „1 von 24 Lecks“ die Quellabdeckung allein nicht vollständig beschreibt. Verlorene oder ungemessene Werte dürfen nicht als erfolgreich geschützt zählen. Plattformunterschiede nach Dokument/Fundstelle erklären.

Die Freigabeliste nennt außerdem:
- OCR nur bis Seite 20.
- Bei PDFs mit Text- und Scanseiten werden Scanseiten nicht per OCR gelesen und fehlen im Ergebnis.

Die nächste Prüfung muss mit synthetischen Misch-PDFs und Dateien oberhalb der Grenze feststellen, wie deutlich die Oberfläche diese Unvollständigkeit meldet und welche Ausgabe/Nachweisfreigabe möglich ist. Keine Freigabe vollständiger Verarbeitung aus einem nur teilweise gelesenen Dokument ableiten.

### Erkennung und Baselines

Der berichtete 1.8.0-Vergleich (Handfälle 21→12 ohne KI, 4→0 mit KI; Synthetik 18→18 ohne KI, 1→0 mit KI) ist hier als Repo-Bericht belegt, nicht frisch auf beiden Versionen nachgerechnet.

Astra soll deshalb eine Vergleichsmatrix über Fallmenge × Modus × Kategorie × Importabdeckung verlangen, mit gleichen Eingaben, Modell-/Regelversionen und eindeutiger Zuordnung von W0/W1, wortlisten/fallback/ki. Neue Fälle, erlaubte Referenzänderungen und echte Verbesserungen getrennt ausweisen.

F7: Der genaue Fragenwortlaut nennt eine Erhöhung für V2-STANDORT im **Wortlisten-Modus** von 6 auf 7; die Abschlusszusammenfassung nennt teilweise Ausfallmodus. Tatsächlichen Baseline-Diff und Modus nachsehen. Keine Testfälle entfernen oder Grenzen erhöhen, um lediglich grün zu werden.

### Bewusst verschoben / noch nicht vom Inhaber bestätigt

- F3.c pdf.js 3.11.174: im Plan als frühere ausdrückliche Inhaberentscheidung F5 dokumentiert. Sicherheitslage und Maßnahmen überprüfen; nicht automatisch alle verschobenen Bibliothekswechsel vorziehen.
- Transformers.js 4: wegen API-Wechsel und fehlendem Messvorteil zurückgestellt.
- F6–F9: Antworten fehlen in V2-FRAGEN.md; dort stehen Empfehlungen und Fristen 27./28.10.2026. Diese sind nicht als ausdrücklich erteilte Antworten des Inhabers ausgeben.
- D60: niederländische Postleitzahlen bleiben teils lesbar; mit Anwendungsumfang und Kundenerwartung bewerten.
- CLI-Ausgabe ist nicht atomar. D65 stellt klar, dass nun die Dokumentation korrigiert wurde, der Codeumbau aber nach 2.1 verschoben ist. Nicht als bereits behobenen Codefehler verbuchen.
- Manueller Windows-Test hat eine leere Vorlage in docs/abnahme-windows.md. Ein ausgefüllter Inhaber-Abnahmenachweis ist hier nicht belegt.
- Automatische A11y-Tests und Claudes Screenshotprüfung sind nützliche Belege, aber keine unabhängige vollständige Bedienprüfung. Annotation ist laut README weiterhin nur per Maus bedienbar.
- Absolute Startseitentexte „datenschutzkonform“ und „Kein Daten-Leakage“ sind laut Freigabeliste unverändert.
- Der echte Release-Job bleibt ungeprüft; End-to-End-Updates und die gewünschte private Repository-Sichtbarkeit ändern den Verteilungspfad.

## Empfohlener Start für Astra/Sol

1. Diese beiden bestätigten Branches in der Cloud auschecken; Produkt und Plan getrennt lesen. Nicht von main oder dem älteren Code der Auftragsbranch starten.
2. Mit einer unabhängigen risikoorientierten Abnahme beginnen: Importvollständigkeit/OCR, Erkennungsvergleich, sichere Ausgabe, belastbare Aussagen, native Architekturen.
3. Bestehende grüne CI als Baseline verwenden. Zunächst gezielte Gegenproben; neue Vollsuiten nach tatsächlichen Änderungen oder zur unabhängigen Abschlussabnahme.
4. Restmängel nach Nutzerwirkung priorisieren. Die neue gewünschte UI, der Verarbeitungsnachweis und Modell-/RAM-Optimierungen sind zusätzliche Arbeitspakete mit eigenem Nutzen-/Risikovergleich.
5. Einen kleinen stabilen Launchumfang festlegen. Nicht pauschal alle 2.1-Funktionen zurück in 2.0 ziehen.
6. Sol setzt die beschlossenen Pakete um, Astra prüft Resultate. Release/Tag/Merge/Website-Deploy bleiben gesondert freizugeben.

Der eigentliche ausführbare Auftrag steht neben dieser Datei in CODEX_CLOUD_AUFTRAG.md.
