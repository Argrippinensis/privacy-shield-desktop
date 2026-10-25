# Erkennungskern im Web-Tool (Vorbereitung, Paket F1.b)

Stand: Desktop-App 2.0.0 (Veroeffentlichung steht aus). Der Kern ist ausgelagert und in der Desktop-App eingebunden; das Web-Tool (arcangeli.eu) ist unveraendert und wird nicht mit 2.0 ausgeliefert (Umsetzung danach, Entscheidung D18).

## Wie das Modul eingebunden ist

`app/privacy-shield.html` enthaelt den Erkennungskern nicht mehr (Regeln, Profile, Wortlisten, Stoppwoerter, Nachbearbeitung, Platzhaltervergabe). Er liegt in `app/lib/detect.js` und wird per `<script src="lib/detect.js"></script>` nach `lib/placeholder.js` und `lib/coref.js` (seine beiden Abhaengigkeiten) und vor dem Hauptskript geladen. Das Modul ist UMD: im Browser `window.PSDetect` (auch `PSLib.detect`), in Node `require`.

Die HTML behaelt nur duenne Fassaden mit unveraenderten Namen (`ENTS`, `PROFILES`, `store`, `cnt`, `aiCache`, `localAIMode`, `whitelist`, `cvars`, `curProf`, `collectEntities`, `anon`, `anonCore`, `deanon`, ...):

- `const ENTS = PSDetect.ENTS; const PROFILES = PSDetect.PROFILES;` (die Oberflaeche schaltet `e.on` weiter in `ENTS`; das Modul liest `on` nicht, sondern `opts.ents`).
- `collectEntities(text)` ruft `PSDetect.detect` mit den ids der aktiven Regeln, `cvars`, `whitelist`, `wordlists: localAIMode` und den KI-Treffern aus `aiCache`.
- `anonCore` ruft `PSDetect.anonymize` mit `state: { store, cnt }` und schreibt `store = r.state.store`, `cnt = r.state.cnt` zurueck. `deanon` ruft `PSDetect.deanonymize`.
- Die KI-Erkennung (`ensureAISpans`) bekommt den Text mit maskierten Hard-Treffern von `PSDetect.maskHard` und filtert mit `PSDetect.isStopword`. Das manuelle Annotieren vergibt Platzhalter mit `PSDetect.token(state, ...)`.

Zusaetzlich zur Schnittstelle aus F1 (`PROFILES`, `ENTS`, `detect`, `createState`, `anonymize`, `deanonymize`, `normalizeForDetection`) exportiert das Modul rein additiv `maskHard(text, opts)`, `isStopword(w)` und `token(state, val, pfx, col, meth)`.

## Was das Web-Tool tun kann

`lib/detect.js` ist ohne DOM und ohne Netzwerk und braucht nur `lib/placeholder.js` und `lib/coref.js`; das Web-Tool kann dieselbe Datei per `<script>` laden und dieselben Fassaden benutzen. Damit endet die Drift zwischen App und Web-Tool. Der Differenztest (`node tests/eval/diff-reference.mjs --node`) bleibt die Absicherung.

## Bewusst nicht geteilt

- Oberflaeche, Dateiimport (pdf.js, mammoth, Tesseract), KI-Modell und seine Ladelogik (`nerPipeline`, `ensureAISpans`, Chunking, Aggregation): bleiben in der HTML, weil sie Browser, Modell und DOM brauchen.
- Zustand der Sitzung (`store`, `cnt`, `aiCache`, Freigabeliste, eigene Variablen) gehoert der Oberflaeche; das Modul haelt zwischen Aufrufen keinen Zustand ausser einem Zwischenspeicher des Pass-1-Ergebnisses (Kopien werden geliefert).

## Zur Semantik von `released` und `whitelist`

- `whitelist`: Teilzeichenfolge, Gross-/Kleinschreibung egal ("Berlin" gibt auch "Berliner Allee 5" frei).
- `released`: exakte Freigabe der Pruefansicht, nur wenn Typ (`pfx`) und Wert (Gross-/Kleinschreibung beachtet) gleich sind. Beide gelten nur fuer den jeweiligen Aufruf und wirken nicht auf spaetere Aufrufe (Kontext wird nach jedem Aufruf geleert; durch Tests in `tests/unit/detect.wiring.test.mjs` abgesichert).
