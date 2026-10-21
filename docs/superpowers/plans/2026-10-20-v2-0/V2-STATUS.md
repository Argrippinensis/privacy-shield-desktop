# V2-STATUS: Fortschritt (Übersicht; Quelle der Wahrheit ist `loop/V2-QUEUE.json`, Anzeige: `node loop/queue.mjs status`)

> Die Tabelle unten ist die **Planübersicht nach der Planhärtung P0 (2026-10-21)**, gruppiert nach Phasen. Den aktuellen Stand führt die Arbeitsliste (`loop/V2-QUEUE.json`, Pakete mit Teilung `.m` Modul / `.w` Oberfläche; Anzeige `node loop/queue.mjs status`). Hier nur das Sitzungsprotokoll fortschreiben und bei Abweichungen vom Plan einen Satz in "Bemerkung" eintragen.

Status: `offen`, `bereit`, `laeuft`, `fertig`, `blockiert`, `verschoben` (mit Grund). Reihenfolge = Abarbeitung (Abhängigkeiten beachtet).
Der Orchestrator ändert nur diese Datei und den Branch `v2/main`; jede Statusänderung ist ein eigener kleiner Commit `docs: Status <Paket> <Status>`.

| Phase | Pakete | Stufe | Voraussetzung | Bemerkung |
|---|---|---|---|---|
| Basis | `v2/main` = Tag `v1.8.0` (geprüft, kein Unterschied), 33 von 33 Tests grün in 3 min 5 s | Muss | - | siehe EXEC-PROMPT Schritt 1 |
| P0 | Planhärtung | Muss | - | Ergebnis: `V2-LOOP.md` Abschnitt 9 und `V2-ENTSCHEIDUNGEN.md` |
| Fundament | F2, F1.a, F2.e, F1.b, F2.h, F5 | Muss (F5 Soll) | F2 zuerst | Machbarkeit F1 in P0 gemessen: Go |
| Vertrauen | M1.m, A1.m/.w, A2.m/.w, A3.m/.w, A4.m/.w | Muss (A4 Soll) | F2, F1.b für die Oberflächen | A3 Prüfung Sonnet xhigh Pflicht; Phasenprüfung danach |
| Dokumente | B1.fix, B1.m, B1.w1, B1.w2, B2.m1, B2.m2, B2.w | Muss (B2 Soll) | A-Pakete | Phasenprüfung danach |
| Erkennung | C1.0, C1.r, C1.1, C2.m/.w, C3.m/.w, C1.2, C1.3 | Muss (C2, C3 Soll) | F1.b, F5 | Entscheidung D19 Platzhalterformat; Abnahmetabelle V2-C |
| Bedienung | D1.m, D1.w1, D1.w2, D3, D2.1, D2.2 | Muss (D2 Soll) | A1.w, F1.b | Skill frontend-design; axe-core nur Tests; Phasenprüfung danach |
| Betrieb | E1.m, E1.w, E2, F3.a-d, F4.a, F4.b | Soll | siehe Liste | F3.c und F3.d ggf. `verschoben` (Fragen F5) |
| Abschluss | G1.docs, G1 | Muss | alle Muss/Soll | Gate G1, G2 |
| Kann | B3, C4, D4, D5, E3, E4, E5 | Kann | | Version 2.1, `verschoben` |

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
