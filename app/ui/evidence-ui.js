// GUI evidence: only the explicit fields in psEvidence may leave process memory.
let psRun = null, psImport = null, psProjectImportFailed = false, psHuman = false, psPreviewNode = null, psUsedAI = false, psRunFallback = null;
const psPrjImports = new Map();
function psInvalidate() { psRun = null; psHuman = false; if (psPreviewNode) { psPreviewNode.remove(); psPreviewNode = null; } }
function psSignature(configOnly = false) {
  return JSON.stringify([prj ? null : document.getElementById('IT').value, configOnly || prj ? null : document.getElementById('AT').value,
    curProf, activeEntIds(), cvars, whitelist, released, manualMarks, policy, aiMode(), localAIMode, [...lcIgnored],
    prj && prj.docs.map(d => [d.id, d.text, configOnly ? null : d.status]), configOnly ? null : [...prjRes], configOnly ? null : stateRev, psProjectImportFailed, psImport, [...psPrjImports]]);
}
function psCurrent() {
  const selected = prj && prj.docs.find(d => d.id === prjSel);
  const visibleMatches = !selected || (selected.text === document.getElementById('IT').value && prjRes.get(selected.id)?.text === document.getElementById('AT').value);
  const ok = visibleMatches && !!psRun && psRun.signature === psSignature() && !anonBusy && !prjBusy && !prjStale;
  if (!ok && psRun) psInvalidate(); return ok;
}
function psCapture() {
  if (prj && psProjectImportFailed) return;
  const docs = prj ? prj.docs : [{ id: null, text: document.getElementById('IT').value }];
  if (!docs.length || prj && (prjAborted || docs.some(d => d.status !== 'fertig' || !prjRes.has(d.id)))) return;
  const coverage = docs.map(d => {
    const imp = prj ? psPrjImports.get(d.id) : psImport;
    return imp && (prj || imp.text === d.text) ? imp : { complete: true, kind: 'Manuelle Texteingabe', pages: [], warnings: ['Umfang bezieht sich auf den eingegebenen Text.'] };
  });
  if (coverage.some(c => !c.complete)) return;
  const results = docs.map(d => prj ? prjRes.get(d.id).text : document.getElementById('AT').value);
  if (results.some(t => !t)) return;
  const checks = results.map(t => {
    const raw = leakScan(t), ignored = raw.findings.filter(f => lcIgnored.has(f.type + '\u0000' + t.slice(f.start, f.end))).length;
    return { mechanism: 'Regeln und Wortlisten ohne KI; keine Vollständigkeitsgarantie', remaining: raw.count - ignored, released: raw.whitelisted + ignored, error: !!raw.error };
  });
  if (checks.some(c => c.error)) return;
  psHuman = false;
  psRun = { id: crypto.randomUUID(), created: new Date().toISOString(), timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    requestedMode: aiMode(), fallbackCode: !psUsedAI && aiMode() !== "off" ? (psRunFallback?.code || "NOT_AVAILABLE") : null,
    profile: curProf, categories: activeEntIds().slice(), mode: psUsedAI ? 'Regeln, Wortlisten und NER-Modell' : 'Regeln und Wortlisten',
    modelId: psUsedAI ? AI_MODEL_ID : null, modelRevision: psUsedAI ? PS_BUILD.modelRevision : null,
    fallback: !psUsedAI && aiMode() !== 'off' ? (psRunFallback?.reason || 'Modell für diesen Lauf nicht verfügbar') : null,
    version: APP_VERSION, core: PS_BUILD.coreSha256,
    documents: results.map((text, i) => ({ text, index: i + 1, inputChars: docs[i].text.length, coverage: structuredClone(coverage[i]), counts: prjCounts(text), check: checks[i] })), signature: psSignature() };
}
async function psEvidence(run = psRun, confirmed = psHuman) {
  if (!psCurrent() || psRun !== run) throw Error('Ergebnis veraltet oder Import unvollständig. Bitte erneut verarbeiten.');
  const documents = [];
  for (const d of run.documents) documents.push({ index: d.index, inputChars: d.inputChars,
    import: { complete: d.coverage.complete, kind: d.coverage.kind, pages: d.coverage.pages.map(p => ({ index: p.index, method: p.method })), warnings: d.coverage.warnings.slice() },
    replacements: { ...d.counts }, check: { ...d.check },
    result: { encoding: 'UTF-8', format: 'Pseudonymisierter Ergebnistext, unverändert; kein BOM', sha256: await shaHex(d.text) } });
  if (!psCurrent() || psRun !== run) throw Error('Während der Ausgabe geändert. Bitte erneut verarbeiten.');
  return { schema: 1, id: run.id, created: run.created, timezone: run.timezone, clock: 'Zeitangabe dieses Geräts', product: 'PrivacyShield', version: run.version,
    coreSha256: run.core, operation: 'Pseudonymisierung', profile: run.profile, categories: run.categories.slice(), mode: run.mode,
    modelId: run.modelId, modelRevision: run.modelRevision, fallback: run.fallback, documentCount: documents.length,
    counting: 'Ersetzte Vorkommen je Kategorie im Ergebnis; wörtliche Originalplatzhalter ausgeschlossen', documents,
    humanReview: confirmed ? 'Sichtprüfung vom Nutzer bestätigt' : 'Menschliche Sichtprüfung: nicht bestätigt',
    notice: 'Dieser Nachweis dokumentiert den angegebenen lokalen Pseudonymisierungsschritt mit PrivacyShield. Er bestätigt weder die vollständige Entfernung aller personenbezogenen Informationen noch die DSGVO-Konformität weiterer Verarbeitungsschritte. Kein DSGVO-Zertifikat, externes Audit oder Echtheitsnachweis. SHA-256 ist eine Prüfsumme, keine digitale Signatur.' };
}
function psEvidenceText(e) {
  return ['Verarbeitungsnachweis', e.product + ' ' + e.version + ' · ' + e.operation,
    'Nachweis-ID: ' + e.id, 'Erstellt: ' + e.created + ' · ' + e.timezone + ' · ' + e.clock,
    'Kern SHA-256: ' + e.coreSha256, 'Profil: ' + e.profile, 'Kategorien: ' + e.categories.join(', '),
    'Erkennung: ' + e.mode, ...(e.modelId ? ['Modell: ' + e.modelId, 'Modellrevision: ' + e.modelRevision] : []),
    ...(e.fallback ? ['Fallback: ' + e.fallback] : []), 'Dokumente: ' + e.documentCount, e.counting,
    ...e.documents.flatMap(d => ['Dokument ' + d.index + ': ' + d.inputChars + ' Eingabezeichen · ' + d.import.kind + ' · Import vollständig',
      'Seiten: ' + (d.import.pages.map(p => p.index + ': ' + p.method).join('; ') || 'kein Seitenbezug'), ...d.import.warnings,
      'Ersetzungen: ' + JSON.stringify(d.replacements), 'Gegenprüfung: ' + d.check.mechanism,
      'Bekannte verbleibende Funde: ' + d.check.remaining + '; bewusst freigegeben/ignoriert: ' + d.check.released,
      'SHA-256 des Ergebnistextes (' + d.result.encoding + '): ' + d.result.sha256]), e.humanReview, e.notice].join('\n');
}
async function psPreview() {
  try {
    const run = psRun; psHuman = false;
    const e = await psEvidence(run, false), dlg = document.createElement('dialog'); psPreviewNode = dlg;
    dlg.style.cssText = 'max-width:800px;width:90%;max-height:90vh;overflow:auto;padding:24px';
    dlg.setAttribute('aria-label', 'Verarbeitungsnachweis – Vorschau');
    const title = document.createElement('h2'); title.textContent = 'Verarbeitungsnachweis – Vorschau';
    const pre = document.createElement('pre'); pre.style.cssText = 'white-space:pre-wrap;overflow-wrap:anywhere;font:12px/1.5 sans-serif'; pre.textContent = psEvidenceText(e);
    const label = document.createElement('label'), cb = document.createElement('input'); cb.type = 'checkbox';
    label.append(cb, ' Ich habe das Ergebnis und den Importumfang persönlich geprüft.');
    cb.onchange = async () => { psHuman = cb.checked; try { pre.textContent = psEvidenceText(await psEvidence(run)); } catch (err) { toast(err.message, 'e'); } };
    function button(text, action) { const b = document.createElement('button'); b.textContent = text; b.className = 'btn btn-ghost'; b.onclick = action; return b; }
    const print = button('Drucken / als PDF speichern', async () => {
      try {
        const evidence = await psEvidence(run);
        const frame = document.createElement('iframe'); frame.title = 'Druckansicht Verarbeitungsnachweis';
        frame.style.cssText = 'position:fixed;width:1px;height:1px;bottom:0'; document.body.append(frame);
        const doc = frame.contentDocument, style = doc.createElement('style'), content = doc.createElement('pre');
        style.textContent = '@page{size:A4;margin:16mm}pre{white-space:pre-wrap;overflow-wrap:anywhere;font:10pt/1.35 sans-serif;color:#000}';
        content.textContent = psEvidenceText(evidence); doc.head.append(style); doc.body.append(content);
        if (!psCurrent() || psRun !== run) { frame.remove(); throw Error('Ergebnis geändert'); }
        frame.contentWindow.print(); toast('Druckdialog geöffnet; Speicherung bitte selbst prüfen', 's');
        setTimeout(() => frame.remove(), 60000);
      } catch (err) { toast(err.message, 'e'); }
    });
    const json = button('JSON herunterladen', async () => { try { const evidence = await psEvidence(run); if (psCurrent() && psRun === run) { await psSaveRun('verarbeitungsnachweis.json', JSON.stringify(evidence, null, 2), 'application/json', run); } } catch (err) { toast(err.message, 'e'); } });
    dlg.append(title, pre, label, document.createElement('br'), print, json, button('Schließen', () => { dlg.remove(); psPreviewNode = null; }));
    document.body.append(dlg); dlg.showModal();
  } catch (err) { toast(err.message, 'e'); }
}
async function psCopy(text) {
  const api = window.parent.electronAPI;
  if (api && api.copyText) return api.copyText(text);
  if (navigator.clipboard) return navigator.clipboard.writeText(text);
  throw Error('Clipboard fehlt');
}
let psUnloadActive = false, psLeaving = false;
function psBeforeUnload(e) { e.preventDefault(); e.returnValue = ''; }
function psSyncProtection() {
  if (!window.parent.electronAPI || window.parent.electronAPI.platform !== "web") return;
  const unsaved = !psLeaving && psMapUnsaved();
  if (unsaved !== psUnloadActive) { for (const w of [window.parent]) w[unsaved ? 'addEventListener' : 'removeEventListener']('beforeunload', psBeforeUnload); psUnloadActive = unsaved; }
}
function psGuardNavigation(e) {
  if (!window.parent.electronAPI || window.parent.electronAPI.platform !== "web") return;
  const link = e.target.closest('a[href]');
  if (!link || link.hasAttribute('download') || link.getAttribute('href').startsWith('#') || !psMapUnsaved()) return;
  e.preventDefault();
  const dlg = document.createElement('dialog'), p = document.createElement('p'); dlg.setAttribute('aria-label', 'Ungesicherte Zuordnung');
  p.textContent = 'Ungesicherte Zuordnung: Ohne Datei können Platzhalter nicht zurückübersetzt werden. Ein gestarteter Download bestätigt keine Speicherung.'; dlg.append(p);
  for (const [label, action] of [['Bleiben', () => {}], ['Zuordnung herunterladen', () => psPwOpen('save')], ['Bewusst verlassen', () => { psLeaving = true; window.parent.removeEventListener('beforeunload', psBeforeUnload); window.removeEventListener('beforeunload', psBeforeUnload); window.parent.location.href = link.href; }]]) {
    const b = document.createElement('button'); b.textContent = label; b.className = 'btn btn-ghost'; b.onclick = () => { dlg.remove(); action(); }; dlg.append(b);
  }
  document.body.append(dlg); dlg.showModal();
}
window.addEventListener('DOMContentLoaded', () => {
  document.addEventListener('click', psGuardNavigation, true);
  if (window.parent !== window) window.parent.document.addEventListener('click', psGuardNavigation, true);
  document.getElementById('IT').addEventListener('input', () => {
    psImport = null; psInvalidate();
    if (prj && prjSel) { const d = prj.docs.find(d => d.id === prjSel); if (d) d.text = document.getElementById('IT').value; psPrjImports.delete(prjSel); prjMarkStale(); }
  });
  document.getElementById('AT').addEventListener('input', psInvalidate);
  const status = document.createElement('p'); status.id = 'ps-import-status'; status.setAttribute('role', 'status'); status.style.cssText = 'font-size:12px;line-height:1.5';
  document.getElementById('IT').before(status);
  setInterval(() => {
    const c = psImport;
    const text = 'Import: ' + (c ? (c.complete ? c.kind + ' vollständig gelesen' : 'unvollständig / fehlgeschlagen; Nachweis gesperrt') + (c.pages.length ? ' · ' + c.pages.map(p => p.index + ': ' + p.method).join('; ') : '') + ' · ' + c.warnings.join(' ') : 'manuelle Texteingabe; kein PDF-Seitenbezug') + ' · Maximal 20 Seiten mit OCR oder unklarem Inhalt je PDF. Erkennung und Lesereihenfolge selbst prüfen.';
    if (status.textContent !== text) status.textContent = text;
  }, 200);
  setInterval(() => { if (psRun && psRun.signature !== psSignature()) psInvalidate(); psSyncProtection(); }, 150);
});

async function psSaveRun(name, content, mime, run = psRun) {
  if (!psCurrent() || psRun !== run) throw Error('Ergebnis inzwischen geändert; Export gesperrt');
  const api = window.parent.electronAPI;
  if (!api || !api.saveFile || api.platform === 'web') {
    if (!psCurrent() || psRun !== run) return false;
    await dl(name, content, mime); toast('Download gestartet; Speicherung bitte prüfen', 's'); return true;
  }
  const bytes = typeof content === 'string' ? new TextEncoder().encode(content) : content;
  let binary = ''; for (let i = 0; i < bytes.length; i += 32768) binary += String.fromCharCode(...bytes.subarray(i, i + 32768));
  const saved = await api.saveFile({ defaultName: name, data: btoa(binary), mimeType: mime, runId: run.id });
  if (!saved.success) { toast(saved.error === 'stale' ? 'Ergebnis während Speicherdialog geändert; Export gesperrt' : 'Speichern abgebrochen oder fehlgeschlagen', 'e'); return false; }
  toast('Datei gespeichert', 's'); return true;
}
async function psSaveResult() { try { if (!psCurrent()) throw Error('Bitte erneut verarbeiten'); const d = psRun.documents.find(d => d.index === (prj ? prj.docs.findIndex(d => d.id === prjSel) + 1 : 1)); if (!d) throw Error('Dokument auswählen'); await psSaveRun('pseudonymisiertes-ergebnis.txt', d.text, 'text/plain'); } catch (err) { toast(err.message, 'e'); } }
