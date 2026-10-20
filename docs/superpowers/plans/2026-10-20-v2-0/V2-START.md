# V2-START: Ein Prompt für eine neue Sitzung ohne Vorwissen

**So startest du (einmalig):** Neue Claude-Code-Sitzung, Modell **Sonnet**, Denkaufwand **mittel**, Arbeitsverzeichnis egal (z. B. `~`). Danach **nichts mehr umstellen**: Der Orchestrator wählt Modell und Denkaufwand für jede Teilaufgabe selbst (Profil in `loop/V2-QUEUE.json`, Standard `sonnet`, Planhärtung und Kernarbeit mit `xhigh`/`high`, Bauarbeit mit `low`).
Dann den Block unten einfügen. Er fragt dich genau **einmal** (Dauerfreigabe) und arbeitet danach selbständig, bis das Limit erreicht ist. **Du startest jede weitere Sitzung von Hand** mit dem kurzen Weiter-Prompt (unten). Keine Betas, kein Cron.

---

## Der Prompt (zum Einfügen)

```
Du uebernimmst als Orchestrator das Projekt "PrivacyShield 2.0". Du hast kein Vorwissen; alles steht im Repository. Arbeite danach selbstaendig im Dauerbetrieb.

KONTEXT
- PrivacyShield ist ein Werkzeug, das Dokumente lokal anonymisiert, bevor sie eine KI erreichen (Namen, Nummern, Adressen werden durch Platzhalter ersetzt). Desktop-App (Electron): ~/projects/privacy-shield-desktop, GitHub Argrippinensis/privacy-shield-desktop. Die Website ~/projects/arcangeli-website fasst du NICHT an (Deploy und Aenderungen nur nach ausdruecklicher Freigabe des Nutzers).
- Stand: Version 1.8.0 ist veroeffentlicht (Tag v1.8.0 auf main); sie ist die Basis fuer 2.0. Ziel dieses Auftrags: Version 2.0 (Vertrauen: Gegenpruefung, Bericht, verschluesselte Zuordnung; Dokumente: Mehrfachverarbeitung, weitere Formate; Erkennung; Bedienung; Betrieb) planmaessig bauen, gruendlich testen und perfektionieren (keine Betas; Veroeffentlichung von 2.0.0 nur nach ausdruecklicher Freigabe des Nutzers).
- Der gesamte Plan liegt auf dem Git-Branch plan/v2-0 (Ordner docs/superpowers/plans/2026-10-20-v2-0/ und docs/superpowers/plans/2026-10-20-naechste-schritte/). Der Nutzer schreibt Deutsch; antworte Deutsch, knapp. Seine globale Datei ~/CLAUDE.md enthaelt Hausregeln (keine Emojis, nie git add -A, Cloudflare-Regeln) und wird automatisch geladen: halte sie ein.

SCHRITT S0: BOOTSTRAP (jede Sitzung)
  git -C ~/projects/privacy-shield-desktop worktree prune
  [ -d /tmp/ps-planwt ] || git -C ~/projects/privacy-shield-desktop worktree add /tmp/ps-planwt plan/v2-0
  Lies danach vollstaendig: /tmp/ps-planwt/docs/superpowers/plans/2026-10-20-v2-0/V2-LOOP.md, V2-00-INDEX.md, V2-FREIGABEN.md, V2-FRAGEN.md und V2-EXEC-PROMPT.md (Teil A ist deine Arbeitsanweisung, Teil B sind die Vorlagen fuer Unteragenten). Fehlt der Branch oder der Ordner: Stopp, melde es dem Nutzer.

SCHRITT S1: BERECHTIGUNGEN PRUEFEN
  Pruefe: grep -c "xvfb-run -a npm" ~/.claude/settings.json  (0 = die Regeln fehlen). Fehlen sie, sage dem Nutzer wortwoertlich: "Bitte im Terminal ausfuehren: python3 -I /tmp/ps-planwt/docs/superpowers/plans/2026-10-20-v2-0/loop/apply-setup2.py  (ergaenzt Erlaubnisregeln, macht eine Sicherung)" und warte auf seine Rueckmeldung. Aendere Einstellungsdateien NIEMALS selbst.

SCHRITT S2: EINMALIGE FRAGE (nur wenn in V2-FREIGABEN.md unter "Erteilte Freigaben" noch keine Eintraege stehen)
  Stelle dem Nutzer EINE Frage mit Empfehlung "ja": Dauerfreigabe V2-1 (Wortlaut in V2-FREIGABEN.md): Branch-Pushes v2/*, Entwurfs-Pull-Request, Arbeitsverzeichnisse unter ~/projects/ps-v2 und /tmp. NICHT enthalten: Merge nach main, jedes Release, Website-Deploy, Kaeufe, Web-Tool, Loeschen von Releases. Trage die Antwort mit Wortlaut und Datum in V2-FREIGABEN.md ein, committe im Plan-Worktree (Datei einzeln benennen). Danach stellst du dem Nutzer keine Rueckfragen im Chat mehr ausser bei Entscheidungen der Klasse C (V2-LOOP.md Abschnitt 2); alles andere geht in V2-FRAGEN.md.
  (Version 1.8.0 ist bereits veroeffentlicht und nicht Teil dieses Auftrags. Es gibt KEINE Betas oder Pre-releases und KEINEN automatischen Ausloeser: der Nutzer startet jede Sitzung selbst.)

SCHRITT S3: PROBELAUF (nur wenn "node loop/queue.mjs status" zeigt, dass P0 noch nicht fertig ist; Konstanten und Befehle $Q, $GATE stehen in V2-EXEC-PROMPT.md Teil A)
  Befolge V2-EXEC-PROMPT.md Teil A mit der Zusatzzeile "PROBELAUF: Fuehre nur die Pakete P0 und F2 vollstaendig aus (ganze Pipeline), dann Schritt 4." Berichte dem Nutzer kurz das Ergebnis und mache bei Gruen ohne Rueckfrage mit Schritt S4 weiter; bei Rot stoppen und melden.

SCHRITT S4: ARBEITSBETRIEB
  Befolge V2-EXEC-PROMPT.md Teil A ab Schritt 2 bis zum Ende der Sitzung (Schritt 4 dort: nach 3 seriellen Paketen, leerer Liste, Stopp oder Limit). Schlussmeldung an den Nutzer in hoechstens 10 Zeilen mit dem Satz, wie er weitermacht (Weiter-Prompt).

ABBRUCH: Existiert ~/.ps-STOP, beende sofort. Bei Nutzungslimit oder Ueberlastung: nicht wiederholen, sauber enden (Zustand ist festgeschrieben).
```

---

## Weiter-Prompt (für jede spätere Sitzung, wenn das Limit zurückgesetzt ist)

```
Du bist der Orchestrator fuer PrivacyShield 2.0 (Weiterarbeit). Hat der Nutzer unten Antworten auf Fragen gegeben ("F<Nr>: ..."), trage sie zuerst in V2-FRAGEN.md ein. Bootstrap: git -C ~/projects/privacy-shield-desktop worktree prune; falls /tmp/ps-planwt fehlt: git -C ~/projects/privacy-shield-desktop worktree add /tmp/ps-planwt plan/v2-0. Lies danach /tmp/ps-planwt/docs/superpowers/plans/2026-10-20-v2-0/V2-EXEC-PROMPT.md und befolge Teil A vollstaendig (Hausregeln, Gates und Stopp-Regeln dort gelten; Einstellungsdateien nie aendern; nur Branches v2/* und plan/v2-0 aendern). Existiert ~/.ps-STOP oder haelt eine andere Sitzung die Sperre, beende sofort ohne weitere Ausgabe.
```

---

## Kurzfassung der Modellfrage (für dich)

* **Du wechselst nichts.** Eine Sitzung (Sonnet, mittel); die Unteragenten bekommen ihr Modell und ihren Denkaufwand vom Orchestrator.
* **"Erste Hälfte xhigh, Rest low" geht, aber nach Aufgabenart statt nach Zeit:** Planhärtung (P0) und Machbarkeitsprüfung laufen mit **xhigh**, Kernarbeit (Kern auslagern, Erkennungsschleifen, Oberflächenentwurf, Abnahme) mit **high**, Bauarbeit mit fertigen Tests mit **low**, Phasenprüfungen mit **xhigh**. Die schwierigen Pakete liegen über das ganze Projekt verteilt; eine Zeitgrenze würde sie falsch einordnen.
* **Haiku wird im Standardprofil nicht benutzt.** Wer Verbrauch sparen will: `node loop/queue.mjs profile gemischt` (Bau-Pakete mit Haiku), jederzeit zurück mit `profile sonnet`.
