const { app, BrowserWindow, ipcMain, dialog, Menu, shell } = require('electron');
const path = require("path")
const os = require("os");
const { autoUpdater } = require('electron-updater');
const fs = require('fs');

// Nur fuer Tests: Updater auch ohne gepacktes Programm ausfuehren (liest dev-app-update.yml).
if (process.env.PS_FORCE_DEV_UPDATE === '1') autoUpdater.forceDevUpdateConfig = true;

autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = false;

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

function sendToWindow(channel, ...args) {
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send(channel, ...args);
}

// Externe Links (Website, Impressum, Datenschutz) gehoeren in den System-Browser.
// Ohne diese Regel ersetzt ein Klick den Tool-Frame durch eine leere Seite.
function openExternalSafe(url) {
  try {
    const u = new URL(url);
    if (u.protocol === 'https:' || u.protocol === 'mailto:') shell.openExternal(u.toString());
  } catch { /* ungueltige URL ignorieren */ }
}

function isInternalUrl(url) {
  return url.startsWith('file://') && url.includes('/app/');
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
      contextIsolation: true
    }
  });

  mainWindow.loadFile('app/index.html');
  Menu.setApplicationMenu(null);
}

ipcMain.handle('save-file', async (event, { defaultName, data, mimeType }) => {
  const ext = mimeType === 'application/pdf' ? '.pdf' : '.png';
  const result = await dialog.showSaveDialog(mainWindow, {
    defaultPath: defaultName || `document${ext}`,
    filters: [
      { name: mimeType === 'application/pdf' ? 'PDF Datei' : 'PNG Bild', extensions: [ext.replace('.', '')] }
    ]
  });
  if (!result.canceled && result.filePath) {
    const buffer = Buffer.from(data, 'base64');
    fs.writeFileSync(result.filePath, buffer);
    return { success: true, path: result.filePath };
  }
  return { success: false };
});

ipcMain.handle('open-file', async () => {
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

ipcMain.handle('save-metadata', async (event, { data }) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    defaultPath: 'metadata-export.json',
    filters: [{ name: 'JSON Datei', extensions: ['json'] }]
  });
  if (!result.canceled && result.filePath) {
    fs.writeFileSync(result.filePath, JSON.stringify(data, null, 2), 'utf-8');
    return { success: true, path: result.filePath };
  }
  return { success: false };
});

ipcMain.handle('get-app-version', () => app.getVersion());

ipcMain.handle("get-system-stats", () => {
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;
  const memPercent = Math.round((usedMem / totalMem) * 100);
  const appMem = Math.round(process.memoryUsage().heapUsed / 1024 / 1024);
  const cpus = os.cpus();
  const cpuCount = cpus.length;
  const cpuModel = cpus[0].model.trim();
  return {
    ram: { total: Math.round(totalMem / 1024 / 1024 / 1024 * 10) / 10, used: Math.round(usedMem / 1024 / 1024 / 1024 * 10) / 10, percent: memPercent },
    cpu: { model: cpuModel, cores: cpuCount },
    app: { memory: appMem }
  };
});

ipcMain.handle('dismiss-update', (event, version) => {
  const state = getUpdateState();
  if (state.version !== version) {
    state.version = version;
    state.dismissCount = 0;
  }
  state.dismissCount++;
  saveUpdateState(state);
  return { dismissCount: state.dismissCount };
});

ipcMain.handle('start-download', async () => {
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

ipcMain.handle('check-for-updates', () => {
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
        resolve({ updateAvailable: true, version: info.version, currentVersion: app.getVersion() });
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

ipcMain.handle('quit-app', () => {
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
        dismissCount: state.dismissCount
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
  createWindow();
  setupAutoUpdater();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
