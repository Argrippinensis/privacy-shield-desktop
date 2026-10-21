# V2-A: Vertrauen (A1 bis A4, M1)

Rolle und Regeln: `V2-00-INDEX.md`. Alle Pakete hier sind **Module + Unit-Tests + dünne Oberfläche** (Paketteilung `.m` Modul, parallel; `.w` Oberfläche, seriell). Reihenfolge: M1.m, A1, A2, A3, A4 (jedes für sich lieferbar).
Gemeinsame Vorgabe: Berichte, Diagnosen und Dateinamen enthalten **nie** personenbezogene Werte der verarbeiteten Dokumente.
**Gemeinsame Hilfen aus F2:** `PSLib.placeholder` (Platzhalter-Grammatik, `mask`), `tests/unit/_load.mjs` (`loadLib`), in `tests/helpers.mjs` die E2E-Hilfen `captureDownloads(frame)` und `getDownloads(frame)` (fängt `<a download>`-Klicks und Blob-Inhalte ab, Name, Typ, Base64) sowie `setFiles(frame, [{ name, buffer, mimeType }])` (Playwright `setInputFiles` auf `#FI`). `window.confirm`/`alert` blockieren in der App: E2E-Tests ersetzen sie vorher im Frame (`window.confirm = () => true`).

## Befunde aus P0, die mehrere Pakete betreffen (gemessen in der App 1.8.0)

* **Manuelle Markierungen gehen beim Anonymisieren verloren (Datenverlust-Fehler der Vorgängerversion).** "Annotieren" (`tokenizeAnnotateWord`, `selectAnnotateType`) schreibt `{{NAME_1}}` direkt in das **Eingabefeld** `IT` und legt den Eintrag in `store` an. Der nächste `anon()` setzt `store = {}` zurück: im Ergebnis steht weiter `{{NAME_1}}`, die Zuordnung dazu fehlt, die Rückübersetzung lässt `{{NAME_1}}` stehen (Original "Zwiebelbaum" ist verloren). Deshalb werden manuelle Markierungen in 2.0 **Daten** (Paket M1 und A1.w), nicht Textänderungen; sie sind außerdem die Grundlage für "Maskieren" (A1) und "Rückgängig" (D1).
* Die Whitelist (`isWhitelisted`) vergleicht **Teilzeichenfolgen, Groß-/Kleinschreibung egal**: "Anna" gibt auch "Annabelle Müller" frei. Für die Prüfansicht (D1) entsteht deshalb eine zweite, **exakte** Freigabeliste (`released`); die alte Whitelist bleibt unverändert.
* Platzhalter werden **von hinten nach vorne** nummeriert (`{{NAME_1}}` = letzte Namensstelle im Text).
* Alle Werkzeug-Funktionen für Dateien liegen in `app/privacy-shield.html` im Frame `tool-frame`; die Hülle `app/index.html` besitzt `window.electronAPI`, das Werkzeug erreicht es als `window.parent.electronAPI` (gemessen: `window.electronAPI` im Werkzeug ist `undefined`, `window.parent.electronAPI` ein Objekt).
* Ergebnis-Oberfläche heute: Kopf "Anonymisierter Text" (`#AT`, Knöpfe "Kopieren", "KI-Antwort einfügen"), darunter die Tabelle "Variablen-Zuordnung" (`#MT`) mit den Knöpfen "Mapping löschen", "Als CSV exportieren", "CSV importieren" (`impMap`); ein zweiter "CSV importieren"-Knopf steht auf dem Willkommensbildschirm. Die anonymisierte Ausgabe ist **nur kopierbar**, nicht speicherbar (außer im ZIP bei Mehrfachauswahl); gespeichert werden heute nur die Zuordnung (`privacyshield_mapping.csv`) und das zurückübersetzte Ergebnis (`privacyshield_ergebnis.txt`/`.pdf`).

---

## M1: Manuelle Markierungen als Daten

**Marke:** H. **Aufwand:** 1 h (Modul) plus Oberfläche in A1.w. **Voraussetzung:** F2.

**Datei:** `app/lib/marks.js` (`PSLib.marks`), Test `tests/unit/marks.test.mjs`.

```js
const m = PSLib.marks.create()                       // -> { items: [] }  (reines Objekt, JSON-fähig)
PSLib.marks.add(m, { value, pfx })  -> boolean        // false bei ungültigem Wert/Typ oder wenn (value, pfx) schon vorhanden ist
PSLib.marks.remove(m, { value, pfx }) -> boolean
PSLib.marks.toCvars(m) -> [{ n, p }]                  // Eingabe für die bestehenden eigenen Variablen des Kerns (cvars: n = Typname, p = Regex-Quelltext)
PSLib.marks.snapshot(m) -> object                      // tiefe Kopie
PSLib.marks.restore(m, snapshot) -> void
```

Regeln: `value` 2 bis 200 Zeichen, ohne Zeilenumbruch, ohne `{{` und `}}`, wird nicht getrimmt; `pfx` entspricht `^[A-Z][A-Z0-9_]{1,19}$`. `toCvars` erzeugt je Eintrag `p` = maskierter Wert (alle Regex-Sonderzeichen mit `\` geschützt) mit Wortgrenzen im Stil der Kernregeln: `(?<![A-Za-z0-9_À-ɏ])` davor, `(?![A-Za-z0-9_À-ɏ])` danach, Groß-/Kleinschreibung beachtet. Reihenfolge der `items` = Reihenfolge des Hinzufügens; längere Werte zuerst in `toCvars` (damit "Anna Müller" vor "Anna" greift).
**Tests (rot zuerst):** gültiger Eintrag; doppelter Eintrag `false`; `'a'` (zu kurz), 201 Zeichen, `'x\ny'`, `'{{NAME_1}}'`, `pfx: 'name'`, `pfx: ''` werden abgelehnt; `toCvars` mit `'C++ (Beta)'`: das Muster als `new RegExp(p, 'g')` trifft genau den Text "C++ (Beta)" in "Wir nutzen C++ (Beta) hier", nicht in "xC++ (Beta)y"; Länge-zuerst-Reihenfolge; `snapshot`/`restore` sind Kopien (Änderung am Original verändert den Snapshot nicht); `remove`.
**Abnahme:** Unit-Tests grün; Modul rein (Prüfskript).

---

## A1: Gegenprüfung des Ergebnisses ("Restrisiko-Scan")

**Marke:** H. **Aufwand:** 2 h. **Voraussetzung:** F2 (Läufer, `PSLib.placeholder`), M1.m für die Oberfläche; für die Oberfläche außerdem F1.b (die Erkennung kommt als `PSDetect.detect`).

**Idee:** Nach dem Anonymisieren läuft die Erkennung ein zweites Mal **über das Ergebnis**. Alles, was dort noch wie ein personenbezogener Wert aussieht, ist ein mögliches Leck und wird dem Nutzer gezeigt, bevor er das Ergebnis weitergibt.

**Datei:** `app/lib/leakcheck.js` (UMD, `PSLib.leakcheck`), Test `tests/unit/leakcheck.test.mjs`.

```js
PSLib.leakcheck.scan(outputText, { detect, whitelist, released })
//  detect(text) -> [{ start, end, pfx, hard? }]   // von außen übergeben; liefert ALLE Funde OHNE Freigabefilter
//                                                 // (heute: collectEntities mit whitelist = []; nach F1: PSDetect.detect(text, { ..., whitelist: [] }))
//  whitelist: string[]  Freigaben als Teilzeichenfolge, Groß-/Kleinschreibung egal (Verhalten von isWhitelisted)
//  released:  [{ pfx, value }]  exakte Freigaben der Prüfansicht (D1); Standard []
//  -> { clean: boolean, count: number, whitelisted: number, findings: [{ type, start, end, severity: 'hoch'|'mittel', snippet }] }
PSLib.leakcheck.HARD_PFX   // Menge der Typen mit Schwere "hoch"
```

Regeln:
1. Die Platzhalter des Ausgabetextes werden vor dem Aufruf von `detect` mit `PSLib.placeholder.mask(text)` durch `\u0000` ersetzt (gleiche Länge). **Nicht `x`** (gemessen: `x` erzeugt Fehlfunde, weil ein Wort wie "Tan" plus Platzhalter als Kontowert gelesen wird; mit `\u0000` sind es 0 hohe Funde in 42 von 42 Dokumenten und in 170 von 170 Fällen). Zusätzlich verwirft `scan` jeden Fund, der einen Platzhalterbereich überlappt (doppelter Schutz; Test-Stubs liefern feste Spans). Positionen beziehen sich auf `outputText`.
2. `severity`: `'hoch'` wenn `span.hard === true`; `'mittel'` wenn `span.hard === false`; ist `hard` nicht gesetzt, entscheidet der Typ `pfx`: **hoch** = `EMAIL`, `IBAN`, `BIC`, `KARTE`, `TEL`, `IP`, `KFZ`, `GERAET`, `KONTO`, `KENNNR`, `STANDORT`; **mittel** = alles andere (`NAME`, `ORG`, `ORT`, `ADRESSE`, `ROLLE`, `MEDIZIN`, `SENSIBEL`, `DATUM`, `BETRAG`, `PARAGRAF`, eigene Typen). `type` im Fund = `pfx`.
3. `snippet` = der Fund mit je 15 Zeichen Umgebung aus `outputText` (am Textrand kürzer), Zeilenumbrüche und Tabs durch je ein Leerzeichen ersetzt, bei Platzhaltern in der Umgebung unverändert; wird **nur in der Oberfläche** angezeigt, nie in Bericht oder Diagnose.
4. Freigaben: Ein Fund wird **nicht** gemeldet, wenn sein Text (ohne Beachtung der Groß-/Kleinschreibung) einen Eintrag aus `whitelist` enthält oder genau (Groß-/Kleinschreibung beachtet) einem Eintrag aus `released` mit gleichem `pfx` entspricht; jeder so unterdrückte Fund zählt in `whitelisted`.
5. Leerer Text: `{ clean: true, count: 0, whitelisted: 0, findings: [] }`. Kein Aufruf wirft eine Ausnahme (auch bei `detect`-Fehlern: dann `findings: []` und zusätzlich `error: 'DETECT_FAILED'`, `clean: false`). `findings` nach `start` sortiert, `count === findings.length`, `clean === (count === 0)`.

**Tests (Test-Autor schreibt sie rot; `detect` im Test ist ein Stub mit festen Spans, der den erhaltenen Text mitprotokolliert):**
* Text nur aus Platzhaltern und Fülltext: `clean`, und der Stub hat Text **ohne `{{`** und mit `\u0000` an den Platzhalterstellen erhalten (gleiche Länge).
* Text mit `max@firma.de` im Ergebnis (Stub meldet den Span `EMAIL`): ein Fund `hoch`, `start`/`end` stimmen, `type === 'EMAIL'`.
* Platzhalter `{{EMAIL_1}}` direkt neben Text; ein Stub-Span, der den Platzhalter überlappt: kein Fund.
* `{{max@firma.de}}` ist **kein** Platzhalter (Grammatik): bleibt im maskierten Text sichtbar.
* Whitelist-Eintrag "firma.de" (Teilzeichenfolge, Großschreibung "FIRMA.de" egal): kein Fund, `whitelisted === 1`. `released: [{ pfx: 'NAME', value: 'Anna' }]` gibt "Anna" (Typ `NAME`) frei, nicht "Annabelle" und nicht "anna".
* Schwere je Typ für alle Typen der Tabelle; `hard: true` auf `NAME` ergibt `hoch`, `hard: false` auf `EMAIL` ergibt `mittel`.
* 50.000 Zeichen Fülltext in unter 200 ms (Stub-Erkennung); `snippet` ohne Zeilenumbruch, höchstens 15 + Fund + 15 Zeichen; Funde nach `start` sortiert; Stub, der wirft: `error: 'DETECT_FAILED'`.

**Oberfläche (A1.w, S, Sonnet niedrig, Skill `frontend-design`):** Unter der Kopfzeile "Anonymisierter Text" ein Band `#LCBAND` (`role="status"`, `aria-live="polite"`): grün mit schlichtem Haken-Symbol (SVG) "Gegenprüfung: keine Auffälligkeiten" oder bernstein "Gegenprüfung: n mögliche Reste" (n = Zahl, bei 1 "1 möglicher Rest"). Klick auf das Band öffnet die Liste `#LCLIST` (Typ, Snippet, Schaltflächen "Maskieren" und "Ignorieren"). Die Funktion `runLeakCheck()` liest `#AT`, ruft `PSLib.leakcheck.scan` mit `detect = (t) => PSDetect.detect(t, <aktuelle Optionen mit whitelist: []>)` auf, aktualisiert das Band und gibt das Ergebnis zurück; sie läuft am Ende von `anonCore` (und nach jedem `reanon`). "Maskieren" fügt dem Wert des Fundes eine manuelle Markierung hinzu (`PSLib.marks.add(manualMarks, { value, pfx })` mit dem Wert aus dem **Ergebnistext**; Typ = `type` des Fundes) und ruft `reanon()`; "Ignorieren" blendet den Fund bis zur nächsten Anonymisierung aus. **Annotieren-Modus umbauen** (Befund oben): `tokenizeAnnotateWord` und `selectAnnotateType` fügen `manualMarks` einen Eintrag hinzu und lassen `IT` unverändert; `collectEntities` bekommt `cvars.concat(PSLib.marks.toCvars(manualMarks))`. Ohne Emoji. Elementkennungen wie genannt (für Tests).
**E2E-Tests (`tests/leakcheck.test.mjs`; vor jedem Test `startApp()`, `setAIMode('off')`):** (1) `IT` = "Bitte melden unter max@firma.de", `anon()`: Band `#LCBAND` grün, Text enthält "keine Auffälligkeiten". (2) **Absichtlich verfehlter Wert:** `ENTS.find((e) => e.id === 'email').on = false`, `IT` wie oben, `anon()`: `#AT` enthält `max@firma.de` im Klartext; danach `ENTS...on = true` und `runLeakCheck()`: Band zeigt "1 möglicher Rest", `#LCLIST` enthält Typ `EMAIL` und ein Snippet mit "max@firma.de"; Klick "Maskieren": `manualMarks` enthält den Wert, `reanon()` lief, `#AT` enthält `{{EMAIL_1}}` und kein "max@firma.de", Band grün. (3) **Freigabe:** `whitelist.push('firma.de')`, `anon()`, `runLeakCheck()`: Band grün, Ergebnis `whitelisted >= 1`. (4) **Regression des Datenverlusts:** `IT` = "Der Kunde Zwiebelbaum meldet sich unter max@firma.de.", `PSLib.marks.add(manualMarks, { value: 'Zwiebelbaum', pfx: 'NAME' })`, `anon()`: `#AT` enthält `{{NAME_1}}`, `store['{{NAME_1}}'].v === 'Zwiebelbaum'`, und `deanon()` (mit `#AR` = `#AT`) stellt `IT` exakt wieder her; `IT` selbst wurde nicht verändert. (5) Annotieren-Modus: `tokenizeAnnotateWord(10, 'Zwiebelbaum', 'NAME', '#f59e0b')` lässt `IT` unverändert und fügt `manualMarks` einen Eintrag hinzu.

**Abnahme:** Unit-Tests grün; Harness-Messung (nicht als Test festgeschrieben, im Bericht): Gegenprüfung meldet für alle 42 synthetischen Dokumente (276 Werte) im Standardprofil **0 hohe Funde** (gemessen in P0: 0 in W0 und W1; mittlere Funde: 1 in W0, 2 in W1, z. B. ein Namensrest "Tan"; das ist der Zweck der Funktion) und für alle 170 Harness-Fälle 0 hohe Funde; sonst Ursache klären, nicht den Test lockern. Leistung unter 1 s für 100.000 Zeichen Fließtext (gemessen: Erkennung 0,17 s für 119.000 Zeichen).

---

## A2: Anonymisierungsbericht

**Marke:** H. **Aufwand:** 2 h. **Voraussetzung:** F2 (Modul), A1.w (Oberfläche).

**Zweck:** Nachweis für Datenschutzbeauftragte und Akten: *wann, womit, mit welchem Ergebnis* anonymisiert wurde, **ohne** die Daten selbst.

**Datei:** `app/lib/report.js` (`PSLib.report`), Test `tests/unit/report.test.mjs`. Das Modul liest weder Uhr noch Zeitzone noch Systemwerte (rein, deterministisch).

```js
PSLib.report.build(input) -> report
PSLib.report.toText(report) -> string      // deutsch, ohne Emoji, Zeilenwechsel "\n"
PSLib.report.toJson(report) -> string      // JSON.stringify(report, null, 2), Schlüsselreihenfolge wie unten
class PSReportError extends Error { code: 'INVALID_INPUT', field: string }   // PSLib.report.PSReportError
```

**Eingabe `input`** (nur diese Felder werden gelesen; alle anderen werden **ignoriert und nie kopiert**):

| Feld | Muster / Grenze |
|---|---|
| `appVersion` | `^\d+\.\d+\.\d+(-[A-Za-z0-9.]+)?$` |
| `profileId` | `^[a-z][a-z0-9_]{0,19}$` |
| `aiMode` | `'auto'` oder `'off'` |
| `modelId` | optional, `^[A-Za-z0-9._/\-]{1,80}$` |
| `startedAt` | ISO-8601 UTC: `^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z$` |
| `localTime` | optional, 1 bis 40 Zeichen aus `[0-9A-Za-z:., +\-()]`, vom Aufrufer erzeugt |
| `durationMs` | ganze Zahl 0 bis 86.400.000 |
| `documents` | Liste mit 1 bis 200 Einträgen |
| `documents[].index` | ganze Zahl 1 bis 100.000 |
| `documents[].chars` | ganze Zahl 0 bis 2.000.000.000 |
| `documents[].counts` | Objekt, Schlüssel `^[A-Z][A-Z0-9_]{1,19}$`, Werte ganze Zahlen 0 bis 1.000.000.000 (höchstens 50 Schlüssel) |
| `documents[].resultSha256` | `^[0-9a-f]{64}$` |
| `documents[].leak` | `{ count, hoch, mittel }`, ganze Zahlen 0 bis 1.000.000 |
| `whitelistSize`, `customRuleCount` | ganze Zahlen 0 bis 100.000 |

Jede Verletzung wirft `PSReportError` mit `code: 'INVALID_INPUT'`, `field` = Pfad des Feldes (z. B. `documents[0].counts.NAME`) und der Meldung `Ungültiges Feld: <field>`; **der Wert steht nie in der Meldung**. Dadurch gelangt kein String über 80 Zeichen und kein freier Text in den Bericht (ersetzt die unklare Regel "Strings über 80 Zeichen in Zählerfeldern").
**Bericht `report`** (Schlüsselreihenfolge = Reihenfolge von `toJson`): `format: 'privacyshield-report/1'`, `program: 'PrivacyShield'`, `appVersion`, `startedAt`, `localTime` (nur wenn angegeben), `durationMs`, `profileId`, `aiMode`, `modelId` (nur wenn angegeben), `whitelistSize`, `customRuleCount`, `documents` (je: `index`, `chars`, `counts` mit **alphabetisch sortierten** Schlüsseln, `resultSha256`, `leak: { count, hoch, mittel }`), `totals: { documents, chars, entities }` (Summen; `entities` = Summe aller `counts`).
**`toText`** (genau diese Zeilen, in dieser Reihenfolge; Zahlen ohne Tausendertrenner):

```
PrivacyShield Anonymisierungsbericht
Programm: PrivacyShield <appVersion>
Zeitpunkt (UTC): <startedAt>
Zeitpunkt (lokal): <localTime>            (nur wenn angegeben)
Dauer: <durationMs> ms
Profil: <profileId>
KI-Modus: <aiMode>
Modell: <modelId>                          (nur wenn angegeben)
Freigaben (Whitelist): <whitelistSize>
Eigene Regeln: <customRuleCount>

Dokument <index>
  Zeichen: <chars>
  Funde: <Summe counts>
    <KATEGORIE>: <n>                       (eine Zeile je Kategorie, alphabetisch)
  Gegenprüfung: keine Auffälligkeiten      (bei leak.count === 0)
  Gegenprüfung: <count> mögliche Reste (hoch <hoch>, mittel <mittel>)
  SHA-256 des Ergebnistextes: <resultSha256>

Gesamt: <totals.documents> Dokument(e), <totals.entities> Funde

Dieser Bericht enthält keine personenbezogenen Daten der verarbeiteten Dokumente. Er ersetzt keine rechtliche Bewertung.
```

(Leerzeile vor jedem "Dokument" und vor "Gesamt" wie gezeigt.) **Tests (rot zuerst):**
* **Kein Leck im Bericht:** Für jedes der 42 Dokumente aus `generateDocs(42)` wird ein Bericht mit **festen** Zählern gebaut (die Zähler stammen aus einer eingebetteten Tabelle im Test; der Test hängt nicht vom Kern ab); kein `truth.frags`-Fragment mit **mindestens 5 Zeichen** darf in `toText` oder `toJson` vorkommen. Zusätzlich: `build` mit einem Eingabefeld `name: 'Müller'` auf Dokumentebene und einem unbekannten Top-Level-Feld `kunde: 'Müller'` lässt "Müller" im Bericht nicht erscheinen.
* `toJson` ist deterministisch (gleiche Eingabe, gleiche Ausgabe; auch bei anderer Schlüsselreihenfolge der Eingabe) und beginnt mit `{\n  "format": "privacyshield-report/1"`.
* `toText` enthält die Zeilen `Programm: PrivacyShield 2.0.0`, `Profil: standard`, `NAME: 12` (Einrückung 4 Leerzeichen), `Dokument 1`, die Gegenprüfungszeile in beiden Formen, und keine Zeichen im Emoji-Bereich; die letzte Zeile ist der Schlusssatz.
* Ungültige Eingabe: negative Zähler, `documents` fehlt, leere `documents`, `resultSha256` mit 63 Zeichen, `profileId: 'Standard'`, `startedAt` ohne `Z`, Kategorie `name` (klein): jeweils `PSReportError` mit `code === 'INVALID_INPUT'` und passendem `field`, Meldung enthält den Wert nicht.
**Oberfläche (A2.w):** Knopf "Bericht speichern" im Kopf "Anonymisierter Text" (neben "Kopieren"), speichert `bericht.txt` (bei Mehrfachverarbeitung zusätzlich `bericht.json`; siehe B1.w2). Der SHA-256 des Ergebnistextes kommt aus `crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))` im Seitenskript (gemessen: `crypto.subtle` ist im Werkzeug-Frame verfügbar). Zähler je Kategorie aus `store` (`Object.values(store)` nach `t` gruppiert), Zeit `startedAt` = `new Date().toISOString()` zu Beginn von `anon`, `localTime` = `new Date().toLocaleString('de-DE')`. **E2E-Test (`tests/report.test.mjs`):** Dokument anonymisieren, "Bericht speichern" klicken (Download über `captureDownloads`), Datei enthält keine der Fragmente der Testdokumente (≥ 5 Zeichen), enthält `Profil: standard` und den SHA-256 des Ergebnistextes.
**Abnahme:** Unit-Tests grün; Stichprobe: Bericht eines Testdokuments von Hand gelesen, enthält nichts Personenbezogenes.

---

## A3: Verschlüsselte Zuordnung (`.psmap`)

**Marke:** H (Spezifikation vollständig), **Prüfung durch Sonnet xhigh Pflicht** (Sicherheitsfunktion). **Aufwand:** 3 h. **Voraussetzung:** F2.

**Problem heute:** Die Zuordnung (Platzhalter zu Originalwerten) wird als **Klartext-CSV** gespeichert (`privacyshield_mapping.csv`, Kopfzeile `Variable,Originalwert,Typ,Methode`). Wer die Datei findet, hat alle Originaldaten. 2.0 verschlüsselt sie standardmäßig.

**Gemessen (P0):** `crypto.subtle` ist in Node 22 und in der App (`app://ps/`, Werkzeug-Frame **und** Hülle) verfügbar (`isSecureContext: true`); PBKDF2-HMAC-SHA-256 dauert auf diesem Rechner (i7-2620M, 2011) bei **600.000 Iterationen 343 bis 439 ms** (Node, Median 358 ms; App: Werkzeug-Frame 343 bis 371 ms, Worker 342 bis 353 ms, Electron 35 und 44 gleich), bei 100.000 Iterationen 58 bis 66 ms, bei 5.000.000 Iterationen 2,9 s. Die Hauptschleife bleibt dabei bedienbar (größter Zeitgeberabstand 10 ms). Das Ziel "unter 2 s" ist mit großem Abstand erfüllt; 600.000 bleibt Standard. AES-256-GCM über 5 MB: 11 ms (Verschlüsseln), 19 ms (Entschlüsseln); JSON-Umwandlung einer 6,8-MB-Zuordnung: 80 ms und 43 ms.

**Datei:** `app/lib/psmap.js` (`PSLib.psmap`), Test `tests/unit/psmap.test.mjs`. **Ausschließlich Web Crypto** (`globalThis.crypto.subtle`), keine eigene Kryptografie, keine neue Bibliothek.

Format (binär, Big-Endian):

| Bytes | Inhalt |
|---|---|
| 4 | Magic `PSM1` (0x50 0x53 0x4D 0x31) |
| 1 | Formatversion `1` |
| 1 | KDF-Kennung `1` = PBKDF2-HMAC-SHA-256 |
| 4 | Iterationen (uint32), Standard **600000** |
| 16 | Salz (zufällig je Datei) |
| 12 | Nonce/IV (zufällig je Datei) |
| n | Chiffretext AES-256-GCM (inklusive 16-Byte-Tag); **AAD = die ersten 38 Header-Bytes** |

Schlüssel: PBKDF2 über die UTF-8-Bytes des **NFC-normalisierten** Passworts (`password.normalize('NFC')`; sonst entschlüsselt dieselbe Eingabe auf macOS und Windows verschieden), Hash SHA-256, Salz aus dem Header, Iterationen aus dem Header, 256 Bit. Klartext = UTF-8 von `JSON.stringify(payloadObject)` ohne Umordnung und ohne Einrückung; **das Modul fügt keine Felder hinzu**. Der Aufrufer übergibt `{ v: 1, created: '<ISO>', state: { store, cnt }, docs: [...] }`; `docs` ist eine Liste `{ index, name, chars, sha256 }` (Original-Dateiname erlaubt: die Datei ist verschlüsselt; leer bei Einzeldokument ohne Dateiname).

```js
await PSLib.psmap.encrypt(payloadObject, password, opts?) -> Uint8Array
await PSLib.psmap.decrypt(bytes, password) -> payloadObject
class PSMapError extends Error { code }   // PSLib.psmap.PSMapError; code in 'WEAK_PASSWORD' | 'WRONG_PASSWORD' | 'CORRUPT' | 'UNSUPPORTED_VERSION' | 'NOT_PSMAP'
// opts: { iterations } (Standard 600000), { _salt, _iv } nur für Testvektoren (Uint8Array 16 bzw. 12 Bytes; wird in Produktion nie gesetzt)
```

**Regeln (Reihenfolge der Prüfungen beim Entschlüsseln, erste zutreffende gilt):**
1. `bytes` ist kein `Uint8Array`/`ArrayBuffer` oder kürzer als 4 Bytes oder die ersten 4 Bytes sind nicht `PSM1`: `NOT_PSMAP`.
2. Länge kleiner als 38 + 16 = 54 Bytes: `CORRUPT`.
3. Versionsbyte ungleich 1 oder KDF-Byte ungleich 1: `UNSUPPORTED_VERSION`.
4. Iterationen außerhalb 100.000 bis 5.000.000: `CORRUPT` (**vor** jeder Schlüsselableitung, Schutz vor Rechenzeit-Angriff).
5. Passwort kein String oder kürzer als **10 Zeichen** (Zählung in Unicode-Codepunkten **nach** der NFC-Normalisierung: `[...pw.normalize('NFC')].length`): `WEAK_PASSWORD` (auch beim Verschlüsseln, vor jeder Rechnung).
6. Jeder Fehler der GCM-Prüfung (falsches Passwort, geänderter Chiffretext, **geänderter Header** inkl. Iterationen/Salz/Nonce innerhalb des erlaubten Bereichs): `WRONG_PASSWORD` (technisch nicht unterscheidbar von Beschädigung; die Oberfläche sagt "Passwort falsch oder Datei beschädigt"). Erfolgreich entschlüsselter Klartext, der kein gültiges JSON ist: `CORRUPT`.
7. Beim Verschlüsseln sind `opts.iterations` unter 100.000 erlaubt (nur Tests); **Entschlüsseln akzeptiert nie weniger als 100.000**. Deshalb nutzen alle Rundlauftests `iterations: 100000` (gemessen 63 ms je Ableitung), und der Vektortest mit 1.000 Iterationen prüft nur das Verschlüsseln.
Keine Passwörter oder Schlüssel in Fehlertexten, Logs, Konsole; `PSMapError.message` ist ein fester deutscher Satz je Code.

**Tests (rot zuerst; Passwort im Test: `'korrektes Pferd Batterie'`; Standardnutzlast `{ v: 1, created: '2026-10-21T00:00:00Z', state: { store: { '{{NAME_1}}': { v: 'Müller', t: 'NAME', c: '#f59e0b', m: 'KI' } }, cnt: { NAME: 1 } }, docs: [] }`):**
* Rundlauf mit `iterations: 100000`: Nutzlast verschlüsseln, entschlüsseln, `deepEqual` (Umlaute, Sonderzeichen `ß ñ ç`, ein Eintrag mit 5 MB Text).
* Zwei Verschlüsselungen derselben Nutzlast ergeben **verschiedene** Bytes; Salz (Bytes 10..25) und Nonce (26..37); Header: Bytes 0..3 `PSM1`, Byte 4 `1`, Byte 5 `1`, Bytes 6..9 = Iterationen (uint32 BE); ohne `opts.iterations` steht 600000 im Header (ein Test, der die Ableitung mit 600.000 Iterationen ausführt; Zeit unter 3 s).
* Falsches Passwort: `WRONG_PASSWORD`. Ein verändertes Byte im Chiffretext: `WRONG_PASSWORD`. Verändertes Iterationsbyte (z. B. 100000 auf 100001): `WRONG_PASSWORD`. Auf 20 Bytes gekürzte Datei: `CORRUPT`; um 1 Byte gekürzte Datei: `WRONG_PASSWORD`. CSV-Text als Eingabe: `NOT_PSMAP`; leeres Array: `NOT_PSMAP`. Versionsbyte 2 (mit gültigem Magic): `UNSUPPORTED_VERSION`; KDF-Byte 2: `UNSUPPORTED_VERSION`.
* Passwort mit 9 Zeichen (auch die zerlegte Schreibweise `'Mu\u0308nchenXY'`: 10 Codepunkte, nach NFC aber nur 9), leer, `null`, Zahl: `WEAK_PASSWORD`; Passwort mit genau 10 Zeichen (auch 10 Emoji-Codepunkte) ist gültig. Zusammengesetztes und zerlegtes "ü" im Passwort (`'M\u00fcnchenXYZ'` gegenüber `'Mu\u0308nchenXYZ'`, beide 10 Zeichen nach NFC; im Test mit Escape-Folgen geschrieben, nicht als Zeichen) entschlüsseln dieselbe Datei.
* **Testvektor** (nur Verschlüsseln): Passwort `'korrektes Pferd Batterie'`, `_salt` = Bytes `0x00..0x0f`, `_iv` = Bytes `0xa0..0xab`, `iterations: 1000`, Nutzlast `{ "v": 1, "x": "ä" }`: die Ausgabe stimmt Byte für Byte mit einer im Test **unabhängig berechneten** Referenz überein (der Test leitet den Schlüssel selbst mit `crypto.subtle.importKey`/`deriveKey` ab, bildet die 38 Header-Bytes selbst und verschlüsselt mit `crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: header })`; nicht über das Modul).
* Iterationen im Header 10 (zu klein) oder 100.000.000 (zu groß) beim Entschlüsseln (Header einer gültigen Datei gepatcht): `CORRUPT` in unter 500 ms (gemessen: 100.000.000 Iterationen würden etwa 60 s dauern).
* Fehlermeldung enthält weder das Passwort noch Teile der Nutzlast (Test mit einem Passwort `'geheim-geheim-123'` und Prüfung von `message` und `String(error)`).
**Oberfläche (A3.w, S, Sonnet niedrig, `frontend-design`):** In der Tabelle "Variablen-Zuordnung" (Knöpfe unter `#MT`): neuer Hauptknopf "Zuordnung speichern" (öffnet Dialog `#PWDLG`, `role="dialog"`, `aria-modal="true"`: Felder `#PWD1`, `#PWD2` (Wiederholung), Stärkehinweis (Länge), Text "Ohne dieses Passwort kann die Zuordnung nicht wiederhergestellt werden.", Knöpfe `#PWOK`, `#PWCANCEL`; speichert `zuordnung.psmap`; Nutzlast wie oben mit `docs` = Einzeldokument), "Zuordnung laden" (Dateiauswahl `.psmap,.csv`; `.psmap`: derselbe Dialog mit einem Feld, Fehlertexte "Passwort falsch oder Datei beschädigt.", "Das ist keine PrivacyShield-Zuordnung.", "Diese Zuordnung stammt aus einer neueren Programmversion."; `.csv`: wie bisher mit Hinweis "unverschlüsselt"). "Als CSV exportieren" wandert in `<details id="MAPMORE"><summary>Weitere Optionen</summary>` mit Bestätigungsdialog "Die Datei enthält alle Originalwerte im Klartext." Der zweite "CSV importieren"-Knopf (Willkommensbildschirm) wird zu "Zuordnung laden" (`impMap`-Weg wie oben). Globale Hilfen für andere Pakete: `mapSaved` (Boolean; wahr nach Speichern, CSV-Export und Laden; falsch nach jeder `anon()`), Funktion `psMapUnsaved()` = `Object.keys(store).length > 0 && !mapSaved`. **E2E-Test (`tests/psmap.test.mjs`):** Dokument anonymisieren, speichern (Passwort per Dialog, Download über `captureDownloads`), `store` leeren (`clrMap` mit bestätigtem `confirm`), `.psmap` über `setFiles` laden, Passwort eingeben, `deanon()` stellt das Original exakt wieder her; falsches Passwort zeigt die Fehlermeldung und ändert `store` nicht; ein `.csv` des Altformats lädt weiterhin.
**Abnahme:** Unit-Tests grün; End-to-End-Rundlauf grün; Prüfer (Sonnet xhigh) bestätigt schriftlich: nur Web Crypto, AES-GCM mit zufälliger Nonce je Datei, KDF-Parameter, AAD, keine Geheimnisse in Logs. Offene Frage dort: Argon2/scrypt wären stärker, stehen in Web Crypto nicht zur Verfügung (bewusst nicht per Bibliothek nachgebaut).

---

## A4: Hygiene der Ausgaben

**Marke:** H. **Aufwand:** 2 h in zwei Paketen: **A4.m** (Modul `safeName`, parallel) und **A4.w** (Verdrahtung, seriell). **Voraussetzung:** A4.m F2; A4.w A4.m und F2.h (berührt `main.js`).

**Befund 1.8.0 (geprüft):** Der Mehrfachauswahl-Weg speichert ein ZIP mit `<Originalname>_anonymisiert.txt` (Dateinamen enthalten oft Namen); der Zwischenablage-Weg der Zuordnung existiert nicht (Zwischenablage wird nur von "Kopieren" (anonymisierter Text), "KI-Dienst öffnen" (anonymisierter Text) und "Details kopieren"/"Diagnose kopieren" (technische Angaben) beschrieben); `dl()` gibt die Blob-URL nie frei; PDF-Export setzt keine Dokumenteigenschaften (jsPDF-Standard: Producer "jsPDF 2.5.1", kein Autor).

### A4.m: Dateinamen

**Datei:** `app/lib/hygiene.js` (`PSLib.hygiene`), Test `tests/unit/hygiene.test.mjs` (Name kollidiert nicht mit `tests/hygiene.test.mjs`, das ist ein anderes Verzeichnis).

```js
PSLib.hygiene.safeName(original, index, { keepName, ext }) -> string
```

* `ext` mit führendem Punkt, Standard `'.txt'` (erlaubt `.txt .pdf .json .zip .psmap`, sonst `RangeError`). `index` ganze Zahl ≥ 1, sonst `RangeError`.
* Standard (`keepName` falsch): `'anonymisiert_' + String(index).padStart(3, '0') + ext`; der Originalname geht **nicht** ein. `safeName('Müller_Hans_Kündigung.docx', 3, {})` ist `'anonymisiert_003.txt'`; mit `{ ext: '.pdf' }` `'anonymisiert_003.pdf'`; Index 1000 ergibt `anonymisiert_1000.txt`.
* `keepName: true`: `<bereinigter Name>_anonymisiert<ext>`. Bereinigung des Namens ohne Endung (letzter Punkt): Unicode NFC; Zeichen aus `\ / : * ? " < > |` und Steuerzeichen (U+0000 bis U+001F, U+007F) durch `_`; Folgen von `_` zu einem; Leerzeichen/Punkte am Rand entfernt; höchstens 80 Zeichen (nach Codepunkten); Windows-reservierte Namen (`CON PRN AUX NUL COM1..9 LPT1..9`, ohne Beachtung der Groß-/Kleinschreibung) erhalten ein führendes `_`; bleibt nichts übrig, gilt der Standardname. `safeName('../../etc/passwd', 2, { keepName: true })` enthält keinen Schrägstrich und keinen Doppelpunkt; ein Name mit 200 Zeichen wird auf 80 gekürzt; `'CON.txt'` wird `'_CON_anonymisiert.txt'`.
**Tests (rot zuerst):** die obigen Beispiele; `index` 0, -1, 1.5, `'a'` werfen `RangeError`; `ext: '.exe'` wirft; NFC-Normalisierung; Ergebnis enthält nie einen Pfadtrenner.

### A4.w: Verdrahtung

**Erlaubte Dateien:** `app/privacy-shield.html`, `main.js`, `preload.js`, `tests/export-hygiene.test.mjs`.
- [ ] **PDF-Metadaten:** in `exportPDF` (heute ohne `setProperties`) vor dem Zeichnen `doc.setProperties({ title: 'Anonymisiertes Dokument', subject: '', author: '', keywords: '', creator: 'PrivacyShield' })`. Test (E2E): exportiertes PDF (Download-Fänger, Base64 zu Bytes) enthält weder den Originalnamen der geladenen Testdatei noch einen Autor (Rohtext-Suche im Byte-Strom nach den Fragmenten und nach `/Author (` mit nichtleerem Inhalt) und enthält `/Title (Anonymisiertes Dokument)`.
- [ ] **Download-URLs freigeben:** `dl()` ruft nach dem Klick `URL.revokeObjectURL(url)` nach `REVOKE_MS` (Standard 10.000 ms; für Tests überschreibbar über `window.__PS_REVOKE_MS`). Test: `__PS_REVOKE_MS = 200`, `URL.revokeObjectURL` im Frame zählen, `dl('x.txt', 'a', 'text/plain')` aufrufen, nach 600 ms genau ein Aufruf mit der erzeugten URL.
- [ ] **Zwischenablage (Entscheidung P0):** Es gibt in 1.8.0 keine Funktion, die Zuordnung oder Originaltext in die Zwischenablage legt; das automatische Leeren nach 60 s entfällt (es würde das Einfügen des anonymisierten Textes in einen KI-Dienst stören). Stattdessen **Inventartest** (statisch, `tests/export-hygiene.test.mjs`): `app/privacy-shield.html` enthält `clipboard.writeText` genau an den drei bekannten Stellen (`copyAIErrorDetails`, `cpAnon`, `copyAndOpenAI`) und `copyText(` nur in `copyAIErrorDetails`; jede neue Stelle lässt den Test scheitern und erzwingt eine Entscheidung. (Frage F2 in `V2-FRAGEN.md`.)
- [ ] **Schließen mit ungespeicherter Zuordnung:** in `main.js` am `mainWindow` ein `close`-Handler (nicht `beforeunload`: Chromium verlangt dafür eine Benutzergeste): beim ersten Aufruf `event.preventDefault()`, dann den Tool-Frame befragen (`mainWindow.webContents.mainFrame.frames.find((f) => f.url.includes('privacy-shield.html'))` und `frame.executeJavaScript('typeof psMapUnsaved === "function" && psMapUnsaved()')`); ist das Ergebnis wahr, `dialog.showMessageBox(mainWindow, { type: 'warning', buttons: ['Abbrechen', 'Trotzdem schließen'], defaultId: 0, cancelId: 0, message: 'Die Zuordnung wurde nicht gespeichert. Später können Platzhalter nicht zurückübersetzt werden. Trotzdem schließen?' })`, bei `response === 1` (oder wenn nicht ungespeichert) `mainWindow.destroy()` bzw. `close()` erneut mit gesetztem Merker. Test (E2E, `psMapUnsaved` liefert nach `anon()` ohne Speichern wahr): `dialog.showMessageBox` per `app.evaluate(({ dialog }) => { dialog.showMessageBox = async () => ({ response: 0 }); })` ersetzen und das Fenster per `app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].close())` schließen: Fenster bleibt offen, Aufruf wurde gezählt; mit `response: 1` schließt es; nach Speichern der Zuordnung (`mapSaved = true`) schließt es ohne Dialog. (Die App beendet sich dabei; Test nutzt `app.waitForEvent('close')` oder prüft `windows().length`.)
- [ ] **ZIP-Namen der Mehrfachauswahl** (heute `<Name>_anonymisiert.txt`) benutzen bis B1.w2 `PSLib.hygiene.safeName(name, i, {})` (Sofortfix in B1.fix; hier nur Verweis).
**Abnahme:** Unit- und End-to-End-Tests grün; keine neue Abhängigkeit; Bericht des Implementierers listet jede geänderte Stelle (Datei, Zeile).
