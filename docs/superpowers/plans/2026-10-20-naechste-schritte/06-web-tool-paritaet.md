# WP 06: Web-Tool-Parität (arcangeli.eu)

**Ziel:** Das öffentliche Web-Tool (`src/tools/privacyshield-redesigned.html` in `arcangeli-website`) erhält die Erkennungsverbesserungen der Desktop-Serie, die
ehrliche Fehlermeldung beim Modell und dieselbe Messung. Es ist die Version, die die meisten Menschen zuerst benutzen.
**Modell:** Sonnet niedrig bis mittel. **Aufwand:** 3 Stunden. **Gate:** **G3** (Änderung an Erkennung und Wortlaut des Web-Tools) und G2 (Deploy).
**Voraussetzung:** WP 02 gemergt oder die Patches lokal verfügbar; Entscheidung D2 (Voreinstellung: ja). WP 04 (Handy-App, Emoji-Fix) sollte vorher oder
gleichzeitig laufen, damit nicht dieselbe Datei auf zwei Zweigen geändert wird.

**Einordnung zur Regel "arcangeli.eu bleibt inhaltlich unberührt":** Die Änderungen sind Sicherheitskorrekturen (Lecks beim Anonymisieren) und Fehlerbehebungen;
kein neues Design, keine neuen Inhalte. Sie berühren trotzdem die Nutzerentscheidung vom 12.10.2026, deshalb vorher Gate G3 mit einer Frage und Empfehlung.

## Ausgangslage (gemessen mit demselben Mess-Harness, im Browser, ohne KI)

| Stand des Web-Tools | Lecks Handfälle (91) | Fehlalarme (Negativfälle) | Lecks synthetisch (276) |
|---|---|---|---|
| heute live | 37 | 1 | 109 |
| mit Detektions-Patches 1 bis 5 (Prototyp `/tmp/web-lab`) | 8 | 0 | 21 |
| Ziel: Desktop 1.8.0 im Wortlisten-Modus (ohne KI), gemessen mit 150 Fällen (91 Hand + 59 DSGVO-Probe) | höchstens 21 von 150 | 0 | höchstens 18 von 276 |

Das Web-Tool hat dieselbe Struktur wie die Desktop-Kopie. Der Erkennungsblock (`ENTS`, Profile, `resolveSpanOverlaps`, `postProcessSpans`, `tok`) unterscheidet sich
von Desktop 1.7.0 nur durch Formatierung (Zeilenbreite 80 statt 120): 9 Zeilen Unterschied im größten Block. Nach dem Umformatieren mit Prettier (`--print-width 120`) passt der
Unterschied Desktop 1.7.0 zu 1.8.0 (48 Änderungsblöcke) auf das Web-Tool: **43 von 48 Blöcken lassen sich automatisch einspielen**, 5 scheitern. Die 5 sind
desktop-spezifisch und gehören nicht ins Web-Tool oder brauchen Anpassung:

| Fehlgeschlagener Block | Bedeutung | Maßnahme |
|---|---|---|
| Umschalter "KI automatisch" im KI-Panel (`aiAutoToggle`) | Desktop-Oberfläche für den KI-Modus | im Web-Tool weglassen oder mit der dortigen Oberfläche abstimmen (Nutzer: nur Designänderung nach Freigabe) |
| Autostart des Modells nach `checkMemoryHint` | Desktop lädt KI bei Bedarf | Web-Tool behält sein Verhalten (Modell wird auf Wunsch geladen) |
| KI-Modus: `AI_MODE_KEY`, Leerlauf-Entladen | Desktop-Funktion | weglassen |
| Fehlerdiagnose im `loadAIModel` (`diagnoseAIError`) | **gewünscht** auch im Web-Tool, ohne `electronAPI` | von Hand übertragen, Fehlercode `NETWORK` für gesperrte Hosts (unten) |
| Normalisierung in `anon` (`normalizeForDetection`) | **gewünscht** (Unicode-Leerzeichen, Vollbreite) | von Hand einfügen: Web-Tool hat `anon()`, Desktop `anonCore()` |

## Schritte

- [ ] **1. Zweig und Formatierung (eigener Commit, reine Umformatierung, verhaltensgleich belegen)**

```bash
cd ~/projects/arcangeli-website
git checkout -b feat/privacyshield-erkennung main     # nach WP 04 gemergt/deployt, sonst darauf aufbauen
npm i --no-save prettier@3
npx prettier --print-width 120 --write src/tools/privacyshield-redesigned.html
```

Verhalten belegen: vor und nach der Formatierung `node /tmp/web-eval.mjs <Datei>` (Skript siehe Schritt 2) mit identischem Ergebnis (37/91, 1, 109/276);
der Commit enthält nur die Umformatierung (`refactor: Web-Tool lesbar formatieren (Zeilenbreite 120)`). Das Bundle `tools/privacyshield-redesigned.html` entsteht beim Build.
Hinweis: Das Web-Tool lädt `cdn.tailwindcss.com` zur Laufzeit; Formatierung ändert daran nichts.

- [ ] **2. Messskript bereitstellen (aus dem Desktop-Repo, nach WP 02)**

`tests/eval/cases.mjs`, `cases-gdpr.mjs`, `generate.mjs` aus dem Desktop-Repo sind die Testsätze. Ein Skript, das die Datei im Chromium lädt und `anon()` aufruft, liegt im
Prototyp (`/tmp/web-lab/web-eval.mjs`, nach WP 06 nach `arcangeli-website/tests/eval-web.mjs` überführen; es verwendet `applyProfile`, `PROFILES`, `anon`, Felder `IT`/`AT`).
Es gibt je Lauf `Handfaelle undicht a/b | Negativfaelle falsch maskiert n | Synthetik undicht c/d` aus. Ausgangswert festhalten.

- [ ] **3. Desktop-Änderungen einspielen (die 43 automatischen Blöcke)**

```bash
D=~/projects/privacy-shield-desktop
git -C $D show dcb1503:app/privacy-shield.html > /tmp/d170.html
git -C $D show v1.8.0:app/privacy-shield.html > /tmp/d180.html    # nach WP 02; vorher: git show release/1.8.0:...
diff -u /tmp/d170.html /tmp/d180.html > /tmp/d170to180.diff
cp src/tools/privacyshield-redesigned.html /tmp/web-before.html
patch --no-backup-if-mismatch -F3 src/tools/privacyshield-redesigned.html < /tmp/d170to180.diff
# erwartet: 43 von 48 Blöcken, Rest in src/tools/privacyshield-redesigned.html.rej
```

Die abgelehnten Blöcke (`.rej`) nach der Tabelle oben von Hand behandeln, danach `.rej` und `.orig` löschen (nicht einchecken).
**Nicht** blind alle angewendeten Blöcke behalten: Desktop-Spezifika (`electronAPI`, `copyText`, `checkAssets`, Update-Dialoge) stehen hinter `window.parent.electronAPI`-Prüfungen
und sind im Browser wirkungslos; trotzdem den Diff vollständig lesen und alles Desktop-Eigene entfernen, das im Web-Tool tote Pfade erzeugt.

- [ ] **4. Fehlerdiagnose für das Web-Tool (neu, klein)**

Im `catch` von `loadAIModel`: Fehlerklassen bestimmen (Funktion aus der Desktop-Serie `diagnoseAIError` als Vorlage, ohne `electronAPI`):

| Klasse | Erkennung | Text an den Nutzer (Entwurf) |
|---|---|---|
| `NETWORK` | `Failed to fetch`, `NetworkError`, `Load failed`, `ERR_NAME_NOT_RESOLVED` | "Das KI-Modell (ca. 130 MB) konnte nicht geladen werden: Ihr Netz oder Browser blockiert den Download von huggingface.co oder cdn.jsdelivr.net. Prüfen Sie Firmenfilter, VPN oder Werbeblocker, oder nutzen Sie das Desktop-Programm (enthält das Modell)." |
| `MEMORY` | `out of memory`, `Aborted(`, `RangeError` | "Zu wenig Arbeitsspeicher für die KI-Erkennung. Andere Tabs schließen oder das Desktop-Programm nutzen." |
| `OTHER` | sonst | Meldung kürzen und "Details kopieren" anbieten |

Den Satz "Die Standard-Erkennung (Regex + Klicken) funktioniert ohne Einschränkung" ersetzen durch: "Die Standard-Erkennung läuft weiter, erkennt aber Namen, Organisationen und Orte
schwächer. Prüfen Sie das Ergebnis besonders sorgfältig." (Messung: ohne Modell 21 von 150 Fällen undicht, mit Modell 4.)
Knöpfe "Erneut versuchen" und "Details kopieren" wie auf dem Desktop. Kein Emoji.

- [ ] **5. Normalisierung einfügen** (`normalizeForDetection` aus der Desktop-Serie, gleiche Länge, Positionen bleiben gültig) in `anon()`, dann messen.

- [ ] **6. Messen und vergleichen**

```bash
node build.js
node tests/eval-web.mjs src/tools/privacyshield-redesigned.html
```

Erwartet: Fehlalarme 0, Lecks nicht schlechter als der Desktop-Wortlistenmodus (18 von 276; Fälle höchstens 21 von 150, wenn die DSGVO-Probe mitgemessen wird; sonst Handfälle allein).
Abweichungen erklären (nicht verstecken). `npm test` (console-check, smoke), `node tests/pwa.mjs` (WP 04), Screenshot Desktop und Handy.

- [ ] **7. Sync-Regel festhalten** in `docs/privacyshield-sync.md` (Website-Repo): Erkennungsblock ist im Desktop-Repo maßgeblich; Änderungen dort zuerst, dann per
  `diff -u` + `patch` hierher übertragen und mit `tests/eval-web.mjs` messen. Langfristig: gemeinsame Datei `detection.js` für beide Kopien (Entscheidung offen, größerer Umbau).

- [ ] **8. Gate G3 und G2**: **eine** Frage: "Erkennungsverbesserungen (Lecks 109 auf unter 20 von 276) und ehrliche KI-Fehlermeldung im Web-Tool auf arcangeli.eu veröffentlichen? Empfehlung: ja, kein neues Design."
  Nach "Ja": Commits einzeln benennen, `./deploy.sh`, danach Live-Test mit dem Messskript gegen `https://arcangeli.eu/tools/privacyshield-redesigned.html` (Seite auf Erreichbarkeit und `anon` prüfen).

## Abnahme

* Formatierungs-Commit verhaltensgleich belegt; Eval-Ergebnisse vorher/nachher im PR-Text.
* Keine Fehlalarme; keine Skriptfehler in der Konsole (`tests/console-check.mjs`).
* Fehlermeldung bei blockiertem Hugging-Face-Host nachgestellt (Playwright-Route auf `huggingface.co`/`*.hf.co` mit Abbruch), Text enthält "huggingface.co" und den Hinweis auf das Desktop-Programm.
  (Die frühere Probe `/tmp/web-lab/block-hf.mjs` lieferte kein verwertbares Ergebnis, weil das Modell im Cache lag oder die Route nicht griff: Test muss ohne Cache laufen und den Fehlerzustand abfragen.)
