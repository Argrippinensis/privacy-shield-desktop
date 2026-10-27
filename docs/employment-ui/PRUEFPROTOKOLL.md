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
