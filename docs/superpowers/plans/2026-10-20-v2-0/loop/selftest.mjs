// Selbsttest der Loop-Werkzeuge:  node selftest.mjs   (Exit 0 = in Ordnung)
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ps-loop-'));
const env = { ...process.env, PS_QUEUE: path.join(tmp, 'q.json'), PS_LOCK: path.join(tmp, 'lock'), PS_STOP: path.join(tmp, 'stop') };
// Der Test arbeitet auf einer Kopie im Grundzustand (alle Pakete offen), unabhaengig vom echten Stand der Liste (V2-QUEUE.json darf laufende/erledigte Pakete enthalten).
const pristine = () => { const d = JSON.parse(fs.readFileSync(path.join(HERE, 'V2-QUEUE.json'), 'utf8')); for (const p of d.packages) { p.status = 'offen'; p.attempts = 0; p.lease = null; p.notes = ''; p.branch = ''; p.commit = ''; } for (const m of d.milestones) { m.status = 'offen'; } return d; };
fs.writeFileSync(env.PS_QUEUE, JSON.stringify(pristine()));
const q = (...a) => { const r = spawnSync('node', [path.join(HERE, 'queue.mjs'), ...a], { env, encoding: 'utf8' }); return { code: r.status, out: r.stdout.trim(), err: r.stderr.trim() }; };
const ids = (r) => JSON.parse(r.out).map((p) => p.id);
let n = 0; const t = (name, fn) => { fn(); n++; console.log('  ok  ' + name); };

t('Liste ist in sich stimmig: Voraussetzungen vorhanden, keine Zyklen, Meilensteine gueltig, Abnahmebefehle plausibel', () => {
  const d = pristine(); const by = Object.fromEntries(d.packages.map((p) => [p.id, p]));
  assert.equal(Object.keys(by).length, d.packages.length, 'doppelte Ids');
  for (const p of d.packages) {
    for (const x of p.deps) assert.ok(by[x], `${p.id}: unbekannte Voraussetzung ${x}`);
    if (!p.kann && p.id !== 'P0') assert.ok(p.allowed.length > 0, `${p.id}: keine erlaubten Dateien`);
    for (const c of p.accept) assert.match(c, /^(npm |node |xvfb-run |python3 )/, `${p.id}: unbekannter Abnahmebefehl ${c}`);
    assert.ok(!p.serial === p.parallel, `${p.id}: serial/parallel widerspruechlich`);
    for (const t of p.tests) assert.ok(p.allowed.some((a) => a === t || a.endsWith('**') || a.includes('*')), `${p.id}: Test ${t} nicht im erlaubten Bereich`);
    if (p.build) assert.ok(p.accept.some((c) => c.includes('build:linux')), `${p.id}: build ohne Paketbau`);
  }
  const state = {}; const visit = (i, trail) => { if (state[i] === 2) return; assert.notEqual(state[i], 1, 'Zyklus: ' + [...trail, i].join(' -> ')); state[i] = 1; for (const x of by[i].deps) visit(x, [...trail, i]); state[i] = 2; };
  for (const i of Object.keys(by)) visit(i, []);
  for (const m of d.milestones) for (const x of m.after) assert.ok(by[x], `Meilenstein ${m.id}: unbekanntes Paket ${x}`);
});
t('Start: nur P0 (Planhaertung) bereit, mit Rollen laut Profil', () => {
  const b = JSON.parse(q('next', '--max', '3').out); assert.deepEqual(b.map((p) => p.id), ['P0']);
  assert.equal(b[0].roles.implementer.model, 'sonnet'); assert.equal(b[0].roles.implementer.effort, 'xhigh'); assert.equal(b[0].roles.testAutor, null);
});
t('Rollen: Bau-Paket Sonnet niedrig, Krypto-Pruefer xhigh; Profil gemischt nutzt Haiku fuer Bau', () => {
  const all = JSON.parse(fs.readFileSync(env.PS_QUEUE, 'utf8')); all.packages.filter((p) => p.id !== 'P0').forEach((p) => { p.status = 'offen'; }); all.packages.find((p) => p.id === 'P0').status = 'fertig'; all.packages.find((p) => p.id === 'F2').status = 'fertig'; fs.writeFileSync(env.PS_QUEUE, JSON.stringify(all));
  const b = JSON.parse(q('next', '--max', '9').out); const a1 = b.find((p) => p.id === 'A1.m'); const a3 = b.find((p) => p.id === 'A3.m');
  assert.deepEqual(a1.roles.implementer, { model: 'sonnet', effort: 'low' }); assert.equal(a1.roles.pruefer, null); assert.equal(a3.roles.pruefer.effort, 'xhigh');
  q('profile', 'gemischt'); const g = JSON.parse(q('next', '--max', '9').out).find((p) => p.id === 'A1.m'); assert.deepEqual(g.roles.implementer, { model: 'haiku', effort: 'low' });
  q('profile', 'sonnet'); assert.equal(q('profile', 'unbekannt').code, 2);
  fs.writeFileSync(env.PS_QUEUE, JSON.stringify(pristine())); q('claim', 'P0', 'x'); q('done', 'P0', 'c0');
});
t('Nach P0: nur F2 bereit', () => assert.deepEqual(ids(q('next', '--max', '3')), ['F2']));
t('claim setzt laeuft und zaehlt Versuch', () => { assert.equal(q('claim', 'F2', 'test').code, 0); assert.equal(q('claim', 'F2', 'test').code, 1); });
t('waehrend F2 laeuft: nichts weiter bereit', () => assert.deepEqual(ids(q('next', '--max', '3')), []));
t('done gibt Folgepakete frei: Module parallel, ein serielles', () => {
  q('done', 'F2', 'abc123');
  const got = ids(q('next', '--max', '6'));
  assert.ok(got.includes('F1.a'), 'F1.a (Modul) fehlt'); assert.ok(got.includes('F2.e'), 'F2.e (serielles Paket) fehlt'); assert.ok(got.includes('M1.m') && got.includes('A1.m') && got.includes('A3.m'), 'Module fehlen');
  assert.equal(got.filter((i) => JSON.parse(fs.readFileSync(env.PS_QUEUE, 'utf8')).packages.find((p) => p.id === i).serial).length, 1, 'genau ein serielles');
  assert.ok(got.length <= 6);
});
t('Voraussetzungen: A1.w erst nach A1.m, M1.m und F1.b', () => {
  assert.equal(q('claim', 'A1.w', 'x').code, 1); q('claim', 'A1.m', 'x'); q('done', 'A1.m', 'c1');
  assert.equal(q('claim', 'A1.w', 'x').code, 1, 'M1.m und F1.b fehlen noch'); q('done', 'M1.m', 'c2'); q('done', 'F1.b', 'c3');
  assert.equal(q('claim', 'A1.w', 'x').code, 0);
});
t('block und Versuchsgrenze', () => { q('block', 'A1.w', 'Test rot'); assert.match(q('status').out, /blockiert\s+A1\.w/); q('reopen', 'A1.w'); for (let i = 0; i < 3; i++) { q('claim', 'A1.w', 'x'); q('reap', '--ttl-min', '0'); } assert.equal(q('claim', 'A1.w', 'x').code, 1, 'vierter Versuch muss scheitern'); });
t('reap setzt abgelaufene Leases zurueck', () => { q('claim', 'A2.m', 'x'); const r = JSON.parse(q('reap', '--ttl-min', '0').out); assert.ok(r.reaped.includes('A2.m')); });
t('Sperre: zweiter Besitzer wird abgewiesen', () => { assert.equal(q('lock', 'acquire', 'A').code, 0); assert.equal(q('lock', 'acquire', 'B').code, 3); assert.equal(q('lock', 'heartbeat', 'A').code, 0); q('lock', 'release', 'A'); assert.equal(q('lock', 'acquire', 'B').code, 0); });
t('Stopp-Datei', () => { assert.equal(q('stopped').code, 1); fs.writeFileSync(env.PS_STOP, ''); assert.equal(q('stopped').code, 0); });
t('Meilenstein erscheint erst, wenn alle Voraussetzungen fertig sind', () => {
  const all = JSON.parse(fs.readFileSync(env.PS_QUEUE, 'utf8'));
  all.milestones.forEach((m) => { m.status = 'offen'; }); all.packages.forEach((p) => { if (['A1.w', 'A2.w', 'A3.w', 'A4.w', 'F1.b', 'F2.h'].includes(p.id)) p.status = 'offen'; }); fs.writeFileSync(env.PS_QUEUE, JSON.stringify(all));
  assert.deepEqual(JSON.parse(q('milestones').out).map((m) => m.id), []);
  for (const i of ['A1.w', 'A2.w', 'A3.w', 'A4.w', 'F1.b', 'F2.h']) { q('reopen', i); }
  const a2 = JSON.parse(fs.readFileSync(env.PS_QUEUE, 'utf8')); a2.packages.forEach((p) => { if (['A1.w', 'A2.w', 'A3.w', 'A4.w', 'F1.b', 'F2.h'].includes(p.id)) p.status = 'fertig'; }); fs.writeFileSync(env.PS_QUEUE, JSON.stringify(a2));
  assert.deepEqual(JSON.parse(q('milestones').out).map((m) => m.id), ['phase-vertrauen']);
  q('ms-done', 'phase-vertrauen', 'ok'); assert.deepEqual(JSON.parse(q('milestones').out).map((m) => m.id), []);
});
t('Kann-Pakete nie ohne Flag', () => { const whole = JSON.parse(fs.readFileSync(env.PS_QUEUE, 'utf8')); for (const p of whole.packages) if (p.status === 'offen' && !p.kann) p.status = 'fertig'; fs.writeFileSync(env.PS_QUEUE, JSON.stringify(whole)); assert.deepEqual(ids(q('next', '--max', '9')), []); assert.ok(ids(q('next', '--max', '9', '--include-kann')).length > 0); });

// gate.mjs in einem Wegwerf-Repository
const repo = path.join(tmp, 'repo'); fs.mkdirSync(path.join(repo, 'app/lib'), { recursive: true }); fs.mkdirSync(path.join(repo, 'tests/unit'), { recursive: true });
const g = (...a) => execFileSync('git', ['-C', repo, '-c', 'user.name=t', '-c', 'user.email=t@t', ...a], { encoding: 'utf8' });
g('init', '-q', '-b', 'main'); fs.writeFileSync(path.join(repo, 'README.md'), 'x\n'); g('add', 'README.md'); g('commit', '-q', '-m', 'base');
g('checkout', '-q', '-b', 'pkg');
fs.writeFileSync(path.join(repo, 'tests/unit/leakcheck.test.mjs'), 'import test from "node:test";\ntest("rot",()=>{});\n'); g('add', 'tests/unit/leakcheck.test.mjs'); g('commit', '-q', '-m', 'test'); const testCommit = g('rev-parse', 'HEAD').trim();
const gate = (...a) => { const r = spawnSync('node', [path.join(HERE, 'gate.mjs'), 'A1.m', '--repo', repo, '--base', 'main', '--queue', path.join(HERE, 'V2-QUEUE.json'), ...a], { encoding: 'utf8' }); return { code: r.status, res: JSON.parse(r.stdout) }; };
t('gate: sauberer Stand besteht (ohne Abnahmebefehle)', () => { fs.writeFileSync(path.join(repo, 'app/lib/leakcheck.js'), '(function(r){r.x=1;})(typeof window!=="undefined"?window:module.exports);\n'); g('add', 'app/lib/leakcheck.js'); g('commit', '-q', '-m', 'impl'); const r = gate('--skip-accept', '--test-commit', testCommit); assert.equal(r.code, 0, JSON.stringify(r.res.checks.filter((c) => !c.ok))); });
t('gate: Datei ausserhalb des Bereichs faellt auf', () => { fs.writeFileSync(path.join(repo, 'main.js'), '//\n'); g('add', 'main.js'); g('commit', '-q', '-m', 'fremd'); const r = gate('--skip-accept'); assert.equal(r.code, 1); assert.ok(r.res.checks.find((c) => c.name === 'geltungsbereich' && !c.ok)); });
t('gate: geaenderter Test faellt auf', () => { g('rm', '-q', 'main.js'); g('commit', '-q', '-m', 'weg'); fs.appendFileSync(path.join(repo, 'tests/unit/leakcheck.test.mjs'), '// gelockert\n'); g('commit', '-q', '-am', 'test geaendert'); const r = gate('--skip-accept', '--test-commit', testCommit); assert.ok(r.res.checks.find((c) => c.name === 'tests-unveraendert' && !c.ok)); });
t('gate: DOM in Modul, Emoji und Geheimnis fallen auf', () => {
  fs.writeFileSync(path.join(repo, 'app/lib/leakcheck.js'), 'var a=document.getElementById("x");\n// \u{1F600}\nvar t="ghp_' + 'a'.repeat(30) + '";\n'); g('commit', '-q', '-am', 'schlecht');
  const r = gate('--skip-accept'); const bad = r.res.checks.filter((c) => !c.ok).map((c) => c.name);
  for (const n of ['module-rein', 'keine-emojis', 'keine-geheimnisse']) assert.ok(bad.includes(n), n + ' nicht erkannt: ' + bad);
});
t('gate: Abnahmebefehl wird ausgefuehrt (Exit-Code zaehlt)', () => { const qq = JSON.parse(fs.readFileSync(path.join(HERE, 'V2-QUEUE.json'), 'utf8')); qq.packages.find((p) => p.id === 'A1.m').accept = ['exit 3']; const f = path.join(tmp, 'q2.json'); fs.writeFileSync(f, JSON.stringify(qq)); const r = spawnSync('node', [path.join(HERE, 'gate.mjs'), 'A1.m', '--repo', repo, '--base', 'main', '--queue', f], { encoding: 'utf8' }); assert.ok(JSON.parse(r.stdout).checks.find((c) => c.name === 'befehl: exit 3' && !c.ok)); });
t('Autocommit: jede Aenderung der Liste wird committet', () => {
  const r2 = path.join(tmp, 'qrepo'); fs.mkdirSync(r2); const gg = (...a) => execFileSync('git', ['-C', r2, '-c', 'user.name=t', '-c', 'user.email=t@t', ...a], { encoding: 'utf8' });
  gg('init', '-q', '-b', 'main'); fs.writeFileSync(path.join(r2, 'q.json'), JSON.stringify(pristine())); gg('add', 'q.json'); gg('commit', '-q', '-m', 'start');
  const e2 = { ...env, PS_QUEUE: path.join(r2, 'q.json'), PS_AUTOCOMMIT: '1', GIT_AUTHOR_NAME: 't', GIT_AUTHOR_EMAIL: 't@t', GIT_COMMITTER_NAME: 't', GIT_COMMITTER_EMAIL: 't@t' };
  const rr = spawnSync('node', [path.join(HERE, 'queue.mjs'), 'claim', 'P0', 'x'], { env: e2, encoding: 'utf8' }); assert.equal(rr.status, 0, rr.stderr);
  assert.match(gg('log', '--oneline', '-1'), /chore\(queue\): claim P0/);
});
fs.rmSync(tmp, { recursive: true, force: true });
console.log(`${n} Pruefungen bestanden`);
