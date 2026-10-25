# PrivacyShield Desktop: Kurzanleitung

PrivacyShield ersetzt persönliche Angaben in Ihren Dokumenten (Namen, Adressen, Kontonummern, Telefonnummern und mehr) durch Platzhalter wie `{{NAME_1}}`, bevor Sie einen Text zum Beispiel in einen KI-Dienst einfügen. Alles geschieht auf Ihrem Rechner. Die Seiten der App haben keinen Zugang zum Internet; nur die Suche nach Programm-Updates nutzt das Netz.

**Wichtig vorweg:** Die automatische Erkennung ist nie zu 100 Prozent vollständig. Sie müssen das Ergebnis vor der Weitergabe selbst prüfen. PrivacyShield ersetzt keine Rechts- oder Datenschutzberatung.

## 1. Ablauf für ein Dokument

1. **Öffnen.** Starten Sie die App ("Jetzt starten"). Ziehen Sie eine Datei in das Feld "Datei ablegen oder klicken", wählen Sie sie über das Feld aus, oder fügen Sie Text direkt in das Feld "Originaltext" ein. Geeignete Dateien: Text, PDF (auch gescannt), Word, Excel, PowerPoint, OpenDocument, RTF, E-Mail (`.eml`), HTML. Alte Formate (`.doc`, `.xls`, `.ppt`) bitte zuerst in einem Office-Programm als `.docx`, `.xlsx` oder `.pptx` speichern.
2. **Anonymisieren.** Klicken Sie auf "Anonymisieren". Im Feld "Anonymisierter Text" erscheint das Ergebnis. Das KI-Modell wird bei der ersten Analyse automatisch aus der Installation gestartet (dauert etwa 2 Sekunden); im Feld "KI-Erkennung" steht dann "Aktiv (NER-Modell)".
3. **Prüfen.** Lesen Sie das Ergebnis. Nutzen Sie die Gegenprüfung (Abschnitt 2) und die Prüfansicht "Funde" (Abschnitt 5). Übersehene Stellen können Sie im Modus "Annotieren" per Klick auf einzelne Wörter nachmarkieren; diese Markierungen bleiben bei "Neu anonymisieren" erhalten.
4. **Kopieren oder speichern.** "Kopieren" legt den anonymisierten Text in die Zwischenablage. Die Antwort einer KI fügen Sie unter "KI-Antwort einfügen" ein; "Originaldaten einsetzen" setzt die echten Werte wieder ein. Das fertige Dokument speichern Sie als TXT oder PDF. Dafür muss die Zuordnung noch im Programm vorhanden sein (Abschnitt 4).

Über die Filterprofile ("Standard", "Finanzen & Recht", "Medizin & Pflege", "Maximal") oder die Auswahl der Erkennungsregeln legen Sie fest, welche Arten von Angaben erkannt werden. Begriffe, die nie ersetzt werden sollen (zum Beispiel Ihr eigener Firmenname), tragen Sie in die "Whitelist" ein; Vorsicht: sie wirkt auf Wortteile, ein Eintrag "Berlin" gibt auch "Berliner Allee 5" frei.

## 2. Gegenprüfung

Nach jedem Lauf prüft PrivacyShield das Ergebnis ein zweites Mal. Über dem Ergebnis steht "Gegenprüfung: keine Auffälligkeiten" oder "n mögliche Reste". Ein Klick klappt die Liste auf. Zu jedem möglichen Rest sehen Sie Typ, Schwere (hoch oder mittel) und die Umgebung. Mit "Maskieren" wird der Wert nachträglich ersetzt, mit "Ignorieren" bleibt er stehen. "Keine Auffälligkeiten" ist kein Beweis, dass nichts übrig ist, sondern nur: Die Erkennung findet beim zweiten Durchgang nichts mehr.

## 3. Bericht

"Bericht speichern" erstellt eine Textdatei (`bericht.txt`): Programmversion, Zeitpunkt, Profil, KI-Modus, je Dokument die Zahl der Funde je Kategorie, das Ergebnis der Gegenprüfung und eine Prüfsumme des Ergebnistextes. Der Bericht enthält keine personenbezogenen Angaben aus Ihren Dokumenten. Er dient als Nachweis, dass geprüft wurde, und ersetzt keine rechtliche Bewertung. Beim Speichern eines Projekts als ZIP liegt der Bericht (zusätzlich als `bericht.json`) automatisch dabei.

## 4. Zuordnung speichern und laden (verschlüsselt)

Die Zuordnung "Platzhalter gehört zu Originalwert" ist nötig, um Antworten zurückzuübersetzen. Sie liegt zunächst nur im Arbeitsspeicher und geht beim Schließen der App verloren. Mit "Zuordnung speichern" legen Sie sie als Datei `zuordnung.psmap` ab, geschützt durch ein Passwort (mindestens 10 Zeichen, Eingabe zweimal). Mit "Zuordnung laden" holen Sie sie in einer späteren Sitzung zurück.

> **ACHTUNG: PASSWORTVERLUST IST ENDGÜLTIG.** Das Passwort wird nirgends gespeichert und es gibt keine Wiederherstellung, auch nicht durch den Hersteller. Wer das Passwort vergisst, kann die Zuordnung nie wieder öffnen; Antworten lassen sich dann nicht mehr mit den Originalwerten zusammenführen. Bewahren Sie das Passwort getrennt von der Datei auf, zum Beispiel in einem Passwortmanager.

Die Datei enthält Ihre Originalwerte (und die Originaldateinamen) nur verschlüsselt. Die Alternative "Als CSV exportieren" (unter "Weitere Optionen") speichert sie unverschlüsselt im Klartext; die App fragt vorher nach. Ältere CSV-Dateien aus früheren Versionen lassen sich weiterhin laden. Schließen Sie die App mit nicht gespeicherter Zuordnung, warnt sie Sie (unter macOS umgeht Cmd+Q diese Rückfrage).

## 5. Prüfansicht "Funde" mit Rückgängig

Der Knopf "Funde" öffnet eine Seitenleiste mit allen erkannten Werten, nach Typ geordnet. Hier (und nur hier) sehen Sie neben dem Platzhalter den Originalwert. Pro Eintrag:

* **Freigeben:** Der Wert bleibt im Ergebnis im Klartext (nur dieser Typ mit genau diesem Wert). **Maskieren** nimmt die Freigabe zurück.
* Pro Gruppe gibt es "alle ... freigeben" bzw. "maskieren". Ein Klick auf den Wert markiert die erste Fundstelle im Text.
* "Nur Zweifelsfälle" zeigt Funde, bei denen die Erkennung unsicher ist (Namen, Organisationen, Orte, Adressen u. a.); das Suchfeld und der Kategorie-Filter grenzen die Liste ein.
* **Rückgängig und Wiederholen** über die Pfeilknöpfe oder per Tastatur: **Strg+Z** (macOS: **Cmd+Z**) macht die letzte Entscheidung rückgängig, **Strg+Y** oder **Strg+Umschalt+Z** (macOS: **Cmd+Umschalt+Z**) stellt sie wieder her. Das gilt nur, wenn der Cursor nicht in einem Eingabefeld steht; dort bleibt das normale Rückgängig der Textbearbeitung. **Esc** schließt die Leiste, wenn der Fokus in ihr liegt.

Nichts davon wird dauerhaft gespeichert.

## 6. Projekte mit mehreren Dateien

Wählen Sie mehrere Dateien aus oder ziehen Sie sie gemeinsam in das Feld. Es erscheint eine Liste "Dokumente" (bis zu 200 Dateien). "Alle anonymisieren" verarbeitet sie nacheinander mit gemeinsamen Platzhaltern: Dieselbe Person heißt in allen Dokumenten gleich. Nennt ein Text dieselbe Person mehrfach (Hans Müller, Herr Müller, Hans), bekommen die Formen dieselbe Nummer, zum Beispiel `{{NAME_1}}`, `{{NAME_1.NACHNAME}}`, `{{NAME_1.VORNAME}}`; nur, wenn die Zuordnung eindeutig ist. "Alles als ZIP speichern" liefert die anonymisierten Texte, den Bericht und (wenn "Zuordnung einschließen" angehakt ist) die verschlüsselte Zuordnung. Die Dateien im ZIP heißen neutral (`anonymisiert_001.txt`), weil Dateinamen oft Namen enthalten; "Originalnamen verwenden" ändert das bewusst. Ändern Sie Einstellungen, nachdem Sie anonymisiert haben, sind die Ergebnisse veraltet und müssen neu berechnet werden.

## 7. Öffnen mit und Kommandozeile

* **Öffnen mit.** PrivacyShield richtet keine Standard-Dateizuordnung ein. Sie können eine Datei aber auf das Programmsymbol ziehen oder im Dateimanager "Öffnen mit" und dort PrivacyShield wählen. Läuft die App schon, übernimmt sie die Datei in das laufende Fenster.
* **Kommandozeile** für Stapel und Skripte: `docs/kommandozeile.md`. Eigene Regeln als Richtliniendatei: `docs/policy-format.md`.

## 8. Bekannte Grenzen (ehrlich gesagt)

* **Die Erkennung ist nie 100 Prozent.** Namen, Firmen und Orte erkennt vor allem das KI-Modell; fehlt es (ausgeschaltet, zu wenig Arbeitsspeicher, Startfehler), gilt die Standard-Erkennung aus Regeln und Wortlisten, die deutlich weniger findet. Die App zeigt das an ("Fallback (Wortlisten)"); prüfen Sie das Ergebnis dann besonders sorgfältig.
* **Gescannte Dokumente (OCR).** Die Texterkennung liest nur Deutsch und Englisch, höchstens 20 Seiten je Datei, und macht Lesefehler. Gelesene Zahlen und Namen können verfälscht sein (zum Beispiel Zeichenverwechslungen), dann erkennt die Erkennung sie nicht. Auch ein Nachname hinter einem Zeilenumbruch kann übrig bleiben.
* **Zahlen und Text in Bildern.** Bilder in Word, PowerPoint und anderen Dokumenten werden nicht gelesen. Namen oder Nummern, die nur als Bild vorliegen, bleiben unverändert.
* **Sprachen.** Die Oberfläche und die Regeln sind auf Deutsch ausgerichtet. Das KI-Modell ist mehrsprachig; Adress- und Nummernformate sind für einzelne Länder (zum Beispiel Schweiz, Österreich, Niederlande) hinterlegt, aber eine Unterstützung weiterer Sprachen ist nicht Teil dieser Version.
* **Niederländische Postleitzahlen** mit manchen Buchstabenpaaren (zum Beispiel AD, AG, CE) bleiben lesbar; die Straße davor wird maskiert.
* **Orte in Firmennamen.** Ortsnamen werden grundsätzlich maskiert, auch wenn sie Teil eines Firmennamens sind (zum Beispiel "Stadtwerke München"). Lieber ein Wort zu viel als eines zu wenig; bei Bedarf geben Sie den Wert in der Prüfansicht frei.
* **Freigaben mit der Whitelist** geben einen ganzen Fund frei, Reste davon können aber weiter ersetzt werden (Beispiel: Eintrag "Berlin" bei "Hauptstr. 46, 65311 Berlin": "Berlin" bleibt lesbar, die Straße bleibt ersetzt).
* **Fehlalarme sind möglich:** harmlose Wörter (Gattungsnamen, Produktnamen) können ersetzt werden. Das ist in Kauf genommen, um nichts zu übersehen.
* **Kein formattreuer Export.** Das Ergebnis ist reiner Text (TXT) oder ein einfaches PDF; Layout, Bilder und Tabellen des Originals bleiben nicht erhalten.
* **Dateien:** höchstens 30 MB je Datei; bei einem Projekt höchstens 200 Dokumente.
* **Updates.** Unter Windows und bei der Linux-AppImage installiert sich ein Update, nachdem Sie im Hinweis auf "Jetzt aktualisieren" geklickt haben, und die App startet neu. Unter macOS (nicht signiert) und beim deb-Paket weist die App nur auf die neue Version hin und führt zur Download-Seite.

Bei Problemen: Knopf "Info", dort "Diagnose kopieren". Die Diagnose enthält keine Dokumentinhalte und keine Dateinamen.
