import * as THREE from 'three';
import { ROOMS, type RoomDef } from '../data/rooms';
import { B } from '../world/blocks';
import type { VoxelWorld } from '../world/VoxelWorld';
import type { Enemy } from '../entities/Enemy';

// The rooms of a dungeon run (data/rooms.ts, docs/DELVES.md). Each room waits until you walk into it, then
// its gate drops (an iron portcullis, and barrier blocks in the open cells behind it so nobody walks through)
// and it asks its thing: light the lamps in the right order, kill the one with the key, hold the plates
// down together. Done, the gate rises and the room's chest is there. In a group the room's state goes to
// everyone through the dungeon's relay (Dungeons.onEvent 'room'), so every member's gates move together.

export interface RoomsHost {
  scene: THREE.Scene;
  voxels: VoxelWorld;
  player(): THREE.Vector3;
  /** A creature for the room (a lever's punishment, a keeper and their crew), counted with the run's. */
  spawn(type: string, x: number, y: number, z: number, name?: string): Enemy;
  system(text: string): void;
  banner(title: string, sub: string): void;
  sound(name: 'click' | 'open' | 'bell' | 'discover' | 'levelUp' | 'heal', vol?: number): void;
  reward(xp: number, marks: number, items: string[], why: string): void;
  read(title: string, body: string): void;
  /** Tell the rest of the group a room has moved on (state: 1 started, 2 done). */
  share(i: number, state: number): void;
  level(): number;
}

interface Live {
  def: RoomDef;
  state: 0 | 1 | 2;       // waiting, shut, open
  gate: THREE.Group;
  gateY: number;           // how far the portcullis has risen (0 down, 1 up)
  barriers: [number, number, number][];
  lit: number[];           // levers lit, in order
  lamps: THREE.Mesh[];
  plates: { mesh: THREE.Mesh; downUntil: number }[];
  keeper: Enemy | null;
  /** waves: the one we're on, its creatures, and how long it's been going. */
  wave: number;
  waveMobs: Enemy[];
  waveT: number;
  chest: THREE.Group | null;
  opened: boolean;
}

const iron = new THREE.MeshLambertMaterial({ color: '#3a3e46' });
const ironDk = new THREE.MeshLambertMaterial({ color: '#24262c' });
const flame = new THREE.MeshBasicMaterial({ color: '#ffb84a' });
const stone = new THREE.MeshLambertMaterial({ color: '#7a756a' });
const stoneDown = new THREE.MeshLambertMaterial({ color: '#6a6458', emissive: '#5a3a0a' });
const groove = new THREE.MeshBasicMaterial({ color: '#2a2620' });
const grooveLit = new THREE.MeshBasicMaterial({ color: '#ffb84a' });
const wood = new THREE.MeshLambertMaterial({ color: '#6a4a2c' });
const brass = new THREE.MeshLambertMaterial({ color: '#c8a050' });
const copper = new THREE.MeshLambertMaterial({ color: '#8a5a34' });
const stake = new THREE.MeshLambertMaterial({ color: '#5a4430' });
const glass = new THREE.MeshLambertMaterial({ color: '#9fd8ec', transparent: true, opacity: 0.72 });
const glassLit = new THREE.MeshBasicMaterial({ color: '#d8fbff' });
const iceWall = new THREE.MeshLambertMaterial({ color: '#cfe8f2', transparent: true, opacity: 0.85 });
const blackSlab = new THREE.MeshLambertMaterial({ color: '#1e1e24' });
const slabSeam = new THREE.MeshBasicMaterial({ color: '#8ab8c8' });
const withy = new THREE.MeshLambertMaterial({ color: '#8a6e48' });
const withyDk = new THREE.MeshLambertMaterial({ color: '#6e5638' });

export class Rooms {
  private rooms: Live[] = [];
  private ox = 0; private oz = 0; private floor = 0;
  private clock = 0;

  constructor(private host: RoomsHost, private dungeon: string) {
    const R = ROOMS[dungeon];
    if (!R) return;
    [this.ox, this.oz] = R.origin; this.floor = R.floor;
    for (const def of R.rooms) {
      const gate = this.portcullis(def);
      host.scene.add(gate);
      gate.visible = false;
      const live: Live = { def, state: 0, gate, gateY: 1, barriers: [], lit: [], lamps: [], plates: [], keeper: null, chest: null, opened: false, wave: 0, waveMobs: [], waveT: 0 };
      for (const l of def.levers ?? []) { const m = def.leverStyle === 'glass' ? this.pillar(l.at, l.h ?? 2, this.fl(def)) : def.leverStyle === 'slab' ? this.slab(l.at, this.fl(def)) : this.hook(l.at, this.fl(def)); live.lamps.push(m); }
      for (const p of def.plates ?? []) live.plates.push({ mesh: this.plate(p, this.fl(def)), downUntil: 0 });
      this.rooms.push(live);
    }
  }

  /** A room's own floor height. */
  private fl(def: RoomDef): number { return this.floor + (def.f ?? 0); }

  /** World position of a room-frame cell's middle, on the floor. */
  private at(x: number, z: number, lift = 0, f = this.floor): THREE.Vector3 {
    const wx = this.ox + x + 0.5, wz = this.oz + z + 0.5;
    const y = this.host.voxels.isLoaded(wx, wz) ? this.host.voxels.groundBelow(wx, f + 3, wz) : f;
    return new THREE.Vector3(wx, y + lift, wz);
  }

  private portcullis(def: RoomDef): THREE.Group {
    const g = new THREE.Group(), c = def.gate.cells, n = c.length, h = def.gate.h;
    const mid = c[Math.floor(n / 2)];
    const p = this.at(mid[0], mid[1], 0, this.fl(def));
    g.position.set(this.ox + (c[0][0] + c[n - 1][0]) / 2 + 0.5, p.y, this.oz + (c[0][1] + c[n - 1][1]) / 2 + 0.5);
    g.rotation.y = def.gate.ry;
    const w = n + 0.2;
    if (def.gate.style === 'ice') {
      // A wall of old ice, grown floor to roof: thick, cloudy, a little blue
      const panel = new THREE.Group(); g.add(panel);
      panel.add(new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.7), iceWall).translateY(h / 2));
      for (let i = 0; i < 7; i++) panel.add(new THREE.Mesh(new THREE.BoxGeometry(0.3 + (i % 3) * 0.2, 0.6 + (i % 2) * 0.5, 0.5), glass).translateX(-w / 2 + 0.4 + (i / 6) * (w - 0.8)).translateY(0.3 + (i * 0.7) % h).translateZ(0.35));
      return g;
    }
    if (def.gate.style === 'hurdle') {
      // Wattle hurdles: a panel a block and a half wide, stakes and woven withies, wedged edge to edge
      const panel = new THREE.Group(); g.add(panel);
      const ph = Math.min(h, 3.2);
      for (let x = -w / 2; x <= w / 2 + 0.01; x += 0.5) panel.add(new THREE.Mesh(new THREE.BoxGeometry(0.1, ph + 0.3, 0.1), stake).translateX(x).translateY((ph + 0.3) / 2 - 0.15));
      for (let y = 0.2, k = 0; y < ph; y += 0.16, k++) panel.add(new THREE.Mesh(new THREE.BoxGeometry(w, 0.1, 0.08), k % 2 ? withy : withyDk).translateY(y).translateZ(k % 2 ? 0.05 : -0.05));
      return g;
    }
    const bar = def.gate.style === 'brass' ? brass : iron, rail = def.gate.style === 'brass' ? copper : ironDk;
    for (let i = 0; i <= n * 2; i++) g.add(new THREE.Mesh(new THREE.BoxGeometry(0.12, h, 0.12), bar).translateX(-w / 2 + (i / (n * 2)) * w).translateY(h / 2));
    for (let j = 1; j < h; j++) g.add(new THREE.Mesh(new THREE.BoxGeometry(w, 0.1, 0.14), rail).translateY(j));
    for (let i = 0; i <= n * 2; i += 2) g.add(new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.3, 4), bar).translateX(-w / 2 + (i / (n * 2)) * w).translateY(-0.15).rotateX(Math.PI));
    // The Kilnfolk hang theirs from a toothed rack, with a cog at each end
    if (def.gate.style === 'brass') for (const x of [-w / 2 - 0.2, w / 2 + 0.2]) g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.16, 10), copper).translateX(x).translateY(h - 0.3).rotateX(Math.PI / 2));
    return g;
  }

  private hook(at: [number, number], f: number): THREE.Mesh {
    const p = this.at(at[0], at[1], 1.6, f);
    const g = new THREE.Group(); g.position.copy(p);
    g.add(new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.5, 0.08), ironDk));
    g.add(new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.32, 0.3), ironDk).translateY(-0.3));
    const glow = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.22, 0.2), flame); glow.position.y = -0.3; glow.visible = false;
    g.add(glow);
    this.host.scene.add(g);
    return glow;
  }

  /** A worn flagstone in an iron frame; the groove round it glows while it's down. */
  /** A pillar of glass grown out of the floor; the glow inside it shows when it's been struck. */
  private pillar(at: [number, number], h: number, f: number): THREE.Mesh {
    const p = this.at(at[0], at[1], 0, f);
    const g = new THREE.Group(); g.position.copy(p);
    g.add(new THREE.Mesh(new THREE.BoxGeometry(0.62, h, 0.62), glass).translateY(h / 2));
    g.add(new THREE.Mesh(new THREE.ConeGeometry(0.42, 0.6, 4), glass).translateY(h + 0.3).rotateY(Math.PI / 4));
    const glow = new THREE.Mesh(new THREE.BoxGeometry(0.34, h * 0.8, 0.34), glassLit); glow.position.y = h * 0.45; glow.visible = false;
    g.add(glow);
    this.host.scene.add(g);
    return glow;
  }

  /**
   * A slab of the black leant against the wall by a niche; laid back, it covers the niche. The mesh
   * shown when it's "lit" is the laid slab; the leaning one (userData.other) goes when it does.
   */
  private slab(at: [number, number], f: number): THREE.Mesh {
    const p = this.at(at[0], at[1], 0, f), wall = at[1] < 0 ? -1 : 1;
    const g = new THREE.Group(); g.position.copy(p);
    const leaning = new THREE.Mesh(new THREE.BoxGeometry(1.0, 1.7, 0.22), blackSlab);
    leaning.position.set(0.3, 0.82, wall * 0.15); leaning.rotation.x = wall * 0.22; g.add(leaning);
    const laid = new THREE.Mesh(new THREE.BoxGeometry(1.1, 2.1, 0.24), blackSlab);
    laid.position.set(0, 1.55, wall * 0.62); laid.visible = false; g.add(laid);
    const seam = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.06, 0.02), slabSeam); seam.position.set(0, 0.6, -wall * 0.13); laid.add(seam);
    laid.userData.other = leaning;
    this.host.scene.add(g);
    return laid;
  }

  private plate(at: [number, number], f: number): THREE.Mesh {
    const p = this.at(at[0], at[1], 0.02, f);
    const g = new THREE.Group(); g.position.copy(p);
    for (const [x, z, w, d] of [[0, 0.72, 1.56, 0.12], [0, -0.72, 1.56, 0.12], [0.72, 0, 0.12, 1.32], [-0.72, 0, 0.12, 1.32]] as const) g.add(new THREE.Mesh(new THREE.BoxGeometry(w, 0.08, d), ironDk).translateX(x).translateZ(z).translateY(0.04));
    const lip = new THREE.Mesh(new THREE.BoxGeometry(1.34, 0.03, 1.34), groove); lip.position.y = 0.02; g.add(lip);
    const slab = new THREE.Mesh(new THREE.BoxGeometry(1.22, 0.14, 1.22), stone); slab.position.y = 0.07; g.add(slab);
    slab.userData.lip = lip;
    this.host.scene.add(g);
    return slab;
  }

  private chestAt(def: RoomDef): THREE.Group {
    const g = new THREE.Group(); g.position.copy(this.at(def.chest[0], def.chest[1], 0, this.fl(def)));
    g.add(new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.6, 0.7), wood).translateY(0.3));
    g.add(new THREE.Mesh(new THREE.BoxGeometry(1.04, 0.24, 0.74), wood).translateY(0.72));
    for (const x of [-0.42, 0.42]) g.add(new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.86, 0.76), brass).translateX(x).translateY(0.43));
    this.host.scene.add(g);
    return g;
  }

  // ---------------------------------------------------------------- The gates
  private shut(r: Live): void {
    const v = this.host.voxels;
    if (r.barriers.length) return; // (hurdles: shut since the run began)
    for (const [x, z] of r.def.gate.cells) {
      const wx = this.ox + x, wz = this.oz + z, y0 = Math.floor(this.at(x, z, 0, this.fl(r.def)).y);
      for (let y = y0; y < y0 + r.def.gate.h; y++) if (v.get(wx, y, wz) === B.Air) { v.set(wx, y, wz, B.Barrier); r.barriers.push([wx, y, wz]); }
    }
    r.gate.visible = true; r.gateY = 1; // (drops in update)
  }

  private open(r: Live): void {
    for (const [x, y, z] of r.barriers) if (this.host.voxels.get(x, y, z) === B.Barrier) this.host.voxels.set(x, y, z, B.Air);
    r.barriers = [];
  }

  // ---------------------------------------------------------------- The run
  /** Starts a room (state 1) or finishes it (state 2): from here, or from another member. */
  private setState(i: number, s: 1 | 2, local: boolean): void {
    const r = this.rooms[i];
    if (!r || s <= r.state) return;
    if (s === 1) {
      r.state = 1;
      this.shut(r);
      this.host.banner(r.def.title, r.def.kind === 'levers' ? (r.def.leverStyle === 'glass' ? 'Strike the pillars in the right order' : r.def.leverStyle === 'slab' ? 'Lay the black back in the right order' : 'Light the lamps in the right order') : r.def.kind === 'plates' ? 'Hold the plates down together' : r.def.kind === 'waves' ? 'Hold the room' : 'Take the key off the one who carries it');
      this.host.system(r.def.start);
      this.host.sound('bell', 0.6);
      if (r.def.waves) this.wave(r, 0);
      if (r.def.keeper) {
        const k = r.def.keeper, f = this.fl(r.def), p = this.at(k.at[0], k.at[1], 0, f);
        r.keeper = this.host.spawn(k.type, p.x, p.y, p.z, k.name);
        for (const [x, z, t] of k.crew) { const q = this.at(x, z, 0, f); this.host.spawn(t, q.x, q.y, q.z); }
      }
    } else {
      if (r.state === 0) this.shut(r);
      r.state = 2;
      this.open(r);
      this.host.system(r.def.done);
      this.host.sound('discover');
      r.chest = this.chestAt(r.def);
    }
    if (local) this.host.share(i, s);
  }

  /** A wave of a waves room comes in. */
  private wave(r: Live, n: number): void {
    r.wave = n; r.waveT = 0;
    if (n > 0 && r.def.waveSays?.[n - 1]) this.host.system(r.def.waveSays[n - 1]);
    const f = this.fl(r.def);
    r.waveMobs = (r.def.waves?.[n] ?? []).map(([x, z, t]) => { const q = this.at(x, z, 0, f); return this.host.spawn(t, q.x, q.y, q.z); });
  }

  /** Another member moved a room on. */
  remote(i: number, state: number): void { if (state === 1 || state === 2) this.setState(i, state, false); }

  update(dt: number): void {
    this.clock += dt;
    const P = this.host.player();
    this.rooms.forEach((r, i) => {
      // The portcullis drops when the room shuts and rises when it's done
      const want = r.state === 1 ? 0 : 1;
      if (r.def.gate.style === 'hurdle' || r.def.gate.style === 'ice') {
        // Hurdles stand across the way from the start, and go down flat when the room's done
        if (r.state === 0 && !r.barriers.length && this.host.voxels.isLoaded(this.ox + r.def.gate.cells[0][0], this.oz + r.def.gate.cells[0][1])) { this.shut(r); r.gate.visible = true; r.gateY = 0; }
        if (r.state === 2 && r.gateY < 1) {
          r.gateY = Math.min(1, r.gateY + dt * 1.6);
          const panel = r.gate.children[0];
          if (r.def.gate.style === 'ice') { panel.scale.set(1 + r.gateY * 0.3, 1 - r.gateY, 1 + r.gateY); if (r.gateY >= 1) r.gate.visible = false; }
          else panel.rotation.x = -(Math.PI / 2) * r.gateY * r.gateY;
        }
      } else if (r.gate.visible) {
        r.gateY += Math.sign(want - r.gateY) * Math.min(Math.abs(want - r.gateY), dt * (want > r.gateY ? 0.8 : 3));
        const base = r.gate.userData.base ?? (r.gate.userData.base = r.gate.position.y);
        r.gate.position.y = base + r.gateY * (r.def.gate.h - 0.3);
        if (r.state === 2 && r.gateY >= 1) r.gate.visible = false;
      }
      const [x0, z0, x1, z1] = r.def.box;
      const inside = P.x >= this.ox + x0 && P.x <= this.ox + x1 + 1 && P.z >= this.oz + z0 && P.z <= this.oz + z1 + 1 && Math.abs(P.y - this.fl(r.def)) < 6;
      if (r.state === 0 && inside) this.setState(i, 1, true);
      if (r.state !== 1) return;
      // Plates: down while you stand on one, and for a while after
      if (r.def.kind === 'plates') {
        for (const pl of r.plates) {
          const c = pl.mesh.parent!.position;
          if (Math.hypot(P.x - c.x, P.z - c.z) < 0.9 && Math.abs(P.y - c.y) < 1.2) {
            if (pl.downUntil < this.clock) this.host.sound('click');
            pl.downUntil = this.clock + (r.def.hold ?? 5);
          }
          const down = pl.downUntil > this.clock;
          pl.mesh.material = down ? stoneDown : stone;
          pl.mesh.position.y = down ? 0.02 : 0.07; // sunk into its frame
          (pl.mesh.userData.lip as THREE.Mesh).material = down ? grooveLit : groove;
        }
        if (r.plates.every((pl) => pl.downUntil > this.clock)) this.setState(i, 2, true);
      }
      // Keeper: down, and the gate's key with them
      if (r.def.kind === 'keeper' && r.keeper && !r.keeper.alive) this.setState(i, 2, true);
      // Waves: the next comes when this one's down, or after half a minute regardless
      if (r.def.kind === 'waves') {
        r.waveT += dt;
        const clear = r.waveMobs.every((e) => !e.alive), last = r.wave >= (r.def.waves?.length ?? 1) - 1;
        if (last && clear) this.setState(i, 2, true);
        else if (!last && (clear || r.waveT > 30)) this.wave(r, r.wave + 1);
      }
    });
  }

  /** Things to press E on: the lamp hooks, the clue, the room chests. */
  candidates(P: THREE.Vector3): { label: string; pos: THREE.Vector3; use: () => void }[] {
    const out: { label: string; pos: THREE.Vector3; use: () => void }[] = [];
    this.rooms.forEach((r, i) => {
      const d = r.def;
      if (d.clue) {
        const c = this.at(d.clue[0], d.clue[1], 1, this.fl(d));
        if (Math.hypot(P.x - c.x, P.z - c.z) < 2.4 && Math.abs(P.y + 1 - c.y) < 3) out.push({ label: 'Read ' + d.clue[2].replace(/^The /, 'the '), pos: c, use: () => this.host.read(d.clue![2], d.clue![3]) });
      }
      if (r.state === 1 && d.levers) d.levers.forEach((l, k) => {
        const m = r.lamps[k], p = m.getWorldPosition(new THREE.Vector3());
        if (m.visible || Math.hypot(P.x - p.x, P.z - p.z) > 2.2 || Math.abs(P.y - p.y) > 3.5) return;
        out.push({ label: l.label, pos: p, use: () => this.pull(i, k) });
      });
      if (r.state === 2 && r.chest && !r.opened && Math.hypot(P.x - r.chest.position.x, P.z - r.chest.position.z) < 2.4 && Math.abs(P.y - r.chest.position.y) < 2.5) {
        out.push({ label: 'Open the chest', pos: r.chest.position.clone().setY(r.chest.position.y + 0.8), use: () => this.openChest(r) });
      }
    });
    return out;
  }

  /** A lamp hook lit: the right one next, or the room punishes you and the lamps go out. */
  private pull(i: number, k: number): void {
    const r = this.rooms[i], order = r.def.order ?? [];
    if (order[r.lit.length] === k) {
      r.lit.push(k);
      r.lamps[k].visible = true;
      if (r.lamps[k].userData.other) (r.lamps[k].userData.other as THREE.Object3D).visible = false;
      this.host.sound(r.def.leverStyle === 'glass' ? 'bell' : r.def.leverStyle === 'slab' ? 'open' : 'click', r.def.leverStyle === 'glass' ? 0.35 + 0.15 * r.lit.length : 1);
      if (r.lit.length === order.length) this.setState(i, 2, true);
      return;
    }
    // Wrong: every lamp goes out, and something comes out of the dark
    r.lit = [];
    for (const m of r.lamps) { m.visible = false; if (m.userData.other) (m.userData.other as THREE.Object3D).visible = true; }
    this.host.system(r.def.leverStyle === 'glass' ? 'The pillar gives a flat note and the others go dark. The floor cracks, and something comes up through it.'
      : r.def.leverStyle === 'slab' ? 'The slab won\'t sit. The others slide off their niches, and two of the guard climb out of the dark to see who\'s robbing them.'
      : 'The lamp gutters, and the others go out with it. Something in the gallery heard that.');
    this.host.sound('bell', 0.4);
    const p = this.host.player();
    (r.def.wrong ?? []).forEach((t, n) => this.host.spawn(t, p.x + (n ? 3 : -3), p.y, p.z + 3));
  }

  private openChest(r: Live): void {
    r.opened = true;
    if (r.chest) { this.host.scene.remove(r.chest); r.chest = null; }
    const lv = this.host.level();
    this.host.reward(Math.round(120 + lv * 18), Math.round(14 + lv * 1.6), [], r.def.title + '\'s chest');
  }

  dispose(): void {
    for (const r of this.rooms) {
      this.open(r);
      this.host.scene.remove(r.gate);
      for (const m of r.lamps) if (m.parent) this.host.scene.remove(m.parent);
      for (const p of r.plates) if (p.mesh.parent) this.host.scene.remove(p.mesh.parent);
      if (r.chest) this.host.scene.remove(r.chest);
    }
    this.rooms = [];
  }
}
