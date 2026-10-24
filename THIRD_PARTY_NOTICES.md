# Drittanbieter-Komponenten in PrivacyShield Desktop

PrivacyShield Desktop enthaelt die folgenden Komponenten. Sie laufen vollstaendig lokal auf dem Rechner
und werden mit der Installation ausgeliefert (keine Nachladung aus dem Internet).

| Komponente | Version | Lizenz | Quelle |
|---|---|---|---|
| Electron | siehe `package.json` | MIT | https://www.electronjs.org |
| electron-updater | siehe `package.json` | MIT | https://www.electron.build |
| Transformers.js (inkl. ONNX Runtime Web) | 3.5.2 | Apache-2.0 / MIT | https://github.com/huggingface/transformers.js |
| pdf.js | 3.11.174 | Apache-2.0 | https://github.com/mozilla/pdf.js |
| mammoth.js | 1.13.0 | BSD-2-Clause | https://github.com/mwilliamson/mammoth.js |
| JSZip | 3.10.2 | MIT oder GPL-3.0-or-later (hier: MIT) | https://github.com/Stuk/jszip |
| jsPDF | 2.5.1 | MIT | https://github.com/parallax/jsPDF |
| Tesseract.js | 5.1.1 | Apache-2.0 | https://github.com/naptha/tesseract.js |
| Tesseract.js Core | 5.1.1 | Apache-2.0 | https://github.com/naptha/tesseract.js-core |
| Tesseract-Sprachdaten deu, eng (best_int) | 4.0.0 | Apache-2.0 | https://github.com/tesseract-ocr/tessdata_best |
| Tailwind CSS (nur beim Bau, erzeugt `app/css/tailwind.css`) | 3.4.17 | MIT | https://tailwindcss.com |

## KI-Modell zur Erkennung von Namen, Organisationen und Orten

- Modell: `distilbert-base-multilingual-cased-ner-hrl` von Davlan (David Adelani et al.),
  Lizenz **AFL-3.0** (Academic Free License 3.0), https://opensource.org/license/afl-3-0-php
- ONNX-Konvertierung (quantisiert, `model_quantized.onnx`): Xenova / Hugging Face,
  https://huggingface.co/Xenova/distilbert-base-multilingual-cased-ner-hrl
  (festgeschriebene Revision `c2a4dbf593c57f47004c5bc2d3770d311aee9c43`)
- Das Modell wird unveraendert verwendet. Urheber- und Lizenzhinweis bleiben gemaess AFL-3.0 erhalten.

Die genauen Dateien und ihre SHA-256-Pruefsummen stehen in `scripts/vendor.lock.json`.
