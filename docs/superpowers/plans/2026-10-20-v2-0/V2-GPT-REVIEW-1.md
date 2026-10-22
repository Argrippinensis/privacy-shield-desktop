# V2-GPT-REVIEW-1: Unabhaengige Pruefung durch ChatGPT (2026-10-22), UNGEPRUEFT

Herkunft: ChatGPT mit GitHub-Zugriff, nur lesend (Prompt: `~/gpt-review-prompt-privacyshield-v2.md`). Der Nutzer hat den Bericht am 2026-10-22 im Chat eingefuegt.
**Status: jede Aussage ist eine Behauptung eines Dritten und muss vor Uebernahme verifiziert werden** (roter Test zuerst; was sich nicht reproduzieren laesst, wird mit Begruendung gestrichen). Beachte: ChatGPT sah den Plan-Branch nur bis Stand 456ccec; D26 bis D33 waren dort teils nicht sichtbar. Seine Nummerierung (z. B. "D28 = HTML-Zeilenlimit") stimmt deshalb nicht mit unserem Protokoll ueberein. Gepruefter Stand von ChatGPT: v2/main `ceaa728918fcce9545e618be62e3a759e9e73f17` (vor C1.x bis C3.w), CI-Lauf 39845315926.

Triage-Regel fuer die neue Sitzung: Funde der Klasse "kritisch" (K1, K2, K4, E1, S2, S3) vor allen weiteren Oberflaechenpaketen (D1.w1 usw.) pruefen, weil sie Zustandsuebergaenge betreffen, auf denen diese Pakete aufbauen.

---

## Original-Bericht (Wortlaut, gekuerzt nur um Formatierung)

### 0. Zusammenfassung
Quelltextpruefung mit isolierten Gegenproben; kein vollstaendiger Electron-, Installations- oder Plattformtest.
1. K1 kritisch: Nach einer Projektkorrektur koennen sichtbarer Text, ZIP-Inhalt und Zuordnung widerspruechlich sein.
2. E1 kritisch: Akzeptierte manuelle Markierungen bleiben bei bestimmten Unicode-Zeichen wirkungslos.
3. K2 kritisch: Bereits im Original vorhandene Platzhalter koennen die exakte Rueckuebersetzung zerstoeren.
4. K3 hoch: Die Koreferenz verbindet nachweislich zwei unterschiedliche Personen.
5. K4 kritisch: "Zuordnung gespeichert" wird vor einer bestaetigten Speicherung gesetzt.
6. S1 hoch: Manipulierte ZIP-Groessen umgehen den vorgeschalteten Entpackschutz.
7. S2 hoch: Zuruecksetzen und Dokumententfernung bereinigen den Projektzustand nicht durchgaengig.
8. S3 hoch, Ausnutzung noch zu bestaetigen: Eigene Variablennamen gelangen ungefiltert in HTML; ein Weg zum Systembrowser besteht.
9. Q1 hoch: Erklaerte Referenzabweichungen erlauben auch spaetere, ganz andere Verschlechterungen.
10. Q2 hoch: Die Leckmessung uebersieht Teilreste und kann Importverluste als erfolgreiche Entfernung mitzaehlen.
Empfehlung: noch nicht veroeffentlichungsreif. Zuerst die kritischen Zustands- und Rundlauffehler beheben, Sicherheitsbefunde schliessen bzw. verifizieren und die Messverfahren verschaerfen.

### 1. Pruefumfang und Luecken (von ChatGPT)
Nicht vollstaendig geprueft: alle 79 Dateien, alle Erkennungsregeln und Woerterbuecher, alle Testdateien, das gebuendelte KI-Modell, Installer und Binaerdateien. Keine vollstaendige Bedienung der gestarteten App, keine Screenreader-, Kontrast-, macOS- oder Windows-Installationspruefung, keine unabhaengige kryptografische Begutachtung, keine vollstaendige Lizenzpruefung. Ausgefuehrt wurden ausschliesslich Gegenproben im Arbeitsspeicher (reine Module, ausgewaehlte unveraenderte UI-Funktionskoerper mit DOM-Stellvertretern, ein begrenzter ZIP-Versuch mit der zur Lockdatei passenden JSZip-Version). Stand: v2/main ceaa728, main und v1.8.0 = a6acfff, PR Nr. 4 (142 Commits, 79 Dateien, +27.939/-2.562), plan/v2-0 456ccec, CI-Lauf 39845315926 erfolgreich gemeldet. Codezeilen beziehen sich auf ceaa728; "HTML" = app/privacy-shield.html.

### 2. Funde

**K1 - Projektkorrektur kann Klartext exportieren und Personen vertauschen.** Schwere kritisch; belegt durch Quelltext und isolierte Ablaufprobe. Fundstellen: HTML:2406-2491, 3195-3233, 2527-2575.
Szenario: Zwei Dokumente gemeinsam verarbeitet: (1) "Kontakt: anna.beispiel@example.invalid." (2) "Kontakt: ben.beispiel@example.invalid. Notiz: Zwiebelbaum." Zunaechst EMAIL_1 fuer Anna, EMAIL_2 fuer Ben. Danach wird im zweiten Dokument "Zwiebelbaum" manuell markiert und erneut anonymisiert.
Erwartet: korrigierter Projekttext und weiterhin passende gemeinsame Zuordnung.
Tatsaechlich in der Gegenprobe: Der sichtbare zweite Text enthaelt EMAIL_1 und NAME_1. anonCore() hat die gemeinsame Zuordnung zurueckgesetzt, waehrend prjRes beide alten Ergebnisse behaelt. Der ZIP-Export verwendet diese alten Ergebnisse. Die Zuordnung enthaelt nun EMAIL_1 -> ben...; die Rueckuebersetzung des ersten Dokuments liefert Bens Adresse. Im zweiten Export bleibt EMAIL_2 unaufgeloest und "Zwiebelbaum" unmaskiert. Die erneute Gegenpruefung protokolliert Funde, verhindert den Export aber nicht.
Auswirkung: Leck, Verwechslung zweier Personen, unbrauchbare Rueckuebersetzung.
Vorschlag: Projektergebnisse, Entscheidungen und Zuordnung als zusammengehoerige Revision verwalten. Nach jeder Aenderung entweder das gesamte Projekt konsistent neu berechnen oder Ergebnisse als veraltet sperren. Export nur bei uebereinstimmender Revision. Aufwand L, Risiko hoch.

**E1 - Manuelle Markierungen scheitern an der Normalisierung.** Schwere kritisch; belegt, reproduziert. Fundstellen: marks.js:25-46, detect.js:2345-2348 und 2422-2430, HTML:3113-3125, 3211-3217.
Szenario: Der Nutzer markiert einen vertraulichen Wert mit geschuetztem Leerzeichen (Q Z) oder Vollbreitenbuchstaben (QZ in Vollbreite). marks.add() akzeptiert beide. toCvars() baut das Muster aus dem unveraenderten Original. Der Erkennungskern ersetzt vor der Suche aber das geschuetzte Leerzeichen bzw. die Vollbreitenbuchstaben; das Muster passt nicht mehr. Beide Werte blieben unveraendert; die ASCII-Kontrolle "Zwiebelbaum" wurde maskiert. Auch mit aktiven Wortlisten blieben die Zielwerte stehen. Die Gegenpruefung verwendet dieselbe Kombination aus Markierungsmuster und Normalisierung und ist keine unabhaengige Absicherung.
Auswirkung: Eine bewusste menschliche Korrektur kann ohne Fehlermeldung wirkungslos bleiben.
Vorschlag: Manuelle Markierungen als Originalspannen verarbeiten oder Muster und Suchtext konsistent normalisieren, waehrend Originalzeichen fuer die Rueckuebersetzung erhalten bleiben. Zusaetzlich: Jede akzeptierte Markierung muss tatsaechlich abgedeckt sein. Aufwand M, Risiko mittel.

**K2 - Literale Platzhalter im Original zerstoeren den Rundlauf.** Schwere kritisch; belegt, reproduziert; Ergaenzung zur dokumentierten Platzhalterkollision. Fundstellen: detect.js:2365-2378, 2442-2444, 2519-2525.
Eingabe: "Kontakt: test.person@example.invalid. Bereits vorhanden: {{EMAIL_1}}." Erwartet deanonymize(anonymize(x)) === x. Tatsaechlich: Der neue E-Mail-Platzhalter heisst ebenfalls {{EMAIL_1}}; die Rueckuebersetzung ersetzt beide Vorkommen durch die Adresse, der urspruenglich woertliche Platzhalter geht verloren. Die neue Verknuepfungslogik reserviert vorhandene NAME_n-Nummern; die allgemeine Tokenvergabe beruecksichtigt vorhandene Tokens im Eingabetext nicht entsprechend.
Auswirkung: Veraenderung des Originalinhalts, besonders bei bereits bearbeiteten Texten, Vorlagen und eingefuegten KI-Antworten.
Vorschlag: Vor der Vergabe alle vorhandenen Platzhalter reservieren, fuer alle Kategorien und den gesamten Projektumfang. Bereits zugeordnete Tokens und woertliche Zeichenfolgen eindeutig behandeln. Bestehende .psmap-Dateien als Kompatibilitaetsfaelle mitpruefen. Aufwand M, Risiko hoch.

**K3 - Koreferenz setzt Namenseindeutigkeit mit Personeneindeutigkeit gleich.** Schwere hoch; belegt, reproduziert; Entwurfsfrage zu D24 und C2. Fundstellen: coref.js:44-87, Plan C2:70-83.
Eingabe: "Frau Anna Weber kommt. Ihr Ehemann Herr Weber wartet." Erwartet: zwei Personen bzw. keine automatische Verknuepfung. Tatsaechlich: "Frau {{NAME_1}} kommt. Ihr Ehemann Herr {{NAME_1.NACHNAME}} wartet." Die Regel findet genau eine ausgeschriebene Person namens Weber und ordnet ihr den alleinstehenden Nachnamen zu; der Beziehungshinweis auf eine andere Person wird nicht beruecksichtigt.
Auswirkung: Der anonymisierte Text vermittelt eine falsche Personenidentitaet. Die mechanische Rueckuebersetzung kann korrekt sein; ein Rundlauftest entdeckt den Fehler nicht.
Vorschlag: Starke Hinweise auf verschiedene Personen als Ausschluss behandeln und bei Unsicherheit personKey: null verwenden. In der Pruefansicht eine Verknuepfung sichtbar und trennbar machen. Die C2-Spezifikation erweitern. Aufwand M, Risiko mittel.

**K4 - "Gespeichert" bedeutet derzeit nur "Download angestossen".** Schwere kritisch; vorzeitige Zustandsaenderung im Quelltext belegt; Betriebssystem-Fehlerpfade nicht praktisch ausgefuehrt. Fundstellen: HTML:3393-3407, 3446-3484, 2573-2575 und 3280-3282; tests/helpers.mjs:83-94.
Szenario: Eine Zuordnung wird exportiert, der Download/Schreibvorgang scheitert anschliessend oder wird abgebrochen; danach wird das Fenster geschlossen. Erwartet: ohne bestaetigte Speicherung bleibt die Zuordnung "ungespeichert". Tatsaechlich: dl() loest lediglich a.click() aus. Unmittelbar danach setzt der Aufrufer mapSaved = true und meldet Erfolg. Eine Rueckmeldung ueber den Schreibabschluss gibt es in diesem Weg nicht; die Schliesspruefung vertraut dem Merker. Die Download-Testhilfe ersetzt den Ankerklick durch das Einsammeln eines Blobs und prueft nur die Dateierzeugung.
Auswirkung: Verlust der einzigen Zuordnung nach einem fehlgeschlagenen Export.
Vorschlag: Speicherung ueber einen bestaetigten Hauptprozess-Auftrag; Erfolg erst nach abgeschlossenem Schreiben melden. Den Gespeichert-Merker an die tatsaechlich gespeicherte Zustandsrevision binden. Aufwand M, Risiko mittel.

**S1 - ZIP-Schutz vertraut angreifbaren Groessenangaben.** Schwere hoch; belegt durch begrenzten Versuch; kein grosser Speichererschoepfungsangriff ausgefuehrt. Fundstellen: formats.js:57-77, officefmt.js:44-46, HTML:2584-2614; Entscheidungen:43-44.
Szenario: Ein komprimierter Office-Eintrag enthaelt wesentlich mehr Daten, als sein ZIP-Zentralverzeichnis behauptet. In der Gegenprobe: ein ca. 4,2 KB grosses Archiv enthielt einen 4-MiB-Eintrag mit deklarierter Groesse 32 Byte. formats.guard() akzeptierte es. JSZip entpackte 4.194.304 Byte und meldete erst danach den Groessenwiderspruch (JSZip-Code entsprach der Pruefsumme der Lockdatei). guard() begrenzt deklarierte Groessen; die spaetere .async('string')-Verarbeitung hat kein eigenes Budget fuer tatsaechlich entpackte Bytes.
Auswirkung: Die vorgeschaltete Schutzgrenze kann umgangen werden. Groessere Varianten koennen Ressourcen erschoepfen; ein App-Absturz wurde nicht nachgewiesen.
Vorschlag: Tatsaechliche entpackte Bytes pro Eintrag und insgesamt waehrend des Entpackens begrenzen. Verarbeitung isolieren und abbrechbar machen. Headerpruefung zusaetzlich behalten. Aufwand L, Risiko mittel. Rueckfrage an die bewusste P0/B2-Entscheidung.

**S2 - Zuruecksetzen und Entfernen lassen Projektinformationen weiter erreichbar.** Schwere hoch; Zuruecksetzen reproduziert; zusaetzlicher Exportweg durch Quelltext belegt. Fundstellen: HTML:3486-3502, 2394-2422, 2481-2491, 3401, 3446-3457.
Szenario A: Projekt verarbeiten, "Alles zuruecksetzen" bestaetigen, dann einen noch vorhandenen Listeneintrag oeffnen. Erwartet: nicht mehr zugaenglich. Tatsaechlich: store und Textfelder werden geleert, prj, prjRes und manuelle Markierungen bleiben. In der Gegenprobe blieben zwei Dokumente und zwei Ergebnisse; prjShow() brachte den Originaltext wieder ins Eingabefeld; die Zuordnung war leer.
Szenario B (Ergaenzung zu D32): Nach Entfernen eines Dokuments begrenzt der ZIP-Weg die Zuordnung mit prjScope(). Der separate .psmap-Export verwendet weiterhin den gesamten store; ebenso der CSV-Export. Werte entfernter Dokumente koennen dort enthalten bleiben.
Auswirkung: Wiederanzeige und Weitergabe alter Daten, Ergebnisse ohne passende Zuordnung; geht ueber die bekannte Speicherretention des Erkennungscaches hinaus.
Vorschlag: Einen gemeinsamen Sitzungs-/Projektabschluss und einen einheitlichen Exportumfang definieren; alle Exportwege verwenden denselben aktuellen Dokumentbestand. Aufwand M, Risiko mittel.

**S3 - HTML-Einschleusung ueber eigene Variablennamen.** Schwere hoch; ungefilterter HTML-Pfad belegt; vollstaendige Skriptausfuehrung und Datenabfluss Vermutung. Fundstellen: HTML:2242-2275, main.js:79-90 und 139-168. Bereits in 1.8.0 vorhanden: app/privacy-shield.html:3510-3526 am Referenzcommit.
Szenario: Eine Person uebernimmt einen fremden Variablennamen. Schon <b>TEST</b> gelangt nach Grossschreibung als HTML in innerHTML statt als woertlicher Kategoriename. Die Namensbehandlung entfernt keine Markup-Zeichen. Problem: Die CSP erlaubt Inline-Skripte. Zusaetzlich reicht die Fenster-/Navigationsbehandlung beliebige HTTPS-Adressen an shell.openExternal() weiter. Deshalb ist eine Kette aus eingeschleustem Ereignishandler und Oeffnen einer URL mit Dokumentdaten zu pruefen; die Renderer-Netzsperre allein deckt einen Aufruf des Systembrowsers nicht ab. Grenze: keine automatische Ausnutzung allein durch Oeffnen eines Dokuments nachgewiesen; erforderlich waere die Uebernahme eines praeparierten Variablennamens.
Vorschlag: Namen strikt validieren und ausschliesslich mit textContent einsetzen. Externe Links auf tatsaechlich benoetigte Ziele begrenzen. Test zunaechst mit harmlosem Ereignismarker und blockiertem externem Oeffnen. Aufwand S (HTML-Pfad), M (Linkbehandlung).

**Q1 - Referenzausnahmen sind dauerhafte Freibriefe fuer ganze Faelle.** Schwere hoch; belegt, Comparator-Gegenprobe; Entwurfsfrage. Fundstellen: diff-reference.mjs:15-34, detect.differential.test.mjs:15-40, reference-allow.json:2-5.
Szenario: Eine verbesserte Maskierung fuer w1/n12 wird einmal genehmigt; spaeter gibt derselbe Fall versehentlich Klartext oder eine leere Zuordnung zurueck. Tatsaechlich: Die Ausnahme wird nur anhand von Modus und Fall-ID erkannt; der Comparator akzeptierte auch andere Ausgabe-/Zuordnungshashes und sogar einen fehlenden Fall ohne unerlaubte Abweichung. Der Unit-Differenztest erlaubt bei freigegebenen Faellen ebenfalls beliebige spaetere Ausgabeaenderungen.
Vorschlag: Unveraenderte 1.8-Referenz behalten und je Ausnahme den genehmigten neuen Text-/Zuordnungshash festhalten. Fehlende Faelle niemals ueber dieselbe Ausnahme freigeben. Aufwand M, Risiko niedrig.

**Q2 - Leckmessung verwechselt "Fragment fehlt" mit "Wert sicher entfernt".** Schwere hoch; belegt, Messfunktion mit Gegenbeispiel ausgefuehrt. Fundstellen: run-eval.mjs:38-55, realdocs.test.mjs:104-138 (auch 15, 23, 165-176).
Szenario: Erwartetes Fragment anna.beispiel@example.invalid; die Ausgabe enthaelt noch "anna.beispiel{{EMAIL_1}}". Die Messfunktion meldete null Lecks, weil nur das vollstaendige Fragment mit includes() gesucht wird. Zusaetzliche Teilfragmente koennen einzelne Faelle retten, sind aber keine allgemeine Absicherung. Bei den Dokumenttests genuegt, dass 90 % der erwarteten Werte den Import ueberstehen; die Leckquote zaehlt ueber die urspruenglichen Werte, sodass verlorene oder durch OCR veraenderte Werte als "nicht mehr vorhanden" erscheinen koennen.
Vorschlag: Entitaetsspannen und deren Abdeckung messen, relevante Teilreste gesondert pruefen, Extraktionsqualitaet separat ausweisen. Fuer verlustfreie synthetische Textformate vollstaendige Extraktion verlangen. OCR-Abweichungen als eigene Fehlerklasse. Aufwand M.

**A1 - Die geplante Abnahme deckt das verlangte WCAG-2.2-AA-Ziel nicht ab.** Schwere mittel; belegt; Spezifikationsbefund. Fundstelle: V2-D-bedienung.md:49-69.
Der Plan nennt WCAG 2.1 AA, verwendet Tags bis wcag21aa und erlaubt im Gesamtlauf verbleibende moderate/minor-Befunde. Eine Werkzeug-Schwereklasse ist kein Konformitaetsniveau: AA verlangt die Erfuellung aller anwendbaren A- und AA-Kriterien; WCAG 2.2 ergaenzt u. a. nicht vollstaendig verdeckten Fokus und Zielgroessen.
Vorschlag: Zielversion und Abnahmematrix auf 2.2 AA aktualisieren; automatisierte Befunde nach Erfolgskriterium bewerten, manuelle Tastatur-, Screenreader-, Fokus- und Vergroesserungspruefungen ergaenzen. Aufwand M.

### 3. Bedienbarkeitsideen
1. Export an einen ueberpruefen Projektstand binden: nach einer Aenderung "Ergebnisse veraltet - Projekt erneut pruefen" anzeigen und Export sperren (K1).
2. Manuelle Maskierung unmittelbar bestaetigen: den tatsaechlich ersetzten Bereich zeigen; bei null Ersetzungen konkrete Fehlermeldung statt stiller Uebernahme (E1).
3. Verknuepfungen pruefbar machen: bei NAME_1.NACHNAME die zugehoerige Vollform anzeigen und "Andere Person" anbieten, rueckgaengig machbar (K3, Pruefansicht).
4. Speicherzustand praezise benennen: "Datei wird gespeichert" und "Speicherung abgeschlossen" trennen; bei Fehlern Zuordnung erhalten und erneutes Speichern anbieten (K4).
5. Zuruecksetzen eindeutig machen: der Dialog nennt den Umfang (Dokumente, Ergebnisse, Zuordnung, Entscheidungen); anschliessend muss dieser tatsaechlich verschwunden sein (S2).
6. Gegenpruefung nicht als Freigabe darstellen: bei "keine Auffaelligkeiten" erklaeren, dass dieselbe Erkennung erneut sucht und unerkannte Werte verbleiben koennen (HTML:3122-3135, E1/Q2).
7. Exportumfang vor dem Speichern zeigen: Anzahl der Dokumente und Zuordnungseintraege; entfernte Dokumente duerfen nicht ueber einen anderen Exportknopf wieder dazugehoeren (S2/D32).

### 4. Fehlende Tests und Messungen
| Fall | Ort | Erwartung |
|---|---|---|
| Projekt -> manuell korrigieren -> ZIP | tests/project.test.mjs | ZIP enthaelt genau den sichtbaren aktuellen Text; jede Zuordnung gehoert zum richtigen Dokument; vollstaendiger Rundlauf |
| Projekt -> zuruecksetzen -> Eintrag oeffnen/exportieren | tests/project.test.mjs | keine alten Dokumente, Ergebnisse oder Entscheidungen erreichbar |
| Dokument entfernen -> ZIP, .psmap, CSV | tests/project.test.mjs, tests/psmap.test.mjs | alle Wege verwenden denselben verbleibenden Umfang |
| Manuelle Markierung mit NBSP, schmalem geschuetztem Leerzeichen, Vollbreitenzeichen | Integration unter tests/unit/ | akzeptierter Wert vollstaendig ersetzt; Originalzeichen kommen beim Rundlauf exakt zurueck |
| Literale {{EMAIL_1}}, {{NAME_1}}, Suffix-Tokens im Original | tests/unit/detect.coref.test.mjs bzw. Eigenschaftstests | keine Kollision, exakter Rundlauf auch ueber mehrere Dokumente |
| Ehepartner, gleichnamige Parteien, nur eine ausgeschriebene Vollform | tests/unit/detect.coref.test.mjs | keine falsche Personenverknuepfung; semantische Erwartung, nicht nur Rundlauf |
| Speicherabbruch, Schreibfehler, unterbrochener Download | tests/psmap.test.mjs, tests/export-hygiene.test.mjs | kein Erfolgsstatus, mapSaved bleibt falsch, Schliesswarnung bleibt |
| ZIP mit zu klein deklarierter Entpackgroesse | tests/unit/formats.test.mjs, Importtest | tatsaechliche Entpackmenge begrenzt; Fehler vor unbeschraenkter Akkumulation |
| HTML im Variablennamen | tests/ipc-security.test.mjs | woertliche Anzeige, keine zusaetzlichen DOM-Elemente/Ereignisse, kein externes Oeffnen |
| Genehmigte Referenzausnahme mit erneut geaenderter Ausgabe | tests/unit/detect.differential.test.mjs | nur exakt genehmigter neuer Stand besteht |
| Teilmaskierung und verlorener Importwert | Unit-Test fuer die Eval-Funktionen | Teilrest zaehlt als Fehler; Importverlust verbessert die Erkennungsquote nicht |
| Fokus unter Dialogen/festen Leisten, Zielgroessen, Screenreader-Ablauf | geplante D2-Tests plus manuell | Abnahme nach anwendbaren WCAG-2.2-AA-Kriterien |

### 5. Rueckfragen und Zweifel an Entscheidungen
(Hinweis von ChatGPT: Im gelesenen Protokoll endete die Nummerierung bei D32; D33 fehlte; D26 = Regex-Gesamtbudget, D27 = Leistungsgrenzen, D28 = HTML-Zeilenlimit. Das ist ein Lesestand-Unterschied: der Plan-Branch auf GitHub hinkte hinterher.)
- D24 (Fehlverknuepfung schlimmer als fehlende): Soll die Vorsichtsregel auch gelten, wenn nur eine Vollform vorkommt, der Text aber ausdruecklich eine zweite Person beschreibt (K3)? Alternative: negative Kontextbelege beruecksichtigen, sonst unverknuepft lassen.
- D30 (Schliessen/Timeout): Warum wird ein nicht antwortender Renderer nach 2,5 s als "gespeichert" behandelt? main.js:209-221 setzt auch bei Fehlern auf Schliessen; unbekannter Speicherzustand. Alternative: bei unbekanntem Zustand warnen; die bekannte Cmd-Q-Ausnahme separat entscheiden.
- D32 (entfernte Dokumente): Ist die Behebung abgeschlossen, wenn nur der ZIP-Weg prjScope() verwendet? Alternative: gemeinsame Exportquelle fuer ZIP, .psmap, CSV (S2).
- D23 (Cache-Retention akzeptiert): ausdruecklich von erneut per Oberflaeche erreichbaren Projektdaten abgrenzen (S2). Alternative: definierter Sitzungsabschluss fuer alle erreichbaren Daten; keine Behauptung einer garantierten RAM-Nullung.
- P0/F4.a (Idempotenz abgeschwaecht): Schon ein erster Durchlauf ueber einen Text mit literalem Token verletzt den Rundlauf (K2); eigenstaendige Pflicht: vorhandene Tokens duerfen nie mit neu vergebenen kollidieren.
- P0/F2 (erklaerte Referenzabweichungen): Genehmigung einer konkreten Verbesserung oder jeder kuenftigen Aenderung desselben Falls? Der Code tut Letzteres (Q1); genehmigten neuen Zustand exakt festhalten.
- P0/B2 (ZIP-Kopfgroessen als Schutz): Angreifer faelscht Kopfgroessen nach unten (S1); zusaetzlich tatsaechliche Entpackarbeit begrenzen.
- Paket D2 (WCAG-Ziel): Abnahme soll dem Auftrag 2.2 AA entsprechen oder bewusst bei 2.1 bleiben? (A1).

### 6. Was ChatGPT als Naechstes pruefen wuerde
1. K1, K4 und S2 in der echten App nachstellen (native Speicherdialoge, Schreibfehler, Projektwechsel, Rueckuebersetzung exportierter Dateien).
2. S3 kontrolliert bestaetigen oder streichen (harmlose DOM-/Ereignismarker, externe Aufrufe nur abfangen; weitere HTML-Senken durch Dokumente, importierte Zuordnungen oder Regeln).
3. Office-Beziehungen und Extraktionsvollstaendigkeit (Vermutung: Zuordnung ueber gleiche Dateinummern in officefmt.js:172-184 kann bei umsortierten PPTX-Folien/Notizen Inhalte falsch zuordnen; mit gueltigen Relationship-Fixtures pruefen).
4. Unabhaengiger Erkennungs-Holdout: unbekannte synthetische Kanzlei-/Behoerdentexte, getrennt nach Regeln, Wortlisten und echtem Modelllauf; Teilreste und Personenverwechslungen getrennt messen; den bekannten Korpus nicht nachtraeglich anpassen.
5. Ausgelieferte Pakete statt nur Quelltext: Fuses, IPC-Absendergrenzen, Navigation, Berechtigungen, Offline-Verhalten, Update-/Schliessablaeufe, Dateispuren auf allen drei Plattformen (package.json:89-99 ersetzt diesen Nachweis nicht).
6. Nach G1.docs Dokumentationsabgleich: Grenzen der Erkennung, Bedeutung der Gegenpruefung, Umgang mit Zuordnungen, Netzaktivitaet durch Updates/externe Links, tatsaechlich beigefuegte Lizenztexte.
