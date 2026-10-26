# Lokaler Status, Offline-Vorbereitung und App-Verknüpfungen

Fortsetzung der vom Nutzer beauftragten und anschließend zur Veröffentlichung freigegebenen Arbeit an arcangeli.eu#1. Ausgangsstände: Desktop main 9ec75a1; Website main d9997df. Beide Arbeitsverzeichnisse waren sauber; origin wurde zuerst abgeglichen. Keine fremden Änderungen überschrieben.

## Verhalten

- Dauerhafte, kompakte Statusanzeige im Werkzeug, auch bei schmaler Bildschirmbreite. Gedämpfte Farben, Systemschrift in den neuen Elementen, runde Flächen und dezente CSS-Animation. `prefers-reduced-motion` schaltet sie ab. Bedienbar mit Tastatur und Screenreader.
- Lokale Verarbeitung und Offline-Verfügbarkeit sind getrennte Angaben. `navigator.onLine` wird nur als Gerätemeldung dargestellt, niemals als Nachweis eines echten Flugmodus oder einer Netzsperre.
- Desktop: bestehende CSP/Netzsperre für den Renderer unverändert. Ressourcenprüfung bestätigt die mitgelieferten PDF-, OCR- und Modell-Dateien. Die separate Update-Prüfung im Hauptprozess kann online GitHub kontaktieren; Dokumentinhalte werden dabei nicht übergeben.
- Browser: ausdrückliches „Offline vorbereiten“ speichert ca. 40 MB statische Programmdateien einschließlich PDF/OCR, Fonts/Laufzeit soweit im Paket enthalten, Word-Import und Nachweis. Keine Dokumente, Zuordnungen oder Analyseergebnisse werden hinzugefügt. Keine automatische Modellvorladung.
- Eigener Service Worker nur im Beta-Verzeichnis. Alle Programmdateien werden beim Download anhand SHA-256 und Größe überprüft. Fehlerhafte Installation ist unvollständig und wird nicht als bereit angezeigt. Status prüft alle Cache-Einträge und die Identität des aktiven Workers. Nur veraltete `ps2-beta-static-*` werden bereinigt; andere Tools, der Import-Cache und `transformers-cache` bleiben erhalten. Ein Update ersetzt keinen laufenden Worker unter einem geöffneten Dokument; alle Beta-Tabs schließen und neu öffnen aktiviert die vorbereitete Version.
- Optional „KI offline vorbereiten“: fünf fest gepinnte Modelldateien werden überprüft und im Transformers-Cache abgelegt. Keine Inferenzsitzung und kein Dokumenttext; der gewählte KI-Modus bleibt erhalten. Gleichzeitige Vorbereitungen werden zusammengeführt. Das vermeidet das Laden von zusätzlich ca. 0,7 GB Modell-Arbeitsspeicher allein zum Vorbereiten. Die tatsächlich benötigte Menge hängt vom Gerät und der Laufzeit ab. Vorhandenes Entladen nach Leerlauf bleibt aktiv.
- PWA-Manifest und App-Icon ermöglichen die Installation über Browser-Menüs bzw. Safari „Zum Home-Bildschirm“. Browser dürfen Caches trotz Persistenzanfrage löschen; ein konkreter Flugmodustest bleibt erforderlich.

## Übergabe an ChatGPT, Claude, Gemini

Ein aktuelles Ergebnis wird zuerst ausschließlich in die Zwischenablage kopiert. Danach erfolgt die ausdrückliche Auswahl „App bevorzugen“, „Webversion öffnen“ oder – bei unterstützten Browsern – das System-Teilen-Menü. Veraltete Ergebnisse sperren die Übergabe erneut.

Im Browser: direkt geklickte HTTPS Universal Links auf iOS, feste Android-Intents mit Paket und Web-Fallback. Geminis iOS-Pfad `/app/download/mobile` ist in Googles eigener apple-app-site-association aufgeführt. Die Übernahme durch eine installierte App hängt von Anbieter, Betriebssystem und den Link-Einstellungen ab. Eine Website kann die Installation nicht zuverlässig feststellen. Kein verdeckter Timer und keine automatische Fremd-App-Öffnung beim Start des Tools.

Desktop: neuer vertrauensgeprüfter IPC-Kanal akzeptiert nur feste Dienstkennungen und einen booleschen App-Wunsch. Registrierte `chatgpt://`- und `claude://claude.ai/new`-Handler werden bevorzugt; fehlen sie oder schlägt der Aufruf fehl, öffnet sich der feste HTTPS-Ausweichweg. Für Gemini wird kein unbestätigtes Windows-/macOS-Protokoll erfunden: HTTPS nutzt die Systemzuordnung. Kein beliebiger URL-/Protokoll-IPC. Dokumenttext und Zuordnung stehen niemals in den URLs. Ein gestarteter Handler beweist noch keine erfolgreiche Anzeige in der Fremd-App.

Die Fremd-KI arbeitet online. Erst bewusstes Teilen/Einfügen/Absenden übergibt ihr Text; die lokale Verfügbarkeit von PrivacyShield macht die Fremd-KI nicht offline. Keine Aussage, dass Betriebssystem, Erweiterungen oder bewusst geöffnete Fremd-Apps technisch niemals Daten übertragen könnten.

## Automatisierte Prüfung

`tests/local-experience.test.mjs` nutzt einen echten Chromium-Prozess mit dauerhaftem Testprofil und Server nur auf Loopback. Die fünf realen Modelldateien aus dem geprüften Vendor-Lock werden für die Testvorbereitung lokal ausgeliefert, nicht durch ein Mock-Modell ersetzt. Nach vollständigem Schließen wird der Browser mit abgeschaltetem Netz neu gestartet.

Geprüft werden erster Besuch ohne automatische Vorbereitung/Modellanfrage, Erhalt fremder Caches, Neustart offline, tatsächliche Scan-PDF/OCR, DOCX, Pseudonymisierung und inhaltsfreier Nachweis, fehlende Dokumentpersistenz, optionaler echter Modellstart nach Offline-Neustart, fehlende/defekte Cache-Dateien, mobile Breite 390 px, reduzierte Bewegung, Zwischenablage, feste App-Links ohne Inhalte und Sperre bei veraltetem Ergebnis. Electron prüft Ressourcen und registrierte, fehlende bzw. fehlschlagende App-Handler; Fremd-Apps selbst werden dabei nicht gestartet.

Ergänzend: bestehende Offline-KI-/Import-/RAM-Tests, Browser-Paket/Determinismus, Clipboard-/Exportsicherheit, alle IPC-Absenderprüfungen, vollständiger Accessibility-Lauf einschließlich 200-%-Zoom. Endgültige Resultate und genaue Commit-Stände stehen in den verknüpften PRs und ihren CI-Läufen. Frühere fehlgeschlagene lokale Läufe wurden nicht als bestanden gewertet.

## Manuelle Abnahme

- iPhone/Safari und Android/Chrome: installieren bzw. vorbereiten; alle PrivacyShield-Tabs schließen; Flugmodus einschalten und WLAN ausschalten; neu öffnen; Text, synthetisches Scan-PDF, Nachweis und optional KI testen. Danach Speicher gezielt löschen und Status prüfen. iPhone-Verhalten wird durch Chromium mit mobiler Breite nicht bewiesen.
- Windows/macOS: auf einem Build mit diesen Änderungen und tatsächlich installierten KI-Apps App-Bevorzugung, nicht installierte Apps und Web-Ausweichweg prüfen. Die Registrierung kann sich mit Fremd-App-Versionen ändern. Gemini hat nicht auf jeder Plattform eine native Desktop-App.
- VoiceOver/Tastatur, große Schrift und Systemoption „Bewegung reduzieren“ auf echten Geräten prüfen. Nicht nur Farbe vermittelt den Zustand.
- Bestehende bereits veröffentlichte Desktop-Installer 2.0.0 werden durch einen Quellcode-PR nicht ersetzt. Neue Installer benötigen eine eigene Patch-Veröffentlichung; bestehende Assets bleiben unverändert.

## Nächste Verbesserungen (noch nicht umgesetzt)

1. Geführter erster Durchlauf: Dokument → Erkennen → Ergebnis prüfen → bewusst teilen; Einstellungen erst bei Bedarf.
2. Gerätemessungen für Startzeit, RAM-Spitze, erste/weitere Analyse und Akkuverbrauch auf iPhone sowie Windows mit 4/8 GB. Erst danach Threadzahl, Chunk-Größen und Leerlauf-Frist ändern.
3. Hintergrundstatus für lokale KI mit echten Ladefortschritten und klarer Taste „Speicher freigeben“; keine schnelle, aber unvollständige Erkennung als Erfolg darstellen.
4. Unabhängige lokale Prüfung einer Textdatei gegen ihren Nachweis-Hash.
5. Optionales, bewusst gestartetes haptisches Feedback nur auf unterstützten Geräten und unter Beachtung der Systemeinstellungen. Keine Abhängigkeit wichtiger Rückmeldungen von Vibration.

## Lokaler Abschlussstand

- Neuer vollständiger Offline-/App-Verknüpfungs-Lauf: **6/6 bestanden**, einschließlich absichtlich beschädigtem Download, Cache-Verlust und Wiederherstellung (`logs/offline-experience.log`).
- Accessibility plus damalige fünf Offline-Prüfungen: **35/35 bestanden**, 0 Fehler (`logs/accessibility.log`). Die anschließend ergänzte sechste Prüfung betrifft Cache-Wiederherstellung und verändert das Layout nicht.
- Erster breiter Lauf: 138 Tests, 128 bestanden, 10 Fehler. Alle Fehler betrafen den damaligen Screenreader-Namen der neuen Statusanzeige (9 Ansichten) und das um das neue App-Icon ergänzte Bau-Testprojekt (1). Beide Ursachen sind behoben. Der zweite Lauf bestätigt den korrigierten Bau; der separate Accessibility-Abschluss bestätigt alle Ansichten. Rohprotokolle bleiben zur Einordnung erhalten; sie sind kein grüner Gesamtabschluss. In diesem Lauf bestanden Offline-KI mit realem Modell, OCR/Word, RAM-Freigabe, Export-/Zwischenablage-Sicherheit sowie sämtliche IPC-Prüfungen.
- Plattformübergreifender Gesamtabschluss folgt durch die unveränderte vollständige CI auf Linux und Windows an der in den PRs angegebenen Revision.

Die Desktop-Adresse für einen leeren Claude-Chat entspricht der offiziellen Dokumentation: https://support.claude.com/en/articles/14729294-open-claude-desktop-with-a-link (`claude://claude.ai/new`, ohne Prompt-Parameter). Geminis iOS-Zuordnung: https://gemini.google.com/.well-known/apple-app-site-association.
