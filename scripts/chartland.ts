// One land's chart for the world map (ui/Hud.ts): painted from the terrain as the in-game chart is,
// written as a PNG with its towns. Run by scripts/charts.mjs once per land (Morrow's process sets
// the land before anything imports it).
import fs from 'node:fs';
import zlib from 'node:zlib';
import { chartPixels } from '../src/world/atlas';
import { POSTS } from '../src/data/travel';
import { LAND } from '../src/world/land';
import { WMIN, WSIZE } from '../src/world/VoxelWorld';

const SIZE = 800;
function png(w: number, h: number, rgba: Uint8ClampedArray): Buffer {
  const crcTable = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
  const crc = (b: Buffer) => { let c = 0xffffffff; for (const x of b) c = crcTable[(c ^ x) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  const chunk = (type: string, data: Buffer) => { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type), data]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([len, td, c]); };
  const raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) { raw[y * (w * 3 + 1)] = 0; for (let x = 0; x < w; x++) { const i = (y * w + x) * 4, o = y * (w * 3 + 1) + 1 + x * 3; raw[o] = rgba[i]; raw[o + 1] = rgba[i + 1]; raw[o + 2] = rgba[i + 2]; } }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}
fs.writeFileSync(`public/maps/${LAND}.png`, png(SIZE, SIZE, chartPixels(SIZE)));
fs.writeFileSync(`public/maps/${LAND}.json`, JSON.stringify({ wmin: WMIN, wsize: WSIZE, towns: POSTS.filter((p) => !p.name.includes('(')).map((p) => ({ name: p.name.replace(/, south gate$/, ''), x: Math.round(p.x), z: Math.round(p.z) })) }));
console.log(LAND, 'chart written');
