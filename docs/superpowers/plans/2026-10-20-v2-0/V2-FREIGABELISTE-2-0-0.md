# PrivacyShield Desktop 2.0.0: Freigabeliste (Stand 2026-10-25)

Diese Liste ist für Sie geschrieben, ohne Fachsprache. Es ist **nichts veröffentlicht**. Die Version in der App steht weiter auf 1.8.0. Ich veröffentliche erst nach Ihrem schriftlichen "Ja, 2.0.0 veröffentlichen".

## 1. Ergebnis in einem Satz

Die App 2.0.0 ist fertig gebaut, geprüft und dokumentiert. Alle 58 Pflichtpakete sind erledigt (56) oder mit Begründung auf später verschoben (2: pdf.js und Transformers.js 4). Dazu 7 "Kann"-Pakete, die planmäßig erst in Version 2.1 kommen.

## 2. Was geprüft wurde (mit Zahlen)

| Prüfung | Ergebnis |
|---|---|
| Alle automatischen Tests (Quellcode) | 1583 bestanden, 0 Fehler (7 bewusst übersprungen, 1 bekannter offener Fall) |
| Tests gegen das fertig gebaute Programm (Linux) | alle bestanden, auch mit relativem Programmpfad |
| Probelauf auf GitHub, drei Systeme (Windows, macOS, Linux), auf dem endgültigen Stand | grün, ohne Veröffentlichung |
| Absichtlicher Fehlerlauf (Modelldatei fehlt) | scheitert wie gewollt auf Windows an genau dem Prüfschritt |
| Windows-Installation (still installiert, Modelldatei 135.359.829 Bytes, App-Selbstprüfung) | in der CI bestanden |
| Erkennung gegenüber 1.8.0 (Vergleich mit 645 Referenzfällen) | keine unerlaubten Abweichungen, in beiden Prüfwegen |
| Fehlende Erkennung (Lecks), echter Vergleich mit 1.8.0 (selbst gemessen, 2026-10-25) | Handfälle ohne KI: 1.8.0 21 undicht, 2.0.0 12; mit KI: 1.8.0 4, 2.0.0 0. Synthetische Werte (276): ohne KI 18 gegen 18, mit KI 1 gegen 0. Fehlalarme in der ersten Testmenge 0 in allen Modi. Nirgends schlechter |
| Echte Dokumente (TXT, DOCX, PDF) | 0 von 97 Lecks; gescannte Dokumente (OCR): 1 von 24 |
| Barrierefreiheit (automatische Prüfung aller Ansichten) | 0 schwere Befunde; Tastatur, Fokus, Kontrast und Zoom geprüft |
| Unabhängige Prüfung jedes Pakets | gelaufen; gefundene Mängel (u. a. neue Lecks, falsche Überschrift) vor dem Merge behoben |

Umfang: 300 Änderungen seit 1.8.0, 117 Dateien.

**Gesamtsicht Oberfläche (von mir angesehen, 1280 und 900 Pixel):** Willkommensseite, Arbeitsansicht mit Ergebnis, Funde-Leiste und Info-Dialog wirken ruhig, einheitlich und lesbar im Navy-Weiß-Stil, ohne Emojis; Schrift und Hilfstexte sind deutlich besser lesbar als in 1.8.0. Eine Hinweiszeile, die in 1.8.0 am linken Rand klebte, ist jetzt zentriert (mit Test). Bekannt und unverändert gegenüber 1.8.0: Die farbige Markierung im Originaltext kann bei schmalem Fenster um eine Zeile versetzt aussehen (nur Anzeige, die Anonymisierung ist davon nicht betroffen).

**Wortlaut-Hinweis (Ihre Entscheidung, rechtlich heikel):** Die Willkommensseite sagt seit 1.x "100% lokal & datenschutzkonform" und "Kein Daten-Leakage". Das habe ich nicht angefasst (Datenschutztexte entscheiden Sie). Ich empfehle, "datenschutzkonform" als Zusage zu überdenken, weil die Erkennung nie 100 Prozent sicher ist.

## 3. Was neu ist (Kurzfassung für Anwender)

- Mehrere Dokumente gemeinsam anonymisieren, dieselbe Person bekommt überall denselben Platzhalter.
- Zuordnung (Platzhalter zurück zu Originalwerten) wird jetzt mit Passwort verschlüsselt gespeichert. **Passwortverlust ist endgültig.**
- Prüfansicht mit Rückgängig/Wiederholen, Filter und Suche, Gegenprüfung und Bericht.
- Kommandozeile für Stapelverarbeitung, "Öffnen mit", eigene Regeln per Richtliniendatei.
- Bessere Erkennung (Adressen, Kontakte, Zugangsdaten, Gesundheits- und Strafdaten, viele Formate).
- Barrierefrei und mit ruhigerer, besser lesbarer Gestaltung; Info-Dialog mit Version und Lizenzen.
- Aktuelle Bibliotheken (DOCX, ZIP, PDF-Erzeugung, Texterkennung). Sicherheitslücken der alten Versionen entfallen.

Details: `CHANGELOG.md`, `docs/benutzerhandbuch.md`.

## 4. Was von Ihnen entschieden werden muss (Standardantwort gilt, wenn Sie nichts sagen)

| Nr | Frage | Meine Empfehlung | Folge bei "Nein" |
|---|---|---|---|
| F6 | Ortsnamen in Firmennamen weiter maskieren (z. B. "Stadtwerke München")? | **Ja** (lieber ein Wort zu viel verdecken) | Einzelne Orte könnten durchrutschen, mehr Aufwand |
| F7 | Eine Prüfgrenze im Ausfallmodus von 6 auf 7 erlauben (drei Ortsfälle ohne Wörterbuch)? | **Ja** | Fall entfernen oder Wörterbuch erweitern |
| F8 | Soll ein Eintrag der Ausnahmeliste auch die Reste eines Fundes sichtbar machen? Heute bleibt z. B. bei "Berlin" nur "Berlin" lesbar, die Straße bleibt verdeckt | **Nein, so lassen** (sicherer) | Erkennungskern müsste geändert werden |
| F9 | Soll Windows Passwörter auch über die Standardeingabe lesen können? | **Nein für 2.0** (dort gilt `--password-env`, ist dokumentiert) | Eigener Zusatz-Starter nötig |
| D60 | Niederländische Postleitzahlen wie "1011 AD Amsterdam" bleiben lesbar (die Straße davor wird verdeckt). Jetzt beheben oder in 2.0.1? | **Nach 2.0** (betrifft nur niederländische Adressen) | Vorher ein kleiner Korrekturlauf (ca. 1 Tag) |

## 5. Was nur Sie tun können

1. **Windows-Handprüfung** auf einem echten Windows-Rechner mit der Liste `docs/abnahme-windows.md` (Installation, Start ohne Netz, 3 Dokumente, Zuordnung speichern und laden, Kommandozeile). Die CI hat die Installation automatisch bestanden, aber nicht, wie es sich für Menschen anfühlt.
2. **Update-Test 1.8.0 auf 2.0.0:** erst möglich, wenn 2.0.0 als Release existiert (Punkt 10 der Liste).
3. Ein schriftliches **"Ja, 2.0.0 veröffentlichen"** (oder "Nein/Noch nicht").

## 6. Bekannte Grenzen und Risiken (ehrlich)

- **Keine Erkennung ist 100 Prozent.** Das Handbuch sagt klar, dass der Nutzer das Ergebnis prüft. Die Gegenprüfung nutzt nur Regeln und Wortlisten, nicht das KI-Modell.
- **PDF-Grenzen:** Gescannte PDFs werden nur bis Seite 20 gelesen. PDFs mit Text und Scanseiten gemischt werden nicht per Texterkennung gelesen (Scanseiten fehlen im Ergebnis).
- **Unsigniert:** Windows kann bei der Installation eine SmartScreen-Warnung zeigen. Signierung ist für 2.1 vorgesehen und kostenpflichtig (nur auf Ihre Entscheidung).
- **pdf.js bleibt bei 3.11.174** (Ihre Entscheidung F5, Schutzmaßnahmen: 30-MB-Grenze, kein Netz, kein Skript-Auswerten). Transformers.js 4 bleibt aus.
- **Manipulierte DOCX-Datei** kann das Programm verlangsamen oder abstürzen lassen (nur Verfügbarkeit, kein Datenabfluss).
- **Veröffentlichungsablauf:** Der neue Release-Job (nur bei einem Tag, mit Prüfung aller fünf Installationsdateien und Veröffentlichung erst nach Kontrolle) wurde noch **nie echt ausgeführt**, weil er nur bei einem Tag läuft. Die Prüfskripte sind getestet. Falls er beim ersten Mal hakt, bleibt das Release ein Entwurf, nichts Halbes wird sichtbar.
- **Windows-Passwort über Standardeingabe** geht nicht (siehe F9).
- Offen für 2.1: CLI schreibt Ausgaben nicht atomar (bei Schreibfehler können Teilergebnisse bleiben, Code 6, dokumentiert), englische Oberfläche, dunkles Design, tragbare Version, Signierung, Web-Tool mit gemeinsamem Kern.

## 7. Wie die Veröffentlichung abliefe (erst nach Ihrem schriftlichen Ja)

1. Version in `package.json` auf 2.0.0, in `CHANGELOG.md` die Überschrift datieren (`## [2.0.0] - JJJJ-MM-TT`).
2. Letzter vollständiger Probelauf und Gesamttest auf genau diesem Stand.
3. Entwurfs-PR #4 (`v2/main` gegen `main`) zusammenführen, Tag `v2.0.0` setzen. Die Pipeline baut alle Installer, prüft sie, legt das Release als Entwurf an, prüft die hochgeladenen Dateien und veröffentlicht erst dann.
4. `scripts/verify-release.mjs v2.0.0 --upgrade-from v1.8.0 --deep` und Sie führen den Update-Test aus.
5. Rückfall: Release nie löschen, bei Problemen 2.0.1; bei schwerem Fehler auf Vorab-Version zurückstufen.

Die Website (arcangeli.eu) wird **nicht** angefasst (Ihre Entscheidung vom 12.10.). Download-Seite und Website-Texte sind ein eigener Schritt nach Ihrer Freigabe.

## 8. Zusammenarbeit mit GPT

Die drei Draft-Pull-Requests von GPT (#5 CLI lehnt Tippfehler in Optionen ab, #6 sicherer Release-Ablauf, #7 stabiler Kontrast) habe ich gelesen, geprüft und übernommen. Besonders #5 schließt einen echten Fehler: `--profil strict` lief vorher still mit dem Standardprofil.
