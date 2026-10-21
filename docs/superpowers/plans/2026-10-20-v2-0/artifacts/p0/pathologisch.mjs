// P0: Rechenzeit des Erkennungskerns bei pathologischen Eingaben (Node-Prototyp core-vm.mjs, Modus W1). Jede Form in einem eigenen Prozess mit Zeitgrenze:
//   PS_REPO=~/projects/ps-v2 node pathologisch.mjs            (Liste mit Grenzwerten, N=3000 je Form, Zeitgrenze 30 s je Form)
// Gemessen auf 1.8.0 (i7-2620M): 20.000 x "A" 4 s (100.000: 100 s); 1.000 Leerzeichen 2,9 s, 2.000 22 s, 5.000 347 s; 1.000 Leerzeilen 1,2 s, 2.000 9,3 s;
// 2.000 x "\r\n" 74 s. Normaler Fliesstext: 100.000 Zeichen 41 ms. Siehe V2-F-fundament.md (F5).
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const here = path.dirname(fileURLToPath(import.meta.url));
if (process.argv[2] === '--one') {
  const { anonymize } = await import('./core-vm.mjs');
  const [name, n] = [process.argv[3], Number(process.argv[4])];
  const rep = (s) => s.repeat(Math.ceil(n / s.length)).slice(0, n);
  const forms = { A: rep('A'), a: rep('a'), eins: rep('1'), leerzeichen: 'x' + ' '.repeat(n) + 'y', tabs: 'x' + '\t'.repeat(n) + 'y', leerzeilen: 'Vertrag\n' + '\n'.repeat(n) + 'Ende', crlf: 'Vertrag\n' + '\r\n'.repeat(n) + 'Ende', leerNl: rep(' \n'), wort: rep('Wort '), hans: rep('Hans '), berlin: rep('Berlin '), doppelpunkt: rep(': ') };
  const t0 = performance.now(); anonymize(forms[name], { wordlists: true }); console.log(name.padEnd(12), Math.round(performance.now() - t0), 'ms');
} else {
  const names = ['A', 'a', 'eins', 'leerzeichen', 'tabs', 'leerzeilen', 'crlf', 'leerNl', 'wort', 'hans', 'berlin', 'doppelpunkt'];
  for (const name of names) {
    const r = spawnSync('node', [path.join(here, 'pathologisch.mjs'), '--one', name, process.argv[2] || '3000'], { encoding: 'utf8', timeout: 30000 });
    console.log(r.status === 0 ? r.stdout.trim() : `${name.padEnd(12)} Zeitgrenze (30 s) ueberschritten`);
  }
}
