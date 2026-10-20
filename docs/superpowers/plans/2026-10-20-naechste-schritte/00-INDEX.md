# PrivacyShield: Nächste Schritte (Plan vom 20.10.2026)

> **Für Ausführende (Agenten):** Lies zuerst diese Datei vollständig, dann nur das Arbeitspaket (WP), das dir zugewiesen ist.
> Arbeite die Schritte der Reihe nach ab, führe die genannten Befehle wörtlich aus und prüfe jede Abnahmebedingung selbst.
> Halte dich an Abschnitt 5 (Regeln und Stopp-Regeln). **Veröffentlichen (Merge, Tag, Release, Deploy) nur nach schriftlicher
> Bestätigung des Nutzers im Chat, jeweils für genau diese Veröffentlichung.**

**Ausgangslage:** Desktop-App v1.7.0 ist veröffentlicht (`Argrippinensis/privacy-shield-desktop`), die Website `arcangeli.eu/desktop`
verlinkt darauf. Dieser Plan entstand aus einer unabhängigen Prüfung des Rollouts, Messungen an der App und Prototypen in
Wegwerfkopien. Alle Zahlen und Belege stehen in [`anhang-evidenz.md`](anhang-evidenz.md).

## 1. Kurzfassung

| Thema | Ergebnis der Prüfung |
|---|---|
| Rollout 1.7.0 | Technisch abgeschlossen und belegt: Release öffentlich und "latest", alle Installer vorhanden, Prüfsumme der exe stimmt, Installer enthalten Modell und Laufzeit, **Update 1.6.2 auf 1.7.0 unter Linux real durchgespielt** (Hinweis, Download, Austausch der Datei, Neustart), Website live mit richtigen Links. Offen: Windows und macOS wurden hier nie ausgeführt; das macOS-ZIP ist nur arm64 und völlig unsigniert; Release-Text dünn; Download-Links der Website veralten bei jedem Release. Details: [`01-rollout-abschluss.md`](01-rollout-abschluss.md). |
| Erkennungsqualität | Der Kernfehler eines Datenschutzwerkzeugs ist ein **Leck**: ein personenbezogener Wert bleibt nach dem Anonymisieren im Text. Mit v1.7.0 lassen 27 von 91 Handfällen und 87 von 276 synthetischen Werten (32 %) Lecks zu, bei einer breiten DSGVO-Probe 41 von 59 Fällen. Das öffentliche Web-Tool (ohne KI) liegt bei 37 von 91 bzw. 109 von 276. |
| Referenzserie 1.8.0 | **11 geprüfte Commits** (Patch-Dateien), 33 Tests grün unter Electron 35 (Electron 44: 26 von 26 vor Patch 0011): Leckquote synthetisch 87 auf 1 von 276, Handfälle 27 auf 0, DSGVO-Probe 41 auf 4 von 59, Fehlalarme 0, große Dokumente bis 8-mal schneller, KI standardmäßig an, Updater sperrt nie aus, feste Download-Namen, macOS beide Architekturen, CI-Tests auf allen Plattformen, **sichtbare Ursache statt "Modell konnte nicht geladen werden"** (Patch 0011). |
| Gemeldeter Fehler | Ein Nutzer sieht "Modell konnte nicht geladen werden". **Ursache geklärt und nachgestellt:** Er hat laut Download-Zeitpunkt (19.10., 20:21 Uhr) Version 1.1.0 (die Seite verlinkte bis 21:52 Uhr noch auf das alte Release); diese Version lädt das KI-Modell beim ersten Gebrauch aus dem Internet, und das scheitert in gesperrten oder instabilen Netzen mit genau dem Text vom Foto. 1.7.0 enthält das Modell, das angebotene Update löst das Problem. Ab 1.8.0 (Patch 0011) nennt die App die Ursache. Details: [`01-rollout-abschluss.md`](01-rollout-abschluss.md). |
| Noch nicht erledigt | Veröffentlichung der Serie, Website (feste Links, Handy-App), Ausreißer-Schleife mit realistischen Dokumenten, Electron 44 und Bibliotheken, Signierung, Web-Tool-Parität. |

## 2. Arbeitspakete

Status: `offen`, `bereit` (Voraussetzungen erfüllt), `Gate` (wartet auf Nutzer), `erledigt`.

| WP | Titel | Repo | Voraussetzung | Modell / Aufwand des Ausführenden | Gate |
|---|---|---|---|---|---|
| 01 | [Rollout 1.7.0 abschließen](01-rollout-abschluss.md) | beide | keine | Haiku oder Sonnet niedrig, 0,5 h | nein |
| 02 | [Release 1.8.0 aus der Referenzserie](02-release-1.8.0.md) | desktop | 01 | Sonnet niedrig bis mittel, 2-3 h (CI-Läufe warten) | **G1** Merge und Release |
| 03 | [Website: feste Download-Links, Texte, Link-Test](03-website-downloads.md) | website | 02 veröffentlicht und geprüft | Haiku, 1 h; Prüfung durch Sonnet | **G2** Deploy |
| 04 | [Website: PrivacyShield als Handy-App, Emoji-Fix, Handy-Layout](04-website-handy-app.md) | website | keine (parallel zu 02/03) | Sonnet niedrig, 2 h | **G2** Deploy |
| 05 | [DSGVO-Testkorpus und Ausreißer-Schleife](05-dsgvo-testkorpus-und-ausreisser.md) | desktop | 02 gemergt | **Sonnet mittel** (Urteilsvermögen nötig), mehrere Durchläufe | G1 für das Release |
| 06 | [Web-Tool-Parität (arcangeli.eu)](06-web-tool-paritaet.md) | website | 05 oder 02, Entscheidung D2 | Sonnet niedrig bis mittel, 3 h | **G3** + G2 |
| 07 | [Electron 44 und Härtung](07-electron-und-haertung.md) | desktop | 02 gemergt | Sonnet niedrig, 2 h | G1 für das Release |
| 08 | [Bibliotheken aktualisieren](08-bibliotheken.md) | desktop | 07 | Sonnet mittel, je Bibliothek 1-2 h | G1 für das Release |
| 09 | [Signierung und Vertrauen](09-signierung-und-vertrauen.md) | desktop | Entscheidung D4/D5 | Entscheidung beim Nutzer, danach Sonnet niedrig | **G4** |
| 10 | [Modell-Spike: Ergebnis und Wiedervorlage](10-modell-spike.md) | desktop | keine | nur bei Wiedervorlage, hohes Denkniveau | nein |

Empfohlene Modellzuordnung: **Haiku** nur für mechanische Pakete mit fertigen Skripten und Prüfbefehlen (01, 03). **Sonnet niedrig**
für Pakete, in denen fertige Patches eingespielt und Fehlschläge in CI oder Tests diagnostiziert werden müssen (02, 04, 06, 07).
**Sonnet mittel** für Pakete mit Urteilsvermögen pro Fall (05, 08). Entscheidungen (09, 10) trifft der Nutzer oder die
planende Instanz. Begründung: Haiku ist bei der Fehlersuche (CI, Regex-Randfälle) deutlich schwächer; ein Fehlgriff kostet
mehr als der gesparte Denkaufwand.

## 3. Reihenfolge und Releases

```
Release 1.8.0:   01 -> 02 (G1) -> 03 + 04 (G2, ein gemeinsamer Website-Deploy)
Release 1.9.0:   05 (Schleife, mehrere Durchläufe) + 07 + ggf. 08 -> G1
danach:          06 (Web-Tool, G3), 09 (nach Entscheidung)
```

Warum so: 02 zuerst, weil alle weiteren Pakete auf dem Mess-Harness, den Tests und der CI aufbauen. 03 erst nach der
Veröffentlichung, weil die festen Links vorher auf 404 zeigen würden. 04 ist unabhängig und kann sofort vorbereitet werden.
05 liefert die Verbesserungen, die später in 06 auch ins Web-Tool wandern. 07 und 08 sind Wartung mit Testnetz.

## 4. Was bereits geprüft vorliegt (nicht neu bauen)

* **Referenzserie** `artifacts/patches/0001..0011-*.patch`: gebaut gegen `main` (Stand `dcb1503`, v1.7.0), in einem frischen Klon
  mit `git am` eingespielt (identischer Baum), komplette Suite 33/33 grün unter Electron 35 (Electron 44: 26/26 vor Patch 0011), `actionlint` für beide
  Workflows ohne Beanstandung.
* **Website-Artefakte** `artifacts/website/`: Handy-App (Manifest, Service Worker, Icons, Patch, Test; in Chromium als
  installierbar bestätigt, Offline-Start getestet), Patch der Download-Seite, Link-Prüfskript.
* **Modell-Vorabmessung** `artifacts/model-spike/`: Skript und Ergebnis in [`10-modell-spike.md`](10-modell-spike.md).

## 5. Regeln für Ausführende

**Hausregeln (aus `~/CLAUDE.md`, gelten immer):**
* Keine Emojis, nirgends (Oberfläche, Texte, Commits, Kommentare, Doku). Statt dessen SVG-Symbol oder Text.
* Niemals `git add -A` oder `git add .`: Dateien einzeln benennen, vorher `git status` prüfen (kein `.env`, keine Tokens).
* `src/` ist die Quelle bei `arcangeli-website`; nie Produktions-HTML direkt bearbeiten; Deploy nur mit `./deploy.sh`,
  nie `wrangler` direkt.
* `arcangeli.eu` bleibt inhaltlich unberührt, außer der Nutzer hat die Änderung ausdrücklich verlangt (siehe Entscheidungen).
* Commit-Nachrichten deutsch, sachlich; Zeile am Ende: `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.

**Arbeitsweise:**
* Ein Branch je Arbeitspaket, Pull Request als **Entwurf**; Tests vor dem Push lokal ausführen.
* Prüfbefehle selbst ausführen und die echte Ausgabe lesen. Nichts als erledigt melden, was nicht ausgeführt wurde.
* Neue Fehler im Erkennungsverhalten immer zuerst als Fall in `tests/eval/cases*.mjs` anlegen (rot), dann beheben (grün).
* Eigene Temp-Dateien nur unter `/tmp`; keine fremden Prozesse mit `pkill -f` beenden (trifft sonst die eigene Shell):
  PIDs gezielt beenden.

**Stopp-Regeln (anhalten und berichten, nicht improvisieren):**
1. Ein Test oder Befehl schlägt auch nach **zwei** Reparaturversuchen fehl.
2. Ein Patch lässt sich nicht sauber einspielen (`git am` bricht ab): `git am --abort`, Bericht mit Fehlermeldung.
3. Eine Aktion würde etwas veröffentlichen, löschen oder Rechte ändern, ohne dass die Bestätigung des Nutzers vorliegt.
4. Eine Entscheidung wird nötig, die nicht in Abschnitt 6 mit Voreinstellung steht.
5. Der Auto-Modus verweigert eine Aktion: nicht umgehen (keine Einstellungen ändern, keine Umwege), sondern melden.

**Gates (Bestätigung des Nutzers, schriftlich im Chat):**
G1 Merge und Release einer Desktop-Version. G2 Deploy der Website. G3 Änderungen an der Erkennung oder am Design des Web-Tools
auf arcangeli.eu. G4 Käufe und Konten für Signierung. Die Anfrage an den Nutzer ist **eine Frage mit Empfehlung**, nicht mehrere.

## 6. Entscheidungen (mit Voreinstellung, damit nicht nachgefragt werden muss)

| Nr | Frage | Voreinstellung | Wer entscheidet |
|---|---|---|---|
| D1 | Referenzserie als Release 1.8.0 veröffentlichen? | ja, nach G1 | Nutzer (G1) |
| D2 | Erkennungsverbesserungen auch im Web-Tool (arcangeli.eu)? Sie sind Sicherheitskorrekturen, berühren aber die Regel "arcangeli.eu inhaltlich unberührt". | **ja**, Erkennung und Handy-Layout und Emoji-Fix; kein neues Design | Nutzer (G3) |
| D3 | Profile: Standard enthält jetzt Karten, Kfz, Geräte, Zugangsdaten, Standort, Auslandskennungen, IP und Links; Begriffslisten für Art. 9/10 nur in "Medizin" und neuem Profil "Maximal" | wie umgesetzt | Nutzer, nur bei Änderungswunsch |
| D4 | macOS: jetzt Ad-hoc-Signatur und manueller Update-Weg; Apple Developer Program (99 USD/Jahr) für Notarisierung | Ad-hoc jetzt, Notarisierung nach Kauf | Nutzer (G4) |
| D5 | Windows: Signierung gegen SmartScreen-Warnung (Azure Artifact Signing, OV- oder EV-Zertifikat) | zunächst Hinweis auf der Website, Entscheidung nach Kostenvergleich in WP 09 | Nutzer (G4) |
| D6 | PII-Modell (`bardsai v2`) statt des heutigen Modells? | **nein**: etwa 10-mal langsamer, 2,3-mal größer, erkennt Diagnosen und Medikamente trotzdem nicht; stattdessen WP 05 | Wiedervorlage WP 10 |
| D7 | KI-Erkennung standardmäßig an (Start bei Bedarf, Entladen nach 5 Minuten) | ja, wie umgesetzt | Nutzer, nur bei Änderungswunsch |
| D8 | Emojis auch aus den übrigen Website-Tools entfernen (roter Kreis, Warndreieck, Wiedergabepfeil, Haken in drei Tools)? | ja, in WP 04 als eigener, kleiner Commit | Nutzer (mit G2 bestätigt) |
| D11 | Reparatur-Download des KI-Modells aus der App, falls die Datei fehlt (Quarantäne durch Virenschutz) | **nein, zuerst Diagnosedaten aus 1.8.0 abwarten** (Angriffsfläche, bricht die Aussage "kein Netzzugriff") | Nutzer |
| D9 | Handy-App: Service Worker mit Netzwerk-zuerst-Strategie, Hinweis nur auf Handys, 30 Tage Ruhe nach Schließen | wie umgesetzt | Nutzer, nur bei Änderungswunsch |

## 7. Ablauf als Schleife (Orchestrierung)

Die planende Instanz (oder der Nutzer per `/loop`) arbeitet die Tabelle in Abschnitt 2 ab:

1. Nächstes Paket mit Status `bereit` wählen. WP-Dokument vollständig lesen.
2. Ausführenden starten (Unteragent mit der empfohlenen Stärke, eigener Worktree), Vorlage siehe [`prompts.md`](prompts.md).
3. Ergebnis **nicht glauben, sondern prüfen**: Diff lesen, Prüfbefehle des WP selbst erneut ausführen, Abnahmekriterien abhaken.
4. Bei Erfolg Pull Request (Entwurf) anlegen, Status in dieser Tabelle ändern, nächstes Paket.
5. Bei Gate: **eine** Frage an den Nutzer mit Empfehlung. Ohne schriftliche Bestätigung nichts veröffentlichen.
6. Bei Stopp-Regel: Bericht an den Nutzer mit Fehlermeldung und Vorschlag, dann mit einem anderen Paket weiterarbeiten.

Voraussetzung für einen ununterbrochenen Ablauf: In `~/.claude/settings.json` sind die Regeln für `gh pr *`, `gh run *`,
`gh release *`, `./deploy.sh` und `wrangler` eingetragen (die Bestätigungspflicht des Nutzers bleibt davon unberührt; der
Auto-Modus ändert Einstellungen nicht selbst). Ohne diese Regeln wird jeder Merge vom System geprüft und oft abgelehnt.

## 8. Risiken (Auswahl)

| Risiko | Gegenmaßnahme |
|---|---|
| Windows- oder macOS-Programm verhält sich anders als der Linux-Test | CI testet ab 1.8.0 jedes gebaute Programm auf allen drei Plattformen; Release nur bei grün; danach Sichtprüfung durch Nutzer (Fabiano: Update von 1.7.0 auf 1.8.0) |
| Update 1.7.0 auf 1.8.0 lädt unter Windows einmal den vollen Installer (alte Blockmap hat anderen Namen) | akzeptiert; danach differenziell (siehe `02`) |
| KI standardmäßig an erhöht den Speicherbedarf (ca. 0,6 GB, nach 5 Minuten Leerlauf frei) | Warnung und kein Autostart unter 6 GB RAM; Schalter im KI-Panel |
| Neue Regeln maskieren zu viel | Harness misst Fehlalarme; Begriffslisten nur in "Medizin" und "Maximal" |
| Service Worker liefert veraltete Seite | Netzwerk-zuerst für die Seite, Versionsname im Cache, Not-Aus beschrieben in `04` |
| Web-Tool und Desktop-Kopie driften auseinander | `06` bringt dieselbe Messung auf das Web-Tool; Sync-Regel dort beschrieben |
