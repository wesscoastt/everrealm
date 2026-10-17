import * as THREE from 'three';
import * as P from './props';

// House doors that swing: shut across the doorway while nobody's about, open against the wall
// as someone (the player, another player, a villager) comes close. The leaf turns on its hinge,
// at the jamb; walking through never needs a key press.

/** How near (in blocks, across the ground) someone must be for a door to open. */
const REACH = 2.4;

export interface Door {
  pivot: THREE.Group;
  open: number;
  shut: number;
  /** 0 shut .. 1 open */
  t: number;
  hinge: THREE.Vector3;
}

/**
 * A door whose open leaf stands centred at (x, y, z) facing ry (the way the leaf props are placed:
 * see openDoorPlace). Shut, it turns a quarter back across the doorway.
 */
export function makeDoor(M: P.PropMaterials, x: number, y: number, z: number, ry: number): Door {
  const nx = Math.sin(ry), nz = Math.cos(ry);
  // The hinge is the leaf's outer end; the leaf hangs from it along -z in the pivot's frame
  const hinge = new THREE.Vector3(x + nx * 0.45, y, z + nz * 0.45);
  const pivot = new THREE.Group();
  pivot.position.copy(hinge);
  const leaf = P.openDoor(M);
  leaf.position.z = -0.45;
  pivot.add(leaf);
  const shut = ry - Math.PI / 2;
  pivot.rotation.y = shut;
  return { pivot, open: ry, shut, t: 0, hinge };
}

/** Swings each door towards open or shut; returns true when one near `me` starts to move. */
export function updateDoors(doors: Iterable<Door>, dt: number, movers: THREE.Vector3[], me: THREE.Vector3 | null, sound?: (open: boolean) => void): void {
  for (const d of doors) {
    let want = 0;
    for (const m of movers) {
      if (Math.abs(m.y - d.hinge.y) > 3) continue;
      if (Math.abs(m.x - d.hinge.x) < REACH && Math.abs(m.z - d.hinge.z) < REACH && Math.hypot(m.x - d.hinge.x, m.z - d.hinge.z) < REACH) { want = 1; break; }
    }
    if (want === d.t) continue;
    const was = d.t;
    d.t = want > d.t ? Math.min(1, d.t + dt * 3.2) : Math.max(0, d.t - dt * 2.2);
    if (sound && me && (was === 0 || was === 1) && Math.hypot(me.x - d.hinge.x, me.z - d.hinge.z) < 8) sound(want === 1);
    // Ease out: a door swings fast and settles
    const e = 1 - (1 - d.t) * (1 - d.t);
    d.pivot.rotation.y = d.shut + (d.open - d.shut) * e;
  }
}
