# PrivacyShield Desktop

Desktop-App zum Anonymisieren von Dokumenten. Alles läuft lokal: Bibliotheken, OCR und das KI-Modell
(Namen, Organisationen, Orte) sind Teil der Installation. Die Seiten selbst haben keinen Netzzugriff
(Content-Security-Policy plus Sperre im Hauptprozess); nur die Update-Prüfung des Programms nutzt das Internet.

Kurzanleitung für Anwender: `docs/benutzerhandbuch.md`.

## Funktionen (2.0)

* **Anonymisieren, lokal.** Sensible Angaben (Namen, Adressen, IBAN, Telefon, E-Mail, Kennnummern u. a.) werden durch Platzhalter wie `{{NAME_1}}` ersetzt. Die Rückübersetzung der Antwort einer KI stellt die Originalwerte wieder her (über die `.psmap` exakt; die unverschlüsselte CSV ist bei wörtlichen Platzhaltern im Originaltext nicht verlustfrei).
* **KI-Erkennung und Standard-Erkennung.** Mit dem mitgelieferten Modell erkennt die App zusätzlich Personen, Organisationen und Orte. Ohne Modell (ausgeschaltet, zu wenig Arbeitsspeicher oder Startfehler) gilt die Standard-Erkennung aus Regeln und Wortlisten; sie erkennt weniger, vor allem Namen, Firmen und Orte.
* **Projekte mit mehreren Dokumenten.** Mehrere Dateien (Auswahl oder Ablegen) bilden eine Liste, werden gemeinsam anonymisiert und als ZIP gespeichert (höchstens 200 Dokumente je Projekt).
* **Gemeinsame Platzhalter.** Dieselbe Person bekommt in allen Dokumenten eines Projekts denselben Platzhalter. Nennt ein Text dieselbe Person in mehreren Formen (Hans Müller, Herr Müller, Hans), tragen die Formen dieselbe Nummer mit Endung: `{{NAME_1}}`, `{{NAME_1.NACHNAME}}`, `{{NAME_1.VORNAME}}`, `{{NAME_1.KURZ}}`. Verknüpft wird nur, wenn es eindeutig ist.
* **Gegenprüfung.** Nach dem Anonymisieren läuft die Erkennung (mit Regeln und Wortlisten, ohne KI-Modell) ein zweites Mal über das Ergebnis und zeigt mögliche Reste mit Schwere (hoch, mittel). Reste lassen sich maskieren oder ignorieren.
* **Bericht.** `bericht.txt` (Einzeldokument) bzw. `bericht.txt` und `bericht.json` (Projekt-ZIP, Kommandozeile): Programmversion, Zeitpunkt, Profil, KI-Modus, Zahl der Freigaben und eigenen Regeln, je Dokument Zeichenzahl, Funde je Kategorie, Ergebnis der Gegenprüfung und SHA-256 des Ergebnistextes. Der Bericht enthält keine personenbezogenen Werte.
* **Verschlüsselte Zuordnung.** Die Zuordnung Platzhalter zu Originalwert wird als `.psmap` gespeichert: AES-256-GCM, Schlüssel per PBKDF2-HMAC-SHA-256 (600.000 Iterationen) aus einem Passwort von mindestens 10 Zeichen, nur über Web Crypto. **Ohne das Passwort ist die Zuordnung nicht wiederherstellbar.** Die unverschlüsselte CSV bleibt als bewusste Alternative (mit Rückfrage); ältere CSV-Zuordnungen lassen sich weiterhin laden. Das Format ist im Quelltext `app/lib/psmap.js` nachzulesen (Kopf von 38 Bytes mit Kennung `PSM1`, Iterationszahl, Salz und Nonce, danach der verschlüsselte JSON-Inhalt).
* **Prüfansicht mit Rückgängig.** Die Seitenleiste "Funde" listet alle Funde nach Typ und Wert, mit Filter, Suche und "Nur Zweifelsfälle". Einzelne Werte oder ganze Typen lassen sich freigeben oder wieder maskieren; Rückgängig und Wiederholen mit Strg+Z, Strg+Y (oder Strg+Umschalt+Z) bzw. Cmd+Z, Cmd+Umschalt+Z. Manuelle Markierungen (Modus "Annotieren") bleiben beim erneuten Anonymisieren erhalten.
* **Eigene Regeln und Richtlinien.** Eigene Begriffe und Muster, als Richtliniendatei `policy.json` importierbar und exportierbar (siehe unten).
* **Kommandozeile.** Stapelverarbeitung ohne Fenster mit `--cli` (siehe unten).
* **Öffnen mit und Einzelinstanz.** Dateien lassen sich als Programmargument, per "Öffnen mit" oder durch Ziehen auf das Programmsymbol übergeben; ein zweiter Start übergibt die Dateien an die laufende App. Es wird keine Standard-Dateizuordnung eingerichtet.
* **Barrierefreiheit.** Weitgehende Bedienung mit der Tastatur (Ausnahme: Der Modus "Annotieren" ist nur mit der Maus bedienbar), sichtbarer Fokus, Beschriftungen für Hilfstechnik, Kontraste, reduzierte Bewegung. Der automatische Test (axe-core mit den Regelsätzen WCAG 2.0 und 2.1, Stufen A und AA) meldet in den geprüften Ansichten keine Verstöße der Stufen serious oder critical; Restbefunde stehen in `docs/a11y-backlog.md`.
* **Info-Dialog.** Version, Systemdaten, Zustand der KI-Installation, "Diagnose kopieren" (ohne Dokumentinhalte und Dateinamen), Lizenzen, Update-Prüfung.

## Unterstützte Formate und Grenzen

Eingabe: `.txt`, `.csv`, `.md`, `.json`, `.pdf` (auch gescannt, per OCR), `.docx`, `.rtf`, `.xlsx`, `.pptx`, `.odt`, `.ods`, `.odp`, `.eml`, `.html`, `.htm`. Die alten Binärformate `.doc`, `.xls` und `.ppt` werden mit einem Hinweis abgelehnt (bitte als `.docx`, `.xlsx`, `.pptx` speichern).

Ausgabe: reiner Text (`.txt`), PDF und im Projekt ein ZIP. Ein formattreuer Export (DOCX, XLSX) ist nicht Teil von 2.0.

Grenzen:

* Dateigröße höchstens 30 MB; leere Dateien (0 Bytes, z. B. nur online in OneDrive vorhanden) werden erklärt abgelehnt.
* Office-Archive (ZIP-Formate) werden vor dem Lesen geprüft: höchstens 2.000 Einträge, höchstens 200 MiB entpackt, auffällig starke Komprimierung wird abgelehnt.
* Textdateien: UTF-8 (mit oder ohne BOM) und UTF-16 mit BOM; ist eine Datei kein gültiges UTF-8, wird sie als Windows-1252 gelesen. Bei DOCX werden zusätzlich Kopfzeilen, Fußzeilen, Fußnoten, Endnoten und Kommentare nach dem Haupttext angehängt.
* PDF: Die Oberfläche nennt für PDF mit Textebene etwa 50 Seiten als Richtwert; eine feste Seitengrenze gibt es nicht (nur die 30 MB). Gescannte PDFs werden per OCR (Deutsch und Englisch) gelesen, aber nur die ersten 20 Seiten; spätere Seiten fehlen im Ergebnis. Enthält ein PDF teils Text, teils Scan-Seiten, wird nicht per OCR gelesen, und die Scan-Seiten fehlen. Texterkennung in Bildern innerhalb anderer Formate gibt es nicht; Zahlen und Angaben, die nur als Bild vorliegen, werden nicht erkannt. Die Kommandozeile liest keine gescannten PDFs.
* Projekt: höchstens 200 Dokumente und 200 MB Text.
* Eine präparierte oder sehr große DOCX-Datei kann das Programm stark verlangsamen oder zum Absturz bringen (hoher Speicherbedarf); betroffen ist nur die Verfügbarkeit, nicht der Datenschutz.
* Die CSV-Zuordnung lässt Einträge für wörtlich im Originaltext stehende Platzhalter weg; die Rückübersetzung aus der CSV ist dann nicht verlustfrei, die aus der `.psmap` schon.
* Erkennung ist nie vollständig. Das Ergebnis muss vor der Weitergabe geprüft werden. Bekannte Lücken stehen in `docs/erkennung-entscheidungen.md` und im Benutzerhandbuch.

## Kommandozeile

    PrivacyShield --cli --in <Datei|Ordner> --out <Ordner> [--report] [--map zuordnung.psmap --password-env VARIABLE]

Optionen, Rückgabecodes, Beispiele für Linux, macOS und Windows: `docs/kommandozeile.md`. Unbekannte Schalter nach `--cli` werden mit Code 2 abgelehnt (einige Chromium-Schalter wie `--no-sandbox` und `--disable-gpu` bleiben erlaubt; die feste Liste steht in `app/lib/cliargs.js`). Unter Windows gibt es kein `--password-stdin` (dort `--password-env`).

## Richtliniendatei

Eigene Kennungen und Begriffe als `policy.json` (Oberfläche: Bereich "Eigene Regeln"; Kommandozeile: `--policy`). Format und die erlaubte Teilmenge regulärer Ausdrücke (keine unbegrenzten Wiederholungen, keine Rückverweise, keine Vor- und Rückschau, `{m,n}` bis 64): `docs/policy-format.md`.

## Entwicklung

    npm install
    npm start          # lädt beim ersten Mal Bibliotheken und Modell (ca. 170 MB), danach nur Prüfsummen-Check

Die Version steht nur in `package.json`; Fußzeile und Berichte zeigen sie von dort. Weitere Dokumente: `docs/erkennung-entscheidungen.md` (Entscheidungen und bekannte Lücken der Erkennung), `docs/a11y-backlog.md` (Barrierefreiheit), `docs/v2/web-tool-kern.md` (Erkennungskern für das Web-Tool), `docs/abnahme-windows.md` (Handprüfung vor einer Veröffentlichung).

## Gebündelte Komponenten (`app/vendor`, `app/models`)

Nicht im Git (das Modell ist 135 MB, GitHub erlaubt 100 MB pro Datei). `scripts/vendor.lock.json` legt exakte
Versionen und SHA-256-Prüfsummen fest; `npm run fetch-vendor` stellt sie bereit und prüft sie. Start, Tests und
Builds rufen das automatisch auf. Versionswechsel bewusst mit `node scripts/fetch-vendor.mjs --update-lock`.
Lizenzen: `THIRD_PARTY_NOTICES.md` (wird mit der Installation ausgeliefert).

Das Tailwind-CSS ist vorkompiliert (`app/css/tailwind.css`). Nach Änderungen an Klassen in `app/*.html`:
`npm run build:css`.

## Tests

    npm run test:unit                  # Unit-Tests der Module (ohne Electron, Sekunden)
    xvfb-run -a npm test               # alle Suiten (Linux ohne Display; sonst: npm test)
    PS_PACKAGED_BIN=<Pfad> npm test    # gegen eine gepackte Anwendung (z. B. dist/linux-unpacked/privacy-shield-desktop)
    PS_SKIP_PERF=1                     # Zeitprüfung überspringen (langsame Rechner)

Die Tests starten die echte App mit totem Proxy (kein Internet). Sie prüfen unter anderem: kein Netzzugriff der
Seiten, KI-Modell und OCR offline, Oberfläche bleibt bedienbar, Update-Dialoge (mit lokalem Mock-Update-Server),
externe Links, Speicheranzeige, große Dokumente, Barrierefreiheit (axe-core, nur Entwicklung), Kommandozeile, Projekte,
Hausregeln (keine Emojis, Umlaute).

### Erkennungsqualität

    npm run eval                           # Messung mit Tabelle (Lecks und Falsch-Maskierungen je Kategorie, Modi wortlisten, fallback, ki)
    npm run eval -- --set v2               # zweite, größere Fallmenge (tests/eval/cases-v2.mjs, Basis baseline-v2.json)
    npm run eval:baseline                  # Baseline nach bewusster Verbesserung festschreiben
    npm run golden:update                  # Golden-Stand (Beispieltext) nach bewusster Änderung neu erzeugen
    node tests/eval/diff-reference.mjs     # Differenztest gegen die Referenz von 1.8.0 (in der App; mit --node im Erkennungskern allein, Sekunden)

`tests/eval/cases.mjs`, `tests/eval/cases-gdpr.mjs` und `tests/eval/cases-v2.mjs` sind die Testsätze, `tests/eval/generate.mjs` erzeugt
synthetische Dokumente mit bekannter Wahrheit. Ein Leck ist ein personenbezogener Wert, der nach dem Anonymisieren noch im
Text steht. `tests/eval.test.mjs` und `tests/eval-v2.test.mjs` verhindern, dass Lecks gegenüber den Baselines zunehmen.
Der Differenztest vergleicht die Ausgabe mit der Referenz `tests/golden/reference-v1.8.json`; erlaubte Abweichungen stehen mit
Begründung in `tests/golden/reference-allow.json`, jede andere Abweichung ist ein Fehler.
**Neuer Fehler im Betrieb: zuerst als Fall in einen Testsatz (rot), dann beheben (grün).**

## Build

    npm run build:win | build:mac | build:linux

Windows: NSIS-Installer; macOS: ZIP für Intel und Apple Silicon (ad-hoc signiert); Linux: AppImage und deb.

## Release

1. Abschnitt in `CHANGELOG.md` ergänzen und mit Datum überschreiben (`## [x.y.z] - JJJJ-MM-TT`), Version in `package.json` erhöhen, per Pull Request nach `main`.
2. `git tag vX.Y.Z && git push --tags`

GitHub Actions baut alle Plattformen und testet jedes gebaute Programm. Der Release-Job (`scripts/check-release-inputs.mjs`) prüft vorab, dass der Tag zur Version in `package.json` passt, dass `CHANGELOG.md` einen datierten Abschnitt für diese Version hat und dass die fünf Installationsdateien `PrivacyShield-Setup.exe`, `PrivacyShield-mac-arm64.zip`, `PrivacyShield-mac-x64.zip`, `PrivacyShield.AppImage` und `PrivacyShield.deb` vorhanden und nicht leer sind. Das Release entsteht zunächst als Entwurf (Release-Text aus `CHANGELOG.md`, `SHA256SUMS.txt`) und wird erst veröffentlicht, wenn alle Dateien hochgeladen sind. Danach: `node scripts/verify-release.mjs vX.Y.Z [--upgrade-from vA.B.C]`.
Die Website verlinkt auf `releases/latest/download/<fester Dateiname>` und muss bei neuen Versionen nicht angepasst werden.
Vor einer Veröffentlichung läuft die Handprüfung auf einem echten Windows-Rechner (`docs/abnahme-windows.md`).
