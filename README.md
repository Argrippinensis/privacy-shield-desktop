# PrivacyShield Desktop

Desktop-App fuer das PrivacyShield-Tool. Alles laeuft lokal: Bibliotheken, OCR und das KI-Modell
(Namen, Organisationen, Orte) sind Teil der Installation. Die Seiten selbst haben keinen Netzzugriff
(Content-Security-Policy plus Sperre im Hauptprozess); nur die Update-Pruefung des Programms nutzt das Internet.

## Entwicklung

    npm install
    npm start          # laedt beim ersten Mal Bibliotheken und Modell (ca. 170 MB), danach nur Pruefsummen-Check

## Gebuendelte Komponenten (`app/vendor`, `app/models`)

Nicht im Git (das Modell ist 135 MB, GitHub erlaubt 100 MB pro Datei). `scripts/vendor.lock.json` legt exakte
Versionen und SHA-256-Pruefsummen fest; `npm run fetch-vendor` stellt sie bereit und prueft sie. Start, Tests und
Builds rufen das automatisch auf. Versionswechsel bewusst mit `node scripts/fetch-vendor.mjs --update-lock`.
Lizenzen: `THIRD_PARTY_NOTICES.md` (wird mit der Installation ausgeliefert).

Das Tailwind-CSS ist vorkompiliert (`app/css/tailwind.css`). Nach Aenderungen an Klassen in `app/*.html`:
`npm run build:css`.

## Tests

    npm test                       # Linux ohne Display: xvfb-run -a npm test
    PS_PACKAGED_BIN=<Pfad> npm test    # gegen eine gepackte Anwendung (z. B. dist/linux-unpacked/privacy-shield-desktop)

Die Tests starten die echte App mit totem Proxy (kein Internet) und pruefen unter anderem: kein Netzzugriff der Seiten,
KI-Modell und OCR offline, Oberflaeche bleibt waehrend der Analyse bedienbar, Erkennung identisch zu v1.6.2
(`tests/golden`), Update-Dialog, externe Links, RAM-Anzeige.

## Build

    npm run build:win | build:mac | build:linux

## Release

    # Version in package.json erhoehen, dann:
    git tag vX.Y.Z
    git push --tags

GitHub Actions baut alle Plattformen und erstellt ein Release. Das Release wird nur angelegt, wenn alle vier
Installer (exe, zip, AppImage, deb) vorhanden sind. Die Website verlinkt auf diese Dateien.
