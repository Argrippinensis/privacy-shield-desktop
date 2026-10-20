// Prueft die Download-Links der Desktop-Seite (arcangeli-website). Aufruf aus dem Repo-Wurzelverzeichnis:
//   node tests/desktop-links.mjs                 prueft desktop/index.html (gebaute Seite)
//   node tests/desktop-links.mjs --stable        zusaetzlich: nur feste Namen (releases/latest/download/<Name>), keine Versionsnummern
// Benoetigt Netz. Exit-Code 1 bei Problem; in deploy.sh vor dem Deploy aufrufen.
import fs from 'fs';

const STABLE = ['PrivacyShield-Setup.exe', 'PrivacyShield-mac-arm64.zip', 'PrivacyShield-mac-x64.zip', 'PrivacyShield.AppImage'];
const html = fs.readFileSync('desktop/index.html', 'utf8');
const links = [...new Set([...html.matchAll(/https:\/\/github\.com\/Argrippinensis\/privacy-shield-desktop\/[^"'\s<>]+/g)].map((m) => m[0]))];
let bad = 0;
const fail = (m) => { bad++; console.log('FEHLER ' + m); };

if (process.argv.includes('--stable')) {
  for (const n of STABLE) if (!links.some((l) => l.endsWith('/releases/latest/download/' + n))) fail(`fester Link fehlt: ${n}`);
  for (const l of links) if (/\/download\/v\d|\/tag\/v\d|-\d+\.\d+\.\d+\./.test(l)) fail(`Link mit Versionsnummer: ${l}`);
  const ver = html.match(/PRIVACYSHIELD DESKTOP[^<]*v\d+\.\d+\.\d+/);
  if (ver) fail('Versionsnummer im Seitentext: ' + ver[0]);
}
for (const l of links) {
  try {
    const r = await fetch(l, { method: 'HEAD', redirect: 'follow' });
    if (r.status === 200) console.log('ok     ' + r.status + ' ' + l.replace('https://github.com/Argrippinensis/privacy-shield-desktop/', ''));
    else fail(`HTTP ${r.status}: ${l}`);
  } catch (e) { fail(`nicht erreichbar: ${l} (${e.message})`); }
}
console.log(bad ? `\n${bad} Problem(e)` : `\nalle ${links.length} Links in Ordnung`);
process.exit(bad ? 1 : 0);
