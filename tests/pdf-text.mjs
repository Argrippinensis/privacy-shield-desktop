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
    const items = [];
    for (let n = 1; n <= doc.numPages; n++) {
      const content = (await (await doc.getPage(n)).getTextContent()).items;
      items.push(content);
      // PDF.js emits actual word spaces as text items; font fragments are not words.
      pages.push(content.map(i => i.str + (i.hasEOL ? '\n' : '')).join(''));
    }
    const text = pages.join('\n');
    if (process.env.PS_PDF_ARTIFACTS) {
      const out = path.resolve(process.env.PS_PDF_ARTIFACTS);
      fs.mkdirSync(out, { recursive: true });
      const prefix = path.basename(file, '.pdf');
      fs.copyFileSync(file, path.join(out, prefix + '.pdf'));
      fs.writeFileSync(path.join(out, prefix + '.txt'), text);
      fs.writeFileSync(path.join(out, prefix + '-items.json'), JSON.stringify(items, null, 2));
    }
    return text;
  } finally { await doc.destroy(); }
}
export async function pdfPageCount(file) {
  const doc = await pdfjs.getDocument({ data: new Uint8Array(fs.readFileSync(file)), isEvalSupported: false }).promise;
  try { return doc.numPages; } finally { await doc.destroy(); }
}
