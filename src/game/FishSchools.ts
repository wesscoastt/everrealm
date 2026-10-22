import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { VoxelWorld } from '../world/VoxelWorld';
import { B } from '../world/blocks';
import { lakeDist, SEA } from '../world/terrain';

// Life in the water: small schools of fish under the surface of the rivers, lakes and shallows near
// you, seen through the water from the bank or swum among. They keep to water at least two blocks
// deep, turn at the banks, and scatter when you come at them. River and lake fish are brown and
// green, sea fish silver and blue; now and then a lake has golden carp in it.

interface School {
  pos: THREE.Vector3;
  heading: number;
  speed: number;
  /** Lowest and highest the school swims, so it stays under the surface and off the bed. */
  y0: number;
  y1: number;
  fish: { dx: number; dy: number; dz: number; ph: number; colour: THREE.Color }[];
  flee: number;
}

const CAP = 140;
const KINDS = {
  river: ['#6a5a3a', '#5a6a42', '#7a6a4a'],
  sea: ['#9aa8b8', '#6a8aa8', '#b8c4d0'],
  carp: ['#d8902a', '#e8b040', '#c86a2a'],
};

export class FishSchools {
  private schools: School[] = [];
  private mesh: THREE.InstancedMesh;
  private look = 0;
  private m = new THREE.Matrix4();
  private q = new THREE.Quaternion();
  private e = new THREE.Euler();
  private v = new THREE.Vector3();
  private one = new THREE.Vector3(1, 1, 1);

  constructor(scene: THREE.Scene, private readonly voxels: VoxelWorld) {
    // A fish: a body narrowing to the tail, and a tail fin
    const body = new THREE.BoxGeometry(0.09, 0.12, 0.32);
    const p = body.attributes.position;
    for (let i = 0; i < p.count; i++) if (p.getZ(i) < 0) { p.setX(i, p.getX(i) * 0.45); p.setY(i, p.getY(i) * 0.55); }
    const tail = new THREE.BoxGeometry(0.02, 0.14, 0.1);
    tail.translate(0, 0, -0.2);
    const geo = mergeGeometries([body.toNonIndexed(), tail.toNonIndexed()])!;
    geo.computeVertexNormals();
    this.mesh = new THREE.InstancedMesh(geo, new THREE.MeshLambertMaterial({ color: '#ffffff' }), CAP);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.frustumCulled = false;
    this.mesh.count = 0;
    scene.add(this.mesh);
  }

  /** How deep the water is at (x, z) from its top, and the top: null if it's under two blocks. */
  private water(x: number, z: number): { top: number; bed: number } | null {
    const ix = Math.floor(x), iz = Math.floor(z);
    let y = 90;
    while (y > 2 && this.voxels.get(ix, y, iz) === B.Air) y--;
    if (this.voxels.get(ix, y, iz) !== B.Water) return null;
    let bed = y;
    while (bed > 1 && this.voxels.get(ix, bed - 1, iz) === B.Water) bed--;
    return y - bed >= 1 ? { top: y + 1, bed } : null;
  }

  update(dt: number, player: THREE.Vector3): void {
    // Find water near you for a school, now and then, up to six
    this.look -= dt;
    if (this.look <= 0) {
      this.look = 1.2;
      this.schools = this.schools.filter((s) => Math.hypot(s.pos.x - player.x, s.pos.z - player.z) < 50);
      if (this.schools.length < 6) {
        const a = Math.random() * Math.PI * 2, r = 8 + Math.random() * 24;
        const x = player.x + Math.cos(a) * r, z = player.z + Math.sin(a) * r;
        const w = this.voxels.isLoaded(x, z) ? this.water(x, z) : null;
        if (w) {
          const sea = w.top <= SEA + 2 && lakeDist(x, z) > 20;
          const kind = sea ? 'sea' : lakeDist(x, z) < 6 && Math.random() < 0.3 ? 'carp' : 'river';
          const n = 5 + Math.floor(Math.random() * 5);
          const y0 = w.bed + 0.4, y1 = w.top - 0.6;
          this.schools.push({
            pos: new THREE.Vector3(x, (y0 + y1) / 2, z), heading: Math.random() * Math.PI * 2, speed: 0.6 + Math.random() * 0.6, y0, y1, flee: 0,
            fish: Array.from({ length: n }, () => ({ dx: (Math.random() - 0.5) * 1.6, dy: (Math.random() - 0.5) * 0.5, dz: (Math.random() - 0.5) * 1.6, ph: Math.random() * 6, colour: new THREE.Color(KINDS[kind][Math.floor(Math.random() * 3)]).multiplyScalar(0.9 + Math.random() * 0.2) })),
          });
        }
      }
    }
    // Swim: on along the heading, turning off the banks; away from you when you're close
    const t = performance.now() / 1000;
    let k = 0;
    for (const s of this.schools) {
      const dp = Math.hypot(player.x - s.pos.x, player.z - s.pos.z);
      if (dp < 3.5 && s.flee <= 0) { s.flee = 2; s.heading = Math.atan2(s.pos.x - player.x, s.pos.z - player.z); }
      s.flee -= dt;
      const sp = s.flee > 0 ? 3.2 : s.speed;
      s.heading += Math.sin(t * 0.3 + s.speed * 10) * dt * 0.4;
      const nx = s.pos.x + Math.sin(s.heading) * sp * dt, nz = s.pos.z + Math.cos(s.heading) * sp * dt;
      const ahead = this.water(nx + Math.sin(s.heading) * 1.2, nz + Math.cos(s.heading) * 1.2);
      if (ahead && Math.abs(ahead.top - 0.6 - s.y1) < 2.5) {
        s.pos.x = nx; s.pos.z = nz;
        s.y0 = Math.max(s.y0, ahead.bed + 0.4); s.y1 = Math.min(Math.max(s.y0, ahead.top - 0.6), s.y1 + 0.5);
      } else s.heading += Math.PI * (0.5 + Math.random() * 0.5);
      s.pos.y += (((s.y0 + s.y1) / 2 + Math.sin(t * 0.5 + s.speed) * 0.25) - s.pos.y) * Math.min(1, dt);
      for (const f of s.fish) {
        if (k >= CAP) break;
        const wob = Math.sin(t * (s.flee > 0 ? 14 : 6) + f.ph);
        const c = Math.cos(s.heading), sn = Math.sin(s.heading);
        this.v.set(s.pos.x + f.dx * c + f.dz * sn, Math.min(s.y1, Math.max(s.y0, s.pos.y + f.dy)), s.pos.z - f.dx * sn + f.dz * c);
        this.q.setFromEuler(this.e.set(0, s.heading + wob * 0.18, 0));
        this.m.compose(this.v, this.q, this.one);
        this.mesh.setMatrixAt(k, this.m);
        this.mesh.setColorAt(k, f.colour);
        k++;
      }
    }
    this.mesh.count = k;
    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }
}
