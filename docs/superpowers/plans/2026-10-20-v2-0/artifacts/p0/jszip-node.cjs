// P0 (c): JSZip aus app/vendor in Node (require), Metadaten ohne Entpacken, ZIP-Bomben-Fixtures, kaputte ZIPs, gefaelschter Header.
//   PS_REPO=~/projects/ps-v2 node jszip-node.cjs
const t0 = process.hrtime.bigint();
const JSZip = require((process.env.PS_REPO || (process.env.HOME + '/projects/ps-v2')) + '/app/vendor/jszip/jszip.min.js');
console.log('typeof', typeof JSZip, 'version', JSZip.version, 'load ms', Number(process.hrtime.bigint() - t0) / 1e6, 'window', typeof window, 'node', process.version);
const ms = (t) => Math.round(Number(process.hrtime.bigint() - t) / 1e6);
(async () => {
  const z = new JSZip();
  z.file('ppt/slides/slide10.xml', '<a:t>zehn</a:t>');
  z.file('ppt/slides/slide2.xml', '<a:t>zwei</a:t>');
  z.file('dir/', null, { dir: true });
  const bytes = await z.generateAsync({ type: 'uint8array', compression: 'DEFLATE' });
  const l = await JSZip.loadAsync(bytes);
  for (const [n, f] of Object.entries(l.files)) console.log(JSON.stringify(n), 'dir', f.dir, 'props', Object.keys(f).join(','), f._data ? JSON.stringify({ c: f._data.compressedSize, u: f._data.uncompressedSize, keys: Object.keys(f._data) }) : 'no _data');
  console.log('slide2:', await l.file('ppt/slides/slide2.xml').async('string'));
  // Bombe: ein Eintrag 210 MB Nullbytes
  for (const mb of [210, 500]) {
    let t = process.hrtime.bigint(); const mem0 = process.memoryUsage().rss;
    const b = new JSZip(); b.file('bomb.bin', Buffer.alloc(mb * 1024 * 1024));
    const bb = await b.generateAsync({ type: 'uint8array', compression: 'DEFLATE', compressionOptions: { level: 1 } });
    console.log(mb + ' MB Nullen: erzeugen ms', ms(t), 'zip bytes', bb.length, 'ratio', Math.round(mb * 1048576 / bb.length), 'rss delta MB', Math.round((process.memoryUsage().rss - mem0) / 1048576));
    t = process.hrtime.bigint(); const lb = await JSZip.loadAsync(bb);
    const fb = lb.files['bomb.bin']; console.log('  loadAsync ms', ms(t), 'ohne Entpacken: _data.uncompressedSize', fb._data.uncompressedSize, 'compressed', fb._data.compressedSize);
  }
  // 2001 Eintraege
  let t = process.hrtime.bigint(); const many = new JSZip(); for (let i = 0; i < 2001; i++) many.file('f' + i + '.txt', 'x');
  const mb = await many.generateAsync({ type: 'uint8array' }); const lm = await JSZip.loadAsync(mb);
  console.log('2001 Eintraege erzeugen+laden ms', ms(t), 'Anzahl', Object.keys(lm.files).length);
  // Kaputtes ZIP
  for (const [label, buf] of [['abgeschnitten', bytes.slice(0, bytes.length - 30)], ['Muell', Buffer.from('das ist kein zip')], ['leer', Buffer.alloc(0)]]) {
    try { await JSZip.loadAsync(buf); console.log(label, 'geladen?!'); } catch (e) { console.log(label, '->', e.message.slice(0, 80)); }
  }
  // Header luegt: uncompressedSize im Zentralverzeichnis kleiner als real
  const lie = new JSZip(); lie.file('a.txt', 'A'.repeat(100000)); const lb2 = await lie.generateAsync({ type: 'uint8array', compression: 'DEFLATE' });
  const dv = new DataView(lb2.buffer, lb2.byteOffset, lb2.byteLength);
  // Zentralverzeichnis suchen (Signatur 0x02014b50), unkomprimierte Groesse bei Offset 24
  for (let i = 0; i < lb2.length - 4; i++) if (dv.getUint32(i, true) === 0x02014b50) { console.log('CD at', i, 'usize', dv.getUint32(i + 24, true)); dv.setUint32(i + 24, 10, true); break; }
  try { const ll = await JSZip.loadAsync(lb2); const s = await ll.file('a.txt').async('string'); console.log('luegender Header: entpackt', s.length); } catch (e) { console.log('luegender Header ->', e.message.slice(0, 100)); }
})();
