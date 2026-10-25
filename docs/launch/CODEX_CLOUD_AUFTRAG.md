# PrivacyShield 2.0 – Cloud-Auftrag für Analyse, Finalisierung und Launch

## Verbindlicher Auftrag des Inhabers

Dieses Dokument ist der Startauftrag für eine neue Codex-Cloud-Session nach Abschluss der laufenden Claude-Code-Arbeit. Der Inhaber bedient Codex über das Handy; sein Rechner und lokale Claude-Arbeitsbäume stehen der Cloud-Session nicht zur Verfügung.

Ziel: PrivacyShield 2.0 als verlässlich verkaufbares ReguSafe-Kernprodukt finalisieren. Bestehende Funktionen akribisch überprüfen, Fehler beheben, Bedienung modernisieren und lokale Erkennung/Performance verbessern. Die Grundfarbgebung und Markenidentität bleiben erhalten; keine Emojis. „Fünf von fünf Sternen“ ist ein Qualitätsziel für den gesamten Arbeitsablauf, keine unbelegte Werbeaussage.

Zusätzliche ausdrückliche Wünsche:
- Das Quellcode-Repository privacy-shield-desktop soll privat werden.
- arcangeli.eu (im Gespräch auch „acangeli.eu“) auf öffentliche GitHub-/Open-Source-/Download-Aussagen prüfen und anpassen; ReguSafe-Verweise konsistent halten.
- Einen kurzen, kundenfähigen Verarbeitungsnachweis für einen konkreten Anonymisierungs-/Pseudonymisierungsvorgang prüfen und umsetzen, wenn der Nachweis technisch belastbar möglich ist.
- Lokale KI, RAM-Nutzung, Zwischenspeicherung und Erkennungsqualität gezielt optimieren.
- Erst Analyse und Planung mit Astra, danach Umsetzung mit Sol; die Rollen nicht stillschweigend vertauschen.

Die Freigabe umfasst Recherche, reproduzierbare Tests, Änderungen auf isolierten Branches und Draft-PRs. Keine weitere Routine-Rückfrage dafür. Das Privatstellen ist ausdrücklich gewünscht und braucht keine erneute Grundsatzfreigabe. Öffentliches Software-Release, produktiver Website-Deploy und Merge in die Haupt-/Releasebranch benötigen eine gesonderte eindeutige Freigabe des Inhabers. Änderungen immer erst konkret prüfbar vorbereiten. Falls notwendige Zugangsdaten/Rechte fehlen, genau die fehlende Fähigkeit nennen und unabhängig weiterarbeiten.

## 1. Modelle und Zusammenarbeit

1. Astra (`gpt-6-astra`, sofern verfügbar) führt Bestandsaufnahme, Risikoanalyse, Architektur-/UX-Abwägung, Priorisierung und den unabhängigen Abschlussreview durch.
2. Nach dem schriftlichen Plan führt ein Sol-Modell (bevorzugt `gpt-6.1-sol`, alternativ ein tatsächlich verfügbares Sol-Modell) klar begrenzte Umsetzungspakete aus. Der Inhaber autorisiert diese Delegation ausdrücklich. Keine parallelen Agenten in denselben Dateien; eigene Branches/Arbeitsbäume, festgelegte Dateibereiche und Abnahmekriterien.
3. Verfügbare Modellkennungen überprüfen. Ein Prompt allein schaltet das Modell nicht um. Wenn Modellwechsel oder Subagenten in der verwendeten Codex-Cloud-Oberfläche nicht verfügbar sind, das ehrlich sagen, Analyse/Plan im aktuellen geeigneten Modus fertigstellen und eine kurze Fortsetzungsanweisung für Sol hinterlegen. Keine ausgeführte Astra-/Sol-Arbeit behaupten, die nicht stattgefunden hat.
4. Der Plan ist ein Arbeitsergebnis, keine obligatorische neue Freigabeschleife. Bereits autorisierte, reversible Korrekturen nach Planung umsetzen. Nur echte Produktentscheidungen mit erheblichen Folgen oder notwendige fehlende Angaben gezielt nachfragen.
5. Astra bewertet die Resultate anhand von Diff und tatsächlichen Testergebnissen. Keine gegenseitigen Freigaben allein aufgrund von Zusammenfassungen.

## 2. Cloud-Start und verbindlicher Bezugsstand

Primär: `Argrippinensis/privacy-shield-desktop`.
Zusätzlich: `Argrippinensis/arcangeli.eu` und `Argrippinensis/ReguSafe`, soweit Zugriff besteht.

- Verfügbare GitHub-/Cloud-Werkzeuge, Repository-Rechte und geltende AGENTS.md/CLAUDE.md lesen. Keine lokalen Vorgaben erfinden.
- Aktuelle Branches, Tags, Releases, PRs, CI-Läufe und Claude-Abnahmeberichte prüfen. Nicht automatisch `main` oder `v2/main` zum neuesten Produktstand erklären.
- Claude-Handoff, finales HEAD, uncommittierte oder noch laufende Arbeit feststellen. Nicht auf einen aktiv bearbeiteten Bereich schreiben. Fehlt nur der finale Claude-Handoff, eine festgeschriebene Momentaufnahme analysieren und unabhängige Vorarbeiten fortsetzen; die finale Abnahme bleibt an den später bestätigten SHA gebunden.
- Den tatsächlich gewählten Commit-SHA und alle Vergleichsstände in `docs/launch-audit/STATUS.md` erfassen.
- Dieses Auftragsdokument liegt auf einer separaten Branch. Deren Produktcode ist lediglich eine Momentaufnahme bei Auftragserstellung. Den Auftrag in einen Arbeitsbaum des dann aktuellen Zielstands übernehmen; nicht versehentlich die Auftragsbranch als finalen 2.0-Code behandeln.
- Frischen Cloud-Checkout, festgelegte Node-Version und Lockfile verwenden. Vendor-/Modellbereitstellung mit Prüfsummen nachvollziehbar ausführen; Tests nie wegen fehlender Einrichtung als Produktfehler oder fälschlich als bestanden verbuchen.
- Linux/Electron mit geeigneter virtueller Anzeige testen; Windows- und macOS-Pakete über die vorhandene CI beziehungsweise geeignete Runner. Eine Linux-Cloud beweist keine native Mac-/Windows-Funktion.
- Cloud-Nutzung für Entwicklung bedeutet nicht Cloud-Verarbeitung von Kundendokumenten. Ausschließlich synthetische Testdaten. Keine Dokumente, Zuordnungstabellen, Passwörter oder private Schlüssel aus realen Kundenfällen hochladen.
- Abhängigkeiten dürfen für den Build bereitgestellt werden. Danach Laufzeit-Offlineverhalten separat prüfen. Nur Browser-Proxy-Ausfall ist kein vollständiger Beweis gegen jeden Netzpfad.

### Historische Hinweise, erneut prüfen

Stand der früheren Gegenprüfung war `9b71b9d1b62044c98c40af03a24eb201da0ed9b4`. Am 25.10.2026 war `v2/main` bereits 36 Commits weiter. Alte Befunde nicht blind erneut implementieren.

PRs:
- #5: CLI-Tippfehler abweisen; Windows-stdin-Grenze und negative Prüfung.
- #6: vollständige Release-Artefakte, Tag/Version/Changelog, Draft vor Veröffentlichung, Schreibrechte nur im Release-Job.
- #7: Transparenz-Animation auf Textcontainern entfernen; schwere axe-Kontrastbefunde verschwanden auf Ubuntu und Windows.

Status, Integration und eventuelle Änderungen dieser PRs frisch feststellen. Historische Testergebnisse sind keine Freigabe für einen neuen Commit.

Weitere Prüfhypothesen:
- CLI schreibt Ausgabedateien nacheinander direkt ins Ziel. Schreibfehler könnten Teilergebnisse hinterlassen; die damalige Dokumentation versprach zu viel.
- Wiederverwendete Ausgabeordner könnten alte Dateien eines größeren vorangegangenen Laufs behalten.
- Whitelist-Todo: freigegebener Gesamtfund wird teils erneut in Teilfunden maskiert. Das war Übermaskierung, kein belegtes zusätzliches Leck.
- Versionen in Fußzeile, Berichten, Paket und Changelog müssen übereinstimmen.
- Mac-Intel-Paket wurde früher nicht wie das ARM-Paket zur Laufzeit getestet.
- Normale Push-CI war früher auf main beschränkt.
- Absolute Aussagen „Kein Daten-Leakage“/„Kein Serverkontakt“ gegen tatsächliche Erkennung und Updateverkehr prüfen.

## 3. Astra: Bestandsaufnahme vor Änderungen

Erstelle `docs/launch-audit/BASELINE.md`:
- Funktionsinventar: GUI, CLI, Formate, Profile, Regeln, KI, Prüf-/Korrekturschritt, Exporte, Rückübersetzung, Projekte/Speicherung, Updates.
- Tatsächliche Architektur und Datenwege: Renderer, Hauptprozess, Worker, lokale Modelle, RAM, Festplatte, temporäre Dateien, Zwischenablage, Logs und Netzwerk.
- Versions-/Abhängigkeitsinventar einschließlich Modell-/Datensatzlizenzen, Lieferkette und Updatepfad.
- Baseline-Tests mit Commit, Betriebssystem, Node/Electron/Modellversion, Hardware/Runner, Laufzeit, Ergebnis und übersprungenen Fällen.
- Messung der Erkennungsqualität und Performance mit reproduzierbarem synthetischem Korpus.
- Screenshots und Beschreibung der zentralen Nutzerabläufe einschließlich Fehlerzuständen.

Jeden Befund kennzeichnen: [Code], [hier reproduziert], [CI], [übernommener Bericht], [Hypothese], [Vorschlag]. Fundstelle, Trigger, Nutzerwirkung, Priorität, Sollverhalten und Abnahmetest nennen. Mehr Testfälle allein bedeuten nicht mehr Zuverlässigkeit. Unbekannte oder nicht ausgeführte Prüfungen ausdrücklich offenlassen.

## 4. Repository privat, Verteilung und Website

Privatstellung ist ein ausdrückliches Ziel, kein bloßer Diskussionspunkt:
1. Sichtbarkeit aktuell feststellen. Berechtigten API-/GitHub-Weg nutzen, falls verfügbar; keine Tokens ausgeben. Falls das Werkzeug diese Einstellung nicht unterstützt, die konkrete Einstellungsstrecke nennen und die fehlende Berechtigung/Fähigkeit als offenen Betriebsschritt erfassen.
2. Vor Umstellung die Konsequenzen für Downloads, Auto-Updates, Releases, CI und Cloud-Zugriff sichtbar machen. Die Privatstellung wegen Verteilungsproblemen nicht stillschweigend verwerfen; falls nötig einen vorübergehenden Download-Ausfall transparent benennen.
3. Ein privates Quellcode-Repo liefert keine öffentlich zugänglichen GitHub-Release-Dateien für Kunden. Alternativen vergleichen: gesondertes öffentliches Distributionsrepo ohne Quellcode oder statischer Artefaktspeicher unter eigener Domain. Kein eingebetteter GitHub-PAT in Installer oder Website.
4. Download-/Update-Manifeste, Prüfsummen, Plattformdateien, Signierung und bestehende Installationen berücksichtigen. Migrieren und testen; ein Link-Test nach Veröffentlichung reicht als Vorabprüfung nicht.
5. Auf arcangeli.eu Quelltext und soweit möglich Live-Seiten nach PrivacyShield, GitHub, Open Source, Quellcode, Desktop, Downloads und Versionsdateien durchsuchen. ReguSafe-Verweise ebenfalls abgleichen. „Öffentlich“, „kostenlos“, „Open Source“ und „lokal“ getrennt prüfen.
6. Neue Privatheit widerruft keine früher gewährten Softwarelizenzen und entfernt keine bereits vorhandenen Kopien/Forks. Vorhandene Lizenzen und Hinweise korrekt behandeln.
7. Für Website-Korrekturen eigenen Branch/Draft-PR mit Texten, Links und Tests erstellen. Nach dem genehmigten Deploy öffentliche Links ohne GitHub-Anmeldung prüfen. Private Repo-Berechtigung für Codex Cloud nach Umstellung verifizieren.

Keinen zentralen Dokumentenserver als Nebenprodukt einführen. Falls ein Betriebsbackend nötig wird, zuerst den konkreten Prozess benennen: Distribution, Lizenzverwaltung oder Support. Dokumentinhalte und Zuordnungen bleiben lokal.

## 5. Unabhängige Funktions-, Sicherheits- und Fehlertests

Mindestens die tatsächlich unterstützten Abläufe prüfen:
- TXT, PDF mit Text, gescannte PDFs/OCR, Office-Formate und weitere zugesagte Importe; defekte, leere, verschlüsselte, ungewöhnlich große und nicht unterstützte Dateien.
- Unicode, deutsche Namen mit Varianten, gleiche Nachnamen mehrerer Personen, Initialen, mehrzeilige Adressen, OCR-Verwechslungen, internationale Identifikatoren und Prüfziffern.
- Wiederholte Vorkommen und Teilnamen konsistent behandeln, ohne verschiedene Personen unbemerkt zusammenzuführen. Mehrdeutigkeit sichtbar machen.
- Korrekturen, Whitelist, eigene Regeln und Profile; keine veraltete Exportfreigabe nach Änderungen an Dokument, Regel, Modell oder Projekt.
- Platzhalter unverändert und verändert, fehlende/mehrdeutige Platzhalter, Projektwechsel und exakte Rückübersetzung, soweit vertraglich zugesagt.
- GUI-/CLI-Verhaltensgleichheit bei gleicher Konfiguration; Fehlercodes, unbekannte Optionen, Pfade mit Leerzeichen, Ausgabeordner, Symlinks und Abbruch.
- Schreibfehler gezielt provozieren: z. B. Verzeichnis an Stelle von anonymisiert_002.txt, volle/nicht beschreibbare Ziele, Abbruch beim Export. Keine unbemerkte Mischung aus alten, neuen und halben Ergebnissen. Transaktionsvertrag für Ausgabe und separat gespeicherte Zuordnung festlegen, bevor umfassend umgebaut wird.
- XSS/HTML-artiger Fremdtext in Ansichten, Regeln, Dateinamen und Exporten; Electron-IPC, Dateizugriff, Navigation und Updatepfad.
- Offline-Start, fehlendes/beschädigtes Modell, Abbruch, Speicherknappheit und Wiederaufnahme; keinen stillen Qualitätsverlust als Erfolg ausgeben.
- Exportprüfung mit unabhängiger Extraktion und Prüfung der tatsächlich unterstützten Inhaltstypen. Suche nach bekannten Klartextstrings allein ist kein Vollständigkeitsbeweis.
- Keine realen Kundendaten in Testartefakten, Screenshots oder Logs.

Für relevante neue Fehler zuerst eine gezielte Gegenprobe. Bestehende Tests nicht abschwächen, Baselines nicht einfach neu schreiben, echte Fehler nicht als Todo/Skip verstecken. Bewusste Plattformgrenzen mit negativem Verhalten testen und dokumentieren.

## 6. UI/UX: modernes Arbeitswerkzeug mit bestehender Farbwelt

Astra bewertet zuerst die tatsächlichen Screens und Kernaufgaben. Orientierung am ruhigen, klaren Interaktionsstil moderner Chat-Anwendungen; kein Kopieren von Logos oder Markenauftritt. Bestehende Grundfarben erhalten, Kontrast nötigenfalls über abgestimmte Text-/Flächenvarianten verbessern.

Prioritäten:
- Verständliche visuelle Hierarchie, konsistente Abstände/Typografie, klare Hauptaktion, progressive Offenlegung seltener Funktionen.
- Durchgehender Ablauf Import → Analyse → menschliche Kontrolle → Ausgabe → Rückübersetzung; Vertrauen durch sichtbaren Status und Grenzen.
- Fundstelle, Kategorie, Korrektur und Exportentscheidung leicht erreichbar; Warnungen verständlich und handlungsbezogen.
- Fortschritt und Abbruch bei langen Aufgaben, leere Zustände, Fehlerbehebung, konsistente Dialoge, keine UI-Blockaden.
- Tastaturbedienung einschließlich manueller Annotation, Fokusführung, Screenreader-Ansagen, ausreichende Kontraste, Zoom, reduzierte Bewegung und kleine Fenster.
- Screenshot-Vergleich vorher/nachher und Aufgabenprüfung mit realistischen synthetischen Dokumenten.

Eine begründete 1–5-Bewertung pro Dimension verwenden: Verständlichkeit, Bedienaufwand, Fehlervermeidung, Rückmeldung, Barrierefreiheit, visuelle Konsistenz. Eigenbewertung ist kein Kundenrating. Konkrete Mängel und beobachtete Abläufe dokumentieren. Eine Fünf-Sterne-Werbeaussage erst bei entsprechender externer Evidenz.

Astra legt einen zusammenhängenden Entwurf und konkrete Abnahmekriterien fest. Sol setzt diesen in kleinen, testbaren Paketen um. Kein vollständiger Frameworkwechsel nur für ein moderneres Aussehen.

## 7. Lokale KI, Erkennung und RAM

Vor Optimierungen messen:
- Kalt-/Warmstart, Modellinitialisierung, Durchsatz, P50/P95 für definierte Dokumentgrößen, UI-Reaktionsfähigkeit und Abbruchlatenz.
- Spitzen-RAM und Speicher nach wiederholten Analysen, Projektwechsel, Reset und Leerlauf; Hauptprozess, Renderer und Worker unterscheiden.
- Erkennungsqualität je Kategorie, Recall/übersehene Werte, Precision/Fehlmaskierung und kritische Restdaten; getrennt für Regeln, KI und OCR.
- Hardware-/Betriebssystemabhängigkeit; WASM/Threads und optional WebGPU nur anhand tatsächlich unterstützter Konfigurationen.

Danach gezielt vergleichen: Chunking mit Überlappung, Kontextverlust an Grenzen, Batching, weniger Textkopien, Worker-/IPC-Datenübergabe, Modellwiederverwendung und Entladen, begrenzte Cache-Größen, Parallelitätsgrenzen und Quantisierung. Neue Modelle müssen anhand deutscher Dokumente und Ressourcenbedarf gegen den bestehenden Stand gewinnen; kein Wechsel allein wegen einer neueren Versionsnummer.

RAM-Cache ist kein persistenter Tresor. Lebensdauer, Besitz und Löschwege für Text, Treffer und Zuordnung definieren. Keine unkontrollierten Inhalte in Logs, Swap-/Crash-/Temp-Risiken berücksichtigen und keine garantierte physische RAM-Löschung aus Garbage Collection ableiten. Betriebssystemgrenzen ehrlich beschreiben.

Neue Funktionen nach Kundennutzen, Aufwand und Risiko priorisieren. Launch-Blocker und kleine wirksame Verbesserungen zuerst. Größere Modell-, Format- oder Teamfunktionen als spätere Pakete markieren, wenn sie die Fertigstellung gefährden.

## 8. Kundenfähiger Verarbeitungsnachweis statt Compliance-Zertifikat

Die Idee des Inhabers ist ausdrücklich zu prüfen. Empfohlener Produktname: „Verarbeitungsnachweis“ oder „Nachweis der Pseudonymisierung“, je nach tatsächlicher Funktion. Keine Zertifizierung durch eine unabhängige Stelle, kein DSGVO-Siegel, keine Garantie vollständiger Anonymität behaupten.

Ein Vorgang kann z. B. so belegt werden:
„Für den bezeichneten Dokumentumfang wurde am [Datum] mit ReguSafe PrivacyShield [Version] eine lokale Verarbeitung nach dem angegebenen Profil durchgeführt. Die Ausgabe wurde [tatsächlicher Prüfstatus]. Dieser Nachweis beschreibt diesen Vorgang und bestätigt weder die vollständige Entfernung aller personenbezogenen Informationen noch die Datenschutzkonformität weiterer Verarbeitungsschritte.“

Konkrete Anforderungen:
- Inhalt ausschließlich aus dem tatsächlichen Vorgangs-/Exportmodell erzeugen: Produkt-/Regel-/Modellversion, Profil, unterstützte Formate, Umfang, Kategorien als Zähler, Prüfstatus, bekannte Import-/OCR-Grenzen, Datum und lokale Nachweis-ID.
- Keine Originalnamen, Dateipfade, erkannten Werte, Zuordnungstabellen oder sensiblen Fachdetails automatisch aufnehmen. Optionaler Kunden-/Projekttitel nur bewusst gewählt und vor Export sichtbar.
- „Anonymisiert“ nicht verwenden, wenn tatsächlich nur reversible Platzhalter/Pseudonyme mit Zuordnung erzeugt wurden. Menschliche Prüfung nur behaupten, wenn sie tatsächlich erfolgt ist. Lokale Zeitangabe ist kein vertrauenswürdiger externer Zeitstempel.
- Nachweis an genau den freigegebenen Export und dessen Revision binden. Inhaltliche Änderungen machen ihn ungültig oder erzeugen einen neuen Nachweis.
- Kurzes, sauber gestaltetes PDF plus maschinenlesbare strukturierte Daten erwägen. Erst Vorlage und Datenvertrag, dann Umsetzung.
- Für eine sachliche Zusammenfassung reicht zunächst deterministischer Vorlagentext. Ein NER-Modell ist kein Textgenerator. Ein zusätzliches lokales Sprachmodell nur bei messbarem Zusatznutzen; es darf keine Fakten, Prüfungen oder Zusicherungen erfinden.
- Eine optionale KI darf nur bereits freigegebene strukturierte Fakten formulieren; keine unkontrollierten Dokumentanweisungen übernehmen, Ausgabe validieren, menschliche Vorschau.
- Produktlogo/„Stempel“ ist Markenkennzeichnung. Eine lokale selbst erzeugte Unterschrift macht den Bericht nicht zu einer unabhängigen ReguSafe-Bestätigung. Keinen ReguSafe-Privatschlüssel in die App einbauen. Kryptografische Signatur, falls später benötigt, getrennt nach Aussteller, Schlüsselverwaltung und Aussageumfang entwerfen.
- Nachweis soll keine Freigabe erzeugen, wenn Import unvollständig, Analyse abgebrochen oder Ausgabe veraltet ist. Bekannte Reste/ungeprüfte Ergebnisse müssen klar ausgewiesen werden oder den als freigegeben bezeichneten Nachweis verhindern.
- Testfälle für vollständigen Vorgang, offene Warnungen, abgebrochene Analyse, geändertes Dokument, sensible Metadaten und nicht bestätigte menschliche Prüfung.

Diese Funktion unterstützt die Dokumentation eines konkreten Arbeitsschritts. Sie darf nicht zur Behauptung führen, ein Kunde oder dessen gesamte Datenverarbeitung sei deshalb DSGVO-konform. Fachliche Prüfung der finalen Außenkommunikation als Launch-Aufgabe kennzeichnen.

## 9. Plan, Sol-Umsetzung und Abnahme

Astra erstellt `docs/launch-audit/PLAN.md` mit priorisierten Paketen. Jedes Paket enthält:
- konkreten Nutzer-/Betriebsfehler oder Nutzen,
- betroffene Dateien/Schnittstellen und Abhängigkeiten,
- Umsetzungsvorschlag, Aufwandsspanne mit Unsicherheit,
- Test-/Messkriterium, Rückfallmöglichkeit und Zuständigkeit,
- Einordnung: Launch erforderlich, sinnvoll vor Launch oder später.

Sol führt die autorisierten Pakete in dieser Reihenfolge aus, je Paket nachvollziehbare Commits und kurze Statusaktualisierung. Nicht während aktiver Änderungen anderer Agenten denselben Bereich überschreiben. Fehler durch Integration selbst beheben. Tests dem Risiko angemessen ausführen; keine redundanten Vollsuiten ohne neue Änderung oder offene Frage.

Ergebnisse versionieren:
- `docs/launch-audit/STATUS.md`: SHA, aktive Aufgabe, offene Punkte, neuester Test-/CI-Stand.
- `BASELINE.md`: Ausgangslage und Befunde.
- `PLAN.md`: Entscheidungen und Umsetzungspakete.
- `VALIDATION.md`: ausgeführte Tests, Runner/Versionen, Ergebnis und Grenzen.
- `HANDOFF.md`: kurzer Wiederanlauf für die nächste Handy-/Cloud-Session.
- Bei Bedarf `UI_REVIEW.md`, `PERFORMANCE.md` und `PROCESSING_RECORD.md`.

Keine vertraulichen Geschäfts-/Kundendaten oder Schlüssel in diese Dateien schreiben.

Zum Abschluss Astra-Review und kombinierte Abnahme auf genau einem Endcommit:
- Funktion, Erkennungsqualität, Fehlersituationen, Offline, Export/Rückübersetzung, UI/Tastatur und relevante Regressionen.
- Gebaute und installierte Varianten auf den angebotenen Plattformen/Architekturen; Abweichungen ausdrücklich offen.
- Tag, Paketversion, Berichte und Update-Metadaten konsistent; Installer, Signierung, Prüfsummen, Download-/Updatepfad und negative Release-Probe.
- Privatheit, Cloud-Zugriff und Website-Aussagen überprüft.
- Keine roten Pflichtprüfungen als „launchreif“ deklarieren. Restmängel mit Nutzerwirkung und akzeptierter Grenze.
- Launch-Empfehlung, belegter Nutzen der Änderungen und kurze konkrete Freigabeliste.

Arbeite autonom bis zu diesem prüfbaren Ergebnis. Am Ende kein langer Arbeitsbericht im Chat: wichtigste Ergebnisse, Links auf PRs/Prüfprotokolle und tatsächlich verbleibende Freigaben oder Blockaden.
