// Shell der Desktop-App: Diagnose und Anordnung der Bedienelemente.
import test from 'node:test';
import assert from 'node:assert/strict';
import { launchApp, toolFrame } from './helpers.mjs';

test('Diagnose kopieren legt technische Angaben (ohne Dokumentinhalte) in die Zwischenablage', async () => {
  const a = await launchApp({ offline: true });
  try {
    const f = await toolFrame(a.win);
    await f.evaluate(() => { document.getElementById('IT').value = 'Vertraulicher Text von Thomas Müller'; });
    await a.win.click('#btn-diag');
    await a.win.waitForTimeout(800);
    const text = await a.app.evaluate(({ clipboard }) => clipboard.readText());
    assert.match(text, /^PrivacyShield \d+\.\d+\.\d+/);
    assert.match(text, /KI-Modus: auto/);
    assert.match(text, /Cross-Origin-Isolation: true/);
    assert.doesNotMatch(text, /Müller|Vertraulich/);
  } finally { await a.close(); }
});

test('Versions- und Update-Leiste liegt unten und verdeckt die Navigation des Tools nicht', async () => {
  const a = await launchApp({ offline: true });
  try {
    await toolFrame(a.win);
    const box = await a.win.evaluate(() => { const r = document.getElementById('update-check-btn').getBoundingClientRect(); return { top: r.top, height: innerHeight }; });
    assert.ok(box.top > box.height / 2, 'Leiste muss in der unteren Haelfte liegen');
  } finally { await a.close(); }
});
