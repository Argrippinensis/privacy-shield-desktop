# Vorlagen für Ausführende (Unteragenten oder neue Sitzungen)

Jede Vorlage ist in sich geschlossen. Platzhalter in `<spitzen Klammern>` ersetzen. Die planende Instanz prüft das Ergebnis immer selbst
(Diff lesen, Prüfbefehle erneut ausführen), siehe `00-INDEX.md`, Abschnitt 7.

## Grundvorlage (für jedes Arbeitspaket)

```
Du führst ein einzelnes Arbeitspaket aus einem fertigen Plan aus. Der Plan liegt im Repository
~/projects/privacy-shield-desktop auf dem Zweig plan/naechste-schritte unter
docs/superpowers/plans/2026-10-20-naechste-schritte/.

1. Lies 00-INDEX.md vollständig, danach <NN-datei.md> vollständig. Lies sonst nichts vom Plan.
2. Arbeite die Schritte des Pakets der Reihe nach ab. Führe die genannten Befehle wörtlich aus und lies die echte Ausgabe.
   Hake Abnahmekriterien nur ab, wenn du den Prüfbefehl selbst ausgeführt hast. Melde nichts als erledigt, was du nicht ausgeführt hast.
3. Hausregeln (gelten immer): keine Emojis (nirgends, auch nicht in Commit-Texten und Kommentaren); niemals "git add -A" oder "git add .",
   Dateien einzeln benennen und vorher "git status" lesen; Commit-Texte deutsch und sachlich, letzte Zeile
   "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"; bei arcangeli-website nur in src/ ändern und nur mit ./deploy.sh veröffentlichen.
4. Du darfst NICHT veröffentlichen (kein Merge, kein Tag, kein Release, kein Deploy, kein Push auf main), solange der Nutzer das nicht
   im Chat für genau diese Veröffentlichung bestätigt hat. Das Gate steht im Paket. Stelle dann genau eine Frage mit Empfehlung.
5. Ändere keine Einstellungsdateien (~/.claude/*, settings.json), lege keine Konten an, trage keine Zugangsdaten ein.
6. Stopp-Regeln, dann anhalten und berichten (nicht improvisieren): (a) ein Test oder Befehl schlägt nach zwei Reparaturversuchen weiter fehl;
   (b) ein Patch lässt sich nicht sauber einspielen (git am --abort); (c) eine Aktion würde etwas veröffentlichen, löschen oder Rechte ändern;
   (d) eine Entscheidung ist nötig, die nicht im Plan mit Voreinstellung steht; (e) der Auto-Modus verweigert eine Aktion: nicht umgehen, melden.
7. Beende ohne Rückfragen, sobald das Paket abgeschlossen oder durch eine Stopp-Regel unterbrochen ist. Dein Abschlussbericht enthält:
   was du getan hast, die echte Ausgabe der Prüfbefehle (letzte Zeilen), geänderte Dateien, offene Punkte, ggf. die Frage für das Gate.
   Keine Beschönigung: Schlägt etwas fehl, steht das mit der Fehlermeldung im Bericht.
```

## Zusätze je Paket

**WP 01 (Haiku oder Sonnet niedrig):** "Arbeitsverzeichnis ~/projects/privacy-shield-desktop. Nur die Schritte 2 bis 4 des Pakets. Schritt 1 (Nachricht an den Nutzer) formulierst du als Entwurf im Bericht."

**WP 02 (Sonnet niedrig bis mittel):** "Führe die Schritte 1 bis 4 aus. Bei Schritt 5 (Gate G1) stellst du die Frage im Bericht und hörst auf. Nach schriftlicher Bestätigung wird dir die Fortsetzung (Schritte 6 bis 8) in einer neuen Nachricht erteilt."

**WP 03 (Haiku):** "Repository ~/projects/arcangeli-website. Schritte 1 bis 5. Nicht deployen. Prüfe selbst, dass ./deploy.sh den Link-Test enthält. Wenn der Patch-Lauf 'FEHLER' meldet, abbrechen (Stopp-Regel b)."

**WP 04 (Sonnet niedrig):** "Repository ~/projects/arcangeli-website. Schritte 1 bis 6 und 8 (nur Commits). Schritt 7 ist für den Nutzer. Keine neuen Farben oder Designänderungen, nur die genannten. Bei Emoji-Ersatz: jede Fundstelle im Bericht auflisten (Datei, Zeile, vorher/nachher)."

**WP 05 (Sonnet mittel):** "Führe genau einen Durchlauf der Schleife aus (Schritte 1 bis 7 des Pakets). Je Fund eine begründete Entscheidung (Regel, Wörterbuch, Modell, bewusst offen). Keine Abschwächung bestehender Fälle, keine Änderung der Ratsche ohne Verbesserung. Der Bericht enthält die Tabelle vorher/nachher und die Liste der offenen Funde mit Begründung. Lies den Diff der Golden-Datei und erkläre jede Änderung."

**WP 06 (Sonnet niedrig bis mittel):** "Repository ~/projects/arcangeli-website. Schritte 1 bis 7. Gate G3 im Bericht als Frage. Änderungen am Web-Tool nur wie im Paket beschrieben; keine neuen Funktionen, kein Design."

**WP 07 (Sonnet niedrig):** "Repository ~/projects/privacy-shield-desktop. Schritte 1 bis 7. Jede Härtungsmaßnahme zuerst als roter Test, dann grün. Bei Fuse-Problemen immer nur einen Schalter zurücknehmen und dokumentieren."

**WP 08 (Sonnet mittel):** "Aktualisiere genau die Bibliothek <Name> (eine je Durchlauf). Messung vorher und nachher mit den im Paket genannten Befehlen. Bei Verschlechterung zurücksetzen und begründen, nicht erzwingen."

**WP 09 Teil A (Sonnet niedrig):** "Nur Teil A. Texte wörtlich aus dem Paket, in den Stil der Seite einfügen. Kein Anlegen von Konten, kein Kauf, keine Geheimnisse."

## Prüfliste der planenden Instanz nach jedem Ergebnis

1. `git log --oneline` und `git diff --stat` gegen den erwarteten Umfang.
2. Prüfbefehle des Pakets selbst ausführen (nicht den Bericht abschreiben).
3. Keine unerwarteten Dateien (`git status`), keine Geheimnisse, keine Emojis (`grep -nP '[\x{1F300}-\x{1FAFF}\x{2600}-\x{27BF}]'` auf geänderte Dateien).
4. Erkennungsänderungen: Harness vorher/nachher, Fehlalarme 0, Golden-Diff gelesen.
5. Erst danach Status in `00-INDEX.md` ändern und das nächste Paket starten.
