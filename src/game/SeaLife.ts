import * as THREE from 'three';
import { B } from '../world/blocks';
import type { VoxelWorld } from '../world/VoxelWorld';
import { regionAt } from '../world/terrain';

// The sea alive (owner 2026-11-13: "add more sea life and sea variation in aesthetic etc"). Around you wherever there's
// water deep enough: shoals of small fish turning together under the surface, a pod of dolphins breaking the water
// further out, now and then a whale rolling up to blow in the open sea, and jellyfish hanging in the shallows by night
// and in warm water. Each sea its own: bright reef fish and turquoise jellies in the Keys and the warm south, silver
// herring and grey seals' waters in the cold north, mackerel-backed shoals round the Counties. None of it is fought or
// caught; it's put about the player and taken away again as you go (like the birds, game/Birds.ts).

const SEA_TOP = 15; // the water's top block (the world's sea surface, and the island's)

type Climate = 'warm' | 'cold' | 'temperate';
const climateAt = (x: number, z: number): Climate => {
  const r = regionAt(x, z).a as string;
  if (r === 'keys' || r === 'glades' || r === 'bright' || r === 'verandah') return 'warm';
  if (r === 'sickle' || r === 'gannet' || r === 'tolmen' || r === 'kell') return 'cold';
  return 'temperate';
};
const FISH_COLOURS: Record<Climate, [string, string][]> = {
  warm: [['#f2c230', '#2a6ad8'], ['#e8582a', '#f4f0e0'], ['#3ac8d8', '#f2d040'], ['#a050d0', '#f0c030']],
  temperate: [['#5a7a8a', '#d8dce0'], ['#4a6a3a', '#c8c0a0'], ['#6a8098', '#e8e8f0']],
  cold: [['#8a98a8', '#e8eef4'], ['#5a6878', '#c8d0d8']],
};
const JELLY_COLOURS: Record<Climate, string> = { warm: '#6af0e8', temperate: '#e8a8f0', cold: '#c8d8ff' };

const hash = (a: number, b: number) => { const v = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return v - Math.floor(v); };

interface Shoal { mesh: THREE.InstancedMesh; cx: number; cz: number; y: number; r: number; speed: number; phase: number; n: number }
interface Pod { group: THREE.Group; dolphins: THREE.Group[]; x: number; z: number; heading: number; t0: number }
interface Whale { group: THREE.Group; tail: THREE.Object3D; spout: THREE.Points; x: number; z: number; heading: number; t0: number }
interface Jelly { mesh: THREE.Mesh; x: number; y: number; z: number; seed: number }

export class SeaLife {
  private shoals: Shoal[] = [];
  private pods: Pod[] = [];
  private whale: Whale | null = null;
  private jellies: Jelly[] = [];
  private t = 0;
  private lookT = 0;
  private fishGeo: THREE.BufferGeometry;
  private mats = new Map<string, THREE.MeshLambertMaterial>();

  constructor(private scene: THREE.Scene, private voxels: VoxelWorld) {
    // a small fish: a slim body and a tail fin, nose along +z
    const body = new THREE.BoxGeometry(0.09, 0.14, 0.42);
    const tail = new THREE.BoxGeometry(0.02, 0.16, 0.1); tail.translate(0, 0, -0.25);
    this.fishGeo = mergeBoxes([body, tail]);
  }

  private mat(c: string, emissive = 0): THREE.MeshLambertMaterial {
    const k = c + emissive;
    let m = this.mats.get(k);
    if (!m) { m = new THREE.MeshLambertMaterial({ color: c, emissive: new THREE.Color(c).multiplyScalar(emissive), transparent: emissive > 0, opacity: emissive > 0 ? 0.75 : 1 }); this.mats.set(k, m); }
    return m;
  }

  /** How deep the water is here (0 on land or where it isn't loaded). */
  private depth(x: number, z: number): number {
    if (!this.voxels.isLoaded(Math.floor(x), Math.floor(z))) return 0;
    if (this.voxels.get(Math.floor(x), SEA_TOP, Math.floor(z)) !== B.Water) return 0;
    let d = 0; while (d < 30 && this.voxels.get(Math.floor(x), SEA_TOP - d, Math.floor(z)) === B.Water) d++;
    return d;
  }

  /** A spot of water this deep at least, somewhere between near and far from p (or null). */
  private findWater(p: THREE.Vector3, near: number, far: number, minDepth: number): { x: number; z: number; d: number } | null {
    for (let i = 0; i < 10; i++) {
      const a = Math.random() * Math.PI * 2, r = near + Math.random() * (far - near);
      const x = p.x + Math.sin(a) * r, z = p.z + Math.cos(a) * r, d = this.depth(x, z);
      if (d >= minDepth) return { x, z, d };
    }
    return null;
  }

  update(dt: number, player: THREE.Vector3, night: number): void {
    this.t += dt;
    // Every couple of seconds: what's too far is taken away, and new life put where there's sea for it
    if ((this.lookT -= dt) <= 0) {
      this.lookT = 2;
      const far = (o: { x: number; z: number }, r: number) => Math.hypot(o.x - player.x, o.z - player.z) > r;
      this.shoals = this.shoals.filter((s) => { if (far({ x: s.cx, z: s.cz }, 70)) { this.scene.remove(s.mesh); s.mesh.dispose(); return false; } return true; });
      this.pods = this.pods.filter((p) => { if (far(p, 140)) { this.scene.remove(p.group); return false; } return true; });
      if (this.whale && far(this.whale, 220)) { this.scene.remove(this.whale.group); this.whale = null; }
      this.jellies = this.jellies.filter((j) => { if (far(j, 50)) { this.scene.remove(j.mesh); return false; } return true; });
      const nearSea = this.findWater(player, 4, 40, 2);
      if (nearSea) {
        if (this.shoals.length < 5) this.addShoal(player);
        if (this.pods.length < 1 && Math.random() < 0.25) this.addPod(player);
        if (!this.whale && Math.random() < 0.06) this.addWhale(player);
        const cl = climateAt(nearSea.x, nearSea.z);
        const jellyCap = night > 0.5 || cl === 'warm' ? 8 : 2;
        if (this.jellies.length < jellyCap && Math.random() < 0.5) this.addJelly(player, cl);
      }
    }
    const t = this.t;
    // Shoals: round and round a centre, the whole shoal turning together, each fish a little out of step
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), s1 = new THREE.Vector3(1, 1, 1), up = new THREE.Vector3(0, 1, 0);
    for (const s of this.shoals) {
      // they scatter from you when you swim in among them
      const dx = s.cx - player.x, dz = s.cz - player.z, dist = Math.hypot(dx, dz);
      const flee = dist < 4 && player.y < SEA_TOP + 1.5 ? (4 - dist) * 0.6 : 0;
      for (let i = 0; i < s.n; i++) {
        const k = hash(i, s.phase);
        const a = t * s.speed + i * 0.42 + Math.sin(t * 0.7 + i) * 0.15;
        const rr = s.r + (k - 0.5) * 1.6 + flee;
        const x = s.cx + Math.sin(a) * rr, z = s.cz + Math.cos(a) * rr, y = s.y + Math.sin(t * 1.3 + i * 1.7) * 0.25 + (k - 0.5) * 0.8;
        q.setFromAxisAngle(up, a + Math.PI / 2 * Math.sign(s.speed) + Math.sin(t * 9 + i) * 0.12);
        m4.compose(v.set(x, y, z), q, s1);
        s.mesh.setMatrixAt(i, m4);
      }
      s.mesh.instanceMatrix.needsUpdate = true;
    }
    // Dolphins: swimming on together, each one breaking the surface in its own leap
    for (const p of this.pods) {
      const k = t - p.t0;
      p.x += Math.sin(p.heading) * dt * 5.5; p.z += Math.cos(p.heading) * dt * 5.5;
      if (this.depth(p.x + Math.sin(p.heading) * 8, p.z + Math.cos(p.heading) * 8) < 3) p.heading += dt * 1.2; // (round from the shore)
      p.dolphins.forEach((d, i) => {
        const off = (i - 1) * 2.2, lag = i * 0.9;
        const cycle = ((k + lag) % 4.2) / 4.2, leap = cycle < 0.35 ? Math.sin((cycle / 0.35) * Math.PI) : 0;
        d.position.set(p.x + Math.cos(p.heading) * off - Math.sin(p.heading) * i * 1.5, SEA_TOP + 0.1 - 0.9 + leap * 2.1, p.z - Math.sin(p.heading) * off - Math.cos(p.heading) * i * 1.5);
        d.rotation.set(-(cycle < 0.35 ? Math.cos((cycle / 0.35) * Math.PI) * 0.7 : 0), p.heading, 0);
        d.visible = true;
      });
    }
    // The whale: slow along under the surface, rolling up to blow every half minute or so, the flukes last
    if (this.whale) {
      const w = this.whale, k = t - w.t0;
      w.x += Math.sin(w.heading) * dt * 1.6; w.z += Math.cos(w.heading) * dt * 1.6;
      if (this.depth(w.x + Math.sin(w.heading) * 20, w.z + Math.cos(w.heading) * 20) < 6) w.heading += dt * 0.3;
      const cyc = (k % 28) / 28, rise = cyc < 0.25 ? Math.sin((cyc / 0.25) * Math.PI) : 0;
      w.group.position.set(w.x, SEA_TOP - 2.6 + rise * 2.2, w.z);
      w.group.rotation.set(rise * -0.12, w.heading, 0);
      w.tail.rotation.x = Math.sin(k * 0.9) * 0.25 + (cyc > 0.2 && cyc < 0.27 ? -0.9 : 0);
      (w.spout.material as THREE.PointsMaterial).opacity = cyc > 0.06 && cyc < 0.16 ? 0.75 * Math.sin(((cyc - 0.06) / 0.1) * Math.PI) : 0;
      w.spout.scale.y = 0.5 + ((cyc - 0.06) / 0.1) * 1.5;
    }
    // Jellyfish: hanging and pulsing, drifting with the water, a glow to them by night
    for (const j of this.jellies) {
      const pulse = (Math.sin(t * 1.8 + j.seed * 9) + 1) / 2;
      j.mesh.position.set(j.x + Math.sin(t * 0.12 + j.seed) * 1.5, j.y + pulse * 0.35, j.z + Math.cos(t * 0.1 + j.seed * 3) * 1.5);
      j.mesh.scale.set(1 + pulse * 0.12, 1 - pulse * 0.15, 1 + pulse * 0.12);
      (j.mesh.material as THREE.MeshLambertMaterial).emissiveIntensity = 0.4 + night * 1.6;
    }
  }

  private addShoal(p: THREE.Vector3): void {
    const at = this.findWater(p, 6, 40, 3);
    if (!at) return;
    const cl = climateAt(at.x, at.z), pal = FISH_COLOURS[cl], [a, b] = pal[Math.floor(Math.random() * pal.length)];
    const n = cl === 'warm' ? 10 + Math.floor(Math.random() * 8) : 16 + Math.floor(Math.random() * 14);
    // a back of one colour, a belly of the other: two-tone through the vertex colours
    const geo = this.fishGeo.clone();
    const col = new Float32Array(geo.attributes.position.count * 3), ca = new THREE.Color(a), cb = new THREE.Color(b);
    for (let i = 0; i < geo.attributes.position.count; i++) { const c = geo.attributes.position.getY(i) > 0 ? ca : cb; col.set([c.r, c.g, c.b], i * 3); }
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const mesh = new THREE.InstancedMesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true }), n);
    mesh.frustumCulled = false;
    const scale = cl === 'warm' ? 1.3 : 1;
    mesh.scale.setScalar(1); geo.scale(scale, scale, scale);
    this.scene.add(mesh);
    this.shoals.push({ mesh, cx: at.x, cz: at.z, y: SEA_TOP - Math.min(at.d - 1, 1 + Math.random() * 3), r: 1.4 + Math.random() * 2, speed: (Math.random() < 0.5 ? -1 : 1) * (0.5 + Math.random() * 0.5), phase: Math.random() * 100, n });
  }

  private dolphin(): THREE.Group {
    const g = new THREE.Group(), grey = this.mat('#5a6a7a'), belly = this.mat('#c8d0d8');
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.55, 2.1), grey); g.add(body);
    const under = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.18, 1.7), belly); under.position.set(0, -0.22, 0.05); g.add(under);
    const beak = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.2, 0.45), grey); beak.position.set(0, -0.08, 1.25); g.add(beak);
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.45, 0.4), grey); fin.position.set(0, 0.42, -0.1); fin.rotation.x = -0.4; g.add(fin);
    const fluke = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.06, 0.3), grey); fluke.position.set(0, 0, -1.2); g.add(fluke);
    return g;
  }

  private addPod(p: THREE.Vector3): void {
    const at = this.findWater(p, 30, 90, 5);
    if (!at) return;
    const group = new THREE.Group(), dolphins: THREE.Group[] = [];
    const n = 2 + Math.floor(Math.random() * 3);
    for (let i = 0; i < n; i++) { const d = this.dolphin(); d.visible = false; group.add(d); dolphins.push(d); }
    this.scene.add(group);
    this.pods.push({ group, dolphins, x: at.x, z: at.z, heading: Math.random() * Math.PI * 2, t0: this.t });
  }

  private addWhale(p: THREE.Vector3): void {
    const at = this.findWater(p, 70, 160, 10);
    if (!at) return;
    const group = new THREE.Group(), dark = this.mat('#3a4652'), pale = this.mat('#b8c0c8');
    const body = new THREE.Mesh(new THREE.BoxGeometry(2.6, 2.2, 11), dark); group.add(body);
    const head = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.9, 3), dark); head.position.set(0, -0.1, 6.6); group.add(head);
    const throat = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.5, 6), pale); throat.position.set(0, -1.05, 3.5); group.add(throat);
    for (const sx of [-1, 1]) { const flip = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.18, 0.9), pale); flip.position.set(sx * 2.1, -0.7, 3); flip.rotation.z = sx * 0.4; group.add(flip); }
    const tail = new THREE.Group(); tail.position.set(0, 0, -5.5); group.add(tail);
    const stock = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.0, 3), dark); stock.position.set(0, 0, -1.5); tail.add(stock);
    const flukes = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.2, 1.4), dark); flukes.position.set(0, 0, -3.2); tail.add(flukes);
    // the blow: a column of mist over the blowhole
    const pts = new Float32Array(60 * 3);
    for (let i = 0; i < 60; i++) { const h = Math.random(); pts.set([(Math.random() - 0.5) * (0.3 + h * 1.4), h * 4, (Math.random() - 0.5) * (0.3 + h * 1.4)], i * 3); }
    const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(pts, 3));
    const spout = new THREE.Points(sg, new THREE.PointsMaterial({ color: '#eef4f8', size: 0.5, transparent: true, opacity: 0, depthWrite: false }));
    spout.position.set(0, 1.2, 5.2); group.add(spout);
    this.scene.add(group);
    this.whale = { group, tail, spout, x: at.x, z: at.z, heading: Math.random() * Math.PI * 2, t0: this.t };
  }

  private addJelly(p: THREE.Vector3, cl: Climate): void {
    const at = this.findWater(p, 3, 30, 2);
    if (!at) return;
    const c = JELLY_COLOURS[cl];
    const geo = new THREE.SphereGeometry(0.35, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2);
    const m = new THREE.MeshLambertMaterial({ color: c, emissive: new THREE.Color(c), emissiveIntensity: 0.4, transparent: true, opacity: 0.6, depthWrite: false });
    const mesh = new THREE.Mesh(geo, m);
    const arms = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.7, 0.22), new THREE.MeshLambertMaterial({ color: c, transparent: true, opacity: 0.3, depthWrite: false }));
    arms.position.y = -0.4; mesh.add(arms);
    this.scene.add(mesh);
    this.jellies.push({ mesh, x: at.x, y: SEA_TOP - Math.min(at.d - 1, 0.6 + Math.random() * 2), z: at.z, seed: Math.random() * 10 });
  }
}

/** Boxes into one geometry (positions and normals; no index), for an instanced fish. */
function mergeBoxes(list: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const parts = list.map((g) => g.toNonIndexed());
  const n = parts.reduce((a, g) => a + g.attributes.position.count, 0);
  const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3);
  let o = 0;
  for (const g of parts) { pos.set(g.attributes.position.array as Float32Array, o * 3); nor.set(g.attributes.normal.array as Float32Array, o * 3); o += g.attributes.position.count; }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  return out;
}
