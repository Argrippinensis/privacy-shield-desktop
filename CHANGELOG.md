# Änderungsprotokoll

Format: ein Abschnitt je Version, Überschrift `## [x.y.z] - JJJJ-MM-TT`. Der Release-Workflow übernimmt den Abschnitt
der getaggten Version als Text des GitHub-Releases (Fallback: "PrivacyShield vX.Y.Z").

## [Unreleased] (2.0.0)

### Änderungen
- Platzhalterformat: Nennt ein Text dieselbe Person mehrfach (Hans Müller, Herr Müller, Hans), bekommen alle Formen dieselbe Nummer mit Endung ({{NAME_1}}, {{NAME_1.NACHNAME}}, {{NAME_1.VORNAME}}, {{NAME_1.KURZ}}), nur wenn eindeutig; die Rückübersetzung bleibt exakt.

### Intern
- mammoth.js 1.6.0 auf 1.13.0 (DOCX lesen; Browser-Datei 642.759 auf 405.060 Bytes, Lizenz unverändert BSD-2-Clause). Umlaute und Sonderzeichen im DOCX-Rundlauf unverändert, Differenztest 0 Abweichungen von 645.

## [1.8.0] - 2026-10-20

### Erkennung
- Neue Kategorien: Kreditkartennummern (mit Prüfziffer), Kfz-Kennzeichen und Fahrgestellnummern, IPv6, Weblinks.
- IBAN: alphanumerische Kontonummern (NL, GB, FR, IT, ES ...), Kleinschreibung und Schreibweise ohne Leerzeichen.
- Telefonnummern: internationale Formate, Vorwahl mit Schrägstrich, Klammern.
- Datumsangaben mit Monatsnamen und Schrägstrich, Steuer-ID in allen gängigen Schreibweisen.
- Namen: Initialen, GROSSGESCHRIEBENE Namen, Namenszusätze (von, van, de), Bindestrich-Namen, Sonderzeichen (Ö, Ü, Ç, ë ...).
- Adressen: Schweizer und österreichische Schreibweise, vierstellige Postleitzahlen.
- Weniger Fehlalarme (Länder, "Zentrale", Rechnungsnummern mit führenden Nullen).

### Fehlerdiagnose
- Startet die KI-Erkennung nicht, nennt die App jetzt den Grund (fehlende oder unvollständige Modelldatei, zu wenig Arbeitsspeicher,
  Laufzeitfehler) samt Lösungshinweis statt nur "Modell konnte nicht geladen werden". Knöpfe "Erneut versuchen" und "Details kopieren".
- Die Installation wird beim Fehler gegen ein Manifest geprüft (Dateien und Größen); "Diagnose kopieren" enthält den KI-Fehler.
- Bei Thread- oder Speicherproblemen wird einmal automatisch mit einem Rechenthread wiederholt.
- Leere Dateien (0 Bytes, z. B. nur online in OneDrive vorhanden) werden erklärt statt stumm angezeigt.
- Der Hinweis zur Standard-Erkennung sagt ehrlich, dass sie weniger erkennt (bisher: "ohne Einschränkung").

### Bedienung und Leistung
- KI-Erkennung ist standardmäßig aktiv: Das Modell startet bei der ersten Analyse und gibt nach 5 Minuten Leerlauf den Speicher frei.
- Große Dokumente werden bis zu 8-mal schneller anonymisiert.
- Update-Hinweise sperren die App nie mehr; wo automatisches Installieren nicht möglich ist, führt ein Link zur Download-Seite.

### Verteilung
- Feste Dateinamen der Installer (immer die neueste Version unter `releases/latest/download/`).
- macOS: Intel- und Apple-Silicon-Version, Ad-hoc-Signatur.
- Prüfsummen (`SHA256SUMS.txt`) im Release.

## [1.7.0] - 2026-10-20

- KI-Erkennung läuft im Hintergrund, die Oberfläche bleibt bedienbar.
- Bibliotheken, OCR-Daten und KI-Modell sind Teil der Installation; kein Download beim ersten Start, vollständig offline.
- Echte Arbeitsspeicher-Anzeige, KI-Modell entladbar.
- Update-Dialog sperrt die App offline nicht mehr, externe Links öffnen im Browser.
