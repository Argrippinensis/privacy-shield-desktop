const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  saveFile: (options) => ipcRenderer.invoke('save-file', options),
  openFile: () => ipcRenderer.invoke('open-file'),
  saveMetadata: (data) => ipcRenderer.invoke('save-metadata', { data }),
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  dismissUpdate: (version) => ipcRenderer.invoke('dismiss-update', version),
  startDownload: () => ipcRenderer.invoke('start-download'),
  quitApp: () => ipcRenderer.invoke('quit-app'),
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
  getSystemStats: () => ipcRenderer.invoke("get-system-stats"),
    ipcRenderer.on('download-error', () => callback());
  },
  platform: process.platform
});
