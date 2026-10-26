// B1.m: Projekt mit gemeinsamen Platzhaltern (PSLib.project). Rote Tests aus der Spezifikation.
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadLib } from './_load.mjs';

const P = loadLib('project');

// Stub: ersetzt Muller/Weber (mit Umlaut) durch {{NAME_n}}, gleicher Wert = gleiches Token
function stubAnonymize(text, { state }) {
  let n = 0;
  const out = text.replace(/Müller|Weber/g, (v) => {
    n++;
    let tok = Object.keys(state.store).find((k) => state.store[k].v === v);
    if (!tok) {
      state.cnt.NAME = (state.cnt.NAME || 0) + 1;
      tok = '{{NAME_' + state.cnt.NAME + '}}';
      state.store[tok] = { v, t: 'NAME' };
    }
    return tok;
  });
  return { text: out, counts: { NAME: n } };
}
function restore(text, state) {
  let t = text;
  for (const tok of Object.keys(state.store)) t = t.split(tok).join(state.store[tok].v);
  return t;
}
function fill(p, texts) {
  return texts.map((t, i) => P.add(p, { name: 'Datei_' + (i + 1) + '.txt', text: t }));
}

test('LIMITS hat die Standardwerte 200 Dokumente und 209715200 Zeichen', () => {
  assert.equal(P.LIMITS.docs, 200);
  assert.equal(P.LIMITS.totalChars, 209715200);
});

test('Gleicher Name in zwei Dokumenten: bei shared true gleicher Platzhalter, state zurueckgegeben', async () => {
  const p = P.create({ shared: true });
  fill(p, ['Herr Müller kam.', 'Auch Müller ging.']);
  const r = await P.run(p, { anonymize: stubAnonymize });
  assert.equal(r.results.length, 2);
  assert.match(r.results[0].text, /\{\{NAME_1\}\}/);
  assert.match(r.results[1].text, /\{\{NAME_1\}\}/);
  assert.ok(r.state && r.state.store && r.state.cnt);
  assert.equal(r.state.cnt.NAME, 1);
});

test('Gleicher Name in zwei Dokumenten: bei shared false verschiedene Platzhalter, state null, results[i].state vorhanden', async () => {
  const p = P.create({ shared: false });
  fill(p, ['Herr Müller kam.', 'Auch Müller ging.']);
  const r = await P.run(p, { anonymize: stubAnonymize });
  assert.equal(r.state, null);
  assert.ok(r.results[0].state && r.results[1].state);
  assert.notEqual(r.results[0].state, r.results[1].state);
  assert.match(r.results[0].text, /\{\{NAME_1\}\}/);
  assert.match(r.results[1].text, /\{\{NAME_1\}\}/);
  assert.deepEqual(Object.keys(r.results[0].state.store), ['{{NAME_1}}']);
});

test('shared true: dasselbe Zustandsobjekt wird in place an jeden Aufruf uebergeben', async () => {
  const p = P.create({ shared: true });
  fill(p, ['Müller', 'Weber']);
  const seen = [];
  const r = await P.run(p, { anonymize: (t, o) => { seen.push(o.state); return stubAnonymize(t, o); } });
  assert.equal(seen.length, 2);
  assert.equal(seen[0], seen[1]);
  assert.equal(seen[0], r.state);
});

test('profile wird an anonymize durchgereicht, auch asynchrones anonymize funktioniert', async () => {
  const p = P.create({ shared: true });
  fill(p, ['Müller']);
  const prof = { name: 'strikt' };
  let got;
  const r = await P.run(p, { profile: prof, anonymize: async (t, o) => { got = o.profile; return stubAnonymize(t, o); } });
  assert.equal(got, prof);
  assert.equal(r.results[0].status, 'fertig');
});

test('add vergibt ids ab 1 aufsteigend, index zeigt Position und Status wartet', () => {
  const p = P.create({ shared: true });
  const ids = fill(p, ['a', 'b', 'c']);
  assert.deepEqual(ids, [1, 2, 3]);
  const idx = P.index(p);
  assert.deepEqual(idx.map((d) => [d.id, d.index, d.name, d.chars, d.status]), [
    [1, 1, 'Datei_1.txt', 1, 'wartet'],
    [2, 2, 'Datei_2.txt', 1, 'wartet'],
    [3, 3, 'Datei_3.txt', 1, 'wartet'],
  ]);
});

test('Entferntes Dokument verschiebt index der folgenden, ids werden nie wiederverwendet', () => {
  const p = P.create({ shared: true });
  const [a, b, c] = fill(p, ['a', 'b', 'c']);
  assert.equal(P.remove(p, b), true);
  assert.equal(P.remove(p, b), false);
  assert.equal(P.remove(p, 999), false);
  assert.deepEqual(P.index(p).map((d) => [d.id, d.index]), [[a, 1], [c, 2]]);
  const d = P.add(p, { name: 'neu.txt', text: 'd' });
  assert.equal(d, 4);
  assert.deepEqual(P.index(p).map((x) => [x.id, x.index]), [[1, 1], [3, 2], [4, 3]]);
});

test('run vergibt index 1-basiert ohne entfernte und liefert Ergebnisse in Einfuegereihenfolge', async () => {
  const p = P.create({ shared: true });
  const [a, b, c] = fill(p, ['Müller', 'Weber', 'nichts']);
  P.remove(p, b);
  const r = await P.run(p, { anonymize: stubAnonymize });
  assert.deepEqual(r.results.map((x) => [x.id, x.index, x.status]), [[a, 1, 'fertig'], [c, 2, 'fertig']]);
  assert.deepEqual(P.index(p).map((d) => d.status), ['fertig', 'fertig']);
  assert.deepEqual(r.results[0].counts, { NAME: 1 });
  assert.equal(r.aborted, false);
});

test('Erneutes run verarbeitet alles neu mit frischem Zustand', async () => {
  const p = P.create({ shared: true });
  fill(p, ['Müller', 'Weber']);
  const r1 = await P.run(p, { anonymize: stubAnonymize });
  const r2 = await P.run(p, { anonymize: stubAnonymize });
  assert.notEqual(r1.state, r2.state);
  assert.equal(r2.state.cnt.NAME, 2);
  assert.equal(r2.results[0].text, '{{NAME_1}}');
  assert.equal(r2.results[1].text, '{{NAME_2}}');
});

test('onProgress meldet done, total, id, index und status nach jedem Dokument', async () => {
  const p = P.create({ shared: true });
  const ids = fill(p, ['Müller', 'Weber', 'x']);
  const calls = [];
  await P.run(p, { anonymize: stubAnonymize, onProgress: (e) => calls.push(e) });
  assert.deepEqual(calls.map((e) => [e.done, e.total, e.id, e.index, e.status]), [
    [1, 3, ids[0], 1, 'fertig'],
    [2, 3, ids[1], 2, 'fertig'],
    [3, 3, ids[2], 3, 'fertig'],
  ]);
});

test('Fehlerdokument: status fehler, error.kind ist der Fehlername, keine Meldung im Ergebnis, Folgedokumente laufen', async () => {
  const p = P.create({ shared: true });
  fill(p, ['eins', 'Müller zwei', 'drei Weber']);
  const calls = [];
  const r = await P.run(p, {
    onProgress: (e) => calls.push(e),
    anonymize: (t, o) => {
      if (t.startsWith('Müller')) throw new TypeError('Müller');
      return stubAnonymize(t, o);
    },
  });
  assert.equal(r.results.length, 3);
  assert.equal(r.results[1].status, 'fehler');
  assert.equal(r.results[1].error.kind, 'TypeError');
  assert.equal(r.results[1].text, null);
  assert.equal(r.results[1].counts, null);
  assert.ok(!JSON.stringify(r.results).includes('Müller'));
  assert.equal(r.results[2].status, 'fertig');
  assert.equal(r.results[2].text, 'drei {{NAME_1}}');
  assert.deepEqual(P.index(p).map((d) => d.status), ['fertig', 'fehler', 'fertig']);
  assert.equal(calls[1].done, 2);
  assert.equal(calls[1].status, 'fehler');
});

test('Abgelehntes Promise zaehlt als Fehler, bei Fehlern ohne name lautet kind Error', async () => {
  const p = P.create({ shared: true });
  fill(p, ['a', 'b']);
  let n = 0;
  const r = await P.run(p, {
    anonymize: async () => {
      n++;
      if (n === 1) return Promise.reject(new RangeError('geheim'));
      const e = new Error('geheim');
      e.name = '';
      throw e;
    },
  });
  assert.equal(r.results[0].error.kind, 'RangeError');
  assert.equal(r.results[1].error.kind, 'Error');
  assert.ok(!JSON.stringify(r.results).includes('geheim'));
});

test('Abbruch per AbortController nach Dokument 2 von 5: 2 Ergebnisse, Rest wartet, aborted true', async () => {
  const p = P.create({ shared: true });
  fill(p, ['a', 'b', 'c', 'd', 'e']);
  const ac = new AbortController();
  const r = await P.run(p, {
    anonymize: stubAnonymize,
    signal: ac.signal,
    onProgress: (e) => { if (e.done === 2) ac.abort(); },
  });
  assert.equal(r.results.length, 2);
  assert.equal(r.aborted, true);
  assert.deepEqual(P.index(p).map((d) => [d.index, d.status]), [
    [1, 'fertig'], [2, 'fertig'], [3, 'wartet'], [4, 'wartet'], [5, 'wartet'],
  ]);
});

test('Bereits abgebrochenes Signal: kein Dokument wird verarbeitet', async () => {
  const p = P.create({ shared: true });
  fill(p, ['a', 'b']);
  const ac = new AbortController();
  ac.abort();
  let calls = 0;
  const r = await P.run(p, { anonymize: (t, o) => { calls++; return stubAnonymize(t, o); }, signal: ac.signal });
  assert.equal(calls, 0);
  assert.equal(r.aborted, true);
  assert.deepEqual(r.results, []);
});

test('Grenze Dokumentenzahl: das 4. Dokument bei docs 3 wirft LIMIT und wird nicht aufgenommen', () => {
  const p = P.create({ shared: true, limits: { docs: 3, totalChars: 1000 } });
  fill(p, ['a', 'b', 'c']);
  assert.throws(() => P.add(p, { name: 'x', text: 'd' }), (e) => e instanceof P.PSProjectError && e.code === 'LIMIT');
  assert.equal(P.index(p).length, 3);
});

test('Grenze Textsumme: ein Dokument ueber der Summe 1000 wirft LIMIT, genau 1000 ist erlaubt', () => {
  const p = P.create({ shared: true, limits: { docs: 3, totalChars: 1000 } });
  P.add(p, { name: 'a', text: 'x'.repeat(600) });
  assert.throws(() => P.add(p, { name: 'b', text: 'x'.repeat(401) }), (e) => e.code === 'LIMIT');
  assert.equal(P.index(p).length, 1);
  assert.equal(P.add(p, { name: 'b', text: 'x'.repeat(400) }), 2);
});

test('Nach remove wird die Grenze wieder frei, die ID bleibt aber unbenutzt', () => {
  const p = P.create({ shared: true, limits: { docs: 1, totalChars: 1000 } });
  const a = P.add(p, { name: 'a', text: 'x' });
  assert.throws(() => P.add(p, { name: 'b', text: 'y' }), (e) => e.code === 'LIMIT');
  P.remove(p, a);
  assert.equal(P.add(p, { name: 'b', text: 'y' }), 2);
});

test('INVALID bei Text oder Name ohne String, leerer Text und leerer Name sind erlaubt', () => {
  const p = P.create({ shared: true });
  for (const bad of [{ name: 'a', text: 5 }, { name: 'a', text: null }, { name: 'a' }, { name: 7, text: 'x' }, { text: 'x' }]) {
    assert.throws(() => P.add(p, bad), (e) => e instanceof P.PSProjectError && e.code === 'INVALID');
  }
  assert.equal(P.index(p).length, 0);
  assert.equal(P.add(p, { name: '', text: '' }), 1);
});

test('PSProjectError ist ein Error mit code', () => {
  const e = new P.PSProjectError('LIMIT');
  assert.ok(e instanceof Error);
  assert.equal(e.code, 'LIMIT');
});

test('Rundlauf: mit dem gemeinsamen Zustand zurueckuebersetzt sind alle Ergebnisse gleich den Originalen', async () => {
  const originale = ['Herr Müller und Frau Weber.', 'Müller allein.', 'Nichts Besonderes.', 'Weber, Weber, Müller'];
  const p = P.create({ shared: true });
  fill(p, originale);
  const r = await P.run(p, { anonymize: stubAnonymize });
  assert.equal(r.results.length, 4);
  r.results.forEach((x, i) => {
    assert.ok(!/Müller|Weber/.test(x.text));
    assert.equal(restore(x.text, r.state), originale[i]);
  });
});

function drei() {
  const p = P.create({ shared: true });
  fill(p, ['Müller', 'Weber', 'x']);
  return P.run(p, { anonymize: stubAnonymize });
}

test('zipPlan: drei fertige Dokumente mit Bericht und Zuordnung in der festen Reihenfolge', async () => {
  const { results } = await drei();
  const plan = P.zipPlan(results, { report: true, map: true });
  assert.deepEqual(plan.map((e) => e.path), [
    'anonymisiert_001.txt', 'anonymisiert_002.txt', 'anonymisiert_003.txt',
    'bericht.txt', 'bericht.json', 'zuordnung.psmap',
  ]);
  assert.deepEqual(plan.map((e) => e.kind), ['result', 'result', 'result', 'report-text', 'report-json', 'map']);
  assert.deepEqual(plan.slice(0, 3).map((e) => e.id), results.map((r) => r.id));
  for (const e of plan) assert.ok(!/Datei_|Müller|Weber/.test(e.path));
});

test('zipPlan: ohne report und map nur die Ergebnisdateien', async () => {
  const { results } = await drei();
  const plan = P.zipPlan(results, {});
  assert.equal(plan.length, 3);
  assert.ok(plan.every((e) => e.kind === 'result'));
  assert.deepEqual(P.zipPlan(results, { map: true }).map((e) => e.path).slice(3), ['zuordnung.psmap']);
});

test('zipPlan: nameFor wird benutzt', async () => {
  const { results } = await drei();
  const plan = P.zipPlan(results, { nameFor: (r) => 'doc_' + r.id + '.txt' });
  assert.deepEqual(plan.map((e) => e.path), ['doc_1.txt', 'doc_2.txt', 'doc_3.txt']);
});

test('zipPlan: doppelte Pfade werden mit _2, _3 vor der Endung eindeutig', async () => {
  const { results } = await drei();
  const plan = P.zipPlan(results, { nameFor: () => 'gleich.txt' });
  assert.deepEqual(plan.map((e) => e.path), ['gleich.txt', 'gleich_2.txt', 'gleich_3.txt']);
});

test('zipPlan: Fehlerdokument erhaelt keinen Eintrag, die Nummer folgt dem index', async () => {
  const p = P.create({ shared: true });
  fill(p, ['a', 'b', 'c']);
  const r = await P.run(p, { anonymize: (t, o) => { if (t === 'b') throw new Error('x'); return stubAnonymize(t, o); } });
  const plan = P.zipPlan(r.results, { report: true });
  assert.deepEqual(plan.map((e) => e.path), ['anonymisiert_001.txt', 'anonymisiert_003.txt', 'bericht.txt', 'bericht.json']);
});
