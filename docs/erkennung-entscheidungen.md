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
Stand der Messung: C1.1 Endstand Durchlauf 1

| Modus | Luecken Handfaelle (von 130) | Fehlalarme (NEG von 60) | Synthetik undicht (von 860) |
|---|---|---|---|
| wortlisten | 44 | 20 | 61 |
| fallback | 31 | 20 | 0 |
| ki | 25 | 20 | 7 |

### Modus wortlisten

* Fehlalarme (NEG): v2n01 v2n02 v2n13 v2n15 v2n20 v2n21 v2n23 v2n25 v2n29 v2n30 v2n32 v2n34 v2n35 v2n37 v2n48 v2n50 v2n51 v2n52 v2n53 v2n56
* V2-ART10: v2a78
* V2-ART9: v2a66 v2a67 v2a69
* V2-AUSLAND: v2a92 v2a94 v2a95 v2a96 v2a97 v2a99
* V2-FORM: v2a81 v2a83 v2a84 v2a86 v2a87
* V2-GERAET: v2a30
* V2-IDENT: v2a03 v2a06 v2a116 v2a117 v2a118 v2a119 v2a120 v2a126
* V2-KONTAKT: v2a12 v2a15 v2a19 v2a20
* V2-NUMMER: v2a45
* V2-PERSON: v2a51 v2a54 v2a57
* V2-SECRET: v2a101 v2a103 v2a104 v2a105 v2a109 v2a110
* V2-STANDORT: v2a35 v2a39 v2a111 v2a113 v2a114 v2a115
* Synthetik je Typ (undicht/gesamt): NAME 61/191
* Synthetische Lecks einzeln (Vorlage, Dokument-Nr, Typ, noch lesbares Fragment; nur die zusaetzlich zu fallback):
  * zeugnis #0 NAME: Matthias
  * gespraechsprotokoll #2 NAME: Ömer
  * csvexport #4 NAME: Ralf | Zimmermann
  * chatverlauf #5 NAME: Thomas
  * chatverlauf #5 NAME: Lena
  * rechnung_positionen #7 NAME: Dieter | Bärtschi
  * schadensmeldung_lang #13 NAME: Lukas | Zimmermann
  * zeugnis #14 NAME: Anna | Schäfer
  * mietvertrag #15 NAME: Birgit | Farsi | Al-Farsi
  * gespraechsprotokoll #16 NAME: Katharina | Obermaier
  * chatverlauf #19 NAME: Birgit | Lüdenscheidt
  * chatverlauf #19 NAME: Zoë | Schulz
  * rechnung_positionen #21 NAME: Lena | Yıldız
  * arztbrief_lang #25 NAME: Farsi | Al-Farsi
  * zeugnis #28 NAME: Nadine | Farsi | Al-Farsi
  * zeugnis #28 NAME: Farsi | Al-Farsi
  * mietvertrag #29 NAME: Anna | Wagner
  * gespraechsprotokoll #30 NAME: Çağlar
  * emailverlauf #31 NAME: Fatima | Bärtschi
  * csvexport #32 NAME: Karl-Heinz | Kowalski
  * csvexport #32 NAME: Jürgen | Neumann
  * csvexport #32 NAME: José | Krüger
  * chatverlauf #33 NAME: Søren
  * chatverlauf #33 NAME: Fatima
  * rechnung_positionen #35 NAME: Çağlar | Schäfer
  * kuendigung_lang #40 NAME: Çağlar | Richter
  * schadensmeldung_lang #41 NAME: Ömer | Yıldız
  * zeugnis #42 NAME: Lena | Obermaier
  * zeugnis #42 NAME: Karl-Heinz | Obermaier
  * mietvertrag #43 NAME: Çağlar | Schulz
  * gespraechsprotokoll #44 NAME: Dieter
  * csvexport #46 NAME: Birgit | Weber | Schmidt-Weber
  * csvexport #46 NAME: Petra | Lechner | Aigner-Lechner
  * chatverlauf #47 NAME: Petra
  * chatverlauf #47 NAME: Petra
  * rechnung_positionen #49 NAME: Anna | Wagner
  * schadensmeldung_lang #55 NAME: Matthias | Hoffmann
  * zeugnis #56 NAME: Sabine | Kowalski
  * mietvertrag #57 NAME: Dieter | Bärtschi
  * gespraechsprotokoll #58 NAME: Nadine | Lechner | Aigner-Lechner
  * gespraechsprotokoll #58 NAME: Ralf | Bauer
  * emailverlauf #59 NAME: Marlene | Wagner
  * emailverlauf #59 NAME: Anna | Hoffmann
  * csvexport #60 NAME: Thomas | Zimmermann
  * csvexport #60 NAME: Mohammed | Schulz
  * chatverlauf #61 NAME: Florian
  * chatverlauf #61 NAME: Ömer
  * schadensmeldung_lang #69 NAME: Katharina | Voigt
  * schadensmeldung_lang #69 NAME: Thomas | Lechner | Aigner-Lechner
  * zeugnis #70 NAME: Tobias
  * gespraechsprotokoll #72 NAME: Çağlar | Becker
  * chatverlauf #75 NAME: Dieter
  * chatverlauf #75 NAME: Marlene
  * arztbrief_lang #81 NAME: Krüger
  * arztbrief_lang #81 NAME: Oliver | Krüger
  * zeugnis #84 NAME: Thomas | Dvořák
  * gespraechsprotokoll #86 NAME: Anna | Yilmaz
  * csvexport #88 NAME: Ralf | Hartmann
  * chatverlauf #89 NAME: Nadine | Farsi
  * chatverlauf #89 NAME: Birgit
  * rechnung_positionen #91 NAME: Zoë | Kowalski

### Modus fallback

* Fehlalarme (NEG): v2n01 v2n02 v2n13 v2n15 v2n20 v2n21 v2n23 v2n25 v2n29 v2n30 v2n32 v2n34 v2n35 v2n37 v2n48 v2n50 v2n51 v2n52 v2n53 v2n56
* V2-ART10: v2a78
* V2-ART9: v2a67 v2a69
* V2-AUSLAND: v2a92 v2a94 v2a95 v2a96 v2a97 v2a99
* V2-FORM: v2a81 v2a83 v2a84 v2a86 v2a87
* V2-GERAET: v2a30
* V2-KONTAKT: v2a12 v2a15 v2a19 v2a20
* V2-NUMMER: v2a45
* V2-PERSON: v2a51 v2a57
* V2-SECRET: v2a101 v2a103 v2a104 v2a105 v2a109 v2a110
* V2-STANDORT: v2a35 v2a39 v2a111
* Synthetik je Typ (undicht/gesamt): keine
* Synthetische Lecks einzeln (Vorlage, Dokument-Nr, Typ, noch lesbares Fragment):

### Modus ki

* Fehlalarme (NEG): v2n01 v2n02 v2n13 v2n15 v2n20 v2n21 v2n23 v2n25 v2n29 v2n30 v2n32 v2n34 v2n35 v2n37 v2n48 v2n50 v2n51 v2n52 v2n53 v2n56
* V2-ART10: v2a78
* V2-ART9: v2a67 v2a69
* V2-AUSLAND: v2a92 v2a94 v2a96 v2a99
* V2-FORM: v2a83 v2a84 v2a86
* V2-GERAET: v2a30
* V2-IDENT: v2a117
* V2-KONTAKT: v2a12 v2a15 v2a19 v2a20
* V2-NUMMER: v2a45
* V2-SECRET: v2a101 v2a103 v2a104 v2a105 v2a109 v2a110
* V2-STANDORT: v2a35 v2a39
* Synthetik je Typ (undicht/gesamt): NAME 7/191
* Synthetische Lecks einzeln (Vorlage, Dokument-Nr, Typ, noch lesbares Fragment):
  * chatverlauf #19 NAME: Birgit
  * chatverlauf #19 NAME: Zoë
  * chatverlauf #33 NAME: Fatima
  * zeugnis #42 NAME: Obermaier
  * zeugnis #42 NAME: Karl-Heinz | Obermaier
  * mietvertrag #43 NAME: Çağlar | Schulz
  * chatverlauf #89 NAME: Birgit

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

**Referenz (Differenztest `--node`):** 22 erklaerte Abweichungen in `tests/golden/reference-allow.json` (w1: n12, n23, d03, ga09, ga22, ga24, ge04, syn0, syn4, syn11, syn12, syn13, syn27, syn29, syn30, syn34, syn40, syn41, golden-sample; w0, w1, ki: syn28). Pruefung je Eintrag mit altem und neuem Kern: ausschliesslich zusaetzliche oder verlaengerte Maskierung (neue Orts-/Namenstreffer, Zusatzteile von Namen), keine Stelle verliert eine Maskierung.

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
