import * as THREE from 'three';
import type { Enemy, EnemyContext } from '../entities/Enemy';

// Creatures the same for everyone by them. Two players on one wolf see one wolf, on one of them, at one
// health: a blow anywhere is a blow everywhere, and the wolf goes after whoever has hurt it most among the
// players near it (or, coming into a fight, the nearest). Each game still runs the creature itself, as group
// dungeons do (game/Dungeons.ts); the realm only carries the blows (server mHit), to players close enough to
// see them. A blow goes as a share of the creature's health, since every creature meets each player at their
// own level (data/scaling.ts) and its health in one game isn't its health in another.
// Everyone who put a blow in gets the kill, whoever lands the last one (GW2's tagging: nobody steals a kill).

export interface SharedMobsHost {
  /** The other players in the world, by id, where they stand. */
  others(): Iterable<[number, THREE.Vector3]>;
  me(): THREE.Vector3;
  /** Send the realm a share (0..1) of a creature's health taken off at a spawn point. */
  send(key: string, share: number): void;
  /** Creatures some other system already runs as a group (a dungeon's, an escort's, a quest's own). */
  claimed(e: Enemy): boolean;
  now(): number;
}

/** How near another player must be to a creature to count in its fight, and to be sent its blows. */
const NEAR = 60;
/** Blows are gathered and sent together this often (seconds): a flurry or a bleed is one message, not ten. */
const FLUSH = 0.15;
/** The key for your own player in a creature's threat. */
const ME = 0;

export class SharedMobs {
  /** Who has hurt each creature, and by how much (shares of its health): ME, or another player's id. */
  private threat = new Map<Enemy, Map<number, number>>();
  /** Creatures you've put a blow in, for the kill. */
  private tagged = new Set<Enemy>();
  private pending = new Map<string, number>();
  private t = 0;

  constructor(private host: SharedMobsHost) {}

  shares(e: Enemy): boolean { return !!e.spawnKey && !e.questTag && !this.host.claimed(e); }

  /** Anyone else close enough to this point to share its creatures. */
  private near(at: THREE.Vector3, r = NEAR): [number, THREE.Vector3][] {
    const out: [number, THREE.Vector3][] = [];
    for (const [id, p] of this.host.others()) if (Math.hypot(p.x - at.x, p.z - at.z) < r && Math.abs(p.y - at.y) < 12) out.push([id, p]);
    return out;
  }

  private add(e: Enemy, who: number, share: number): void {
    let t = this.threat.get(e);
    if (!t) this.threat.set(e, (t = new Map()));
    t.set(who, (t.get(who) ?? 0) + share);
  }

  /** You hit it (what it actually lost, after everything). */
  mine(e: Enemy, dmg: number): void {
    if (!this.shares(e) || dmg <= 0) return;
    const share = Math.min(1, dmg / Math.max(1, e.def.hp));
    this.tagged.add(e);
    this.add(e, ME, share);
    // Nobody near to tell: alone, nothing goes to the realm
    if (!this.near(e.pos, NEAR * 1.6).length) return;
    this.pending.set(e.spawnKey!, (this.pending.get(e.spawnKey!) ?? 0) + share);
  }

  /** Someone else's blows on the creature at this spawn point: the same share comes off ours. Returns it if it died of them. */
  theirs(list: Enemy[], key: string, share: number, from: number): Enemy | null {
    const e = list.find((x) => x.spawnKey === key && x.alive);
    if (!e || !this.shares(e)) return null;
    this.add(e, from, share);
    let at = e.pos.clone().add(new THREE.Vector3(0.1, 0, 0.1));
    for (const [id, p] of this.host.others()) if (id === from) at = p.clone();
    e.takeDamage(Math.max(1, Math.round(share * e.def.hp)), at, this.host.now());
    return e.justDied ? e : null;
  }

  /** It died: did you put a blow in? (Then it's your kill too, whoever finished it.) */
  wasMine(e: Enemy): boolean { return this.tagged.has(e); }

  /** Whoever the creature is after, if it's someone other than you; null leaves it on you. */
  ctxFor(e: Enemy, base: EnemyContext): EnemyContext | null {
    if (!e.alive) { this.threat.delete(e); this.tagged.delete(e); return null; }
    if (!this.shares(e)) return null;
    // Back home and whole: the fight's over, and forgotten
    if ((e.state === 'idle' || e.state === 'wander') && e.hp >= e.def.hp) { this.threat.delete(e); this.tagged.delete(e); }
    const others = this.near(e.pos);
    if (!others.length) return null;
    const t = this.threat.get(e);
    let best = ME, bv = 0;
    if (t) for (const [k, v] of t) {
      if (k !== ME && !others.some(([id]) => id === k)) continue;
      if (k === ME && !base.playerAlive) continue;
      if (v > bv) { bv = v; best = k; }
    }
    if (bv <= 0) {
      // Not yet in a fight: the nearest draws it
      let bd = base.playerAlive ? base.player.distanceTo(e.pos) : Infinity;
      for (const [id, p] of others) { const d = p.distanceTo(e.pos); if (d < bd) { bd = d; best = id; } }
    }
    if (best === ME) return null;
    const p = others.find(([id]) => id === best)![1];
    // Its blows on them land in their game, not here
    return { ...base, player: p, playerAlive: true, playerInvulnerable: false, playerSwimming: false, hitPlayer: () => {} };
  }

  update(dt: number): void {
    this.t += dt;
    if (this.t < FLUSH || !this.pending.size) return;
    this.t = 0;
    for (const [key, share] of this.pending) this.host.send(key, Math.min(1, share));
    this.pending.clear();
  }
}
