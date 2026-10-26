# Browser-Fassung der 2.0 Beta (W1web)

Eine zusaetzliche Beta-Seite, damit PrivacyShield 2.0 auch am Handy ausprobiert werden kann. Das bestehende
Web-Tool (`/tools/privacyshield-redesigned.html`) bleibt unveraendert.

## Aufbau

- `web/beta-shell.html`: schmale Huelle (Leiste, einklappbarer Hinweis, Iframe `#tool-frame`), mit `noindex`.
- `web/browser-api.js`: Browser-Ersatz fuer `window.electronAPI` (alles aus `preload.js`; Update-Funktionen und
  Ereignisse sind No-ops, `platform` ist `web`). Wird vor dem Iframe geladen.
- `scripts/build-web-beta.mjs`: baut `dist-web-beta/` (nicht eingecheckt). Das Werkzeug `privacy-shield.html` wird
  byteidentisch aus `app/` kopiert, ebenso `lib/`, `css/`, `vendor/`. `ner-worker.js` entsteht aus `app/ner-worker.js`
  durch gezielten Textersatz (Modell von huggingface.co, Browser-Cache; Laufzeit bleibt lokal). Aendert sich die
  Quelle so, dass ein Ersatz nicht mehr greift, bricht der Bau ab. Kein Modell im Bau.

## Bau und Test

```bash
npm run fetch-vendor            # einmalig: app/vendor
node scripts/build-web-beta.mjs # -> dist-web-beta/ (oder --out <Ordner>)
xvfb-run -a node --test --test-concurrency=1 tests/web-beta.test.mjs
```

Der Bau nennt Dateizahl und Gesamtgroesse (ca. 40 MiB, 39 Dateien) und bricht ab bei einer Datei ab 25 MiB oder
mehr als 2000 Dateien (Grenzen von Cloudflare Pages). Der Test baut in ein Temp-Verzeichnis, serviert es ohne
COOP/COEP und oeffnet es in Electron ohne preload; Netzzugriffe ausser 127.0.0.1 sind gesperrt, Anfragen an
huggingface.co werden protokolliert und abgebrochen (Standard-Erkennung muss dann laufen).

## Auslieferung auf die Website

Der Inhalt von `dist-web-beta/` kommt in einen eigenen Unterordner des Website-Repos, z. B. `beta/` (die Huelle
nutzt nur relative Pfade zu ihren Dateien und absolute Links `/tools/privacyshield-redesigned.html` und
`/desktop/#beta`). Dort nichts von Hand aendern; bei jeder neuen Version neu bauen und den Ordner ersetzen.

Hinweise:

- Ohne Cross-Origin-Isolation (kein COOP/COEP, bewusst: das Modell kommt von huggingface.co) rechnet die KI mit
  einem Thread; das reicht.
- Das Werkzeug nutzt `localStorage` des Ursprungs (Einstellungen, Onboarding); auf derselben Domain wie das
  stabile Web-Tool teilen sich beide diese Schluessel.
- Die Huelle stellt das Raster des Arbeitsbereichs (`.ws-grid`) zur Laufzeit im Iframe auf eine Spalte um, weil ein
  Inline-Stil des Werkzeugs dessen eigene Schmalansicht aushebelt; die Datei `privacy-shield.html` selbst bleibt
  unveraendert.
- Links im Werkzeug auf `../tests/privacy-shield-testdokument-*.pdf` zeigen im Browser-Bau ins Leere (Testdokumente
  sind nicht Teil des Baus).
- Auf Geraeten mit unter 6 GB gemeldetem Arbeitsspeicher startet die KI nicht automatisch (Hinweis des Werkzeugs);
  sie laesst sich dann im KI-Bereich manuell laden.
