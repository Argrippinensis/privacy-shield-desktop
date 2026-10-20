# WP 07: Electron 44 und Härtung

**Ziel:** Das Programm läuft auf einer unterstützten Electron-Version, und die Angriffsfläche der Brücke zwischen Oberfläche und Hauptprozess ist klein und geprüft.
**Modell:** Sonnet niedrig. **Aufwand:** 2 Stunden. **Gate:** G1 für das Release (voraussichtlich 1.9.0 gemeinsam mit WP 05).
**Voraussetzung:** WP 02 gemergt (Testnetz, CI).

## Warum jetzt

* Das Repository steht auf Electron **35.7.5**. Das Electron-Projekt unterstützt nur die jeweils neuesten drei Hauptversionen mit Sicherheitskorrekturen; 35 ist weit darunter.
  Ein Programm, das fremde Dokumente öffnet (Word, PDF, Bilder), sollte eine gepflegte Chromium-Version haben.
* **Probelauf liegt vor:** In einer Wegwerfkopie (`/tmp/ps-lab2`) liefen alle damaligen Tests (26 von 26) unter **Electron 44.9.1 ohne eine einzige Änderung am Programmcode**
  (nur `package.json`/Lockfile). Gefunden und behoben wurde ein Testproblem: Bei der schnelleren Version greift Playwright zu früh in den Fensterstart ein; Lösung `await win.reload({ waitUntil: 'load' })`
  im Test-Helfer (steckt in Patch 0001).
* `electron-builder` 26.15.3 und `electron-updater` 6.8.9 passen zu Electron 44.

## Schritte

- [ ] **1. Zweig und Aktualisierung**

```bash
cd ~/projects/privacy-shield-desktop && git checkout -b chore/electron-44 main
npm i -D electron@44 && npm ls electron electron-builder electron-updater
```

- [ ] **2. Testlauf (alles, einmal ohne weitere Änderung)**

```bash
xvfb-run -a npm test 2>&1 | tee /tmp/e44.log | grep -E '^# (tests|pass|fail)'
```

Erwartet: alle grün. Schlägt ein Test fehl: Ursache lesen, nicht Wartezeiten blind erhöhen. Bekannte Quelle für Flattern ist die Speichermessung
(`tests/offline-ai.test.mjs`, `perf.test.mjs`): dort mit `waitFor` auf den Zielzustand pollen statt feste Zeiten.

- [ ] **3. Paketprobe unter Electron 44**

```bash
npm run build:linux
PS_PACKAGED_BIN=dist/linux-unpacked/privacy-shield-desktop xvfb-run -a npm test
```

Erwartet: grün (die Tests laufen gegen das gebaute Programm, siehe `build.yml`). Windows und macOS prüft die CI nach dem Push.

- [ ] **4. Fuses (Schalter im Electron-Programm) setzen**

In `package.json` unter `build` den Block `electronFuses` ergänzen (electron-builder 26 setzt die Fuses beim Packen):

```json
"electronFuses": {
  "runAsNode": false,
  "enableNodeOptionsEnvironmentVariable": false,
  "grantFileProtocolExtraPrivileges": false,
  "onlyLoadAppFromAsar": true,
  "enableEmbeddedAsarIntegrityValidation": true
}
```

Begründung: Das Programm ist kein Node-Werkzeug (`runAsNode` aus), liest Umgebungsvariablen wie `NODE_OPTIONS` nicht aus, nutzt kein `file://` (eigenes Protokoll `app://ps/`), lädt nur aus `app.asar`.
`enableEmbeddedAsarIntegrityValidation` gilt für das Archiv; die entpackten Ordner `app/vendor` und `app/models` (per `asarUnpack`) sind davon nicht erfasst, ihre Integrität sichert weiter `vendor.lock.json` bei der Installation.
**Nicht setzen:** `enableNodeCliInspectArguments: false`. Die Playwright-Tests gegen das gebaute Programm starten es mit Inspektor-Argumenten; mit dem Schalter aus schlagen sie fehl.
Alternative, falls gewünscht: zwei Bauvarianten (Test mit, Release ohne Schalter); Aufwand und zusätzliche Fehlerquelle sprechen dagegen, Gewinn ist gering (lokale Angreifer mit Rechten haben ohnehin Zugriff).

Danach erneut: Paketprobe (Schritt 3), Fehlschlag je Schalter einzeln eingrenzen (immer nur einen zurücknehmen) und Ergebnis im PR-Text dokumentieren. Fuse-Stand prüfen:

```bash
npx @electron/fuses read --app dist/linux-unpacked/privacy-shield-desktop
```

- [ ] **5. Brücke zwischen Oberfläche und Hauptprozess absichern**

Stand heute: Fenster mit `contextIsolation: true`, `sandbox: true`, `nodeIntegration: false`; `setWindowOpenHandler` verweigert; Navigation nach außen wird in den System-Browser umgeleitet;
strikte CSP und COOP/COEP für `app://ps/`. Offen:

1. **Absender prüfen:** Alle `ipcMain.handle(...)` in `main.js` (Dateien speichern/öffnen, Zwischenablage, Update, Systemwerte, `check-assets`, ...) prüfen `event.senderFrame.url` auf
   `app://ps/`. Hilfsfunktion `assertTrusted(event)` am Anfang jedes Handlers; Fehlschlag: `throw new Error('untrusted sender')`.
   Test: ein Frame mit fremder URL (in `tests/shell.test.mjs` per `data:`-Frame oder Mock) darf keinen Handler erreichen.
2. **Argumente prüfen:** `save-file` (`defaultName` String ohne Pfadtrenner, Länge begrenzt; `data` als Zeichenkette oder Buffer, Größe begrenzt, z. B. 200 MB; `mimeType` aus fester Liste), `copy-text` (String, begrenzt),
   `dismiss-update` (Versionsmuster `^\d+\.\d+\.\d+$`), `check-assets` (Boolean). Falsche Typen: ablehnen und im Test belegen.
3. **`postMessage` zwischen Hülle und Werkzeug:** `app/index.html` (Zeile um 319) verarbeitet `message`-Ereignisse ohne Absenderprüfung, und beide Seiten senden mit Ziel `'*'`.
   Prüfen: `event.origin === 'app://ps'` und `event.source === <Werkzeug-iframe>.contentWindow`; Antworten mit Zielursprung `'app://ps'` statt `'*'`. Dasselbe in `app/privacy-shield.html` (Zeile um 5541).
   Hinweis: Dieselbe Datei wird als Web-Tool im Browser verwendet; dort gibt es keine Hülle, die Prüfung darf im Browser nichts brechen (Zweig über `window.parent !== window`).
4. **Berechtigungen:** `session.setPermissionRequestHandler((wc, permission, cb) => cb(false))` (Kamera, Mikrofon, Standort, Benachrichtigungen verweigern), `setPermissionCheckHandler` entsprechend; zusätzlich Test, dass `navigator.mediaDevices.getUserMedia` abgelehnt wird.
5. **Entwicklerwerkzeuge:** im gebauten Programm sind sie nicht erreichbar (Menü entfernt); Tastenkombination verhindern oder ausdrücklich zulassen für Support (Entscheidung: nicht zulassen).

Jeder Punkt ein Commit mit zugehörigem Test (zuerst rot, dann grün).

- [ ] **6. Abhängigkeiten melden lassen (`npm audit`)**

```bash
npm audit --omit=dev            # erwartet: keine Treffer (Laufzeit besteht aus Electron und electron-updater)
npm audit                       # Build-Werkzeuge: Befunde dokumentieren, nur reparieren, wenn ohne Risiko (npm audit fix ohne --force)
```

Aus dem früheren Stand sind 17 Befunde in der Build-Werkzeugkette bekannt; sie betreffen nicht die ausgelieferte Anwendung. Nicht mit `--force` reparieren (ändert Hauptversionen).

- [ ] **7. Actions-Versionen**: In `.github/workflows/*.yml` `actions/checkout`, `setup-node`, `cache` auf aktuelle Hauptversionen heben (Node-20-Laufzeit der Actions läuft aus), `actionlint` ausführen:

```bash
docker run --rm -v "$PWD:/repo" -w /repo rhysd/actionlint:latest      # oder lokal installiertes actionlint
```

## Abnahme

* Alle Tests grün unter Electron 44, auch gegen das gebaute Programm auf Linux; CI grün auf Windows und macOS.
* `@electron/fuses read` zeigt die gesetzten Schalter; Pakettest grün.
* Tests für Absender-, Argument- und Ursprungsprüfung existieren und waren vor der Änderung rot.
* Kein neuer Netzzugriff (bestehender Test `kein Netzzugriff der Seiten` bleibt grün).
