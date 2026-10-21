# V2-B: Dokumente (B1, B2, B3)

Regeln und Rollen: `V2-00-INDEX.md`. Neue Logik als Module mit Unit-Tests (Architekturregel 1). Pakete: **B1.fix** (Sofortfix), **B1.m** (Modul), **B1.w1** (Liste und Lauf), **B1.w2** (ZIP, Bericht, Zuordnung), **B2.m1** und **B2.m2** (Module), **B2.w** (Verdrahtung).

## Befunde aus P0 (geprüft am Code von 1.8.0)

* **Mehrfachauswahl:** Das Auswahlfeld (`<input id="FI" ... multiple>`, `accept=".txt,.pdf,.docx,.doc,.csv,.md,.json,.rtf"`) **verarbeitet bereits alle gewählten Dateien** nacheinander (`change`-Handler in `boot()`: `loadF`, `anon()`, Sammeln), und bietet bei mehr als einer erfolgreichen Datei ein ZIP `anonymisiert.zip` mit `<Originalname>_anonymisiert.txt` an. Probleme: (1) Originalnamen stehen in den Dateinamen; (2) `anonCore` setzt `store = {}; cnt = {}` je Datei zurück, die Zuordnung steht danach **nur für die zuletzt verarbeitete Datei** im Speicher (die Ergebnisse der übrigen sind nicht mehr rückübersetzbar, ohne Hinweis); (3) gleiche Namen erhalten in verschiedenen Dateien verschiedene Platzhalter; (4) die **Drop-Zone** (`#DZ`, `drop`-Handler) liest nur `e.dataTransfer.files[0]`, der Rest wird ohne Meldung verworfen. Die Aussage des ersten Entwurfs "verarbeitet nur `files[0]`" gilt also nur für die Drop-Zone.
* Größenlimit je Datei 30 MB (`loadF`), leere Dateien werden erklärt, `.doc` wird an mammoth gegeben und scheitert dort.
* **Kodierung:** Textdateien werden mit `file.text()` gelesen (nur UTF-8). Eine Latin-1/Windows-1252-Datei mit "Müller" liefert U+FFFD statt "ü"; die Namenserkennung verfehlt dann den Wert (Leckursache). RTF wird als Rohtext geladen (`{\rtf1 ... M\'fcller`), Umlaute stehen als `\'fc` im Text und werden nicht erkannt.
* **DOCX:** mammoth `extractRawText` liefert Absätze und Tabellen, **nicht** Kopfzeilen, Fußzeilen und Fußnoten (gemessen mit einem Beispiel-DOCX: "KOPFZEILE ...", "FUSSZEILE ...", "FUSSNOTE ..." fehlen im Text). Die Auswertung dieser Texte fehlt also; ein Leck im Sinn von "Wert bleibt im Ergebnis" entsteht nicht, aber das Ergebnis ist unvollständig.
* **JSZip** (3.10.1) lädt in Node per `require` (11 ms), `loadAsync` einer ZIP-Datei mit 65.000 Einträgen dauert 0,7 s (+114 MB), mit 2.001 Einträgen ist Erzeugen plus Laden 238 ms. Die Größenfelder jedes Eintrags stehen nach `loadAsync` ohne Entpacken in `zip.files[name]._data.uncompressedSize` und `._data.compressedSize` (nicht dokumentierte Interna; ein Test sichert sie ab). Eine in der Kopfzeile gefälschte Größe lässt `async()` später mit `Bug : uncompressed data size mismatch` scheitern.
* **Der Fixture-Trick für ZIP-Bomben:** Ein echtes Archiv mit 210 MB Nullbytes zu erzeugen dauert 4 s (500 MB: 9 s). Stattdessen ein kleines ZIP mit JSZip erzeugen und im **Zentralverzeichnis** (Signatur `0x02014b50`, Offset +20 = komprimierte, +24 = unkomprimierte Größe, je `uint32` little-endian) die Größen überschreiben; `JSZip.loadAsync` liest das in unter 10 ms, `guard` sieht die gefälschten Größen.

---

## B1.fix: Sofortfix Mehrfachauswahl

**Marke:** H. **Aufwand:** 1 h. **Voraussetzung:** F2, A4.m (Dateinamen). **Erlaubte Dateien:** `app/privacy-shield.html`, `tests/multifile.test.mjs`.

- [ ] Gemeinsame Funktion `handleFiles(files)` (Array von `File`) für `change` auf `#FI` **und** `drop` auf `#DZ`: genau eine Datei wie bisher (`loadF`, keine Zip-Ausgabe); mehrere Dateien nacheinander verarbeiten wie bisher, ZIP-Namen `PSLib.hygiene.safeName(name, i, {})` (also `anonymisiert_001.txt`, `anonymisiert_002.txt`, ...) statt `<Name>_anonymisiert.txt` (Skript `lib/hygiene.js` in der HTML einbinden), dazu **vor** dem Lauf ein Hinweis (`toast(..., 'e')`): "Mehrere Dateien werden einzeln verarbeitet. Eine Zuordnung zum Zurückübersetzen bleibt nur für die zuletzt verarbeitete Datei erhalten." Das Ersetzen dieses Weges durch Projekte erfolgt in B1.w1/B1.w2.
- **Test (`tests/multifile.test.mjs`, E2E):** (1) Zwei Textdateien `Müller_Hans.txt` ("Herr Hans Müller, max@firma.de") und `Weber_Anna.txt` ("Frau Anna Weber") per `setFiles` auf `#FI`: nach dem Lauf erscheint **ein** Download `anonymisiert.zip` (Download-Fänger); die Einträge heißen `anonymisiert_001.txt` und `anonymisiert_002.txt`; weder ein Eintragsname noch ein Inhalt enthält "Müller", "Weber", "Hans", "Anna" oder "max@firma.de"; der Hinweis erschien. (2) Dasselbe über die Drop-Zone (im Frame `DataTransfer` mit zwei `File` bauen und ein `drop`-Ereignis auf `#DZ` auslösen): derselbe Download, **beide** Dateien verarbeitet. (3) Eine Datei: kein Download, `#IT` enthält den Text, kein Hinweis.
**Abnahme:** E2E-Test grün; `xvfb-run -a npm test` grün.

---

## B1.m: Projekt mit gemeinsamen Platzhaltern (Modul)

**Marke:** H. **Aufwand:** 2 h. **Voraussetzung:** F2.

**Datei:** `app/lib/project.js` (`PSLib.project`), Test `tests/unit/project.test.mjs`. Der Erkennungskern wird **hineingereicht**; das Modul kennt weder `PSDetect` noch das DOM.

```js
PSLib.project.LIMITS = { docs: 200, totalChars: 209715200 }       // 200 Dokumente, 200 MiB Text (UTF-16-Einheiten, text.length)
const p = PSLib.project.create({ shared: true, limits })           // shared: gleicher Wert = gleicher Platzhalter über alle Dokumente; limits überschreibt LIMITS (für Tests)
PSLib.project.add(p, { name, text }) -> id                         // id: ganze Zahl ab 1, aufsteigend, nie wiederverwendet
PSLib.project.remove(p, id) -> boolean
PSLib.project.index(p) -> [{ id, index, name, chars, status }]     // index = Position 1-basiert in Einfügereihenfolge; status 'wartet'|'laeuft'|'fertig'|'fehler'
await PSLib.project.run(p, { anonymize, profile, onProgress, signal }) -> { results, state, aborted }
PSLib.project.zipPlan(results, { report, map, nameFor }) -> [{ path, kind, id? }]
class PSProjectError extends Error { code }   // PSLib.project.PSProjectError; code 'LIMIT' | 'INVALID'
```

Regeln:
* `add` wirft `PSProjectError('LIMIT')`, wenn danach mehr als `limits.docs` Dokumente vorhanden wären oder die Summe aller `text.length` größer als `limits.totalChars` wäre (das Dokument wird dann **nicht** aufgenommen); `PSProjectError('INVALID')`, wenn `text` kein String ist oder `name` kein String (leerer Text und leerer Name sind erlaubt).
* `run`: Dokumente in Einfügereihenfolge; `index` wird bei `run` vergeben (1-basiert, ohne entfernte). Alle Status werden zu Beginn auf `wartet` gesetzt (erneutes `run` verarbeitet alles neu mit frischem Zustand). `anonymize(text, { state, profile })` ist ein Aufrufer-Parameter, synchron oder asynchron, und liefert `{ text, counts }` (`counts`: Objekt Kategorie zu Anzahl). `shared: true`: ein Zustandsobjekt `{ store: {}, cnt: {} }` wird angelegt und **in place** an jeden Aufruf übergeben, `run` gibt es als `state` zurück; `shared: false`: je Dokument ein frisches Zustandsobjekt (steht in `results[i].state`), `state` der Rückgabe ist `null`.
* Vor jedem Dokument wird `signal && signal.aborted` geprüft: dann Abbruch, `aborted: true`, die übrigen Dokumente bleiben `wartet`. Nach jedem fertig bearbeiteten Dokument ruft `run` `onProgress({ done, total, id, index, status })` auf (`done` = Zahl bisher bearbeiteter Dokumente einschließlich fehlerhafter; `total` = Zahl der Dokumente im Projekt).
* Wirft `anonymize` oder lehnt ab, wird das Dokument `status: 'fehler'` mit `error: { kind: <err.name oder 'Error'> }` (**nie** die Fehlermeldung, nie Text), die Folgedokumente laufen weiter.
* `results`: Liste nur der bearbeiteten Dokumente in Reihenfolge: `{ id, index, text, counts, status, state?, error? }` (bei Fehler `text: null`, `counts: null`).
* `zipPlan(results, opts)`: nur Ergebnisse mit `status === 'fertig'`; Eintrag je Ergebnis `{ path: opts.nameFor ? opts.nameFor(result) : 'anonymisiert_' + String(result.index).padStart(3, '0') + '.txt', kind: 'result', id }`, danach (wenn `opts.report`) `{ path: 'bericht.txt', kind: 'report-text' }` und `{ path: 'bericht.json', kind: 'report-json' }`, danach (wenn `opts.map`) `{ path: 'zuordnung.psmap', kind: 'map' }`. Doppelte Pfade werden mit `_2`, `_3` vor der Endung eindeutig gemacht. Die Pfade enthalten **keinen** Originalnamen, solange `nameFor` fehlt.

**Tests (rot zuerst; Test-Stub `anonymize`: ersetzt jedes Vorkommen der Wörter `Müller` und `Weber` durch `{{NAME_n}}` (n = laufende Nummer in `state.cnt.NAME`, gleicher Wert = gleiches Token, Eintrag in `state.store[token] = { v, t: 'NAME' }`) und liefert `counts: { NAME: <Anzahl> }`; der Stub zum Zurückübersetzen ersetzt Token anhand `state.store`):**
* Zwei Dokumente mit demselben Namen: gleicher Platzhalter bei `shared: true`, verschiedene bei `shared: false` (`state` ist dann `null`, `results[i].state` vorhanden).
* Reihenfolge und Nummerierung stabil; entferntes Dokument verschiebt die `index`-Werte der folgenden; `id`s werden nie wiederverwendet.
* Fehlerdokument (Stub wirft `new TypeError('Müller')` für ein Dokument): `status: 'fehler'`, `error.kind === 'TypeError'`, **die Meldung "Müller" steht nirgends im Ergebnis** (`JSON.stringify(results)` enthält sie nicht), Folgedokumente laufen.
* Abbruch: `AbortController`, `abort()` im `onProgress` nach Dokument 2 von 5: `results.length === 2`, `index(p)` zeigt 1 und 2 `fertig`, 3 bis 5 `wartet`, `aborted === true`.
* Grenzen: mit `limits: { docs: 3, totalChars: 1000 }` wirft das 4. Dokument `LIMIT`, ein Dokument, das die Summe über 1000 brächte, wirft `LIMIT` und wird nicht aufgenommen; `LIMITS` hat die Standardwerte (200, 209715200).
* Rundlauf über das Projekt: Alle Ergebnisse mit dem gemeinsamen Zustand zurückübersetzt sind gleich den Originalen.
* `zipPlan`: bei drei fertigen Dokumenten, `report: true`, `map: true`: genau `anonymisiert_001.txt`, `anonymisiert_002.txt`, `anonymisiert_003.txt`, `bericht.txt`, `bericht.json`, `zuordnung.psmap` in dieser Reihenfolge; kein Originalname; `nameFor` wird benutzt; doppelte Namen werden eindeutig; ein Fehlerdokument erhält keinen Eintrag.
**Abnahme:** Unit-Tests grün; Modul rein.

---

## B1.w1: Dokumentenliste und Lauf (Oberfläche)

**Marke:** S. **Aufwand:** 3 h. **Voraussetzung:** B1.m, B1.fix, A1.w, A2.w, A3.w, A4.w. **Erlaubte Dateien:** `app/privacy-shield.html`, `tests/project-list.test.mjs`. Skill `frontend-design`, Prüfer mit Screenshots (1280 und 900 Pixel Breite).

* `handleFiles(files)` (aus B1.fix): **eine** Datei wie bisher; **mehrere** Dateien füllen die Projektliste (`#PRJPANEL`), nichts wird still verworfen. Format-Prüfung je Datei mit Meldung: unbekannte Endung "Dateityp nicht unterstützt: <Endung>" (Liste der Endungen der Auswahl), `.doc`: "Dateien im alten .doc-Format werden nicht unterstützt. Bitte in Word als .docx speichern."; Dateien über 30 MB und leere Dateien wie bisher; Grenzen aus `PSLib.project.LIMITS` mit klarer Meldung.
* Liste (links oder oben, `#PRJPANEL`): je Dokument ein Knopf `button.prj-item[data-id]` mit Nummer, Größe, Status als **Text und Farbe und Symbol** (kleines inline-SVG; nicht nur Farbe) und Entfernen-Knopf (`button.prj-del`). Dateinamen werden in der Liste angezeigt (lokal), kommen aber in keine Ausgabedatei (siehe B1.w2).
* "Alle anonymisieren" (`#PRJRUN`) mit Fortschritt `#PRJPROG` ("3 von 12", `role="progressbar"` mit `aria-valuenow/-max`) und "Abbrechen" (`#PRJCANCEL`, setzt das `AbortSignal`). Je Dokument Gegenprüfung (A1) und Zusammenfassung `#PRJSUM` "12 Dokumente, 2 mit möglichen Resten". Der Lauf benutzt `PSLib.project.run` mit `anonymize = (text, o) => PSDetect.anonymize(text, { ...aktuelle Optionen, state: o.state })` (KI-Spans je Dokument über den bestehenden Weg `ensureAISpans`, nacheinander im vorhandenen Worker; der Leerlaufzeitgeber startet nach jedem Dokument neu, das ist das bestehende Verhalten von `anon()`).
* Klick auf ein Dokument zeigt Original in `#IT` und Ergebnis in `#AT` (bestehende Ansichten); `store` ist die gemeinsame Zuordnung des Projekts.
* **E2E-Tests (`tests/project-list.test.mjs`):** drei Dateien (TXT, DOCX mit in Node per JSZip gebautem Minimal-DOCX, PDF mit `makePdf`) in einem Lauf, jedes enthält "Herr Thomas Müller": nach "Alle anonymisieren" haben alle drei Status `fertig`, und **derselbe Platzhalter** steht in den drei Ergebnissen; fünf Textdateien, Abbruch nach dem ersten Dokument: 1 fertig, übrige wartet; `.exe` wird abgelehnt mit Meldung, `.doc` mit der `.doc`-Meldung; Entfernen eines Dokuments; Einzeldatei läuft unverändert (Ein-Dokument-Ablauf von 1.8.0).
**Abnahme:** Unit- und E2E-Tests grün; Screenshots (1280 und 900 Pixel) vom Prüfer gesichtet.

## B1.w2: ZIP, Bericht, Zuordnung

**Marke:** S. **Aufwand:** 3 h. **Voraussetzung:** B1.w1. **Erlaubte Dateien:** `app/privacy-shield.html`, `tests/project.test.mjs`.
* "Alles als ZIP speichern" (`#PRJZIP`, JSZip aus `app/vendor/jszip`): Pfade aus `PSLib.project.zipPlan(results, { report: true, map: <Kästchen "Zuordnung einschließen", Standard an> })` mit `nameFor` = `PSLib.hygiene.safeName(name, index, { keepName: <Schalter "Originalnamen verwenden", Standard aus, Hinweis "Dateinamen enthalten oft Namen"> })`; `bericht.txt`/`bericht.json` aus `PSLib.report` (Zähler je Dokument aus `results[i].counts`, `leak` aus A1, `resultSha256` je Ergebnistext); `zuordnung.psmap` aus `PSLib.psmap.encrypt` (Passwortdialog aus A3; Nutzlast `docs` = `[{ index, name, chars, sha256 }]`). Ohne Passwort keine Zuordnungsdatei (Dialog "Ohne Zuordnung kann nicht zurückübersetzt werden" mit Auswahl). ZIP-Name `anonymisiert.zip`.
* **E2E-Tests (`tests/project.test.mjs`):** 3 Dateien (TXT, DOCX, PDF) in einem Lauf; gleicher Name in allen drei ergibt denselben Platzhalter; das ZIP enthält genau die Einträge aus `zipPlan`; kein Eintrag (Name oder Inhalt) enthält Klartextwerte (Fragment-Suche über alle Ergebnisdateien, Fragmente ab 5 Zeichen); der Bericht enthält die Fragmente nicht; Rückübersetzung: `store` leeren, `.psmap` aus dem ZIP über `setFiles` laden (Passwort per Dialog), jedes Ergebnis aus dem ZIP mit `deanon()` zurückübersetzt ist **exakt** der Originaltext (Rundlauf).
**Abnahme:** Unit- und E2E-Tests grün; Leistung: 50 Dokumente à 20.000 Zeichen ohne KI in unter 30 s (Erkennung allein etwa 4 bis 5 s, gemessen 1,4 s für 298.000 Zeichen); Speicher nach dem Lauf und Entladen unter 1 GB; Screenshots (1280 und 900 Pixel Breite) vom Prüfer gesichtet.

---

## B2: Weitere Formate

**Marke:** H (Spezifikation vollständig, Tests mit Fixtures). **Aufwand:** 5 h in drei Paketen: **B2.m1** (Text- und Prüffunktionen), **B2.m2** (Office-Formate), **B2.w** (Verdrahtung). **Voraussetzung:** B2.m1 F2; B2.m2 B2.m1; B2.w B2.m2 und B1.w1.

**Gemeinsame Regeln (Sicherheit):** höchstens 2.000 Einträge, höchstens 200 MiB entpackt insgesamt, Verhältnis entpackt zu gepackt höchstens 100 (je Eintrag, nur bei Einträgen über 1 MiB); **keine** XML-Parser mit Entitätserweiterung: Textauszug per einfachem Zeichenstrom (Tags überspringen; nur die fünf vordefinierten Entitäten `&amp; &lt; &gt; &quot; &apos;` und numerische Zeichenverweise `&#252;`/`&#xFC;` dekodieren; `<!DOCTYPE ...>` samt innerer Deklarationen und `<!ENTITY ...>` ignorieren; unbekannte Entitäten wie `&a;` bleiben **unverändert** stehen); keine Ausführung von Makros oder Skripten; Anhänge von E-Mails werden **nicht** geöffnet, nur gezählt. Die Module sind rein (Zeichenketten und Byte-Felder), JSZip wird vom Aufrufer hineingereicht (Tests: `loadVendor('jszip')`, Fixtures werden im Test mit JSZip erzeugt, keine Binärdateien einchecken).

### B2.m1: `app/lib/formats.js` (`PSLib.formats`), Test `tests/unit/formats.test.mjs`

```js
PSLib.formats.detect(filename, firstBytes) -> 'txt'|'pdf'|'docx'|'xlsx'|'pptx'|'odt'|'ods'|'odp'|'eml'|'html'|'csv'|'md'|'json'|'rtf'|'doc'|'xls'|'ppt'|'unknown'
PSLib.formats.guard(zip) -> void | throws PSFormatError('TOO_MANY'|'TOO_BIG'|'RATIO'|'CORRUPT')
PSLib.formats.decodeText(bytes) -> { text, encoding }       // Uint8Array
PSLib.formats.extractHtml(htmlString) -> { text }
PSLib.formats.extractEml(bytes) -> { text, hadAttachments, attachmentCount }   // Uint8Array
PSLib.formats.extractRtf(rtfString) -> { text }
class PSFormatError extends Error { code }    // PSLib.formats.PSFormatError
```

* **`detect`** (`firstBytes`: `Uint8Array` der ersten 512 Bytes oder weniger; Endung = Teil nach dem letzten Punkt, klein): ZIP-Formate `docx xlsx pptx odt ods odp` verlangen den Anfang `PK\x03\x04` (oder `PK\x05\x06`), sonst `'unknown'` (Endung `.docx` mit falschem Inhalt ist `'unknown'`); `pdf` verlangt `%PDF` am Anfang; `rtf` verlangt `{\rtf`; `doc`, `xls`, `ppt` verlangen `D0 CF 11 E0 A1 B1 1A E1` (alte Binärformate; ohne diese Bytes `'unknown'`); `eml`, `html`, `htm` (Ergebnis `'html'`), `txt`, `csv`, `md`, `json`: kein NUL-Byte in den ersten 512 Bytes, sonst `'unknown'`; andere Endungen: `'unknown'`.
* **`guard(zip)`** (Reihenfolge der Prüfungen): Zahl aller Einträge (`Object.keys(zip.files).length`, Verzeichnisse eingeschlossen) über 2.000: `TOO_MANY`; Summe `_data.uncompressedSize` aller Dateien über 209.715.200: `TOO_BIG`; ein Eintrag mit `uncompressedSize > 1048576` und `uncompressedSize / compressedSize > 100` (bei `compressedSize` 0 gilt das Verhältnis als unendlich): `RATIO`; fehlt `_data` oder eine Größe bei einer Datei: `CORRUPT` (Bibliothek verändert). **Ohne zu entpacken**, in unter 200 ms. Tests mit den Fixtures aus den Befunden (Zentralverzeichnis überschreiben): 2.000 Einträge sind erlaubt, 2.001 werfen `TOO_MANY`; ein Eintrag mit gefälschten 300 MiB unkomprimiert und 150 MiB komprimiert wirft `TOO_BIG`; ein Eintrag mit gefälschten 50 MiB unkomprimiert und 100 KiB komprimiert wirft `RATIO`; 900 KiB mit Verhältnis 5000 ist erlaubt; ein normales Minimal-DOCX besteht.
* **`decodeText(bytes)`:** BOM `EF BB BF` (Ergebnis ohne BOM, `encoding: 'utf-8'`), `FF FE` (`utf-16le`), `FE FF` (`utf-16be`); sonst striktes UTF-8 (`new TextDecoder('utf-8', { fatal: true })`), bei Fehler `windows-1252` (`new TextDecoder('windows-1252')`). Tests: Bytes von "Müller" in Latin-1 (`4D FC 6C 6C 65 72`) ergeben "Müller" mit `encoding: 'windows-1252'`; dieselben Zeichen in UTF-8 ergeben `'utf-8'`; BOM; zufällige Bytes werfen nie.
* **`extractHtml`:** `<script>...</script>`, `<style>...</style>`, `<noscript>`, Kommentare verschwinden **samt Inhalt**; Block-Tags (`p div li tr h1..h6 ul ol table section article header footer blockquote pre`) ergeben einen Zeilenumbruch (aufeinanderfolgende Block-Grenzen ohne Text dazwischen zählen einmal), `<br>` jeweils einen Zeilenumbruch, `td`/`th` ein Tabulatorzeichen; Entitäten: die fünf vordefinierten, `&nbsp;` (zu Leerzeichen), numerisch, und die Tabelle `&auml; &ouml; &uuml; &Auml; &Ouml; &Uuml; &szlig; &euro; &copy; &ndash; &mdash; &hellip; &bdquo; &ldquo; &rdquo; &laquo; &raquo;`; Leerzeichenfolgen innerhalb einer Zeile zu einem Leerzeichen, mehr als zwei Zeilenumbrüche hintereinander zu zwei, Ergebnis getrimmt. Beispiel: `<p>Hallo&nbsp;&amp; <b>Welt</b></p><script>alert(1)</script><p>Zeile&#252;</p>` ergibt `"Hallo & Welt\nZeileü"`. DOCTYPE mit ENTITY und `&a;` im Text: `&a;` bleibt, nichts wird erweitert.
* **`extractEml(bytes)`:** Kopf entfalten (Fortsetzungszeilen mit Leerraum), Kopfzeilen `From To Cc Subject Date` in der Ausgabe als `Von: `, `An: `, `Cc: `, `Betreff: `, `Datum: ` (nur vorhandene), RFC-2047-Wörter (`=?UTF-8?B?...?=`, `=?ISO-8859-1?Q?...?=`) dekodiert; danach eine Leerzeile und der Körper. Körperwahl: `text/plain` bevorzugt (bei `multipart/alternative`), sonst `text/html` über `extractHtml`; verschachtelte Teile bis Tiefe 5; Codierungen `quoted-printable` (`=C3=BC` zu `ü`, weiche Umbrüche `=\n`), `base64`, `7bit`, `8bit`; Zeichensatz `utf-8`, `iso-8859-1`/`latin1`, `windows-1252`, sonst utf-8. Anhänge (Teile mit `Content-Disposition: attachment` oder `filename=`) werden **nicht** gelesen, nur gezählt (`attachmentCount`, `hadAttachments`). Beispiel einfach: Kopf `From: Max <max@firma.de>`, `Subject: =?UTF-8?B?QsO8cm8=?=`, Körper "Hallo" ergibt `"Von: Max <max@firma.de>\nBetreff: Büro\n\nHallo"`.
* **`extractRtf(string)`:** Steuerwörter entfernen; `\par`, `\line` zu `\n`, `\tab` zu `\t`, `\~` zu Leerzeichen, `\'hh` zu dem Zeichen der Codepage (Standard 1252, `\ansicpgNNNN` beachten für 1252/1250/1251/1253/1254, sonst 1252), `\uN` (vorzeichenbehaftet, 16 Bit) mit Überspringen von `\ucN` (Standard 1) Ersatzzeichen; Gruppen `fonttbl colortbl stylesheet info pict object` und `{\*...}` überspringen; Text in `header`, `footer`, `footnote` bleibt. Tests: `{\rtf1\ansi\ansicpg1252{\fonttbl{\f0 Arial;}} M\'fcller wohnt in K\u246?ln.\par Zweite Zeile}` ergibt genau `"Müller wohnt in Köln.\nZweite Zeile"` (`\u246?` ist "ö" mit Ersatzzeichen `?`, das übersprungen wird; die Schriftentabelle "Arial" erscheint nicht im Text).
* **Fuzz (F4.a):** `extract*` mit kaputten Eingaben: nur `PSFormatError` oder Ergebnis, nie andere Ausnahmen.

### B2.m2: `app/lib/officefmt.js` (`PSLib.officefmt`), Test `tests/unit/officefmt.test.mjs`

Alle Funktionen rufen zuerst `PSLib.formats.guard(zip)`; `PSFormatError` wird durchgereicht. Das Modul benutzt `PSLib.formats` (im Browser Skriptreihenfolge `formats.js` vor `officefmt.js`).

```js
PSLib.officefmt.extractXlsx(zip) -> Promise<{ text, sheets }>
PSLib.officefmt.extractOdf(zip) -> Promise<{ text }>
PSLib.officefmt.extractPptx(zip) -> Promise<{ text, slides }>
PSLib.officefmt.extractDocxExtras(zip) -> Promise<{ text, parts }>
```

* **`extractXlsx`:** Blätter `xl/worksheets/sheet<N>.xml` nach `N` numerisch sortiert; Überschrift `== Blatt <k> ==` mit `k` = laufende Nummer ab 1 (der Blattname geht nicht in die Überschrift); Zellen nach Spaltenbuchstaben aus `r="C3"` platziert (fehlende Spalten leer, nachlaufende Leerspalten entfallen), Zellen mit Tabulator, Zeilen mit `\n`; Zelltypen: `t="s"` Verweis auf `xl/sharedStrings.xml` (`<si><t>`, auch `<r><t>` zusammengesetzt), `t="inlineStr"` (`<is><t>`), `t="str"` (`<v>`), `t="b"` (`TRUE`/`FALSE`), Zahlen unverändert. Blöcke der Blätter durch eine Leerzeile getrennt, kein Zeilenumbruch am Ende. **Beispiel (genau):** gemeinsame Zeichenketten `["Name","Betrag","Müller"]`; Zeile 1: A1 `s0`, B1 `s1`; Zeile 2: A2 `s2`, B2 Zahl `12.5`; Zeile 3: A3 inline "Weber", C3 Zahl `3` ergibt `"== Blatt 1 ==\nName\tBetrag\nMüller\t12.5\nWeber\t\t3"`, `sheets: 1`.
* **`extractOdf`:** `content.xml`; `text:p` und `text:h` je eine Zeile, `text:span` inline, `text:s` (Attribut `text:c`, Standard 1) als Leerzeichen, `text:tab` als Tabulator, `text:line-break` als `\n`; Tabellen: `table:table-cell` mit Tabulator getrennt, `table:table-row` mit `\n`; mehrere Absätze in einer Zelle mit Leerzeichen verbunden; Ausgabe getrimmt. Beispiel: Überschrift "Titel", Absatz "Hallo<s c=2>Welt<line-break>Neu", Tabelle 1 Zeile mit Zellen "A", "B" ergibt `"Titel\nHallo  Welt\nNeu\nA\tB"`.
* **`extractPptx`:** Folien `ppt/slides/slide<N>.xml` nach `N` **numerisch** (`slide10` nach `slide2`); je Folie `== Folie <k> ==` (`k` laufende Nummer), `a:t`-Texte, Absätze `a:p` je eine Zeile; Notizen `ppt/notesSlides/notesSlide<N>.xml` (gleiche Nummer `N`) danach als `-- Notizen --` plus Text; `slides` = Zahl der Folien.
* **`extractDocxExtras`:** liest `word/header*.xml`, `word/footer*.xml`, `word/footnotes.xml`, `word/endnotes.xml`, `word/comments.xml` (Absätze `w:p` mit Text `w:t`); Ausgabe in der Reihenfolge Kopfzeilen, Fußzeilen, Fußnoten, Endnoten, Kommentare, je mit den Überschriften `== Kopfzeile ==`, `== Fußzeile ==`, `== Fußnoten ==`, `== Endnoten ==`, `== Kommentare ==` (nur nicht leere Teile; Trennerfußnoten ohne Text entfallen); Teile durch Leerzeile getrennt; `parts` = Zahl der nicht leeren Teile. Der Haupttext bleibt bei mammoth (Oberfläche hängt `extras.text` nach einer Leerzeile an; Voreinstellung siehe `V2-FRAGEN.md`).
**Tests (rot zuerst):** je Funktion die Beispiele oben; `extractXlsx` mit mehreren Blättern (`sheet2` vor `sheet10` ordnen); `extractPptx` mit `slide2`, `slide10` und Notizen; XML mit `<!DOCTYPE x [<!ENTITY a "AAAA">]>` und `&a;` in einer Zelle: Ausgabe enthält `&a;` unverändert oder nichts, **nie** die Erweiterung; `extractDocxExtras` mit dem Kopf-/Fuß-/Fußnoten-/Kommentar-Beispiel; ein ZIP, das `guard` verletzt, wirft `PSFormatError` und wird **nicht** entpackt (Zeitgrenze 200 ms).
**Abnahme:** Unit-Tests grün; Fuzz-Test aus F4.a (kaputte ZIPs) ohne Absturz.

### B2.w: Verdrahtung (Oberfläche, H)

**Erlaubte Dateien:** `app/privacy-shield.html`, `tests/formats.test.mjs`. Skripte `lib/formats.js` und `lib/officefmt.js` einbinden; `accept` des Auswahlfeldes um `.xlsx,.ods,.odt,.odp,.pptx,.eml,.html,.htm` erweitern; `loadF` liest `new Uint8Array(await file.arrayBuffer())`, ruft `PSLib.formats.detect(file.name, bytes.slice(0, 512))` und die passende Funktion (Text-Formate über `decodeText`; `docx` über mammoth **plus** `extractDocxExtras` (wenn Frage F1 in `V2-FRAGEN.md` bejaht wird, Voreinstellung ja); `pdf` wie bisher); `doc`, `xls`, `ppt` zeigen "Dateien im alten .<ext>-Format werden nicht unterstützt. Bitte in Word/Excel/PowerPoint als .docx/.xlsx/.pptx speichern."; `unknown` zeigt "Dateityp nicht erkannt oder Datei beschädigt." (kein Rohtext der Datei in Meldungen); `PSFormatError` zeigt je Code eine feste Meldung ("Archiv zu groß", "Archiv hat zu viele Einträge", "Archiv ist verdächtig stark komprimiert").
**E2E-Tests (`tests/formats.test.mjs`):** je Format ein im Test erzeugtes Beispiel (XLSX, ODT, PPTX, EML, HTML, RTF, DOCX mit Kopf-/Fußzeile) enthält "Herr Thomas Müller, max@firma.de", wird über `setFiles` geladen, mit `anon()` (KI aus) anonymisiert: Ergebnis enthält keinen Klartext; Latin-1-TXT mit "Herr Thomas Müller" wird zu `{{NAME_1}}` (Kodierungsfall); RTF mit `M\'fcller`; `.doc`-Magic (`D0CF11E0...`) zeigt die `.doc`-Meldung; ein ZIP mit gefälschter Größe zeigt die Archivmeldung und die App bleibt bedienbar.
**Abnahme:** Unit-Tests grün; End-to-End je Format grün; Fuzz-Test aus F4.a ohne Absturz und innerhalb der Zeitgrenze.

---

## B3: Formattreuer Export (Kann, nicht für 2.0 geplant)

**Marke:** S. **Ziel:** Ergebnis als **DOCX/XLSX mit erhaltener Formatierung** (Absätze, Überschriften, Tabellen), nicht als Klartext.
**Ansatz:** Je Absatz (`w:p`) die Texte der Läufe (`w:r/w:t`) zu einer Zeichenkette zusammensetzen, Erkennung auf dieser Kette, Fundstellen auf die Läufe zurückrechnen (Treffer über Lauf-Grenzen: Ersatz im ersten Lauf, Rest der Treffer in Folgeläufen entfernen), Formatierung des ersten Laufs erhalten; XLSX je Zelle. Tabellen, Kopf-/Fußzeilen, Textfelder, Fußnoten und Kommentare **mitführen** (häufigste Leckquelle: Texte außerhalb des Fließtextes; mammoth liest davon nur Absätze und Tabellen, gemessen). Dokumenteigenschaften (`docProps/core.xml`: Autor, letzter Bearbeiter) leeren.
**Risiko:** hoch (Lauf-Grenzen, versteckter Text, verfolgte Änderungen). **Vorarbeit:** Spike mit 20 echten Beispiel-DOCX (ohne Kundendaten, selbst erzeugt), Leckquote und Optik messen; erst bei Erfolg einplanen.
