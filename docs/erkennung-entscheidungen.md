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

Jede Fall-Id der Liste "Offene Luecken" hat hier eine Zeile: Modi, in denen sie noch offen ist, Entscheidung ("geht nach C1.2: Regel/Woerterbuch/Modell" oder "bewusst offen" mit Grund), Grund. "alle" heisst wortlisten, fallback und ki. Die Fälle der Gruppen A bis E, die geschlossen wurden, stehen in den Abschnitten oben.

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
