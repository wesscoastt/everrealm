import * as THREE from 'three';
import { PETS } from '../data/pets';
import { CreatureModel } from './creatures';

/**
 * A pet at someone's heels (data/pets.ts): it trots to a spot just behind and beside them, stops
 * when they stop, pecks about while it waits, and catches up at once if they've got far ahead
 * (a ride, a ferry, a door into a cellar). Looks only.
 */
export type PetDress = { name?: string; collar?: string; neck?: string; head?: string; back?: string; neckCol?: string; headCol?: string; backCol?: string; low?: boolean };

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
   * What it wears, fitted to its head and back whatever kind it is, and moving with it (data/petCare.ts): a collar
   * with a brass tag, and one piece each round the neck, on the head and on the back.
   */
  private dress(d: PetDress): void {
    const head = this.model.head;
    if (!head || (!d.collar && !d.neck && !d.head && !d.back)) return;
    this.model.root.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(head), size = box.getSize(new THREE.Vector3()), c = box.getCenter(new THREE.Vector3());
    const ws = head.getWorldScale(new THREE.Vector3()).x || 1;
    const at = (x: number, y: number, z: number) => head.worldToLocal(new THREE.Vector3(x, y, z));
    const mats = new Map<string, THREE.MeshLambertMaterial>();
    const mat = (col: string, glow = false) => { const k = col + glow; let m = mats.get(k); if (!m) { m = new THREE.MeshLambertMaterial({ color: col, ...(glow ? { emissive: col, emissiveIntensity: 0.8 } : {}) }); mats.set(k, m); } return m; };
    const w = Math.max(size.x, size.z) / ws;
    const put = (parent: THREE.Object3D, geo: THREE.BufferGeometry, col: string, p: THREE.Vector3, rx = 0, ry = 0, rz = 0, glow = false) => { const m = new THREE.Mesh(geo, mat(col, glow)); m.position.copy(p); m.rotation.set(rx, ry, rz); parent.add(m); return m; };
    const off = (p: THREE.Vector3, x: number, y: number, z: number) => p.clone().add(new THREE.Vector3(x * w, y * w, z * w));
    // (the creature faces +z: the neck is under the back of the head, the crown on top)
    const neck = at(c.x, box.min.y + size.y * 0.12, c.z - size.z * 0.25), top = at(c.x, box.max.y, c.z);
    if (d.collar) {
      put(head, new THREE.TorusGeometry(w * 0.42, w * 0.07, 5, 12), d.collar, neck, Math.PI / 2);
      put(head, new THREE.CylinderGeometry(w * 0.09, w * 0.09, w * 0.03, 8), '#d8b048', off(neck, 0, -0.12, 0.38), Math.PI / 2);
    }
    const nc = d.neckCol ?? '#a8382c', hc = d.headCol ?? '#2f528f', bc = d.backCol ?? '#5a2f6a';
    switch (d.neck) {
      case 'neckerchief': { const m = put(head, new THREE.ConeGeometry(w * 0.4, w * 0.5, 3), nc, off(neck, 0, -0.2, 0.28), Math.PI); m.scale.z = 0.35; break; }
      case 'bell': put(head, new THREE.TorusGeometry(w * 0.4, w * 0.025, 4, 12), '#6a4a2a', neck, Math.PI / 2); put(head, new THREE.SphereGeometry(w * 0.11, 8, 6), '#d8b048', off(neck, 0, -0.16, 0.4)); break;
      case 'bowtie': for (const s of [-1, 1]) put(head, new THREE.ConeGeometry(w * 0.12, w * 0.22, 4), nc, off(neck, s * 0.12, -0.08, 0.4), 0, 0, s * Math.PI / 2); put(head, new THREE.SphereGeometry(w * 0.06, 6, 5), nc, off(neck, 0, -0.08, 0.42)); break;
      case 'scarf': put(head, new THREE.TorusGeometry(w * 0.44, w * 0.12, 6, 12), nc, neck, Math.PI / 2); put(head, new THREE.BoxGeometry(w * 0.16, w * 0.4, w * 0.06), nc, off(neck, 0.18, -0.3, 0.32), 0.2); break;
      case 'garland': for (let i = 0; i < 9; i++) { const a = (i / 9) * Math.PI * 2; put(head, new THREE.SphereGeometry(w * 0.08, 6, 5), i % 3 ? '#f4f0e0' : '#f2c51e', off(neck, Math.cos(a) * 0.44, 0, Math.sin(a) * 0.44)); } break;
      case 'ruff': put(head, new THREE.CylinderGeometry(w * 0.62, w * 0.55, w * 0.12, 18), '#f4f0e8', neck); break;
      case 'medal': put(head, new THREE.BoxGeometry(w * 0.12, w * 0.24, w * 0.03), '#2f528f', off(neck, 0, -0.14, 0.4)); put(head, new THREE.CylinderGeometry(w * 0.11, w * 0.11, w * 0.03, 10), '#d8b048', off(neck, 0, -0.3, 0.41), Math.PI / 2); break;
    }
    switch (d.head) {
      case 'ribbon': for (const s of [-1, 1]) put(head, new THREE.ConeGeometry(w * 0.16, w * 0.3, 4), hc, off(top, s * 0.16, 0, 0), 0, 0, s * Math.PI / 2); put(head, new THREE.SphereGeometry(w * 0.07, 6, 5), hc, top); break;
      case 'felthat': put(head, new THREE.CylinderGeometry(w * 0.34, w * 0.34, w * 0.04, 12), hc, off(top, 0, 0.02, 0)); put(head, new THREE.CylinderGeometry(w * 0.2, w * 0.23, w * 0.26, 12), hc, off(top, 0, 0.16, 0)); put(head, new THREE.CylinderGeometry(w * 0.235, w * 0.235, w * 0.06, 12), '#2a1e14', off(top, 0, 0.07, 0)); break;
      case 'straw': put(head, new THREE.CylinderGeometry(w * 0.5, w * 0.5, w * 0.03, 14), '#e0c070', off(top, 0, 0.02, 0)); put(head, new THREE.CylinderGeometry(w * 0.2, w * 0.24, w * 0.18, 12), '#d8b860', off(top, 0, 0.12, 0)); put(head, new THREE.CylinderGeometry(w * 0.245, w * 0.245, w * 0.05, 12), '#a8382c', off(top, 0, 0.06, 0)); break;
      case 'beret': { const m = put(head, new THREE.SphereGeometry(w * 0.3, 10, 6), hc, off(top, 0.06, 0.04, 0), 0, 0, -0.35); m.scale.y = 0.35; put(head, new THREE.SphereGeometry(w * 0.04, 5, 4), hc, off(top, 0.02, 0.14, 0)); break; }
      case 'flowers': for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; put(head, new THREE.SphereGeometry(w * 0.07, 6, 5), ['#4a74d8', '#d8362a', '#f2c51e', '#ffffff'][i % 4], off(top, Math.cos(a) * 0.26, 0.02, Math.sin(a) * 0.26)); } break;
      case 'antlers': for (const s of [-1, 1]) { put(head, new THREE.CylinderGeometry(w * 0.03, w * 0.04, w * 0.4, 5), '#7a5030', off(top, s * 0.18, 0.18, 0), 0, 0, -s * 0.35); put(head, new THREE.CylinderGeometry(w * 0.025, w * 0.03, w * 0.2, 5), '#7a5030', off(top, s * 0.3, 0.3, 0.04), 0.4, 0, -s * 1.0); } break;
      case 'tricorn': put(head, new THREE.CylinderGeometry(w * 0.42, w * 0.42, w * 0.1, 3), '#1e1a18', off(top, 0, 0.05, 0), 0, Math.PI / 6); put(head, new THREE.CylinderGeometry(w * 0.2, w * 0.24, w * 0.16, 10), '#1e1a18', off(top, 0, 0.14, 0)); put(head, new THREE.ConeGeometry(w * 0.06, w * 0.34, 5), '#c83a2a', off(top, 0.14, 0.26, -0.06), 0.3, 0, -0.5); break;
      case 'tophat': put(head, new THREE.CylinderGeometry(w * 0.36, w * 0.36, w * 0.03, 14), '#141418', off(top, 0, 0.02, 0)); put(head, new THREE.CylinderGeometry(w * 0.22, w * 0.22, w * 0.5, 14), '#141418', off(top, 0, 0.27, 0)); put(head, new THREE.CylinderGeometry(w * 0.225, w * 0.225, w * 0.07, 14), '#7a1e1a', off(top, 0, 0.07, 0)); break;
      case 'wizard': put(head, new THREE.CylinderGeometry(w * 0.4, w * 0.4, w * 0.03, 14), '#22305a', off(top, 0, 0.02, 0)); put(head, new THREE.ConeGeometry(w * 0.24, w * 0.7, 12), '#22305a', off(top, 0, 0.37, 0), -0.15); for (let i = 0; i < 5; i++) put(head, new THREE.SphereGeometry(w * 0.03, 5, 4), '#f4d27a', off(top, Math.cos(i * 1.3) * 0.15, 0.15 + i * 0.09, Math.sin(i * 1.3) * 0.15 - i * 0.02), 0, 0, 0, true); break;
      case 'crown': put(head, new THREE.CylinderGeometry(w * 0.24, w * 0.24, w * 0.14, 10, 1, true), '#e0bd64', off(top, 0, 0.08, 0)); for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2; put(head, new THREE.ConeGeometry(w * 0.05, w * 0.12, 4), '#e0bd64', off(top, Math.cos(a) * 0.24, 0.2, Math.sin(a) * 0.24)); } break;
    }
    if (d.back) {
      const body = this.model.body;
      const bb = new THREE.Box3().setFromObject(body), bs = bb.getSize(new THREE.Vector3()), bcn = bb.getCenter(new THREE.Vector3());
      const bw = (body.getWorldScale(new THREE.Vector3()).x || 1);
      const loc = (x: number, y: number, z: number) => body.worldToLocal(new THREE.Vector3(x, y, z));
      const back = loc(bcn.x, bb.max.y, bcn.z - bs.z * 0.08), W = bs.x / bw, Z = bs.z / bw;
      const boff = (x: number, y: number, z: number) => back.clone().add(new THREE.Vector3(x * W, y * W, z * Z));
      switch (d.back) {
        case 'saddlebags': for (const s of [-1, 1]) put(body, new THREE.BoxGeometry(W * 0.22, W * 0.32, Z * 0.3), '#7a4a26', boff(s * 0.55, -0.22, 0)); put(body, new THREE.BoxGeometry(W * 1.05, W * 0.05, Z * 0.18), '#5a3a1e', boff(0, 0.01, 0)); break;
        case 'cape': { const m = put(body, new THREE.BoxGeometry(W * 0.95, W * 0.04, Z * 0.7), bc, boff(0, 0.03, -0.1), -0.08); m.scale.x = 1; put(body, new THREE.SphereGeometry(W * 0.06, 6, 5), '#d8b048', boff(0, 0.02, 0.28)); break; }
        case 'coat': put(body, new THREE.BoxGeometry(W * 1.08, W * 0.5, Z * 0.72), bc, boff(0, -0.2, 0)); for (let i = 0; i < 3; i++) put(body, new THREE.SphereGeometry(W * 0.035, 5, 4), '#d8b048', boff(0.55, -0.12 - i * 0.1, 0.1 - i * 0.1)); break;
        case 'lantern': put(body, new THREE.CylinderGeometry(W * 0.025, W * 0.025, W * 0.7, 5), '#5a3a1e', boff(0, 0.35, -0.15)); put(body, new THREE.BoxGeometry(W * 0.16, W * 0.2, W * 0.16), '#f4c060', boff(0, 0.74, -0.15), 0, 0, 0, true); put(body, new THREE.BoxGeometry(W * 0.2, W * 0.04, W * 0.2), '#2a2420', boff(0, 0.86, -0.15)); break;
        case 'shield': put(body, new THREE.CylinderGeometry(W * 0.32, W * 0.32, W * 0.05, 14), '#5a2a24', boff(0, 0.05, 0), 0); put(body, new THREE.BoxGeometry(W * 0.05, W * 0.05, Z * 0.36), '#c8ccd0', boff(0, 0.09, 0), 0, 0.7); put(body, new THREE.BoxGeometry(W * 0.05, W * 0.05, Z * 0.36), '#8a6a3a', boff(0, 0.09, 0), 0, -0.7); break;
        case 'wings': for (const s of [-1, 1]) { const m = new THREE.Mesh(new THREE.CircleGeometry(W * 0.45, 10), new THREE.MeshLambertMaterial({ color: '#e8e4f0', transparent: true, opacity: 0.55, side: THREE.DoubleSide })); m.position.copy(boff(s * 0.35, 0.2, -0.05)); m.rotation.set(-Math.PI / 2 + 0.4, 0, s * 0.6); m.scale.set(1, 0.6, 1); body.add(m); } break;
      }
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
