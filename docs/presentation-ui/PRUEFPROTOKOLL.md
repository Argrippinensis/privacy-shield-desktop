# PrivacyShield 2.0.2: Flugmodus-Anleitung, Anbieterlogos und Nachweisgestaltung

Vor Beginn aktuelle Hauptbranches und lokale Änderungen abgeglichen: Source `80a8f742a8f67b5d01c613333cce671376dac7ab`, Website `d6457e5d915802f0ca0b0e1a514c0cd2784b2274`, beide sauber. ReguSafe nur als Referenz der vorhandenen dunkelgrünen Wortmarke gelesen; dort keine Änderungen.

## Gewünschter Umfang

- Dauerhafte kleine Flugzeug-/Kontrollzentrum-Illustration und ausführlichere animierte Anleitung im lokalen Status. iPhone-Geste, Android/Windows-Schnelleinstellungen und Ausschalten der Netzverbindungen am Mac erläutert. Keine Betriebssystemeinstellung wird geöffnet oder verändert; die Illustration ist ausdrücklich kein Gerätestatus. Reale Offline-Bereitschaft bleibt aus Ressourcen abgeleitet. Animation pausierbar und bei reduzierter Bewegung deaktiviert. Der Dialog startet auch mobil bei seiner Überschrift.
- Fünf originale lokal gebündelte Providerzeichen: ChatGPT/OpenAI, Claude, Gemini, Grok, DeepSeek. Provenienz @lobehub/icons-static-svg 1.101.0 (MIT), statische SVGs auf aktive/externe Inhalte geprüft; Lizenz in THIRD_PARTY_NOTICES.md. Kein externer Bildabruf und keine neue Paketabhängigkeit. Weitere KI-Ziele unverändert.
- Ein gemeinsamer sicherer DOM-Renderer für Vorschau und Druck: Briefkopf mit arcangeli.eu/ReguSafe, deutsche Bezeichnungen, Statusband, technische Identität, Importumfang/Zähler/Gegenprüfung, Ergebnis-Hash und grafisches Siegel „Lokal erstellt“. Keine nachgebildete Unterschrift und keine behauptete digitale Signatur oder Zertifizierung. Inhalt und JSON erlaubte Laufdaten unverändert, persönliche Sichtprüfung nicht vorausgewählt. Lange Berichte dürfen auf weitere Seiten laufen; keine abgeschnittenen Pflichtangaben.

Der ursprünglich gemeldete Veraltet-Hinweis wurde vom Nutzer ausdrücklich zurückgezogen. Die dafür begonnene Bearbeitung wurde zurückgenommen. Ergebnisbindung, Warnungen und Verhalten der KI-Übergabe bleiben unverändert; die bestehenden Sperrtests bleiben erhalten. Keine automatische Annahme manuell oder nachträglich geänderter Ergebnisse.

## Automatisierte Prüfung

- Vollständige Units: `npm run test:unit`, 1138 Tests, 1135 bestanden, 0 Fehler, 2 bekannte Skips und 1 bestehendes TODO. Das alte Whitelist-TODO bleibt sichtbar und zählt nicht als bestanden.
- Betroffene vollständige Integrationsdateien: `DISPLAY=:100 PS_CHROMIUM=/usr/bin/chromium node --test --test-concurrency=1 tests/processing-evidence.test.mjs tests/employment-app.test.mjs tests/local-experience.test.mjs tests/web-beta.test.mjs tests/processing-evidence-desktop.test.mjs tests/accessibility.test.mjs tests/presentation-ui.test.mjs`: **40/40 bestanden**. Darunter echte NER-/OCR-Verarbeitung, veraltete Ergebnisse weiter gesperrt, App-Links, Offline-Neustart/Cache-Reparatur, Datenminimierung und Druck.
- Nach finalen deutschen Druckbezeichnungen und mobiler Dialog-Fokuskorrektur: vollständige neue Präsentationsprüfungen erneut **3/3 bestanden**. Fünf Logos, Pause/reduzierte Bewegung, kein horizontaler Überlauf, Dialog-Anfang sichtbar, tatsächliche Druckansicht mit ID/Hash aus demselben JSON, eine A4-Seite, inerte eigene Profiltexte sowie vollständiger letzter Dokumenteintrag eines 24-Dokumente-Berichts.
- Synthetischer Arbeitsvertragsnachweis mit dem finalen Kern neu erzeugt: exakte UTF-8-Ergebnis-Prüfsumme, unabhängig extrahierter PDF-Text, keine Originalwerte und eine A4-Seite bestätigt. Beispiele und Rohdaten in Unterordnern. Logformat nur bei nachgestellten Leerzeichen normalisiert.
- Der bisherige pauschale Test gegen jedes Vorkommen des Wortes „Flugmodus“ prüft nun weiterhin die konkreten verbotenen unbedingten Versprechen („Flugmodus-tauglich“, „Flugmodus-Betrieb möglich“). Alle Original-/Ersatzsatzprüfungen bleiben erhalten; die neue Anleitung und ihre ehrliche Vorbereitungsaussage sind separat geprüft. Paket-Allowlist um genau die zwei neuen lokalen Darstellungsdateien ergänzt; 49 Dateien. Keine Erkennungsregeln, Qualitätsgrenzen oder Referenzfälle geändert.

## Veröffentlichung und Grenzen

Neue Patch-Version 2.0.2, keine Überschreibung vorhandener Installer/Tags. Vollständige Source-CI auf Linux/Windows, Paketprüfungen Windows/macOS/Linux und Website-CI/Hosting werden an den konkreten Revisionen in den verknüpften PRs protokolliert. Anschließend echte HTTPS-Datei-/Offline-/Nachweisprüfung. Veröffentlichung bereits vom Nutzer freigegeben. Reale iPhone-/Android-Geräte, native App-Übernahme, VoiceOver und physischer Ausdruck bleiben manuell abzunehmen.
