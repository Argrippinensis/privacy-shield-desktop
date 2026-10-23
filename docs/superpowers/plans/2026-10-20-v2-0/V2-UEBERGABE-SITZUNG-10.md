# Uebergabe an die naechste Sitzung (Stand 2026-10-22 abends)

Diese Datei ergaenzt den Standard-Prompt (`V2-EXEC-PROMPT.md` Teil A). Der Zustand steht wie immer in Git und in `loop/V2-QUEUE.json`; hier steht nur, was die neue Sitzung ZUERST und ANDERS tun soll.

## Stand
* v2/main (privates Repo `Argrippinensis/privacy-shield-desktop`, Entwurfs-PR Nr. 4): 31 bis 32 von 56 Paketen fertig. Zuletzt gemergt: C1.0, C1.r, C1.1 (Korpusschleife 1), C2.w (Verknuepfung im Kern). C3.w (Eigene Regeln, Oberflaeche) war bei Uebergabe in Pruefung; siehe `queue.mjs status`.
* CI auf v2/main: Ubuntu und Windows gruen (Windows-Wettlauf im Test-Helfer behoben, D30/D31). Nicht pushen, solange ein CI-Lauf von v2/main laeuft (jeder Push bricht den vorigen Lauf ab).
* Entscheidungen D1 bis D33 in `V2-ENTSCHEIDUNGEN.md` (D24 bis D33 stammen aus dieser Sitzung).

## Neu: Unabhaengige Pruefung durch ChatGPT (UNGEPRUEFT)
Datei: `V2-GPT-REVIEW-1.md` (Wortlaut). Zehn Hauptfunde: K1, E1, K2, K4 (kritisch), K3, S1, S2, S3, Q1, Q2 (hoch), A1 (mittel). ChatGPT hat nur gelesen und isolierte Gegenproben im Arbeitsspeicher ausgefuehrt; es sah einen aelteren Stand (v2/main ceaa728, vor C1.x bis C3.w).

### Erste Aufgabe der neuen Sitzung: TRIAGE (Paket T0, vor allen weiteren Oberflaechenpaketen)
Fuer JEDEN Fund (K1, E1, K2, K3, K4, S1, S2, S3, Q1, Q2, A1 und die Rueckfragen) einen Unteragenten (Sonnet, effort high, frischer Kontext, je Fund oder zwei verwandte Funde) beauftragen, der gegen den AKTUELLEN v2/main und gegen 1.8.0 (main) PRUEFT:
1. Ist der Fund reproduzierbar? Beleg als ROTER TEST (App-Test mit Playwright oder Unit-Test), nicht als Behauptung. Skripte/Tests zuerst ausserhalb des Repos in /tmp/triage/.
2. Gilt er schon in 1.8.0 (Rueckschritt oder alter Fehler)? Das entscheidet Dringlichkeit und Kommunikation.
3. Ist er durch spaetere Pakete schon behoben oder faellt er unter bekannte Entscheidungen (D-Nummern)?
Ergebnis je Fund: BESTAETIGT (mit rotem Test), TEILWEISE, NICHT REPRODUZIERBAR (Begruendung) oder BEWUSSTE ENTSCHEIDUNG (D-Nummer, ggf. Rueckfrage an den Nutzer, Klasse B/C). Erst danach neue Pakete in die Liste (`make-queue.py` + `V2-QUEUE.json`, Dateilisten eng) einfuegen und priorisieren.

Hinweise zur Einschaetzung (Vermutungen des Orchestrators, nicht verifiziert):
* K1, K4, S2 betreffen Zustandsuebergaenge im Projektmodus und beim Speichern (app/privacy-shield.html: prj, prjRes, store, mapSaved, dl, prjScope). Die geplanten Pakete D1.w1/D1.w2 (Pruefansicht) bauen darauf auf: erst klaeren, dann Oberflaeche.
* K2 (literale Platzhalter im Original) wurde im Prueferbericht C2.w schon als Hinweis genannt (Rundlauf bricht in v2/main wie in 1.8.0); GPT behauptet einen Rueckschritt oder zumindest eine Pflichtluecke. Pruefen und gegebenenfalls als eigenes Paket vor C1.2 behandeln (Erkennungskern: detect.js Tokenvergabe).
* E1 (NBSP/Vollbreitenzeichen bei manuellen Markierungen) ist plausibel (marks.js gegen Normalisierung in detect.js).
* S3 (HTML-Einschleusung ueber Variablennamen) sei laut GPT schon in 1.8.0 vorhanden; bei Bestaetigung ist es auch ein Befund fuer die veroeffentlichte Version (Nutzer informieren, Klasse B/C).
* S1 (ZIP-Groessen faelschen): Gegenprobe von GPT war 4 MiB, kein Speicherangriff; zu pruefen, ob JSZip-Version oder eigene Begrenzung hilft.
* A1: Zielversion WCAG 2.2 AA statt 2.1 AA in V2-D-bedienung.md (Abnahmetabelle) anpassen: ohnehin vor D2.1 noetig.
* Q1/Q2 (Messverfahren) sind Qualitaetssicherung: ehrliche Zahlen sind wichtiger als bessere Zahlen.

## Danach: weiter mit der Liste
Bereit (Stand Uebergabe): C1.2, D1.w1, D3, E1.w, E2, F3.a, F4.a, F4.b; D1.w2, D2.x, C1.3, G1.* folgen. D27 (Aufwandsgrenze der eigenen Muster 1000 auf etwa 200 senken, Zeittest flackert unter Last) als eigenes kleines Paket mit Test-Autor einplanen (policy.js und seine Unit-Tests).

## Betriebshinweise (gelernt)
* Gate ist langsam (~15 min fuer `npm test`): im Hintergrund starten und den Prueferagenten parallel laufen lassen; Gate nie waehrend Aenderungen am Worktree starten.
* `pkill -f` mit Worktree-Pfaden beendet die eigene Shell; stattdessen Prozess-IDs gezielt beenden.
* Der Auslöser (2-Stunden-Cron, `trig_01BFtBbS69N7ymWDXat91cb4`) kann parallel eine eigene Sitzung starten; Sperre mit `queue.mjs lock acquire` beachten. Wenn die neue Sitzung die Triage macht, den Auslöser vorher pausieren (Nutzer fragen), damit keine Pakete auf einem moeglicherweise falschen Zustand aufsetzen.
* Release 2.0.0 nur nach schriftlicher Freigabe des Nutzers (Gate G1).

> ERSETZT: aktuelle Uebergabe ist V2-UEBERGABE-SITZUNG-13.md (T0 und K4.fix erledigt).
