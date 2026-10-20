// Erzeugt die App-Icons fuer "Zum Home-Bildschirm" / "App installieren" aus assets/privacyshield/icon-source.png (512x512).
//   node scripts/make-pwa-icons.mjs
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';
const require = createRequire(path.join(process.cwd(), 'package.json'));
const { chromium } = require('playwright');
const DIR = path.join(process.cwd(), 'assets', 'privacyshield');
const src = 'data:image/png;base64,' + fs.readFileSync(path.join(DIR, 'icon-source.png')).toString('base64');
const browser = await chromium.launch();
const page = await browser.newPage();
const out = await page.evaluate(async (src) => {
  const img = new Image(); img.src = src; await img.decode();
  // Randfarbe des Icons (fuer vollflaechigen Hintergrund bei iOS/maskable)
  const probe = document.createElement('canvas'); probe.width = probe.height = 512;
  const pg = probe.getContext('2d'); pg.drawImage(img, 0, 0);
  const [r, g, b] = pg.getImageData(256, 40, 1, 1).data;
  const bg = `rgb(${r},${g},${b})`;
  const make = (size, { fill, scale }) => {
    const c = document.createElement('canvas'); c.width = c.height = size; const ctx = c.getContext('2d');
    if (fill) { ctx.fillStyle = bg; ctx.fillRect(0, 0, size, size); }
    const s = size * scale; ctx.drawImage(img, (size - s) / 2, (size - s) / 2, s, s);
    return c.toDataURL('image/png').split(',')[1];
  };
  return {
    'icon-192.png': make(192, { fill: false, scale: 1 }),
    'icon-512.png': make(512, { fill: false, scale: 1 }),
    'icon-512-maskable.png': make(512, { fill: true, scale: 0.72 }), // Sicherheitszone: Motiv innerhalb der inneren 80 %
    'apple-touch-icon-180.png': make(180, { fill: true, scale: 1 }),  // iOS: keine Transparenz
  };
}, src);
for (const [name, b64] of Object.entries(out)) { fs.writeFileSync(path.join(DIR, name), Buffer.from(b64, 'base64')); console.log('geschrieben:', name); }
await browser.close();
