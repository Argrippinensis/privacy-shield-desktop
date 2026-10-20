# PrivacyShield 2.0: Gesamtplan

> **Für Ausführende:** Lies zuerst diese Datei, danach nur das Arbeitspaket (V2-xx), das dir zugewiesen ist. Der Plan baut auf
> `../2026-10-20-naechste-schritte/` auf (dort: `00-INDEX.md`, Regeln, Stopp-Regeln, Gates, Belege, Patch-Serie 1.8.0). Diese Regeln gelten unverändert.
> Den Ablauf steuert der Orchestrator mit [`V2-EXEC-PROMPT.md`](V2-EXEC-PROMPT.md) im Dauerbetrieb ([`V2-LOOP.md`](V2-LOOP.md): Fragenliste, Dauerfreigaben, automatischer Neustart); den Fortschritt hält die Arbeitsliste `loop/V2-QUEUE.json` (Übersicht: [`V2-STATUS.md`](V2-STATUS.md)).

## 1. Leitidee

1.8.0 macht das Werkzeug **zuverlässiger** (Lecks 87 auf 1 von 276). 2.0 macht es **nachweisbar sicher und arbeitstauglich**:
vom Textfeld für ein Dokument zum Arbeitsplatz für Mitarbeiter, die Dokumente anonymisieren und das belegen müssen.

| Säule | Frage, die 2.0 beantwortet | Heute (geprüft, siehe Anhang) |
|---|---|---|
| **Vertrauen** | "Wie sicher bin ich, dass nichts übrig ist, und wie belege ich es?" | keine Gegenprüfung des Ergebnisses, kein Nachweis, Zuordnung (Mapping) als Klartext-CSV |
| **Dokumente** | "Ich habe 40 Dateien, nicht eine." | Auswahlfeld erlaubt mehrere Dateien (`multiple`), verarbeitet aber nur `files[0]`; Export nur TXT/PDF; nur ein Dokument gleichzeitig |
| **Erkennung** | "Auch meine eigenen Nummern und Begriffe." | feste Regeln und Wörterbücher; Reste laut Messung (WP 05): GROSSSCHREIBUNG mit Komma, Spitznamen, Aufenthaltstitel |
| **Bedienung** | "Ich will prüfen, nicht raten." | Markierungsansicht vorhanden, aber keine Liste aller Funde, kein Rückgängig, Barrierefreiheit praktisch nicht vorhanden (1 `aria`-Attribut, 0 `tabindex`) |
| **Betrieb** | "Das muss in unsere IT passen." | kein Kommandozeilenmodus, keine Dateizuordnung, keine zentrale Konfiguration, unsigniert |
| **Fundament** | "Das darf nicht brechen." | Erkennungskern steckt in einer 5.500-Zeilen-HTML-Datei, nicht einzeln testbar; Electron 35 (nicht mehr gepflegt); Web-Kopie driftet |

## 2. Umfang (MoSCoW) und Versionsfahrplan

**Entscheidung D13 (Voreinstellung):** 1.8.0 (fertige, geprüfte Serie) wird **zuerst und getrennt** veröffentlicht (WP 02 des Vorgängerplans). Begründung:
jede Woche Wartezeit lässt Nutzer auf 1.7.0 mit 87 von 276 Lecks; die Serie ist getestet; 2.0 baut ohnehin darauf auf. Wer lieber nur ein Release will:
2.0 aus demselben Stand bauen und 1.8.0 überspringen (der Plan bleibt gültig, nur G1 entfällt für 1.8.0).

| Stufe | Pakete | Bedeutung |
|---|---|---|
| **Muss** (2.0 erscheint nicht ohne) | F1, F2, A1, A2, A3, B1, C1, D1, D3, G1 | Kern testbar; Vertrauen (Gegenprüfung, Bericht, verschlüsseltes Mapping); Mehrfachverarbeitung; Erkennungsschleife; Prüfansicht; Lizenz-/Diagnose-Dialog; Release-Prozess |
| **Soll** | A4, B2, C2, C3, D2, E1, E2, F3, F4 | Hygiene der Exporte, weitere Formate, Verknüpfung gleicher Personen, eigene Regeln, Barrierefreiheit, Kommandozeile, Dateizuordnung, Bibliotheken, Stabilität |
| **Kann** (2.1 oder später) | B3, C4, D4, D5, E3, E4, E5 | formattreuer Export, weitere Sprachen, englische Oberfläche, dunkles Design, zentrale Konfiguration, tragbare Version, Signierung (braucht Kauf, Gate G4) |

Fahrplan (jeder Schritt ist ein Pull Request, jedes Ziel mit Tests grün):

```
R0  1.8.0                       Serie aus dem Vorgängerplan (WP 02, Gate G1)
P1  Fundament                   F1 Kern auslagern (nach Machbarkeitsprüfung), F2 Testläufer + Electron 44
P2  Vertrauen                   A1 Gegenprüfung, A2 Bericht, A3 verschlüsseltes Mapping, A4 Export-Hygiene     -> Phasenpruefung
P3  Dokumente                   B1 Mehrfachauswahl und Projekt, B2 weitere Formate                            -> Phasenpruefung
P4  Erkennung                   C1 Korpusschleife (mehrfach), C2 Verknüpfung, C3 eigene Regeln
P5  Bedienung                   D1 Prüfansicht und Rückgängig, D2 Barrierefreiheit, D3 Info/Lizenzen/Diagnose  -> Phasenprüfung
P6  Betrieb                     E1 Kommandozeile, E2 Dateizuordnung und Einzelinstanz, F3 Bibliotheken, F4 Stabilität
P7  Abschluss                   G1 Abnahme, Dokumentation, Differenztest, Veröffentlichung (Gate)             -> 2.0.0
```

**Keine Betas, keine Pre-releases (Entscheidung des Nutzers).** Qualität wird durch Tiefe der Tests, Phasenprüfungen und den Differenztest gegen 1.8.0 gesichert, nicht durch Vorabversionen. 2.0.0 erscheint erst, wenn alles gründlich geprüft ist. Jede Sitzung wird vom Nutzer von Hand gestartet.

## 3. Architekturregeln für 2.0 (damit auch schwächere Modelle sicher arbeiten können)

1. **Neue Logik als reine Module** in `app/lib/*.js` (UMD: im Browser `window.PSLib.<name>`, in Node `module.exports`), **ohne** DOM-Zugriff. Ein Modul = eine Aufgabe = eine Testdatei
   `tests/unit/<name>.test.mjs` (Node-Testläufer, läuft in unter 5 Sekunden, ohne Electron). Die Oberfläche (`app/privacy-shield.html`) ruft nur die Modul-API auf.
2. **Tests zuerst, von anderer Hand:** Ein Test-Autor schreibt die roten Tests aus der Spezifikation des Pakets; ein Implementierer macht sie grün; ein Prüfer (frischer Kontext) liest den Diff gegen die Spezifikation.
   Der Implementierer darf Tests **nicht** ändern (Ausnahme: offensichtlicher Tippfehler, dann Bericht).
3. **Kein Netz, keine neuen Laufzeitabhängigkeiten ohne Entscheidung.** Neue Bibliothek nur in `scripts/vendor.lock.json` mit SHA-256, Lizenz in `THIRD_PARTY_NOTICES.md`. Kryptografie nur mit **Web Crypto** (`crypto.subtle`), nie selbst gebaut.
4. **Keine personenbezogenen Werte in Berichten, Logs, Fehlertexten und Diagnosen.** Test: Bericht und Diagnose werden gegen die Testdokumente auf Klartextwerte geprüft.
5. **Rückwärtsverträglich lesen:** Alte Zuordnungsdateien (CSV) bleiben importierbar. Einstellungen aus 1.x werden übernommen.
6. **Messbar bleiben:** Jede Änderung an der Erkennung läuft durch den Harness (`npm run eval`), Ratsche und Golden-Stand; Leistungsänderungen dürfen die Ausgabe nicht ändern (Hash-Vergleich).
7. **Eine Datei für Web und Desktop** ist das Ziel von F1: Der ausgelagerte Kern (`app/lib/detect.js` und Verwandte) wird von der Desktop-App und dem Web-Tool gleichermaßen geladen. Bis dahin bleibt das Web-Tool wie in WP 06 beschrieben.
8. Hausregeln: keine Emojis, kein `git add -A`, Commit-Zeile `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`, UI-Arbeit mit dem Skill `frontend-design:frontend-design`.

## 4. Rollen und Modellwahl

Der Nutzer wechselt **nie** das Modell: Er startet eine Sitzung (Sonnet, Denkaufwand mittel); der Orchestrator setzt Modell und Denkaufwand je Unteragent über das Profil in `loop/V2-QUEUE.json` (Einzelheiten und Begründung: `V2-LOOP.md` Abschnitt 8).

| Rolle | Aufgabe | Standardprofil `sonnet` |
|---|---|---|
| **Orchestrator** | Pakete wählen, Rollen starten, Ergebnis prüfen, Status pflegen, Fragen stellen | die Sitzung selbst (Sonnet, mittel) |
| **Test-Autor** | rote Tests aus der Spezifikation | Sonnet; low (bau), medium (denk), high (spike) |
| **Implementierer** | Tests grün machen, nur erlaubte Dateien | Sonnet; low (bau), high (denk), xhigh (spike) |
| **Prüfer** | Diff gegen Spezifikation, frischer Kontext (nur wo Urteil nötig: `review`) | Sonnet; medium, bei Kryptografie xhigh |
| **Phasenprüfer** | Gegenprobe an Meilensteinen | Sonnet; xhigh |

Haiku ist optional (Profil `gemischt`: Bau-Implementierer mit Haiku, spart Verbrauch). Es ist ungeeignet für Fehlersuche in CI, Regex-Randfälle ohne Testfall, Entwurfsentscheidungen und Oberflächengestaltung; diese Pakete sind in beiden Profilen "denk" oder "spike". Fällt ein "bau"-Paket zweimal durch, wechselt der Orchestrator für den dritten Versuch auf "denk" (high).

## 5. Pakete

| Paket | Titel | Marke | Aufwand (Ausführung) | Gate |
|---|---|---|---|---|
| [F1](V2-F-fundament.md) | Erkennungskern auslagern (nach Machbarkeitsprüfung) | S | 4-6 h | G1 (mit Release) |
| [F2](V2-F-fundament.md) | Unit-Testläufer, Electron 44, Härtung (Vorgängerplan WP 07) | H/S | 2-3 h | G1 |
| [A1](V2-A-vertrauen.md) | Gegenprüfung des Ergebnisses ("Restrisiko-Scan") | H | 2 h | |
| [A2](V2-A-vertrauen.md) | Anonymisierungsbericht (ohne personenbezogene Werte) | H | 2 h | |
| [A3](V2-A-vertrauen.md) | Verschlüsselte Zuordnung (`.psmap`) | H | 3 h | |
| [A4](V2-A-vertrauen.md) | Hygiene: Metadaten, Zwischenablage, Dateinamen | H | 1-2 h | |
| [B1](V2-B-dokumente.md) | Mehrfachauswahl, Projekt mit gemeinsamen Platzhaltern, ZIP-Export | S | 4 h | |
| [B2](V2-B-dokumente.md) | Weitere Formate: XLSX, ODT/ODS, PPTX, EML, HTML; ehrliche Meldung für `.doc` | H | 4 h | |
| [B3](V2-B-dokumente.md) | Formattreuer Export (DOCX/XLSX) | S | 6+ h | Kann |
| [C1](V2-C-erkennung.md) | Korpusschleife (Vorgängerplan WP 05), mehrere Durchläufe | S | 3 x 3 h | |
| [C2](V2-C-erkennung.md) | Verknüpfung derselben Person (Koreferenz) | S | 4 h | |
| [C3](V2-C-erkennung.md) | Eigene Regeln und Richtliniendatei (`policy.json`) | H/S | 4 h | |
| [C4](V2-C-erkennung.md) | Weitere Sprachen (EN, FR, ES, IT, PL, NL) | S | 6 h | Kann |
| [D1](V2-D-bedienung.md) | Prüfansicht (Liste aller Funde) und Rückgängig | S | 5 h | |
| [D2](V2-D-bedienung.md) | Barrierefreiheit (WCAG 2.1 AA) mit automatischem Test | S | 4 h | |
| [D3](V2-D-bedienung.md) | Info-Dialog: Version, Lizenzen, Diagnose | H | 2 h | |
| [D4/D5](V2-D-bedienung.md) | Englische Oberfläche, dunkles Design | S | 8 h | Kann |
| [E1](V2-E-betrieb.md) | Kommandozeilenmodus (Stapel ohne Oberfläche) | S | 4 h | |
| [E2](V2-E-betrieb.md) | Dateizuordnung, "Öffnen mit", Einzelinstanz | H | 2 h | |
| [E3-E5](V2-E-betrieb.md) | Zentrale Konfiguration, tragbare Version, Signierung | S | | G4 |
| [F3](V2-F-fundament.md) | Bibliotheken aktualisieren (Vorgängerplan WP 08) | S | 6 h | |
| [F4](V2-F-fundament.md) | Stabilität: Fuzz-/Eigenschaftstests, Paket-E2E auf drei Systemen | S | 4 h | |
| [G1](V2-G-abschluss.md) | Abnahme, Dokumentation, Website, Veröffentlichung | S | 4 h | **G1** |

## 6. Entscheidungen (mit Voreinstellung)

| Nr | Frage | Voreinstellung |
|---|---|---|
| D12 | Umfang 2.0 = Muss + Soll; Kann nach 2.1 | ja |
| D13 | 1.8.0 zuerst separat veröffentlichen | ja (siehe oben) |
| D14 | Zuordnung standardmäßig verschlüsselt (`.psmap`, Passwort), CSV nur mit Warnhinweis | ja |
| D15 | Englische Oberfläche in 2.0? | nein, 2.1 (Zielgruppe zunächst deutschsprachig); Texte aber in neuen Modulen über `PSLib.i18n.t()` führen, damit später nichts umgebaut werden muss |
| D16 | Kommandozeile (E1) in 2.0 | ja, kleiner Umfang (Stapel, Profil, Bericht) |
| D17 | Versionsnummer 2.0.0 trotz kompatibler Dateien | ja: neues Zuordnungsformat, Kommandozeile, Bericht sind sichtbare Neuerungen; Hauptversion signalisiert "neues Niveau", Updates von 1.x laufen automatisch |
| D18 | Web-Tool (arcangeli.eu) erhält den Kern aus F1 | nach 2.0, mit Gate G3 (Regel "arcangeli.eu inhaltlich unberührt") |

## 7. Qualitätsprinzip und Definition von "fertig" für 2.0.0

**Prinzip: mehr können, aber nie fehleranfälliger als 1.8.0.** Jede neue Funktion muss das Bestehende nachweislich unberührt lassen:
* **Differenztest gegen 1.8.0:** Für alle Korpusdokumente (Harness, synthetisch, Realdokumente, Golden, Stress) ist die Ausgabe von 2.0 mit der von 1.8.0 verglichen (Text und Zuordnung, Hash je Fall). Jede Abweichung ist erklärt (gewollte Verbesserung mit Eintrag in `V2-ENTSCHEIDUNGEN.md`) oder ein Fehler. Werkzeug: `tests/eval/dump-reference.mjs` aus F1, Referenz `tests/golden/reference-v1.8.json`.
* **Tests nur hinzufügen:** Kein bestehender Test wird gelockert oder entfernt; Ratschen (Lecks, Fehlalarme, Leistung) werden nie gelockert (Prüfskript `gate.mjs`).
* **Neue Funktionen ausschaltbar oder ohne Wirkung, wenn nicht benutzt:** Wer nur ein Dokument anonymisiert wie bisher, bekommt dasselbe Ergebnis und dieselbe Bedienung (Test: Ein-Dokument-Ablauf von 1.8.0 läuft unverändert).
* **Dauer- und Wiederholungstests:** Rundlauf über das ganze Korpus, 200 Wiederholungen großer Dokumente ohne Speicherzuwachs (nach Entladen unter 1 GB), Fuzz (F4).
* **Echte Systeme:** CI auf Windows, macOS, Linux (gebautes Programm) bei jedem Pull-Request; Windows-Checkliste durch den Nutzer vor der Veröffentlichung.
* **Im Zweifel nicht einbauen:** Ein Paket, das die Prinzipien nicht erfüllt, wird verschoben (nicht "durchgewunken"); der Plan lässt das ausdrücklich zu.

**Fertig, wenn:**

* Alle **Muss**- und **Soll**-Pakete erledigt oder mit Begründung ausdrücklich verschoben (Eintrag in `V2-STATUS.md`).
* `xvfb-run -a npm test` und Unit-Tests grün auf Ubuntu und Windows; Paket-Tests auf allen drei Systemen in der CI grün.
* Eval-Ratsche: Lecks mit Modell nicht schlechter als 1.8.0 (4 von 150 / 1 von 276), mit den **neuen** Korpusfällen aus C1 höchstens so viele wie in der Abnahmetabelle von V2-C; Fehlalarme 0.
* Rundlauf: `Anonymisieren, Zuordnung speichern, neu öffnen, Rückübersetzen` ergibt den Originaltext exakt (Test über alle Korpusdokumente).
* Barrierefreiheit: `axe-core` meldet keine "serious/critical"-Verstöße in den Hauptansichten (D2).
* Updater: Update von 1.8.0 auf 2.0.0 getestet (`verify-release.mjs --upgrade-from`); macOS-Hinweis ehrlich (unsigniert).
* Dokumentation (`README`, `CHANGELOG`, Benutzerhandbuch-Kurzfassung) und Website-Texte (WP 03/04 des Vorgängerplans) aktuell.
* Nutzer hat auf einem echten Windows-Rechner abgenommen (nicht ersetzbar).

## 8. Risiken

| Risiko | Gegenmaßnahme |
|---|---|
| Auslagerung des Kerns (F1) bricht Verhalten | Machbarkeitsprüfung mit Go/Nein-Kriterien; danach Hash-gleiche Ausgabe auf allen Harness-Texten, Golden und Stress-Test; bei Nein: Module trotzdem für **neue** Logik (A-D), Kern bleibt in der HTML |
| Umfang wächst | Muss/Soll/Kann; Betriebsregel: pro Sitzung höchstens 3 Pakete; nur Muss blockiert das Release |
| Schwächeres Modell erfindet Lösungen | Rote Tests zuerst, erlaubte Dateien je Paket, Prüfer mit frischem Kontext, zwei Versuche dann Wechsel/Stopp |
| Passwortverlust bei verschlüsselter Zuordnung | klarer Hinweis vor dem Speichern; Wiederherstellung unmöglich (Zero-Knowledge); CSV-Export bleibt als bewusste Alternative mit Warnung |
| Verschlüsselung falsch umgesetzt | nur Web Crypto, AES-256-GCM, PBKDF2-HMAC-SHA-256 mit hoher Iterationszahl, zufälliges Salz und Nonce je Datei; feste Testvektoren; Review durch Sonnet mittel vor dem Merge (kein Eigenbau-Verfahren) |
| Barrierefreiheit unvollständig | automatischer Test plus Tastatur-Durchlauf; Verstöße unter "moderate" dürfen als Backlog bleiben, dokumentiert |
| Neue Formate öffnen Angriffsfläche (XML, ZIP) | Größen- und Entpack-Grenzen (ZIP-Bomb), keine externen Entitäten, Parser in Worker, Fuzz-Tests (F4) |
