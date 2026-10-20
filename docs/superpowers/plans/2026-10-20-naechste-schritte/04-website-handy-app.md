# WP 04: Website: PrivacyShield als Handy-App, Emoji-Fix, Handy-Layout

**Ziel:** Handynutzer können das Web-Tool wie eine App auf den Startbildschirm legen (iPhone und Android), mit Anleitung, die
automatisch erscheint; "Auf Updates prüfen" ohne Emoji; keine Emojis mehr in den übrigen Tools (D8).
**Modell:** Sonnet niedrig. **Aufwand:** 2 Stunden. **Gate:** G2 (Deploy, gemeinsam mit WP 03).
**Voraussetzung:** keine; unabhängig von WP 02 und kann sofort vorbereitet werden. Repo: `~/projects/arcangeli-website`.

## Wichtige fachliche Klarstellung (dem Nutzer bereits mitgeteilt)

Ein **Lesezeichen** ist keine App: Es öffnet die Seite im normalen Browser mit Adressleiste. Der richtige Weg beim iPhone ist
**Teilen, "Zum Home-Bildschirm"**: Das legt ein Symbol an, das die Seite ohne Adressleiste startet, wie eine App. Das ist technisch
eine Progressive Web App (PWA). Android (Chrome) bietet "App installieren" bzw. "Zum Startbildschirm hinzufügen".

Grenzen, die offen kommuniziert werden: Auf dem Handy ist die KI-Erkennung wegen des Arbeitsspeichers (etwa 0,6 GB für das Modell)
unzuverlässig; die Standard-Erkennung läuft überall. Ohne Netz startet die App aus dem Cache, die KI-Bibliotheken und das Modell
müssen aber einmal online geladen worden sein. Die Desktop-App bleibt die empfohlene Wahl für große Dokumente.

## Was fertig vorliegt (`artifacts/website/handy-app/`, im Prototyp geprüft)

| Datei | Zweck |
|---|---|
| `privacyshield-manifest.json` | Name, Farben, Start-URL `/tools/privacyshield-redesigned.html?source=app`, Umfang `/tools/`, Anzeige "standalone", Icons |
| `privacyshield-sw.js` | Service Worker: Seite netzwerk-zuerst (4 s), Icons cache-zuerst, CDN-Bibliotheken veraltet-bei-Neuvalidierung, Rest durchreichen; Not-Aus beschrieben |
| `make-pwa-icons.mjs`, `icons/*.png` | Icons 192, 512, 512 maskable, Apple-Touch 180 aus `icon-source.png` |
| `pwa_patch.py` | Patch für `src/tools/privacyshield-redesigned.html`: Metadaten, Handy-CSS, Update-Knopf ohne Emoji, Installationshinweis, Registrierung des Service Workers |
| `pwa-test.mjs` | Test (Playwright/Chromium): Installierbarkeit laut Chromium, Service Worker aktiv, Offline-Start, Hinweis auf Android und iPhone, kein Emoji, keine Skriptfehler |

Prototyp-Ergebnis: Chromium meldet keine Installierbarkeitsfehler, Offline-Start aus dem Cache funktioniert, Hinweistexte erscheinen
für Pixel 7 (Android-Anleitung / "App installieren"-Knopf) und iPhone 14 ("Teilen, Zum Home-Bildschirm"). **Echte Geräte wurden nicht
getestet** (siehe Schritt 7).

## Wie der Hinweis funktioniert (D9)

* Erscheint nur auf iPhone/iPad und Android (Erkennung über `navigator.userAgent`, iPadOS über `MacIntel` plus Touch), nicht am Computer und nicht, wenn die
  Seite schon als App läuft (`display-mode: standalone` bzw. iOS `navigator.standalone`). Einblendung 2,5 Sekunden nach dem Laden.
* Android/Chrome: `beforeinstallprompt` wird abgefangen, der Knopf "Als App installieren" löst den Systemdialog aus; ohne dieses Ereignis
  zeigt der Hinweis die Menüschritte ("App installieren" / "Zum Startbildschirm hinzufügen").
* iPhone: kein Systemdialog möglich; der Hinweis zeigt die Schritte (Teilen-Symbol unten in Safari, iPad oben; "Zum Home-Bildschirm";
  "Hinzufügen"). In anderen iOS-Browsern als Safari steht zusätzlich "Am besten in Safari öffnen".
* "Schließen" merkt sich die Entscheidung 30 Tage (`localStorage`-Schlüssel `ps_install_hint_until`); nach Installation (`appinstalled`) verschwindet der Hinweis.
* Die System-Monitor-Anzeige (schwebendes Panel) wird unter 768 Pixel Breite ausgeblendet, weil sie sonst die Bedienung verdeckt.

## Schritte

- [ ] **1. Zweig**

```bash
cd ~/projects/arcangeli-website
git checkout -b feat/privacyshield-handy-app    # von main; falls WP 03 schon einen Zweig hat, getrennt halten
ART=~/projects/privacy-shield-desktop/docs/superpowers/plans/2026-10-20-naechste-schritte/artifacts/website/handy-app
```

- [ ] **2. Neue Dateien an die richtigen Orte (nicht in `src/`, wenn `build.js` sie nicht kopiert)**

`build.js` kopiert aus `src/` nur HTML und JSON. Deshalb:

```bash
cp $ART/privacyshield-manifest.json src/tools/privacyshield-manifest.json       # JSON: wird von build.js nach tools/ kopiert
cp $ART/privacyshield-sw.js tools/privacyshield-sw.js                           # Wurzel, nicht in src/ (JS wird nicht kopiert)
mkdir -p assets/privacyshield scripts
cp $ART/icons/*.png assets/privacyshield/
cp $ART/make-pwa-icons.mjs scripts/make-pwa-icons.mjs
cp $ART/pwa-test.mjs tests/pwa.mjs
```

Prüfen: `node build.js && ls tools/privacyshield-manifest.json` (muss existieren), sonst die Kopierliste in `build.js` anpassen
(nur JSON-Muster ergänzen, nicht das Build umbauen).

- [ ] **3. Seite patchen**

```bash
PSWEB=src/tools/privacyshield-redesigned.html python3 -I $ART/pwa_patch.py
```

Erwartet: `... angepasst` ohne `FEHLER`. Bei `FEHLER n!=1`: Seite hat sich geändert, Stopp-Regel 2.

- [ ] **4. Service-Worker-Registrierung und Cache-Header prüfen**

`_headers` der Website setzt als Standard `Cache-Control: public, max-age=0, must-revalidate`; das ist für `privacyshield-sw.js`
richtig (Browser prüft den Service Worker bei jedem Besuch neu). Nichts ändern. Zusätzlich prüfen, dass `tools/privacyshield-sw.js`
unter `https://arcangeli.eu/tools/privacyshield-sw.js` mit `Content-Type: text/javascript` ausgeliefert wird (nach dem Deploy).
Der Umfang (`scope`) des Service Workers ist `/tools/`; er darf andere Tools nicht beeinflussen: Der Test prüft, dass andere Seiten unter
`/tools/` keine Bibliotheken aus seinem Cache erhalten (Filter über `clientId` der PrivacyShield-Seite).

- [ ] **5. Emojis in den übrigen Tools entfernen (D8, eigener Commit)**

```bash
grep -nP '[\x{1F300}-\x{1FAFF}\x{2600}-\x{27BF}\x{2B50}\x{2B55}\x{25B6}\x{2714}\x{26A0}]' src/tools/*.html | head -40
```

Bekannte Fundstellen: roter Kreis (U+1F534, Statusanzeige), Warndreieck (U+26A0), Wiedergabepfeil (U+25B6), Haken (U+2714) in drei Tools. Ersetzen durch Text oder ein kleines inline-SVG (Kreis, Dreieck mit
Ausrufezeichen, Pfeil, Haken) in der jeweiligen Farbe der Seite (`#1a3a5c`, Rot der bestehenden Warnstile). Keine neuen Farben,
kein Umbau des Designs. Danach derselbe `grep` ohne Treffer in sichtbarem Text (Kommentare im Code ebenfalls prüfen; Hausregel gilt
auch dort).

- [ ] **6. Test**

```bash
node build.js
node tests/pwa.mjs                      # erwartet: nur "ok", Exit 0
npm test                                # console-check + smoke
```

Screenshots (Playwright, Pixel 7 und iPhone 14, hell): Hinweisfeld, geöffnetes Tool; prüfen, dass nichts überläuft und der Knopf
"Auf Updates prüfen" ohne Symbol erscheint. Bilder dem Nutzer im Bericht nennen (`/tmp/pwa-*.png`).

- [ ] **7. Echtgerät-Prüfliste (Nutzer, 5 Minuten; nicht ersetzbar durch Emulation)**

iPhone (Safari): Seite öffnen, Hinweis erscheint, Teilen, "Zum Home-Bildschirm", Symbol erscheint mit PrivacyShield-Icon, Start ohne
Adressleiste, Dokument anonymisieren, Flugmodus an, App erneut öffnen (startet aus dem Cache; KI wird dann nicht verfügbar sein).
Android (Chrome): Hinweis "Installieren" oder Menü "App installieren", Start im eigenen Fenster, ebenfalls Offline-Start.
Rückmeldung: Funktioniert / Bildschirmfoto, falls nicht.

- [ ] **8. Commits (Dateien einzeln benennen, `git status` vorher lesen) und Gate G2**

```bash
git add src/tools/privacyshield-redesigned.html tools/privacyshield-redesigned.html src/tools/privacyshield-manifest.json \
        tools/privacyshield-manifest.json tools/privacyshield-sw.js assets/privacyshield/ scripts/make-pwa-icons.mjs tests/pwa.mjs
git commit -m "feat(privacyshield): als Handy-App installierbar (iPhone, Android), Update-Knopf ohne Emoji

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
# D8, eigener Commit: die betroffenen src/tools/*.html und die gebauten Gegenstuecke einzeln benennen
```

Dann **eine** Frage an den Nutzer (gemeinsam mit WP 03): "Website mit festen Download-Links und Handy-App deployen? Empfehlung: ja."
Nach "Ja": `./deploy.sh`.

- [ ] **9. Nach dem Deploy prüfen**

```bash
curl -sI https://arcangeli.eu/tools/privacyshield-manifest.json | head -5   # 200, application/json
curl -sI https://arcangeli.eu/tools/privacyshield-sw.js | head -5           # 200, text/javascript
curl -sI https://arcangeli.eu/assets/privacyshield/icon-512.png | head -3   # 200
```

Zusätzlich `node tests/pwa.mjs` mit `URL_` auf die Live-Adresse (Variable im Skript) einmal ausführen.

## Not-Aus

Fehlerhafter Service Worker: `tools/privacyshield-sw.js` durch folgende Datei ersetzen und deployen (Browser deregistrieren ihn beim nächsten Besuch):

```js
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.registration.unregister().then(() => caches.keys()).then((k) => Promise.all(k.map((n) => caches.delete(n))))));
```

## Abnahme

* `tests/pwa.mjs` grün; `npm test` grün; `grep` auf Emojis in `src/tools/*.html` ohne Treffer im sichtbaren Text.
* Live: Manifest, Service Worker und Icons antworten mit 200; Chromium-Installierbarkeit (CDP) meldet keine Fehler.
* Nutzer hat auf mindestens einem echten Gerät die Prüfliste durchlaufen (Rückmeldung, nicht Voraussetzung für den Deploy).
