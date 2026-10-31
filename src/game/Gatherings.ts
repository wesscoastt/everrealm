import * as THREE from 'three';
import { GATHER_NEAR, GATHER_STAY, GATHER_UP, GATHER_WARN, companyBonus, gatheringNow, type GatheringDef } from '../data/gatherings';
import { landAt } from '../world/land';
import { isLeaves } from '../world/blocks';
import * as P from '../world/props';
import type { VoxelWorld } from '../world/VoxelWorld';
import type { Particles } from '../systems/Particles';
import type { Sfx } from '../systems/Audio';
import type { MapMarker } from '../ui/Hud';

// A town's fire (data/gatherings.ts): built where it stands while it's lit and you're near, taken down
// after. The realm is told before it's lit and when it is. Stand at it a while and the company counts:
// more experience for the next hour, more for each other traveller round the fire with you. The host
// and the musicians are ordinary people with a `when` (data/content/gatherings.ts).

export interface GatherHost {
  scene: THREE.Scene;
  voxels: VoxelWorld;
  particles: Particles;
  /** Points the world's lamp pool lights at night. */
  lamps: THREE.Vector3[];
  player(): THREE.Vector3;
  /** Other travellers in sight (online), where they stand. */
  others(): THREE.Vector3[];
  flag(k: string): unknown;
  setFlag(k: string, v: unknown): void;
  system(t: string): void;
  banner(title: string, sub: string): void;
  sound(n: Sfx): void;
}

/** The company's hour, as kept in the save. */
interface Company { left: number; pct: number; cycle: number }

const ember = new THREE.MeshBasicMaterial({ color: '#ff7a20' });
const emberHot = new THREE.MeshBasicMaterial({ color: '#ffc050' });
const flameOuter = new THREE.MeshBasicMaterial({ color: '#ff6a18', transparent: true, opacity: 0.8, depthWrite: false });
const flameMid = new THREE.MeshBasicMaterial({ color: '#ffa030', transparent: true, opacity: 0.85, depthWrite: false });
const flameCore = new THREE.MeshBasicMaterial({ color: '#ffe08a', transparent: true, opacity: 0.9, depthWrite: false });
const propMats = (() => { let m: P.PropMaterials | null = null; return () => (m ??= P.createPropMaterials()); })();

export class Gatherings {
  private group: THREE.Group | null = null;
  private builtFor: string | null = null;
  private fire = new THREE.Vector3();
  private lamps: THREE.Vector3[] = [];
  /** The flames, outside the batch so they can flicker. */
  private flames: THREE.Mesh[] = [];
  private clock = 0;
  private told = new Set<string>();
  private stay = 0;

  constructor(private host: GatherHost) {}

  /** More experience from the company: a fraction (0 when there's none). */
  bonus(): number {
    const c = this.host.flag('company') as Company | undefined;
    return c && c.left > 0 ? c.pct : 0;
  }

  markers(): MapMarker[] {
    const g = gatheringNow();
    return g.until < GATHER_WARN ? [{ x: g.def.x, z: g.def.z, kind: 'fair', label: g.def.name }] : [];
  }

  update(dt: number): void {
    const g = gatheringNow(), P0 = this.host.player();
    // The company's hour runs down while you play
    const c = this.host.flag('company') as Company | undefined;
    if (c && c.left > 0) {
      c.left -= dt;
      if (c.left <= 0) { this.host.setFlag('company', null); this.host.system('The good of the company has worn off.'); }
    }
    // The realm is told: before, and when it's lit
    const here = (g.def.land ?? 'counties') === landAt(P0.x);
    if (g.until > 0 && g.until < GATHER_WARN && !this.told.has(g.cycle + 'w')) {
      this.told.add(g.cycle + 'w');
      this.host.system(`${g.def.name} will be lit in ${g.def.where} in ${Math.max(1, Math.ceil(g.until / 60))} minute${g.until > 60 ? 's' : ''}.${here ? '' : ' (Over the water.)'}`);
    }
    if (g.until < 0 && -g.until > 30 && !this.told.has(g.cycle + 'l')) {
      this.told.add(g.cycle + 'l');
      this.host.system(g.def.lit + (here ? '' : ' (Over the water.)'));
    }
    // Up while it's lit and you're near enough to see it
    const lit = g.until < 0, d = Math.hypot(P0.x - g.def.x, P0.z - g.def.z);
    const show = lit && here && d < 170 && this.host.voxels.isLoaded(g.def.x, g.def.z);
    if (this.group && (!show || this.builtFor !== g.def.id)) this.takeDown();
    if (!this.group && show) this.build(g.def);
    if (!this.group) { this.stay = 0; return; }
    if (Math.random() < dt * 9) this.host.particles.fire(this.fire);
    this.clock += dt;
    this.flames.forEach((f, i) => {
      const t = this.clock * (7 + i * 1.7) + i * 2.1, s = 0.85 + Math.sin(t) * 0.12 + Math.sin(t * 2.3) * 0.06;
      f.scale.set(s, 0.8 + Math.sin(t * 1.3 + 1) * 0.25, s);
      f.rotation.y += dt * (i % 2 ? 1.4 : -1.1);
    });
    // The company counts after a while at the fire, and again every while you stay
    if (d < GATHER_NEAR && -g.until < GATHER_UP) {
      this.stay += dt;
      if (this.stay >= GATHER_STAY) { this.stay = 0; this.company(g.def, g.cycle); }
    } else this.stay = Math.max(0, this.stay - dt);
  }

  private company(def: GatheringDef, cycle: number): void {
    const others = this.host.others().filter((o) => Math.hypot(o.x - this.fire.x, o.z - this.fire.z) < GATHER_NEAR + 4).length;
    const pct = companyBonus(others), cur = this.host.flag('company') as Company | undefined;
    const first = !cur || cur.cycle !== cycle || cur.left <= 0;
    const best = first ? pct : Math.max(cur!.pct, pct);
    this.host.setFlag('company', { left: 3600, pct: best, cycle });
    const say = `${Math.round(best * 100)}% more experience for the next hour`;
    if (first) {
      this.host.banner('Good company', say);
      this.host.system(others ? `${def.name}, with ${others} other${others > 1 ? 's' : ''} round the fire: ${say}.` : `${def.name}: ${say}. More if others come.`);
      this.host.sound('discover');
    } else if (best > cur!.pct) this.host.system(`More round the fire now: ${say}.`);
  }

  private gy(x: number, z: number): number {
    const V = this.host.voxels;
    let y = V.topSolid(x, z);
    while (y > 0 && isLeaves(V.get(Math.floor(x), y, Math.floor(z)))) y--;
    return y + 1;
  }

  private takeDown(): void {
    if (this.group) this.host.scene.remove(this.group);
    this.group = null; this.builtFor = null; this.flames = [];
    for (const l of this.lamps) { const i = this.host.lamps.indexOf(l); if (i >= 0) this.host.lamps.splice(i, 1); }
    this.lamps = [];
  }

  // ---------------------------------------------------------------- The fire
  /** A bonfire in a ring of stones, benches on three sides, room for the musicians on the fourth (north). */
  private build(def: GatheringDef): void {
    const M = propMats(), batch = new P.Batcher();
    const x = def.x, z = def.z, y = this.gy(x, z);
    const put = (g: THREE.Object3D, px: number, pz: number, ry = 0) => batch.addGroup(g, P.mat4(px, this.gy(px, pz), pz, ry));
    const piece = (w: number, h: number, d: number, c: string | THREE.Material, px: number, py: number, pz: number, ry = 0, rx = 0, rz = 0) => {
      const m = new THREE.Mesh(P.box(w, h, d), typeof c === 'string' ? P.flat(c) : c);
      m.position.set(px, py, pz); m.rotation.set(rx, ry, rz);
      return m;
    };
    // The fire: a ring of stones, split logs leant into a cone, the embers glowing under them
    const fire = new THREE.Group();
    for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2; fire.add(piece(0.36, 0.28, 0.32, i % 3 ? '#7a756a' : '#5e5a52', Math.cos(a) * 0.95, 0.14, Math.sin(a) * 0.95, -a)); }
    fire.add(piece(1.3, 0.1, 1.3, ember, 0, 0.08, 0));
    fire.add(piece(0.8, 0.16, 0.8, emberHot, 0, 0.14, 0, 0.6));
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2 + 0.2, lean = 0.42;
      const log = piece(0.16, 1.5, 0.16, i % 2 ? '#4a3220' : '#5a3e28', Math.cos(a) * 0.38, 0.62, Math.sin(a) * 0.38);
      // (the tops lean in to meet over the middle)
      log.rotation.set(-Math.sin(a) * lean, 0, Math.cos(a) * lean);
      fire.add(log);
    }
    put(fire, x, z);
    this.fire.set(x, y + 0.9, z);
    // The flames inside the cone: three tongues, hot at the heart
    for (const [w, h, m, oy] of [[0.8, 1.5, flameOuter, 0.75], [0.55, 1.9, flameMid, 0.95], [0.3, 2.2, flameCore, 1.1]] as const) {
      const f = new THREE.Mesh(new THREE.ConeGeometry(w / 2, h, 5), m);
      f.position.set(x, y + oy, z);
      this.flames.push(f);
    }
    // Benches on the east, west and south, facing in
    for (const [bx, bz, ry] of [[3, 0, Math.PI / 2], [-3, 0, Math.PI / 2], [0, 3, 0]] as const) put(P.bench(M, 2), x + bx, z + bz, ry);
    // A lantern on a post at each north corner, behind the musicians
    for (const lx of [-3, 3]) { put(P.lanternPost(M, 2.4), x + lx, z - 3); this.lamp(x + lx, this.gy(x + lx, z - 3) + 2.3, z - 3); }
    // A trestle by the host with what's going round: cups and a covered basket
    const t = new THREE.Group();
    t.add(piece(1.2, 0.08, 0.5, '#6a4a2c', 0, 0.78, 0));
    for (const sx of [-0.5, 0.5]) t.add(piece(0.08, 0.78, 0.4, '#4a3220', sx, 0.39, 0));
    for (const cx of [-0.35, -0.15, 0.05]) t.add(piece(0.1, 0.12, 0.1, '#c8b080', cx, 0.88, 0.08));
    t.add(piece(0.4, 0.2, 0.3, '#8a6e48', 0.35, 0.92, 0));
    t.add(piece(0.42, 0.04, 0.32, '#d8ccb0', 0.35, 1.03, 0));
    put(t, x + 3.4, z + 2.6, Math.PI / 4);
    this.lamp(x, y + 1.4, z);
    const root = new THREE.Group();
    root.add(batch.build());
    for (const f of this.flames) root.add(f);
    this.group = root; this.builtFor = def.id;
    this.host.scene.add(root);
  }

  private lamp(x: number, y: number, z: number): void { const v = new THREE.Vector3(x, y, z); this.lamps.push(v); this.host.lamps.push(v); }
}
