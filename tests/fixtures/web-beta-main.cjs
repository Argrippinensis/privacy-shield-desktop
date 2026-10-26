// Hilfs-Hauptprozess fuer tests/web-beta.test.mjs: simuliert einen Browser OHNE die Desktop-Bruecke (kein preload).
// Alle Anfragen werden protokolliert (globalThis.__psReq). Erlaubt ist nur der lokale Testserver; Anfragen an
// huggingface.co/hf.co werden protokolliert und abgebrochen (Modell nicht erreichbar), ausser PS_WEB_HF=pass.
// Alles andere wird blockiert und als Verstoss gezaehlt.
const { app, BrowserWindow, session } = require('electron');

const URL_ZIEL = process.env.PS_WEB_URL;
const HF_DURCHLASSEN = process.env.PS_WEB_HF === 'pass';
const istHF = (h) => h === 'huggingface.co' || h.endsWith('.huggingface.co') || h === 'hf.co' || h.endsWith('.hf.co');

globalThis.__psReq = [];

app.whenReady().then(() => {
  const filter = { urls: ['http://*/*', 'https://*/*', 'ws://*/*', 'wss://*/*', 'ftp://*/*'] };
  session.defaultSession.webRequest.onBeforeRequest(filter, (details, cb) => {
    let host = '';
    try { host = new URL(details.url).hostname; } catch (e) { host = ''; }
    const lokal = host === '127.0.0.1';
    const hf = istHF(host);
    globalThis.__psReq.push({ url: details.url, host, lokal, hf });
    cb({ cancel: !(lokal || (hf && HF_DURCHLASSEN)) });
  });
  const win = new BrowserWindow({ width: 1280, height: 800, show: true, webPreferences: { contextIsolation: true, nodeIntegration: false } });
  win.loadURL(URL_ZIEL);
});

app.on('window-all-closed', () => app.quit());
