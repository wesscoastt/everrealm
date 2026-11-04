import * as THREE from 'three';
import * as P from '../world/props';

// Message posts: a few words a player leaves standing where they were, for whoever comes by after (the
// realm keeps them: server/signs.mjs). Each is a stake with a slip of parchment on it and a faint warm
// light at its foot, so you see there's something to read from a little way off. Only the ones near you
// are built; the rest are just where they stand.

export interface Post { id: number; x: number; y: number; z: number; yaw: number; text: string; by: string; at: number; up: number; mine: boolean; voted: boolean }

const SHOW = 70, READ = 2.4;

export class MessagePosts {
  readonly list = new Map<number, Post>();
  private readonly models = new Map<number, THREE.Object3D>();
  private t = 0;
  private glowMat: THREE.MeshBasicMaterial;

  constructor(private readonly scene: THREE.Scene, private readonly M: P.PropMaterials) {
    this.glowMat = new THREE.MeshBasicMaterial({ color: '#ffcf7a', transparent: true, opacity: 0.28, depthWrite: false, blending: THREE.AdditiveBlending });
  }

  setAll(list: Post[]): void {
    for (const id of [...this.list.keys()]) this.gone(id);
    for (const p of list) this.list.set(p.id, p);
    this.t = 0;
  }
  add(p: Post): void { this.gone(p.id); this.list.set(p.id, p); this.t = 0; }
  gone(id: number): void {
    const m = this.models.get(id);
    if (m) { this.scene.remove(m); this.models.delete(id); }
    this.list.delete(id);
  }
  up(id: number, n: number, mine = false): void { const p = this.list.get(id); if (p) { p.up = n; if (mine) p.voted = true; } }

  /** The one close enough to read, nearest first. */
  nearest(at: THREE.Vector3, r = READ): Post | null {
    let best: Post | null = null, bd = r;
    for (const p of this.list.values()) {
      const d = Math.hypot(p.x - at.x, p.z - at.z);
      if (d < bd && Math.abs(p.y - at.y) < 2.5) { best = p; bd = d; }
    }
    return best;
  }

  update(dt: number, at: THREE.Vector3): void {
    if ((this.t -= dt) > 0) return;
    this.t = 0.5;
    for (const p of this.list.values()) {
      const near = Math.hypot(p.x - at.x, p.z - at.z) < SHOW;
      const m = this.models.get(p.id);
      if (near && !m) { const g = this.model(p); this.scene.add(g); this.models.set(p.id, g); }
      else if (!near && m) { this.scene.remove(m); this.models.delete(p.id); }
    }
  }

  /** A stake, a slip of parchment pinned to a little board on it, the writing on the slip, and a glow underfoot. */
  private model(p: Post): THREE.Group {
    const M = this.M, g = new THREE.Group();
    g.add(new THREE.Mesh(P.box(0.08, 1.15, 0.08), M.darkWood).translateY(0.575));
    const board = new THREE.Group();
    board.position.set(0, 1.08, 0.03);
    board.rotation.x = -0.35;
    board.add(new THREE.Mesh(P.box(0.5, 0.36, 0.04), M.wood));
    const slip = new THREE.Mesh(P.box(0.42, 0.29, 0.012), M.paper);
    slip.position.set(0, 0, 0.027);
    slip.rotation.z = ((p.id * 37) % 9 - 4) * 0.012;
    board.add(slip);
    // a few lines of ink, as many as the words would fill
    const lines = Math.max(1, Math.min(5, Math.ceil(p.text.length / 30)));
    const ink = new THREE.MeshLambertMaterial({ color: '#3a2a1a' });
    for (let i = 0; i < lines; i++) {
      const w = i === lines - 1 ? 0.12 + ((p.id + i) % 4) * 0.05 : 0.3 + ((p.id * 3 + i) % 3) * 0.02;
      board.add(new THREE.Mesh(P.box(w, 0.018, 0.004), ink).translateX(-0.15 + w / 2).translateY(0.09 - i * 0.045).translateZ(0.035));
    }
    board.add(new THREE.Mesh(P.box(0.04, 0.04, 0.02), M.iron).translateY(0.11).translateZ(0.04));
    g.add(board);
    const glow = new THREE.Mesh(new THREE.CircleGeometry(0.55, 20), this.glowMat);
    glow.rotation.x = -Math.PI / 2;
    glow.position.y = 0.03;
    g.add(glow);
    g.position.set(p.x, p.y, p.z);
    g.rotation.y = p.yaw;
    return g;
  }
}
