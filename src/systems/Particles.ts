import * as THREE from 'three';

interface P {
  alive: boolean;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  life: number;
  max: number;
  size: number;
  grow: number;
  gravity: number;
  drag: number;
  color: THREE.Color;
  spin: number;
  rot: number;
}

class Pool {
  readonly mesh: THREE.InstancedMesh;
  private items: P[] = [];
  private cursor = 0;
  private m = new THREE.Matrix4();
  private q = new THREE.Quaternion();
  private s = new THREE.Vector3();
  private axis = new THREE.Vector3(0.4, 1, 0.2).normalize();

  constructor(mat: THREE.Material, readonly cap: number) {
    this.mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), mat, cap);
    this.mesh.frustumCulled = false;
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    for (let i = 0; i < cap; i++) {
      this.items.push({ alive: false, pos: new THREE.Vector3(), vel: new THREE.Vector3(), life: 0, max: 1, size: 0.1, grow: 0, gravity: 0, drag: 0, color: new THREE.Color(), spin: 0, rot: 0 });
      this.mesh.setColorAt(i, new THREE.Color(1, 1, 1));
      this.mesh.setMatrixAt(i, new THREE.Matrix4().makeScale(0, 0, 0));
    }
  }

  spawn(o: Partial<Omit<P, 'pos' | 'vel' | 'color'>> & { pos: THREE.Vector3; vel: THREE.Vector3; color: THREE.Color | string }): void {
    const p = this.items[this.cursor];
    this.cursor = (this.cursor + 1) % this.cap;
    p.alive = true;
    p.pos.copy(o.pos);
    p.vel.copy(o.vel);
    p.life = p.max = o.max ?? 0.8;
    p.size = o.size ?? 0.12;
    p.grow = o.grow ?? 0;
    p.gravity = o.gravity ?? 9;
    p.drag = o.drag ?? 1;
    p.spin = o.spin ?? 6;
    p.rot = Math.random() * 6;
    p.color.set(o.color);
  }

  update(dt: number): void {
    for (let i = 0; i < this.cap; i++) {
      const p = this.items[i];
      if (!p.alive) continue;
      p.life -= dt;
      if (p.life <= 0) {
        p.alive = false;
        this.mesh.setMatrixAt(i, this.m.makeScale(0, 0, 0));
        continue;
      }
      p.vel.y -= p.gravity * dt;
      p.vel.multiplyScalar(Math.exp(-p.drag * dt));
      p.pos.addScaledVector(p.vel, dt);
      p.rot += p.spin * dt;
      const k = p.life / p.max;
      const size = Math.max(0.001, (p.size + p.grow * (1 - k)) * Math.min(1, k * 3));
      this.q.setFromAxisAngle(this.axis, p.rot);
      this.s.setScalar(size);
      this.m.compose(p.pos, this.q, this.s);
      this.mesh.setMatrixAt(i, this.m);
      this.mesh.setColorAt(i, p.color);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }
}

const v = new THREE.Vector3();
const rnd = (a: number) => (Math.random() - 0.5) * 2 * a;

export class Particles {
  readonly group = new THREE.Group();
  private lit = new Pool(new THREE.MeshLambertMaterial(), 900);
  private glow = new Pool(new THREE.MeshBasicMaterial({ toneMapped: false }), 700);
  private soft = new Pool(new THREE.MeshLambertMaterial({ transparent: true, opacity: 0.55, depthWrite: false }), 300);

  constructor() {
    this.group.add(this.lit.mesh, this.glow.mesh, this.soft.mesh);
  }

  update(dt: number): void {
    this.lit.update(dt);
    this.glow.update(dt);
    this.soft.update(dt);
  }

  debris(at: THREE.Vector3, colors: string[], n = 10, power = 4): void {
    for (let i = 0; i < n; i++) {
      this.lit.spawn({ pos: v.copy(at).add(new THREE.Vector3(rnd(0.3), rnd(0.3), rnd(0.3))), vel: new THREE.Vector3(rnd(power * 0.6), power * (0.4 + Math.random() * 0.6), rnd(power * 0.6)), color: colors[i % colors.length], size: 0.08 + Math.random() * 0.1, max: 0.6 + Math.random() * 0.5, gravity: 16 });
    }
  }

  sparks(at: THREE.Vector3, n = 10, color = '#ffc860'): void {
    for (let i = 0; i < n; i++) {
      this.glow.spawn({ pos: at, vel: new THREE.Vector3(rnd(4), 1 + Math.random() * 4, rnd(4)), color: i % 3 === 0 ? '#fff2c0' : color, size: 0.04 + Math.random() * 0.04, max: 0.25 + Math.random() * 0.35, gravity: 12, drag: 2, spin: 20 });
    }
  }

  splash(at: THREE.Vector3, n = 14): void {
    for (let i = 0; i < n; i++) {
      this.glow.spawn({ pos: at, vel: new THREE.Vector3(rnd(1.6), 2.5 + Math.random() * 3, rnd(1.6)), color: i % 2 ? '#d8f2ff' : '#8fd0ee', size: 0.06 + Math.random() * 0.06, max: 0.5 + Math.random() * 0.3, gravity: 14 });
    }
  }

  ripple(at: THREE.Vector3): void {
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      this.glow.spawn({ pos: v.set(at.x + Math.cos(a) * 0.3, at.y, at.z + Math.sin(a) * 0.3), vel: new THREE.Vector3(Math.cos(a) * 0.8, 0, Math.sin(a) * 0.8), color: '#e8f8ff', size: 0.05, max: 0.7, gravity: 0, drag: 1.5, spin: 0 });
    }
  }

  smoke(at: THREE.Vector3, night = 0): void {
    const c = night > 0.5 ? '#5a5a66' : '#bdbab4';
    this.soft.spawn({ pos: v.set(at.x + rnd(0.15), at.y, at.z + rnd(0.15)), vel: new THREE.Vector3(0.35 + rnd(0.15), 0.9 + Math.random() * 0.4, rnd(0.15)), color: c, size: 0.25, grow: 0.9, max: 3.2, gravity: -0.05, drag: 0.3, spin: 0.5 });
  }

  fire(at: THREE.Vector3): void {
    this.glow.spawn({ pos: v.set(at.x + rnd(0.2), at.y, at.z + rnd(0.2)), vel: new THREE.Vector3(rnd(0.2), 1.2 + Math.random(), rnd(0.2)), color: Math.random() < 0.5 ? '#ffb040' : '#ff6a20', size: 0.09, max: 0.5, gravity: -1, drag: 1, spin: 4 });
  }

  leaves(at: THREE.Vector3, color = '#5a9a32', n = 12): void {
    for (let i = 0; i < n; i++) {
      this.lit.spawn({ pos: v.copy(at).add(new THREE.Vector3(rnd(1.5), rnd(1), rnd(1.5))), vel: new THREE.Vector3(rnd(1), -0.2, rnd(1)), color, size: 0.12, max: 1.6 + Math.random(), gravity: 1.5, drag: 1.5, spin: 3 });
    }
  }

  heal(at: THREE.Vector3): void {
    for (let i = 0; i < 18; i++) {
      const a = Math.random() * Math.PI * 2;
      this.glow.spawn({ pos: v.set(at.x + Math.cos(a) * 0.6, at.y + Math.random() * 0.4, at.z + Math.sin(a) * 0.6), vel: new THREE.Vector3(0, 1.2 + Math.random() * 1.2, 0), color: i % 2 ? '#9cf09a' : '#e8ffd0', size: 0.06, max: 1.0, gravity: 0, drag: 0.5 });
    }
  }

  burst(at: THREE.Vector3, color: string, n = 26): void {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      this.glow.spawn({ pos: at, vel: new THREE.Vector3(Math.cos(a) * 3.5, 2 + Math.random() * 2, Math.sin(a) * 3.5), color: i % 2 ? color : '#ffffff', size: 0.07, max: 0.9, gravity: 3, drag: 1.5 });
    }
  }

  /** Underwater: a kick or a blow leaves bubbles that wobble up toward the surface. */
  bubbles(at: THREE.Vector3, n = 10): void {
    for (let i = 0; i < n; i++) {
      this.glow.spawn({ pos: v.set(at.x + rnd(0.4), at.y + rnd(0.4), at.z + rnd(0.4)), vel: new THREE.Vector3(rnd(0.6), 1.2 + Math.random() * 1.4, rnd(0.6)), color: i % 3 ? '#cfefff' : '#ffffff', size: 0.04 + Math.random() * 0.07, max: 0.9 + Math.random() * 0.8, gravity: -1.5, drag: 1.2, spin: 2 });
    }
  }

  dust(at: THREE.Vector3, n = 6): void {
    for (let i = 0; i < n; i++) {
      this.soft.spawn({ pos: v.set(at.x + rnd(0.3), at.y + 0.05, at.z + rnd(0.3)), vel: new THREE.Vector3(rnd(1), 0.4, rnd(1)), color: '#c8b896', size: 0.12, grow: 0.3, max: 0.6, gravity: 0, drag: 2, spin: 1 });
    }
  }
}
