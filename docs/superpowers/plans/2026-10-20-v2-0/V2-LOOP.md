# V2-LOOP: Dauerbetrieb ohne Rückfragen (Entwurf und Betriebsanleitung)

**Ziel:** Das System arbeitet die 2.0-Arbeitsliste selbständig ab, prüft sich selbst, fragt nur bei **lenkenden** Entscheidungen und läuft, bis das Nutzungslimit erreicht ist.
Nach dem Zurücksetzen des Limits macht es von allein weiter. Der Nutzer muss einen nächsten Schritt nie bestätigen, nur wirklich lenkende Fragen beantworten.

## 1. Wo bleibt ein Loop normalerweise stehen, und was fängt es ab

| Stopp-Ursache | Gegenmaßnahme | Wo umgesetzt |
|---|---|---|
| Berechtigungsabfrage (Befehl nicht freigegeben) | enge, ausreichende Erlaubnisregeln (zweites Skript `apply-setup2.py`), Vorabprüfung am Sitzungsanfang, bei Verweigerung: Frage vermerken und mit anderem Paket weitermachen | `~/.claude/settings.json` (vom Nutzer), Orchestrator Schritt 1 |
| Bestätigung für den "nächsten Schritt" | **Dauerfreigaben** mit klar begrenztem Umfang (`V2-FREIGABEN.md`), damit Routineschritte nicht einzeln bestätigt werden | Nutzer erteilt einmal im Chat |
| Offene Frage | **Fragenliste** statt Blockade: Frage mit Empfehlung und Standardantwort in `V2-FRAGEN.md`, Push-Nachricht, Arbeit geht an anderer Stelle weiter; ohne Antwort gilt nach Frist die Standardantwort, wenn sie umkehrbar ist | `V2-FRAGEN.md`, Orchestrator |
| Fehlschlag eines Pakets | Leiter: Wiederholung, Modellwechsel, Aufteilen, Parken ("blockiert") und unabhängige Pakete weiterarbeiten | `queue.mjs` (Versuchszähler), Orchestrator |
| Kontext voll | frischer Kontext je Rolle (Unteragenten), Zustand nur in Dateien, Sitzung endet nach 3 Paketen mit Wiedereinstieg | Orchestrator, `V2-QUEUE.json` |
| Nutzungslimit erreicht | jeder Schritt ist **festgeschrieben** (Commit, Queue-Eintrag), nichts hängt am Gedächtnis; ein geplanter Auslöser startet nach dem Zurücksetzen von allein neu | Lease, Auslöser (siehe 4) |
| Sitzung bricht ab | **Lease mit Ablaufzeit** (45 min): das nächste Starten setzt verwaiste Pakete zurück | `queue.mjs reap` |
| Zwei Sitzungen gleichzeitig | **globale Sperre** mit Ablaufzeit (30 min) und Herzschlag | `queue.mjs lock` |
| Eigener Fehler läuft aus dem Ruder | Not-Aus-Datei `~/.ps-STOP`, Versuchsgrenze 3, nur Branches `v2/*`, nie `main` | `queue.mjs stopped`, Regeln |

## 2. Entscheidungsregeln (wann fragt das System?)

| Klasse | Beispiele | Verhalten |
|---|---|---|
| **A: umkehrbar, intern** | Benennung, Reihenfolge, Teststruktur, Wahl zwischen gleichwertigen Lösungen | entscheiden, in `V2-ENTSCHEIDUNGEN.md` mit einem Satz Begründung festhalten, weitermachen |
| **B: umkehrbar, aber folgenreich** | Produktverhalten (Standardprofil, Platzhalterformat), Verzicht auf ein Soll-Paket | Standardantwort aus dem Plan nehmen, Frage mit Frist (72 h) in `V2-FRAGEN.md`, Push-Nachricht; weitermachen |
| **C: öffentlich, unumkehrbar, kostenpflichtig, rechtlich** | Release 2.0.0 (final), Website-Deploy, Käufe, Konten, Datenschutz-/Lizenztexte, Preise | **nie selbst entscheiden**; nur mit schriftlicher Freigabe des Nutzers (`V2-FREIGABEN.md`) oder auf Frage warten |

Fragen werden **gebündelt und knapp** gestellt: eine Zeile Frage, Empfehlung, Standardantwort, Auswirkung bei "Nein". Der Nutzer antwortet im Chat mit `F3: ja` oder `F3: nein, weil ...`.

## 3. Selbstprüfung (Schichten, Reihenfolge der Strenge)

1. **Rote Tests vor der Umsetzung**, geschrieben von einer anderen Instanz als der Implementierer (Test-Autor). Der Orchestrator prüft, dass sie aus dem richtigen Grund rot sind.
2. **Deterministisches Prüfskript** `loop/gate.mjs` je Paket (kein Modellurteil): nur erlaubte Dateien geändert, Tests seit dem Test-Commit unverändert, keine Emojis in neuen Zeilen, keine Geheimnisse, Module ohne DOM-Zugriff, Abnahmebefehle des Pakets mit Exit-Code 0.
3. **Prüfer mit frischem Kontext** nur dort, wo Urteil nötig ist (Marke S, Kryptografie A3, Oberfläche D1/D2/D3). Mechanische Pakete (H) brauchen ihn nicht: spart Aufrufe.
4. **Gesamtsuite und Ratsche** beim Merge auf `v2/main` (`xvfb-run -a npm test`, bei Erkennungsänderung `npm run eval`): Lecks nie schlechter, Fehlalarme 0, Leistungsbudgets.
5. **Phasenprüfung** durch einen unabhängigen Prüfer (Sonnet, mittel) nach den Phasen Vertrauen, Bedienung und vor dem Release, mit Gegenauftrag "versuche das kaputt zu machen" (Gegenproben: Fuzzing, absichtlich beschädigte Eingaben, Rundlauf über das ganze Korpus). Befunde werden Pakete in der Liste.
6. **CI auf drei Systemen** (Windows, macOS, Linux) bei jedem Pull-Request-Update; Windows-Installationstest (F4).
7. **Ratschen werden nie gelockert:** `tests/eval/baseline.json`, Golden-Dateien und Leistungsbudgets darf nur ein Paket ändern, das sie in seiner Liste der erlaubten Dateien hat (C, F1, F3, F4); jede andere Änderung scheitert an der Geltungsbereichsprüfung des Prüfskripts. Bei diesen Paketen prüft der Prüfer den Diff der Basisdatei und verlangt einen Eintrag in `V2-ENTSCHEIDUNGEN.md`.

## 4. Dauerbetrieb und automatischer Neustart

**Der Wiedereinstieg ist immer derselbe Prompt** (`V2-EXEC-PROMPT.md`, Teil A): Er liest nur die Arbeitsliste und macht dort weiter. Es gibt keine "Sitzungsgeschichte", auf die es ankommt.

**Auslösen:**
1. **Von Hand** (Nutzer fügt den Prompt ein, oder `/loop` ohne Intervall).
2. **Automatisch (eingerichtet am 2026-10-20, Wunsch des Nutzers):** geplanter Auslöser `trig_01BFtBbS69N7ymWDXat91cb4` (alle 2 Stunden, Minute 27) startet eine frische Sitzung mit dem Weiter-Prompt. Hält eine Sitzung die Sperre (Herzschlag alle Schleifendurchläufe, Ablauf 30 min), beendet sich der neue Lauf sofort. Abschalten: `update_trigger enabled=false` oder Not-Aus `touch ~/.ps-STOP`.

**Einführung in Stufen (Pflicht, damit nichts Ungeprüftes unbeaufsichtigt läuft):**
1. *Probelauf von Hand:* Der Orchestrator führt Vorabprüfung, die Planhärtung P0 und das Paket F2 (Unit-Läufer, Electron 44) mit der ganzen Pipeline durch; der Nutzer liest den Bericht.
2. *Arbeitsbetrieb:* danach Sitzung für Sitzung bis zur Abnahme (ohne Release 2.0.0; das bleibt ein eigenes Gate).

## 5. Zeitliche Optimierung (ehrlich)

* **Parallel:** Module (neue Dateien, Marke "H") laufen gleichzeitig (bis zu 3), weil sie keine gemeinsamen Dateien berühren. Pakete, die die gemeinsame HTML ändern ("seriell"), laufen **einzeln**. Deshalb ist jedes Paket mit Oberfläche in `.m` (Modul, parallel) und `.w` (Verdrahtung, seriell) geteilt. Das senkt Merge-Konflikte fast auf null.
* **Warten nutzen:** Tests und CI laufen im Hintergrund; der Orchestrator arbeitet in der Zeit am nächsten bereiten Paket.
* **Kleine Kontexte:** Unteragenten bekommen nur ihren Paketabschnitt und die erlaubten Dateien; die große HTML wird per `grep -n` angesprungen, nicht gelesen.
* **Günstige Modelle zuerst:** Der größte Teil der Arbeitsstunden entfällt auf Haiku (Module mit Tests). Das erhöht die Arbeit je Limit.
* **Grenze:** Parallelität verkürzt die Wartezeit, aber **nicht** den Verbrauch. Wenn das Limit die Bremse ist, zählt Arbeit je Token: kleine Kontexte, günstige Modelle, deterministische Prüfungen statt Modellurteil.

## 6. Berichte an den Nutzer (nur das Nötige)

* **Push-Nachricht** (Werkzeug `PushNotification`): bei offener Frage der Klasse B/C, bei blockiertem Paket, bei fertiger Phase (Beta bereit), bei erschöpften Versuchen. Eine Zeile, mit Empfehlung.
* **Abschlussnotiz je Sitzung** in `V2-STATUS.md` (Sitzungsprotokoll): erledigt, blockiert, offene Fragen, nächster Schritt.
* **Kein** Bericht je Paket im Chat: Details stehen in Commits und Status.

## 7. Betriebsanleitung für den Nutzer (Kurzfassung)

| Ich will ... | Tun |
|---|---|
| starten oder weitermachen | Prompt aus `V2-EXEC-PROMPT.md` Teil A einfügen (neue Sitzung, Sonnet, mittel) |
| sofort alles anhalten | Terminal: `touch ~/.ps-STOP` (aufheben: `rm ~/.ps-STOP`) |
| sehen, wo wir stehen | `node <PLAN>/docs/superpowers/plans/2026-10-20-v2-0/loop/queue.mjs status` oder `V2-STATUS.md` |
| eine Frage beantworten | im Chat: `F3: ja` (oder `nein, weil ...`) |
| einen Release freigeben | im Chat ausdrücklich, z. B. "Ja, 2.0.0 veröffentlichen" |
| ein Paket neu starten | `queue.mjs reopen <id>` |

## 8. Modelle und Denkaufwand: kein Umschalten durch den Nutzer

**Eine Sitzung, ein Modell.** Der Nutzer startet **eine** Sitzung (Sonnet, Denkaufwand mittel) und wechselt nie. Der Orchestrator selbst führt nur Listen und Prüfbefehle aus (Buchhaltung) und braucht kein hohes Denkniveau. Modell und Denkaufwand der **Unteragenten** setzt er je Aufruf über die Parameter `model` und `effort` des Agent-Werkzeugs. Die Werte kommen aus dem **Profil** in `loop/V2-QUEUE.json` (aufgelöst von `queue.mjs next` im Feld `roles` je Paket).

**Aufteilung nach Art der Aufgabe, nicht nach Zeit** (die schwierigen Pakete liegen über das ganze Projekt verteilt: Kern, Erkennung, Oberflächen, Abnahme):

| Art (`tier`) | Pakete | Test-Autor | Implementierer | Prüfer |
|---|---|---|---|---|
| **spike** (Entscheiden, Planen) | P0 Planhärtung, F1.spike | high | **xhigh** | (Orchestrator liest das Ergebnis) |
| **denk** (Urteil, Entwurf, Randfälle) | F1, C1 (3 Durchläufe), C2, B1.w, D1.w, D2, E1, F3, F4, G1 | medium | **high** | medium |
| **bau** (Modul mit fertigen Tests, mechanische Verdrahtung) | alle übrigen (A1, A2, A3, A4, B1.m, B2, C3, D1.m, D3, E2 ...) | low | **low** | nur wenn `review: true` (alle `.w`, A3, D1.m, D3): medium, bei Kryptografie xhigh |
| **Phasenprüfung** | an Meilensteinen | | | **xhigh** |

Profile (Befehl `node loop/queue.mjs profile [name]`): **`sonnet`** (Standard, nur Sonnet) und **`gemischt`** (Bau-Implementierer mit Haiku, spart Verbrauch). Umstellen ändert nur diese Auflösung; Pakete, Tests und Prüfungen bleiben gleich. Empfehlung: `sonnet`, solange das Limit nicht der Engpass ist.

Hinweis: Zeitgesteuerte Sitzungen erben das Modell der erzeugenden Sitzung; der Denkaufwand der Sitzung selbst ist dort unerheblich, weil das Denken in den Unteragenten sitzt.

## 9. Planhärtung (Paket P0, einmalig, höchster Denkaufwand)

Zweck: Bevor irgendetwas gebaut wird, prüft eine Instanz mit **xhigh** den ganzen Plan gegen den echten Code und behebt Lücken. Ein Fehler im Plan kostet später in jedem Paket.

Auftrag (Unteragent, Sonnet xhigh, frischer Kontext, arbeitet im Plan-Worktree auf `plan/v2-0`, erlaubte Dateien: nur `docs/superpowers/plans/2026-10-20-v2-0/**`):
1. **Existenz:** Jede in den Paketdokumenten genannte Datei, Funktion, Zeile, Option und Kommandozeile gegen den echten Code in `v2/main` prüfen (`grep -n`, `node -e`). Abweichungen im Plan korrigieren.
2. **Ausführbarkeit der Spezifikation:** Kann ein Test-Autor aus dem Abschnitt jedes Pakets **ohne Rückfrage** Tests schreiben (Eingaben, erwartete Ausgaben, Fehlercodes eindeutig)? Lücken füllen; mehrdeutige Stellen entscheiden (Klasse A, Eintrag in `V2-ENTSCHEIDUNGEN.md`).
3. **Annahmen messen statt glauben:** mindestens (a) PBKDF2 mit 600.000 Iterationen: Dauer in Node und in der Electron-Seite auf diesem Rechner (Ziel unter 2 s; sonst Iterationen/Hinweis anpassen); (b) `crypto.subtle` in der App-Seite `app://ps/` verfügbar (sicherer Kontext); (c) JSZip aus `app/vendor` in Node ladbar (Tests B2); (d) `electron-updater` ignoriert Pre-releases ohne `allowPrerelease` (Dokumentation/Quelltext prüfen); (e) `npm run test:unit` nach F2 in unter 5 s; (f) Windows-Verhalten der Kommandozeile (E1) gegen die Dokumentation von Electron prüfen; (g) `axe-core` lässt sich in der App per `addScriptTag` ausführen.
4. **Paketgröße:** Pakete, bei denen mehr als etwa 300 Zeilen Änderung oder mehr als 3 Dateien zu erwarten sind, teilen (Eintrag in `make-queue.py`, danach `python3 -I loop/make-queue.py > loop/V2-QUEUE.json`, `node loop/selftest.mjs` grün).
5. **Abnahmebefehle** je Paket auf Lauffähigkeit prüfen (Trockenlauf des Befehls, soweit ohne die Implementierung möglich).
6. Ergebnis: überarbeitete Dokumente und Liste, Bericht mit allen Änderungen (Datei, Grund). Keine Codeänderung außerhalb des Plans.
