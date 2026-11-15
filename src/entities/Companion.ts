import * as THREE from 'three';
import { PETS } from '../data/pets';
import { CreatureModel } from './creatures';

/**
 * A pet at someone's heels (data/pets.ts): it trots to a spot just behind and beside them, stops
 * when they stop, pecks about while it waits, and catches up at once if they've got far ahead
 * (a ride, a ferry, a door into a cellar). Looks only.
 */
export type PetDress = { name?: string; collar?: string; wear?: string; wearColor?: string; low?: boolean };

export class Companion {
  readonly model: CreatureModel;
  readonly pos = new THREE.Vector3();
  private yaw = 0;
  private idleT = 0;
  /** A hop of joy when it's been fed or played with (seconds left). */
  private hop = 0;
  /** What it's wearing, as a key: a change rebuilds it. */
  readonly dressKey: string;
  private low: boolean;

  constructor(readonly pet: string, at: THREE.Vector3, dress: PetDress | null = null) {
    const def = PETS[pet];
    this.model = new CreatureModel(def.kind, def.pal);
    this.model.root.scale.multiplyScalar(def.scale);
    this.pos.copy(at);
    this.model.root.position.copy(at);
    this.dressKey = JSON.stringify(dress ?? {});
    this.low = !!dress?.low;
    if (dress) this.dress(dress);
  }

  /** Happy: a hop or two on the spot. */
  cheer(): void { this.hop = 1.2; }

  /**
   * Its collar round the neck and its one thing more (a neckerchief, a ribbon, a little hat), fitted to its head
   * whatever its kind, and moving with it (data/petCare.ts).
   */
  private dress(d: PetDress): void {
    const head = this.model.head;
    if (!head || (!d.collar && !d.wear)) return;
    this.model.root.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(head), size = box.getSize(new THREE.Vector3()), c = box.getCenter(new THREE.Vector3());
    const ws = head.getWorldScale(new THREE.Vector3()).x || 1;
    const at = (x: number, y: number, z: number) => head.worldToLocal(new THREE.Vector3(x, y, z));
    const mat = (col: string) => new THREE.MeshLambertMaterial({ color: col });
    const w = Math.max(size.x, size.z) / ws;
    // (the creature faces +z: the neck is under the back of the head)
    const neck = at(c.x, box.min.y + size.y * 0.12, c.z - size.z * 0.25);
    if (d.collar) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(w * 0.42, w * 0.07, 5, 12), mat(d.collar));
      ring.rotation.x = Math.PI / 2; ring.position.copy(neck);
      head.add(ring);
      const tag = new THREE.Mesh(new THREE.CylinderGeometry(w * 0.09, w * 0.09, w * 0.03, 8), mat('#d8b048'));
      tag.rotation.x = Math.PI / 2; tag.position.copy(neck).add(new THREE.Vector3(0, -w * 0.12, w * 0.38));
      head.add(tag);
    }
    const col = d.wearColor ?? '#a8382c';
    if (d.wear === 'neckerchief') {
      const tri = new THREE.Mesh(new THREE.ConeGeometry(w * 0.4, w * 0.5, 3), mat(col));
      tri.rotation.set(Math.PI, 0, 0); tri.scale.z = 0.35; tri.position.copy(neck).add(new THREE.Vector3(0, -w * 0.2, w * 0.28));
      head.add(tri);
    } else if (d.wear === 'ribbon') {
      for (const s of [-1, 1]) {
        const loop = new THREE.Mesh(new THREE.ConeGeometry(w * 0.16, w * 0.3, 4), mat(col));
        loop.rotation.z = s * Math.PI / 2; loop.position.copy(at(c.x, box.max.y, c.z)).add(new THREE.Vector3(s * w * 0.16, 0, 0));
        head.add(loop);
      }
      const knot = new THREE.Mesh(new THREE.SphereGeometry(w * 0.07, 6, 5), mat(col));
      knot.position.copy(at(c.x, box.max.y, c.z)); head.add(knot);
    } else if (d.wear === 'hat') {
      const top = at(c.x, box.max.y, c.z);
      const brim = new THREE.Mesh(new THREE.CylinderGeometry(w * 0.34, w * 0.34, w * 0.04, 12), mat(col));
      brim.position.copy(top).add(new THREE.Vector3(0, w * 0.02, 0)); head.add(brim);
      const crown = new THREE.Mesh(new THREE.CylinderGeometry(w * 0.2, w * 0.23, w * 0.26, 12), mat(col));
      crown.position.copy(top).add(new THREE.Vector3(0, w * 0.16, 0)); head.add(crown);
      const band = new THREE.Mesh(new THREE.CylinderGeometry(w * 0.235, w * 0.235, w * 0.06, 12), mat('#2a1e14'));
      band.position.copy(top).add(new THREE.Vector3(0, w * 0.07, 0)); head.add(band);
    }
  }

  /**
   * Follow a leader standing at `at`, facing `yaw`. `ground` says where the feet go at (x, z) near
   * a height, if it knows; otherwise it keeps the leader's height.
   */
  update(dt: number, at: THREE.Vector3, yaw: number, ground?: (x: number, z: number, near: number) => number | null): void {
    // Its spot: a body behind the leader and a little to the left
    // (low in spirits, it trails further behind and doesn't hurry)
    const back = this.low ? 2.6 : 1.4;
    const tx = at.x - Math.sin(yaw) * back + Math.cos(yaw) * 0.8, tz = at.z - Math.cos(yaw) * back - Math.sin(yaw) * 0.8;
    const dx = tx - this.pos.x, dz = tz - this.pos.z, d = Math.hypot(dx, dz);
    if (d > 22 || Math.abs(at.y - this.pos.y) > 6) { this.pos.set(tx, at.y, tz); }
    let speed = 0;
    if (d > 0.6) {
      speed = Math.min(d > 4 ? (this.low ? 6 : 9) : this.low ? 3 : 4.5, d * 2.2);
      const step = Math.min(d, speed * dt);
      this.pos.x += (dx / d) * step; this.pos.z += (dz / d) * step;
      const want = Math.atan2(dx, dz);
      let dy = want - this.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy));
      this.yaw += dy * Math.min(1, dt * 10);
    } else if ((this.idleT -= dt) <= 0) {
      // Waiting: turn about now and then to look at something
      this.idleT = 2 + Math.random() * 4;
      this.yaw += (Math.random() - 0.5) * 2;
    }
    const g = ground?.(this.pos.x, this.pos.z, at.y);
    this.pos.y += ((g ?? at.y) - this.pos.y) * Math.min(1, dt * 12);
    this.model.root.position.copy(this.pos);
    if (this.hop > 0) { this.hop -= dt; this.model.root.position.y += Math.abs(Math.sin(this.hop * 9)) * 0.28 * Math.min(1, this.hop); }
    this.model.root.rotation.y = this.yaw;
    this.model.setAnim(speed > 5 ? 'run' : speed > 0.2 ? 'walk' : 'idle');
    this.model.update(dt, speed);
  }
}
