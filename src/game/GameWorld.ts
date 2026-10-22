import * as THREE from 'three';
import { createSeededRandom } from '../utils/random';
import { B } from '../world/blocks';
import { ChunkResult, MAP_COLORS } from '../world/chunkgen';
import { EX, FishSpot, generateTerrain, growTree, Layout, OreNode, placeTrees, TreeNode } from '../world/generate';
import { Grid, SX as GSX, SY as GSY, SZ as GSZ } from '../world/grid';
import { bindWaterUniforms, createSharedUniforms, createVoxelMaterial, createWaterMaterial, SharedUniforms } from '../world/materials';
import { realmNow } from '../world/clock';
import { Ferry } from '../world/Ferry';
import { createPropMaterials, PropMaterials } from '../world/props';
import type { Door } from '../world/Doors';
import { BuiltSite, buildImpostor, buildSiteProps } from '../world/siteProps';
import { plan, Site } from '../world/sites';
import { Sky } from '../world/Sky';
import { buildStructures, StructureResult } from '../world/structures';
import { GW, landDist, SEA } from '../world/terrain';
import { buildBlockTextureArray } from '../world/textures';
import { Vegetation } from '../world/Vegetation';
import { CHUNK, chunkKey, localIdx, MAP_SCALE, SY, VoxelWorld, WMIN, WSIZE } from '../world/VoxelWorld';
import { ChunkManager } from './ChunkManager';

/** Blocks between the far terrain's samples: it's only seen past the near chunks, in the haze. */
const LOD_STEP = 12;

/** How many lamps light the world at once, how far each reaches, and how bright they are. */
const LAMP_LIGHTS = 8, LAMP_REACH = 11, LAMP_POWER = 9;

export interface NodeBucket { ores: OreNode[]; trees: TreeNode[]; fish: FishSpot[]; persistent: boolean }

/**
 * The world: the authored Hollindale grid, the streamed continent around it, the nodes players
 * gather from, settlements that build their props on approach, and the far terrain.
 */
export class GameWorld {
  readonly grid = new Grid();
  readonly voxels = new VoxelWorld();
  readonly shared: SharedUniforms = createSharedUniforms();
  readonly layout: Layout;
  readonly structures: StructureResult;
  readonly sky: Sky;
  readonly props: PropMaterials;
  readonly chunks: ChunkManager;
  readonly sites: Site[];
  /** Explored-world map, painted chunk by chunk as the player sees it. */
  readonly mapImage: HTMLCanvasElement;
  private mapCtx: CanvasRenderingContext2D;
  private gwMap: HTMLCanvasElement;
  readonly explored = new Set<number>();
  readonly buckets = new Map<number, NodeBucket>();
  private nodeId = 10000;
  private voxelMat: THREE.MeshLambertMaterial;
  private waterMat: THREE.ShaderMaterial;
  private vegetation: Vegetation;
  readonly glowMat: THREE.SpriteMaterial;
  private lanternGlows: THREE.Sprite[] = [];
  /** A few real point lights, moved each frame to the lamps nearest the player (see placeLamps). */
  private lampLights: THREE.PointLight[] = [];
  /** Lights put up by things outside the sites (festival stalls), lit by the same pool. */
  readonly extraLamps: THREE.Vector3[] = [];
  private activeSites = new Map<string, BuiltSite>();
  private impostors = new Map<string, THREE.Group>();
  private lod: THREE.Group | null = null;
  private readonly ferry: Ferry;
  private lodUniforms = { uCenter: { value: new THREE.Vector2() }, uRadius: { value: 0 } };
  /** Fired when a streamed chunk arrives with creatures to place. */
  onChunk: ((cx: number, cz: number, r: ChunkResult | null) => void) | null = null;
  onChunkGone: ((cx: number, cz: number) => void) | null = null;
  stats = { genMs: 0 };

  constructor(readonly scene: THREE.Scene, onProgress: (label: string) => void) {
    const t0 = performance.now();
    onProgress('Raising the hills');
    this.layout = generateTerrain(this.grid);
    this.props = createPropMaterials();
    onProgress('Building Hollin Ford');
    this.structures = buildStructures(this.grid, this.layout, this.props, this.shared.uTime);
    onProgress('Planting Haverwood');
    const rnd = createSeededRandom(1337);
    const moot = growTree(this.grid, 'moot', 144, this.grid.topSolid(144, 175) + 1, 175, rnd);
    moot.id = 0;
    this.layout.trees.push(moot);
    placeTrees(this.grid, this.layout, rnd);
    onProgress('Charting the continent');
    this.sites = plan().sites;
    this.ferry = new Ferry(this.props);
    this.scene.add(this.ferry.root);
    this.stats.genMs = performance.now() - t0;

    // Hollindale's nodes live for the whole session, bucketed by chunk
    for (const o of this.layout.ores) this.bucket(o.x, o.z, true).ores.push(o);
    for (const t of this.layout.trees) this.bucket(t.x, t.z, true).trees.push(t);
    for (const f of this.layout.fish) this.bucket(f.x, f.z, true).fish.push(f);

    const atlas = buildBlockTextureArray();
    this.voxelMat = createVoxelMaterial(atlas, this.shared);
    this.waterMat = createWaterMaterial(this.shared);
    bindWaterUniforms(this.waterMat, this.shared);

    this.gwMap = this.renderGreenwakeMap();
    this.mapImage = document.createElement('canvas');
    // The explored map covers the whole world at MAP_SCALE blocks a pixel: world (x, z) is pixel
    // ((x - WMIN) / MAP_SCALE, (z - WMIN) / MAP_SCALE)
    this.mapImage.width = WSIZE / MAP_SCALE;
    this.mapImage.height = WSIZE / MAP_SCALE;
    // Unexplored stays clear: the world map shows the Charter's chart there (see world/atlas.ts)
    this.mapCtx = this.mapImage.getContext('2d')!;

    this.chunks = new ChunkManager(this.voxels, this.voxelMat, this.waterMat, this.shared.uTime, {
      isGreenwake: (cx, cz) => cx >= 0 && cz >= 0 && cx * CHUNK < GW && cz * CHUNK < GW,
      fill: (cx, cz) => this.fillFromGrid(cx, cz),
    }, {
      onLoaded: (cx, cz, r) => this.chunkLoaded(cx, cz, r),
      onUnloaded: (cx, cz) => this.chunkUnloaded(cx, cz),
      onMapTile: (cx, cz, px) => this.paintTile(cx, cz, px),
    });
    scene.add(this.chunks.group);

    scene.add(this.structures.group);
    onProgress('Growing grass');
    this.vegetation = new Vegetation(this.grid, this.layout, this.shared.uTime);
    scene.add(this.vegetation.group);

    this.sky = new Sky(scene, this.shared);
    // A fixed pool, so the lit shaders compile once; unused lights sit at zero intensity.
    for (let i = 0; i < LAMP_LIGHTS; i++) {
      const l = new THREE.PointLight('#ffb05a', 0, LAMP_REACH, 1.6);
      scene.add(l);
      this.lampLights.push(l);
    }
    this.glowMat = this.makeGlowMaterial();
    for (const p of [...this.structures.lights, ...this.layout.caveLights.map(([x, y, z]) => new THREE.Vector3(x, y, z))]) {
      const s = new THREE.Sprite(this.glowMat);
      s.position.copy(p);
      s.scale.setScalar(2.4);
      this.structures.group.add(s);
      this.lanternGlows.push(s);
    }
    for (const s of this.sites) {
      if (!s.impostor.length) continue;
      const g = buildImpostor(s.impostor);
      this.impostors.set(s.id, g);
      scene.add(g);
    }
    this.chunks.requestLod(LOD_STEP).then((r) => this.buildLod(r));
  }

  // ---------------------------------------------------------------- Nodes
  private bucket(x: number, z: number, persistent = false): NodeBucket {
    const key = chunkKey(Math.floor(x) >> 5, Math.floor(z) >> 5);
    let b = this.buckets.get(key);
    if (!b) this.buckets.set(key, (b = { ores: [], trees: [], fish: [], persistent }));
    return b;
  }

  /** Nodes in the 3x3 chunks around a point. */
  nodesNear(x: number, z: number): NodeBucket[] {
    const out: NodeBucket[] = [];
    const cx = Math.floor(x) >> 5, cz = Math.floor(z) >> 5;
    for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
      const b = this.buckets.get(chunkKey(cx + dx, cz + dz));
      if (b && this.voxels.chunks.has(chunkKey(cx + dx, cz + dz))) out.push(b);
    }
    return out;
  }

  /** Every node in loaded chunks (for respawn ticks). */
  *loadedBuckets(): Generator<NodeBucket> {
    for (const [key, b] of this.buckets) if (this.voxels.chunks.has(key)) yield b;
  }

  private fillFromGrid(cx: number, cz: number): { data: Uint8Array; tint: Float32Array } {
    const data = new Uint8Array(CHUNK * CHUNK * SY);
    const tint = new Float32Array(CHUNK * CHUNK * 6);
    const ox = cx * CHUNK, oz = cz * CHUNK;
    for (let y = 0; y < GSY; y++) for (let lz = 0; lz < CHUNK; lz++) {
      const src = ox + GSX * (oz + lz + GSZ * y);
      data.set(this.grid.data.subarray(src, src + CHUNK), localIdx(0, y, lz));
    }
    for (let lz = 0; lz < CHUNK; lz++) for (let lx = 0; lx < CHUNK; lx++) {
      const i = ((oz + lz) * GSX + ox + lx) * 3;
      const r = this.layout.tint[i], g = this.layout.tint[i + 1], b = this.layout.tint[i + 2];
      tint.set([r, g, b, r * 0.96, g, b * 1.02], (lz * CHUNK + lx) * 6);
    }
    // Re-apply anything worked out before the chunk was unloaded
    const bucket = this.buckets.get(chunkKey(cx, cz));
    if (bucket) {
      const inside = (x: number, z: number) => x >= ox && x < ox + CHUNK && z >= oz && z < oz + CHUNK;
      for (const o of bucket.ores) if (o.depletedUntil && inside(o.x, o.z)) data[localIdx(o.x - ox, o.y, o.z - oz)] = B.Depleted;
      for (const t of bucket.trees) if (t.depletedUntil) {
        for (let i = 1; i < t.trunk.length; i++) { const [x, y, z] = t.trunk[i]; if (inside(x, z)) data[localIdx(x - ox, y, z - oz)] = B.Air; }
        for (const [x, y, z] of t.leaves) if (inside(x, z)) data[localIdx(x - ox, y, z - oz)] = B.Air;
      }
    }
    return { data, tint };
  }

  private chunkLoaded(cx: number, cz: number, r: ChunkResult | null): void {
    this.explored.add(chunkKey(cx, cz));
    if (r) {
      const b = this.bucket(cx * CHUNK, cz * CHUNK);
      b.ores = r.ores.map((o) => ({ id: this.nodeId++, kind: o.kind, x: o.x, y: o.y, z: o.z, depletedUntil: 0 } as OreNode));
      b.trees = r.trees.map((t) => {
        const trunk: [number, number, number][] = [];
        for (let i = 0; i < t.trunk.length; i += 3) trunk.push([t.trunk[i], t.trunk[i + 1], t.trunk[i + 2]]);
        const leaves: [number, number, number, number][] = [];
        for (let i = 0; i < t.leaves.length; i += 4) leaves.push([t.leaves[i], t.leaves[i + 1], t.leaves[i + 2], t.leaves[i + 3]]);
        return { id: this.nodeId++, kind: t.kind, x: t.x, y: t.y, z: t.z, trunk, leaves, logs: t.logs, depletedUntil: 0, choppable: true } as TreeNode;
      });
      b.fish = r.fish.map((f) => ({ id: this.nodeId++, x: f.x, y: f.y, z: f.z, water: f.water } as FishSpot));
    }
    this.onChunk?.(cx, cz, r);
  }

  private chunkUnloaded(cx: number, cz: number): void {
    const key = chunkKey(cx, cz);
    const b = this.buckets.get(key);
    if (b && !b.persistent) this.buckets.delete(key);
    this.onChunkGone?.(cx, cz);
  }

  // ---------------------------------------------------------------- Map
  private paintTile(cx: number, cz: number, px: Uint8ClampedArray | null): void {
    this.explored.add(chunkKey(cx, cz));
    const S = MAP_SCALE, n = CHUNK / S, ox = (cx * CHUNK - WMIN) / S, oz = (cz * CHUNK - WMIN) / S;
    if (px) {
      // Each pixel of the map is the average of the S x S blocks under it
      const out = new Uint8ClampedArray(n * n * 4);
      for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) for (let c = 0; c < 4; c++) {
        let sum = 0;
        for (let dj = 0; dj < S; dj++) for (let di = 0; di < S; di++) sum += px[((j * S + dj) * CHUNK + i * S + di) * 4 + c];
        out[(j * n + i) * 4 + c] = sum / (S * S);
      }
      this.mapCtx.putImageData(new ImageData(out, n, n), ox, oz);
    } else this.mapCtx.drawImage(this.gwMap, cx * CHUNK, cz * CHUNK, CHUNK, CHUNK, ox, oz, n, n);
  }

  private renderGreenwakeMap(): HTMLCanvasElement {
    const c = document.createElement('canvas');
    c.width = GSX;
    c.height = GSZ;
    const ctx = c.getContext('2d')!;
    const img = ctx.createImageData(GSX, GSZ);
    for (let z = 0; z < GSZ; z++) for (let x = 0; x < GSX; x++) {
      let y = GSY - 1, id = 0;
      for (; y >= 0; y--) { id = this.grid.get(x, y, z); if (id !== B.Air && id !== B.Barrier) break; }
      let col: [number, number, number];
      if (id === B.Water) {
        let d = 0;
        while (d < 6 && this.grid.get(x, y - d, z) === B.Water) d++;
        col = [70 - d * 6, 150 - d * 10, 200 - d * 6];
      } else col = MAP_COLORS[id] ?? [120, 120, 120];
      if (this.layout.exclusion[x + z * GSX] === EX.Building && id !== B.Cobble && id !== B.StoneBrick) col = [170, 82, 60];
      const hN = this.grid.topSolid(x, Math.max(0, z - 1)), hW = this.grid.topSolid(Math.max(0, x - 1), z), h = this.grid.topSolid(x, z);
      const shade = 1 + (h - (hN + hW) / 2) * 0.06 + (h - 20) * 0.006;
      const i = (z * GSX + x) * 4;
      img.data[i] = col[0] * shade; img.data[i + 1] = col[1] * shade; img.data[i + 2] = col[2] * shade; img.data[i + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    return c;
  }

  exploredKeys(): number[] { return [...this.explored]; }

  // ---------------------------------------------------------------- Far terrain
  private buildLod(r: { heights: Float32Array; colors: Uint8Array; n: number }): void {
    const { heights, colors, n } = r;
    const step = LOD_STEP;
    // The authored vale's heights come from its grid
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
      const x = WMIN + i * step, z = WMIN + j * step;
      if (x >= 0 && z >= 0 && x < GW && z < GW) {
        const top = this.grid.topSolid(Math.min(GSX - 1, x), Math.min(GSZ - 1, z));
        heights[i + j * n] = top + 1;
        const id = this.grid.get(Math.min(GSX - 1, x), top, Math.min(GSZ - 1, z));
        const c = MAP_COLORS[id] ?? [100, 140, 70];
        colors.set([c[0] * 0.72, c[1] * 0.72, c[2] * 0.72], (i + j * n) * 3);
      }
    }
    // A lone sample above the sea with water all round is a sea stack caught by the coarse grid; drawn
    // eight blocks wide it hangs in the haze like a slab, so the far terrain leaves it out (the real
    // stack appears with its chunk).
    for (let j = 1; j < n - 1; j++) for (let i = 1; i < n - 1; i++) {
      const k = i + j * n;
      if (heights[k] > SEA && heights[k - 1] <= SEA && heights[k + 1] <= SEA && heights[k - n] <= SEA && heights[k + n] <= SEA) heights[k] = SEA - 1;
      // Out at sea every stack is a stray: the far terrain is open water there
      else if (heights[k] > SEA && landDist(WMIN + i * step, WMIN + j * step) < 0) heights[k] = SEA - 1;
    }
    const H = (i: number, j: number) => {
      const h = heights[Math.min(n - 1, Math.max(0, i)) + Math.min(n - 1, Math.max(0, j)) * n];
      return h <= SEA ? SEA - 0.3 : Math.round(h) - 1.2;
    };
    // Land in tiles of TILE x TILE samples, so whatever is off screen isn't drawn; all the water,
    // sea and lakes alike, is one flat sheet underneath
    const TILE = 64;
    const group = new THREE.Group();
    const mat = new THREE.MeshLambertMaterial({ vertexColors: true });
    const addMesh = (pos: number[], col: number[], nor: number[]) => {
      if (!pos.length) return;
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      // Colours and normals as bytes: the far terrain is a lot of vertices, and phones have little memory
      g.setAttribute('normal', new THREE.BufferAttribute(Int8Array.from(nor, (v) => Math.round(v * 127)), 3, true));
      g.setAttribute('color', new THREE.BufferAttribute(Uint8Array.from(col, (v) => Math.round(Math.max(0, Math.min(1, v)) * 255)), 3, true));
      g.computeBoundingSphere();
      const m = new THREE.Mesh(g, mat);
      m.receiveShadow = false;
      group.add(m);
    };
    for (let tj = 0; tj < n - 1; tj += TILE) for (let ti = 0; ti < n - 1; ti += TILE) {
      const pos: number[] = [], col: number[] = [], nor: number[] = [];
      const quad = (a: number[], b: number[], c: number[], d: number[], cr: number, cg: number, cb: number, nx: number, ny: number, nz: number) => {
        pos.push(...a, ...b, ...c, ...a, ...c, ...d);
        for (let k = 0; k < 6; k++) { col.push(cr, cg, cb); nor.push(nx, ny, nz); }
      };
      for (let j = tj; j < Math.min(n - 1, tj + TILE); j++) for (let i = ti; i < Math.min(n - 1, ti + TILE); i++) {
        if (heights[i + j * n] <= SEA) continue;
        const x0 = WMIN + i * step, z0 = WMIN + j * step, x1 = x0 + step, z1 = z0 + step;
        const h = H(i, j);
        const o = (i + j * n) * 3;
        const cr = colors[o] / 255, cg = colors[o + 1] / 255, cb = colors[o + 2] / 255;
        quad([x0, h, z1], [x1, h, z1], [x1, h, z0], [x0, h, z0], cr, cg, cb, 0, 1, 0);
        // Stepped walls toward lower neighbours: far terrain keeps the block silhouette
        const e = H(i + 1, j), s = H(i, j + 1), w = H(i - 1, j), nn = H(i, j - 1);
        const k = 0.68;
        if (e < h) quad([x1, e, z1], [x1, e, z0], [x1, h, z0], [x1, h, z1], cr * k, cg * k, cb * k, 1, 0, 0);
        if (w < h) quad([x0, w, z0], [x0, w, z1], [x0, h, z1], [x0, h, z0], cr * k, cg * k, cb * k, -1, 0, 0);
        if (s < h) quad([x0, s, z1], [x1, s, z1], [x1, h, z1], [x0, h, z1], cr * 0.8, cg * 0.8, cb * 0.8, 0, 0, 1);
        if (nn < h) quad([x1, nn, z0], [x0, nn, z0], [x0, h, z0], [x1, h, z0], cr * 0.8, cg * 0.8, cb * 0.8, 0, 0, -1);
      }
      addMesh(pos, col, nor);
    }
    {
      const y = SEA - 0.3, a = WMIN, b = WMIN + WSIZE, cr = 0.24, cg = 0.47, cb = 0.66;
      addMesh([a, y, b, b, y, b, b, y, a, a, y, b, b, y, a, a, y, a], Array(6).fill([cr, cg, cb]).flat(), Array(6).fill([0, 1, 0]).flat());
    }
    mat.onBeforeCompile = (s) => {
      s.uniforms.uCenter = this.lodUniforms.uCenter;
      s.uniforms.uRadius = this.lodUniforms.uRadius;
      s.vertexShader = s.vertexShader
        .replace('#include <common>', '#include <common>\nvarying vec2 vLodXZ;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvLodXZ = (modelMatrix * vec4(position, 1.0)).xz;');
      s.fragmentShader = s.fragmentShader
        .replace('#include <common>', '#include <common>\nvarying vec2 vLodXZ;\nuniform vec2 uCenter;\nuniform float uRadius;')
        .replace('void main() {', 'void main() {\n  if (distance(vLodXZ, uCenter) < uRadius) discard;');
    };
    this.lod = group;
    this.scene.add(this.lod);
  }

  private makeGlowMaterial(): THREE.SpriteMaterial {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const x = c.getContext('2d')!;
    const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(255,220,150,1)');
    g.addColorStop(0.25, 'rgba(255,170,80,0.5)');
    g.addColorStop(1, 'rgba(255,140,40,0)');
    x.fillStyle = g;
    x.fillRect(0, 0, 64, 64);
    return new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0 });
  }

  /** Smoke emitters near the player (Hollindale chimneys plus active settlements). */
  smokeSources(): THREE.Vector3[] {
    const out = [...this.structures.smoke];
    for (const s of this.activeSites.values()) out.push(...s.smoke);
    return out;
  }

  /** Every swinging door in the vale and the settlements now built round the player. */
  /** Doors that belong to something other than the vale and the settlements (a player's house). */
  extraDoors: () => Door[] = () => [];

  *doors(): Iterable<Door> {
    yield* this.structures.doors;
    yield* this.extraDoors();
    for (const s of this.activeSites.values()) yield* s.doors;
  }

  /** Builds the props for a site that isn't in the plan (a player's house). */
  buildProps(site: Site): BuiltSite { return buildSiteProps(site, this.props, this.shared.uTime, this.glowMat); }

  update(dt: number, center: THREE.Vector3, elapsed: number, timeScale: number): void {
    this.shared.uTime.value = elapsed;
    this.sky.update(dt, center, timeScale);
    this.chunks.update(center.x, center.z);
    this.lodUniforms.uCenter.value.set(center.x, center.z);
    this.lodUniforms.uRadius.value = this.chunks.coveredRadius;

    const glow = this.sky.night;
    this.glowMat.opacity = 0.15 + glow * 0.75;
    this.props.glow.emissiveIntensity = 0.5 + glow * 2.2;
    this.structures.sails.rotation.x += dt * 0.5;
    this.structures.wheel.rotation.x += dt * 0.7;
    // The Mewstones ferry keeps her timetable whether anyone is near; she's only drawn when someone is
    this.ferry.update(realmNow() / 1000);
    this.ferry.root.visible = this.ferry.root.position.distanceTo(center) < 900;
    const flick = 0.85 + Math.sin(elapsed * 13) * 0.08 + Math.sin(elapsed * 23.7) * 0.06;
    for (const f of this.structures.fires) f.scale.set(1, flick, 1);

    // The authored vale's props and grass only show while its chunks are around
    const gwDist = Math.hypot(Math.max(0, center.x - GW), Math.max(0, center.z - GW));
    this.structures.group.visible = gwDist < this.chunks.viewRadius * CHUNK - 40;
    this.vegetation.update(center.x, center.z, this.chunks.viewRadius * CHUNK - 30);

    // Settlements build their props when the player approaches; landmarks swap their stand-ins
    for (const s of this.sites) {
      const d = Math.hypot(s.x - center.x, s.z - center.z);
      const active = this.activeSites.get(s.id);
      const near = d < Math.min(s.r, this.chunks.viewRadius * CHUNK - 10);
      if (near && !active && s.props.length) {
        const built = buildSiteProps(s, this.props, this.shared.uTime, this.glowMat);
        this.scene.add(built.group);
        this.activeSites.set(s.id, built);
      } else if (!near && active && d > s.r + 40) {
        this.scene.remove(active.group);
        active.group.traverse((o) => {
          const m = o as THREE.Mesh;
          if (!m.isMesh && !(o as THREE.Points).isPoints) return;
          if (!m.geometry.userData.shared) m.geometry.dispose();
          const mat = m.material as THREE.MeshLambertMaterial;
          if (mat.userData?.owned) { mat.map?.dispose(); mat.dispose(); } // a batch's sign atlas
        });
        this.activeSites.delete(s.id);
      }
      const imp = this.impostors.get(s.id);
      if (imp) imp.visible = d > this.chunks.coveredRadius + 20;
    }
    for (const s of this.activeSites.values()) for (const f of s.fires) f.scale.set(1, flick, 1);
    this.placeLamps(center, glow, flick);
  }

  /**
   * Hang the light pool on the lamps nearest the player: every interior lamp, lantern and fire in
   * the vale and in the settlements around. Lights fade out as they drop off the end of the
   * nearest-N list, so walking down a street hands them on without popping.
   */
  private placeLamps(center: THREE.Vector3, night: number, flick: number): void {
    const N = this.lampLights.length;
    const best: THREE.Vector3[] = [], dist: number[] = [];
    const consider = (p: THREE.Vector3) => {
      const d = (p.x - center.x) ** 2 + (p.y - center.y) ** 2 * 2 + (p.z - center.z) ** 2;
      if (dist.length > N && d >= dist[N]) return;
      let i = dist.length;
      while (i > 0 && dist[i - 1] > d) i--;
      dist.splice(i, 0, d); best.splice(i, 0, p);
      if (dist.length > N + 1) { dist.pop(); best.pop(); }
    };
    if (this.structures.group.visible) for (const p of this.structures.lights) consider(p);
    for (const s of this.activeSites.values()) for (const p of s.lamps) consider(p);
    for (const p of this.extraLamps) consider(p);
    // Lit a little by day (dark rooms), fully from dusk
    const level = LAMP_POWER * (0.3 + 0.7 * night) * (0.92 + (flick - 0.85) * 0.5);
    const edge = dist.length > N ? Math.sqrt(dist[N]) : Infinity;
    for (let i = 0; i < N; i++) {
      const l = this.lampLights[i];
      if (i >= best.length) { l.intensity = 0; continue; }
      l.position.copy(best[i]);
      l.intensity = level * Math.min(1, (edge - Math.sqrt(dist[i])) / 6);
    }
  }

  /** Chunk coordinates the player is in. */
  static chunkOf(x: number, z: number): [number, number] { return [Math.floor(x / CHUNK), Math.floor(z / CHUNK)]; }
}
