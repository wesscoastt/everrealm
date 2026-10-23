import * as THREE from 'three';
import { LORE_BOOKS, type LoreBook } from '../data/lorebooks';
import { LAND } from '../world/land';
import type { GameApi } from './api';
import type { VoxelWorld } from '../world/VoxelWorld';
import { GW, heightAt } from '../world/terrain';
import { B } from '../world/blocks';

// Lore books in the world (data/lorebooks.ts): each lies open on a little stand by the place it's
// about. Read one and it goes into your library, the journal's Library page ("book:<id>").

export interface LoreHost {
  scene: THREE.Scene;
  voxels: VoxelWorld;
  player(): THREE.Vector3;
  api(): GameApi;
  flag(k: string): unknown;
  setFlag(k: string, v?: unknown): void;
  read(title: string, text: string): void;
  system(text: string): void;
  sound(name: 'open' | 'discover'): void;
  sparkle(at: THREE.Vector3): void;
}

export class LoreBooks {
  private shown = new Map<string, THREE.Group>();
  private glint = 0;
  private mats = {
    wood: new THREE.MeshLambertMaterial({ color: '#6a4a2c' }),
    cover: new THREE.MeshLambertMaterial({ color: '#5a2a24' }),
    page: new THREE.MeshLambertMaterial({ color: '#efe4c8', emissive: new THREE.Color('#2a2418') }),
  };

  constructor(private readonly host: LoreHost) {}

  get total(): number { return LORE_BOOKS.length; }
  read(id: string): boolean { return !!this.host.flag('book:' + id); }

  /** Where a book rests: the first open cell on solid ground at its spot, or close by. */
  private ground(b: LoreBook): number | null {
    const V = this.host.voxels;
    for (const [dx, dz] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [2, 0], [0, 2]]) {
      const x = b.x + dx, z = b.z + dz;
      const start = x < GW + 40 && z < GW + 40 ? 48 : heightAt(Math.floor(x), Math.floor(z)) + 5;
      const y = V.groundBelow(x, start, z);
      const under = V.get(Math.floor(x), Math.floor(y) - 1, Math.floor(z));
      if (under === B.Water || under === B.Barrier || V.solidAt(x, y + 0.2, z)) continue;
      b.x = x; b.z = z;
      return y;
    }
    return null;
  }

  update(dt: number): void {
    const P = this.host.player();
    for (const b of LAND === 'counties' ? LORE_BOOKS : []) {
      const near = Math.abs(b.x - P.x) < 70 && Math.abs(b.z - P.z) < 70;
      const g = this.shown.get(b.id);
      if (near && !g && this.host.voxels.isLoaded(b.x, b.z)) {
        const y = this.ground(b);
        if (y === null) continue;
        const m = this.model();
        m.position.set(b.x, y, b.z);
        m.rotation.y = (b.x * 7.3 + b.z * 3.1) % (Math.PI * 2);
        this.host.scene.add(m);
        this.shown.set(b.id, m);
      } else if (g && !near) {
        this.host.scene.remove(g);
        this.shown.delete(b.id);
      }
    }
    // A faint glint over the books you haven't read yet, so they catch the eye
    this.glint -= dt;
    if (this.glint <= 0) {
      this.glint = 1.6;
      for (const [id, g] of this.shown) if (!this.read(id) && g.position.distanceTo(P) < 30) this.host.sparkle(g.position.clone().add(new THREE.Vector3(0, 1.0, 0)));
    }
  }

  candidates(p: THREE.Vector3): { label: string; pos: THREE.Vector3; use: () => void }[] {
    const out: { label: string; pos: THREE.Vector3; use: () => void }[] = [];
    for (const [id, g] of this.shown) {
      if (Math.hypot(g.position.x - p.x, g.position.z - p.z) > 2.2 || Math.abs(g.position.y - p.y) > 2) continue;
      const b = LORE_BOOKS.find((x) => x.id === id)!;
      out.push({ label: `Read "${b.title}"`, pos: g.position.clone().add(new THREE.Vector3(0, 0.9, 0)), use: () => this.open(b) });
    }
    return out;
  }

  /** Read a book (from the world, or again from the library). */
  open(b: LoreBook): void {
    const first = !this.read(b.id);
    this.host.read(b.title, typeof b.text === 'function' ? b.text(this.host.api()) : b.text);
    if (!first) return;
    this.host.setFlag('book:' + b.id, true);
    const n = LORE_BOOKS.filter((x) => this.read(x.id)).length;
    this.host.system(`"${b.title}" is in your library: ${n} of ${LORE_BOOKS.length} found. Read it again from the journal.`);
    this.host.sound('discover');
  }

  /** A small reading stand with the book lying open on its slanted top. */
  private model(): THREE.Group {
    const g = new THREE.Group(), M = this.mats;
    const box = (w: number, h: number, d: number, m: THREE.Material, x: number, y: number, z: number, rx = 0) => {
      const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
      o.position.set(x, y, z);
      o.rotation.x = rx;
      o.castShadow = true;
      g.add(o);
    };
    box(0.12, 0.62, 0.12, M.wood, 0, 0.31, 0);
    box(0.36, 0.05, 0.3, M.wood, 0, 0.03, 0);
    const top = new THREE.Group();
    top.position.set(0, 0.66, 0);
    top.rotation.x = -0.45;
    g.add(top);
    const add = (w: number, h: number, d: number, m: THREE.Material, x: number, y: number) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y, 0); o.castShadow = true; top.add(o); };
    add(0.5, 0.04, 0.34, M.wood, 0, 0);
    add(0.46, 0.03, 0.3, M.cover, 0, 0.035);
    add(0.21, 0.03, 0.27, M.page, -0.11, 0.06);
    add(0.21, 0.03, 0.27, M.page, 0.11, 0.06);
    return g;
  }
}
