# Richtliniendatei (policy.json)

Mit einer Richtliniendatei legen Sie eigene Kennungen und Begriffe fest, die PrivacyShield zusätzlich zur Standard-Erkennung maskiert, zum Beispiel Kundennummern oder Projektnamen Ihrer Organisation. Die Datei lässt sich in der Oberfläche importieren (Bereich "Eigene Regeln", Knopf "Importieren"), dort auch wieder exportieren ("Export") und im Kommandozeilenmodus mit `--policy` angeben (siehe `docs/kommandozeile.md`).

Die Datei enthält nur Regeln, nie Dokumentinhalte. In der Oberfläche werden die Regeln auf diesem Gerät gespeichert (lokaler Speicher der Anwendung) und beim nächsten Start wieder geladen.

## Aufbau (Version 1)

```json
{
  "version": 1,
  "name": "Beispiel GmbH",
  "rules": [
    {
      "id": "kunde",
      "label": "Kundennummer",
      "type": "regex",
      "pattern": "K-\\d{6}",
      "flags": "",
      "category": "KUNDENNR",
      "profiles": ["*"]
    },
    {
      "id": "projekte",
      "label": "Projektnamen",
      "type": "list",
      "terms": ["Projekt Falke", "Alpha-Programm"],
      "caseSensitive": false,
      "category": "PROJEKT",
      "profiles": ["standard", "strict"]
    }
  ]
}
```

Mit dieser Datei wird aus "Kunde K-123456 betreut Projekt Falke." der Text "Kunde {{KUNDENNR_1}} betreut {{PROJEKT_1}}." Die Kategorie bestimmt den Namen des Platzhalters. Die Rückübersetzung funktioniert wie bei allen anderen Funden.

### Felder der Datei

| Feld | Pflicht | Bedeutung |
|---|---|---|
| `version` | ja | Immer `1`. Andere Werte werden abgelehnt. |
| `name` | ja | Text, höchstens 80 Zeichen. |
| `rules` | ja | Liste mit höchstens 100 Regeln. |

### Felder einer Regel

| Feld | Pflicht | Bedeutung |
|---|---|---|
| `id` | ja | Kennung der Regel: Kleinbuchstaben, Ziffern, `_` und `-`, beginnt mit einem Kleinbuchstaben, höchstens 32 Zeichen, innerhalb der Datei eindeutig. |
| `label` | ja | Anzeigename, höchstens 80 Zeichen. |
| `type` | ja | `regex` (Muster) oder `list` (Begriffsliste). |
| `pattern` | bei `regex` | Das Muster, höchstens 200 Zeichen, nur aus der erlaubten Teilmenge (siehe unten). |
| `flags` | nein | `""` (Standard) oder `"i"` (Groß- und Kleinschreibung egal). Andere Werte werden abgelehnt. |
| `terms` | bei `list` | Liste von Begriffen, mindestens 1. Jeder Begriff hat 1 bis 200 Zeichen und beginnt mit einem Buchstaben oder einer Ziffer. Insgesamt höchstens 5.000 Begriffe je Datei. |
| `caseSensitive` | nein | `true` oder `false` (Standard `false`): ob die Schreibweise bei Begriffen beachtet wird. |
| `category` | nein | Platzhaltertyp: Großbuchstaben, Ziffern und `_`, beginnt mit einem Großbuchstaben, 2 bis 20 Zeichen. Standard `EIGEN`. Beispiel: `KUNDENNR` ergibt `{{KUNDENNR_1}}`. |
| `profiles` | nein | Liste von Profil-Ids, in denen die Regel gilt, oder `["*"]` für alle (Standard). Profil-Ids: `standard`, `finance`, `medical`, `strict`, `custom`. |
| `enabled` | nein | `false` schaltet die Regel ab, ohne sie zu löschen (Standard `true`). |

Weitere Grenzen: Die Datei darf höchstens 1 MiB groß sein. Die Schlüssel `__proto__`, `constructor` und `prototype` sind an keiner Stelle erlaubt. Unbekannte Felder werden verworfen.

Begriffslisten finden einen Begriff nur als ganzes Wort: "Alpha-Programm" trifft "alpha-programm" (bei `caseSensitive: false`), aber weder "Alpha-Programmierer" noch "xAlpha-Programm". Treffer innerhalb schon vergebener Platzhalter werden ignoriert.

Beim Import prüft PrivacyShield die gesamte Datei und zeigt Fehler mit der Regel-Id an (nie den Inhalt eines Begriffs). Ist die Datei nicht in Ordnung, wird sie nicht übernommen. Sind bereits gespeicherte Regeln beschädigt, sperrt die Oberfläche das Anonymisieren, bis eine gültige Datei importiert oder die Regeln verworfen werden ("Gespeicherte Regeln verwerfen"), damit nie ohne die eigene Regel anonymisiert wird.

Speichern Sie die Datei als UTF-8 ohne Byte-Order-Mark (BOM). Im Kommandozeilenmodus wird eine BOM nicht entfernt; die Datei wird dann als ungültig abgelehnt (Code 3).

## Erlaubte Regex-Teilmenge

Eine laufende Regex lässt sich in der Anwendung nicht abbrechen. Ein ungünstiges Muster wie `(a+)+$` könnte sie minutenlang blockieren. Deshalb sind nur Muster erlaubt, deren Rechenzeit gleichmäßig mit der Textlänge wächst. Dieselbe Prüfung gilt für die "Eigenen Variablen" der Oberfläche.

**Erlaubt**

* Gewöhnliche Zeichen, Zeichenklassen (`[A-Z]`, `[^0-9]`), `.`, Escapes wie `\d`, `\w`, `\s`, `\b`, `\.`, die Anker `^` und `$`.
* Wiederholung mit fester Zahl `{n}` oder begrenztem Bereich `{m,n}`, wobei die Obergrenze `n` höchstens 64 sein darf; ebenso `?`.
* Gruppen `(...)` und `(?:...)` ohne Wiederholung (nur `?` ist auf einer Gruppe erlaubt) und Alternativen mit `|`; Alternativen in einer Gruppe mit `?` sind nicht erlaubt.
* Die Flags `""` und `"i"`.

**Nicht erlaubt**

* Unbegrenzte Wiederholungen: `*`, `+` und `{n,}`. Schreiben Sie stattdessen `{1,20}`.
* Wiederholungen von Gruppen: `(...)*`, `(...)+`, `(...){m,n}`.
* Rückverweise (`\1` bis `\9`, `\k<name>`).
* Vorausschau und Rückschau (`(?=`, `(?!`, `(?<=`, `(?<!`) und benannte Gruppen (`(?<name>`).
* Muster über 200 Zeichen, andere Flags als `i`, ungültige Syntax.
* Zu aufwendige Muster: Das Produkt der Obergrenzen aller Wiederholungen darf höchstens 1000 sein (`?` zählt 2, `{n}` zählt 1, `{m,n}` zählt `n`, bei `m` gleich 0 zählt es `n + 1`), und zusätzlich darf ein Aufwandsmaß aus diesem Produkt und der Länge der wiederholten Teile höchstens 3000 betragen (Meldung "Das Muster ist zu aufwendig"). Bei Ablehnung hilft es, kleinere Obergrenzen zu wählen.

### Beispiele

Diese Muster werden angenommen:

| Muster (im JSON mit doppeltem Rückstrich) | Trifft zum Beispiel |
|---|---|
| `K-\d{6}` | K-123456 |
| `VTR-\d{4,8}` | VTR-20241 |
| `[A-Z]{2}\d{5,10}` | AB1234567 |
| `(?:Projekt\|Vorgang)[ -]\d{3,6}` | Projekt 4711 |
| `\d{3}\.\d{3}\.\d{3}` | 123.456.789 |
| `AZ-\d{2}/\d{4}` | AZ-12/2024 |
| `ab(cd)?ef` | abef, abcdef |

Diese Muster werden abgelehnt:

| Muster | Grund |
|---|---|
| `K-\d+` | unbegrenzte Wiederholung; besser `K-\d{1,10}` |
| `\w*x` | unbegrenzte Wiederholung |
| `(a+)+$` | unbegrenzte Wiederholung, verschachtelt |
| `(a\|b){1,5}` | Wiederholung auf einer Gruppe |
| `(a)\1` | Rückverweis |
| `(?=x)y`, `(?<!x)y` | Vorausschau, Rückschau |
| `a{1,65}` | Obergrenze über 64 |
| `a{1,10}b{1,10}c{1,10}d{1,2}` | Produkt der Obergrenzen über 1000 |
| `(` | ungültige Syntax |

(Im Beispiel steht `\|` in der Tabelle, damit die Tabelle lesbar bleibt; im Muster selbst ist es ein einfaches `|`.)

## Zusammenspiel mit der übrigen Erkennung

* Treffer eigener Regeln sind eindeutige Funde (in der Gegenprüfung gelten übrig gebliebene Treffer als hohe Schwere).
* Der Bericht nennt nur die Zahl der eigenen Regeln, nie Muster oder Begriffe.
* Die Regeln der Datei gelten zusätzlich zu den "Eigenen Variablen" und den manuellen Markierungen.
* Eine Regel mit `profiles` gilt nur, wenn im Werkzeug (oder mit `--profile`) eines der genannten Profile gewählt ist. Im Kommandozeilenmodus ist `maximal` ein anderer Name für `strict`.
