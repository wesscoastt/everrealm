import * as THREE from 'three';
import { ITEMS } from '../data/items';
import type { HomeShape } from '../data/housing';
import { createPropMaterials, furniture } from '../world/props';
import { chimneyCell, fitOut, FurnItem, furnCells, FURN_SIZE } from '../world/interiors';

// A home of your own: Wendside Cottage, or a house you've had built on a lot (data/housing.ts).
// Furniture is bought or made as items; arranging the house turns them into pieces on the floor,
// saved in the 'home' flag as [item, x, z, quarter-turns, storey]. Only the owner sees their own
// arrangement (and their guests, on a visit).

export type Piece = [item: string, x: number, z: number, turn: number, floor?: number];

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
  /** The house you live in, if any. */
  shape(): HomeShape | null;
}

/** Pieces a house holds: a bigger house holds more. */
const maxPieces = (h: HomeShape) => Math.round(((h.w - 2) * (h.d - 2) * h.floors) / 1.25);

/**
 * Floor a house keeps for itself, per storey: the hearth, the stairs and their landings, the way
 * in from the door and the door leaf's swing. Worked out with the same fitting-out the builders use.
 */
const keptCache = new Map<string, Set<string>[]>();
function kept(h: HomeShape): Set<string>[] {
  const key = JSON.stringify(h);
  const hit = keptCache.get(key);
  if (hit) return hit;
  const doorX = h.door === 'n' || h.door === 's' ? h.x0 + Math.floor(h.w / 2) : h.door === 'e' ? h.x0 + h.w - 1 : h.x0;
  const doorZ = h.door === 'e' || h.door === 'w' ? h.z0 + Math.floor(h.d / 2) : h.door === 's' ? h.z0 + h.d - 1 : h.z0;
  const shape = { ...h, doorX, doorZ, role: 'vacant' as const, chimney: chimneyCell(h) };
  const fit = fitOut(shape);
  const floors = Array.from({ length: h.floors }, () => new Set<string>());
  const fl = (y: number) => Math.max(0, Math.min(h.floors - 1, Math.round((y - h.base) / 4)));
  for (const f of fit.furn) if (f.item !== 'lamp') for (const c of furnCells(f.item, f.x, f.z, f.ry)) floors[fl(f.y)].add(c.join(','));
  // Stair steps and the stairwell, with a cell's margin round them so nothing blocks the way up
  for (const [x, y, z, kind] of fit.blocks) if (kind === 'step' || kind === 'air') {
    const f = kind === 'air' ? fl(y + 1) : fl(y);
    for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) if (!dx || !dz) {
      floors[f].add([x + dx, z + dz].join(','));
      if (kind === 'step' && f + 1 < h.floors) floors[f + 1].add([x + dx, z + dz].join(','));
    }
  }
  const [nx, nz] = h.door === 's' ? [0, 1] : h.door === 'n' ? [0, -1] : h.door === 'e' ? [1, 0] : [-1, 0];
  for (let v = 1; v <= 2; v++) floors[0].add([doorX - nx * v, doorZ - nz * v].join(','));
  floors[0].add([doorX - nx - nz, doorZ - nz + nx].join(',')).add([doorX - nx + nz, doorZ - nz - nx].join(','));
  keptCache.set(key, floors);
  return floors;
}

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
  visiting: { owner: string; pieces: Piece[]; arrived: boolean; shape: HomeShape } | null = null;
  private ghostOk = true;

  constructor(private host: HomeHost) {
    host.scene.add(this.group);
    this.render();
  }

  get owned(): boolean { return !!this.host.flag('home') && !!this.host.shape(); }
  /** The house on show: a host's while visiting, otherwise your own. */
  where(): HomeShape | null { return this.visiting?.shape ?? this.host.shape(); }
  /** Which storey a height is on. */
  private floorAt(y: number, h: HomeShape): number { return Math.max(0, Math.min(h.floors - 1, Math.floor((y - h.base + 1) / 4))); }
  pieces(): Piece[] { const v = this.host.flag('home'); return Array.isArray(v) ? (v as Piece[]) : []; }

  /** Show someone else's furniture until you walk away from the cottage. */
  visit(owner: string, pieces: Piece[], shape: HomeShape): void {
    this.stop();
    this.visiting = { owner, pieces: pieces.filter((p) => ITEMS[p[0]]?.furn), arrived: false, shape };
    this.render();
    this.host.system(`You're seeing ${owner}'s home, ${shape.name.replace(/^your /, 'their ')}. Walk away from it to see your own again.`);
  }
  endVisit(): void { if (!this.visiting) return; this.visiting = null; this.render(); }
  inside(p: THREE.Vector3): boolean {
    const h = this.where();
    if (!h) return false;
    return p.x > h.x0 + 0.5 && p.x < h.x0 + h.w - 0.5 && p.z > h.z0 + 0.5 && p.z < h.z0 + h.d - 0.5 && p.y > h.base - 1 && p.y < h.base + h.floors * 4;
  }

  /** The bed you've set down, if any, for sleeping in. */
  bed(): { x: number; y: number; z: number } | null {
    if (this.visiting) return null;
    const h = this.where();
    const b = this.pieces().find(([item]) => ITEMS[item]?.furn?.model === 'bed');
    return b && h ? { x: b[1], z: b[2], y: h.base + (b[4] ?? 0) * 4 } : null;
  }

  render(): void {
    this.group.clear();
    const h = this.where();
    if (!h) return;
    for (const [item, x, z, t, f] of this.visiting?.pieces ?? this.pieces()) {
      const def = ITEMS[item]?.furn;
      const g = def && furniture(this.M, def.model, def.tint ?? 0);
      if (!g) continue;
      g.position.set(x, h.base + (f ?? 0) * 4, z);
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
  private spot(): [number, number, number] {
    const h = this.where()!;
    const p = this.host.player(), yaw = this.host.yaw();
    const snap = (v: number) => Math.round(v * 2) / 2;
    const x = snap(p.x - Math.sin(yaw) * 1.5), z = snap(p.z - Math.cos(yaw) * 1.5);
    return [Math.min(h.x0 + h.w - 1.5, Math.max(h.x0 + 1.5, x)), Math.min(h.z0 + h.d - 1.5, Math.max(h.z0 + 1.5, z)), this.floorAt(p.y, h)];
  }

  /**
   * Where the held piece goes: the spot in front of you, or if that's taken, the nearest free spot
   * within a block of it, so a table slides clear of the stairs instead of refusing outright.
   */
  private fitSpot(): [number, number, number, boolean] {
    const [x, z, f] = this.spot();
    if (!this.holding) return [x, z, f, true];
    const list = this.pieces();
    if (this.fits(this.holding, x, z, this.turn, list, f)) return [x, z, f, true];
    let best: [number, number] | null = null, bd = Infinity;
    for (let dx = -1; dx <= 1; dx += 0.5) for (let dz = -1; dz <= 1; dz += 0.5) {
      const d = Math.hypot(dx, dz);
      if (d >= bd || !this.fits(this.holding, x + dx, z + dz, this.turn, list, f)) continue;
      bd = d; best = [x + dx, z + dz];
    }
    return best ? [best[0], best[1], f, true] : [x, z, f, false];
  }

  /** Room for a piece here: inside the walls, clear of the hearth and the door, and of other pieces (rugs go under things). */
  private fits(item: string, x: number, z: number, turn: number, list: Piece[], floor = 0): boolean {
    const h = this.where();
    if (!h) return false;
    const model = ITEMS[item]?.furn?.model as FurnItem | undefined;
    if (!model || !(model in FURN_SIZE)) return true;
    const ry = (turn * Math.PI) / 2;
    const [w, l] = FURN_SIZE[model];
    const hx = (turn % 2 ? l : w) / 2, hz = (turn % 2 ? w : l) / 2;
    if (x - hx < h.x0 + 1 - 0.02 || x + hx > h.x0 + h.w - 1 + 0.02 || z - hz < h.z0 + 1 - 0.02 || z + hz > h.z0 + h.d - 1 + 0.02) return false;
    if (model === 'rug') return true;
    const keep = kept(h)[floor] ?? new Set<string>();
    if (furnCells(model, x, z, ry).some((c) => keep.has(c.join(',')))) return false;
    for (const [it, px, pz, pt, pf] of list) {
      if ((pf ?? 0) !== floor) continue;
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
      if (this.fits(pc[0], pc[1], pc[2], pc[3], kept, pc[4] ?? 0) || !this.host.give(pc[0])) kept.push(pc);
      else back.push(ITEMS[pc[0]]?.name ?? pc[0]);
    }
    if (!back.length) return;
    this.host.setFlag('home', kept);
    this.render();
    this.host.system(`Some furniture at home was jammed together, so it's back in your pack: ${back.join(', ')}.`);
  }
  private tidied: unknown = null;
  private tidiedShape: string | null = null;

  update(): void {
    if (this.visiting) {
      const p = this.host.player();
      // The visit lasts until you've been to the cottage and walked away again
      const vh = this.visiting.shape;
      const d = Math.hypot(p.x - (vh.x0 + vh.w / 2), p.z - (vh.z0 + vh.d / 2));
      if (d < 30) this.visiting.arrived = true;
      else if (d > 40 && this.visiting.arrived) { this.host.system(`You leave ${this.visiting.owner}'s home.`); this.visiting = null; this.render(); }
      return;
    }
    const v = this.host.flag('home');
    const hk = v ? JSON.stringify(this.host.shape()) : null;
    if (v && (v !== this.tidied || hk !== this.tidiedShape)) { this.tidy(); this.tidied = this.host.flag('home'); this.tidiedShape = hk; this.render(); }
    if (!this.active) return;
    if (!this.inside(this.host.player())) { this.stop(); this.host.system('You step outside and leave the furniture where it is.'); return; }
    if (this.ghost) {
      const [x, z, f, fitsHere] = this.fitSpot();
      this.ghost.position.set(x, this.where()!.base + f * 4, z);
      this.ghost.rotation.y = (this.turn * Math.PI) / 2;
      // The ghost turns red where the piece won't fit
      const ok = fitsHere;
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
    const max = maxPieces(this.where()!);
    if (list.length >= max) { this.host.system(`The house holds ${max} pieces. Pick something up first.`); return; }
    if (!this.host.take(this.holding)) { this.hold(null); return; }
    const [x, z, f] = this.fitSpot();
    if (!this.fits(this.holding, x, z, this.turn, list, f)) { this.host.give(this.holding); this.host.system('That would knock into something. Try another spot or turn it.'); this.host.sound('fail'); return; }
    this.host.setFlag('home', [...list, [this.holding, x, z, this.turn, f]]);
    this.host.sound('pickup');
    this.render();
    if (this.host.count(this.holding) < 1) this.hold(null); else this.buildTray();
  }

  pickUp(): void {
    const list = this.pieces();
    const p = this.host.player();
    const here = this.floorAt(p.y, this.where()!);
    let best = -1, bd = 2.6;
    list.forEach(([, x, z, , f], i) => { if ((f ?? 0) !== here) return; const d = Math.hypot(x - p.x, z - p.z); if (d < bd) { bd = d; best = i; } });
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
    const h = this.where()!;
    this.tray.innerHTML = `<div class="ht-head"><b>${h.name.replace(/^your house on /, '')}</b><span>${placed}/${maxPieces(h)} placed</span></div>
      <div class="ht-list">${mine.length ? mine.map((d) => `<button data-it="${d.id}" class="${d.id === this.holding ? 'on' : ''}">${d.name} <i>×${this.host.count(d.id)}</i></button>`).join('') : '<p>No furniture in your pack. Perrin at the Charter Market and Tamsin in Hollin Ford sell it.</p>'}</div>
      <div class="ht-keys"><span><kbd>E</kbd> set down</span><span><kbd>R</kbd> turn</span><span><kbd>X</kbd> pick up</span><button data-done>Done</button></div>`;
    this.tray.querySelectorAll<HTMLElement>('[data-it]').forEach((b) => b.addEventListener('click', () => { this.hold(b.dataset.it === this.holding ? null : b.dataset.it!); }));
    this.tray.querySelector('[data-done]')?.addEventListener('click', () => this.stop());
  }
}
