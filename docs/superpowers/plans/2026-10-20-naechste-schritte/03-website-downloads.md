# WP 03: Website: feste Download-Links, ehrliche Texte, Link-Test

**Ziel:** Die Seite `arcangeli.eu/desktop` zeigt nie wieder eine veraltete Version: feste Links `releases/latest/download/<Name>`,
keine Versionsnummer im Text, macOS in zwei Varianten, Link-Test im Deploy-Ablauf.
**Modell:** Haiku (fertige Skripte), Prüfung durch Sonnet. **Aufwand:** 1 Stunde. **Gate:** G2 (Deploy).
**Voraussetzung:** WP 02 veröffentlicht und mit `verify-release.mjs` geprüft (sonst zeigen die festen Links auf 404 oder auf 1.7.0 mit
anderem Dateinamen). Repo: `~/projects/arcangeli-website`.

**Hinweis zur Regel "arcangeli.eu bleibt inhaltlich unberührt":** Die Download-Seite ist ein notwendiges Update (veraltete Links, falsche
Aussage "keine Installation"), kein Design- oder Inhaltsumbau. Die Freigabe erfolgt trotzdem über G2.

## Warum feste Links

Bis 1.7.0 trug jede Datei die Versionsnummer im Namen (`PrivacyShield-Setup-1.7.0.exe`). Jede neue Version machte die Links der Website
zu veralteten oder toten Links. Ab 1.8.0 heißen die Dateien fest (`PrivacyShield-Setup.exe`, `PrivacyShield-mac-arm64.zip`,
`PrivacyShield-mac-x64.zip`, `PrivacyShield.AppImage`, `PrivacyShield.deb`), und GitHub liefert unter `releases/latest/download/<Name>`
immer die neueste. Die Website muss nach einem Release nie mehr angefasst werden.

## Schritte

- [ ] **1. Zweig und Ausgangszustand**

```bash
cd ~/projects/arcangeli-website
git status --short                       # erwartet: sauber (sonst Stopp-Regel 3)
git checkout -b feat/desktop-feste-links
ART=~/projects/privacy-shield-desktop/docs/superpowers/plans/2026-10-20-naechste-schritte/artifacts/website
grep -c "1.7.0" src/desktop/index.html   # erwartet: > 0 (Versionsreste, die der Patch entfernt)
```

- [ ] **2. Seite patchen (Quelle `src/`, nie die gebaute Datei)**

```bash
python3 -I $ART/desktop-page/desktop_page_patch.py src/desktop/index.html
```

Erwartet: `Download-Seite angepasst`. Bei `FEHLER n!=1: ...` hat sich die Seite seit dem Plan geändert: Stopp-Regel 2, nicht raten.
Das Skript ersetzt: Versionslabel im Seitenkopf (entfällt), den falschen Satz "keine Installation im klassischen Sinne" (es gibt einen
Installer), alle Links auf feste Namen, den einen macOS-Knopf durch zwei (Apple Silicon / Intel), Dateinamen in den Anleitungen,
den Hinweis "Welche macOS-Version?" und die Verweise auf `/releases/latest` samt Prüfsummen-Link. Am Ende prüft es, dass keine
`1.7.0` mehr im Text steht.

- [ ] **3. Link-Test einbauen**

```bash
mkdir -p tests && cp $ART/desktop-page/desktop-links.mjs tests/desktop-links.mjs
```

In `deploy.sh` nach dem Build und vor dem Commit/Deploy (an der Stelle, an der schon Prüfungen laufen) einfügen:

```bash
echo "Pruefe Download-Links der Desktop-Seite ..."
node tests/desktop-links.mjs --stable || { echo "Download-Links fehlerhaft, Abbruch."; exit 1; }
```

Der Test prüft: die vier festen Links sind vorhanden, kein Link und kein Seitentext enthält eine Versionsnummer, jeder Link antwortet
(HEAD, Weiterleitungen gefolgt) mit 200.

- [ ] **4. Bauen und prüfen**

```bash
node build.js
node tests/desktop-links.mjs --stable    # erwartet: "alle N Links in Ordnung"
npm test                                  # console-check + smoke
```

Zusätzlich Sichtprüfung der gebauten Seite im Browser (Playwright-Screenshot, 1280 und 390 Pixel Breite): beide macOS-Knöpfe sichtbar,
keine überlaufenden Knöpfe auf dem Handy. Befund bei Layoutproblemen: Knöpfe untereinander statt nebeneinander (`flex-wrap`).

- [ ] **5. Commit (Dateien einzeln benennen; `git status` vorher lesen)**

```bash
git status --short
git add src/desktop/index.html desktop/index.html tests/desktop-links.mjs deploy.sh
git commit -m "feat(desktop): feste Download-Links, keine Versionsnummer im Text, macOS Apple Silicon und Intel

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

`desktop/index.html` ist die gebaute Datei und wird mit eingecheckt (so arbeitet `deploy.sh` bisher; im Zweifel `git status` und
`git log -3 --stat` ansehen, welche Dateien frühere Deploys mitnahmen).

- [ ] **6. Gate G2** wird gemeinsam mit WP 04 gestellt (ein Deploy). Nach "Ja": `./deploy.sh` (nie `wrangler` direkt), anschließend

```bash
curl -sI https://arcangeli.eu/desktop/ | head -3
node tests/desktop-links.mjs --stable   # gegen die gebaute Datei; zusätzlich Live-Seite:
curl -s https://arcangeli.eu/desktop/ | grep -c "releases/latest/download"   # erwartet: 6 oder mehr
curl -s https://arcangeli.eu/desktop/ | grep -c "1\.7\.0"                    # erwartet: 0
```

## Abnahme

* Live-Seite verlinkt ausschließlich auf `releases/latest/...`; alle Links 200.
* `grep "1.7.0"` im Quelltext der Live-Seite: 0 Treffer.
* Test `tests/desktop-links.mjs` ist Teil von `deploy.sh`.
* Beim nächsten Release (1.9.0) ist **keine** Änderung an der Website nötig. Das ist der eigentliche Erfolgstest und wird bei WP 05 geprüft.

## Offene Folgepunkte (nicht in diesem Paket)

* Ältere Versionen laden automatisch auf die neue Version, aber 1.7.0 und älter zeigen weiterhin ihren Hinweis auf `1.7.0`-Dateinamen.
  Das ist unkritisch, solange der Updater-Feed (`latest.yml`) gepflegt bleibt.
* SmartScreen-Hinweis auf der Seite ("Unbekannter Herausgeber, Weitere Informationen, Trotzdem ausführen"): Text gehört in WP 09.
