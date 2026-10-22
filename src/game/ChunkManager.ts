import * as THREE from 'three';
import type { ChunkResult } from '../world/chunkgen';
import type { MeshArrays } from '../world/meshCore';
import { PAD } from '../world/meshCore';
import { buildVegMesh } from '../world/Vegetation';
import { CHUNK, chunkInWorld, chunkKey, keyChunk, SY, VoxelWorld } from '../world/VoxelWorld';

// Streams the continent around the player: generation and meshing run in workers, chunks
// beyond the view distance are dropped, and the authored Hollindale chunks are copied from
// their grid instead of generated.

interface Entry {
  cx: number;
  cz: number;
  tint: Float32Array;
  solid?: THREE.Mesh;
  water?: THREE.Mesh;
  veg?: THREE.InstancedMesh | null;
  /** Stone treads on the roads' steep runs. */
  steps?: THREE.InstancedMesh | null;
  meshState: 'none' | 'pending' | 'done';
  dirty: boolean;
}

/** A road step's tread: a block wide, half deep, half high, standing on the lower cell against the rise. */
let treadGeo: THREE.BufferGeometry | null = null;
let treadMat: THREE.MeshLambertMaterial | null = null;
function buildSteps(d: Float32Array | undefined): THREE.InstancedMesh | null {
  const n = d ? d.length / 4 : 0;
  if (!d || !n) return null;
  treadGeo ??= new THREE.BoxGeometry(1, 0.5, 0.5).translate(0, 0.25, 0);
  treadMat ??= new THREE.MeshLambertMaterial({ color: '#9a968c' });
  const mesh = new THREE.InstancedMesh(treadGeo, treadMat, n);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), p = new THREE.Vector3(), one = new THREE.Vector3(1, 1, 1), c = new THREE.Color();
  for (let i = 0; i < n; i++) {
    m.compose(p.set(d[i * 4], d[i * 4 + 1], d[i * 4 + 2]), q.setFromAxisAngle(up, d[i * 4 + 3]), one);
    mesh.setMatrixAt(i, m);
    const k = 0.9 + (((i * 7919) % 13) / 13) * 0.2;
    mesh.setColorAt(i, c.setRGB(k, k * 0.98, k * 0.94));
  }
  mesh.castShadow = mesh.receiveShadow = true;
  mesh.computeBoundingSphere();
  return mesh;
}

export interface ChunkEvents {
  onLoaded(cx: number, cz: number, result: ChunkResult | null): void;
  onUnloaded(cx: number, cz: number): void;
  onMapTile(cx: number, cz: number, pixels: Uint8ClampedArray | null): void;
}

export interface GreenwakeSource {
  isGreenwake(cx: number, cz: number): boolean;
  fill(cx: number, cz: number): { data: Uint8Array; tint: Float32Array };
}

export class ChunkManager {
  readonly group = new THREE.Group();
  private workers: Worker[] = [];
  private next = 0;
  private jobs = new Map<number, (data: unknown) => void>();
  private jobId = 1;
  readonly entries = new Map<number, Entry>();
  private genInFlight = new Set<number>();
  private mapOnlyQueue: number[] = [];
  private meshInFlight = 0;
  viewRadius = 6;
  /** Radius (in blocks) around the player that is fully loaded and meshed. */
  coveredRadius = 0;
  stats = { generated: 0, meshed: 0, genMs: 0, workerGenMs: 0, workerMeshMs: 0 };

  constructor(
    private voxels: VoxelWorld,
    private solidMat: THREE.Material,
    private waterMat: THREE.Material,
    private time: { value: number },
    private gw: GreenwakeSource,
    private events: ChunkEvents,
  ) {
    const n = Math.max(1, Math.min(3, (navigator.hardwareConcurrency || 4) - 1));
    for (let i = 0; i < n; i++) {
      const w = new Worker(new URL('../world/worldWorker.ts', import.meta.url), { type: 'module' });
      w.onmessage = (e) => {
        const fn = this.jobs.get(e.data.id);
        this.jobs.delete(e.data.id);
        fn?.(e.data);
      };
      this.workers.push(w);
    }
  }

  private post(msg: Record<string, unknown>, transfer: Transferable[] = []): Promise<any> {
    const id = this.jobId++;
    return new Promise((resolve) => {
      this.jobs.set(id, resolve);
      this.workers[this.next++ % this.workers.length].postMessage({ ...msg, id }, transfer);
    });
  }

  requestLod(step: number): Promise<{ heights: Float32Array; colors: Uint8Array; n: number }> {
    return this.post({ type: 'lod', step }).then((d) => d.result);
  }

  /** Re-paint explored map tiles for chunks that aren't loaded (after loading a save). */
  queueMapTiles(keys: number[]): void {
    this.mapOnlyQueue.push(...keys.filter((k) => !this.entries.has(k)));
  }

  isReady(x: number, z: number, radius: number): boolean {
    const cx = Math.floor(x / CHUNK), cz = Math.floor(z / CHUNK);
    for (let dz = -radius; dz <= radius; dz++) for (let dx = -radius; dx <= radius; dx++) {
      const e = this.entries.get(chunkKey(cx + dx, cz + dz));
      if (!chunkInWorld(cx + dx, cz + dz)) continue;
      if (!e || e.meshState !== 'done') return false;
    }
    return true;
  }

  update(px: number, pz: number): void {
    const pcx = Math.floor(px / CHUNK), pcz = Math.floor(pz / CHUNK);
    const R = this.viewRadius;

    // Edits (mining, felling) ask for a remesh
    for (const key of this.voxels.dirty) {
      const e = this.entries.get(key);
      if (e) e.dirty = true;
    }
    this.voxels.dirty.clear();

    // Generate missing chunks nearest-first, one ring past the view so seams mesh correctly
    const want: [number, number, number][] = [];
    for (let dz = -R - 1; dz <= R + 1; dz++) for (let dx = -R - 1; dx <= R + 1; dx++) {
      const cx = pcx + dx, cz = pcz + dz;
      if (!chunkInWorld(cx, cz)) continue;
      const d = Math.hypot(dx, dz);
      if (d > R + 1.5) continue;
      const key = chunkKey(cx, cz);
      if (!this.entries.has(key) && !this.genInFlight.has(key)) want.push([d, cx, cz]);
    }
    want.sort((a, b) => a[0] - b[0]);
    const cap = this.workers.length * 2;
    for (const [, cx, cz] of want) {
      if (this.gw.isGreenwake(cx, cz)) { this.installGreenwake(cx, cz); continue; }
      if (this.genInFlight.size >= cap) break;
      this.requestGen(cx, cz);
    }
    if (this.genInFlight.size < 1 && this.mapOnlyQueue.length) {
      const key = this.mapOnlyQueue.shift()!;
      const [cx, cz] = keyChunk(key);
      if (this.gw.isGreenwake(cx, cz)) this.events.onMapTile(cx, cz, null);
      else this.post({ type: 'gen', cx, cz }).then((d) => this.events.onMapTile(cx, cz, (d.result as ChunkResult).map));
    }

    // Mesh chunks whose neighbours are all present
    const meshable: [number, Entry][] = [];
    let covered = Infinity;
    for (const e of this.entries.values()) {
      const dx = e.cx - pcx, dz = e.cz - pcz;
      const d = Math.hypot(dx, dz);
      if (d > R + 0.5) continue;
      if (e.meshState === 'done' && !e.dirty) continue;
      if (e.meshState === 'pending') { covered = Math.min(covered, d); continue; }
      if (e.meshState !== 'done') covered = Math.min(covered, d);
      if (this.neighboursLoaded(e.cx, e.cz)) meshable.push([d, e]);
    }
    for (const [, cx, cz] of want) covered = Math.min(covered, Math.hypot(cx - pcx, cz - pcz));
    this.coveredRadius = Math.max(0, (Math.min(covered, R + 0.5) - 0.8) * CHUNK);
    meshable.sort((a, b) => a[0] - b[0]);
    for (const [, e] of meshable) {
      if (this.meshInFlight >= this.workers.length * 2) break;
      this.mesh(e);
    }

    // Grass only matters close up
    for (const e of this.entries.values()) if (e.veg) e.veg.visible = Math.hypot(e.cx - pcx, e.cz - pcz) < 3.3;

    // Drop chunks well outside the view
    for (const [key, e] of this.entries) {
      if (Math.max(Math.abs(e.cx - pcx), Math.abs(e.cz - pcz)) > R + 3) this.unload(key, e);
    }
  }

  private neighboursLoaded(cx: number, cz: number): boolean {
    for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
      const x = cx + dx, z = cz + dz;
      if (!chunkInWorld(x, z)) continue;
      if (!this.entries.has(chunkKey(x, z))) return false;
    }
    return true;
  }

  private requestGen(cx: number, cz: number): void {
    const key = chunkKey(cx, cz);
    this.genInFlight.add(key);
    const t0 = performance.now();
    this.post({ type: 'gen', cx, cz }).then((d) => {
      this.genInFlight.delete(key);
      this.stats.generated++;
      this.stats.genMs += performance.now() - t0;
      this.stats.workerGenMs += d.ms ?? 0;
      const r = d.result as ChunkResult;
      this.voxels.chunks.set(key, r.data);
      const e: Entry = { cx, cz, tint: r.tint, meshState: 'none', dirty: false };
      e.veg = buildVegMesh(r.veg, this.time);
      if (e.veg) this.group.add(e.veg);
      e.steps = buildSteps(r.steps);
      if (e.steps) this.group.add(e.steps);
      this.entries.set(key, e);
      this.events.onMapTile(cx, cz, r.map);
      this.events.onLoaded(cx, cz, r);
    });
  }

  private installGreenwake(cx: number, cz: number): void {
    const key = chunkKey(cx, cz);
    const { data, tint } = this.gw.fill(cx, cz);
    this.voxels.chunks.set(key, data);
    this.entries.set(key, { cx, cz, tint, meshState: 'none', dirty: false });
    this.events.onMapTile(cx, cz, null);
    this.events.onLoaded(cx, cz, null);
  }

  private mesh(e: Entry): void {
    const pad = new Uint8Array(PAD * PAD * SY);
    const self = this.voxels.chunks.get(chunkKey(e.cx, e.cz))!;
    const nb = (dx: number, dz: number) => this.voxels.chunks.get(chunkKey(e.cx + dx, e.cz + dz));
    const W = nb(-1, 0), E = nb(1, 0), N = nb(0, -1), S = nb(0, 1);
    const NW = nb(-1, -1), NE = nb(1, -1), SW = nb(-1, 1), SE = nb(1, 1);
    const C2 = CHUNK * CHUNK;
    for (let y = 0; y < SY; y++) {
      const yo = y * C2, po = PAD * PAD * y;
      for (let lz = -1; lz <= CHUNK; lz++) {
        const row = po + PAD * (lz + 1);
        let mid: Uint8Array | undefined, left: Uint8Array | undefined, right: Uint8Array | undefined, sz: number;
        if (lz < 0) { mid = N; left = NW; right = NE; sz = CHUNK - 1; }
        else if (lz >= CHUNK) { mid = S; left = SW; right = SE; sz = 0; }
        else { mid = self; left = W; right = E; sz = lz; }
        const so = yo + CHUNK * sz;
        // Missing neighbours (world edge) read as stone so no faces are drawn into the void
        if (mid) pad.set(mid.subarray(so, so + CHUNK), row + 1); else pad.fill(3, row + 1, row + 1 + CHUNK);
        pad[row] = left ? left[so + CHUNK - 1] : 3;
        pad[row + PAD - 1] = right ? right[so] : 3;
      }
    }
    e.meshState = 'pending';
    e.dirty = false;
    this.meshInFlight++;
    const tint = e.tint.slice();
    this.post({ type: 'mesh', key: chunkKey(e.cx, e.cz), pad, tint, ox: e.cx * CHUNK, oz: e.cz * CHUNK }, [pad.buffer, tint.buffer]).then((d) => {
      this.meshInFlight--;
      const key = chunkKey(e.cx, e.cz);
      if (this.entries.get(key) !== e) return; // unloaded meanwhile
      this.applyMesh(e, d.arrays as MeshArrays);
      if (e.meshState === 'pending') e.meshState = 'done';
      this.stats.meshed++;
      this.stats.workerMeshMs += d.ms ?? 0;
    });
  }

  private applyMesh(e: Entry, a: MeshArrays): void {
    for (const m of [e.solid, e.water]) if (m) { this.group.remove(m); m.geometry.dispose(); }
    e.solid = e.water = undefined;
    if (a.idx.length) {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(a.pos, 3));
      g.setAttribute('normal', new THREE.BufferAttribute(a.nor, 3, true));
      g.setAttribute('aUv', new THREE.BufferAttribute(a.uv, 2));
      g.setAttribute('color', new THREE.BufferAttribute(a.col, 3));
      g.setAttribute('aMeta', new THREE.BufferAttribute(a.meta, 2));
      g.setIndex(new THREE.BufferAttribute(a.idx, 1));
      g.computeBoundingSphere();
      const m = new THREE.Mesh(g, this.solidMat);
      m.castShadow = true;
      m.receiveShadow = true;
      this.group.add(m);
      e.solid = m;
    }
    if (a.wIdx.length) {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(a.wPos, 3));
      g.setAttribute('normal', new THREE.BufferAttribute(a.wNor, 3, true));
      g.setAttribute('aUv', new THREE.BufferAttribute(a.wUv, 2));
      g.setAttribute('aWater', new THREE.BufferAttribute(a.wExtra, 3));
      g.setIndex(new THREE.BufferAttribute(a.wIdx, 1));
      g.computeBoundingSphere();
      const w = new THREE.Mesh(g, this.waterMat);
      w.renderOrder = 2;
      this.group.add(w);
      e.water = w;
    }
  }

  private unload(key: number, e: Entry): void {
    for (const m of [e.solid, e.water]) if (m) { this.group.remove(m); m.geometry.dispose(); }
    if (e.veg) { this.group.remove(e.veg); e.veg.geometry.dispose(); e.veg.dispose(); }
    if (e.steps) { this.group.remove(e.steps); e.steps.dispose(); }
    this.entries.delete(key);
    this.voxels.chunks.delete(key);
    this.events.onUnloaded(e.cx, e.cz);
  }
}
