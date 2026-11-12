import * as THREE from 'three';
import { Humanoid, type Appearance, type AnimState } from '../entities/humanoid';
import type { VoxelWorld } from '../world/VoxelWorld';
import { isSolid } from '../world/blocks';
import type { HomeShape } from '../data/housing';
import type { Piece } from './Home';
import { ITEMS } from '../data/items';
import { COMPANIONS, type CompanionId } from '../data/companions';
import { HOUSE_TALK } from '../data/companionHome';

// Companions at your house (owner 2026-11-12: "have it so you can send them to your house when not using the rest,
// and they'll walk around your lot interacting with stuff and each other"). Whoever you send home from the
// companions window lives there until you call them: they sit in your chairs, cook at the hearth, read at the
// bookcase, go through the chest, tend the garden on a lot, sleep in your beds at night (whoever's left over dozes
// in a chair), and when two of them are idle at once one goes over to the other and they talk. Only drawn while
// you're near the house; what they're doing is made up afresh each time you come back, as it would be.

export interface HouseGuestsHost {
  scene: THREE.Scene;
  voxels: VoxelWorld;
  /** Your home, if you have one. */
  shape(): HomeShape | null;
  /** The lot round it, if it stands on one (x0, z0 to x1, z1). */
  yard(): { x0: number; z0: number; x1: number; z1: number } | null;
  /** Your furniture. */
  pieces(): Piece[];
  /** Your garden's tiles ("x,z"). */
  garden(): string[];
  player(): THREE.Vector3;
  hour(): number;
  /** Who is living at the house now. */
  who(): CompanionId[];
  look(id: CompanionId): Appearance;
  say(pos: THREE.Vector3, h: number, text: string): void;
}

/** Something to do: where to stand, which way to face, the pose, how high it lifts you (a chair), what it's called. */
interface Spot { x: number; y: number; z: number; yaw: number; anim: AnimState; lift: number; inside: boolean; key: string; night?: boolean; held?: string }

interface Guest {
  id: CompanionId;
  model: Humanoid;
  pos: THREE.Vector3;
  yaw: number;
  /** Points still to walk through, then what to do there. */
  path: THREE.Vector3[];
  doing: Spot | null;
  until: number;
  inside: boolean;
  /** Talking with another of them: who, and the lines left to say, in turn. */
  talk: { with: CompanionId; lines: [CompanionId, string][]; next: number } | null;
}

const WALK = 1.35;
const SEAT_H: Record<string, number> = { chair: 0.62, f_armchair: 0.5, stool: 0.48, bench: 0.48, f_settle: 0.48 };

/** Each piece of furniture, and what a guest does with it. */
function useOf(model: string): { anim: AnimState; sit?: boolean; bed?: boolean; held?: string } | null {
  if (model === 'bed' || model === 'f_bunk') return { anim: 'sleep', bed: true };
  if (model in SEAT_H) return { anim: 'seated', sit: true };
  if (model === 'hearth') return { anim: 'cook' };
  if (model === 'anvil' || model === 'forge') return { anim: 'hammer', held: 'hammer' };
  if (model === 'chest' || model === 'f_logbasket' || model === 'barrel' || model === 'f_cradle') return { anim: 'crouch' };
  if (model === 'f_spinning') return { anim: 'seated', sit: true };
  if (['shelves', 'f_bookcase', 'desk', 'f_bureau', 'dresser', 'f_wardrobe', 'f_cupboard', 'f_sideboard', 'f_washstand', 'f_globe', 'table', 'f_roundtable', 'f_weaponrack', 'f_armourstand', 'f_plant', 'f_coatrack'].includes(model)) return { anim: 'idle' };
  return null;
}

export class HouseGuests {
  private guests = new Map<CompanionId, Guest>();
  private clock = 0;
  private chatIn = 25;
  /** What there is to do about the place, worked out every few seconds (furniture moves, the garden grows). */
  private spotsCache: { at: number; spots: Spot[] } | null = null;

  constructor(private host: HouseGuestsHost) {}

  /** The one nearest a point, for talking to (within reach). */
  near(p: THREE.Vector3, reach = 2.6): { id: CompanionId; pos: THREE.Vector3 } | null {
    let best: Guest | null = null, bd = reach;
    for (const g of this.guests.values()) { const d = g.pos.distanceTo(p); if (d < bd) { bd = d; best = g; } }
    return best ? { id: best.id, pos: best.pos } : null;
  }
  /** What each is doing, for testing. */
  status(): { id: string; at: number[]; anim: string; key: string | null; talking: string | null }[] {
    return [...this.guests.values()].map((g) => ({ id: g.id, at: g.pos.toArray().map((v) => Math.round(v * 10) / 10), anim: g.path.length ? 'walk' : g.doing?.anim ?? 'idle', key: g.doing?.key ?? null, talking: g.talk?.with ?? null }));
  }

  private doorPoints(h: HomeShape): { in: THREE.Vector3; out: THREE.Vector3 } {
    const dx = h.door === 'n' || h.door === 's' ? h.x0 + Math.floor(h.w / 2) : h.door === 'e' ? h.x0 + h.w - 1 : h.x0;
    const dz = h.door === 'e' || h.door === 'w' ? h.z0 + Math.floor(h.d / 2) : h.door === 's' ? h.z0 + h.d - 1 : h.z0;
    const [nx, nz] = h.door === 'n' ? [0, -1] : h.door === 's' ? [0, 1] : h.door === 'e' ? [1, 0] : [-1, 0];
    const out = new THREE.Vector3(dx + 0.5 + nx * 1.5, 0, dz + 0.5 + nz * 1.5);
    out.y = this.host.voxels.groundBelow(out.x, h.base + 3, out.z);
    return { in: new THREE.Vector3(dx + 0.5 - nx * 1.2, h.base, dz + 0.5 - nz * 1.2), out };
  }

  /** Everything there is to do about the place, just now. */
  private spots(h: HomeShape): Spot[] {
    const V = this.host.voxels, out: Spot[] = [];
    const free = (x: number, y: number, z: number) => !isSolid(V.get(Math.floor(x), Math.floor(y + 0.1), Math.floor(z))) && !isSolid(V.get(Math.floor(x), Math.floor(y + 1.1), Math.floor(z)));
    const pieces = this.host.pieces();
    const taken = new Set(pieces.filter(([, , , , f]) => !f).map(([, x, z]) => Math.floor(x) + ',' + Math.floor(z)));
    for (const [item, x, z, t, f] of pieces) {
      if (f) continue; // (the ground floor only: nobody's carried up the stairs in their sleep)
      const model = ITEMS[item]?.furn?.model;
      const use = model && useOf(model);
      if (!use) continue;
      const yaw = (t * Math.PI) / 2, key = item + '@' + x + ',' + z;
      if (use.sit) { out.push({ x, y: h.base, z, yaw, anim: 'seated', lift: (SEAT_H[model!] ?? 0.48) - 0.48, inside: true, key }); continue; }
      if (use.bed) { out.push({ x, y: h.base + 0.42, z, yaw, anim: 'sleep', lift: 0, inside: true, key, night: true }); continue; }
      // Stand at whichever side of it is clear, facing it
      for (const a of [yaw, yaw + Math.PI, yaw + Math.PI / 2, yaw - Math.PI / 2]) {
        const sx = x + Math.sin(a) * 1.05, sz = z + Math.cos(a) * 1.05;
        if (!free(sx, h.base, sz) || taken.has(Math.floor(sx) + ',' + Math.floor(sz))) continue;
        out.push({ x: sx, y: h.base, z: sz, yaw: a + Math.PI, anim: use.anim, lift: 0, inside: true, key, held: use.held });
        break;
      }
    }
    // A few places to stand about in, inside
    for (let k = 0; k < 3; k++) {
      const x = h.x0 + 1.5 + ((k * 7 + 3) % Math.max(1, h.w - 3)), z = h.z0 + 1.5 + ((k * 5 + 2) % Math.max(1, h.d - 3));
      if (free(x, h.base, z) && !taken.has(Math.floor(x) + ',' + Math.floor(z))) out.push({ x, y: h.base, z, yaw: k * 2.1, anim: 'idle', lift: 0, inside: true, key: 'floor' + k });
    }
    // The garden, and the yard, on a lot
    const yard = this.host.yard();
    if (yard) {
      for (const k of this.host.garden().slice(0, 12)) {
        const [tx, tz] = k.split(',').map(Number);
        const sx = tx + 0.5, sz = tz - 0.5, y = V.groundBelow(sx, h.base + 4, sz);
        if (free(sx, y, sz)) out.push({ x: sx, y, z: sz, yaw: 0, anim: 'crouch', lift: 0, inside: false, key: 'garden' + k });
      }
      for (let k = 0; k < 4; k++) {
        const x = yard.x0 + 1.5 + ((k * 5 + 1) % Math.max(1, yard.x1 - yard.x0 - 2)), z = yard.z0 + 1.5 + ((k * 7 + 4) % Math.max(1, yard.z1 - yard.z0 - 2));
        if (x > h.x0 - 0.5 && x < h.x0 + h.w + 0.5 && z > h.z0 - 0.5 && z < h.z0 + h.d + 0.5) continue;
        const y = V.groundBelow(x, h.base + 4, z);
        if (free(x, y, z)) out.push({ x, y, z, yaw: k * 1.7, anim: 'idle', lift: 0, inside: false, key: 'yard' + k });
      }
    }
    return out;
  }

  private spawn(id: CompanionId, h: HomeShape, spots: Spot[]): void {
    const model = new Humanoid(this.host.look(id));
    const at = spots.length ? spots[Math.floor(Math.random() * spots.length)] : null;
    const pos = at ? new THREE.Vector3(at.x, at.y, at.z) : this.doorPoints(h).in.clone();
    const g: Guest = { id, model, pos, yaw: 0, path: [], doing: null, until: 0, inside: at?.inside ?? true, talk: null };
    if (at && this.claimable(at, g)) this.begin(g, at);
    this.host.scene.add(model.root);
    this.guests.set(id, g);
  }

  private remove(id: CompanionId): void {
    const g = this.guests.get(id);
    if (!g) return;
    this.host.scene.remove(g.model.root);
    this.guests.delete(id);
  }

  /** Nobody else in it, or on the way to it. */
  private claimable(s: Spot, me: Guest): boolean {
    for (const g of this.guests.values()) if (g !== me && g.doing?.key === s.key) return false;
    return true;
  }

  private begin(g: Guest, s: Spot): void {
    g.doing = s;
    g.pos.set(s.x, s.y, s.z);
    g.yaw = s.yaw;
    g.inside = s.inside;
    g.until = this.clock + (s.anim === 'sleep' ? 9999 : 18 + Math.random() * 30);
    g.model.setHeld(s.held ?? 'none');
    // Now and then, a word about what they're at
    if (Math.random() < 0.25 && this.host.player().distanceTo(g.pos) < 14) {
      const lines = COMPANIONS[g.id].banter.house;
      if (lines?.length) this.host.say(g.pos, 2.4, lines[Math.floor(Math.random() * lines.length)]);
    }
  }

  /** Off to something else: by the door if it's the other side of the wall. */
  private choose(g: Guest, h: HomeShape, spots: Spot[]): void {
    const night = this.host.hour() >= 22 || this.host.hour() < 6;
    let pool = spots.filter((s) => this.claimable(s, g) && s.key !== g.doing?.key);
    if (night) {
      const beds = pool.filter((s) => s.night);
      pool = beds.length ? beds : pool.filter((s) => s.anim === 'seated');
      if (!pool.length) pool = spots.filter((s) => s.inside);
    } else pool = pool.filter((s) => !s.night);
    if (!pool.length) { g.until = this.clock + 10; return; }
    const s = pool[Math.floor(Math.random() * pool.length)];
    this.walkTo(g, h, s);
  }

  private walkTo(g: Guest, h: HomeShape, s: Spot): void {
    g.path = [];
    if (s.inside !== g.inside) { const d = this.doorPoints(h); g.path.push(...(g.inside ? [d.in, d.out] : [d.out, d.in]).map((v) => v.clone())); }
    g.path.push(new THREE.Vector3(s.x, s.y, s.z));
    g.doing = s;
    g.model.setHeld('none');
  }

  /** Two of them idle at once: one goes over, and they talk. */
  private startChat(): void {
    const free = [...this.guests.values()].filter((g) => !g.path.length && !g.talk && g.doing?.anim !== 'sleep');
    if (free.length < 2) return;
    const a = free[Math.floor(Math.random() * free.length)], b = free.filter((x) => x !== a && x.inside === a.inside)[0];
    if (!b) return;
    const pair = HOUSE_TALK.filter((t) => (t.a === a.id && t.b === b.id) || (t.a === b.id && t.b === a.id));
    if (!pair.length) return;
    const t = pair[Math.floor(Math.random() * pair.length)];
    const lines = t.lines.map(([w, l]): [CompanionId, string] => [w === 'a' ? t.a : t.b, l]);
    // The one who speaks first walks over to the other
    const first = lines[0][0] === a.id ? a : b, other = first === a ? b : a;
    const ang = Math.atan2(first.pos.x - other.pos.x, first.pos.z - other.pos.z);
    const sx = other.pos.x + Math.sin(ang) * 1.3, sz = other.pos.z + Math.cos(ang) * 1.3;
    // (on the floor beside them: a sleeper's or a sitter's own height is the bed's or the seat's)
    const fy = other.inside ? this.host.shape()!.base : this.host.voxels.groundBelow(sx, other.pos.y + 2, sz);
    first.path = [new THREE.Vector3(sx, fy, sz)];
    first.doing = { x: sx, y: fy, z: sz, yaw: ang + Math.PI, anim: 'talk', lift: 0, inside: other.inside, key: 'talk:' + first.id };
    first.until = this.clock + 999;
    first.talk = { with: other.id, lines, next: 0 };
    other.talk = { with: first.id, lines: [], next: Infinity }; // (listening: the one who started it ends it)
  }

  private chat(g: Guest): void {
    const t = g.talk!;
    if (g.path.length || this.clock < t.next) return;
    const line = t.lines.shift();
    const other = this.guests.get(t.with);
    if (!line || !other) {
      g.talk = null; g.until = this.clock + 3;
      if (other) { other.talk = null; other.until = Math.min(other.until, this.clock + 6); }
      return;
    }
    const who = this.guests.get(line[0]);
    if (who) {
      if (this.host.player().distanceTo(who.pos) < 18) this.host.say(who.pos, who.doing?.anim === 'seated' ? 1.9 : 2.4, line[1]);
      if (who.doing?.anim === 'idle') who.model.setState('talk');
    }
    // the other turns to face whoever's speaking, if they're on their feet
    if (other.doing && other.doing.anim !== 'seated' && other.doing.anim !== 'sleep') other.yaw = Math.atan2(g.pos.x - other.pos.x, g.pos.z - other.pos.z);
    t.next = this.clock + 3.2 + line[1].length * 0.045;
  }

  update(dt: number): void {
    this.clock += dt;
    const h = this.host.shape(), P = this.host.player();
    const want = h && Math.hypot(P.x - (h.x0 + h.w / 2), P.z - (h.z0 + h.d / 2)) < 70 && this.host.voxels.isLoaded(Math.floor(h.x0), Math.floor(h.z0)) ? this.host.who() : [];
    for (const id of [...this.guests.keys()]) if (!want.includes(id)) this.remove(id);
    if (!h || !want.length) return;
    if (!this.spotsCache || this.clock - this.spotsCache.at > 4) this.spotsCache = { at: this.clock, spots: this.spots(h) };
    const spots = this.spotsCache.spots;
    for (const id of want) if (!this.guests.has(id)) this.spawn(id, h, spots);

    this.chatIn -= dt;
    if (this.chatIn <= 0) { this.chatIn = 30 + Math.random() * 40; this.startChat(); }

    for (const g of this.guests.values()) {
      let speed = 0;
      if (g.path.length) {
        const to = g.path[0], dx = to.x - g.pos.x, dz = to.z - g.pos.z, d = Math.hypot(dx, dz);
        if (d < 0.12) {
          g.pos.copy(to); g.path.shift();
          if (!g.path.length && g.doing) { g.inside = g.doing.inside; g.yaw = g.doing.yaw; if (g.doing.anim !== 'talk') this.begin(g, g.doing); }
        } else {
          const step = Math.min(d, WALK * dt);
          g.pos.x += (dx / d) * step; g.pos.z += (dz / d) * step;
          g.pos.y += (to.y - g.pos.y) * Math.min(1, dt * 6);
          g.yaw = Math.atan2(dx, dz); speed = WALK;
        }
      } else if (g.talk) this.chat(g);
      else if (this.clock > g.until) this.choose(g, h, spots);
      // Bedtime: anyone still up goes to a bed while there's one free, or else to a chair to doze in; and up in the morning
      const night = this.host.hour() >= 22 || this.host.hour() < 6;
      if (!g.path.length && !g.talk) {
        const bedFree = night && g.doing?.anim !== 'sleep' && spots.some((s) => s.night && this.claimable(s, g));
        const settled = g.doing?.anim === 'sleep' || (g.doing?.anim === 'seated' && !bedFree);
        if ((night && !settled) || (!night && g.doing?.anim === 'sleep')) this.choose(g, h, spots);
        else if (night && settled) g.until = Math.max(g.until, this.clock + 60);
      }

      const m = g.model;
      const anim: AnimState = g.path.length ? 'walk' : g.talk && g.doing?.anim === 'talk' ? 'talk' : g.doing?.anim ?? 'idle';
      m.setState(anim);
      m.root.position.set(g.pos.x, g.pos.y + (g.path.length ? 0 : g.doing?.lift ?? 0), g.pos.z);
      m.root.rotation.y = g.yaw;
      m.update(dt, speed, false);
    }
  }

}
