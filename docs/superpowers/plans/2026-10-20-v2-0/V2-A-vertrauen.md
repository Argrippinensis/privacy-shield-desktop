# V2-A: Vertrauen (A1 bis A4)

Rolle und Regeln: `V2-00-INDEX.md`. Alle Pakete hier sind **Module + Unit-Tests + dünne Oberfläche**. Reihenfolge A1, A2, A3, A4 (jedes für sich lieferbar).
Gemeinsame Vorgabe: Berichte, Diagnosen und Dateinamen enthalten **nie** personenbezogene Werte der verarbeiteten Dokumente.

---

## A1: Gegenprüfung des Ergebnisses ("Restrisiko-Scan")

**Marke:** H. **Aufwand:** 2 h. **Voraussetzung:** F2 Schritt 1 (Unit-Läufer). Unabhängig von F1: das Modul bekommt die Erkennungsfunktion hineingereicht.

**Idee:** Nach dem Anonymisieren läuft die Erkennung ein zweites Mal **über das Ergebnis**. Alles, was dort noch wie ein personenbezogener Wert aussieht, ist ein mögliches Leck und wird dem Nutzer gezeigt, bevor er das Ergebnis weitergibt. Das ist die wichtigste Sicherheitsfunktion für "nichts übersehen".

**Datei:** `app/lib/leakcheck.js` (UMD, `PSLib.leakcheck`), Test `tests/unit/leakcheck.test.mjs`.

```js
PSLib.leakcheck.scan(outputText, { detect, profile })
//  detect: (text, profile) -> [{ start, end, pfx, value, hard }]   (wird von außen übergeben: heute collectEntities, nach F1 PSDetect.detect)
//  -> { clean: boolean, count: number, findings: [{ type, start, end, severity: 'hoch'|'mittel', snippet }] }
```

Regeln:
1. Platzhalter der Form `{{[A-Z_0-9.]+}}` werden **vor** dem Scan durch gleich lange neutrale Zeichen (`x`) ersetzt und erzeugen nie einen Fund.
2. `severity: 'hoch'` für harte, prüfsummengeprüfte Typen (IBAN, Karte, Steuer-ID, E-Mail, Telefon, IP, Kfz, Ausweisnummern); `'mittel'` für weiche (Name, Organisation, Adresse, Ort).
3. `snippet` = der Fund mit je 15 Zeichen Umgebung; wird **nur in der Oberfläche** angezeigt, nie in Bericht oder Diagnose.
4. Whitelist-Einträge des Nutzers erzeugen **keinen** Fund (bewusst freigegeben), werden aber als Zahl `whitelisted` mitgeteilt.
5. Leerer Text: `{ clean: true, count: 0, findings: [] }`. Kein Aufruf wirft eine Ausnahme.

**Tests (Test-Autor schreibt sie rot; `detect` im Test ist ein einfacher Stub mit festen Spans):**
* Text nur aus Platzhaltern und Fülltext: `clean`.
* Text mit `max@firma.de` im Ergebnis: ein Fund `hoch`, Position stimmt.
* Platzhalter `{{EMAIL_1}}` direkt neben Text: kein Fund.
* Whitelist-Wert: kein Fund, `whitelisted === 1`.
* 50.000 Zeichen Fülltext in unter 200 ms (Stub-Erkennung).
* Reihenfolge der Funde nach `start`; `severity` korrekt; `snippet` ohne Zeilenumbrüche.

**Oberfläche (S, Sonnet niedrig, Skill `frontend-design`):** Nach "Anonymisieren" ein Band über dem Ergebnis: grün "Gegenprüfung: keine Auffälligkeiten" oder bernstein "Gegenprüfung: n mögliche Reste". Klick öffnet die Liste (Typ, Snippet, "Maskieren", "Ignorieren"). "Maskieren" fügt manuelle Markierung hinzu und anonymisiert neu. Ohne Emoji, mit schlichtem SVG-Symbol. End-to-End-Test: Dokument mit absichtlich nicht erkannter Nummer (Whitelist-Gegenprobe) zeigt das Band mit n ≥ 1.

**Abnahme:** Unit-Tests grün; Harness: Gegenprüfung meldet für alle 42 synthetischen Dokumente (276 Werte) im Standardmodus **0 hohe Funde** (sonst Fehler im Kern oder im Scan: Ursache klären, nicht den Test lockern); Leistung unter 1 s für 100.000 Zeichen.

---

## A2: Anonymisierungsbericht

**Marke:** H. **Aufwand:** 2 h. **Voraussetzung:** A1.

**Zweck:** Nachweis für Datenschutzbeauftragte und Akten: *wann, womit, mit welchem Ergebnis* anonymisiert wurde, **ohne** die Daten selbst.

**Datei:** `app/lib/report.js` (`PSLib.report`), Test `tests/unit/report.test.mjs`.

```js
PSLib.report.build({ appVersion, profileId, aiMode, modelId, startedAt, durationMs,
                     documents: [{ index, chars, counts: { NAME: 12, IBAN: 2, ... }, resultSha256, leak: { count, hoch, mittel } }],
                     whitelistSize, customRuleCount }) -> reportObject
PSLib.report.toText(reportObject) -> string       // lesbar, deutsch, ohne Emoji
PSLib.report.toJson(reportObject) -> string       // stabile Schlüsselreihenfolge, 2 Leerzeichen Einrückung
```

Inhalt: Kopf (Programm, Version, Zeitpunkt in ISO-8601 UTC und lokaler Zeit, Profil, KI-Modus, Modellkennung), je Dokument eine **Nummer** (nicht der Dateiname), Zeichenzahl, Anzahl je Kategorie, SHA-256 des **Ergebnistextes** (Integritätsnachweis), Ergebnis der Gegenprüfung, Zahl der Freigaben (Whitelist) und eigener Regeln; Schlusssatz "Dieser Bericht enthält keine personenbezogenen Daten der verarbeiteten Dokumente. Er ersetzt keine rechtliche Bewertung."

**Tests:**
* **Kein Leck im Bericht:** Für jedes Testdokument aus `tests/eval/generate.mjs` (42, fester Seed) wird ein Bericht gebaut; **kein** `truth.frags`-Fragment (Namen, Nummern, Adressen) darf in `toText` oder `toJson` vorkommen. (Der Test erzeugt die Berichtsdaten mit den echten Zählern aus dem Kern oder mit festen Zählern; Fragmente dürfen nie in den Eingabedaten von `build` stehen: `build` lehnt Strings über 80 Zeichen in Zählerfeldern ab.)
* `toJson` ist deterministisch (gleiche Eingabe, gleiche Ausgabe).
* `toText` enthält Version, Profil, Zähler und die Nummer des Dokuments; keine Zeichen im Emoji-Bereich.
* Ungültige Eingabe (negative Zähler, `documents` fehlt) wirft `PSReportError` mit sprechender Meldung.

**Oberfläche:** Knopf "Bericht speichern" neben "Ergebnis speichern" (TXT, bei Mehrfachverarbeitung zusätzlich JSON); SHA-256 über `crypto.subtle.digest('SHA-256', ...)` im Seitenskript. Test: End-to-End erzeugt Bericht und prüft die Datei auf Fragmente (wie oben).

**Abnahme:** Unit-Tests grün; Stichprobe: Bericht eines Testdokuments von Hand gelesen, enthält nichts Personenbezogenes.

---

## A3: Verschlüsselte Zuordnung (`.psmap`)

**Marke:** H (Spezifikation vollständig), **Prüfung durch Sonnet mittel Pflicht** (Sicherheitsfunktion). **Aufwand:** 3 h. **Voraussetzung:** keine.

**Problem heute:** Die Zuordnung (Platzhalter zu Originalwerten) wird als **Klartext-CSV** gespeichert (`privacyshield_mapping.csv`). Wer die Datei findet, hat alle Originaldaten. 2.0 verschlüsselt sie standardmäßig.

**Datei:** `app/lib/psmap.js` (`PSLib.psmap`), Test `tests/unit/psmap.test.mjs`. **Ausschließlich Web Crypto** (`globalThis.crypto.subtle`, in Node 22 vorhanden), keine eigene Kryptografie, keine neue Bibliothek.

Format (binär, Big-Endian):

| Bytes | Inhalt |
|---|---|
| 4 | Magic `PSM1` (0x50 0x53 0x4D 0x31) |
| 1 | Formatversion `1` |
| 1 | KDF-Kennung `1` = PBKDF2-HMAC-SHA-256 |
| 4 | Iterationen (uint32), Standard **600000** |
| 16 | Salz (zufällig je Datei) |
| 12 | Nonce/IV (zufällig je Datei) |
| n | Chiffretext AES-256-GCM (inklusive 16-Byte-Tag); **AAD = die ersten 38 Header-Bytes** |

Klartext = UTF-8 JSON `{ "v": 1, "created": "<ISO>", "state": { "store": {...}, "cnt": {...} }, "docs": [...] }`.

```js
await PSLib.psmap.encrypt(payloadObject, password, opts?) -> Uint8Array
await PSLib.psmap.decrypt(bytes, password) -> payloadObject
// Fehler: throw new PSMapError(code) mit code in 'WEAK_PASSWORD' | 'WRONG_PASSWORD' | 'CORRUPT' | 'UNSUPPORTED_VERSION' | 'NOT_PSMAP'
// opts: { iterations } (nur für Tests kleiner), { _salt, _iv } nur für Testvektoren (wird in Produktion nie gesetzt)
```

Regeln: Passwort mindestens **10 Zeichen** (`WEAK_PASSWORD`); Iterationen beim Entschlüsseln aus dem Header, aber nur zwischen 100.000 und 5.000.000 akzeptiert (sonst `CORRUPT`, schützt vor Rechenzeit-Angriff); falsches Passwort und beschädigte Daten unterscheiden sich nur, wenn der Header lesbar ist (GCM-Tag-Fehler = `WRONG_PASSWORD`, sonst `CORRUPT`); keine Passwörter oder Schlüssel in Fehlertexten, Logs, Konsole.

**Tests (rot zuerst):**
* Rundlauf: Nutzlast verschlüsseln, entschlüsseln, tief gleich (auch mit Umlauten, Emoji-freien Sonderzeichen, 5 MB Nutzlast).
* Zwei Verschlüsselungen derselben Nutzlast ergeben **verschiedene** Bytes (Salz/Nonce zufällig); Salz und Nonce je 16 bzw. 12 Bytes; Header-Bytes stimmen (Magic, Version 1, KDF 1, Iterationen).
* Falsches Passwort: `PSMapError('WRONG_PASSWORD')`. Ein verändertes Byte im Chiffretext: ebenfalls Fehler (GCM). Verändertes Header-Byte (Iterationen): Fehler (AAD). Abgeschnittene Datei: `CORRUPT`. Fremde Datei (z. B. CSV-Text): `NOT_PSMAP`. Version 2: `UNSUPPORTED_VERSION`.
* Passwort unter 10 Zeichen: `WEAK_PASSWORD`; leeres Passwort ebenso.
* **Testvektor:** Mit festem Salz, IV und Iterationen 1000 stimmt die Ausgabe mit einer **im Test unabhängig berechneten** Referenz überein (Test berechnet Schlüssel und Chiffretext direkt mit `crypto.subtle`, nicht über das Modul).
* Iterationen im Header 10 (zu klein) oder 100.000.000 (zu groß) beim Entschlüsseln: `CORRUPT` ohne lange Rechenzeit (Test mit Zeitgrenze 500 ms).

**Oberfläche (S, Sonnet niedrig, `frontend-design`):** "Zuordnung speichern" öffnet Dialog: Passwort, Wiederholung, Stärke-Hinweis (Länge), deutlicher Text "Ohne dieses Passwort kann die Zuordnung nicht wiederhergestellt werden." Speichert `zuordnung.psmap`. "Zuordnung laden" akzeptiert `.psmap` (Passwortabfrage) und weiter `.csv` (Altformat, mit Hinweis "unverschlüsselt"). CSV-Export bleibt, versteckt unter "Weitere Optionen", mit Bestätigungsdialog "Die Datei enthält alle Originalwerte im Klartext." Test: End-to-End speichern und laden, danach Rückübersetzung exakt.

**Abnahme:** Unit-Tests grün; End-to-End-Rundlauf grün; Prüfer (Sonnet mittel) bestätigt schriftlich: nur Web Crypto, AES-GCM mit zufälliger Nonce je Datei, KDF-Parameter, AAD, keine Geheimnisse in Logs. Offene Frage dort: Argon2/scrypt wären stärker, stehen in Web Crypto nicht zur Verfügung (bewusst nicht per Bibliothek nachgebaut).

---

## A4: Hygiene der Ausgaben

**Marke:** H. **Aufwand:** 1-2 h.

- [ ] **Dateinamen:** `app/lib/hygiene.js` `PSLib.hygiene.safeName(original, index, { keepName })`: Standard `anonymisiert_001` (laufende Nummer, drei Stellen) mit Endung des Zielformats; Originalname nur mit Option "Originalnamen verwenden" (Standard aus, Hinweis "Dateinamen enthalten oft Namen"). Test: `safeName('Müller_Hans_Kündigung.docx', 3, {})` ergibt `anonymisiert_003` plus Endung; mit `keepName` wird nur der Name **bereinigt** (keine Pfadtrenner, keine Steuerzeichen, höchstens 80 Zeichen).
- [ ] **PDF-Metadaten:** Beim PDF-Export `doc.setProperties({ title: 'Anonymisiertes Dokument', subject: '', author: '', keywords: '', creator: 'PrivacyShield' })`. Test (End-to-End): exportiertes PDF enthält weder Originalnamen noch Autor (Rohtext-Suche im PDF-Byte-Strom).
- [ ] **Zwischenablage:** Wird die **Zuordnung** oder der **Originaltext** kopiert, löscht die App die Zwischenablage nach 60 Sekunden, falls sie noch denselben Inhalt enthält (`clipboard.readText() === gespeichert`). Hauptprozess: `copy-text`-Handler merkt Hash und Zeitgeber; Umgebungsvariable `PS_CLIPBOARD_CLEAR_MS` überschreibt die Dauer für Tests. Test: kopieren, 500 ms warten (Variable), Zwischenablage leer; zwischenzeitlich anderer Inhalt bleibt erhalten.
- [ ] **Download-URLs freigeben:** `dl()` ruft nach dem Klick `URL.revokeObjectURL` auf (Verzögerung 10 s). Test: statisch (Quelltext enthält den Aufruf) plus Funktionstest.
- [ ] **Schließen mit ungespeicherter Zuordnung:** Beim Schließen des Fensters Rückfrage "Die Zuordnung wurde nicht gespeichert. Später können Platzhalter nicht zurückübersetzt werden. Trotzdem schließen?" (nur wenn Zuordnung nicht leer und nicht gespeichert). Test: End-to-End mit `window.close()` und Dialog-Mock.

**Abnahme:** Unit- und End-to-End-Tests grün; keine neue Abhängigkeit; Bericht des Implementierers listet jede geänderte Stelle (Datei, Zeile).
