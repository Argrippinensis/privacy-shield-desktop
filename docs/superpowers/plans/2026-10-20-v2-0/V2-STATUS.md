# V2-STATUS: Fortschritt (Übersicht; Quelle der Wahrheit ist `loop/V2-QUEUE.json`, Anzeige: `node loop/queue.mjs status`)

> Die Tabelle unten ist die **ursprüngliche Planübersicht**. Den aktuellen Stand führt die Arbeitsliste (`loop/V2-QUEUE.json`, Pakete mit Teilung `.m` Modul / `.w` Oberfläche). Hier nur das Sitzungsprotokoll fortschreiben.

Status: `offen`, `bereit`, `laeuft`, `fertig`, `blockiert`, `verschoben` (mit Grund). Reihenfolge = Abarbeitung (Abhängigkeiten beachtet).
Der Orchestrator ändert nur diese Datei und den Branch `v2/main`; jede Statusänderung ist ein eigener kleiner Commit `docs: Status <Paket> <Status>`.

| Nr | Paket | Stufe | Marke | Voraussetzung | Status | Branch / Commit | Bemerkung |
|---|---|---|---|---|---|---|---|
| 0 | Basis `v2/main` (Serie 1.8.0 eingespielt, Tests grün) | Muss | H | - | offen | | siehe EXEC-PROMPT Schritt 1 |
| 1 | F2 Unit-Läufer, Electron 44, Härtung | Muss | H/S | 0 | offen | | |
| 2 | F1 Kern auslagern (erst Machbarkeitsprüfung) | Muss | S | 1 | offen | | Entscheidung Go/Nein hier eintragen |
| 3 | A1 Gegenprüfung | Muss | H | 1 | offen | | |
| 4 | A2 Bericht | Muss | H | 3 | offen | | |
| 5 | A3 Verschlüsselte Zuordnung | Muss | H | 1 | offen | | Prüfung Sonnet mittel Pflicht |
| 6 | A4 Hygiene | Soll | H | 1 | offen | | |
| - | **Beta 1** (`2.0.0-beta.1`) | Gate G1 | | 2-6 | offen | | Nutzer fragen |
| 7 | B1 Mehrfachauswahl, Projekt, ZIP | Muss | S | 4, 5, 6 | offen | | Sofortfix zuerst |
| 8 | B2 Weitere Formate | Soll | H | 1 | offen | | |
| 9 | C1 Korpusschleife, Durchlauf 1 | Muss | S | 1 | offen | | |
| 10 | C3 Eigene Regeln, Richtlinie | Soll | H/S | 1 | offen | | |
| 11 | C2 Verknüpfung derselben Person | Soll | S | 9 | offen | | Entscheidung D19 Platzhalterformat |
| 12 | D1 Prüfansicht, Rückgängig | Muss | S | 3 | offen | | Skill frontend-design |
| 13 | D3 Info-Dialog | Muss | H | 1 | offen | | |
| 14 | D2 Barrierefreiheit | Soll | S | 12, 13 | offen | | axe-core nur Tests |
| - | **Beta 2 / RC 1** | Gate G1 | | 7-14 | offen | | Nutzer fragen |
| 15 | E1 Kommandozeile | Soll | S | 4, 5, 7 | offen | | |
| 16 | E2 Öffnen mit, Einzelinstanz | Soll | H | 7 | offen | | |
| 17 | F3 Bibliotheken | Soll | S | 2 | offen | | Vorgängerplan WP 08 |
| 18 | F4 Stabilität (Eigenschafts-, Fuzz-, Installationstests) | Soll | S | 2, 8 | offen | | |
| 19 | C1 Durchlauf 2 | Muss | S | 9, 11 | offen | | |
| 20 | C1 Durchlauf 3 | Muss | S | 19 | offen | | |
| 21 | G1 Abnahme, Doku, Website, Veröffentlichung | Muss | S | alle Muss/Soll | offen | | Gate G1, G2 |
| - | Kann: B3, C4, D4, D5, E3, E4, E5 | Kann | S | | verschoben | | Version 2.1 |

## Entscheidungsprotokoll

| Nr | Entscheidung | Stand | Datum |
|---|---|---|---|
| D12 | Umfang 2.0 = Muss + Soll | Voreinstellung | |
| D13 | 1.8.0 zuerst separat veröffentlichen | Voreinstellung | |
| D14 | Zuordnung standardmäßig verschlüsselt | Voreinstellung | |
| D15 | Englische Oberfläche erst 2.1 | Voreinstellung | |
| D16 | Kommandozeile in 2.0 | Voreinstellung | |
| D17 | Versionsnummer 2.0.0 | Voreinstellung | |
| D18 | Web-Tool erhält gemeinsamen Kern nach 2.0 | Voreinstellung | |
| D19 | Platzhalterformat mit Endung (`{{NAME_1.NACHNAME}}`) | Voreinstellung | |

## Sitzungsprotokoll (je Sitzung eine Zeile)

| Datum | Pakete | Ergebnis | Offene Fragen an den Nutzer |
|---|---|---|---|
