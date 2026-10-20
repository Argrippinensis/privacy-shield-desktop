# V2-C: Erkennung (C1 bis C4)

Regeln und Rollen: `V2-00-INDEX.md`. Maßstab bleibt das **Leck** (ein personenbezogener Wert steht nach dem Anonymisieren noch im Text) und der **Fehlalarm** (Text ohne Personenbezug wird maskiert). Jede Änderung läuft durch den Harness (`npm run eval`), die Ratsche und den Golden-Stand; neue Fehler **immer zuerst als roter Fall** in `tests/eval/cases*.mjs`.

---

## C1: Korpusschleife (mehrere Durchläufe)

**Marke:** S (Urteil je Fund). **Aufwand:** 3 Durchläufe à 3 h. **Voraussetzung:** F2; nach F1 laufen Teile als Unit-Tests.
Ausgangspunkt und Verfahren: Vorgängerplan `05-dsgvo-testkorpus-und-ausreisser.md` (Taxonomie, Schleife je Durchlauf, Backlog). Hier die **Ergänzungen für 2.0**:

**Korpus-Ausbau (Test-Autor, Sonnet niedrig; Durchlauf 1):**
* Neue Dokumentvorlagen in `tests/eval/generate.mjs` (je 7 Dokumente, fester Seed; `SYNTH_DOCS` steigt von 42 auf 98 = 14 Vorlagen x 7, **Basis erst nach Abschluss des Durchlaufs neu schreiben**): Arztbrief, Arbeitszeugnis, Kündigung, Mietvertrag, Gesprächsprotokoll mit Sprecherkürzeln, E-Mail-Verlauf mit Signaturen, CSV-Export (Kunden), Chatverlauf, Bewerbung/Lebenslauf, Rechnung mit Positionen, Gutachten, Schadensmeldung (Versicherung), Behördenbescheid, Krankmeldung.
* Neue Fälle in `tests/eval/cases-gdpr.mjs` bis **mindestens 250 positive Fälle** insgesamt (heute 150): je Gruppe 15 bis 25. Zusätzlich 60 Negativfälle (Text ohne Personenbezug: Fachbegriffe, Ortsnamen in Firmennamen, Produktnummern, Datumsangaben ohne Personenbezug, Gesetzeszitate, Codebeispiele).
* **Realistische Formate Ende-zu-Ende** (`tests/realdocs.test.mjs`): dieselben Vorlagen als DOCX, PDF mit Textebene, PDF als Bild (OCR) und TXT erzeugen (mit jsPDF und JSZip im Test; OCR-Bild über Canvas), laden, anonymisieren, auf Klartextwerte prüfen. OCR-Dokumente haben eine **eigene** Schwelle (Zeichenverwechslung ist kein Erkennungsfehler).

**Entscheidung je Fund** (wie im Vorgängerplan): Regel, Wörterbuch, Modell, bewusst offen. Dokumentiert in `docs/erkennung-entscheidungen.md` (ein Absatz je Fund: Fall-ID, Entscheidung, Grund).

**Abnahmetabelle C1 (Abbruchkriterium der Schleife):**

| Messung | Zielwert |
|---|---|
| bisherige 150 positive Fälle, mit Modell | höchstens 4 (Stand 1.8.0), keine Verschlechterung |
| neue Fälle (mindestens 100 zusätzliche), mit Modell | höchstens 3 % Lecks |
| synthetische Werte der 14 Vorlagen, mit Modell | höchstens 1 % Lecks |
| dieselben Messungen ohne Modell | höchstens 8 % bzw. 5 % |
| Negativfälle (80) und Fließtext ohne Personenbezug | 0 Fehlalarme |
| Realdokumente (DOCX/PDF/TXT), mit Modell | höchstens 2 % Lecks (OCR: höchstens 6 %) |

Die Schleife endet, wenn die Tabelle erfüllt ist **oder** ein Durchlauf weniger als 10 % der verbleibenden Lecks beseitigt (dann Rest begründet als bekannte Lücke dokumentieren). Höchstens drei Durchläufe in 2.0.

**Backlog-Reihenfolge** (aus dem Vorgängerplan, erweitert): (1) Namen im Wortlistenmodus (Ausfallsicherheit, wenn das Modell fehlt), (2) GROSSGESCHRIEBENER Name mit Komma, (3) Spitznamen/Kurzformen/Genitiv, (4) Aufenthaltstitel, MRZ-Zeilen, weitere Ausweise, (5) OCR-Toleranz in Kennzahlen, (6) Soft-Hyphen/Zero-Width mit Offset-Abbildung, (7) Texte in Kopf-/Fußzeilen und Tabellen aus DOCX/PDF (Extraktion prüfen: Werden sie überhaupt ausgelesen?).

---

## C2: Verknüpfung derselben Person (Koreferenz)

**Marke:** S. **Aufwand:** 4 h. **Voraussetzung:** C1 Durchlauf 1; F1 (Go) empfohlen.

**Problem:** "Hans Müller", "Herr Müller", "Müller", "H. Müller", "Müllers" erhalten heute verschiedene Platzhalter (`{{NAME_1}}`, `{{NAME_2}}`, ...). Für eine KI, die den anonymisierten Text liest, sind das fünf Personen; die Verarbeitung (Zusammenfassung, Fragen) wird schlechter.

**Entscheidung D19 (Voreinstellung ja):** Platzhalterform erweitern. `{{NAME_1}}` = volle Form; weitere Formen derselben Person tragen eine Endung nach dem Punkt: `{{NAME_1.NACHNAME}}`, `{{NAME_1.VORNAME}}`, `{{NAME_1.KURZ}}` (Initial plus Nachname). Das Muster für Platzhalter wird überall `\{\{[A-Z_0-9]+(?:\.[A-Z_]+)?\}\}`. **Alle** Stellen, die das alte Muster verwenden, werden angepasst (Harness, Gegenprüfung A1, Bericht, Rückübersetzung, Hervorhebung); `grep -rn "A-Z_0-9\]+\\\\}\\\\}" app tests` liefert die Liste. Begründung: Rückübersetzung bleibt **exakt**, weil jede Oberflächenform ihren eigenen Platzhalter behält, die Person aber erkennbar dieselbe ist.

**Modul:** `app/lib/coref.js` (`PSLib.coref`), Test `tests/unit/coref.test.mjs`.

```js
PSLib.coref.link(spans, text) -> spans   // ergänzt je Name-Span { personKey, form: 'VOLL'|'NACHNAME'|'VORNAME'|'KURZ' }
```

Regeln: Verknüpft wird **nur eindeutig**: Ein alleinstehender Nachname wird mit der vollen Form verknüpft, wenn im Dokument genau **eine** Person mit diesem Nachnamen vorkommt; bei zwei Personen gleichen Nachnamens (zwei "Müller" mit verschiedenen Vornamen) bleibt der alleinstehende Nachname **eigener Platzhalter** (lieber nicht verknüpfen als falsch). Anrede ("Herr", "Frau", "Dr.", "Prof.") gehört nicht zum Schlüssel. Genitiv-s und Bindestrichnamen werden normalisiert (`Müllers` zu `Müller`, `Schmidt-Weber` bleibt ein Name; `Schmidt` allein verknüpft **nicht** automatisch mit `Schmidt-Weber`).

**Tests (rot zuerst):** "Hans Müller ... Herr Müller ... Müllers Auto" ergibt dieselbe Person, Formen `VOLL`, `NACHNAME`, `NACHNAME`; zwei verschiedene Müller: keine Verknüpfung des alleinstehenden Nachnamens; "H. Müller" mit einer Person "Hans Müller": `KURZ`; "Anna Müller" und "Hans Müller" bleiben zwei Personen; Rundlauf bitgleich über alle Korpusdokumente; Platzhaltermuster-Test: Harness zählt neue Platzhalter korrekt.

**Abnahme:** Unit-Tests und Harness (Lecks nicht schlechter), Rundlauf bitgleich, Golden-Diff gelesen und erklärt (ausdrücklich: Platzhalter verändern sich in Texten mit mehreren Namensformen), CHANGELOG-Eintrag "Platzhalterformat".

---

## C3: Eigene Regeln und Richtliniendatei (`policy.json`)

**Marke:** H für das Modul (volle Spezifikation), S für die Oberfläche. **Aufwand:** 4 h. **Voraussetzung:** F2.

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

**Modul:** `app/lib/policy.js` (`PSLib.policy`), Test `tests/unit/policy.test.mjs`.

```js
PSLib.policy.parse(jsonString) -> { ok: true, policy } | { ok: false, errors: [string] }
PSLib.policy.toSpans(policy, text, profileId) -> [{ start, end, pfx: 'EIGEN', value, prio, hard: true }]
```

Sicherheits- und Robustheitsregeln (**Wiederholungsangriffe auf reguläre Ausdrücke, "ReDoS"**): Muster höchstens 200 Zeichen; höchstens 100 Regeln, höchstens 5.000 Begriffe; keine Rückverweise (`\1`), keine Lookbehinds mit variabler Länge, **keine verschachtelten Quantoren** (`(a+)+`, `(a*)*`, `(a|aa)+`: konservative Prüfung per Muster-Heuristik); beim Import wird jedes Muster gegen drei Angriffszeichenfolgen (je 5.000 Zeichen) mit **50 ms** Zeitgrenze geprüft; bei Überschreitung wird die Regel abgelehnt (Fehlermeldung mit Regel-ID). Ausführung zeilenweise auf höchstens 5.000 Zeichen je Aufruf. Listenbegriffe werden als **Wörter mit Grenzen** gesucht (Unicode-fest, wie in den Kernregeln, kein `\b`).

**Tests (rot zuerst):** gültige Datei; unbekannte Version (`errors`); fehlendes Feld; Muster `(a+)+$` wird abgelehnt (Zeitgrenze im Test 1 s); Muster mit 201 Zeichen abgelehnt; Regel mit `profiles` greift nur im genannten Profil; Listenbegriff "Alpha-Programm" trifft "alpha-programm" bei `caseSensitive: false`, nicht in "Alpha-Programmierer"; 1.000 Begriffe auf 100.000 Zeichen in unter 500 ms; Spans überschneiden sich nie mit Platzhaltern; **JSON mit Prototype-Pollution** (`__proto__`) wird sicher behandelt.

**Oberfläche (S):** Bereich "Eigene Regeln": Begriffe hinzufügen (ein Begriff je Zeile), Muster hinzufügen (mit Testfeld "Beispieltext, Treffer werden markiert"), Import/Export `policy.json`, Schalter je Regel. Eigene Treffer haben Vorrang vor weichen Regeln (`prio` hoch) und zählen als Kategorie "Eigen" in Bericht und Prüfansicht. Persistenz: `localStorage` nur für **Regeln** (keine Dokumenteninhalte), mit Hinweis.

**Abnahme:** Unit-Tests grün; End-to-End: Regel importieren, Dokument anonymisieren, Treffer maskiert, Bericht nennt Zahl der eigenen Regeln (nicht die Muster).

---

## C4: Weitere Sprachen (Kann)

**Marke:** S. **Ansatz:** je Sprache (EN, FR, ES, IT, PL, NL) 40 positive und 15 negative Fälle schreiben (Anreden, Titel, Monatsnamen, Adressformen, Ausweis- und Steuerkennungen; Namen übernimmt das mehrsprachige Modell). Erst messen (wo ist die Lücke?), dann Regeln ergänzen. Zielwerte wie C1, je Sprache. Reihenfolge nach Kundennachfrage (Entscheidung beim Nutzer).
