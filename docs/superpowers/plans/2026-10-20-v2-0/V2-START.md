# V2-START: Ein Prompt für eine neue Sitzung ohne Vorwissen

**So startest du (einmalig):** Neue Claude-Code-Sitzung, Modell **Sonnet**, Denkaufwand **mittel**, Arbeitsverzeichnis egal (z. B. `~`). Danach **nichts mehr umstellen**: Der Orchestrator wählt Modell und Denkaufwand für jede Teilaufgabe selbst (Profil in `loop/V2-QUEUE.json`, Standard `sonnet`, Planhärtung und Kernarbeit mit `xhigh`/`high`, Bauarbeit mit `low`).
Dann den Block unten einfügen. Er fragt dich genau **einmal** (Dauerfreigabe, Auslöser) und arbeitet danach selbständig; ein Auslöser setzt die Arbeit nach jedem Limit von allein fort.

---

## Der Prompt (zum Einfügen)

```
Du uebernimmst als Orchestrator das Projekt "PrivacyShield 2.0". Du hast kein Vorwissen; alles steht im Repository. Arbeite danach selbstaendig im Dauerbetrieb.

KONTEXT
- PrivacyShield ist ein Werkzeug, das Dokumente lokal anonymisiert, bevor sie eine KI erreichen (Namen, Nummern, Adressen werden durch Platzhalter ersetzt). Desktop-App (Electron): ~/projects/privacy-shield-desktop, GitHub Argrippinensis/privacy-shield-desktop. Die Website ~/projects/arcangeli-website fasst du NICHT an (Deploy und Aenderungen nur nach ausdruecklicher Freigabe des Nutzers).
- Stand: v1.7.0 ist veroeffentlicht. Version 1.8.0 liegt als Entwurfs-Pull-Request #2 (Branch release/1.8.0) bereit. Ziel dieses Auftrags: Version 2.0 (Vertrauen: Gegenpruefung, Bericht, verschluesselte Zuordnung; Dokumente: Mehrfachverarbeitung, weitere Formate; Erkennung; Bedienung; Betrieb) planmaessig bauen, testen, perfektionieren und in Betas bis zur Freigabe bringen.
- Der gesamte Plan liegt auf dem Git-Branch plan/v2-0 (Ordner docs/superpowers/plans/2026-10-20-v2-0/ und docs/superpowers/plans/2026-10-20-naechste-schritte/). Der Nutzer schreibt Deutsch; antworte Deutsch, knapp. Seine globale Datei ~/CLAUDE.md enthaelt Hausregeln (keine Emojis, nie git add -A, Cloudflare-Regeln) und wird automatisch geladen: halte sie ein.

SCHRITT S0: BOOTSTRAP (jede Sitzung)
  git -C ~/projects/privacy-shield-desktop worktree prune
  [ -d /tmp/ps-planwt ] || git -C ~/projects/privacy-shield-desktop worktree add /tmp/ps-planwt plan/v2-0
  Lies danach vollstaendig: /tmp/ps-planwt/docs/superpowers/plans/2026-10-20-v2-0/V2-LOOP.md, V2-00-INDEX.md, V2-FREIGABEN.md, V2-FRAGEN.md und V2-EXEC-PROMPT.md (Teil A ist deine Arbeitsanweisung, Teil B sind die Vorlagen fuer Unteragenten). Fehlt der Branch oder der Ordner: Stopp, melde es dem Nutzer.

SCHRITT S1: BERECHTIGUNGEN PRUEFEN
  Pruefe: grep -c "xvfb-run -a npm" ~/.claude/settings.json  (0 = die Regeln fehlen). Fehlen sie, sage dem Nutzer wortwoertlich: "Bitte im Terminal ausfuehren: python3 -I /tmp/ps-planwt/docs/superpowers/plans/2026-10-20-v2-0/loop/apply-setup2.py  (ergaenzt Erlaubnisregeln, macht eine Sicherung)" und warte auf seine Rueckmeldung. Aendere Einstellungsdateien NIEMALS selbst.

SCHRITT S2: EINMALIGE FRAGEN (nur wenn in V2-FREIGABEN.md unter "Erteilte Freigaben" noch keine Eintraege stehen)
  Stelle dem Nutzer EINE gebuendelte Nachricht mit zwei Fragen, jeweils mit Empfehlung "ja":
   (1) Freigabe V2-1 (Wortlaut steht in V2-FREIGABEN.md): Routine ohne Einzelbestaetigung, darunter Merge von PR #2 (1.8.0) nach gruener CI, Tag v1.8.0 und Pruefung des Releases, Branch-Pushes v2/*, Vorabversionen 2.0.0-beta.N und -rc.N als GitHub-Pre-release. NICHT enthalten: 2.0.0 final, Website-Deploy, Kaeufe, Web-Tool, Loeschen von Releases.
   (2) Automatischen Ausloeser einrichten (alle 2 Stunden eine frische Sitzung, die nach einem Nutzungslimit selbst weiterarbeitet).
  Trage die Antworten MIT dem Wortlaut des Nutzers und dem Datum in V2-FREIGABEN.md (Tabelle "Erteilte Freigaben") ein und committe im Plan-Worktree (Datei einzeln benennen). Ohne ausdrueckliches "Ja" gilt die Freigabe als nicht erteilt; arbeite dann trotzdem an allem, was keine Freigabe braucht. Danach stellst du dem Nutzer keine Rueckfragen im Chat mehr ausser bei Entscheidungen der Klasse C (siehe V2-LOOP.md Abschnitt 2); alles andere geht in V2-FRAGEN.md plus Push-Nachricht.

SCHRITT S3: VERSION 1.8.0 (nur wenn V2-1 erteilt ist und PR #2 noch offen)
  gh pr checks 2 im Repo ~/projects/privacy-shield-desktop: sind alle Pruefungen gruen (Ubuntu und Windows), dann: gh pr ready 2 && gh pr merge 2 --merge --delete-branch; danach im Arbeitsverzeichnis git checkout main && git pull --ff-only origin main, git tag v1.8.0 && git push origin v1.8.0, Build beobachten (gh run watch), dann xvfb-run -a node scripts/verify-release.mjs v1.8.0 --upgrade-from v1.7.0 --deep. Meldet etwas FEHLER oder ist die CI rot: nicht veroeffentlichen bzw. nicht weitermachen, Push-Nachricht, Frage in V2-FRAGEN.md. (Release nie loeschen; Korrektur wird v1.8.1.)

SCHRITT S4: PROBELAUF (wenn "node loop/queue.mjs status" zeigt, dass P0 noch nicht fertig ist; Konstanten und Befehle $Q, $GATE stehen in V2-EXEC-PROMPT.md Teil A)
  Befolge V2-EXEC-PROMPT.md Teil A mit der Zusatzzeile "PROBELAUF: Fuehre nur die Pakete P0 und F2 vollstaendig aus (ganze Pipeline), dann Schritt 4." Berichte dem Nutzer kurz das Ergebnis (nicht um Erlaubnis bitten, einfach weitermachen, sofern alles gruen ist; bei Rot stoppen und melden).

SCHRITT S5: AUSLOESER (nur wenn der Nutzer in S2 zugestimmt hat und der Probelauf gruen war)
  1. list_environments (MCP claude-code-remote) und get_session (diese Sitzung): notiere die Umgebung. Der Ausloeser muss in einer Umgebung laufen, die ~/projects/ps-v2 und /tmp/ps-planwt erreicht (dieselbe Maschine).
  2. create_trigger (Werkzeug mcp__claude-code-remote__create_trigger; falls nicht geladen: ToolSearch select:mcp__claude-code-remote__create_trigger): name "PrivacyShield 2.0 Orchestrator", cron_expression "0 */2 * * *", create_new_session_on_fire true, initiation human_request, prompt = der Text im Abschnitt "Auslöser-Prompt" von V2-START.md (aus dem Plan-Worktree lesen und einsetzen).
  3. Test: fire_trigger einmal; pruefe mit list_sessions/list_events, dass die ausgeloeste Sitzung die Pfade erreicht und ihre Sperre/Stopp-Pruefung ausfuehrt (sie darf sich bei gehaltener Sperre sofort beenden: das ist richtig). Erreicht sie die Pfade nicht: delete_trigger, Nutzer informieren (Push + Chat), ohne Ausloeser weiterarbeiten.
  4. Trage den Ausloeser (trigger_id, Cron, Datum) in V2-ENTSCHEIDUNGEN.md ein und committe.

SCHRITT S6: DAUERBETRIEB
  Befolge V2-EXEC-PROMPT.md Teil A ab Schritt 2 bis zum Ende der Sitzung (Schritt 4 dort). Danach ist diese Sitzung fertig; der Ausloeser uebernimmt. Schlussmeldung an den Nutzer in hoechstens 10 Zeilen.

ABBRUCH: Existiert ~/.ps-STOP, beende sofort. Bei Nutzungslimit oder Ueberlastung: nicht wiederholen, sauber enden (Zustand ist festgeschrieben).
```

---

## Auslöser-Prompt (wird von S5 in den geplanten Auslöser eingesetzt)

```
NICHT INTERAKTIV: Es antwortet niemand im Chat. Fragen nur in V2-FRAGEN.md und per Push-Nachricht.
Du bist der Orchestrator fuer PrivacyShield 2.0 (Dauerbetrieb). Bootstrap: git -C ~/projects/privacy-shield-desktop worktree prune; falls /tmp/ps-planwt fehlt: git -C ~/projects/privacy-shield-desktop worktree add /tmp/ps-planwt plan/v2-0. Lies danach /tmp/ps-planwt/docs/superpowers/plans/2026-10-20-v2-0/V2-EXEC-PROMPT.md und befolge Teil A vollstaendig (Hausregeln, Gates und Stopp-Regeln dort gelten; Einstellungsdateien nie aendern; nur Branches v2/* und plan/v2-0 aendern). Existiert ~/.ps-STOP oder haelt eine andere Sitzung die Sperre, beende sofort ohne weitere Ausgabe.
```

---

## Kurzfassung der Modellfrage (für dich)

* **Du wechselst nichts.** Eine Sitzung (Sonnet, mittel); die Unteragenten bekommen ihr Modell und ihren Denkaufwand vom Orchestrator.
* **"Erste Hälfte xhigh, Rest low" geht, aber nach Aufgabenart statt nach Zeit:** Planhärtung (P0) und Machbarkeitsprüfung laufen mit **xhigh**, Kernarbeit (Kern auslagern, Erkennungsschleifen, Oberflächenentwurf, Abnahme) mit **high**, Bauarbeit mit fertigen Tests mit **low**, Phasenprüfungen mit **xhigh**. Die schwierigen Pakete liegen über das ganze Projekt verteilt; eine Zeitgrenze würde sie falsch einordnen.
* **Haiku wird im Standardprofil nicht benutzt.** Wer Verbrauch sparen will: `node loop/queue.mjs profile gemischt` (Bau-Pakete mit Haiku), jederzeit zurück mit `profile sonnet`.
