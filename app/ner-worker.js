// KI-Erkennung (Namen, Organisationen, Orte) in einem eigenen Thread.
// Die Seite bleibt waehrend der Analyse bedienbar; Modell und Laufzeit kommen
// ausschliesslich aus der Installation (app/models, app/vendor), nie aus dem Netz.
import { pipeline, env } from './vendor/transformers/transformers.min.js';

const BASE = new URL('./', self.location.href);
env.allowRemoteModels = false;
env.allowLocalModels = true;
env.localModelPath = new URL('models/', BASE).href;
env.useBrowserCache = false;
env.backends.onnx.wasm.wasmPaths = new URL('vendor/transformers/', BASE).href;
// Mehrere Rechenthreads nur mit Cross-Origin-Isolation (SharedArrayBuffer). Faustregel: halbe Kernzahl
// (logische Kerne = 2x physische; mehr Threads waren in Messungen nie schneller, oft langsamer).
env.backends.onnx.wasm.numThreads = self.crossOriginIsolated
  ? Math.max(1, Math.min(4, Math.floor((navigator.hardwareConcurrency || 2) / 2)))
  : 1;

let ner = null;

self.onmessage = async ({ data }) => {
  try {
    if (data.type === 'load') {
      if (data.threads) env.backends.onnx.wasm.numThreads = data.threads; // nur fuer Messungen/Tests
      ner = await pipeline('token-classification', data.modelId, {
        dtype: 'q8',
        device: 'wasm',
        progress_callback: (p) => {
          if (p.status === 'progress' && p.file) {
            self.postMessage({ type: 'progress', file: p.file, loaded: p.loaded || 0, total: p.total || 0 });
          }
        },
      });
      self.postMessage({ type: 'ready', threads: env.backends.onnx.wasm.numThreads, isolated: !!self.crossOriginIsolated });
    } else if (data.type === 'run') {
      const out = await ner(data.text);
      self.postMessage({ type: 'result', id: data.id, out });
    }
  } catch (err) {
    self.postMessage({ type: 'error', id: data.id, message: String((err && err.message) || err) });
  }
};
