# Ausschließlich synthetische Beispiele

`unconfirmed.pdf`/`.json` zeigen den technischen Nachweis ohne Sichtprüfungsbestätigung.
`confirmed.pdf`/`.json` zeigen denselben Lauf mit im Test ausdrücklich gesetzter Bestätigung.
Diese zweite Variante simuliert eine Nutzerbestätigung und behauptet keine Prüfung eines echten Dokuments.

`pseudonymisiertes-ergebnis.txt` liegt separat bei und ist kein Inhaltsanhang des Nachweises.
Seine unveränderten UTF-8-Bytes ohne BOM oder zusätzlich angehängten Zeilenumbruch ergeben den
SHA-256-Wert unter `documents[0].result.sha256` beider JSON-Dateien.

Erzeugung: `node --test --test-name-pattern='F2 and evidence' tests/processing-evidence.test.mjs`.
Der Test berechnet den Hash unabhängig nach, extrahiert PDF-Text unabhängig mit dem portablen Node-/PDF.js-Leser und prüft,
dass Namen, E-Mail-Werte, Dateinamen und Regelmarker nicht in PDF/JSON vorkommen.
IDs und Zeitangaben werden lokal neu erzeugt; die Binärdateien müssen bei einem neuen Testlauf nicht identisch sein.
