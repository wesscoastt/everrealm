import * as THREE from 'three';
import { WORLD_BOSSES } from '../data/activities';
import { POSTS } from '../data/travel';
import type { MapMarker } from '../ui/Hud';
import { plan } from '../world/sites';
import type { VoxelWorld } from '../world/VoxelWorld';
import { B } from '../world/blocks';

const CANOPY = new Set<number>([B.OakLeaves, B.BirchLeaves, B.PineLeaves, B.OakLog, B.BirchLog, B.PineLog]);

// Waymarks: carved stones by every Charter Post stop, on every vista and at the edge of every
// world boss's lair. Walk up to one and it's yours; from then on the world map can take you there
// from anywhere for a few marks (Guild Wars 2's waypoints). The Charter Post still runs the roads
// and costs time; a waymark costs marks and nothing else.

export interface Waymark {
  id: string; name: string;
  /** The stone. */
  x: number; z: number; y?: number;
  /** Where travellers are set down. */
  ax: number; az: number;
  /** The arrival height, when it isn't the ground (a vista's top). */
  ay?: number;
}

let LIST: Waymark[] | null = null;
/** Blocks from a vista cairn's centre to the ground beside it. */
const VISTA_STEP = 7;

export function waymarks(): Waymark[] {
  if (LIST) return LIST;
  const out: Waymark[] = [];
  for (const p of POSTS) { const x = Math.floor(p.x + Math.sin(p.ry) * 4) + 0.5, z = Math.floor(p.z + Math.cos(p.ry) * 4) + 0.5; out.push({ id: 'wm-' + p.id, name: p.name, x, z, ax: x + 1.5, az: z + 1.5 }); }
  for (const s of plan().sites) {
    const v = s.act?.kind === 'vista' ? s.act.view : undefined;
    // On a vista the stone stands at the foot of the cairn, and travellers arrive on top of it
    if (v) out.push({ id: 'wm-' + s.id, name: s.name.replace('Vista: ', ''), x: Math.floor(v[0]) + VISTA_STEP + 0.5, z: Math.floor(v[2]) + 1.5, ax: Math.floor(v[0]) + 0.5, az: Math.floor(v[2]) + 0.5, ay: v[1] });
  }
  for (const b of WORLD_BOSSES) {
    const lair = plan().sites.find((s) => s.id === 'lair-' + b.id);
    out.push({ id: 'wm-' + b.id, name: lair?.name ?? b.where, x: b.x + 0.5, z: b.z + 22.5, ax: b.x + 2, az: b.z + 24 });
  }
  return (LIST = out);
}

/** Marks to go by waymark: one, and another for every hundred and twenty blocks. */
export function waymarkFare(from: { x: number; z: number }, to: Waymark): number {
  return 1 + Math.round(Math.hypot(from.x - to.x, from.z - to.z) / 120);
}

const STONE = new THREE.MeshLambertMaterial({ color: '#b4b0a4' });
const CAP = new THREE.MeshLambertMaterial({ color: '#8e8a80' });

export class Waymarks {
  private meshes = new Map<string, { g: THREE.Group; rune: THREE.MeshLambertMaterial }>();

  constructor(
    private scene: THREE.Scene,
    private voxels: VoxelWorld,
    private known: (id: string) => boolean,
    private attune: (w: Waymark) => void,
  ) {}

  /** The stone itself: a squared pillar with a lit band of runes, brighter once attuned. */
  private build(w: Waymark): void {
    const g = new THREE.Group();
    const rune = new THREE.MeshLambertMaterial({ color: '#6ad0ff', emissive: new THREE.Color('#1a6a9a') });
    const add = (geo: THREE.BufferGeometry, m: THREE.Material, y: number, ry = 0) => { const o = new THREE.Mesh(geo, m); o.position.y = y; o.rotation.y = ry; o.castShadow = true; g.add(o); };
    add(new THREE.BoxGeometry(1.3, 0.3, 1.3), CAP, 0.15);
    add(new THREE.BoxGeometry(0.75, 2.2, 0.75), STONE, 1.4, Math.PI / 4);
    add(new THREE.BoxGeometry(0.8, 0.22, 0.8), rune, 1.75, Math.PI / 4);
    add(new THREE.ConeGeometry(0.55, 0.5, 4), CAP, 2.75, 0);
    // Stand on the ground, not on a tree that grew over the spot
    let top = this.voxels.topSolid(w.x, w.z);
    while (top > 0 && CANOPY.has(this.voxels.get(Math.floor(w.x), top, Math.floor(w.z)))) top--;
    const y = w.y ?? top + 1;
    g.position.set(w.x, y, w.z);
    this.scene.add(g);
    this.meshes.set(w.id, { g, rune });
  }

  update(P: THREE.Vector3, clock: number): void {
    for (const w of waymarks()) {
      const d = Math.hypot(P.x - w.x, P.z - w.z);
      let m = this.meshes.get(w.id);
      if (!m && d < 150 && this.voxels.isLoaded(w.x, w.z)) { this.build(w); m = this.meshes.get(w.id); }
      if (!m) continue;
      const on = this.known(w.id);
      m.rune.emissive.set(on ? '#3ab8ff' : '#1a4a6a').multiplyScalar(on ? 0.8 + Math.sin(clock * 2 + w.x) * 0.25 : 0.6);
      if (!on && d < 6 && Math.abs(P.y - m.g.position.y) < 4) this.attune(w);
    }
  }

  markers(): MapMarker[] {
    return waymarks().map((w) => ({ x: w.x, z: w.z, kind: this.known(w.id) ? 'waymark' : 'waymarkDim', label: w.name, id: w.id }));
  }
}
