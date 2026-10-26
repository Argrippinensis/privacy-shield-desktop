const { app, BrowserWindow, ipcMain, dialog, Menu, shell, protocol, session, clipboard } = require('electron');
const path = require("path")
const os = require("os");
const { autoUpdater } = require('electron-updater');
const fs = require('fs');
const { Readable } = require('stream');

// Kommandozeilenmodus (E1.w): --cli schaltet den Stapelbetrieb ohne Oberflaeche ein. Die Argumente werden vor allem anderen gelesen.
const CLIARGS = require('./app/lib/cliargs.js');
const CLIPLAN = require('./app/lib/cliplan.js');
const CLI = CLIARGS.parse(process.argv);
const CLI_TMP_PREFIX = 'psc-run-';
let cliTmp = null; // eigener temporaerer userData-Ordner, damit eine laufende Oberflaeche nicht gestoert wird (keine Einzelinstanz-Sperre)
if (CLI.cli) {
  app.disableHardwareAcceleration();
  if (!CLI.errors.length) {
    try { cliTmp = fs.mkdtempSync(path.join(os.tmpdir(), CLI_TMP_PREFIX)); app.setPath('userData', cliTmp); } catch (e) { cliTmp = null; }
  }
}

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

// K4.fix: Start und Ende jedes Downloads dem Werkzeug melden (Zuordnung gilt erst nach bestaetigtem Schreiben als gespeichert).
// Der Speichern-Dialog kommt weiterhin von Electron; Abbruch oder Schreibfehler zeigen sich als Endzustand != completed.
function reportDownloads() {
  session.defaultSession.on('will-download', (event, item, wc) => {
    const url = item.getURL();
    const melden = (state) => {
      try {
        const frame = wc && !wc.isDestroyed() && wc.mainFrame.frames.find((f) => f.url.includes('privacy-shield.html'));
        if (frame) frame.executeJavaScript('typeof psDlEvent === "function" && psDlEvent(' + JSON.stringify(url) + ',' + JSON.stringify(state) + ')').catch(() => {});
      } catch (e) { /* Fenster weg: nichts zu melden */ }
    };
    melden('start');
    item.once('done', (ev, state) => melden(state));
  });
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

// Freigabe-Merker fuers Schliessen. Ausdrueckliches Beenden (app.quit, auch Cmd-Q) und Update-Installation
// werden nie vom Dialog blockiert; Cmd-Q umgeht die Warnung bewusst.
let closeFreigegeben = false;
app.on('before-quit', () => { closeFreigegeben = true; });

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
  closeFreigegeben = false;
  let closePruefung = false;
  // Herunterfahren (Windows) nie blockieren
  mainWindow.on('session-end', () => { closeFreigegeben = true; });
  mainWindow.on('close', (event) => {
    if (closeFreigegeben) return;
    event.preventDefault();
    if (closePruefung) return;
    closePruefung = true;
    const win = mainWindow;
    const schliessen = () => {
      closePruefung = false;
      closeFreigegeben = true;
      if (!win.isDestroyed()) win.close();
    };
    (async () => {
      let ungespeichert = false, unbekannt = false;
      try {
        const frame = win.webContents.mainFrame.frames.find((f) => f.url.includes('privacy-shield.html'));
        if (frame) {
          // Haengt der Frame, nach 2,5 s ist der Stand unbekannt: wie ungespeichert warnen (D30)
          const antwort = await Promise.race([
            frame.executeJavaScript('typeof psMapUnsaved === "function" && psMapUnsaved()'),
            new Promise((ok) => setTimeout(() => ok('unbekannt'), 2500))
          ]);
          ungespeichert = antwort === true;
          unbekannt = antwort === 'unbekannt';
        }
      } catch (e) { ungespeichert = false; }
      if (!ungespeichert && !unbekannt) return schliessen();
      try {
        const r = await dialog.showMessageBox(win, {
          type: 'warning',
          buttons: ['Abbrechen', 'Trotzdem schließen'],
          defaultId: 0,
          cancelId: 0,
          message: unbekannt
            ? 'Das Programm antwortet nicht; ob die Zuordnung gespeichert wurde, ist unklar. Später können Platzhalter evtl. nicht zurückübersetzt werden. Trotzdem schließen?'
            : 'Die Zuordnung wurde nicht gespeichert. Später können Platzhalter nicht zurückübersetzt werden. Trotzdem schließen?'
        });
        if (r.response === 1) return schliessen();
      } catch (e) { return schliessen(); }
      closePruefung = false;
    })();
  });

  mainWindow.webContents.on('did-finish-load', () => provideStartFiles());
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
  // Im Kommandozeilenmodus braucht die versteckte Seite keinen der normalen Kanaele (Dialoge, Updates, Zwischenablage)
  if (CLI.cli) throw new Error('not available in cli mode');
}

// Kanaele des Kommandozeilenmodus: nur im CLI-Modus registriert, nur fuer den Frame app://ps/cli.html des eigenen Fensters
let cliWin = null;
function assertCliSender(event) {
  const f = event && event.senderFrame;
  if (!(CLI.cli && cliWin && !cliWin.isDestroyed() && event.sender === cliWin.webContents && f && f.url === APP_ORIGIN + 'cli.html')) throw new Error('untrusted sender');
}

function invalidArg() { return new Error('invalid argument'); }

// Einzige Stelle, an der Kanaele registriert werden. opts.cli: Kanal des Kommandozeilenmodus (steht nicht in der Kanalliste der Oberflaeche).
function handle(channel, fn, opts) {
  const cli = !!(opts && opts.cli);
  const wrapped = (event, ...args) => { (cli ? assertCliSender : assertTrusted)(event); return fn(event, ...args); };
  if (!cli) handlers.set(channel, wrapped);
  ipcMain.handle(channel, wrapped);
}

// Nur fuer Tests: Kanaele direkt aufrufen (mit PS_TEST_HOOKS=1).
if (process.env.PS_TEST_HOOKS === '1') {
  globalThis.__psIpc = {
    get channels() { return [...handlers.keys()]; },
    invoke: (channel, fakeEvent, ...args) => handlers.get(channel)(fakeEvent, ...args)
  };
}

const SAVE_TYPES = { 'application/pdf': '.pdf', 'image/png': '.png', 'image/jpeg': '.jpg', 'text/plain': '.txt', 'application/json': '.json', 'application/zip': '.zip', 'text/csv': '.csv', 'application/x-privacyshield-psmap': '.psmap' };
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
    // K4.fix: Schreibfehler nie als Erfolg melden
    try { fs.writeFileSync(result.filePath, buffer); } catch (e) { return { success: false, error: String(e && e.code || 'write') }; }
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
  if (typeof version !== 'string' || !/^\d+\.\d+\.\d+(-[A-Za-z0-9.]+)?$/.test(version)) throw invalidArg();
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

// Info-Dialog: technische Angaben ohne Dokumentinhalte, Dateinamen und absolute Pfade.
const MODEL_FILE_RE = /^models\/(.+)\/onnx\/model_quantized\.onnx$/;
handle('get-app-info', () => {
  let model = null;
  try {
    const manifest = JSON.parse(fs.readFileSync(path.join(APP_ROOT, 'vendor-manifest.json'), 'utf8'));
    for (const f of manifest.files) {
      const mm = MODEL_FILE_RE.exec(f.path);
      if (mm && Number.isFinite(f.size)) { model = { id: mm[1], bytes: f.size }; break; }
    }
  } catch { model = null; }
  return {
    version: app.getVersion(),
    electron: String(process.versions.electron || ''),
    chrome: String(process.versions.chrome || ''),
    node: String(process.versions.node || ''),
    platform: process.platform,
    arch: process.arch,
    osRelease: os.release(),
    model
  };
});

// Lizenztexte: im gebauten Programm aus resourcesPath, im Quellbaum neben main.js; schreibgeschuetzt, hoechstens 1 MiB.
const MAX_LICENSE_BYTES = 1024 * 1024;
handle('get-licenses', () => {
  const file = path.join(app.isPackaged ? process.resourcesPath : __dirname, 'THIRD_PARTY_NOTICES.md');
  try {
    const fd = fs.openSync(file, 'r');
    try {
      const buf = Buffer.alloc(MAX_LICENSE_BYTES);
      const n = fs.readSync(fd, buf, 0, MAX_LICENSE_BYTES, 0);
      return buf.subarray(0, n).toString('utf8');
    } finally { fs.closeSync(fd); }
  } catch { return ''; }
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
      closeFreigegeben = true;
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

// ---------------------------------------------------------------------------
// Kommandozeilenmodus (E1.w): Stapel ohne Oberflaeche
//  - Hauptprozess liest Dateien, schreibt Ergebnisse, Bericht und verschluesselte Zuordnung (Passwort nie auf der Seite)
//  - eine versteckte Seite (app/cli.html) erkennt und anonymisiert mit denselben Modulen wie die Oberflaeche
//  - Ausgaben nur auf Standardausgabe/-fehler und in --log; nie Dateinamen, Pfade, Inhalte oder Passwoerter
//  - Rueckgabecodes: 0 Erfolg, 2 Argumente, 3 Eingabe, 4 Gegenpruefung, 5 KI nicht startbar, 6 sonstiger Fehler
// ---------------------------------------------------------------------------
let cliExiting = false;
let cliWatch = null;
const cliRun = { files: [], total: 0, next: 0, configSent: false, config: null, docs: new Map(), startedAt: 0, startedIso: '', password: null, policy: null, aiOk: false };

function cliWriteFd(fd, text) {
  const buf = Buffer.from(text, 'utf8');
  let off = 0, tries = 0;
  while (off < buf.length) {
    try { off += fs.writeSync(fd, buf, off); }
    catch (e) { if (e && e.code === 'EAGAIN' && tries++ < 5000) continue; return; } // kein Ausgabekanal (z. B. Fenster-Programm unter Windows): stillschweigend
  }
}

// Meldung auf Standardausgabe (oder -fehler) und in die Protokolldatei
function cliSay(line, err) {
  cliWriteFd(err ? 2 : 1, line + '\n');
  if (CLI.opts && CLI.opts.log) {
    try { fs.appendFileSync(CLI.opts.log, new Date().toISOString() + ' ' + line + '\n'); } catch (e) { /* Protokoll nicht schreibbar: Lauf nicht abbrechen */ }
  }
}

function cliExit(code) {
  if (cliExiting) return;
  cliExiting = true;
  clearTimeout(cliWatch);
  cliRun.password = null;
  try { if (cliWin && !cliWin.isDestroyed()) cliWin.destroy(); } catch (e) { /* schon weg */ }
  // Temporaeren userData-Ordner loeschen, nachdem Chromium die Seite abgebaut hat. Der Netzwerkdienst legt beim Beenden noch
  // ein paar KB an: ein kurzer Hilfsprozess (nur fuer diesen Ordner) raeumt nach dem Ende des Programms nach.
  setTimeout(() => {
    const dir = cliTmp;
    if (dir) {
      try { fs.rmSync(dir, { recursive: true, force: true, maxRetries: 3 }); } catch (e) { /* bleibt liegen: unkritisch */ }
      try {
        // Hilfsprozess mit minimaler Umgebung (keine Passwoerter u. a.). Der Ordnername wird relativ zum Temp-Ordner uebergeben (cwd),
        // damit unter Windows keine Anfuehrungszeichen in der cmd-Befehlszeile noetig sind; nur Namen, die mkdtemp erzeugt hat.
        const base = path.basename(dir);
        if (new RegExp('^' + CLI_TMP_PREFIX + '[A-Za-z0-9]+$').test(base)) {
          const cp = require('child_process');
          const parent = path.dirname(dir);
          const h = process.platform === 'win32'
            ? cp.spawn('cmd.exe', ['/d', '/s', '/c', 'ping -n 3 127.0.0.1 >nul & rmdir /s /q ' + base], {
              cwd: parent, detached: true, stdio: 'ignore', windowsHide: true, windowsVerbatimArguments: true,
              env: { SystemRoot: process.env.SystemRoot || 'C:\\Windows', ComSpec: process.env.ComSpec || 'C:\\Windows\\System32\\cmd.exe', PATH: (process.env.SystemRoot || 'C:\\Windows') + '\\System32' } })
            : cp.spawn('/bin/sh', ['-c', 'sleep 1; rm -rf -- "$1"', 'sh', base], { cwd: parent, detached: true, stdio: 'ignore', env: { PATH: '/usr/bin:/bin' } });
          h.on('error', () => {});
          h.unref();
        }
      } catch (e) { /* Reste raeumt der naechste Lauf nach einem Tag auf */ }
    }
    process.exit(code);
  }, 400);
}

function cliFail(code, msg) {
  if (cliExiting) return;
  cliSay(msg, true);
  cliExit(code);
}

// Ohne Lebenszeichen der Seite (Lesen, KI-Abschnitt, Ergebnis) bricht der Lauf nach 15 Minuten mit Code 6 ab
function cliTouch() {
  clearTimeout(cliWatch);
  cliWatch = setTimeout(() => cliFail(6, CLIPLAN.TEXT.runFail), 15 * 60 * 1000);
}

if (CLI.cli) {
  process.on('uncaughtException', () => cliFail(6, CLIPLAN.TEXT.unexpected));
  process.on('unhandledRejection', () => cliFail(6, CLIPLAN.TEXT.unexpected));
}

// Passwort: eine Zeile von der Standardeingabe
function cliReadStdinLine() {
  return new Promise((resolve) => {
    let buf = '', done = false;
    const fin = (v) => { if (done) return; done = true; try { process.stdin.pause(); } catch (e) { /* egal */ } resolve(v); };
    try {
      process.stdin.setEncoding('utf8');
      process.stdin.on('data', (d) => { buf += d; const i = buf.indexOf('\n'); if (i >= 0) fin(buf.slice(0, i).replace(/\r$/, '')); });
      process.stdin.on('end', () => fin(buf.replace(/\r?\n$/, '')));
      process.stdin.on('error', () => fin(''));
    } catch (e) { fin(''); }
  });
}

// Pfad mit aufgeloesten Verknuepfungen, auch wenn das Ziel noch nicht existiert (nächster vorhandener Ordner)
function cliRealish(p) {
  let cur = path.resolve(p);
  const rest = [];
  for (;;) {
    try { return path.join(fs.realpathSync.native(cur), ...rest.reverse()); }
    catch (e) {
      const up = path.dirname(cur);
      if (up === cur) return path.resolve(p);
      rest.push(path.basename(cur));
      cur = up;
    }
  }
}
function cliInside(child, parent) {
  const n = (x) => (process.platform === 'win32' || process.platform === 'darwin' ? x.toLowerCase() : x);
  const c = n(cliRealish(child)), pa = n(cliRealish(parent));
  return c === pa || c.startsWith(pa.endsWith(path.sep) ? pa : pa + path.sep);
}

// Eingabe einsammeln: Datei oder Ordner (mit --recursive auch Unterordner); Sortierung der relativen Pfade nach Codepunkten
function cliCollect(inPath, recursive) {
  let st;
  try { st = fs.statSync(inPath); } catch (e) { return { err: CLIPLAN.TEXT.inMissing }; }
  const files = [];
  let skipped = 0;
  if (st.isFile()) {
    const base = path.basename(inPath);
    if (!CLIPLAN.supportedName(base)) return { err: CLIPLAN.TEXT.inNone };
    files.push({ abs: path.resolve(inPath), rel: base, size: st.size, noFollow: false });
    return { files, skipped, isDir: false };
  }
  if (!st.isDirectory()) return { err: CLIPLAN.TEXT.inMissing };
  const walk = (dir, prefix) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const abs = path.join(dir, e.name), rel = prefix ? prefix + '/' + e.name : e.name;
      // Verknuepfungen (Ordner wie Dateien) werden weder verfolgt noch gelesen: sie koennten aus dem Eingabeordner herauszeigen
      if (e.isSymbolicLink()) { skipped++; continue; }
      if (e.isDirectory()) { if (recursive && !CLIPLAN.ignoredName(e.name)) walk(abs, rel); continue; }
      if (!e.isFile()) continue;
      if (CLIPLAN.ignoredName(e.name) || !CLIPLAN.supportedName(e.name)) { skipped++; continue; }
      files.push({ abs, rel, size: fs.lstatSync(abs).size, noFollow: true });
    }
  };
  try { walk(inPath, ''); } catch (e) { return { err: CLIPLAN.TEXT.inMissing }; }
  files.sort((a, b) => CLIPLAN.compareCodepoints(a.rel, b.rel));
  if (!files.length) return { err: CLIPLAN.TEXT.inNone };
  return { files, skipped, isDir: true };
}

// Modell gefordert: Datei da und laut Manifest vollstaendig (ohne Pruefsumme; ein beschaedigtes Modell scheitert beim Start, ebenfalls Code 5)
async function cliModelOk() {
  const rel = path.join('models', ...CLIPLAN.MODEL_ID.split('/'), 'onnx', 'model_quantized.onnx');
  try { if (!fs.statSync(path.join(APP_ROOT, rel)).isFile()) return false; } catch (e) { return false; }
  const c = await checkAssets(false);
  return !c.missing.concat(c.wrongSize.map((x) => x.path)).some((p) => p.startsWith('models/'));
}

function cliIsObj(v) { return v !== null && typeof v === 'object' && !Array.isArray(v); }
const cliInt = (v, max) => Number.isInteger(v) && v >= 0 && v <= max;

// Ausgabeziele (--out, --map, --log) duerfen nicht die Eingabe sein und nicht im Eingabeordner liegen;
// bei einer Einzeldatei gilt ihr Ordner als Eingabeordner.
function cliTargetInInput(target, inPath) {
  if (typeof target !== 'string' || typeof inPath !== 'string') return false;
  let st;
  try { st = fs.statSync(inPath); } catch (e) { return false; }
  const root = st.isDirectory() ? inPath : path.dirname(path.resolve(inPath));
  return cliInside(target, root) || cliInside(target, inPath);
}

async function cliMain() {
  const o = CLI.opts;
  // Protokoll im Eingabeordner oder gleich der Eingabedatei: nie dorthin schreiben (auch nicht die Fehlermeldung); Code 3 folgt unten
  const logBad = !!o.log && cliTargetInInput(o.log, o.in);
  if (logBad) o.log = undefined;
  if (o.log) { try { fs.mkdirSync(path.dirname(path.resolve(o.log)), { recursive: true }); } catch (e) { /* siehe cliSay */ } }
  if (CLI.errors.length) {
    for (const m of CLI.errors) cliSay(m, true);
    cliSay(CLIPLAN.TEXT.hintDocs, true);
    return cliExit(2);
  }
  if (!cliTmp) return cliFail(6, CLIPLAN.TEXT.unexpected);
  // Chromium schreibt beim Beenden noch kleine Dateien in userData; Reste frueherer Laeufe (aelter als ein Tag) aufraeumen.
  // Je Eintrag eigener Versuch; nur echte Ordner (keine Verknuepfungen, keine Dateien) mit unserem Praefix.
  let leftovers = [];
  try { leftovers = fs.readdirSync(os.tmpdir()); } catch (e) { /* Aufraeumen ist Nebensache */ }
  for (const e of leftovers) {
    if (!e.startsWith(CLI_TMP_PREFIX)) continue;
    try {
      const d = path.join(os.tmpdir(), e);
      if (d === cliTmp) continue;
      const st = fs.lstatSync(d);
      if (st.isDirectory() && Date.now() - st.mtimeMs > 24 * 3600 * 1000) fs.rmSync(d, { recursive: true, force: true });
    } catch (err) { /* dieser Eintrag nicht; die anderen weiter */ }
  }
  protocol.handle('app', appResponse);
  lockDownNetwork();
  restrictPermissions();
  cliTouch();
  cliRun.startedAt = Date.now();
  cliRun.startedIso = new Date(cliRun.startedAt).toISOString();

  // Eingabe, Ausgabeort, Richtlinie
  const col = cliCollect(o.in, o.recursive);
  if (col.err) return cliFail(3, col.err);
  if (col.files.length > CLIPLAN.MAX_DOCS) return cliFail(3, CLIPLAN.TEXT.inTooMany);
  for (let i = 0; i < col.files.length; i++) {
    const f = col.files[i];
    if (f.size === 0) return cliFail(3, CLIPLAN.readMessage('EMPTY', i + 1, col.files.length));
    if (f.size > CLIPLAN.MAX_FILE_BYTES) return cliFail(3, CLIPLAN.readMessage('TOO_LARGE_FILE', i + 1, col.files.length));
  }
  if (logBad) return cliFail(3, CLIPLAN.TEXT.logInside);
  if (cliTargetInInput(o.out, o.in)) return cliFail(3, CLIPLAN.TEXT.outInside);
  if (o.map && cliTargetInInput(o.map, o.in)) return cliFail(3, CLIPLAN.TEXT.mapInside);
  if (o.policy) {
    try {
      if (fs.statSync(o.policy).size > 1024 * 1024) throw new Error('size');
      const res = require('./app/lib/policy.js').parse(fs.readFileSync(o.policy, 'utf8'));
      if (!res.ok) { cliSay(CLIPLAN.TEXT.policyBad, true); res.errors.slice(0, 3).forEach((m) => cliSay(m, true)); return cliExit(3); }
      cliRun.policy = JSON.parse(JSON.stringify(res.policy));
    } catch (e) { return cliFail(3, CLIPLAN.TEXT.policyBad); }
  }

  // Passwort fuer die Zuordnung: Umgebungsvariable oder Standardeingabe, nie Argument
  if (o.map) {
    const envVal = o.passwordEnv !== undefined && Object.prototype.hasOwnProperty.call(process.env, o.passwordEnv) ? process.env[o.passwordEnv] : undefined;
    const pw = o.passwordEnv !== undefined ? (typeof envVal === 'string' ? envVal : '') : await cliReadStdinLine();
    if (!pw) return cliFail(2, o.passwordEnv !== undefined ? CLIPLAN.TEXT.pwEnvEmpty : CLIPLAN.TEXT.pwStdinEmpty);
    try { await require('./app/lib/psmap.js').encrypt({}, pw, { iterations: 1 }); } // prueft nur die Mindestlaenge
    catch (e) { return cliFail(2, (e && e.code === 'WEAK_PASSWORD' && e.message) || CLIPLAN.TEXT.unexpected); }
    cliRun.password = pw;
  }

  // KI gefordert (Standard): Modell muss vorhanden sein, kein stilles Zurueckfallen auf Wortlisten
  if (o.ai === 'auto' && !(await cliModelOk())) return cliFail(5, CLIPLAN.TEXT.aiMissing);

  // Testhaken: nur mit PS_TEST_HOOKS=1 schaltet PS_CLI_TEST_FIRST_PASS_OFF Regeln im Anonymisierungsdurchlauf aus (die Gegenpruefung behaelt sie)
  const hook = process.env.PS_TEST_HOOKS === '1' && /^[a-z,]{1,100}$/.test(process.env.PS_CLI_TEST_FIRST_PASS_OFF || '') ? process.env.PS_CLI_TEST_FIRST_PASS_OFF.split(',') : [];

  cliRun.files = col.files;
  cliRun.total = col.files.length;
  cliRun.skipped = col.skipped;
  cliRun.config = { profile: o.profile, ai: o.ai, policy: cliRun.policy, firstPassOff: hook, modelId: CLIPLAN.MODEL_ID };
  handle('cli-next-file', cliNextFile, { cli: true });
  handle('cli-result', cliOnResult, { cli: true });

  cliWin = new BrowserWindow({
    show: false, width: 800, height: 600,
    webPreferences: { preload: path.join(__dirname, 'preload.js'), nodeIntegration: false, contextIsolation: true, sandbox: true, backgroundThrottling: false }
  });
  cliWin.webContents.on('render-process-gone', () => cliFail(6, CLIPLAN.TEXT.unexpected));
  cliWin.webContents.on('did-fail-load', () => cliFail(6, CLIPLAN.TEXT.noDisplay));
  cliWin.loadURL(APP_ORIGIN + 'cli.html');
}

// cli-next-file: erster Aufruf liefert zusaetzlich die Einstellungen; danach je Aufruf die naechste Datei (Bytes), am Ende file: null
async function cliNextFile() {
  cliTouch();
  const r = { total: cliRun.total };
  if (!cliRun.configSent) { r.config = cliRun.config; cliRun.configSent = true; }
  if (cliRun.next >= cliRun.files.length) { r.file = null; return r; }
  const f = cliRun.files[cliRun.next];
  let data;
  try {
    // Dateien aus einem Ordner nie ueber eine Verknuepfung oeffnen (auch nicht, wenn sie erst nach dem Einsammeln ersetzt wurde)
    const fh = await fs.promises.open(f.abs, fs.constants.O_RDONLY | (f.noFollow ? (fs.constants.O_NOFOLLOW || 0) : 0));
    try { data = await fh.readFile(); } finally { await fh.close(); }
  } catch (e) { data = null; }
  if (!data) { cliFail(3, CLIPLAN.readMessage('READ', cliRun.next + 1, cliRun.total)); return r; }
  if (data.length > CLIPLAN.MAX_FILE_BYTES) { cliFail(3, CLIPLAN.readMessage('TOO_LARGE_FILE', cliRun.next + 1, cliRun.total)); return r; }
  cliRun.next++;
  r.file = { index: cliRun.next, name: path.basename(f.abs), data: new Uint8Array(data.buffer, data.byteOffset, data.length) };
  return r;
}

// cli-result: Nachrichten der Seite; Form wird streng geprueft
function cliOnResult(event, m) {
  cliTouch();
  if (!cliIsObj(m) || typeof m.type !== 'string') throw invalidArg();
  const total = cliRun.total;
  switch (m.type) {
    case 'beat': return { ok: true };
    case 'read-error':
      if (!cliInt(m.index, total) || typeof m.code !== 'string' || m.code.length > 20) throw invalidArg();
      cliFail(3, CLIPLAN.readMessage(m.code, m.index, total));
      return { ok: true };
    case 'ai-error': cliFail(5, CLIPLAN.TEXT.aiStart); return { ok: true };
    case 'fail': cliFail(6, CLIPLAN.TEXT.runFail); return { ok: true };
    case 'doc': {
      const l = m.leak;
      if (!cliInt(m.index, total) || m.index < 1 || typeof m.text !== 'string' || !cliIsObj(l) || !cliInt(l.count, 1e6) || !cliInt(l.hoch, 1e6) || !cliInt(l.mittel, 1e6) ||
        !cliInt(m.srcChars, 2e9) || typeof m.srcSha256 !== 'string' || !/^[0-9a-f]{64}$/.test(m.srcSha256)) throw invalidArg();
      cliRun.docs.set(m.index, { text: m.text, leak: { count: l.count, hoch: l.hoch, mittel: l.mittel }, srcChars: m.srcChars, srcSha256: m.srcSha256 });
      if (!CLI.opts.quiet) cliSay(CLIPLAN.progressLine(cliRun.docs.size, total));
      return { ok: true };
    }
    case 'done':
      cliFinish(m).catch(() => cliFail(6, CLIPLAN.TEXT.unexpected));
      return { ok: true };
    default: throw invalidArg();
  }
}

// Alles liegt vor: Bericht und Zuordnung bauen, erst dann schreiben (kein halbes Ergebnis bei Fehlern), Zusammenfassung, Rueckgabecode
async function cliFinish(m) {
  const o = CLI.opts, total = cliRun.total;
  const st = m.state;
  if (!cliIsObj(st) || !cliIsObj(st.store) || !cliIsObj(st.cnt) || cliRun.docs.size !== total) return cliFail(6, CLIPLAN.TEXT.runFail);
  for (const e of Object.values(st.store)) if (!cliIsObj(e) || typeof e.v !== 'string') return cliFail(6, CLIPLAN.TEXT.runFail);
  const state = { store: st.store, cnt: st.cnt };
  const docs = [];
  for (let i = 1; i <= total; i++) { const d = cliRun.docs.get(i); if (!d) return cliFail(6, CLIPLAN.TEXT.runFail); docs.push(d); }
  const sha = (t) => require('crypto').createHash('sha256').update(t, 'utf8').digest('hex');
  const documents = docs.map((d, i) => ({
    index: i + 1, chars: d.text.length, counts: CLIPLAN.counts(d.text, state.store), resultSha256: sha(d.text), leak: d.leak,
  }));
  const finds = documents.reduce((s, d) => s + Object.values(d.counts).reduce((a, b) => a + b, 0), 0);
  const leakFiles = docs.filter((d) => d.leak.count > 0).length;

  const files = new Map(); // Dateiname im Ausgabeordner -> Inhalt
  docs.forEach((d, i) => files.set('anonymisiert_' + String(i + 1).padStart(3, '0') + '.txt', d.text));
  if (o.report) {
    const REPORT = require('./app/lib/report.js');
    const input = {
      appVersion: app.getVersion(), startedAt: cliRun.startedIso, durationMs: Date.now() - cliRun.startedAt,
      profileId: o.profile, aiMode: o.ai, whitelistSize: 0,
      customRuleCount: cliRun.policy ? cliRun.policy.rules.filter((r) => r.enabled !== false).length : 0, documents,
    };
    const local = new Date().toLocaleString('de-DE');
    if (/^[0-9A-Za-z:., +\-()]{1,40}$/.test(local)) input.localTime = local;
    if (m.aiLoaded === true) input.modelId = CLIPLAN.MODEL_ID;
    const rep = REPORT.build(input);
    files.set('bericht.txt', REPORT.toText(rep));
    files.set('bericht.json', REPORT.toJson(rep));
  }
  let mapBytes = null;
  if (o.map) {
    const payload = {
      v: 1, created: new Date().toISOString(), state: CLIPLAN.scope(docs.map((d) => d.text), state),
      docs: docs.map((d, i) => ({ index: i + 1, name: cliRun.files[i].rel, chars: d.srcChars, sha256: d.srcSha256 })),
    };
    mapBytes = await require('./app/lib/psmap.js').encrypt(payload, cliRun.password);
  }
  try {
    fs.mkdirSync(o.out, { recursive: true });
    for (const [name, content] of files) fs.writeFileSync(path.join(o.out, name), content, 'utf8');
    if (mapBytes) {
      fs.mkdirSync(path.dirname(path.resolve(o.map)), { recursive: true });
      fs.writeFileSync(o.map, mapBytes);
    }
  } catch (e) { return cliFail(6, CLIPLAN.TEXT.writeFail); }

  if (cliRun.skipped && !o.quiet) cliSay('Hinweis: ' + CLIPLAN.plural(cliRun.skipped, 'Datei', 'Dateien') + ' ohne unterstützte Endung, versteckt oder verknüpft übersprungen.');
  cliSay(CLIPLAN.summaryLine(total, finds, leakFiles));
  if (o.failOnFindings && leakFiles > 0) { cliSay(CLIPLAN.TEXT.failOnFindings, true); return cliExit(4); }
  return cliExit(0);
}

// ---------------------------------------------------------------------------
// Oeffnen mit und Einzelinstanz (E2): Pfade bleiben im Hauptprozess, die Seite holt nur Name, Groesse und Bytes.
// ---------------------------------------------------------------------------
const OPEN_EXT = ['txt', 'pdf', 'docx', 'csv', 'md', 'json', 'rtf', 'xlsx', 'ods', 'odt', 'odp', 'pptx', 'eml', 'html', 'htm', 'doc', 'xls', 'ppt'];
const OPEN_MAX_BYTES = 30 * 1024 * 1024;
const OPEN_MAX_FILES = 50;
const OPEN_MAX_LIST = 500;                      // Obergrenze der vorgemerkten Dateien; weitere werden verworfen (Hinweis an die Seite)
const OPEN_BATCH_BYTES = 100 * 1024 * 1024;     // Rohdaten je Abruf von take-opened-files
let openedDropped = 0;    // verworfene Dateien seit dem letzten Abruf
let opened = [];          // wartende Dateien { path, name, size, ok }
let startFiles = [];      // Startdateien: nach jedem Neuladen der Huelle erneut bereitgestellt
const macOpenBuffer = []; // macOS open-file vor ready

// Merkt Dateien vor; Ordner und Unlesbares werden uebergangen. ok=false (Endung oder Groesse): die Seite zeigt nur die Meldung.
function queueOpened(paths, list) {
  if (!Array.isArray(paths)) return 0;
  let n = 0;
  for (const p of paths.slice(0, OPEN_MAX_FILES)) {
    if (typeof p !== 'string' || !p || p.length > 4096) continue;
    let st;
    try { st = fs.statSync(p); } catch (e) { continue; }
    if (!st.isFile()) continue;
    if (list.some((x) => x.path === p)) continue;
    if (list.length >= OPEN_MAX_LIST) { openedDropped++; continue; }
    const ext = path.extname(p).slice(1).toLowerCase();
    list.push({ path: p, name: path.basename(p), size: st.size, ok: OPEN_EXT.includes(ext) && st.size <= OPEN_MAX_BYTES });
    n++;
  }
  return n;
}

// Nach jedem (Neu-)Laden der Huelle: Startdateien erneut vormerken, damit ein Neuladen sie nicht verliert
function provideStartFiles() {
  for (const f of startFiles) if (!opened.some((x) => x.path === f.path)) opened.push({ ...f });
  if (opened.length) sendToWindow('files-opened');
}

if (!CLI.cli) {
  // Eigene Startargumente gegen das eigene Arbeitsverzeichnis aufloesen (die zweite Instanz bekommt sie absolut)
  const additional = { files: CLIARGS.fileArgs(process.argv, { appPath: app.getAppPath(), defaultApp: process.defaultApp }).slice(0, OPEN_MAX_FILES).map((f) => path.resolve(process.cwd(), f)) };
  if (!app.requestSingleInstanceLock(additional)) {
    app.quit();
  } else {
    app.on('second-instance', (event, argv, cwd, additionalData) => {
      // Relative Pfade gehoeren zum Arbeitsordner der zweiten Instanz, nicht zu dem der laufenden App
      if (typeof cwd !== 'string' || !path.isAbsolute(cwd)) cwd = process.cwd();
      const files = (additionalData && Array.isArray(additionalData.files) && additionalData.files.length <= OPEN_MAX_FILES
        && additionalData.files.every((f) => typeof f === 'string' && f.length <= 4096) ? additionalData.files : [])
        .map((f) => path.resolve(cwd, f)).filter((f) => path.isAbsolute(f));
      if (mainWindow && !mainWindow.isDestroyed()) {
        if (mainWindow.isMinimized()) mainWindow.restore();
        mainWindow.show();
        mainWindow.focus();
      }
      if (queueOpened(files, opened)) sendToWindow('files-opened');
    });
    app.on('open-file', (event, p) => {
      event.preventDefault();
      if (app.isReady()) { if (queueOpened([p], opened)) sendToWindow('files-opened'); }
      else if (macOpenBuffer.length < OPEN_MAX_LIST) macOpenBuffer.push(p);
    });
    queueOpened(additional.files, startFiles);
  }
}

handle('take-opened-files', async () => {
  const out = [];
  let raw = 0;
  while (opened.length && out.length < OPEN_MAX_FILES) {
    const f = opened[0];
    if (!f.ok) { opened.shift(); out.push({ name: f.name, size: f.size, data: null }); continue; }
    if (out.length && raw + f.size > OPEN_BATCH_BYTES) break; // Rest bleibt vorgemerkt
    opened.shift(); // vor dem Lesen entnehmen: ein gleichzeitiger Abruf sieht die Datei nicht doppelt
    const r = await readOpenedFile(f);
    if (r && r.buf && out.length && raw + r.buf.length > OPEN_BATCH_BYTES) { opened.unshift(f); break; } // Datei war inzwischen gewachsen
    if (!r) continue; // verschwunden: uebergehen
    if (!r.buf) { out.push({ name: f.name, size: r.size, data: null }); continue; }
    raw += r.buf.length;
    out.push({ name: f.name, size: r.size, data: r.buf.toString('base64') });
  }
  if (openedDropped) { out.push({ name: '', size: 0, data: null, dropped: openedDropped }); openedDropped = 0; }
  if (opened.length) setImmediate(() => sendToWindow('files-opened')); // Rest: die Seite ruft erneut ab
  return out;
});

// Liest eine vorgemerkte Datei ueber ein Handle: Typ und Groesse werden am Handle erneut geprueft (kein Wettlauf zwischen Pruefung und Lesen).
// Liefert { size, buf } (buf = null: zu gross), oder null (verschwunden, keine gewoehnliche Datei, unlesbar).
async function readOpenedFile(f) {
  let fh;
  try {
    fh = await fs.promises.open(f.path, fs.constants.O_RDONLY | (fs.constants.O_NONBLOCK || 0));
    const st = await fh.stat();
    if (!st.isFile()) return null;
    if (st.size > OPEN_MAX_BYTES) return { size: st.size, buf: null };
    const buf = Buffer.alloc(st.size);
    let off = 0;
    while (off < st.size) {
      const { bytesRead } = await fh.read(buf, off, st.size - off, off);
      if (!bytesRead) break;
      off += bytesRead;
    }
    return { size: st.size, buf: off === st.size ? buf : buf.subarray(0, off) };
  } catch (e) { return null; } finally { if (fh) await fh.close().catch(() => {}); }
}

app.whenReady().then(() => {
  if (CLI.cli) {
    cliMain().catch(() => cliFail(6, CLIPLAN.TEXT.unexpected));
    return;
  }
  if (!app.hasSingleInstanceLock()) return;
  queueOpened(macOpenBuffer.splice(0), startFiles);
  protocol.handle('app', appResponse);
  lockDownNetwork();
  restrictPermissions();
  reportDownloads();
  createWindow();
  setupAutoUpdater();
});

app.on('window-all-closed', () => {
  if (CLI.cli) return; // der Kommandozeilenmodus beendet sich selbst (cliExit)
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
