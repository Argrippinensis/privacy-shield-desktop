# Uebergabe an die naechste Sitzung (Stand 2026-10-24 abends) - ersetzt V2-UEBERGABE-SITZUNG-13.md

## Stand
* 42 von 58 Pflichtpaketen fertig (ca. 72 Prozent), 16 Pflichtpakete offen, 7 Kann-Pakete (B3, C4, D4, D5, E3, E4, E5) gehen nach 2.1.
* Fertig seit Sitzung 13: S3.fix, C2.fix, B2.fix, Q1.fix, Q2.fix, D1.w1 (gemergt, Gesamttest 1331 bestanden, 0 Fehler; `v2/main` = bcb2d21, gepusht).
* C1.2 (Korpusschleife Durchlauf 2) ist FAST fertig, aber NUR LOKAL: Branch `v2/C1.2` (8c34d72) mit 25 roten Faellen, Erkennungsaenderung (detect.js), Ratsche, Abweichungsliste, Messung und Entscheidungen. Der Arbeitsordner /tmp/ps-wt/C1.2 ist weg (Container-Neustart), der Branch liegt im Klon ~/projects/ps-v2. Noch NICHT geschehen: Gate (`gate.mjs`), Pruefer, Merge nach v2/main, Gesamttest. Neu anlegen: `git -C ~/projects/ps-v2 worktree add /tmp/ps-wt/C1.2 v2/C1.2`; Claim in der Arbeitsliste pruefen (`queue.mjs status`, ggf. `claim C1.2` bzw. reap).
* Die Sitzung brach ab durch Nutzungslimit und einen Netzfehler (ENOTFOUND), kein Datenverlust. /tmp ist fluechtig: Plan-Worktree jetzt unter ~/projects/ps-plan (Branch plan/v2-0), Arbeitsklon ~/projects/ps-v2.
* Der 2-Stunden-Ausloeser ist PAUSIERT, nicht aktivieren. Keine Betas, keine Cron-Ausloeser (Nutzerentscheidung).

## Reihenfolge
C1.2 abschliessen (Gate, Pruefer, Merge), dann D3, E1.w, E2, F3.a, F4.a, F4.b, D1.w2, D2.1, D2.2, C1.3, F3.b, F3.c/F3.d (voraussichtlich `verschoben`, siehe F5), G1.docs, G1. Phasenpruefung nach D und E. D27 (Aufwandsgrenze eigener Muster) als kleines Paket mit Test-Autor.

## Ziel (Nutzer, 2026-10-24)
App finalisieren und als Version 2.0.0 startklar machen, inklusive Gestaltung (Skill frontend-design fuer jede Oberflaechenarbeit). Veroeffentlichen (Merge nach main, Tag, Deploy) NUR nach schriftlicher Freigabe (Gate G1).

## Betriebshinweise
Wie in V2-UEBERGABE-SITZUNG-13.md (Gate im Hintergrund, `--test-commit` bei spaeter geaenderten Tests, `pkill -f` nie mit Worktree-Pfaden, Push-Verweigerungen des Auto-Modus nie umgehen). HTML-Zeilenlimit app/privacy-shield.html: Limit 4500, zuletzt knapp; Logik in Module auslagern. Keine Emojis. Kein `git add -A`.
