# Erkennungsentscheidungen und Backlog

Backlog der Erkennungsluecken der zweiten Fallmenge (`tests/eval/cases-v2.mjs`, 170 Faelle, und `generateDocs2(98)`), gemessen in Paket C1.0
mit `npm run eval -- --set v2`. Maßstab: Leck (ein Wert steht nach dem Anonymisieren noch im Text) und Fehlalarm (Text ohne Personenbezug
wird maskiert, Kategorie NEG). Die Ausgangsstaende stehen als Ratsche in `tests/eval/baseline-v2.json`.

Je Eintrag: Fall-Id, Gruppe, Modus. Die Entscheidung (Regel, Woerterbuch, Modell, bewusst offen) folgt in C1.1 bis C1.3 als
ein Absatz je Fall-Id im Abschnitt "Entscheidungen" unten. Die Erkennung (app/lib/detect.js) wurde in C1.0 nicht veraendert.

Modi: wortlisten (nur Regeln), fallback (Regeln plus Wortlisten, Modell startet nicht), ki (mit Modell).

## Messung C1.0 (Ausgangsstand)

| Modus | Luecken Handfaelle | Fehlalarme (NEG von 60) | Synthetik undicht |
|---|---|---|---|
| wortlisten | 36 von 110 | 21 | 68 von 860 |
| fallback | 36 von 110 | 23 | 46 von 860 |
| ki | 24 von 110 | 25 | 24 von 860 |

## Offene Luecken je Modus

### Modus wortlisten

* Fehlalarme (NEG): v2n01 v2n02 v2n13 v2n15 v2n20 v2n21 v2n23 v2n25 v2n26 v2n29 v2n30 v2n32 v2n34 v2n35 v2n37 v2n48 v2n50 v2n51 v2n52 v2n53 v2n56
* V2-ART9: v2a66 v2a67
* V2-AUSLAND: v2a92 v2a94 v2a95 v2a96 v2a97 v2a99
* V2-FORM: v2a81 v2a83 v2a84 v2a85 v2a86 v2a87
* V2-GERAET: v2a30
* V2-IDENT: v2a03 v2a06 v2a07 v2a08
* V2-KONTAKT: v2a12 v2a15 v2a19 v2a20
* V2-NUMMER: v2a45 v2a47
* V2-PERSON: v2a51 v2a54 v2a57
* V2-SECRET: v2a101 v2a103 v2a104 v2a105 v2a109 v2a110
* V2-STANDORT: v2a35 v2a39
* Synthetik je Typ (undicht/gesamt): NAME 63/191, TAXID 5/14

### Modus fallback

* Fehlalarme (NEG): v2n01 v2n02 v2n13 v2n15 v2n20 v2n21 v2n23 v2n25 v2n26 v2n29 v2n30 v2n32 v2n34 v2n35 v2n37 v2n43 v2n44 v2n48 v2n50 v2n51 v2n52 v2n53 v2n56
* V2-ART9: v2a66 v2a67
* V2-AUSLAND: v2a92 v2a94 v2a95 v2a96 v2a97 v2a99
* V2-FORM: v2a81 v2a83 v2a84 v2a85 v2a86 v2a87
* V2-GERAET: v2a30
* V2-IDENT: v2a03 v2a06 v2a07 v2a08
* V2-KONTAKT: v2a12 v2a15 v2a19 v2a20
* V2-NUMMER: v2a45 v2a47
* V2-PERSON: v2a51 v2a54 v2a57
* V2-SECRET: v2a101 v2a103 v2a104 v2a105 v2a109 v2a110
* V2-STANDORT: v2a35 v2a39
* Synthetik je Typ (undicht/gesamt): NAME 41/191, TAXID 5/14

### Modus ki

* Fehlalarme (NEG): v2n01 v2n02 v2n06 v2n13 v2n15 v2n20 v2n21 v2n23 v2n25 v2n26 v2n29 v2n30 v2n32 v2n34 v2n35 v2n37 v2n43 v2n44 v2n48 v2n50 v2n51 v2n52 v2n53 v2n55 v2n56
* V2-ART9: v2a67
* V2-AUSLAND: v2a92 v2a94 v2a99
* V2-FORM: v2a83 v2a84 v2a85 v2a86
* V2-GERAET: v2a30
* V2-IDENT: v2a08
* V2-KONTAKT: v2a12 v2a15 v2a19 v2a20
* V2-NUMMER: v2a45 v2a47
* V2-SECRET: v2a101 v2a103 v2a104 v2a105 v2a109 v2a110
* V2-STANDORT: v2a35 v2a39
* Synthetik je Typ (undicht/gesamt): NAME 19/191, TAXID 5/14

## Entscheidungen

(noch keine; je Fall-Id ein Absatz: Fall-Id, Entscheidung, Grund)

---

## Erkennung: Entscheidungen und erklaerte Abweichungen

Je Eintrag: Paket, Aenderung, Wirkung auf die Ausgabe. Der Differenztest (`node tests/eval/diff-reference.mjs --node`) meldet fuer alle Eintraege dieser Datei 0 Abweichungen auf dem Korpus (212 Faelle, Stress-Dokumente); `tests/golden/reference-allow.json` blieb leer.

## F5: Kern-Leistung bei pathologischen Eingaben

Ausgangslage (gemessen): Eingaben wie 20.000 gleiche Woerter, lange Leerraumfolgen oder viele Leerzeilen rechneten Sekunden bis Minuten (quadratisch bis kubisch). Normale Dokumente waren nicht betroffen. Ziel: unter 2 s je Eingabe, Ausgabe auf dem Korpus unveraendert.

Aenderungen in `app/lib/detect.js`:

1. **Regeln der Gruppen `email` (zwei Muster) und `addr` (Hausnummer-Zeilen mit Postleitzahl, Strassenname):** unverankerter Anfangsquantor durch ein Lookbehind am Tokenanfang verankert (`(?<![zeichenklasse])`, bei `addr` mit Obergrenze `{0,100}`). Wirkung: ein Treffer beginnt nur noch am Anfang einer Zeichenfolge, nicht mehr mitten darin. Auf dem Korpus unveraendert; bei ueber 100 Zeichen langen Woertern ohne Trenner kann ein Treffer weiterhin am Wortanfang beginnen (gleiches Ergebnis wie zuvor).
2. **Lookbehinds mit `\s*` oder `[ \t]*` (Stichwort vor Wert):** Obergrenze `{0,1000}` (bei `geboren` `{1,1000}`), davor ein Lookahead auf das erste Zeichen des Werts (bei `ip` und der Postleitzahl nach Komma ein Lookahead auf die Ziffer), damit der Lookbehind nur an moeglichen Wertanfaengen geprueft wird. Betroffen: `device`, `account` (Benutzername, Passwort), `kennnr` (PESEL, NIE/DNI u. a.), `bic`, `taxid` (Kunden-/Vertragsnummer u. a.), `addr` (Geburtsort u. a., Postleitzahl nach Komma), `vehicle`, `name` (Vorname/Nachname, geboren), `ip` (Versionspraefix). Begruendung der Grenze: Spaltenabstaende aus PDF-Text, Formularen und Tabellenexporten (Leerzeichen oder Tabulatoren) sind realistisch; ein Wert hinter 41 oder 120 Leerzeichen muss wie hinter einem Leerzeichen ersetzt werden, sonst entsteht ein Leck (eine erste Fassung mit `{0,40}` liess ihn stehen). Der Aufwand bleibt linear, weil der Lookbehind nur an Wertanfaengen laeuft und dort hoechstens den eigenen Leerraum davor durchsucht. **Restrisiko:** Mehr als 1.000 Leerraumzeichen zwischen Stichwort und Wert werden nicht mehr als zusammengehoerig gelesen; der Wert bleibt dann im Klartext, sofern ihn keine andere Regel erfasst.
3. **`postProcessSpans`, Namen verlaengern:** Das Anhaengen weiterer grossgeschriebener Woerter, von Namenszusaetzen ("von", "van", ...) und Bindestrich-Teilen sowie das Voranstellen von Bindestrich-Teilen bricht ab, wenn die Namensspanne dadurch laenger als `MAX_NAME_SPAN` (120 Zeichen) wuerde. Der Rest der Kette wird dabei als eigener Treffer weitergefuehrt (je Anfangsposition hoechstens einmal; ein vorwaerts weitergefuehrter Treffer wird nicht rueckwaerts verlaengert, ein rueckwaerts weitergefuehrter nicht vorwaerts), damit kein Teil der Kette im Klartext stehen bleibt. Zuvor wuchs in einer Endlosfolge grossgeschriebener Woerter ("Wort Wort Wort ...") jeder Treffer bis zum Textende (quadratischer Aufwand). **Bewusste Abweichung:** Eine Namenskette ueber 120 Zeichen ergibt mehrere Platzhalter statt einem (die Rueckuebersetzung bleibt exakt). Die Grenze wurde von 200 auf 120 Zeichen gesenkt, weil der Aufwand mit der Grenze waechst (gemessen: 20.000 Woerter etwa ein Drittel weniger Rechenzeit); ein einzelner Name ist in der Praxis weit kuerzer. Auf dem Korpus ist keine Spanne betroffen. **Restrisiken:** (a) Ein Treffer, der mitten in einer Kette beginnt und ueber die Grenze rueckwaerts wuerde, wird nur ueber die Rueckwaerts-Weiterfuehrung abgedeckt; (b) die Aufteilung kann Zusammenhaenge zerschneiden, die ein Pruefer als einen Namen lesen wuerde, die Schwaerzung bleibt aber lueckenlos. **Korrektur (Fix F5, Leck):** Die gekappten Stuecke einer Kette ueberlappen sich, und `resolveSpanOverlaps` behielt nur das laengste; der Kettenanfang blieb im Klartext (Beispiel: 'Petra Klein' am Anfang einer 10-Namen-Kette). Gekappte Namenstreffer (Merker `kette`) werden jetzt beim Zusammenfuehren zur Vereinigung ihrer Spannen vereinigt; Ergebnis wie v2/main (alle Namen ersetzt, bei Bindestrich-Ketten allerdings mehrere Platzhalter), Laufzeit unveraendert linear. **Zweite Korrektur (verklebte E-Mails und Adressen):** Die Lookbehind-Verankerungen am Tokenanfang (beide E-Mail-Muster, beide Strasse/Hausnummer/PLZ-Muster) lassen einen Treffer, der unmittelbar hinter dem vorigen im selben Zeichenlauf beginnt, nicht zu (`max@example.com-max@example.com`, `a@x.de.b@y.de`, `Hauptstraße 5, 10115 Berlin-Hauptstraße 5, 10115 Berlin`). Behebung: `matchesOf` sucht bei diesen vier Mustern nach jedem Treffer im Restteil des Textes (`slice`, O(1)); der Lookbehind sieht die verbrauchten Zeichen nicht, die Verankerung bleibt also fuer die Laufzeit erhalten, ein Treffer darf aber direkt hinter dem vorigen beginnen. Ergebnis gleich v2/main (Zufallsvergleich, 6.000 Texte mit verklebten Werten: 0 Abweichungen). Ausserdem wird `kette` auch gesetzt, wenn die Fortsetzung schon existiert (sonst blieb der Anfang einer 121 Zeichen langen Bindestrich-Kette im Klartext). **Dritte Korrektur (Umlaute):** Die Verankerung der Strassen-Regel mit Hausnummer und PLZ kannte in der Klasse hinter dem ersten Grossbuchstaben kein Ä/Ö/Ü, das Muster selbst auch nicht; bei 'MÜLLER' beginnt der Treffer in v2/main deshalb am Ü, mit der Verankerung aber erst am naechsten Token (Namen und Orte blieben im Klartext). Die Verankerung gilt jetzt nur noch, wenn das Zeichen am Trefferbeginn selbst zur Klasse des Musters gehoert (`(?:(?![Klasse])|(?<!Anfang Klasse{0,100}))`); damit ist sie fuer jedes Zeichen (auch é, ñ, Ł, Ž, die den Lauf unterbrechen) ausgabegleich zu v2/main. Die anderen verankerten Muster (E-Mail: Zeichenklasse des Anfangs gleich Klasse im Lookbehind; Strasse mit Endung: Klasse mit Flag i deckt alle Buchstaben) und die Lookahead-Vorpruefungen vor den Stichwort-Lookbehinds (Anfangsklasse gleich Klasse des Wertes, geprueft) hatten diese Luecke nicht. Zufallsvergleich: 6.000 Texte mit Grossbuchstaben-Umlauten, Akzent-Namen und Adressen, 0 Abweichungen (die Fassung davor: rund 40 je 100 Texte). Nebenbei werden die Treffer je Position der Folgewoerter und das Ergebnis der Namenspruefung je Wort zwischengespeichert (reine Leistungsaenderung, gleiches Ergebnis).
4. **`resolveSpanOverlaps`:** Die Suche nach einem Treffer, der einen Namens-/Organisations-/Ortstreffer aufnimmt, durchlaeuft nur noch Treffer mit niedrigerer `prio` als dem Maximum (Indexliste statt aller Treffer, entfernte Treffer werden markiert statt aus dem Feld geloescht). Reihenfolge und Ergebnis sind identisch zur bisherigen Schleife (reine Leistungsaenderung; gilt auch fuer nicht numerische `prio`, dann werden alle Treffer durchlaufen).
5. **`isHeadingSpan`:** Zeilengrenzen, getrimmte Zeile und Nummerierungspruefung werden je Zeile einmal berechnet und fuer weitere Treffer derselben Zeile wiederverwendet (vorher je Treffer ueber die ganze Zeile). Reine Leistungsaenderung, gleiches Ergebnis.

Nachweis: `tests/unit/detect.pathological.test.mjs` (alle Eingaben unter 2 s, Rueckweg gleich, wohlgeformt) und `node tests/eval/diff-reference.mjs --node` (0 Abweichungen).

## C1.r: Realdokumente Ende-zu-Ende (Messstand 2026-10-22)

12 Dokumente aus den ersten 6 Vorlagen von `generateDocs2` als TXT, DOCX und PDF mit Textebene (je 97 Werte), 3 Dokumente als Bild-PDF (OCR, 27 Werte). Der Test `tests/realdocs.test.mjs` ist eine Ratsche auf diesen Stand; die Ziele von C1.3 stehen als `todo`-Tests daneben. Angegeben sind nur Dokumentnummer und Typ, nie Werte.

| Format | mit Modell | Modus fallback | Lecks mit Modell (Dokument:Typ) |
|---|---|---|---|
| TXT | 3 von 97 (3,1 %) | 8 | 2:NAME, 19:NAME, 19:NAME |
| DOCX | 3 von 97 (3,1 %) | 8 | 2:NAME, 19:NAME, 19:NAME |
| PDF mit Textebene | 4 von 97 (4,1 %) | 9 | 2:NAME, 15:IBAN, 19:NAME, 19:NAME |
| PDF als Bild (OCR) | 5 von 27 (18,5 %) | 6 | 18:TEL (3 Mal), 4:TEL, 5:NAME |

Ziel (C1.3): hoechstens 2 % (OCR 6 %). Die Format-Unterschiede (IBAN im PDF, Telefonnummern bei OCR) gehen als Funde in die Schleife C1.1 bis C1.3.
