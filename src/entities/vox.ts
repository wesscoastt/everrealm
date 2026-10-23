import * as THREE from 'three';

// Voxel sculpting: a creature or a mount built the way the world is, out of small cubes. Solids
// (ellipsoids, boxes, tapered capsules, cones) are filled into a grid of cubes `s` on a side; each
// cube takes its colour from a paint function (stripes, scales, scutes, feathers, rivets), varied a
// little cube by cube so a coat reads as pixels and not as plastic. Only the faces open to the air
// are meshed, with a little light baked in (tops bright, undersides dark) on top of the scene's own.

/** Colours a cube: its centre in the part's own frame, and a steady random 0..1 for that cube. */
export type Paint = (x: number, y: number, z: number, n: number) => string;
type V3 = [number, number, number];

const colours = new Map<string, THREE.Color>();
const col = (hex: string) => { let c = colours.get(hex); if (!c) { c = new THREE.Color(hex); colours.set(hex, c); } return c; };
const hash3 = (i: number, j: number, k: number) => { let h = (i * 374761393 + j * 668265263 + k * 2147483647) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967295; };

/** A colour lighter (k > 1) or darker (k < 1). */
export function shade(hex: string, k: number): string {
  const c = col(hex).clone().multiplyScalar(k);
  return '#' + c.getHexString();
}

const FACES: { n: V3; c: V3[]; light: number }[] = [
  { n: [1, 0, 0], c: [[1, 0, 0], [1, 1, 0], [1, 1, 1], [1, 0, 1]], light: 0.86 },
  { n: [-1, 0, 0], c: [[0, 0, 1], [0, 1, 1], [0, 1, 0], [0, 0, 0]], light: 0.86 },
  { n: [0, 1, 0], c: [[0, 1, 0], [0, 1, 1], [1, 1, 1], [1, 1, 0]], light: 1.0 },
  { n: [0, -1, 0], c: [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]], light: 0.62 },
  { n: [0, 0, 1], c: [[1, 0, 1], [1, 1, 1], [0, 1, 1], [0, 0, 1]], light: 0.93 },
  { n: [0, 0, -1], c: [[0, 0, 0], [0, 1, 0], [1, 1, 0], [1, 0, 0]], light: 0.8 },
];

/** One shared material: the colour is in the cubes. */
export const VOX_MAT = new THREE.MeshLambertMaterial({ vertexColors: true });

export class Vox {
  private cells = new Map<number, string>();
  constructor(readonly s = 0.07) {}
  private key(i: number, j: number, k: number) { return ((i + 512) * 1024 + (j + 512)) * 1024 + (k + 512); }
  private put(i: number, j: number, k: number, paint: Paint) {
    const s = this.s;
    this.cells.set(this.key(i, j, k), paint((i + 0.5) * s, (j + 0.5) * s, (k + 0.5) * s, hash3(i, j, k)));
  }
  /** Fill every cube whose centre passes the test, inside the box. */
  fill(lo: V3, hi: V3, inside: (x: number, y: number, z: number) => boolean, paint: Paint): this {
    const s = this.s;
    for (let i = Math.floor(lo[0] / s); i <= Math.ceil(hi[0] / s); i++) for (let j = Math.floor(lo[1] / s); j <= Math.ceil(hi[1] / s); j++) for (let k = Math.floor(lo[2] / s); k <= Math.ceil(hi[2] / s); k++) {
      if (inside((i + 0.5) * s, (j + 0.5) * s, (k + 0.5) * s)) this.put(i, j, k, paint);
    }
    return this;
  }
  ellipsoid(c: V3, r: V3, paint: Paint): this {
    return this.fill([c[0] - r[0], c[1] - r[1], c[2] - r[2]], [c[0] + r[0], c[1] + r[1], c[2] + r[2]], (x, y, z) => ((x - c[0]) / r[0]) ** 2 + ((y - c[1]) / r[1]) ** 2 + ((z - c[2]) / r[2]) ** 2 <= 1, paint);
  }
  box(lo: V3, hi: V3, paint: Paint): this { return this.fill(lo, hi, (x, y, z) => x >= lo[0] && x <= hi[0] && y >= lo[1] && y <= hi[1] && z >= lo[2] && z <= hi[2], paint); }
  /** A limb, a neck or a tail: round, from a to b, its radius going from ra to rb. */
  capsule(a: V3, b: V3, ra: number, rb: number, paint: Paint): this {
    const d: V3 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], L2 = d[0] ** 2 + d[1] ** 2 + d[2] ** 2 || 1e-6, R = Math.max(ra, rb);
    return this.fill([Math.min(a[0], b[0]) - R, Math.min(a[1], b[1]) - R, Math.min(a[2], b[2]) - R], [Math.max(a[0], b[0]) + R, Math.max(a[1], b[1]) + R, Math.max(a[2], b[2]) + R], (x, y, z) => {
      const t = Math.max(0, Math.min(1, ((x - a[0]) * d[0] + (y - a[1]) * d[1] + (z - a[2]) * d[2]) / L2));
      const px = a[0] + d[0] * t - x, py = a[1] + d[1] * t - y, pz = a[2] + d[2] * t - z;
      return px * px + py * py + pz * pz <= (ra + (rb - ra) * t) ** 2;
    }, paint);
  }
  /** A horn, a spine or a tooth: a capsule closing to a point. */
  cone(base: V3, tip: V3, r: number, paint: Paint): this { return this.capsule(base, tip, r, this.s * 0.4, paint); }
  /** A web or a sheet (a wing's membrane, a row of flight feathers, a fin): the triangle a-b-c, `thick` through. */
  tri(a: V3, b: V3, c: V3, thick: number, paint: Paint): this {
    const u: V3 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], v: V3 = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
    const n: V3 = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
    const nl = Math.hypot(...n) || 1e-6;
    const uu = u[0] ** 2 + u[1] ** 2 + u[2] ** 2, vv = v[0] ** 2 + v[1] ** 2 + v[2] ** 2, uv = u[0] * v[0] + u[1] * v[1] + u[2] * v[2], den = uu * vv - uv * uv || 1e-6;
    const lo: V3 = [0, 1, 2].map((i) => Math.min(a[i], b[i], c[i]) - thick) as V3, hi: V3 = [0, 1, 2].map((i) => Math.max(a[i], b[i], c[i]) + thick) as V3;
    return this.fill(lo, hi, (x, y, z) => {
      const w: V3 = [x - a[0], y - a[1], z - a[2]];
      if (Math.abs((w[0] * n[0] + w[1] * n[1] + w[2] * n[2]) / nl) > thick / 2) return false;
      const wu = w[0] * u[0] + w[1] * u[1] + w[2] * u[2], wv = w[0] * v[0] + w[1] * v[1] + w[2] * v[2];
      const s = (vv * wu - uv * wv) / den, t = (uu * wv - uv * wu) / den;
      return s >= -0.02 && t >= -0.02 && s + t <= 1.02;
    }, paint);
  }
  /** Take cubes away (a mouth, a gap between toes). */
  carve(inside: (x: number, y: number, z: number) => boolean): this {
    const s = this.s;
    for (const k of [...this.cells.keys()]) {
      const i = Math.floor(k / (1024 * 1024)) - 512, j = (Math.floor(k / 1024) % 1024) - 512, kk = (k % 1024) - 512;
      if (inside((i + 0.5) * s, (j + 0.5) * s, (kk + 0.5) * s)) this.cells.delete(k);
    }
    return this;
  }
  get size(): number { return this.cells.size; }
  /** The faces open to the air, as one mesh in the part's frame. */
  mesh(): THREE.Mesh {
    const s = this.s, pos: number[] = [], nor: number[] = [], clr: number[] = [], idx: number[] = [];
    for (const [k, hex] of this.cells) {
      const i = Math.floor(k / (1024 * 1024)) - 512, j = (Math.floor(k / 1024) % 1024) - 512, kk = (k % 1024) - 512;
      const n = hash3(i, j, kk), c = col(hex);
      for (const f of FACES) {
        if (this.cells.has(this.key(i + f.n[0], j + f.n[1], kk + f.n[2]))) continue;
        const v0 = pos.length / 3, b = f.light * (0.93 + n * 0.12);
        for (const [cx, cy, cz] of f.c) { pos.push((i + cx) * s, (j + cy) * s, (kk + cz) * s); nor.push(...f.n); clr.push(c.r * b, c.g * b, c.b * b); }
        idx.push(v0, v0 + 1, v0 + 2, v0, v0 + 2, v0 + 3);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(clr, 3));
    g.setIndex(idx);
    g.computeBoundingSphere();
    const m = new THREE.Mesh(g, VOX_MAT);
    m.castShadow = true;
    m.userData.plain = true;
    return m;
  }
}
