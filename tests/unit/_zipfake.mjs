// B2.fix: Hilfen fuer gefaelschte ZIP-Archive in Tests (Zentralverzeichnis luegt ueber die entpackte Groesse).
// Die Archive werden von Hand zusammengesetzt (node:zlib), damit eine "Bombe" von 256 MiB in Millisekunden entsteht
// und das Archiv nur wenige hundert KiB gross ist. Nichts davon landet auf der Platte.
import zlib from 'node:zlib';

export const MiB = 1048576;

const u16 = (n) => { const b = Buffer.alloc(2); b.writeUInt16LE(n); return b; };
const u32 = (n) => { const b = Buffer.alloc(4); b.writeUInt32LE(n >>> 0); return b; };

// Inhalt eines Eintrags: Text/Bytes (content) oder wiederholter Block (prefix + chunk * times + suffix).
// -> { data: Buffer (rohes Deflate), size: tatsaechliche entpackte Groesse, crc }
function deflateEntry(e) {
  if (e.content !== undefined) {
    const raw = Buffer.isBuffer(e.content) ? e.content : Buffer.from(e.content, 'utf8');
    return { data: zlib.deflateRawSync(raw, { level: 6 }), size: raw.length, crc: zlib.crc32(raw) };
  }
  const prefix = Buffer.from(e.prefix || '', 'utf8');
  const suffix = Buffer.from(e.suffix || '', 'utf8');
  const chunk = Buffer.alloc(MiB, e.fill || 65);
  const sync = (buf) => zlib.deflateRawSync(buf, { level: 1, finishFlush: zlib.constants.Z_SYNC_FLUSH });
  const parts = [];
  let crc = 0;
  let size = 0;
  if (prefix.length) { parts.push(sync(prefix)); crc = zlib.crc32(prefix, crc); size += prefix.length; }
  const oneChunk = sync(chunk);
  for (let i = 0; i < e.mib; i++) { parts.push(oneChunk); crc = zlib.crc32(chunk, crc); size += chunk.length; }
  // letzter Block (final) mit dem Rest; so ist der Strom ein gueltiges Deflate-Ende
  parts.push(zlib.deflateRawSync(suffix, { level: 1 }));
  crc = zlib.crc32(suffix, crc);
  size += suffix.length;
  return { data: Buffer.concat(parts), size, crc };
}

// entries: [{ name, content } | { name, prefix, suffix, mib, fill }] plus optional declared (Zahl): die im Kopf
// angegebene unkomprimierte Groesse (Zentralverzeichnis und lokaler Kopf). Ohne declared steht die wahre Groesse darin.
// -> Uint8Array eines ZIP (Methode Deflate)
export function buildZip(entries) {
  const locals = [];
  const centrals = [];
  let offset = 0;
  for (const e of entries) {
    const d = deflateEntry(e);
    const name = Buffer.from(e.name, 'utf8');
    const usize = e.declared !== undefined ? e.declared : d.size;
    const common = [u16(20), u16(0x0800), u16(8), u16(0), u16(0x21), u32(d.crc), u32(d.data.length), u32(usize), u16(name.length), u16(0)];
    const local = Buffer.concat([u32(0x04034b50), ...common, name, d.data]);
    const central = Buffer.concat([u32(0x02014b50), u16(20), ...common, u16(0), u16(0), u16(0), u32(0), u32(offset), name]);
    locals.push(local);
    centrals.push(central);
    offset += local.length;
  }
  const cd = Buffer.concat(centrals);
  const eocd = Buffer.concat([u32(0x06054b50), u16(0), u16(0), u16(entries.length), u16(entries.length), u32(cd.length), u32(offset), u16(0)]);
  const all = Buffer.concat([...locals, cd, eocd]);
  return new Uint8Array(all.buffer, all.byteOffset, all.length);
}

// Zaehlt die Bytes, die JSZip fuer die Eintraege einer geladenen Zip-Instanz tatsaechlich entpackt (gleich auf welchem
// Weg gelesen wird: async, internalStream, nodeStream). Zaehler: { bytes }.
export function countInflated(zip) {
  const counter = { bytes: 0 };
  for (const f of Object.values(zip.files)) {
    if (f.dir) continue;
    const orig = f._decompressWorker.bind(f);
    f._decompressWorker = function () {
      const w = orig();
      w.on('data', (c) => { counter.bytes += c && c.data ? c.data.length : 0; });
      return w;
    };
  }
  return counter;
}
