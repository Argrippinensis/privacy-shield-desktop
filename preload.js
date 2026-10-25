const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  saveFile: (options) => ipcRenderer.invoke('save-file', options),
  openFile: () => ipcRenderer.invoke('open-file'),
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  dismissUpdate: (version) => ipcRenderer.invoke('dismiss-update', version),
  startDownload: () => ipcRenderer.invoke('start-download'),
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  checkAssets: (deep) => ipcRenderer.invoke('check-assets', !!deep),
  copyText: (text) => ipcRenderer.invoke('copy-text', text),
  getUpdateMode: () => ipcRenderer.invoke('get-update-mode'),
  openDownloadPage: () => ipcRenderer.invoke('open-download-page'),
  quitApp: () => ipcRenderer.invoke('quit-app'),
  getAppInfo: () => ipcRenderer.invoke('get-app-info'),
  getLicenses: () => ipcRenderer.invoke('get-licenses'),
  getSystemStats: () => ipcRenderer.invoke("get-system-stats"),
  takeOpenedFiles: () => ipcRenderer.invoke('take-opened-files'),
  onFilesOpened: (callback) => {
    ipcRenderer.on('files-opened', () => callback());
  },
  onUpdateAvailable: (callback) => {
    ipcRenderer.on('update-available', (event, data) => callback(data));
  },
  onDownloadProgress: (callback) => {
    ipcRenderer.on('download-progress', (event, percent) => callback(percent));
  },
  onUpdateDownloaded: (callback) => {
    ipcRenderer.on('update-downloaded', (event, version) => callback(version));
  },
  onDownloadError: (callback) => {
    ipcRenderer.on('download-error', () => callback());
  },
  onUpdateNotAvailable: (callback) => {
    ipcRenderer.on('update-not-available', (event, info) => callback(info));
  },
  platform: process.platform
});

// Kommandozeilenmodus (E1.w): nur fuer die versteckte Seite app://ps/cli.html; der Hauptprozess antwortet zusaetzlich nur im CLI-Modus.
if (location.protocol === 'app:' && location.pathname === '/cli.html') {
  contextBridge.exposeInMainWorld('psCli', {
    nextFile: () => ipcRenderer.invoke('cli-next-file'),
    result: (msg) => ipcRenderer.invoke('cli-result', msg)
  });
}
