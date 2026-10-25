// Verhindert einen Tag-Release mit falscher Version oder fehlendem Installer.
// Laeuft vor gh release create; die CI prueft denselben Vertrag mit synthetischen Verzeichnissen.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const REQUIRED_FILES = Object.freeze([
  'PrivacyShield-Setup.exe',
  'PrivacyShield-mac-arm64.zip',
  'PrivacyShield-mac-x64.zip',
  'PrivacyShield.AppImage',
  'PrivacyShield.deb',
]);

export function checkReleaseInputs(tag, root = ROOT) {
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  const expectedTag = `v${pkg.version}`;
  if (tag !== expectedTag) throw new Error(`Tag ${tag || '(fehlt)'} passt nicht zu package.json (${expectedTag}).`);

  const changelog = fs.readFileSync(path.join(root, 'CHANGELOG.md'), 'utf8');
  const heading = `## [${pkg.version}] - `;
  if (!changelog.split(/\r?\n/).some((line) => line.startsWith(heading)
      && /^## \[[^\]]+\] - \d{4}-\d{2}-\d{2}$/.test(line))) {
    throw new Error(`CHANGELOG.md braucht einen datierten Abschnitt fuer ${pkg.version}.`);
  }

  for (const file of REQUIRED_FILES) {
    const target = path.join(root, 'dist', file);
    let stat;
    try { stat = fs.statSync(target); } catch { throw new Error(`Release-Datei fehlt: ${file}`); }
    if (!stat.isFile() || stat.size === 0) throw new Error(`Release-Datei ist leer oder keine Datei: ${file}`);
  }
  return { version: pkg.version, files: REQUIRED_FILES };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const result = checkReleaseInputs(process.argv[2]);
    console.log(`Release-Eingaben fuer ${result.version} vollstaendig: ${result.files.join(', ')}`);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
