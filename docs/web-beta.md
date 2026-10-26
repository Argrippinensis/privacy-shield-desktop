# Browser-Fassung der 2.0 Beta (W1web)

Eine zusaetzliche Beta-Seite, damit PrivacyShield 2.0 auch am Handy ausprobiert werden kann. Das bestehende
Web-Tool (`/tools/privacyshield-redesigned.html`) bleibt unveraendert.

## Aufbau

- `web/beta-shell.html`: schmale Huelle (Leiste, Hinweis, Iframe `#tool-frame`), mit `noindex`. Beim ersten Besuch ist
  der Hinweis aufgeklappt (Zustand unter `psweb_hinweis_gesehen` im localStorage) und die KI-Erkennung ist AUS
  (`ps_ai_mode=off`, nur wenn noch kein Wert gesetzt ist): ohne Zutun werden keine 135 MB geladen.
- `web/browser-api.js`: Browser-Ersatz fuer `window.electronAPI` (alles aus `preload.js`; Update-Funktionen und
  Ereignisse sind No-ops, `platform` ist `web`). Wird vor dem Iframe geladen.
- `web/tool-anpassung.js`: Laufzeit-Anpassung des Werkzeugs im Iframe: Aussagen, die nur fuer die Desktop-Version gelten
  (Flugmodus, kein Serverkontakt, Installation, Virenschutz), werden in den Textknoten ersetzt; Layoutregeln fuer
  schmale Breiten; der Update-Knopf der Fusszeile bleibt als Versionsanzeige, ist aber nicht bedienbar; tote
  Testdokument-Links entfallen. Jedes Original in der Ersetzungsliste muss im Werkzeug stehen (Test).
- `scripts/build-web-beta.mjs`: baut `dist-web-beta/` (nicht eingecheckt). Das Werkzeug `privacy-shield.html` wird
  byteidentisch aus `app/` kopiert, ebenso `lib/` (nur die vom Werkzeug geladenen Dateien, keine CLI-Module), `css/`,
  `vendor/` (ohne .map/.md). `ner-worker.js` entsteht aus `app/ner-worker.js` durch gezielten Textersatz (Modell von
  huggingface.co, Browser-Cache, auf den Commit aus `scripts/vendor.lock.json` gepinnt; Laufzeit bleibt lokal). Aendert
  sich die Quelle so, dass ein Ersatz nicht mehr greift, bricht der Bau ab. Kein Modell im Bau.
  Schutz fuer `--out`: nie Wurzel, Projektordner, dessen Vorfahren oder Home; ein vorhandener, nicht leerer Ordner wird
  nur ueberschrieben, wenn er die Markerdatei `.web-beta-build` enthaelt (frueherer Bau).

## Bau und Test

```bash
npm run fetch-vendor            # einmalig: app/vendor
node scripts/build-web-beta.mjs # -> dist-web-beta/ (oder --out <Ordner>)
xvfb-run -a node --test --test-concurrency=1 tests/web-beta.test.mjs
```

Der Bau nennt Dateizahl und Gesamtgroesse (ca. 40 MiB, 37 Dateien) und bricht ab bei einer Datei ab 25 MiB oder
mehr als 2000 Dateien (Grenzen von Cloudflare Pages). Der Test baut in ein Temp-Verzeichnis, serviert es ohne
COOP/COEP und oeffnet es in Electron ohne preload; Netzzugriffe ausser 127.0.0.1 sind gesperrt, Anfragen an
huggingface.co werden protokolliert und abgebrochen (Standard-Erkennung muss dann laufen).

## Auslieferung auf die Website

Der Inhalt von `dist-web-beta/` kommt in den Unterordner `tools/privacyshield-2-beta/` des Website-Repos; die URL ist
`https://arcangeli.eu/tools/privacyshield-2-beta/` (MIT abschliessendem Schraegstrich: die Huelle laedt ihre Dateien
relativ, ohne Schraegstrich waeren die Pfade falsch). Die Huelle nutzt sonst nur die absoluten Links
`/tools/privacyshield-redesigned.html` und `/desktop/#beta`. Dort nichts von Hand aendern; bei jeder neuen Version neu
bauen und den Ordner ersetzen.

Noetig auf der Website:

- Fuer diesen Pfad den Antwort-Header `X-Robots-Tag: noindex` setzen (Cloudflare `_headers`), zusaetzlich zum
  `<meta name="robots" content="noindex">` der Huelle; die Seite soll nicht in Suchmaschinen erscheinen und nicht in
  `sitemap.xml` stehen.
- Vor der Freigabe ein echter Geraetetest auf iPhone (Safari) und Android (Chrome): Datei laden, anonymisieren,
  Kopieren, KI-Haekchen einschalten (Modell-Download, Speicher, Neustart des Browsers). Die automatischen Tests laufen nur
  in Electron (Chromium) und decken Safari/WebKit und echte Handys nicht ab.

Hinweise:

- Ohne Cross-Origin-Isolation (kein COOP/COEP, bewusst: das Modell kommt von huggingface.co) rechnet die KI mit
  einem Thread; das reicht.
- Das Werkzeug nutzt `localStorage` des Ursprungs (Einstellungen, Onboarding); auf derselben Domain wie das
  stabile Web-Tool teilen sich beide diese Schluessel (auch `ps_ai_mode`, falls das stabile Tool ihn nutzt: die Huelle setzt ihn beim ersten Besuch auf `off`, nur wenn noch kein Wert da ist).
- Die Huelle stellt das Raster des Arbeitsbereichs (`.ws-grid`) zur Laufzeit im Iframe auf eine Spalte um, weil ein
  Inline-Stil des Werkzeugs dessen eigene Schmalansicht aushebelt; die Datei `privacy-shield.html` selbst bleibt
  unveraendert.
- Fuer schmale Breiten (max. 600 px) ergaenzt die Huelle weitere Regeln im Iframe: Schrittleiste als 2x2-Raster,
  Panel-Kopfzeilen und Knopfreihen umbrechend, Knoepfe mindestens 40 px hoch, zweispaltige Raster einspaltig und die
  Kopfzeile "arcangeli.eu - PrivacyShield" des Werkzeugs ausgeblendet (die Huelle hat eine eigene Leiste).
- Auf Geraeten mit unter 6 GB gemeldetem Arbeitsspeicher startet die KI nicht automatisch (Hinweis des Werkzeugs);
  sie laesst sich dann im KI-Bereich manuell laden. Beim ersten Besuch ist sie ohnehin aus.
