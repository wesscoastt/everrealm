import * as THREE from 'three';
import { T } from './blocks';
import { createSeededRandom } from '../utils/random';

// Procedurally painted block tiles. Alpha channel conventions:
//   0         -> cut out (leaf holes)
//   ~0.75     -> emissive pixel (window glass, ore glints, glowcaps)
//   1         -> ordinary opaque pixel

export const TILE = 32;
const EMIT_A = 190;

type RGB = [number, number, number];
type Px = { data: Uint8ClampedArray; rnd: () => number };

const hex = (h: string): RGB => {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const mix = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const mul = (a: RGB, f: number): RGB => [a[0] * f, a[1] * f, a[2] * f];

function hash2(x: number, y: number, s: number): number {
  let h = (x * 374761393 + y * 668265263 + s * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** Smooth tileable value noise on the 32 grid at a given cell size. */
function vnoise(x: number, y: number, cell: number, seed: number): number {
  const n = TILE / cell;
  const gx = x / cell;
  const gy = y / cell;
  const x0 = Math.floor(gx);
  const y0 = Math.floor(gy);
  const fx = gx - x0;
  const fy = gy - y0;
  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);
  const h = (a: number, b: number) => hash2(((a % n) + n) % n, ((b % n) + n) % n, seed);
  const a = h(x0, y0) + (h(x0 + 1, y0) - h(x0, y0)) * sx;
  const b = h(x0, y0 + 1) + (h(x0 + 1, y0 + 1) - h(x0, y0 + 1)) * sx;
  return a + (b - a) * sy;
}

function fbm(x: number, y: number, seed: number): number {
  return vnoise(x, y, 16, seed) * 0.5 + vnoise(x, y, 8, seed + 1) * 0.3 + vnoise(x, y, 4, seed + 2) * 0.2;
}

function set(p: Px, x: number, y: number, c: RGB, a = 255): void {
  if (x < 0 || y < 0 || x >= TILE || y >= TILE) return;
  const i = (y * TILE + x) * 4;
  p.data[i] = c[0];
  p.data[i + 1] = c[1];
  p.data[i + 2] = c[2];
  p.data[i + 3] = a;
}
function get(p: Px, x: number, y: number): RGB {
  const i = (((y + TILE) % TILE) * TILE + ((x + TILE) % TILE)) * 4;
  return [p.data[i], p.data[i + 1], p.data[i + 2]];
}

/** Base fill with a three-shade painterly ramp driven by fbm. */
function base(p: Px, dark: string, mid: string, light: string, seed: number, grain = 0.1): void {
  const d = hex(dark), m = hex(mid), l = hex(light);
  for (let y = 0; y < TILE; y++) for (let x = 0; x < TILE; x++) {
    const n = fbm(x, y, seed) + (p.rnd() - 0.5) * grain;
    const c = n < 0.5 ? mix(d, m, Math.max(0, n * 2)) : mix(m, l, Math.min(1, (n - 0.5) * 2));
    set(p, x, y, c);
  }
}

function speckle(p: Px, color: string, count: number, size = 1, alpha = 255): void {
  const c = hex(color);
  for (let i = 0; i < count; i++) {
    const x = Math.floor(p.rnd() * TILE);
    const y = Math.floor(p.rnd() * TILE);
    for (let dy = 0; dy < size; dy++) for (let dx = 0; dx < size; dx++) set(p, x + dx, y + dy, c, alpha);
  }
}

function blob(p: Px, cx: number, cy: number, r: number, c: RGB, hi?: RGB, alpha = 255): void {
  for (let y = -r - 1; y <= r + 1; y++) for (let x = -r - 1; x <= r + 1; x++) {
    const d = Math.hypot(x, y);
    if (d <= r + (p.rnd() - 0.5) * 0.6) {
      const shade = hi && x + y < -r * 0.4 ? hi : c;
      set(p, (cx + x + TILE) % TILE, (cy + y + TILE) % TILE, mul(shade, 0.92 + p.rnd() * 0.12), alpha);
    }
  }
}

function crack(p: Px, color: string, len: number): void {
  const c = hex(color);
  let x = Math.floor(p.rnd() * TILE);
  let y = Math.floor(p.rnd() * TILE);
  for (let i = 0; i < len; i++) {
    set(p, x, y, mul(mix(get(p, x, y), c, 0.7), 1));
    x += Math.round(p.rnd() * 2 - 1);
    y += p.rnd() < 0.6 ? 1 : 0;
  }
}

function stoneBase(p: Px, seed: number, dark = '#5d6066', mid = '#7f8389', light = '#9da1a6'): void {
  base(p, dark, mid, light, seed, 0.12);
  for (let i = 0; i < 4; i++) crack(p, '#4a4c52', 6 + Math.floor(p.rnd() * 8));
  // Soft lit facets
  for (let i = 0; i < 5; i++) {
    const cx = Math.floor(p.rnd() * TILE), cy = Math.floor(p.rnd() * TILE);
    for (let y = 0; y < 4; y++) for (let x = 0; x < 6 - y; x++) set(p, cx + x, cy + y, mul(get(p, cx + x, cy + y), 1.08));
  }
}

function bricks(p: Px, rowH: number, brickW: number, mortar: string, b1: string, b2: string, seed: number): void {
  const m = hex(mortar);
  base(p, b1, b2, b2, seed, 0.15);
  for (let y = 0; y < TILE; y++) {
    const row = Math.floor(y / rowH);
    const off = row % 2 ? brickW / 2 : 0;
    for (let x = 0; x < TILE; x++) {
      const lx = (x + off) % brickW;
      const ly = y % rowH;
      if (ly === rowH - 1 || lx === brickW - 1) set(p, x, y, mul(m, 0.95 + p.rnd() * 0.1));
      else if (ly === 0 || lx === 0) set(p, x, y, mul(get(p, x, y), 1.12));
      else if (ly === rowH - 2) set(p, x, y, mul(get(p, x, y), 0.88));
    }
  }
}

function leaves(p: Px, dark: string, mid: string, light: string, seed: number, holes: number): void {
  base(p, dark, mid, light, seed, 0.25);
  const d = hex(dark), l = hex(light);
  // Leaf clusters: lit top-left, shadowed bottom-right
  for (let i = 0; i < 26; i++) {
    const cx = Math.floor(p.rnd() * TILE), cy = Math.floor(p.rnd() * TILE);
    blob(p, cx, cy, 1 + Math.floor(p.rnd() * 2), mix(d, l, 0.5), l);
    set(p, cx + 1, cy + 2, mul(d, 0.8));
  }
  for (let i = 0; i < holes; i++) {
    const x = Math.floor(p.rnd() * TILE), y = Math.floor(p.rnd() * TILE);
    set(p, x, y, [0, 0, 0], 0);
    if (p.rnd() < 0.5) set(p, x + 1, y, [0, 0, 0], 0);
  }
}

function bark(p: Px, dark: string, mid: string, light: string, seed: number): void {
  const d = hex(dark), m = hex(mid), l = hex(light);
  for (let x = 0; x < TILE; x++) {
    const stripe = vnoise(x, 0, 4, seed);
    for (let y = 0; y < TILE; y++) {
      const n = stripe * 0.7 + vnoise(x, y, 8, seed + 3) * 0.3 + (p.rnd() - 0.5) * 0.1;
      let c = n < 0.5 ? mix(d, m, n * 2) : mix(m, l, (n - 0.5) * 2);
      if (stripe < 0.28) c = mul(d, 0.8);
      set(p, x, y, c);
    }
  }
}

function planks(p: Px, dark: string, mid: string, light: string, seed: number): void {
  base(p, dark, mid, light, seed, 0.08);
  const d = hex(dark);
  for (let y = 0; y < TILE; y++) {
    const board = Math.floor(y / 8);
    for (let x = 0; x < TILE; x++) {
      const grain = Math.sin((x + board * 13) * 0.45 + vnoise(x, y, 8, seed + board) * 6) * 0.06;
      set(p, x, y, mul(get(p, x, y), 1 + grain + (board % 2 ? -0.04 : 0.03)));
    }
    if (y % 8 === 7) for (let x = 0; x < TILE; x++) set(p, x, y, mul(d, 0.75));
    if (y % 8 === 0) for (let x = 0; x < TILE; x++) set(p, x, y, mul(get(p, x, y), 1.12));
  }
  for (let b = 0; b < 4; b++) {
    const seam = (b * 11 + 5) % TILE;
    for (let y = b * 8; y < b * 8 + 7; y++) set(p, seam, y, mul(d, 0.8));
    set(p, (seam + 2) % TILE, b * 8 + 3, hex('#3a2a1c'));
  }
}

function ore(p: Px, seed: number, c1: string, c2: string, hi: string, clusters: number, glint: boolean): void {
  stoneBase(p, seed);
  const a = hex(c1), b = hex(c2), h = hex(hi);
  for (let i = 0; i < clusters; i++) {
    const cx = 3 + Math.floor(p.rnd() * 26), cy = 3 + Math.floor(p.rnd() * 26);
    const r = 1 + Math.floor(p.rnd() * 2.2);
    blob(p, cx, cy, r + 1, mul(a, 0.55));
    blob(p, cx, cy, r, i % 3 === 2 ? b : a, h);
    set(p, cx - 1, cy - 1, h, glint ? EMIT_A : 255);
  }
}

const painters: Record<number, (p: Px) => void> = {
  [T.GrassTop]: (p) => {
    base(p, '#4a7e2b', '#5e9634', '#76ad42', 11, 0.18);
    for (let i = 0; i < 90; i++) {
      const x = Math.floor(p.rnd() * TILE), y = Math.floor(p.rnd() * TILE);
      set(p, x, y, mul(get(p, x, y), 1.18));
      set(p, x, y + 1, mul(get(p, x, y + 1), 0.86));
    }
  },
  [T.GrassSide]: (p) => {
    painters[T.Dirt](p);
    const g = [hex('#4f8a2e'), hex('#609a36'), hex('#77ae44')];
    for (let x = 0; x < TILE; x++) {
      const depth = 5 + Math.floor(vnoise(x, 0, 4, 7) * 5) + (p.rnd() < 0.2 ? 2 : 0);
      for (let y = 0; y < depth; y++) {
        const c = y === 0 ? g[2] : y < depth - 2 ? g[1] : g[0];
        set(p, x, y, mul(c, 0.92 + p.rnd() * 0.14));
      }
      set(p, x, depth, mul(get(p, x, depth), 0.7));
    }
  },
  [T.Dirt]: (p) => {
    base(p, '#6b4428', '#87573a', '#9d6a47', 21, 0.15);
    speckle(p, '#5a3820', 40, 1);
    speckle(p, '#a88466', 14, 1);
    speckle(p, '#7d7a72', 5, 2);
  },
  [T.Stone]: (p) => stoneBase(p, 31),
  [T.Cobble]: (p) => {
    base(p, '#4c4e52', '#55575c', '#5d6065', 41, 0.05);
    const pts: [number, number, number][] = [];
    for (let i = 0; i < 11; i++) pts.push([p.rnd() * TILE, p.rnd() * TILE, 0.8 + p.rnd() * 0.4]);
    for (let y = 0; y < TILE; y++) for (let x = 0; x < TILE; x++) {
      let best = 1e9, second = 1e9, bi = 0;
      for (let i = 0; i < pts.length; i++) {
        for (let ox = -1; ox <= 1; ox++) for (let oy = -1; oy <= 1; oy++) {
          const d = Math.hypot(x - pts[i][0] - ox * TILE, y - pts[i][1] - oy * TILE);
          if (d < best) { second = best; best = d; bi = i; } else if (d < second) second = d;
        }
      }
      const edge = second - best;
      if (edge < 1.4) continue;
      const tone = pts[bi][2];
      const lit = 1 + Math.max(0, 0.2 - best * 0.03);
      set(p, x, y, mul(mix(hex('#7c7f85'), hex('#a3a6aa'), (Math.sin(bi * 3.1) + 1) / 2), tone * lit * (edge < 2.4 ? 0.85 : 1)));
    }
  },
  [T.Sand]: (p) => {
    base(p, '#d4bb7a', '#e2cb8d', '#efdba2', 51, 0.12);
    speckle(p, '#b89c5e', 30);
    speckle(p, '#fff0c8', 14);
  },
  [T.Gravel]: (p) => {
    base(p, '#6e6862', '#837d76', '#9a948c', 61, 0.1);
    for (let i = 0; i < 30; i++) blob(p, Math.floor(p.rnd() * TILE), Math.floor(p.rnd() * TILE), 1, mix(hex('#6d6a66'), hex('#a8a29a'), p.rnd()), hex('#b8b2aa'));
  },
  [T.Snow]: (p) => {
    base(p, '#dfe7f0', '#eef3f8', '#ffffff', 71, 0.05);
    speckle(p, '#c9d6e6', 20);
  },
  [T.OakLog]: (p) => bark(p, '#3f2a19', '#5f4128', '#7a5636', 81),
  [T.LogTop]: (p) => {
    for (let y = 0; y < TILE; y++) for (let x = 0; x < TILE; x++) {
      const d = Math.hypot(x - 15.5, y - 15.5);
      const ring = Math.sin(d * 1.3 + vnoise(x, y, 8, 3) * 2) * 0.5 + 0.5;
      let c = mix(hex('#a07a4c'), hex('#c49a64'), ring);
      if (d > 13.5) c = mul(hex('#5f4128'), 0.9 + p.rnd() * 0.2);
      set(p, x, y, c);
    }
  },
  [T.OakLeaves]: (p) => leaves(p, '#2f6a22', '#47902f', '#69b23e', 91, 50),
  [T.Planks]: (p) => planks(p, '#7d5532', '#9c6d40', '#b9884f', 101),
  [T.DarkPlanks]: (p) => planks(p, '#3c2718', '#523621', '#66452b', 111),
  [T.Plaster]: (p) => {
    base(p, '#d6c9a8', '#e6dbbd', '#f2e9d0', 121, 0.06);
    crack(p, '#b8aa88', 7);
    speckle(p, '#cbbd9a', 12);
  },
  [T.StoneBrick]: (p) => bricks(p, 8, 16, '#55565a', '#80838a', '#9a9da3', 131),
  [T.Path]: (p) => {
    base(p, '#8d6c47', '#a4835a', '#b8996c', 141, 0.15);
    for (let i = 0; i < 14; i++) blob(p, Math.floor(p.rnd() * TILE), Math.floor(p.rnd() * TILE), 1, hex('#8c8780'), hex('#b0aba3'));
    speckle(p, '#76573a', 30);
  },
  [T.CopperOre]: (p) => ore(p, 151, '#c8743a', '#4fae8c', '#ffb070', 7, false),
  [T.TinOre]: (p) => ore(p, 161, '#c6ccd2', '#9fa9b4', '#ffffff', 8, false),
  [T.SilverOre]: (p) => ore(p, 171, '#dfe8f2', '#b8c8de', '#ffffff', 6, true),
  [T.Depleted]: (p) => {
    stoneBase(p, 181, '#55575c', '#6f7278', '#8a8d93');
    for (let i = 0; i < 5; i++) {
      const sx = Math.floor(p.rnd() * 26), sy = Math.floor(p.rnd() * 26);
      for (let k = 0; k < 6; k++) { set(p, sx + k, sy + k, hex('#3e4045')); set(p, sx + k + 1, sy + k, hex('#a5a8ad')); }
    }
  },
  [T.BirchLog]: (p) => {
    base(p, '#d8d4c8', '#e8e4d8', '#f6f3ea', 191, 0.06);
    for (let i = 0; i < 14; i++) {
      const y = Math.floor(p.rnd() * TILE), x = Math.floor(p.rnd() * TILE), w = 2 + Math.floor(p.rnd() * 6);
      for (let k = 0; k < w; k++) set(p, x + k, y, hex('#2c2a28'));
    }
  },
  [T.BirchLeaves]: (p) => leaves(p, '#5d8a2a', '#7aa83a', '#a2c858', 201, 55),
  [T.PineLeaves]: (p) => leaves(p, '#1d4630', '#2b5e3e', '#3f7a50', 211, 40),
  [T.Clay]: (p) => {
    base(p, '#8f4a2e', '#a85a36', '#bf6e44', 221, 0.08);
    for (let y = 0; y < TILE; y += 8) for (let x = 0; x < TILE; x++) set(p, x, y + Math.floor(vnoise(x, y, 8, 5) * 2), hex('#c98a5a'));
  },
  [T.MossyStone]: (p) => {
    stoneBase(p, 231);
    for (let y = 0; y < TILE; y++) for (let x = 0; x < TILE; x++) if (fbm(x, y, 232) > 0.55) set(p, x, y, mul(mix(hex('#4d7a2c'), hex('#6c9a3a'), p.rnd()), 1));
  },
  [T.Window]: (p) => {
    planks(p, '#4a3220', '#5e4029', '#6f4d32', 241);
    for (let y = 4; y < 28; y++) for (let x = 4; x < 28; x++) {
      const frame = x === 15 || x === 16 || y === 15 || y === 16;
      if (frame) set(p, x, y, hex('#3a2617'));
      else {
        const g = mix(hex('#ffcf7a'), hex('#ffe9b8'), (x + y) / 56 + p.rnd() * 0.1);
        set(p, x, y, g, EMIT_A);
      }
    }
  },
  [T.Thatch]: (p) => {
    base(p, '#9a7a3a', '#b8954a', '#d4b264', 251, 0.1);
    for (let i = 0; i < 70; i++) {
      const x = Math.floor(p.rnd() * TILE), y = Math.floor(p.rnd() * TILE);
      for (let k = 0; k < 5; k++) set(p, x + (k >> 2), y + k, mul(get(p, x, y + k), k === 0 ? 1.2 : 0.95));
    }
  },
  [T.Farmland]: (p) => {
    base(p, '#3e2716', '#4f331e', '#5f3e25', 261, 0.1);
    for (let y = 0; y < TILE; y++) if (y % 8 < 2) for (let x = 0; x < TILE; x++) set(p, x, y, mul(get(p, x, y), 0.7));
  },
  [T.HayTop]: (p) => {
    base(p, '#b8902e', '#d2a83e', '#e8c45a', 271, 0.15);
    for (let y = 0; y < TILE; y++) for (let x = 0; x < TILE; x++) if (Math.sin(Math.hypot(x - 16, y - 16) * 1.2) > 0.7) set(p, x, y, mul(get(p, x, y), 0.85));
  },
  [T.HaySide]: (p) => {
    base(p, '#b8902e', '#d2a83e', '#e8c45a', 281, 0.15);
    for (let i = 0; i < 60; i++) { const x = Math.floor(p.rnd() * TILE), y = Math.floor(p.rnd() * TILE); for (let k = 0; k < 4; k++) set(p, x, y + k, mul(get(p, x, y + k), 1.15)); }
    for (const by of [7, 24]) for (let x = 0; x < TILE; x++) { set(p, x, by, hex('#8a2f22')); set(p, x, by + 1, hex('#6d241a')); }
  },
  [T.MossyCobble]: (p) => {
    painters[T.Cobble](p);
    for (let y = 0; y < TILE; y++) for (let x = 0; x < TILE; x++) if (fbm(x, y, 292) > 0.58) set(p, x, y, mix(hex('#4a7a2a'), hex('#6a9a3a'), p.rnd()));
  },
  [T.SnowSide]: (p) => {
    painters[T.Dirt](p);
    for (let x = 0; x < TILE; x++) {
      const depth = 4 + Math.floor(vnoise(x, 0, 4, 9) * 4);
      for (let y = 0; y < depth; y++) set(p, x, y, mul(hex('#eef3f8'), 0.94 + p.rnd() * 0.06));
    }
  },
  [T.DeepStone]: (p) => stoneBase(p, 301, '#3a3c44', '#4b4e57', '#5d606a'),
  [T.PineLog]: (p) => bark(p, '#33201a', '#4c2f24', '#633f30', 311),
  [T.Timber]: (p) => {
    bark(p, '#2c1d12', '#3d2918', '#4e3521', 321);
    for (let y = 0; y < TILE; y++) { set(p, 0, y, hex('#20150c')); set(p, 31, y, hex('#20150c')); }
  },
  [T.Glowcap]: (p) => {
    base(p, '#2a2622', '#3a342e', '#4a423a', 331, 0.1);
    for (let i = 0; i < 6; i++) {
      const cx = 3 + Math.floor(p.rnd() * 26), cy = 6 + Math.floor(p.rnd() * 22);
      for (let k = 1; k < 4; k++) set(p, cx, cy + k, hex('#cfd8d0'));
      blob(p, cx, cy, 2, hex('#57c8e8'), hex('#b8f4ff'), EMIT_A);
    }
  },
  [T.RoofRed]: (p) => roofTile(p, '#7d2e22', '#a9432f', '#c45c40'),
  [T.RedSand]: (p) => { base(p, '#a8502a', '#c06434', '#d47a42', 351, 0.12); speckle(p, '#8a3c1c', 30); speckle(p, '#e8a070', 14); },
  [T.TerraOrange]: (p) => { base(p, '#a85a2a', '#bc6a34', '#c87a40', 361, 0.05); for (let x = 0; x < TILE; x++) set(p, x, 10 + Math.floor(vnoise(x, 0, 8, 3) * 3), hex('#d89a5a')); },
  [T.TerraCream]: (p) => { base(p, '#c8a882', '#d8b892', '#e4c8a2', 371, 0.05); speckle(p, '#b89872', 20); },
  [T.TerraBrown]: (p) => { base(p, '#5a3424', '#6a3e2a', '#7a4a32', 381, 0.05); for (let x = 0; x < TILE; x++) set(p, x, 20 + Math.floor(vnoise(x, 0, 8, 4) * 3), hex('#4a2a1c')); },
  [T.IronOre]: (p) => ore(p, 391, '#c88a6a', '#8a5a4a', '#f0c0a0', 7, false),
  [T.Crystal]: (p) => {
    base(p, '#1a3a5a', '#2a5a8a', '#3a7ab0', 401, 0.1);
    for (let i = 0; i < 9; i++) {
      const cx = 2 + Math.floor(p.rnd() * 28), cy = 2 + Math.floor(p.rnd() * 28);
      for (let k = 0; k < 7; k++) { set(p, cx + (k >> 1), cy - k, hex(k < 2 ? '#e8fbff' : '#7fe0f4'), EMIT_A); set(p, cx + 1 + (k >> 1), cy - k, hex('#4ab8d8'), EMIT_A); }
    }
  },
  [T.Ice]: (p) => { base(p, '#8ab8d8', '#a8d0ea', '#c8e6f6', 411, 0.05); for (let i = 0; i < 5; i++) crack(p, '#e8f6ff', 10); },
  [T.Loam]: (p) => { base(p, '#2e2418', '#3a2e1e', '#4a3a26', 421, 0.12); for (let i = 0; i < 26; i++) blob(p, Math.floor(p.rnd() * TILE), Math.floor(p.rnd() * TILE), 1, p.rnd() < 0.5 ? hex('#5a6a2a') : hex('#7a4a22')); },
  [T.Basalt]: (p) => { base(p, '#2a2a30', '#36363e', '#44444c', 431, 0.1); for (let y = 0; y < TILE; y += 8) for (let x = 0; x < TILE; x++) set(p, x, y, hex('#1e1e24')); for (let x = 0; x < TILE; x += 8) for (let y = 0; y < TILE; y++) set(p, x + ((Math.floor(y / 8)) % 2) * 4, y, hex('#1e1e24')); },
};

function roofTile(p: Px, dark: string, mid: string, light: string): void {
  base(p, dark, mid, light, 341, 0.08);
  for (let y = 0; y < TILE; y++) {
    const row = Math.floor(y / 8);
    const off = row % 2 ? 4 : 0;
    for (let x = 0; x < TILE; x++) {
      const lx = (x + off) % 8;
      const ly = y % 8;
      let f = 1 - ly * 0.035;
      if (lx === 0) f *= 0.7;
      if (ly === 7) f *= 0.6;
      if (ly === 0) f *= 1.15;
      set(p, x, y, mul(get(p, x, y), f));
    }
  }
}

export function buildBlockTextureArray(): THREE.DataArrayTexture {
  const layers = T.Count;
  const data = new Uint8Array(TILE * TILE * 4 * layers);
  for (let layer = 0; layer < layers; layer++) {
    const px: Px = { data: new Uint8ClampedArray(TILE * TILE * 4), rnd: createSeededRandom(layer * 977 + 13) };
    const paint = painters[layer];
    if (paint) paint(px);
    else base(px, '#ff00ff', '#ff00ff', '#ff00ff', 1);
    // Flip vertically so row 0 is at the top of the face (v=1).
    for (let y = 0; y < TILE; y++) {
      const src = (TILE - 1 - y) * TILE * 4;
      data.set(px.data.subarray(src, src + TILE * 4), layer * TILE * TILE * 4 + y * TILE * 4);
    }
  }
  const tex = new THREE.DataArrayTexture(data, TILE, TILE, layers);
  tex.format = THREE.RGBAFormat;
  tex.type = THREE.UnsignedByteType;
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestMipmapLinearFilter;
  tex.generateMipmaps = true;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.needsUpdate = true;
  return tex;
}

/**
 * Thatch for roof meshes, whose V runs up the slope: straw strands lie down the slope in two
 * overlapping courses per tile, each shadowed under the butt ends of the course above.
 */
function thatchRoof(p: Px): void {
  const lo = hex('#7e6230'), mid = hex('#b08a42'), hi = hex('#d6b264');
  const strand: number[] = [];
  for (let x = 0; x < TILE; x++) strand.push(p.rnd());
  for (let y = 0; y < TILE; y++) {
    const c = y % 16; // 0 = top of a course (under the course above), 15 = its butt ends
    for (let x = 0; x < TILE; x++) {
      const s = strand[(x + (y >> 4) * 7) % TILE];
      let col = s < 0.5 ? mix(lo, mid, s * 2) : mix(mid, hi, (s - 0.5) * 2);
      if (c < 3) col = mul(col, 0.62 + c * 0.1); // shadow under the overhanging course
      else if (c > 12 && p.rnd() < 0.5) col = mul(col, 1.1); // sun-bleached butt ends
      col = mul(col, 0.94 + p.rnd() * 0.1);
      set(p, x, y, col);
    }
  }
  // A few darker weathered strands
  for (let i = 0; i < 26; i++) {
    const x = Math.floor(p.rnd() * TILE), y = Math.floor(p.rnd() * TILE);
    for (let k = 0; k < 6; k++) set(p, x, (y + k) % TILE, mul(get(p, x, (y + k) % TILE), 0.8));
  }
}

/** A standalone repeating canvas texture for authored meshes (roofs, cloth, wood trim). */
export function paintCanvasTexture(kind: 'roofRed' | 'roofBlue' | 'roofSlate' | 'thatch' | 'planks' | 'darkPlanks' | 'stone' | 'plaster' | 'cobble' | 'bark' | 'iron', size = 64): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = TILE;
  const ctx = canvas.getContext('2d')!;
  const img = ctx.createImageData(TILE, TILE);
  const px: Px = { data: img.data, rnd: createSeededRandom(kind.length * 31 + size) };
  switch (kind) {
    case 'roofRed': roofTile(px, '#6e2a1f', '#9c3e2c', '#bd5a3d'); break;
    case 'roofBlue': roofTile(px, '#1f3352', '#2f4c78', '#46679a'); break;
    case 'roofSlate': roofTile(px, '#2e3238', '#43484f', '#5a6068'); break;
    case 'thatch': thatchRoof(px); break;
    case 'planks': painters[T.Planks](px); break;
    case 'darkPlanks': painters[T.DarkPlanks](px); break;
    case 'stone': painters[T.StoneBrick](px); break;
    case 'plaster': painters[T.Plaster](px); break;
    case 'cobble': painters[T.Cobble](px); break;
    case 'bark': painters[T.OakLog](px); break;
    case 'iron': base(px, '#2e3034', '#3d4045', '#55585e', 777, 0.08); break;
  }
  for (let i = 3; i < img.data.length; i += 4) img.data[i] = 255;
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestMipmapLinearFilter;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
