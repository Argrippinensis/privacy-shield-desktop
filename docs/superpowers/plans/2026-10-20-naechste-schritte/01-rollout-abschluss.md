# WP 01: Rollout 1.7.0 abschließen

**Ziel:** Alles, was nach der Veröffentlichung von v1.7.0 offen ist, erledigen oder dokumentiert an das richtige Paket übergeben.
**Modell:** Haiku oder Sonnet niedrig. **Aufwand:** 0,5 Stunden. **Gate:** keines.

## Stand (am 20.10.2026 geprüft, Belege in `anhang-evidenz.md`)

| Prüfpunkt | Ergebnis |
|---|---|
| Release v1.7.0 öffentlich, "latest" | ja |
| Installer vorhanden (exe 184 MB, zip 212 MB, AppImage 220 MB, deb 195 MB), SHA-512 der exe stimmt mit `latest.yml` | ja |
| Windows-Installer enthält alle 19 mitgelieferten Dateien (Modell, OCR-Daten, Laufzeit) in exakt der Größe aus `vendor.lock.json` | ja (mit `7z l -slt` geprüft) |
| Update 1.6.2 auf 1.7.0, echter Ablauf unter Linux (AppImage): Hinweis, Download, Austausch der Datei (SHA-512 stimmt), Neustart in 1.7.0 | ja, automatisiert mit `scripts/verify-release.mjs --upgrade-from` (aus Patch 0009) |
| Website `arcangeli.eu/desktop` zeigt v1.7.0, drei Download-Links 200 | ja |
| Lokale Repos und Branches | aufgeräumt (gemergter Branch gelöscht, `main` synchron) |
| Windows- und macOS-Programm tatsächlich gestartet | **nein, nicht möglich in dieser Umgebung** |
| macOS-ZIP | nur arm64, **keine** Code-Signatur (0 `_CodeSignature`-Einträge): auf Intel-Macs unbrauchbar, auf Apple Silicon ohne Eingriff nicht startbar. Bestand schon in 1.6.2 und früher. Behoben in 1.8.0 (Patch 0009). |
| Release-Text | nur "PrivacyShield v1.7.0"; `builder-debug.yml` ist als Asset veröffentlicht. Behoben in 1.8.0 (CHANGELOG, Patch 0009). |

## Gemeldeter Fehler: "Modell konnte nicht gefunden werden" (Ursache geklärt)

Rückmeldung eines Nutzers (Foto): KI-Panel zeigt `FALLBACK (WORTLISTEN)` und "Modell konnte nicht geladen werden. Die Standard-Erkennung
(Regex + Klicken) funktioniert ohne Einschränkung."; eine ausgewählte Datei steht mit "0 B" in der Liste; die App bietet bereits das Update auf 1.7.0 an.

**Welche Version hat der Nutzer? Version 1.1.0.** Er hat das Programm am 19.10.2026 um 20:21 Uhr (MESZ) heruntergeladen. Verlauf der Download-Seite
(`git log` der Seite, Release-Zeitstempel von `gh release list`):

| Zeitraum | Die Seite verlinkte | Programmversion in der Datei |
|---|---|---|
| bis 19.10.2026, 21:52 Uhr | Release `v1.1.5` (Dateinamen `...-1.1.0.exe`) | **1.1.0** (`package.json` im Tag: `"version": "1.1.0"`) |
| 19.10., 21:52 bis 20.10., 07:44 Uhr | Release `v1.6.2` | 1.6.2 |
| ab 20.10., 07:44 Uhr | Release `v1.7.0` | 1.7.0 |

Der Download lag also 91 Minuten vor der Umstellung der Seite; das ist dieselbe Ursache wie in der ursprünglichen Meldung ("warum liefert der Download
nicht gleich das Update mit"). Dass die App 1.7.0 anbietet, passt dazu (Update-Feed `latest.yml` zeigt seit 20.10., 07:39 Uhr auf 1.7.0).

**Ursache (nachgestellt, nicht vermutet):** Version 1.1.0 enthält das KI-Modell nicht, sondern lädt es beim ersten Gebrauch aus dem Internet
(Bibliothek von `cdn.jsdelivr.net`, Modell von `huggingface.co`, zusammen etwa 135 MB). Scheitert das, zeigt die App immer denselben Text; der echte
Fehler steht nur in der Konsole, die in der Desktop-App nicht erreichbar ist. Reproduktion mit dem Stand des Tags `v1.1.5` unter Electron:

| Szenario | Ergebnis in der App | Konsole (für den Nutzer unsichtbar) |
|---|---|---|
| kein Netz | Fehlerpanel mit dem Text vom Foto | `Failed to fetch dynamically imported module: https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.5.2` |
| nur Hugging-Face-Hosts gesperrt (Firmennetz, Filter, Proxy) | Fehlerpanel mit dem Text vom Foto | `Failed to fetch` (Namensauflösung schlägt fehl) |

Typische Auslöser beim Nutzer: Firmen- oder Hotelnetz mit Filter/Proxy, Virenschutz mit Webschutz, VPN, Netzwerkunterbrechung während des 135-MB-Downloads.
Welcher es war, lässt sich ohne seine Konsole nicht sagen; **das Ergebnis ist in jedem Fall dasselbe und mit 1.7.0 behoben**, weil das Modell dort Teil der Installation
ist (kein Download, kein Netz nötig; 19 Dateien im Installer geprüft, siehe oben).

**Die Hypothese "Installation von 1.7.0 unvollständig oder Datei in Quarantäne" trifft auf diesen Nutzer nicht zu** (er hat 1.7.0 nie installiert). Sie bleibt als
Restrisiko für 1.7.0 und ist durch Patch 0011 abgedeckt.

**Weitere Befunde aus dem Foto:**
1. Der Zusatz "funktioniert ohne Einschränkung" ist falsch. Gemessen (WP 05): ohne Modell bleiben bei 21 von 150 Prüffällen und 18 von 276 synthetischen Werten
   Namen, Organisationen oder Orte stehen; mit Modell 4 bzw. 1.
2. "0 B": Die gewählte Datei hat 0 Bytes (typisch bei Dateien, die nur online in OneDrive/SharePoint liegen, oder bei einer noch geöffneten Datei). Die App zeigt sie
   stumm als geladen; das Textfeld bleibt leer. Der Dateiname im Foto (`20261020_...`) ist von heute: wahrscheinlich eine frisch synchronisierte Cloud-Datei.

**Umgesetzt (Patch 0011, im Referenzstand, geprüft: 33 von 33 Tests):** Die App nennt den Grund samt Lösungshinweis, prüft die Installation gegen ein Manifest, bietet
"Erneut versuchen" und "Details kopieren", wiederholt bei Thread-/Speicherproblemen einmal mit einem Thread, erklärt 0-Byte-Dateien und sagt ehrlich, dass die
Standard-Erkennung weniger erkennt. Tests mit absichtlich beschädigter Installation.

**Sofort für den Nutzer (kein Warten auf 1.8.0 nötig):**
1. Das angebotene Update auf 1.7.0 installieren: im Programm "Jetzt aktualisieren" klicken; das Programm lädt die neue Version (etwa 184 MB), startet sich nach dem Download selbst neu und installiert. Falls der Download im Programm wieder an seinem Netz scheitert:
   den Installer von `arcangeli.eu/desktop` im Browser laden und über die alte Installation setzen.
2. Nach dem Update oben rechts `v1.7.0` prüfen; im KI-Panel nach der ersten Analyse "Aktiv (NER-Modell)". Das Modell wird nun lokal gelesen, kein Netz nötig.
3. Die Datei mit "0 B": in OneDrive/Explorer "Immer auf diesem Gerät behalten" wählen oder lokal kopieren, dann erneut öffnen.
4. Meldet 1.7.0 weiterhin "Modell konnte nicht geladen werden": Windows-Sicherheit, "Schutzverlauf" auf blockierte Elemente prüfen und prüfen, ob
   `%LOCALAPPDATA%\Programs\PrivacyShield\resources\app.asar.unpacked\app\models\Xenova\distilbert-base-multilingual-cased-ner-hrl\onnx\model_quantized.onnx`
   135.359.829 Bytes groß ist; Rückmeldung mit Windows-Version und Arbeitsspeicher. Ab 1.8.0 genügt "Details kopieren".

**Andere Betroffene:** Wer vor dem 19.10. um 21:52 Uhr geladen hat, hat 1.1.0, wer bis 20.10. 07:44 Uhr geladen hat, 1.6.2 (gleiches Modellverhalten). Beide bekommen
das Update angeboten. Das Web-Tool (`arcangeli.eu/tools/privacyshield`) lädt das Modell ebenfalls aus dem Internet und zeigt in gesperrten Netzen denselben Text:
Diagnose und ehrlicher Wortlaut dafür in WP 06.

**Offene Entscheidung D11 (nicht jetzt umsetzen):** Reparatur-Download des Modells durch den Hauptprozess (nur auf Knopfdruck, festgeschriebene Revision,
SHA-256-Prüfung, Ablage im Benutzerordner). Dafür: hilft bei Quarantäne. Dagegen: größere Angriffsfläche, bricht die Aussage "kein Netzzugriff", Virenschutz kann
auch die neue Datei blockieren. Empfehlung: zuerst die Diagnosedaten aus 1.8.0 abwarten.

## Schritte

- [ ] **1. Nutzer zurückmelden:** Die vier Sofortschritte oben (Zeitpunkt: heute). Erwartung: Update auf 1.7.0 löst das Problem; Rückmeldung nur bei Fortbestehen.
- [ ] **2. Dokumentation prüfen und Textvorschlag liefern:** `~/CLAUDE.md` Abschnitt "privacy-shield-desktop" ist veraltet. Statt die Datei selbst zu ändern
  (Änderungen an Anweisungsdateien kann der Auto-Modus ablehnen), dem Nutzer diesen Ersatztext zum Einfügen zeigen:

  ```markdown
  ## privacy-shield-desktop

  Electron-App (Version in `package.json`). Alles lokal: Bibliotheken und KI-Modell werden von `npm run fetch-vendor` (Pruefsummen in
  `scripts/vendor.lock.json`) nach `app/vendor`, `app/models` geladen und gehoeren zur Installation.
  Entwicklung: `npm install && npm start`. Tests: `xvfb-run -a npm test` (Linux), Erkennungsmessung `npm run eval`.
  Release: CHANGELOG.md ergaenzen, Version in package.json erhoehen, Pull Request, nach schriftlicher Bestaetigung `git tag vX.Y.Z && git push --tags`;
  danach `node scripts/verify-release.mjs vX.Y.Z --upgrade-from vA.B.C`. Die Version steht nur in package.json (kein APP_VERSION/version.json).
  Neuer Erkennungsfehler: zuerst als Fall in `tests/eval/cases*.mjs`, dann beheben.
  ```
- [ ] **3. Aufräumen eigener Temp-Daten:** `rm -rf /tmp/ps-debug /tmp/ps-eval /tmp/ps-lab /tmp/ps-lab2 /tmp/ps-clean /tmp/ps-release /tmp/ps-upg /tmp/ps-verify-am /tmp/ps-v170 /tmp/pwa-lab /tmp/web-lab /tmp/web-desktop`
  (nur diese Ordner, nichts anderes). `~/projects/privacy-shield-desktop/dist` (gitignoriert, ca. 450 MB) kann ebenfalls gelöscht werden.
- [ ] **4. Offene Punkte an die Pakete übergeben:** Release-Text und macOS: 02. Website-Links und Texte: 03. Handy-App: 04.

## Abnahme

* Der Nutzer hat die Sofortschritte erhalten.
* `git status` im Desktop-Repo ist sauber (außer dem Plan-Branch), `git branch -a` zeigt keinen gemergten Branch mehr.
* Der Textvorschlag für `CLAUDE.md` wurde dem Nutzer gezeigt (Übernahme ist seine Entscheidung).
