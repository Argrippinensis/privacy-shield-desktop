const { app, BrowserWindow, ipcMain, dialog, Menu } = require('electron');
const path = require('path');
const { autoUpdater } = require('electron-updater');
const fs = require('fs');

autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = false;

let mainWindow;

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
  try {
    await autoUpdater.downloadUpdate();
  } catch (e) {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('download-error');
    }
  }
});

ipcMain.handle('quit-app', () => {
  app.quit();
});

function setupAutoUpdater() {
  setTimeout(() => {
    autoUpdater.checkForUpdates().catch(() => {});
  }, 5000);

  autoUpdater.on('update-available', (info) => {
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
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('update-downloaded', info.version);
    }
    setTimeout(() => {
      autoUpdater.quitAndInstall(false, true);
    }, 2000);
  });

  autoUpdater.on('error', (err) => {
    console.log('Update-Fehler:', err.message);
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('download-error');
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
