# Abnahme auf einem echten Windows-Rechner

Diese Handprüfung ersetzt kein automatischer Test: Sie prüft, was auf einem normalen Windows-Rechner wirklich passiert (Installation, Betrieb ohne Netz, Bedienung). Sie dauert etwa eine Stunde. Haken Sie jeden Punkt ab, wenn das Ergebnis stimmt; schreiben Sie bei Abweichungen auf, was Sie gesehen haben (gern mit Bildschirmfoto). Mit einem Haken bestätigen Sie nur, was Sie selbst gesehen haben.

Alle Beispieltexte unten sind erfunden. Verwenden Sie für die Prüfung keine echten Personendaten.

| Angabe | Eintrag |
|---|---|
| Datum | |
| Windows-Version (Einstellungen, System, Info) | |
| Arbeitsspeicher | |
| Geprüfte PrivacyShield-Version (Anzeige links unten) | |
| Quelle des Installers (Probelauf der Paketbauten oder Release) | |
| Prüfer | |

## 0. Vorbereitung

- [ ] Ein Ordner `C:\PS-Test` existiert und ist leer.
- [ ] Drei Textdateien in `C:\PS-Test\eingang` angelegt (Editor, Speichern als UTF-8):
  `brief1.txt`: "Sehr geehrte Frau Erika Musterfrau, Ihre Rechnung Nr. 4711 ist offen. Bitte überweisen Sie auf die IBAN DE89 3704 0044 0532 0130 00. Rückfragen: erika.musterfrau@example.org oder Telefon 030 1234567."
  `brief2.txt`: "Notiz: Herr Max Mustermann hat mit Frau Musterfrau gesprochen. Erika Musterfrau ist unter erika.musterfrau@example.org erreichbar. Die Lieferung geht nach Musterstraße 12, 10115 Berlin."
  `brief3.txt`: "Protokoll vom 12.03.2026. Anwesend: Erika Musterfrau, Max Mustermann. Frau Musterfrau bestätigt die Zahlung von 250,00 EUR."
- [ ] Zum Vergleich (Update-Test, Punkt 9) ist die Version 1.8.0 des Installers erreichbar.

## 1. Installation

- [ ] `PrivacyShield-Setup.exe` doppelklicken. Hinweis: Das Installationsprogramm ist nicht signiert; Windows kann deshalb eine Warnung von SmartScreen zeigen ("Weitere Informationen", "Trotzdem ausführen"). Notieren Sie, ob und welche Warnung erschien.
- [ ] Der Installer erlaubt die Wahl des Installationsordners und schließt ohne Fehlermeldung ab.
- [ ] Eine Verknüpfung auf dem Desktop (und im Startmenü) ist angelegt.
- [ ] PrivacyShield startet über die Verknüpfung; das Fenster erscheint innerhalb weniger Sekunden.
- [ ] Links unten steht die erwartete Versionsnummer (`v2.0.0` bzw. die zu prüfende Version) neben den Knöpfen "Updates", "Diagnose kopieren" und "Info".

## 2. Erster Start ohne Netz (Flugmodus)

- [ ] PrivacyShield beenden. Windows-Flugzeugmodus einschalten (oder Netzwerkkabel ziehen und WLAN ausschalten). Kontrolle: Ein Browser öffnet keine Internetseite.
- [ ] PrivacyShield starten. Es erscheint kein Dialog, der die Bedienung blockiert (eine fehlgeschlagene Update-Suche darf keine Sperre erzeugen).
- [ ] Die Startseite ("Daten sicher für KI freigeben") erscheint; "Jetzt starten" führt in den Arbeitsbereich.
- [ ] Im Feld "KI-Erkennung" steht zunächst "Bereit" und kein Download-Hinweis.
- [ ] Nach "Jetzt laden" (oder dem ersten "Anonymisieren") zeigt das Feld "Starte KI-Modell", dann das Kennzeichen "Aktiv (NER-Modell)" und den Text "Wird aus der Installation geladen · kein Download". Es erscheint keine Fehlermeldung.

## 3. Ein Dokument anonymisieren (Grundablauf)

- [ ] Datei `brief1.txt` über das Feld "Datei ablegen oder klicken" laden. Der Dateiname erscheint, der Text steht im Feld "Originaltext".
- [ ] "Anonymisieren" klicken. Name, IBAN, E-Mail und Telefonnummer sind im Ergebnis durch Platzhalter ersetzt (zum Beispiel `{{NAME_1}}`, `{{IBAN_1}}`, `{{EMAIL_1}}`, `{{TEL_1}}`).
- [ ] Über dem Ergebnis steht die Gegenprüfung ("Gegenprüfung: keine Auffälligkeiten" oder eine Zahl möglicher Reste mit aufklappbarer Liste).
- [ ] "Kopieren" klicken, die Zwischenablage in den Editor einfügen: Der anonymisierte Text steht dort.

## 4. Drei Dokumente gemeinsam (Projekt)

- [ ] "Zurücksetzen" klicken. Danach `brief1.txt`, `brief2.txt` und `brief3.txt` gemeinsam auswählen (oder gemeinsam in das Feld ziehen). Es erscheint die Liste "Dokumente" mit drei Einträgen.
- [ ] "Alle anonymisieren" klicken. Alle drei Einträge zeigen den Status "fertig", die Fortschrittsanzeige endet bei "3 von 3".
- [ ] Die Option "Zuordnung einschließen" ist angehakt; "Originalnamen verwenden" ist nicht angehakt.
- [ ] "Alles als ZIP speichern" klicken, das Passwort-Fenster erscheint (Titel "Zuordnung mit Passwort schützen"). Ein Passwort mit weniger als 10 Zeichen wird abgelehnt (Hinweis "Zu kurz"). Ein Passwort mit mindestens 10 Zeichen (zum Beispiel `Winter-Test-2026`) zweimal eingeben, OK. Das Passwort notieren: Es lässt sich nicht wiederherstellen.
- [ ] Die ZIP-Datei wird gespeichert (Speichern-Dialog). Im ZIP (Entpacken über den Explorer) liegen `anonymisiert_001.txt` bis `anonymisiert_003.txt`, `bericht.txt`, `bericht.json` und `zuordnung.psmap`. Die Dateinamen enthalten keine Originalnamen.
- [ ] In den drei Texten trägt "Erika Musterfrau" überall denselben Platzhalter, zum Beispiel `{{NAME_1}}` und für "Frau Musterfrau" `{{NAME_1.NACHNAME}}`. Weicht das ab, notieren Sie den Wortlaut (Abweichung, kein automatischer Fehler).

## 5. Zuordnung speichern und laden

- [ ] Im Arbeitsbereich das Mapping prüfen (Bereich "Variablen-Zuordnung" mit Einträgen). "Zuordnung speichern" klicken, Passwort zweimal eingeben, Datei `zuordnung.psmap` speichern. Meldung "Zuordnung verschlüsselt gespeichert".
- [ ] Die Datei im Editor öffnen: Der Inhalt ist nicht lesbar (Binärdaten) und enthält die Namen nicht im Klartext.
- [ ] PrivacyShield schließen. Rückfrage zur nicht gespeicherten Zuordnung erscheint nur, wenn nicht gespeichert wurde; hier darf sie nicht erscheinen. Neu starten.
- [ ] Auf der Startseite "Zuordnung laden", `zuordnung.psmap` wählen. Zuerst ein falsches Passwort eingeben: Meldung "Passwort falsch oder Datei beschädigt". Dann das richtige Passwort: Meldung "n Einträge geladen".
- [ ] In "KI-Antwort einfügen" einen Text mit einem Platzhalter einfügen (zum Beispiel "Bitte antworten Sie an {{NAME_1}}.") und "Originaldaten einsetzen" klicken: Der Platzhalter wird durch den Namen ersetzt.

## 6. Prüfansicht und Rückgängig

- [ ] "Zurücksetzen" klicken, einen Text laden und anonymisieren (zum Beispiel `brief2.txt`). Den Knopf "Funde" klicken: Die Seitenleiste zeigt die Funde nach Typ.
- [ ] Bei einem Namen "Freigeben" klicken: Im Ergebnis steht der Name wieder im Klartext. Mit "Maskieren" ist er wieder ersetzt.
- [ ] Wieder freigeben, dann Strg+Z drücken (der Cursor steht nicht in einem Eingabefeld): Die Freigabe ist zurückgenommen. Strg+Y (oder Strg+Umschalt+Z) stellt sie wieder her. Die Pfeilknöpfe "Rückgängig" und "Wiederholen" machen dasselbe.
- [ ] "Nur Zweifelsfälle" und das Suchfeld verkleinern die Liste; Esc schließt die Leiste.

## 7. Bericht

- [ ] Nach "Zurücksetzen" ein einzelnes Dokument anonymisieren, dann "Bericht speichern" klicken: Die Datei `bericht.txt` wird gespeichert. Sie nennt Version, Zeitpunkt, Profil, KI-Modus, je Kategorie die Zahl der Funde, die Gegenprüfung und eine Prüfsumme. Sie enthält keine Namen, Nummern oder Texte aus den Dokumenten (mit Suche im Editor nach "Musterfrau" und der IBAN prüfen).
- [ ] Die im Bericht genannte Programmversion entspricht der Anzeige links unten.

## 8. Kommandozeile (start /wait, Passwort per Umgebungsvariable)

Eingabeaufforderung (cmd) öffnen. Den Pfad zur `PrivacyShield.exe` an Ihre Installation anpassen (Beispiel: `C:\Program Files\PrivacyShield\PrivacyShield.exe`). Alle Dokumente in `C:\PS-Test\eingang`.

- [ ] Lauf ohne Zuordnung:
  `start /wait "" "C:\Program Files\PrivacyShield\PrivacyShield.exe" --cli --in "C:\PS-Test\eingang" --out "C:\PS-Test\aus1" --report --log "C:\PS-Test\aus1.log"`
  danach `echo Code: %ERRORLEVEL%` zeigt `Code: 0`. Es öffnet sich kein Fenster. In `aus1` liegen `anonymisiert_001.txt` bis `anonymisiert_003.txt`, `bericht.txt` und `bericht.json`. Die Datei `aus1.log` enthält Zeilen wie "Datei 1 von 3 verarbeitet" und eine Zusammenfassung ("3 Dateien, ..."), aber keine Dateinamen und keine Inhalte.
- [ ] Lauf mit verschlüsselter Zuordnung (Passwort nur per Umgebungsvariable, **nicht** mit `--password-stdin`, das unter Windows nicht funktioniert):
  `set PS_PW=Winter-Test-2026`
  `start /wait "" "C:\Program Files\PrivacyShield\PrivacyShield.exe" --cli --in "C:\PS-Test\eingang" --out "C:\PS-Test\aus2" --map "C:\PS-Test\aus2\zuordnung.psmap" --password-env PS_PW --log "C:\PS-Test\aus2.log"`
  `echo Code: %ERRORLEVEL%` zeigt `Code: 0`; danach `set PS_PW=`. Die Datei `zuordnung.psmap` existiert.
- [ ] Die in Punkt 8 erzeugte `zuordnung.psmap` lässt sich in der Oberfläche mit demselben Passwort laden (wie in Punkt 5).
- [ ] Ein Tippfehler in einem Schalter wird abgelehnt: `start /wait "" "C:\Program Files\PrivacyShield\PrivacyShield.exe" --cli --in "C:\PS-Test\eingang" --out "C:\PS-Test\aus3" --profil strict` und `echo Code: %ERRORLEVEL%` zeigt `Code: 2`.
- [ ] Während eines Laufs (Beispiel Lauf 1) bleibt eine gleichzeitig geöffnete PrivacyShield-Oberfläche unberührt.
- [ ] Mit eingeschaltetem Flugmodus (wie in Punkt 2) laufen die Läufe ebenfalls ohne Fehler.

## 9. Öffnen mit

- [ ] Eine Textdatei mit der rechten Maustaste wählen, "Öffnen mit", "Andere App auswählen", die `PrivacyShield.exe` suchen und wählen: Die Datei erscheint in PrivacyShield. (PrivacyShield richtet keine Standardzuordnung ein; wählen Sie deshalb nicht "Immer".)
- [ ] Läuft PrivacyShield bereits, übernimmt es eine zweite Datei per "Öffnen mit" in das bestehende Fenster (kein zweites Fenster).

## 10. Update von 1.8.0 auf 2.0.0

Dieser Punkt lässt sich erst prüfen, wenn 2.0.0 als Release verfügbar ist. Er braucht eine Internetverbindung.

- [ ] Flugmodus ausschalten. 2.0.0 deinstallieren, falls installiert (Windows-Einstellungen, Apps). Die Version 1.8.0 installieren und starten; links unten steht `v1.8.0`.
- [ ] Nach kurzer Zeit erscheint der Hinweis "Neue Version 2.0.0 verfügbar" (alternativ über den Knopf "Updates" oder "Info", "Auf Updates prüfen").
- [ ] "Jetzt aktualisieren" klicken. Der Download zeigt einen Fortschritt ("Download... n%"), danach "Installation läuft, App wird neu gestartet...".
- [ ] Die App startet in der neuen Version; links unten steht `v2.0.0`; der Info-Dialog nennt Version 2.0.0.
- [ ] Gespeicherte Einstellungen aus 1.8.0 sind noch da (zum Beispiel der Schalter "KI-Erkennung verwenden", wenn Sie ihn in 1.8.0 umgestellt hatten).
- [ ] Eine ältere CSV-Zuordnung (aus 1.8.0 exportiert) lässt sich in 2.0.0 weiterhin laden ("Zuordnung laden", Meldung "n Einträge importiert (unverschlüsselte CSV)").

## 11. Info-Dialog und Diagnose

- [ ] "Info" klicken: Der Dialog zeigt Version, Electron, Chromium, Node, Betriebssystem, KI-Modell (Name, Größe, Installation "vollständig") und die Links Impressum und Datenschutz. "Lizenzen" aufklappen zeigt Lizenztexte. Esc schließt, der Fokus kehrt auf "Info" zurück.
- [ ] "Diagnose kopieren" klicken, im Editor einfügen: Der Text enthält die Version und die Zeile "Installation:", aber keine Dokumentinhalte und keine Dateinamen.

## 12. Abschluss

- [ ] Optional: Deinstallation über Windows-Einstellungen, Apps. Programmordner und Verknüpfungen sind danach entfernt (laut Installer-Einstellung werden auch die Programmdaten gelöscht).
- [ ] Gesamturteil: Alle Punkte bestanden / Abweichungen (bitte unten auflisten).

| Punkt | Beobachtung |
|---|---|
| | |
