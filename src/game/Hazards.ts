import * as THREE from 'three';
import { HAZARD, hazards, type Hazard } from '../data/hazards';
import type { Enemy } from '../entities/Enemy';
import type { Sfx } from '../systems/Audio';
import type { Particles } from '../systems/Particles';
import type { VoxelWorld } from '../world/VoxelWorld';
import { plan } from '../world/sites';

// The ground's own dangers (data/hazards.ts) as you meet them. A vent or a loose cliff winds up: its
// ground lights from the middle out to a bright edge, then it blows or drops, and whoever is still
// inside is hurt (a creature chasing you in, too, so a fight can be led over one). A bog holds your
// feet while you're in it.

export interface HazardHost {
  scene: THREE.Scene;
  voxels: VoxelWorld;
  particles: Particles;
  player(): THREE.Vector3;
  /** The player is caught: this share of their health, from this point (rolling clear avoids it). */
  hurt(share: number, at: THREE.Vector3, what: string): void;
  enemies(): Enemy[];
  /** A creature is caught: so much damage. */
  hitEnemy(e: Enemy, dmg: number): void;
  sound(name: Sfx, at: THREE.Vector3): void;
  /** The first time you come near one of a kind: a line telling you what it is and what to do. */
  firstNear(kind: Hazard['kind'], text: string): void;
}

const FIRST: Record<Hazard['kind'], string> = {
  vent: 'Steam vents crack the ground here. When the ground round one glows, step out of the ring or roll clear.',
  rockfall: 'Loose rock overhead. When the ground under it glows, stones are coming down: step out or roll clear.',
  bog: 'Bog: it holds your feet, and you wade at half speed until you are out of it.',
};

interface Live { h: Hazard; next: number; puff: number; y: number; mark: THREE.Mesh<THREE.BufferGeometry, THREE.ShaderMaterial> | null }

const COLOR = { vent: '#ff7a3a', rockfall: '#ffa020' };

/** The wind-up drawn on the ground, cell by cell at each cell's own height (the ground isn't flat):
 *  filled out to `fill` of the radius, with the edge always shown while it winds up. */
function warning(color: string): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
    uniforms: { fill: { value: 0 }, tint: { value: new THREE.Color(color) } },
    vertexShader: 'attribute float d; varying float vD; void main() { vD = d; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: 'uniform float fill; uniform vec3 tint; varying float vD; void main() { if (vD > 1.0) discard; float edge = smoothstep(0.86, 0.94, vD); float a = max(edge * 0.8, vD < fill ? 0.38 : 0.0); if (a <= 0.0) discard; gl_FragColor = vec4(tint, a); }',
  });
}

export class Hazards {
  private live = new Map<string, Live>();
  private all: Hazard[];
  /** A dungeon room's, while the room runs (add, remove). */
  private extra: Hazard[] = [];
  private check = 0;
  /** How much the ground underfoot slows you (1: not at all). */
  slow = 1;

  constructor(private host: HazardHost) {
    this.all = hazards(plan());
  }

  update(dt: number): void {
    const P = this.host.player();
    // Wake the ones nearby, put the far ones away (once a second)
    if ((this.check -= dt) <= 0) {
      this.check = 1;
      for (const h of [...this.all, ...this.extra]) {
        const near = Math.hypot(h.x - P.x, h.z - P.z) < 60 && this.host.voxels.isLoaded(h.x, h.z);
        const l = this.live.get(h.id);
        if (near && !l) this.wake(h);
        else if (!near && l) this.sleep(l);
      }
    }
    this.slow = 1;
    for (const l of this.live.values()) {
      const h = l.h, at = new THREE.Vector3(h.x, l.y, h.z);
      const inside = Math.hypot(P.x - h.x, P.z - h.z) < h.r && Math.abs(P.y - l.y) < 2.5;
      if (Math.hypot(P.x - h.x, P.z - h.z) < h.r + 10) this.host.firstNear(h.kind, FIRST[h.kind]);
      if (h.kind === 'bog') {
        if (inside) this.slow = HAZARD.bog.slow;
        if ((l.puff -= dt) <= 0) { l.puff = 0.5 + Math.random(); this.host.particles.bubbles(at.clone().add(new THREE.Vector3((Math.random() - 0.5) * h.r, -0.6, (Math.random() - 0.5) * h.r)), 3); }
        continue;
      }
      const H = HAZARD[h.kind], windup = h.windup ?? H.windup;
      l.next -= dt;
      // Steam from a vent's crack, grit trickling down onto scree, between times
      if ((l.puff -= dt) <= 0) {
        l.puff = h.kind === 'vent' ? 0.45 : 1.1;
        if (h.kind === 'vent') this.host.particles.smoke(at.clone().setY(l.y - 0.4));
        else this.host.particles.dust(this.fromCrag(h, at, 4 + Math.random() * 3), 3);
      }
      const m = l.mark!;
      m.visible = l.next < windup;
      m.material.uniforms.fill.value = Math.min(1, 1 - Math.max(0, l.next) / windup);
      if (l.next > 0) continue;
      // It goes
      l.next = h.every ?? H.every * (0.85 + Math.random() * 0.3);
      if (h.kind === 'vent') {
        for (let i = 0; i < 8; i++) this.host.particles.smoke(at.clone().add(new THREE.Vector3((Math.random() - 0.5) * 1.2, i * 0.6, (Math.random() - 0.5) * 1.2)));
        this.host.particles.burst(at.clone().setY(l.y + 0.6), '#fff0e0', 28);
      } else {
        for (let i = 0; i < 3; i++) this.host.particles.dust(at.clone().add(new THREE.Vector3((Math.random() - 0.5) * h.r, 0.4, (Math.random() - 0.5) * h.r)), 10);
        for (let i = 0; i < 2; i++) this.host.particles.dust(this.fromCrag(h, at, 3 + i * 3), 8);
        this.host.particles.burst(at.clone().setY(l.y + 1.5), '#8a7a60', 26);
      }
      this.host.sound('hitHeavy', at);
      if (inside) this.host.hurt(H.hurt, at, H.name);
      // Only a creature that's fighting is caught: one that lives here knows where not to stand
      for (const e of this.host.enemies()) if (e.alive && e.state !== 'idle' && e.state !== 'wander' && e.state !== 'return' && Math.hypot(e.pos.x - h.x, e.pos.z - h.z) < h.r && Math.abs(e.pos.y - l.y) < 2.5) this.host.hitEnemy(e, Math.round(e.def.hp * 0.12));
    }
  }

  private wake(h: Hazard): void {
    const V = this.host.voxels;
    const y = V.groundBelow(h.x, h.y !== undefined ? h.y + 3 : 120, h.z);
    let mark: Live['mark'] = null;
    if (h.kind !== 'bog') {
      // A quad on top of every cell inside, with each corner's distance from the middle (1: the edge)
      const pos: number[] = [], d: number[] = [], idx: number[] = [];
      const cx = Math.floor(h.x), cz = Math.floor(h.z);
      for (let dz = -h.r - 1; dz <= h.r; dz++) for (let dx = -h.r - 1; dx <= h.r; dx++) {
        const x = cx + dx, z = cz + dz;
        if (Math.hypot(x + 0.5 - h.x, z + 0.5 - h.z) > h.r + 0.8) continue;
        const top = V.groundBelow(x + 0.5, y + 4, z + 0.5) + 0.04;
        const n = pos.length / 3;
        for (const [ox, oz] of [[0, 0], [1, 0], [1, 1], [0, 1]]) {
          pos.push(x + ox, top, z + oz);
          d.push(Math.hypot(x + ox - h.x, z + oz - h.z) / h.r);
        }
        idx.push(n, n + 2, n + 1, n, n + 3, n + 2);
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      g.setAttribute('d', new THREE.Float32BufferAttribute(d, 1));
      g.setIndex(idx);
      mark = new THREE.Mesh(g, warning(COLOR[h.kind]));
      mark.renderOrder = 3;
      mark.visible = false;
      mark.frustumCulled = false;
      this.host.scene.add(mark);
    }
    this.live.set(h.id, { h, next: h.first ?? 2 + Math.random() * 6, puff: 0, y, mark });
  }

  /** A point up the crag a rockfall's stones come down from, so high above the scree. */
  private fromCrag(h: Hazard, at: THREE.Vector3, up: number): THREE.Vector3 {
    const [fx, fz] = h.face ?? [0, 0];
    return at.clone().add(new THREE.Vector3(fx * (h.r + 1) + (Math.random() - 0.5) * 3, up, fz * (h.r + 1) + (Math.random() - 0.5) * 3));
  }

  /** A room's stones start coming down (woken at once, if they're close). */
  add(hs: Hazard[]): void {
    for (const h of hs) if (!this.extra.some((x) => x.id === h.id)) { this.extra.push(h); if (this.host.voxels.isLoaded(h.x, h.z)) this.wake(h); }
  }

  /** ...and stop. */
  remove(ids: string[]): void {
    for (const id of ids) { const l = this.live.get(id); if (l) this.sleep(l); }
    this.extra = this.extra.filter((h) => !ids.includes(h.id));
  }

  private sleep(l: Live): void {
    if (l.mark) { this.host.scene.remove(l.mark); l.mark.geometry.dispose(); l.mark.material.dispose(); }
    this.live.delete(l.h.id);
  }
}
