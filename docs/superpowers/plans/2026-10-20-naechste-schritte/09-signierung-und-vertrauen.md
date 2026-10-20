# WP 09: Signierung und Vertrauen

**Ziel:** Nutzer sehen beim Installieren keine abschreckenden Warnungen mehr (Windows SmartScreen, macOS Gatekeeper), oder wissen zumindest, was sie tun müssen und wie sie die Echtheit prüfen.
**Modell:** Entscheidung beim Nutzer (D4, D5, Gate G4); danach Sonnet niedrig. **Aufwand:** Teil A 1 Stunde (sofort möglich), Teil B nach Entscheidung 3-5 Stunden plus Wartezeiten bei Anbietern.

## Stand

| Plattform | Heute | Folge für Nutzer |
|---|---|---|
| Windows | Installer **nicht signiert** | SmartScreen: "Der Computer wurde durch Windows geschützt", unbekannter Herausgeber; "Weitere Informationen", "Trotzdem ausführen". Virenschutz ist bei unsignierten, großen Programmen misstrauischer (mögliche Ursache für Quarantäne der Modelldatei, siehe WP 01). |
| macOS | ab 1.8.0 **Ad-hoc-Signatur** (`identity: "-"`), nicht notarisiert; beide Architekturen | Gatekeeper blockiert den ersten Start; Freigabe über Systemeinstellungen, "Datenschutz & Sicherheit", "Trotzdem öffnen" (ab macOS 15 gibt es keinen Rechtsklick-Umweg mehr). Automatische Updates sind auf macOS aus, solange nicht richtig signiert (der Updater nutzt dort den manuellen Weg: Hinweis plus Link zur Download-Seite). |
| Linux | AppImage/deb ohne Signatur, `SHA256SUMS.txt` im Release | keine Warnung; Prüfsummen auf Wunsch |

## Teil A: sofort, ohne Kauf (Gate G2 mit Website-Deploy)

- [ ] **Download-Seite ergänzen** (`src/desktop/index.html`, kleiner Abschnitt "Installationshinweise" unter den Download-Knöpfen; Stil der Seite, Text, kein Emoji):
  * Windows: "Beim ersten Start meldet Windows evtl. 'Der Computer wurde durch Windows geschützt'. Klicken Sie auf 'Weitere Informationen' und dann auf 'Trotzdem ausführen'. Das Programm ist noch nicht mit einem Zertifikat signiert."
  * macOS: "Beim ersten Start blockiert macOS das Programm. Öffnen Sie Systemeinstellungen, Datenschutz & Sicherheit, und wählen Sie unten 'Trotzdem öffnen'. Updates installieren Sie von dieser Seite."
  * Alle: "Echtheit prüfen: Prüfsummen unter `SHA256SUMS.txt`. Windows: `certutil -hashfile PrivacyShield-Setup.exe SHA256`, macOS/Linux: `shasum -a 256 <Datei>`."
  * Virenschutz: "Wenn Ihr Virenschutz die Installation blockiert oder Dateien entfernt: Ordner `PrivacyShield` als Ausnahme eintragen und neu installieren. Das KI-Modell ist eine große Datei (ca. 130 MB) und wird gelegentlich fälschlich gemeldet."
  Der Link-Test (`tests/desktop-links.mjs`, WP 03) bleibt grün. Gemeinsam mit WP 03/04 deployen.
- [ ] **Datenschutz- und Quellhinweis**: Die Seite verweist bereits auf GitHub; Hinweis, dass der Quellcode des Programms dort einsehbar ist (falls das Repository öffentlich ist; vorher prüfen).

## Teil B: Entscheidungen (eine Frage, Empfehlung)

Eine Frage an den Nutzer, **nicht** mehrere: "Soll PrivacyShield Windows-Signierung bekommen? Empfehlung: erst nach den ersten echten Nutzerzahlen und der Rückmeldung aus 1.8.0; bis dahin Teil A."

Bei "Ja": Anbieter-Optionen (Preise, Verfügbarkeit und Identitätsprüfung ändern sich: **vor der Entscheidung aktuell prüfen**, die Angaben hier sind Orientierung, nicht verifiziert):

| Option | Kurz | Zu klären |
|---|---|---|
| Azure Artifact Signing (früher Trusted Signing) | Signierdienst von Microsoft, Abrechnung monatlich, keine eigene Schlüsseldatei | Verfügbarkeit für Einzelunternehmer/Region, Identitätsprüfung, Kosten, Einbindung in `electron-builder` (`azureSignOptions`) und GitHub Actions |
| OV-Zertifikat (Organisation) | klassisch, jährlich, Hardware-Token oder Cloud-Signatur | Seit 2023 muss der private Schlüssel auf einem Hardware-Modul liegen (Token oder Cloud-HSM); erschwert CI. SmartScreen-Ruf baut sich langsam auf |
| EV-Zertifikat | sofortige SmartScreen-Akzeptanz früher, teurer | gleiche HSM-Frage, höchste Kosten; Vorteil gegenüber OV nicht mehr in jedem Fall gegeben (aktuell prüfen) |
| macOS: Apple Developer Program | 99 USD pro Jahr, Entwickler-ID plus Notarisierung | Zertifikat "Developer ID Application", `notarytool`, `hardenedRuntime: true` mit Entitlements (siehe unten), Secrets in GitHub |

Für macOS zusätzlich bei "Ja": `package.json` `build.mac`: `hardenedRuntime: true`, `entitlements`/`entitlementsInherit` (`com.apple.security.cs.allow-jit` und `allow-unsigned-executable-memory` sind für WebAssembly/V8 nötig; minimal halten und per Test belegen),
`notarize: true`, Secrets `CSC_LINK`, `CSC_KEY_PASSWORD`, `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD`, `APPLE_TEAM_ID` in den Repository-Geheimnissen (vom Nutzer anzulegen, nie in Dateien oder Logs); im Updater `signedMac` aktivieren, damit der automatische Weg auf macOS freigeschaltet wird.

**Nicht ohne Gate G4 (Käufe, Konten, Geheimnisse) tun.** Kein Anlegen von Konten oder Eintragen von Zugangsdaten durch den ausführenden Agenten.

## Teil C: Beobachten statt raten

* Nach 1.8.0 zählt der Nutzer (oder die Download-Statistik von GitHub: `gh release view v1.8.0 --json assets -q '.assets[] | .name + " " + (.downloadCount|tostring)'`), wie viele Windows-Downloads es gibt und ob Rückmeldungen zu SmartScreen oder Virenschutz kommen.
* Aus "Details kopieren" (Patch 0011) die Häufigkeit von `MODEL_FILE`-Fehlern ableiten: Häufen sie sich, ist Quarantäne durch Virenschutz real und die Signierung bzw. D11 (Reparatur-Download) wird dringlicher.

## Abnahme

* Teil A: Seite live, Hinweise lesbar, Link-Test grün.
* Teil B: Entscheidung des Nutzers schriftlich festgehalten (im Plan unter D4/D5 mit Datum); ohne Entscheidung keine Umsetzung.
