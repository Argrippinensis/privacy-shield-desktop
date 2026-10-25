# Erkennungsentscheidungen und Backlog

Backlog der Erkennungsluecken der zweiten Fallmenge (`tests/eval/cases-v2.mjs`, 175 Faelle, und `generateDocs2(98)`), gemessen in Paket C1.0
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

## Offene Luecken (je Modus, je Fall-Id, synthetisch je Dokument und Wert)

<!-- BACKLOG-START -->
Stand der Messung: C1.3 Endstand Durchlauf 3 (Fehlalarme jetzt von 74 Negativfaellen der zweiten Menge)

| Modus | Luecken Handfaelle (von 158) | Fehlalarme (NEG von 74) | Synthetik undicht (von 860) |
|---|---|---|---|
| wortlisten | 20 | 6 | 61 |
| fallback | 0 | 8 | 0 |
| ki | 0 | 9 | 0 |

### Modus wortlisten

* Fehlalarme (NEG): v2n02 v2n21 v2n23 v2n32 v2n48 v2n51
* V2-ART9: v2a66
* V2-FORM: v2a87
* V2-IDENT: v2a03 v2a06 v2a116 v2a117 v2a118 v2a119 v2a120 v2a126
* V2-PERSON: v2a51 v2a54 v2a57
* V2-STANDORT: v2a111 v2a113 v2a114 v2a115 v2a136 v2a137 v2a138
* Synthetik je Typ (undicht/gesamt): NAME 61/191
* Synthetische Lecks einzeln (Vorlage, Dokument-Nr, Typ, noch lesbares Fragment; nur Diagnosemodus, ohne Woerterbuecher):
  * zeugnis #0 NAME: Matthias | Krüger
  * gespraechsprotokoll #2 NAME: Ömer | Braun | Braun
  * csvexport #4 NAME: Ralf | Zimmermann | Zimmermann
  * chatverlauf #5 NAME: Thomas | Krüger
  * chatverlauf #5 NAME: Lena | Kierkegaard
  * rechnung_positionen #7 NAME: Dieter | Bärtschi | Bärtschi
  * schadensmeldung_lang #13 NAME: Lukas | Zimmermann | Zimmermann
  * zeugnis #14 NAME: Anna | Schäfer | Schäfer
  * mietvertrag #15 NAME: Birgit | Farsi | Al-Farsi
  * gespraechsprotokoll #16 NAME: Katharina | Obermaier | Obermaier
  * chatverlauf #19 NAME: Birgit | Lüdenscheidt | Lüdenscheidt
  * chatverlauf #19 NAME: Zoë | Schulz
  * rechnung_positionen #21 NAME: Lena | Yıldız | Yıldız
  * arztbrief_lang #25 NAME: Zoë | Farsi | Al-Farsi
  * zeugnis #28 NAME: Nadine | Farsi | Al-Farsi
  * zeugnis #28 NAME: Katharina | Farsi | Al-Farsi
  * mietvertrag #29 NAME: Anna | Wagner | Wagner
  * gespraechsprotokoll #30 NAME: Çağlar | Richter
  * emailverlauf #31 NAME: Fatima | Bärtschi | Bärtschi
  * csvexport #32 NAME: Karl-Heinz | Kowalski | Kowalski
  * csvexport #32 NAME: Jürgen | Neumann | Neumann
  * csvexport #32 NAME: José | Krüger | Krüger
  * chatverlauf #33 NAME: Søren | Becker
  * chatverlauf #33 NAME: Fatima | Hartmann
  * rechnung_positionen #35 NAME: Çağlar | Schäfer | Schäfer
  * kuendigung_lang #40 NAME: Çağlar | Richter | Richter
  * schadensmeldung_lang #41 NAME: Ömer | Yıldız | Yıldız
  * zeugnis #42 NAME: Lena | Obermaier | Obermaier
  * zeugnis #42 NAME: Karl-Heinz | Obermaier | Obermaier
  * mietvertrag #43 NAME: Çağlar | Schulz | Schulz
  * gespraechsprotokoll #44 NAME: Dieter | Weber
  * csvexport #46 NAME: Birgit | Weber | Schmidt-Weber
  * csvexport #46 NAME: Petra | Lechner | Aigner-Lechner
  * chatverlauf #47 NAME: Petra | Lüdenscheidt | Lüdenscheidt
  * chatverlauf #47 NAME: Petra | Yıldız
  * rechnung_positionen #49 NAME: Anna | Wagner | Wagner
  * schadensmeldung_lang #55 NAME: Matthias | Hoffmann | Hoffmann
  * zeugnis #56 NAME: Sabine | Kowalski | Kowalski
  * mietvertrag #57 NAME: Dieter | Bärtschi | Bärtschi
  * gespraechsprotokoll #58 NAME: Nadine | Lechner | Aigner-Lechner
  * gespraechsprotokoll #58 NAME: Ralf | Bauer | Bauer
  * emailverlauf #59 NAME: Marlene | Wagner | Wagner
  * emailverlauf #59 NAME: Anna | Hoffmann | Hoffmann
  * csvexport #60 NAME: Thomas | Zimmermann | Zimmermann
  * csvexport #60 NAME: Mohammed | Schulz | Schulz
  * chatverlauf #61 NAME: Florian | Becker
  * chatverlauf #61 NAME: Ömer | Schulz
  * schadensmeldung_lang #69 NAME: Katharina | Voigt | Voigt
  * schadensmeldung_lang #69 NAME: Thomas | Lechner | Aigner-Lechner
  * zeugnis #70 NAME: Tobias | Bauer
  * gespraechsprotokoll #72 NAME: Çağlar | Becker | Becker
  * chatverlauf #75 NAME: Dieter | Lechner
  * chatverlauf #75 NAME: Marlene | Müller | Müller
  * arztbrief_lang #81 NAME: Karl-Heinz | Krüger
  * arztbrief_lang #81 NAME: Oliver | Krüger | Krüger
  * zeugnis #84 NAME: Thomas | Dvořák | Dvořák
  * gespraechsprotokoll #86 NAME: Anna | Yilmaz | Yilmaz
  * csvexport #88 NAME: Ralf | Hartmann | Hartmann
  * chatverlauf #89 NAME: Nadine | Farsi
  * chatverlauf #89 NAME: Birgit | Dvořák | Dvořák
  * rechnung_positionen #91 NAME: Zoë | Kowalski | Kowalski

### Modus fallback

* Fehlalarme (NEG): v2n02 v2n13 v2n21 v2n23 v2n29 v2n32 v2n48 v2n51
* Synthetik je Typ (undicht/gesamt): keine
* Synthetische Lecks einzeln (Vorlage, Dokument-Nr, Typ, noch lesbares Fragment):

### Modus ki

* Fehlalarme (NEG): v2n02 v2n13 v2n20 v2n21 v2n23 v2n32 v2n48 v2n51 v2n56
* Synthetik je Typ (undicht/gesamt): keine
* Synthetische Lecks einzeln (Vorlage, Dokument-Nr, Typ, noch lesbares Fragment):

<!-- BACKLOG-END -->

## Entscheidungen

Je Fall-Id ein Absatz: Fall-Id, Entscheidung, Grund. Messwerte vorher/nachher stehen im Abschnitt "Messung C1.1".

### Gruppe A: Aufraeumen aus der Pruefung C1.0 (Entscheidung D29, nur Faelle und Messwerkzeug)

**v2n06, v2n26, v2n43, v2n44, v2n55 (Fehlalarm gegen a07), Entscheidung E-ORT: reine Ortsnamen werden maskiert.** Der Wohnort und der Aufenthaltsort einer Person sind personenbezogen; `cases.mjs` a07 (Garmisch-Partenkirchen) verlangt das schon. Eine Unterscheidung "Ortsname im Sachsatz" gegen "Ortsname als Wohnort" ist ohne Satzverstaendnis nicht zuverlaessig, und ein stehengebliebener Wohnort ist ein Leck, ein ueberzaehliger Ortsplatzhalter nur ein Schoenheitsfehler. Die fuenf Negativfaelle bleiben als Ids erhalten (Zahl der Negativfaelle bleibt 60), enthalten aber keinen Ortsnamen mehr; der urspruengliche Satz steht unveraendert als positiver Fall v2a111 bis v2a115 in der Gruppe V2-STANDORT (Fragment: der Ortsname). Folge: v2a111 bis v2a115 sind Lecks, wo keine Ortsliste greift (Backlog fuer C1.2, Liste der Gross- und Mittelstaedte).

**v2a47 (Fragment 558213 steht auch in der Auftragsnummer), Entscheidung: Fall berichtigt.** Das Fragment ist jetzt `KD-2024-558213` (Kundennummer); die Auftragsnummer `AU-558213/03` ist kein Personenbezug des Falls. Grund: Der alte Fall war ein unfairer Rotfall (die Ziffernfolge in der Auftragsnummer darf stehen bleiben, solange die Kundennummer verschwindet).

**v2a96 (SSN 078-05-1120), Entscheidung: erfundene Nummer 561-48-3927.** Die alte Nummer ist die bekannte Woolworth-Beispielnummer (kein erfundener Wert im Sinn der Regeln). Beobachtung nach dem Austausch: Die alte Nummer wurde zufaellig als Telefonnummer erkannt, eine amerikanische Sozialversicherungsnummer (SSN, Format `ddd-dd-dddd`) hat keine eigene Regel; der Fall bleibt in allen Modi ein Leck (Backlog C1.2, Regel in der Gruppe `intlid` mit Stichwort SSN/Social Security).

**v2a69, v2a78 (zu lasche Erwartungen), Entscheidung: mehr Fragmente.** v2a69 verlangt jetzt `Rollstuhlnutzerin`, `Behinderung 80`, `Merkzeichen aG`, `Pflegegrad 3`; v2a78 `41 km/h`, `160 EUR`, `2 Punkte`, `Fahrverbot` (Profil strict). Beide werden dadurch zu Lecks (siehe Backlog), weil das Profil nur einzelne Begriffe erfasst; Behebung offen (Art. 9 und 10 sind Sache von C1.2/C1.3, Modell und Begriffslisten).

**Harness Modus ki (D29 Punkt 5), Entscheidung: Wert aus loadAIModel bleibt.** `run-eval.mjs` setzte `localAIMode` nach `loadAIModel()` auf false (die App setzt true). Jetzt setzt nur noch der Modus `wortlisten` (false) und `fallback` (true) den Wert, im Modus `ki` bleibt er unveraendert. Auswirkung auf die Messung: keine (die Ratsche blieb gleich).

**Synthetische Lecks einzeln (D29 Punkt 6).** Der Abschnitt "Offene Luecken" nennt jetzt je Modus jedes undichte synthetische Wertepaar mit Vorlage, Dokumentnummer, Typ und dem noch lesbaren (erfundenen) Fragment.

Baseline `baseline-v2.json`: nur in Kategorien neu gesetzt, in denen Faelle geaendert oder ergaenzt wurden (V2-STANDORT 5 neue Faelle, V2-NUMMER v2a47, V2-AUSLAND v2a96, V2-ART9 v2a69, V2-ART10 v2a78, NEG fuenf umgeschriebene Faelle); alle anderen Zahlen unveraendert.

### Gruppe B: Wortlisten immer aktiv (Backlog 0, Befund P0)

**Entscheidung E-WL: Wortlisten sind der Normalfall ohne KI-Treffer.** Vorher setzte die App `localAIMode` erst nach einem Modellstart oder -fehler auf true; wer die KI ausgeschaltet hatte (`ps_ai_mode = off`) oder bei wenig Arbeitsspeicher kein Autostart hatte, bekam nur die Regeln (W0), obwohl das KI-Panel "Es gilt die Standard-Erkennung (Regeln und Wortlisten)" verspricht. Jetzt: `PSDetect.detect/anonymize` behandeln `wordlists` als eingeschaltet, solange es nicht ausdruecklich `false` ist (`wordlistsOn = o.wordlists !== false`); in der Oberflaeche beginnt `localAIMode` mit `true` (die Variable bleibt als Diagnoseschalter fuer den Harness erhalten, weil `tests/unit/detect.wiring.test.mjs` sie als Vertragsname verlangt). Der Bericht (`aiMode`) liest jetzt den echten Einstellungswert `aiMode()` statt aus `localAIMode` zu schliessen (der Bericht hat vorher bei ausgeschalteter KI "off" nur gemeldet, weil `localAIMode` false war).

Bei leerer `ents`-Liste liefern die Wortlisten nichts (`activeEnts.size > 0`): "nichts ausgewaehlt" heisst "nichts erkannt" (`tests/unit/detect.api.test.mjs`, Leere ents-Liste); bei Profilen und eigener Auswahl mit mindestens einer Kategorie ist das Verhalten wie vorher.

**Referenzmodus w0, erklaerte Abweichung: keine Abweichung gemessen.** `dump-reference.mjs` und `diff-reference.mjs` setzen den Modus w0 ausdruecklich (`localAIMode = false` bzw. `wordlists: false`), deshalb bleibt `node tests/eval/diff-reference.mjs --node` bei 0 Abweichungen; w0 ist ab jetzt ein reiner Diagnosemodus (Regeln allein), kein Produktmodus mehr. Es ist kein Eintrag in `tests/golden/reference-allow.json` noetig (ein ungenutzter Eintrag wuerde nur eine Warnung ausloesen). Der Produktmodus "KI aus" entspricht jetzt w1.

**Harness:** Die Modi bleiben `wortlisten` (nur Regeln, Diagnose, `localAIMode = false`), `fallback` (= w1, Produktmodus KI aus oder KI-Start fehlgeschlagen) und `ki`. `wortlisten` bleibt als dritter Modus, weil die Ratschen `tests/eval.test.mjs` und `tests/eval-v2.test.mjs` und `baseline.json` ihn verlangen; die Abnahmetabelle C1 bewertet nur `fallback` und `ki`.

**Golden-Stand (`tests/golden/baseline.json`, Abschnitt `wordlist`):** neu gesetzt, weil der Test "Wortlisten-Erkennung entspricht dem Golden-Stand" und "Ausgeschaltet: kein Modell, Ergebnis der Standard-Erkennung" jetzt W1 vergleichen (KI aus). Diff gelesen: (1) "Hamburg" wird als ORT maskiert (vorher Klartext); (2) die Adresse "Werner-von-Siemens-Strasse 1, 80333 Muenchen" wird als NAME statt ADRESSE maskiert (Wortliste "Werner" greift, die Spanne ist dieselbe; nur die Platzhalterart wechselt, nichts bleibt lesbar); (3) "Hans Fischer fuer die Mustermann GmbH" hat die Methode "KI-Erkennung (Wortlisten)" statt "Regex (Pass 2)". Der Abschnitt `model` ist unveraendert.

**Messung Gruppe B (Harness, vorher/nachher):** unveraendert in allen Modi (die Harness-Modi setzen den Wert ausdruecklich); der Gewinn liegt im Produkt: "KI aus" verhaelt sich wie `fallback` (Handfaelle alt 12 statt 21, Synthetik 11 statt 18 von 276; neue Handfaelle 40 statt 41, Synthetik 46 statt 68 von 860). Fehlalarme: keine neuen.

### Gruppe C1: Namen im Ausfallmodus (Backlog 1)

Ausgangslage (Modus fallback, nach Gruppe B): Handfaelle alt 12, neu 40; Synthetik alt 11 von 276, neu 46 von 860 (davon NAME 11 und 41). Die Auswertung der einzelnen Lecks (Abschnitt "Offene Luecken") ergab drei Ursachen.

**Ursache 1, Fall-Ids v2a116 (rot angelegt) und die Mehrfachnennungen in den Synthetik-Dokumenten (zeugnis, chatverlauf, gespraechsprotokoll u. a.): Fehler im Code, behoben.** `detectLocalEntities` (Wortlisten) merkte sich jeden gefundenen Namen, jede Organisation und jeden Ort in einer Menge `seen` und ueberging jedes weitere Vorkommen derselben Schreibweise. Folge: in "Anna Schaefer ... Wir danken Anna ... Anna bleibt erreichbar" wurde nur das erste einzelne "Anna" maskiert, jedes weitere blieb im Klartext (jeder Sprecher im Chat, jede Anrede ab dem zweiten Vorkommen). Die Menge war ueberfluessig (Treffer mit gleichem Ort werden spaeter ohnehin vereinigt). Entscheidung: Regel/Code; `seen` entfernt, jedes Vorkommen ist ein Treffer. Grund: gemessener Hauptverursacher der Namenslecks im Ausfallmodus.

**Ursache 2, Fall-Ids v2a117 (Chat-Sprecher Zoe), v2a120 (Ansprache Oemer) und Synthetik (Namen mit Ae/Oe/Ue/Sonderbuchstaben am Rand): Fehler im Code, behoben.** `nameRx` begrenzte Namen mit `\b`; in JavaScript kennt `\b` nur ASCII-Buchstaben, deshalb wurde "Zoë" nur als "Zo" gelesen (kein Treffer im Woerterbuch) und Namen mit Sonderbuchstaben am Anfang (Ömer, Çağlar, Łucja) gar nicht gefunden. Entscheidung: Regel; `\b` ersetzt durch Lookarounds `(?<![A-Za-z0-9_À-ɏ])` und `(?![A-Za-z0-9_À-ɏ])` (wie in den uebrigen Namensregeln).

**Ursache 3, Fall-Ids v2a118, v2a119, v2a121 (neu, rot) und n12 (Mohammed Al-Farsi), ge04, Synthetik (Namen mit Zusatz: "Dieter de Baertschi", "Nadine van Al-Farsi", "Ilse von der Simek"): Woerterbuch.** Das Woerterbuch der Wortlisten (94 Vornamen, 128 Nachnamen) kannte viele gaengige Namen nicht. Entscheidung: Woerterbuch erweitert um rund 450 Vornamen und rund 230 Nachnamen (deutschsprachige, tuerkische, polnische, arabische, slawische, romanische und nordische Namen, auch mit Sonderbuchstaben); keine Substantive, die gleichzeitig Nachnamen sind (Keller, Maurer, Schreiner u. a.), damit keine Fehlalarme entstehen. **Grenze der Messung:** Die Synthetik zieht ihre Namen aus je 30 Vor- und Nachnamen; die Verbesserung dort ist deshalb eine obere Schaetzung, die tatsaechliche Abdeckung echter Texte haengt von der Namenslistengroesse ab. Messbar gegen Fehlalarme ist sie durch die 80 Negativfaelle (keine neuen).

**Syn 40, 94, 95 und v1 schaden#40 ("Tobias de Richter", "Anna von der Richter"): Regel.** "Richter" steht als Berufsbezeichnung in der Stoppwortliste und wurde deshalb nach einem Namenszusatz nicht mehr an den Namen gehaengt. Entscheidung: Ist das Wort ein bekannter Nachname (`LOCAL_SURNAMES`), blockiert die Stoppwortliste die Verlaengerung nach Namenszusatz nicht mehr. Wirkung auch ohne Wortlisten und mit KI-Spans (syn28, in `reference-allow.json`).

**Bekannte Nebenwirkung (bewusst offen, kein Leck):** "Braun zur Abgabe aller Erklaerungen" wird als ein Name mitmaskiert, weil "zur" als Namenszusatz gilt (Verhalten der Verlaengerungsregel, durch die jetzt gefundenen Treffer haeufiger sichtbar: syn13, syn27). Ueberzaehlige Maskierung, nichts bleibt lesbar; Behebung moeglich ueber eine Einschraenkung von "zu/zur/vom" als Zusatz (C1.2).

**Referenz (Differenztest `--node`):** Nach Gruppe C1 standen 22 erklaerte Abweichungen in `tests/golden/reference-allow.json` (w1: n12, n23, d03, ga09, ga22, ga24, ge04, syn0, syn4, syn11, syn12, syn13, syn27, syn29, syn30, syn34, syn40, syn41, golden-sample; w0, w1, ki: syn28). **Endstand nach allen Gruppen: 29 Eintraege** (dazu ga03 und ga05 je in w0, w1 und ki sowie ki/syn12 aus Gruppe E; 19 + 3 + 3 + 3 + 1). Pruefung je Eintrag mit altem und neuem Kern: ausschliesslich zusaetzliche oder verlaengerte Maskierung (neue Orts-/Namenstreffer, Zusatzteile von Namen), keine Stelle verliert eine Maskierung.

**Messung Gruppe C1 (vorher, nachher, Harness):**

| Modus | Handfaelle alt | Handfaelle neu | Negativfaelle (neu / alt) | Synthetik 42 Dok. | Synthetik 98 Dok. |
|---|---|---|---|---|---|
| fallback | 12, danach 10 | 40, danach 33 (inkl. 6 neue Faelle v2a116-121, davon 5 anfangs rot) | 20 / 0 (unveraendert) | 11, danach 0 von 276 | 46, danach 5 von 860 |
| ki | 4, unveraendert | 26, danach 28 (die zwei neuen Faelle v2a117, v2a120 sind in ki rot) | 20 / 0 (unveraendert) | 1 von 276, unveraendert | 24 von 860, unveraendert |
| wortlisten (Diagnose) | 21, unveraendert | 41, danach 46 (neue Faelle ohne Wortlisten rot) | 20 / 0 | 18, unveraendert | 68, danach 66 von 860 |

Restliche Namenslecks im Ausfallmodus der Synthetik: keine; offen sind in den neuen Dokumenten nur fuenf Steuer-ID-Werte mit Verb ("Steuer-ID lautet ...") und in ki die Namen, die das Modell nicht findet (siehe Backlog).

### Gruppe C2: GROSSGESCHRIEBENER Nachname mit Komma (Backlog 2)

**ga03 (MUELLER, HANS), v2a08 (SCHMIEDEBERG, Ottilie), v2a85 (ZIEGLER, UWE), neue Faelle v2a122 bis v2a124: Regel.** Keine Regel las die Form "NACHNAME, Vorname" mit grossgeschriebenem Nachnamen; die Wortlisten scheitern an der Gross-/Kleinschreibung, die Namenspaarregel am Komma. Neue Regel in der Gruppe `name`: ein Wort aus Grossbuchstaben (mindestens drei, auch mit Bindestrich), Komma, ein weiteres Wort (Grossbuchstaben oder Grossbuchstabe plus Kleinbuchstaben), und zwar nur am Zeilenanfang oder nach Doppelpunkt/Semikolon und nur, wenn danach ein Trenner (Semikolon, Komma, Klammer, `<`, Zeilenende, Textende) folgt. Die Pruefung `okName` weist die Form zurueck, wenn eines der beiden Woerter ein Stoppwort ist (WICHTIG, Dieses), und die rein grossgeschriebene Form verlangt weiterhin einen Treffer im Namenswoerterbuch (`isCapsPersonName` kennt jetzt das Komma). Fehlalarm-Schutz: `v2n11` und `v2n12` enthalten jetzt Zeilen wie "WICHTIG, Dieses Schreiben ...", "ACHTUNG, Frist laeuft ab.", "DSGVO, Art. 5" und "Vermerk: WICHTIG, Fristablauf beachten." (alle ohne Platzhalter; die Fassung mit abschliessendem Punkt als Trenner erzeugte "DSGVO, Art" als Fehlalarm und wurde verworfen). Grund: die Form tritt in Formularen und Registerauszuegen haeufig auf. **Restrisiko:** Zwei unbekannte Woerter der Form "UEBERSCHRIFT, Unterbegriff" am Zeilenende werden als Name maskiert (Ueber-Maskierung, kein Leck); Ueberschriftzeilen schliesst `isHeadingSpan` weitgehend aus.

### Gruppe C3: Spitznamen, Kurzformen, Genitiv (Backlog 3)

**ga05 ("Hotte"), neue Faelle v2a125, v2a127: Regel.** Spitznamen stehen in Anfuehrungszeichen hinter Stichwoertern. Neue Regel in der Gruppe `name`: ein Spitzname (ein bis zwei Woerter, grossgeschrieben) in Anfuehrungszeichen nach "nennen/nennt/rufen/ruft ihn/sie (nur)", "alias", "a.k.a.", "auch bekannt als", "Spitzname", "Rufname", "Kuenstlername" und nach ", genannt" (das Komma davor ist Pflicht, damit "genannt" in Vertragsdefinitionen wie `"Mieter" genannt` nicht greift). Der Treffer gilt nur, wenn das Wort kein Stoppwort ist (`okName`).

**v2a126 (Steffi, Andi, Kathi, Flo): Woerterbuch.** Gaengige Kurzformen und Spitznamen (Basti, Steffi, Andi, Kathi, Flo, Hannes, Micha, Uschi u. a., rund 60) sind im Vornamenwoerterbuch ergaenzt.

**v2a128 (Genitiv "Annas", "Schulzes", "Peters") und n14: bereits abgedeckt, nur als Schutzfall.** Die Genitivformen werden durch die Verlaengerungs- und Namenspaarregeln erfasst; kein Code. Der Fall v2a128 sichert das gegen Rueckschritt ab.

**Referenz (Differenztest):** ga03 und ga05 in w0, w1 und ki in `tests/golden/reference-allow.json` (jeweils nur zusaetzliche Maskierung).

**Messung Gruppen C2 und C3 (vorher = nach C1, nachher):**

| Modus | Handfaelle alt | Handfaelle neu | Negativfaelle neu / alt | Synthetik 42 | Synthetik 98 |
|---|---|---|---|---|---|
| fallback | 10, danach 8 | 33, danach 31 (inkl. 7 neue Faelle v2a122-128, alle gruen) | 20 / 0 | 0 von 276 | 5 von 860 |
| ki | 4, danach 2 | 28, danach 26 | 20 / 0 | 1 von 276 | 24 von 860 |
| wortlisten (Diagnose) | 21, danach 19 | 46, danach 44 | 20 / 0 | 18 | 66 |

### Gruppe D: Kennzahl mit Verb zwischen Stichwort und Wert

**Synthetik kuendigung_lang #12, #26, #40, #54, #68 ("meine Steuer-ID lautet 58804570822"), neue Faelle v2a129, v2a130: Regel (alle Modi).** In "Steuer-ID lautet 123..." und "Kundennummer ist X" stand zwischen Stichwort und Wert ein Verb; die Regeln `kennnr` verlangten Leerraum oder Doppelpunkt. Bei der Kunden-/Vertragsnummer wurde sogar das Verb als Wert maskiert ("Kundennummer {{KENNNR_1}} 4711-0815": die Nummer blieb stehen). Entscheidung: Regel; optional `lautet|ist|war` zwischen Stichwort und Wert (bei Steuer-ID und Co. sowie im Lookbehind der Kunden-/Vertragsnummer) und ein Lookahead, der das Verb selbst nie als Wert gelten laesst. Referenz: keine Abweichung auf dem Korpus.

### Gruppe E: Wortlisten ergaenzen das Modell um Personennamen (Erweiterung von Backlog 0)

**Befund:** Im Realdokument-Test lag der Modus fallback nach Gruppe C1 bei 0 von 97 undichten Werten (TXT und DOCX), mit Modell aber bei 3 von 97, und in der Synthetik mit Modell bei 24 von 860 gegen 5 im Modus fallback: das Modell verpasst Namen, die das Woerterbuch kennt (Chat-Sprecher "Birgit:", Ansprache "Oemer, kannst du", "Karl-Heinz de Obermaier"). Mit eingeschaltetem Modell war der Schutz damit schlechter als ohne.

**Entscheidung: Regel (Erweiterung der Spezifikation 'Wortlisten, wenn keine KI-Treffer vorliegen').** Mit KI-Treffern laufen die Wortlisten weiter, liefern aber nur Luecken des Modells: (a) nur Personennamen, deren Name einen bekannten Vornamen enthaelt (`LOCAL_NAMES`; reine Nachnamen wie Link, Koch, Klein gelten nicht, sie sind auch Alltagswoerter), (b) nur, wenn der Treffer keinen anderen Treffer beruehrt (Binaersuche ueber die sortierten Treffer; keine Umdeutung von ORG zu NAME, kein Abschneiden von Modell-Treffern), (c) keine Organisationen und Orte aus Stichwoertern (Bank, Hotel, Stadt). Eine erste Fassung ohne (a) bis (c) erzeugte 20 zusaetzliche Abweichungen in der Referenz (u. a. "der Link" als Name, ORG als NAME umbenannt) und wurde verworfen. Die Referenz weicht nun in genau einer Stelle ab (ki/syn12, in `reference-allow.json`: zuvor lag "Çağlar von der Obermaier" im Klartext).

**Grenze:** Beruehrt ein Wortlistentreffer einen Modelltreffer teilweise (chatverlauf #19, #33, #89: "Birgit:"; zeugnis #42; mietvertrag #43), bleibt das Fragment stehen. Diese sieben Werte sind das Backlog fuer C1.2 (Ueberlappungsregel: Wortlistentreffer, der einen reinen Namens-Modelltreffer verlaengert, soll ihn ersetzen).

**Golden-Stand:** Abschnitt `wordlist` neu gesetzt (Folge aus Gruppe C1: "Hamburg", "Berlin" werden maskiert, "Hans Fischer fuer die Mustermann GmbH" gilt als NAME statt ORG; kein Klartext mehr), Abschnitt `model` unveraendert.

**Messung Gruppen D und E (vorher = nach C2/C3, nachher):**

| Modus | Handfaelle alt | Handfaelle neu | Negativfaelle neu / alt | Synthetik 42 | Synthetik 98 |
|---|---|---|---|---|---|
| fallback | 8 | 31 (inkl. 2 neue Faelle v2a129/130, gruen) | 20 / 0 | 0 von 276 | 5, danach 0 von 860 |
| ki | 2 | 26, danach 25 | 20 / 0 | 1, danach 0 von 276 | 24, danach 7 von 860 |
| wortlisten (Diagnose) | 19 | 44 | 20 / 0 | 18 | 66, danach 61 |



### Gruppe F: Korrektur nach Pruefung (mehrdeutige Namen, M1 und M2)

**Befund des Pruefers:** Das erweiterte Namenswoerterbuch maskierte Alltagswoerter, was v2/main nicht tat ("Anders als geplant", "Ehrlich gesagt", "Busse und Bahnen", "Funk und Fernsehen", "Lenz und Sommer", "Zander und Hecht", "Vogt", "Kraemer"); mit Modell (Gruppe E) auch einzelne Vornamen wie "die Iris", "ein Falk", "Mona".

**Entscheidung (Woerterbuch/Regel):** (1) Aus den in C1.1 ergaenzten Nachnamen entfernt: Anders, Appel, Bader, Bergmann, Binder, Busse, Ehrlich, Fiedler, Funk, Heller, Kluge, Knapp, Kraemer, Kuehn, Kraus, Lampe, Lenz, Pape, Schenk, Schlegel, Vogt, Wolff, Zander (Adjektive, Berufe, Tiere, Gegenstaende). Aus den ergaenzten Vornamen entfernt: August (Monat), Pascal (Einheit), Wolle. Namen, die schon in v2/main standen, blieben unberuehrt. (2) Kai, Iris, Falk, Mona und Teddy bleiben als schwache Vornamen (`WEAK_NAMES`): kein Treffer hinter Artikel oder Praeposition mit Artikel ("am Kai", "die Iris", "ein Falk") und nicht als Erstglied eines Kompositums ("Iris-Blende", dagegen "Kai-Uwe" bleibt). Grund fuer das Behalten: v2a66 ("Partner Kai") und Chat-Anreden. (3) Mit Modell (Gruppe E) gilt zusaetzlich fuer jeden einzelnen Vornamen: kein Treffer hinter Artikel oder Praeposition mit Artikel, auch wenn der Artikel am Satzanfang als Teil des Treffers gelesen wurde ("Ein Anton").

**Absicherung:** Die NEG-Faelle v2n03, v2n04, v2n07, v2n10, v2n14, v2n16, v2n17, v2n18, v2n19, v2n22, v2n24 und v2n27 tragen zusaetzliche alltaegliche Saetze mit jedem entfernten oder eingeschraenkten Eintrag (rot angelegt, dann gruen; die Zahl der Negativfaelle bleibt 60, weil `eval-v2.test.mjs` sie fest verlangt). Dazu der Vergleich gegen v2/main (`detect_old.js` des Pruefers) mit 103 Alltagssaetzen, je im Modus fallback und ki: keine neue Maskierung eines Alltagsworts; uebrig sind sechs Saetze, in denen echte Personennamen stehen (Franz, Dieter, Ulrich, Gerhard, Marie, Richard, Albers, Zeller u. a.).

**Messung (vor und nach der Korrektur, unveraendert):** fallback alt 8, neu 31, Synthetik 0 von 276 und 0 von 860; ki alt 2, neu 25, Synthetik 0 von 276 und 7 von 860; Fehlalarme 0 alt und 20 neu in allen Modi, keiner neu; Differenztest 0 Abweichungen.

### Entscheidung je offenem Fund (Stand Ende Durchlauf 1, Ergänzung zur Prüfung)

Stand Ende Durchlauf 1; die Entscheidungen und Ergebnisse des Durchlaufs 2 folgen im Abschnitt "Durchlauf 2 (C1.2)" unten (alle Zeilen "geht nach C1.2" sind dort behoben oder bewusst offen). Jede Fall-Id der Liste "Offene Luecken" hatte hier eine Zeile: Modi, in denen sie noch offen ist, Entscheidung ("geht nach C1.2: Regel/Woerterbuch/Modell" oder "bewusst offen" mit Grund), Grund. "alle" heisst wortlisten, fallback und ki. Die Fälle der Gruppen A bis E, die geschlossen wurden, stehen in den Abschnitten oben.

| Fall-Id | Modi | Entscheidung | Grund |
|---|---|---|---|
| ga01 | nur wortlisten | bewusst offen im Diagnosemodus wortlisten (nur Regeln); im Produktmodus fallback und ki ist der Fall gedeckt (Wortlisten sind Normalfall, Gruppen B bis E) | Namenspaar Nachname, Vorname mit Klammerzusatz |
| ga02 | nur wortlisten | bewusst offen im Diagnosemodus wortlisten (nur Regeln); im Produktmodus fallback und ki ist der Fall gedeckt (Wortlisten sind Normalfall, Gruppen B bis E) | Absender-/Empfaengerzeile mit Komma |
| ga06 | nur wortlisten | bewusst offen im Diagnosemodus wortlisten (nur Regeln); im Produktmodus fallback und ki ist der Fall gedeckt (Wortlisten sind Normalfall, Gruppen B bis E) | Name hinter Herrn mit Komma |
| ga07 | nur wortlisten | bewusst offen im Diagnosemodus wortlisten (nur Regeln); im Produktmodus fallback und ki ist der Fall gedeckt (Wortlisten sind Normalfall, Gruppen B bis E) | Anrede und Grussformel |
| ga27 | nur wortlisten | bewusst offen im Diagnosemodus wortlisten (nur Regeln); im Produktmodus fallback und ki ist der Fall gedeckt (Wortlisten sind Normalfall, Gruppen B bis E) | Familienangaben |
| n03 | nur wortlisten | bewusst offen im Diagnosemodus wortlisten (nur Regeln); im Produktmodus fallback und ki ist der Fall gedeckt (Wortlisten sind Normalfall, Gruppen B bis E) | Name hinter Label |
| n10 | nur wortlisten | bewusst offen im Diagnosemodus wortlisten (nur Regeln); im Produktmodus fallback und ki ist der Fall gedeckt (Wortlisten sind Normalfall, Gruppen B bis E) | Nachname am Satzanfang |
| n12 | nur wortlisten | bewusst offen im Diagnosemodus wortlisten (nur Regeln); im Produktmodus fallback und ki ist der Fall gedeckt (Wortlisten sind Normalfall, Gruppen B bis E) | Name mit Bindestrich-Nachname |
| n13 | nur wortlisten | bewusst offen im Diagnosemodus wortlisten (nur Regeln); im Produktmodus fallback und ki ist der Fall gedeckt (Wortlisten sind Normalfall, Gruppen B bis E) | Sonderbuchstaben |
| n17 | nur wortlisten | bewusst offen im Diagnosemodus wortlisten (nur Regeln); im Produktmodus fallback und ki ist der Fall gedeckt (Wortlisten sind Normalfall, Gruppen B bis E) | Eltern: zwei Vornamen mit gemeinsamem Nachnamen |
| v2a03 | nur wortlisten | bewusst offen im Diagnosemodus wortlisten (nur Regeln); im Produktmodus fallback und ki ist der Fall gedeckt (Wortlisten sind Normalfall, Gruppen B bis E) | Namensliste |
| v2a06 | nur wortlisten | bewusst offen im Diagnosemodus wortlisten (nur Regeln); im Produktmodus fallback und ki ist der Fall gedeckt (Wortlisten sind Normalfall, Gruppen B bis E) | Vorname in Anrede |
| v2a113 | nur wortlisten | bewusst offen im Diagnosemodus wortlisten (nur Regeln); im Produktmodus fallback und ki ist der Fall gedeckt (Wortlisten sind Normalfall, Gruppen B bis E) | Ort |
| v2a114 | nur wortlisten | bewusst offen im Diagnosemodus wortlisten (nur Regeln); im Produktmodus fallback und ki ist der Fall gedeckt (Wortlisten sind Normalfall, Gruppen B bis E) | Orte |
| v2a115 | nur wortlisten | bewusst offen im Diagnosemodus wortlisten (nur Regeln); im Produktmodus fallback und ki ist der Fall gedeckt (Wortlisten sind Normalfall, Gruppen B bis E) | Ort |
| v2a116 | nur wortlisten | bewusst offen im Diagnosemodus wortlisten (nur Regeln); im Produktmodus fallback und ki ist der Fall gedeckt (Wortlisten sind Normalfall, Gruppen B bis E) | wiederholte Namen |
| v2a118 | nur wortlisten | bewusst offen im Diagnosemodus wortlisten (nur Regeln); im Produktmodus fallback und ki ist der Fall gedeckt (Wortlisten sind Normalfall, Gruppen B bis E) | Name mit Zusatz |
| v2a119 | nur wortlisten | bewusst offen im Diagnosemodus wortlisten (nur Regeln); im Produktmodus fallback und ki ist der Fall gedeckt (Wortlisten sind Normalfall, Gruppen B bis E) | Name mit Zusatz |
| v2a120 | nur wortlisten | bewusst offen im Diagnosemodus wortlisten (nur Regeln); im Produktmodus fallback und ki ist der Fall gedeckt (Wortlisten sind Normalfall, Gruppen B bis E) | Ansprache |
| v2a126 | nur wortlisten | bewusst offen im Diagnosemodus wortlisten (nur Regeln); im Produktmodus fallback und ki ist der Fall gedeckt (Wortlisten sind Normalfall, Gruppen B bis E) | Kurzformen |
| v2a54 | nur wortlisten | bewusst offen im Diagnosemodus wortlisten (nur Regeln); im Produktmodus fallback und ki ist der Fall gedeckt (Wortlisten sind Normalfall, Gruppen B bis E) | Kinder mit Vornamen |
| ga24 | wortlisten | bewusst offen im Diagnosemodus wortlisten; fallback und ki decken den Fall | Geburtsdatum und Ort |
| ga04 | wortlisten, fallback | geht nach C1.2: Regel (Verlaengerungsregel um 'und' im Namenszusatz erweitern: 'von und zu') | 'Freifrau von und zu Hohenberg-Lindenau': Nachnamenteil bleibt stehen, auch mit Modell gedeckt |
| ga25 | wortlisten, fallback | geht nach C1.2: Regel (Wert hinter 'Geburtsort:' darf Abkuerzungen wie 'v. d.' enthalten) | Ortsname mit 'v. d. Hoehe' wird nach 'Homburg' abgeschnitten |
| ga28 | wortlisten, fallback, ki | geht nach C1.2: Regel (Aufenthaltstitel: Nummer in Klammer 'Nr. 12345678', Backlog 4) | Kennzahl hinter 'Nr.' ohne Stichwort unmittelbar davor |
| gb09 | wortlisten, fallback | geht nach C1.2: Woerterbuch (Begriffsliste Art. 9: Roma, Sinti u. a. im Profil strict) | 'Roma' fehlt in der Begriffsliste; mit Modell gedeckt |
| ge01 | wortlisten, fallback, ki | geht nach C1.2: Regel (UK National Insurance Number mit Stichwort 'NI number'; Praefix QQ ist formal ungueltig, deshalb greift die Formregel nicht) | Stichwort-Regel haette Vorrang vor der Formpruefung |
| a07 | wortlisten, fallback | geht nach C1.2: Woerterbuch (Ortsliste um Gemeinden und Doppelnamen wie Garmisch-Partenkirchen) | reiner Ortsname nach 'in', Punkt E-ORT |
| o03 | wortlisten, fallback | geht nach C1.2: Regel (Behoerdenname 'Bundesagentur fuer Arbeit' als Organisation; derzeit wird nur 'Arbeit' als Name maskiert) | Organisationsregel kennt 'Bundesagentur' nicht |
| o10 | wortlisten, fallback | geht nach C1.2: Woerterbuch (Krankenkassen: AOK, TK, Barmer, DAK, IKK u. a.) | Kuerzel AOK steht in keiner Liste |
| v2a101 | wortlisten, fallback, ki | geht nach C1.2: Regel (Gruppe account, Zugangsdaten) | Login mit 'Benutzer' vor dem Namen und 'Kennwort' mit Sonderzeichen |
| v2a103 | wortlisten, fallback, ki | geht nach C1.2: Regel (Gruppe account, Zugangsdaten) | Umgebungsvariable 'AWS_SECRET_ACCESS_KEY=...' mit 40 Zeichen |
| v2a104 | wortlisten, fallback, ki | geht nach C1.2: Regel (Gruppe account, Zugangsdaten) | PIN und TAN mit Verb 'ist' zwischen Stichwort und Wert (wie Gruppe D) |
| v2a105 | wortlisten, fallback, ki | geht nach C1.2: Regel (Gruppe account, Zugangsdaten) | WLAN-Schluessel mit Bindestrich-Wert |
| v2a109 | wortlisten, fallback, ki | geht nach C1.2: Regel (Gruppe account, Zugangsdaten) | Tresorcode (Stichwort fehlt in der Zugangsdaten-Regel) |
| v2a110 | wortlisten, fallback, ki | geht nach C1.2: Regel (Gruppe account, Zugangsdaten) | 'Passwort fuer das Kundenportal:' mit Zwischenwoertern |
| v2a111 | wortlisten, fallback | geht nach C1.2: Woerterbuch (Fehler: die Ortsliste der Stichwortregel kennt Dortmund, die Score-Liste in detectLocalEntities nicht; ein Ort der Stichwortliste ohne Eintrag in der Score-Liste wird verworfen. Beide Listen zusammenfuehren) | Dortmund, Goettingen, Kassel, Detmold fehlen in der Score-Liste |
| v2a51 | wortlisten, fallback | geht nach C1.2: Woerterbuch (wie v2a111, Goettingen) | Ortsliste |
| v2a57 | wortlisten, fallback | geht nach C1.2: Woerterbuch (wie v2a111, Detmold) | Ortsliste |
| v2a66 | wortlisten | bewusst offen im Diagnosemodus wortlisten; in fallback und ki gedeckt (Kai ist ein schwacher Vorname, gilt ohne Artikel davor) | Gruppe F |
| v2a117 | wortlisten, ki | geht nach C1.2: Regel (Ueberlappung: ein Wortlistentreffer, der einen reinen Namen-Modelltreffer verlaengert oder ersetzt) | Modelltreffer 'Birgit: Danke' beruehrt den Wortlistentreffer, deshalb wird 'Zoe' nicht ergaenzt |
| v2a12 | alle | geht nach C1.2: Regel (Telefon: 'Mobil: +49 160 ...' und 'Buero: 0711 / 55 20 61-14' mit Schraegstrich und Durchwahl) | Formate mit Leerzeichen um den Schraegstrich |
| v2a15 | alle | geht nach C1.2: Regel (Postfach plus Postleitzahl-Ort) | Stichwort 'Postfach' ohne Regel |
| v2a19 | alle | geht nach C1.2: Regel (Profil-Adressen github.com/..., xing.com/profile/...) | Domainliste kennt github.com nicht |
| v2a20 | alle | geht nach C1.2: Regel (Telefon 0049 (0) mit Gruppen aus einzelnen Ziffern) | Format '8821 7 33 90' |
| v2a30 | alle | geht nach C1.2: Regel (Anmeldename/Domaenenname im Arbeitsplatz-Zusammenhang) | 'Anmeldename' fehlt als Stichwort |
| v2a35 | alle | geht nach C1.2: Regel (Koordinaten 'lat=..., lon=...') | Schluesselwoerter lat/lon fehlen |
| v2a39 | alle | geht nach C1.2: Regel (Koordinaten in URL-Parametern ?q=lat,lon) | URL-Regel greift nicht auf Koordinatenteil |
| v2a45 | alle | geht nach C1.2: Regel (Rentenversicherungsnummer mit Leerzeichen, Krankenversichertennummer A123456780) | Format-Varianten |
| v2a67 | alle | geht nach C1.2: Woerterbuch (Begriffsliste Art. 9: genetische Marker wie BRCA1) | Begriff fehlt in der Liste |
| v2a69 | alle | geht nach C1.2: Woerterbuch/Regel (Art. 9: Rollstuhl, Grad der Behinderung, Merkzeichen; Standardprofil strict) | nur 'Pflegegrad' ist gelistet |
| v2a78 | alle | geht nach C1.2: Regel (Art. 10: Ordnungswidrigkeit mit Punkten und Fahrverbot) | nur 'Fahrverbot' ist gelistet; Betraege und km/h bleiben |
| v2a81 | wortlisten, fallback | geht nach C1.2: Regel (Tabellenzeile mit senkrechtem Strich: Spalte 'Strasse' ohne Postleitzahl) | 'Am Anger 12' hat keine Postleitzahl in der Zeile |
| v2a83 | alle | geht nach C1.2: Regel (IBAN ueber Zeilenumbruch hinweg) | Zeilenumbruch mitten in der IBAN |
| v2a84 | alle | geht nach C1.2: Regel (E-Mail ueber Zeilenumbruch hinweg) | Zeilenumbruch hinter dem @ |
| v2a86 | alle | geht nach C1.2: Regel (Hr. Joh. Wittkopp: Abkuerzung 'Joh.' vor dem Nachnamen; 'Hauptstr. 3' ohne Postleitzahl-Format) | Abkuerzung und Postleitzahl mit Leerzeichen |
| v2a87 | wortlisten, fallback | geht nach C1.2: Regel (CSV-Zeile: Nachname in Anfuehrungszeichen vor Vorname) | 'Mueller' ist kein Woerterbuchname |
| v2a92 | alle | geht nach C1.2: Regel (Ausland) | franzoesische Adresse 'avenue' mit Hausnummer davor, Telefonformat tel. 04 78 12 34 56 |
| v2a94 | alle | geht nach C1.2: Regel (Ausland) | polnisches Namensformat Zielinska und ul. Dluga 7/3 |
| v2a96 | alle | geht nach C1.2: Regel (Ausland) | US-SSN ddd-dd-dddd (keine Regel; Stichwort 'SSN') |
| v2a99 | alle | geht nach C1.2: Regel (Ausland) | tschechische Geburtsnummer und Adresse |
| v2a95 | wortlisten, fallback | geht nach C1.2: Regel (spanische Adresse 'avenida de la ...') | Adresse ohne Postleitzahl-Format |
| v2a97 | wortlisten, fallback | geht nach C1.2: Regel (niederlaendische Adresse Strasse Hausnummer) | Hausnummer ohne Postleitzahl-Format |

Fehlalarme (Kategorie NEG, in allen Modi offen: wortlisten, fallback und ki; alle schon in C1.0 gemessen, keiner neu):

| Fall-Id | Beobachtung | Entscheidung |
|---|---|---|
| v2n01 | 'Hamburger Hafen' und 'Tonnen' werden als Namen maskiert | geht nach C1.2: Wörterbuch/Modell (Ortsadjektive auf -er und Gattungswörter wie Tonnen nicht als Namen) |
| v2n02 | 'Berliner Philharmoniker' und 'Brahms' | geht nach C1.2: Wörterbuch (Komponisten und Ortsadjektive als Ausnahmeliste), sonst bewusst offen (Modell) |
| v2n13 | 'Hotel Alpenblick' wird als Name maskiert (Garmisch als Ort bleibt nach E-ORT maskiert) | geht nach C1.2: Regel (Stichwort Hotel plus Eigenname ist kein Personenname); der Ortsteil bleibt bewusst offen |
| v2n15 | '12 Stück Kabelbinder': Gattungswort 'Stück' als Name | geht nach C1.2: Wörterbuch (Stoppwörter für Mengenangaben) |
| v2n20 | 'Berg Zugspitze', 'Gipfel': Stichwort Berg | geht nach C1.2: Wörterbuch (Bergnamen und Gattungswörter) |
| v2n21 | 'Stadtwerke München' | bewusst offen: Ortsname wird nach E-ORT maskiert, der Firmenname enthält ihn |
| v2n23 | Code-Beispiel: die URL im String wird als Weblink maskiert | bewusst offen: Weblinks mit Pfad gelten als Kennung (Profil-Entscheidung), Codebeispiele sind selten |
| v2n25 | 'Siehe Tabelle 4': 'Tabelle' wird als Name gelesen | geht nach C1.2: Wörterbuch (Stoppwort 'Tabelle', 'Abbildung') |
| v2n29 | 'Museum Ludwig': Eigenname einer Institution | bewusst offen: enthält einen Personennamen (Ludwig); nur mit Kontext (Museum) zu unterscheiden, Nutzen gering |
| v2n30 | '§ 15 Abs. 3 TMG ist die Nutzung von Pseudonymen': 'Nutzung' wird zum Namen | geht nach C1.2: Regel (Gesetzeszitat mit Kürzel TMG) |
| v2n32 | 'Volkshochschule Heidelberg' | bewusst offen: Ortsname, E-ORT |
| v2n34 | '100 Grad Celsius': 'Celsius' als Name | geht nach C1.2: Wörterbuch (Einheiten und Personennamen als Einheit: Celsius, Newton, Pascal) |
| v2n35 | 'Frankfurter Würstchen': Ortsadjektiv | geht nach C1.2: Wörterbuch (Ortsadjektive auf -er) |
| v2n37 | Datei 'aus dem Ordner Projekte': 'Projekte' wird zum Namen | geht nach C1.2: Wörterbuch (Stoppwort) |
| v2n48 | 'Wiener Sängerknaben', 'Japan' | geht nach C1.2: Wörterbuch (Ortsadjektive), Japan bewusst offen (Ortsname, E-ORT) |
| v2n50 | 'eine Prise Salz': 'Prise' wird zum Namen | geht nach C1.2: Wörterbuch (Stoppwort) |
| v2n51 | 'Sparkasse Köln-Bonn', 'Volksbank Mittelhessen' | bewusst offen: Ortsnamen im Bankennamen, E-ORT |
| v2n52 | 'das Passwort mindestens zwölf Zeichen': 'mindestens' wird als Kennwort gelesen | geht nach C1.2: Regel (Stichwort Passwort ohne Doppelpunkt nur mit Wert aus Sonderzeichen oder Ziffern) |
| v2n53 | 'Bundesstraße 27' wird als Adresse maskiert | geht nach C1.2: Regel (Bundesstraße/Autobahn mit Nummer ist keine Adresse) |
| v2n56 | 'Tag der Deutschen Einheit': 'Einheit' als Name | geht nach C1.2: Wörterbuch (Feiertagsnamen) |


### Durchlauf 2 (C1.2): Entscheidungen je Fund

Ausgangslage (Messung am Anfang von C1.2, Stand nach C1.1/C1.r/C2.w/C2.fix): Handfaelle alt 150 positiv, neu 130 positiv (v2); dazu 28 neue Faelle aus diesem Durchlauf (v2a131 bis v2a158). Undicht mit Modell alt 2 und neu 25, im Modus fallback alt 8 und neu 31; Fehlalarme (NEG von 60) 20 in allen Modi; Synthetik 42 Dokumente 0 von 276, Synthetik 98 Dokumente 0 (fallback) und 7 (Modell) von 860; Realdokumente mit Modell TXT 2, DOCX 2, PDF 3, OCR 5. Verfahren: je Fund zuerst als roter Fall (die 28 neuen Faelle v2a131 bis v2a158 wurden vor der Behebung angelegt und als rot gemessen, Commit "test(C1.2): 25 rote Faelle"), dann Behebung in `app/lib/detect.js`. Entscheidungsarten: Regel, Woerterbuch, Modell, bewusst offen.

**Zugangsdaten (v2a101, v2a103, v2a104, v2a105, v2a109, v2a110, neu v2a145 bis v2a148): Regel.** Die Stichwortregeln der Gruppe `account` wurden aufgeteilt: (1) Wortgrenze vor allen Stichwoertern (Fehler: "Standort" endete auf "tan" und "Tannenberg Bau KG" begann damit, die Regel PIN/TAN (ohne Wortgrenze, Flag i) maskierte das Folgewort als Zugangsdaten: "Stan{{KONTO_1}}", "Tan{{KONTO_1}}"; Fehlalarm, in den Referenzfaellen ga17, syn12, syn36 sichtbar); (2) "Login: Benutzer ewagner": das Stichwort "Benutzer/User" ist nie der Wert, der Name dahinter wird maskiert; (3) Anmeldename, Loginname, Kontoname, Nickname auch ohne Doppelpunkt, wenn der Wert einen Punkt, Unterstrich, Bindestrich, @ oder eine Ziffer enthaelt; (4) mehr Stichwoerter (Geheimzahl, Tresorcode, Safe-Code, Alarmcode, Tuercode, Codewort, Sicherheitscode, PUK, WLAN-/WPA-/WiFi-Schluessel); (5) Stichwort ohne Doppelpunkt nur noch, wenn der Wert Ziffern oder Sonderzeichen enthaelt (Fehlalarm v2n52 "das Passwort mindestens zwoelf Zeichen"); (6) Stichwort mit Zwischenwoertern vor dem Doppelpunkt ("Passwort fuer das Kundenportal:") und mit Verb ("PIN der Bankkarte ist 4817", "Das Passwort lautet Sommer2024!", "Zugangscode zur Garage ist 4711#") unter derselben Wertbedingung; (7) Umgebungsvariablen und Konfigurationsschluessel mit SECRET, TOKEN, PASSWORD, PWD, API_KEY, ACCESS_KEY, PRIVATE_KEY (`AWS_SECRET_ACCESS_KEY=...`, `DB_PASSWORD=...`, `client_secret: ...`), Wert mit mindestens einer Ziffer oder einem der Zeichen / + = _ . Aus Leistungsgruenden stehen die neuen Regeln mit Lookbehind hinter einer Vorpruefung auf das erste Wertzeichen (`(?=\S)`), sonst brach `detect.pathological.test.mjs` (Leerraumfolgen) die Zeitgrenze (gemessen 3,8 s statt unter 2 s).

**Kontakt (v2a12, v2a15, v2a19, v2a20, neu v2a131 bis v2a134, v2a157): Regel.** Telefon: Schraegstrich mit Leerzeichen und Durchwahl ("0711 / 55 20 61-14"); Auslandsformat mit einzelnen Ziffern ("0049 (0) 8821 7 33 90"); franzoesisches Format "06 12 34 56 78" (Paare); Nummer, die in OCR-Text und Zeilenumbruch-Text hinter der Laenderkennung umbrochen ist ("+49 (0)711\n14732931", nur mit Laenderkennung und mindestens fuenf Ziffern in der Fortsetzung). Postfach (Stichwort, Ziffernfolge) als Adresse. Profil-Adressen: github.com, gitlab.com, bitbucket.org, reddit.com/user, medium.com/@, youtube.com/@, mastodon.social/@ (die Alternative tiktok.com/@ war wegen eines doppelten Schraegstrichs unwirksam und ist behoben).

**Standort (v2a35, v2a39, v2a111, v2a113 bis v2a115, v2a136 bis v2a138, v2a51, v2a57): Regel und Woerterbuch.** Koordinaten mit Stichwort "lat=..., lon=..." und "latitude: ..., longitude: ..." (Regel); Koordinaten im URL-Parameter ("?q=48.2,16.3": die URL-Regel schnitt am Komma ab, jetzt Komma zwischen Ziffern erlaubt). Orte: Fehler im Kern behoben, die Stichwortliste der Wortlisten kannte mehr Orte als die Bewertungsliste, ein Ort der Stichwortliste ohne Eintrag in der Bewertungsliste wurde verworfen. Beide sind jetzt eine Liste (`LOCAL_CITY_ALT`), erweitert um rund 55 Gross- und Mittelstaedte und Doppelnamen (Goettingen, Kassel, Detmold, Osnabrueck, Oldenburg, Pforzheim, Bergisch Gladbach, Garmisch-Partenkirchen, Wien, Graz, Zuerich, Basel u. a.; mehrdeutige Alltagswoerter wie Halle, Hof, Weiden wurden bewusst nicht aufgenommen). Wirkung: v2a111 bis v2a115, v2a51, v2a57, v2a136 bis v2a138 sind im Modus fallback und mit Modell dicht; im Diagnosemodus wortlisten bleiben sie offen (bewusst, ohne Woerterbuch gibt es keine Ortserkennung). Der Geburtsort-Regel (`Geburtsort: Bad Homburg v. d. Hoehe`) fehlte der Grossbuchstabe im Ortsnamen, behoben (ga25).

**Nummern (v2a45, v2a139): Regel.** Krankenkassennummer: "Krankenkassennr.", "KVNR", "KV-Nr" (die Form "Krankenversichertennummer" erkannte die vorhandene Regel schon, das Stichwort "Kranken" bleibt dabei lesbar).

**Ausland (v2a92, v2a94, v2a95, v2a96, v2a97, v2a99, neu v2a140 bis v2a144, v2a156, ga28, ge01): Regel.** US-Sozialversicherungsnummer mit Stichwort SSN/Social Security Number (die Nummer allein ohne Stichwort wird nicht erkannt: zu viele Fehlalarme mit Telefon- und Artikelnummern); PESEL mit Stichwort auch bei falscher Pruefsumme (Wert nach dem Stichwort ist eindeutig; die Pruefsummenpruefung bleibt fuer alle anderen Faelle); tschechische Geburtsnummer mit Stichwort "rodne cislo"/RC; niederlaendische Strasse (-straat, -gracht, -laan, -plein, -kade u. a.) und Postleitzahl mit Buchstaben ("1016 GV Amsterdam", mit Ausschluss von EU, EM, WM u. a.); tschechische Strasse (-ska, -ova, -ni u. a.) und Postleitzahl ("120 00 Praha"); spanische Strassen mit "de la/del" und Grossschreibung ("calle de Alcala 45", "Avenida de la Constitucion 18"); franzoesische Strassen mit mehreren Grossbuchstaben-Woertern ("avenue Jean Jaures", vorher als Adresse plus Name gespalten); polnische Hausnummer mit Wohnungsnummer ("ul. Dluga 7/3"); englische Strassenarten Court, Place, Boulevard, Terrace u. a.; Franzoesische Telefonnummer mit "tel." und Paaren. Aufenthaltstitel: Nummer in Klammer "(Nr. 12345678)" hinter dem Stichwort (ga28, Backlog 4). Maschinenlesbare Zeilen (MRZ: 30 bis 46 Zeichen aus A-Z, 0-9 und <, mindestens drei <) als Kennung (v2a156, Backlog 4). UK National Insurance Number mit Stichwort "NI number"/NINO auch bei ungueltigem Praefix QQ (ge01).

**Formatierung und Zeichen (v2a81, v2a83, v2a84, v2a86, v2a87, neu v2a149 bis v2a151, v2a158): Regel.** IBAN ueber Zeilenumbruch hinweg (ein oder zwei Umbrueche zwischen den Vierergruppen, behebt auch das Leck 15:IBAN im PDF mit Textebene: Umbruch plus Leerzeile); E-Mail mit Umbruch hinter dem @ und hinter Punkt oder Bindestrich in der Domaene; Strasse mit Praeposition und Artikel ohne Postleitzahl ("Am Anger 12", "Zum Muehlenteich 8"; Ausschluss von Wochentagen, Monaten, Gattungswoertern wie Beispiel, Ende, Anfang und Zahlen mit Einheit wie Uhr, Personen, Euro, Seiten: Fehlalarmschutz im Fall v2n39); abgekuerzter Vorname hinter der Anrede ("Hr. Joh. Wittkopp", Liste ueblicher Abkuerzungen Joh., Chr., Wilh., Ferd. u. a., damit "Herr Max. Danke" nicht verbunden wird); CSV-Zeile "Nachname","Vorname" (Wortlisten: ist eines der beiden Woerter ein bekannter Vorname, werden beide maskiert).

**Art. 9 und 10 (v2a66, v2a67, v2a69, v2a78, gb09, neu v2a152 bis v2a155): Woerterbuch und Regel.** Begriffe: Rollstuhl, BRCA1, BRCA2, Ordnungswidrigkeit, Fahrverbot, Fahrerlaubnisentzug, Fuehrerscheinentzug, Rotlichtverstoss, Geschwindigkeitsueberschreitung, Roma (nur exakt). Regeln: "Grad der Behinderung 80", "Merkzeichen aG/G/H/Bl/Gl/B/RF/TBl", "Pflegegrad 3" mit Stufe, und "41 km/h" sowie "2 Punkte" im Umfeld (bis 120 Zeichen davor, gleiche Zeile) der Woerter Ordnungswidrigkeit, Geschwindigkeitsueberschreitung, Rotlichtverstoss, Verkehrsverstoss, Bussgeld, Verwarnung, Fahrverbot. v2a66 ("Partner Kai") bleibt im Diagnosemodus wortlisten offen (Kai ist ein schwacher Vorname, Begruendung wie in Durchlauf 1).

**Organisationen (o03, o10): Regel.** "Bundesagentur fuer Arbeit" (und "... fuer Arbeit und Soziales") als Organisation; Krankenkassen AOK, IKK, BKK (mit Regionswort), Barmer, DAK, KKH, Techniker Krankenkasse. Die Einzelkuerzel TK und HEK sind nicht aufgenommen (Fehlalarme). Folge der Spanneverschmelzung im Kern: das Wort "Arbeit" wird zusaetzlich als Name erkannt und innerhalb der Organisationsspanne gefuehrt, die Platzhalterart der Spanne ist deshalb NAME statt ORG; nichts bleibt lesbar (Eintrag in der Referenz).

**Namenszusatz "von und zu" (ga04): Regel.** Die Verlaengerungsregel kennt "von und zu" als Namenszusatz; der Nachnamenteil "Hohenberg-Lindenau" bleibt nicht mehr stehen.

**Ueberlappung Modell und Wortlisten (v2a117, Synthetik chatverlauf #19, #33, #89, zeugnis #42, mietvertrag #43; Realdokumente 19:NAME in TXT, DOCX, PDF): Regel (Backlog aus Gruppe E).** Zwei Ursachen. (1) Das Modell liefert Wortbruchstuecke ("Bir" aus "Birgit", "Zo" aus "Zoe"), die spaeter wegen der Wortgrenzenpruefung verworfen werden, die Wortlisten hielten sich aber an diese Stuecke und lieferten nichts; jetzt zaehlen Modelltreffer, die mitten im Wort enden oder beginnen, nicht als belegt. (2) Ein Wortlistentreffer, der einen reinen Namens-Treffer des Modells verlaengert ("Zoe Schulz" um das vom Modell gefundene "Schulz"), wird zugelassen und ersetzt den Modelltreffer beim Zusammenfuehren (Treffer anderer Art blockieren weiterhin). Ergebnis: Modell mit Wortlisten 0 von 860 statt 7, Realdokumente 0 statt 2 und 3.

**Fehlalarme (NEG).** Behoben (Woerterbuch/Regel): v2n01 ("Hamburger", "Tonnen"), v2n02 teilweise ("Berliner Philharmoniker", Rest siehe unten), v2n15 ("Stueck"), v2n20 im Modus fallback ("Berg Zugspitze", "Gipfel"), v2n25 ("Siehe Tabelle", "Abbildung"), v2n30 ("Nutzung", "Pseudonymen"), v2n34 ("Grad Celsius"), v2n35 ("Frankfurter Wuerstchen", "Senf"), v2n37 ("Ordner Projekte"), v2n48 ("Wiener Saengerknaben"), v2n50 ("Prise Salz"), v2n52 (Passwort ohne Doppelpunkt), v2n53 ("Bundesstrasse 27" ist keine Adresse und kein Name; Landes-, Kreis-, Staatsstrasse ebenso), v2n56 im Modus fallback ("Deutschen Einheit"). Mittel: Stoppwoerter (Tonnen, Stueck, Tabelle, Abbildung, Nutzung, Celsius, Projekte, Prise, Gipfel, Senf, Kabelbinder, Handschuhe, Deutschen, Siehe, Pseudonymen, Pseudonym, Grad, Ordner, Salz), Ortsadjektive auf -er (Stamm in der Ortsliste: Hamburger, Berliner, Frankfurter, Wiener) als erstes Wort einer Namenskette, und Gattungswoerter vor einem Eigennamen (Berg, Hotel, Pension, Gasthof, Gasthaus, Restaurant, Museum, Hafen, Insel, Gipfel; nur bei mindestens zwei Woertern). Der Fall v2n53 wurde im Text um die Ortsnamen Tuebingen und Reutlingen bereinigt (Entscheidung E-ORT, wie in Gruppe A: Ortsnamen werden maskiert, ein Negativfall darf keine enthalten). Schutzsaetze (alle ohne Maskierung): v2n39 ("Am Montag 12 Teilnehmer, am Ende 3 Seiten, im Mai 2 Kurse"), v2n41 ("Spin-Verhalten der Titan-Legierung", Wortgrenze bei PIN/TAN), v2n49 ("Passwort ist geheim zu halten", Verb ohne Wert), v2n53 ("Autobahn A 8", "Landesstrasse 1234").

**Bewusst offen (Fehlalarme).** v2n02 ("Brahms": Komponistenname ist ein Nachname, ein Ausschluss wuerde echte Personen dieses Namens freigeben), v2n13 ("Hotel" als Organisationsstichwort in den Wortlisten und der Ort Garmisch nach E-ORT), v2n21, v2n32, v2n51 (Ortsname im Firmennamen, E-ORT), v2n23 (Weblink im Codebeispiel gilt als Kennung), v2n29 ("Museum Ludwig": Ludwig ist ein Vorname; der Kontext ist ohne Satzverstaendnis nicht zuverlaessig), v2n48 ("Japan" als Land wird als Name gelesen; Laendernamen sind kein Personenbezug, eine Laenderliste ist ein eigenes Paket), mit Modell zusaetzlich v2n20 ("Berg Zugspitze") und v2n56 ("Deutschen Einheit"): das Modell erkennt sie, das Woerterbuch kann hier nicht eingreifen (Entscheidung: Modell, kein Eingriff in die Modelltreffer).

**Bewusst offen (Lecks).** (1) Diagnosemodus wortlisten (nur Regeln, kein Produktmodus): 20 Faelle, alle brauchen Namens- oder Ortswoerterbuecher (v2a03, v2a06, v2a116 bis v2a120, v2a126, v2a66, v2a111, v2a113 bis v2a115, v2a136 bis v2a138, v2a51, v2a54, v2a57, v2a87) und synthetisch 61 Namenswerte; unveraendert gegenueber C1.1 ausser den drei neuen Ortsfaellen. (2) Realdokument OCR, Dokument 5: ein Nachname, der hinter einem Zeilenumbruch steht ("Lena\nKierkegaard.", unbekannter Nachname, das Modell findet ihn nicht). Eine Regel "Vorname, Zeilenumbruch, grossgeschriebenes Wort" wuerde jede Satzanfangs-Grossschreibung hinter einem Vornamen am Zeilenende maskieren (Fehlalarme); Entscheidung: bewusst offen, erst mit Modell- oder Satzverstaendnis loesbar (Backlog fuer C1.3). (3) Backlog 5 (OCR-Toleranz in Kennzahlen: Zeichenverwechslungen wie O und 0, l und 1) und 6 (Soft-Hyphen und Zero-Width mit Offset-Abbildung) wurden nicht bearbeitet: in den Messmengen kein Fund, kein roter Fall (Backlog fuer C1.3).

**Ergebnis und Abbruchkriterium.** Die Abnahmetabelle C1 ist erfuellt (siehe "Messung C1.2" unten). Der Durchlauf beseitigte alle Lecks der Handfaelle (mit Modell 27 von 27, im Modus fallback 39 von 39, jeweils alte plus neue Menge) und der Synthetik (mit Modell 7 von 7); das Abbruchkriterium ist damit **nicht** erreicht (berichtigt nach Pruefung, siehe Nachtrag unten): Die Zeile Negativfaelle der Abnahmetabelle ist nicht erfuellt, der Fehlalarm-Rest liegt bei 8 bis 9 Faellen (vor allem Orte in Namen, Entscheidung E-ORT), und der Pruefer fand weitere Fehlalarm-Faelle. Ein dritter Durchlauf (C1.3) ist noetig. Urspruenglicher Wortlaut ("Abnahmetabelle erfuellt, dritter Durchlauf nicht noetig") ist damit zurueckgenommen.

**Referenz (Differenztest `--node`).** Alle Abweichungen gegenueber `reference-v1.8.json` stehen mit Begruendung in `tests/golden/reference-allow.json` (jetzt 77 Eintraege; neu 48, fuenf alte mit neuem Stand: w1/ga05, w1/syn12, w1/syn29, w1/syn40, ki/syn12). Geprueft je Eintrag mit altem (C1.1) und neuem Kern: (a) nur zusaetzliche Maskierung: o03, o10, ga04, ga25, ga28, gb03, gb09, gd04, ge01, n18, a07, d05, ga05 in w0/w1/ki wo betroffen; (b) Fehlalarm behoben, weniger Maskierung ohne Personenbezug: ga17, syn12, syn36 (das Wort "Standort" bzw. "Tannenberg" wird nicht mehr als Zugangsdaten maskiert; die Werte dahinter bleiben maskiert); (c) nur Wechsel der Platzhalterart oder Nummer bei gleicher Abdeckung: gc03 (die Spanne "2 Punkte in Flensburg" wird jetzt als ORT gefuehrt, weil Flensburg in der vereinigten Ortsliste mit hoher Bewertung steht und die Spanne aufnimmt), a03, a04, a09, a10, syn1, syn15, syn19, syn29, syn35, syn40 (Orte oder Adressen wie "Am Markt 3, 50667 Koeln" oder "9106 Wien" wechseln zwischen ORT und ADRESSE). Keine Stelle wird lesbar, die in der Referenz maskiert war, ausser den unter (b) genannten Fehlalarmen (das ist die Absicht).

**Baseline und Ratschen.** `tests/eval/baseline.json`: nur Verbesserungen (Handfaelle wortlisten 19 auf 12, fallback 8 auf 0, ki 2 auf 0 in der Messung); die vier Werte, die `tests/eval-v2.test.mjs` fest auf dem Stand 1.8.0 verlangt (ki: G-NAME 2, G-NATION 1, G-AUSLAND 1, synthLeaked 1), bleiben unveraendert stehen, weil diese Testdatei nicht zu den erlaubten Dateien dieses Pakets gehoert (Vorschlag fuer das naechste Paket: Test auf "hoechstens" umstellen und die Baseline auf 0 ziehen). `baseline-v2.json`: alle Kategorien verbessert ausser wortlisten V2-STANDORT 6 auf 7; die Ursache sind die drei neuen Ortsfaelle v2a136 bis v2a138, die im Diagnosemodus ohne Woerterbuch nicht loesbar sind (wie in Durchlauf 1 bei neuen Faellen); alle bisherigen Faelle sind in keinem Modus schlechter. `tests/realdocs.test.mjs`: Ratsche TXT 0, DOCX 0, PDF 0, OCR 1 (mit Modell), fallback 0; die vier Zieltests (2 Prozent, OCR 6 Prozent) sind keine `todo` mehr.

### Messung C1.2 (vorher, nachher)

| Messung | Zielwert Tabelle C1 | vorher (Beginn C1.2) | nachher |
|---|---|---|---|
| bisherige 150 positive Faelle, mit Modell | hoechstens 4 | 2 | 0 |
| bisherige 150 positive Faelle, fallback | hoechstens 12 | 8 | 0 |
| neue positive Faelle (130; jetzt 158 mit den 28 neuen), mit Modell | hoechstens 3 Prozent | 25 von 130 (19,2 Prozent) | 0 von 158 |
| neue positive Faelle, fallback | hoechstens 8 Prozent | 31 von 130 (23,8 Prozent) | 0 von 158 |
| Synthetik 98 Dokumente (860 Werte), mit Modell | hoechstens 1 Prozent | 7 (0,8 Prozent) | 0 |
| Synthetik 98 Dokumente, fallback | hoechstens 5 Prozent | 0 | 0 |
| Negativfaelle (60 + 20), Fehlalarme v2 | 0 | 20 (alle Modi) | fallback 8, mit Modell 9, wortlisten 6; Negativfaelle der ersten Menge 0 |
| Synthetik 42 Dokumente (276 Werte), mit Modell / fallback | hoechstens 1 / 11 | 0 / 0 | 0 / 0 |
| Realdokumente TXT, DOCX, PDF mit Textebene, mit Modell | hoechstens 2 Prozent | 2, 2, 3 von 97 (2,1 / 2,1 / 3,1 Prozent) | 0, 0, 0 von 97 |
| Realdokumente OCR, mit Modell | hoechstens 6 Prozent | 5 von 24 (20,8 Prozent) | 1 von 24 (4,2 Prozent) |
| Realdokumente im Modus fallback | (ohne Schwelle) | TXT 0, DOCX 0, PDF 1, OCR 4 | 0, 0, 0, 0 |

Die Zeile "Negativfaelle ... 0 Fehlalarme" der Tabelle C1 ist nicht erfuellt: von den 20 Fehlalarmen der zweiten Menge sind 12 im Modus fallback behoben, 8 sind bewusst offen (siehe oben, Entscheidungen E-ORT, Modell, Codebeispiel); die Negativfaelle der ersten Menge (20) und der Fliesstext der Synthetik haben 0 Fehlalarme in allen Modi. Alle anderen Zeilen sind erfuellt.

**Entscheidung (Berichtigung Abbruchkriterium).** Der Satz "Abnahmetabelle erfuellt, dritter Durchlauf nicht noetig" war falsch und ist berichtigt: Die Zeile Negativfaelle (0 Fehlalarme) ist nicht erfuellt, der Rest betrifft 8 Faelle im Modus fallback und 9 mit Modell, ueberwiegend Ortsnamen in Namen und Firmennamen (E-ORT, v2n13, v2n21, v2n32, v2n51), dazu v2n02, v2n23, v2n29, v2n48 und mit Modell v2n20, v2n56. Zusaetzlich liegen 14 neue Fehlalarm-Faelle (v2n61 bis v2n74, siehe unten) im Backlog fuer C1.3. Folge: C1.3 wird gestartet; das Abbruchkriterium gilt erst, wenn die Zeile Negativfaelle erfuellt ist oder jeder Rest einzeln als bewusst offen mit Begruendung steht und vom Nutzer bestaetigt ist.

### Nachtrag: Pruefer-Maengel Durchlauf 2

**Behoben (Paket C1.2, Faelle v2a159 bis v2a171, in allen Modi gruen).**

1. **Passwort-Komposita (v2a159 bis v2a164).** Das Wortgrenzen-Verbot vor den Stichwoertern der Zugangsdaten-Regel (`\b`) verhinderte Treffer in Zusammensetzungen ("Initialpasswort: ...", "Zugangspasswort lautet ...", "Kontopasswort = ..."). Das Verbot gilt jetzt nur noch fuer die kurzen oder mehrdeutigen Woerter (PIN, TAN, PUK und die uebrigen Code-Stichwoerter), nicht mehr fuer Passwort, Kennwort, Password, Passphrase. Geaendert in den vier Stichwort-Mustern (Doppelpunkt, Leerzeichen, Praeposition-Form, "ist/lautet"). Schutz bleibt: "Standort" (enthaelt "tan"), "Titan-Legierung" und die uebrigen bisherigen Negativ- und Schutzsaetze (v2n41, v2n49, v2n52, ga17, syn12, syn36) sind unveraendert gruen. Wirkung: nur zusaetzliche Maskierung von Werten hinter Passwort-Komposita.
2. **Nachnamen nach Anrede (v2a165 bis v2a171).** Die Ortsadjektiv-Regel (erstes Wort auf -er mit Stamm in der Ortsliste) und die Stoppwoerter (Senf, Salz, Ordner, Grad u. a.) verwarfen auch einen Einzelnachnamen direkt hinter Herr, Frau, Herrn, Hr., Fr. (ggf. mit Titeln): "Herr Wiener", "Frau Berliner", "Herr Hamburger", "Frau Salz", "Herr Ordner", "Herr Senf", "Frau Grad" blieben im Klartext. Jetzt wird das erste Wort nie verworfen, wenn unmittelbar davor eine Anrede steht (`hasAnredeBefore` in `okName`/`wordOk`). Ohne Anrede bleiben beide Regeln wie bisher; die Negativfaelle ("Hamburger Hafen", "Berliner Philharmoniker", "Wiener Saengerknaben", "Prise Salz", "Grad Celsius", "Ordner Projekte") haben keinen neuen Fehlalarm (Negativfaelle der ersten Menge 0, zweite Menge unveraendert 6 / 8 / 9 je Modus wortlisten / fallback / ki).

Messung nach der Behebung: Handfaelle erste Menge wortlisten 12, fallback 0, ki 0 undicht; zweite Menge (v2a01 bis v2a171) wortlisten 20, fallback 0, ki 0 undicht; Synthetik 98 Dokumente wortlisten 61 von 860, fallback 0, ki 0; Realdokumente unveraendert (TXT, DOCX, PDF 0, OCR 1). Kein Wert ist schlechter als vor der Aenderung.

**Nach C1.3 verschoben (nicht in C1.2 behoben).**

3. **Satzanfaenge "Im/Auf der/In der/Zum ... Gattungswort Zahl" als ADRESSE (Fehlalarm).** Die Regel fuer Strasse mit Praeposition und Artikel ohne Postleitzahl liest diese Saetze als Adresse. Faelle (Tupel v2n61 bis v2n68, erwartet jeweils nichts maskiert): "Im Kapitel 3 wird das Verfahren erklaert." / "Auf der Seite 3 steht die Tabelle." / "In der Klasse 5 sind 24 Kinder." / "Im Quartal 3 stieg der Umsatz." / "In der Abbildung 3 sieht man den Verlauf." / "Im Raum 12 findet die Sitzung statt." / "Auf dem Gleis 5 steht der Zug." / "Zum Schritt 2 gehoeren drei Aufgaben."
4. **Niederlaendische Postleitzahl-Regel bei Jahreszahl plus Grossbuchstaben (Fehlalarm).** Die Regel "4 Ziffern, Leerzeichen, 2 Buchstaben" liest eine Jahreszahl vor KI oder PR als Postleitzahl. Faelle: v2n69 "Seit 2023 KI Entwicklung im Haus." und v2n70 "Im Jahr 2022 PR Abteilung neu aufgebaut."
5. **Tschechische Postleitzahl, Strassenendung -ova und franzoesische Telefonform (Fehlalarme).** Faelle: v2n71 "Version 120 00 Dateien wurden geprueft." (Form "120 00" als Postleitzahl), v2n72 "Nr. 123 45 Ersatzteile liegen bereit." (gleiche Form), v2n73 "Die Casanova 5 und Innova 12 sind Produktnamen." (Endung -ova als Strasse), v2n74 "Lottozahlen 05 12 23 34 45 wurden gezogen." (Zahlenpaare als franzoesische Telefonnummer). Hinweis zum Test: `tests/eval-v2.test.mjs` verlangt fest genau 60 Negativfaelle (insgesamt 80); die 14 Faelle v2n61 bis v2n74 liegen deshalb als Tupel in `tests/eval/cases-v2.mjs` nur als Backlog (nicht in der Menge). C1.3 muss den Zaehler im Test mit diesen 14 Faellen auf 74 Negativfaelle (insgesamt 94) anheben.
7. **baseline-v2, wortlisten V2-STANDORT 6 auf 7: ausdruecklich begruendete, gelockerte Ausnahme.** Ursache sind die drei neuen Ortsfaelle v2a136 bis v2a138, die im Diagnosemodus ohne Ortswoerterbuch nicht loesbar sind; alle bisherigen Faelle sind in keinem Modus schlechter. Das ist die einzige Stelle, an der eine Baseline nicht strikt verbessert wurde. Ebenso wurde der Fall v2n53 entschaerft (Ortsnamen Tuebingen und Reutlingen aus dem Text entfernt, Entscheidung E-ORT). **Beides ist vom Nutzer zu bestaetigen.**
8. **Test-IBAN in v2a158 ist erfunden.** Die Pruefsumme stimmt, die Nummer gehoert aber zu keinem echten Konto; fuer Tests zulaessig, soll in C1.3 (oder bei der naechsten Bearbeitung des Falls) als erfundener Wert gekennzeichnet bleiben.


### Durchlauf 3 (C1.3): Fehlalarme Gattungswoerter, Abkuerzungen, Zahlenfolgen

Ausgangslage: Die 14 Fehlalarm-Faelle v2n61 bis v2n74 (Pruefer C1.2, Maengel 3 bis 5) wurden mit dem Zaehler 74 Negativfaelle in `tests/eval/cases-v2.mjs` und `tests/eval-v2.test.mjs` aufgenommen (Commit "test(C1.3): Fehlalarm-Faelle v2n61 bis v2n74") und waren in allen Modi rot. Je Fund eine Entscheidung; Behebung mit der kleinsten Regelaenderung in `app/lib/detect.js`. Alle Entscheidungen sind Entscheidung "Regel" (kein Modell- oder Woerterbucheingriff).

**v2n61, v2n62, v2n63, v2n64, v2n65, v2n66, v2n67, v2n68: Regel.** Die Strassenregel "Am/Im/Zum/Zur/Auf der/In der ... Name Zahl" ohne Postleitzahl las "Im Kapitel 3", "Auf der Seite 3", "In der Klasse 5", "Im Quartal 3", "In der Abbildung 3", "Im Raum 12", "Auf dem Gleis 5", "Zum Schritt 2" als Adresse. Die Ausschlussliste fuer das erste Wort nach der Praeposition (bisher Wochentage, Monate, Ende, Beispiel u. a.) wurde um Gattungswoerter fuer Gliederung, Zaehlung und Ort im Gebaeude erweitert: Kapitel, Seite, Klasse, Quartal, Halbjahr, Semester, Abbildung, Tabelle, Grafik, Diagramm, Folie, Zeile, Spalte, Absatz, Abschnitt, Raum, Gleis, Schritt, Etage, Stockwerk, Phase, Stufe, Runde, Lektion, Aufgabe, Uebung, Version, Paragraf, Artikel, Satz, Level, Position, Schicht. Grund: Das Gattungswort mit einer Zahl ist eine Verweisform, keine Strasse. Nicht aufgenommen wurden Woerter, die auch echte Strassennamen sein koennen (Platz, Block, Bereich, Reihe, Ring): die Strassenform "Am Platz 3" bleibt eine Adresse. Die Wortgrenze `\b` bleibt, "Raumfahrtweg 3" ist also nicht betroffen.

**v2n69, v2n70: Regel.** Die niederlaendische Postleitzahl-Regel (vier Ziffern, zwei Grossbuchstaben, Ort) las "2023 KI Entwicklung" und "2022 PR Abteilung" als Postleitzahl. Erste Fassung (Pruefer C1.3 berichtigt, siehe "Nachtrag" unten): eine Jahreszahl vor einer festen Liste von Abkuerzungen war pauschal keine Postleitzahl, ausser ein Ort aus einer 28er-Liste folgte; das liess echte Postleitzahlen wie "1990 AR Castricum" im Klartext. Stand nach dem Nachtrag: (a) Eine Jahreszahl (19xx oder 20xx) vor zwei Buchstaben, von denen mindestens einer I, O, Q, U, Y oder F ist (KI, BI, QA, AI, UX, UI, CI, OS u. a.), ist keine Postleitzahl; diese Buchstaben kommen in echten niederlaendischen Postleitzahlen nie vor. (b) Eine Jahreszahl vor einem echten Buchstabenpaar (PR, HR, ML, DB, SW, HW, VR, AR, BW, VW) ist nur dann keine Postleitzahl, wenn unmittelbar davor ein Satzwort steht (Seit, Ab, Bis, Anfang, Ende, Mitte, Stand, Jahr, Jahres, Jahre, Bereits, Schon) und kein bekannter niederlaendischer Ort folgt (Liste jetzt 42 Orte, dazu Heemstede, Bloemendaal, Zandvoort, Velsen, IJmuiden, Beverwijk, Heemskerk, Castricum, Uitgeest, Bennebroek, Overveen, Santpoort, Hillegom, Lisse). Ohne Satzwort davor bleibt die Form eine Postleitzahl. Ein Kleinbuchstaben-Wort dahinter als weitere Bedingung wurde bewusst nicht verlangt, weil im Deutschen das Folgewort gross geschrieben wird ("PR Abteilung", v2n70). Der Ortsname darf jetzt auch mit "IJ" beginnen (IJmuiden). Mit anderen Zahlen (nicht 19xx/20xx) gilt die Regel unveraendert.

**v2n71, v2n72: Regel.** Die tschechische Postleitzahl-Regel ("120 00 Praha") las "Version 120 00 Dateien" und "Nr. 123 45 Ersatzteile". Neu: kein Treffer, wenn unmittelbar davor (bis drei Leerzeichen oder Doppelpunkt) ein Stichwort fuer Nummern und Zahlenangaben steht: Version, Nr., Nummer, Nummern, Lotto, Lottozahlen, Zahlen, Gewinnzahlen, Ziehung, Artikel, Art., Build, Revision, Los, Ticket, Modell, Typ, Kapitel, Seite, Teil (als eigenes Wort; "Telefonnummer" und "Tel.-Nr." sind davon nicht betroffen). Grund: Die Form "NNN NN Wort" ist ohne Kontext mehrdeutig; mit Nummern-Stichwort davor ist sie keine Postleitzahl. Echte Adressen ("Vinohradska 12, 120 00 Praha", "Masarykova 45, 110 00 Praha 1") bleiben maskiert (v2a99, v2a144).

**v2n73: Regel.** Die tschechische Strassenregel mit der Endung -ova las "Casanova 5" und "Innova 12" als Strasse. -ova gilt jetzt nur noch bei bekannter Strassenform: (a) Namensstamm aus einer Liste ueblicher Prager und Brnoer Strassennamen (Nerud, Svobod, Pasteur, Bezruc, Masaryk, Hus, Smetan, Vodick, Karl, Leger, Wilson, Kapr, Kounic, Roosevelt, Petr u. a., auch ohne Diakritika geschrieben: "Nerudova", "Bezrucova"), (b) Adresskontext unmittelbar davor (Adresa, Adresse, Anschrift, Lieferadresse, Ulice, "Praha" oder "Brno" mit Komma, "Lieferung an <Name>,"), (c) Orientierungsnummer mit Schraegstrich ("Dlouhova 12/3"), (d) tschechische Postleitzahl oder Stadt (Praha, Brno, Ostrava, Plzen, Olomouc, Liberec) hinter der Hausnummer. Die uebrigen Endungen (-ska, -ova mit Akzent, -cka, -ni, -skeho, -eho) bleiben unveraendert. Grund: -ova ist ohne Kontext auch Teil von Produkt- und Eigennamen (Casanova, Innova, Renova, Villanova).

**Berichtigung zu v2n73 (Pruefer C1.3).** Die erste Fassung dieses Absatzes war falsch. (1) Die Stammliste war falsch geschrieben ("Neruda", "Svoboda", "Pasteurov", "Bezrucov" plus "ova" ergaben "Nerudaova" usw.); dadurch blieben "Adresa: Nerudova 12", "Praha 1, Nerudova 12", "Svobodova 12", "Pasteurova 3" und "Bezrucova 3" im Klartext, obwohl v2/main sie maskierte. (2) Die Aussage "die Stadt und ein Name davor werden weiter maskiert" stimmte nicht: "Praha 1" und "Brno" werden nicht maskiert (nur die Hausnummernzeile, jetzt wieder). (3) Weitere reale Strassen ohne Schraegstrich und ohne Postleitzahl (Vodickova, Karlova, Legerova, Wilsonova, Kaprova, Kounicova, Rooseveltova, Petrova) blieben frei; die Stammliste enthaelt jetzt die gaengigsten Prager und Brnoer Strassen. Casanova 5 und Innova 12 bleiben ohne Maskierung (v2n73). Restrisiko (bewusst): eine tschechische Strasse auf -ova mit unbekanntem Stamm, ohne Adresskontext davor, ohne Schraegstrich und ohne Postleitzahl oder Stadt dahinter wird nicht als Strasse erkannt; steht dagegen "Praha", "Brno" oder ein Adresswort davor, wird sie maskiert (auch Produktnamen wie "Brno, Innova 12").

**v2n74: Regel.** Die franzoesische Telefonform "0N NN NN NN NN" (fuenf Zahlenpaare, ohne Stichwort) las "Lottozahlen 05 12 23 34 45" als Telefonnummer. Neu: kein Treffer, wenn unmittelbar davor (bis drei Leerzeichen oder Doppelpunkt) ein Zahlenlisten-Stichwort steht: Lotto, Lottozahlen, Zahlen, Gewinnzahlen, Ziehung sowie Version, Build, Revision, Ticket, Modell, Kapitel. Grund: Zahlenpaare sind kein Merkmal einer Telefonnummer; die Form ohne Stichwort bleibt aber erhalten, weil "Rufen Sie mich unter 06 12 34 56 78 zurueck" (v2a134) eine echte Rufnummer ist.

**Berichtigung zu v2n74 (Pruefer C1.3).** Die erste Fassung nahm auch Nr., Nummer, Nummern, Teil, Typ, Seite, Los, Art. und Artikel in die Ausschlussliste auf. Das liess echte Rufnummern im Klartext: "Sie erreichen Jean unter der Nummer 06 12 34 56 78", "Bitte rufen Sie unter Nr. 06 12 34 56 78 an.", "Mobil Nr. 07 12 34 56 78", "Meine Nummer: 06 12 34 56 78". Diese neun Woerter stehen nicht mehr in der Telefon-Ausschlussliste (Leck-Schutz hat Vorrang; "Nr. 06 12 34 56 78" ist ohne weiteren Kontext eher eine Rufnummer). Die Ausschlussliste der tschechischen Postleitzahl-Regel ("Nr. 123 45 Ersatzteile", v2n72) bleibt unveraendert, weil dort "NNN NN Wort" ohne Kontext mehrdeutig ist. v2n74 braucht nur Lotto, Lottozahlen, Zahlen, Gewinnzahlen, Ziehung. Bewusste Abgrenzung: Eine Zahlenreihe mit fuehrender 0 ohne Zahlenlisten-Stichwort davor (z. B. "Gewinn 06 12 23 34 45") wird weiter als Telefonnummer maskiert. Franzoesische Telefonnummern mit "tel." und "tél." (v2a92, v2a142) sind unveraendert maskiert.

**Nachtrag Pruefer-Reparatur C1.3 (Lecks durch die Ausschlussregeln).** Ein unabhaengiger Pruefer fand, dass drei der Ausschlussregeln echte Angaben im Klartext liessen (18 neue positive Faelle v2a172 bis v2a189, vorher in allen Modi rot, jetzt gruen): (1) -ova-Strassen (v2a172 bis v2a181, siehe Berichtigung zu v2n73), (2) franzoesische Rufnummer nach Nummer-Stichwort (v2a182 bis v2a185, siehe Berichtigung zu v2n74), (3) niederlaendische Postleitzahl in Jahreszahl-Form (v2a186 bis v2a189, siehe v2n69 und v2n70). Zusaetzlich beim Messen gefunden: eine Regel mit Rueckblick ueber unbegrenzte Leerzeichen (zwei hintereinanderstehende Leerzeichen-Wiederholungen) rechnete bei 100.000 Leerzeichen zu lange (Test F5); die Rueckblicke sind auf hoechstens drei Leerzeichen begrenzt.

Restrisiko der Strassenregel mit Gattungswoertern (v2n61 bis v2n68, ausdruecklich): Strassen, die selbst ein Gattungswort sind ("Im Kapitel", "Am Gleis", "Auf der Seite", "Am Raum"), werden ohne Postleitzahl nicht mehr als Anschrift erkannt; mit Postleitzahl dahinter ("Am Gleis 5, 80331 Muenchen") bleibt die Anschrift maskiert. Restrisiko NL-Postleitzahl: nur Orte ausserhalb der Ortsliste, nur mit Buchstabenpaar PR, HR, ML, DB, SW, HW, VR, AR, BW, VW und nur mit einem Satzwort (Seit, Ab, Bis, Anfang, Ende, Mitte, Stand, Jahr u. a.) unmittelbar vor der Jahreszahl; geschaetzt grob 0,05 bis 0,1 Prozent der niederlaendischen Adressen.

Je Fall der Fehlalarm-Faelle, Stand nach dem Nachtrag:
- v2n61 ("Im Kapitel 3"): bleibt unmaskiert, weil "Kapitel" als Gattungswort nach der Praeposition ausgeschlossen ist.
- v2n62 ("Auf der Seite 3"): bleibt unmaskiert, "Seite" steht in der Gattungswort-Liste.
- v2n63 ("In der Klasse 5"): bleibt unmaskiert, "Klasse" steht in der Liste.
- v2n64 ("Im Quartal 3"): bleibt unmaskiert, "Quartal" steht in der Liste.
- v2n65 ("In der Abbildung 3"): bleibt unmaskiert, "Abbildung" steht in der Liste.
- v2n66 ("Im Raum 12"): bleibt unmaskiert, "Raum" steht in der Liste; das Restrisiko "Strasse heisst selbst Raum" gilt nur ohne Postleitzahl.
- v2n67 ("Auf dem Gleis 5"): bleibt unmaskiert, "Gleis" steht in der Liste.
- v2n68 ("Zum Schritt 2"): bleibt unmaskiert, "Schritt" steht in der Liste.
- v2n69 ("Seit 2023 KI Entwicklung"): bleibt unmaskiert, weil "KI" den in niederlaendischen Postleitzahlen unmoeglichen Buchstaben I enthaelt.
- v2n70 ("Im Jahr 2022 PR Abteilung"): bleibt unmaskiert, weil "PR" ein echtes Paar ist, aber "Jahr" unmittelbar vor der Jahreszahl steht und kein bekannter Ort folgt.
- v2n71 ("Version 120 00 Dateien"): bleibt unmaskiert, weil "Version" unmittelbar vor der tschechischen Postleitzahl-Form steht.
- v2n72 ("Nr. 123 45 Ersatzteile"): bleibt unmaskiert, weil "Nr." in der Ausschlussliste der tschechischen Postleitzahl-Regel steht (nicht in der der Telefonregel).
- v2n73 ("Casanova 5 und Innova 12"): bleibt unmaskiert, weil weder Stammliste noch Adresskontext noch Schraegstrich noch Postleitzahl vorliegen.
- v2n74 ("Lottozahlen 05 12 23 34 45"): bleibt unmaskiert, weil "Lottozahlen" unmittelbar vor der Zahlenreihe steht.

Bekannte Luecke ausserhalb dieses Zyklus (beim Pruefen aufgefallen, nicht behoben, keine rote Probe im Korpus): die allgemeine Ausschlussliste der niederlaendischen Postleitzahl-Regel (EU, EM, WM, AD, BC, DM, FC, UK, US, TV, PC, IT, CD, GB, AG, CE) gilt fuer alle Zahlen und laesst echte Postleitzahlen wie "1011 AD Amsterdam", "1000 AG Amsterdam" oder "2511 CE Den Haag" im Klartext; der Stand ist identisch mit v2/main. Vorschlag: dieselbe Ortslisten-Ausnahme wie bei den Jahreszahl-Abkuerzungen, zuerst als roter Fall.

**v2n13 (fallback, mit Modell): bewusst offen, E-ORT.** "Das Hotel Alpenblick in Garmisch ...": zwei Ursachen, "Hotel" als Organisationsstichwort der Wortlisten und der Ort Garmisch (Entscheidung E-ORT, Frage F6, Standard "weiter maskieren"). Ein Eingriff beim Stichwort Hotel allein macht den Fall nicht gruen, solange Garmisch maskiert wird; deshalb nicht geaendert (kein Eingriff ohne Wirkung). Bleibt bekannte Luecke.

**Bleibende Fehlalarme als bekannte Luecke (je Fall-Id, Entscheidung, Grund).**

| Fall-Id | Modus | Entscheidung | Grund |
|---|---|---|---|
| v2n02 | alle | bewusst offen | "Brahms" ist ein Nachname; ein Ausschluss gaebe echte Personen dieses Namens frei |
| v2n13 | fallback, ki | bewusst offen (E-ORT) | Hotel-Stichwort plus Ort Garmisch; siehe oben |
| v2n20 | ki | bewusst offen (Modell) | "Berg Zugspitze": das Modell liefert den Treffer, kein Eingriff in Modelltreffer |
| v2n21, v2n32, v2n51 | alle | bewusst offen (E-ORT) | Ortsname im Firmennamen; Frage F6 mit Standard "weiter maskieren" |
| v2n23 | alle | bewusst offen | Weblink im Codebeispiel gilt als Kennung (Leck-Schutz) |
| v2n29 | fallback | bewusst offen | "Museum Ludwig": Ludwig ist ein Vorname, ohne Satzverstaendnis nicht zuverlaessig |
| v2n48 | alle | bewusst offen | "Japan" wird als Name gelesen; eine Laenderliste ist ein eigenes Paket |
| v2n56 | ki | bewusst offen (Modell) | "Deutschen Einheit": das Modell erkennt es, kein Eingriff in Modelltreffer |

### Messung C1.3 (vorher, nachher)

Vorher = Stand nach dem Commit der 14 roten Faelle, vor jeder Regelaenderung; nachher = Ende C1.3 (`npm run eval`, `npm run eval -- --set v2`, `tests/realdocs.test.mjs`).

| Messung | Zielwert Tabelle C1 | vorher | nachher | Urteil |
|---|---|---|---|---|
| bisherige 150 positive Faelle, mit Modell | hoechstens 4 | 0 | 0 | erfuellt |
| bisherige 150 positive Faelle, fallback | hoechstens 12 | 0 | 0 | erfuellt |
| neue positive Faelle (158), mit Modell | hoechstens 3 Prozent | 0 | 0 | erfuellt |
| neue positive Faelle, fallback | hoechstens 8 Prozent | 0 | 0 | erfuellt |
| Synthetik 98 Dokumente (860 Werte), mit Modell | hoechstens 1 Prozent | 0 | 0 | erfuellt |
| Synthetik 98 Dokumente, fallback | hoechstens 5 Prozent | 0 | 0 | erfuellt |
| Negativfaelle erste Menge (20) und Fliesstext Synthetik, alle Modi | 0 | 0 | 0 | erfuellt |
| Negativfaelle zweite Menge (74), wortlisten / fallback / mit Modell | 0 | 20 / 22 / 23 | 6 / 8 / 9 | nicht erfuellt, Rest einzeln begruendet (Tabelle oben) |
| Synthetik 42 Dokumente (276 Werte), mit Modell / fallback | hoechstens 1 / 11 | 0 / 0 | 0 / 0 | erfuellt |
| Realdokumente TXT, DOCX, PDF mit Textebene, mit Modell | hoechstens 2 Prozent | 0, 0, 0 von 97 | 0, 0, 0 von 97 | erfuellt |
| Realdokumente OCR, mit Modell | hoechstens 6 Prozent | 1 von 24 (4,2 Prozent) | 1 von 24 (4,2 Prozent) | erfuellt |
| Realdokumente im Modus fallback | (ohne Schwelle) | 0, 0, 0, 0 | 0, 0, 0, 0 | - |

Lecks (alle Mengen, alle Modi): unveraendert (Handfaelle erste Menge wortlisten 12, fallback 0, ki 0 (Diagnosemodus wortlisten und Ratsche ki unveraendert); zweite Menge wortlisten 20, fallback 0, ki 0; Synthetik 42: wortlisten 18, fallback 0, ki 0; Synthetik 98: wortlisten 61, fallback 0, ki 0). Es entstand kein neues Leck; die Differenz zur Referenz 1.8.0 (`diff-reference.mjs`, beide Varianten) zeigt keine neue Abweichung durch diesen Durchlauf.

**Abbruchkriterium.** Die Schleife endet mit diesem dritten Durchlauf (hoechstens drei Durchlaeufe in 2.0). Der Durchlauf beseitigte 14 von 22 Fehlalarmen im Modus fallback (64 Prozent, weit ueber der Grenze von 10 Prozent), mit Modell 14 von 23 und im Modus wortlisten 14 von 20. Die Abnahmetabelle ist bis auf die Zeile Negativfaelle der zweiten Menge erfuellt; der Rest (8 im Modus fallback, 9 mit Modell, 6 im Diagnosemodus wortlisten) steht oben einzeln als bewusst offen mit Grund. Die Bestaetigung der Reste durch den Nutzer (Frage F6 zu E-ORT, die Standardantwort gilt bis dahin) steht aus.

**Backlog 5 und 6: nicht bearbeitet, verschoben auf nach 2.1.** (5) OCR-Toleranz in Kennzahlen (Zeichenverwechslungen O/0, l/1) und (6) Soft-Hyphen und Zero-Width mit Offset-Abbildung: in keiner Messmenge ein Fund (kein roter Fall, die OCR-Realdokumente haben kein Leck dieser Art; der einzige OCR-Rest ist der Nachname hinter einem Zeilenumbruch, Dokument 5). Ohne Fund im Korpus keine Regel auf Verdacht (Fehlalarm-Risiko).

**Referenz (Differenztest) und Ausnahme D53.** `node tests/eval/diff-reference.mjs --node` und die Electron-Variante `node tests/eval/diff-reference.mjs` enden beide mit Exit 0. Ursache des Fehlers der Electron-Variante ("ungenutzt: ki/syn12", D53): Dort laeuft das echte Modell und liefert fuer `syn12` den Span "Berliner Allee", die Referenz 1.8.0 (die der Node-Lauf einspielt) hat "Berliner Alle"; die Anschrift wird in der App als ORT statt ADRESSE gefuehrt, es wird nichts lesbar, die Abweichung hat andere Hashes als der Node-Stand, und der Eintrag `ki/syn12` blieb deshalb ungenutzt, waehrend die App-Abweichung unerlaubt blieb. Behebung: Ein Eintrag in `tests/golden/reference-allow.json` darf zusaetzlich einen genehmigten App-Stand `app` (Text-Hash, Zuordnungs-Hash, Anzahl) tragen; `compareItems` wertet ihn nur im App-Modus (Option `app`, gesetzt ohne `--node`), im Node-Modus zaehlt nur der Stand ohne `app`. Beide Staende gelten als "genutzt". Die Referenz `reference-v1.8.json` ist unveraendert.

**Baseline und Ratschen.** `tests/eval/baseline.json` und `tests/eval/baseline-v2.json` bleiben unveraendert: die Messung entspricht bereits den Ratschen (erste Menge: die vier von `tests/eval-v2.test.mjs` fest verlangten Werte ki G-NAME 2, G-NATION 1, G-AUSLAND 1, synthLeaked 1 und wortlisten synthLeaked 18 stehen weiter auf dem Stand 1.8.0, gemessen sind sie in ki 0; die Testdatei ist nicht aenderbar, Vorschlag unveraendert: auf "hoechstens" umstellen und die Baseline auf 0 ziehen); zweite Menge: NEG 6 / 8 / 9 je Modus wortlisten / fallback / ki entsprechen dem gemessenen Stand, die 14 neuen Faelle sind behoben und tragen nichts bei. `tests/golden/baseline.json` unveraendert (keine Aenderung der Golden-Ausgabe). Die Ergebnisdatei `tests/eval/out/result-v2.json` enthaelt den neuen Stand.

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

Stand nach C1.1 Durchlauf 1 (Ratsche in `tests/realdocs.test.mjs` entsprechend nach unten gezogen): TXT 2 von 97 (2,1 %), DOCX 2 von 97, PDF mit Textebene 3 von 97 (3,1 %), OCR 5 von 27 (unveraendert); Modus fallback TXT 0, DOCX 0, PDF 1, OCR 4. Verbleibende Lecks mit Modell: 19:NAME (zwei Mal, Chat-Sprecher, siehe Gruppe E), 15:IBAN (PDF), 18:TEL und 4:TEL, 5:NAME (OCR).

Stand nach C1.2 (Durchlauf 2): TXT 0 von 97, DOCX 0 von 97, PDF mit Textebene 0 von 97, OCR 1 von 24 (4,2 Prozent, Nachname hinter Zeilenumbruch, bewusst offen); Modus fallback 0, 0, 0, 0. Ratsche in `tests/realdocs.test.mjs` entsprechend gezogen, die Zieltests sind keine `todo` mehr.

## C2.w: Verknuepfung derselben Person im Kern (Platzhalter mit Endung)

`PSDetect.anonymize` ruft vor der Token-Vergabe `PSLib.coref.link` auf die Spans auf. Eine Person wird nur verknuepft, wenn ihr `personKey` gesetzt ist (D24: `null` = keine Verknuepfung, der Span laeuft wie bisher durch `tok()`) **und** mindestens zwei verschiedene Formen (`VOLL`, `NACHNAME`, `VORNAME`, `KURZ`) im Text vorkommen. Voll-Form `{{NAME_n}}`, andere Formen `{{NAME_n.NACHNAME}}`, `.VORNAME`, `.KURZ`; Eintrag im `store` je Platzhalter (Schreibweise, Typ, Farbe, Methode). Die Nummern der verknuepften Personen werden zuerst von hinten nach vorne vergeben, danach folgen die uebrigen Namen wie bisher. Gruende fuer die Abweichung von der Fassung im Plan (Nummer am ersten Auftreten jeder Person mit `personKey`): (a) Eine alleinstehende Voll-Form ohne weitere Form wird nicht umnummeriert, Dokumente ohne mehrere Formen bleiben bitgleich zu vorher; (b) ohne diese Reihenfolge nimmt ein Fehlfund wie "Webers Tasche" (vom Kern als ein Name erkannt, von `coref` als Voll-Form gelesen) die Nummer 1 vor der echten Person (Test `detect.coref`, Genitiv).

Sicherheitsregeln: (1) Vergebene Nummern meiden `{{NAME_n}}` und `{{NAME_n.…}}`, die schon im Text oder im `store` stehen; vorhandene Platzhalter bleiben unveraendert. (2) Hat ein Platzhalter schon einen Eintrag mit anderer Schreibweise ("Dr. Anna Weber" und "Anna Weber", "Müller" und "MÜLLER"), laeuft der Span wie bisher durch `tok()` und erhaelt eine eigene Nummer; die Rueckuebersetzung bleibt so exakt (kein Platzhalter steht fuer zwei Schreibweisen). (3) Enthaelt der Wert selbst Platzhalter oder fuehrenden/folgenden Leerraum, laeuft er durch `tok()`. (4) Mit uebergebenem `state` (mehrere Dokumente) wird die Nummer einer schon bekannten Voll-Form weiterverwendet.

Wirkung auf den Korpus (Vergleich mit dem Stand davor, Modus w1 und w0): Handfaelle v1 und v2 sowie Synthetik 42: **keine** Textabweichung ausser `v2/v2a116`; Synthetik 98: 20 von 98 Dokumenten (Vorlagen mit Vorname-Anrede, z. B. Zeugnis "Wir danken Anna", Chat-Verlauf mit Vornamen vor dem Vollnamen) erhalten `.VORNAME`-Platzhalter und neue Nummern. Die Referenz `reference-v1.8.json` (v1-Faelle, Synthetik 42, alle Modi) bleibt unveraendert und ohne neue Abweichung; es sind deshalb keine neuen Eintraege in `reference-allow.json` noetig. Rundlauf `deanonymize(anonymize(x)) === x` bitgleich fuer alle 1002 Laeufe (v1, v2, Synthetik 42 und 98, Golden-Beispiel, w0 und w1). Grenze: Genitivformen ("Müllers Auto") haengen weiter an der Spanerkennung (C1 Backlog Punkt 3).

## K2.fix: Woertliche Platzhalter im Originaltext

Entscheidung (Vorab-Reservierung): `anonymize` sammelt vor der Vergabe alle Platzhalter-Treffer des Eingabetexts (`PSLib.placeholder.find`) als reserviert; `tok()` und die Nummernvergabe verknuepfter Personen (`linkState`) ueberspringen sie. Ein woertlicher Platzhalter wird nie `store`-Schluessel und bleibt im Ergebnistext unveraendert stehen; `deanonymize` ersetzt ihn deshalb nicht. Die reservierte Menge steht als `state.reserved` (Liste) im state, nur wenn der Text ueberhaupt Platzhalter enthaelt (ohne woertliche Platzhalter bleibt state `{ store, cnt }` und die Ausgabe bitgleich). `deanonymize` braucht `reserved` nicht, es arbeitet allein mit `store`.

Mehrere Dokumente: `PSLib.project.run` (gemeinsamer state) durchsucht vorab alle Dokumente und uebergibt die Vereinigungsmenge als `opts.reserved`; so vergibt kein Dokument einen Platzhalter, der in einem anderen woertlich steht. Bei direkter state-Weitergabe ohne Vorabsuche (zweiter Aufruf mit demselben state) gilt: bereits reservierte Platzhalter frueherer Dokumente werden nie vergeben. Steht ein woertlicher Platzhalter im neuen Text aber schon als `store`-Schluessel eines frueheren Dokuments, wird er im Ergebnis durch einen frischen Schluessel ersetzt, dessen `store`-Wert der woertliche Platzhaltertext ist (`m: "wortlich"`). Nur so stellt `deanonymize` beide Dokumente exakt wieder her. Folge: Die Zuordnung enthaelt dann einen Eintrag, dessen Wert selbst ein Platzhalter ist; er ist kein erkannter Fund.

Grenze: Eine alte `.psmap`, die mit dem Fehler erzeugt wurde, laesst sich nicht heilen. Ein reservierter Platzhalter ohne Zuordnung (z. B. `{{EMAIL_7}}`) verbraucht nur eine Nummer.

## C2.fix: Gegenhinweise gegen Fehlverknuepfung (K3, Erweiterung von D24)

Entscheidung: Ein gleicher Nachname ist kein Beleg fuer dieselbe Person. `PSLib.coref.link` liest den Text um jeden Span und setzt `personKey` auf `null` (Span laeuft wie bisher durch `tok()`, eigene Nummer, kein Endungs-Platzhalter), wenn ein starker Gegenhinweis vorliegt. Die Pruefung gilt je Span, nicht je Person: bei "Frau Anna Weber ... Herr Weber ... Frau Weber" bleibt nur "Herr Weber" unverknuepft. VOLL-Formen behalten immer ihren Schluessel. Gegenhinweise: (1) Anrede-Konflikt: Anrede im Span oder unmittelbar davor (Herr/Herrn/Hr. gegen Frau/Fr./Frl., ein Titel dazwischen ist erlaubt) steht gegen die Anrede der VOLL-Person; Anrede nur auf einer Seite ist kein Konflikt; gilt auch fuer die Initial-Kurzform ("Herr A. Weber"). (2) Beziehungswort (Ehemann, Ehefrau, Ehepartner(in), Gatte, Gattin, Bruder, Schwester, Vater, Mutter, Sohn, Tochter) in den bis zu drei Woertern vor dem Span, nicht ueber ein Satzende hinweg (Komma und "von" stoeren nicht). (3) Generationszusatz junior/jun./senior/sen. unmittelbar nach dem Span. Bei Unsicherheit gilt D24 (keine Verknuepfung). Der Rundlauf bleibt exakt; die Erkennungsmessung (`npm run eval`) ist unveraendert.

Praezisierung nach Pruefung: (a) Gelesen wird nur ein Fenster von 150 Zeichen vor und 60 Zeichen nach dem Span (Laufzeit linear; 10000 Spans unter 0,1 s). (b) Satzgrenze fuer das Beziehungswort: Satzzeichen plus Leerraum (nicht nach Titelkuerzeln wie Dr., Prof.) oder Absatzumbruch (Leerzeile). (c) Generationszusatz (junior, senior, jun., sen., Jr., Sr.) nur in derselben Zeile; ausgeschrieben nur, wenn danach kein Grossbuchstabe folgt ("Weber Senior Partner" ist kein Zusatz). Bei ausgeschriebenen Namen gehoert der Zusatz zum Schluessel: "Hans Weber senior" und "Hans Weber junior" sind zwei Personen, alleinstehendes "Weber" oder "Hans" bleibt dann unverknuepft (gleiche Schreibweise teilt weiter den Platzhalter ueber `tok()`, der Zusatz bleibt im Text sichtbar). (d) Apposition: "Herr Weber, der Ehemann von Anna Weber" (Komma, Beziehungswort, von/des/der unmittelbar nach dem Span) trennt den Span von Anna Weber.

Bewusste Grenzen (nicht erfasst): Partner und Kollege(in) sind keine Beziehungswoerter ("Partner Weber" in Kanzleien, "Kollegin Weber" kann dieselbe Person sein). "Anna Weber ... Herr Weber" (Anrede nur auf einer Seite, hier gegen den weiblichen Vornamen) bleibt verknuepft; der Anrede-Konflikt gilt nur zwischen zwei ausdruecklichen Anreden. Beziehungswoerter ausser der Liste (Lebensgefaehrte, Schwager, Onkel usw.) und Hinweise weiter als drei Woerter vor dem Span werden nicht erkannt. Generationszusaetze vor dem Nachnamen oder in anderer Form (Weber der Aeltere, II.) werden nicht erkannt. Die Beziehungswort-Pruefung nach dem Span kennt nur die Apposition mit Komma.
