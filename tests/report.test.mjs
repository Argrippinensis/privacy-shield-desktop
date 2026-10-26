// A2.w: Knopf "Bericht speichern" (id btn-report) im Kopf "Anonymisierter Text" -> Download bericht.txt
import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { launchApp, toolFrame, captureDownloads, getDownloads, runAnon } from './helpers.mjs';
import { generateDocs } from './eval/generate.mjs';

const docs = generateDocs(3);
const TEXT = docs.map((d) => d.text).join('\n\n');
const frags = [];
for (const d of docs) for (const t of [].concat(d.truth)) for (const f of t.frags) if (f.length >= 5) frags.push(f);

async function bericht() {
  const a = await launchApp({ offline: true });
  try {
    const f = await toolFrame(a.win);
    const { out } = await runAnon(f, TEXT);
    await captureDownloads(f);
    await f.click('#btn-report', { timeout: 5000 });
    await f.waitForFunction(() => (window.__dls || []).length > 0, null, { timeout: 5000 });
    const dls = await getDownloads(f);
    return { out, dls };
  } finally { await a.close(); }
}

test('Bericht speichern: Download bericht.txt ohne Fragmente der Testdokumente', async () => {
  const { dls } = await bericht();
  const d = dls.find((x) => x.name === 'bericht.txt');
  assert.ok(d, 'bericht.txt fehlt: ' + JSON.stringify(dls.map((x) => x.name)));
  const text = Buffer.from(d.base64, 'base64').toString('utf8');
  assert.ok(frags.length > 0);
  for (const fr of frags) assert.equal(text.includes(fr), false, 'Fragment im Bericht: ' + fr.length + ' Zeichen');
});

test('Bericht speichern: enthaelt Profil und SHA-256 des Ergebnistextes', async () => {
  const { out, dls } = await bericht();
  const d = dls.find((x) => x.name === 'bericht.txt');
  assert.ok(d, 'bericht.txt fehlt');
  const text = Buffer.from(d.base64, 'base64').toString('utf8');
  assert.ok(text.includes('Profil: standard'));
  const sha = crypto.createHash('sha256').update(out, 'utf8').digest('hex');
  assert.ok(text.includes('SHA-256 des Ergebnistextes: ' + sha));
  assert.ok(text.startsWith('PrivacyShield Anonymisierungsbericht'));
});
