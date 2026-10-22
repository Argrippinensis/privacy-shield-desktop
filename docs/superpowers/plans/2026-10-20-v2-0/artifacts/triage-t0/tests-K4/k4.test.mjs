// K4: Gespeichert-Merker bei fehlgeschlagenem/abgebrochenem Download. Echter Electron-Download, im Hauptprozess abgebrochen
// (wie Abbruch des Speichern-Dialogs oder Schreibfehler). Nur synthetische Werte.
import test from 'node:test';
import assert from 'node:assert/strict';
const H = await import('/tmp/triage/v2/tests/helpers.mjs');

test('K4: abgebrochener Download darf Zuordnung nicht als gespeichert markieren', async () => {
  const a = await H.launchApp({ offline: true, appDir: '/tmp/triage/v2' });
  const f = await H.toolFrame(a.win);
  try {
    await a.app.evaluate(({ session }) => {
      globalThis.__dlStates = [];
      session.defaultSession.on('will-download', (e, item) => {
        item.on('done', (ev, state) => globalThis.__dlStates.push({ name: item.getFilename(), state }));
        item.cancel();
      });
    });
    await f.evaluate(() => startApp());
    await f.evaluate(async () => {
      document.getElementById('IT').value = 'Kontakt: anna.beispiel@example.invalid.';
      await anon();
    });
    console.log('vor Speichern: psMapUnsaved =', await f.evaluate(() => psMapUnsaved()));
    await f.evaluate(() => { psMapSave(); document.getElementById('PWD1').value = 'Synthetisch-Passwort-1'; document.getElementById('PWD2').value = 'Synthetisch-Passwort-1'; });
    await f.evaluate(() => psPwOk());
    await H.sleep(1500);
    const toast = await f.evaluate(() => document.getElementById('TT').textContent);
    const st = await a.app.evaluate(() => globalThis.__dlStates);
    const unsaved = await f.evaluate(() => psMapUnsaved());
    console.log('Download-Ergebnis im Hauptprozess:', JSON.stringify(st), '| Toast:', JSON.stringify(toast), '| psMapUnsaved nach Abbruch =', unsaved);
    assert.equal(st[0] && st[0].state, 'cancelled', 'Testaufbau: Download muss abgebrochen sein');
    assert.equal(unsaved, true, 'Zuordnung gilt als gespeichert, obwohl der Download abgebrochen wurde');
  } finally { await a.close(); }
});

test('K4b: ZIP mit Zuordnung, Download abgebrochen: Merker', async () => {
  const a = await H.launchApp({ offline: true, appDir: '/tmp/triage/v2' });
  const f = await H.toolFrame(a.win);
  try {
    await a.app.evaluate(({ session }) => { session.defaultSession.on('will-download', (e, item) => item.cancel()); });
    await f.evaluate(() => startApp());
    await H.setFiles(f, [{ name: 'a.txt', mimeType: 'text/plain', buffer: Buffer.from('Kontakt: anna.beispiel@example.invalid.') }, { name: 'b.txt', mimeType: 'text/plain', buffer: Buffer.from('Kontakt: ben.beispiel@example.invalid.') }]);
    await f.waitForFunction(() => document.querySelectorAll('#PRJPANEL button.prj-item').length === 2);
    await f.click('#PRJRUN');
    await f.waitForFunction(() => [...document.querySelectorAll('#PRJPANEL button.prj-item')].every((e) => /fertig/i.test(e.textContent)), null, { timeout: 60000 });
    await f.evaluate(() => { prjZip(); });
    await f.waitForFunction(() => document.getElementById('PWDLG').style.display === 'flex');
    await f.evaluate(() => { document.getElementById('PWD1').value = 'Synthetisch-Passwort-1'; document.getElementById('PWD2').value = 'Synthetisch-Passwort-1'; psPwOk(); });
    await f.waitForFunction(() => /ZIP gespeichert/.test(document.getElementById('TT').textContent), null, { timeout: 15000 });
    console.log('ZIP-Toast:', await f.evaluate(() => document.getElementById('TT').textContent), '| psMapUnsaved =', await f.evaluate(() => psMapUnsaved()));
    assert.equal(await f.evaluate(() => psMapUnsaved()), true);
  } finally { await a.close(); }
});
