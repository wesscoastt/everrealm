import * as THREE from 'three';
import { B, isSolid } from '../world/blocks';
import * as P from '../world/props';
import { VoxelWorld } from '../world/VoxelWorld';

// A rowing boat of your own, or one hired by the hour from a boatman (data/content/boats.ts). Launch it
// from the water's edge, row it with W and S (pull and back the oars) and A and D (turn her), and step
// ashore wherever she touches land; Space puts you over the side. Left at the shore she stays moored
// there to come back to. There's only ever one: launching again brings her to where you are.

const SPEED = 4.4, BACK = 1.8, TURN = 1.5;
/** Where the rower sits, in the boat's frame (bow +x): on the after thwart, facing the bow. */
const SEAT = new THREE.Vector3(-0.3, 0.12, 0);

export class Rowboat {
  readonly root = new THREE.Group();
  private readonly oars: THREE.Group[] = [];
  readonly pos = new THREE.Vector3();
  yaw = 0;
  private speed = 0;
  private stroke = 0;
  /** In the water somewhere (moored, or under oars). */
  afloat = false;
  aboard = false;
  /** Hired (goes back to the boatman when the hire's up and you're ashore), not yours. */
  hired = false;
  /** The water's surface she floats on. */
  private surf = 0;

  constructor(scene: THREE.Object3D, private readonly voxels: VoxelWorld, M: P.PropMaterials) {
    const hull = P.boat(M);
    // The model's bow is +x; she's turned so it points along her heading
    hull.rotation.y = -Math.PI / 2;
    const body = new THREE.Group();
    body.add(hull);
    for (const sd of [1, -1]) {
      // An oar in its rowlock: the loom out over the side, the blade at the end
      const oar = new THREE.Group();
      oar.position.set(sd * 0.56, 0.72, -0.3);
      const loom = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.06, 0.06), M.wood);
      loom.position.x = sd * 0.75;
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.03, 0.16), M.darkWood);
      blade.position.x = sd * 1.6;
      oar.add(loom, blade);
      oar.userData.sd = sd;
      body.add(oar);
      this.oars.push(oar);
    }
    this.root.add(body);
    this.root.visible = false;
    scene.add(this.root);
  }

  /** The water's surface at (x, z) within a couple of blocks of y: the top of the highest water with air over it. */
  surface(x: number, z: number, y: number): number | null {
    const ix = Math.floor(x), iz = Math.floor(z);
    if (!this.voxels.isLoaded(ix, iz)) return null;
    for (let yy = Math.floor(y) + 1; yy >= Math.floor(y) - 3; yy--) {
      if (this.voxels.get(ix, yy, iz) !== B.Water) continue;
      const up = this.voxels.get(ix, yy + 1, iz);
      return up === B.Water || isSolid(up) ? null : yy + 1;
    }
    return null;
  }

  /** Open water for her to float in at a point: water at her level with nothing solid over it. */
  private open(x: number, z: number, surf = this.surf): boolean {
    return this.surface(x, z, surf - 0.5) === surf;
  }

  /** The nearest water to launch into from where someone stands (feet at p), and which way is out: or null. */
  launchSpot(p: THREE.Vector3): { x: number; z: number; surf: number; yaw: number } | null {
    let best: { x: number; z: number; surf: number; yaw: number } | null = null, bd = Infinity;
    for (let dz = -3; dz <= 3; dz++) for (let dx = -3; dx <= 3; dx++) {
      const x = Math.floor(p.x) + dx + 0.5, z = Math.floor(p.z) + dz + 0.5, d = Math.hypot(x - p.x, z - p.z);
      if (d > 3.2 || d >= bd) continue;
      const s = this.surface(x, z, p.y);
      if (s === null || p.y - s > 2.2 || s - p.y > 0.6) continue;
      // Room for her: open water a boat's length either way along the line out from the shore
      const yaw = Math.atan2(x - p.x, z - p.z), fx = Math.sin(yaw), fz = Math.cos(yaw);
      if (![0, 1.4, -1.2].every((k) => this.open(x + fx * k, z + fz * k, s))) continue;
      best = { x, z, surf: s, yaw }; bd = d;
    }
    return best;
  }

  /** Put her in the water. */
  launch(x: number, z: number, surf: number, yaw: number, hired: boolean): void {
    this.pos.set(x, surf, z);
    this.surf = surf;
    this.yaw = yaw;
    this.speed = 0;
    this.afloat = true;
    this.hired = hired;
    this.root.visible = true;
    this.place(0);
  }

  /** Take her out of the water (back to the boatman, or into your pack). */
  stow(): void {
    this.afloat = false;
    this.aboard = false;
    this.root.visible = false;
  }

  /** Where the rower sits, in the world. */
  seat(out: THREE.Vector3): THREE.Vector3 {
    const c = Math.cos(this.yaw), s = Math.sin(this.yaw);
    // Her heading is (sin yaw, cos yaw); the seat lies along it and across it
    return out.set(this.pos.x + s * SEAT.x + c * SEAT.z, this.pos.y + SEAT.y - 0.24, this.pos.z + c * SEAT.x - s * SEAT.z);
  }

  /** Dry land to step out onto beside her: the nearest standable cell within a long step, or null. */
  shore(): THREE.Vector3 | null {
    let best: THREE.Vector3 | null = null, bd = Infinity;
    for (let dz = -3; dz <= 3; dz++) for (let dx = -3; dx <= 3; dx++) {
      const x = Math.floor(this.pos.x) + dx, z = Math.floor(this.pos.z) + dz;
      const d = Math.hypot(x + 0.5 - this.pos.x, z + 0.5 - this.pos.z);
      if (d > 3 || d >= bd || !this.voxels.isLoaded(x, z)) continue;
      const g = this.voxels.groundBelow(x + 0.5, this.surf + 2.6, z + 0.5);
      if (g < this.surf || g > this.surf + 2.5) continue;
      if (this.voxels.get(x, g - 1, z) === B.Water || isSolid(this.voxels.get(x, g, z)) || isSolid(this.voxels.get(x, g + 1, z))) continue;
      best = new THREE.Vector3(x + 0.5, g, z + 0.5); bd = d;
    }
    return best;
  }

  /** Under oars: pull (+1), back (-1) or rest (0), and turn (+1 left, -1 right). */
  row(dt: number, pull: number, turn: number): void {
    const want = pull > 0 ? SPEED : pull < 0 ? -BACK : 0;
    this.speed += (want - this.speed) * Math.min(1, dt * (pull ? 1.4 : 0.8));
    // She turns on the oars even at rest, a little slower
    this.yaw += turn * TURN * dt * (0.6 + 0.4 * Math.min(1, Math.abs(this.speed) / SPEED));
    const fx = Math.sin(this.yaw), fz = Math.cos(this.yaw), step = this.speed * dt;
    const nx = this.pos.x + fx * step, nz = this.pos.z + fz * step;
    // Bow, stern and both sides must stay in open water: run her up a bank and she stops
    const lead = Math.sign(this.speed || 1) * 1.6, sx = fz * 0.5, sz = -fx * 0.5;
    if (this.open(nx + fx * lead, nz + fz * lead) && this.open(nx + sx, nz + sz) && this.open(nx - sx, nz - sz) && this.open(nx, nz)) {
      this.pos.x = nx; this.pos.z = nz;
    } else this.speed *= -0.2;
    if (pull || turn) this.stroke += dt * (pull ? 5.2 : 3.6);
    this.place(dt, pull !== 0 || turn !== 0);
  }

  /** Sets her model where she is, rocking a little on the water; the oars pull when she's rowed. */
  place(dt: number, rowing = false): void {
    const t = performance.now() * 0.001;
    this.root.position.set(this.pos.x, this.surf - 0.27 + Math.sin(t * 1.3) * 0.02, this.pos.z);
    this.root.rotation.set(Math.sin(t * 1.1) * 0.02, this.yaw, Math.sin(t * 0.9) * 0.025, 'YXZ');
    for (const oar of this.oars) {
      const sd = oar.userData.sd as number;
      const k = rowing ? this.stroke : 0;
      // Sweep aft through the water, lift, swing forward in the air
      oar.rotation.set(0, sd * (rowing ? Math.sin(k) * 0.55 : 0.9), sd * (rowing ? 0.18 + Math.cos(k) * 0.16 : -0.25));
    }
    void dt;
  }
}
