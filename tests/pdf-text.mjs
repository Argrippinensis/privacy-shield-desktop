// Independent PDF reader for Chromium's print output, portable across Linux/Windows/macOS.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pdfjs = require('../app/vendor/pdfjs/pdf.min.js');
pdfjs.GlobalWorkerOptions.workerSrc = path.join(root, 'app/vendor/pdfjs/pdf.worker.min.js');
export async function pdfText(file) {
  const doc = await pdfjs.getDocument({ data: new Uint8Array(fs.readFileSync(file)), isEvalSupported: false, useSystemFonts: true }).promise;
  try {
    const pages = [];
    for (let n = 1; n <= doc.numPages; n++) pages.push((await (await doc.getPage(n)).getTextContent()).items.map(i => i.str + (i.hasEOL ? '\n' : ' ')).join(''));
    return pages.join('\n');
  } finally { await doc.destroy(); }
}
