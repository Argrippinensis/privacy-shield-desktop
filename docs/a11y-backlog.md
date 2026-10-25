# Barrierefreiheit: Backlog (Stand D2.2)

Stand: axe-core 4.14.0, Tags wcag2a, wcag2aa, wcag21a, wcag21aa. In allen neun Ansichten und beiden Frames (Werkzeug, Hülle) gibt es
0 Verstöße mit Impact serious oder critical (`tests/a11y.test.mjs`). Hier stehen nur die nicht blockierenden Restbefunde.

## Messbare Restbefunde

| Regel | Impact | Ansicht | Frame | Zahl |
|---|---|---|---|---|
| aria-allowed-role (best-practice) | minor | Mit Ergebnis | Werkzeug | 1 Knoten |
| aria-allowed-role (best-practice) | minor | Gegenprüfungsliste | Werkzeug | 1 Knoten |
| aria-allowed-role (best-practice) | minor | Prüfansicht | Werkzeug | 1 Knoten |
| aria-allowed-role (best-practice) | minor | Passwortdialog | Werkzeug | 1 Knoten |

Alle anderen Ansichten (Willkommen, Arbeitsbereich leer, Info-Dialog, Projektliste, Eigene Regeln) und der Frame Hülle: keine moderate/minor-Befunde,
auch nicht im best-practice-Lauf. Ursache von aria-allowed-role: `#LCBAND` trägt `role="status"` auf einem Knopf (siehe unten).

## Bekannte Mängel ohne axe-Treffer (V2-ENTSCHEIDUNGEN D57, Prüfung D2.1)

1. `#LCBAND`: `role="status"` liegt auf einem `button`. Sauberer: Status-Container mit eigenem Knopf darin.
2. Toast wechselt `role` und `aria-live` je nach Art. Besser: zwei feste Regionen (status/polite und alert/assertive), nur der Text wechselt.
3. `role="progressbar"` mit zusätzlichem `aria-live`: Ansage getrennt von der Anzeige lösen (eigene Status-Region).
4. Drop-Zone: sichtbarer Text "Datei ablegen oder klicken", zugänglicher Name "Dateien auswählen" (WCAG 2.5.3 Label in Name). Namen angleichen.
5. Annotieren-Modus ist nur per Maus bedienbar. Tastaturkonzept nötig (Auswahl per Tastatur, Typ wählen, Bestätigen).
6. Update-Dialoge und Anleitung haben keinen `inert`-Hintergrund (Fokus und Screenreader erreichen den Hintergrund).
7. Info-Dialog: Abschnittstitel in Großbuchstaben (CSS `text-transform`); Screenreader lesen sie teils buchstabierend. Besser: Schreibweise im Text, Optik per CSS nur bei Bedarf.

## Kontraste alt und neu (Text, Soll 4,5:1)

Muted-Text zentral über `--ps-muted` (`#666`); Statusfarben für Text dunkler, Punkte, Rahmen, Balken und Tönungen behalten ihre Farbe.
Die Markierungen (Pills) berechnen die Textfarbe aus der Signalfarbe (`inkFor`, gleiche Farbfamilie, mindestens 4,6:1 auf der Tönung), dadurch
gilt dasselbe auch für eigene Regelfarben.

| Vordergrund | Hintergrund | Verhältnis alt | Vordergrund neu | Verhältnis neu |
|---|---|---|---|---|
| #ccc | #fafafa | 1,53 | #666 | 5,50 |
| #ccc | #fff | 1,60 | #666 | 5,74 |
| #bbb | #fff | 1,91 | #666 | 5,74 |
| #aaa | #fff | 2,32 | #666 | 5,74 |
| #999 | #e8f0fe | 2,48 | #666 | 5,01 |
| #999 | #fafafa / #f8fafc | 2,72 | #666 | 5,50 |
| #999 | #fff | 2,84 | #666 | 5,74 |
| #888 | #fff | 3,54 | #666 | 5,74 |
| #84cc16 (Kennnr.) | #f3fae9 | 1,84 | #4f7a0d | 4,77 |
| #f59e0b (Name) | #fef6e8 | 2,00 | #986207 | 4,79 |
| #06b6d4 (E-Mail) | #e8f8fb | 2,22 | #04788c | 4,73 |
| #14b8a6 (Betrag) | #e9f8f7 | 2,27 | #0d796e | 4,84 |
| #10b981 (IBAN) | #e9f8f3 | 2,31 | #0b7e58 | 4,63 |
| #10b981 (Schritt erledigt) | #fff | 2,53 | #047857 | 5,48 |
| #0ea5e9 (BIC) | #e8f7fd | 2,52 | #0a73a3 | 4,80 |
| #f97316 (Tel.) | #fef2e9 | 2,54 | #ae500f | 4,83 |
| #ff3b30 (Gefahr) | #fff0ee | 3,20 | #b91c1c | 5,84 |
| #ec4899 (Datum) | #fdeef5 | 3,14 | #bd3a7a | 4,62 |
| #3b82f6 (Adresse, Ort) | #edf3fe | 3,30 | #306bca | 4,62 |
| #059669 (Hinweis "lokal") | #ecfdf5 | 3,57 | #047857 | 5,21 |
| #8b5cf6 (Org.) | #f4f0fe | 3,77 | #7a51d8 | 4,69 |

Folgeänderung: Links im Fließtext der Fußzeile (Impressum, Datenschutz) sind nun unterstrichen, weil Navy auf dem dunkleren Grau allein
nicht mehr als Link erkennbar war (axe link-in-text-block).

## Bewegung und Zoom

- `prefers-reduced-motion: reduce`: globale Regel in `privacy-shield.html` und `index.html` (Dauer 0,01 ms, eine Wiederholung); Fortschrittsbalken springen statt zu gleiten.
- Zoom 200 % bei 1280 x 800: kein horizontales Scrollen (unverändert grün).
