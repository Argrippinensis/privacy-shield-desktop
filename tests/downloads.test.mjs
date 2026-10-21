// E2E-Testhilfen aus F2 (Punkt 3b): captureDownloads/getDownloads, setFiles, launchApp({ userDataDir })
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { launchApp, toolFrame } from './helpers.mjs';
import * as H from './helpers.mjs';

const { captureDownloads, getDownloads, setFiles } = H;

test('Hilfen: captureDownloads, getDownloads und setFiles sind exportiert', () => {
  assert.equal(typeof captureDownloads, 'function');
  assert.equal(typeof getDownloads, 'function');
  assert.equal(typeof setFiles, 'function');
});

test('dl("x.txt", "ä") im Werkzeug liefert genau einen Download x.txt mit UTF-8-Base64', async () => {
  const a = await launchApp({ offline: true });
  try {
    const f = await toolFrame(a.win);
    await captureDownloads(f);
    await f.evaluate(() => dl('x.txt', 'ä', 'text/plain'));
    const d = await getDownloads(f);
    assert.equal(d.length, 1);
    assert.equal(d[0].name, 'x.txt');
    assert.match(d[0].type, /^text\/plain/);
    assert.equal(d[0].size, 2);
    assert.equal(d[0].base64, Buffer.from('ä', 'utf8').toString('base64'));
  } finally { await a.close(); }
});

test('getDownloads liefert mehrere Downloads in der Reihenfolge der Klicks', async () => {
  const a = await launchApp({ offline: true });
  try {
    const f = await toolFrame(a.win);
    await captureDownloads(f);
    await f.evaluate(() => { dl('a.txt', '1', 'text/plain'); dl('b.txt', '2', 'text/plain'); });
    const d = await getDownloads(f);
    assert.deepEqual(d.map((x) => x.name), ['a.txt', 'b.txt']);
  } finally { await a.close(); }
});

test('setFiles mit einer Textdatei fuellt #IT des Werkzeugs', async () => {
  const a = await launchApp({ offline: true });
  try {
    const f = await toolFrame(a.win);
    await f.evaluate(() => startApp());
    await setFiles(f, [{ name: 'in.txt', mimeType: 'text/plain', buffer: Buffer.from('Hallo Welt aus Datei', 'utf8') }]);
    await f.waitForFunction(() => document.getElementById('IT').value.includes('Hallo Welt aus Datei'), null, { timeout: 15000 });
    assert.ok((await f.evaluate(() => document.getElementById('IT').value)).includes('Hallo Welt aus Datei'));
  } finally { await a.close(); }
});

test('launchApp({ userDataDir }) benutzt den Ordner und loescht ihn beim close() nicht', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ps-udd-'));
  try {
    const a = await launchApp({ offline: true, userDataDir: dir });
    try {
      const p = await a.app.evaluate(({ app }) => app.getPath('userData'));
      assert.equal(fs.realpathSync(p), fs.realpathSync(dir));
    } finally { await a.close(); }
    assert.ok(fs.existsSync(dir), 'uebergebener Ordner wurde geloescht');
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('launchApp ohne userDataDir: Temp-Ordner wird beim close() weiterhin geloescht', async () => {
  const a = await launchApp({ offline: true });
  const dir = a.userData;
  assert.ok(fs.existsSync(dir));
  await a.close();
  assert.ok(!fs.existsSync(dir));
});
