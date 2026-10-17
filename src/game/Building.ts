import * as THREE from 'three';
import { housePlace, HouseSpec, Lot, LOTS, PlotState, WALLS } from '../data/housing';
import type { Door } from '../world/Doors';
import type { BuiltSite } from '../world/siteProps';
import { houseInto, PropDesc, Site } from '../world/sites';
import { chunkKey, VoxelWorld } from '../world/VoxelWorld';

// A house raised on a lot, in the live world: the same builder the villages use writes its blocks
// straight into the loaded chunks (and again whenever a chunk streams back in), and its roof, door,
// lantern, hearth and chimney smoke come up as props. Only the one house on show at a time: your
// own, or a host's while you visit.

export interface BuildingHost {
  scene: THREE.Scene;
  voxels: VoxelWorld;
  /** Turns prop descriptors into meshes, as for any settlement. */
  buildProps(site: Site): BuiltSite;
}

interface Raised { key: string; blocks: Map<number, [number, number, number, number][]>; built: BuiltSite; originals: Map<string, number> }

const ROOF_MAT: Record<string, PropDesc['mat']> = { thatch: 'thatch', red: 'red', slate: 'slate', blue: 'blue' };

export class Building {
  private raised: Raised | null = null;
  private preview: THREE.Group | null = null;

  constructor(private host: BuildingHost) {}

  /** The doors of the house on show, to swing with the rest. */
  doors(): Door[] { return this.raised?.built.doors ?? []; }

  /** Shows this house (or none), taking down whatever stood before. */
  show(plot: PlotState | null): void {
    const key = plot?.spec ? JSON.stringify(plot) : '';
    if ((this.raised?.key ?? '') === key) return;
    this.takeDown();
    if (!plot?.spec) return;
    const lot = LOTS.find((l) => l.id === plot.lot)!;
    const at = housePlace(lot, plot.spec);
    const blocks = new Map<number, [number, number, number, number][]>();
    const writer = { set: (x: number, y: number, z: number, id: number) => {
      const k = chunkKey(x >> 5, z >> 5);
      let a = blocks.get(k);
      if (!a) blocks.set(k, (a = []));
      a.push([Math.floor(x), Math.floor(y), Math.floor(z), id]);
    } };
    const site: Site = { id: 'home-' + lot.id, name: '', region: 'greenwake', x: at.x0 + at.w / 2, z: at.z0 + at.d / 2, r: 200, named: false, props: [], rects: [], impostor: [] };
    houseInto(writer, site, at.x0, at.z0, at.w, at.d, at.floors, at.base, ROOF_MAT[plot.spec.roof], at.door, { role: 'vacant', wall: WALLS[plot.spec.wall].block, impostor: false });
    const built = this.host.buildProps(site);
    this.host.scene.add(built.group);
    this.raised = { key, blocks, built, originals: new Map() };
    for (const k of blocks.keys()) this.apply(k);
  }

  /** A chunk streamed (back) in: put the house's blocks in it again. */
  chunkLoaded(cx: number, cz: number): void {
    if (!this.raised) return;
    const k = chunkKey(cx, cz);
    // A fresh chunk is the untouched ground again, so what was there before is worth remembering anew
    for (const [x, y, z] of this.raised.blocks.get(k) ?? []) this.raised.originals.delete(`${x},${y},${z}`);
    this.apply(k);
  }

  private apply(k: number): void {
    const r = this.raised!;
    for (const [x, y, z, id] of r.blocks.get(k) ?? []) {
      if (!this.host.voxels.isLoaded(x, z)) return;
      const cell = `${x},${y},${z}`;
      if (!r.originals.has(cell)) r.originals.set(cell, this.host.voxels.get(x, y, z));
      this.host.voxels.set(x, y, z, id);
    }
  }

  private takeDown(): void {
    const r = this.raised;
    if (!r) return;
    this.raised = null;
    for (const [cell, id] of r.originals) {
      const [x, y, z] = cell.split(',').map(Number);
      if (this.host.voxels.isLoaded(x, z)) this.host.voxels.set(x, y, z, id);
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

const ROOF_TONE: Record<string, string> = { red: '#b85a40', blue: '#4a6aa0', slate: '#5a5e6a', thatch: '#c8a860' };

