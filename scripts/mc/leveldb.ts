// A small, read-only LevelDB reader for Minecraft Bedrock worlds (owner 2026-11-05: bring their Minecraft city
// into the game). Bedrock keeps a world in a LevelDB database: sorted tables (.ldb) and a write-ahead log
// (.log), with Mojang's compression (zlib, or raw deflate). This reads every table and the log, keeps the
// newest value for each key, and hands back the live keys. No native modules, nothing written.
import * as fs from 'fs';
import * as path from 'path';
import * as zlib from 'zlib';

function varint(b: Buffer, o: { p: number }): number {
  let r = 0, s = 0;
  for (;;) { const c = b[o.p++]; r += (c & 0x7f) * 2 ** s; if (c < 0x80) return r; s += 7; }
}

function decompress(raw: Buffer, kind: number): Buffer {
  if (kind === 0) return raw;
  if (kind === 2) return zlib.inflateSync(raw);       // Mojang: zlib with a header
  if (kind === 4) return zlib.inflateRawSync(raw);    // Mojang: raw deflate
  if (kind === 1) throw new Error('snappy-compressed block (not used by Bedrock)');
  throw new Error('unknown block compression ' + kind);
}

/** A table block's entries: [key, value] with the shared-prefix keys rebuilt. */
function blockEntries(b: Buffer): [Buffer, Buffer][] {
  const nRestarts = b.readUInt32LE(b.length - 4);
  const end = b.length - 4 - nRestarts * 4;
  const out: [Buffer, Buffer][] = [];
  const o = { p: 0 };
  let last = Buffer.alloc(0);
  while (o.p < end) {
    const shared = varint(b, o), unshared = varint(b, o), vlen = varint(b, o);
    const key = Buffer.concat([last.subarray(0, shared), b.subarray(o.p, o.p + unshared)]);
    o.p += unshared;
    out.push([key, b.subarray(o.p, o.p + vlen)]);
    o.p += vlen;
    last = key;
  }
  return out;
}

function readBlock(file: Buffer, off: number, size: number): Buffer {
  const raw = file.subarray(off, off + size);
  return decompress(raw, file[off + size]);
}

export interface Entry { seq: number; del: boolean; value: Buffer | null }

/** Every key's newest entry, from all the tables and the log; values kept only for keys `keep` accepts (all, if none given). */
export function readDb(dir: string, filter?: (key: Buffer) => boolean, keep?: (key: Buffer) => boolean): Map<string, Entry> {
  const live = new Map<string, Entry>();
  const put = (key: Buffer, seq: number, del: boolean, value: Buffer | null) => {
    if (filter && !filter(key)) return;
    const k = key.toString('latin1');
    const had = live.get(k);
    if (!had || had.seq < seq) live.set(k, { seq, del, value: del || (keep && !keep(key)) ? null : Buffer.from(value!) });
  };
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    if (f.endsWith('.ldb') || f.endsWith('.sst')) {
      const file = fs.readFileSync(p);
      const foot = file.subarray(file.length - 48);
      const o = { p: 0 };
      varint(foot, o); varint(foot, o); // the metaindex
      const io = varint(foot, o), is = varint(foot, o);
      for (const [, handle] of blockEntries(readBlock(file, io, is))) {
        const h = { p: 0 };
        const bo = varint(handle, h), bs = varint(handle, h);
        for (const [ikey, val] of blockEntries(readBlock(file, bo, bs))) {
          const tag = ikey.readBigUInt64LE(ikey.length - 8);
          const type = Number(tag & 0xffn), seq = Number(tag >> 8n);
          put(ikey.subarray(0, ikey.length - 8), seq, type === 0, val);
        }
      }
    } else if (f.endsWith('.log')) {
      const file = fs.readFileSync(p);
      // records in 32 KiB blocks: checksum(4) length(2) type(1) data; type 1 full, 2 first, 3 middle, 4 last
      let rec: Buffer[] = [];
      for (let bp = 0; bp < file.length; bp += 32768) {
        let q = bp;
        while (q + 7 <= Math.min(file.length, bp + 32768)) {
          const len = file.readUInt16LE(q + 4), type = file[q + 6];
          if (type === 0 && len === 0) break;
          const data = file.subarray(q + 7, q + 7 + len);
          q += 7 + len;
          if (type === 1) rec = [data];
          else if (type === 2) { rec = [data]; continue; }
          else if (type === 3) { rec.push(data); continue; }
          else if (type === 4) rec.push(data);
          else break;
          const batch = Buffer.concat(rec);
          rec = [];
          if (batch.length < 12) continue;
          let seq = Number(batch.readBigUInt64LE(0));
          const n = batch.readUInt32LE(8);
          const o = { p: 12 };
          for (let i = 0; i < n && o.p < batch.length; i++, seq++) {
            const t = batch[o.p++];
            const kl = varint(batch, o); const key = batch.subarray(o.p, o.p + kl); o.p += kl;
            if (t === 1) { const vl = varint(batch, o); const val = batch.subarray(o.p, o.p + vl); o.p += vl; put(key, seq, false, val); }
            else put(key, seq, true, null);
          }
        }
      }
    }
  }
  return live;
}
