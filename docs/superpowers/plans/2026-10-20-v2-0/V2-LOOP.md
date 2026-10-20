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

**Zwei Wege, ihn auszulösen:**
1. **Von Hand** (Nutzer fügt den Prompt ein, oder `/loop` ohne Intervall).
2. **Automatisch:** ein geplanter Auslöser (Cron, z. B. alle 2 Stunden) startet bei jedem Lauf eine **frische Sitzung** mit dem Prompt. Läuft noch eine Sitzung (Sperre frisch), beendet sich der neue Lauf sofort ("noop", wenige Tausend Token). Ist das Limit erschöpft, schlägt der Start fehl, ohne etwas zu verbrauchen; nach dem Zurücksetzen arbeitet der nächste Lauf weiter. Das ersetzt "der Nutzer triggert wieder".

**Einführung in Stufen (Pflicht, damit nichts Ungeprüftes unbeaufsichtigt läuft):**
1. *Probelauf von Hand:* Der Orchestrator führt Vorabprüfung und **ein** kleines Paket (A1.m, Haiku) komplett durch; der Nutzer liest den Bericht.
2. *Probelauf mit Auslöser, Tagesbetrieb:* Auslöser an, aber nur Pakete der Phase 1 und 2 (Vertrauen).
3. *Volle Freigabe* des Dauerbetriebs bis zur Phase Abschluss (ohne Release 2.0.0).

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
| einen Release freigeben | im Chat ausdrücklich, z. B. "Ja, 2.0.0-beta.1 veröffentlichen" (oder Dauerfreigabe, siehe `V2-FREIGABEN.md`) |
| ein Paket neu starten | `queue.mjs reopen <id>` |
