import * as THREE from 'three';
import type { MapMarker } from '../ui/Hud';
import { SHRINE_RUNE } from '../world/shrineData';
import { plan, WaymarkSpot } from '../world/sites';
import type { VoxelWorld } from '../world/VoxelWorld';

// Waymarks: a shrine by every Charter Post stop, on every vista and at the edge of every world
// boss's lair, each in its region's style (world/shrines.ts; the site planner places them). Walk up
// to one and it's yours; from then on the world map can take you there from anywhere for a few marks
// (Guild Wars 2's waypoints, ESO's wayshrines). The Charter Post still runs the roads and costs time;
// a waymark costs marks and nothing else.

export type Waymark = WaymarkSpot;

let LIST: Waymark[] | null = null;

export function waymarks(): Waymark[] {
  return LIST ?? (LIST = plan().waymarks);
}

/** Marks to go by waymark: two, and another for every eighty blocks (about five times the Post's fare, for being there at once). */
export function waymarkFare(from: { x: number; z: number }, to: Waymark): number {
  return 2 + Math.round(Math.hypot(from.x - to.x, from.z - to.z) / 80);
}

export class Waymarks {
  private meshes = new Map<string, { g: THREE.Group; rune: THREE.MeshLambertMaterial }>();

  constructor(
    private scene: THREE.Scene,
    private voxels: VoxelWorld,
    private known: (id: string) => boolean,
    private attune: (w: Waymark) => void,
  ) {}

  /** The shrine's rune (the shrine itself is a site prop): it glows brighter once attuned. */
  private build(w: Waymark): void {
    const R = SHRINE_RUNE[w.theme];
    const rune = new THREE.MeshLambertMaterial({ color: R.color, emissive: new THREE.Color(R.color) });
    const geo = R.shape === 'band' ? new THREE.BoxGeometry(R.w, R.h, R.d)
      : R.shape === 'orb' ? new THREE.SphereGeometry(R.w, 12, 10)
        : new THREE.CylinderGeometry(R.w, R.w, 0.1, 16).rotateX(Math.PI / 2);
    const o = new THREE.Mesh(geo, rune);
    // The Hollin stone leans a touch; its band leans with it
    if (w.theme === 'greenwake') o.rotation.y = 0.12;
    const g = new THREE.Group();
    g.add(o);
    g.position.set(w.x, w.y + R.y, w.z);
    g.rotation.y = w.ry;
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
      m.rune.emissive.set(SHRINE_RUNE[w.theme].color).multiplyScalar(on ? 0.75 + Math.sin(clock * 2 + w.x) * 0.25 : 0.12);
      if (!on && d < 6 && Math.abs(P.y - w.y) < 5) this.attune(w);
    }
  }

  markers(): MapMarker[] {
    return waymarks().map((w) => ({ x: w.x, z: w.z, kind: this.known(w.id) ? 'waymark' : 'waymarkDim', label: w.name, id: w.id }));
  }
}
