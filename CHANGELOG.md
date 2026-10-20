# Änderungsprotokoll

Format: ein Abschnitt je Version, Überschrift `## [x.y.z] - JJJJ-MM-TT`. Der Release-Workflow übernimmt den Abschnitt
der getaggten Version als Text des GitHub-Releases (Fallback: "PrivacyShield vX.Y.Z").

## [1.8.0] - noch nicht veröffentlicht

### Erkennung
- Neue Kategorien: Kreditkartennummern (mit Prüfziffer), Kfz-Kennzeichen und Fahrgestellnummern, IPv6, Weblinks.
- IBAN: alphanumerische Kontonummern (NL, GB, FR, IT, ES ...), Kleinschreibung und Schreibweise ohne Leerzeichen.
- Telefonnummern: internationale Formate, Vorwahl mit Schrägstrich, Klammern.
- Datumsangaben mit Monatsnamen und Schrägstrich, Steuer-ID in allen gängigen Schreibweisen.
- Namen: Initialen, GROSSGESCHRIEBENE Namen, Namenszusätze (von, van, de), Bindestrich-Namen, Sonderzeichen (Ö, Ü, Ç, ë ...).
- Adressen: Schweizer und österreichische Schreibweise, vierstellige Postleitzahlen.
- Weniger Fehlalarme (Länder, "Zentrale", Rechnungsnummern mit führenden Nullen).

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
