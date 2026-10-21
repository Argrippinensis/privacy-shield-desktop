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
| **Dokumente** | "Ich habe 40 Dateien, nicht eine." | Auswahlfeld verarbeitet mehrere Dateien nacheinander (ZIP mit `<Originalname>_anonymisiert.txt`), aber ohne gemeinsame Zuordnung (nur die letzte Datei bleibt rückübersetzbar); die Drop-Zone liest nur `files[0]`; Export nur TXT/PDF; nur UTF-8-Text, RTF als Rohtext |
| **Erkennung** | "Auch meine eigenen Nummern und Begriffe." | feste Regeln und Wörterbücher; Reste laut Messung (WP 05): GROSSSCHREIBUNG mit Komma, Spitznamen, Aufenthaltstitel |
| **Bedienung** | "Ich will prüfen, nicht raten." | Markierungsansicht vorhanden, aber keine Liste aller Funde, kein Rückgängig, Barrierefreiheit praktisch nicht vorhanden (1 `aria`-Attribut, 0 `tabindex`) |
| **Betrieb** | "Das muss in unsere IT passen." | kein Kommandozeilenmodus, keine Dateizuordnung, keine zentrale Konfiguration, unsigniert |
| **Fundament** | "Das darf nicht brechen." | Erkennungskern steckt in einer 5.563-Zeilen-HTML-Datei (etwa 2.100 Zeilen Kern), nur über die App testbar (3 min je Messlauf; als Modul in Sekunden); Electron 35 (nicht mehr gepflegt); Web-Kopie driftet; Rechenzeit explodiert bei langen Leerraum-/Buchstabenfolgen (F5) |

## 2. Umfang (MoSCoW) und Versionsfahrplan

**Entscheidung D13 (Voreinstellung):** 1.8.0 (fertige, geprüfte Serie) wird **zuerst und getrennt** veröffentlicht (WP 02 des Vorgängerplans). Begründung:
jede Woche Wartezeit lässt Nutzer auf 1.7.0 mit 87 von 276 Lecks; die Serie ist getestet; 2.0 baut ohnehin darauf auf. Wer lieber nur ein Release will:
2.0 aus demselben Stand bauen und 1.8.0 überspringen (der Plan bleibt gültig, nur G1 entfällt für 1.8.0).

| Stufe | Pakete | Bedeutung |
|---|---|---|
| **Muss** (2.0 erscheint nicht ohne) | F1, F2, M1, A1, A2, A3, B1, C1, D1, D3, G1 | Kern testbar; Vertrauen (Gegenprüfung, Bericht, verschlüsseltes Mapping); Mehrfachverarbeitung; Erkennungsschleife; Prüfansicht; Lizenz-/Diagnose-Dialog; Release-Prozess |
| **Soll** | A4, B2, C2, C3, D2, E1, E2, F3, F4, F5 (Pakete F2.e und F2.h gehören zu F2 und sind Muss) | Hygiene der Exporte, weitere Formate, Verknüpfung gleicher Personen, eigene Regeln, Barrierefreiheit, Kommandozeile, Dateizuordnung, Bibliotheken, Stabilität |
| **Kann** (2.1 oder später) | B3, C4, D4, D5, E3, E4, E5 | formattreuer Export, weitere Sprachen, englische Oberfläche, dunkles Design, zentrale Konfiguration, tragbare Version, Signierung (braucht Kauf, Gate G4) |

Fahrplan (jeder Schritt ist ein Pull Request, jedes Ziel mit Tests grün):

```
R0  1.8.0                       Serie aus dem Vorgängerplan (WP 02, Gate G1)
P1  Fundament                   F2 Testläufer + Referenz, F2.e Electron 44, F2.h Härtung, F1 Kern auslagern (F1.a Modul, F1.b Einbindung), F5 Kern-Leistung
P2  Vertrauen                   M1 manuelle Markierungen, A1 Gegenprüfung, A2 Bericht, A3 verschlüsseltes Mapping, A4 Export-Hygiene     -> Phasenprüfung
P3  Dokumente                   B1 Mehrfachauswahl und Projekt (B1.fix, .m, .w1, .w2), B2 weitere Formate (.m1, .m2, .w)               -> Phasenprüfung
P4  Erkennung                   C1.0/C1.r Korpus und Realdokumente, C1.1-C1.3 Schleife, C2 Verknüpfung, C3 eigene Regeln
P5  Bedienung                   D1 Prüfansicht und Rückgängig, D3 Info/Lizenzen/Diagnose, D2 Barrierefreiheit                         -> Phasenprüfung
P6  Betrieb                     E1 Kommandozeile, E2 Öffnen mit und Einzelinstanz, F3 Bibliotheken (a-d), F4 Stabilität (a, b)
P7  Abschluss                   G1.docs Dokumentation, G1 Abnahme, Differenztest, Veröffentlichung (Gate)                            -> 2.0.0
```

**Keine Betas, keine Pre-releases (Entscheidung des Nutzers).** Qualität wird durch Tiefe der Tests, Phasenprüfungen und den Differenztest gegen 1.8.0 gesichert, nicht durch Vorabversionen. 2.0.0 erscheint erst, wenn alles gründlich geprüft ist. Jede Sitzung wird vom Nutzer von Hand gestartet.

## 3. Architekturregeln für 2.0 (damit auch schwächere Modelle sicher arbeiten können)

1. **Neue Logik als reine Module** in `app/lib/*.js` (UMD, **ohne** DOM-Zugriff). Ein Modul = eine Aufgabe = eine Testdatei `tests/unit/<name>.test.mjs` (Node-Testläufer, ohne Electron; jede Datei unter 5 Sekunden, Ausnahmen F4.a und F5 bis 60 Sekunden, gesamte Unit-Suite unter 90 Sekunden; gemessen: Läufer mit einer Datei 0,13 s). Die Oberfläche (`app/privacy-shield.html`) ruft nur die Modul-API auf. In der HTML werden Module per `<script src="lib/<name>.js">` vor dem Hauptskript geladen (die strenge CSP erlaubt gleiche Herkunft). **Einheitliche UMD-Hülle** (geprüft durch `tests/unit/lib-static.test.mjs`):
   ```js
   (function (root, factory) {
     if (typeof module === 'object' && module.exports) module.exports = factory();
     else { root.PSLib = root.PSLib || {}; root.PSLib.NAME = factory(); }
   })(typeof self !== 'undefined' ? self : this, function () { 'use strict'; /* ... */ return { /* API */ }; });
   ```
   Module, die andere Module brauchen, laden sie so: `typeof module === 'object' ? require('./andere.js') : root.PSLib.andere` (Reihenfolge der Skripte in der HTML beachten). In Tests lädt `loadLib('name')` aus `tests/unit/_load.mjs` (nicht aus `helpers.mjs`: dessen Import kostet 0,44 s und braucht die Electron-Datei).
2. **Tests zuerst, von anderer Hand:** Ein Test-Autor schreibt die roten Tests aus der Spezifikation des Pakets; ein Implementierer macht sie grün; ein Prüfer (frischer Kontext) liest den Diff gegen die Spezifikation.
   Der Implementierer darf Tests **nicht** ändern (Ausnahme: offensichtlicher Tippfehler, dann Bericht).
3. **Kein Netz, keine neuen Laufzeitabhängigkeiten ohne Entscheidung.** Neue Bibliothek nur in `scripts/vendor.lock.json` mit SHA-256, Lizenz in `THIRD_PARTY_NOTICES.md`. Kryptografie nur mit **Web Crypto** (`crypto.subtle`), nie selbst gebaut.
4. **Keine personenbezogenen Werte in Berichten, Logs, Fehlertexten und Diagnosen.** Test: Bericht und Diagnose werden gegen die Testdokumente auf Klartextwerte geprüft.
5. **Rückwärtsverträglich lesen:** Alte Zuordnungsdateien (CSV) bleiben importierbar. Einstellungen aus 1.x werden übernommen.
   **Texte in Modulen:** Es gibt in 2.0 kein `PSLib.i18n` (D4 ist "Kann"). Deutsche Texte stehen je Modul in einem Block `const TEXT = { ... }` am Dateianfang, damit ein späterer Umbau auf `t()` mechanisch ist (Korrektur von Entscheidung D15 des ersten Entwurfs).
6. **Messbar bleiben:** Jede Änderung an der Erkennung läuft durch den Harness (`npm run eval`), Ratsche und Golden-Stand; Leistungsänderungen dürfen die Ausgabe nicht ändern (Hash-Vergleich).
7. **Eine Datei für Web und Desktop** ist das Ziel von F1: Der ausgelagerte Kern (`app/lib/detect.js` und Verwandte) wird von der Desktop-App und dem Web-Tool gleichermaßen geladen. Bis dahin bleibt das Web-Tool wie in WP 06 beschrieben.
8. Hausregeln: keine Emojis, kein `git add -A`, Commit-Zeile `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`, UI-Arbeit mit dem Skill `frontend-design:frontend-design`.
9. **Brücke zum Hauptprozess:** Neue IPC-Kanäle immer über `handle(channel, fn)` mit Absenderprüfung (F2.h); das Werkzeug erreicht die Brücke als `window.parent.electronAPI` (gemessen; `window.electronAPI` ist im Werkzeug `undefined`). Kein Kanal liest einen Pfad, den die Seite liefert (Dateien kommen nur über Dialoge oder vom Hauptprozess vorgemerkt).
10. **Platzhalter** nur über `PSLib.placeholder` erkennen/maskieren (kein eigenes Muster). Zur Erkennung ohne Platzhalter-Fehlfunde wird der Platzhalter mit `\u0000` maskiert (nicht mit sichtbaren Zeichen, gemessen: `x` erzeugt Fehlfunde).
11. **Pathologische Eingaben:** Neue Regex-Muster in Kern und Modulen dürfen keine unverankerten Anfangsquantoren und keine Lookbehinds mit `\s*` ohne Obergrenze enthalten (F5, gemessen: Minuten Rechenzeit). Nutzerdefinierte Muster nur aus der sicheren Teilmenge von C3.

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
| [F2](V2-F-fundament.md) | Unit-Testläufer, Referenz von 1.8.0, Lader, Platzhaltermodul | H/S | 2-3 h | |
| [F2.e](V2-F-fundament.md) | Electron 44, Fuses | S | 1-2 h | G1 (mit Release) |
| [F2.h](V2-F-fundament.md) | Härtung der Brücke (Absender, Argumente, Ursprung, Berechtigungen) | S | 2 h | G1 (mit Release) |
| [F1.a/F1.b](V2-F-fundament.md) | Erkennungskern als Modul; Einbindung in die HTML (Machbarkeit in P0 gemessen: Go) | S | 3 h + 3 h | G1 (mit Release) |
| [F5](V2-F-fundament.md) | Kern-Leistung bei pathologischen Eingaben | S | 3 h | |
| [M1](V2-A-vertrauen.md) | Manuelle Markierungen als Daten (Modul) | H | 1 h | |
| [A1](V2-A-vertrauen.md) | Gegenprüfung des Ergebnisses ("Restrisiko-Scan") (A1.m, A1.w) | H/S | 2 h + 2 h | |
| [A2](V2-A-vertrauen.md) | Anonymisierungsbericht (A2.m, A2.w) | H | 2 h | |
| [A3](V2-A-vertrauen.md) | Verschlüsselte Zuordnung `.psmap` (A3.m, A3.w) | H | 3 h | |
| [A4](V2-A-vertrauen.md) | Hygiene: Dateinamen, PDF-Metadaten, Download-URL, Schließen (A4.m, A4.w) | H | 2 h | |
| [B1](V2-B-dokumente.md) | Sofortfix; Projekt mit gemeinsamen Platzhaltern (B1.fix, B1.m, B1.w1, B1.w2) | H/S | 1 h + 2 h + 3 h + 3 h | |
| [B2](V2-B-dokumente.md) | Weitere Formate, Kodierung, RTF (B2.m1, B2.m2, B2.w); ehrliche Meldung für `.doc` | H | 5 h | |
| [B3](V2-B-dokumente.md) | Formattreuer Export (DOCX/XLSX) | S | 6+ h | Kann |
| [C1](V2-C-erkennung.md) | Korpus und Realdokumente (C1.0, C1.r), Korpusschleife (C1.1 bis C1.3) | S | 3 + 3 + 3 x 3 h | |
| [C2](V2-C-erkennung.md) | Verknüpfung derselben Person (C2.m, C2.w) | S | 4 h | |
| [C3](V2-C-erkennung.md) | Eigene Regeln und Richtliniendatei `policy.json` (C3.m, C3.w) | H/S | 4 h | |
| [C4](V2-C-erkennung.md) | Weitere Sprachen (EN, FR, ES, IT, PL, NL) | S | 6 h | Kann |
| [D1](V2-D-bedienung.md) | Prüfansicht und Rückgängig (D1.m, D1.w1, D1.w2) | S | 5 h | |
| [D2](V2-D-bedienung.md) | Barrierefreiheit (WCAG 2.1 AA) mit automatischem Test (D2.1, D2.2) | S | 4 h | |
| [D3](V2-D-bedienung.md) | Info-Dialog: Version, Lizenzen, Diagnose | H | 2 h | |
| [D4/D5](V2-D-bedienung.md) | Englische Oberfläche, dunkles Design | S | 8 h | Kann |
| [E1](V2-E-betrieb.md) | Kommandozeilenmodus (E1.m, E1.w) | S | 1 h + 4 h | |
| [E2](V2-E-betrieb.md) | "Öffnen mit", Einzelinstanz | H | 2 h | |
| [E3-E5](V2-E-betrieb.md) | Zentrale Konfiguration, tragbare Version, Signierung | S | | G4 |
| [F3](V2-F-fundament.md) | Bibliotheken aktualisieren (F3.a bis F3.d, je Bibliothek) | S | 6 h | |
| [F4](V2-F-fundament.md) | Stabilität: Eigenschafts-/Fuzz-Tests (F4.a), Windows-Installationstest, Budgets (F4.b) | S | 3 h + 2 h | |
| [G1](V2-G-abschluss.md) | Dokumentation (G1.docs), Abnahme, Website, Veröffentlichung (G1) | S | 4 h | **G1** |

Die Pakete mit Suffix sind Teilungen der Planhärtung P0 (Grenze: höchstens etwa 300 Zeilen Änderung und 3 Dateien je Paket); die maschinenlesbare Liste ist `loop/V2-QUEUE.json` (erzeugt von `loop/make-queue.py`).

## 6. Entscheidungen (mit Voreinstellung)

| Nr | Frage | Voreinstellung |
|---|---|---|
| D12 | Umfang 2.0 = Muss + Soll; Kann nach 2.1 | ja |
| D13 | 1.8.0 zuerst separat veröffentlichen | ja (siehe oben) |
| D14 | Zuordnung standardmäßig verschlüsselt (`.psmap`, Passwort), CSV nur mit Warnhinweis | ja |
| D15 | Englische Oberfläche in 2.0? | nein, 2.1 (Zielgruppe zunächst deutschsprachig); neue Module führen ihre Texte in einem Block `const TEXT = {...}` (kein `PSLib.i18n` in 2.0), damit später nichts umgebaut werden muss |
| D16 | Kommandozeile (E1) in 2.0 | ja, kleiner Umfang (Stapel, Profil, Bericht) |
| D17 | Versionsnummer 2.0.0 trotz kompatibler Dateien | ja: neues Zuordnungsformat, Kommandozeile, Bericht sind sichtbare Neuerungen; Hauptversion signalisiert "neues Niveau", Updates von 1.x laufen automatisch |
| D18 | Web-Tool (arcangeli.eu) erhält den Kern aus F1 | nach 2.0, mit Gate G3 (Regel "arcangeli.eu inhaltlich unberührt") |

## 7. Qualitätsprinzip und Definition von "fertig" für 2.0.0

**Prinzip: mehr können, aber nie fehleranfälliger als 1.8.0.** Jede neue Funktion muss das Bestehende nachweislich unberührt lassen:
* **Differenztest gegen 1.8.0:** Für alle Korpusdokumente (Harness, synthetisch, Realdokumente, Golden, Stress) ist die Ausgabe von 2.0 mit der von 1.8.0 verglichen (Text und Zuordnung, Hash je Fall). Jede Abweichung ist erklärt (gewollte Verbesserung mit Eintrag in `V2-ENTSCHEIDUNGEN.md`) oder ein Fehler. Werkzeug: `tests/eval/dump-reference.mjs` und `diff-reference.mjs` aus F2, Referenz `tests/golden/reference-v1.8.json` (drei Modi `w0`, `w1`, `ki`; der KI-Modus ist deterministisch: gemessen 0 Abweichungen in zwei Starts).
* **Tests nur hinzufügen:** Kein bestehender Test wird gelockert oder entfernt; Ratschen (Lecks, Fehlalarme, Leistung) werden nie gelockert (Prüfskript `gate.mjs`).
* **Neue Funktionen ausschaltbar oder ohne Wirkung, wenn nicht benutzt:** Wer nur ein Dokument anonymisiert wie bisher, bekommt dasselbe Ergebnis und dieselbe Bedienung (Test: Ein-Dokument-Ablauf von 1.8.0 läuft unverändert).
* **Dauer- und Wiederholungstests:** Rundlauf über das ganze Korpus, 200 Wiederholungen großer Dokumente ohne Speicherzuwachs (nach Entladen unter 1 GB), Fuzz (F4).
* **Echte Systeme:** `ci.yml` testet jeden Pull Request und Push auf `main` auf **Ubuntu und Windows** (Quellbaum, ohne macOS); das **gebaute** Programm testet `build.yml` auf Ubuntu, Windows und macOS, aber nur bei Tags und per `workflow_dispatch` (geprüft; Release-Job nur bei Tags). Vor jeder Phasenprüfung und vor dem Release läuft deshalb ein Probelauf `gh workflow run build.yml --ref v2/main` (kein Release, Frage F3 in `V2-FRAGEN.md`); Windows-Checkliste durch den Nutzer vor der Veröffentlichung.
* **Im Zweifel nicht einbauen:** Ein Paket, das die Prinzipien nicht erfüllt, wird verschoben (nicht "durchgewunken"); der Plan lässt das ausdrücklich zu.

**Fertig, wenn:**

* Alle **Muss**- und **Soll**-Pakete erledigt oder mit Begründung ausdrücklich verschoben (Eintrag in `V2-STATUS.md`).
* `xvfb-run -a npm test` und Unit-Tests grün auf Ubuntu und Windows; Paket-Tests auf allen drei Systemen in der CI grün.
* Eval-Ratsche: Lecks mit Modell nicht schlechter als 1.8.0 (4 von 150 / 1 von 276), im Ausfallmodus `fallback` nicht schlechter als gemessen (12 von 150 / 11 von 276), mit den **neuen** Korpusfällen aus C1 höchstens so viele wie in der Abnahmetabelle von V2-C; Fehlalarme 0.
* Rundlauf: `Anonymisieren, Zuordnung speichern, neu öffnen, Rückübersetzen` ergibt den Originaltext exakt (Test über alle Korpusdokumente).
* Barrierefreiheit: `axe-core` meldet keine "serious/critical"-Verstöße in den Hauptansichten (D2).
* Updater: Update von 1.8.0 auf 2.0.0 getestet (`verify-release.mjs --upgrade-from`); macOS-Hinweis ehrlich (unsigniert).
* Dokumentation (`README`, `CHANGELOG`, Benutzerhandbuch-Kurzfassung) und Website-Texte (WP 03/04 des Vorgängerplans) aktuell.
* Nutzer hat auf einem echten Windows-Rechner abgenommen (nicht ersetzbar).

## 8. Risiken

| Risiko | Gegenmaßnahme |
|---|---|
| Auslagerung des Kerns (F1) bricht Verhalten | Machbarkeit in P0 gemessen (Go: 212 von 212 Fällen bitgleich im Node-Prototyp); danach Hash-gleiche Ausgabe auf allen Harness-Texten, Golden und Stress-Test; bei Nein: Module trotzdem für **neue** Logik (A-D), Kern bleibt in der HTML |
| Umfang wächst | Muss/Soll/Kann; Betriebsregel: pro Sitzung höchstens 3 Pakete; nur Muss blockiert das Release |
| Schwächeres Modell erfindet Lösungen | Rote Tests zuerst, erlaubte Dateien je Paket, Prüfer mit frischem Kontext, zwei Versuche dann Wechsel/Stopp |
| Passwortverlust bei verschlüsselter Zuordnung | klarer Hinweis vor dem Speichern; Wiederherstellung unmöglich (Zero-Knowledge); CSV-Export bleibt als bewusste Alternative mit Warnung |
| Verschlüsselung falsch umgesetzt | nur Web Crypto, AES-256-GCM, PBKDF2-HMAC-SHA-256 mit hoher Iterationszahl, zufälliges Salz und Nonce je Datei; feste Testvektoren; Review durch Sonnet mittel vor dem Merge (kein Eigenbau-Verfahren) |
| Barrierefreiheit unvollständig | automatischer Test plus Tastatur-Durchlauf; Verstöße unter "moderate" dürfen als Backlog bleiben, dokumentiert |
| Neue Formate öffnen Angriffsfläche (XML, ZIP) | Größen- und Entpack-Grenzen (ZIP-Bomb; Fixture über gefälschtes Zentralverzeichnis), keine externen Entitäten, Zeichenstrom statt Parser, Fuzz-Tests (F4) |
| Nutzerdefinierte Regex-Muster (ReDoS) | gemessen: eine Zeitgrenze ist nicht umsetzbar (JavaScript-Regex lässt sich im Thread nicht abbrechen); stattdessen sichere Teilmenge ohne unbegrenzte Quantoren (C3), linear in der Textlänge |
| Rechenzeit im Kern bei pathologischen Eingaben (gemessen: Minuten) | F5 vor den Fuzz-Tests; Obergrenze 2 s je 100.000 Zeichen |
| Eine Whitelist gibt mehr frei als gedacht (Teilzeichenfolge) | Prüfansicht benutzt exakte Freigaben (`released`); alte Whitelist unverändert |
| Pauschales Verweigern aller Berechtigungen bricht "Kopieren" (gemessen) | nur `clipboard-sanitized-write` erlauben (F2.h) |
