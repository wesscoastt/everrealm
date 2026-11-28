// A bot clears each group dungeon end to end, in its real halls (the dungeon pass, after the dark-crawler kit's
// campaign bot).
//   npm run -s dungeonbot                 every group dungeon, at its own level, as damage
//   npm run -s dungeonbot -- gd-winding   just this one
//
// The halls are the planner's own blocks (Overrides, as the site check reads them), so the creatures walk the real
// floors and walls and so does the bot: it goes in with henchmen (game/Dungeons.ts), walks the shortest way over the
// floor to the nearest creature still standing (a pack, a boss and its crew), fights what comes at it, and when all
// are down opens the chest and takes the way out. It smashes the pots and crates it passes (game/Breakables.ts,
// counted here, not drawn). It reports each boss's time, deaths, and the clear.

import './canvas-stub.mjs';
import * as THREE from 'three';
import { Enemy, EnemyContext } from '../src/entities/Enemy';
import { B, BLOCKS } from '../src/world/blocks';
import { Dungeons, DungeonHost } from '../src/game/Dungeons';
import { DUNGEONS } from '../src/data/dungeons';
import { Overrides, plan } from '../src/world/sites';
import { heightAt } from '../src/world/terrain';

const cells = new Map<string, number>();
const key = (x: number, y: number, z: number) => `${Math.floor(x)},${Math.floor(y)},${Math.floor(z)}`;
const set0 = Overrides.prototype.set;
Overrides.prototype.set = function (x: number, y: number, z: number, id: number) { cells.set(key(x, y, z), id); return set0.call(this, x, y, z, id); };
const PLAN = plan();
const blockAt = (x: number, y: number, z: number): number => cells.get(key(x, y, z)) ?? (y < heightAt(Math.floor(x), Math.floor(z)) ? B.Stone : B.Air);
const solid = (x: number, y: number, z: number) => { const id = blockAt(x, y, z); return id !== B.Air && id !== B.Water && !!BLOCKS[id]?.solid; };
const world = {
  get: blockAt,
  solidAt: solid,
  topSolid: (x: number, z: number) => heightAt(Math.floor(x), Math.floor(z)) - 1,
  groundBelow: (x: number, y: number, z: number) => { let g = Math.floor(y); while (g > -40 && !solid(x, g - 1, z)) g--; return g; },
  isLoaded: () => true,
  isWater: (x: number, y: number, z: number) => blockAt(x, y, z) === B.Water,
  raycast: () => null,
  // (a room's gate or barrier going up and down: game/Rooms.ts)
  set: (x: number, y: number, z: number, id: number) => { cells.set(key(x, y, z), id); },
};

const want = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const results: string[] = [];
let failed = 0;

for (const def of DUNGEONS) {
  if (want.length && !want.includes(def.id)) continue;
  const site = PLAN.sites.find((s) => s.id === def.id);
  if (!site?.act?.arrive) { results.push(`-- ${def.id}: no halls in the plan`); continue; }
  results.push(runOne(def.id, def.level, site));
}
console.log('\n' + results.join('\n'));
console.log(failed ? `${failed} not cleared.` : 'Every dungeon cleared.');
process.exit(failed ? 1 : 0);

function runOne(id: string, L: number, site: NonNullable<ReturnType<typeof plan>['sites'][number]>): string {
  const act = site.act!;
  const scene = new THREE.Scene();
  const P = new THREE.Vector3(...act.arrive!);
  const maxHp = 100 + (L - 1) * 6;
  let hp = maxHp, dead = false, deadFor = 0, deaths = 0, iframes = 0, clock = 0, lastHitAt = -99;
  let enemies: Enemy[] = [];
  let target: Enemy | null = null;
  const log: string[] = [];
  const stamp = () => `${Math.floor(clock / 60)}:${String(Math.floor(clock % 60)).padStart(2, '0')}`;
  const flags: Record<string, unknown> = {};
  const host = {
    scene, voxels: world as never, particles: new Proxy({}, { get: () => () => {} }) as never,
    player: () => P, dead: () => dead, invulnerable: () => iframes > 0, swimming: () => false, level: () => L,
    hp: () => ({ hp, max: maxHp }), calling: () => 'reaver', inCombat: () => clock - lastHitAt < 6,
    hurtPlayer: (d: number) => { if (dead) return; hp -= Math.round(d * (1 - 15 / 55)); lastHitAt = clock; if (hp <= 0) { hp = 0; dead = true; deadFor = 0; deaths++; log.push(`${stamp()} player down`); } },
    ground: () => {}, healPlayer: (n: number) => { if (!dead) hp = Math.min(maxHp, hp + n); },
    raise: (share: number) => { dead = false; hp = Math.round(maxHp * share); iframes = 1.2; },
    addEnemy: (e: Enemy) => { enemies.push(e); },
    removeEnemy: (e: Enemy) => { enemies = enemies.filter((x) => x !== e); if (target === e) target = null; },
    killed: (e: Enemy) => { dungeons.onKilled(e); if (target === e) target = null; },
    target: () => target,
    travel: (at: [number, number, number]) => P.set(at[0], at[1], at[2]),
    reward: (_xp: number, _m: number, items: string[], why: string) => log.push(`${stamp()} reward: ${why} ${items.join(',')}`),
    banner: (t: string, s: string) => log.push(`${stamp()} ${t} · ${s}`),
    system: () => {}, say: () => {}, float: () => {}, sound: () => {}, sfx: () => {}, ask: (_t: string, yes: () => void) => yes(),
    flag: (k: string) => flags[k], setFlag: (k: string, v: unknown) => { flags[k] = v; }, persist: () => {}, standing: () => {},
    count: () => 0, take: () => false, read: () => {},
    net: { on: () => false, queue() {}, unqueue() {}, queueNow() {}, groupGo() {}, answer() {}, event() {}, rejoin() {}, leaveRun() {} },
    remote: () => null, group: () => null, refresh: () => {},
  } as unknown as DungeonHost;
  const dungeons = new Dungeons(host);
  dungeons.setRole('damage');
  const why = dungeons.goWithHenchmen(id);
  if (why) { failed++; return `!! ${id}: refused: ${why}`; }
  P.set(...act.arrive!);

  // The floor, as cells you can stand in (sitecheck's walk: a block up, three down, headroom for both)
  const walk = (x: number, y: number, z: number) => (solid(x, y - 1, z) || world.isWater(x, y - 1, z)) && !solid(x, y, z) && !solid(x, y + 1, z);
  const K = (x: number, y: number, z: number) => `${x},${y},${z}`;
  /** The shortest way over the floor from (x, y, z) to whichever cell `goal` accepts first. */
  const route = (from: THREE.Vector3, goal: (x: number, y: number, z: number) => boolean): THREE.Vector3[] | null => {
    const s = [Math.floor(from.x), Math.floor(from.y + 0.2), Math.floor(from.z)];
    const prev = new Map<string, string | null>([[K(s[0], s[1], s[2]), null]]);
    const q: [number, number, number][] = [[s[0], s[1], s[2]]];
    for (let i = 0; i < q.length && i < 60000; i++) {
      const [x, y, z] = q[i];
      if (goal(x, y, z)) {
        const out: THREE.Vector3[] = [];
        let c: string | null | undefined = K(x, y, z);
        while (c) { const [a, b, d] = c.split(',').map(Number); out.unshift(new THREE.Vector3(a + 0.5, b, d + 0.5)); c = prev.get(c); }
        return out;
      }
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) for (const dy of [0, 1, -1, -2, -3]) {
        const nx = x + dx, ny = y + dy, nz = z + dz, k = K(nx, ny, nz);
        if (prev.has(k)) continue;
        if (dy > 0 && solid(x, y + 2, z)) continue;
        if (dy < 0 && [0, -1, -2].slice(0, -dy).some((h) => solid(nx, y + h, nz) || solid(nx, y + h + 1, nz))) continue;
        if (!walk(nx, ny, nz)) continue;
        prev.set(k, K(x, y, z)); q.push([nx, ny, nz]);
        break;
      }
    }
    return null;
  };
  // The breakables on the way: smashed when the bot passes within a swing of them
  const brk = new Set((site.breakables ?? []).map((b, i) => i));
  let smashed = 0;

  let path: THREE.Vector3[] = [];
  let repathIn = 0, stuck = 0;
  const bossAt: number[] = [];
  const dt = 1 / 30;
  let swing = 0, phase: 'clear' | 'chest' | 'out' | 'done' = 'clear';
  const base: EnemyContext = { player: P, playerAlive: true, playerInvulnerable: false, playerSwimming: false, level: L, hitPlayer: (d, from) => host.hurtPlayer(d, from), sound: () => {} };
  const power = (7 + L * 1.45 + 8) * (1 + (L - 1) * 0.02);
  const stepAlong = (speed: number) => {
    while (path.length && Math.hypot(path[0].x - P.x, path[0].z - P.z) < 0.35) path.shift();
    if (!path.length) return;
    const g = path[0], d = Math.hypot(g.x - P.x, g.z - P.z);
    P.x += ((g.x - P.x) / d) * Math.min(d, speed * dt); P.z += ((g.z - P.z) / d) * Math.min(d, speed * dt);
    P.y = g.y;
  };
  for (let step = 0; step < 30 * 60 * 30 && phase !== 'done'; step++) {
    clock += dt;
    iframes = Math.max(0, iframes - dt);
    repathIn -= dt;
    if (dead) {
      deadFor += dt;
      if (deadFor > (dungeons.raising ? 9 : 3.5)) {
        dead = false; hp = Math.round(maxHp * 0.6);
        const s = dungeons.respawnAt(); if (s) P.set(s[0], s[1], s[2]);
        target = null; path = [];
      }
    } else {
      const engaged = enemies.filter((e) => e.alive && dungeons.owns(e) && ['chase', 'windup', 'attack', 'recover'].includes(e.state) && e.pos.distanceTo(P) < 18);
      if (engaged.length && phase === 'clear') {
        if (!target || !target.alive || !engaged.includes(target)) { target = engaged.sort((a, b) => a.pos.distanceTo(P) - b.pos.distanceTo(P))[0]; repathIn = 0; }
        const d = Math.hypot(target.pos.x - P.x, target.pos.z - P.z);
        if (d > 2.4) {
          if (repathIn <= 0) { repathIn = 0.5; const T = target; path = route(P, (x, y, z) => Math.hypot(x + 0.5 - T.pos.x, z + 0.5 - T.pos.z) < 2 && Math.abs(y - T.pos.y) < 2) ?? []; }
          stepAlong(6);
        }
        swing -= dt;
        if (d < 2.9 && Math.abs(target.pos.y - P.y) < 2.5 && swing <= 0) {
          swing = 0.85;
          const dmg = Math.max(1, Math.round(power * (0.9 + Math.random() * 0.2) * (Math.random() < 0.15 ? 1.6 : 1)));
          target.takeDamage(dmg, P, clock);
          dungeons.onPlayerHit(target, dmg);
          lastHitAt = clock;
          if (target.justDied) host.killed(target);
        }
        if (hp < maxHp * 0.35 && Math.random() < dt / 6) hp = Math.min(maxHp, hp + 40);
      } else if (phase === 'clear') {
        // Walk to the nearest creature of the run still standing (packs, bosses, crews: the order the halls put them in)
        const left = enemies.filter((e) => e.alive && dungeons.owns(e));
        if (!left.length && dungeons.run?.done) { phase = 'chest'; path = []; log.push(`${stamp()} all down`); }
        else if (!path.length || repathIn <= 0) {
          repathIn = 2;
          const near = new Set(left.map((e) => K(Math.floor(e.pos.x), Math.floor(e.pos.y), Math.floor(e.pos.z))));
          path = route(P, (x, y, z) => { for (const dx of [-1, 0, 1]) for (const dz of [-1, 0, 1]) if (near.has(K(x + dx, y, z + dz))) return true; return false; }) ?? [];
          if (!path.length && left.length) { stuck += 2; if (stuck > 30) { log.push(`${stamp()} no way on: ${left.length} creatures left out of reach, e.g. ${left[0].def.type} at ${left[0].pos.toArray().map((v) => v.toFixed(1))}`); break; } }
        }
        stepAlong(5);
        if (clock - lastHitAt > 6) hp = Math.min(maxHp, hp + maxHp * 0.08 * dt);
      } else if (phase === 'chest') {
        const c = act.chest!;
        if (!path.length) path = route(P, (x, _y, z) => Math.hypot(x + 0.5 - c[0], z + 0.5 - c[2]) < 1.6) ?? [];
        stepAlong(5);
        if (Math.hypot(P.x - c[0], P.z - c[2]) < 2) {
          const opened = dungeons.candidates(P, () => {}).find((x) => x.label === 'Open the chest');
          opened?.use(); log.push(`${stamp()} chest ${opened ? 'opened' : 'not offered'}`);
          phase = 'out'; path = [];
        } else if (!path.length) { log.push(`${stamp()} can't reach the chest`); break; }
      } else if (phase === 'out') {
        const e = act.exit!;
        if (!path.length) path = route(P, (x, _y, z) => Math.hypot(x + 0.5 - e[0], z + 0.5 - e[2]) < 1.5) ?? [];
        stepAlong(6);
        if (Math.hypot(P.x - e[0], P.z - e[2]) < 1.8) {
          const way = dungeons.candidates(P, () => {})[0];
          log.push(`${stamp()} at the way out: ${way?.label ?? '(nothing)'}`);
          way?.use();
          phase = 'done';
        } else if (!path.length) { log.push(`${stamp()} can't reach the way out`); break; }
      }
      // Pots and crates within a swing of where the bot walks
      for (const i of [...brk]) { const b = site.breakables![i]; if (Math.hypot(b.x - P.x, b.z - P.z) < 2.6 && Math.abs(b.y - P.y) < 2) { brk.delete(i); smashed++; } }
    }
    base.playerAlive = !dead;
    base.playerInvulnerable = iframes > 0;
    for (const e of [...enemies]) {
      if (e.pos.distanceTo(P) > 90 && e.state !== 'dead') continue;
      e.update(dt, dungeons.ctxFor(e, base) ?? base);
    }
    dungeons.update(dt);
    const bs = (dungeons.run as unknown as { bosses: { done: boolean }[] } | null)?.bosses ?? [];
    bs.forEach((b, i) => { if (b.done && bossAt[i] === undefined) { bossAt[i] = clock; log.push(`${stamp()} boss ${i + 1} down`); } });
  }
  const ok = phase === 'done';
  if (!ok) failed++;
  const total = site.breakables?.length ?? 0;
  return `${ok ? 'ok' : '!!'} ${id} (level ${L}): ${ok ? 'CLEARED' : 'NOT CLEARED'} in ${stamp()}, bosses at ${bossAt.map((t) => Math.round(t) + 's').join(', ') || '-'}, ${deaths} deaths, ${smashed}/${total} smashed on the way\n     ${log.slice(-9).join('\n     ')}`;
}
