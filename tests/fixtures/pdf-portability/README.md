# Synthetische Mac-PDF-Regressionsdateien

Echte Chromium-Druckausgabe des unveröffentlichten Builds 2.0.2, erzeugt auf macos-15-intel im verlinkten Diagnose-Lauf. Ausschließlich synthetische Eingaben. `mac-proof.pdf` enthält eine E-Mail-Platzhalter-Verarbeitung, `mac-long.pdf` denselben synthetischen Vorgang mit 24 Dokumenteinträgen und einem inerten eigenen Profiltext. Keine echte Vertragsdatei und keine Originalpersonaldaten.

Die CoreText-/Apple-Systemschrift erzeugt kurze PDF-Textfragmente. Der bisherige Testleser fügte nach jedem Fragment ein Leerzeichen ein und zerstörte dadurch Markenwörter, ID, Hash und „Dokument 24“. PDF.js liefert tatsächliche Wortabstände bereits als eigene Textobjekte. Die Korrektur übernimmt deren Zeichen und echte Zeilenumbrüche, ohne zusätzliche Trennzeichen zu erfinden. Vorgangs-ID aus dem fehlgeschlagenen DOM-/PDF-Vergleich; Hash zusätzlich mit Poppler `pdftotext` unabhängig ausgelesen. Herkunft und Datei-Prüfsummen in provenance.json.

Diese Dateien bleiben absichtlich auf Version 2.0.2 als feste Regressionsfälle; das aktuelle Beispiel steht unter docs/presentation-ui/examples/.
