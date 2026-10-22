import { B, isSolid } from './blocks';

// The streamed continent. Chunks are 32 x SY x 32 columns held sparsely: only chunks near the
// player exist in memory. Unloaded space reads as air above sea level and stone below, which
// is only ever seen by entities far outside the loaded radius.

/**
 * The world spans WMIN..WMAX blocks on both axes: the heartland (the old 0..2048 square and the
 * land grown past its edges), the outer lands across the sound, and the sea all round. Coordinates
 * can be negative.
 */
export const WMIN = -2304;
export const WMAX = 4096;
export const WSIZE = WMAX - WMIN;
/** Blocks to a pixel of the explored map (one picture of the whole world, kept in memory). */
export const MAP_SCALE = 2;
/** Upper bounds (exclusive) on x and z. */
export const WX = WMAX;
export const WZ = WMAX;
export const SY = 96;
export const CHUNK = 32;
export const CMIN = WMIN / CHUNK;
export const CMAX = WMAX / CHUNK;
export const CSPAN = CMAX - CMIN;
export const WATER_LEVEL = 16;
export const CHUNK_VOL = CHUNK * CHUNK * SY;

export const chunkKey = (cx: number, cz: number) => (cx - CMIN) + (cz - CMIN) * CSPAN;
export const keyChunk = (key: number): [number, number] => [(key % CSPAN) + CMIN, Math.floor(key / CSPAN) + CMIN];
export const inWorld = (x: number, z: number) => x >= WMIN && z >= WMIN && x < WMAX && z < WMAX;
export const chunkInWorld = (cx: number, cz: number) => cx >= CMIN && cz >= CMIN && cx < CMAX && cz < CMAX;
/** Chunk keys saved before the world grew past 0 (a 64-chunk square from the origin). */
export const legacyChunkKey = (key: number) => chunkKey(key % 64, Math.floor(key / 64));
/** Chunk keys saved before the outer lands (the world was -384..2432: chunks -12..76, 88 a row). */
export const v2ChunkKey = (key: number) => chunkKey((key % 88) - 12, Math.floor(key / 88) - 12);
export const localIdx = (lx: number, y: number, lz: number) => lx + CHUNK * (lz + CHUNK * y);

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

export class VoxelWorld {
  readonly chunks = new Map<number, Uint8Array>();
  readonly dirty = new Set<number>();
  private listeners: ((cx: number, cz: number) => void)[] = [];

  inBounds(x: number, y: number, z: number): boolean {
    return y >= 0 && y < SY && inWorld(x, z);
  }

  chunkAt(x: number, z: number): Uint8Array | undefined {
    return this.chunks.get(chunkKey(Math.floor(x) >> 5, Math.floor(z) >> 5));
  }

  isLoaded(x: number, z: number): boolean {
    if (!inWorld(x, z)) return false;
    return this.chunks.has(chunkKey(Math.floor(x) >> 5, Math.floor(z) >> 5));
  }

  get(x: number, y: number, z: number): number {
    if (!inWorld(x, z)) return B.Stone; // walls of the world
    if (y < 0) return B.Stone;
    if (y >= SY) return B.Air;
    const c = this.chunks.get(chunkKey(x >> 5, z >> 5));
    if (!c) return y < WATER_LEVEL - 4 ? B.Stone : B.Air;
    return c[(x & 31) + CHUNK * ((z & 31) + CHUNK * y)];
  }

  /** Raw write with no remesh bookkeeping (used while assembling chunks). */
  put(x: number, y: number, z: number, id: number): void {
    if (!this.inBounds(x, y, z)) return;
    const c = this.chunks.get(chunkKey(x >> 5, z >> 5));
    if (c) c[(x & 31) + CHUNK * ((z & 31) + CHUNK * y)] = id;
  }

  /** Runtime edit: marks the owning chunk and any touching neighbours for remeshing. */
  set(x: number, y: number, z: number, id: number): void {
    if (!this.inBounds(x, y, z)) return;
    const c = this.chunks.get(chunkKey(x >> 5, z >> 5));
    if (!c) return;
    const i = (x & 31) + CHUNK * ((z & 31) + CHUNK * y);
    if (c[i] === id) return;
    c[i] = id;
    const cx = x >> 5, cz = z >> 5;
    this.markDirty(cx, cz);
    const lx = x & 31, lz = z & 31;
    if (lx === 0) this.markDirty(cx - 1, cz);
    if (lx === 31) this.markDirty(cx + 1, cz);
    if (lz === 0) this.markDirty(cx, cz - 1);
    if (lz === 31) this.markDirty(cx, cz + 1);
    if (lx === 0 && lz === 0) this.markDirty(cx - 1, cz - 1);
    if (lx === 31 && lz === 31) this.markDirty(cx + 1, cz + 1);
    if (lx === 0 && lz === 31) this.markDirty(cx - 1, cz + 1);
    if (lx === 31 && lz === 0) this.markDirty(cx + 1, cz - 1);
  }

  markDirty(cx: number, cz: number): void {
    if (!chunkInWorld(cx, cz)) return;
    if (this.chunks.has(chunkKey(cx, cz))) this.dirty.add(chunkKey(cx, cz));
  }

  onRemesh(fn: (cx: number, cz: number) => void): void {
    this.listeners.push(fn);
  }

  flush(max = 4): void {
    let n = 0;
    for (const key of this.dirty) {
      this.dirty.delete(key);
      const [cx, cz] = keyChunk(key);
      for (const fn of this.listeners) fn(cx, cz);
      if (++n >= max) break;
    }
  }

  solidAt(x: number, y: number, z: number): boolean {
    return isSolid(this.get(Math.floor(x), Math.floor(y), Math.floor(z)));
  }

  /** Highest solid block y (top face at y+1), or -1. */
  topSolid(x: number, z: number, from = SY - 1): number {
    const ix = Math.floor(x), iz = Math.floor(z);
    if (!inWorld(ix, iz)) return 0;
    const c = this.chunks.get(chunkKey(ix >> 5, iz >> 5));
    if (!c) return -1;
    const base = (ix & 31) + CHUNK * (iz & 31);
    for (let y = Math.min(from, SY - 1); y >= 0; y--) {
      const id = c[base + CHUNK * CHUNK * y];
      if (id !== B.Air && id !== B.Water && isSolid(id)) return y;
    }
    return -1;
  }

  /** Ground height under a point, searching down from a given height (handles caves and bridges). */
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
      if (id !== B.Air && id !== B.Barrier && (id !== B.Water || hitWater)) return { x, y, z, id, nx, ny, nz, distance: t };
      if (tMaxX < tMaxY && tMaxX < tMaxZ) { x += stepX; t = tMaxX; tMaxX += tDeltaX; nx = -stepX; ny = 0; nz = 0; }
      else if (tMaxY < tMaxZ) { y += stepY; t = tMaxY; tMaxY += tDeltaY; nx = 0; ny = -stepY; nz = 0; }
      else { z += stepZ; t = tMaxZ; tMaxZ += tDeltaZ; nx = 0; ny = 0; nz = -stepZ; }
    }
    return null;
  }
}
