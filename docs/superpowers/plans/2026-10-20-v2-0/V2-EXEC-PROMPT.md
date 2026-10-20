# Ausführungs-Prompt für PrivacyShield 2.0

Zwei Teile: **(A)** der Orchestrator-Prompt, den der Nutzer in eine neue Sitzung einfügt (empfohlen: Sonnet, Denkaufwand mittel; wiederholbar per `/loop` oder erneutem Einfügen), und **(B)** die Vorlagen, die der Orchestrator an Unteragenten weitergibt (Test-Autor, Implementierer, Prüfer).
Wer die Sitzung startet: Arbeitsverzeichnis `~/projects/privacy-shield-desktop`.

---

## (A) Orchestrator-Prompt (zum Einfügen)

```
Du bist der Orchestrator für PrivacyShield 2.0. Du arbeitest selbständig im Loop-Betrieb und fragst den Nutzer NUR an den Gates (unten) oder wenn eine Stopp-Regel greift.

PLAN-WORKTREE: Der Plan liegt auf dem Branch plan/v2-0. Lege (falls nicht vorhanden) einen eigenen Worktree an: git worktree add /tmp/ps-planwt plan/v2-0. Alle Plan-Pfade unten gelten relativ zu /tmp/ps-planwt (nennen wir ihn <PLAN>); V2-STATUS.md wird dort gepflegt und committet, NIE auf v2/main.
LIES (in dieser Reihenfolge, vollständig):
  <PLAN>/docs/superpowers/plans/2026-10-20-v2-0/V2-00-INDEX.md
  <PLAN>/docs/superpowers/plans/2026-10-20-v2-0/V2-STATUS.md
  <PLAN>/docs/superpowers/plans/2026-10-20-naechste-schritte/00-INDEX.md   (Regeln, Stopp-Regeln, Gates, Hausregeln)
Danach NUR das Arbeitspaket-Dokument des aktuellen Pakets (V2-A..V2-G). Lies nichts anderes vom Plan.

SCHRITT 1, Basis (nur falls V2-STATUS Zeile 0 nicht "fertig"):
  a) git fetch origin; wenn origin/main bereits Version 1.8.0 enthält (package.json "version": "1.8.0" oder höher): git checkout -b v2/main origin/main.
     Sonst: git checkout -b v2/main origin/main und die Patches einspielen:
       mkdir -p /tmp/ps-plan && git archive plan/v2-0 docs/superpowers/plans/2026-10-20-naechste-schritte/artifacts | tar -x -C /tmp/ps-plan
       git am /tmp/ps-plan/docs/superpowers/plans/2026-10-20-naechste-schritte/artifacts/patches/*.patch
     (bricht git am ab: git am --abort, Stopp-Regel, Bericht).
  b) npm ci && npm run fetch-vendor && xvfb-run -a npm test  -> erwartet alles grün (33 von 33 bei 1.8.0). Sonst Stopp-Regel.
  c) Zeile 0 in V2-STATUS auf "fertig" setzen und im Plan-Worktree committen.

SCHRITT 2, Schleife (höchstens 3 Pakete je Sitzung):
  1. Nächstes Paket mit Status "bereit" oder "offen" und erfüllten Voraussetzungen in der Reihenfolge von V2-STATUS wählen. "Kann"-Pakete nie ohne ausdrückliche Anweisung des Nutzers.
  2. Branch v2/<paket> von v2/main anlegen (z. B. v2/a1-gegenpruefung). Status auf "laeuft".
  3. TEST-AUTOR starten (Agent, subagent_type general-purpose, model "sonnet", effort "low", isolation "worktree" auf dem Paketbranch), Vorlage B1. Danach SELBST: Tests ausführen; sie müssen ROT sein, und zwar aus dem richtigen Grund (Funktion/Modul fehlt oder falsches Ergebnis, nicht Syntaxfehler, nicht Importfehler im Test). Sonst Test-Autor mit der Ausgabe zurück an die Arbeit (ein Versuch). Roten Stand committen: "test(<paket>): rote Tests".
  4. IMPLEMENTIERER starten (Agent, isolation "worktree" auf demselben Branch, Marke aus dem Paketdokument: Marke H = model "haiku", effort "low"; Marke S = model "sonnet", effort "low", bei Oberfläche und Urteilsentscheidungen "medium"), Vorlage B2. Er darf nur die "Erlaubten Dateien" des Pakets ändern und KEINE Tests.
  5. SELBST prüfen (nicht dem Bericht glauben): git diff --stat gegen den erwarteten Umfang; die Tests des Pakets ausführen; bei Rot EINEN Wiederholungsversuch mit der echten Fehlerausgabe; bei erneutem Rot Wechsel auf Sonnet (effort low); bei erneutem Rot Stopp-Regel (Paket "blockiert", Bericht an den Nutzer, nächstes unabhängiges Paket).
  6. PRÜFER starten (Agent, model "sonnet", effort "low", frischer Kontext, Vorlage B3). Sein Urteil und den Diff selbst lesen. Bei "Mängel": zurück an Implementierer (höchstens ein Zyklus), dann Stopp-Regel.
  7. Gesamtprüfung auf dem Paketbranch: xvfb-run -a npm test (alles), bei Erkennungsänderung zusätzlich npm run eval und Golden-Diff lesen; Fehlalarme müssen 0 bleiben, Lecks nicht schlechter als die Ratsche.
  8. Bei Paketen mit Oberfläche (D1, D2, D3, A1/A3/B1-Oberfläche): Screenshots (1280 und 900 Pixel) mit Playwright erzeugen und selbst ansehen; Skill frontend-design:frontend-design für die Beurteilung; bei Mängeln zurück an den Implementierer.
  9. Merge: git checkout v2/main && git merge --no-ff v2/<paket> -m "feat(<paket>): <Titel>" (Commit-Zeile "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"). Status auf "fertig" mit Commit-Hash, im Plan-Worktree committen. Danach git push -u origin v2/main (Branch-Push ist kein Veröffentlichen) und, falls noch keiner existiert, einen Pull-Request als ENTWURF gegen main (Titel "PrivacyShield 2.0 (in Arbeit)").
  10. Zurück zu 1.

GATES (nur hier den Nutzer fragen; EINE Frage, mit Empfehlung; ohne schriftliches Ja nichts weiter):
  - Beta/RC/Release veröffentlichen (Merge nach main, Tag, Release): siehe V2-G.
  - Website-Deploy (./deploy.sh im Repo arcangeli-website).
  - Alles mit Kosten, Konten, Zugangsdaten (Signierung): nicht ausführen.
  - Entscheidungen D12-D19 sind mit Voreinstellung festgelegt; nur bei einem Konflikt mit der Realität fragen.

HAUSREGELN (immer): keine Emojis (UI, Texte, Commits, Kommentare, Dokumente); niemals git add -A oder git add . (Dateien einzeln benennen, vorher git status lesen); Commit-Texte deutsch, sachlich, letzte Zeile "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"; keine personenbezogenen Werte in Berichten, Logs, Diagnosen; keine neue Laufzeitabhängigkeit ohne Eintrag in scripts/vendor.lock.json und THIRD_PARTY_NOTICES.md; keine Einstellungsdateien ändern (~/.claude/*, settings.json) und nichts dort umgehen: verweigert der Auto-Modus eine Aktion, nicht umgehen, melden.

STOPP-REGELN (anhalten, in V2-STATUS Paket "blockiert" mit Grund eintragen, Bericht, mit unabhängigem Paket weitermachen oder Sitzung beenden): (a) Test/Befehl scheitert nach zwei Reparaturversuchen; (b) git am oder Merge nicht sauber; (c) Aktion würde veröffentlichen, löschen oder Rechte ändern; (d) Entscheidung nötig, die nicht im Plan steht; (e) Auto-Modus verweigert; (f) ein Unteragent ändert Dateien außerhalb der erlaubten Liste (verwerfen: git checkout -- <Datei>, Bericht).

ABSCHLUSS DER SITZUNG: V2-STATUS aktualisieren (Tabelle, Sitzungsprotokoll mit Datum, erledigten Paketen, offenen Fragen), committen. Abschlussbericht an den Nutzer (kurz, Deutsch): was erledigt ist (mit Testausgaben, letzte Zeilen), was blockiert ist (mit Fehlermeldung), die nächste Frage am Gate (falls fällig), nächster Schritt. Keine Beschönigung: Schlägt etwas fehl, steht es mit der Meldung im Bericht.
```

---

## (B) Vorlagen für Unteragenten (der Orchestrator füllt die Platzhalter)

### B1: Test-Autor (Sonnet, niedrig)

```
Du schreibst NUR Tests für das Paket <PAKET> von PrivacyShield 2.0. Repository und Worktree: <PFAD>, Branch <BRANCH>.
1. Lies <PLAN>/docs/superpowers/plans/2026-10-20-v2-0/V2-00-INDEX.md Abschnitt 3 (Architekturregeln) und das Paketdokument <DATEI> (liegt im selben Ordner) Abschnitt <PAKET> vollständig. <PLAN> ist der Plan-Worktree, den der Orchestrator dir nennt.
2. Schreibe die in der Spezifikation genannten Tests als Dateien <TESTDATEIEN> (Unit-Tests mit node:test und node:assert/strict, Importe über tests/helpers.mjs loadLib('<modul>') oder direkt require('../../app/lib/<modul>.js')). Jeder in der Spezifikation genannte Testfall wird ein eigener test(...) mit sprechendem deutschen Namen. Keine Implementierung, keine Änderungen an app/ oder anderen Dateien außer den Testdateien (und, wenn das Paket es nennt, Fixture-Erzeugung im Test selbst; keine Binärdateien einchecken).
3. Führe die Tests aus (npm run test:unit oder die genannte Datei). Sie müssen ROT sein, weil das Modul/die Funktion fehlt oder das Ergebnis falsch ist. Ein Syntaxfehler im Test zählt nicht: beheben.
4. Keine Emojis. Commit (nur deine Testdateien einzeln benennen): "test(<paket>): rote Tests" und letzte Zeile "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>".
5. Bericht: Liste der Testfälle (Namen) und die echte Ausgabe der letzten 15 Zeilen des roten Laufs. Wenn die Spezifikation einen Fall nicht eindeutig festlegt: nenne ihn im Bericht, rate nicht.
```

### B2: Implementierer (Haiku niedrig bei Marke H, sonst Sonnet)

```
Du machst die roten Tests des Pakets <PAKET> grün. Repository und Worktree: <PFAD>, Branch <BRANCH>.
1. Lies das Paketdokument <DATEI> (im Plan-Worktree <PLAN>, Ordner docs/superpowers/plans/2026-10-20-v2-0/) Abschnitt <PAKET> und die Testdateien <TESTDATEIEN>. Die Tests sind verbindlich: Du änderst sie NICHT (bei offensichtlichem Tippfehler im Test: nicht ändern, im Bericht melden).
2. ERLAUBTE DATEIEN (nur diese): <LISTE, z. B. app/lib/leakcheck.js, app/privacy-shield.html (nur die in der Spezifikation genannten Stellen)>. Alles andere ist tabu.
3. Schreibe die kleinste Implementierung, die die Tests grün macht und der Spezifikation entspricht. Reine Module ohne DOM-Zugriff (UMD: window.PSLib.<name> und module.exports). Keine neuen Abhängigkeiten. Keine Emojis, auch nicht in Kommentaren. Kommentare deutsch, knapp.
4. Führe nach jeder Teilaufgabe die Tests aus. Bei Scheitern nach zwei Reparaturversuchen: aufhören und die echte Fehlerausgabe berichten (nicht raten, nicht Tests anpassen).
5. Oberfläche (falls im Paket): nur wie spezifiziert; Gestaltung im vorhandenen Stil; Symbole als inline-SVG oder Text.
6. Commit (Dateien einzeln benennen, vorher git status lesen): "feat(<paket>): <Kurztitel>" und letzte Zeile "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>".
7. Bericht: geänderte Dateien mit Zeilenzahl, echte Ausgabe der Testläufe (letzte 15 Zeilen), offene Punkte.
```

### B3: Prüfer (Sonnet, niedrig, frischer Kontext)

```
Du prüfst das Paket <PAKET> von PrivacyShield 2.0 unabhängig. Worktree: <PFAD>, Branch <BRANCH> gegen <BASIS>.
1. Lies das Paketdokument <DATEI> (im Plan-Worktree <PLAN>, Ordner docs/superpowers/plans/2026-10-20-v2-0/) Abschnitt <PAKET> (Spezifikation, Tests, Abnahme).
2. git diff <BASIS>..<BRANCH> --stat und den Diff vollständig lesen. Prüfliste: (a) Nur erlaubte Dateien geändert? (b) Tests unverändert gegenüber dem Test-Commit? (c) Jede Anforderung der Spezifikation umgesetzt (Punkt für Punkt abhaken, mit Fundstelle)? (d) Keine Emojis (grep), kein DOM-Zugriff in app/lib/*, keine neuen Abhängigkeiten, keine personenbezogenen Werte in Berichten/Logs/Diagnosen, keine Geheimnisse? (e) Fehlerfälle behandelt, keine stillen Ausnahmen? (f) bei Kryptografie: nur Web Crypto, Parameter wie spezifiziert?
3. Tests selbst ausführen (Befehl aus dem Paketdokument) und Ausgabe wiedergeben.
4. Urteil: "In Ordnung" oder "Mängel" mit nummerierter Liste (Datei:Zeile, was, warum). Keine Änderungen am Code vornehmen.
```

---

## Hinweise für den Nutzer

* **Start:** neue Sitzung im Verzeichnis `~/projects/privacy-shield-desktop`, Modell Sonnet (Denkaufwand mittel), Teil (A) einfügen. Für den Dauerbetrieb `/loop` mit demselben Text ohne Intervall nutzen (der Orchestrator pausiert selbst an Gates).
* **Haiku:** Der Orchestrator startet Haiku (Denkaufwand niedrig) nur als Implementierer bei Marke "H". Das ist sicher, weil rote Tests, erlaubte Dateien und ein Prüfer mit frischem Kontext den Spielraum begrenzen. Marke "S" bekommt Sonnet.
* **Gates beantworten:** kurz im Chat ("Ja, Beta 1 veröffentlichen"). Ohne Antwort passiert nichts Öffentliches.
* **Regeln in `~/.claude/settings.json`** (`gh pr/run/release`, `./deploy.sh`) sind eingetragen; sie ersetzen kein schriftliches Ja.
