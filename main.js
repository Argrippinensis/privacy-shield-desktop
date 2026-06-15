const { app, BrowserWindow, ipcMain, dialog, Menu } = require('electron');
const path = require('path');
const { autoUpdater } = require('electron-updater');
const fs = require('fs');

// Auto-Updater Config
autoUpdater.autoDownload = true;
autoUpdater.autoInstallOnAppQuit = true;

let mainWindow;

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

  // Lade das PrivacyShield Tool
  mainWindow.loadFile('app/index.html');

  // Ausblenden der Standard-Menüleiste (für sauberes Desktop-Gefühl)
  Menu.setApplicationMenu(null);
}

// IPC: Datei speichern (für PDF-Export)
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

// IPC: Datei öffnen (für Drag&Drop / Browse)
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

// IPC: Metadaten speichern (als JSON)
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

// Auto-Updater
function setupAutoUpdater() {
  // Prüfe auf Updates (nach 5 Sekunden, damit die App erst geladen ist)
  setTimeout(() => {
    autoUpdater.checkForUpdates().catch(() => {
      // Kein Update verfügbar oder kein Netzwerk — egal
    });
  }, 5000);

  autoUpdater.on('update-available', (info) => {
    console.log(`Update verfügbar: ${info.version}`);
    mainWindow.webContents.send('update-available', info.version);
  });

  autoUpdater.on('update-downloaded', (info) => {
    console.log(`Update geladen: ${info.version}`);
    mainWindow.webContents.send('update-downloaded', info.version);
  });

  autoUpdater.on('error', (err) => {
    console.log('Update-Fehler (nicht kritisch):', err.message);
  });
}

// Forciertes Update: Prüfe auf kritische Updates beim Start
ipcMain.handle('check-for-fo-update', async () => {
  try {
    const result = await autoUpdater.checkForUpdates();
    if (result && result.updateInfo && result.updateInfo.version !== app.getVersion()) {
      const latest = result.updateInfo.version;
      return { updateAvailable: true, latestVersion: latest };
    }
  } catch (e) {
    // Kein Netzwerk — ignorieren
  }
  return { updateAvailable: false };
});

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
