#!/usr/bin/env node
// Arbeitsliste und Sperre fuer den 2.0-Orchestrator (deterministisch, ohne Modell).
//   node queue.mjs status | summary | next [--max N] [--include-kann]
//   node queue.mjs claim <id> <owner> | heartbeat <id> | done <id> <commit> | block <id> "<grund>" | defer <id> "<grund>" | reopen <id>
//   node queue.mjs milestones | ms-done <id> "<notiz>"   erreichte Meilensteine (Pre-release, Final) anzeigen / abhaken
//   node queue.mjs reap [--ttl-min 45]            abgelaufene Leases zurueck auf "offen"
//   node queue.mjs lock acquire|heartbeat|release [<owner>]   globale Sperre (nur ein Orchestrator gleichzeitig), TTL 30 min
//   node queue.mjs stopped                          Exit 0, wenn die Stopp-Datei existiert (Not-Aus)
// Umgebung: PS_QUEUE (Pfad der Liste, Standard: V2-QUEUE.json neben diesem Skript), PS_AUTOCOMMIT=1 (jede Aenderung committen), PS_LOCK (Standard /tmp/ps-orchestrator.lock),
//           PS_STOP (Standard ~/.ps-STOP)
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { execFileSync } from 'child_process';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const QUEUE = process.env.PS_QUEUE || path.join(HERE, 'V2-QUEUE.json');
const LOCK = process.env.PS_LOCK || '/tmp/ps-orchestrator.lock';
const STOP = process.env.PS_STOP || path.join(os.homedir(), '.ps-STOP');
const LOCK_TTL_MS = 30 * 60 * 1000;

const load = () => JSON.parse(fs.readFileSync(QUEUE, 'utf8'));
const save = (q) => {
  const t = QUEUE + '.tmp'; fs.writeFileSync(t, JSON.stringify(q, null, 1) + '\n'); fs.renameSync(t, QUEUE);
  // PS_AUTOCOMMIT=1: jede Aenderung der Liste sofort festschreiben (ueberlebt Abbruch und Neustart des Rechners)
  if (process.env.PS_AUTOCOMMIT === '1') {
    const dir = path.dirname(QUEUE);
    try {
      execFileSync('git', ['-C', dir, 'add', QUEUE], { stdio: 'ignore' });
      execFileSync('git', ['-C', dir, 'commit', '-q', '-m', `chore(queue): ${process.argv.slice(2, 4).join(' ')}`, '--', QUEUE], { stdio: 'ignore' });
    } catch { /* kein Repository oder nichts zu committen: ignorieren */ }
  }
};
const now = () => Date.now();
const out = (o) => console.log(typeof o === 'string' ? o : JSON.stringify(o, null, 1));
const die = (m, c = 1) => { console.error(m); process.exit(c); };
const arg = (n, d) => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : d; };
const flag = (n) => process.argv.includes(n);

function get(q, id) { const p = q.packages.find((x) => x.id === id); if (!p) die(`Unbekanntes Paket: ${id}`, 2); return p; }
const isDone = (p) => p.status === 'fertig' || p.status === 'verschoben';
const leaseFresh = (p, ttl) => p.lease && now() - p.lease.ts < ttl;

function reap(q, ttlMin) {
  const ttl = ttlMin * 60 * 1000; const reaped = [];
  for (const p of q.packages) {
    if (p.status === 'laeuft' && !leaseFresh(p, ttl)) {
      p.status = 'offen'; p.notes = `${p.notes} [Lease abgelaufen ${new Date().toISOString()}]`.trim(); p.lease = null; reaped.push(p.id);
    }
  }
  return reaped;
}

function ready(q, { includeKann = false } = {}) {
  const maxAttempts = q.maxAttempts || 3;
  return q.packages.filter((p) => p.status === 'offen' && p.attempts < maxAttempts && (includeKann || !p.kann)
    && p.deps.every((d) => isDone(get(q, d))));
}

function pickBatch(q, max, includeKann) {
  // Hoechstens ein serielles Paket (aendert gemeinsame Dateien wie die HTML) gleichzeitig; Module (neue Dateien) beliebig parallel.
  const running = q.packages.filter((p) => p.status === 'laeuft');
  let serialBusy = running.some((p) => p.serial);
  const chosen = [];
  for (const p of ready(q, { includeKann })) {
    if (chosen.length + running.length >= max) break;
    if (p.serial) { if (serialBusy) continue; serialBusy = true; }
    chosen.push(p);
  }
  return chosen;
}

const cmd = process.argv[2];
switch (cmd) {
  case 'status': {
    const q = load();
    for (const p of q.packages) out(`${p.status.padEnd(10)} ${p.id.padEnd(9)} ${p.mark} ${p.serial ? 'seriell ' : 'parallel'} v${p.attempts}  ${p.title}${p.kann ? ' (Kann)' : ''}${p.status === 'blockiert' ? ' :: ' + p.notes : ''}`);
    break;
  }
  case 'summary': {
    const q = load(); const c = {};
    for (const p of q.packages) if (!p.kann) c[p.status] = (c[p.status] || 0) + 1;
    out({ counts: c, ready: ready(q).map((p) => p.id), running: q.packages.filter((p) => p.status === 'laeuft').map((p) => p.id), blocked: q.packages.filter((p) => p.status === 'blockiert').map((p) => `${p.id}: ${p.notes}`) });
    break;
  }
  case 'next': {
    const q = load(); const reaped = reap(q, 45); if (reaped.length) save(q);
    out(pickBatch(q, Number(arg('--max', 1)), flag('--include-kann')));
    break;
  }
  case 'claim': {
    const q = load(); const p = get(q, process.argv[3]); const owner = process.argv[4] || 'orchestrator';
    if (p.status !== 'offen') die(`Paket ${p.id} ist nicht offen (Status ${p.status})`);
    if (!p.deps.every((d) => isDone(get(q, d)))) die(`Voraussetzungen von ${p.id} nicht erfuellt`);
    if (p.attempts >= (q.maxAttempts || 3)) die(`Paket ${p.id}: Versuche ausgeschoepft`);
    p.status = 'laeuft'; p.attempts += 1; p.lease = { owner, ts: now() }; save(q); out(p);
    break;
  }
  case 'heartbeat': { const q = load(); const p = get(q, process.argv[3]); if (p.lease) p.lease.ts = now(); save(q); break; }
  case 'done': { const q = load(); const p = get(q, process.argv[3]); p.status = 'fertig'; p.commit = process.argv[4] || ''; p.lease = null; save(q); break; }
  case 'block': { const q = load(); const p = get(q, process.argv[3]); p.status = 'blockiert'; p.notes = process.argv[4] || ''; p.lease = null; save(q); break; }
  case 'defer': { const q = load(); const p = get(q, process.argv[3]); p.status = 'verschoben'; p.notes = process.argv[4] || ''; p.lease = null; save(q); break; }
  case 'reopen': { const q = load(); const p = get(q, process.argv[3]); p.status = 'offen'; p.attempts = 0; p.lease = null; p.notes = ''; save(q); break; }
  case 'milestones': {
    const q = load();
    out((q.milestones || []).filter((m) => m.status === 'offen' && m.after.every((d) => isDone(get(q, d)))));
    break;
  }
  case 'ms-done': { const q = load(); const m = (q.milestones || []).find((x) => x.id === process.argv[3]); if (!m) die('Unbekannter Meilenstein', 2); m.status = 'fertig'; m.note = process.argv[4] || ''; save(q); break; }
  case 'reap': { const q = load(); const r = reap(q, Number(arg('--ttl-min', 45))); save(q); out({ reaped: r }); break; }
  case 'lock': {
    const sub = process.argv[3]; const owner = process.argv[4] || `pid${process.pid}`;
    let cur = null; try { cur = JSON.parse(fs.readFileSync(LOCK, 'utf8')); } catch { /* keine Sperre */ }
    const fresh = cur && now() - cur.ts < LOCK_TTL_MS;
    if (sub === 'acquire') {
      if (fresh && cur.owner !== owner) die(`Sperre gehalten von ${cur.owner} seit ${Math.round((now() - cur.ts) / 60000)} min`, 3);
      fs.writeFileSync(LOCK, JSON.stringify({ owner, ts: now() })); out({ locked: true, owner });
    } else if (sub === 'heartbeat') {
      if (!cur || cur.owner !== owner) die('Sperre nicht gehalten', 3);
      cur.ts = now(); fs.writeFileSync(LOCK, JSON.stringify(cur));
    } else if (sub === 'release') {
      if (cur && cur.owner === owner) fs.rmSync(LOCK, { force: true });
    } else die('lock acquire|heartbeat|release', 2);
    break;
  }
  case 'stopped': process.exit(fs.existsSync(STOP) ? 0 : 1); break;
  default: die('Aufruf: queue.mjs status|summary|next|claim|heartbeat|done|block|defer|reopen|milestones|ms-done|reap|lock|stopped', 2);
}
