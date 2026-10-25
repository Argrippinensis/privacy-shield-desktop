// Layout: die Hinweiszeile "Vor der ersten Nutzung ..." steht mittig wie die Zeilen darueber, nicht am linken Fensterrand
// (Gesamtsicht vor 2.0.0, 2026-10-25).
import test from 'node:test';
import assert from 'node:assert/strict';
import { launchApp, toolFrame } from './helpers.mjs';

test('Arbeitsansicht: die Hinweiszeile "Vor der ersten Nutzung" ist mittig und nicht am linken Rand', { timeout: 90000 }, async () => {
  const a = await launchApp({ offline: true });
  try {
    await a.app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setContentSize(1280, 800));
    const f = await toolFrame(a.win);
    await f.evaluate(() => { startApp(); });
    const r = await f.evaluate(() => {
      const el = [...document.querySelectorAll('span')].find((s) => s.textContent.includes('Vor der ersten Nutzung'));
      const b = el.getBoundingClientRect();
      return { mitte: (b.left + b.right) / 2, breite: document.documentElement.clientWidth, links: b.left };
    });
    assert.ok(r.links > 24, `Hinweiszeile klebt am linken Rand (links=${Math.round(r.links)} px)`);
    assert.ok(Math.abs(r.mitte - r.breite / 2) < 40, `Hinweiszeile nicht mittig (Mitte ${Math.round(r.mitte)} px, Fensterbreite ${r.breite} px)`);
  } finally { await a.close(); }
});
