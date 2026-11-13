import * as THREE from 'three';
import { DOUBLOONS_A_WEEK } from '../data/content/doubloons';
import { B } from '../world/blocks';
import { waymarks } from './Waymarks';
import { POSTS } from '../data/travel';

// The Black Gull's Doubloons out in the world (data/content/doubloons.ts): this week's ten, the same for everyone,
// each a little way off one of the Counties' waymarks, with a pillar of gold light over it. Walk into one to take it;
// it counts for your groupmates near you too (word passes by the realm's table relay, as BS's does).

const WEEK_MS = 7 * 24 * 3600 * 1000;
const SEE = 340, NEAR_MATE = 60;

export interface DoubloonsHost {
  scene: THREE.Scene;
  player(): THREE.Vector3;
  now(): number;
  /** The world's blocks, where they're loaded. */
  loaded(x: number, z: number): boolean;
  ground(x: number, z: number): number;
  block(x: number, y: number, z: number): number;
  flag(key: string): unknown;
  setFlag(key: string, v: unknown): void;
  give(item: string, n?: number): boolean;
  addMarks(n: number): void;
  banner(title: string, sub: string): void;
  system(text: string): void;
  sound(n: 'coin' | 'discover'): void;
  /** Word to the group (to all of them near). */
  tellGroup(data: unknown): void;
  persist(): void;
}

interface Spot { i: number; x: number; z: number; y: number | null; near: string }

function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

export class Doubloons {
  private week = -1;
  private spots: Spot[] = [];
  private shown = new Map<number, THREE.Group>();
  private coinGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.08, 20).rotateX(Math.PI / 2);
  private coinMat = new THREE.MeshStandardMaterial({ color: '#e8c040', emissive: '#7a5a10', emissiveIntensity: 0.6, metalness: 0.8, roughness: 0.3 });
  private beamGeo = new THREE.CylinderGeometry(0.35, 0.6, 70, 10, 1, true).translate(0, 35, 0);
  private beamMat = new THREE.MeshBasicMaterial({ color: '#ffd46a', transparent: true, opacity: 0.32, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false });
  private t = 0;

  constructor(private host: DoubloonsHost) {}

  private got(): number[] {
    const f = this.host.flag('dblGot') as { week: number; got: number[] } | undefined;
    return f && f.week === this.week ? f.got : [];
  }

  /** This week's ten: from the Counties' waymarks, each a seeded way off from its stone. */
  private plan(week: number): void {
    this.week = week;
    for (const g of this.shown.values()) this.host.scene.remove(g);
    this.shown.clear();
    const r = rng(week * 2654435761 + 77);
    // (out in the land, not in a town: no stone within a hundred blocks of a Charter Post, none at a ferry, none on the Rock)
    const pool = waymarks().filter((w) => w.x < 4096 && w.x > -3600 && !/ferry|supply boat|Skua|^(Verandah|Kestle|Awschitz)$/i.test(w.name) && !POSTS.some((p) => Math.hypot(p.x - w.x, p.z - w.z) < 100));
    for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
    this.spots = pool.slice(0, DOUBLOONS_A_WEEK).map((w, i) => {
      const a = r() * Math.PI * 2, d = 24 + r() * 22;
      return { i, x: Math.floor(w.x + Math.cos(a) * d) + 0.5, z: Math.floor(w.z + Math.sin(a) * d) + 0.5, y: null, near: w.name };
    });
  }

  /** Where a spot's coin lies: on dry ground, moved round its stone if the first place is under water. */
  private settle(s: Spot): void {
    for (let k = 0; k < 8; k++) {
      const x = Math.floor(s.x), z = Math.floor(s.z);
      if (!this.host.loaded(x, z)) return;
      const gy = this.host.ground(x, z), under = this.host.block(x, gy - 1, z);
      if (under !== B.Water && under !== B.Ice && gy > 0) { s.y = gy; return; }
      s.x += 6; s.z += 4;
    }
    s.y = this.host.ground(Math.floor(s.x), Math.floor(s.z));
  }

  update(dt: number): void {
    const now = this.host.now(), week = Math.floor(now / WEEK_MS);
    if (week !== this.week) this.plan(week);
    this.t += dt;
    const P = this.host.player(), have = new Set(this.got());
    for (const s of this.spots) {
      const d = Math.hypot(P.x - s.x, P.z - s.z);
      let g = this.shown.get(s.i);
      if (have.has(s.i) || d > SEE) { if (g) { this.host.scene.remove(g); this.shown.delete(s.i); } continue; }
      if (s.y === null) { this.settle(s); if (s.y === null) continue; }
      if (!g) {
        g = new THREE.Group();
        const coin = new THREE.Mesh(this.coinGeo, this.coinMat);
        coin.position.y = 1.1;
        const beam = new THREE.Mesh(this.beamGeo, this.beamMat);
        beam.frustumCulled = false;
        g.add(coin, beam);
        g.position.set(s.x, s.y, s.z);
        this.host.scene.add(g);
        this.shown.set(s.i, g);
      }
      const coin = g.children[0];
      coin.rotation.y = this.t * 2.4 + s.i;
      coin.position.y = 1.1 + Math.sin(this.t * 2 + s.i) * 0.12;
      if (d < 1.8 && Math.abs(P.y - s.y) < 3) this.take(s, null);
    }
  }

  private take(s: Spot, from: string | null): void {
    const got = this.got();
    if (got.includes(s.i)) return;
    this.host.setFlag('dblGot', { week: this.week, got: [...got, s.i] });
    this.host.give('doubloon', 1);
    this.host.addMarks(10);
    this.host.sound(got.length + 1 === DOUBLOONS_A_WEEK ? 'discover' : 'coin');
    const n = got.length + 1;
    this.host.banner('A Black Gull doubloon', from ? `${from} found it near ${s.near}: ${n} of ${DOUBLOONS_A_WEEK} this week` : `Near ${s.near}: ${n} of ${DOUBLOONS_A_WEEK} this week`);
    if (n === DOUBLOONS_A_WEEK) this.host.system('That’s all ten for this week. Morwenna Veale on Gullmouth quay will want to see them. New ones wash up next week.');
    const g = this.shown.get(s.i);
    if (g) { this.host.scene.remove(g); this.shown.delete(s.i); }
    if (!from) this.host.tellGroup({ k: 'dbl', week: this.week, i: s.i });
    this.host.persist();
  }

  /** A groupmate picked one up: it's yours too, if you're near it. */
  onMate(data: { week?: number; i?: number }, name: string): void {
    if (data.week !== this.week || typeof data.i !== 'number') return;
    const s = this.spots[data.i], P = this.host.player();
    if (!s || Math.hypot(P.x - s.x, P.z - s.z) > NEAR_MATE) return;
    this.take(s, name);
  }

  /** This week's, for the map: where each still lies, once you've been near enough to see its light. */
  markers(): { x: number; z: number; label: string }[] {
    const have = new Set(this.got());
    return this.spots.filter((s) => !have.has(s.i) && this.shown.has(s.i)).map((s) => ({ x: s.x, z: s.z, label: 'A Black Gull doubloon' }));
  }
}
