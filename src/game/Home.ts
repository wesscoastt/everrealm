import * as THREE from 'three';
import { ITEMS } from '../data/items';
import { COTTAGE } from '../data/places_regional';
import { createPropMaterials, furniture } from '../world/props';
import { chimneyCell, fitOut, FurnItem, furnCells, FURN_SIZE } from '../world/interiors';

// A home of your own: Wendside Cottage, on the road east of Hollin Ford. Furniture is bought as
// items; arranging the house turns them into pieces on the floor, saved in the 'home' flag as
// [item, x, z, quarter-turns]. Only the owner sees their own arrangement.

export type Piece = [item: string, x: number, z: number, turn: number];

export interface HomeHost {
  scene: THREE.Scene;
  flag(k: string): unknown;
  setFlag(k: string, v: unknown): void;
  count(item: string): number;
  give(item: string): boolean;
  take(item: string): boolean;
  player(): THREE.Vector3;
  yaw(): number;
  system(text: string): void;
  sound(name: string): void;
}

/** The floor you may furnish: inside the walls, half a block clear of them. */
const IN = { x0: COTTAGE.x0 + 1.5, x1: COTTAGE.x0 + COTTAGE.w - 1.5, z0: COTTAGE.z0 + 1.5, z1: COTTAGE.z0 + COTTAGE.d - 1.5 };
const MAX_PIECES = 24;
const SHAPE = { x0: COTTAGE.x0, z0: COTTAGE.z0, w: COTTAGE.w, d: COTTAGE.d, floors: 1, base: COTTAGE.floor, door: 's' as const, doorX: COTTAGE.x0 + Math.floor(COTTAGE.w / 2), doorZ: COTTAGE.z0 + COTTAGE.d - 1 };
/** Floor the cottage keeps for itself: the hearth, the way in and the door leaf. */
const KEPT = (() => {
  const fit = fitOut({ ...SHAPE, role: 'vacant', chimney: chimneyCell(SHAPE) });
  const cells = new Set<string>();
  for (const f of fit.furn) if (f.item !== 'lamp') for (const c of furnCells(f.item, f.x, f.z, f.ry)) cells.add(c.join(','));
  for (let v = 1; v <= 2; v++) cells.add([SHAPE.doorX, SHAPE.doorZ - v].join(','));
  cells.add([SHAPE.doorX - 1, SHAPE.doorZ - 1].join(','));
  return cells;
})();

export class Home {
  private M = createPropMaterials();
  private group = new THREE.Group();
  private ghost: THREE.Group | null = null;
  private tray: HTMLDivElement | null = null;
  /** The item being placed, and its quarter-turns. */
  private holding: string | null = null;
  private turn = 0;
  active = false;
  /** Visiting: whose home is shown, and their furniture in place of yours. */
  visiting: { owner: string; pieces: Piece[]; arrived: boolean } | null = null;
  private ghostOk = true;

  constructor(private host: HomeHost) {
    host.scene.add(this.group);
    this.render();
  }

  get owned(): boolean { return !!this.host.flag('home'); }
  pieces(): Piece[] { const v = this.host.flag('home'); return Array.isArray(v) ? (v as Piece[]) : []; }

  /** Show someone else's furniture until you walk away from the cottage. */
  visit(owner: string, pieces: Piece[]): void {
    this.stop();
    this.visiting = { owner, pieces: pieces.filter((p) => ITEMS[p[0]]?.furn), arrived: false };
    this.render();
    this.host.system(`You're seeing ${owner}'s Wendside Cottage. Walk away from it to see your own again.`);
  }
  inside(p: THREE.Vector3): boolean { return p.x > IN.x0 - 1 && p.x < IN.x1 + 1 && p.z > IN.z0 - 1 && p.z < IN.z1 + 1 && Math.abs(p.y - COTTAGE.floor) < 2.5; }

  /** The bed you've set down, if any, for sleeping in. */
  bed(): { x: number; z: number } | null {
    if (this.visiting) return null;
    const b = this.pieces().find(([item]) => ITEMS[item]?.furn?.model === 'bed');
    return b ? { x: b[1], z: b[2] } : null;
  }

  render(): void {
    this.group.clear();
    for (const [item, x, z, t] of this.visiting?.pieces ?? this.pieces()) {
      const def = ITEMS[item]?.furn;
      const g = def && furniture(this.M, def.model, def.tint ?? 0);
      if (!g) continue;
      g.position.set(x, COTTAGE.floor, z);
      g.rotation.y = (t * Math.PI) / 2;
      this.group.add(g);
    }
  }

  start(): void {
    if (!this.owned) return;
    if (this.visiting) { this.host.system(`This is ${this.visiting.owner}'s home; you can only arrange your own.`); return; }
    this.active = true;
    this.buildTray();
    this.host.system('Arranging the house. Pick a piece, then E to set it down, R to turn it, X to pick up the nearest. Esc when you\'re done.');
  }

  stop(): void {
    this.active = false;
    this.hold(null);
    this.tray?.remove();
    this.tray = null;
  }

  private hold(item: string | null): void {
    if (this.ghost) { this.host.scene.remove(this.ghost); this.ghost = null; }
    this.holding = item;
    const def = item ? ITEMS[item]?.furn : null;
    const g = def ? furniture(this.M, def.model, def.tint ?? 0) : null;
    if (!g) { this.holding = null; this.buildTray(); return; }
    // A see-through copy of the piece follows the player around
    g.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      const mats = (Array.isArray(m.material) ? m.material : [m.material]).map((x) => { const c = x.clone(); c.transparent = true; c.opacity = 0.55; c.depthWrite = false; return c; });
      m.material = Array.isArray(m.material) ? mats : mats[0];
    });
    this.ghost = g;
    this.ghostOk = true;
    this.host.scene.add(g);
    this.buildTray();
  }

  /** Where the held piece would go: a block and a half in front, snapped to half blocks, kept inside. */
  private spot(): [number, number] {
    const p = this.host.player(), yaw = this.host.yaw();
    const snap = (v: number) => Math.round(v * 2) / 2;
    const x = snap(p.x - Math.sin(yaw) * 1.5), z = snap(p.z - Math.cos(yaw) * 1.5);
    return [Math.min(IN.x1, Math.max(IN.x0, x)), Math.min(IN.z1, Math.max(IN.z0, z))];
  }

  /** Room for a piece here: inside the walls, clear of the hearth and the door, and of other pieces (rugs go under things). */
  private fits(item: string, x: number, z: number, turn: number, list: Piece[]): boolean {
    const model = ITEMS[item]?.furn?.model as FurnItem | undefined;
    if (!model || !(model in FURN_SIZE)) return true;
    const ry = (turn * Math.PI) / 2;
    const [w, l] = FURN_SIZE[model];
    const hx = (turn % 2 ? l : w) / 2, hz = (turn % 2 ? w : l) / 2;
    if (x - hx < COTTAGE.x0 + 1 - 0.02 || x + hx > COTTAGE.x0 + COTTAGE.w - 1 + 0.02 || z - hz < COTTAGE.z0 + 1 - 0.02 || z + hz > COTTAGE.z0 + COTTAGE.d - 1 + 0.02) return false;
    if (model === 'rug') return true;
    if (furnCells(model, x, z, ry).some((c) => KEPT.has(c.join(',')))) return false;
    for (const [it, px, pz, pt] of list) {
      const m = ITEMS[it]?.furn?.model as FurnItem | undefined;
      if (!m || m === 'rug' || !(m in FURN_SIZE)) continue;
      const [pw, pl] = FURN_SIZE[m];
      const qx = (pt % 2 ? pl : pw) / 2, qz = (pt % 2 ? pw : pl) / 2;
      if (hx + qx - Math.abs(x - px) > 0.05 && hz + qz - Math.abs(z - pz) > 0.05) return false;
    }
    return true;
  }

  /**
   * Layouts saved before pieces had footprints may overlap: once per character, anything that
   * no longer fits goes back in the pack (or stays put if the pack is full).
   */
  private tidy(): void {
    const kept: Piece[] = [], back: string[] = [];
    for (const pc of this.pieces()) {
      if (this.fits(pc[0], pc[1], pc[2], pc[3], kept) || !this.host.give(pc[0])) kept.push(pc);
      else back.push(ITEMS[pc[0]]?.name ?? pc[0]);
    }
    if (!back.length) return;
    this.host.setFlag('home', kept);
    this.render();
    this.host.system(`Some furniture at Wendside was jammed together, so it's back in your pack: ${back.join(', ')}.`);
  }
  private tidied: unknown = null;

  update(): void {
    if (this.visiting) {
      const p = this.host.player();
      // The visit lasts until you've been to the cottage and walked away again
      const d = Math.hypot(p.x - (COTTAGE.x0 + COTTAGE.w / 2), p.z - (COTTAGE.z0 + COTTAGE.d / 2));
      if (d < 30) this.visiting.arrived = true;
      else if (d > 40 && this.visiting.arrived) { this.host.system(`You leave ${this.visiting.owner}'s home.`); this.visiting = null; this.render(); }
      return;
    }
    const v = this.host.flag('home');
    if (v && v !== this.tidied) { this.tidy(); this.tidied = this.host.flag('home'); this.render(); }
    if (!this.active) return;
    if (!this.inside(this.host.player())) { this.stop(); this.host.system('You step outside and leave the furniture where it is.'); return; }
    if (this.ghost) {
      const [x, z] = this.spot();
      this.ghost.position.set(x, COTTAGE.floor, z);
      this.ghost.rotation.y = (this.turn * Math.PI) / 2;
      // The ghost turns red where the piece won't fit
      const ok = !this.holding || this.fits(this.holding, x, z, this.turn, this.pieces());
      if (ok !== this.ghostOk) {
        this.ghostOk = ok;
        this.ghost.traverse((o) => { const m = (o as THREE.Mesh).material as THREE.MeshLambertMaterial | undefined; if (m && 'emissive' in m) m.emissive.set(ok ? 0x000000 : 0x8a1010); });
      }
    }
  }

  rotate(): void { this.turn = (this.turn + 1) % 4; this.host.sound('click'); }

  place(): void {
    if (!this.holding) { this.host.system('Pick a piece from the tray first.'); return; }
    const list = this.pieces();
    if (list.length >= MAX_PIECES) { this.host.system(`The cottage holds ${MAX_PIECES} pieces. Pick something up first.`); return; }
    if (!this.host.take(this.holding)) { this.hold(null); return; }
    const [x, z] = this.spot();
    if (!this.fits(this.holding, x, z, this.turn, list)) { this.host.give(this.holding); this.host.system('That would knock into something. Try another spot or turn it.'); this.host.sound('fail'); return; }
    this.host.setFlag('home', [...list, [this.holding, x, z, this.turn]]);
    this.host.sound('pickup');
    this.render();
    if (this.host.count(this.holding) < 1) this.hold(null); else this.buildTray();
  }

  pickUp(): void {
    const list = this.pieces();
    const p = this.host.player();
    let best = -1, bd = 2.6;
    list.forEach(([, x, z], i) => { const d = Math.hypot(x - p.x, z - p.z); if (d < bd) { bd = d; best = i; } });
    if (best < 0) { this.host.system('Nothing close enough to pick up.'); return; }
    const [item] = list[best];
    if (!this.host.give(item)) { this.host.system('Your pack is full.'); return; }
    list.splice(best, 1);
    this.host.setFlag('home', list);
    this.host.sound('pickup');
    this.render();
    this.buildTray();
  }

  private buildTray(): void {
    if (!this.active) return;
    if (!this.tray) {
      this.tray = document.createElement('div');
      this.tray.id = 'hometray';
      document.body.appendChild(this.tray);
    }
    const mine = Object.values(ITEMS).filter((d) => d.furn && this.host.count(d.id) > 0);
    const placed = this.pieces().length;
    this.tray.innerHTML = `<div class="ht-head"><b>Wendside Cottage</b><span>${placed}/${MAX_PIECES} placed</span></div>
      <div class="ht-list">${mine.length ? mine.map((d) => `<button data-it="${d.id}" class="${d.id === this.holding ? 'on' : ''}">${d.name} <i>×${this.host.count(d.id)}</i></button>`).join('') : '<p>No furniture in your pack. Perrin at the Charter Market and Tamsin in Hollin Ford sell it.</p>'}</div>
      <div class="ht-keys"><span><kbd>E</kbd> set down</span><span><kbd>R</kbd> turn</span><span><kbd>X</kbd> pick up</span><button data-done>Done</button></div>`;
    this.tray.querySelectorAll<HTMLElement>('[data-it]').forEach((b) => b.addEventListener('click', () => { this.hold(b.dataset.it === this.holding ? null : b.dataset.it!); }));
    this.tray.querySelector('[data-done]')?.addEventListener('click', () => this.stop());
  }
}
