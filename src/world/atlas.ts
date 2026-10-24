import { createSeededRandom } from '../utils/random';
import { smoothstep } from './noise';
import { baseHeight, lakeDist, regionAt, RegionId, riverDist, roadDist, SEA } from './terrain';
import { WMIN, WSIZE } from './VoxelWorld';

// The Charter's chart of the continent: what every map in the realm shows before you have walked
// it. Painted once, at low resolution, from the terrain functions: the sea and the coast, each
// region in its own muted ink, hill shading, rivers, lakes and the roads. The world map draws the
// land you have explored over it in full detail.

const INK: Record<RegionId, [number, number, number]> = {
  greenwake: [150, 172, 112],
  crownroad: [196, 182, 116],
  brambledeep: [104, 134, 88],
  saltwind: [206, 192, 150],
  redstone: [192, 132, 92],
  starfall: [176, 182, 194],
  gannet: [172, 192, 128],
  wrath: [146, 156, 110],
  tolmen: [158, 130, 128],
  inkholm: [140, 128, 156],
  kell: [132, 120, 112],
  keys: [214, 204, 150], glades: [120, 150, 96], amberwold: [186, 132, 70], bright: [190, 184, 130], sunder: [150, 160, 140], glassflats: [210, 190, 150], greywaste: [126, 132, 124], held: [200, 208, 216],
};

const charts: (HTMLCanvasElement | undefined)[] = [];

/**
 * One square of the world at sixteen blocks a pixel: half 0 the Counties' (WMIN..WMAX on both axes),
 * half 1 Morrow's east of it (WMAX..WMAX + WSIZE along x). Each is painted the first time it's wanted.
 */
export function continentChart(half: 0 | 1 = 0, size = WSIZE / 16): HTMLCanvasElement {
  const hit = charts[half];
  if (hit) return hit;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const x = c.getContext('2d')!;
  const img = x.createImageData(size, size);
  img.data.set(chartPixels(size, WMIN + half * WSIZE));
  x.putImageData(img, 0, 0);
  charts[half] = c;
  return c;
}

/** The chart's pixels (RGBA, size by size): for the canvas above, and for the world map's images of each land (scripts/charts.ts). */
export function chartPixels(size: number, x0 = WMIN): Uint8ClampedArray {
  const step = WSIZE / size;
  const h = new Float32Array(size * size);
  for (let j = 0; j < size; j++) for (let i = 0; i < size; i++) h[j * size + i] = baseHeight(x0 + (i + 0.5) * step, WMIN + (j + 0.5) * step);
  const data = new Uint8ClampedArray(size * size * 4);
  const rnd = createSeededRandom(4242);
  for (let j = 0; j < size; j++) for (let i = 0; i < size; i++) {
    const wx = x0 + (i + 0.5) * step, wz = WMIN + (j + 0.5) * step, k = j * size + i, o = k * 4;
    const ht = h[k];
    let r: number, g: number, b: number;
    if (ht <= SEA) {
      // Sea: deeper is darker, with a pale band along the shore
      const depth = Math.min(1, (SEA - ht) / 12);
      r = 128 - depth * 40; g = 164 - depth * 40; b = 178 - depth * 30;
      const shore = j > 0 && i > 0 && (h[k - 1] > SEA || h[k - size] > SEA);
      if (shore) { r += 30; g += 30; b += 24; }
    } else {
      const reg = regionAt(wx, wz);
      [r, g, b] = INK[reg.a];
      if (reg.a === 'greenwake') {
        // The vale's grid is square; on the chart its colour fades out round the rim instead
        const v = smoothstep(150, 290, Math.hypot(wx - 165, wz - 165) + (rnd() - 0.5) * 6);
        const o = INK[regionAt(Math.max(330, wx), Math.max(330, wz)).a];
        r += (o[0] - r) * v; g += (o[1] - g) * v; b += (o[2] - b) * v;
      }
      // Hill shading from the north-west, and higher ground paler
      const west = i > 0 ? h[k - 1] : ht, north = j > 0 ? h[k - size] : ht;
      const shade = Math.max(-0.35, Math.min(0.35, (ht - west + ht - north) * 0.05));
      const lift = Math.min(0.35, Math.max(0, (ht - 40) / 140));
      r = r * (1 + shade) + (255 - r) * lift; g = g * (1 + shade) + (255 - g) * lift; b = b * (1 + shade) + (255 - b) * lift;
      if (riverDist(wx, wz) < step * 0.44 || lakeDist(wx, wz) < 1) { r = 104; g = 146; b = 170; }
      else if (roadDist(wx, wz) < step * 0.28 && (i + j) % 3 !== 0) { r = 122; g = 92; b = 58; }
    }
    // Paper grain
    const n = (rnd() - 0.5) * 10;
    data[o] = r + n; data[o + 1] = g + n; data[o + 2] = b + n; data[o + 3] = 255;
  }
  return data;
}

