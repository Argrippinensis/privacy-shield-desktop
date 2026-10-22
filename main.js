const { app, BrowserWindow, ipcMain, dialog, Menu, shell, protocol, session, clipboard } = require('electron');
const path = require("path")
const os = require("os");
const { autoUpdater } = require('electron-updater');
const fs = require('fs');
const { Readable } = require('stream');

// Nur fuer Tests: Updater auch ohne gepacktes Programm ausfuehren (liest dev-app-update.yml).
if (process.env.PS_FORCE_DEV_UPDATE === '1') autoUpdater.forceDevUpdateConfig = true;

// Nur fuer Tests: Update-Quelle ist ein lokaler Mock-Server statt GitHub.
if (process.env.PS_UPDATE_FEED) autoUpdater.setFeedURL({ provider: 'generic', url: process.env.PS_UPDATE_FEED });

autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = false;

// Seite mit allen Installern; dorthin fuehrt der manuelle Update-Weg.
const DOWNLOAD_PAGE = 'https://arcangeli.eu/desktop/';

// Automatisches Installieren gibt es nur, wo es technisch funktioniert: Windows (NSIS), Linux-AppImage und ein
// signiertes macOS-Programm (package.json: "signedMac": true). Sonst wird nur auf die neue Version hingewiesen.
function canInstallUpdates() {
  if (process.env.PS_FORCE_MANUAL_UPDATE === '1') return false;
  if (process.platform === 'win32') return true;
  if (process.platform === 'linux') return !!process.env.APPIMAGE;
  if (process.platform === 'darwin') return require('./package.json').signedMac === true;
  return false;
}
const MANUAL_UPDATE = !canInstallUpdates();

// Release-Notes (Text oder Liste von { note }) als kurzer Klartext
function plainNotes(n) {
  if (!n) return '';
  const raw = Array.isArray(n) ? n.map((x) => (x && x.note) || '').join('\n') : String(n);
  return raw.replace(/<[^>]*>/g, '').trim().slice(0, 400);
}

let mainWindow;
// Nur ein vom Nutzer gestarteter Download darf den Fehler-Dialog ausloesen.
// Schlaegt die (automatische) Pruefung fehl, z. B. ohne Internet, laeuft die App ungestoert weiter.
let downloadActive = false;
let updateInfo = null;

function getUpdateStatePath() {
  return path.join(app.getPath('userData'), 'update-state.json');
}

function getUpdateState() {
  try {
    return JSON.parse(fs.readFileSync(getUpdateStatePath(), 'utf-8'));
  } catch {
    return { version: null, dismissCount: 0 };
  }
}

function saveUpdateState(state) {
  fs.writeFileSync(getUpdateStatePath(), JSON.stringify(state, null, 2), 'utf-8');
}


// ---------------------------------------------------------------------------
// Eigenes Protokoll app://ps/ statt file://
//  - Cross-Origin-Isolation (COOP/COEP): Voraussetzung fuer mehrere Rechenthreads der KI (SharedArrayBuffer)
//  - Strikte Content-Security-Policy: nach aussen geht aus der Seite nichts mehr (connect-src 'self')
//  - Modell und Bibliotheken kommen ausschliesslich aus der Installation (app/vendor, app/models)
// ---------------------------------------------------------------------------
protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true, stream: true } }
]);

const APP_ORIGIN = 'app://ps/';
const APP_ROOT = path.join(__dirname, 'app');
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.wasm': 'application/wasm',
  '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.gz': 'application/gzip',
  '.onnx': 'application/octet-stream', '.txt': 'text/plain; charset=utf-8'
};
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self' data: blob:",
  "worker-src 'self' blob:",
  "frame-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'none'"
].join('; ');

function appResponse(request) {
  const pathname = decodeURIComponent(new URL(request.url).pathname);
  const rel = pathname === '/' ? '/index.html' : pathname;
  const file = path.normalize(path.join(APP_ROOT, rel));
  const headers = {
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Cross-Origin-Embedder-Policy': 'require-corp',
    'Cross-Origin-Resource-Policy': 'same-origin',
    'Content-Security-Policy': CSP,
    'X-Content-Type-Options': 'nosniff'
  };
  if (!file.startsWith(APP_ROOT + path.sep)) return new Response('Forbidden', { status: 403, headers });
  let stat;
  try { stat = fs.statSync(file); } catch { stat = null; }
  if (!stat || !stat.isFile()) return new Response('Not found', { status: 404, headers });
  headers['Content-Type'] = MIME[path.extname(file).toLowerCase()] || 'application/octet-stream';
  headers['Content-Length'] = String(stat.size);
  return new Response(Readable.toWeb(fs.createReadStream(file)), { status: 200, headers });
}

// Blockierte Zugriffe der Seiten werden mitgezaehlt (Tests pruefen, dass die Liste leer bleibt).
globalThis.__psBlocked = [];

function lockDownNetwork() {
  // Die Seiten (Renderer) duerfen kein Netz nutzen. Der Updater laeuft im Hauptprozess und ist davon nicht betroffen.
  session.defaultSession.webRequest.onBeforeRequest(
    { urls: ['http://*/*', 'https://*/*', 'ws://*/*', 'wss://*/*', 'ftp://*/*'] },
    (details, callback) => {
      const fromPage = details.webContentsId != null;
      if (fromPage) globalThis.__psBlocked.push(details.url);
      callback({ cancel: fromPage });
    }
  );
}

// Berechtigungen: nur das Kopieren in die Zwischenablage; Kamera, Mikrofon, Standort usw. bleiben aus.
function restrictPermissions() {
  const ok = (permission) => permission === 'clipboard-sanitized-write';
  session.defaultSession.setPermissionRequestHandler((wc, permission, cb) => cb(ok(permission)));
  session.defaultSession.setPermissionCheckHandler((wc, permission) => ok(permission));
}

function sendToWindow(channel, ...args) {
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send(channel, ...args);
}

// Externe Links (Website, Impressum, Datenschutz) gehoeren in den System-Browser.
// Ohne diese Regel ersetzt ein Klick den Tool-Frame durch eine leere Seite.
// PS_BLOCK_EXTERNAL=1 (Tests): nichts oeffnen, nur in globalThis.__psExternal vermerken.
globalThis.__psExternal = [];
function openExternalSafe(url) {
  try {
    const u = new URL(url);
    if (u.protocol !== 'https:' && u.protocol !== 'mailto:') return;
    if (process.env.PS_BLOCK_EXTERNAL === '1') globalThis.__psExternal.push(u.toString());
    else shell.openExternal(u.toString());
  } catch { /* ungueltige URL ignorieren */ }
}

function isInternalUrl(url) {
  return url.startsWith(APP_ORIGIN);
}

app.on('web-contents-created', (event, contents) => {
  contents.setWindowOpenHandler(({ url }) => {
    openExternalSafe(url);
    return { action: 'deny' };
  });
  const guard = (e, url) => {
    if (!isInternalUrl(url)) {
      e.preventDefault();
      openExternalSafe(url);
    }
  };
  contents.on('will-navigate', guard);
  contents.on('will-frame-navigate', (e) => guard(e, e.url));
});

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    title: 'PrivacyShield',
    icon: path.join(__dirname, 'assets', 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true
    }
  });

  // Schliessen: bei ungespeicherter Zuordnung nachfragen
  let closeFreigegeben = false;
  // Ausdrueckliches Beenden (app.quit, Update-Installation) nicht blockieren
  app.once('before-quit', () => { closeFreigegeben = true; });
  let closePruefung = false;
  mainWindow.on('close', (event) => {
    if (closeFreigegeben) return;
    event.preventDefault();
    if (closePruefung) return;
    closePruefung = true;
    const win = mainWindow;
    const schliessen = () => {
      closeFreigegeben = true;
      if (!win.isDestroyed()) win.close();
    };
    (async () => {
      let ungespeichert = false;
      try {
        const frame = win.webContents.mainFrame.frames.find((f) => f.url.includes('privacy-shield.html'));
        if (frame) ungespeichert = (await frame.executeJavaScript('typeof psMapUnsaved === "function" && psMapUnsaved()')) === true;
      } catch (e) { ungespeichert = false; }
      if (!ungespeichert) return schliessen();
      try {
        const r = await dialog.showMessageBox(win, {
          type: 'warning',
          buttons: ['Abbrechen', 'Trotzdem schließen'],
          defaultId: 0,
          cancelId: 0,
          message: 'Die Zuordnung wurde nicht gespeichert. Später können Platzhalter nicht zurückübersetzt werden. Trotzdem schließen?'
        });
        if (r.response === 1) return schliessen();
      } catch (e) { return schliessen(); }
      closePruefung = false;
    })();
  });

  mainWindow.loadURL(APP_ORIGIN + 'index.html');
  Menu.setApplicationMenu(null);
}

// ---------------------------------------------------------------------------
// Bruecke: jeder Kanal prueft den Absender, Argumente werden validiert.
// ---------------------------------------------------------------------------
const handlers = new Map();

function assertTrusted(event) {
  const f = event && event.senderFrame;
  if (!(f && typeof f.url === 'string' && f.url.startsWith(APP_ORIGIN))) throw new Error('untrusted sender');
}

function invalidArg() { return new Error('invalid argument'); }

// Einzige Stelle, an der Kanaele registriert werden.
function handle(channel, fn) {
  const wrapped = (event, ...args) => { assertTrusted(event); return fn(event, ...args); };
  handlers.set(channel, wrapped);
  ipcMain.handle(channel, wrapped);
}

// Nur fuer Tests: Kanaele direkt aufrufen (mit PS_TEST_HOOKS=1).
if (process.env.PS_TEST_HOOKS === '1') {
  globalThis.__psIpc = {
    get channels() { return [...handlers.keys()]; },
    invoke: (channel, fakeEvent, ...args) => handlers.get(channel)(fakeEvent, ...args)
  };
}

const SAVE_TYPES = { 'application/pdf': '.pdf', 'image/png': '.png', 'image/jpeg': '.jpg', 'text/plain': '.txt', 'application/json': '.json' };
const MAX_SAVE_B64 = 200 * 1024 * 1024;

handle('save-file', async (event, opts) => {
  if (!opts || typeof opts !== 'object') throw invalidArg();
  const { defaultName, data, mimeType } = opts;
  if (defaultName !== undefined && (typeof defaultName !== 'string' || defaultName.length > 120 || /[\\/]/.test(defaultName))) throw invalidArg();
  if (typeof data !== 'string' || data.length > MAX_SAVE_B64) throw invalidArg();
  if (typeof mimeType !== 'string' || !Object.prototype.hasOwnProperty.call(SAVE_TYPES, mimeType)) throw invalidArg();
  const ext = SAVE_TYPES[mimeType];
  const result = await dialog.showSaveDialog(mainWindow, {
    defaultPath: defaultName || `document${ext}`,
    filters: [
      { name: ext.slice(1).toUpperCase() + '-Datei', extensions: [ext.slice(1)] }
    ]
  });
  if (!result.canceled && result.filePath) {
    const buffer = Buffer.from(data, 'base64');
    fs.writeFileSync(result.filePath, buffer);
    return { success: true, path: result.filePath };
  }
  return { success: false };
});

handle('open-file', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [
      { name: 'Dokumente & Bilder', extensions: ['pdf', 'jpg', 'jpeg', 'png', 'webp', 'gif', 'tiff'] }
    ]
  });
  if (!result.canceled && result.filePaths.length > 0) {
    const filePath = result.filePaths[0];
    const buffer = fs.readFileSync(filePath);
    const ext = path.extname(filePath).toLowerCase().replace('.', '');
    const mimeMap = { pdf: 'application/pdf', jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif', tiff: 'image/tiff' };
    return {
      name: path.basename(filePath),
      data: buffer.toString('base64'),
      mimeType: mimeMap[ext] || 'application/octet-stream'
    };
  }
  return null;
});

handle('get-app-version', () => app.getVersion());

// Speicher der gesamten App (Haupt-, Renderer-, GPU- und Hilfsprozesse) in MB.
// process.memoryUsage() misst nur den Hauptprozess und zeigte so fast nichts an (ca. 7 MB statt ueber 1 GB).
function getAppMemoryMB() {
  try {
    const kb = app.getAppMetrics().reduce((sum, p) => sum + ((p.memory && p.memory.workingSetSize) || 0), 0);
    return Math.round(kb / 1024);
  } catch {
    return Math.round(process.memoryUsage().rss / 1024 / 1024);
  }
}

handle("get-system-stats", () => {
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;
  const memPercent = Math.round((usedMem / totalMem) * 100);
  const appMem = getAppMemoryMB();
  const cpus = os.cpus();
  const cpuCount = cpus.length;
  const cpuModel = cpus[0].model.trim();
  return {
    ram: { total: Math.round(totalMem / 1024 / 1024 / 1024 * 10) / 10, used: Math.round(usedMem / 1024 / 1024 / 1024 * 10) / 10, percent: memPercent },
    cpu: { model: cpuModel, cores: cpuCount },
    app: { memory: appMem }
  };
});

handle('dismiss-update', (event, version) => {
  if (typeof version !== 'string' || !/^\d+\.\d+\.\d+$/.test(version)) throw invalidArg();
  const state = getUpdateState();
  if (state.version !== version) {
    state.version = version;
    state.dismissCount = 0;
  }
  state.dismissCount++;
  saveUpdateState(state);
  return { dismissCount: state.dismissCount };
});

// Kleine Textmengen in die Zwischenablage (Diagnose); Laenge begrenzt
handle('copy-text', (event, text) => {
  if (typeof text !== 'string' || text.length > 5000) throw invalidArg();
  clipboard.writeText(text);
});

// Prueft die mitgelieferten Dateien (Modell, Bibliotheken) gegen app/vendor-manifest.json.
// deep=true berechnet zusaetzlich die SHA-256 der Modelldateien (ca. 1 s fuer 135 MB).
async function checkAssets(deep) {
  let manifest;
  try { manifest = JSON.parse(fs.readFileSync(path.join(APP_ROOT, 'vendor-manifest.json'), 'utf8')); }
  catch { return { manifest: false, ok: true, missing: [], wrongSize: [], corrupt: [], appRoot: APP_ROOT }; }
  const missing = [], wrongSize = [], corrupt = [];
  for (const f of manifest.files) {
    let st;
    try { st = fs.statSync(path.join(APP_ROOT, f.path)); } catch { missing.push(f.path); continue; }
    if (st.size !== f.size) { wrongSize.push({ path: f.path, expected: f.size, actual: st.size }); continue; }
    if (deep && f.path.startsWith('models/') && f.sha256) {
      const h = require('crypto').createHash('sha256');
      await require('stream/promises').pipeline(fs.createReadStream(path.join(APP_ROOT, f.path)), h);
      if (h.digest('hex') !== f.sha256) corrupt.push(f.path);
    }
  }
  return { manifest: true, ok: !missing.length && !wrongSize.length && !corrupt.length, missing, wrongSize, corrupt, appRoot: APP_ROOT };
}
handle('check-assets', (event, deep) => {
  if (typeof deep !== 'boolean') throw invalidArg();
  return checkAssets(deep);
});

handle('get-update-mode', () => ({ manual: MANUAL_UPDATE }));

handle('open-download-page', () => {
  openExternalSafe(DOWNLOAD_PAGE);
});

handle('start-download', async () => {
  if (MANUAL_UPDATE) {
    openExternalSafe(DOWNLOAD_PAGE);
    return;
  }
  downloadActive = true;
  try {
    // Ohne vorherige erfolgreiche Pruefung (z. B. nach "Erneut versuchen") zuerst pruefen.
    if (!updateInfo) await autoUpdater.checkForUpdates();
    await autoUpdater.downloadUpdate();
  } catch (e) {
    downloadActive = false;
    sendToWindow('download-error');
  }
});

handle('check-for-updates', () => {
  return new Promise((resolve) => {
    let settled = false;
    const timeout = setTimeout(() => {
      if (!settled) {
        settled = true;
        cleanup();
        resolve({ updateAvailable: false, currentVersion: app.getVersion(), timeout: true });
      }
    }, 30000);

    const onUpdateAvailable = (info) => {
      if (!settled) {
        settled = true;
        clearTimeout(timeout);
        cleanup();
        resolve({ updateAvailable: true, version: info.version, currentVersion: app.getVersion(), manual: MANUAL_UPDATE });
      }
    };

    const onUpdateNotAvailable = (info) => {
      if (!settled) {
        settled = true;
        clearTimeout(timeout);
        cleanup();
        resolve({ updateAvailable: false, currentVersion: app.getVersion() });
      }
    };

    const onError = (err) => {
      if (!settled) {
        settled = true;
        clearTimeout(timeout);
        cleanup();
        resolve({ updateAvailable: false, currentVersion: app.getVersion(), error: err.message });
      }
    };

    const cleanup = () => {
      autoUpdater.removeListener('update-available', onUpdateAvailable);
      autoUpdater.removeListener('update-not-available', onUpdateNotAvailable);
      autoUpdater.removeListener('error', onError);
    };

    autoUpdater.once('update-available', onUpdateAvailable);
    autoUpdater.once('update-not-available', onUpdateNotAvailable);
    autoUpdater.once('error', onError);

    autoUpdater.checkForUpdates().catch((err) => {
      console.log('checkForUpdates threw:', err.message);
    });
  });
});

handle('quit-app', () => {
  app.quit();
});

function setupAutoUpdater() {
  setTimeout(() => {
    autoUpdater.checkForUpdates().catch(() => {});
  }, 5000);

  autoUpdater.on('update-available', (info) => {
    updateInfo = info;
    const state = getUpdateState();
    if (state.version !== info.version) {
      state.version = info.version;
      state.dismissCount = 0;
      saveUpdateState(state);
    }
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('update-available', {
        version: info.version,
        dismissCount: state.dismissCount,
        manual: MANUAL_UPDATE,
        notes: plainNotes(info.releaseNotes)
      });
    }
  });

  autoUpdater.on('download-progress', (progressObj) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('download-progress', Math.round(progressObj.percent));
    }
  });

  autoUpdater.on('update-downloaded', (info) => {
    downloadActive = false;
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('update-downloaded', info.version);
    }
    setTimeout(() => {
      autoUpdater.quitAndInstall(false, true);
    }, 2000);
  });

  autoUpdater.on('error', (err) => {
    console.log('Update-Fehler:', err.message);
    if (downloadActive) {
      downloadActive = false;
      sendToWindow('download-error');
    }
  });
}

app.whenReady().then(() => {
  protocol.handle('app', appResponse);
  lockDownNetwork();
  restrictPermissions();
  createWindow();
  setupAutoUpdater();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
