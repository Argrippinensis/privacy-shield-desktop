# V2-C: Erkennung (C1 bis C4)

Regeln und Rollen: `V2-00-INDEX.md`. Maßstab bleibt das **Leck** (ein personenbezogener Wert steht nach dem Anonymisieren noch im Text) und der **Fehlalarm** (Text ohne Personenbezug wird maskiert). Jede Änderung läuft durch den Harness (`npm run eval`), die Ratsche und den Golden-Stand; neue Fehler **immer zuerst als roter Fall** in `tests/eval/cases*.mjs`. Pakete: **C1.0** (Korpusausbau), **C1.r** (Realdokumente), **C1.1** bis **C1.3** (Schleife), **C2.m**/**C2.w** (Verknüpfung), **C3.m**/**C3.w** (eigene Regeln), C4 (Kann).

## Befunde aus P0 (geprüft am Code und mit dem Prototyp `artifacts/p0/core-vm.mjs`)

* Der Harness hat **170** Fälle: `cases.mjs` 106 (91 positiv, 15 `NEG`), `cases-gdpr.mjs` 64 (59 positiv, 5 `NEG`) = 150 positiv + 20 Negativ (Ids der GDPR-Fälle mit vorangestelltem `g`). Die Synthetik sind **42 Dokumente = 7 Vorlagen × 6** (`rechnung kuendigung arztbrief mahnung mail schaden vollmacht`, Seed 20261020, `generateDocs(42)`), 276 Werte; der Kommentar "6 Vorlagen × 7" in `run-eval.mjs` ist falsch. `generateDocs(count, seed)` wählt die Vorlage mit `i % TEMPLATES.length` und verbraucht den Zufallsstrom in der Reihenfolge der Dokumente; **jede Änderung an `TEMPLATES` oder `generateDocs` ändert die 42 Dokumente und damit Referenz (F2) und Ratsche**. Deshalb bleiben `generateDocs`, `TEMPLATES` und `SYNTH_DOCS = 42` **unverändert**; neue Vorlagen kommen in eine neue Funktion `generateDocs2`.
* Der Harness misst bisher zwei Modi: `wortlisten` (= W0: nur Regeln; die Wortlisten-Erkennung ist erst nach einem Modellstart/-fehler aktiv, `localAIMode`) und `ki`. Der **echte Ausfallmodus** (Modell startet nicht, Regeln plus Wortlisten, W1) wird nicht gemessen. Messung P0 (Node-Prototyp, gleich der App, 212 von 212 Fällen identisch): **W0 21/150 Handfälle undicht, 18/276 synthetisch; W1 12/150 und 11/276; mit Modell 4/150 und 1/276; Fehlalarme überall 0.** C1.0 ergänzt den Modus `fallback` (W1) im Harness.
* Baseline-Zahlen mit Modell (`baseline.json`): `G-NAME` 2, `G-NATION` 1, `G-AUSLAND` 1, Synthetik 1 von 276.
* **DOCX-Kopf-/Fußzeilen und Fußnoten** (Backlog Punkt 7 des ersten Entwurfs) werden von mammoth nicht gelesen (gemessen); das ist keine Erkennungsfrage, sondern Extraktion: erledigt in B2.m2 `extractDocxExtras`. Punkt 7 entfällt hier.
* Pathologische Eingaben (lange Zeilen, lange Leerraumfolgen) rechnen Minuten: Paket F5.

---

## C1.0: Korpusausbau (Test-Autor, nur Daten und Messwerkzeug)

**Marke:** S. **Aufwand:** 3 h. **Voraussetzung:** F2. **Erlaubte Dateien:** `tests/eval/**`, `tests/eval-v2.test.mjs`, `tests/golden/**` (nur neue Dateien), `docs/erkennung-entscheidungen.md`.

* **Neue Dokumentvorlagen** in `tests/eval/generate.mjs`: neue Funktion `generateDocs2(count = 98, seed = 20261021)` und `TEMPLATES2` (14 Vorlagen, je 7 Dokumente): `zeugnis` (Arbeitszeugnis mit Gehalt), `mietvertrag`, `gespraechsprotokoll` (mit Sprecherkürzeln), `emailverlauf` (mit Signaturen), `csvexport` (Kundenliste, Zeilen mit Komma getrennt), `chatverlauf`, `bewerbung` (Lebenslauf), `rechnung_positionen`, `gutachten`, `behoerdenbescheid`, `krankmeldung`, `arztbrief_lang`, `kuendigung_lang`, `schadensmeldung_lang` (die drei letzten sind längere Fassungen der vorhandenen Vorlagen mit mehreren Absätzen und Anlagen). Jede Vorlage liefert wie bisher `{ text, truth }` (Fragmente, die verschwinden müssen), 3 bis 12 Werte je Dokument; `SYNTH_DOCS2 = 98` als Export. **Der Test `generateDocs(42)` bleibt bitgleich** (Test in `tests/eval-v2.test.mjs`: SHA-256 über die Texte der 42 Dokumente stimmt mit dem der Referenz überein).
* **Neue Fälle** in `tests/eval/cases-v2.mjs` (`export const CASES_V2`, gleiches Tupel `[id, Kategorie, Text, [Fragmente], Profil?]`, Ids `v2a01`..., Kategorien `V2-<Gruppe>` und `NEG`): **mindestens 100 zusätzliche positive Fälle** (insgesamt dann mindestens 250), verteilt auf die elf positiven Gruppen der Taxonomie des Vorgängerplans (Direkte Identifikatoren, Kontakt, Geräte und Kennungen, Standort, Nummern, Geburt/Alter/Gehalt/Familie/Staatsangehörigkeit, Art. 9 (Profil `strict`), Art. 10 (Profil `strict`), Formatierung und Zeichen, Ausland, Zugangsdaten), je Gruppe **mindestens 5 und höchstens 25** Fälle; zusätzlich **60 Negativfälle** (Kategorie `NEG`, Ids `v2n01`...): Fachbegriffe, Ortsnamen in Firmennamen, Produktnummern, Datumsangaben ohne Personenbezug, Gesetzeszitate, Codebeispiele (insgesamt dann 80 Negativfälle).
* **Harness:** `run-eval.mjs` bekommt (a) den dritten Modus `fallback` (W1: `setAIMode('off')` plus `localAIMode = true`), (b) die Option `--set v2` (`CASES_V2` und `generateDocs2(98)`), (c) eigene Basisdatei `tests/eval/baseline-v2.json` (Format wie `baseline.json`, nur für die neuen Mengen und alle drei Modi). `baseline.json` erhält **nur** den neuen Schlüssel `fallback` mit den Messwerten (Handfälle je Kategorie, `synthLeaked`, `synthTotal`); bestehende Zahlen werden nicht verändert. `eval.test.mjs` bleibt unverändert grün; die Ratsche für die neue Menge prüft `tests/eval-v2.test.mjs` (gleiche Logik wie `eval.test.mjs`, liest `baseline-v2.json`; ein Test pro Modus, damit ein roter Modus lesbar bleibt).
* **Erste Messung:** Die neue Menge wird gemessen und die Zahlen in `baseline-v2.json` **als Ausgangsstand festgeschrieben** (das ist die erste Ratsche für diese Menge, keine Lockerung). Jedes Leck der neuen Menge ist ein Eintrag im Backlog (`docs/erkennung-entscheidungen.md`: Fall-Id, Gruppe, Modus; Entscheidung folgt in C1.1 bis C1.3).
**Abnahme:** `xvfb-run -a npm test` grün (alle alten Ratschen unverändert), `node tests/eval/diff-reference.mjs` 0 Abweichungen, `npm run eval -- --set v2` läuft und schreibt `baseline-v2.json`, Zahl der Fälle und Dokumente stimmt (≥ 100 neue positive, 60 neue Negative, 98 Dokumente).

## C1.r: Realistische Formate Ende-zu-Ende

**Marke:** S. **Aufwand:** 3 h. **Voraussetzung:** C1.0. **Erlaubte Dateien:** `tests/realdocs.test.mjs`, `tests/helpers.mjs`, `tests/eval/**`.
Dieselben Vorlagen (`generateDocs2`, die ersten 6 Vorlagen mit je 2 Dokumenten = 12 Dokumente) als **DOCX** (Node-seitig mit JSZip gebautes Minimal-DOCX, Tabellenzeile für Listenwerte), **PDF mit Textebene** (`makePdf` aus `helpers.mjs`), **TXT** (UTF-8) und **PDF als Bild** (OCR: Text auf ein Canvas zeichnen, als PNG in ein PDF drucken wie in `offline-ai.test.mjs`; nur 3 Dokumente, weil die OCR je Seite Sekunden braucht) erzeugen, über das Auswahlfeld laden (`setFiles`), mit KI-Modell anonymisieren (`setAIMode('auto')`, `loadAIModel()`), auf Klartextwerte (`truth.frags`) prüfen. Schwellen: DOCX/PDF/TXT mit Modell **höchstens 2 % Lecks** (Werte), OCR **höchstens 6 %** (Zeichenverwechslung ist kein Erkennungsfehler; Lecks zählen nur Fragmente ab 5 Zeichen). Die Schwellen sind im Test als Konstanten festgeschrieben; der Test gibt zusätzlich die Zahlen im Modus `fallback` aus (ohne Schwelle).
**Abnahme:** Test grün; Laufzeit unter 10 min; Lecks je Format im Bericht.

## C1.1 bis C1.3: Korpusschleife (mehrere Durchläufe)

**Marke:** S (Urteil je Fund). **Aufwand:** 3 Durchläufe à 3 h. **Voraussetzung:** C1.1: C1.0, C1.r, F1.b, F5; C1.2: C1.1 und C2.w; C1.3: C1.2. **Erlaubte Dateien:** `tests/eval/**`, `tests/golden/**`, `tests/realdocs.test.mjs`, `app/lib/detect.js`, `app/privacy-shield.html`, `docs/erkennung-entscheidungen.md`.
Ausgangspunkt und Verfahren: Vorgängerplan `05-dsgvo-testkorpus-und-ausreisser.md` (Taxonomie, Schleife je Durchlauf, Backlog); Korpusausbau und Realdokumente sind jetzt C1.0 und C1.r. Je Durchlauf: messen (alle Mengen, alle drei Modi), Funde nach Schwere und Gruppe ordnen, **je Fund eine Entscheidung** (Regel, Wörterbuch, Modell, bewusst offen) in `docs/erkennung-entscheidungen.md` (ein Absatz: Fall-Id, Entscheidung, Grund), beheben (Test zuerst rot), `node tests/eval/diff-reference.mjs --node` (Abweichungen nur an den erklärten Stellen; **die Referenz von 1.8.0 wird nie überschrieben**, erklärte Abweichungen stehen im Entscheidungsprotokoll), Ratschen nachziehen (`npm run eval:baseline`, `baseline-v2.json`, nur Verbesserungen), `npm run golden:update` nur bei beabsichtigter Änderung und den Diff **lesen**.

**Abnahmetabelle C1 (Abbruchkriterium der Schleife; "ohne Modell" meint den Modus `fallback`, W1):**

| Messung | Zielwert |
|---|---|
| bisherige 150 positive Fälle, mit Modell | höchstens 4 (Stand 1.8.0), keine Verschlechterung; `fallback` höchstens 12 |
| neue positive Fälle (mindestens 100), mit Modell | höchstens 3 % Lecks (bei 100 Fällen: 3) |
| synthetische Werte der 14 neuen Vorlagen (`generateDocs2`), mit Modell | höchstens 1 % Lecks |
| dieselben Messungen im Modus `fallback` | höchstens 8 % (neue Fälle) bzw. 5 % (Synthetik) |
| Negativfälle (80) und Fließtext ohne Personenbezug, alle Modi | 0 Fehlalarme |
| Realdokumente (DOCX/PDF/TXT), mit Modell | höchstens 2 % Lecks (OCR: höchstens 6 %) |
| Synthetik 42 Dokumente (`generateDocs(42)`) | höchstens 1 von 276 (mit Modell), `fallback` höchstens 11 |

Die Schleife endet, wenn die Tabelle erfüllt ist **oder** ein Durchlauf weniger als 10 % der verbleibenden Lecks beseitigt (dann Rest begründet als bekannte Lücke dokumentieren). Höchstens drei Durchläufe in 2.0.

**Backlog-Reihenfolge** (aus dem Vorgängerplan, mit Messwerten): (0) **Wortlisten immer aktiv, wenn keine KI-Treffer vorliegen (Befund P0):** `localAIMode` ist beim Start `false` und wird erst nach einem Modellstart oder -fehler wahr; wer die KI ausgeschaltet hat (`ps_ai_mode = off`) oder bei wenig Arbeitsspeicher (< 6 GB, kein Autostart) arbeitet, bekommt deshalb nur die Regeln (W0: 21 von 150 undicht) statt Regeln plus Wortlisten (W1: 12 von 150), obwohl das KI-Panel "Es gilt die Standard-Erkennung (Regeln und Wortlisten)" verspricht. Behebung: Wortlisten sind der Normalfall ohne KI-Treffer (`wordlists` Standard `true`, `localAIMode` entfällt). Folge: Der Referenzmodus `w0` weicht erklärt ab (Eintrag im Entscheidungsprotokoll, Umstellung der Harness-Modi auf `fallback`/`ki`); Lecks verbessern sich, Fehlalarme bleiben 0. (1) Namen im Ausfallmodus (W1: 12 undichte Handfälle, 11 synthetische Werte; W0 21/18), (2) GROSSGESCHRIEBENER Name mit Komma, (3) Spitznamen/Kurzformen/Genitiv, (4) Aufenthaltstitel, MRZ-Zeilen, weitere Ausweise, (5) OCR-Toleranz in Kennzahlen, (6) Soft-Hyphen/Zero-Width mit Offset-Abbildung. Punkt "Texte in Kopf-/Fußzeilen und Tabellen aus DOCX/PDF" ist mit B2.m2 erledigt (Tabellen liest mammoth, Kopf-/Fußzeilen und Fußnoten nicht).

---

## C2: Verknüpfung derselben Person (Koreferenz)

**Marke:** S. **Aufwand:** 4 h in zwei Paketen: **C2.m** (Modul `coref.js`, parallel, Voraussetzung F2) und **C2.w** (Einbindung in den Kern, seriell, Voraussetzung C2.m, C1.1, F1.b).

**Problem:** "Hans Müller", "Herr Müller", "Müller", "H. Müller", "Müllers" erhalten heute verschiedene Platzhalter (`{{NAME_1}}`, `{{NAME_2}}`, ...). Für eine KI, die den anonymisierten Text liest, sind das mehrere Personen; die Verarbeitung (Zusammenfassung, Fragen) wird schlechter.

**Entscheidung D19 (Voreinstellung ja):** Platzhalterform erweitern. `{{NAME_1}}` = volle Form; weitere Formen derselben Person tragen eine Endung nach dem Punkt: `{{NAME_1.NACHNAME}}`, `{{NAME_1.VORNAME}}`, `{{NAME_1.KURZ}}` (Initial plus Nachname). Die **Platzhalter-Grammatik** in `PSLib.placeholder` (F2) erlaubt die Endung bereits (`[A-ZÄÖÜ0-9_.\-]`); die HTML kennt sie noch nicht an diesen Stellen (Stand 1.8.0, werden in C2.w angepasst; Liste per `grep -nE '\{\{|\\\{\\\{' app/privacy-shield.html tests/eval/run-eval.mjs`): Überlagerung der Annotieren-Ansicht `tokenRx` (Zeile 5194, `[A-Z]+_[A-Za-z0-9\-_]+`) und `isToken` (Zeile 5223, dasselbe Muster) **erlauben keinen Punkt**, `tests/eval/run-eval.mjs` Zeile 27 (`[A-Z_0-9]+`); unkritisch sind `tok` (4864, `[^}]*`), die Prüfung in `postProcessSpans` (4728) und `impMap` (5402, `startsWith`/`endsWith`). Rückübersetzung bleibt **exakt**, weil jede Oberflächenform ihren eigenen Platzhalter behält (`deanon` ersetzt alle Schlüssel aus `store`, Punkte werden maskiert).

### C2.m: `app/lib/coref.js` (`PSLib.coref`), Test `tests/unit/coref.test.mjs`

```js
PSLib.coref.link(spans, text) -> spans
//  spans: [{ start, end, pfx, ... }]; nur pfx === 'NAME' wird betrachtet. Ergebnis: Kopie der Liste, jeder NAME-Span um
//  { personKey: string|null, form: 'VOLL'|'NACHNAME'|'VORNAME'|'KURZ'|null } ergänzt (andere Felder und andere Spans unverändert).
```

Regeln:
1. **Zerlegung** von `text.slice(start, end)`: führende Anreden/Titel entfernen (`Herr`, `Frau`, `Hr.`, `Fr.`, `Dr.`, `Prof.`, `Dipl.-Ing.`, `Mag.`, `Ing.`, `med.`, `jur.`, `rer. nat.` und Kombinationen); Namenszusätze (`von van de zu zur vom ter ten di da le la bin ibn der den dem`) gehören zum Nachnamen; ein Wort aus einem Buchstaben mit Punkt (`H.`) ist eine **Initiale**; Rest: Vornamen (alle Wörter vor dem Nachnamen), Nachname (letztes Wort samt Zusätzen und Bindestrichteilen). Ein Wort allein ist ein Nachname, wenn es im Text auch in einer VOLL-Form als Nachname vorkommt; sonst (Wort allein, keine VOLL-Form mit diesem Wort) ist es `VORNAME`, wenn es als Vorname einer VOLL-Form vorkommt; sonst ohne Verknüpfung (`personKey: null`).
2. **Formen:** `VOLL` = mindestens ein Vorname plus Nachname; `NACHNAME` = nur Nachname; `VORNAME` = nur Vorname; `KURZ` = Initiale plus Nachname.
3. **Normalisierung des Schlüssels:** Unicode NFC, Kleinschreibung; Genitiv-s (`Müllers` zu `Müller`) nur, wenn die Form ohne `s` als Nachname in einer VOLL-Form im Text vorkommt (länger als 3 Zeichen); Bindestrichnamen bleiben ein Wort (`Schmidt-Weber`); `Schmidt` allein verknüpft **nicht** mit `Schmidt-Weber`.
4. **Nur eindeutig:** `personKey` für `NACHNAME` nur, wenn genau **eine** VOLL-Person mit diesem Nachnamen im Text vorkommt; für `VORNAME` nur, wenn genau eine VOLL-Person diesen Vornamen hat; für `KURZ` nur, wenn genau eine VOLL-Person diesen Nachnamen **und** einen Vornamen mit diesem Anfangsbuchstaben hat. Sonst `personKey: null, form` bleibt die erkannte Form (z. B. `'NACHNAME'`) ohne Schlüssel. `personKey` der VOLL-Person: `<vorname>|<nachname>` normalisiert (alle Vornamen mit Leerzeichen).
5. Gleiche Person in mehreren VOLL-Schreibweisen (`Hans Müller`, `Hans-Peter Müller`) sind **verschiedene** Personen (kein Rätselraten).
**Tests (rot zuerst):** "Hans Müller ... Herr Müller ... Müllers Auto" ergibt `personKey` `hans|müller` und die Formen `VOLL`, `NACHNAME`, `NACHNAME`; zwei verschiedene Müller (`Hans Müller`, `Heike Müller`, dazu "Herr Müller"): der alleinstehende Nachname hat `personKey: null`; "H. Müller" mit genau einer Person "Hans Müller": `KURZ`, derselbe `personKey`; mit "Hans Müller" und "Heike Müller" und "H. Müller": `null`; "Anna Müller" und "Hans Müller" bleiben zwei Personen; `Schmidt` allein verknüpft nicht mit `Schmidt-Weber`; "Frau Dr. Anna Weber ... Frau Weber ... Anna allein": `VOLL`, `NACHNAME`, `VORNAME` mit gleichem Schlüssel; der Genitiv "Webers" verknüpft nur, wenn "Weber" als Nachname vorkommt; Spans anderer Typen (`ORG`) und ohne Namen bleiben unverändert; die Eingabeliste wird nicht verändert.

### C2.w: Einbindung in den Kern und Harness

**Erlaubte Dateien:** `app/lib/detect.js`, `app/privacy-shield.html`, `tests/eval/**`, `tests/golden/**`, `tests/unit/placeholder-usage.test.mjs`, `CHANGELOG.md`.
* **Vergabe der Platzhalter** (in `PSDetect.anonymize`, Schritt "Token von hinten nach vorne"): Bevor Token vergeben werden, `PSLib.coref.link` auf die NAME-Spans anwenden. Hat ein Span einen `personKey` (VOLL-Person im Text vorhanden), so wird beim **ersten** Auftreten der Person (in Vergaberichtung, also von hinten) die Nummer `n` aus `cnt.NAME` vergeben (`cnt.NAME++`); VOLL-Token ist `{{NAME_n}}`, die anderen Formen `{{NAME_n.NACHNAME}}`, `{{NAME_n.VORNAME}}`, `{{NAME_n.KURZ}}`; alle Spans der Person teilen `n`. Spans ohne `personKey` laufen wie bisher durch `tok()`. Dadurch bleibt die Nummerierung ohne Lücken, und Dokumente ohne verknüpfbare Formen liefern **bitgleiche** Ergebnisse wie vorher. Einträge in `store`: `{ v: <Schreibweise>, t: 'NAME', c, m }` je Platzhalter.
* **Stellen anpassen:** `tokenRx` und `isToken` in der Annotieren-Ansicht (Punkt zulassen), `run-eval.mjs` Zeile 27 auf `PSLib.placeholder.TOKEN_SOURCE`. Statischer Test `tests/unit/placeholder-usage.test.mjs`: keine Datei unter `app/` (außer `app/lib/placeholder.js` und `vendor`) und `tests/eval/` enthält mehr das alte Muster `[A-Z_0-9]+\\}\\}` oder `[A-Z]+_[A-Za-z0-9\\-_]+\\}\\}`.
* **Tests (rot zuerst):** (a) Einheitentest `tests/unit/detect.coref.test.mjs` mit `PSDetect.anonymize(text, { wordlists: true })` (Spans, die der Kern heute liefert, in Klammern; gemessen in P0): `"Hans Müller wohnt in Berlin. Herr Müller zahlt."` (Spans "Hans Müller", "Müller") ergibt genau `"{{NAME_1}} wohnt in Berlin. Herr {{NAME_1.NACHNAME}} zahlt."`; `"Frau Dr. Anna Weber ist Ärztin. Frau Weber hat angerufen. Anna kommt morgen."` (Spans "Dr. Anna Weber", "Weber", "Anna") ergibt `"Frau {{NAME_1}} ist Ärztin. Frau {{NAME_1.NACHNAME}} hat angerufen. {{NAME_1.VORNAME}} kommt morgen."`; `"Heike Müller und Hans Müller waren da. Herr Müller sagte nichts. H. Müller blieb."` bleibt **unverändert** gegenüber heute (`"{{NAME_4}} und {{NAME_3}} waren da. Herr {{NAME_2}} sagte nichts. {{NAME_1}} blieb."`, zwei Personen mit Nachnamen Müller: nichts wird verknüpft); `store['{{NAME_1.NACHNAME}}'].v === 'Müller'`; in jedem Fall `deanonymize` stellt den Text exakt wieder her. Bekannte Grenze: der Kern erkennt "Müllers Auto" heute als **einen** Namensspan ("Müllers Auto"); Genitivfälle hängen deshalb an der Spanerkennung (C1 Backlog Punkt 3), nicht an `coref`. (b) Rundlauf bitgleich über alle Korpusdokumente (Anonymisieren, `deanonymize` ergibt das Original). (c) Der Harness zählt Platzhalter mit Endung (`tokens` aus `PSLib.placeholder.find`). (d) **Referenz-Diff gelesen und erklärt:** `node tests/eval/diff-reference.mjs --node` zeigt Abweichungen **nur** in Fällen mit mehreren Namensformen derselben Person; jede Abweichung steht mit Fall-Id im Entscheidungsprotokoll; Lecks nicht schlechter, Fehlalarme 0; CHANGELOG-Eintrag "Platzhalterformat".
**Abnahme:** Unit-Tests und Harness (Lecks nicht schlechter), Rundlauf bitgleich, Golden-Diff gelesen und erklärt (ausdrücklich: Platzhalter verändern sich in Texten mit mehreren Namensformen), CHANGELOG-Eintrag.

---

## C3: Eigene Regeln und Richtliniendatei (`policy.json`)

**Marke:** S (Sicherheitsgrenze: Prüfer xhigh) für das Modul, S für die Oberfläche. **Aufwand:** 4 h in zwei Paketen: **C3.m** (Modul, parallel, Voraussetzung F2) und **C3.w** (Oberfläche und Kern, seriell, Voraussetzung C3.m, C1.1, F1.b).

**Befund 1.8.0:** Es gibt bereits "Eigene Variablen" (`cvars`, Bereich "Eigene Variablen": Name und Muster, `addCV`, nicht gespeichert, Muster wird **ungeprüft** als `new RegExp(p, 'g')` über den ganzen Text ausgeführt; Treffer erhalten `prio 0`, `meth 'Eigene Regel'`, Typ = Name). Das Muster `(a+)+$` friert die App ein. Messung: ein Muster mit zwei überlappenden unbegrenzten Quantoren (`.*.*b`) braucht auf 2.000 Zeichen 3,3 s, geschachtelte Quantoren (`(a|aa)+$` auf 41 Zeichen) über 3 s.

**Nutzen:** Firmen haben eigene Kennungen (Kundennummer `K-123456`, Projektnamen, Interna) und wollen das ohne Programmänderung festlegen und im Team teilen.

**Format `policy.json` (Version 1):**

```json
{ "version": 1,
  "name": "Kanzlei Beispiel",
  "rules": [
    { "id": "kunde", "label": "Kundennummer", "type": "regex", "pattern": "K-\\d{6}", "flags": "", "category": "EIGEN", "profiles": ["*"] },
    { "id": "projekte", "label": "Projektnamen", "type": "list", "terms": ["Projekt Falke", "Alpha-Programm"], "caseSensitive": false, "category": "EIGEN", "profiles": ["standard", "strict"] }
  ] }
```

Felder: `version` (1), `name` (Text bis 80 Zeichen), `rules` (bis 100); je Regel: `id` (`^[a-z][a-z0-9_-]{0,31}$`, eindeutig), `label` (bis 80 Zeichen), `type` (`regex` oder `list`), bei `regex`: `pattern` (bis 200 Zeichen), `flags` (`""` oder `"i"`); bei `list`: `terms` (1 bis 5.000 Begriffe je Datei insgesamt, je Begriff 1 bis 200 Zeichen, beginnt mit Buchstabe oder Ziffer), `caseSensitive` (Standard `false`); `category` (`^[A-Z][A-Z0-9_]{1,19}$`, Standard `EIGEN`; wird der Platzhaltertyp `{{EIGEN_1}}`), `profiles` (Liste von Profil-Ids oder `["*"]`, Standard `["*"]`), `enabled` (Standard `true`). Dateigröße höchstens 1 MiB.

**Modul:** `app/lib/policy.js` (`PSLib.policy`), Test `tests/unit/policy.test.mjs`.

```js
PSLib.policy.parse(jsonString) -> { ok: true, policy } | { ok: false, errors: [string] }
PSLib.policy.checkPattern(pattern, flags) -> { ok: true } | { ok: false, error: string }     // auch für die bestehenden "Eigenen Variablen"
PSLib.policy.toSpans(policy, text, profileId) -> [{ start, end, pfx, col: '#ff3b30', id: 'custom', prio: 0, meth: 'Eigene Regel', hard: true, val }]
```

**Sicherheitsgrenze: sichere Teilmenge statt Zeitgrenze.** Der erste Entwurf verlangte eine 50-ms-Probe je Muster; **das ist nicht umsetzbar**, weil sich eine laufende JavaScript-Regex im selben Thread nicht abbrechen lässt (gemessen: `(a+)+$` auf 29 Zeichen läuft nicht in 3 s zu Ende). Stattdessen erzwingt `checkPattern` eine **Teilmenge, in der die Laufzeit linear mit dem Text wächst** (gemessen: `a{1,30}a{1,30}b` auf 100.000 Zeichen 0,46 s; `a{1,10}a{1,10}a{1,10}b` 0,73 s; `K-\d{6}` 5 ms; geschachtelte Wiederholungen `(?:a{1,10}){1,10}b` dagegen über 20 s):
1. Länge höchstens 200 Zeichen; `flags` nur `""` oder `"i"`; gültige Regex-Syntax (`new RegExp` ohne Ausnahme).
2. **Keine unbegrenzten Quantoren:** `*`, `+` und `{n,}` sind verboten; jeder Quantor `{m,n}` hat `n` höchstens 64; `?` und `{n}` sind erlaubt. Fehlermeldung: "Unbegrenzte Wiederholungen (* und +) sind nicht erlaubt. Schreiben Sie z. B. {1,20}."
3. **Kein Quantor auf einer Gruppe** außer `?` (also `(…)*`, `(…)+`, `(…){m,n}` verboten); Alternation `|` ist nur auf oberster Ebene und in Gruppen ohne Quantor erlaubt.
4. **Produkt der oberen Grenzen** aller Quantoren (`?` zählt 2, `{m,n}` zählt `n`, `{n}` zählt 1) höchstens **1000**.
5. Verboten: Rückverweise (`\1`..`\9`, `\k<`), Vorausschau und Rückschau (`(?=`, `(?!`, `(?<=`, `(?<!`), benannte Gruppen (`(?<`).
**Listenbegriffe** werden **ohne Alternation** gesucht (gemessen: eine Alternation aus 5.001 Begriffen braucht auf 100.000 Zeichen 4 s, 1.001 Begriffe 66 ms): ein Wortindex nach dem ersten Wort jedes Begriffs; Wortgrenzen Unicode-fest im Stil der Kernregeln: davor und danach darf kein Buchstabe, keine Ziffer und kein `_` stehen (`\p{L}\p{N}_`). Groß-/Kleinschreibung ohne Beachtung: zeichenweise Kleinschreibung, die die Länge erhält (U+0130 bleibt unverändert), Positionen beziehen sich auf den Originaltext. Messwert: Wortindex-Suche 1.001 Begriffe auf 100.000 Zeichen 85 ms.
**`parse`-Regeln:** JSON-Fehler, `version` ungleich 1, fehlende Felder, doppelte `id`, Grenzüberschreitungen, jedes `checkPattern`-Ergebnis `ok: false` ergeben je eine deutsche Fehlerzeile mit Regel-Id (nie der Inhalt eines Begriffs); die Schlüssel `__proto__`, `constructor`, `prototype` an **beliebiger** Stelle ergeben den Fehler "Verbotener Schlüssel" und `ok: false`; die Ergebnisobjekte werden aus den erlaubten Feldern **neu aufgebaut** (unbekannte Felder werden verworfen, nicht kopiert), `Object.prototype` bleibt unverändert.
**`toSpans`:** nur Regeln mit `enabled !== false` und `profiles` enthält `"*"` oder `profileId`; vor der Suche werden Platzhalter mit `PSLib.placeholder.mask(text)` (`\u0000`) unkenntlich gemacht, Treffer, die ein `\u0000` enthalten, entfallen; Ergebnis nach `start` sortiert, Treffer verschiedener Regeln dürfen sich überschneiden (der Kern löst auf); `pfx` = `category`.
**Tests (rot zuerst):** gültige Datei; Version 2; fehlendes Feld; doppelte `id`; Tabelle der Muster: **angenommen** `K-\d{6}`, `VTR-\d{4,8}`, `[A-Z]{2}\d{5,10}`, `(?:Projekt|Vorgang)[ -]\d{3,6}`, `\d{3}\.\d{3}\.\d{3}`, `ab(cd)?ef`; **abgelehnt** `K-\d+`, `\w*x`, `(a+)+$`, `(a|aa)+$`, `(a|b){1,5}`, `(\d{1,3}){1,3}`, `(?=x)y`, `(?<!x)y`, `(a)\1`, `a{1,65}`, `a{1,10}b{1,10}c{1,10}d{1,2}` (Produkt 2.000), ein Muster mit 201 Zeichen, Flags `g`/`u`/`m`, Syntaxfehler `(`; eine Regel mit `profiles: ["strict"]` greift nur im Profil `strict`; Listenbegriff "Alpha-Programm" trifft "alpha-programm" bei `caseSensitive: false`, nicht "Alpha-Programmierer" und nicht "xAlpha-Programm"; **Laufzeittests:** das ungünstigste zulässige Muster `a{1,10}a{1,10}a{1,10}b` auf 100.000 × `a` in unter 3 s; 1.000 Begriffe und 5.000 Begriffe auf 100.000 Zeichen je unter 500 ms; Spans enthalten nie einen Platzhalterbereich (`{{NAME_1}}`, auch `K-123456` innerhalb von `{{...}}` bleibt unberührt); JSON mit `"__proto__": {"polluted": true}` (oberste Ebene und in einer Regel): `ok: false`, `({}).polluted === undefined`; JSON über 1 MiB wird abgelehnt.
**Abnahme (Modul):** Unit-Tests grün; Prüfer (Sonnet xhigh) bestätigt die Sicherheitsgrenze (jede zulässige Eingabe läuft in Zeit proportional zur Textlänge).

### C3.w: Oberfläche und Kern

**Erlaubte Dateien:** `app/privacy-shield.html`, `app/lib/detect.js`, `tests/policy.test.mjs`.
* **Kern:** `PSDetect.detect/anonymize` nehmen die Option `extraSpans` (siehe F1; von `PSLib.policy.toSpans(policy, normalizedText, profileId)` berechnet) in Pass 1 auf (wie die bisherigen `cvars`, Vorrang `prio 0`).
* **Oberfläche (S):** Bereich "Eigene Regeln" (neben dem vorhandenen Bereich "Eigene Variablen"): Begriffe hinzufügen (ein Begriff je Zeile), Muster hinzufügen (mit Testfeld "Beispieltext, Treffer werden markiert" und der Fehlermeldung von `checkPattern`), Import/Export `policy.json`, Schalter je Regel. Die "Eigenen Variablen" prüfen ihr Muster mit `PSLib.policy.checkPattern` und lehnen unzulässige Muster mit derselben Meldung ab. Eigene Treffer zählen als Kategorie "Eigen" in Bericht (nur die **Zahl** der Regeln, `customRuleCount`) und Prüfansicht. Persistenz: `localStorage['ps_policy_v1']` nur für die Richtlinie (Regeln, keine Dokumenteninhalte) mit Hinweis im Bereich.
* **E2E (`tests/policy.test.mjs`):** Datei per `setFiles` importieren, Dokument mit "Kunde K-123456 betreut Projekt Falke" anonymisieren: beide Treffer maskiert (`{{EIGEN_1}}`, `{{EIGEN_2}}`), Rundlauf exakt; ein Bericht (A2) nennt `Eigene Regeln: 2` und enthält weder "K-123456" noch "Falke" noch das Muster; ein unzulässiges Muster `(a+)+$` im Testfeld zeigt die Fehlermeldung und friert die App nicht ein (Seite antwortet innerhalb 2 s); Neustart der Seite lädt die gespeicherte Richtlinie.
**Abnahme:** Unit-Tests grün; End-to-End: Regel importieren, Dokument anonymisieren, Treffer maskiert, Bericht nennt Zahl der eigenen Regeln (nicht die Muster).

---

## C4: Weitere Sprachen (Kann)

**Marke:** S. **Ansatz:** je Sprache (EN, FR, ES, IT, PL, NL) 40 positive und 15 negative Fälle schreiben (Anreden, Titel, Monatsnamen, Adressformen, Ausweis- und Steuerkennungen; Namen übernimmt das mehrsprachige Modell). Erst messen (wo ist die Lücke?), dann Regeln ergänzen. Zielwerte wie C1, je Sprache. Reihenfolge nach Kundennachfrage (Entscheidung beim Nutzer).
