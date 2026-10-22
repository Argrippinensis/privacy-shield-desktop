# V2-TRIAGE-T0: Triage der GPT-Pruefung 1 (2026-10-23)

Alle Funde gegen v2/main b27d294 und 1.8.0 a6acfff mit roten Tests geprueft. Berichte und Beweistests: `artifacts/triage-t0/` (Importpfade zeigen auf /tmp/triage/v2 und sind fuer das Repo anzupassen; sie dienen dem Test-Autor als Vorlage).

| Fund | Urteil | 1.8.0? | Paket |
|---|---|---|---|
| E1 manuelle Markierung vs. Normalisierung | bestaetigt | Annotieren-Weg Rueckschritt in v2; eigene Variablen alt | E1.fix |
| K2 woertliche Platzhalter | bestaetigt | alt, im Projektmodus verschaerft | K2.fix |
| K1 Projektkorrektur, veraltete Ergebnisse | bestaetigt (Klartext im ZIP) | Rueckschritt v2 | K1.fix |
| S2 Zuruecksetzen/Entfernen, .psmap und CSV | bestaetigt A und B | Rueckschritt v2 | K1.fix |
| K4 Gespeichert nach abgebrochenem Download | bestaetigt | Merker neu in v2 | K4.fix |
| K3 Koreferenz Ehepartner | bestaetigt | Rueckschritt v2 (C2.w) | C2.fix |
| S1 gefaelschte ZIP-Groessen | bestaetigt, nur lokaler DoS | alt | B2.fix |
| S3 HTML ueber Variablennamen | teilweise: Skript und Weg zu openExternal belegt, kein Fernausloeser | alt (auch in 1.8.0) | S3.fix |
| Q1 Referenzausnahmen | bestaetigt | nicht anwendbar | Q1.fix |
| Q2 Leckmessung | teilweise (Teilreste bestaetigt, Importverlust klein) | Teilreste alt | Q2.fix |
| A1 WCAG 2.2 | bestaetigt | - | in D2.1 einarbeiten (Zielversion 2.2 AA, Matrix nach Erfolgskriterium, wcag22aa plus target-size, 320 CSS-px Reflow) |
| D30 Timeout als gespeichert | Restluecke | - | K4.fix (dritter Zustand "unbekannt") |
| D23 | Abgrenzung zu S2 | - | aiCache beim Zuruecksetzen leeren (K1.fix) |

Reihenfolge (Abhaengigkeiten in der Liste): E1.fix, K2.fix, K1.fix, K4.fix, S3.fix; C2.fix; B2.fix; Q1.fix, Q2.fix. D1.w1, C1.2 haengen an E1.fix, K2.fix, K1.fix, K4.fix, C2.fix, Q1.fix, Q2.fix.
Optional (nicht angelegt): window.open aus dem Tool-Frame nur auf feste Ziele; CSP ohne unsafe-inline (Aufwand L).
