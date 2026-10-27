# PrivacyShield 2.0.1: Verträge, direkte App-Öffnung und Offline-Status

Fortsetzung der zur Veröffentlichung freigegebenen Arbeit aus arcangeli.eu#1 und den verknüpften PRs Desktop #9 / Website #4. Ausgangsstände: Desktop 651ddf2, Website bb2a66f; beide Arbeitsverzeichnisse waren sauber und wurden vor Änderungen mit origin abgeglichen. Der vorherige Mergeversuch war wegen des Nutzungslimits der automatischen Freigabeprüfung nicht ausgeführt worden. Keine fremden Änderungen überschrieben.

## Vertragsverarbeitung

- Neues Profil **Arbeitsvertrag** (auch `--profile employment`): Standardkategorien plus Tarif-/Entgeltgruppe, Berufsjahr, Team, Arbeitszeit, Urlaubstage, Probezeit-/Befristungsdauer sowie Anrede und akademische Qualifikation. Diese zusätzlichen Kategorien sind in Standard ausgeschaltet; im bewusst maximalen Profil sind sie enthalten. Der Vertragsinhalt bleibt im Profil Arbeitsvertrag außerhalb dieser Merkmale lesbar, insbesondere Paragrafen und allgemeine Vertragsbegriffe.
- Deterministische Arbeitgeber-Erkennung für eine öffentlich bekannte Aliasfamilie: Vollname, Kurzform, Slogan, interne Markenbezeichnung und typische abgerissene Bestandteile. Die mehrdeutigen Varianten gelten nur, wenn im selben Dokument eine eindeutige Marke bzw. der Vollname vorkommt. Alle Vorkommen werden vor der NER-Verarbeitung geschützt. Das ist keine umfassende Wissensbasis aller Arbeitgeber. Andere Slogans, Marken und Textfragmente müssen weiterhin geprüft und bei Bedarf als eigene Begriffe markiert werden.
- Mehrteilige Straßennamen mit Bindestrichen einschließlich geschützter Bindestriche sowie bekannte Orte in datierten Unterschriftszeilen werden unabhängig vom NER-Modell erfasst. Unicode-Normalisierung ist längengleich; Rückübersetzung bewahrt die Originalzeichen.
- Automatische falsche NAME-/ORG-Treffer für allgemeine Vertragsbegriffe und GeschGehG werden gefiltert. Persönliche Namen nach einer Anrede bleiben geschützt, auch wenn ein Nachname einem Vertragsbegriff gleicht. Die zusätzliche Anredenmaskierung darf einen seltenen Nachnamen niemals verdrängen. Eigene Markierungen bleiben möglich.
- § 8 als Geldbetrag war im vorherigen gemeinsamen Kern nicht reproduzierbar: die Geldregeln enthalten kein §. Ein Regressionstest schützt Paragrafen auch gegen falsch klassifizierte Modell-Spans und stellt sicher, dass echte EUR-/Dollarbeträge weiter maskiert werden. Eine konkrete Ursache im nicht vorliegenden Original-PDF wird nicht behauptet.
- Sichtbare aufklappbare Vertrags-Prüfhilfe erläutert indirekte Identifikation und aktiviert das neue Profil. Dateiname, Metadaten, Logos und Unterschriftsbilder der Originaldatei werden nicht automatisch aus ihr entfernt. Die App erzeugt bereinigten Text; sie garantiert keine vollständige Anonymität.

## App-Öffnung und weitere Dienste

Die primären Anbieterlinks öffnen auf dem ersten bewussten Klick direkt den App-/Universal-Link; die Zwischenablage wird im selben Klick angestoßen und nicht vor der Navigation abgewartet. Keine vorgeschaltete Auswahl und kein Start beim bloßen Laden der Seite. Ein Web-Ausweichweg bleibt sichtbar. Abgebrochene Zwischenablage und veraltete Ergebnisse werden behandelt. Der allgemeine Link-Handler respektiert abgebrochene Ereignisse und übernimmt diese Links nicht ein zweites Mal.

ChatGPT, Claude, Gemini, Grok und DeepSeek erscheinen direkt; Mistral Le Chat, Perplexity und Microsoft Copilot unter „Weitere KI-Dienste“. Das sind externe Übergabeziele, keine zusätzlichen lokalen Erkennungsmodelle. Kein Prompt, Dokumenttext, Dateiname oder Zuordnungswert in einer Zieladresse. System-Teilen ist eine separate bewusste Datenübergabe.

Auf iOS nutzen die drei ursprünglichen Dienste und weitere unterstützte Anbieter verifizierte Universal-Link-Pfade. Auf Android kommen feste, anhand der Anbieter-Zuordnung geprüfte Pakete und feste Web-Ausweichwege zum Einsatz. Auf Desktop prüft der vertrauensgeprüfte IPC nur bekannte Dienstkennungen und vorhandene Protokoll-Handler. Keine beliebigen URLs oder Protokolle. Die tatsächliche Übernahme hängt von Installation, Link-Einstellungen und Anbieter ab; sie lässt sich nicht vollständig durch Chromium-Simulation beweisen. Für DeepSeek/Copilot ist ein nativer iOS-Start über die verwendete Adresse nicht zugesichert.

## Nachweise

- `logs/unit-tests.log`: vollständiger Unit-Lauf, 1130 Tests, 1127 bestanden, 0 Fehler, 2 bestehende Skips und 1 bestehendes TODO. Das historische TODO zur partiellen Whitelist ist unverändert; seine gedruckte Diagnose ist kein bestandener Test.
- `logs/integration-tests.log`: **53/53 bestanden**: Barrierefreiheit/Zoom/reduzierte Bewegung, echte Vertragsverarbeitung mit/ohne lokales NER, exakte Rückübersetzung, inhaltsfreier Nachweis, direkter erster Klick trotz verzögerter Zwischenablage, feste Zieladressen, Sperre veralteter Ergebnisse, alle vorherigen Offline-Neustart-/OCR-/Modell-/Cache-Prüfungen sowie deterministisches Browserpaket und mobile Breiten.
- Historischer Differenzkorpus: vier gezielt geprüfte Abweichungen mit exakten Hashes und Begründungen ergänzt. Drei Modi desselben Maximal-Falls maskieren zusätzlich „Herr“; ein reiner Regel-Fall schützt zusätzlich Hamburg in der Unterschriftszeile. Keine Eingabeänderung, keine pauschale Ausnahme, keine Lockerung von Qualitätsgrenzen. Alle anderen Referenzfälle und alten Ausnahmen bleiben geprüft.
- `examples/`: neuer synthetischer Ergebnistext, JSON und A4-PDF für Version 2.0.1. SHA-256 unabhängig berechnet, PDF-Text extrahiert und mit der Vorschau verglichen; enthält keine Originalwerte. Keine simulierte persönliche Freigabe.
- Der vollständige CI-Lauf auf Linux und Windows sowie der paketierte Release-Lauf für Windows/macOS/Linux müssen an der finalen Revision erfolgreich sein. Genaue Revisionen, Resultate und Links stehen in den PR-Beschreibungen. Ein lokaler Teillauf ersetzt diese Freigabe nicht.

## Veröffentlichung und manuelle Abnahme

2.0.1 ist eine neue Patch-Version; alte 2.0.0-Artefakte werden nicht überschrieben. Der bestehende Release-Workflow baut alle Plattformen, prüft die gebauten Programme und installiert unter Windows zusätzlich den echten NSIS-Installer. Erst vollständige erfolgreiche Prüfungen erlauben eine neue Veröffentlichung. Website-Paket wird ausschließlich aus dem gemeinsamen Quellcode erzeugt und per Prüfsummen abgeglichen.

Offen bleiben reale iPhone-/Android-App-Übernahme mit installierten und fehlenden KI-Apps, Flugmodus nach vollständigem Schließen aller Tabs (auch WLAN ausschalten), VoiceOver/hohe Schriftgröße und physischer Ausdruck. Ohne Original-PDF lässt sich nicht behaupten, dass jeder OCR-/Layoutfehler des gemeldeten Vertrags nachgestellt wurde. Bitte ausschließlich synthetische Dateien für diese Abnahmen verwenden.

Die permanente Anzeige unterscheidet zusätzlich **„Basis offline vorbereitet“** von **„Inkl. KI offline vorbereitet“**, damit ein noch fehlender Modelldownload nicht als vollständige KI-Bereitschaft erscheint. Der vollständige Offline-Status-/Cache-/App-Lauf wurde danach erneut mit **6/6 bestanden** geprüft (`logs/offline-status-final.log`); das synthetische Beispiel wurde mit dem finalen Kern-Hash neu erzeugt.

## Produktions-Weiterleitungen und Offline-Neustart

Der erste reale HTTPS-Neustart deckte einen Hosting-Unterschied auf: `index.html` und das Werkzeug-HTML werden von Cloudflare auf kanonische Adressen umgeleitet. CacheStorage bewahrte das Redirect-Merkmal der Antwort; Chromium lehnt eine solche Antwort bei Navigation mit Redirect-Modus `manual` ab. Online-Vertragsverarbeitung und Dateiprüfsummen waren korrekt, der Offline-Neustart wurde dennoch nicht als bestanden gewertet.

Der Worker speichert nun die bereits größen- und SHA-geprüften, dekodierten Bytes als neue Antwort mit passenden Größen-/Encoding-Headern. Auch der Worker-Quelltext selbst fließt in die Cache-Identität ein, damit Verhaltensänderungen eine eigene Version erhalten. Der Offline-Neustarttest bildet beide Produktionsweiterleitungen nach. Vollständiger zugehöriger Offline-/Browser-Paketlauf danach **19/19 bestanden** (`logs/canonical-offline.log`). Die erneute echte HTTPS-Prüfung erfolgt nach dem verknüpften Website-Hotfix; endgültiges Ergebnis steht im PR.

## Zusätzlicher Fehler im vollständigen CI-Lauf

Linux-CI `40465871291` an `e764005` führte 1674 Tests aus: 1665 bestanden, 1 Fehler, 7 bestehende Skips, 1 bestehendes TODO. Der Fehler betraf eine bewusste Namensfreigabe: die neue optionale Anreden-Kategorie wurde in der Gegenprüfung trotz ausgeschalteter Kategorie als zusätzlicher Rest gemeldet. Die Prüfung selbst wurde nicht gelockert oder entfernt.

Die Gegenprüfung berücksichtigt die beiden neuen optionalen Kategorien jetzt nur, wenn diese eingeschaltet sind. Sämtliche bisherigen umfassend geprüften Kategorien bleiben enthalten. Im Vertragsprofil bleiben die neuen Merkmale geprüft. Der unveränderte ursprüngliche Freigabetest sowie eine zusätzliche Prüfung für Standard-/Vertragsauswahl, bestehende E-Mail-Prüfung, Vertragsverarbeitung mit echtem NER und Desktop-Nachweis bestehen im vollständigen betroffenen Lauf **35/35**. Die zusätzlichen reinen Vertrags-/Provider-Regressionsfälle bestehen erneut **17/17**. Erneute vollständige Plattform-CI folgt am neuen Kopf. Der synthetische Beispielnachweis wurde mit dem aktuellen gemeinsamen Kern neu erstellt.

## Windows-Zeilenumbrüche im GUI-Test

Im selben vollständigen Lauf scheiterten unter Windows zusätzlich zwei neue Vertrags-GUI-Tests ausschließlich am Vergleich CRLF (Git-Datei) gegen LF (HTML-Textarea). Das Testmaterial wird vor der Eingabe jetzt auf die vom Texteingabefeld verwendeten Zeilenumbrüche vereinheitlicht; sämtliche Maskierungs-, Inhalts-, Nachweis- und Rückübersetzungsprüfungen bleiben unverändert. Reine Kernprüfungen bewahren weiterhin Originalzeichen. Der vollständige betroffene App-Lauf besteht lokal erneut mit **5/5** (`logs/windows-fixture-normalization.log`); die endgültige Windows-CI muss dies bestätigen.
