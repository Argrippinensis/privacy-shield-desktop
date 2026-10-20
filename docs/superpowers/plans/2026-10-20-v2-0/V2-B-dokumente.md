# V2-B: Dokumente (B1 bis B3)

Regeln und Rollen: `V2-00-INDEX.md`. Neue Logik als Module mit Unit-Tests (Architekturregel 1).

---

## B1: Mehrfachauswahl, Projekt mit gemeinsamen Platzhaltern, ZIP-Export

**Marke:** S. **Aufwand:** 4 h. **Voraussetzung:** A2 (Bericht), A3 (Zuordnung), A4 (Dateinamen).

**Befund 1.8.0:** `<input id="FI" ... multiple>` und Drop-Zone nehmen mehrere Dateien an, verarbeiten aber nur `files[0]` (`app/privacy-shield.html`, `await loadF(files[0])`, `e.dataTransfer.files[0]`). Der Rest wird **ohne Meldung verworfen**.

- [ ] **Sofortfix (eigener Commit, H):** Wählt der Nutzer mehr als eine Datei, zeigt die App bis zur Fertigstellung von B1 eine Meldung "Es wird nur die erste Datei geladen (Name). Die übrigen Dateien werden ab Version 2.0 gemeinsam verarbeitet." Test: zwei Dateien wählen, Meldung erscheint (kein stilles Verwerfen).

**Modul:** `app/lib/project.js` (`PSLib.project`), Test `tests/unit/project.test.mjs`. Der Erkennungskern wird **hineingereicht** (`anonymize` aus F1 oder die Fassade).

```js
const p = PSLib.project.create({ shared: true })           // shared: gleicher Wert = gleicher Platzhalter über alle Dokumente
PSLib.project.add(p, { name, text })  -> id                  // Grenzen: 200 Dokumente, 200 MB Text insgesamt (PSProjectError('LIMIT'))
PSLib.project.remove(p, id)
await PSLib.project.run(p, { anonymize, profile, onProgress, signal }) -> { results: [{ id, index, text, counts, error? }], state }
PSLib.project.index(p) -> [{ id, index, status: 'wartet'|'laeuft'|'fertig'|'fehler' }]
```

Regeln: Platzhalter-Zähler gemeinsam über alle Dokumente (`{{NAME_1}}` in Dokument 1 und 2 ist **dieselbe** Person); mit `shared: false` je Dokument getrennt. Abbruch über `AbortSignal` zwischen zwei Dokumenten. Fehler in einem Dokument stoppen die übrigen nicht; `error` enthält Art, nie den Text.

**Tests (rot zuerst):**
* Zwei Dokumente mit demselben Namen: gleicher Platzhalter (`shared: true`), verschiedene bei `shared: false`.
* Reihenfolge und Nummerierung stabil; Fehlerdokument erhält `status: 'fehler'`, Folgedokumente laufen.
* Abbruch nach Dokument 2 von 5: Dokumente 1 und 2 fertig, 3 bis 5 `wartet`.
* Grenzen: 201. Dokument wirft `LIMIT`; Gesamtgröße über 200 MB wirft `LIMIT`.
* Rundlauf über das Projekt: Alle Ergebnisse mit dem gemeinsamen Zustand zurückübersetzt sind gleich den Originalen.
* Dateinamen im ZIP-Plan (`PSLib.project.zipPlan(results, opts)`): `anonymisiert_001.txt` ... plus `bericht.txt`, `bericht.json`, optional `zuordnung.psmap`; **kein** Originalname in der Liste (Standard).

**Oberfläche (S, Sonnet niedrig bis mittel, Skill `frontend-design`, Prüfer mit Screenshots):**
* Dokumentenliste (links oder oben): Nummer, Größe, Status mit Text und Farbe **und** Symbol (nicht nur Farbe), Entfernen-Knopf. Einzeldatei bleibt wie bisher (kein Zwang zum Projekt).
* Auswahl mehrerer Dateien oder Drop mehrerer Dateien füllt die Liste (Format-Prüfung je Datei mit Meldung bei nicht unterstützten Dateien, `.doc` mit eigener Meldung).
* "Alle anonymisieren" mit Fortschritt "3 von 12" und "Abbrechen". Je Dokument Gegenprüfung (A1) mit Zusammenfassung "12 Dokumente, 2 mit möglichen Resten".
* Ergebnis: Klick auf ein Dokument zeigt Original und Ergebnis (bestehende Ansicht). "Alles als ZIP speichern" (JSZip aus `app/vendor/jszip`): Ergebnisse, Bericht, optional verschlüsselte Zuordnung (Passwortdialog aus A3).
* Der KI-Lauf je Dokument nutzt den bestehenden Worker nacheinander; Speicher: Modell bleibt geladen, Leerlaufzeitgeber (5 min) pausiert während des Projektlaufs.

**End-to-End-Tests (`tests/project.test.mjs`):** 3 Dateien (txt, docx, pdf aus dem Testkorpus) in einem Lauf; gleicher Name in allen drei ergibt denselben Platzhalter; ZIP enthält die erwarteten Dateien; ZIP-Inhalt enthält keine Klartextwerte (Fragment-Suche über alle Ergebnisdateien); Rückübersetzung über geladene `.psmap` stellt alle drei exakt wieder her.

**Abnahme:** Unit- und End-to-End-Tests grün; Leistung: 50 Dokumente à 20.000 Zeichen ohne KI in unter 30 s; Speicher nach dem Lauf und Entladen unter 1 GB; Screenshots (1280 und 900 Pixel Breite) vom Prüfer gesichtet.

---

## B2: Weitere Formate

**Marke:** H (Spezifikation vollständig, Tests mit Fixtures). **Aufwand:** 4 h. **Voraussetzung:** F2 Schritt 1.

**Modul:** `app/lib/formats.js` (`PSLib.formats`), Test `tests/unit/formats.test.mjs`. Reine Funktionen auf **Zeichenketten und Byte-Feldern**; das Entpacken übernimmt JSZip (bereits gebündelt, `app/vendor/jszip/jszip.min.js`, im Test per `require`).

```js
PSLib.formats.extractXlsx(jszipInstance)  -> { text, sheets: n }     // sharedStrings + Zellen, je Blatt Überschrift "== Blatt <n> ==", Zellen mit Tab, Zeilen mit Zeilenumbruch
PSLib.formats.extractOdf(jszipInstance)   -> { text }                // content.xml: text:p, text:h, text:span, Tabellenzellen
PSLib.formats.extractPptx(jszipInstance)  -> { text, slides: n }     // ppt/slides/slideN.xml (a:t), Notizen (ppt/notesSlides)
PSLib.formats.extractEml(rawString)       -> { text, hadAttachments: boolean }   // Kopf (From/To/Cc/Subject/Date), Text/Plain bevorzugt, sonst HTML entfernt; quoted-printable und base64 dekodiert, Charset utf-8/latin1
PSLib.formats.extractHtml(htmlString)     -> { text }                // Tags, Skripte, Styles entfernt, Entitäten dekodiert, Absätze bleiben
PSLib.formats.guard(jszipInstance)        -> void | throws PSFormatError('TOO_BIG'|'TOO_MANY'|'RATIO')   // ZIP-Grenzen
PSLib.formats.detect(filename, firstBytes) -> 'txt'|'pdf'|'docx'|'xlsx'|'odt'|'ods'|'odp'|'pptx'|'eml'|'html'|'csv'|'md'|'json'|'rtf'|'doc'|'unknown'
```

Sicherheitsregeln (für alle ZIP-Formate): höchstens 2.000 Einträge, höchstens 200 MB entpackt insgesamt, Verhältnis entpackt zu gepackt höchstens 100; **keine** XML-Parser mit Entitätserweiterung: Textauszug per einfachem Zeichenstrom (Tags überspringen, nur die fünf vordefinierten Entitäten und numerische Zeichenverweise dekodieren, DOCTYPE/ENTITY-Deklarationen ignorieren); keine Ausführung von Makros oder Skripten; Anhänge von E-Mails werden **nicht** geöffnet, nur gezählt.

`.doc` (binär, Word 97-2003): `detect` liefert `'doc'`; die Oberfläche zeigt **ehrlich**: "Dateien im alten .doc-Format werden nicht unterstützt. Bitte in Word als .docx speichern." (Heute akzeptiert die Auswahl `.doc`, und `mammoth` kann sie nicht lesen.)

**Tests (rot zuerst; Fixtures werden im Test mit JSZip erzeugt, keine Binärdateien einchecken):**
* `extractXlsx`: Blatt mit 3 Zeilen, gemeinsamen Zeichenketten, Inline-Strings und Zahlen; Ausgabe exakt.
* `extractOdf`: Absätze, Überschrift, Tabelle; Zeilenumbruch `text:line-break`, Leerzeichen `text:s`.
* `extractPptx`: zwei Folien, Notizen; Reihenfolge nach Foliennummer (nicht alphabetisch: `slide10` nach `slide2`).
* `extractEml`: einfache Mail; multipart/alternative mit text/plain und text/html (nimmt plain); quoted-printable (`=C3=BC` zu `ü`); base64-Körper; Kopfzeilen mit Umbruchfortsetzung und `=?UTF-8?B?...?=`-Kodierung; Anhang wird gezählt, nicht gelesen.
* `extractHtml`: `<script>alert(1)</script>` verschwindet vollständig samt Inhalt; `<style>` ebenso; `&amp;`, `&auml;`, `&#252;` dekodiert; `<br>` und `</p>` ergeben Zeilenumbrüche.
* `guard`: synthetisches ZIP mit 2.001 Einträgen wirft `TOO_MANY`; ZIP-Bombe (1 MB entpackt 500 MB, per Metadaten im Test simuliert) wirft `TOO_BIG` oder `RATIO`, **ohne** zu entpacken (Test mit Zeitgrenze 200 ms).
* XML mit `<!DOCTYPE x [<!ENTITY a "AAAA...">]>` und `&a;`: Ausgabe enthält `&a;` unverändert oder nichts, **nie** die Erweiterung.
* `detect`: Endung und Magic-Bytes (`PK` bei ZIP-Formaten, `%PDF`, `{\rtf`, `D0CF11E0` bei `.doc`); Endung `.docx` mit falschem Inhalt ergibt `'unknown'`.

**Oberfläche (H/S):** Auswahlfilter `accept` erweitert um `.xlsx,.ods,.odt,.odp,.pptx,.eml,.html,.htm`; `loadF` ruft `PSLib.formats.detect` und die passende Funktion; Fehler mit klaren Texten (kein Rohtext der Datei in Meldungen). End-to-End: je Format ein Beispiel (aus Testkorpus-Generator erzeugt) lädt, anonymisiert, enthält keine Klartextwerte im Ergebnis.

**Abnahme:** Unit-Tests grün; End-to-End je Format grün; Fuzz-Test aus F4 (kaputte ZIPs) ohne Absturz und innerhalb der Zeitgrenze.

---

## B3: Formattreuer Export (Kann, nicht für 2.0 geplant)

**Marke:** S. **Ziel:** Ergebnis als **DOCX/XLSX mit erhaltener Formatierung** (Absätze, Überschriften, Tabellen), nicht als Klartext.
**Ansatz:** Je Absatz (`w:p`) die Texte der Läufe (`w:r/w:t`) zu einer Zeichenkette zusammensetzen, Erkennung auf dieser Kette, Fundstellen auf die Läufe zurückrechnen (Treffer über Lauf-Grenzen: Ersatz im ersten Lauf, Rest der Treffer in Folgeläufen entfernen), Formatierung des ersten Laufs erhalten; XLSX je Zelle. Tabellen, Kopf-/Fußzeilen, Textfelder, Fußnoten und Kommentare **mitführen** (häufigste Leckquelle: Texte außerhalb des Fließtextes). Dokumenteigenschaften (`docProps/core.xml`: Autor, letzter Bearbeiter) leeren.
**Risiko:** hoch (Lauf-Grenzen, versteckter Text, verfolgte Änderungen). **Vorarbeit:** Spike mit 20 echten Beispiel-DOCX (ohne Kundendaten, selbst erzeugt), Leckquote und Optik messen; erst bei Erfolg einplanen.
