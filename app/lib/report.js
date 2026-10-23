// PSLib.report (A2.m): Anonymisierungsbericht, rein (kein DOM, keine Uhr), ohne personenbezogene Werte
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else { root.PSLib = root.PSLib || {}; root.PSLib.report = factory(); }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  class PSReportError extends Error {
    constructor(field) {
      super('Ungültiges Feld: ' + field);
      this.name = 'PSReportError';
      this.code = 'INVALID_INPUT';
      this.field = field;
    }
  }

  const bad = (f) => { throw new PSReportError(f); };
  const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
  function str(v, re, f) { if (typeof v !== 'string' || !re.test(v)) bad(f); return v; }
  function int(v, max, f) { if (!Number.isInteger(v) || v < 0 || v > max) bad(f); return v; }

  function build(input) {
    if (!isObj(input)) bad('input');
    const r = {
      format: 'privacyshield-report/1',
      program: 'PrivacyShield',
      appVersion: str(input.appVersion, /^\d+\.\d+\.\d+(-[A-Za-z0-9.]+)?$/, 'appVersion'),
      startedAt: str(input.startedAt, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z$/, 'startedAt'),
    };
    if (input.localTime !== undefined) r.localTime = str(input.localTime, /^[0-9A-Za-z:., +\-()]{1,40}$/, 'localTime');
    r.durationMs = int(input.durationMs, 86400000, 'durationMs');
    r.profileId = str(input.profileId, /^[a-z][a-z0-9_]{0,19}$/, 'profileId');
    if (input.aiMode !== 'auto' && input.aiMode !== 'off') bad('aiMode');
    r.aiMode = input.aiMode;
    if (input.modelId !== undefined) r.modelId = str(input.modelId, /^[A-Za-z0-9._/\-]{1,80}$/, 'modelId');
    r.whitelistSize = int(input.whitelistSize, 100000, 'whitelistSize');
    r.customRuleCount = int(input.customRuleCount, 100000, 'customRuleCount');
    if (!Array.isArray(input.documents) || input.documents.length < 1 || input.documents.length > 200) bad('documents');
    const totals = { documents: 0, chars: 0, entities: 0 };
    r.documents = input.documents.map((d, i) => {
      const p = 'documents[' + i + ']';
      if (!isObj(d)) bad(p);
      const out = { index: int(d.index, 100000, p + '.index'), chars: int(d.chars, 2000000000, p + '.chars') };
      if (!isObj(d.counts)) bad(p + '.counts');
      const keys = Object.keys(d.counts);
      if (keys.length > 50) bad(p + '.counts');
      out.counts = {};
      keys.sort().forEach((k) => {
        if (!/^[A-Z][A-Z0-9_]{1,19}$/.test(k)) bad(p + '.counts.' + k);
        out.counts[k] = int(d.counts[k], 1000000000, p + '.counts.' + k);
        totals.entities += out.counts[k];
      });
      out.resultSha256 = str(d.resultSha256, /^[0-9a-f]{64}$/, p + '.resultSha256');
      if (!isObj(d.leak)) bad(p + '.leak');
      out.leak = {
        count: int(d.leak.count, 1000000, p + '.leak.count'),
        hoch: int(d.leak.hoch, 1000000, p + '.leak.hoch'),
        mittel: int(d.leak.mittel, 1000000, p + '.leak.mittel'),
      };
      totals.documents++;
      totals.chars += out.chars;
      return out;
    });
    r.totals = totals;
    return r;
  }

  function toText(rep) {
    const L = ['PrivacyShield Anonymisierungsbericht',
      'Programm: PrivacyShield ' + rep.appVersion,
      'Zeitpunkt (UTC): ' + rep.startedAt];
    if (rep.localTime !== undefined) L.push('Zeitpunkt (lokal): ' + rep.localTime);
    L.push('Dauer: ' + rep.durationMs + ' ms', 'Profil: ' + rep.profileId, 'KI-Modus: ' + rep.aiMode);
    if (rep.modelId !== undefined) L.push('Modell: ' + rep.modelId);
    L.push('Freigaben (Whitelist): ' + rep.whitelistSize, 'Eigene Regeln: ' + rep.customRuleCount);
    for (const d of rep.documents) {
      const sum = Object.values(d.counts).reduce((a, b) => a + b, 0);
      L.push('', 'Dokument ' + d.index, '  Zeichen: ' + d.chars, '  Funde: ' + sum);
      for (const k of Object.keys(d.counts).sort()) L.push('    ' + k + ': ' + d.counts[k]);
      L.push(d.leak.count === 0 ? '  Gegenprüfung: keine Auffälligkeiten'
        : '  Gegenprüfung: ' + d.leak.count + ' mögliche Reste (hoch ' + d.leak.hoch + ', mittel ' + d.leak.mittel + ')');
      L.push('  SHA-256 des Ergebnistextes: ' + d.resultSha256);
    }
    L.push('', 'Gesamt: ' + rep.totals.documents + ' Dokument(e), ' + rep.totals.entities + ' Funde', '',
      'Dieser Bericht enthält keine personenbezogenen Daten der verarbeiteten Dokumente. Er ersetzt keine rechtliche Bewertung.');
    return L.join('\n') + '\n';
  }

  function toJson(rep) { return JSON.stringify(rep, null, 2); }

  return { build, toText, toJson, PSReportError };
});
