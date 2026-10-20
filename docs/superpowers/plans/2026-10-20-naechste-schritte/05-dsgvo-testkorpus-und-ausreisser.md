# WP 05: DSGVO-Testkorpus und Ausreißer-Schleife

**Ziel:** Das Werkzeug mit breitem, realistischem und feindseligem Material prüfen, jeden Ausreißer (Wert bleibt stehen) systematisch
finden, beheben und gegen Rückfall absichern. Maßstab ist das **Leck**: ein personenbezogener Wert steht nach dem Anonymisieren noch im Text.
**Modell:** Sonnet mittel (jeder Fund braucht Urteilsvermögen: Regel, Wörterbuch oder bewusst nicht beheben). **Aufwand:** mehrere Durchläufe
à 2-3 Stunden. **Gate:** G1 für das Release (voraussichtlich 1.9.0).
**Voraussetzung:** WP 02 gemergt (Mess-Harness, Ratsche und Tests sind Teil der Serie).

## Stand nach der Referenzserie (gemessen, `npm run eval`, App unter Electron, ohne Netz)

| Stand und Modus | Positive Fälle mit Leck (150: 91 Hand + 59 DSGVO-Probe) | Synthetische Werte mit Leck (276) | Falsch maskierte Negativfälle (20) |
|---|---|---|---|
| 1.7.0, ohne Modell | 84 | 109 | 2 |
| 1.7.0, mit Modell (war nur nach Klick aktiv) | 68 (Hand 27, DSGVO 41) | 87 | 3 |
| 1.8.0, **mit Modell (Standard)** | **4** (Hand 0, DSGVO 4) | **1** | **0** |
| 1.8.0, **ohne Modell** (Modellstart schlägt fehl, siehe WP 01) | 21 | 18 | 0 |

(Alle Zeilen mit demselben Harness `tests/eval/run-eval.mjs` in der echten Electron-App gemessen; die 1.7.0-Zeilen mit dem Harness der Serie gegen den Stand `dcb1503`.)

Ohne Modell bleiben also weiterhin Namen, Organisationen, Orte stehen (Fälle: NAME 5, ORG 2, ORT 1, G-NAME 7, G-GEBURT 2, G-FAMILIE 1,
G-NATION 1, G-ART9 1, G-AUSLAND 1). Das ist der Grund, warum ein Modellstartfehler ernst genommen wird (WP 01, Patch 0011) und der Wortlaut
"funktioniert ohne Einschränkung" entfallen ist. Die Reste **mit** Modell: `G-NAME` (2), `G-NATION` (1), `G-AUSLAND` (1).

Die Probe liegt in `tests/eval/` (`cases.mjs`: 91 kuratierte Fälle, `cases-gdpr.mjs`: 59 Fälle nach DSGVO-Taxonomie, `generate.mjs`: 6 Vorlagen
mal 7 Dokumente mit bekannter Wahrheit, fester Seed, `baseline.json`: Ratsche, `stress.mjs`: Rundlauf großer Dokumente). Die Ratsche lässt
nur Verbesserungen zu; `npm run eval:baseline` schreibt die Basis neu und nur nach bewusster Verbesserung.

## Taxonomie des Korpus (Spalte "Fall-Präfix" = Gruppe in `cases-gdpr.mjs`)

| Gruppe | Beispiele | Bisher |
|---|---|---|
| Direkte Identifikatoren (Art. 4) | Namen in allen Reihenfolgen, Titel, Rufnamen, Beziehungen ("die Tochter von Herrn L."), Anreden | `G-NAME`, `G-FAMILIE` |
| Kontakt | Telefon in vielen Formaten, E-Mail-Verschleierung ("at", "dot"), Handles, ausgeschriebene Ziffern | `G-KONTAKT` |
| Geräte und Kennungen | MAC, IMEI, UUID, Seriennummern, IPv4/IPv6, Cookies, Kfz, FIN | `G-GERAET` |
| Standort | Dezimalkoordinaten, Grad/Minuten/Sekunden, Adressen CH/AT/DE | `G-STANDORT`, `ADR` |
| Nummern | Kunde, Vertrag, Matrikel, Versicherung, Ausweise, Steuer-ID, SV-Nr. | `G-NUMMER` |
| Geburt, Alter, Gehalt, Familie, Staatsangehörigkeit | "3. Mai 1980", "44 Jahre", Gehaltsangaben | `G-GEBURT`, `G-GEHALT`, `G-NATION` |
| Besondere Kategorien (Art. 9) | Diagnosen, Medikamente, Religion, Gewerkschaft, Orientierung, Gesundheit | `G-ART9` (Profil Maximal) |
| Strafdaten (Art. 10) | Verurteilung, Ermittlungsverfahren, Aktenzeichen | `G-ART10` |
| Formatierung und Zeichen | Zeilenumbrüche mitten im Namen, Tabs, Unicode-Varianten, Ziffern mit Leerzeichen | `G-FORM` |
| Ausland | europäische Sprachen und Kennungen (PESEL, DNI, NIE, ...) | `G-AUSLAND` |
| Zugangsdaten | Passwörter, Tokens, API-Schlüssel, Private-Key-Köpfe | `G-SECRET` |
| Negativfälle | Text, der **nicht** maskiert werden darf (Länder, Firmenbegriffe, Rechnungsnummern) | `NEG` |

## Schleife je Durchlauf

1. **Korpus erweitern** (nur zusätzlich, nie bestehende Fälle abschwächen). Pro Gruppe 10-20 neue Fälle. Neue Dokumentvorlagen in `generate.mjs`
   (z. B. Arztbrief, Arbeitszeugnis, Kündigung, Mietvertrag, Protokoll mit Sprecherkürzeln, E-Mail-Verlauf mit Signaturen, CSV-Export,
   Chatverlauf). Die Wahrheit steht je Dokument fest (`truth`): Fragmente, die nach dem Anonymisieren verschwunden sein müssen.
2. **Realistische Dokumente Ende-zu-Ende:** Tests laden echte Dateien statt Text (`tests/helpers.mjs`, `realdocs.mjs` im Laborordner als Vorbild):
   DOCX (mammoth), PDF mit Textebene (pdf.js), PDF als Bild (OCR, tesseract), Bildformate; zusätzlich Ausgabe prüfen (`Exportieren` als TXT,
   DOCX, PDF) auf verbliebene Klartextwerte inklusive Dokumenteigenschaften (Autor, Metadaten) und Dateinamen im Export.
3. **Feindseliges Material:** Verschleierung (Leerzeichen zwischen Ziffern, Sonderzeichen, Groß-/Kleinschreibung), Zero-Width-Zeichen, Soft-Hyphen,
   Zeilenumbruch im Wort, OCR-Verwechslungen (0/O, 1/l/I, 5/S), Mischskripte, Namen als Teil von Wörtern, wiederholte Namen in anderen Fällen
   (Genitiv "Müllers", Dativ-Endungen, Verniedlichung "Hänschen").
4. **Messen:** `npm run eval` (beide Modi). Jeder neue Fund erscheint rot (Ratsche schlägt an). Ergebnis in `out/result.json` ansehen.
5. **Ausreißer einordnen**, je Fund genau eine Entscheidung:
   * **Regel:** Muster ist eindeutig und selten falsch (Prüfsumme, feste Struktur). Mit Validator und Negativfällen einbauen.
   * **Wörterbuch:** geschlossene Menge (Diagnosen, Medikamentenklassen, Religionsbegriffe). Nur in Profil "Medizin" bzw. "Maximal" (D3).
   * **Modell:** Namen, Organisationen, Orte; nichts per Regel nachbauen, sondern prüfen, ob das Modell sie liefert und wo `postProcessSpans` oder die
     Zusammenführung sie verliert. Fehlt es am Modell: Fall als bekannte Lücke dokumentieren (Backlog unten).
   * **Bewusst nicht beheben:** Fehlalarme drohen (z. B. Vornamen, die Alltagswörter sind). Als `NEG`- oder `todo`-Fall festhalten, Begründung in einem Satz.
6. **Beheben, Test grün, Ratsche nachziehen:** Regel in `app/privacy-shield.html` (Abschnitt `ENTS`, `hardValue`, Profile), Eval erneut, vollständige Suite, dann
   `npm run eval:baseline` und `npm run golden:update` nur, wenn die Änderung beabsichtigt ist (Golden-Datei zeigt die Ausgabeunterschiede im Diff,
   diesen Diff **lesen**).
7. **Differenztest:** `tests/golden/` und die Ausgabe-Hashes großer Dokumente müssen sich nur an den beabsichtigten Stellen ändern
   (Leistungsänderungen dürfen die Ausgabe nie ändern).

## Grenzwerte (Abnahme je Durchlauf)

* Lecks mit Modell: synthetisch 0-1 von 276 (nie schlechter als Basis), Handfälle 0, DSGVO-Probe nicht mehr als zuvor; **Ziel dieses WP: 0 bei den
  hinzugefügten realistischen Dokumenten** (nicht bei adversarialen Randfällen, die als `todo` verbleiben dürfen).
* Fehlalarme: 0 in `NEG` und in den Textabschnitten ohne Personenbezug der realistischen Dokumente.
* Zeit: `perf.test.mjs` bleibt im Budget; bitgleiche Ausgabe bei Leistungsarbeiten.
* Jeder behobene Fund hat einen Testfall; jedes bewusst offene Thema steht als `todo` (sichtbar im Testlauf, nicht still).

## Bekannte Lücken (Backlog, Reihenfolge nach erwartetem Nutzen)

1. **Ohne Modell** (21 Fälle, 18 synthetische Werte): Namenserkennung in Wortlistenmodus verbessern (Vornamenliste mit Kontextregeln), damit der Ausfall
   des Modells weniger kostet. Nutzen hoch, weil Modellstartfehler real gemeldet wurden.
2. **Großschrift mit Komma** ("NACHNAME, VORNAME" in Listen und Formularen) und Namen in Kopf-/Fußzeilen.
3. **Spitznamen und Kurzformen** ("Hotte" für Horst), Diminutive, Genitiv-s.
4. **Aufenthaltstitel-Nummer**, weitere Ausweisformate (Reisepass-Fotozeile MRZ, maschinenlesbare Zone: Zeilen mit `<<<`).
5. **OCR-Verwechslungen** in Kennzahlen (O/0, l/1) mit Validatoren, die ein Zeichen Toleranz erlauben.
6. **Soft-Hyphen, Zero-Width** in der Normalisierung **mit** Offset-Abbildung (heute nur längengleiche Normalisierung; Entfernen ändert Positionen).
7. **Koreferenz-Verknüpfung:** derselbe Name in anderer Form ("Herr Müller", "Hans M.", "Müller") soll dasselbe Token erhalten; heute je Form eines.
8. `G-NATION`/`G-AUSLAND` mit Modell: je ein Fall, nach Sichtung entscheiden (Staatsangehörigkeit ist ohne Personenbezug nicht immer ein Leck).

## Schritte für den ersten Durchlauf (konkret)

- [ ] **1. Zweig:** `git checkout -b feat/korpus-durchlauf-1 main` (nach Merge von WP 02).
- [ ] **2. Messstand festhalten:** `npm run eval | tee /tmp/eval-start.txt`; die Zahlen müssen der Tabelle oben entsprechen (Abweichung: Stopp-Regel 1).
- [ ] **3. Vorlagen ergänzen:** in `tests/eval/generate.mjs` zwei neue Dokumentarten (Arztbrief mit Diagnose, Arbeitszeugnis mit Gehalt), Fall-IDs fortlaufend.
  Hinweis: `SYNTH_DOCS = 42` (6 Vorlagen mal 7) ist fest; bei neuen Vorlagen auf `8 x 7 = 56` erhöhen und die Basis neu schreiben, **nicht** vorher.
- [ ] **4. 15 Realdokument-Tests** in `tests/realdocs.test.mjs` (neu): DOCX, PDF mit Text, PDF als Bild, Excel-Export als CSV; je Datei Wahrheitsliste.
- [ ] **5. Messen, Funde sortieren, beheben** nach der Schleife oben. Pro Fund ein Commit `fix(erkennung): <Kurz>`.
- [ ] **6. Abschlussmessung** und Bericht (Tabelle vorher/nachher, offene `todo`-Fälle mit Begründung).
- [ ] **7. Pull Request (Entwurf)**; Release als 1.9.0 erst nach G1.

## Abnahme

* Grenzwerte erfüllt, Suite grün (`xvfb-run -a npm test`), Diff der Golden-Datei gelesen und erklärt.
* Bericht nennt je Gruppe: Fälle, Lecks vorher/nachher, bewusst offen.
