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
| 2026-10-21 | Probelauf: P0 und F2 fertig (Gate gruen, 96/96, Differenztest 0 von 645). Hinweise Pruefer F2: captureDownloads verwirft Klicks auf Anker ohne download-Attribut (in F2.h/B1 beheben); loadlib-Test ohne Fehlercode. Offen: Fragen F1-F5 (Frist 2026-10-24). Naechster Schritt: F1.a, F2.e |
| 2026-10-21 | Sitzung 2: M1.m, F1.a fertig (134 Unit-Tests, Differenztest 0 von 645, Eval unveraendert). Hinweise F1.a-Pruefer fuer F1.b: lastP1-Cache im finally leeren, Globals-Zuweisung in try, released-Semantik dokumentieren. Naechster Schritt: F2.e (Electron 44, build), danach F1.b |
| 2026-10-21 | Sitzung 3: A1.m, A2.m, F2.e fertig und lokal in v2/main gemergt (242/242 npm test, Eval unveraendert). Push von v2/main vom Auto-Modus verweigert (Out-of-Place Publication), nicht umgangen; Push steht aus. Offen: F1-F5 (Frist 2026-10-24). Naechster Schritt: F1.b, F2.h, A3.m, A4.m |
| 2026-10-21 | Sitzung 4: B1.m, B2.m1, F2.h fertig und lokal in v2/main gemergt (npm test 518/518, Unit 421/421; Fix: Copyright-Zeichen in formats.js als Escape). Push von v2/main erneut vom Auto-Modus verweigert (Out-of-Place Publication), nicht umgangen; v2/main liegt 8 Commits vor origin. Offen: F1-F5 (Frist 2026-10-24). Naechster Schritt: B2.m2, A3.w, A4.w, B1.fix, F5 |
| 2026-10-21 | Sitzung 4b (parallel zu 4, anderer Lauf): A4.m, A3.m (Pruefer-Maengel behoben, Nachholpunkte D22), F1.b (D21, D23) fertig; v2/main mit F2.h, B1.m, B2.m1 der anderen Sitzung zusammengefuehrt und gepusht (Push diesmal erfolgreich). Nutzungslimit bis 12:20. Offen: F1-F5 (Frist 2026-10-24). Naechster Schritt: B2.m2, A3.w, A4.w, B1.fix, F5 |
| 2026-10-21 | Sitzung 5: B2.m2, C2.m (D24), D1.m (D25) fertig und in v2/main gemergt und gepusht (Unit 544/544). F5: rote Tests (d260d7f) fertig, Implementierung unterbrochen durch Nutzungslimit (Reset 17:20), Worktree /tmp/ps-wt/F5. C3.m: Implementierung (0a98214) und Test-Korrektur (72cba09) fertig, Gate gruen (92/92), Sicherheitspruefung (Sonnet xhigh) unterbrochen durch Limit, Worktree /tmp/ps-wt/C3.m. Offen: keine neuen Fragen. Naechster Schritt: C3.m Pruefung wiederholen, F5 fortsetzen (reap setzt beide zurueck auf offen; Worktrees und Branches v2/F5, v2/C3.m weiterverwenden), dann C1.0, D3, E1.m, F4.b, A1.w |
| 2026-10-22 | Sitzung 6: C3.m (Pruefer-Maengel Aufwandsgrenze behoben, Test fuer Zaehlung nach Spezifikation angepasst), A1.w fertig und in v2/main gemergt und gepusht (npm test 807/807, Eval ohne Lecks). F5 weiter blockiert (Namensketten 125-500 Zeichen). Hinweis: HTML-Zeilenlimit 3450 ausgereizt (3449); A1.w-Gegenpruefung ignoriert Typ-Schalter. Naechster Schritt: C1.0, D3, F3.a, F4.b, B1.fix, F5 |
| 2026-10-22 | Sitzung 7: A2.w, A3.w (Sicherheitspruefung: XSS u. a. behoben, D29), A4.w (D30) fertig, gemergt und gepusht (Unit 705/705, npm test 832/832); D28: HTML-Zeilenlimit auf 4500. F5 weiter blockiert. Offen: keine neuen Fragen. Naechster Schritt: B1.fix, C1.0, D1.w1, D3, F3.a, F4.b, F5 |
| 2026-10-22 | Sitzung 8: B1.fix, B1.w1 (D31, D32), B1.w2 fertig, gemergt und gepusht (Unit 705/705, npm test 850/852 gruen, 2 uebersprungen = D31; Eval unveraendert). F5 weiter blockiert. Offen: keine neuen Fragen. Naechster Schritt: C1.0, D1.w1, D3, F3.a, F4.b, B2.w, F5 (Nachholpunkte D32: Fehlerstatus erklaeren, LIMIT-Tests, Leistungsabnahme 50 Dokumente) |
| 2026-10-22 | Sitzung 9 (Nutzer-Sitzung, Orchestrator; Stand zuletzt: C2.w fertig, 31 von 56): F5 (3 Pruefrunden: Namensketten, verklebte E-Mails/Adressen, Grossbuchstaben-Umlaute), C1.0, C1.r, C1.1 fertig und gemergt (Unit 799/799, npm test 986 gruen, Differenztest 0 von 645, Fehlalarme nirgends neu). CI: Windows-Fehler (Wettlauf im Test-Helfer, kein App-Fehler) behoben, CI auf v2/main gruen (Ubuntu und Windows, D30/D31). Entscheidungen D24-D32. 30 von 56 Paketen fertig. Offen: keine neuen Fragen. Bekannt: Zeittest policy.test.mjs unter Last flackernd (D27, Behebung in C3.w); Erkennungs-Backlog fuer C1.2 im Entscheidungsprotokoll. Naechster Schritt: C2.w, C3.w, D1.w1, D3, E1.w, E2, F3.a, F4.a, F4.b |
| 2026-10-22 | Sitzung 9 Ende: C3.w fertig (Pruefer: Tastatur-Import, Fail-closed bei Regelfehler, stabile IDs behoben), 32 von 56 Paketen fertig; gepusht v2/main (CI vorher gruen). GPT-Pruefung (V2-GPT-REVIEW-1.md, ungeprueft) und Uebergabe (V2-UEBERGABE-SITZUNG-10.md) abgelegt. Naechster Schritt: neue Sitzung, Triage der GPT-Funde (Paket T0) VOR D1.w1 und weiteren Oberflaechenpaketen |
| 2026-10-23 | Sitzung 10: Triage T0 der GPT-Funde (alle bestaetigt oder teilweise, 1.8.0-Vergleich), 9 neue Pakete in der Liste (D34); keine Produktpakete bearbeitet. Offen: keine neuen Fragen. Naechster Schritt: E1.fix, B2.fix, Q1.fix, dann K2.fix, K1.fix, K4.fix |
| 2026-10-23 | Sitzung 11: E1.fix, K2.fix, K1.fix fertig, gemergt, gepusht (Unit 857/857, npm test 1085 gruen, Eval ohne Lecks). Entscheidungen D35-D37 (Restpunkte niedrig, K1.fix-Veraltet-Sperre statt Neuberechnung bei Einstellungswechsel). Zeittest policy.test.mjs unter Last flackernd (bekannt D27). Offen: keine neuen Fragen. Naechster Schritt: K4.fix, S3.fix, C2.fix, B2.fix, Q1.fix, Q2.fix, dann D1.w1, C1.2, D3 |
| 2026-10-23 | Sitzung 12: Triage T0 war schon erledigt (Sitzung 10); K4.fix fertig und lokal gemergt (Unit 857/857, npm test 1105 gruen, 0 Fehler). Push von v2/main (4 Commits voraus) und plan/v2-0 vom Auto-Modus verweigert (Out-of-Place Publication), nicht umgangen. Offen: Push durch den Nutzer. Naechster Schritt: S3.fix, C2.fix, B2.fix, Q1.fix, Q2.fix, dann D1.w1, C1.2 |
| 2026-10-23 Sitzung 14 | fertig: S3.fix, C2.fix, B2.fix (alle gemergt und gepusht, Gesamttest gruen); Q1.fix: Test, Umsetzung, Gate gruen (Branch v2/Q1.fix, Worktree /tmp/ps-wt/Q1.fix), Pruefer wegen Nutzungslimit abgebrochen (SendMessage an abc2acb17b1ea3577 oder neu starten), danach Merge + Gesamttest | blockiert: keine | Fragen: keine neuen (D39, D40 eingetragen) | naechster Schritt: Q1.fix Pruefer, Q2.fix, dann D1.w1, C1.2 |
| 2026-10-24 Sitzung 15 | fertig: C1.2 (Pruefer-Maengel Passwort-Komposita und Nachnamen nach Anrede behoben, Fehlalarme 3-5 nach C1.3), D3, E1.w (Gesamttest 1414 gruen, 0 Fehler); v2/main und plan/v2-0 gepusht | blockiert: keine | Fragen: F6 (E-ORT), F7 (STANDORT 6 auf 7) | naechster Schritt: E2, F3.a, F4.a, F4.b, D1.w2, D2.1, D2.2, C1.3 (mit 14 Fehlalarm-Faellen v2n61-74 und Zaehltest 60 auf 74), F3.b-d, G1.docs, G1; Nachholpunkte D49 (D2.1), D50 |
| 2026-10-24/25 Sitzung 15 (Fortsetzung) | fertig: C1.2, D3, E1.w, E2, F3.a (mammoth 1.13.0, JSZip 3.10.2, jsPDF 4.2.1), F4.a, F4.b, D1.w2, D2.1, D2.2 (je Gate, Pruefer, Merge, Gesamttest gruen, gepusht); Sammelreparaturen CIfix bis CIfix4 (Tests im gebauten Programm, macOS, Windows-stdin D56); CI-Probelauf 4 gruen auf Ubuntu, Windows, macOS (Lauf 40177172485); C1.3 in Pruefung (Branch v2/C1.3, Worktree /tmp/ps-wt/C1.3) | blockiert: keine | Fragen: F6, F7, F8, F9 (Standardantwort gilt bis Frist 2026-10-27/28) | naechster Schritt: C1.3 merge, F3.b, F3.c/F3.d (voraussichtlich verschoben), G1.docs (Pflicht D58: Fusszeile v1.6.1), Kann-Pakete B3 C4 D4 D5 E3 E4 E5 auf verschoben setzen, letzter CI-Probelauf inkl. break_model, G1 Freigabeliste |
