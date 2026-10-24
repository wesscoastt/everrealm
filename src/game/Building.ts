import * as THREE from 'three';
import { housePlace, HouseSpec, Lot, lotFront, WALLS } from '../data/housing';
import { B } from '../world/blocks';
import { landAt } from '../world/land';
import type { Door } from '../world/Doors';
import type { BuiltSite } from '../world/siteProps';
import { houseInto, PropDesc, Site } from '../world/sites';
import { chunkKey, VoxelWorld } from '../world/VoxelWorld';

// What stands on the Charter's lots, in the live world. A lot someone holds shows the house they had
// built (the same builder the villages use writes its blocks straight into the loaded chunks, and again
// whenever a chunk streams back in; its roof, door, lantern and chimney smoke come up as props), the
// blocks they've laid there by hand, and a board with their name at the gate. A lot leased and not yet
// built on says so; a free one is to let. Only lots near the player are raised.
//
// A house that isn't yours, and that you're not a guest in, is locked: its door stays shut and a
// barrier fills the doorway.

export interface BuildingHost {
  scene: THREE.Scene;
  voxels: VoxelWorld;
  /** Turns prop descriptors into meshes, as for any settlement. */
  buildProps(site: Site): BuiltSite;
}

/** A hand-laid block on a lot: from its corner along x and z, up from its floor, and the block (Air: dug out). */
export type LaidBlock = [x: number, y: number, z: number, id: number];

/** What to show on a lot: the plans built to (or none yet), the blocks laid by hand, who holds it (or nobody), and whether you may go in. */
export interface LotHouse { lot: Lot; spec: HouseSpec | null; blocks: LaidBlock[]; owner: string | null; locked: boolean; /** A stall up at the gate. */ stall?: boolean }

/** Where a lot's stall stands: in the front garden beside the gate, facing the road. */
export function stallAt(lot: Lot): { x: number; z: number; ry: number } {
  const f = lotFront(lot), across = lot.door === 'n' || lot.door === 's';
  const inX = across ? 0 : -Math.sin(f.ry) * 2, inZ = across ? -Math.cos(f.ry) * 2 : 0;
  return { x: f.x + (across ? 4 : 0) + inX, z: f.z + (across ? 0 : 4) + inZ, ry: f.ry };
}

interface Raised { key: string; blocks: Map<number, [number, number, number, number][]>; built: BuiltSite; originals: Map<string, number>; locked: boolean }

const ROOF_MAT: Record<string, PropDesc['mat']> = { thatch: 'thatch', red: 'red', slate: 'slate', blue: 'blue' };

/** Where a house's doorway is: the cell in its front wall. */
export function doorCell(at: { x0: number; z0: number; w: number; d: number; door: 'n' | 's' | 'e' | 'w' }): [number, number] {
  if (at.door === 'n' || at.door === 's') return [at.x0 + Math.floor(at.w / 2), at.door === 's' ? at.z0 + at.d - 1 : at.z0];
  return [at.door === 'e' ? at.x0 + at.w - 1 : at.x0, at.z0 + Math.floor(at.d / 2)];
}

export class Building {
  private raised = new Map<string, Raised>();
  private preview: THREE.Group | null = null;

  constructor(private host: BuildingHost) {}

  /** The doors of the houses on show, to swing with the rest (a locked one stays shut). */
  doors(): Door[] { return [...this.raised.values()].flatMap((r) => r.built.doors); }

  /** Shows these lots (and takes down any that aren't among them, or have changed). */
  sync(list: LotHouse[]): void {
    const want = new Map(list.map((h) => [h.lot.id, h]));
    for (const [id, r] of this.raised) {
      const h = want.get(id);
      if (!h || keyOf(h) !== r.key) this.takeDown(id);
    }
    for (const h of list) if (!this.raised.has(h.lot.id)) this.raise(h);
  }

  private raise(h: LotHouse): void {
    const { lot, spec, owner } = h;
    const blocks = new Map<number, [number, number, number, number][]>();
    const writer = { set: (x: number, y: number, z: number, id: number) => {
      const k = chunkKey(Math.floor(x) >> 5, Math.floor(z) >> 5);
      let a = blocks.get(k);
      if (!a) blocks.set(k, (a = []));
      a.push([Math.floor(x), Math.floor(y), Math.floor(z), id]);
    } };
    const f = lotFront(lot), across = lot.door === 'n' || lot.door === 's';
    const site: Site = { id: 'home-' + lot.id, name: '', region: 'greenwake', x: lot.x0 + 7, z: lot.z0 + 6, r: 200, named: false, props: [], rects: [], impostor: [] };
    if (spec) {
      const at = housePlace(lot, spec);
      houseInto(writer, site, at.x0, at.z0, at.w, at.d, at.floors, at.base, ROOF_MAT[spec.roof], at.door, { role: 'vacant', wall: WALLS[spec.wall].block, impostor: false, front: spec.front, trim: spec.trim ?? [] });
      // Locked: a barrier in the doorway, two high
      if (h.locked) { const [dx, dz] = doorCell(at); writer.set(dx, at.base, dz, B.Barrier); writer.set(dx, at.base + 1, dz, B.Barrier); }
    }
    for (const [x, y, z, id] of h.blocks) writer.set(lot.x0 + x, lot.base + y, lot.z0 + z, id);
    // The board at the gate, beside the lot's number: whose it is, or that it's to let
    const text = owner ? (spec ? owner.toUpperCase() : `LEASED\n${owner.toUpperCase()}`) : `TO LET\n${landAt(lot.x0) === 'morrow' ? 'The Assembly' : 'The Charter'}`;
    const side = -2.5, out = 0.6;
    site.props.push({ t: 'sign', x: f.x + (across ? side : Math.sin(f.ry) * out), y: lot.base, z: f.z + (across ? Math.cos(f.ry) * out : side), ry: f.ry, text });
    if (h.stall && owner) { const st = stallAt(lot); site.props.push({ t: 'stall', x: st.x, y: lot.base, z: st.z, ry: st.ry, color: '#2f528f' }); }
    const built = this.host.buildProps(site);
    for (const d of built.doors) d.locked = h.locked;
    this.host.scene.add(built.group);
    const r: Raised = { key: keyOf(h), blocks, built, originals: new Map(), locked: h.locked };
    this.raised.set(lot.id, r);
    for (const k of blocks.keys()) this.apply(r, k);
  }

  /** A chunk streamed (back) in: put the houses' blocks in it again. */
  chunkLoaded(cx: number, cz: number): void {
    const k = chunkKey(cx, cz);
    for (const r of this.raised.values()) {
      const cells = r.blocks.get(k);
      if (!cells) continue;
      // A fresh chunk is the untouched ground again, so what was there before is worth remembering anew
      for (const [x, y, z] of cells) r.originals.delete(`${x},${y},${z}`);
      this.apply(r, k);
    }
  }

  private apply(r: Raised, k: number): void {
    for (const [x, y, z, id] of r.blocks.get(k) ?? []) {
      if (!this.host.voxels.isLoaded(x, z)) return;
      const cell = `${x},${y},${z}`;
      if (!r.originals.has(cell)) r.originals.set(cell, this.host.voxels.get(x, y, z));
      this.host.voxels.set(x, y, z, id);
    }
  }

  private takeDown(id: string): void {
    const r = this.raised.get(id);
    if (!r) return;
    this.raised.delete(id);
    for (const [cell, b] of r.originals) {
      const [x, y, z] = cell.split(',').map(Number);
      if (this.host.voxels.isLoaded(x, z)) this.host.voxels.set(x, y, z, b);
    }
    this.host.scene.remove(r.built.group);
    r.built.group.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh && !m.geometry.userData.shared) m.geometry.dispose();
    });
  }

  /** A see-through block of the planned house on its lot, roof-coloured, while you draw up plans. */
  showPlan(lot: Lot | null, spec: HouseSpec | null): void {
    if (this.preview) { this.host.scene.remove(this.preview); this.preview.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh) { m.geometry.dispose(); (m.material as THREE.Material).dispose(); } }); this.preview = null; }
    if (!lot || !spec) return;
    const at = housePlace(lot, spec);
    const g = new THREE.Group();
    const h = at.floors * 4;
    const wall = new THREE.Mesh(new THREE.BoxGeometry(at.w, h, at.d), new THREE.MeshBasicMaterial({ color: '#f2e6c8', transparent: true, opacity: 0.28, depthWrite: false }));
    wall.position.set(at.x0 + at.w / 2, at.base + h / 2, at.z0 + at.d / 2);
    const edges = new THREE.LineSegments(new THREE.EdgesGeometry(wall.geometry), new THREE.LineBasicMaterial({ color: '#ffe9a8' }));
    edges.position.copy(wall.position);
    const span = Math.min(at.w, at.d);
    const roof = new THREE.Mesh(new THREE.CylinderGeometry(0.01, span * 0.62, span * 0.5, 4, 1, true), new THREE.MeshBasicMaterial({ color: ROOF_TONE[spec.roof], transparent: true, opacity: 0.45, depthWrite: false, side: THREE.DoubleSide }));
    roof.scale.set(at.w >= at.d ? at.w / span : 1, 1, at.w >= at.d ? 1 : at.d / span);
    roof.rotation.y = Math.PI / 4;
    roof.position.set(at.x0 + at.w / 2, at.base + h + span * 0.25, at.z0 + at.d / 2);
    // The front door, so the plan shows which way the house will face
    const [nx, nz] = at.door === 's' ? [0, 1] : at.door === 'n' ? [0, -1] : at.door === 'e' ? [1, 0] : [-1, 0];
    const door = new THREE.Mesh(new THREE.BoxGeometry(nx ? 0.2 : 1, 3, nz ? 0.2 : 1), new THREE.MeshBasicMaterial({ color: '#6a4426' }));
    door.position.set(at.x0 + at.w / 2 + nx * (at.w / 2 + 0.1), at.base + 1.5, at.z0 + at.d / 2 + nz * (at.d / 2 + 0.1));
    g.add(wall, edges, roof, door);
    g.renderOrder = 3;
    this.preview = g;
    this.host.scene.add(g);
  }
}

const keyOf = (h: LotHouse) => JSON.stringify([h.spec, h.blocks, h.owner, h.locked, !!h.stall]);
const ROOF_TONE: Record<string, string> = { red: '#b85a40', blue: '#4a6aa0', slate: '#5a5e6a', thatch: '#c8a860' };
