# WP 10: Modell-Spike: Ergebnis und Wiedervorlage

**Frage:** Lohnt sich ein anderes oder zusätzliches KI-Modell für die Erkennung von Namen, Organisationen und weiteren Daten?
**Antwort heute: nein.** Die Verbesserung kommt aus Regeln, Prüfziffern und Wörterbüchern (WP 05), nicht aus einem Modellwechsel. Dieses Dokument hält die Messung fest und nennt
die Bedingungen, unter denen die Frage neu gestellt wird.
**Modell:** nur bei Wiedervorlage, hohes Denkniveau. **Gate:** keines (Forschung), aber Modelllizenz und Größe sind Entscheidungen des Nutzers.

## Bestand und Kandidat

| | Heutiges Modell | Kandidat `bardsai` PII-Modell v2 |
|---|---|---|
| Datei (quantisiert, ONNX) | `Xenova/distilbert-base-multilingual-cased-ner-hrl`, `model_quantized.onnx`, **135.359.829 Bytes** | `onnx/model_quantized.onnx`, **308.618.574 Bytes** (2,28-mal größer) |
| Etiketten | Person, Organisation, Ort (CoNLL-artig) | PII-Klassen (Name, Adresse, Betrag, ...) |
| Laufzeit | etwa 5,4 s für 8269 Zeichen im Programm (mit Arbeitsspeicher von ca. 1,2 GB bei geladenem Modell) | frühere Messung: etwa 10-mal langsamer; Python-Skript gibt `ms je 1000 Zeichen` aus, vor Wiedervorlage neu messen |

## Messung (Skript `artifacts/model-spike/run_model.py`, dieselben Testsätze wie der Harness, nur Modell, **ohne** Regeln)

| Satz | Positive | Lecks Kandidat | Fehlalarme (Negativfälle) |
|---|---|---|---|
| Handfälle | 91 | 7 | 2 von 15 |
| DSGVO-Probe | 59 | 19 | 1 von 5 |
| Synthetisch | 276 | 7 | 0 |

Zum Vergleich das **Gesamtsystem 1.8.0** (Regeln + heutiges Modell): 4 von 150 Fällen undicht, 1 von 276 synthetisch, 0 Fehlalarme.

Inhaltliche Befunde des Kandidaten:
* Übersieht Organisationen (Bundesagentur, Deutsche Bank, Universität Heidelberg, AOK) und Namen als Teil von Firmennamen: genau die Klasse, für die das heutige Modell gebraucht wird.
* Übersieht **alle** Diagnosen und Medikamente (Art. 9: G35, Ocrelizumab, Metformin, Multiple Sklerose, HIV) und Strafdaten: kein Vorteil gegenüber Wörterbüchern.
* Lecks synthetisch: 6 von 7 in URLs (Profilseiten, Vorgangslinks mit Token; Regeln lösen das ohne Modell), 1 Name.
* Fehlalarme bei Beträgen ("Umsatz stieg um {{FINANCIAL_AMOUNT}}").

**Schluss:** Als Ersatz schlechter, als Zusatz (zwei Modelle) mehr als doppelter Speicher und langsamer, ohne die offenen Fälle zu schließen. Entscheidung D6: nicht umsetzen.

## Wiedervorlage (nur wenn eine Bedingung eintritt)

1. WP 05 meldet nach mehreren Durchläufen eine Gruppe von Lecks, die per Regel/Wörterbuch nicht lösbar ist und die ein Modell erkennbar lösen würde (Beleg im Harness).
2. Ein deutlich kleineres Modell mit gleicher oder besserer Qualität erscheint (Ziel: unter 100 MB, mehrsprachig, Lizenz erlaubt Weitergabe).
3. Die Lizenz des heutigen Modells wird juristisch problematisch (Hinweis aus der Kommerzialisierungsplanung: Lizenz AFL-3.0 juristisch bestätigen lassen).
4. Speicherbedarf (ca. 0,6 GB für das Modell) wird für Nutzer zum Hindernis (Rückmeldung aus `MEMORY`-Fehlern in Patch 0011).

## Vorgehen bei Wiedervorlage (Schritte)

- [ ] Kandidaten sammeln (Hugging Face: Token-Klassifikation, ONNX-Gewichte vorhanden oder konvertierbar, Lizenz, Größe, Sprachen). Lizenz **vor** dem Download lesen und festhalten.
- [ ] Skript `artifacts/model-spike/run_model.py` anpassen (Etiketten-Zuordnung `id2label`), `cases.json` neu erzeugen (aus `tests/eval/cases.mjs`, `cases-gdpr.mjs`, `generate.mjs`: Felder `id`, `cat`, `text`, `frags`, `profile`).
- [ ] Messen wie oben: Lecks, Fehlalarme, Zeit, Größe, Arbeitsspeicher. **Nur Modell** und **Modell plus Regeln** (Gesamtsystem im Harness).
- [ ] Nur wenn Gesamtsystem besser **und** Zeit/Speicher akzeptabel: Pilot im Referenzzweig (neues Modell als zweite Einstellung, nicht als Ersatz), Entscheidung beim Nutzer.
