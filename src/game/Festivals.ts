import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { FestivalDef, FESTIVALS, festivalAt, festivalDates } from '../data/festivals';
import type { WritKind } from '../data/calendar';
import { utcDay } from '../data/calendar';
import { POSTS } from '../data/travel';
import { ITEMS } from '../data/items';
import type { VoxelWorld } from '../world/VoxelWorld';
import { B, isSolid } from '../world/blocks';
import { roadDist } from '../world/terrain';
import type { Particles } from '../systems/Particles';
import type { MapMarker } from '../ui/Hud';

// The festival that's on (data/festivals.ts) in the running game: a stall and decorations by
// every Charter Post, built when you come near; tokens from creatures; the festival writ; and the
// journal's Festival page. The stall sells through the ordinary shop panel, priced in tokens.

export interface FestivalHost {
  scene: THREE.Scene;
  voxels: VoxelWorld;
  /** Points the world's lamp pool lights at night (the stall and its centrepiece). */
  lamps: THREE.Vector3[];
  particles: Particles;
  flag(key: string): unknown;
  setFlag(key: string, value: unknown): void;
  give(item: string, n?: number): boolean;
  count(item: string): number;
  addMarks(n: number): void;
  banner(title: string, sub: string): void;
  system(text: string): void;
  sound(name: 'discover' | 'coin'): void;
}

export interface FestivalView {
  on: { name: string; blurb: string; closes: string; token: string; tokenName: string; have: number; writ: { name: string; desc: string; have: number; need: number; done: boolean } } | null;
  year: { name: string; when: string; on: boolean }[];
}

interface Stall { post: string; x: number; y: number; z: number; ry: number; group: THREE.Group }

const LEAVES = new Set<number>([B.OakLeaves, B.BirchLeaves, B.PineLeaves].filter((x) => x !== undefined));
const PAVED = new Set<number>([B.Path, B.Cobble, B.StoneBrick, B.MossyCobble, B.Planks, B.DarkPlanks, B.Farmland, B.Hay, B.Gravel]);
const WRIT_TOKENS = 8, WRIT_MARKS = 20;

const fmt = (d: Date) => d.toLocaleDateString(undefined, { day: 'numeric', month: 'long', timeZone: 'UTC' });

export class Festivals {
  fest: FestivalDef | null = festivalAt();
  private stalls = new Map<string, Stall>();
  /** Posts where no room was found yet (retried as chunks load), and the last try. */
  private tried = new Map<string, number>();
  private checkAt = 0;
  private clock = 0;
  private fires: THREE.Vector3[] = [];

  constructor(private host: FestivalHost) {}

  /** Once a session: say what's on. A brand-new character hears about it a little later, once they've looked around. */
  greet(fresh = false): void {
    const f = this.fest;
    if (!f) return;
    if (fresh) { setTimeout(() => this.greet(false), 20000); return; }
    const { closes } = festivalDates(f);
    const key = `fest:seen:${f.id}:${closes.getUTCFullYear()}`;
    if (!this.host.flag(key)) {
      this.host.setFlag(key, 1);
      this.host.banner(f.name, `On until ${fmt(closes)}`);
    }
    this.host.system(`${f.name} is on in the Charter Counties until ${fmt(closes)}. Look for the festival stall by any Charter Post; creatures drop ${f.tokenPlural}. Your journal (J) has the festival writ.`);
  }

  // ---------------------------------------------------------------- Tokens and the writ
  /** A creature came down: a token, sometimes (elites always give three). */
  onKill(elite: boolean): void {
    const f = this.fest;
    if (!f) return;
    if (elite) this.host.give(f.token, 3);
    else if (Math.random() < 0.3) this.host.give(f.token, 1);
  }

  private writState(): { day: number; have: number; done: boolean } {
    const s = this.host.flag('fest:writ') as { day: number; have: number; done: boolean; id?: string } | undefined;
    const day = utcDay();
    return s && s.day === day && s.id === this.fest?.id ? s : { day, have: 0, done: false };
  }

  /** Called with every daily-round event (kills, chores, events, travel, experience). */
  bump(kind: WritKind, n = 1): void {
    const f = this.fest;
    if (!f || f.writ.kind !== kind) return;
    const s = this.writState();
    if (s.done) return;
    s.have = Math.min(f.writ.need, s.have + n);
    if (s.have >= f.writ.need) {
      s.done = true;
      this.host.give(f.token, WRIT_TOKENS);
      this.host.addMarks(WRIT_MARKS);
      this.host.banner('Festival writ done', f.writ.name);
      this.host.system(`${f.writ.name}: done. ${WRIT_TOKENS} ${f.tokenPlural} and ${WRIT_MARKS} marks.`);
      this.host.sound('coin');
    }
    this.host.setFlag('fest:writ', { ...s, id: f.id });
  }

  view(): FestivalView {
    const f = this.fest;
    const year = FESTIVALS.map((x) => { const d = festivalDates(x); return { name: x.name, when: `${fmt(d.opens)} to ${fmt(d.closes)}`, on: x === f }; });
    if (!f) return { on: null, year };
    const s = this.writState();
    return {
      on: { name: f.name, blurb: f.blurb, closes: fmt(festivalDates(f).closes), token: f.token, tokenName: f.tokenPlural, have: this.host.count(f.token), writ: { name: f.writ.name, desc: f.writ.desc, have: s.have, need: f.writ.need, done: s.done } },
      year,
    };
  }

  // ---------------------------------------------------------------- Stalls
  /** The stall within reach of p, to trade at. */
  stallNear(p: THREE.Vector3, r = 3.2): Stall | null {
    for (const s of this.stalls.values()) if (Math.hypot(s.x - p.x, s.z - p.z) < r && Math.abs(s.y - p.y) < 3) return s;
    return null;
  }

  markers(): MapMarker[] {
    return [...this.stalls.values()].map((s) => ({ x: s.x, z: s.z, kind: 'fair', label: this.fest ? this.fest.name + ' stall' : 'Festival stall' }));
  }

  update(dt: number, P: THREE.Vector3): void {
    this.clock += dt;
    // Only the fairs within sight are drawn
    for (const s of this.stalls.values()) s.group.visible = Math.hypot(s.x - P.x, s.z - P.z) < 180;
    // The calendar can turn over while you play
    if ((this.checkAt -= dt) <= 0) {
      this.checkAt = 60;
      const now = festivalAt();
      if (now !== this.fest) { this.clear(); this.fest = now; if (now) this.greet(); }
    }
    const f = this.fest;
    if (!f) return;
    for (const post of POSTS) {
      if (this.stalls.has(post.id)) continue;
      if (Math.hypot(post.x - P.x, post.z - P.z) > 110 || !this.host.voxels.isLoaded(post.x, post.z)) continue;
      if (this.clock - (this.tried.get(post.id) ?? -99) < 5) continue;
      this.tried.set(post.id, this.clock);
      const spot = this.findRoom(post.x, post.z);
      if (spot) this.build(f, post.id, spot.x, spot.y, spot.z, Math.atan2(post.x - spot.x, post.z - spot.z));
    }
    // Watch-fires and wake candles flicker when you're near
    for (const p of this.fires) if (Math.hypot(p.x - P.x, p.z - P.z) < 40 && Math.random() < dt * (f.centre === 'bonfire' ? 14 : 3)) this.host.particles.fire(p);
  }

  private clear(): void {
    for (const s of this.stalls.values()) this.host.scene.remove(s.group);
    this.stalls.clear();
    this.host.lamps.length = 0;
    this.tried.clear();
    this.fires = [];
  }

  /** Ground under a column, below any tree canopy; null if it's water or not there. */
  private ground(x: number, z: number): number | null {
    const V = this.host.voxels;
    let y = V.topSolid(x, z);
    while (y > 0 && LEAVES.has(V.get(Math.floor(x), y, Math.floor(z)))) y--;
    if (y <= 0) return null;
    const top = V.get(Math.floor(x), y, Math.floor(z));
    if (top === B.Water || !isSolid(top)) return null;
    return y + 1;
  }

  /**
   * A level 9 by 9 patch near a Charter Post, off the road, with nothing standing on it: the fair
   * needs room for the stall, the centrepiece and the ring of bunting poles round them.
   */
  private findRoom(px: number, pz: number): { x: number; y: number; z: number } | null {
    const V = this.host.voxels;
    let best: { x: number; y: number; z: number; score: number } | null = null;
    for (let r = 7; r <= 40; r += 1.5) for (let k = 0; k < 24; k++) {
      const a = (k / 24) * Math.PI * 2;
      const cx = Math.floor(px + Math.cos(a) * r) + 0.5, cz = Math.floor(pz + Math.sin(a) * r) + 0.5;
      if (roadDist(cx, cz) < 6.5) continue;
      const g = this.ground(cx, cz);
      if (g === null) continue;
      let ok = true, street = 0;
      for (let dx = -4; dx <= 4 && ok; dx++) for (let dz = -4; dz <= 4 && ok; dz++) {
        const x = Math.floor(cx) + dx, z = Math.floor(cz) + dz;
        const h = this.ground(x + 0.5, z + 0.5);
        if (h === null || Math.abs(h - g) > 1) { ok = false; break; }
        // Not on a street, a yard or a field: the fair goes on the green beside them
        if (PAVED.has(V.get(x, h - 1, z)) && (Math.abs(dx) <= 2 && Math.abs(dz) <= 2 || ++street > 6)) { ok = false; break; }
        for (let y = g; y < g + 5; y++) if (V.get(x, y, z) !== B.Air) { ok = false; break; }
      }
      if (!ok) continue;
      const score = r;
      if (!best || score < best.score) best = { x: cx, y: g, z: cz, score };
    }
    return best;
  }

  // ---------------------------------------------------------------- Building the fair
  private build(f: FestivalDef, post: string, x: number, y: number, z: number, ry: number): void {
    const g = new THREE.Group();
    g.position.set(x, y, z);
    g.rotation.y = ry;
    const mat = (c: string, glow = 0) => new THREE.MeshLambertMaterial(glow ? { color: c, emissive: new THREE.Color(c).multiplyScalar(glow) } : { color: c });
    const box = (w: number, h: number, d: number, m: THREE.Material, px: number, py: number, pz: number, rx = 0, rz = 0) => {
      const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
      o.position.set(px, py, pz); o.rotation.set(rx, 0, rz); o.castShadow = true; o.receiveShadow = true; g.add(o); return o;
    };
    const wood = mat('#7a5232'), dark = mat('#4a3020'), cloth = f.colors.map((c) => mat(c));

    // The stall: a counter under a striped awning, the festival's goods on the board, at the back of the patch facing the post
    const sz = -2.2;
    box(3.4, 1.0, 1.0, wood, 0, 0.5, sz);
    box(3.6, 0.12, 1.2, dark, 0, 1.06, sz);
    for (const sx of [-1.65, 1.65]) for (const dz of [-0.45, 0.45]) box(0.14, 2.6, 0.14, dark, sx, 1.3, sz + dz);
    for (let i = 0; i < 8; i++) box(0.45, 0.08, 1.7, cloth[i % 2 === 0 ? 0 : 1], -1.575 + i * 0.45, 2.62, sz + 0.15, -0.18);
    for (let i = 0; i < 8; i++) box(0.45, 0.32, 0.05, cloth[i % 2 === 0 ? 0 : 1], -1.575 + i * 0.45, 2.42, sz + 0.98);
    // Goods on the counter: the token, a dish, the dye pots
    const goods = [ITEMS[f.token]?.icon.a ?? '#ccc', ITEMS[f.stall[0].item]?.icon.a ?? '#c90', ITEMS[f.stall[1].item]?.icon.a ?? '#888', ITEMS[f.stall[2].item]?.icon.a ?? '#888'];
    goods.forEach((c, i) => box(0.35, 0.3, 0.35, mat(c, i > 1 ? 0.15 : 0), -1.2 + i * 0.8, 1.27, sz));
    // A pennant on a staff with the festival's first two colours
    box(0.08, 3.6, 0.08, dark, 1.9, 1.8, sz - 0.3);
    box(0.7, 0.4, 0.03, cloth[0], 2.25, 3.3, sz - 0.3);
    box(0.7, 0.18, 0.03, cloth[1], 2.25, 3.0, sz - 0.3);

    // Bunting: a ring of poles round the patch, strung pole to pole with flags in the festival's colours
    const poles: THREE.Vector3[] = [];
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
      const p = new THREE.Vector3(Math.cos(a) * 4.1, 0, Math.sin(a) * 4.1);
      box(0.14, 3.4, 0.14, wood, p.x, 1.7, p.z);
      poles.push(p.setY(3.3));
    }
    const flagGeo = new THREE.BufferGeometry();
    flagGeo.setAttribute('position', new THREE.Float32BufferAttribute([-0.16, 0, 0, 0.16, 0, 0, 0, -0.34, 0], 3));
    flagGeo.computeVertexNormals();
    const flags: { p: THREE.Vector3; ry: number; c: string }[] = [];
    const line = new THREE.MeshLambertMaterial({ color: '#d8ccb0' });
    for (let i = 0; i < poles.length; i++) {
      const a = poles[i], b = poles[(i + 1) % poles.length];
      if (i === 4) continue; // leave the stall's back side open to walk round
      const n = 9;
      for (let k = 0; k <= n; k++) {
        const t = k / n;
        const p = a.clone().lerp(b, t);
        p.y -= Math.sin(Math.PI * t) * 0.55;
        if (k > 0 && k < n) flags.push({ p, ry: Math.atan2(b.x - a.x, b.z - a.z) + Math.PI / 2, c: f.colors[(k + i) % f.colors.length] });
        if (k < n) {
          const q = a.clone().lerp(b, (k + 1) / n); q.y -= Math.sin(Math.PI * (k + 1) / n) * 0.55;
          const seg = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, p.distanceTo(q)), line);
          seg.position.copy(p).lerp(q, 0.5); seg.lookAt(q.clone().add(g.position).sub(g.position)); g.add(seg);
          seg.lookAt(seg.position.clone().add(q.clone().sub(p)));
        }
      }
    }
    const inst = new THREE.InstancedMesh(flagGeo, new THREE.MeshLambertMaterial({ side: THREE.DoubleSide }), flags.length);
    const m4 = new THREE.Matrix4(), q4 = new THREE.Quaternion(), one = new THREE.Vector3(1, 1, 1);
    flags.forEach((fl, i) => {
      inst.setMatrixAt(i, m4.compose(fl.p, q4.setFromEuler(new THREE.Euler(0, fl.ry, 0)), one));
      inst.setColorAt(i, new THREE.Color(fl.c));
    });
    g.add(inst);

    // The centrepiece, in the middle of the patch in front of the stall
    const cz = 1.2;
    switch (f.centre) {
      case 'maypole': {
        box(0.22, 6, 0.22, mat('#f4f0e4'), 0, 3, cz);
        box(0.9, 0.3, 0.9, mat('#9ad06a'), 0, 6.05, cz);
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2;
          const end = new THREE.Vector3(Math.cos(a) * 2.6, 0.9, cz + Math.sin(a) * 2.6), top = new THREE.Vector3(0, 5.9, cz);
          const rib = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, top.distanceTo(end)), cloth[i % cloth.length]);
          rib.position.copy(top).lerp(end, 0.5); rib.lookAt(end.clone().add(g.position)); g.add(rib);
          rib.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), end.clone().sub(top).normalize());
        }
        break;
      }
      case 'bonfire': {
        for (let i = 0; i < 7; i++) { const a = (i / 7) * Math.PI * 2; box(0.22, 1.9, 0.22, dark, Math.cos(a) * 0.55, 0.8, cz + Math.sin(a) * 0.55, -Math.sin(a) * 0.42, Math.cos(a) * 0.42); }
        box(0.7, 0.5, 0.7, mat('#ff9a3a', 1.2), 0, 0.3, cz);
        for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; box(0.5, 0.3, 0.5, mat('#7a7468'), Math.cos(a) * 1.15, 0.15, cz + Math.sin(a) * 1.15); }
        this.fires.push(new THREE.Vector3(x, y + 0.6, z).add(new THREE.Vector3(0, 0, cz).applyAxisAngle(new THREE.Vector3(0, 1, 0), ry)));
        break;
      }
      case 'harvest': {
        const hay = mat('#e0c060'), pump = mat('#e8801e'), stalk = mat('#4a6a2a');
        box(1.4, 0.8, 0.9, hay, -1.3, 0.4, cz); box(1.4, 0.8, 0.9, hay, 1.3, 0.4, cz + 0.4); box(1.4, 0.8, 0.9, hay, -0.6, 1.2, cz + 0.1);
        for (const [px, pz, s] of [[0.4, cz - 0.6, 0.55], [-0.1, cz + 1.1, 0.7], [2.1, cz - 0.4, 0.45], [-2.2, cz + 0.9, 0.6]] as const) { box(s, s * 0.8, s, pump, px, s * 0.4, pz); box(0.08, 0.18, 0.08, stalk, px, s * 0.8 + 0.08, pz); }
        for (const [px, pz] of [[2.6, cz + 1.4], [-2.8, cz - 0.6], [0.9, cz + 2.0]]) { box(0.5, 1.5, 0.5, mat('#d8b050'), px, 0.75, pz); box(0.62, 0.12, 0.62, mat('#a0522d'), px, 0.9, pz); }
        break;
      }
      case 'lanterns': {
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2;
          const lx = Math.cos(a) * 1.8, lz = cz + Math.sin(a) * 1.8;
          box(0.1, 1.3, 0.1, dark, lx, 0.65, lz);
          box(0.42, 0.42, 0.42, mat('#e8701a', 0.9), lx, 1.5, lz);
          this.fires.push(new THREE.Vector3(x, y + 1.8, z).add(new THREE.Vector3(lx, 0, lz).applyAxisAngle(new THREE.Vector3(0, 1, 0), ry)));
        }
        box(0.9, 0.5, 0.9, mat('#3a2a3a'), 0, 0.25, cz);
        for (let i = 0; i < 5; i++) box(0.08, 0.3, 0.08, mat('#f4ead2', 0.8), -0.3 + i * 0.15, 0.65, cz + (i % 2) * 0.2 - 0.1);
        break;
      }
      case 'firtree': {
        const fir = mat('#2f5a3a'), snow = mat('#f4f8fc');
        box(0.35, 1.0, 0.35, dark, 0, 0.5, cz);
        [[2.6, 1.6], [2.0, 2.6], [1.4, 3.5], [0.8, 4.3]].forEach(([w, h]) => { box(w, 0.9, w, fir, 0, h, cz); box(w * 0.8, 0.12, w * 0.8, snow, 0, h + 0.5, cz); });
        box(0.4, 0.4, 0.4, mat('#e8d080', 1.2), 0, 5.0, cz);
        for (let i = 0; i < 14; i++) {
          const lvl = i % 4, w = [2.6, 2.0, 1.4, 0.8][lvl] / 2 + 0.03, h = [1.6, 2.6, 3.5, 4.3][lvl];
          const a = i * 2.4;
          box(0.22, 0.22, 0.22, mat(f.colors[i % f.colors.length], 1.4), Math.cos(a) * w, h - 0.3, cz + Math.sin(a) * w);
        }
        break;
      }
    }
    bake(g);
    this.host.scene.add(g);
    this.stalls.set(post, { post, x, y, z, ry, group: g });
    // Lit after dark: over the counter, and at the centrepiece
    const world = (lx: number, ly: number, lz: number) => new THREE.Vector3(lx, ly, lz).applyAxisAngle(new THREE.Vector3(0, 1, 0), ry).add(g.position);
    this.host.lamps.push(world(0, 2.2, sz + 0.6), world(0, f.centre === 'firtree' || f.centre === 'maypole' ? 3.5 : 1.6, cz));
  }
}

const BAKED_LIT = new THREE.MeshLambertMaterial({ vertexColors: true });
const BAKED_GLOW = new THREE.MeshBasicMaterial({ vertexColors: true });

/**
 * Merge a fair's boxes into two meshes (lit, and glowing) with the colours baked into the vertices:
 * built from a hundred small parts, drawn in three calls with the flags.
 */
function bake(g: THREE.Group): void {
  const lit: THREE.BufferGeometry[] = [], glow: THREE.BufferGeometry[] = [];
  const parts = g.children.filter((o): o is THREE.Mesh => (o as THREE.Mesh).isMesh && !(o as THREE.InstancedMesh).isInstancedMesh);
  for (const m of parts) {
    m.updateMatrix();
    const mat = m.material as THREE.MeshLambertMaterial;
    const geo = (m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone()).applyMatrix4(m.matrix);
    geo.deleteAttribute('uv');
    const n = geo.getAttribute('position').count, c = mat.color, col = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b; }
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    (mat.emissive && mat.emissive.getHex() !== 0 ? glow : lit).push(geo);
    g.remove(m);
    m.geometry.dispose();
    mat.dispose();
  }
  for (const [list, material, shadow] of [[lit, BAKED_LIT, true], [glow, BAKED_GLOW, false]] as const) {
    if (!list.length) continue;
    const merged = mergeGeometries(list, false);
    for (const geo of list) geo.dispose();
    if (!merged) continue;
    const mesh = new THREE.Mesh(merged, material);
    mesh.castShadow = shadow; mesh.receiveShadow = true;
    g.add(mesh);
  }
}
