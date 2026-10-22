// A3.w: Zuordnung speichern/laden als verschluesselte .psmap (Knoepfe btn-map-save, btn-map-load, Dateifeld inp-map-load)
import test from 'node:test';
import assert from 'node:assert/strict';
import { launchApp, toolFrame, captureDownloads, getDownloads, runAnon } from './helpers.mjs';
import { generateDocs } from './eval/generate.mjs';

const PW = 'korrektes Pferd Batterie';
const docs = generateDocs(2);
const TEXT = docs.map((d) => d.text).join('\n\n');
const frags = [];
for (const d of docs) for (const t of [].concat(d.truth)) for (const f of t.frags) if (f.length >= 5) frags.push(f);
const T = { timeout: 8000 };
const MSG_WRONG = 'Passwort falsch oder Datei beschädigt.';

const storeOf = (f) => f.evaluate(() => JSON.parse(JSON.stringify(store)));
const bodyText = (f) => f.evaluate(() => document.body.innerText);

async function save(f, p1, p2 = p1) {
  await captureDownloads(f);
  await f.click('#btn-map-save', T);
  await f.waitForSelector('#PWDLG', { state: 'visible', timeout: 5000 });
  await f.fill('#PWD1', p1);
  await f.fill('#PWD2', p2);
  await f.click('#PWOK', T);
}
async function savedFile(f) {
  await f.waitForFunction(() => (window.__dls || []).length > 0, null, { timeout: 15000 });
  const d = (await getDownloads(f)).find((x) => x.name === 'zuordnung.psmap');
  assert.ok(d, 'zuordnung.psmap fehlt');
  return d;
}
async function clear(f) {
  await f.evaluate(() => { window.confirm = () => true; clrMap(); });
  assert.deepEqual(await storeOf(f), {});
}
async function load(f, name, buffer, pw) {
  await f.setInputFiles('#inp-map-load', [{ name, mimeType: 'application/octet-stream', buffer }]);
  if (pw !== undefined) {
    await f.waitForSelector('#PWDLG', { state: 'visible', timeout: 5000 });
    await f.fill('#PWD1', pw);
    await f.click('#PWOK', T);
  }
}

test('A3.w: speichern, leeren, laden, deanon stellt Original exakt wieder her', async () => {
  const a = await launchApp({ offline: true });
  try {
    const f = await toolFrame(a.win);
    const { out, store: before } = await runAnon(f, TEXT);
    assert.ok(Object.keys(before).length > 0);
    await save(f, PW);
    const d = await savedFile(f);
    const bytes = Buffer.from(d.base64, 'base64');
    assert.equal(bytes.subarray(0, 4).toString('latin1'), 'PSM1');
    const latin = bytes.toString('latin1');
    const utf = bytes.toString('utf8');
    for (const fr of frags) assert.equal(utf.includes(fr) || latin.includes(fr), false, 'Klartextfragment in .psmap');
    await clear(f);
    await load(f, 'zuordnung.psmap', bytes, PW);
    await f.waitForFunction(() => Object.keys(store).length > 0, null, { timeout: 15000 });
    assert.deepEqual(await storeOf(f), before);
    const back = await f.evaluate(async (o) => {
      document.getElementById('AR').value = o;
      deanon();
      return document.getElementById('RT').value;
    }, out);
    assert.equal(back, TEXT);
  } finally { await a.close(); }
});

test('A3.w: falsches Passwort zeigt Fehlermeldung und laesst store unveraendert', async () => {
  const a = await launchApp({ offline: true });
  try {
    const f = await toolFrame(a.win);
    await runAnon(f, TEXT);
    await save(f, PW);
    const bytes = Buffer.from((await savedFile(f)).base64, 'base64');
    await clear(f);
    await load(f, 'zuordnung.psmap', bytes, 'ganz anderes Passwort');
    await f.waitForFunction((m) => document.body.innerText.includes(m), MSG_WRONG, { timeout: 15000 });
    assert.deepEqual(await storeOf(f), {});
  } finally { await a.close(); }
});

test('A3.w: Altformat .csv laedt weiterhin', async () => {
  const a = await launchApp({ offline: true });
  try {
    const f = await toolFrame(a.win);
    const csv = 'Variable,Originalwert,Typ,Methode\n"{{NAME_1}}","Müller","NAME","KI"\n';
    await load(f, 'privacyshield_mapping.csv', Buffer.from(csv, 'utf8'));
    await f.waitForFunction(() => Object.keys(store).length > 0, null, { timeout: 8000 });
    const s = await storeOf(f);
    assert.equal(s['{{NAME_1}}'].v, 'Müller');
  } finally { await a.close(); }
});

test('A3.w: zu kurzes Passwort speichert nicht', async () => {
  const a = await launchApp({ offline: true });
  try {
    const f = await toolFrame(a.win);
    await runAnon(f, TEXT);
    await save(f, 'kurz9abcd');
    await new Promise((r) => setTimeout(r, 1500));
    assert.equal((await getDownloads(f)).length, 0);
    assert.equal(await f.isVisible('#PWDLG'), true, 'Dialog bleibt offen');
  } finally { await a.close(); }
});

test('A3.w: ungleiche Wiederholung speichert nicht', async () => {
  const a = await launchApp({ offline: true });
  try {
    const f = await toolFrame(a.win);
    await runAnon(f, TEXT);
    await save(f, PW, PW + 'x');
    await new Promise((r) => setTimeout(r, 1500));
    assert.equal((await getDownloads(f)).length, 0);
    assert.equal(await f.isVisible('#PWDLG'), true, 'Dialog bleibt offen');
  } finally { await a.close(); }
});

test('A3.w: Abbrechen schliesst Dialog ohne Download', async () => {
  const a = await launchApp({ offline: true });
  try {
    const f = await toolFrame(a.win);
    await runAnon(f, TEXT);
    await captureDownloads(f);
    await f.click('#btn-map-save', T);
    await f.waitForSelector('#PWDLG', { state: 'visible', timeout: 5000 });
    assert.equal(await f.getAttribute('#PWDLG', 'role'), 'dialog');
    assert.equal(await f.getAttribute('#PWDLG', 'aria-modal'), 'true');
    assert.ok((await bodyText(f)).includes('Ohne dieses Passwort kann die Zuordnung nicht wiederhergestellt werden.'));
    await f.click('#PWCANCEL', T);
    assert.equal(await f.isVisible('#PWDLG'), false);
    assert.equal((await getDownloads(f)).length, 0);
  } finally { await a.close(); }
});

test('A3.w: mapSaved und psMapUnsaved()', async () => {
  const a = await launchApp({ offline: true });
  try {
    const f = await toolFrame(a.win);
    await runAnon(f, TEXT);
    assert.equal(await f.evaluate(() => [mapSaved, psMapUnsaved()]).then((x) => x.join()), 'false,true');
    await save(f, PW);
    await savedFile(f);
    await f.waitForFunction(() => mapSaved === true, null, { timeout: 5000 });
    assert.equal(await f.evaluate(() => psMapUnsaved()), false);
    await runAnon(f, TEXT);
    assert.equal(await f.evaluate(() => mapSaved), false);
  } finally { await a.close(); }
});
