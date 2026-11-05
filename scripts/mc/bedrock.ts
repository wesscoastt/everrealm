// Bedrock's little-endian NBT, and its sub-chunks (16x16x16 blocks, paletted): enough to read a world's
// blocks by name. See scripts/mc/leveldb.ts for the database itself.

export type Nbt = number | bigint | string | Nbt[] | { [k: string]: Nbt } | number[];

export class NbtReader {
  p = 0;
  constructor(public b: Buffer, start = 0) { this.p = start; }
  private str(): string { const n = this.b.readUInt16LE(this.p); this.p += 2; const s = this.b.toString('utf8', this.p, this.p + n); this.p += n; return s; }
  private payload(t: number): Nbt {
    const b = this.b;
    switch (t) {
      case 1: return b.readInt8(this.p++);
      case 2: { const v = b.readInt16LE(this.p); this.p += 2; return v; }
      case 3: { const v = b.readInt32LE(this.p); this.p += 4; return v; }
      case 4: { const v = b.readBigInt64LE(this.p); this.p += 8; return v; }
      case 5: { const v = b.readFloatLE(this.p); this.p += 4; return v; }
      case 6: { const v = b.readDoubleLE(this.p); this.p += 8; return v; }
      case 7: { const n = b.readInt32LE(this.p); this.p += 4; const v = [...b.subarray(this.p, this.p + n)]; this.p += n; return v; }
      case 8: return this.str();
      case 9: { const et = b[this.p++]; const n = b.readInt32LE(this.p); this.p += 4; const out: Nbt[] = []; for (let i = 0; i < n; i++) out.push(this.payload(et)); return out; }
      case 10: { const o: { [k: string]: Nbt } = {}; for (;;) { const ct = b[this.p++]; if (ct === 0) break; const name = this.str(); o[name] = this.payload(ct); } return o; }
      case 11: { const n = b.readInt32LE(this.p); this.p += 4; const out: number[] = []; for (let i = 0; i < n; i++) { out.push(b.readInt32LE(this.p)); this.p += 4; } return out; }
      case 12: { const n = b.readInt32LE(this.p); this.p += 4; const out: Nbt[] = []; for (let i = 0; i < n; i++) { out.push(b.readBigInt64LE(this.p)); this.p += 8; } return out; }
      default: throw new Error('nbt tag ' + t + ' at ' + this.p);
    }
  }
  /** A named root tag: its value. */
  read(): Nbt { const t = this.b[this.p++]; this.str(); return this.payload(t); }
}

export interface Palette { name: string; states: Record<string, Nbt> }

/**
 * A sub-chunk's first layer (the blocks; the second is water in waterlogged blocks): the palette, and an
 * index into it for each of the 4096 cells, in Bedrock's order (x * 256 + z * 16 + y).
 */
export function readSubChunk(v: Buffer): { palette: Palette[]; idx: Uint16Array; water: Uint8Array | null } | null {
  let p = 0;
  const ver = v[p++];
  if (ver !== 8 && ver !== 9) return null; // (old formats: not in a world saved this decade)
  const layers = v[p++];
  if (ver === 9) p++; // the sub-chunk's y
  let first: { palette: Palette[]; idx: Uint16Array } | null = null, water: Uint8Array | null = null;
  for (let l = 0; l < layers; l++) {
    const head = v[p++], bits = head >> 1;
    const idx = new Uint16Array(4096);
    if (bits > 0) {
      const per = Math.floor(32 / bits), words = Math.ceil(4096 / per), mask = (1 << bits) - 1;
      for (let w = 0; w < words; w++) {
        const word = v.readUInt32LE(p + w * 4);
        for (let k = 0; k < per; k++) { const i = w * per + k; if (i >= 4096) break; idx[i] = (word >>> (k * bits)) & mask; }
      }
      p += words * 4;
    }
    const n = bits === 0 ? 1 : v.readInt32LE(p);
    if (bits !== 0) p += 4;
    const palette: Palette[] = [];
    const r = new NbtReader(v, p);
    for (let i = 0; i < n; i++) { const c = r.read() as { name: string; states?: Record<string, Nbt> }; palette.push({ name: c.name, states: c.states ?? {} }); }
    p = r.p;
    if (l === 0) first = { palette, idx };
    else if (l === 1) { water = new Uint8Array(4096); const wi = palette.findIndex((q) => q.name.endsWith('water')); if (wi >= 0) for (let i = 0; i < 4096; i++) water[i] = idx[i] === wi ? 1 : 0; }
  }
  return first ? { ...first, water } : null;
}
