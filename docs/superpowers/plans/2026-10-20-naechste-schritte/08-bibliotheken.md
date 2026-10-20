# WP 08: Bibliotheken aktualisieren

**Ziel:** Die gebündelten Bibliotheken (Dokumentimport, Texterkennung, Export, KI-Laufzeit) auf aktuelle Versionen heben, jeweils einzeln, mit Messung und Rückfall.
**Modell:** Sonnet mittel. **Aufwand:** je Bibliothek 1-2 Stunden. **Gate:** G1 für das Release.
**Voraussetzung:** WP 07 gemergt (Electron 44).

**Grundregel:** Immer **eine** Bibliothek je Pull-Request-Commit. Danach vollständige Suite, `npm run eval` (keine Verschlechterung), `perf.test.mjs`, Paketprobe.
Nach jedem Schritt `node scripts/fetch-vendor.mjs --update-lock` (schreibt die SHA-256-Summen in `scripts/vendor.lock.json`), Summen im Diff lesen, `THIRD_PARTY_NOTICES.md` anpassen (Version, Lizenz).
Sicherheitsvorgaben bleiben: kein Netzzugriff zur Laufzeit, strikte CSP, PDF ohne `eval` (`isEvalSupported: false`).

## Bestand (laut `THIRD_PARTY_NOTICES.md` und `scripts/vendor.lock.json`; vor Beginn bestätigen)

| Bibliothek | Version | Zweck | Risiko beim Wechsel |
|---|---|---|---|
| pdf.js | 3.11.174 | PDF lesen | **hoch**: Version 4 und höher liefern nur ES-Module (`.mjs`) und brauchen Worker als Modul; das Werkzeug lädt klassische Skripte. Brücke nötig. |
| Tesseract.js | 5.1.1 | Texterkennung (OCR) | mittel: Kerndatei und Sprachdaten (`deu`, `eng`) müssen zur Version passen; ein gemeinsamer Worker |
| mammoth.js | 1.6.0 | DOCX lesen | niedrig |
| JSZip | 3.10.1 | DOCX/ZIP schreiben | niedrig |
| jsPDF | 2.5.1 | PDF schreiben | niedrig bis mittel (Schriften, Umlaute) |
| Transformers.js | 3.5.2 (mit ONNX Runtime Web, WASM) | KI-Laufzeit | **hoch**: Version 4 ändert Modelllade-API; Modell, Quantisierung und Threads (SharedArrayBuffer, COOP/COEP) neu messen |

## Reihenfolge (aufsteigendes Risiko)

1. **mammoth, JSZip, jsPDF** (je ein Commit): Test mit Umlauten und Sonderzeichen in der DOCX-/PDF-Ausgabe (Export, dann Text extrahieren und mit der Erwartung vergleichen).
2. **Tesseract.js**: Version und Kerndatei gemeinsam; Sprachdaten `deu.traineddata`/`eng.traineddata` aus derselben Quelle mit festgeschriebener Prüfsumme. Messung auf einem gescannten Testdokument (3 Seiten):
   Zeit und Zeichenfehlerrate vorher/nachher. Schlechter als vorher: zurück.
3. **pdf.js**: Zuerst entscheiden, ob der Gewinn die Brücke rechtfertigt. Schritte bei Ja: `pdf.mjs` und `pdf.worker.mjs` bündeln, Laden über `import()` in einem Modul-Skript, `GlobalWorkerOptions.workerSrc` auf die lokale Datei,
   CSP für `script-src 'self'` prüfen (Module sind erlaubt, solange gleiche Herkunft), `isEvalSupported: false` beibehalten. Test: 5 PDFs (Text, Bild, verschlüsselt, defekt, groß) in `tests/` (neu `pdf-import.test.mjs`).
   Bei Schwierigkeiten: stehen lassen und begründen (Version 3.11 erhält keine Sicherheitsfixes mehr; das Risiko wird durch Dateigröße-Limit 30 MB, `isEvalSupported:false`, Sandbox und fehlenden Netzzugriff begrenzt). Das ist eine bewusste Restrisiko-Entscheidung des Nutzers, kein stilles Unterlassen.
4. **Transformers.js 4**: nur mit Messprotokoll (Ladezeit, Spitzenspeicher, Analysezeit für 8269 Zeichen, Ergebnisgleichheit des Modells auf der Probe). Modelldateien unverändert lassen
   (Quantisierung `q8`, `model_quantized.onnx`, 135.359.829 Bytes). Wenn die neue Version andere Dateinamen erwartet: Konfiguration anpassen, nicht das Modell tauschen. Abnahme: `npm run eval` im KI-Modus identisch oder besser (4 Fälle, 1 synthetisch).

## Schritte je Bibliothek (Vorlage)

- [ ] `npm run fetch-vendor` ausführen, Zustand grün bestätigen (Ausgangstest `xvfb-run -a npm test`).
- [ ] Quelle und Version der Bibliothek in `scripts/vendor.lock.json` (Liste `files`, Felder `dest`, `url`, `sha256`, `size`) und, falls dort die URL steht, in `scripts/fetch-vendor.mjs` ändern; dann `node scripts/fetch-vendor.mjs --update-lock` (schreibt die neuen SHA-256-Summen, nur wenn alle Downloads ohne Problem sind).
- [ ] Änderungen am Aufrufcode in `app/privacy-shield.html` (nur wenn nötig, minimal).
- [ ] Tests und Messung wie oben. Ergebnis in den Commit-Text (vorher/nachher in Zahlen).
- [ ] Commit `build(vendor): <Name> <alt> auf <neu>`, Dateien einzeln benennen (`scripts/vendor.lock.json`, `scripts/fetch-vendor.mjs`, `THIRD_PARTY_NOTICES.md`, geänderte App-Datei, Tests).

## Abnahme

* Je Bibliothek: Suite grün, Eval nicht schlechter, Pakettest grün; Lizenz in `THIRD_PARTY_NOTICES.md` aktuell.
* Eine Tabelle im PR-Text: Bibliothek, alt, neu, Messung, Entscheidung (aktualisiert/zurückgestellt mit Grund).
* Zurückgestellte Bibliotheken stehen mit Begründung im `CHANGELOG.md` unter "Intern" oder im Plan, nicht stillschweigend.
