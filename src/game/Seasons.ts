import * as THREE from 'three';
import { FESTIVALS, type FestivalDef } from '../data/festivals';
import { landAt } from '../world/land';
import { SEASONS, type SeasonDef, type SpotKind, type DecorKind } from '../data/seasons';
import { utcDay } from '../data/calendar';
import { POSTS } from '../data/travel';
import { ITEMS } from '../data/items';
import { ENEMIES, type EnemyType } from '../data/gameplay';
import { Enemy } from '../entities/Enemy';
import { CreatureModel } from '../entities/creatures';
import type { VoxelWorld } from '../world/VoxelWorld';
import { B, isSolid } from '../world/blocks';
import { roadDist } from '../world/terrain';
import { DAY_MINUTES, realmNow } from '../world/clock';
import { campFlame, carvedTurnip, createPropMaterials, fireMaterial, gourdPile, jackOLantern, scarecrow, type PropMaterials } from '../world/props';
import type { Particles } from '../systems/Particles';
import type { MapMarker } from '../ui/Hud';

// The festivals' seasonal events in the running game (data/seasons.ts has what each brings):
//   - the round: spots in every Charter Post town, each good once a (real) day, with what they look
//     like built when you come near;
//   - the doors near every Post dressed for the festival;
//   - the boss, on the realm clock at its own place: its followers first, then itself; on the map
//     from anywhere while it's due or on its way;
//   - the bags and hats, opened and learned from the pack.

export interface SeasonHost {
  scene: THREE.Scene;
  voxels: VoxelWorld;
  particles: Particles;
  /** The festival on now (game/Festivals.ts), if any. */
  fest(): FestivalDef | null;
  flag(key: string): unknown;
  setFlag(key: string, value: unknown): void;
  give(item: string, n?: number): boolean;
  count(item: string): number;
  addMarks(n: number): void;
  banner(title: string, sub: string): void;
  system(text: string): void;
  toast(text: string): void;
  sound(name: 'coin' | 'discover' | 'bell' | 'pickup'): void;
  /** House doors within r of a point: where they stand and the way out of them. */
  doorsNear(x: number, z: number, r: number): { x: number; y: number; z: number; ry: number }[];
  addEnemy(e: Enemy): void;
  removeEnemy(e: Enemy): void;
  /** The hour of the day as the sky shows it: the realm's clock (world/clock.ts). */
  hour(): number;
  /** Points the world's lamp pool lights at night (shared with the festival stalls). */
  lamps: THREE.Vector3[];
}

interface Spot { key: string; kind: SpotKind; x: number; y: number; z: number; ry: number; mesh?: THREE.Object3D; lit?: THREE.Object3D }
interface Town {
  post: string; spots: Spot[]; decor: THREE.Group | null; built: boolean; lamps: THREE.Vector3[]; wisps: THREE.Object3D[];
  /** The Wake's lantern posts and scarecrows found so far, and when to look again (the land round a town loads a piece at a time). */
  posts: THREE.Vector3[]; crows: THREE.Vector3[]; lookAt: number; looks: number;
}
interface Fight { fest: string; adds: Enemy[]; boss: Enemy | null; t: number; over: boolean }

const realmDay = () => Math.floor(realmNow() / (DAY_MINUTES * 60_000));
const inWindow = (h: number, from: number, to: number) => (from <= to ? h >= from && h < to : h >= from || h < to);
/** Real seconds until a realm hour comes round (a realm hour is a real minute). */
const secsUntil = (hour: number, h: number) => { return ((((hour - h) % 24) + 24) % 24) * ((DAY_MINUTES * 60) / 24); };
const hash = (s: string) => { let h = 2166136261; for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return (h >>> 0) / 4294967296; };

export class Seasons {
  private towns = new Map<string, Town>();
  private fight: Fight | null = null;
  private festId: string | null = null;
  private clock = 0;

  constructor(private host: SeasonHost) {}

  private get season(): SeasonDef | null { const f = this.host.fest(); return f ? SEASONS[f.id] : null; }

  // ---------------------------------------------------------------- The round
  private roundState(): { day: number; fest: string; done: string[] } {
    const s = this.host.flag('sround') as { day: number; fest: string; done: string[] } | undefined;
    const day = utcDay(), fest = this.host.fest()?.id ?? '';
    return s && s.day === day && s.fest === fest ? s : { day, fest, done: [] };
  }
  private done(key: string): boolean { return this.roundState().done.includes(key); }

  /** Spots and festival things to press E on near p. */
  candidates(p: THREE.Vector3): { label: string; pos: THREE.Vector3; use: () => void }[] {
    const S = this.season;
    if (!S) return [];
    const out: { label: string; pos: THREE.Vector3; use: () => void }[] = [];
    for (const t of this.towns.values()) for (const s of t.spots) {
      if (Math.hypot(s.x - p.x, s.z - p.z) > 2.6 || Math.abs(s.y - p.y) > 2.5 || this.done(s.key)) continue;
      out.push({ label: S.round.label, pos: new THREE.Vector3(s.x, s.y + 0.6, s.z), use: () => this.visit(s) });
    }
    return out;
  }

  private visit(s: Spot): void {
    const S = this.season, f = this.host.fest();
    if (!S || !f || this.done(s.key)) return;
    const st = this.roundState();
    st.done.push(s.key);
    this.host.setFlag('sround', st);
    this.host.setFlag('sroundTotal', Number(this.host.flag('sroundTotal') ?? 0) + 1);
    const tokens = 1 + (Math.random() < 0.4 ? 1 : 0);
    this.host.give(f.token, tokens);
    if (Math.random() < 0.35) this.host.give(S.round.food, 1);
    if (Math.random() < 0.06) { this.host.give(S.bag, 1); this.host.system(`There was a ${ITEMS[S.bag].name.toLowerCase()} in it too.`); }
    this.host.toast(S.round.lines[Math.floor(Math.random() * S.round.lines.length)]);
    this.host.sound(s.kind === 'wreath' ? 'bell' : 'coin');
    this.dress(s, true);
    const left = this.spotsLeft();
    if (left === 0) this.host.system(`${S.round.name}: that's every one near you for today.`);
  }

  private spotsLeft(): number { let n = 0; for (const t of this.towns.values()) for (const s of t.spots) if (!this.done(s.key)) n++; return n; }

  // ---------------------------------------------------------------- Bags and hats
  /** Open a festival bag: tokens and food, and now and then a dye or the festival's hat. */
  openBag(id: string): string {
    const fest = ITEMS[id]?.bag, F = FESTIVALS.find((f) => f.id === fest), S = fest ? SEASONS[fest] : null;
    if (!F || !S) return '';
    const got: string[] = [];
    const n = 3 + Math.floor(Math.random() * 4);
    this.host.give(F.token, n); got.push(`${n} ${F.tokenPlural}`);
    const food = 1 + (Math.random() < 0.4 ? 1 : 0);
    this.host.give(S.round.food, food); got.push(`${food > 1 ? food + ' × ' : ''}${ITEMS[S.round.food].name}`);
    const dyes = F.stall.map((x) => x.item).filter((i) => ITEMS[i]?.dye && !this.host.flag('dye:' + ITEMS[i].dye!.color) && !this.host.count(i));
    if (dyes.length && Math.random() < 0.18) { const d = dyes[Math.floor(Math.random() * dyes.length)]; this.host.give(d, 1); got.push(ITEMS[d].name); }
    if (!this.host.flag('hat:' + S.hat.style) && !this.host.count(S.hat.item) && Math.random() < 0.05) { this.host.give(S.hat.item, 1); got.push(ITEMS[S.hat.item].name); this.host.sound('discover'); }
    return `${ITEMS[id].name}: ${got.join(', ')}.`;
  }

  // ---------------------------------------------------------------- The boss
  private bossDone(fest: string): boolean { return this.host.flag('sboss:' + fest) === realmDay(); }

  private runBoss(P: THREE.Vector3, dt: number): void {
    if (landAt(P.x) !== 'counties') return; // (the festival creatures come out on the Counties' greens)
    const S = this.season, f = this.host.fest();
    const F = this.fight;
    if (F) {
      F.t += dt;
      const far = Math.hypot(P.x - (S?.boss.x ?? 0), P.z - (S?.boss.z ?? 0)) > 170;
      if (!S || F.fest !== S.id || (far && !F.over)) { this.endFight(); return; }
      if (!F.boss && !F.over && (F.adds.every((e) => !e.alive) || F.t > 30)) {
        F.boss = this.spawn(S.boss.type, S.boss.x, S.boss.z, 0);
        this.host.banner(ENEMIES[S.boss.type as EnemyType].name, S.boss.where);
        this.host.sound('bell');
      }
      if (F.boss && !F.boss.alive && !F.over) {
        F.over = true; F.t = 0;
        this.host.setFlag('sboss:' + S.id, realmDay());
        this.host.setFlag('sbossKills:' + S.id, Number(this.host.flag('sbossKills:' + S.id) ?? 0) + 1);
        this.host.give(f!.token, 12);
        this.host.give(S.bag, 1);
        if (S.id === 'lantern' && !this.host.flag('costume:lanternman') && !this.host.count('costume_lanternman') && Math.random() < 0.08) { this.host.give('costume_lanternman', 1); this.host.system('He left his coat behind. It\'s still warm.'); this.host.sound('discover'); }
        this.host.addMarks(25);
        this.host.banner(`${ENEMIES[S.boss.type as EnemyType].name} is down`, `12 ${f!.tokenPlural} and a ${ITEMS[S.bag].name.toLowerCase()}`);
      }
      if (F.over && F.t > 20) this.endFight();
      return;
    }
    if (!S || !f || this.bossDone(S.id) || !inWindow(this.host.hour(), S.boss.from, S.boss.to)) return;
    if (Math.hypot(P.x - S.boss.x, P.z - S.boss.z) > 90 || !this.host.voxels.isLoaded(S.boss.x, S.boss.z)) return;
    this.fight = { fest: S.id, adds: S.boss.adds.map((t, i) => this.spawn(t, S.boss.x, S.boss.z, i + 1)), boss: null, t: 0, over: false };
    this.host.system(S.boss.call);
  }

  private spawn(type: string, x: number, z: number, i: number): Enemy {
    const a = i * 1.9, r = i ? 6 : 0;
    const px = Math.floor(x + Math.cos(a) * r), pz = Math.floor(z + Math.sin(a) * r);
    const e = new Enemy({ ...ENEMIES[type as EnemyType] }, px, pz, this.host.voxels);
    const y = this.host.voxels.groundBelow(px + 0.5, 120, pz + 0.5);
    e.home.set(px + 0.5, y, pz + 0.5);
    e.pos.copy(e.home);
    this.host.addEnemy(e);
    return e;
  }

  private endFight(): void {
    const F = this.fight;
    if (!F) return;
    for (const e of [...F.adds, ...(F.boss ? [F.boss] : [])]) this.host.removeEnemy(e);
    this.fight = null;
  }

  /** The boss on the map from anywhere: while it's out, and for a few minutes before. */
  markers(): MapMarker[] {
    const S = this.season;
    if (!S || this.bossDone(S.id)) return [];
    const name = ENEMIES[S.boss.type as EnemyType].name;
    if (inWindow(this.host.hour(), S.boss.from, S.boss.to)) return [{ x: S.boss.x, z: S.boss.z, kind: 'boss', label: `${name}: ${S.boss.where}` }];
    const until = secsUntil(S.boss.from, this.host.hour());
    if (until < 300) return [{ x: S.boss.x, z: S.boss.z, kind: 'bossSoon', label: `${name} in ${Math.floor(until / 60)}:${String(Math.floor(until % 60)).padStart(2, '0')}` }];
    return [];
  }

  /** What the journal's festival page says about the round and the boss. */
  journal(): { title: string; text: string }[] {
    const S = this.season;
    if (!S) return [];
    const name = ENEMIES[S.boss.type as EnemyType].name;
    const hh = (h: number) => `${String(h).padStart(2, '0')}:00`;
    const boss = this.bossDone(S.id) ? `${name} is down for today. It comes again tomorrow (realm time).` : inWindow(this.host.hour(), S.boss.from, S.boss.to) ? `${name} is out now at ${S.boss.where}.` : `${name} comes to ${S.boss.where} between ${hh(S.boss.from)} and ${hh(S.boss.to)} realm time, in about ${Math.ceil(secsUntil(S.boss.from, this.host.hour()) / 60)} minutes.`;
    return [
      { title: S.round.name, text: `${S.round.desc} ${this.roundState().done.length} done today.` },
      { title: name, text: `${boss} Bring it down for 12 tokens and a ${ITEMS[S.bag].name.toLowerCase()}.` },
    ];
  }

  // ---------------------------------------------------------------- The towns
  update(dt: number, P: THREE.Vector3): void {
    this.clock += dt;
    const S = this.season;
    const id = this.host.fest()?.id ?? null;
    if (id !== this.festId) { this.clearTowns(); this.endFight(); this.festId = id; }
    this.runBoss(P, dt);
    if (!S) return;
    for (const post of POSTS) {
      const near = Math.hypot(post.x - P.x, post.z - P.z) < 120;
      const t = this.towns.get(post.id);
      if (!near) { if (t?.built) this.hideTown(t); continue; }
      if (!this.host.voxels.isLoaded(post.x, post.z)) continue;
      if (!t || !t.built) this.buildTown(post.id, post.x, post.z, S);
      else if (S.id === 'lantern' && t.decor && (t.posts.length < 10 || t.crows.length < 3) && t.looks < 30 && this.clock > t.lookAt) {
        t.lookAt = this.clock + 2; t.looks++;
        this.wakeExtras(t, post.id, post.x, post.z);
      }
    }
    // The Wake's wisps, after dark
    const h = this.host.hour(), night = h >= 19 || h < 5;
    for (const t of this.towns.values()) for (const w of t.wisps) {
      w.visible = night;
      if (!night) continue;
      const u = w.userData as { cx: number; cz: number; y: number; ph: number }, k = this.clock * 0.25 + u.ph;
      w.position.set(u.cx + Math.sin(k) * 5 + Math.sin(k * 2.3) * 1.5, u.y + Math.sin(k * 1.7) * 0.5, u.cz + Math.cos(k * 0.8) * 5);
      if (Math.random() < dt * 2) this.host.particles.sparks(w.position, 2, '#cfe8ff');
    }
    // Lit watch-fires and candles flicker; geese wander a little
    for (const t of this.towns.values()) for (const s of t.spots) {
      if (s.lit && s.lit.visible && Math.random() < dt * 4) this.host.particles.fire(new THREE.Vector3(s.x, s.y + (s.kind === 'firestack' ? 0.8 : 0.3), s.z));
      if (s.kind === 'goose' && s.mesh && s.mesh.visible) {
        const m = s.mesh as THREE.Group & { goose?: CreatureModel };
        m.goose?.update(dt, 0.4);
        m.rotation.y += Math.sin(this.clock * 0.7 + s.x) * dt * 0.5;
      }
    }
  }

  private clearTowns(): void {
    for (const t of this.towns.values()) this.hideTown(t);
    this.towns.clear();
  }
  private hideTown(t: Town): void {
    if (t.decor) this.host.scene.remove(t.decor);
    for (const l of t.lamps) { const i = this.host.lamps.indexOf(l); if (i >= 0) this.host.lamps.splice(i, 1); }
    t.lamps = []; t.wisps = []; t.posts = []; t.crows = []; t.looks = 0;
    for (const s of t.spots) { if (s.mesh) this.host.scene.remove(s.mesh); s.mesh = undefined; s.lit = undefined; }
    t.built = false;
  }

  private ground(x: number, z: number): number | null {
    const V = this.host.voxels;
    let y = V.topSolid(x, z);
    while (y > 0 && [B.OakLeaves, B.BirchLeaves, B.PineLeaves].includes(V.get(Math.floor(x), y, Math.floor(z)) as never)) y--;
    if (y <= 0) return null;
    const top = V.get(Math.floor(x), y, Math.floor(z));
    if (top === B.Water || top === B.Barrier || !isSolid(top)) return null;
    for (let k = 1; k <= 3; k++) if (V.get(Math.floor(x), y + k, Math.floor(z)) !== B.Air) return null;
    return y + 1;
  }

  private buildTown(post: string, px: number, pz: number, S: SeasonDef): void {
    let t = this.towns.get(post);
    if (!t) {
      const spots: Spot[] = [];
      if (S.round.where === 'doors') {
        const doors = this.host.doorsNear(px, pz, 48).sort((a, b) => hash(`${post}:${a.x}:${a.z}`) - hash(`${post}:${b.x}:${b.z}`));
        doors.slice(0, S.round.perTown).forEach((d, k) => {
          // Beside the door on the step, not in front of it (a candle in the doorway is in everyone's way):
          // whichever side has open ground
          const nx = Math.sin(d.ry), nz = Math.cos(d.ry), V = this.host.voxels;
          const at = (side: number) => [d.x + nx * 0.85 - nz * side * 1.1, d.z + nz * 0.85 + nx * side * 1.1] as const;
          const open = ([x, z]: readonly [number, number]) => V.get(Math.floor(x), d.y, Math.floor(z)) === B.Air && V.get(Math.floor(x), d.y + 1, Math.floor(z)) === B.Air && isSolid(V.get(Math.floor(x), d.y - 1, Math.floor(z)));
          const first = hash(`${post}:side:${k}`) < 0.5 ? 1 : -1;
          const [x, z] = open(at(first)) ? at(first) : open(at(-first)) ? at(-first) : at(first);
          spots.push({ key: `${post}:${k}`, kind: S.round.kind, x, y: d.y, z, ry: d.ry });
        });
      } else {
        for (let k = 0; k < S.round.perTown; k++) {
          for (let tries = 0; tries < 10; tries++) {
            const a = hash(`${post}:${S.id}:${k}:${tries}`) * Math.PI * 2, r = 14 + hash(`${post}:${k}:${tries}:r`) * 30;
            const x = Math.floor(px + Math.cos(a) * r) + 0.5, z = Math.floor(pz + Math.sin(a) * r) + 0.5;
            if (roadDist(x, z) < 3) continue;
            const y = this.ground(x, z);
            if (y === null || Math.abs(y - (this.ground(px, pz) ?? y)) > 8) continue;
            spots.push({ key: `${post}:${k}`, kind: S.round.kind, x, y, z, ry: a });
            break;
          }
        }
      }
      t = { post, spots, decor: null, built: false, lamps: [], wisps: [], posts: [], crows: [], lookAt: 0, looks: 0 };
      this.towns.set(post, t);
    }
    // The doors dressed for the festival
    if (S.decor) {
      t.decor = new THREE.Group();
      if (S.id === 'lantern') this.dressWake(t, post, px, pz);
      else for (const d of this.host.doorsNear(px, pz, 40).slice(0, 16)) t.decor.add(decorAt(S.decor, d));
      this.host.scene.add(t.decor);
    }
    for (const s of t.spots) { s.mesh = spotMesh(s); this.host.scene.add(s.mesh); this.dress(s, this.done(s.key)); }
    t.built = true;
  }

  /**
   * The Lantern Wake's town, ESO's Witches Festival way: a carved turnip, a heap of gourds or a candle
   * in a jar by most doors; turnip lanterns hung from posts along the streets, lit after dark; a
   * scarecrow or two on the green; and, at night, will-o'-the-wisps drifting between the houses.
   */
  private dressWake(t: Town, post: string, px: number, pz: number): void {
    const g = t.decor!;
    const M = propMats();
    // The doors
    // Beside each door, clear of the doorway and of the souling candle, on open ground; skipped where there's no room
    const V = this.host.voxels;
    const free = (x: number, y: number, z: number) => V.get(Math.floor(x), y, Math.floor(z)) === B.Air && V.get(Math.floor(x), y + 1, Math.floor(z)) === B.Air && t.spots.every((s) => Math.hypot(s.x - x, s.z - z) > 0.9);
    this.host.doorsNear(px, pz, 48).slice(0, 30).forEach((d, k) => {
      const nx = Math.sin(d.ry), nz = Math.cos(d.ry);
      const at = (side: number): [number, number] => [d.x + nx * 0.6 + nz * 1.2 * side, d.z + nz * 0.6 - nx * 1.2 * side];
      const first = k % 2 ? 1 : -1;
      const spot = [at(first), at(-first)].find(([x, z]) => free(x, d.y, z));
      if (!spot) return;
      // Pumpkins most, the old turnips, a heap of gourds, a candle in a jar
      const v = Math.floor(hash(`${post}:wd:${k}`) * 6);
      const o = v === 0 ? carvedTurnip() : v === 1 ? gourdPile(M) : v === 2 ? candleJar() : jackOLantern(Math.floor(hash(`${post}:wf:${k}`) * 6), 0.9 + hash(`${post}:ws:${k}`) * 0.4);
      o.position.set(spot[0], d.y, spot[1]);
      o.rotation.y = d.ry + (hash(`${post}:wr:${k}`) - 0.5) * 0.6;
      g.add(o);
    });
    this.wakeExtras(t, post, px, pz);
    // Will-o'-the-wisps: small pale lights that drift about after dark
    const wispMat = new THREE.MeshBasicMaterial({ color: '#cfe8ff', transparent: true, opacity: 0.85 });
    for (let k = 0; k < 5; k++) {
      const w = new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 6), wispMat);
      const a = hash(`${post}:ww:${k}`) * Math.PI * 2, r = 10 + hash(`${post}:ww:${k}:r`) * 22;
      w.userData = { cx: px + Math.cos(a) * r, cz: pz + Math.sin(a) * r, y: (this.ground(px, pz) ?? 20) + 1.6, ph: k * 1.7 };
      w.visible = false;
      g.add(w); t.wisps.push(w);
    }
  }

  /**
   * Lantern posts at the edges of the streets and scarecrows on the green, as many as the loaded land
   * has room for so far; called again as more of it loads, until the town has its share.
   */
  private wakeExtras(t: Town, post: string, px: number, pz: number): void {
    const g = t.decor!, M = propMats(), V = this.host.voxels;
    const STREET = new Set<number>([B.Path, B.Cobble, B.StoneBrick, B.MossyCobble, B.Gravel]);
    const street = (x: number, y: number, z: number) => STREET.has(V.get(Math.floor(x), y - 1, Math.floor(z)));
    const fresh: THREE.Vector3[] = [], freshCrows: THREE.Vector3[] = [];
    const g0 = this.ground(px, pz);
    for (let k = 0; k < 160 && (t.posts.length < 10 || t.crows.length < 3); k++) {
      const a = hash(`${post}:wl:${k}`) * Math.PI * 2, r = 8 + hash(`${post}:wl:${k}:r`) * 40;
      const x = Math.floor(px + Math.cos(a) * r) + 0.5, z = Math.floor(pz + Math.sin(a) * r) + 0.5;
      if (!V.isLoaded(x, z)) continue;
      const y = this.ground(x, z);
      if (y === null || (g0 !== null && Math.abs(y - g0) > 8)) continue;
      const rd = roadDist(x, z);
      // At a street's edge: just off a road, or on unpaved ground with paving beside it
      const verge = (rd > 2.6 && rd < 4.4) || (!street(x, y, z) && [[2, 0], [-2, 0], [0, 2], [0, -2]].some(([dx, dz]) => this.ground(x + dx, z + dz) === y && street(x + dx, y, z + dz)));
      const all = [...t.posts, ...t.crows];
      if (verge && t.posts.length < 10 && t.posts.every((q) => Math.hypot(q.x - x, q.z - z) > 8) && all.every((q) => Math.hypot(q.x - x, q.z - z) > 3)) { const q = new THREE.Vector3(x, y, z); t.posts.push(q); fresh.push(q); }
      else if (!verge && rd > 4.5 && !street(x, y, z) && t.crows.length < 3 && all.every((q) => Math.hypot(q.x - x, q.z - z) > 10)) { const q = new THREE.Vector3(x, y, z); t.crows.push(q); freshCrows.push(q); }
    }
    for (const q of fresh) {
      const o = new THREE.Group();
      o.position.copy(q);
      // The arm reaches out over open ground (toward the street where there is one), never into a wall
      const open = (dx: number, dz: number) => V.get(Math.floor(q.x + dx), q.y + 1, Math.floor(q.z + dz)) === B.Air && V.get(Math.floor(q.x + dx), q.y + 2, Math.floor(q.z + dz)) === B.Air;
      const dirs = [[0, 1], [1, 0], [0, -1], [-1, 0]].filter(([dx, dz]) => open(dx, dz));
      const [ax, az] = dirs.find(([dx, dz]) => street(q.x + dx * 2, q.y, q.z + dz * 2)) ?? dirs[0] ?? [0, 1];
      o.rotation.y = Math.atan2(ax, az);
      box(o, 0.12, 2.7, 0.12, '#2a2018', 0, 1.35, 0);
      box(o, 0.08, 0.08, 0.8, '#2a2018', 0, 2.6, 0.36);
      box(o, 0.02, 0.32, 0.02, '#8a7a5a', 0, 2.42, 0.68);
      // A turnip lantern on the old posts, a carved pumpkin on the new (the valley's young ones grow them now)
      const pk = hash(`${post}:wp:${q.x}:${q.z}`) < 0.5;
      const lamp = pk ? jackOLantern(Math.floor(hash(`${post}:wpf:${q.x}`) * 6), 0.62) : carvedTurnip(true);
      lamp.position.set(0, pk ? 1.86 : 1.94, 0.68); if (!pk) lamp.scale.setScalar(1.4); o.add(lamp);
      box(o, 0.5, 0.06, 0.08, '#5b3a8a', 0, 2.3, 0.02); // a violet ribbon tied round the post
      g.add(o);
      const l = new THREE.Vector3(q.x, q.y + 2.2, q.z);
      t.lamps.push(l); this.host.lamps.push(l);
    }
    for (const q of freshCrows) { const o = scarecrow(M); o.position.copy(q); o.rotation.y = hash(`${post}:sc:${q.x}`) * Math.PI * 2; g.add(o); }
  }

  /** How a spot looks before and after it's been done today. */
  private dress(s: Spot, done: boolean): void {
    if (!s.mesh) return;
    if (s.kind === 'firestack' || s.kind === 'candle') {
      if (!s.lit) { s.lit = flame(s.kind === 'firestack' ? 1 : 0.35); s.lit.position.y = s.kind === 'firestack' ? 0.5 : 0.62; s.mesh.add(s.lit); }
      s.lit.visible = s.kind === 'candle' ? true : done;
    } else s.mesh.visible = !done || s.kind === 'griddle' || s.kind === 'wreath';
  }
}

// ---------------------------------------------------------------- What the spots and doors look like
const MAT = new Map<string, THREE.Material>();
const mat = (c: string, glow = false) => {
  const k = c + (glow ? '!' : '');
  let m = MAT.get(k);
  if (!m) { m = glow ? new THREE.MeshBasicMaterial({ color: c }) : new THREE.MeshLambertMaterial({ color: c }); MAT.set(k, m); }
  return m;
};
const box = (g: THREE.Object3D, w: number, h: number, d: number, c: string, x: number, y: number, z: number, glow = false) => {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(c, glow));
  m.position.set(x, y, z); m.castShadow = !glow; g.add(m); return m;
};

function flame(size: number): THREE.Group {
  const g = new THREE.Group();
  const f = new THREE.Mesh(campFlame(), fireMaterial());
  f.scale.setScalar(size * 1.1);
  g.add(f);
  return g;
}

function spotMesh(s: Spot): THREE.Group {
  const g = new THREE.Group();
  g.position.set(s.x, s.y, s.z);
  g.rotation.y = s.ry;
  switch (s.kind) {
    case 'griddle':
      for (const [x, z] of [[-0.25, -0.25], [0.25, -0.25], [0, 0.3]]) box(g, 0.06, 0.4, 0.06, '#3a3a3c', x, 0.2, z);
      box(g, 0.7, 0.05, 0.7, '#2a2a2c', 0, 0.42, 0);
      box(g, 0.5, 0.03, 0.5, '#e8c070', 0, 0.46, 0);
      box(g, 0.08, 0.04, 0.5, '#2a2a2c', 0.5, 0.42, 0);
      break;
    case 'egg': {
      const cols = ['#e8a020', '#9ad06a', '#f0a0b8', '#6ab0e8', '#c8401e'];
      const e = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), mat(cols[Math.floor(hash(s.key) * cols.length)]));
      e.scale.set(1, 1.3, 1); e.position.y = 0.2; e.castShadow = true; g.add(e);
      box(g, 0.34, 0.03, 0.08, '#f4f0e4', 0, 0.2, 0);
      for (let i = 0; i < 5; i++) box(g, 0.04, 0.16, 0.04, '#5a8a3a', Math.cos(i * 1.3) * 0.2, 0.08, Math.sin(i * 1.3) * 0.2);
      break;
    }
    case 'firestack':
      for (let i = 0; i < 7; i++) { const a = (i / 7) * Math.PI * 2; const l = box(g, 0.14, 1.3, 0.14, '#5a3a22', Math.cos(a) * 0.32, 0.55, Math.sin(a) * 0.32); l.rotation.set(-Math.sin(a) * 0.35, 0, Math.cos(a) * 0.35); }
      for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; box(g, 0.32, 0.2, 0.32, '#7a7468', Math.cos(a) * 0.75, 0.1, Math.sin(a) * 0.75); }
      break;
    case 'sheaf':
      box(g, 0.42, 0.9, 0.42, '#e0c060', 0, 0.45, 0);
      box(g, 0.46, 0.08, 0.46, '#a0522d', 0, 0.42, 0);
      for (let i = 0; i < 6; i++) box(g, 0.06, 0.18, 0.06, '#d8b050', Math.cos(i) * 0.16, 0.98, Math.sin(i) * 0.16);
      break;
    case 'candle':
      box(g, 0.12, 0.5, 0.12, '#f4ead2', 0, 0.25, 0);
      box(g, 0.32, 0.04, 0.32, '#5a4a3a', 0, 0.02, 0);
      break;
    case 'goose': {
      const c = new CreatureModel('duck', { a: '#f2f0ea', b: '#e89030' });
      c.root.scale.setScalar(1.25);
      g.add(c.root);
      (g as THREE.Group & { goose?: CreatureModel }).goose = c;
      break;
    }
    case 'wreath': {
      const w = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.08, 6, 12), mat('#2f5a3a'));
      w.position.set(0, 1.7, -1.05); g.add(w);
      for (let i = 0; i < 6; i++) box(g, 0.07, 0.07, 0.07, '#b0202a', Math.cos(i) * 0.28, 1.7 + Math.sin(i) * 0.28, -1.0);
      box(g, 0.14, 0.14, 0.06, '#b0202a', 0, 1.98, -1.02);
      break;
    }
  }
  return g;
}

let PROP_MATS: PropMaterials | null = null;
const propMats = () => (PROP_MATS ??= createPropMaterials());

/** A candle in a jar of green glass, for a doorstep on the Wake. */
function candleJar(): THREE.Group {
  const g = new THREE.Group();
  box(g, 0.24, 0.3, 0.24, '#5a8a6a', 0, 0.15, 0);
  box(g, 0.1, 0.18, 0.1, '#ffd890', 0, 0.2, 0, true);
  box(g, 0.26, 0.04, 0.26, '#3a2a1e', 0, 0.31, 0);
  return g;
}

function decorAt(kind: DecorKind, d: { x: number; y: number; z: number; ry: number }): THREE.Group {
  const g = new THREE.Group();
  const nx = Math.sin(d.ry), nz = Math.cos(d.ry);
  // Beside the door, against the wall, a little out from it
  g.position.set(d.x + nx * 0.55 + nz * 0.95, d.y, d.z + nz * 0.55 - nx * 0.95);
  g.rotation.y = d.ry;
  switch (kind) {
    case 'garland': {
      const cols = ['#f0a0b8', '#f2d75a', '#f4f0e4'];
      for (let i = 0; i < 7; i++) box(g, 0.12, 0.12, 0.08, i % 2 ? '#5a8a3a' : cols[i % 3], -0.95 + i * 0.32, 2.3 - Math.sin((i / 6) * Math.PI) * 0.25, 0);
      break;
    }
    case 'birch':
      for (let i = 0; i < 3; i++) { const b = box(g, 0.08, 1.2, 0.06, '#d8d4c8', 0, 1.4, 0); b.rotation.z = (i - 1) * 0.3; box(g, 0.3, 0.5, 0.06, '#6aa13a', (i - 1) * 0.2, 1.9, 0); }
      break;
    case 'dolly':
      box(g, 0.14, 0.4, 0.08, '#e0c060', 0, 1.7, 0); box(g, 0.2, 0.12, 0.08, '#a0522d', 0, 1.8, 0); box(g, 0.1, 0.1, 0.08, '#d8b050', 0, 1.97, 0);
      break;
    case 'turnip':
      box(g, 0.34, 0.3, 0.32, '#e8dcc0', 0, 0.15, 0.2); box(g, 0.3, 0.08, 0.28, '#7a3a6a', 0, 0.32, 0.2);
      box(g, 0.06, 0.05, 0.02, '#ffb040', -0.07, 0.18, 0.37, true); box(g, 0.06, 0.05, 0.02, '#ffb040', 0.07, 0.18, 0.37, true); box(g, 0.16, 0.03, 0.02, '#ffb040', 0, 0.08, 0.37, true);
      break;
    case 'wreath': {
      const w = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.07, 6, 12), mat('#2f5a3a'));
      w.position.set(0, 1.7, 0); g.add(w);
      for (let i = 0; i < 5; i++) box(g, 0.06, 0.06, 0.06, '#b0202a', Math.cos(i * 1.2) * 0.26, 1.7 + Math.sin(i * 1.2) * 0.26, 0.05);
      break;
    }
  }
  return g;
}
