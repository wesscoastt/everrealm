import * as THREE from 'three';
import { Ally, allyStats } from '../entities/Ally';
import { CreatureModel, mountModel } from '../entities/creatures';
import type { Appearance } from '../entities/humanoid';
import type { Enemy } from '../entities/Enemy';
import { COMPANIONS, compShort, type BanterKey, type CompanionEvent, type CompanionId, type CompanionRole } from '../data/companions';
import type { Henchman } from '../data/dungeons';
import type { VoxelWorld } from '../world/VoxelWorld';
import { regionAt } from '../world/terrain';

// Your companion in the world (data/companions.ts): one at a time, walking at your side, riding beside
// you when you ride, fighting what you fight in their role, getting you up when you fall, and talking
// about wherever you are. They have opinions about what you do (rapport), and they say so. In a group
// dungeon they take a henchman's place (game/Dungeons.ts asks henchmanOf()).

export interface CompanionHost {
  scene: THREE.Scene;
  voxels: VoxelWorld;
  player(): { pos: THREE.Vector3; yaw: number; speed: number; dead: boolean; riding: boolean; swimming: boolean; hp: number; max: number };
  level(): number;
  /** The foe you're fighting, if you are (and how recently you were). */
  target(): Enemy | null;
  fighting(): boolean;
  hit(e: Enemy, dmg: number): void;
  /** A spell's light, from one point to another (Fisherman Dave's, with the Pilgrim Hat). */
  magic(from: THREE.Vector3, to: THREE.Vector3, color: string, big: boolean): void;
  healPlayer(n: number): void;
  flag(k: string): unknown;
  setFlag(k: string, v: unknown): void;
  say(pos: THREE.Vector3, h: number, text: string): void;
  system(text: string): void;
  hour(): number;
  festival(): string | null;
  /** Near a town, for the town's banter: its key, or null. */
  town(x: number, z: number): BanterKey | null;
}

/** Horses for the companions to ride alongside you: their own colours. */
const STEEDS: Record<CompanionId, { coat: string; mane: string; cloth: string; breed?: string }> = {
  wenna: { coat: '#4a3424', mane: '#1e1610', cloth: '#2e3a4a' },
  ottilie: { coat: '#b8b8b0', mane: '#e8e6e0', cloth: '#6a5a3a' },
  tam: { coat: '#2a2220', mane: '#1a1410', cloth: '#7a2a24', breed: 'pied' },
  // (Ned's is a stout little pack pony from a livery in Ansbury, far too eager, like him)
  ned: { coat: '#c8a070', mane: '#e8dcc0', cloth: '#5a7aa8', breed: 'pack' },
  // (Dave's is a borrowed cob off the fish carts, broad and unhurried)
  dave: { coat: '#6a5a4a', mane: '#2a2420', cloth: '#3a4a5a', breed: 'pack' },
  fdave: { coat: '#8a6a4a', mane: '#3a2a1e', cloth: '#d8a020', breed: 'pack' },
};

export class Companions {
  /** The one with you now. */
  private ally: Ally | null = null;
  private id: CompanionId | null = null;
  private steed: CreatureModel | null = null;
  private hitIn = 0;
  private mendIn = 0;
  private banterIn = 40;
  private lastLine = '';
  private lastKey: BanterKey | null = null;
  private lastRegion = '';
  private wasFighting = false;
  private hurtSaid = 0;
  private clock = 0;
  /** Fisherman Dave's spells cast, every third a big one. */
  private casts = 0;

  constructor(private host: CompanionHost) {}

  get active(): CompanionId | null { return this.id; }
  get body(): Ally | null { return this.ally; }

  rapport(id: CompanionId): number { return Number(this.host.flag(`comp:${id}:rapport`) ?? 0); }

  /** The look they wear: their own, with the outfit chosen. */
  private lookOf(id: CompanionId): Appearance {
    const c = COMPANIONS[id], o = c.outfits.find((x) => x.id === this.host.flag(`comp:${id}:outfit`)) ?? c.outfits[0];
    const look = { ...c.look, ...o.look } as Appearance;
    if (id === 'fdave') { if (this.host.flag('fd:hatOn') === 'dave') { look.hat = 'pilgrim'; look.hatColor = '#3a2a1e'; } else if (this.host.flag('fd:cap')) { look.hat = 'flatcap'; look.hatColor = '#5a7a2a'; } }
    return look;
  }
  private roleOf(id: CompanionId): CompanionRole {
    const r = this.host.flag(`comp:${id}:role`) as CompanionRole | undefined;
    return r && COMPANIONS[id].roles.includes(r) ? r : COMPANIONS[id].roles[0];
  }
  /** Them as a henchman (for a dungeon's party, and for their body here). */
  henchmanOf(id: CompanionId): Henchman {
    const c = COMPANIONS[id], first = compShort(id);
    return {
      id: 'comp_' + id, name: first, title: c.title, role: this.roleOf(id), look: this.lookOf(id), held: id === 'ottilie' ? 'none' : id === 'dave' ? 'kitto_gaff' : 'sword',
      barks: { pull: c.banter.fight ?? ['Here they come.'], low: c.banter.hurt ?? ['Careful!'], kill: c.banter.won ?? ['Done.'], down: 'I\'m down!', up: 'I\'m up.', mend: ['Hold still.'] },
    };
  }

  /** Bring one along (sends any other home first). */
  join(id: CompanionId): void {
    if (this.id === id && this.ally) return;
    this.dismiss(true);
    this.id = id;
    this.host.setFlag('comp:active', id);
    this.host.setFlag(`comp:${id}:house`, null);
    this.spawn();
    this.banterIn = 25;
  }
  /** Send them home (they wait where you met them). */
  dismiss(quiet = false): void {
    if (this.ally) this.host.scene.remove(this.ally.model.root);
    if (this.steed) this.host.scene.remove(this.steed.root);
    if (this.id && !quiet) this.host.system(`${compShort(this.id)} goes back to ${COMPANIONS[this.id].home.place}.`);
    this.ally = null; this.steed = null; this.id = null;
    this.host.setFlag('comp:active', null);
  }
  /** Send them to live at your house until you call them (game/HouseGuests.ts). */
  toHouse(id: CompanionId): void {
    if (this.id === id) this.dismiss(true);
    this.host.setFlag(`comp:${id}:house`, 1);
    this.host.system(`${compShort(id)} heads off to your house.`);
  }
  /** They've had enough of you: gone for good. */
  leave(id: CompanionId): void {
    if (this.id === id) this.dismiss(true);
    this.host.setFlag(`comp:${id}:gone`, 1);
    this.host.system(`${COMPANIONS[id].name} has left you.`);
  }
  /** Rebuild the body (an outfit or a role changed). */
  refresh(): void { if (this.id) { const id = this.id; this.dismiss(true); this.id = id; this.host.setFlag('comp:active', id); this.spawn(); } }

  private spawn(): void {
    if (!this.id) return;
    const p = this.host.player();
    this.ally = new Ally(this.henchmanOf(this.id), Math.max(1, this.host.level()), this.host.voxels);
    const bx = p.pos.x - Math.sin(p.yaw) * 2 + Math.cos(p.yaw) * 1.2, bz = p.pos.z - Math.cos(p.yaw) * 2 - Math.sin(p.yaw) * 1.2;
    this.ally.place(bx, this.host.voxels.groundBelow(bx, p.pos.y + 3, bz), bz);
    this.host.scene.add(this.ally.model.root);
  }

  /** Change how they rapport with you, and say so the way BioWare's companions do. */
  addRapport(id: CompanionId, delta: number, line?: string): void {
    const now = Math.max(-100, Math.min(100, this.rapport(id) + delta));
    this.host.setFlag(`comp:${id}:rapport`, now);
    if (!delta) return;
    const first = compShort(id);
    this.host.system(`${first} ${delta > 0 ? (delta >= 8 ? 'approves greatly' : 'approves') : delta <= -8 ? 'disapproves greatly' : 'disapproves'}.`);
    if (line && this.ally && this.id === id) this.host.say(this.ally.pos, 2.4, line);
  }

  /** Something you did that they might have an opinion on. */
  event(ev: CompanionEvent): void {
    if (!this.id) return;
    const like = COMPANIONS[this.id].likes[ev];
    if (like) this.addRapport(this.id, like[0], like[1]);
  }

  /** A line from them, by what's happening; never the same line twice running. */
  private talk(key: BanterKey, chance = 1): boolean {
    if (!this.id || !this.ally || Math.random() > chance) return false;
    const lines = COMPANIONS[this.id].banter[key];
    if (!lines?.length) return false;
    const pool = lines.length > 1 ? lines.filter((l) => l !== this.lastLine) : lines;
    const line = pool[Math.floor(Math.random() * pool.length)];
    this.lastLine = line; this.lastKey = key;
    this.host.say(this.ally.pos, 2.4, line);
    this.host.system(`${compShort(this.id)}: "${line}"`);
    return true;
  }

  update(dt: number): void {
    if (!this.id) {
      // Picked up again after a reload
      const was = this.host.flag('comp:active') as CompanionId | null;
      if (was && COMPANIONS[was] && !this.host.flag(`comp:${was}:gone`)) this.join(was);
      return;
    }
    const a = this.ally;
    if (!a) return;
    this.clock += dt;
    const p = this.host.player();
    const d = Math.hypot(p.pos.x - a.pos.x, p.pos.z - a.pos.z);
    // Too far behind (a waymark, a ride, a fall): they catch up out of sight
    if (d > 40 || Math.abs(p.pos.y - a.pos.y) > 12 || a.stuck > 2.5) {
      const bx = p.pos.x - Math.sin(p.yaw) * 2.5, bz = p.pos.z - Math.cos(p.yaw) * 2.5;
      a.place(bx, this.host.voxels.groundBelow(bx, p.pos.y + 3, bz), bz);
      a.stuck = 0;
    }
    // Riding: on their own horse, a length behind and to the side
    if (p.riding) {
      if (!this.steed) { this.steed = mountModel(STEEDS[this.id] as never); this.host.scene.add(this.steed.root); }
      const sx = p.pos.x - Math.sin(p.yaw) * 3.2 + Math.cos(p.yaw) * 2, sz = p.pos.z - Math.cos(p.yaw) * 3.2 - Math.sin(p.yaw) * 2;
      const gy = this.host.voxels.groundBelow(sx, p.pos.y + 4, sz);
      a.pos.set(a.pos.x + (sx - a.pos.x) * Math.min(1, dt * 6), gy, a.pos.z + (sz - a.pos.z) * Math.min(1, dt * 6));
      a.yaw = p.yaw;
      this.steed.root.position.copy(a.pos);
      this.steed.root.rotation.y = p.yaw;
      this.steed.setAnim(p.speed > 10 ? 'run' : p.speed > 0.4 ? 'walk' : 'idle');
      this.steed.update(dt, p.speed);
      a.model.setState('ride');
      a.model.update(dt, p.speed);
      a.model.root.position.set(a.pos.x, a.pos.y + 1.08, a.pos.z);
      a.model.root.rotation.y = p.yaw;
      this.banter(dt, p);
      return;
    }
    if (this.steed) { this.host.scene.remove(this.steed.root); this.steed = null; }
    // Fighting: what you're fighting, in their role
    const foe = this.host.fighting() ? this.host.target() : null;
    const S = allyStats(a.role, Math.max(1, this.host.level()));
    let moving = 0;
    this.hitIn -= dt; this.mendIn -= dt;
    if (a.role === 'healer' && !p.dead && p.hp < p.max * 0.65 && this.mendIn <= 0) {
      this.host.healPlayer(S.mend * 0.6);
      a.act = 'heal'; a.actTime = 0; a.face(p.pos.x, p.pos.z);
      this.mendIn = 7;
    }
    if (foe && foe.alive && !p.dead) {
      const fd = Math.hypot(foe.pos.x - a.pos.x, foe.pos.z - a.pos.z);
      const reach = a.role === 'healer' ? 9 : 2.2;
      // Fisherman Dave: rusty until he has the Magical Pilgrim Hat on; with it, he casts from a distance (the hat's
      // powers, not his own: take it off him and he's back to his fists)
      const fdave = this.id === 'fdave', hat = fdave && this.host.flag('fd:hatOn') === 'dave';
      const reachHere = hat ? 8 : reach;
      if (fd > reachHere) { if (a.stepToward(foe.pos.x, foe.pos.z, 5.6, dt)) moving = 5.6; else a.stuck += dt; }
      else {
        a.face(foe.pos.x, foe.pos.z);
        if (this.hitIn <= 0) {
          if (hat) {
            this.casts++;
            const big = this.casts % 3 === 0;
            this.host.magic(a.pos.clone().setY(a.pos.y + 1.4), foe.pos.clone().setY(foe.pos.y + 0.8), big ? '#7ad8ff' : '#e8d07a', big);
            this.host.hit(foe, S.hit * (big ? 2.4 : 1.5));
            a.act = 'heal'; a.actTime = 0;
            this.hitIn = S.every * 0.9;
            if (big && Math.random() < 0.3) this.host.say(a.pos, 2.4, ['The hat did that. I just held still.', 'Whoa. Whoa! Did you see that?', 'I don\'t know what I said, but it worked.'][Math.floor(Math.random() * 3)]);
          } else if (fdave && Math.random() < 0.18) {
            // a swing that goes nowhere near
            a.act = 'attack'; a.actTime = 0;
            this.hitIn = S.every * 1.3;
            if (Math.random() < 0.5) this.host.say(a.pos, 2.4, ['That was almost embarrassing.', 'I meant to do that. Mostly.', 'Remind me not to practise drinking and fighting at the same time.'][Math.floor(Math.random() * 3)]);
          } else {
            this.host.hit(foe, S.hit * (a.role === 'tank' ? 0.9 : 1) * (fdave ? 0.75 : 1));
            a.act = a.role === 'healer' ? 'heal' : 'attack'; a.actTime = 0;
            this.hitIn = S.every * (fdave ? 1.2 : 1);
            if (fdave && Math.random() < 0.08) this.host.say(a.pos, 2.4, ['Now that\'s starting to look familiar!', 'All right! I remember that one!', 'Well, that\'s one less thing trying to kill us.'][Math.floor(Math.random() * 3)]);
          }
        }
      }
    } else if (d > 3) {
      // At your side: a step behind and to the left, at your pace
      const tx = p.pos.x - Math.sin(p.yaw) * 1.8 + Math.cos(p.yaw) * 1.4, tz = p.pos.z - Math.cos(p.yaw) * 1.8 - Math.sin(p.yaw) * 1.4;
      const sp = Math.min(11, Math.max(4.2, p.speed + (d > 8 ? 3 : 0.6)));
      if (a.stepToward(tx, tz, sp, dt)) { moving = sp; a.stuck = 0; } else a.stuck += dt;
    } else a.face(a.pos.x + Math.sin(p.yaw), a.pos.z + Math.cos(p.yaw));
    a.update(dt, moving);
    this.banter(dt, p);
  }

  /** Chatter: the fight, your wounds, the land you've come into, the town, the hour, now and then. */
  private banter(dt: number, p: ReturnType<CompanionHost['player']>): void {
    if (!this.id || !this.ally) return;
    const fighting = this.host.fighting();
    if (fighting && !this.wasFighting) this.talk('fight', 0.35);
    if (!fighting && this.wasFighting) this.talk('won', 0.3);
    this.wasFighting = fighting;
    if (p.dead) { if (this.lastKey !== 'down') this.talk('down'); return; }
    if (p.hp < p.max * 0.3 && this.clock - this.hurtSaid > 30) { this.hurtSaid = this.clock; this.talk('hurt'); }
    // A land you've just come into: said at once
    const region = regionAt(p.pos.x, p.pos.z).a;
    const key: BanterKey = (['greenwake', 'crownroad', 'brambledeep', 'saltwind', 'redstone', 'starfall'] as string[]).includes(region) ? region as BanterKey : 'morrow';
    if (region !== this.lastRegion) { const first = !this.lastRegion; this.lastRegion = region; if (!first && !fighting) { this.talk(key); this.banterIn = 60; } }
    this.banterIn -= dt;
    if (this.banterIn > 0 || fighting) return;
    this.banterIn = 70 + Math.random() * 80;
    const h = this.host.hour(), night = h >= 20 || h < 5;
    const town = this.host.town(p.pos.x, p.pos.z);
    const partner = !!this.host.flag(`comp:${this.id}:partner`);
    const tries: BanterKey[] = [];
    if (partner && Math.random() < 0.25) tries.push('partner');
    if (this.host.festival() === 'lantern' && Math.random() < 0.3) tries.push('wake');
    if (town) tries.push(town);
    if (night && Math.random() < 0.5) tries.push('night');
    if (p.riding) tries.push('ride');
    if (p.swimming) tries.push('swim');
    tries.push(key, 'idle');
    for (const k of tries) if (this.talk(k)) return;
  }
}
