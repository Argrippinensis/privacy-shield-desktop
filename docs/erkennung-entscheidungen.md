# Erkennungsentscheidungen und Backlog

Backlog der Erkennungsluecken der zweiten Fallmenge (`tests/eval/cases-v2.mjs`, 170 Faelle, und `generateDocs2(98)`), gemessen in Paket C1.0
mit `npm run eval -- --set v2`. Maßstab: Leck (ein Wert steht nach dem Anonymisieren noch im Text) und Fehlalarm (Text ohne Personenbezug
wird maskiert, Kategorie NEG). Die Ausgangsstaende stehen als Ratsche in `tests/eval/baseline-v2.json`.

Je Eintrag: Fall-Id, Gruppe, Modus. Die Entscheidung (Regel, Woerterbuch, Modell, bewusst offen) folgt in C1.1 bis C1.3 als
ein Absatz je Fall-Id im Abschnitt "Entscheidungen" unten. Die Erkennung (app/lib/detect.js) wurde in C1.0 nicht veraendert.

Modi: wortlisten (nur Regeln), fallback (Regeln plus Wortlisten, Modell startet nicht), ki (mit Modell).

## Messung C1.0 (Ausgangsstand)

| Modus | Luecken Handfaelle | Fehlalarme (NEG von 60) | Synthetik undicht |
|---|---|---|---|
| wortlisten | 36 von 110 | 21 | 68 von 860 |
| fallback | 36 von 110 | 23 | 46 von 860 |
| ki | 24 von 110 | 25 | 24 von 860 |

## Offene Luecken je Modus

### Modus wortlisten

* Fehlalarme (NEG): v2n01 v2n02 v2n13 v2n15 v2n20 v2n21 v2n23 v2n25 v2n26 v2n29 v2n30 v2n32 v2n34 v2n35 v2n37 v2n48 v2n50 v2n51 v2n52 v2n53 v2n56
* V2-ART9: v2a66 v2a67
* V2-AUSLAND: v2a92 v2a94 v2a95 v2a96 v2a97 v2a99
* V2-FORM: v2a81 v2a83 v2a84 v2a85 v2a86 v2a87
* V2-GERAET: v2a30
* V2-IDENT: v2a03 v2a06 v2a07 v2a08
* V2-KONTAKT: v2a12 v2a15 v2a19 v2a20
* V2-NUMMER: v2a45 v2a47
* V2-PERSON: v2a51 v2a54 v2a57
* V2-SECRET: v2a101 v2a103 v2a104 v2a105 v2a109 v2a110
* V2-STANDORT: v2a35 v2a39
* Synthetik je Typ (undicht/gesamt): NAME 63/191, TAXID 5/14

### Modus fallback

* Fehlalarme (NEG): v2n01 v2n02 v2n13 v2n15 v2n20 v2n21 v2n23 v2n25 v2n26 v2n29 v2n30 v2n32 v2n34 v2n35 v2n37 v2n43 v2n44 v2n48 v2n50 v2n51 v2n52 v2n53 v2n56
* V2-ART9: v2a66 v2a67
* V2-AUSLAND: v2a92 v2a94 v2a95 v2a96 v2a97 v2a99
* V2-FORM: v2a81 v2a83 v2a84 v2a85 v2a86 v2a87
* V2-GERAET: v2a30
* V2-IDENT: v2a03 v2a06 v2a07 v2a08
* V2-KONTAKT: v2a12 v2a15 v2a19 v2a20
* V2-NUMMER: v2a45 v2a47
* V2-PERSON: v2a51 v2a54 v2a57
* V2-SECRET: v2a101 v2a103 v2a104 v2a105 v2a109 v2a110
* V2-STANDORT: v2a35 v2a39
* Synthetik je Typ (undicht/gesamt): NAME 41/191, TAXID 5/14

### Modus ki

* Fehlalarme (NEG): v2n01 v2n02 v2n06 v2n13 v2n15 v2n20 v2n21 v2n23 v2n25 v2n26 v2n29 v2n30 v2n32 v2n34 v2n35 v2n37 v2n43 v2n44 v2n48 v2n50 v2n51 v2n52 v2n53 v2n55 v2n56
* V2-ART9: v2a67
* V2-AUSLAND: v2a92 v2a94 v2a99
* V2-FORM: v2a83 v2a84 v2a85 v2a86
* V2-GERAET: v2a30
* V2-IDENT: v2a08
* V2-KONTAKT: v2a12 v2a15 v2a19 v2a20
* V2-NUMMER: v2a45 v2a47
* V2-SECRET: v2a101 v2a103 v2a104 v2a105 v2a109 v2a110
* V2-STANDORT: v2a35 v2a39
* Synthetik je Typ (undicht/gesamt): NAME 19/191, TAXID 5/14

## Entscheidungen

(noch keine; je Fall-Id ein Absatz: Fall-Id, Entscheidung, Grund)
