# Sofortiger Zuordnungsschutz in der Browserfassung

Nach dem erfolgreichen PR-Lauf und den erfolgreichen Paketprüfungen aller drei Desktop-Plattformen fiel im erneuten Windows-CI-Lauf nach Merge genau ein Browser-Test aus: `processing-evidence.test.mjs`, F3, kein beforeunload-Dialog. Lauf: https://github.com/Argrippinensis/privacy-shield-desktop/actions/runs/40472712268.

Die gemeinsame Oberfläche synchronisierte den Browser-Listener bislang alle 150 ms. Ein neuer deterministischer Test unterdrückt ausschließlich diese Intervallprüfung. Vor der Korrektur war nach vollständiger Verarbeitung eine ungesicherte Zuordnung sichtbar, der Listener jedoch noch nicht installiert: reproduzierbarer Fehler in `logs/before.log`.

Der Browseradapter synchronisiert den bestehenden Schutz jetzt zusätzlich in der vorhandenen MutationObserver-Mikrotask, sobald die Ergebnis-/Zuordnungstabelle aktualisiert wird, und einmal bei seiner Initialisierung. Die Registrierung bleibt an eine tatsächlich ungesicherte Zuordnung gebunden. Keine pauschale dauerhafte beforeunload-Registrierung, keine Dokumentenspeicherung und keine Änderung der Desktop-Oberfläche, Erkennung oder Exportlogik. Die bisherige Intervallprüfung bleibt als Rückfall erhalten.

Der neue Test prüft ohne Schutz-Polling: zunächst kein Listener, nach Verarbeitung sofort aktiver Listener, realer Reload-Dialog und Abbruch, anschließend Löschen der Zuordnung mit sofortiger Entfernung des Listeners. Der ursprüngliche F3-Test und seine Anforderungen bleiben unverändert.

## Automatisierte Prüfung

- `PS_CHROMIUM=/usr/bin/chromium node --test tests/processing-evidence.test.mjs`: **11/11 bestanden**, alle bisherigen Import-/Nachweis-/Navigations-/Clipboard-Prüfungen einschließlich neuer deterministischer Regression. `logs/evidence-final.log`.
- `DISPLAY=:100 PS_CHROMIUM=/usr/bin/chromium node --test --test-concurrency=1 tests/local-experience.test.mjs tests/web-beta.test.mjs`: **19/19 bestanden**, Offline-Neustart mit OCR/Modell/Cache-Verlust, App-Links, Desktop-Status, mobiler Browser und deterministischer Paketbau. `logs/browser-final.log`.
- Ein erster kombinierter lokaler Lauf war ohne DISPLAY gestartet worden: 20 bestanden, 10 Electron-Starts scheiterten am fehlenden X-Server. Dieser Lauf gilt nicht als bestanden; beide vollständigen betroffenen Dateien wurden mit Xvfb erneut geprüft.
- Vollständige Source-CI auf Windows/Linux und abschließende echte HTTPS-Abnahme des neuen Browseradapters werden im verknüpften PR dokumentiert. Keine Lockerung von Tests oder Qualitätsgrenzen.

## Desktop-Veröffentlichung

Der Browseradapter `web/tool-anpassung.js` gehört nicht zu den Desktop-Paketdateien (`build.files` in package.json). Sämtliche Desktop-Eingabedateien bleiben unverändert zum bereits geprüften Release-Commit `cde177391da049fa820949c601617b6f6d421a69`. Der gemeinsame Verarbeitungskern bleibt `b8e00c13f515a7963fd59f8af10eba5aae10474bdd126759a9ea595388d1ba1c`.

Desktop **v2.0.1** wurde durch den unveränderten Build&Release-Lauf erfolgreich veröffentlicht: https://github.com/Argrippinensis/privacy-shield-desktop/actions/runs/40472738719. Alle drei gebauten Programme: je 1675 Tests, 0 Fehler; Linux 1660 bestanden / 14 bekannte Skips / 1 bestehendes TODO, Windows 1647 / 27 / 1, macOS 1646 / 28 / 1. Echte Windows-Installation: 2/2 Installationsprüfungen, anschließend 10 KI-/Offline-Prüfungen bestanden, 3 bekannte Skips. Modell in der Installation vollständig, 135359829 Bytes.

Alle fünf öffentlichen Installer-Links HTTP 200; SHA256SUMS stimmt mit GitHubs unabhängigen Asset-Digests überein. v2.0.1 ist stabiles Latest, kein Draft. Rohdaten: `logs/release-verification.json`. Dieser ausschließlich browserseitige Hotfix benötigt keine Änderung oder Überschreibung der veröffentlichten Installer oder Tags.

Reale iPhone-/Android-Proben, native KI-App-Übernahme, VoiceOver und physischer Ausdruck bleiben manuell abzunehmen.
