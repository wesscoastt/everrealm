import type { Enemy } from '../entities/Enemy';
import { ENEMIES, type EnemyDef, type EnemyType } from '../data/gameplay';
import { DUELISTS, LADDER_PRIZE, type Duelist } from '../data/duels';
import { SALT_COCKPIT } from '../world/morrow';
import type { ActivityHost } from './Activities';

// Duels in the Cockpit at Saltpenny Key (data/duels.ts). One at a time: the duelist steps into the
// ring and comes for you. Bring them to half their health and they yield; fall to a quarter of yours
// and you do (Game.hitPlayer asks playerHit, and you're never killed in the ring). Step out of the
// ring and the duel is forfeit. The first win over each pays their purse and Brethren standing (the
// Keys'); after that a win is worth a round's money, once an hour each. Beating Mara Coyle, at the top
// of the ladder, wins the Cockpit's ribbon.

const CP = SALT_COCKPIT;
/** A rematch pays a quarter of the purse, once an hour per duelist. */
const REMATCH_MS = 60 * 60 * 1000;

export class Duels {
  private live: { d: Duelist; enemy: Enemy } | null = null;

  constructor(private host: ActivityHost, private spawn: (def: EnemyDef, x: number, z: number) => Enemy) {}

  get active(): boolean { return !!this.live; }

  private inRing(x: number, z: number, slack = 0): boolean { return Math.hypot(x - CP.x - 0.5, z - CP.z - 0.5) < CP.r + slack; }

  /** Jago calls the next duel (the dialogue only offers the ones you've earned). */
  start(id: string): void {
    const d = DUELISTS.find((x) => x.id === id);
    if (!d || this.live) return;
    const P = this.host.player();
    if (!this.inRing(P.x, P.z, 7)) { this.host.system('Duels are fought in the Cockpit, at Saltpenny Key.'); return; }
    const enemy = this.spawn({ ...ENEMIES[d.type as EnemyType], leash: CP.r + 4, aggro: CP.r * 2 }, CP.x + 4, CP.z);
    enemy.questTag = 'duel';
    this.live = { d, enemy };
    this.host.banner(d.name, 'Duel in the Cockpit · first blood');
    this.host.say?.(d.name, d.pull);
    this.host.sound('bell');
  }

  /** The player is hit by something: a duelist's blow that leaves them at a quarter or less ends it. True: keep them standing. */
  playerHit(from: Enemy, hp: number, max: number): boolean {
    if (!this.live || from !== this.live.enemy || hp > max * 0.25) return false;
    this.end(false);
    return true;
  }

  update(): void {
    const L = this.live;
    if (!L) return;
    const e = L.enemy, P = this.host.player();
    if (!e.alive || e.hp <= e.def.hp * 0.5) { this.end(true); return; }
    if (!this.host.alive()) { this.end(false); return; }
    if (!this.inRing(P.x, P.z, 3)) { this.host.system('You stepped out of the ring. The duel is forfeit.'); this.end(false, true); }
  }

  private end(won: boolean, forfeit = false): void {
    const L = this.live!;
    this.live = null;
    if (L.enemy.alive) this.host.removeEnemy(L.enemy);
    const d = L.d;
    if (!won) {
      if (!forfeit) this.host.say?.(d.name, d.wins);
      this.host.banner(d.name, forfeit ? 'Duel forfeit' : 'You yield');
      return;
    }
    this.host.say?.(d.name, d.yields);
    const first = !this.host.flag('duelWon:' + d.id);
    const last = Number(this.host.flag('duelAt:' + d.id) ?? 0);
    this.host.setFlag('duelWon:' + d.id, true);
    this.host.banner(d.name, first ? 'Yields · first blood to you' : 'Yields');
    this.host.sound('levelUp');
    if (first) {
      const prize = d.id === DUELISTS[DUELISTS.length - 1].id ? [LADDER_PRIZE] : [];
      this.host.reward(400 + DUELISTS.indexOf(d) * 200, d.purse, prize, `You beat ${d.name} in the Cockpit`);
      this.host.standing?.('keys', 60);
      this.host.setFlag('duelAt:' + d.id, Date.now());
    } else if (Date.now() - last > REMATCH_MS) {
      this.host.reward(150, Math.round(d.purse / 4), [], `A rematch with ${d.name}, won`);
      this.host.setFlag('duelAt:' + d.id, Date.now());
    } else this.host.system(`${d.name} buys the round. Purses are once an hour.`);
  }
}
