# V2-D: Bedienung (D1 bis D5)

Regeln und Rollen: `V2-00-INDEX.md`. **UI-Arbeit immer mit dem Skill `frontend-design:frontend-design`** (Hausregel). Gestaltung bleibt im vorhandenen Stil (Navy `#1a3a5c`, Weiß, Rand `#e5e5e5`, Text `#666`, Schrift Plus Jakarta Sans lokal gebündelt falls vorhanden), **keine Emojis**, Symbole als kleines inline-SVG oder Text. Jede Oberfläche wird mit Screenshots geprüft (1280 und 900 Pixel Breite).

---

## D1: Prüfansicht und Rückgängig

**Marke:** S. **Aufwand:** 5 h. **Voraussetzung:** A1 (Gegenprüfung), C3 optional.

**Problem:** Der Nutzer sieht Markierungen im Text, aber keine **Liste aller Funde**. Er kann nicht schnell prüfen, ob "Alexander" als Firma oder Person erkannt wurde, nicht alle Vorkommen eines Wertes auf einmal freigeben und nichts rückgängig machen.

**Modul:** `app/lib/history.js` (`PSLib.history`) und `app/lib/review.js` (`PSLib.review`), Tests `tests/unit/history.test.mjs`, `tests/unit/review.test.mjs`.

```js
// review: aus Erkennungsergebnis eine Prüfliste bauen
PSLib.review.build(spans, text) -> [{ key, type, value, count, token, firstStart, examples: [snippet], decision: 'maskieren'|'freigeben' }]   // gruppiert nach Wert und Typ, sortiert nach Typ, dann Häufigkeit
// history: Schnappschüsse der Entscheidungen (Whitelist, manuelle Markierungen), nicht des Textes
const h = PSLib.history.create({ limit: 100 })
h.push(snapshot); h.undo() -> snapshot|null; h.redo() -> snapshot|null; h.canUndo(); h.canRedo(); h.clear()
```

**Tests:** `build`: drei Vorkommen desselben Namens ergeben **einen** Eintrag mit `count: 3`; gleicher Wert mit zwei Typen (z. B. "Berlin" als Ort und als Teil einer Organisation) bleibt zwei Einträge; Sortierung stabil; `examples` höchstens 3, je höchstens 60 Zeichen. `history`: push/undo/redo-Folge; neuer Push nach Undo verwirft Redo-Zweig; Grenze 100 verwirft die ältesten; `clear` leert; Schnappschüsse sind **Kopien** (Änderung des Originalobjekts verändert den Stand nicht).

**Oberfläche:**
* Seitenleiste "Funde" (einklappbar): Gruppen nach Kategorie mit Anzahl; je Eintrag Platzhalter, Originalwert (nur hier sichtbar), Anzahl, Schalter "maskieren/freigeben" (setzt Whitelist für diesen Wert), "alle dieses Typs freigeben/maskieren". Klick springt zur ersten Fundstelle im Text (Hervorhebung, Bildlauf).
* Filter (Kategorie, "nur Zweifelsfälle": weiche Funde und Funde der Gegenprüfung), Suchfeld.
* **Rückgängig/Wiederholen** (Knöpfe und Tastatur `Strg+Z`/`Strg+Y`, macOS `Cmd+Z`/`Cmd+Shift+Z`) für Entscheidungen der Prüfansicht und manuelle Markierungen; Textbearbeitung im Eingabefeld behält das normale Browserverhalten.
* Jede Änderung stößt eine Neu-Anonymisierung an (bestehender Mechanismus `reanon`), mit Entprellung; kein Verlust der Zuordnung bei Änderungen.
* Alles per Tastatur bedienbar (siehe D2); Fokus bleibt nach Aktion am Eintrag.

**End-to-End-Tests:** Dokument laden, Funde erscheinen mit korrekten Zählern; Wert freigeben, Ergebnis enthält ihn im Klartext, Gegenprüfung (A1) zählt ihn als Freigabe, nicht als Fund; Rückgängig stellt die Maskierung her; Tastaturkürzel funktionieren; Reload der Seite verwirft Zustand (keine Persistenz von Funden).

**Abnahme:** Unit- und End-to-End-Tests grün; Screenshot-Sichtung durch den Prüfer (Skill `frontend-design`): Lesbarkeit, Kontrast, Platzbedarf bei 900 Pixel; Leistung: Prüfliste für 6.000 Entitäten baut in unter 300 ms (virtualisierte Liste ab 500 Einträgen).

---

## D2: Barrierefreiheit (WCAG 2.1 AA) mit automatischem Test

**Marke:** S. **Aufwand:** 4 h. **Ausgangslage (gezählt):** `aria-` 1 Vorkommen, `role=` 1, `tabindex` 0, `alt=` 0 in `app/privacy-shield.html`.

**Maßnahmen** (Reihenfolge nach Wirkung):
1. **Beschriftungen:** jedes Eingabefeld hat `<label for>` oder `aria-label`; jeder Knopf hat sichtbaren Text oder `aria-label` (Symbolknöpfe!); Bilder `alt`.
2. **Tastatur:** Alles Bedienbare ist per Tab erreichbar (echte `<button>` statt `<div onclick>`); sichtbarer Fokusring (`:focus-visible`, 2 Pixel Navy, Abstand 2); Reihenfolge entspricht der Optik; Drop-Zone ist ein Knopf ("Dateien auswählen") und zusätzlich Drop-Ziel; Dialoge halten den Fokus (Fokusfalle), schließen mit `Esc`, setzen den Fokus zurück.
3. **Struktur:** `main`, `header`, `footer`, Überschriftenhierarchie ohne Sprünge, Sprunglink "Zum Inhalt", `lang="de"`.
4. **Ansagen:** Hinweise (Toasts, Gegenprüfung, Fortschritt) in `role="status"`/`aria-live="polite"`, Fehler `role="alert"`.
5. **Kontrast:** Text mindestens 4,5:1 (bekannte Fehlstellen: Muted-Text `#999` auf Weiß etwa 2,8:1 zu `#6b6b6b` oder dunkler; Platzhaltertexte, Statusfarben); Bedienelemente mindestens 3:1.
6. **Bewegung und Zoom:** `prefers-reduced-motion` respektieren; Layout bei 200 % Zoom ohne horizontales Scrollen (Fenster 1280, Zoom 200 %).
7. **Nicht nur Farbe:** Status, Kategorien, Fehler haben zusätzlich Text oder Symbol.

**Test (automatisch, `tests/a11y.test.mjs`):** `axe-core` als **Entwicklungsabhängigkeit** (`npm i -D axe-core`, nur Tests, wird nicht ausgeliefert; Lizenz MPL-2.0 vermerken in `THIRD_PARTY_NOTICES.md` unter "nur Entwicklung"). In der echten App über Playwright `page.addScriptTag` mit `node_modules/axe-core/axe.min.js` und `axe.run()`; Ansichten: Willkommen, Arbeitsbereich leer, mit Ergebnis, Prüfansicht (D1), Passwortdialog (A3), Info-Dialog (D3), Projektliste (B1). **Erwartung: 0 Verstöße mit `impact` serious oder critical**; "moderate/minor" werden gezählt und in `docs/a11y-backlog.md` festgehalten. Zusätzlich **Tastaturtest**: von der Startansicht aus nur mit Tab/Enter/Esc ein Dokument laden (Datei über Testumgebung), anonymisieren, Ergebnis speichern.

**Abnahme:** a11y-Test grün; Tastaturtest grün; Kontrastwerte im Bericht des Implementierers (alte und neue Werte); Screenshots zeigen den Fokusring.

---

## D3: Info-Dialog (Version, Lizenzen, Diagnose)

**Marke:** H (kleiner, vollständig spezifiziert). **Aufwand:** 2 h. **Warum:** Die App hat kein Menü (`Menu.setApplicationMenu(null)`), keine Möglichkeit, Version, Lizenzen oder Diagnose zu sehen, außer über Umwege. Lizenztexte der gebündelten Bibliotheken müssen für Nutzer erreichbar sein (Apache-2.0, MIT, BSD, GPL-Alternativen laut `THIRD_PARTY_NOTICES.md`).

**Inhalt:** Knopf "Info" in der Fußzeile öffnet Dialog mit (1) Version (`getAppVersion`), Electron-/Chromium-Version, Betriebssystem; (2) KI-Modell: Name, Größe, Zustand der Installation (`checkAssets(false)`: "vollständig" oder Liste fehlender Dateien); (3) "Diagnose kopieren" (bestehende Funktion; **enthält keine Dokumentinhalte** und keine Dateinamen: Test); (4) "Lizenzen" (Inhalt von `THIRD_PARTY_NOTICES.md`, ausklappbar, per IPC `get-licenses` aus `process.resourcesPath` gelesen, schreibgeschützt); (5) Link "Auf Updates prüfen" (vorhandene Funktion); (6) Links Impressum/Datenschutz (extern, im Systembrowser).

**Tests:** End-to-End: Dialog öffnet per Knopf und Tastatur (`Esc` schließt), zeigt die Version aus `package.json`, listet bei entferntem Modell (Testvariante `makeAppVariant`) die fehlende Datei, Diagnose enthält Version und Modellzustand und **nicht** den Inhalt eines geladenen Testdokuments; Lizenztext enthält "Transformers.js" und "pdf.js"; IPC `get-licenses` lehnt fremde Absender ab (F2).

---

## D4: Englische Oberfläche (Kann, Entscheidung D15)

**Marke:** S. **Ansatz:** Texte aus der HTML in `app/lib/i18n.js` (`PSLib.i18n.t(key, params)`) mit Sprachdateien `app/lang/de.json`, `en.json`; Erkennung der Systemsprache, Umschalter im Info-Dialog; `lang`-Attribut wird gesetzt. **Neue Module (A bis C) benutzen ab sofort `t()`** (so entsteht keine Umbauschuld). Test: Schlüssel-Vollständigkeit (alle Schlüssel in beiden Sprachen), keine harten deutschen Texte in neuen Modulen (statischer Test).

## D5: Dunkles Design (Kann)

**Marke:** S. Farbvariablen (CSS-Custom-Properties) statt fester Werte; `prefers-color-scheme` und Umschalter; Kontrast-Test (axe) in beiden Themen; Screenshots. Nur nach D2 (sonst doppelte Arbeit).
