// v264 : petit écrivain de fichiers ZIP (sans compression, « stored »), suffisant pour fabriquer un .docx dans le navigateur
// sans bibliothèque. files = [{ name, data: Uint8Array | string }] → Uint8Array.
const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
const crc32 = b => { let c = 0xFFFFFFFF; for (let i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
// UTF-8 (TextEncoder s'il existe ; sinon équivalent, pour les tests)
const enc = s => { if (typeof TextEncoder !== "undefined") return new TextEncoder().encode(s); const b = unescape(encodeURIComponent(s)), u = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u; };

export function zipStore(files, date = new Date()) {
  const dt = ((date.getHours() << 11) | (date.getMinutes() << 5) | (date.getSeconds() >> 1)) & 0xFFFF;
  const dd = (((date.getFullYear() - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate()) & 0xFFFF;
  const parts = [], central = []; let off = 0;
  const u16 = v => [v & 0xFF, (v >>> 8) & 0xFF], u32 = v => [v & 0xFF, (v >>> 8) & 0xFF, (v >>> 16) & 0xFF, (v >>> 24) & 0xFF];
  files.forEach(f => {
    const name = enc(f.name), data = typeof f.data === "string" ? enc(f.data) : f.data, crc = crc32(data);
    const common = [...u16(20), ...u16(0x0800), ...u16(0), ...u16(dt), ...u16(dd), ...u32(crc), ...u32(data.length), ...u32(data.length), ...u16(name.length), ...u16(0)];
    const head = new Uint8Array([...u32(0x04034b50), ...common]);
    parts.push(head, name, data);
    central.push(new Uint8Array([...u32(0x02014b50), ...u16(20), ...common, ...u16(0), ...u16(0), ...u16(0), ...u32(0), ...u32(off)]), name);
    off += head.length + name.length + data.length;
  });
  const cdSize = central.reduce((n, p) => n + p.length, 0);
  const end = new Uint8Array([...u32(0x06054b50), ...u16(0), ...u16(0), ...u16(files.length), ...u16(files.length), ...u32(cdSize), ...u32(off), ...u16(0)]);
  const all = [...parts, ...central, end], out = new Uint8Array(all.reduce((n, p) => n + p.length, 0));
  let p = 0; all.forEach(a => { out.set(a, p); p += a.length; });
  return out;
}
export const zipCrc32 = crc32;
