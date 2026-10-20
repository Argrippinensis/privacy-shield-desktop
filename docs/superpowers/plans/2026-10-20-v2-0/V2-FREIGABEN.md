# V2-FREIGABEN: Dauerfreigaben des Nutzers

Gilt nur, was der Nutzer **im Chat schriftlich** erteilt hat (Wortlaut und Datum hier eintragen). Eine Freigabe gilt nur für den genannten Umfang und die genannten Bedingungen; alles andere braucht eine neue Freigabe. Widerruf jederzeit im Chat.

## Stand

Version 1.8.0 wurde vom Nutzer ausdruecklich zur Veroeffentlichung freigegeben (Chat, 2026-10-20: "Das mit der Version 1.8.0, die soll komplett online gestellt werden") und liegt ausserhalb dieses Plans. Fuer 2.0 gilt: **keine Betas und keine Pre-releases**, ein **Cron-Ausloeser** (alle 2 h) setzt die Arbeit nach Limit oder Abbruch fort (vom Nutzer am 2026-10-20 ausdruecklich gewuenscht, Trigger `trig_01BFtBbS69N7ymWDXat91cb4`); er darf nur Pakete bearbeiten, nichts veroeffentlichen.

## Dauerfreigabe V2-1 (Vorschlag, noch nicht erteilt; Nutzer bestaetigt im Chat)

Der Orchestrator darf ohne Einzelbestaetigung: (1) Branches `v2/*` und den Plan-Branch pushen, (2) einen Pull-Request-**Entwurf** `v2/main` gegen `main` fuehren, (3) Arbeitsverzeichnisse und Klone unter `~/projects/ps-v2` und `/tmp` anlegen und aufraeumen.

**Nicht erteilt (immer eigene Frage):** Merge nach `main`, jedes Release (Tag), Website-Deploy, Kaeufe/Konten/Zugangsdaten, Aenderungen am Web-Tool auf arcangeli.eu, Loeschen von Releases oder Tags.

## Erteilte Freigaben

| Nr | Datum | Wortlaut des Nutzers (Zitat) | Umfang | Widerrufen am |
|---|---|---|---|---|
| V2-1 | 2026-10-20 | "Ja (Empfohlen)" (Antwort auf die Frage nach Dauerfreigabe V2-1) | Dauerfreigabe V2-1 wie oben: Pushes v2/* und Plan-Branch, Entwurfs-PR v2/main gegen main, Arbeitsverzeichnisse ~/projects/ps-v2 und /tmp; ausgenommen Merge nach main, Release, Deploy, Kaeufe, Web-Tool, Loeschen von Releases | |
