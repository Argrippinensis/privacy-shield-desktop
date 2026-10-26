// Kommandozeilenmodus (PSLib.cliplan): Dateiauswahl, Texte, Zaehler und Zuordnungsumfang, rein (kein DOM, kein Dateizugriff).
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else { root.PSLib = root.PSLib || {}; root.PSLib.cliplan = factory(); }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  // Endungen wie in der Oberflaeche (Projektliste); alte Formate (doc, xls, ppt) sind dabei, damit sie gemeldet statt still uebergangen werden
  const EXTENSIONS = ['txt', 'pdf', 'docx', 'csv', 'md', 'json', 'rtf', 'xlsx', 'ods', 'odt', 'odp', 'pptx', 'eml', 'html', 'htm', 'doc', 'xls', 'ppt'];
  const MAX_FILE_BYTES = 30 * 1024 * 1024;
  const MAX_DOCS = 200;
  const MODEL_ID = 'Xenova/distilbert-base-multilingual-cased-ner-hrl';

  // Feste Meldungen; nie Dateinamen, Pfade oder Inhalte
  const TEXT = {
    inMissing: 'Die Eingabe (Datei oder Ordner) wurde nicht gefunden oder ist nicht lesbar.',
    inNone: 'Die Eingabe enthält kein unterstütztes Dokument.',
    inTooMany: 'Zu viele Dokumente: höchstens ' + MAX_DOCS + ' je Lauf.',
    outInside: 'Der Ausgabeordner (--out) darf nicht die Eingabedatei sein und nicht im Eingabeordner liegen (bei einer Einzeldatei: nicht in deren Ordner).',
    mapInside: 'Die Zuordnung (--map) darf nicht die Eingabedatei sein und nicht im Eingabeordner liegen.',
    logInside: 'Das Protokoll (--log) darf nicht die Eingabedatei sein und nicht im Eingabeordner liegen.',
    policyBad: 'Die Richtliniendatei (--policy) ist ungültig oder nicht lesbar.',
    pwEnvEmpty: 'Die Umgebungsvariable für das Passwort ist nicht gesetzt oder leer.',
    pwStdinEmpty: 'Von der Standardeingabe wurde kein Passwort gelesen.',
    aiMissing: 'Die KI-Erkennung ist gefordert, aber das Modell fehlt oder ist beschädigt. Mit --ai off lässt sich ohne KI arbeiten (nur Regeln und Wortlisten).',
    aiStart: 'Die KI-Erkennung ist gefordert, aber das Modell lässt sich nicht starten. Mit --ai off lässt sich ohne KI arbeiten (nur Regeln und Wortlisten).',
    leakFail: 'Die Gegenprüfung war nicht möglich.',
    runFail: 'Die Verarbeitung ist fehlgeschlagen.',
    writeFail: 'Die Ausgabe konnte nicht geschrieben werden.',
    unexpected: 'Unerwarteter Fehler.',
    noDisplay: 'Die Oberfläche konnte nicht gestartet werden.',
    hintDocs: 'Hilfe: docs/kommandozeile.md',
    failOnFindings: 'Rückgabecode 4: --fail-on-findings ist gesetzt und die Gegenprüfung meldet mögliche Reste.',
  };
  // Lesefehler je Datei (Codes der Seite); die Nummer der Datei kommt davor
  const READ = {
    OLD_FORMAT: 'Dateien im alten .doc-, .xls- oder .ppt-Format werden nicht unterstützt. Bitte als .docx, .xlsx oder .pptx speichern.',
    UNKNOWN: 'Dateityp nicht erkannt oder Datei beschädigt.',
    CORRUPT: 'Dateityp nicht erkannt oder Datei beschädigt.',
    TOO_BIG: 'Archiv zu groß.',
    TOO_MANY: 'Archiv hat zu viele Einträge.',
    RATIO: 'Archiv ist verdächtig stark komprimiert.',
    NO_TEXT: 'Kein Text gefunden.',
    SCAN: 'Das PDF enthält kaum auslesbaren Text (vermutlich gescannt). Die Texterkennung (OCR) gibt es im Kommandozeilenmodus nicht; bitte in der Oberfläche verarbeiten.',
    LIMIT: 'Grenze erreicht: höchstens ' + MAX_DOCS + ' Dokumente je Lauf.',
    LIMIT_CHARS: 'Grenze erreicht: höchstens 200 Millionen Zeichen Text je Lauf (alle Dokumente zusammen).',
    READ: 'Die Datei konnte nicht gelesen werden.',
    TOO_LARGE_FILE: 'Datei zu groß (höchstens 30 MB).',
    EMPTY: 'Die Datei ist leer (0 Bytes). Liegt sie nur online in OneDrive oder SharePoint? Bitte zuerst auf dem Gerät speichern.',
  };
  function readMessage(code, index, total) {
    const m = Object.prototype.hasOwnProperty.call(READ, code) ? READ[code] : READ.CORRUPT;
    return 'Datei ' + index + ' von ' + total + ': ' + m;
  }

  function supportedName(name) {
    const n = String(name);
    const dot = n.lastIndexOf('.');
    return dot > 0 && EXTENSIONS.includes(n.slice(dot + 1).toLowerCase());
  }
  // Sperrdateien von Office ("~$...") und versteckte Dateien gehören nicht zum Stapel
  function ignoredName(name) {
    const n = String(name);
    return n[0] === '.' || n.slice(0, 2) === '~$';
  }

  // Vergleich nach Codepunkten (nicht nach UTF-16-Einheiten und nicht nach Sprachregeln)
  function compareCodepoints(a, b) {
    let i = 0, j = 0;
    while (i < a.length && j < b.length) {
      const x = a.codePointAt(i), y = b.codePointAt(j);
      if (x !== y) return x < y ? -1 : 1;
      i += x > 0xffff ? 2 : 1;
      j += y > 0xffff ? 2 : 1;
    }
    return i < a.length ? 1 : j < b.length ? -1 : 0;
  }

  const TOKEN = /\{\{[^{}]+\}\}/g;
  // Zaehler je Typ aus den Platzhaltern eines Ergebnistextes (wie die Oberflaeche); woertliche Platzhalter zaehlen nicht
  function counts(text, store) {
    const c = {};
    for (const k of String(text).match(TOKEN) || []) {
      if (Object.hasOwn(store, k) && store[k].m === 'wortlich') continue;
      let t = Object.hasOwn(store, k) && store[k].t ? String(store[k].t).toUpperCase().replace(/[^A-Z0-9_]/g, '_').slice(0, 20) : '';
      if (!/^[A-Z][A-Z0-9_]{1,19}$/.test(t)) t = 'SONSTIGE';
      c[t] = (c[t] || 0) + 1;
    }
    return c;
  }
  // Zuordnung nur fuer Platzhalter, die in den Ergebnissen vorkommen
  function scope(texts, state) {
    const keys = new Set(), out = {}, oc = {};
    for (const t of texts) for (const k of String(t).match(TOKEN) || []) keys.add(k);
    keys.forEach((k) => { if (Object.hasOwn(state.store, k)) out[k] = state.store[k]; });
    const types = new Set(Object.values(out).map((d) => d.t));
    Object.keys(state.cnt).forEach((t) => { if (types.has(t)) oc[t] = state.cnt[t]; });
    return { store: out, cnt: oc };
  }

  function plural(n, one, many) { return n + ' ' + (n === 1 ? one : many); }
  function progressLine(done, total) { return 'Datei ' + done + ' von ' + total + ' verarbeitet'; }
  function summaryLine(files, finds, leakFiles) {
    return plural(files, 'Datei', 'Dateien') + ', ' + plural(finds, 'Fund', 'Funde') + ', Gegenprüfung: ' +
      (leakFiles === 0 ? 'keine Auffälligkeiten' : plural(leakFiles, 'Datei', 'Dateien') + ' mit möglichen Resten');
  }

  return { EXTENSIONS, MAX_FILE_BYTES, MAX_DOCS, MODEL_ID, TEXT, READ, readMessage, supportedName, ignoredName,
    compareCodepoints, counts, scope, progressLine, summaryLine, plural };
});
