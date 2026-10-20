# PrivacyShield Desktop

Desktop-App für das PrivacyShield-Tool. Alles läuft lokal: Bibliotheken, OCR und das KI-Modell
(Namen, Organisationen, Orte) sind Teil der Installation. Die Seiten selbst haben keinen Netzzugriff
(Content-Security-Policy plus Sperre im Hauptprozess); nur die Update-Prüfung des Programms nutzt das Internet.

## Entwicklung

    npm install
    npm start          # lädt beim ersten Mal Bibliotheken und Modell (ca. 170 MB), danach nur Prüfsummen-Check

## Gebündelte Komponenten (`app/vendor`, `app/models`)

Nicht im Git (das Modell ist 135 MB, GitHub erlaubt 100 MB pro Datei). `scripts/vendor.lock.json` legt exakte
Versionen und SHA-256-Prüfsummen fest; `npm run fetch-vendor` stellt sie bereit und prüft sie. Start, Tests und
Builds rufen das automatisch auf. Versionswechsel bewusst mit `node scripts/fetch-vendor.mjs --update-lock`.
Lizenzen: `THIRD_PARTY_NOTICES.md` (wird mit der Installation ausgeliefert).

Das Tailwind-CSS ist vorkompiliert (`app/css/tailwind.css`). Nach Änderungen an Klassen in `app/*.html`:
`npm run build:css`.

## Tests

    npm test                           # Linux ohne Display: xvfb-run -a npm test
    PS_PACKAGED_BIN=<Pfad> npm test    # gegen eine gepackte Anwendung (z. B. dist/linux-unpacked/privacy-shield-desktop)
    PS_SKIP_EVAL=1 / PS_SKIP_PERF=1    # Erkennungsmessung bzw. Zeitprüfung überspringen (langsame Rechner)

Die Tests starten die echte App mit totem Proxy (kein Internet). Sie prüfen unter anderem: kein Netzzugriff der
Seiten, KI-Modell und OCR offline, Oberfläche bleibt bedienbar, Update-Dialoge (mit lokalem Mock-Update-Server),
externe Links, Speicheranzeige, große Dokumente, Hausregeln (keine Emojis, Umlaute).

### Erkennungsqualität

    npm run eval            # Messung mit Tabelle (Lecks und Falsch-Maskierungen je Kategorie, mit und ohne KI)
    npm run eval:baseline   # Baseline nach bewusster Verbesserung festschreiben
    npm run golden:update   # Golden-Stand (Beispieltext) nach bewusster Änderung neu erzeugen

`tests/eval/cases.mjs` und `tests/eval/cases-gdpr.mjs` sind die Testsätze, `tests/eval/generate.mjs` erzeugt
synthetische Dokumente mit bekannter Wahrheit. Ein Leck ist ein personenbezogener Wert, der nach dem Anonymisieren noch im
Text steht. `tests/eval.test.mjs` verhindert, dass Lecks gegenüber `tests/eval/baseline.json` zunehmen.
**Neuer Fehler im Betrieb: zuerst als Fall in einen Testsatz (rot), dann beheben (grün).**

## Build

    npm run build:win | build:mac | build:linux

## Release

1. Abschnitt in `CHANGELOG.md` ergänzen, Version in `package.json` erhöhen, per Pull Request nach `main`.
2. `git tag vX.Y.Z && git push --tags`

GitHub Actions baut alle Plattformen, testet jedes gebaute Programm und erstellt das Release nur, wenn alles grün ist
(Release-Text aus `CHANGELOG.md`, `SHA256SUMS.txt`). Danach: `node scripts/verify-release.mjs vX.Y.Z [--upgrade-from vA.B.C]`.
Die Website verlinkt auf `releases/latest/download/<fester Dateiname>` und muss bei neuen Versionen nicht angepasst werden.
