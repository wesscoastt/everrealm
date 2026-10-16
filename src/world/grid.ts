// Fixed-size voxel grid used to author Hollindale before it is copied into the streamed world.
import { B, isSolid } from './blocks';

export const SX = 320;
export const SY = 64;
export const SZ = 320;
export const CHUNK = 32;
export const CX = SX / CHUNK;
export const CZ = SZ / CHUNK;
export const WATER_LEVEL = 16; // top surface of the Wend at the village

export interface RayHit {
  x: number;
  y: number;
  z: number;
  id: number;
  nx: number;
  ny: number;
  nz: number;
  distance: number;
}

export class Grid {
  readonly data = new Uint8Array(SX * SY * SZ);
  /** Per-chunk tint seed (biome colour multipliers) live in the mesher; we only track dirt here. */
  readonly dirty = new Set<number>();
  private listeners: ((cx: number, cz: number) => void)[] = [];

  idx(x: number, y: number, z: number): number {
    return x + SX * (z + SZ * y);
  }

  inBounds(x: number, y: number, z: number): boolean {
    return x >= 0 && y >= 0 && z >= 0 && x < SX && y < SY && z < SZ;
  }

  get(x: number, y: number, z: number): number {
    if (x < 0 || z < 0 || x >= SX || z >= SZ) return B.Stone; // walls of the world
    if (y < 0) return B.Stone;
    if (y >= SY) return B.Air;
    return this.data[x + SX * (z + SZ * y)];
  }

  /** Raw set used during generation (no remesh bookkeeping). */
  put(x: number, y: number, z: number, id: number): void {
    if (!this.inBounds(x, y, z)) return;
    this.data[x + SX * (z + SZ * y)] = id;
  }

  /** Runtime set: marks the owning chunk and edge neighbours dirty. */
  set(x: number, y: number, z: number, id: number): void {
    if (!this.inBounds(x, y, z)) return;
    const i = x + SX * (z + SZ * y);
    if (this.data[i] === id) return;
    this.data[i] = id;
    const cx = Math.floor(x / CHUNK);
    const cz = Math.floor(z / CHUNK);
    this.markDirty(cx, cz);
    const lx = x % CHUNK;
    const lz = z % CHUNK;
    if (lx === 0) this.markDirty(cx - 1, cz);
    if (lx === CHUNK - 1) this.markDirty(cx + 1, cz);
    if (lz === 0) this.markDirty(cx, cz - 1);
    if (lz === CHUNK - 1) this.markDirty(cx, cz + 1);
  }

  markDirty(cx: number, cz: number): void {
    if (cx < 0 || cz < 0 || cx >= CX || cz >= CZ) return;
    this.dirty.add(cx + cz * CX);
  }

  onRemesh(fn: (cx: number, cz: number) => void): void {
    this.listeners.push(fn);
  }

  flush(max = 4): void {
    let n = 0;
    for (const key of this.dirty) {
      this.dirty.delete(key);
      const cx = key % CX;
      const cz = Math.floor(key / CX);
      for (const fn of this.listeners) fn(cx, cz);
      if (++n >= max) break;
    }
  }

  solidAt(x: number, y: number, z: number): boolean {
    return isSolid(this.get(Math.floor(x), Math.floor(y), Math.floor(z)));
  }

  /** Highest solid block y (top face sits at y+1). -1 if none. */
  topSolid(x: number, z: number, from = SY - 1): number {
    const ix = Math.floor(x), iz = Math.floor(z);
    if (ix < 0 || iz < 0 || ix >= SX || iz >= SZ) return 0;
    for (let y = Math.min(from, SY - 1); y >= 0; y--) {
      const id = this.data[ix + SX * (iz + SZ * y)];
      if (id !== B.Air && id !== B.Water && isSolid(id)) return y;
    }
    return -1;
  }

  /** Ground height under a point, searching down from a given height (supports caves and bridges). */
  groundBelow(x: number, y: number, z: number): number {
    const ix = Math.floor(x), iz = Math.floor(z);
    for (let yy = Math.min(SY - 1, Math.floor(y)); yy >= 0; yy--) {
      if (isSolid(this.get(ix, yy, iz))) return yy + 1;
    }
    return 0;
  }

  isWater(x: number, y: number, z: number): boolean {
    return this.get(Math.floor(x), Math.floor(y), Math.floor(z)) === B.Water;
  }

  /** Voxel DDA ray cast. Returns first non-air, non-water block within maxDist. */
  raycast(ox: number, oy: number, oz: number, dx: number, dy: number, dz: number, maxDist: number, hitWater = false): RayHit | null {
    let x = Math.floor(ox), y = Math.floor(oy), z = Math.floor(oz);
    const stepX = dx > 0 ? 1 : -1, stepY = dy > 0 ? 1 : -1, stepZ = dz > 0 ? 1 : -1;
    const tDeltaX = Math.abs(1 / (dx || 1e-9));
    const tDeltaY = Math.abs(1 / (dy || 1e-9));
    const tDeltaZ = Math.abs(1 / (dz || 1e-9));
    let tMaxX = (dx > 0 ? x + 1 - ox : ox - x) * tDeltaX;
    let tMaxY = (dy > 0 ? y + 1 - oy : oy - y) * tDeltaY;
    let tMaxZ = (dz > 0 ? z + 1 - oz : oz - z) * tDeltaZ;
    let nx = 0, ny = 0, nz = 0, t = 0;
    while (t <= maxDist) {
      const id = this.get(x, y, z);
      if (id !== B.Air && id !== B.Barrier && (id !== B.Water || hitWater)) {
        return { x, y, z, id, nx, ny, nz, distance: t };
      }
      if (tMaxX < tMaxY && tMaxX < tMaxZ) {
        x += stepX; t = tMaxX; tMaxX += tDeltaX; nx = -stepX; ny = 0; nz = 0;
      } else if (tMaxY < tMaxZ) {
        y += stepY; t = tMaxY; tMaxY += tDeltaY; nx = 0; ny = -stepY; nz = 0;
      } else {
        z += stepZ; t = tMaxZ; tMaxZ += tDeltaZ; nx = 0; ny = 0; nz = -stepZ;
      }
    }
    return null;
  }
}
