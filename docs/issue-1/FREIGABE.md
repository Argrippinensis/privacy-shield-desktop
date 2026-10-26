# Veröffentlichungsstand nach CI-Korrekturen

Am 26.10.2026 wurde die Fortsetzung einschließlich Push und Veröffentlichung ausdrücklich beauftragt.
Die Online-Fassung bleibt als Beta gekennzeichnet. Die Veröffentlichung umfasst die gemeinsame Quelle
und das daraus erzeugte Website-Paket; bestehende Desktop-Installationspakete werden nicht durch
ungekennzeichnete Dateien derselben Versionsnummer ersetzt.

## Fehler aus den GitHub-Läufen

- Linux: `pdftotext` fehlte im Runner. Die unabhängige PDF-Textextraktion läuft jetzt mit dem bereits
  gebündelten PDF.js als separatem Node-Leser. Chromium erzeugt das PDF; der zweite Leser prüft
  dessen Text einschließlich Umlaute, IDs, Hash und ausgeschlossener sensibler Marker.
- Windows: `/usr/bin/chromium` war fälschlich fest vorgegeben. Die Tests verwenden nun standardmäßig
  den von Playwright installierten Browser; `PS_CHROMIUM` bleibt als ausdrückliche lokale Auswahl.
- Windows: das Testprofil wurde nach `app.exit()` vor dem vollständigen Prozessende gelöscht.
  Die Aufräumfunktion wartet jetzt auf das Prozessende und wiederholt kurzzeitig gesperrte Löschungen.
- CI und Release-Prüfung installieren den passenden Chromium-Browser ausdrücklich auf allen Plattformen.
  Kein inhaltlicher Test wurde ausgelassen oder durch eine schwächere Prüfung ersetzt.

Lokal nach den Korrekturen: Browserregressionen **10/10**, Electron-Browser-Betaprüfungen **13/13**,
Workflow-/YAML-Prüfungen **16/16** bestanden. Rohprotokolle liegen unter `logs/`.
Die vollständige GitHub-Matrix mit Linux und Windows wird vor dem Merge auf Erfolg geprüft;
der jeweils aktuelle, unveränderliche Lauf ist über die Checks von PR #8 verlinkt.

## Website und Deployment

Website-Console- und Funktionstests bestehen lokal nach ausdrücklich autorisierter Einrichtung des
Zertifikatsvertrauens, bei aktiver TLS-Prüfung. Die Website-CI ist auf Ubuntu 24.04 festgelegt,
weil die bisherige Playwright-Version Ubuntu 26.04 aus `ubuntu-latest` nicht unterstützt.
Der tatsächlich fehlende Workers-Deployment-Einstieg ist jetzt in `wrangler.jsonc` beschrieben:
vorhandener `_worker.js`, statische Dateien und unveränderte ASSETS-Bindung für den bestehenden API-Fallback.
Der Cloudflare-Build auf dem PR-Branch ist erfolgreich; ein lokaler Workers-Lauf bestätigt statische
Seiten, Beta-noindex-Header, JavaScript-Dateien und API-Fehlerantworten. Das Worker-Quellskript wird
nicht als öffentliche statische Datei ausgegeben.

Physische iPhone-/Android- und Betriebssystem-Druckabnahmen bleiben offen und sind in `ABNAHME.md`
beschrieben. Eine Beta-Veröffentlichung ist keine Bestätigung dieser Plattformtests und keine
Garantie vollständiger Erkennung. Ein separates Desktop-Patch-Release kann mit eigener Versionsnummer
und getesteten Installationspaketen folgen.

## Sinnvolle nächste Schritte

1. „Offline vorbereiten“ mit tatsächlicher Bereitschaft je Funktion.
2. Lokaler Vergleich einer Ergebnisdatei mit der Prüfsumme ihres Nachweises.
3. Ergänzende automatisierte WebKit-/Mobilbrowser-Prüfungen und feste reale Gerätetest-Routine.
