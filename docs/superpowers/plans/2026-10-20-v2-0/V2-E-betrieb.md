# V2-E: Betrieb (E1 bis E5)

Regeln und Rollen: `V2-00-INDEX.md`. Zielgruppe: Teams und IT-Abteilungen (PrivacyShield als B2B-Leitprodukt, siehe Projektgedächtnis "Kommerzialisierung").

---

## E1: Kommandozeilenmodus (Stapel ohne Oberfläche)

**Marke:** S. **Aufwand:** 4 h. **Voraussetzung:** A2 (Bericht), A3 (Zuordnung), B1 (Projekt), C3 (Richtlinie optional).

**Aufruf** (gleiche Programmdatei, `--cli` schaltet den Modus):

```
PrivacyShield --cli --in <Datei|Ordner> --out <Ordner> [--profile standard|finance|medical|strict|maximal]
              [--ai auto|off] [--policy policy.json] [--report] [--map zuordnung.psmap --password-env VARIABLE]
              [--fail-on-findings] [--recursive] [--quiet]
```

Verhalten: Dateien (Formate wie in der Oberfläche) lesen, mit gemeinsamem Platzhalterraum (B1) anonymisieren, je Datei `<out>/anonymisiert_001.txt` ..., bei `--report` zusätzlich `bericht.txt`/`bericht.json`, bei `--map` die verschlüsselte Zuordnung. **Passwörter nie als Argument** (sichtbar in Prozesslisten): nur über `--password-env <Name>` oder Standardeingabe (`--password-stdin`). Rückgabecodes: `0` Erfolg; `2` falsche Argumente; `3` Eingabefehler (Datei fehlt/Format); `4` Gegenprüfung (A1) mit Funden und `--fail-on-findings`; `5` Modell/Installation defekt (KI gefordert, aber nicht startbar); `6` sonstiger Fehler. Ausgabe nur auf Standardausgabe/-fehler, **keine Dokumentinhalte** in Meldungen.

**Umsetzung:** Vor dem Fensteraufbau in `main.js` Argumente lesen (`process.argv`, `app.commandLine`); bei `--cli` ein **verstecktes** Fenster (`show: false`) mit einer Seite `app/cli.html` laden, die dieselben Module (`app/lib/*`, Erkennungskern, KI-Worker) nutzt; Hauptprozess liefert Dateien per IPC und schreibt Ergebnisse (Absenderprüfung aus F2 gilt). Keine zweite Erkennungsimplementierung. Der Netzwerkblock des Hauptprozesses bleibt aktiv.

**Bekannte Einschränkung Windows:** Als Fenster-Programm hängt sich die exe nicht an eine Eingabeaufforderung; Ausgaben erscheinen nur bei Umleitung oder `start /wait`. Der **Rückgabecode** funktioniert mit `start /wait PrivacyShield.exe --cli ...`. Dokumentieren; zusätzlich `--log <Datei>` (Meldungen in Datei). Test unter Windows in der CI mit `spawn` und umgeleiteten Strömen.

**Tests (`tests/cli.test.mjs`, echte App, `--cli`):** ein Ordner mit 3 Dateien ergibt 3 Ausgabedateien, Bericht, Rückgabecode 0; falsches Profil Code 2; fehlende Datei Code 3; `--fail-on-findings` mit einer Datei, die absichtlich ein Leck in der Gegenprüfung erzeugt (Whitelist-freie Dummy-Regel), Code 4; KI gefordert, Modell fehlt (Testvariante): Code 5 mit klarer Meldung; `--map` ohne `--password-env`: Code 2; Passwort aus Umgebungsvariable entschlüsselt die Zuordnung (Rundlauf); kein Fenster erscheint (`BrowserWindow.getAllWindows()` sichtbar leer, Test über Playwright nicht möglich, daher Prüfung am Prozess: beendet sich selbst, kein Hängenbleiben, Zeitgrenze 60 s); Netzwerk bleibt gesperrt (bestehender Test).

**Abnahme:** Tests grün unter Linux (xvfb) und Windows (CI); Kurzdokumentation `docs/kommandozeile.md` mit Beispielen und Rückgabecodes.

---

## E2: "Öffnen mit", Einzelinstanz

**Marke:** H. **Aufwand:** 2 h.

**Entscheidung (Voreinstellung):** **Keine** automatische Dateizuordnung (`fileAssociations` in electron-builder würde unter Windows den Standardöffner für `.txt`/`.docx`/`.pdf` übernehmen können; unerwünscht). Stattdessen: Dateien per **Argument**, **Drag auf das Programmsymbol** und **Windows-Kontextmenü "Öffnen mit"** (der Nutzer wählt es selbst) unterstützen.

- [ ] `app.requestSingleInstanceLock()`; zweite Instanz übergibt ihre Dateiargumente an die erste (`second-instance`), diese holt das Fenster nach vorn und lädt die Dateien über denselben Weg wie die Auswahl (B1: mehrere Dateien möglich); die zweite Instanz beendet sich.
- [ ] Dateiargumente beim Start (`process.argv`, ohne Elektron-/Chromium-Schalter) und macOS `open-file`-Ereignis (vor `ready` puffern).
- [ ] Nur erlaubte Endungen laden, sonst Meldung; Pfade nie in Fehlermeldungen an Dritte; Größenlimit 30 MB je Datei wie bisher.
- **Tests:** Start mit Dateiargument lädt die Datei (Text im Eingabefeld); zweiter Start mit weiterer Datei fügt sie der Liste hinzu und es gibt weiterhin **ein** Fenster; unbekannte Endung ergibt Meldung.

---

## E3: Zentrale Konfiguration (Kann)

Datei `policy.json` (Format aus C3, erweitert um Felder) an festem Ort: Windows `%PROGRAMDATA%\PrivacyShield\policy.json`, Linux `/etc/privacyshield/policy.json`, macOS `/Library/Application Support/PrivacyShield/policy.json`. Zusatzfelder: `forceProfile`, `aiMode`, `autoUpdate: false`, `requireEncryptedMap: true`, `disableCsvExport: true`. Vorrang vor Benutzereinstellungen; gesperrte Optionen in der Oberfläche sichtbar deaktiviert mit Hinweis "von Ihrer Organisation festgelegt". Tests über Umgebungsvariable `PS_POLICY_DIR` (Testumleitung).

## E4: Tragbare Version (Kann)

electron-builder Ziel `portable` (Windows): eine exe ohne Installation, nützlich, wenn Installer blockiert werden. Hinweis: entpackt beim Start in einen temporären Ordner (langsamer Start, Virenschutz prüft strenger). Test: Start der portablen Datei in der CI, Modell vorhanden. Entscheidung nach Rückmeldungen aus 1.8.0 (Häufigkeit von `MODEL_FILE`-Fehlern).

## E5: Signierung (Kann, Gate G4)

Vorgängerplan `09-signierung-und-vertrauen.md` Teil B. Voraussetzung: Entscheidung und Kauf durch den Nutzer; kein Konto und keine Zugangsdaten durch Ausführende.
