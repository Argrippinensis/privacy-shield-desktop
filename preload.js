const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  saveFile: (options) => ipcRenderer.invoke('save-file', options),
  openFile: () => ipcRenderer.invoke('open-file'),
  saveMetadata: (data) => ipcRenderer.invoke('save-metadata', { data }),
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  dismissUpdate: (version) => ipcRenderer.invoke('dismiss-update', version),
  startDownload: () => ipcRenderer.invoke('start-download'),
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  quitApp: () => ipcRenderer.invoke('quit-app'),
  getSystemStats: () => ipcRenderer.invoke("get-system-stats"),
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
