# Kommandozeile: Stapel ohne Oberfläche

PrivacyShield kann Dokumente auch ohne Fenster anonymisieren, zum Beispiel für Skripte oder Aufgabenplanung. Alles läuft wie in der Oberfläche lokal und ohne Netz; es gibt keine zweite Erkennung, sondern dieselben Regeln, Wortlisten und (auf Wunsch) dasselbe KI-Modell.

Die gleiche Programmdatei startet mit `--cli` im Kommandozeilenmodus. Es öffnet sich kein sichtbares Fenster, und eine gleichzeitig laufende Oberfläche bleibt unberührt.

## Aufruf

```
PrivacyShield --cli --in <Datei|Ordner> --out <Ordner>
              [--profile standard|finance|medical|strict|maximal]
              [--ai auto|off] [--policy policy.json] [--report]
              [--map zuordnung.psmap (--password-env VARIABLE | --password-stdin)]
              [--fail-on-findings] [--recursive] [--quiet] [--log <Datei>]
```

| Option | Bedeutung |
|---|---|
| `--in` | Eine Datei oder ein Ordner. In einem Ordner werden nur Dateien mit unterstützter Endung verarbeitet (mit `--recursive` auch Unterordner). Versteckte Dateien, Office-Sperrdateien (`~$...`) und verknüpfte Dateien oder Ordner (Symlinks) werden übergangen und nicht gelesen. |
| `--out` | Ausgabeordner; wird angelegt. Vorhandene Dateien gleichen Namens werden überschrieben. Er darf nicht im Eingabeordner liegen (bei einer einzelnen Datei als Eingabe: nicht in deren Ordner) und nicht die Eingabedatei sein. |
| `--profile` | Erkennungsprofil, Standard `standard`. `maximal` ist ein anderer Name für `strict`. |
| `--ai` | `auto` (Standard): KI-Erkennung nutzen. Ist das Modell nicht startbar, bricht der Lauf mit Code 5 ab; es gibt kein stilles Zurückfallen. `off`: nur Regeln und Wortlisten. |
| `--policy` | Datei mit eigenen Regeln (gleiches Format wie in der Oberfläche). |
| `--report` | Schreibt zusätzlich `bericht.txt` und `bericht.json` in den Ausgabeordner. |
| `--map` | Schreibt die verschlüsselte Zuordnung (`.psmap`) genau an diesen Pfad; der Ordner wird angelegt. Braucht eine Passwortquelle. Darf nicht die Eingabedatei sein und nicht im Eingabeordner liegen. |
| `--password-env` | Name einer Umgebungsvariablen mit dem Passwort (mindestens 10 Zeichen). |
| `--password-stdin` | Das Passwort wird als eine Zeile von der Standardeingabe gelesen. | Unter Windows liest die gebaute Programmdatei (ein Fenster-Programm) keine Standardeingabe: dort bitte `--password-env` verwenden (Rückgabecode 2 mit Meldung, wenn nichts gelesen wird).
| `--fail-on-findings` | Rückgabecode 4, wenn die Gegenprüfung in mindestens einem Dokument mögliche Reste meldet. |
| `--recursive` | Auch Unterordner des Eingabeordners einlesen. |
| `--quiet` | Keine Fortschrittsmeldungen (Fehler und Zusammenfassung bleiben). |
| `--log` | Meldungen zusätzlich an diese Datei anhängen (UTF-8, mit Zeitstempel). Darf nicht die Eingabedatei sein und nicht im Eingabeordner liegen (Code 3; dorthin wird auch keine Meldung geschrieben). |

**Passwörter nie als Argument.** Ein Argument ist in Prozesslisten für alle sichtbar. `--password` (auch `--passwort`) wird deshalb mit Code 2 abgelehnt. Das Passwort gehört in eine Umgebungsvariable oder auf die Standardeingabe.

## Ergebnis

Die Dokumente werden in einem gemeinsamen Platzhalterraum anonymisiert: Dieselbe Person bekommt in allen Dateien denselben Platzhalter. Die Reihenfolge ergibt sich aus der Sortierung der relativen Pfade nach Zeichencodes (Großbuchstaben vor Kleinbuchstaben); sie ist bei jedem Lauf gleich.

* `anonymisiert_001.txt`, `anonymisiert_002.txt`, ... je Dokument
* mit `--report`: `bericht.txt` und `bericht.json` (nur Zähler und Einstellungen, keine Inhalte)
* mit `--map`: die verschlüsselte Zuordnung am angegebenen Pfad; sie enthält die Originalnamen der Dokumente und lässt sich in der Oberfläche laden

Es wird erst geschrieben, wenn alle Dokumente verarbeitet sind. Bei einem Fehler entstehen keine halben Ergebnisse. Ältere Dateien im Ausgabeordner, die nicht überschrieben werden (zum Beispiel `anonymisiert_005.txt` aus einem früheren, größeren Lauf), bleiben unberührt; am besten für jeden Lauf einen leeren Ordner nehmen.

Ausgegeben werden nur Fortschritt und Zusammenfassung, **nie Dateinamen, Pfade, Dokumentinhalte oder Passwörter**:

```
Datei 1 von 10 verarbeitet
...
10 Dateien, 123 Funde, Gegenprüfung: 2 Dateien mit möglichen Resten
```

Fehler nennen nur die Nummer der Datei (die Reihenfolge wie oben). Die Ausgabe ist UTF-8.

## Rückgabecodes

| Code | Bedeutung |
|---|---|
| 0 | Erfolg |
| 2 | Falsche Argumente (zum Beispiel `--in` oder `--out` fehlt, ungültiges Profil, `--map` ohne genau eine Passwortquelle, Passwort zu kurz oder als Argument) |
| 3 | Eingabefehler: Datei oder Ordner fehlt, kein unterstütztes Dokument, Format kaputt, Datei über 30 MB oder leer, gescanntes PDF ohne Text, ungültige `--policy`, `--out`, `--map` oder `--log` ist die Eingabedatei oder liegt im Eingabeordner, mehr als 200 Dokumente |
| 4 | Gegenprüfung meldet Reste und `--fail-on-findings` ist gesetzt (die Ergebnisse sind trotzdem geschrieben) |
| 5 | KI verlangt (`--ai auto`), aber das Modell fehlt oder startet nicht |
| 6 | Sonstiger Fehler (zum Beispiel Ausgabe nicht schreibbar) |

Gescannte PDFs ohne Textebene lassen sich im Kommandozeilenmodus nicht verarbeiten (keine Texterkennung); sie führen zu Code 3. Dafür die Oberfläche verwenden.

Die Ergebnisse werden erst am Ende geschrieben, wenn alle Dokumente gelesen und verarbeitet sind. Bei einem Lesefehler (Code 3) entstehen deshalb keine Teilergebnisse. Vorhandene Dateien im Ausgabeordner, die nicht überschrieben werden, bleiben unberührt: Lief früher ein größerer Stapel in denselben Ordner, bleiben dessen Dateien mit höherer Nummer (zum Beispiel `anonymisiert_004.txt`) stehen. Für einen sauberen Stand einen leeren oder neuen Ausgabeordner verwenden.

## Beispiele

### Linux und macOS

```sh
# Ordner anonymisieren, mit Bericht, ohne KI
./PrivacyShield.AppImage --cli --in ~/akten --out ~/anonym --report --ai off

# Mit verschlüsselter Zuordnung; Passwort aus einer Umgebungsvariablen
PS_PW='korrektes Pferd Batterie' ./PrivacyShield.AppImage --cli \
  --in ~/akten --out ~/anonym --map ~/anonym/zuordnung.psmap --password-env PS_PW

# Passwort von der Standardeingabe
read -rs PW && printf '%s\n' "$PW" | ./PrivacyShield.AppImage --cli \
  --in ~/akten --out ~/anonym --map ~/zuordnung.psmap --password-stdin

# In Skripten: Rückgabecode auswerten
./PrivacyShield.AppImage --cli --in ~/akten --out ~/anonym --fail-on-findings --quiet
echo "Code: $?"
```

Auf einem Server ohne Bildschirm braucht Electron eine virtuelle Anzeige: `xvfb-run -a ./PrivacyShield.AppImage --cli ...`.

### Windows, Eingabeaufforderung (cmd)

Die `PrivacyShield.exe` ist ein Fenster-Programm: Eine Eingabeaufforderung kehrt sofort zurück und kennt weder Ausgabe noch Rückgabecode. Mit `start /wait` wartet sie, und `%ERRORLEVEL%` enthält den Code. Ausgaben stehen dann nicht in der Konsole; dafür `--log` verwenden oder die Ausgabe umleiten.

```bat
start /wait "" "C:\Program Files\PrivacyShield\PrivacyShield.exe" --cli --in "C:\Akten" --out "C:\Anonym" --report --log "C:\Anonym\lauf.log"
echo Code: %ERRORLEVEL%

rem Passwort aus Umgebungsvariable (gilt nur für dieses Fenster)
set PS_PW=korrektes Pferd Batterie
start /wait "" "C:\Program Files\PrivacyShield\PrivacyShield.exe" --cli --in "C:\Akten" --out "C:\Anonym" --map "C:\Anonym\zuordnung.psmap" --password-env PS_PW --log "C:\Anonym\lauf.log"
set PS_PW=
```

Mit Umleitung (`> ausgabe.txt 2>&1`) erscheinen die Meldungen ebenfalls in der Datei.

### Windows, PowerShell

```powershell
$p = Start-Process -FilePath "C:\Program Files\PrivacyShield\PrivacyShield.exe" `
  -ArgumentList '--cli','--in','C:\Akten','--out','C:\Anonym','--report','--log','C:\Anonym\lauf.log' `
  -Wait -PassThru
$p.ExitCode

# Passwort aus Umgebungsvariable
$env:PS_PW = 'korrektes Pferd Batterie'
Start-Process -FilePath "C:\Program Files\PrivacyShield\PrivacyShield.exe" -Wait -PassThru `
  -ArgumentList '--cli','--in','C:\Akten','--out','C:\Anonym','--map','C:\Anonym\zuordnung.psmap','--password-env','PS_PW'
Remove-Item Env:PS_PW
```

## Hinweise

* **Tippfehler in Optionen.** Unbekannte Schalter werden ignoriert, weil Chromium eigene Schalter wie `--no-sandbox` mitführen darf. Ein falsch geschriebener eigener Schalter (zum Beispiel `--profil`) fällt deshalb nicht als Fehler auf, sondern über den Standardwert oder weil `--in`/`--out` fehlt. Bei Verdacht Profil und Bericht prüfen (`--report`).
* **Temporäre Daten.** Der Lauf nutzt einen eigenen, temporären Programmordner (im Temp-Verzeichnis, Name beginnt mit `psc-run-`) und löscht ihn am Ende. Weil das Programm beim Beenden noch ein paar KB anlegt, räumt ein kurzer Hilfsprozess kurz danach nach; bleibt doch ein Rest, entfernt ihn der nächste Lauf nach einem Tag.
* **Zeitgrenze.** Meldet die interne Seite 15 Minuten lang nichts (kein Dokument gelesen, kein KI-Abschnitt fertig), bricht der Lauf mit Code 6 ab.
