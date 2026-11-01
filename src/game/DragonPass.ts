import * as THREE from 'three';
import { CreatureModel } from '../entities/creatures';
import { realmNow } from '../world/clock';
import type { VoxelWorld } from '../world/VoxelWorld';
import type { Sfx } from '../systems/Audio';

// The Old Mother of Serra crossing the sky (docs/CONTINENT3.md): a few times a day on the realm clock she
// comes up out of the south over the sea, far overhead, and goes on north without looking down. Nobody in
// the Counties or Morrow knows what she is yet. It's foreshadowing: a great dark dragon, wings slow as a
// mill's sails, her shadow going over the fields, the ground humming as she passes, and the people round
// you looking up and saying what people say. Seen from anywhere under open sky; not underground or indoors.

/** A pass every so often on the realm clock (seconds), lasting this long. */
const EVERY = 3 * 3600, PASS = 42;
/** How far before and after the overhead point she's in sight, and how high above the ground. */
const REACH = 420, HIGH = 72;

const SAYINGS: Record<'counties' | 'morrow', string[]> = {
  counties: [
    'Did you see that? Tell me you saw that.',
    'That\'s no gull.',
    'It came up from the south. Nothing comes up from the south.',
    'My gran said they were all asleep.',
    'Get inside. Get the children inside.',
    'It didn\'t even look at us.',
    'That\'s twice this week. I\'m telling the reeve.',
    'Pray it isn\'t hungry.',
    'The sheep went flat. Every one.',
    'There\'s nothing in the books about anything that size.',
  ],
  morrow: [
    'The Assembly will want to hear about that.',
    'That came from Serra. Ask any sailor.',
    'Sorrow, they call it down there. Now I know why.',
    'It flew over the Towers and the white didn\'t even shake.',
    'Get under something. Anything.',
    'My grandfather sailed south once. He never talked about it.',
    'It\'s bigger than the Glassmother. Gods. It\'s bigger.',
    'Where\'s it going? What\'s north of here that it wants?',
  ],
};

export interface DragonHost {
  scene: THREE.Scene;
  voxels: VoxelWorld;
  player(): THREE.Vector3;
  land(): 'counties' | 'morrow';
  /** Under a roof or underground: she isn't seen. */
  covered(): boolean;
  /** People near the player who could look up and say something. */
  people(): { pos: THREE.Vector3 }[];
  say(at: THREE.Vector3, line: string): void;
  system(t: string): void;
  sound(n: Sfx, v?: number): void;
  quake(k: number): void;
}

interface Pass { t: number; from: THREE.Vector3; dir: THREE.Vector3; overhead: boolean; told: boolean; said: { at: number; pos: THREE.Vector3; line: string }[] }

const hash = (n: number) => { let h = Math.imul(n ^ 0x9e3779b9, 0x85ebca6b); h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35); h ^= h >>> 16; return (h >>> 0) / 4294967296; };

export class DragonPass {
  private model: CreatureModel | null = null;
  private shadow: THREE.Mesh | null = null;
  private pass: Pass | null = null;
  private lastCycle = -1;

  constructor(private host: DragonHost) {}

  /** Start a pass now (for testing, and for the realm clock's own). */
  begin(): void {
    const P = this.host.player();
    // Out of the south (the sea side, +z), heading north, a little either way; passing near overhead
    const a = (hash(Math.floor(realmNow() / 1000)) - 0.5) * 0.9;
    const dir = new THREE.Vector3(Math.sin(a), 0, -Math.cos(a));
    const side = new THREE.Vector3(-dir.z, 0, dir.x).multiplyScalar((hash(Math.floor(realmNow() / 7000)) - 0.5) * 80);
    const from = P.clone().add(side).addScaledVector(dir, -REACH);
    this.pass = { t: 0, from, dir, overhead: false, told: false, said: [] };
    if (!this.model) {
      this.model = new CreatureModel('dragon', { a: '#1c1a20', b: '#7a2a14', c: '#ff8a3a' }, 13);
      this.host.scene.add(this.model.root);
      const sh = new THREE.Mesh(new THREE.CircleGeometry(1, 24), new THREE.MeshBasicMaterial({ color: '#000', transparent: true, opacity: 0.22, depthWrite: false }));
      sh.rotation.x = -Math.PI / 2;
      this.shadow = sh; this.host.scene.add(sh);
    }
    this.model.root.visible = this.shadow!.visible = true;
    this.host.sound('thunder', 0.35);
  }

  update(dt: number): void {
    // The realm clock: a pass begins at a set moment in each cycle, the same for everyone
    const now = realmNow() / 1000, cycle = Math.floor(now / EVERY), at = 600 + hash(cycle) * (EVERY - 1200);
    if (cycle !== this.lastCycle && now - cycle * EVERY >= at && now - cycle * EVERY < at + 5) {
      this.lastCycle = cycle;
      if (!this.host.covered()) this.begin();
    }
    const p = this.pass;
    if (!p || !this.model) return;
    p.t += dt;
    const speed = (REACH * 2) / PASS, P = this.host.player();
    const pos = p.from.clone().addScaledVector(p.dir, speed * p.t);
    const ground = this.host.voxels.topSolid(pos.x, pos.z) + 1;
    pos.y = Math.max(P.y, ground) + HIGH + Math.sin(p.t * 0.6) * 3;
    const R = this.model.root;
    R.position.copy(pos);
    R.rotation.set(0.08 + Math.sin(p.t * 1.1) * 0.03, Math.atan2(p.dir.x, p.dir.z), Math.sin(p.t * 0.5) * 0.08);
    this.model.update(dt, 0);
    // Wings open and beating slow; legs drawn up under her
    const beat = Math.sin(p.t * 2.1);
    for (const w of this.model.segs) { const sd = w.userData.sd as number; w.rotation.set(0, sd * 0.2, sd * (0.42 + beat * 0.55)); }
    for (const l of this.model.legs) l.rotation.x = 1.1;
    // Her shadow on the ground, broad as her wings, soft and faint from that height
    const sh = this.shadow!;
    sh.position.set(pos.x, ground + 0.06, pos.z);
    sh.scale.set(26, 14, 1); sh.rotation.z = -Math.atan2(p.dir.x, p.dir.z);
    // Overhead: the ground hums, a low roar, the chat says so, and the people look up
    const d = Math.hypot(pos.x - P.x, pos.z - P.z);
    if (!p.overhead && d < 70) {
      p.overhead = true;
      this.host.sound('growl', 0.9); this.host.sound('thunder', 0.6); this.host.quake(0.25);
      if (!p.told) { p.told = true; this.host.system(this.host.land() === 'morrow' ? 'Something vast goes over, far up, out of the south. The light goes strange for a moment, and the gulls stop.' : 'High over, something vast crosses the sky out of the south, its wings as slow as a mill\'s sails. It doesn\'t look down.'); }
      const lines = SAYINGS[this.host.land()], folk = this.host.people().slice(0, 3);
      // (one after another, on the game clock: a browser timer stalls in a background tab)
      const used = new Set<number>();
      folk.forEach((f, i) => { let k = Math.floor(hash(Math.floor(now) + i * 31) * lines.length); while (used.has(k)) k = (k + 1) % lines.length; used.add(k); p.said.push({ at: p.t + 0.6 + i * 1.4, pos: f.pos, line: lines[k] }); });
    }
    for (const s of p.said) if (s.at <= p.t) { this.host.say(s.pos, s.line); s.at = Infinity; }
    if (p.t >= PASS) { this.pass = null; R.visible = sh.visible = false; }
  }
}
