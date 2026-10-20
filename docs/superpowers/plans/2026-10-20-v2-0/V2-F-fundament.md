# V2-F: Fundament (F1 bis F4)

Gemeinsam: Alles hier ist Voraussetzung dafür, dass die übrigen Pakete schnell und sicher entstehen. Reihenfolge F2 (Testläufer) vor F1, F4 gegen Ende.
Regeln und Rollen: `V2-00-INDEX.md` Abschnitte 3 und 4.

---

## F2: Unit-Testläufer, Electron 44, Härtung

**Marke:** H für Schritt 1, S für den Rest. **Aufwand:** 2-3 h. **Voraussetzung:** Branch `v2/main` mit der Serie 1.8.0 (siehe `V2-EXEC-PROMPT.md`, Schritt "Basis").

- [ ] **0. Referenz von 1.8.0 festhalten (vor jeder anderen Änderung, Grundlage des Differenztests).** Skripte `tests/eval/dump-reference.mjs` (lässt die **unveränderte** 1.8.0-App alle Harness-Fälle, 42 synthetische Dokumente, `tests/golden/sample.txt` und die Stress-Dokumente in beiden Modi verarbeiten und schreibt je Fall den SHA-256 von Text und Zuordnung nach `tests/golden/reference-v1.8.json`; KI-Spans werden mit aufgezeichnet) und `tests/eval/diff-reference.mjs` (führt dasselbe mit dem **aktuellen** Stand aus, vergleicht gegen die Referenz, Exit 1 und Liste der abweichenden Fälle bei Abweichung). Referenzdatei einchecken. Abnahme: `node tests/eval/diff-reference.mjs` auf dem unveränderten Stand meldet 0 Abweichungen (zweimal hintereinander: deterministisch).
- [ ] **1. Unit-Testläufer.** In `package.json`:
  `"test": "node --test --test-concurrency=1 tests/*.test.mjs tests/unit/*.test.mjs"`, neu `"test:unit": "node --test tests/unit/*.test.mjs"`.
  `tests/unit/.gitkeep` anlegen, erste Datei `tests/unit/smoke.test.mjs` (`import test from 'node:test'; import assert from 'node:assert/strict'; test('Testläufer läuft', () => assert.equal(1 + 1, 2));`).
  `ci.yml`: vor den Electron-Tests einen Schritt `npm run test:unit` (schnelles Scheitern). Abnahme: `npm run test:unit` grün in unter 5 Sekunden.
- [ ] **2. Electron 44 und Härtung:** Vorgängerplan `07-electron-und-haertung.md`, Schritte 1 bis 7, unverändert ausführen (Fuses, Absenderprüfung der IPC-Handler, Ursprungsprüfung für `postMessage`, Berechtigungen verweigern, `npm audit`, Actions-Versionen).
- [ ] **3. Kern-Lader für Tests.** `tests/helpers.mjs` ergänzen um `loadLib(name)`: lädt `app/lib/<name>.js` in Node per `createRequire`. Test: gibt für ein leeres Modul `{}` zurück.

**Abnahme:** `npm test` grün (alle Dateien); `npx @electron/fuses read` zeigt die gesetzten Schalter; Unit-Läufer in der CI als eigener Schritt.

---

## F1: Erkennungskern auslagern

**Marke:** S (Urteil, großer Eingriff). **Aufwand:** 4-6 h, Machbarkeitsprüfung 1 h. **Gate:** keines für die Arbeit; veröffentlicht wird mit dem Release.

**Warum:** Der Erkennungskern (Regeln `ENTS`, Prüfziffern, Überlappungsauflösung, Nachbearbeitung, Token-Vergabe) steckt in `app/privacy-shield.html` zwischen Oberflächencode
(Skriptbereich etwa Zeile 2050 bis 4810, 63 `document.`-Zugriffe, globale Zustandsvariablen `store`, `cnt`, `storeIdx`, `lastP1`, `aiCache`). Er ist deshalb nur über die echte App testbar
(3 Minuten je Lauf). Als Modul wäre er in Sekunden testbar und könnte vom Web-Tool mitgenutzt werden (Ende der Drift, WP 06 des Vorgängerplans).

### Schritt 0: Machbarkeitsprüfung (Pflicht, Entscheidung Go/Nein)

- [ ] Liste erstellen (`docs/superpowers/plans/2026-10-20-v2-0/artifacts/f1-abhaengigkeiten.md`): Für jede Funktion des Kerns (`hardValue`, `isValidIBAN*`, `luhnOk`, `okName`, `isCapsPersonName`, `collectEntities`, `computePass1`, `resolveSpanOverlaps`, `postProcessSpans`, `normalizeForDetection`, `anonCore`, `tok`, `deanon`, `smartSuffix`, `isWhitelisted`) die gelesenen **globalen Variablen**, **DOM-Zugriffe** und **aufgerufenen Hilfsfunktionen**. Werkzeug: `grep -n` im jeweiligen Funktionskörper.
- [ ] **Go**, wenn (a) der Kern ohne DOM auskommt oder höchstens 25 Stellen parametrisiert werden müssen (Texte und Profil als Argumente statt `document.getElementById(...)`), und (b) der Zustand sich in ein Objekt `{store, cnt, storeIdx}` bündeln lässt. **Nein**, sonst. Bei **Nein**: F1 entfällt; neue Logik (A-D) entsteht trotzdem als Module, die den Kern nur über eine dünne Fassade (`window.PSCoreAdapter`, in der HTML definiert) aufrufen; Eintrag in `V2-STATUS.md` mit Begründung.

### Zielschnittstelle (bei Go)

```js
// app/lib/detect.js  (UMD: window.PSDetect  /  module.exports)
PSDetect.PROFILES                                  // Profildefinitionen (Daten)
PSDetect.detect(text, { profile, whitelist, aiSpans }) -> { spans: [{ start, end, pfx, value, prio }] }
PSDetect.createState() -> { store: {}, cnt: {}, storeIdx: Map }          // Platzhalter-Zustand
PSDetect.anonymize(text, { profile, whitelist, aiSpans, state }) -> { text, state, tokens }
PSDetect.deanonymize(text, state) -> text
PSDetect.normalizeForDetection(text) -> text                              // gleiche Länge
```

Der KI-Anteil bleibt außerhalb: Die Oberfläche beschafft `aiSpans` (Modell im Worker) und reicht sie hinein. Das Modul kennt kein `document`, kein `window`, kein `localStorage`.

### Schritte

- [ ] **1. Test-Autor: Differenztest (rot).** `tests/unit/detect.differential.test.mjs`: Die Ausgabe der **alten** Pfadfunktion (aus `tests/golden/`, `tests/eval/out/result.json`) ist die Wahrheit. Testet `PSDetect.anonymize` im Wortlistenmodus für (a) alle 170 Harness-Fälle, (b) die 42 synthetischen Dokumente (`generate.mjs`, Seed fest), (c) `tests/golden/sample.txt`, (d) Stress-Dokumente (`tests/eval/stress.mjs`). Erwartung: Text und Zuordnung **bitgleich** zur Referenz. Die Referenzdaten (`tests/golden/reference-v1.8.json`, Skripte `dump-reference.mjs`/`diff-reference.mjs`) stammen aus F2 Schritt 0 und werden hier nur verwendet.
- [ ] **2. Implementierer (Sonnet niedrig bis mittel):** Kern in `app/lib/detect.js` verschieben **ohne Umschreiben der Regeln** (Funktionskörper unverändert, nur Parametrisierung). In der HTML `<script src="lib/detect.js"></script>` vor dem Hauptskript, Aufrufstellen auf `PSDetect.*` umstellen, Zustand `state` als Objekt führen. Nach **jedem** verschobenen Funktionsblock Differenztest laufen lassen (Sekunden), nicht erst am Ende.
- [ ] **3. KI-Anteil:** `aiSpans` werden von der Oberfläche eingespeist (`ensureAISpans` bleibt in der HTML). Differenztest im KI-Modus mit **aufgezeichneten** Spans (aus `result.json` des Harness, einmalig mit der heutigen App erzeugt und eingecheckt), damit der Test ohne Modell läuft.
- [ ] **4. Gesamtprüfung:** `npm test` komplett (Oberflächentests, Golden, Harness `npm run eval` in beiden Modi: Zahlen identisch zur Basis `tests/eval/baseline.json`), Leistungstest (`perf.test.mjs`) im Budget, Paketprobe (`npm run build:linux` und `PS_PACKAGED_BIN=... npm test`).
- [ ] **5. Web-Tool vorbereiten (kein Deploy):** Notiz in `docs/` (Desktop-Repo): Das Web-Tool kann `lib/detect.js` künftig per `<script>` laden; Umsetzung nach 2.0 (D18).

**Erlaubte Dateien:** `app/lib/detect.js` (neu), `app/privacy-shield.html`, `tests/unit/detect*.test.mjs`, `tests/eval/dump-reference.mjs`, `tests/golden/reference-v1.8.json`, `package.json` (nur Skriptzeile).
**Abnahme:** Differenztest grün (bitgleich); `npm run eval` identisch zur Basis; alle Tests grün; `app/privacy-shield.html` ist um mindestens 2.000 Zeilen kürzer; `detect.js` wird in Node ohne Fehler geladen (`node -e "require('./app/lib/detect.js')"`).

---

## F3: Bibliotheken aktualisieren

Vorgängerplan `08-bibliotheken.md`, unverändert (eine Bibliothek je Commit, Messung vorher/nachher, Rückfall bei Verschlechterung). Marke S. Nach F1 ausführen, damit Differenztests schützen.

---

## F4: Stabilität: Eigenschafts-, Fuzz- und Installationstests

**Marke:** S. **Aufwand:** 4 h. **Voraussetzung:** F1 (Eigenschaftstests laufen dann als Unit-Tests) oder bei Nein: gegen die App.

- [ ] **1. Eigenschaftstests (`tests/unit/properties.test.mjs`)**, je 200 zufällige Dokumente aus `generate.mjs` mit wechselnden Seeds:
  * **Rundlauf:** `deanonymize(anonymize(x).text, state) === x` für alle Profile.
  * **Idempotenz:** `anonymize(anonymize(x).text).text === anonymize(x).text` (bereits ersetzte Platzhalter bleiben unberührt).
  * **Tokenstabilität:** Derselbe Wert erhält im selben Dokument immer denselben Platzhalter; verschiedene Werte nie denselben.
  * **Keine Leckverschlechterung:** Eine Whitelist-Erweiterung macht nie einen **anderen** Wert sichtbar.
  * Fehlschlag: Seed und Eingabe im Testbericht ausgeben (Reproduktion).
- [ ] **2. Fuzz-Tests (`tests/unit/fuzz.test.mjs`)**: 1.000 zufällige Zeichenfolgen (Unicode-Bereiche, Steuerzeichen, Surrogatpaare, sehr lange Zeilen, 100.000 Zeichen) werfen **keine Ausnahme** und enden in unter 2 Sekunden je 100.000 Zeichen; Ausgabe enthält keine ungültigen Surrogate. Für neue Formate (B2): Fuzz auf Parser-Eingaben (kaputte ZIPs, endlose Verschachtelung) mit Zeit- und Speichergrenze.
- [ ] **3. Windows-Installationstest in der CI** (`build.yml`, Windows-Job, nach dem Bau): `PrivacyShield-Setup.exe /S /D=C:\PS-Test` still installieren; prüfen, dass `C:\PS-Test\resources\app.asar.unpacked\app\models\Xenova\distilbert-base-multilingual-cased-ner-hrl\onnx\model_quantized.onnx` genau 135.359.829 Bytes hat und `app\vendor` vollständig ist (Liste aus `vendor-manifest.json`); danach die **installierte** Datei starten (`PS_PACKAGED_BIN=C:\PS-Test\PrivacyShield.exe`) und die Tests `ai-fehler`, `offline-ai` laufen lassen. Das prüft genau das Szenario "Modell fehlt nach der Installation".
- [ ] **4. Leistungsbudgets festschreiben** in `perf.test.mjs`: 100.000 Zeichen unter 2 s (Erkennung ohne KI), Speicher nach Entladen unter 1 GB; bei Überschreitung Test rot.

**Abnahme:** Alle neuen Tests grün in der CI auf Ubuntu und Windows; Installationstest läuft im Windows-Job und scheitert absichtlich (Probelauf mit gelöschter Modelldatei) mit klarer Meldung.
