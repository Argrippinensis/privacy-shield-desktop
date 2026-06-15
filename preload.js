const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Datei speichern (z.B. PDF-Export)
  saveFile: (options) => ipcRenderer.invoke('save-file', options),

  // Datei öffnen (lokale Datei auswählen)
  openFile: () => ipcRenderer.invoke('open-file'),

  // Metadaten als JSON speichern
  saveMetadata: (data) => ipcRenderer.invoke('save-metadata', { data }),

  // Versions-Info
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),

  // Forciertes Update prüfen
  checkForFoUpdate: () => ipcRenderer.invoke('check-for-fo-update'),

  // Update-Events empfangen
  onUpdateAvailable: (callback) => {
    ipcRenderer.on('update-available', (event, version) => callback(version));
  },
  onUpdateDownloaded: (callback) => {
    ipcRenderer.on('update-downloaded', (event, version) => callback(version));
  },

  // Plattform-Info
  platform: process.platform
});
