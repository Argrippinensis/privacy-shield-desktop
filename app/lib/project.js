// Projekt mit gemeinsamen Platzhaltern (B1.m): reines Modul ohne DOM. Der Erkennungskern wird als anonymize hineingereicht.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./placeholder.js'));
  else { root.PSLib = root.PSLib || {}; root.PSLib.project = factory(root.PSLib.placeholder); }
})(typeof self !== 'undefined' ? self : this, function (PH) {
  'use strict';
  const LIMITS = { docs: 200, totalChars: 209715200 };

  class PSProjectError extends Error {
    constructor(code) {
      super(code);
      this.name = 'PSProjectError';
      this.code = code;
    }
  }

  function create(opts) {
    const o = opts || {};
    return { shared: o.shared !== false, limits: Object.assign({}, LIMITS, o.limits), docs: [], nextId: 1 };
  }

  function add(p, doc) {
    if (!doc || typeof doc.text !== 'string' || typeof doc.name !== 'string') throw new PSProjectError('INVALID');
    const sum = p.docs.reduce((s, d) => s + d.text.length, 0);
    if (p.docs.length + 1 > p.limits.docs || sum + doc.text.length > p.limits.totalChars) throw new PSProjectError('LIMIT');
    const id = p.nextId++;
    p.docs.push({ id, name: doc.name, text: doc.text, status: 'wartet' });
    return id;
  }

  function remove(p, id) {
    const i = p.docs.findIndex((d) => d.id === id);
    if (i < 0) return false;
    p.docs.splice(i, 1);
    return true;
  }

  function index(p) {
    return p.docs.map((d, i) => ({ id: d.id, index: i + 1, name: d.name, chars: d.text.length, status: d.status }));
  }

  async function run(p, opts) {
    const o = opts || {};
    const docs = p.docs.slice();
    docs.forEach((d) => { d.status = 'wartet'; });
    const state = p.shared ? { store: {}, cnt: {} } : null;
    // K2.fix: woertliche Platzhalter aller Dokumente vorab reservieren (nur bei gemeinsamem state), damit kein Dokument
    // einen Platzhalter vergibt, der in einem anderen Dokument woertlich steht
    let reserved = null;
    if (p.shared) {
      const set = new Set();
      docs.forEach((d) => PH.find(d.text).forEach((h) => set.add(h.token)));
      if (set.size) reserved = Array.from(set);
    }
    const results = [];
    let aborted = false;
    for (let i = 0; i < docs.length; i++) {
      if (o.signal && o.signal.aborted) { aborted = true; break; }
      const d = docs[i];
      const st = p.shared ? state : { store: {}, cnt: {} };
      d.status = 'laeuft';
      const res = { id: d.id, index: i + 1, text: null, counts: null, status: 'fertig' };
      if (!p.shared) res.state = st;
      try {
        const r = await o.anonymize(d.text, reserved ? { state: st, profile: o.profile, reserved } : { state: st, profile: o.profile });
        res.text = r.text;
        res.counts = r.counts;
      } catch (err) {
        // nie Meldung oder Text, nur der Fehlername
        res.status = 'fehler';
        res.error = { kind: (err && err.name) || 'Error' };
      }
      d.status = res.status;
      results.push(res);
      if (o.onProgress) o.onProgress({ done: results.length, total: docs.length, id: d.id, index: i + 1, status: res.status });
    }
    return { results, state, aborted };
  }

  function zipPlan(results, opts) {
    const o = opts || {};
    const plan = [];
    for (const r of results) {
      if (r.status !== 'fertig') continue;
      const path = o.nameFor ? o.nameFor(r) : 'anonymisiert_' + String(r.index).padStart(3, '0') + '.txt';
      plan.push({ path, kind: 'result', id: r.id });
    }
    if (o.report) {
      plan.push({ path: 'bericht.txt', kind: 'report-text' });
      plan.push({ path: 'bericht.json', kind: 'report-json' });
    }
    if (o.map) plan.push({ path: 'zuordnung.psmap', kind: 'map' });
    // doppelte Pfade eindeutig machen: _2, _3 vor der Endung
    const used = new Set();
    for (const e of plan) {
      let path = e.path;
      const dot = path.lastIndexOf('.');
      const base = dot > 0 ? path.slice(0, dot) : path;
      const ext = dot > 0 ? path.slice(dot) : '';
      for (let n = 2; used.has(path); n++) path = base + '_' + n + ext;
      used.add(path);
      e.path = path;
    }
    return plan;
  }

  return { LIMITS, PSProjectError, create, add, remove, index, run, zipPlan };
});
