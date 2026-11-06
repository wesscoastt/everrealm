import * as THREE from 'three';
import { SharedMobs } from '../src/game/SharedMobs';
const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const mk = (hp: number) => ({ spawnKey: 'wolf@10,10', questTag: undefined, def: { hp }, hp, pos: V(10, 20, 10), state: 'idle', justDied: false,
  get alive() { return this.state !== 'dead'; },
  takeDamage(n: number) { this.hp -= n; if (this.state === 'idle') this.state = 'chase'; if (this.hp <= 0) { this.hp = 0; this.state = 'dead'; this.justDied = true; } return true; } });
const others = new Map<number, THREE.Vector3>([[7, V(14, 20, 10)]]);
const sent: [string, number][] = [];
const sm = new SharedMobs({ others: () => others.entries(), me: () => V(0, 20, 10), send: (k, s) => sent.push([k, s]), claimed: () => false, now: () => 0 });
const e = mk(200) as any;
const base = { player: V(0, 20, 10), playerAlive: true, playerInvulnerable: false, playerSwimming: false, hitPlayer: () => {}, sound: () => {} } as any;
const ok = (c: boolean, m: string) => console.log(c ? 'ok  ' : 'FAIL', m);
// Coming in: the nearest (the other player, 4 away; I'm 10 away)
let c = sm.ctxFor(e, base); ok(!!c && c.player.x === 14, 'nearest other player draws it');
// I hit it hard: it turns to me
sm.mine(e, 50); e.takeDamage(50);
c = sm.ctxFor(e, base); ok(c === null, 'after my blow it comes for me');
sm.update(0.2); ok(sent.length === 1 && Math.abs(sent[0][1] - 0.25) < 1e-9, 'my blow sent as a quarter share: ' + JSON.stringify(sent));
// Their bigger blows: it turns to them; a share scales to my level's health
const e2 = sm.theirs([e], 'wolf@10,10', 0.4, 7); ok(e2 === null && e.hp === 70, 'their 0.4 share took 80 of 200: hp ' + e.hp);
c = sm.ctxFor(e, base); ok(!!c && c.player.x === 14, 'after their bigger blows it goes for them');
// They finish it: it dies here, and it's mine too (I tagged it)
const dead = sm.theirs([e], 'wolf@10,10', 0.5, 7); ok(dead === e && sm.wasMine(e), 'their last blow kills ours, and I get the kill');
// Alone: nothing sent, and nothing changes
others.clear(); sent.length = 0; const e3 = mk(100) as any; sm.mine(e3, 10); sm.update(0.2); ok(sent.length === 0 && sm.ctxFor(e3, base) === null, 'alone: no messages, it stays on me');
