# V2-FREIGABEN: Dauerfreigaben des Nutzers

Gilt nur, was der Nutzer **im Chat schriftlich** erteilt hat (Wortlaut und Datum hier eintragen). Eine Freigabe gilt nur für den genannten Umfang und die genannten Bedingungen; alles andere braucht eine neue Freigabe. Widerruf jederzeit im Chat.

## Vorschlag (noch nicht erteilt, Nutzer bestätigt im Chat mit "Ja, Freigabe V2-1" o. ä.)

**V2-1, Routine ohne Einzelbestätigung.** Der Orchestrator darf, solange alle Bedingungen erfüllt sind:
1. Pull-Request `release/1.8.0` nach grünem CI (Ubuntu und Windows) **mergen**, `v1.8.0` taggen, den Build beobachten und das Release mit `scripts/verify-release.mjs v1.8.0 --upgrade-from v1.7.0 --deep` prüfen. Bedingung: CI grün, Prüfung ohne `FEHLER`; sonst stoppen und melden.
2. Branches `v2/*` pushen, Pull-Request-**Entwurf** `v2/main` gegen `main` pflegen.
3. Vorabversionen `2.0.0-beta.N` und `2.0.0-rc.N` als **GitHub-Pre-release** veröffentlichen (Tag, Build, Prüfung), wenn: alle Pakete der Phase "fertig", `xvfb-run -a npm test` und `npm run eval` grün, CI auf drei Systemen grün, `verify-release.mjs` ohne `FEHLER`. Normale Nutzer erhalten Pre-releases nicht automatisch.

**Nicht erteilt (bleibt Gate, eigene Frage):** Merge von `v2/main` nach `main`, Release `2.0.0` (final), Website-Deploy, Käufe/Konten/Zugangsdaten (Signierung), Änderungen am Web-Tool auf arcangeli.eu, Löschen von Releases oder Tags.

## Erteilte Freigaben

| Nr | Datum | Wortlaut des Nutzers (Zitat) | Umfang | Widerrufen am |
|---|---|---|---|---|
