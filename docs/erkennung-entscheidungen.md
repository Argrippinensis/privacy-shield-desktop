# Erkennung: Entscheidungen und erklaerte Abweichungen

Je Eintrag: Paket, Aenderung, Wirkung auf die Ausgabe. Der Differenztest (`node tests/eval/diff-reference.mjs --node`) meldet fuer alle Eintraege dieser Datei 0 Abweichungen auf dem Korpus (212 Faelle, Stress-Dokumente); `tests/golden/reference-allow.json` blieb leer.

## F5: Kern-Leistung bei pathologischen Eingaben

Ausgangslage (gemessen): Eingaben wie 20.000 gleiche Woerter, lange Leerraumfolgen oder viele Leerzeilen rechneten Sekunden bis Minuten (quadratisch bis kubisch). Normale Dokumente waren nicht betroffen. Ziel: unter 2 s je Eingabe, Ausgabe auf dem Korpus unveraendert.

Aenderungen in `app/lib/detect.js`:

1. **Regeln der Gruppen `email` (zwei Muster) und `addr` (Hausnummer-Zeilen mit Postleitzahl, Strassenname):** unverankerter Anfangsquantor durch ein Lookbehind am Tokenanfang verankert (`(?<![zeichenklasse])`, bei `addr` mit Obergrenze `{0,100}`). Wirkung: ein Treffer beginnt nur noch am Anfang einer Zeichenfolge, nicht mehr mitten darin. Auf dem Korpus unveraendert; bei ueber 100 Zeichen langen Woertern ohne Trenner kann ein Treffer weiterhin am Wortanfang beginnen (gleiches Ergebnis wie zuvor).
2. **Lookbehinds mit `\s*` oder `[ \t]*` (Stichwort vor Wert):** Obergrenze `{0,40}` (bei `geboren` `{1,40}`), davor ein Lookahead auf das erste Zeichen des Werts, damit der Lookbehind nur an passenden Stellen geprueft wird. Betroffen: `device`, `account` (Benutzername, Passwort), `kennnr` (PESEL, NIE/DNI u. a.), `bic`, `taxid` (Kunden-/Vertragsnummer u. a.), `addr` (Geburtsort u. a., Postleitzahl nach Komma), `vehicle`, `name` (Vorname/Nachname, geboren), `ip` (Versionspraefix). **Bewusste Abweichung auf pathologischen Eingaben:** Steht zwischen Stichwort und Wert mehr als 40 Leerraumzeichen, werden beide nicht mehr als zusammengehoerig gelesen. Das ist in normalen Texten nicht zu erwarten und wurde auf dem Korpus nicht beobachtet.
3. **`postProcessSpans`, Namen verlaengern:** Das Anhaengen weiterer grossgeschriebener Woerter, von Namenszusaetzen ("von", "van", ...) und Bindestrich-Teilen sowie das Voranstellen von Bindestrich-Teilen bricht ab, wenn die Namensspanne dadurch laenger als `MAX_NAME_SPAN` (200 Zeichen) wuerde. **Bewusste Abweichung auf pathologischen Eingaben:** In einer Endlosfolge grossgeschriebener Woerter ("Wort Wort Wort ...") wuchs jeder Treffer bis zum Textende (quadratischer Aufwand). Ein echter Name ist nie laenger als 200 Zeichen; auf dem Korpus ist keine Spanne betroffen.
4. **`resolveSpanOverlaps`:** Die Suche nach einem Treffer, der einen Namens-/Organisations-/Ortstreffer aufnimmt, durchlaeuft nur noch Treffer mit niedrigerer `prio` als dem Maximum (Indexliste statt aller Treffer, entfernte Treffer werden markiert statt aus dem Feld geloescht). Reihenfolge und Ergebnis sind identisch zur bisherigen Schleife (reine Leistungsaenderung; gilt auch fuer nicht numerische `prio`, dann werden alle Treffer durchlaufen).
5. **`isHeadingSpan`:** Zeilengrenzen, getrimmte Zeile und Nummerierungspruefung werden je Zeile einmal berechnet und fuer weitere Treffer derselben Zeile wiederverwendet (vorher je Treffer ueber die ganze Zeile). Reine Leistungsaenderung, gleiches Ergebnis.

Nachweis: `tests/unit/detect.pathological.test.mjs` (alle Eingaben unter 2 s, Rueckweg gleich, wohlgeformt) und `node tests/eval/diff-reference.mjs --node` (0 Abweichungen).
