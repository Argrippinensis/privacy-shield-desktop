## PrivacyShield Desktop 1.8.0

Basis: v1.7.0 (`dcb1503`). Elf Commits, einzeln lauffähig und getestet.

### Messwerte (Mess-Harness `npm run eval`, echte App, vorher 1.7.0 / nachher 1.8.0, jeweils mit KI-Modell)

| Messung | 1.7.0 | 1.8.0 |
|---|---|---|
| Lecks, synthetische Werte (276) | 87 | 1 |
| Lecks, Handfälle (91) | 27 | 0 |
| Lecks, breite DSGVO-Probe (59) | 41 | 4 |
| Falsch maskierte Negativfälle (20) | 3 | 0 |
| Ohne Modell: Lecks in 150 Fällen / 276 Werten | 84 / 109 | 21 / 18 |
| Große Dokumente (6.017 Entitäten) | 10,9 s | 1,5 s, Ausgabe bitgleich |

Leck = ein personenbezogener Wert steht nach dem Anonymisieren noch im Text.

### Inhalt

- Erkennung: Kreditkarten (Prüfziffer), Kfz, FIN, IPv6, Links, IBAN-Varianten, Telefonformate, Datumsformen, Steuer-ID, Namenszusätze,
  Sonderzeichen, Adressen (CH/AT), Geräte-IDs, Zugangsdaten, Standort, Auslandskennungen, Begriffslisten Art. 9/10 DSGVO (Profile Medizin/Maximal)
- KI-Erkennung standardmäßig an, Start bei Bedarf, Entladen nach 5 Minuten Leerlauf
- Updater sperrt nie aus; manueller Weg, wo automatisches Installieren nicht möglich ist
- Oberfläche ohne Emojis, korrekte Umlaute, Wortlaut für das Desktop-Programm
- Fehlerdiagnose: Ursache statt "Modell konnte nicht geladen werden", Installationsprüfung, "Erneut versuchen", "Details kopieren", 0-Byte-Dateien
- Verteilung: feste Dateinamen (`releases/latest/download/...`), macOS arm64 und x64 mit Ad-hoc-Signatur, `SHA256SUMS.txt`, Release-Text aus CHANGELOG
- CI: Tests auf Ubuntu und Windows; Build-Workflow testet das gebaute Programm auf allen drei Plattformen, Release nur bei grün

### Prüfung

- `xvfb-run -a npm test`: 33 von 33 (Electron 35); Electron 44: 26 von 26 vor dem letzten Commit
- `git am` der Serie in einem frischen Klon: identischer Baum
- `actionlint` für beide Workflows ohne Beanstandung

### Hinweis zum Update

Unter Windows lädt das Update von 1.7.0 auf 1.8.0 einmalig den vollständigen Installer (feste Dateinamen); danach differenziell.

Erstellt mit Claude Code
