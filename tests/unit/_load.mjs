// Lader fuer Unit-Tests: Module aus app/lib und Vendor-Bibliotheken ohne Electron laden.
// Bewusst nicht in tests/helpers.mjs (dessen Import ist langsam und braucht die Electron-Datei).
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

// <dir>/<name>.js ueber den CommonJS-Pfad der UMD-Huelle; wirft bei unbekanntem Namen
export function loadLib(name, dir = path.join(ROOT, 'app', 'lib')) {
  return require(path.join(dir, name + '.js'));
}

const VENDOR = { jszip: 'jszip.min.js', mammoth: 'mammoth.browser.min.js' };
export function loadVendor(name) {
  if (!VENDOR[name]) throw new Error('Unbekannte Bibliothek: ' + name);
  return require(path.join(ROOT, 'app', 'vendor', name, VENDOR[name]));
}
