// F5, verklebte E-Mails und Adressen: Die Verankerungen (Lookbehind) fuer E-Mail- und Strasse/PLZ-Muster duerfen
// keine Werte im Klartext lassen, die v2/main (ohne F5) schwaerzte. Die Erwartung ist per Skript gegen
// v2/main bestaetigt: dort bleibt in jedem dieser Faelle kein Wert im Klartext.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { loadLib } from './_load.mjs';

const D = loadLib('detect');
const pruefe = (text, werte) => {
  const r = D.anonymize(text, { wordlists: true });
  const uebrig = werte.filter((w) => r.text.includes(w));
  assert.deepEqual(uebrig, [], `Klartext geblieben: ${uebrig.join(', ')} in ${JSON.stringify(r.text)}`);
  assert.equal(D.deanonymize(r.text, r.state), text, 'Rueckweg muss den Originaltext ergeben');
};

const A = 'max@example.com';
const B = 'otto@firma.de';
for (const [name, z] of [['Bindestrich', '-'], ['Unterstrich', '_'], ['Prozentzeichen', '%'], ['Pluszeichen', '+']]) {
  test(`verklebte E-Mails (${name}), gleiche Adresse zweimal: keine im Klartext`, () => pruefe(A + z + A, [A]));
  test(`verklebte E-Mails (${name}), zwei verschiedene Adressen: keine im Klartext`, () => pruefe(A + z + B, [A, B]));
}
test('verklebte E-Mails mit Punkt: a@x.de.b@y.de, keine Adresse im Klartext', () => pruefe('a@x.de.b@y.de', ['a@x.de', 'b@y.de']));

const ADR_WERTE = ['Hauptstraße 5', 'Nebenweg 7', 'Gartenweg 3', '10115', '80331', '12345'];
for (const [name, text] of [
  ['gleiche Adresse zweimal mit Bindestrich', 'Hauptstraße 5, 10115 Berlin-Hauptstraße 5, 10115 Berlin'],
  ['zwei Adressen (Berlin, Muenchen) mit Bindestrich', 'Hauptstraße 5, 10115 Berlin-Nebenweg 7, 80331 München'],
  ['zwei Adressen (Musterstr., Koeln) mit Bindestrich', 'Musterstr. 1, 12345 Köln-Gartenweg 3, 12345 Köln'],
  ['Adressen mit Bindestrich-Ortsteil und Gedankenstrich', 'Hauptstraße 5, 10115 Berlin-Das-Volker - Hauptstraße 5, 10115 Berlin'],
  ['Adressen ganz ohne Trennzeichen', 'Hauptstraße 5, 10115 BerlinHauptstraße 5, 10115 Berlin'],
]) {
  test(`verklebte Adressen (${name}): keine Strasse und keine PLZ im Klartext`, () => pruefe(text, ADR_WERTE.filter((w) => text.includes(w))));
}

// Zufallsfaelle aus der Pruefung: v2/main schwaerzte diese Werte im ganzen Text, F5 nicht.
for (const [datei, werte] of [['case_11_53', ['Hauptstraße', '10115']], ['case_13_66', ['max@example.com']]]) {
  const pfad = `/tmp/f5audit/${datei}.txt`;
  test(`Pruefungsfall ${datei}: ${werte.join(', ')} nicht im Klartext`, { skip: !fs.existsSync(pfad) && 'Datei nicht lesbar' }, () => {
    pruefe(fs.readFileSync(pfad, 'utf8'), werte);
  });
}
