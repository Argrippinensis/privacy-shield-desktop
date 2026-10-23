# Uebergabe an die naechste Sitzung (Stand 2026-10-23 mittags) - ersetzt V2-UEBERGABE-SITZUNG-10.md

## Stand
* Triage T0 ist ERLEDIGT (Sitzung 10, `V2-TRIAGE-T0.md`, D34). Nicht wiederholen.
* Fertig: E1.fix, K2.fix, K1.fix (Sitzung 11, gepusht), K4.fix (Sitzung 12, lokal gemergt, Unit 857/857, npm test 1105 gruen). 36 von 58 Pflichtpaketen fertig (7 Kann-Pakete offen).
* Der Push von v2/main (4 Commits voraus: K4.fix-Merge und Testcommits) und von plan/v2-0 wurde vom Auto-Modus verweigert. ZUERST pruefen: `git -C ~/projects/ps-v2 status -sb` und `git -C /tmp/ps-planwt status -sb`. Ist noch etwas voraus, hat der Nutzer es nicht gepusht: nicht umgehen, Schritt trotzdem lokal weiterfuehren, in der Meldung nennen. Vor dem Push gilt: nicht pushen, solange ein CI-Lauf von v2/main laeuft.
* Der 2-Stunden-Ausloeser `trig_01BFtBbS69N7ymWDXat91cb4` ist PAUSIERT (enabled=false, 2026-10-23). Der Nutzer arbeitet von Hand. Nicht wieder aktivieren ohne Nutzerwunsch.

## Reihenfolge (Triage-Pakete zuerst, `queue.mjs next` waehlt sonst D3!)
Mit `claim <id>` gezielt in dieser Reihenfolge: S3.fix, C2.fix, B2.fix, Q1.fix, Q2.fix. Danach D1.w1, C1.2 (hingen an den Fixes), D3, E1.w, E2, F3.a, F4.a, F4.b; dann D1.w2, D2.1 (WCAG 2.2 AA, siehe V2-TRIAGE-T0 A1), D2.2, C1.3, F3.b-d, G1.docs, G1. D27 (Aufwandsgrenze eigener Muster) als kleines Paket mit Test-Autor einplanen.

## Betriebshinweise (gelernt, ergaenzt)
* Gate laeuft ~10 bis 15 min: im Hintergrund starten (`nohup ... > /tmp/gate-<id>.json`), Pruefer parallel (ohne Tests). Nie Worktree aendern, waehrend das Gate laeuft.
* Aendert man Tests NACH dem Test-Commit (z. B. Tippfehler im Test), faellt `tests-unveraendert` durch: Gate mit `--test-commit <neuer Commit>` wiederholen.
* Fuer `denk`-Pakete ohne `roles` im Eintrag: Sonnet, effort high (Test-Autor, Implementierer, Pruefer).
* Alte Tests fangen Downloads ueber `captureDownloads` (Anker-Klick) ab: Aenderungen am Speicherweg muessen das beruecksichtigen (K4.fix nutzt will-download mit Rueckmeldung, D38).
* HTML-Zeilenlimit app/privacy-shield.html: 4474 von 4500 (knapp! Pakete moeglichst Logik in Module auslagern oder Limit per Entscheidung anheben).
* Offene niedrige Restpunkte: D37 (4)-(7), D38 (Rueckfall 1,5 s, catch beim Schliessen, Dokument hinzufuegen ruft stateTouch nicht auf).
* `pkill -f` mit Worktree-Pfaden beendet die eigene Shell; Prozess-IDs gezielt beenden.
* Veroeffentlichen (Tag, Merge nach main, Deploy) nur nach schriftlicher Freigabe des Nutzers (Gate G1).
