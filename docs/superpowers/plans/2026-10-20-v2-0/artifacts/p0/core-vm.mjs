// Wegwerf-Prototyp aus der Planhaertung P0: laedt den Erkennungskern aus app/privacy-shield.html (Zeilenbereiche von v1.8.0) in eine Node-vm ohne DOM.
// Ergebnis der Messung: fuer 212 von 212 Faellen (170 Harness-Faelle + 42 synthetische Dokumente) in W0, W1 und KI-Modus (mit aufgezeichneten Spans)
// identisch zur echten App (Text und JSON.stringify(store)). Dient F1.a als Nachschlagewerk; Zeilenbereiche gelten NUR fuer den Stand 1.8.0.
// Aufruf als Bibliothek:  import { anonymize, detectOnly, core } from './core-vm.mjs';   Umgebung: PS_HTML (Pfad der HTML), PS_REPO.
// Wegwerf-Harness: laedt den Erkennungskern aus app/privacy-shield.html in eine Node-vm (ohne DOM) und stellt anonymize() bereit.
import fs from 'fs'; import vm from 'vm';
const HTML = process.env.PS_HTML || ((process.env.PS_REPO || (process.env.HOME + '/projects/ps-v2')) + '/app/privacy-shield.html');
const lines = fs.readFileSync(HTML, 'utf8').split('\n');
const L = (a, b) => lines.slice(a - 1, b).join('\n');
// Bereiche (Zeilen, 1-basiert): Daten/Regeln/Profile 1997-3317; Zustand 3318-3322 (let store...); Wortlisten-Erkennung 3675-3976; Kern 4307-4783; Normalisierung/Token 4805-4809, 4848-4878
const code = [L(1997, 3317), 'let store = {}, cnt = {}, cvars = [], curProf = "standard", whitelist = [];', L(3416, 3418), 'let aiCache = { key: null, spans: [] };', L(3675, 3976), L(4307, 4783), L(4805, 4809), L(4848, 4878),
`globalThis.__core = { ENTS, PROFILES, applyProfile, collectEntities, normalizeForDetection, tok, get store(){return store}, set store(v){store=v}, get cnt(){return cnt}, set cnt(v){cnt=v}, get whitelist(){return whitelist}, set whitelist(v){whitelist=v}, set cvars(v){cvars=v}, get aiCache(){return aiCache}, set aiCache(v){aiCache=v}, set localAIMode(v){localAIMode=v}, get localAIMode(){return localAIMode} };`].join('\n');
const ctx = vm.createContext({ console, setTimeout, clearTimeout });
vm.runInContext(code, ctx, { filename: 'core.js' });
const C = ctx.__core;
export function anonymize(text, { profile = 'standard', wordlists = false, aiSpans = null, whitelist = [] } = {}) {
  C.applyProfile(C.PROFILES.find((p) => p.id === profile) || C.PROFILES[0]);
  C.store = {}; C.cnt = {}; C.whitelist = whitelist; C.localAIMode = wordlists;
  const det = C.normalizeForDetection(text);
  C.aiCache = aiSpans ? { key: det, spans: aiSpans } : { key: null, spans: [] };
  const spans = C.collectEntities(det);
  spans.forEach((sp) => (sp.val = text.slice(sp.start, sp.end)));
  const parts = []; let tail = text.length;
  for (let i = spans.length - 1; i >= 0; i--) { const s = spans[i]; parts.push(text.slice(s.end, tail), C.tok(s.val, s.pfx, s.col, s.meth)); tail = s.start; }
  parts.push(text.slice(0, tail));
  return { text: parts.reverse().join(''), store: JSON.parse(JSON.stringify(C.store)), spans };
}
export function detectOnly(text, { profile = 'standard', wordlists = false, whitelist = [] } = {}) {
  C.applyProfile(C.PROFILES.find((p) => p.id === profile) || C.PROFILES[0]); C.whitelist = whitelist; C.localAIMode = wordlists; C.aiCache = { key: null, spans: [] };
  return C.collectEntities(C.normalizeForDetection(text));
}
export const core = C;
