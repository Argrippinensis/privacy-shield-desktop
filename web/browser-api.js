// Browser-Ersatz fuer die Desktop-Bruecke (preload.js): definiert window.electronAPI, BEVOR das Werkzeug im Iframe laedt.
// Das Werkzeug liest die Bruecke ueber window.parent.electronAPI. Jede in preload.js freigegebene Funktion und jedes
// Ereignis hat hier eine Entsprechung; was es im Browser nicht gibt, ist ein sicherer No-op. Die Version setzt der Bau.
(function () {
  'use strict';
  var VERSION = '__PS_VERSION__';
  var MODELL = { id: 'Xenova/distilbert-base-multilingual-cased-ner-hrl', bytes: 135359829 };

  function ereignis(cb) { void cb; } // Im Browser gibt es keine Ereignisse der Huelle

  // Text in die Zwischenablage: moderne Schnittstelle, sonst Auswahl + execCommand; schlaegt beides fehl: Fehler wie in der App
  function copyText(text) {
    var t = String(text == null ? '' : text);
    function ersatz() {
      return new Promise(function (resolve, reject) {
        var ta = document.createElement('textarea');
        ta.value = t;
        ta.setAttribute('readonly', '');
        ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0;pointer-events:none';
        document.body.appendChild(ta);
        ta.select();
        try { ta.setSelectionRange(0, t.length); } catch (e) { /* ignorieren */ }
        var ok = false;
        try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
        document.body.removeChild(ta);
        if (ok) resolve(); else reject(new Error('Kopieren nicht moeglich'));
      });
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(t).catch(ersatz);
    }
    return ersatz();
  }

  // Datei speichern: Blob-Download. options = { defaultName, data (Base64), mimeType }
  function saveFile(options) {
    return new Promise(function (resolve) {
      try {
        var o = options || {};
        var bin = atob(String(o.data || ''));
        var bytes = new Uint8Array(bin.length);
        for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        var url = URL.createObjectURL(new Blob([bytes], { type: o.mimeType || 'application/octet-stream' }));
        var a = document.createElement('a');
        a.href = url;
        a.download = o.defaultName || 'dokument';
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(function () { URL.revokeObjectURL(url); }, 30000);
        resolve({ success: true });
      } catch (e) {
        resolve({ success: false, error: 'write' });
      }
    });
  }

  // Datei oeffnen: Dateiauswahl des Browsers; Ergebnis wie in der App { name, data (Base64), mimeType } oder null
  function openFile() {
    return new Promise(function (resolve) {
      var inp = document.createElement('input');
      inp.type = 'file';
      inp.accept = '.pdf,.jpg,.jpeg,.png,.webp,.gif,.tiff,application/pdf,image/*';
      inp.style.display = 'none';
      var fertig = false;
      function ende(v) { if (fertig) return; fertig = true; if (inp.parentNode) inp.parentNode.removeChild(inp); resolve(v); }
      inp.addEventListener('cancel', function () { ende(null); });
      inp.addEventListener('change', function () {
        var f = inp.files && inp.files[0];
        if (!f) { ende(null); return; }
        var r = new FileReader();
        r.onload = function () {
          var s = String(r.result || '');
          ende({ name: f.name, data: s.slice(s.indexOf(',') + 1), mimeType: f.type || 'application/octet-stream' });
        };
        r.onerror = function () { ende(null); };
        r.readAsDataURL(f);
      });
      document.body.appendChild(inp);
      inp.click();
    });
  }

  function systemStats() {
    var mem = typeof navigator.deviceMemory === 'number' ? navigator.deviceMemory : null; // Browser nennt nur grobe Werte (hoechstens 8)
    var heap = 0;
    try { if (performance && performance.memory) heap = Math.round(performance.memory.usedJSHeapSize / 1048576); } catch (e) { heap = 0; }
    return Promise.resolve({
      ram: { total: mem, used: 0, percent: 0 },
      cpu: { model: 'Browser', cores: navigator.hardwareConcurrency || 1 },
      app: { memory: heap },
    });
  }

  function lizenzen() {
    if (typeof fetch !== 'function') return Promise.resolve('');
    return fetch('THIRD_PARTY_NOTICES.md').then(function (r) { return r.ok ? r.text() : ''; }).catch(function () { return ''; });
  }

  window.electronAPI = {
    saveFile: saveFile,
    openFile: openFile,
    getAppVersion: function () { return Promise.resolve(VERSION); },
    dismissUpdate: function () { return Promise.resolve({ dismissCount: 0 }); },
    startDownload: function () { return Promise.resolve(); },
    checkForUpdates: function () { return Promise.resolve({ updateAvailable: false, currentVersion: VERSION }); },
    checkAssets: function () { return Promise.resolve({ manifest: false, ok: true, missing: [], wrongSize: [], corrupt: [], appRoot: '' }); },
    copyText: copyText,
    getUpdateMode: function () { return Promise.resolve({ manual: true }); },
    openDownloadPage: function () { return Promise.resolve(); },
    quitApp: function () { return Promise.resolve(); },
    getAppInfo: function () {
      return Promise.resolve({ version: VERSION, electron: '', chrome: '', node: '', platform: 'web', arch: '', osRelease: String(navigator.userAgent || ''), model: MODELL });
    },
    getLicenses: lizenzen,
    getSystemStats: systemStats,
    takeOpenedFiles: function () { return Promise.resolve([]); },
    onFilesOpened: ereignis,
    onUpdateAvailable: ereignis,
    onDownloadProgress: ereignis,
    onUpdateDownloaded: ereignis,
    onDownloadError: ereignis,
    onUpdateNotAvailable: ereignis,
    platform: 'web',
  };
})();
